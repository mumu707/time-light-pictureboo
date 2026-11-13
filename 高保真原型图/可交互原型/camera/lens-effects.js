"use strict";

window.CameraLens = (() => {
  const choices = {
    normal: "原镜头",
    fisheye: "鱼眼",
    concave: "凹镜",
    convex: "凸镜",
    funhouse: "哈哈镜",
    color: "偏色",
    squeeze: "挤压",
    blur: "模糊",
    pixel: "像素",
    oldboy: "老男孩",
    contrast: "高对比",
    invert: "反向",
    painting: "绘画",
    dither: "抖色",
    newspaper: "报纸",
    kaleidoscope: "万花筒",
    swirl: "漩涡",
    ripple: "水波纹",
    prism: "彩虹棱镜",
    tiltshift: "移轴微缩",
    cyber: "赛博故障",
    dream: "柔焦梦境",
    emboss: "浮雕铜版",
    thermal: "热成像"
  };

  const sharedCanvas = document.createElement("canvas");
  const lutCache = new Map();
  let paintingSurface;
  let paintingContext;
  let paintingSums;
  let reuseOutput;
  let reuseHalftone;

  function active(lenses) {
    return lenses?.some(lens => lens && lens !== "normal" && Object.hasOwn(choices, lens));
  }

  function mapPoint(lens, x, y, scaleX, scaleY, point) {
    if (lens === "squeeze") {
      point.x = Math.tanh(x * 1.8) / Math.tanh(1.8);
      point.y = y;
      return true;
    }
    if (lens === "funhouse") {
      point.x = x + Math.sin(y * Math.PI * 1.5) * .24 * (1 - x * x);
      point.y = y + Math.sin(x * Math.PI) * .13 * (1 - y * y);
      return true;
    }
    if (lens === "kaleidoscope") {
      const r = Math.hypot(x * scaleX, y * scaleY);
      const sector = Math.PI / 3;
      let theta = Math.atan2(y, x);
      theta = ((theta % sector) + sector) % sector;
      if (theta > sector * .5) theta = sector - theta;
      const sx = r * Math.cos(theta) / scaleX;
      const sy = r * Math.sin(theta) / scaleY;
      point.x = Math.max(-1, Math.min(1, sx));
      point.y = Math.max(-1, Math.min(1, sy));
      return true;
    }
    if (lens === "swirl") {
      const r = Math.hypot(x * scaleX, y * scaleY);
      const angle = 2.4 * Math.max(0, 1 - r / 1.15);
      const c = Math.cos(angle), s = Math.sin(angle);
      const ux = x * scaleX, uy = y * scaleY;
      point.x = Math.max(-1, Math.min(1, (ux * c - uy * s) / scaleX));
      point.y = Math.max(-1, Math.min(1, (ux * s + uy * c) / scaleY));
      return true;
    }
    if (lens === "ripple") {
      const r = Math.hypot(x * scaleX, y * scaleY);
      const wave = Math.sin(r * 22.0) * .045 * Math.max(0, 1 - r * .5);
      const nx = r > 1e-4 ? (x * scaleX) / r : 0;
      const ny = r > 1e-4 ? (y * scaleY) / r : 0;
      point.x = Math.max(-1, Math.min(1, x + nx * wave / scaleX));
      point.y = Math.max(-1, Math.min(1, y + ny * wave / scaleY));
      return true;
    }
    const edge = Math.max(Math.abs(x), Math.abs(y));
    let factor = 1;
    if (lens === "fisheye") {
      const radiusSquared = (x * scaleX) ** 2 + (y * scaleY) ** 2;
      if (radiusSquared > 1) return false;
      factor = .58 + .42 * radiusSquared;
    } else if (lens === "concave") {
      factor = 1 + .9 * (1 - edge) ** 2;
    } else if (lens === "convex") {
      factor = .53 + .47 * edge ** 2;
    }
    point.x = x * factor;
    point.y = y * factor;
    return true;
  }

  function sourcePoint(lens, x, y, width, height) {
    const short = Math.min(width, height);
    const point = {};
    return mapPoint(lens, x, y, width / short, height / short, point) ? point : null;
  }

  // GPU WebGL Fragment Shader Renderer for hardware-accelerated 60fps mobile preview & capture
  const gpu = (() => {
    let canvas, gl, program, texture, posBuffer, uvBuffer, uLoc;
    let supported = null;
    let currentWidth = 0, currentHeight = 0;

    const LENS_IDS = {
      fisheye: 1, concave: 2, convex: 3, funhouse: 4, squeeze: 5,
      color: 6, blur: 7, pixel: 8, oldboy: 9, contrast: 10,
      invert: 11, painting: 12, dither: 13, newspaper: 14,
      kaleidoscope: 15, swirl: 16, ripple: 17,
      prism: 18, tiltshift: 19, cyber: 20, dream: 21, emboss: 22, thermal: 23
    };

    const VS = `
      attribute vec2 aPos;
      attribute vec2 aUv;
      varying vec2 vUv;
      void main() {
        vUv = aUv;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;

    const FS = `
      precision highp float;
      uniform sampler2D uTex;
      uniform vec2 uRes;
      uniform vec2 uScale;
      uniform int uLens;
      varying vec2 vUv;

      float luma(vec3 c) {
        return dot(c, vec3(0.213, 0.715, 0.072));
      }

      float hashNoise(vec2 p) {
        float n = sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123;
        return fract(n) - 0.5;
      }

      float pigmentCloud(vec2 p, float spacing) {
        vec2 ip = floor(p / spacing);
        vec2 fp = fract(p / spacing);
        vec2 s = fp * fp * (3.0 - 2.0 * fp);
        float a = hashNoise(ip);
        float b = hashNoise(ip + vec2(1.0, 0.0));
        float c = hashNoise(ip + vec2(0.0, 1.0));
        float d = hashNoise(ip + vec2(1.0, 1.0));
        return mix(mix(a, b, s.x), mix(c, d, s.x), s.y);
      }

      float bayer4(vec2 cell) {
        int x = int(mod(cell.x, 4.0));
        int y = int(mod(cell.y, 4.0));
        int idx = y * 4 + x;
        if (idx == 0) return 0.0; if (idx == 1) return 8.0; if (idx == 2) return 2.0; if (idx == 3) return 10.0;
        if (idx == 4) return 12.0; if (idx == 5) return 4.0; if (idx == 6) return 14.0; if (idx == 7) return 6.0;
        if (idx == 8) return 3.0; if (idx == 9) return 11.0; if (idx == 10) return 1.0; if (idx == 11) return 9.0;
        if (idx == 12) return 15.0; if (idx == 13) return 7.0; if (idx == 14) return 13.0; return 5.0;
      }

      vec4 sampleWarp(vec2 uv) {
        vec2 p = uv * 2.0 - 1.0;
        if (uLens == 5) { // squeeze
          float t18 = 0.946806;
          vec2 mp = vec2( (exp(2.0 * p.x * 1.8) - 1.0) / (exp(2.0 * p.x * 1.8) + 1.0) / t18, p.y );
          return texture2D(uTex, clamp(mp * 0.5 + 0.5, 0.0, 1.0));
        }
        if (uLens == 4) { // funhouse
          vec2 mp = vec2(
            p.x + sin(p.y * 4.712389) * 0.24 * (1.0 - p.x * p.x),
            p.y + sin(p.x * 3.141593) * 0.13 * (1.0 - p.y * p.y)
          );
          return texture2D(uTex, clamp(mp * 0.5 + 0.5, 0.0, 1.0));
        }
        if (uLens == 1) { // fisheye
          float r2 = dot(p * uScale, p * uScale);
          if (r2 > 1.0) return vec4(18.0/255.0, 17.0/255.0, 15.0/255.0, 1.0);
          float factor = 0.58 + 0.42 * r2;
          // Slight optical chromatic dispersion near lens edge for realism
          float ca = 0.004 * r2;
          float r = texture2D(uTex, clamp(p * (factor + ca) * 0.5 + 0.5, 0.0, 1.0)).r;
          float g = texture2D(uTex, clamp(p * factor * 0.5 + 0.5, 0.0, 1.0)).g;
          float b = texture2D(uTex, clamp(p * (factor - ca) * 0.5 + 0.5, 0.0, 1.0)).b;
          return vec4(r, g, b, 1.0);
        }
        if (uLens == 2 || uLens == 3) { // concave / convex
          float edge = max(abs(p.x), abs(p.y));
          float factor = (uLens == 2)
            ? (1.0 + 0.9 * (1.0 - edge) * (1.0 - edge))
            : (0.53 + 0.47 * edge * edge);
          return texture2D(uTex, clamp(p * factor * 0.5 + 0.5, 0.0, 1.0));
        }
        if (uLens == 15) { // kaleidoscope
          vec2 sp = p * uScale;
          float r = length(sp);
          float sector = 1.04719755; // PI / 3.0
          float theta = atan(p.y, p.x + 1e-6);
          theta = mod(theta, sector);
          if (theta > sector * 0.5) theta = sector - theta;
          vec2 mp = vec2(r * cos(theta) / uScale.x, r * sin(theta) / uScale.y);
          return texture2D(uTex, clamp(mp * 0.5 + 0.5, 0.0, 1.0));
        }
        if (uLens == 16) { // swirl
          vec2 sp = p * uScale;
          float r = length(sp);
          float angle = 2.4 * max(0.0, 1.0 - r / 1.15);
          float ca = cos(angle), sa = sin(angle);
          vec2 mp = vec2((sp.x * ca - sp.y * sa) / uScale.x, (sp.x * sa + sp.y * ca) / uScale.y);
          return texture2D(uTex, clamp(mp * 0.5 + 0.5, 0.0, 1.0));
        }
        if (uLens == 17) { // ripple
          vec2 sp = p * uScale;
          float r = length(sp);
          float wave = sin(r * 22.0) * 0.045 * max(0.0, 1.0 - r * 0.5);
          vec2 dir = r > 0.0001 ? sp / r : vec2(0.0);
          vec2 mp = p + dir * wave / uScale;
          return texture2D(uTex, clamp(mp * 0.5 + 0.5, 0.0, 1.0));
        }
        return texture2D(uTex, uv);
      }

      void main() {
        if (uLens <= 5 || (uLens >= 15 && uLens <= 17)) {
          gl_FragColor = sampleWarp(vUv);
          return;
        }
        vec4 base = texture2D(uTex, vUv);
        vec3 c = base.rgb;
        float unit = min(uRes.x, uRes.y);
        vec2 texel = 1.0 / uRes;

        if (uLens == 6) { // color
          float lum = (c.r + 2.0 * c.g + c.b) * 0.25;
          c = vec3(
            c.r * 1.15 - 13.0 / 255.0,
            c.g * 0.96 + 5.0 / 255.0,
            c.b * 1.04 + (31.0 / 255.0) * (1.0 - lum)
          );
          gl_FragColor = vec4(clamp(c, 0.0, 1.0), base.a);
          return;
        }
        if (uLens == 7) { // blur
          float stepPx = max(1.0, floor(unit * 0.0045 + 0.5));
          vec3 acc = vec3(0.0);
          float wSum = 0.0;
          for (int dy = -2; dy <= 2; dy++) {
            for (int dx = -2; dx <= 2; dx++) {
              float w = 1.0 / (1.0 + float(dx * dx + dy * dy) * 0.25);
              acc += texture2D(uTex, clamp(vUv + vec2(float(dx), float(dy)) * stepPx * texel, 0.0, 1.0)).rgb * w;
              wSum += w;
            }
          }
          gl_FragColor = vec4(acc / wSum, base.a);
          return;
        }
        if (uLens == 8 || uLens == 14) { // pixel / newspaper
          float bSize = max(3.0, floor(unit / (uLens == 8 ? 48.0 : 100.0) + 0.5));
          vec2 px = vUv * uRes;
          vec2 cell = floor(px / bSize);
          vec2 center = (cell + 0.5) * bSize;
          vec3 avg = (
            texture2D(uTex, clamp((center + vec2(-0.25, -0.25) * bSize) * texel, 0.0, 1.0)).rgb +
            texture2D(uTex, clamp((center + vec2( 0.25, -0.25) * bSize) * texel, 0.0, 1.0)).rgb +
            texture2D(uTex, clamp((center + vec2(-0.25,  0.25) * bSize) * texel, 0.0, 1.0)).rgb +
            texture2D(uTex, clamp((center + vec2( 0.25,  0.25) * bSize) * texel, 0.0, 1.0)).rgb
          ) * 0.25;
          if (uLens == 8) {
            gl_FragColor = vec4(avg, base.a);
            return;
          }
          float rad = sqrt(max(0.0, 1.0 - luma(avg)) / 3.14159265) * bSize;
          float dist = length(px - center);
          float cov = clamp(rad - dist + 0.5, 0.0, 1.0);
          vec3 paperCol = vec3(241.0, 231.0, 208.0) / 255.0;
          vec3 inkCol = vec3(212.0, 204.0, 183.0) / 255.0;
          gl_FragColor = vec4(paperCol - cov * inkCol, 1.0);
          return;
        }
        if (uLens == 9) { // oldboy
          c = vec3(
            c.r * 0.76 + c.g * 0.23 + 12.0 / 255.0,
            c.g * 0.88 + c.r * 0.09 + 6.0 / 255.0,
            c.b * 0.65 + c.g * 0.14 + 13.0 / 255.0
          );
          gl_FragColor = vec4(clamp(c, 0.0, 1.0), base.a);
          return;
        }
        if (uLens == 10) { // contrast
          gl_FragColor = vec4(clamp((c - 0.5) * 1.85 + 0.5, 0.0, 1.0), base.a);
          return;
        }
        if (uLens == 11) { // invert
          gl_FragColor = vec4(1.0 - c, base.a);
          return;
        }
        if (uLens == 13) { // dither
          float dSize = max(1.0, floor(unit / 300.0 + 0.5));
          vec2 cell = floor((vUv * uRes) / dSize);
          float offset = (bayer4(cell) / 16.0 - 0.5) * (85.0 / 255.0);
          vec3 q = floor((c + offset) * 3.0 + 0.5) / 3.0;
          gl_FragColor = vec4(clamp(q, 0.0, 1.0), base.a);
          return;
        }
        if (uLens == 12) { // GPU 4-quadrant Kuwahara watercolor
          float rad = max(1.0, min(5.0, floor(unit * 0.012 + 0.5)));
          vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
          float s0 = 0.0, s1 = 0.0, s2 = 0.0, s3 = 0.0;
          float s0_2 = 0.0, s1_2 = 0.0, s2_2 = 0.0, s3_2 = 0.0;
          float n = 0.0;
          for (int j = 0; j <= 3; j++) {
            float fj = float(j) * rad / 3.0;
            for (int i = 0; i <= 3; i++) {
              float fi = float(i) * rad / 3.0;
              vec3 c0 = texture2D(uTex, clamp(vUv + vec2(-fi, -fj) * texel, 0.0, 1.0)).rgb;
              vec3 c1 = texture2D(uTex, clamp(vUv + vec2( fi, -fj) * texel, 0.0, 1.0)).rgb;
              vec3 c2 = texture2D(uTex, clamp(vUv + vec2(-fi,  fj) * texel, 0.0, 1.0)).rgb;
              vec3 c3 = texture2D(uTex, clamp(vUv + vec2( fi,  fj) * texel, 0.0, 1.0)).rgb;
              float l0 = luma(c0), l1 = luma(c1), l2 = luma(c2), l3 = luma(c3);
              m0 += c0; m1 += c1; m2 += c2; m3 += c3;
              s0 += l0; s1 += l1; s2 += l2; s3 += l3;
              s0_2 += l0*l0; s1_2 += l1*l1; s2_2 += l2*l2; s3_2 += l3*l3;
              n += 1.0;
            }
          }
          m0 /= n; m1 /= n; m2 /= n; m3 /= n;
          s0 /= n; s1 /= n; s2 /= n; s3 /= n;
          float v0 = max(0.0, s0_2 / n - s0*s0);
          float v1 = max(0.0, s1_2 / n - s1*s1);
          float v2 = max(0.0, s2_2 / n - s2*s2);
          float v3 = max(0.0, s3_2 / n - s3*s3);
          float k = 85.0 / (255.0 * 255.0);
          float w0 = 1.0 / pow(1.0 + v0 / k, 2.0);
          float w1 = 1.0 / pow(1.0 + v1 / k, 2.0);
          float w2 = 1.0 / pow(1.0 + v2 / k, 2.0);
          float w3 = 1.0 / pow(1.0 + v3 / k, 2.0);
          vec3 col = (m0*w0 + m1*w1 + m2*w2 + m3*w3) / (w0 + w1 + w2 + w3);
          float lum = luma(c);
          float lightest = max(max(s0, s1), max(s2, s3));
          float darkest = min(min(s0, s1), min(s2, s3));
          float edge = min(17.0 / 255.0, (lightest - darkest) * 0.16) * max(0.0, 1.0 - (lum - darkest) / (32.0 / 255.0));
          float density = 1.0 - lum;
          vec2 px = vUv * uRes;
          float grain = hashNoise(px) * (3.0 + density * 8.0) / 255.0;
          float pool = pigmentCloud(px, max(3.0, unit * 0.028)) * (7.0 + density * 19.0) / 255.0;
          vec3 wash = vec3(1.0, 251.0/255.0, 240.0/255.0);
          vec3 outCol = col * 0.77 + c * 0.08 + wash * 0.15 + (grain + pool - edge);
          gl_FragColor = vec4(clamp(outCol, 0.0, 1.0), base.a);
          return;
        }
        if (uLens == 18) { // prism
          vec2 shift = vec2(0.022, 0.012);
          float r = texture2D(uTex, clamp(vUv + shift, 0.0, 1.0)).r;
          float g = c.g * 0.72 + texture2D(uTex, clamp(vUv - vec2(0.008, 0.0), 0.0, 1.0)).g * 0.28;
          float b = texture2D(uTex, clamp(vUv - shift, 0.0, 1.0)).b;
          vec3 flare = vec3(r * 0.22, g * 0.14, b * 0.26);
          gl_FragColor = vec4(clamp(vec3(r, g, b) * 0.88 + flare, 0.0, 1.0), base.a);
          return;
        }
        if (uLens == 19) { // tiltshift
          float band = smoothstep(0.16, 0.48, abs(vUv.y - 0.5));
          float stepPx = max(1.0, floor(unit * 0.005 * (0.2 + band) + 0.5));
          vec3 acc = vec3(0.0);
          float wSum = 0.0;
          for (int dy = -2; dy <= 2; dy++) {
            for (int dx = -2; dx <= 2; dx++) {
              float w = 1.0 / (1.0 + float(dx * dx + dy * dy) * 0.3);
              acc += texture2D(uTex, clamp(vUv + vec2(float(dx), float(dy)) * stepPx * texel, 0.0, 1.0)).rgb * w;
              wSum += w;
            }
          }
          vec3 blurred = acc / wSum;
          vec3 mixed = mix(c, blurred, band);
          float lum = luma(mixed);
          vec3 miniature = clamp(vec3(lum) + (mixed - vec3(lum)) * 1.32, 0.0, 1.0);
          gl_FragColor = vec4(miniature, base.a);
          return;
        }
        if (uLens == 20) { // cyber
          float bar = sin(vUv.y * 90.0) * 0.012 + step(0.86, fract(vUv.y * 13.0)) * 0.018;
          float r = texture2D(uTex, clamp(vUv + vec2(0.014 + bar, 0.0), 0.0, 1.0)).r;
          float g = c.g * 0.92;
          float b = texture2D(uTex, clamp(vUv - vec2(0.014 + bar, 0.0), 0.0, 1.0)).b;
          float scan = 0.92 + 0.08 * sin(vUv.y * uRes.y * 1.5);
          vec3 neon = vec3(r * 1.08 + 0.04, g * 0.95, b * 1.15 + 0.06) * scan;
          gl_FragColor = vec4(clamp(neon, 0.0, 1.0), base.a);
          return;
        }
        if (uLens == 21) { // dream
          float stepPx = max(1.0, floor(unit * 0.0055 + 0.5));
          vec3 acc = vec3(0.0);
          for (int dy = -1; dy <= 1; dy++) {
            for (int dx = -1; dx <= 1; dx++) {
              acc += texture2D(uTex, clamp(vUv + vec2(float(dx), float(dy)) * stepPx * texel * 1.6, 0.0, 1.0)).rgb;
            }
          }
          acc /= 9.0;
          vec3 soft = 1.0 - (1.0 - c) * (1.0 - acc * 0.42);
          soft = mix(soft, vec3(1.0, 0.94, 0.96), 0.08);
          gl_FragColor = vec4(clamp(soft, 0.0, 1.0), base.a);
          return;
        }
        if (uLens == 22) { // emboss
          vec3 tl = texture2D(uTex, clamp(vUv - vec2(2.0) * texel, 0.0, 1.0)).rgb;
          vec3 br = texture2D(uTex, clamp(vUv + vec2(2.0) * texel, 0.0, 1.0)).rgb;
          float diff = (luma(br) - luma(tl)) * 2.4 + 0.52;
          vec3 copper = vec3(diff * 1.08, diff * 0.94, diff * 0.80);
          gl_FragColor = vec4(clamp(copper, 0.0, 1.0), base.a);
          return;
        }
        if (uLens == 23) { // thermal
          float t = clamp(luma(c), 0.0, 1.0);
          vec3 col;
          if (t < 0.25) {
            col = mix(vec3(0.06, 0.04, 0.28), vec3(0.45, 0.05, 0.58), t / 0.25);
          } else if (t < 0.55) {
            col = mix(vec3(0.45, 0.05, 0.58), vec3(0.92, 0.24, 0.14), (t - 0.25) / 0.30);
          } else if (t < 0.82) {
            col = mix(vec3(0.92, 0.24, 0.14), vec3(1.0, 0.84, 0.16), (t - 0.55) / 0.27);
          } else {
            col = mix(vec3(1.0, 0.84, 0.16), vec3(1.0, 0.99, 0.94), (t - 0.82) / 0.18);
          }
          gl_FragColor = vec4(col, base.a);
          return;
        }
        gl_FragColor = base;
      }
    `;

    function init() {
      if (supported !== null) return supported;
      try {
        canvas = document.createElement("canvas");
        gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true });
        if (!gl) { supported = false; return false; }
        const dbg = gl.getExtension("WEBGL_debug_renderer_info");
        if (dbg) {
          const renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "";
          // Prefer ultra-fast deterministic CPU LUT path on headless software GL
          if (/SwiftShader|llvmpipe|Software/i.test(renderer)) {
            supported = false;
            return false;
          }
        }
        const compile = (type, src) => {
          const s = gl.createShader(type);
          gl.shaderSource(s, src);
          gl.compileShader(s);
          if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
          return s;
        };
        const vs = compile(gl.VERTEX_SHADER, VS);
        const fs = compile(gl.FRAGMENT_SHADER, FS);
        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("link");
        gl.useProgram(program);

        posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(program, "aPos");
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), gl.STATIC_DRAW);
        const aUv = gl.getAttribLocation(program, "aUv");
        gl.enableVertexAttribArray(aUv);
        gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        uLoc = {
          uTex: gl.getUniformLocation(program, "uTex"),
          uRes: gl.getUniformLocation(program, "uRes"),
          uScale: gl.getUniformLocation(program, "uScale"),
          uLens: gl.getUniformLocation(program, "uLens")
        };
        supported = true;
        return true;
      } catch {
        supported = false;
        return false;
      }
    }

    function render(source, context, x, width, height, lens) {
      const lensId = LENS_IDS[lens];
      if (!lensId || !init()) return false;
      if (currentWidth !== width || currentHeight !== height) {
        currentWidth = canvas.width = width;
        currentHeight = canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      const short = Math.min(width, height);
      gl.uniform1i(uLoc.uTex, 0);
      gl.uniform2f(uLoc.uRes, width, height);
      gl.uniform2f(uLoc.uScale, width / short, height / short);
      gl.uniform1i(uLoc.uLens, lensId);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      context.drawImage(canvas, 0, 0, width, height, x, 0, width, height);
      return true;
    }

    return { render };
  })();

  function soften(pixels, width, height, radius) {
    const temporary = new Uint8ClampedArray(pixels.length);
    // Sliding sums keep both preview and full-resolution processing linear in pixel count.
    function pass(source, target, rows, columns, step, rowStep) {
      const span = radius * 2 + 1;
      for (let row = 0; row < rows; row++) {
        const start = row * rowStep;
        for (let channel = 0; channel < 3; channel++) {
          let sum = 0;
          for (let offset = -radius; offset <= radius; offset++) {
            sum += source[start + Math.min(columns - 1, Math.max(0, offset)) * step + channel];
          }
          for (let column = 0; column < columns; column++) {
            const index = start + column * step;
            target[index + channel] = sum / span;
            sum += source[start + Math.min(columns - 1, column + radius + 1) * step + channel]
              - source[start + Math.max(0, column - radius) * step + channel];
            target[index + 3] = source[index + 3];
          }
        }
      }
    }
    pass(pixels, temporary, height, width, 4, width * 4);
    pass(temporary, pixels, width, height, width * 4, 4);
  }

  function paperNoise(x, y) {
    const seed = Math.imul(x + 31, 73856093) ^ Math.imul(y + 17, 19349663);
    return (Math.imul(seed ^ seed >>> 13, 1274126177) >>> 0) / 4294967295 - .5;
  }

  function pigmentCloud(x, y, spacing) {
    const column = Math.floor(x / spacing), row = Math.floor(y / spacing);
    const dx = x / spacing - column, dy = y / spacing - row;
    const horizontal = dx * dx * (3 - 2 * dx), vertical = dy * dy * (3 - 2 * dy);
    const top = paperNoise(column, row) * (1 - horizontal) + paperNoise(column + 1, row) * horizontal;
    const bottom = paperNoise(column, row + 1) * (1 - horizontal) + paperNoise(column + 1, row + 1) * horizontal;
    return top * (1 - vertical) + bottom * vertical;
  }

  function paintWatercolor(context, offset, width, height) {
    if (!paintingSurface) {
      paintingSurface = document.createElement("canvas");
      paintingContext = paintingSurface.getContext("2d", { willReadFrequently: true });
    }
    const scale = Math.min(1, 360 / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    if (paintingSurface.width !== w || paintingSurface.height !== h) {
      paintingSurface.width = w;
      paintingSurface.height = h;
    }
    paintingContext.clearRect(0, 0, w, h);
    paintingContext.imageSmoothingEnabled = true;
    paintingContext.imageSmoothingQuality = "high";
    paintingContext.drawImage(context.canvas, offset, 0, width, height, 0, 0, w, h);
    const image = paintingContext.getImageData(0, 0, w, h);
    const pixels = image.data;
    const stride = w + 1;
    const length = stride * (h + 1);
    if (!paintingSums || paintingSums[0].length !== length) {
      paintingSums = Array.from({ length: 5 }, () => new Float32Array(length));
    } else {
      for (const sum of paintingSums) sum.fill(0, 0, stride);
    }
    const [red, green, blue, tone, square] = paintingSums;
    for (let y = 0; y < h; y++) {
      const rowStart = (y + 1) * stride;
      red[rowStart] = green[rowStart] = blue[rowStart] = tone[rowStart] = square[rowStart] = 0;
      let r = 0, g = 0, b = 0, l = 0, l2 = 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const above = y * stride + x + 1;
        const next = above + stride;
        const luminance = .213 * pixels[i] + .715 * pixels[i + 1] + .072 * pixels[i + 2];
        r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; l += luminance; l2 += luminance * luminance;
        red[next] = red[above] + r;
        green[next] = green[above] + g;
        blue[next] = blue[above] + b;
        tone[next] = tone[above] + l;
        square[next] = square[above] + l2;
      }
    }
    const radius = Math.max(1, Math.round(Math.min(w, h) * .022));
    const spacing = Math.max(3, Math.round(Math.min(w, h) * .028));
    for (let y = 0; y < h; y++) {
      const top0 = Math.max(0, y - radius) * stride;
      const top1 = y * stride;
      const bot0 = Math.min(h, y + 1) * stride;
      const bot1 = Math.min(h, y + radius + 1) * stride;
      const h0 = Math.min(h, y + 1) - Math.max(0, y - radius);
      const h1 = Math.min(h, y + radius + 1) - y;
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - radius), x1 = x + 1, x2 = x, x3 = Math.min(w, x + radius + 1);
        const w0 = x1 - x0, w1 = x3 - x2;
        const qa = [top0 + x0, top0 + x2, top1 + x0, top1 + x2];
        const qb = [top0 + x1, top0 + x3, top1 + x1, top1 + x3];
        const qc = [bot0 + x0, bot0 + x2, bot1 + x0, bot1 + x2];
        const qd = [bot0 + x1, bot0 + x3, bot1 + x1, bot1 + x3];
        const qn = [w0 * h0, w1 * h0, w0 * h1, w1 * h1];

        let weights = 0, darkest = 255, lightest = 0, cr = 0, cg = 0, cb = 0;
        for (let q = 0; q < 4; q++) {
          const a = qa[q], b = qb[q], c = qc[q], d = qd[q], count = qn[q];
          const mean = (tone[d] - tone[c] - tone[b] + tone[a]) / count;
          const variance = Math.max(0, (square[d] - square[c] - square[b] + square[a]) / count - mean * mean);
          const weight = 1 / (1 + variance / 85) ** 2;
          weights += weight;
          if (mean < darkest) darkest = mean;
          if (mean > lightest) lightest = mean;
          cr += weight * (red[d] - red[c] - red[b] + red[a]) / count;
          cg += weight * (green[d] - green[c] - green[b] + green[a]) / count;
          cb += weight * (blue[d] - blue[c] - blue[b] + blue[a]) / count;
        }
        const i = (y * w + x) * 4;
        const luminance = .213 * pixels[i] + .715 * pixels[i + 1] + .072 * pixels[i + 2];
        const edge = Math.min(17, (lightest - darkest) * .16) * Math.max(0, 1 - (luminance - darkest) / 32);
        const density = 1 - luminance / 255;
        const pigment = paperNoise(x, y) * (3 + density * 8) + pigmentCloud(x, y, spacing) * (7 + density * 19) - edge;
        const invW = .77 / weights;
        pixels[i] = cr * invW + pixels[i] * .08 + 38.25 + pigment;
        pixels[i + 1] = cg * invW + pixels[i + 1] * .08 + 37.65 + pigment;
        pixels[i + 2] = cb * invW + pixels[i + 2] * .08 + 36 + pigment;
      }
    }
    paintingContext.putImageData(image, 0, 0);
    context.clearRect(offset, 0, width, height);
    context.drawImage(paintingSurface, offset, 0, width, height);
  }

  function getHalftoneOffsets(size) {
    if (reuseHalftone?.size === size) return reuseHalftone.dist;
    const dist = new Float32Array(size * size);
    const mid = size * 0.5;
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        dist[dy * size + dx] = Math.hypot(dx + 0.5 - mid, dy + 0.5 - mid);
      }
    }
    reuseHalftone = { size, dist };
    return dist;
  }

  function pixelEffect(pixels, width, height, lens) {
    const unit = Math.min(width, height);
    if (lens === "blur") {
      soften(pixels, width, height, Math.max(1, Math.round(unit * .009)));
      return;
    }
    if (lens === "pixel" || lens === "newspaper") {
      const size = Math.max(3, Math.round(unit / (lens === "pixel" ? 48 : 100)));
      const distTable = lens === "newspaper" ? getHalftoneOffsets(size) : null;
      for (let y = 0; y < height; y += size) {
        const endY = Math.min(height, y + size);
        const bh = endY - y;
        for (let x = 0; x < width; x += size) {
          const endX = Math.min(width, x + size);
          const bw = endX - x;
          let red = 0, green = 0, blue = 0;
          for (let row = y; row < endY; row++) {
            let idx = (row * width + x) * 4;
            for (let col = x; col < endX; col++, idx += 4) {
              red += pixels[idx]; green += pixels[idx + 1]; blue += pixels[idx + 2];
            }
          }
          const inv = 1 / (bw * bh);
          red *= inv; green *= inv; blue *= inv;
          if (lens === "newspaper") {
            const radius = Math.sqrt((1 - (.213 * red + .715 * green + .072 * blue) / 255) / Math.PI) * size;
            for (let dy = 0; dy < bh; dy++) {
              let idx = ((y + dy) * width + x) * 4;
              const dRow = dy * size;
              for (let dx = 0; dx < bw; dx++, idx += 4) {
                const coverage = Math.min(1, Math.max(0, radius - distTable[dRow + dx] + .5));
                pixels[idx] = 241 - coverage * 212;
                pixels[idx + 1] = 231 - coverage * 204;
                pixels[idx + 2] = 208 - coverage * 183;
              }
            }
          } else {
            for (let row = y; row < endY; row++) {
              let idx = (row * width + x) * 4;
              for (let col = x; col < endX; col++, idx += 4) {
                pixels[idx] = red; pixels[idx + 1] = green; pixels[idx + 2] = blue;
              }
            }
          }
        }
      }
      return;
    }
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const ditherSize = Math.max(1, Math.round(unit / 300));
    if (lens === "oldboy") {
      for (let i = 0; i < pixels.length; i += 4) {
        const red = pixels[i], green = pixels[i + 1], blue = pixels[i + 2];
        pixels[i] = red * .76 + green * .23 + 12;
        pixels[i + 1] = green * .88 + red * .09 + 6;
        pixels[i + 2] = blue * .65 + green * .14 + 13;
      }
    } else if (lens === "dither") {
      for (let y = 0, p = 0; y < height; y++) {
        const by = (Math.floor(y / ditherSize) & 3) * 4;
        for (let x = 0; x < width; x++, p += 4) {
          const offset = (bayer[by + (Math.floor(x / ditherSize) & 3)] / 16 - .5) * 85;
          pixels[p] = Math.round((pixels[p] + offset) / 85) * 85;
          pixels[p + 1] = Math.round((pixels[p + 1] + offset) / 85) * 85;
          pixels[p + 2] = Math.round((pixels[p + 2] + offset) / 85) * 85;
        }
      }
    } else if (lens === "invert") {
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 255 - pixels[i];
        pixels[i + 1] = 255 - pixels[i + 1];
        pixels[i + 2] = 255 - pixels[i + 2];
      }
    } else if (lens === "contrast") {
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = (pixels[i] - 127.5) * 1.85 + 127.5;
        pixels[i + 1] = (pixels[i + 1] - 127.5) * 1.85 + 127.5;
        pixels[i + 2] = (pixels[i + 2] - 127.5) * 1.85 + 127.5;
      }
    } else if (lens === "prism") {
      const orig = new Uint8ClampedArray(pixels);
      const sx = Math.max(2, Math.round(width * .022));
      const sy = Math.max(1, Math.round(height * .012));
      const gx = Math.max(1, Math.round(width * .008));
      for (let y = 0; y < height; y++) {
        const yPlus = Math.min(height - 1, y + sy);
        const yMinus = Math.max(0, y - sy);
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const xr = Math.min(width - 1, x + sx);
          const xg = Math.max(0, x - gx);
          const xb = Math.max(0, x - sx);
          const ir = (yPlus * width + xr) * 4;
          const ig = (y * width + xg) * 4;
          const ib = (yMinus * width + xb) * 4;
          const r = orig[ir];
          const g = orig[i + 1] * .72 + orig[ig + 1] * .28;
          const b = orig[ib + 2];
          pixels[i] = r * 1.07;
          pixels[i + 1] = g * 1.00;
          pixels[i + 2] = b * 1.11;
        }
      }
    } else if (lens === "tiltshift") {
      const blurred = new Uint8ClampedArray(pixels);
      soften(blurred, width, height, Math.max(2, Math.round(unit * .012)));
      for (let y = 0; y < height; y++) {
        const dy = Math.abs(y / height - 0.5);
        const band = Math.max(0, Math.min(1, (dy - 0.16) / 0.32));
        const t = band * band * (3 - 2 * band);
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const mr = pixels[i] * (1 - t) + blurred[i] * t;
          const mg = pixels[i + 1] * (1 - t) + blurred[i + 1] * t;
          const mb = pixels[i + 2] * (1 - t) + blurred[i + 2] * t;
          const lum = 0.213 * mr + 0.715 * mg + 0.072 * mb;
          pixels[i] = lum + (mr - lum) * 1.32;
          pixels[i + 1] = lum + (mg - lum) * 1.32;
          pixels[i + 2] = lum + (mb - lum) * 1.32;
        }
      }
    } else if (lens === "cyber") {
      const orig = new Uint8ClampedArray(pixels);
      for (let y = 0; y < height; y++) {
        const ny = y / height;
        const bar = Math.round(width * (Math.sin(ny * 90) * 0.012 + ((ny * 13) % 1 > 0.86 ? 0.018 : 0)));
        const shift = Math.max(2, Math.round(width * 0.014)) + bar;
        const scan = (y & 1) ? 0.90 : 1.0;
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const ir = (y * width + Math.min(width - 1, Math.max(0, x + shift))) * 4;
          const ib = (y * width + Math.min(width - 1, Math.max(0, x - shift))) * 4;
          pixels[i] = (orig[ir] * 1.08 + 10) * scan;
          pixels[i + 1] = orig[i + 1] * 0.95 * scan;
          pixels[i + 2] = (orig[ib + 2] * 1.15 + 15) * scan;
        }
      }
    } else if (lens === "dream") {
      const blurred = new Uint8ClampedArray(pixels);
      soften(blurred, width, height, Math.max(2, Math.round(unit * .014)));
      for (let i = 0; i < pixels.length; i += 4) {
        const r = 255 - ((255 - pixels[i]) * (255 - blurred[i] * .42)) / 255;
        const g = 255 - ((255 - pixels[i + 1]) * (255 - blurred[i + 1] * .42)) / 255;
        const b = 255 - ((255 - pixels[i + 2]) * (255 - blurred[i + 2] * .42)) / 255;
        pixels[i] = r * 0.92 + 255 * 0.08;
        pixels[i + 1] = g * 0.92 + 240 * 0.08;
        pixels[i + 2] = b * 0.92 + 245 * 0.08;
      }
    } else if (lens === "emboss") {
      const orig = new Uint8ClampedArray(pixels);
      const step = Math.max(1, Math.round(unit * 0.008));
      for (let y = 0; y < height; y++) {
        const y0 = Math.max(0, y - step);
        const y1 = Math.min(height - 1, y + step);
        for (let x = 0; x < width; x++) {
          const x0 = Math.max(0, x - step);
          const x1 = Math.min(width - 1, x + step);
          const i = (y * width + x) * 4;
          const i0 = (y0 * width + x0) * 4;
          const i1 = (y1 * width + x1) * 4;
          const l0 = 0.213 * orig[i0] + 0.715 * orig[i0 + 1] + 0.072 * orig[i0 + 2];
          const l1 = 0.213 * orig[i1] + 0.715 * orig[i1 + 1] + 0.072 * orig[i1 + 2];
          const diff = Math.max(0, Math.min(255, (l1 - l0) * 2.4 + 132));
          pixels[i] = diff * 1.08;
          pixels[i + 1] = diff * 0.94;
          pixels[i + 2] = diff * 0.80;
        }
      }
    } else if (lens === "thermal") {
      for (let i = 0; i < pixels.length; i += 4) {
        const t = (0.213 * pixels[i] + 0.715 * pixels[i + 1] + 0.072 * pixels[i + 2]) / 255;
        let r, g, b;
        if (t < 0.25) {
          const u = t / 0.25;
          r = 15 + u * (115 - 15);
          g = 10 + u * (13 - 10);
          b = 71 + u * (148 - 71);
        } else if (t < 0.55) {
          const u = (t - 0.25) / 0.30;
          r = 115 + u * (235 - 115);
          g = 13 + u * (61 - 13);
          b = 148 + u * (36 - 148);
        } else if (t < 0.82) {
          const u = (t - 0.55) / 0.27;
          r = 235 + u * (255 - 235);
          g = 61 + u * (214 - 61);
          b = 36 + u * (41 - 36);
        } else {
          const u = (t - 0.82) / 0.18;
          r = 255;
          g = 214 + u * (252 - 214);
          b = 41 + u * (240 - 41);
        }
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
      }
    }
  }

  function getDistortionLut(lens, width, height) {
    const key = `${lens}:${width}:${height}`;
    if (lutCache.has(key)) return lutCache.get(key);
    const offsets = new Int32Array(width * height);
    const point = {};
    const short = Math.min(width, height);
    const scaleX = width / short;
    const scaleY = height / short;
    for (let row = 0, pixel = 0; row < height; row++) {
      const v = (row + .5) * 2 / height - 1;
      for (let column = 0; column < width; column++, pixel++) {
        const u = (column + .5) * 2 / width - 1;
        if (mapPoint(lens, u, v, scaleX, scaleY, point)) {
          const sx = Math.min(width - 1, Math.max(0, Math.floor((point.x + 1) * .5 * width)));
          const sy = Math.min(height - 1, Math.max(0, Math.floor((point.y + 1) * .5 * height)));
          offsets[pixel] = sy * width + sx;
        } else {
          offsets[pixel] = -1;
        }
      }
    }
    if (lutCache.size >= 4) lutCache.delete(lutCache.keys().next().value);
    lutCache.set(key, offsets);
    return offsets;
  }

  function transform(context, x, width, height, lens) {
    if (!active([lens])) return;
    if (width * height > 65536 && x === 0 && width === context.canvas.width && gpu.render(context.canvas, context, x, width, height, lens)) {
      return;
    }
    if (lens === "painting") {
      paintWatercolor(context, x, width, height);
      return;
    }
    const input = context.getImageData(x, 0, width, height);
    const pixels = input.data;
    if (lens === "blur" || lens === "pixel" || lens === "oldboy" || lens === "contrast" || lens === "invert" || lens === "dither" || lens === "newspaper" ||
        lens === "prism" || lens === "tiltshift" || lens === "cyber" || lens === "dream" || lens === "emboss" || lens === "thermal") {
      pixelEffect(pixels, width, height, lens);
      context.putImageData(input, x, 0);
      return;
    }
    if (lens === "color") {
      for (let i = 0; i < pixels.length; i += 4) {
        const luminance = (pixels[i] + 2 * pixels[i + 1] + pixels[i + 2]) * 0.25;
        pixels[i] = pixels[i] * 1.15 - 13;
        pixels[i + 1] = pixels[i + 1] * .96 + 5;
        pixels[i + 2] = pixels[i + 2] * 1.04 + 31 * (1 - luminance / 255);
      }
      context.putImageData(input, x, 0);
      return;
    }

    if (!reuseOutput || reuseOutput.width !== width || reuseOutput.height !== height) {
      reuseOutput = context.createImageData(width, height);
    }
    const offsets = getDistortionLut(lens, width, height);
    const src32 = new Uint32Array(pixels.buffer, pixels.byteOffset, pixels.byteLength >> 2);
    const dst32 = new Uint32Array(reuseOutput.data.buffer, reuseOutput.data.byteOffset, reuseOutput.data.byteLength >> 2);
    const len = offsets.length;
    for (let i = 0; i < len; i++) {
      const s = offsets[i];
      // Little-endian ABGR for RGBA [18, 17, 15, 255]
      dst32[i] = s < 0 ? 0xFF0F1112 : src32[s];
    }
    context.putImageData(reuseOutput, x, 0);
  }

  function draw(source, target = sharedCanvas, lenses, maxDimension = 4096) {
    const sourceWidth = source.naturalWidth || source.width;
    const sourceHeight = source.naturalHeight || source.height;
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    if (target.width !== width) target.width = width;
    if (target.height !== height) target.height = height;
    const preferGpu = lenses.length === 1 && active(lenses) && width * height > 65536;
    const context = preferGpu ? target.getContext("2d") : target.getContext("2d", { willReadFrequently: true });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.clearRect(0, 0, width, height);
    if (preferGpu && gpu.render(source, context, 0, width, height, lenses[0])) {
      return target;
    }
    context.drawImage(source, 0, 0, width, height);
    if (lenses.length === 2) {
      const originalGutter = Math.max(2, Math.round(sourceHeight / 100));
      const split = (sourceWidth - originalGutter) / 2;
      const panelWidth = Math.floor(split * width / sourceWidth);
      if (panelWidth > 0) {
        transform(context, 0, panelWidth, height, lenses[0]);
        transform(context, width - panelWidth, panelWidth, height, lenses[1]);
      }
    } else {
      transform(context, 0, width, height, lenses[0]);
    }
    return target;
  }

  return { choices, active, sourcePoint, draw };
})();

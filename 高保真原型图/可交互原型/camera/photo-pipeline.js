"use strict";

window.CameraPhoto = (() => {
  const formats = { JPG: "image/jpeg", PNG: "image/png" };
  const maxSide = 1440;

  // Persistent offscreen canvases prevent per-frame GC stalls during 60fps preview
  const lensWorkCanvas = document.createElement("canvas");
  const developWorkCanvas = document.createElement("canvas");
  const bloomCanvas = document.createElement("canvas");
  const bloomCtx = bloomCanvas.getContext("2d");

  function canvas(width, height, target = null) {
    const result = target || document.createElement("canvas");
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    if (result.width !== w) result.width = w;
    if (result.height !== h) result.height = h;
    return result;
  }

  function encode(source, type, quality = .94) {
    return new Promise((resolve, reject) => {
      source.toBlob(blob => {
        if (blob?.type === type) resolve(blob);
        else reject(new Error("无法编码照片"));
      }, type, quality);
    });
  }

  function filter(roll, ev = 0, light = 1) {
    const brightness = 2 ** (ev / 2) * light;
    return [roll?.cssFilter, brightness === 1 ? "" : `brightness(${brightness})`].filter(Boolean).join(" ") || "none";
  }

  function sourceRect(width, height, viewWidth, viewHeight, scale, positionY = .5) {
    const cover = Math.max(viewWidth / width, viewHeight / height);
    const unscaledHeight = viewHeight / cover;
    return {
      scale: cover * scale,
      x: width / 2,
      y: height / 2 + (height - unscaledHeight) * (positionY - .5)
    };
  }

  function fromView(media, view, frame, { scale, positionY, mirror, maxDimension = maxSide, target }) {
    const width = media.videoWidth || media.naturalWidth;
    const height = media.videoHeight || media.naturalHeight;
    if (!width || !height || !frame.clientWidth || !frame.clientHeight) throw new Error("取景画面尚未就绪");
    const rect = sourceRect(width, height, view.clientWidth, view.clientHeight, scale, positionY);
    const cropWidth = frame.clientWidth / rect.scale;
    const cropHeight = frame.clientHeight / rect.scale;
    const size = Math.min(1, maxDimension / Math.max(cropWidth, cropHeight));
    const result = target || document.createElement("canvas");
    const outputWidth = Math.max(1, Math.round(cropWidth * size));
    const outputHeight = Math.max(1, Math.round(cropHeight * size));
    if (result.width !== outputWidth) result.width = outputWidth;
    if (result.height !== outputHeight) result.height = outputHeight;
    const context = result.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.clearRect(0, 0, result.width, result.height);
    context.save();
    if (mirror) {
      context.translate(result.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(media, rect.x - cropWidth / 2, rect.y - cropHeight / 2, cropWidth, cropHeight, 0, 0, result.width, result.height);
    context.restore();
    return result;
  }

  function combine(first, second) {
    const aspect = Math.min(first.width / first.height, second.width / second.height);
    const height = Math.min(first.height, second.height, Math.floor(maxSide / (aspect * 2 + .012)));
    const width = Math.max(1, Math.round(aspect * height));
    const gutter = Math.max(2, Math.round(height / 100));
    const result = canvas(width * 2 + gutter, height);
    const context = result.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.fillStyle = "#1d1d1b";
    context.fillRect(0, 0, result.width, result.height);
    [first, second].forEach((frame, index) => {
      const cropWidth = Math.min(frame.width, frame.height * aspect);
      context.drawImage(frame, (frame.width - cropWidth) / 2, 0, cropWidth, frame.height,
        index * (width + gutter), 0, width, height);
    });
    return result;
  }

  function load(blob) {
    const url = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("无法读取这张照片"));
      image.src = url;
    }).finally(() => URL.revokeObjectURL(url));
  }

  function parseFilterMatrix(value) {
    let mat = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    let off = [0, 0, 0];
    if (!value || value === "none") return { mat, off };
    const luma = [.213, .715, .072];
    const sepia = [[.393, .769, .189], [.349, .686, .168], [.272, .534, .131]];
    const hueSin = [[-.213, -.715, .928], [.143, .140, -.283], [-.787, .715, .072]];
    for (const [, name, raw] of value.matchAll(/([a-z-]+)\((-?[\d.]+)(?:deg)?\)/g)) {
      const amount = Number(raw);
      const a = luma.map((_, row) => luma.map((weight, column) => {
        const identity = row === column ? 1 : 0;
        switch (name) {
          case "grayscale": return identity * (1 - amount) + weight * amount;
          case "saturate": return weight + (identity - weight) * amount;
          case "sepia": return identity * (1 - amount) + sepia[row][column] * amount;
          case "hue-rotate": {
            const angle = amount * Math.PI / 180;
            return weight + (identity - weight) * Math.cos(angle) + hueSin[row][column] * Math.sin(angle);
          }
          case "contrast":
          case "brightness": return identity * amount;
          default: return identity;
        }
      })).flat();
      const b = name === "contrast" ? 127.5 * (1 - amount) : 0;
      mat = [
        a[0] * mat[0] + a[1] * mat[3] + a[2] * mat[6],
        a[0] * mat[1] + a[1] * mat[4] + a[2] * mat[7],
        a[0] * mat[2] + a[1] * mat[5] + a[2] * mat[8],
        a[3] * mat[0] + a[4] * mat[3] + a[5] * mat[6],
        a[3] * mat[1] + a[4] * mat[4] + a[5] * mat[7],
        a[3] * mat[2] + a[4] * mat[5] + a[5] * mat[8],
        a[6] * mat[0] + a[7] * mat[3] + a[8] * mat[6],
        a[6] * mat[1] + a[7] * mat[4] + a[8] * mat[7],
        a[6] * mat[2] + a[7] * mat[5] + a[8] * mat[8]
      ];
      off = [
        a[0] * off[0] + a[1] * off[1] + a[2] * off[2] + b,
        a[3] * off[0] + a[4] * off[1] + a[5] * off[2] + b,
        a[6] * off[0] + a[7] * off[1] + a[8] * off[2] + b
      ];
    }
    return { mat, off };
  }

  function pixelFilter(context, width, height, value, x = 0) {
    const { mat, off } = parseFilterMatrix(value);
    const [rr, rg, rb, gr, gg, gb, br, bg, bb] = mat;
    const [or, og, ob] = off;
    const image = context.getImageData(x, 0, width, height);
    const pixels = image.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      pixels[i] = r * rr + g * rg + b * rb + or;
      pixels[i + 1] = r * gr + g * gg + b * gb + og;
      pixels[i + 2] = r * br + g * bg + b * bb + ob;
    }
    context.putImageData(image, x, 0);
  }

  // Single-pass WebGL film shader accelerates color filter + film look for normal & special lenses alike.
  const filmGpu = (() => {
    let glCanvas, gl, program, tex, posBuf, uvBuf, panelBuf, panelCtx, uLoc;
    let supported = null;
    let curW = 0, curH = 0;

    const VS = `
      attribute vec2 aPos;
      attribute vec2 aUv;
      varying vec2 vUv;
      void main() { vUv = aUv; gl_Position = vec4(aPos, 0.0, 1.0); }
    `;

    const FS = `
      precision highp float;
      uniform sampler2D uTex;
      uniform vec2 uRes;
      uniform vec3 uRow0, uRow1, uRow2, uOff;
      uniform int uHasFilm, uMode, uHasLeak;
      uniform float uCurve, uToe, uVig, uGrainAmp;
      uniform vec3 uSh, uHi;
      varying vec2 vUv;

      float sCurve(float v, float curve, float toeNorm) {
        float s = v * v * (3.0 - 2.0 * v);
        float c = mix(v, s, curve);
        return toeNorm + c * (1.0 - toeNorm * 1.15);
      }

      void main() {
        vec4 base = texture2D(uTex, vUv);
        float nx = vUv.x * 2.0 - 1.0;
        float ny = 1.0 - vUv.y * 2.0;
        float r2 = nx * nx + ny * ny;

        if (uHasFilm == 1 && base.r < 0.094 && base.g < 0.094 && base.b < 0.094 && r2 > 0.85) {
          gl_FragColor = base;
          return;
        }

        vec3 rgb = vec3(
          dot(base.rgb, uRow0) + uOff.x,
          dot(base.rgb, uRow1) + uOff.y,
          dot(base.rgb, uRow2) + uOff.z
        );
        if (uHasFilm == 0) {
          gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), base.a);
          return;
        }

        vec3 c = clamp(rgb, 0.0, 1.0);
        float toeNorm = uToe / 255.0;
        vec2 px = floor(vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y));
        float rnd = fract(sin(dot(px, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;

        if (uMode == 1) {
          float lum = dot(c, vec3(0.299, 0.587, 0.114));
          float v = sCurve(lum, uCurve, toeNorm);
          if (uVig > 0.0) v *= max(0.45, 1.0 - uVig * r2 * r2);
          float nw = 4.0 * v * (1.0 - v);
          float outV = clamp(v + rnd * (uGrainAmp / 255.0) * nw, 0.0, 1.0);
          gl_FragColor = vec4(vec3(outV), base.a);
          return;
        }

        vec3 s = vec3(
          sCurve(c.r, uCurve, toeNorm),
          sCurve(c.g, uCurve, toeNorm),
          sCurve(c.b, uCurve, toeNorm)
        );
        if (uMode == 2) {
          s = vec3(s.r * 1.08 + s.g * 0.24, s.g * 0.68 + s.r * 0.22, s.b * 0.34);
        } else if (uMode == 3) {
          float ml = dot(s, vec3(0.299, 0.587, 0.114));
          s = mix(vec3(ml), s, 0.62);
        }

        float luma = clamp(dot(s, vec3(0.213, 0.715, 0.072)), 0.0, 1.0);
        s += uSh * ((1.0 - luma) * (1.0 - luma)) + uHi * (luma * luma);
        if (uVig > 0.0) s *= max(0.45, 1.0 - uVig * r2 * r2);

        if (uHasLeak == 1 && nx > 0.22) {
          float edge = min(1.0, (nx - 0.22) / 0.78);
          float dy = ny - 0.12;
          float band = exp(-dy * dy * 3.2) * edge * edge;
          s += band * vec3(68.0, 26.0, 8.0) / 255.0;
        }

        float nw = 4.0 * luma * (1.0 - luma);
        float noise = rnd * (uGrainAmp / 255.0) * nw;
        s += vec3(noise, noise * 0.96, noise * 0.92);
        gl_FragColor = vec4(clamp(s, 0.0, 1.0), base.a);
      }
    `;

    function init() {
      if (supported !== null) return supported;
      try {
        glCanvas = document.createElement("canvas");
        gl = glCanvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
        if (!gl) { supported = false; return false; }
        const compile = (type, src) => {
          const sh = gl.createShader(type);
          gl.shaderSource(sh, src);
          gl.compileShader(sh);
          return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
        };
        const vs = compile(gl.VERTEX_SHADER, VS);
        const fs = compile(gl.FRAGMENT_SHADER, FS);
        if (!vs || !fs) { supported = false; return false; }
        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { supported = false; return false; }
        gl.useProgram(program);

        posBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(program, "aPos");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        uvBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
        const uvLoc = gl.getAttribLocation(program, "aUv");
        gl.enableVertexAttribArray(uvLoc);
        gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

        tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        uLoc = {};
        for (const name of ["uTex", "uRes", "uRow0", "uRow1", "uRow2", "uOff", "uHasFilm", "uMode", "uHasLeak", "uCurve", "uToe", "uVig", "uGrainAmp", "uSh", "uHi"]) {
          uLoc[name] = gl.getUniformLocation(program, name);
        }
        panelBuf = document.createElement("canvas");
        panelCtx = panelBuf.getContext("2d");
        supported = true;
      } catch {
        supported = false;
      }
      return supported;
    }

    function render(context, x, width, height, effect, p, roll, isPreview) {
      if (!init() || width <= 0 || height <= 0) return false;
      if (gl.isContextLost()) { supported = false; return false; }
      let texSource = context.canvas;
      if (x !== 0 || width !== context.canvas.width || height !== context.canvas.height) {
        if (panelBuf.width !== width) panelBuf.width = width;
        if (panelBuf.height !== height) panelBuf.height = height;
        panelCtx.clearRect(0, 0, width, height);
        panelCtx.drawImage(context.canvas, x, 0, width, height, 0, 0, width, height);
        texSource = panelBuf;
      }
      if (curW !== width || curH !== height) {
        glCanvas.width = curW = width;
        glCanvas.height = curH = height;
        gl.viewport(0, 0, width, height);
      }
      const { mat, off } = parseFilterMatrix(effect);
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texSource);
      gl.uniform1i(uLoc.uTex, 0);
      gl.uniform2f(uLoc.uRes, width, height);
      gl.uniform3f(uLoc.uRow0, mat[0], mat[1], mat[2]);
      gl.uniform3f(uLoc.uRow1, mat[3], mat[4], mat[5]);
      gl.uniform3f(uLoc.uRow2, mat[6], mat[7], mat[8]);
      gl.uniform3f(uLoc.uOff, off[0] / 255, off[1] / 255, off[2] / 255);
      const hasFilm = Boolean(roll) && !isPreview;
      gl.uniform1i(uLoc.uHasFilm, hasFilm ? 1 : 0);
      if (hasFilm) {
        const mode = p.isMono ? 1 : p.id === "32" ? 2 : p.id === "27" ? 3 : 0;
        gl.uniform1i(uLoc.uMode, mode);
        gl.uniform1i(uLoc.uHasLeak, (roll.leak || 0) > 0 && !p.isMono ? 1 : 0);
        gl.uniform1f(uLoc.uCurve, p.curve);
        gl.uniform1f(uLoc.uToe, p.toe);
        gl.uniform1f(uLoc.uVig, (roll.vignette || 0) * 0.12);
        gl.uniform1f(uLoc.uGrainAmp, (roll.grain || 0) * 4.8 + 1.6);
        gl.uniform3f(uLoc.uSh, p.shR / 255, p.shG / 255, p.shB / 255);
        gl.uniform3f(uLoc.uHi, p.hiR / 255, p.hiG / 255, p.hiB / 255);
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      context.clearRect(x, 0, width, height);
      context.drawImage(glCanvas, 0, 0, width, height, x, 0, width, height);
      return true;
    }

    return { render };
  })();

  function rollToneProfile(roll) {
    if (roll?.customTone) {
      const ct = roll.customTone;
      return {
        isMono: Boolean(ct.isMono),
        shR: Number(ct.shR) || 0,
        shG: Number(ct.shG) || 0,
        shB: Number(ct.shB) || 0,
        hiR: Number(ct.hiR) || 0,
        hiG: Number(ct.hiG) || 0,
        hiB: Number(ct.hiB) || 0,
        toe: Number.isFinite(ct.toe) ? ct.toe : 4,
        curve: Number.isFinite(ct.curve) ? ct.curve : 0.22,
        id: roll.id
      };
    }
    const id = roll.id;
    const cat = roll.category;
    const isMono = cat === "专业黑白";
    let shR = 0, shG = 0, shB = 0;
    let hiR = 0, hiG = 0, hiB = 0;
    let toe = 4, curve = 0.22;

    if (isMono) {
      toe = id === "20" || id === "38" ? 2 : 5;
      curve = id === "20" || id === "38" ? 0.34 : 0.22;
    } else if (cat === "柯达暖金") {
      shR = 5; shG = 1; shB = -4;
      hiR = 9; hiG = 4; hiB = -8;
      toe = id === "02" ? 8 : 4;
      curve = id === "05" || id === "06" || id === "37" ? 0.28 : 0.16;
    } else if (cat === "富士日系") {
      // Classic 4th-layer mint/cyan shadows + airy highlights
      shR = -6; shG = 5; shB = 6;
      hiR = 1; hiG = 4; hiB = 3;
      toe = id === "07" || id === "12" || id === "36" ? 7 : 4;
      curve = id === "11" || id === "09" ? 0.26 : 0.14;
    } else if (cat === "电影夜景") {
      shR = -9; shG = 3; shB = 11;
      hiR = 8; hiG = 3; hiB = -6;
      if (id === "33") { shR = -4; shB = 7; hiR = 12; hiG = 4; hiB = -7; }
      else if (id === "39") { shR = -5; shG = 2; shB = 6; hiR = 5; hiG = 4; hiB = -2; }
      toe = 5;
      curve = 0.24;
    } else if (id === "32") { // Redscale 100
      shR = 18; shG = -4; shB = -18;
      hiR = 20; hiG = 6; hiB = -24;
      toe = 3; curve = 0.28;
    } else if (id === "34") { // Phoenix 200
      shR = 12; shG = -2; shB = -10;
      hiR = 16; hiG = 5; hiB = -12;
      toe = 3; curve = 0.32;
    } else if (id === "35") { // Lomo Purple
      shR = 10; shG = -10; shB = 14;
      hiR = 8; hiG = -4; hiB = 10;
      toe = 4; curve = 0.26;
    } else if (id === "40") { // Cyber Neon 800
      shR = -12; shG = 6; shB = 16;
      hiR = 14; hiG = -5; hiB = 14;
      toe = 2; curve = 0.30;
    } else if (id === "27") { // Metropolis bleach-bypass look
      shR = -5; shG = 3; shB = 1;
      hiR = 4; hiG = 2; hiB = -5;
      toe = 3; curve = 0.35;
    } else if (id === "28") { // Y2K CCD 2004
      shR = -4; shG = 0; shB = 6;
      hiR = 5; hiG = 6; hiB = 8;
      toe = 2; curve = 0.25;
    } else {
      shR = 4; shG = -1; shB = 4;
      hiR = 7; hiG = 4; hiB = -4;
      toe = 5; curve = 0.22;
    }
    return { isMono, shR, shG, shB, hiR, hiG, hiB, toe, curve, id };
  }

  function applyBloom(context, x, width, height, roll, p) {
    const isHalation = Boolean(roll.halation) || p.id === "16" || p.id === "14" || p.id === "32" || p.id === "33" || p.id === "34";
    const bloomStrength = roll.bloom || 0;
    if (bloomStrength < 10) return;
    const bw = Math.max(16, Math.min(112, Math.round(width * 0.14)));
    const bh = Math.max(16, Math.min(112, Math.round(height * 0.14)));
    if (bloomCanvas.width !== bw) bloomCanvas.width = bw;
    if (bloomCanvas.height !== bh) bloomCanvas.height = bh;
    bloomCtx.clearRect(0, 0, bw, bh);
    bloomCtx.drawImage(context.canvas, x, 0, width, height, 0, 0, bw, bh);
    const bImg = bloomCtx.getImageData(0, 0, bw, bh);
    const bd = bImg.data;
    for (let i = 0; i < bd.length; i += 4) {
      const l = 0.213 * bd[i] + 0.715 * bd[i + 1] + 0.072 * bd[i + 2];
      if (l > 202) {
        const factor = (l - 202) / 53;
        if (isHalation) {
          bd[i] = Math.min(255, 255 * factor);
          bd[i + 1] = Math.min(255, 92 * factor);
          bd[i + 2] = Math.min(255, 52 * factor);
        } else {
          bd[i] = bd[i] * factor;
          bd[i + 1] = bd[i + 1] * factor * 0.98;
          bd[i + 2] = bd[i + 2] * factor * 0.94;
        }
        bd[i + 3] = 255;
      } else {
        bd[i] = bd[i + 1] = bd[i + 2] = 0;
        bd[i + 3] = 0;
      }
    }
    bloomCtx.putImageData(bImg, 0, 0);
    context.save();
    context.beginPath();
    context.rect(x, 0, width, height);
    context.clip();
    context.globalCompositeOperation = "screen";
    context.globalAlpha = Math.min(isHalation ? 0.34 : 0.22, bloomStrength / 115);
    if ("filter" in context) context.filter = "blur(6px)";
    context.drawImage(bloomCanvas, 0, 0, bw, bh, x, 0, width, height);
    context.restore();
  }

  function applyFilmLookCpu(context, x, width, height, roll, p) {
    const vigStrength = (roll.vignette || 0) * 0.12;
    const grainAmp = (roll.grain || 0) * 4.8 + 1.6;
    const hasLeak = (roll.leak || 0) > 0 && !p.isMono;
    const image = context.getImageData(x, 0, width, height);
    const d = image.data;
    const halfW = width * 0.5;
    const halfH = height * 0.5;
    const invHalfW = 1 / halfW;
    const invHalfH = 1 / halfH;

    const sLut = new Float32Array(256);
    for (let v = 0; v < 256; v++) {
      const t = v / 255;
      const s = t * t * (3 - 2 * t);
      const curved = t * (1 - p.curve) + s * p.curve;
      sLut[v] = p.toe + curved * (255 - p.toe * 1.15);
    }
    const nx2Arr = new Float32Array(width);
    const leakEdgeArr = hasLeak ? new Float32Array(width) : null;
    for (let col = 0; col < width; col++) {
      const nx = (col - halfW) * invHalfW;
      nx2Arr[col] = nx * nx;
      if (hasLeak && nx > 0.22) {
        const edge = Math.min(1, (nx - 0.22) / 0.78);
        leakEdgeArr[col] = edge * edge;
      }
    }
    const ny2Arr = new Float32Array(height);
    const leakBandYArr = hasLeak ? new Float32Array(height) : null;
    for (let row = 0; row < height; row++) {
      const ny = (row - halfH) * invHalfH;
      ny2Arr[row] = ny * ny;
      if (hasLeak) {
        const dy = ny - 0.12;
        leakBandYArr[row] = Math.exp(-dy * dy * 3.2);
      }
    }

    for (let row = 0; row < height; row++) {
      const ny2 = ny2Arr[row];
      const leakY = hasLeak ? leakBandYArr[row] : 0;
      const rowOffset = row * width;
      const rowHash = Math.imul(row + 17, 668265263);
      const monoRowHash = Math.imul(row + 29, 668265263);
      for (let col = 0; col < width; col++) {
        const i = (rowOffset + col) * 4;
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const r2 = nx2Arr[col] + ny2;
        if (r < 24 && g < 24 && b < 24 && r2 > 0.85) continue;

        if (p.isMono) {
          const lum = Math.min(255, Math.max(0, (0.299 * r + 0.587 * g + 0.114 * b + 0.5) | 0));
          let v = sLut[lum];
          if (vigStrength > 0) v *= Math.max(0.45, 1 - vigStrength * r2 * r2);
          const tNorm = v / 255;
          const nWeight = 4 * tNorm * (1 - tNorm);
          const h = (Math.imul(col + 13, 374761393) ^ monoRowHash) >>> 0;
          const noise = ((Math.imul(h ^ (h >>> 13), 1274126177) >>> 0) / 4294967295 - 0.5) * grainAmp * nWeight;
          const out = Math.min(255, Math.max(0, (v + noise + 0.5) | 0));
          d[i] = d[i + 1] = d[i + 2] = out;
          continue;
        }

        let sr = sLut[r], sg = sLut[g], sb = sLut[b];
        if (p.id === "32") {
          const rr = sr * 1.08 + sg * 0.24;
          const gg = sg * 0.68 + sr * 0.22;
          const bb = sb * 0.34;
          sr = rr; sg = gg; sb = bb;
        } else if (p.id === "27") {
          const lum = 0.299 * sr + 0.587 * sg + 0.114 * sb;
          sr = sr * 0.62 + lum * 0.38;
          sg = sg * 0.62 + lum * 0.38;
          sb = sb * 0.62 + lum * 0.38;
        }

        const lumaNorm = Math.min(1, Math.max(0, (0.213 * sr + 0.715 * sg + 0.072 * sb) / 255));
        const shW = (1 - lumaNorm) * (1 - lumaNorm);
        const hiW = lumaNorm * lumaNorm;
        sr += p.shR * shW + p.hiR * hiW;
        sg += p.shG * shW + p.hiG * hiW;
        sb += p.shB * shW + p.hiB * hiW;

        if (vigStrength > 0) {
          const vig = Math.max(0.45, 1 - vigStrength * r2 * r2);
          sr *= vig; sg *= vig; sb *= vig;
        }
        if (hasLeak && leakEdgeArr[col] > 0) {
          const band = leakY * leakEdgeArr[col];
          sr += band * 68; sg += band * 26; sb += band * 8;
        }
        const nWeight = 4 * lumaNorm * (1 - lumaNorm);
        const h = (Math.imul(col + 31, 374761393) ^ rowHash) >>> 0;
        const noise = ((Math.imul(h ^ (h >>> 13), 1274126177) >>> 0) / 4294967295 - 0.5) * grainAmp * nWeight;
        d[i] = sr + noise;
        d[i + 1] = sg + noise * 0.96;
        d[i + 2] = sb + noise * 0.92;
      }
    }
    context.putImageData(image, x, 0);
  }

  function drawCcdDateStamp(context, x, width, height) {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const stamp = `'${yy} ${mm} ${dd}`;
    const fontSize = Math.max(12, Math.round(Math.min(width, height) * 0.036));
    const padX = Math.max(12, Math.round(width * 0.045));
    const padY = Math.max(10, Math.round(height * 0.04));
    context.save();
    context.font = `700 ${fontSize}px ui-monospace, "Courier New", monospace`;
    context.textAlign = "right";
    context.textBaseline = "bottom";
    context.shadowColor = "rgba(255, 86, 12, 0.85)";
    context.shadowBlur = Math.max(2, fontSize * 0.25);
    context.fillStyle = "#ff8524";
    context.fillText(stamp, x + width - padX, height - padY);
    context.restore();
  }

  function processPanel(context, source, sx, sw, sh, dx, dw, dh, effect, roll, stickers, isPreview) {
    const p = roll ? rollToneProfile(roll) : null;
    const useGpu = effect !== "none" || (roll && !isPreview);
    context.drawImage(source, sx, 0, sw, sh, dx, 0, dw, dh);
    if (roll && !isPreview && dw > 4 && dh > 4) {
      applyBloom(context, dx, dw, dh, roll, p);
    }
    const gpuRendered = useGpu && dw > 4 && dh > 4 && filmGpu.render(context, dx, dw, dh, effect, p, roll, isPreview);
    if (useGpu && !gpuRendered) {
      if (effect !== "none") pixelFilter(context, dw, dh, effect, dx);
      if (roll && !isPreview && dw > 4 && dh > 4) applyFilmLookCpu(context, dx, dw, dh, roll, p);
    }
    if (roll?.isCCD && !isPreview && dw >= 120 && dh >= 80) {
      drawCcdDateStamp(context, dx, dw, dh);
    }
    CameraStickers.draw(context, stickers, dx, dw, dh);
  }

  function develop(source, { roll, ev, light, format, lenses, frames, paper, paperAspect, stickers, isPreview }, target = null) {
    const reuseTargets = Boolean(target);
    if (CameraLens.active(lenses)) {
      source = CameraLens.draw(source, reuseTargets ? lensWorkCanvas : document.createElement("canvas"), lenses, maxSide);
    }
    const width = source.naturalWidth || source.width;
    const height = source.naturalHeight || source.height;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const result = reuseTargets
      ? canvas(width * scale, height * scale, developWorkCanvas)
      : canvas(width * scale, height * scale);
    const context = result.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.clearRect(0, 0, result.width, result.height);
    if (format === "JPG") {
      context.fillStyle = "#fff";
      context.fillRect(0, 0, result.width, result.height);
    }
    if (frames) {
      context.drawImage(source, 0, 0, result.width, result.height);
      const gutter = Math.max(2, Math.round(height / 100));
      const sourcePanel = Math.floor((width - gutter) / 2);
      const outputPanel = Math.floor(sourcePanel * scale);
      if (outputPanel > 0) {
        frames.forEach((frame, index) => {
          const sourceX = index ? width - sourcePanel : 0;
          const outputX = index ? result.width - outputPanel : 0;
          processPanel(context, source, sourceX, sourcePanel, height,
            outputX, outputPanel, result.height, filter(frame.roll, 0, frame.light), frame.roll, frame.stickers, isPreview);
        });
      }
    } else {
      processPanel(context, source, 0, width, height,
        0, result.width, result.height, filter(roll, ev, light), roll, stickers, isPreview);
    }

    return CameraPaper.draw(result, target || document.createElement("canvas"), paper, paperAspect);
  }

  async function render(source, recipe) {
    const result = develop(source, recipe);
    const [blob, thumbnail] = await Promise.all([encode(result, formats[recipe.format]), makeThumbnail(result)]);
    return { blob, thumbnail, width: result.width, height: result.height };
  }

  function makeThumbnail(source) {
    const width = source.naturalWidth || source.width;
    const height = source.naturalHeight || source.height;
    const thumbScale = Math.min(1, 220 / Math.max(width, height));
    const thumb = canvas(width * thumbScale, height * thumbScale);
    const thumbContext = thumb.getContext("2d");
    thumbContext.imageSmoothingEnabled = true;
    thumbContext.imageSmoothingQuality = "high";
    thumbContext.fillStyle = "#fff";
    thumbContext.fillRect(0, 0, thumb.width, thumb.height);
    thumbContext.drawImage(source, 0, 0, thumb.width, thumb.height);
    return encode(thumb, formats.JPG, .84);
  }

  return { formats, encode, filter, fromView, combine, sourceRect, load, render, develop, makeThumbnail };
})();

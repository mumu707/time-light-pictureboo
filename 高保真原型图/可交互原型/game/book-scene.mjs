
import * as T from "./vendor/three.module.js";
import { worlds, faces, clamp } from "./book-data.mjs";
import { bookSize, cardDepth, cardSize, baseSize, purposeOf, floorPoint, floorRecord, mountX } from "./book-home.mjs";
import { propTypes } from "../camera/prop-types.mjs";
import { regions, regionFootprints } from "./book-regions.mjs";
import { buildPaperModel, PAPER_MODELS } from "./paper-models.mjs";

export const CHAPTER_ATMOSPHERES = {
  study: {
    bg: "#341e12",
    fog: "#4a2a19",
    sky: "#ffe7c2",
    ground: "#b86336",
    hemi: 1.46,
    sun: "#ffd288",
    sunIntensity: 3.35,
    sunPos: [-9.6, 11.4, 4.2],
    rim: "#ffbc6d",
    rimIntensity: 1.32,
    rimPos: [8.8, 4.5, -7.8],
    fill: "#ffe0b6",
    fillIntensity: .52,
    beam: "#ffe09a",
    beamOpacity: .16,
    lamp: "#ffab4a",
    lampIntensity: 2.8,
    rimGlow: "#ffd48c",
    shadowLift: "#5c2710",
    bloom: .44,
    grade: [1.05, .99, .91]
  },
  garden: {
    bg: "#233226",
    fog: "#304434",
    sky: "#f1ffe5",
    ground: "#916b40",
    hemi: 1.42,
    sun: "#ffe6a6",
    sunIntensity: 3.05,
    sunPos: [-8.8, 12.0, 5.2],
    rim: "#d2ffba",
    rimIntensity: 1.12,
    rimPos: [8.4, 4.8, -7.4],
    fill: "#e5f5cf",
    fillIntensity: .48,
    beam: "#f7f0b6",
    beamOpacity: .13,
    lamp: "#ffc86b",
    lampIntensity: 2.1,
    rimGlow: "#e8ffbd",
    shadowLift: "#374524",
    bloom: .38,
    grade: [1.0, 1.03, .94]
  },
  station: {
    bg: "#1f2338",
    fog: "#2a2f4a",
    sky: "#cdd9ff",
    ground: "#735448",
    hemi: 1.24,
    sun: "#e6e4ff",
    sunIntensity: 2.35,
    sunPos: [-8.4, 11.6, -4.6],
    rim: "#ffc37a",
    rimIntensity: 1.42,
    rimPos: [8.2, 4.6, 6.8],
    fill: "#cad4ff",
    fillIntensity: .42,
    beam: "#d0daff",
    beamOpacity: .11,
    lamp: "#ffb254",
    lampIntensity: 3.2,
    rimGlow: "#ffcf8d",
    shadowLift: "#292c4f",
    bloom: .48,
    grade: [.97, .98, 1.05]
  },
  creek: {
    bg: "#26322f",
    fog: "#334440",
    sky: "#f3fae4",
    ground: "#986f46",
    hemi: 1.40,
    sun: "#ffe1a2",
    sunIntensity: 3.05,
    sunPos: [-9.0, 11.6, 4.8],
    rim: "#ffe3a8",
    rimIntensity: 1.15,
    rimPos: [8.6, 4.6, -7.2],
    fill: "#def4eb",
    fillIntensity: .46,
    beam: "#f6ebc2",
    beamOpacity: .12,
    lamp: "#ffc46c",
    lampIntensity: 2.2,
    rimGlow: "#ffe6b0",
    shadowLift: "#394436",
    bloom: .38,
    grade: [.99, 1.02, .97]
  },
  marsh: {
    bg: "#292f26",
    fog: "#3b4233",
    sky: "#ffe6ba",
    ground: "#9a643d",
    hemi: 1.36,
    sun: "#ffd596",
    sunIntensity: 2.95,
    sunPos: [-9.4, 10.6, 4.4],
    rim: "#ffc178",
    rimIntensity: 1.24,
    rimPos: [8.4, 4.2, -7.5],
    fill: "#f5dfbc",
    fillIntensity: .44,
    beam: "#ffe0a4",
    beamOpacity: .14,
    lamp: "#ffb760",
    lampIntensity: 2.4,
    rimGlow: "#ffd99a",
    shadowLift: "#473720",
    bloom: .40,
    grade: [1.03, 1.0, .92]
  },
  ridge: {
    bg: "#2d2a20",
    fog: "#3f3829",
    sky: "#ffebb8",
    ground: "#a86b3e",
    hemi: 1.44,
    sun: "#ffda8c",
    sunIntensity: 3.20,
    sunPos: [-9.2, 11.8, 4.0],
    rim: "#ffd28a",
    rimIntensity: 1.22,
    rimPos: [8.8, 5.0, -7.2],
    fill: "#ffebc2",
    fillIntensity: .48,
    beam: "#ffe7a8",
    beamOpacity: .14,
    lamp: "#ffbe64",
    lampIntensity: 2.3,
    rimGlow: "#ffe29c",
    shadowLift: "#4e391c",
    bloom: .40,
    grade: [1.04, 1.01, .91]
  },
  coast: {
    bg: "#222e38",
    fog: "#2f404c",
    sky: "#fff0d6",
    ground: "#8d6546",
    hemi: 1.38,
    sun: "#ffdfaa",
    sunIntensity: 3.10,
    sunPos: [-9.0, 11.4, 4.6],
    rim: "#ffc685",
    rimIntensity: 1.26,
    rimPos: [8.6, 4.6, -7.6],
    fill: "#e5eff8",
    fillIntensity: .46,
    beam: "#ffebd0",
    beamOpacity: .12,
    lamp: "#ffb863",
    lampIntensity: 2.4,
    rimGlow: "#ffdfb0",
    shadowLift: "#2d3b4a",
    bloom: .40,
    grade: [1.0, 1.01, .98]
  }
};

export const BOOK_SKINS = {
  gilded: {
    id: "gilded",
    label: "手工烫金精装绘本风",
    cloth: "#6e3129",
    clothTrim: "#894538",
    spine: "#58241d",
    foil: "#e8c37c",
    foilDeep: "#b98643",
    foilPlate: "#5a2721",
    pageEdge: "#e6c699",
    pageEdgeAlt: "#cfa97b",
    deskWood: "#4a2f20",
    ribbon: "#a93d33",
    brass: "#d9b066"
  }
};

function makeCanvas(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  return c;
}

const paper = makeCanvas(192, 192, (pen, w, h) => {
  const grain = pen.createImageData(w, h);
  for (let i = 0; i < grain.data.length; i += 4) {
    const tone = 226 + Math.random() * 29;
    grain.data[i] = tone;
    grain.data[i + 1] = tone - 2;
    grain.data[i + 2] = tone - 7;
    grain.data[i + 3] = 255;
  }
  pen.putImageData(grain, 0, 0);
  pen.strokeStyle = "rgba(150, 118, 86, 0.08)";
  pen.lineWidth = 1;
  for (let i = 0; i < 42; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    pen.beginPath();
    pen.moveTo(x, y);
    pen.lineTo(x + (Math.random() - .5) * 14, y + (Math.random() - .5) * 10);
    pen.stroke();
  }
});
const grainMap = new T.CanvasTexture(paper);
grainMap.colorSpace = T.SRGBColorSpace;
grainMap.wrapS = grainMap.wrapT = T.RepeatWrapping;

const clothCanvas = makeCanvas(192, 192, (ctx, w, h) => {
  ctx.fillStyle = "#e8dfd6";
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? "rgba(255,255,255,0.16)" : "rgba(40,22,16,0.12)";
    ctx.fillRect(0, y, w, 1.5);
  }
  for (let x = 0; x < w; x += 3) {
    ctx.fillStyle = x % 6 === 0 ? "rgba(255,248,236,0.14)" : "rgba(38,18,14,0.10)";
    ctx.fillRect(x, 0, 1.5, h);
  }
});
const clothMap = new T.CanvasTexture(clothCanvas);
clothMap.colorSpace = T.SRGBColorSpace;
clothMap.wrapS = clothMap.wrapT = T.RepeatWrapping;
clothMap.repeat.set(3, 3);

const edgeCanvas = makeCanvas(64, 128, (ctx, w, h) => {
  ctx.fillStyle = "#f2dec0";
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) {
    const shade = (y % 6 === 0) ? 0.14 : (y % 4 === 0 ? 0.07 : 0.02);
    ctx.fillStyle = `rgba(112, 74, 44, ${shade})`;
    ctx.fillRect(0, y, w, 1);
  }
});
const edgeStackMap = new T.CanvasTexture(edgeCanvas);
edgeStackMap.colorSpace = T.SRGBColorSpace;
edgeStackMap.wrapS = edgeStackMap.wrapT = T.RepeatWrapping;

const woodCanvas = makeCanvas(512, 512, (ctx, w, h) => {
  ctx.fillStyle = "#6c4832";
  ctx.fillRect(0, 0, w, h);
  const plankH = h / 4;
  const tones = ["#734d36", "#66432e", "#79523a", "#6b4732"];
  for (let p = 0; p < 4; p++) {
    const y0 = p * plankH;
    ctx.fillStyle = tones[p];
    ctx.fillRect(0, y0, w, plankH);
    for (let i = 0; i < 42; i++) {
      const y = y0 + (i / 42) * plankH;
      ctx.strokeStyle = i % 3 === 0 ? "rgba(155, 112, 74, 0.22)" : "rgba(42, 24, 15, 0.20)";
      ctx.lineWidth = .8 + (i % 3) * .7;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * .33, y + Math.sin(i + p * 2) * 4, w * .66, y - Math.cos(i + p) * 4, w, y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(32, 18, 10, 0.45)";
    ctx.fillRect(0, y0, w, 2.5);
    const seamX = ((p * 193 + 96) % w);
    ctx.fillRect(seamX, y0, 2.5, plankH);
  }
});
const woodTableMap = new T.CanvasTexture(woodCanvas);
woodTableMap.colorSpace = T.SRGBColorSpace;
woodTableMap.wrapS = woodTableMap.wrapT = T.RepeatWrapping;
woodTableMap.repeat.set(8, 8);

const woodRoughCanvas = makeCanvas(512, 512, (ctx, w, h) => {
  ctx.fillStyle = "#b4b4b4";
  ctx.fillRect(0, 0, w, h);
  const plankH = h / 4;
  for (let p = 0; p < 4; p++) {
    const y0 = p * plankH;
    for (let i = 0; i < 36; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(150,150,150,0.35)" : "rgba(210,210,210,0.35)";
      ctx.fillRect(0, y0 + (i / 36) * plankH, w, 2);
    }
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(0, y0, w, 3);
  }
});
const woodRoughMap = new T.CanvasTexture(woodRoughCanvas);
woodRoughMap.wrapS = woodRoughMap.wrapT = T.RepeatWrapping;
woodRoughMap.repeat.set(8, 8);

const deskPadCanvas = makeCanvas(256, 256, (ctx, w, h) => {
  ctx.fillStyle = "#3a312c";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(218, 186, 134, 0.34)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(10, 10, w - 20, h - 20);
});
const deskPadMap = new T.CanvasTexture(deskPadCanvas);
deskPadMap.colorSpace = T.SRGBColorSpace;

const bookAoCanvas = makeCanvas(256, 256, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const grad = ctx.createRadialGradient(w / 2, h / 2, w * .18, w / 2, h / 2, w * .5);
  grad.addColorStop(0, "rgba(18, 10, 6, 0.52)");
  grad.addColorStop(0.76, "rgba(18, 10, 6, 0.30)");
  grad.addColorStop(1, "rgba(18, 10, 6, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
});
const bookAoMap = new T.CanvasTexture(bookAoCanvas);
bookAoMap.colorSpace = T.SRGBColorSpace;

const creaseCanvas = makeCanvas(128, 32, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "rgba(56, 33, 20, 0)");
  g.addColorStop(0.42, "rgba(56, 33, 20, 0.16)");
  g.addColorStop(0.5, "rgba(38, 20, 12, 0.34)");
  g.addColorStop(0.58, "rgba(56, 33, 20, 0.16)");
  g.addColorStop(1, "rgba(56, 33, 20, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
});
const creaseShadowMap = new T.CanvasTexture(creaseCanvas);
creaseShadowMap.colorSpace = T.SRGBColorSpace;

const SHARED_MAPS = new Set([grainMap, clothMap, edgeStackMap, woodTableMap, woodRoughMap, deskPadMap, bookAoMap, creaseShadowMap]);

const warmShaderUniforms = {
  uRimColor: { value: new T.Color("#ffd48c") },
  uShadowLift: { value: new T.Color("#5c2710") }
};
function injectStoryGlow(material, rimPower = .22) {
  material.customProgramCacheKey = () => "story-warm-v1";
  material.onBeforeCompile = shader => {
    shader.uniforms.uRimColor = warmShaderUniforms.uRimColor;
    shader.uniforms.uShadowLift = warmShaderUniforms.uShadowLift;
    shader.uniforms.uRimPower = { value: rimPower };
    shader.fragmentShader =
      `uniform vec3 uRimColor;\nuniform vec3 uShadowLift;\nuniform float uRimPower;\n` +
      shader.fragmentShader.replace(
        "#include <dithering_fragment>",
        `float storyFres = pow(1.0 - clamp(abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0), 2.55);
         gl_FragColor.rgb += uRimColor * storyFres * uRimPower;
         gl_FragColor.rgb = max(gl_FragColor.rgb, uShadowLift * 0.13);
         #include <dithering_fragment>`
      );
  };
  return material;
}

const stock = color => injectStoryGlow(new T.MeshStandardMaterial({ color, map: grainMap, roughness: .88 }), .18);
const clothMat = color => injectStoryGlow(new T.MeshStandardMaterial({ color, map: clothMap, bumpMap: clothMap, bumpScale: .018, roughness: .85, metalness: .04 }), .22);
const foilMat = color => new T.MeshStandardMaterial({ color, roughness: .26, metalness: .76 });
const edgeMat = color => injectStoryGlow(new T.MeshStandardMaterial({ color, map: edgeStackMap, roughness: .90 }), .12);
const group = (parent, x = 0, y = 0, z = 0) => {
  const node = new T.Group();
  node.position.set(x, y, z);
  parent.add(node);
  return node;
};
function mesh(parent, geometry, material, x, y, z) {
  const node = new T.Mesh(geometry, material);
  node.position.set(x, y, z);
  node.castShadow = node.receiveShadow = true;
  parent.add(node);
  return node;
}
const box = (p, w, h, d, x, y, z, c, mat = stock) => mesh(p, new T.BoxGeometry(w, h, d), mat(c), x, y, z);
const disk = (p, radius, depth, x, y, z, c, sides = 24, mat = stock) =>
  mesh(p, new T.CylinderGeometry(radius, radius, depth, sides), mat(c), x, y, z);
function cut(p, points, thickness, x, y, z, color, edge = "#ae865d") {
  const shape = new T.Shape(points.map(([px, py]) => new T.Vector2(px, py)));
  return mesh(p, new T.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false }), [stock(color), stock(edge)], x, y, z);
}
const cardAlpha = .26;

function cardstockEdges(image) {
  if (image.__edgeGeometry) return image.__edgeGeometry;
  const mask = document.createElement("canvas");
  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  const width = mask.width = Math.max(1, Math.round(image.naturalWidth * 64 / longest));
  const height = mask.height = Math.max(1, Math.round(image.naturalHeight * 64 / longest));
  const ctx = mask.getContext("2d");
  ctx.drawImage(image, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < width && y < height &&
    pixels[(y * width + x) * 4 + 3] >= cardAlpha * 255;
  const positions = [];
  const uvs = [];
  const side = (ax, ay, bx, by) => {
    const a = [ax / width - .5, .5 - ay / height];
    const b = [bx / width - .5, .5 - by / height];
    positions.push(...a, 0, ...b, 0, ...b, cardDepth, ...a, 0, ...b, cardDepth, ...a, cardDepth);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!solid(x, y)) continue;
      if (!solid(x, y - 1)) side(x + 1, y, x, y);
      if (!solid(x + 1, y)) side(x + 1, y + 1, x + 1, y);
      if (!solid(x, y + 1)) side(x, y + 1, x + 1, y + 1);
      if (!solid(x - 1, y)) side(x, y, x, y + 1);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  image.__edgeGeometry = geometry;
  return geometry;
}
function print(p, caption, width, height, x, y, z, options = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = Math.round(800 * height / width);
  const ctx = canvas.getContext("2d");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (options.shadow) {
    ctx.shadowColor = options.shadow;
    ctx.shadowBlur = options.shadowBlur || 4;
    ctx.shadowOffsetY = 3;
  }
  ctx.fillStyle = options.color || "#503623";
  ctx.font = options.font || `${options.size || 72}px Xiaolai, serif`;
  ctx.fillText(caption, canvas.width / 2, canvas.height / 2);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  return mesh(p, new T.PlaneGeometry(width, height), new T.MeshBasicMaterial({ map, transparent: true, depthWrite: false, side: T.DoubleSide }), x, y, z);
}
function dispose(parent) {
  parent.traverse(node => {
    if (node.geometry && !node.userData.sharedGeo) node.geometry.dispose();
    for (const material of [node.material].flat()) {
      if (!material) continue;
      if (material.map && !SHARED_MAPS.has(material.map)) material.map.dispose();
      if (material.bumpMap && !SHARED_MAPS.has(material.bumpMap)) material.bumpMap.dispose();
      if (material.roughnessMap && !SHARED_MAPS.has(material.roughnessMap)) material.roughnessMap.dispose();
      material.dispose();
    }
  });
  parent.removeFromParent();
}

function study(p) {
  disk(p, 1.38, .024, -2.15, .02, .85, "#ad6350", 12).scale.z = .83;
  disk(p, 1.19, .026, -2.15, .026, .85, "#dfab7b", 12).scale.z = .83;
  disk(p, .95, .025, -2.15, .034, .85, "#bc765d", 12).scale.z = .83;
}
function garden(p, hinge) {
  const rain = hinge(-.2, -2.9);
  const material = new T.MeshStandardMaterial({ color: "#9fcede", opacity: .53, transparent: true, roughness: .55, depthWrite: false });
  for (let i = 0; i < 12; i++) {
    const drop = mesh(rain, new T.OctahedronGeometry(.09), material, (i % 6 - 2.5) * 1.22, 1.8 + (i * 7 % 10) * .14, (i % 4) * .18);
    drop.scale.y = 2;
    drop.castShadow = false;
  }
  disk(p, 1.24, .035, -2.05, .021, .8, "#6e9c9d", 12).scale.z = .64;
  for (let i = 0; i < 3; i++) disk(p, .85 - i * .24, .014, -2.05, .045 + i * .007, .8, i % 2 ? "#88afb0" : "#aac2ad", 12).scale.z = .64;
  for (let i = 0; i < 6; i++) {
    disk(p, .11 + i % 3 * .055, .045, -3.4 + i * .37, .025, 2.06 + Math.sin(i) * .22, "#b1ad86", 6);
  }
}
function station(p) {
  box(p, 11.4, .018, 1.05, 0, .045, -2.15, "#a7acc2");
}
function creek(p) {
  box(p, 12, .045, 1.85, 0, .056, -2, "#73aeb6");
  for (let i = 0; i < 10; i++) {
    disk(p, .24 + (i % 3) * .09, .15, i - 4.5, .09, -1.05, "#789471", 7);
  }
}
function marsh(p) {
  disk(p, 2.7, .035, -3.8, .058, -.9, "#628b89").scale.z = .45;
  for (let i = 0; i < 8; i++) {
    disk(p, .18, .012, -5.9 + i * .55, .082, -.55, "#9db59d", 9).scale.z = .4;
  }
}
function ridge() {}
function coast(p) {
  box(p, 12, .04, 2, -.3, .055, -2.7, "#759db8");
  for (let i = 0; i < 3; i++) box(p, 12, .012, .11, -.3, .081, -3.55 + i * .7, "#c5d6cd");
}
const builders = { study, garden, station, creek, marsh, ridge, coast };

export function createScene(stage, onLayout, onLost) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", { alpha: false, antialias: true });
  if (!context) return null;
  const skin = BOOK_SKINS.gilded;
  const renderer = new T.WebGLRenderer({ canvas, context, alpha: false, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  canvas.className = "book-canvas";
  canvas.setAttribute("aria-hidden", "true");
  stage.prepend(canvas);
  const scene = new T.Scene();
  scene.background = new T.Color(CHAPTER_ATMOSPHERES.study.bg);
  scene.fog = new T.FogExp2(CHAPTER_ATMOSPHERES.study.fog, .0115);

  const fovDeg = 30;
  const fovHalfRad = T.MathUtils.degToRad(fovDeg * .5);
  const camera = new T.PerspectiveCamera(fovDeg, 1, .35, 165);
  camera.position.set(3.2, 9.8, 13);
  camera.lookAt(0, .62, 0);
  const focus = new T.Vector3(0, .62, 0);
  const initialView = new T.Spherical().setFromVector3(camera.position.clone().sub(focus));
  const lookAt = focus.clone();
  let magnification = 1;
  let currentAtm = CHAPTER_ATMOSPHERES.study;

  const sky = new T.HemisphereLight(currentAtm.sky, currentAtm.ground, currentAtm.hemi);
  scene.add(sky);
  const sun = new T.DirectionalLight(currentAtm.sun, currentAtm.sunIntensity);
  sun.position.set(...currentAtm.sunPos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -13.2, right: 13.2, top: 13.2, bottom: -13.2, near: .5, far: 38 });
  sun.shadow.bias = -.0003;
  sun.shadow.normalBias = .02;
  sun.shadow.radius = 3.2;
  scene.add(sun);
  const rim = new T.DirectionalLight(currentAtm.rim, currentAtm.rimIntensity);
  rim.position.set(...currentAtm.rimPos);
  scene.add(rim);
  const fill = new T.DirectionalLight(currentAtm.fill, currentAtm.fillIntensity);
  fill.position.set(3.2, 4.0, 9.5);
  scene.add(fill);
  const chapterLamp = new T.PointLight(currentAtm.lamp, currentAtm.lampIntensity, 8.2, 1.55);
  chapterLamp.position.set(2.4, 1.4, -.8);
  scene.add(chapterLamp);

  // Subtle off-screen wooden window mullion shadow caster to cast gentle diagonal windowpanes
  const windowGobo = group(scene, -6.9, 6.2, 1.9);
  windowGobo.lookAt(0, 0, 0);
  for (const bx of [-3.4, 3.4]) {
    const slat = new T.Mesh(new T.BoxGeometry(.42, 14, .18), new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    slat.position.x = bx;
    slat.castShadow = true;
    windowGobo.add(slat);
  }
  const crossSlat = new T.Mesh(new T.BoxGeometry(14, .44, .18), new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  crossSlat.position.y = 1.6;
  crossSlat.castShadow = true;
  windowGobo.add(crossSlat);

  const table = mesh(scene, new T.PlaneGeometry(140, 140),
    injectStoryGlow(new T.MeshStandardMaterial({
      map: woodTableMap,
      roughnessMap: woodRoughMap,
      bumpMap: woodRoughMap,
      bumpScale: .028,
      roughness: .72,
      metalness: .04
    }), .08), 0, -1.31, 0);
  table.rotation.x = -Math.PI / 2;
  table.castShadow = false;
  const deskBlotter = mesh(scene, new T.BoxGeometry(23.6, .024, 19.8),
    injectStoryGlow(new T.MeshStandardMaterial({ map: deskPadMap, bumpMap: clothMap, bumpScale: .012, roughness: .92 }), .10), 0, -1.298, 0);
  deskBlotter.castShadow = false;
  const bookAo = mesh(scene, new T.PlaneGeometry(21.4, 18.2),
    new T.MeshBasicMaterial({ map: bookAoMap, transparent: true, depthWrite: false }), 0, -1.284, 0);
  bookAo.rotation.x = -Math.PI / 2;
  bookAo.castShadow = bookAo.receiveShadow = false;
  const ground = mesh(scene, new T.PlaneGeometry(140, 140), new T.ShadowMaterial({ color: "#2b1208", opacity: .36 }), 0, -1.281, 0);
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;

  // Cozy peripheral studio workbench props (far outside the desk blotter)
  const mug = group(scene, 14.6, -1.30, -8.2);
  disk(mug, 1.38, .08, 0, .04, 0, "#5c3926", 20);
  disk(mug, .92, 1.15, 0, .62, 0, "#f2e2cb", 20);
  disk(mug, .80, .04, 0, 1.18, 0, "#874b28", 18);
  const mugHandle = new T.Mesh(new T.TorusGeometry(.36, .085, 8, 16, Math.PI), stock("#f2e2cb"));
  mugHandle.position.set(.90, .64, 0);
  mugHandle.rotation.z = -Math.PI / 2;
  mugHandle.castShadow = true;
  mug.add(mugHandle);
  const deskTools = group(scene, -14.2, -1.30, 7.6);
  deskTools.rotation.y = .38;
  box(deskTools, 3.2, .05, 2.2, 0, .025, 0, "#eedbbc");
  disk(deskTools, .42, .07, .65, .06, .32, "#a8332c", 14);
  disk(deskTools, .34, .18, -1.1, .14, -.65, "#d8ac62", 14, foilMat);
  disk(deskTools, .22, .62, -1.1, .50, -.65, "#4c281c", 12);
  const pen = disk(deskTools, .08, 2.8, .35, .11, -.35, "#3e2218", 10);
  pen.rotation.z = Math.PI / 2;
  pen.rotation.y = -.24;

  // Volumetric Tyndall golden sunbeam shafts & drifting dust motes
  const fxTime = { value: 0 };
  const beamColorUniform = { value: new T.Color(currentAtm.beam) };
  const beamOpacityUniform = { value: currentAtm.beamOpacity };
  const beamMat = new T.ShaderMaterial({
    uniforms: {
      uTime: fxTime,
      uColor: beamColorUniform,
      uOpacity: beamOpacityUniform
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
      void main() {
        float xEdge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.72, vUv.x);
        float yFade = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.08, vUv.y);
        float shafts = 0.55 + 0.45 * sin(vUv.x * 16.0 - 0.6 + sin(uTime * 0.45) * 0.25);
        float mullion = smoothstep(0.18, 0.42, abs(fract(vUv.x * 3.0 + 0.15) - 0.5));
        float alpha = xEdge * yFade * shafts * (0.45 + 0.55 * mullion) * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }`,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    side: T.DoubleSide
  });
  const beams = group(scene, -2.8, 3.8, .8);
  beams.rotation.set(.18, .28, -.68);
  for (let b = 0; b < 3; b++) {
    const shaft = new T.Mesh(new T.PlaneGeometry(13.5, 17.5), beamMat);
    shaft.position.set((b - 1) * 1.15, 0, (b - 1) * 1.75);
    shaft.rotation.y = (b - 1) * .16;
    beams.add(shaft);
  }

  const dustCount = 72;
  const dustPos = new Float32Array(dustCount * 3);
  const dustPhase = new Float32Array(dustCount);
  const dustSize = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - .5) * 15.5;
    dustPos[i * 3 + 1] = .4 + Math.random() * 5.2;
    dustPos[i * 3 + 2] = (Math.random() - .5) * 10.5;
    dustPhase[i] = Math.random() * Math.PI * 2;
    dustSize[i] = 10 + Math.random() * 14;
  }
  const dustGeo = new T.BufferGeometry();
  dustGeo.setAttribute("position", new T.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute("aPhase", new T.BufferAttribute(dustPhase, 1));
  dustGeo.setAttribute("aSize", new T.BufferAttribute(dustSize, 1));
  const dustMat = new T.ShaderMaterial({
    uniforms: { uTime: fxTime, uColor: beamColorUniform },
    vertexShader: `
      attribute float aPhase; attribute float aSize; uniform float uTime; varying float vAlpha;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.42 + aPhase) * 0.45;
        p.y += cos(uTime * 0.55 + aPhase * 1.4) * 0.32;
        p.z += sin(uTime * 0.36 + aPhase * 2.1) * 0.35;
        vAlpha = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 1.15 + aPhase * 3.0));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * (28.0 / max(8.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        float glow = smoothstep(0.5, 0.04, d);
        gl_FragColor = vec4(uColor * 1.35, glow * glow * 0.62 * vAlpha);
      }`,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending
  });
  const dustPoints = new T.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  const volume = group(scene);
  const cover = group(volume, 0, -.25);
  const flip = group(volume, 0, -.04);
  const rightLeaves = group(volume);
  const leftLeaves = group(volume);
  const { leafWidth, depth } = bookSize;
  const leafCenter = leafWidth / 2;
  // Cloth spine + raised binding ribs + subtle gold spine accents
  box(volume, .70, 1.04, depth + .06, 0, -.69, 0, skin.spine, clothMat);
  box(volume, .50, .88, depth + .13, 0, -.70, 0, skin.clothTrim, clothMat);
  for (const rz of [-depth * .36, 0, depth * .36]) {
    box(volume, .74, .11, .22, 0, -1.16, rz, skin.foilDeep, foilMat);
  }
  // Silk bookmark ribbon peeking gracefully below right leaves
  box(rightLeaves, .24, .016, depth + .65, leafCenter * .34, -1.04, .32, skin.ribbon, clothMat);
  box(rightLeaves, .22, .018, .22, leafCenter * .34, -1.04, depth / 2 + .62, skin.foil, foilMat).rotation.y = Math.PI / 4;

  // Hardcover cloth back boards + 4 brass corner protectors
  box(rightLeaves, leafWidth + .12, .22, depth + .11, leafCenter, -1.17, 0, skin.cloth, clothMat);
  box(leftLeaves, leafWidth + .12, .22, depth + .11, -leafCenter, -1.17, 0, skin.cloth, clothMat);
  for (const side of [-1, 1]) {
    const stack = side < 0 ? leftLeaves : rightLeaves;
    for (const cz of [-1, 1]) {
      const cap = group(stack, side * (leafWidth + .05), -1.17, cz * (depth / 2 + .04));
      box(cap, .38, .24, .10, -side * .18, 0, -cz * .02, skin.brass, foilMat);
      box(cap, .10, .24, .38, -side * .02, 0, -cz * .18, skin.brass, foilMat);
    }
    for (let i = 0; i < 14; i++) {
      const stagger = (i % 3) * .024;
      box(stack, leafWidth - .12 - stagger, .061, depth - .24 - stagger,
        side * leafCenter, -1.01 + i * .063, 0, i % 3 === 0 ? skin.pageEdgeAlt : skin.pageEdge, edgeMat);
    }
  }
  // Front cloth cover + gilded beveled foil frame + embossed nameplate
  box(cover, leafWidth + .10, .18, depth + .10, -leafCenter, 0, 0, skin.cloth, clothMat);
  const frontDecor = group(cover, -leafCenter, 0, 0);
  box(frontDecor, leafWidth - .34, .018, depth - .42, 0, -.092, 0, skin.foil, foilMat);
  box(frontDecor, leafWidth - .52, .022, depth - .60, 0, -.096, 0, skin.cloth, clothMat);
  box(frontDecor, leafWidth - .88, .014, depth - 1.12, 0, -.104, 0, skin.foilDeep, foilMat);
  box(frontDecor, leafWidth - 1.04, .016, depth - 1.28, 0, -.109, 0, skin.foilPlate, clothMat);
  for (const cx of [-1, 1]) for (const cz of [-1, 1]) {
    if (cx > 0) continue; // outer edge corners opposite spine
    const cap = group(frontDecor, cx * (leafWidth / 2 - .02), 0, cz * (depth / 2 - .02));
    box(cap, .42, .20, .11, -cx * .19, 0, -cz * .03, skin.brass, foilMat);
    box(cap, .11, .20, .42, -cx * .03, 0, -cz * .19, skin.brass, foilMat);
  }
  const lettering = group(frontDecor, 0, -.121, -.12);
  lettering.rotation.set(Math.PI / 2, 0, Math.PI);
  print(lettering, "Can-mie-rua", 3.55, .78, 0, .92, 0, {
    size: 98,
    font: "600 98px Georgia, Xiaolai, serif",
    color: "#f7dba0",
    shadow: "#2b120c"
  });
  print(lettering, "✦  ☀  ✦", 2.9, 1.35, 0, -.46, 0, {
    size: 290,
    color: "#ebbf74",
    shadow: "#361810"
  });
  print(lettering, "THE LIVING POP-UP CHRONICLE", 3.2, .45, 0, -1.65, 0, {
    size: 40,
    font: "500 38px Georgia, serif",
    color: "#d9b06b"
  });

  box(flip, leafWidth - .13, .035, depth - .25, leafCenter, 0, 0, skin.pageEdge, edgeMat);
  let chapter, scenery, groundActors, wallSlot;
  let hinges = [];
  let width = 1, height = 1, coverProgress = 0, frame, contextLost = false;
  let camSpherical = initialView.clone();
  const items = new Map();
  const reactionFrames = new Map();

  // Lightweight HDR/Half-Res Golden Bloom + Miniature Vignette Pipeline
  const hasFloatFbo = Boolean(context.getExtension("EXT_color_buffer_half_float") || context.getExtension("EXT_color_buffer_float"));
  const rtParams = {
    type: hasFloatFbo ? T.HalfFloatType : T.UnsignedByteType,
    minFilter: T.LinearFilter,
    magFilter: T.LinearFilter,
    depthBuffer: true
  };
  const bloomParams = {
    type: T.UnsignedByteType,
    minFilter: T.LinearFilter,
    magFilter: T.LinearFilter,
    depthBuffer: false
  };
  const sceneRT = new T.WebGLRenderTarget(2, 2, rtParams);
  const brightRT = new T.WebGLRenderTarget(2, 2, bloomParams);
  const blurRT_A = new T.WebGLRenderTarget(2, 2, bloomParams);
  const blurRT_B = new T.WebGLRenderTarget(2, 2, bloomParams);
  const postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postQuadGeo = new T.PlaneGeometry(2, 2);
  const brightMat = new T.ShaderMaterial({
    uniforms: { tDiffuse: { value: sceneRT.texture }, uThresh: { value: hasFloatFbo ? .74 : .64 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uThresh; varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
        float w = smoothstep(uThresh, uThresh + 0.36, lum);
        gl_FragColor = vec4(c * w, 1.0);
      }`,
    depthTest: false, depthWrite: false, toneMapped: false
  });
  const blurMat = new T.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uStep: { value: new T.Vector2() } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec2 uStep; varying vec2 vUv;
      void main() {
        vec3 s = texture2D(tDiffuse, vUv).rgb * 0.227027;
        s += texture2D(tDiffuse, vUv + uStep * 1.3846).rgb * 0.316216;
        s += texture2D(tDiffuse, vUv - uStep * 1.3846).rgb * 0.316216;
        s += texture2D(tDiffuse, vUv + uStep * 3.2307).rgb * 0.070270;
        s += texture2D(tDiffuse, vUv - uStep * 3.2307).rgb * 0.070270;
        gl_FragColor = vec4(s, 1.0);
      }`,
    depthTest: false, depthWrite: false, toneMapped: false
  });
  const compMat = new T.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: sceneRT.texture },
      tBloom: { value: blurRT_B.texture },
      uBloomStrength: { value: currentAtm.bloom },
      uGrade: { value: new T.Vector3(...currentAtm.grade) },
      uExposure: { value: currentAtm.exposure || 1.10 }
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform sampler2D tBloom;
      uniform float uBloomStrength; uniform vec3 uGrade; uniform float uExposure;
      varying vec2 vUv;
      vec3 aces(vec3 x) {
        return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
      }
      void main() {
        vec3 base = texture2D(tDiffuse, vUv).rgb;
        vec3 bloom = texture2D(tBloom, vUv).rgb;
        // Subtle top/bottom miniature lens softness (tilt-shift feel) without muddying the book center
        float edgeDof = smoothstep(0.56, 1.0, abs(vUv.y - 0.5) * 2.0) * 0.28;
        vec3 hdr = mix(base, max(base, bloom * 1.08), edgeDof) + bloom * uBloomStrength;
        hdr *= uExposure * uGrade;
        vec3 mapped = aces(hdr);
        float dist = length((vUv - vec2(0.5, 0.48)) * vec2(1.0, 0.88));
        float vig = smoothstep(0.94, 0.28, dist);
        mapped *= mix(vec3(0.76, 0.65, 0.58), vec3(1.0), vig);
        gl_FragColor = vec4(pow(max(mapped, vec3(0.0)), vec3(1.0 / 2.2)), 1.0);
      }`,
    depthTest: false, depthWrite: false, toneMapped: false
  });
  const postMesh = new T.Mesh(postQuadGeo, brightMat);
  const postScene = new T.Scene();
  postScene.add(postMesh);

  let postReady = true;
  function renderFrame() {
    fxTime.value = performance.now() * .001;
    if (!postReady) {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      return;
    }
    try {
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, camera);

      postMesh.material = brightMat;
      renderer.setRenderTarget(brightRT);
      renderer.render(postScene, postCam);

      postMesh.material = blurMat;
      blurMat.uniforms.tDiffuse.value = brightRT.texture;
      blurMat.uniforms.uStep.value.set(1 / Math.max(2, blurRT_A.width), 0);
      renderer.setRenderTarget(blurRT_A);
      renderer.render(postScene, postCam);

      blurMat.uniforms.tDiffuse.value = blurRT_A.texture;
      blurMat.uniforms.uStep.value.set(0, 1 / Math.max(2, blurRT_B.height));
      renderer.setRenderTarget(blurRT_B);
      renderer.render(postScene, postCam);

      postMesh.material = compMat;
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCam);
    } catch {
      postReady = false;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    }
  }

  const requestDraw = () => {
    if (frame !== undefined || contextLost) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      if (!contextLost) renderFrame();
    });
  };
  const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const fxTimer = reducedMotion ? 0 : setInterval(() => {
    if (!document.hidden && !contextLost) requestDraw();
  }, 60);

  function compose() {
    const aspect = width / height;
    const yaw = camSpherical.theta;
    const spread = leafWidth * Math.abs(Math.cos(yaw)) + depth / 2 * Math.abs(Math.sin(yaw));
    const opened = Math.max(4.25, (spread * .5 + .18) / aspect) / magnification;
    const closed = Math.max(5.8, 4.9 / aspect) / magnification;
    const half = closed + (opened - closed) * coverProgress;
    const distance = clamp(half / Math.tan(fovHalfRad), 11, 78);
    camera.aspect = aspect;
    camera.fov = fovDeg;
    camera.updateProjectionMatrix();
    const positioned = camSpherical.clone();
    positioned.radius = distance;
    camera.position.setFromSpherical(positioned).add(lookAt);
    camera.lookAt(lookAt);
    camera.updateMatrixWorld();
    volume.position.x = -leafCenter * (1 - coverProgress);
    requestDraw();
  }
  function view(yaw = 0, tilt = 0, center = { x: 0, y: 0 }, zoom = 1) {
    const angle = Math.PI / 180;
    const spherical = initialView.clone();
    spherical.theta += clamp(yaw, -30, 30) * angle;
    spherical.phi = clamp(initialView.phi - tilt * angle, 34 * angle, 63 * angle);
    camSpherical.copy(spherical);
    magnification = zoom;
    lookAt.copy(focus);
    lookAt.x = center.x;
    lookAt.z = center.y;
    compose();
    onLayout();
  }
  const resize = new ResizeObserver(() => {
    width = Math.max(1, stage.clientWidth);
    height = Math.max(1, stage.clientHeight);
    const dpr = renderer.getPixelRatio();
    const pw = Math.max(2, Math.round(width * dpr));
    const ph = Math.max(2, Math.round(height * dpr));
    renderer.setSize(width, height, false);
    sceneRT.setSize(pw, ph);
    const bw = Math.max(2, Math.round(pw * .25));
    const bh = Math.max(2, Math.round(ph * .25));
    brightRT.setSize(bw, bh);
    blurRT_A.setSize(bw, bh);
    blurRT_B.setSize(bw, bh);
    compose();
    onLayout();
  });
  resize.observe(stage);
  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    contextLost = true;
    clearInterval(fxTimer);
    resize.disconnect();
    cancelAnimationFrame(frame);
    for (const reactionFrame of reactionFrames.values()) cancelAnimationFrame(reactionFrame);
    sceneRT.dispose();
    brightRT.dispose();
    blurRT_A.dispose();
    blurRT_B.dispose();
    postQuadGeo.dispose();
    brightMat.dispose();
    blurMat.dispose();
    compMat.dispose();
    beamMat.dispose();
    dustGeo.dispose();
    dustMat.dispose();
    renderer.dispose();
    onLost();
    canvas.remove();
  });

  function applyAtmosphere(id) {
    const atm = CHAPTER_ATMOSPHERES[id] || CHAPTER_ATMOSPHERES.study;
    currentAtm = atm;
    scene.background.set(atm.bg);
    scene.fog.color.set(atm.fog);
    sky.color.set(atm.sky);
    sky.groundColor.set(atm.ground);
    sky.intensity = atm.hemi;
    sun.color.set(atm.sun);
    sun.intensity = atm.sunIntensity;
    sun.position.set(...atm.sunPos);
    rim.color.set(atm.rim);
    rim.intensity = atm.rimIntensity;
    rim.position.set(...atm.rimPos);
    fill.color.set(atm.fill);
    fill.intensity = atm.fillIntensity;
    chapterLamp.color.set(atm.lamp);
    chapterLamp.intensity = atm.lampIntensity;
    beamColorUniform.value.set(atm.beam);
    beamOpacityUniform.value = atm.beamOpacity;
    warmShaderUniforms.uRimColor.value.set(atm.rimGlow);
    warmShaderUniforms.uShadowLift.value.set(atm.shadowLift);
    compMat.uniforms.uBloomStrength.value = atm.bloom;
    compMat.uniforms.uGrade.value.set(...atm.grade);
    compMat.uniforms.uExposure.value = atm.exposure || 1.10;
  }

  function setWorld(id) {
    applyAtmosphere(id);
    for (const item of items.values()) dispose(item);
    items.clear();
    if (chapter) dispose(chapter);
    hinges = [];
    chapter = group(volume, 0, -.135);
    scenery = group(chapter);
    groundActors = group(chapter);
    const world = worlds.find(page => page.id === id);
    for (const side of [-1, 1]) {
      box(chapter, leafWidth - .13, .048, depth - .25, side * leafCenter, 0, 0, world.paper);
      box(chapter, leafWidth - .36, .008, depth - .55, side * leafCenter, .027, 0, world.color);
      box(chapter, leafWidth - .44, .008, depth - .64, side * leafCenter, .032, 0, world.paper);
    }
    const gutter = mesh(chapter, new T.PlaneGeometry(1.45, depth - .28),
      new T.MeshBasicMaterial({ map: creaseShadowMap, transparent: true, depthWrite: false }), 0, .038, 0);
    gutter.rotation.x = -Math.PI / 2;
    gutter.castShadow = gutter.receiveShadow = false;
    box(chapter, .055, .025, depth - .28, 0, .014, 0, "#836249");
    const hinge = (x, z) => {
      const node = group(scenery, x, .055, z);
      hinges.push(node);
      box(node, .47, .07, .43, 0, .03, .12, world.color);
      return node;
    };
    builders[id](scenery, hinge);
    for (const [name, type, x, z, color] of regions[id]) {
      const labelZ = z + regionFootprints[type][1] / 2 + .32;
      const marker = disk(chapter, .89, .014, x, .045, labelZ, world.color, 14);
      marker.scale.z = .57;
      const caption = print(chapter, name, 2.0, .35, x, .056, labelZ, { size: 134, color: world.dark });
      caption.rotation.x = -Math.PI / 2;
      caption.castShadow = false;
      for (let step = 0; step < 3; step++) {
        disk(chapter, .10, .009, x - Math.sign(x) * (.8 + step * .42), .045,
          labelZ + .31 + step * .24, world.color, 7);
      }
    }
    wallSlot = hinge(mountX(id), -.59);
    box(wallSlot, 1.23, 1.29, .078, 0, .67, 0, world.dark);
    box(wallSlot, 1.15, 1.2, .024, 0, .67, .042, world.color);
    box(wallSlot, 1.03, 1.07, .01, 0, .67, .06, world.paper);
    const nameplate = print(chapter, world.name, 2.25, .51, -leafCenter, .046, 3.53, { size: 133, color: world.dark });
    nameplate.rotation.x = -Math.PI / 2;
    for (const node of hinges) node.userData.openScale = node.scale.clone();
    scenery.visible = groundActors.visible = false;
    requestDraw();
  }

  function pose({ opening = 1, standing = 1, actors = standing, turning = 0, direction = 1, floatY = 0 }) {
    if (opening !== coverProgress) {
      coverProgress = opening;
      compose();
    }
    volume.position.y = floatY;
    bookAo.scale.x = .56 + .44 * opening;
    bookAo.position.x = 0;
    leftLeaves.visible = opening > .08;
    leftLeaves.rotation.z = -Math.PI * (1 - opening) * .8;
    cover.rotation.z = -Math.PI * (1 - opening);
    cover.position.y = -.25 + .29 * (1 - opening);
    chapter.visible = opening >= .92;
    flip.visible = turning > 0 && turning < 1;
    flip.rotation.z = direction > 0 ? Math.PI * turning : Math.PI * (1 - turning);
    scenery.visible = standing > .005 && !flip.visible;
    scenery.scale.y = Math.max(.001, standing);
    scenery.position.y = .055 * (1 - Math.min(1, standing));
    groundActors.visible = actors > .005 && !flip.visible;
    groundActors.scale.y = Math.max(.001, actors);
    groundActors.position.y = .045 * (1 - Math.min(1, actors));
    for (const node of hinges) {
      // The paper folds within its own footprint before the turning leaf can enter.
      const unfold = Math.max(.001, standing);
      node.rotation.x = (1 - standing) * .32;
      node.scale.copy(node.userData.openScale);
      node.scale.z *= .5 + Math.min(1.06, unfold) * .5;
      node.scale.y *= .55 + unfold * .45;
    }
    requestDraw();
  }

  function localPoint(record, spirit = false) {
    const floor = floorPoint(record);
    if (spirit) return new T.Vector3(floor.x, .05, floor.y);
    if (record.isModel || record.modelId) return new T.Vector3(floor.x, .036, floor.y);
    if (record.surface === "prop") return new T.Vector3((record.x - .5) * 1.04, 1.21 - record.y * 1.06, .074);
    return new T.Vector3(floor.x, .064, floor.y);
  }
  function sync(itemsOnPage, residents, sceneModels = []) {
    const list = [
      ...sceneModels.map(record => [record, "model"]),
      ...itemsOnPage.map(record => [record, "sticker"]),
      ...residents.map(record => [record, "spirit"])
    ];
    const keyOf = (record, kind) => (kind === "spirit" ? "s:" : kind === "model" ? "m:" : "d:") + record.id;
    const active = new Set(list.map(([record, kind]) => keyOf(record, kind)));
    for (const [id, node] of items) {
      if (active.has(id)) continue;
      dispose(node);
      items.delete(id);
    }
    list.forEach(([record, kind], index) => {
      const spirit = kind === "spirit";
      const isModel = kind === "model";
      const id = keyOf(record, kind);
      let node = items.get(id);
      const parent = !isModel && record.surface === "prop" ? wallSlot : groundActors;
      const appearance = isModel
        ? [record.modelId, record.color || ""].join("/")
        : [record.surface, purposeOf(record), record.expression].join("/");
      if (node && !spirit && node.userData.appearance !== appearance) {
        dispose(node);
        items.delete(id);
        node = undefined;
      }
      if (!node) {
        if (isModel) {
          node = buildPaperModel(record.modelId, stock, record.color);
          node.userData.appearance = appearance;
          node.traverse(child => { child.userData.modelRecordId = record.id; });
          parent.add(node);
        } else {
          node = group(parent);
          node.userData.appearance = appearance;
          const map = new T.Texture(record.asset.image);
          map.colorSpace = T.SRGBColorSpace;
          map.needsUpdate = true;
          const front = texture => injectStoryGlow(new T.MeshStandardMaterial({
            map: texture,
            alphaTest: cardAlpha,
            roughness: .86,
            metalness: .02,
            emissive: "#fff2dc",
            emissiveMap: texture,
            emissiveIntensity: .28,
            side: T.DoubleSide
          }), .15);
          if (spirit) {
            const w = .95 * Math.min(1, record.asset.ratio);
            const h = Math.max(.44, .97 / Math.max(1, record.asset.ratio));
            disk(node, .26, .07, 0, .035, .035, "#dbba92", 8);
            const card = group(node, 0, .071 + h / 2, 0);
            node.userData.card = card;
            card.scale.set(w, h, 1);
            mesh(card, new T.PlaneGeometry(1, 1), front(map), 0, 0, cardDepth);
            const backing = new T.MeshStandardMaterial({
              map, alphaTest: cardAlpha, color: "#d8bb96", roughness: .92, side: T.BackSide
            });
            mesh(card, new T.PlaneGeometry(1, 1), backing, 0, 0, 0);
            const edgeMesh = mesh(card, cardstockEdges(record.asset.image), stock("#ba9168"), 0, 0, 0);
            edgeMesh.userData.sharedGeo = true;
            node.userData.faces = Object.fromEntries(Object.entries({ neutral: "• •", like: "⌣ ⌣", avoid: "› ‹" }).map(([mood, eyes]) => {
              const face = print(node, eyes, w * .61, h * .24, 0, .071 + h * .53, cardDepth + .035, { size: 225, color: "#3f3028" });
              face.visible = mood === "neutral";
              face.castShadow = false;
              return [mood, face];
            }));
          } else {
            const [w, h] = cardSize(record);
            const onFloor = record.surface !== "prop";
            const card = group(node, 0, onFloor ? h / 2 + .071 : 0);
            node.userData.card = card;
            card.scale.set(w, h, 1);
            mesh(card, new T.PlaneGeometry(1, 1), front(map), 0, 0, cardDepth);
            const backing = new T.MeshStandardMaterial({
              map, alphaTest: cardAlpha, color: "#d0b38f", roughness: .93, side: T.BackSide
            });
            mesh(card, new T.PlaneGeometry(1, 1), backing, 0, 0, 0);
            const edgeMesh = mesh(card, cardstockEdges(record.asset.image), stock("#ba9168"), 0, 0, 0);
            edgeMesh.userData.sharedGeo = true;
            if (onFloor) {
              const base = group(node, 0, 0, 0);
              node.userData.base = base;
              node.userData.baseInitScale = record.scale || .3;
              const type = purposeOf(record);
              const [bw, bd] = baseSize(record);
              const color = propTypes[type].color;
              if (type === "plant") {
                const pot = mesh(base, new T.CylinderGeometry(1, .72, .125, 8), stock(color), 0, .063, 0);
                pot.scale.set(bw / 2, 1, bd / 2);
              } else {
                box(base, bw, .072, bd, 0, .036, 0, color);
                if (type === "backdrop") {
                  for (const x of [-bw * .28, bw * .28]) {
                    const leg = box(base, .065, h * .46, .06, x, h * .22 + .046, -bd * .15, color);
                    leg.rotation.x = Math.atan2(bd * .24, h * .46);
                  }
                } else if (type === "food") {
                  box(base, bw * .96, .025, .035, 0, .081, bd * .46, "#ead0a3");
                } else box(base, bw * .47, .055, .085, 0, .081, 0, "#e4b88c");
              }
            }
            const mouth = faces[record.expression];
            if (mouth) {
              disk(card, .15, .018, .23, -.27, cardDepth + .019, "#f4dbab", 18).rotation.x = Math.PI / 2;
              print(card, mouth, .22, .21, .23, -.27, cardDepth + .031, { size: 530 });
            }
          }
        }
        items.set(id, node);
      }
      if (node.parent !== parent) parent.add(node);
      node.position.copy(localPoint(record, spirit));
      if (spirit) node.userData.rest = node.position.clone();
      else if (isModel) {
        const sc = record.scale || 1;
        node.scale.setScalar(sc);
        const angle = ((record.rotation || 0) + (record.selfRotation || 0)) * Math.PI / 180;
        node.rotation.set(0, angle, 0);
      } else {
        const [w, h] = cardSize(record);
        const onFloor = record.surface !== "prop";
        if (node.userData.card) {
          node.userData.card.scale.set(w, h, 1);
          node.userData.card.position.y = onFloor ? h / 2 + .071 : 0;
        }
        if (node.userData.base && node.userData.baseInitScale) {
          const factor = (record.scale || .3) / node.userData.baseInitScale;
          node.userData.base.scale.set(factor, factor, factor);
        }
        const angle = (record.rotation || 0) * Math.PI / 180;
        const selfAngle = (record.selfRotation || 0) * Math.PI / 180;
        if (record.surface === "prop") {
          node.rotation.set(0, 0, angle + selfAngle);
          if (node.userData.card) node.userData.card.rotation.z = 0;
        } else {
          node.rotation.set(0, angle, 0);
          if (node.userData.card) node.userData.card.rotation.z = selfAngle;
        }
        const layer = Math.min(index, 200) * .00025;
        if (record.surface === "prop") node.position.z += layer;
        else node.position.y += layer;
      }
    });
    const lampModel = sceneModels.find(m =>
      PAPER_MODELS[m.modelId]?.isLight ||
      m.modelId === "study_lamp" ||
      m.modelId === "night_lantern" ||
      m.modelId === "hearth" ||
      m.modelId === "station_canopy"
    );
    if (lampModel && groundActors?.visible) {
      const lp = localPoint(lampModel, false);
      const lampNode = items.get("m:" + lampModel.id);
      const ll = lampNode?.userData?.lightLocal;
      if (ll) {
        const sc = lampModel.scale || 1;
        const offset = ll.clone().multiplyScalar(sc).applyAxisAngle(new T.Vector3(0, 1, 0), lampNode.rotation.y);
        chapterLamp.position.set(lp.x + offset.x, offset.y, lp.z + offset.z);
      } else {
        chapterLamp.position.set(lp.x, 1.35 * (lampModel.scale || 1), lp.z + .15);
      }
      chapterLamp.intensity = currentAtm.lampIntensity;
    } else {
      chapterLamp.intensity = groundActors?.visible ? currentAtm.lampIntensity * .45 : 0;
    }
    requestDraw();
  }
  function moveResidents(residents) {
    let moved = false;
    const now = performance.now();
    const breeze = Math.sin(now * .0022) * .16;
    const camYaw = clamp(Math.atan2(camera.position.x - lookAt.x, camera.position.z - lookAt.z) * .62, -.48, .48);
    for (const [id, node] of items) {
      if (id.startsWith("m:") && node.userData.windPivot) {
        if (node.name === "ridge_windmill") node.userData.windPivot.rotation.z = now * .0011;
        else node.userData.windPivot.rotation.y = breeze;
        moved = true;
      }
    }
    for (const record of residents) {
      const node = items.get("s:" + record.id);
      if (!node) continue;
      if (record.chatting) {
        node.position.copy(localPoint(record, true));
        node.rotation.y += (camYaw - node.rotation.y) * .25;
        node.rotation.z *= .7;
        node.scale.setScalar(1 + Math.sin(now * .0045) * .018);
        moved = true;
        continue;
      }
      if (Math.abs(node.scale.x - 1) > .005) {
        node.scale.setScalar(1);
        moved = true;
      }
      const point = localPoint(record, true);
      const prev = node.userData.rest;
      const unchanged = prev && point.equals(prev) && record.activity === node.userData.activity;
      if (!unchanged) {
        const dx = prev ? point.x - prev.x : 0;
        const dz = prev ? point.z - prev.z : 0;
        const stride = prev ? point.distanceTo(prev) : 0;
        node.userData.stride = (node.userData.stride || 0) + stride;
        if (record.activity === "walk" && stride > .002) {
          node.userData.facingYaw = clamp(Math.atan2(dx, dz) * .55, -.58, .58);
        } else if (record.activity !== "walk") {
          node.userData.facingYaw = 0;
        }
        node.userData.rest = point;
        node.userData.activity = record.activity;
        node.position.copy(point);
        node.rotation.z = record.activity === "rest" ? -.10 :
          record.activity === "walk" ? Math.sin(node.userData.stride * 13) * .065 : 0;
        moved = true;
      }
      const targetYaw = record.activity === "walk" ? (node.userData.facingYaw || 0) : 0;
      if (Math.abs(targetYaw - node.rotation.y) > .005) {
        node.rotation.y += (targetYaw - node.rotation.y) * .18;
        moved = true;
      }
    }
    if (moved) requestDraw();
  }
  function project(point) {
    const projected = point.project(camera);
    return { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2 };
  }
  function bounds(record, spirit = false) {
    volume.updateMatrixWorld(true);
    const parent = record.surface === "prop" ? wallSlot : chapter;
    if (record.isModel || record.modelId) {
      const node = items.get("m:" + record.id);
      let corners;
      if (node && groundActors.visible) {
        const box = new T.Box3().setFromObject(node);
        if (!box.isEmpty()) {
          corners = [box.min.x, box.max.x].flatMap(x => [box.min.y, box.max.y].flatMap(y => [box.min.z, box.max.z].map(z =>
            project(new T.Vector3(x, y, z))
          )));
        }
      }
      if (!corners) {
        const [mw, md] = PAPER_MODELS[record.modelId]?.size || [1.4, 1.1];
        const sc = record.scale || 1;
        const point = localPoint(record, false);
        corners = [-1, 1].flatMap(x => [0, 1].flatMap(y => [-1, 1].map(z =>
          project(parent.localToWorld(point.clone().add(new T.Vector3(x * mw * sc * .45, y * 1.4 * sc, z * md * sc * .45))))
        )));
      }
      const xs = corners.map(c => c.x), ys = corners.map(c => c.y);
      const rawW = Math.max(...xs) - Math.min(...xs);
      const rawH = Math.max(...ys) - Math.min(...ys);
      const w = Math.max(44, rawW);
      const h = Math.max(44, rawH);
      return {
        left: Math.min(...xs) - (w - rawW) / 2,
        top: Math.min(...ys) - (h - rawH) / 2,
        width: w,
        height: h
      };
    }
    const [w,h] = spirit ? [.95 * Math.min(1, record.asset.ratio), .11 + Math.max(.44, .97 / Math.max(1, record.asset.ratio))] : cardSize(record);
    const spiritNode = spirit && items.get("s:" + record.id);
    const point = spiritNode?.position ?? localPoint(record, spirit);
    const card = spirit ? null : items.get("d:" + record.id)?.userData.card;
    const corners = [-1,1].flatMap(x => [-1,1].map(y => {
      if (card) return project(card.localToWorld(new T.Vector3(x / 2, y / 2, cardDepth)));
      const offset = record.surface === "prop" || spirit ? new T.Vector3(x*w/2, spirit ? (y+1)*h/2 : y*h/2, 0)
        : new T.Vector3(x*w/2, 0, y*h/2);
      return project(parent.localToWorld(point.clone().add(offset)));
    }));
    const xs = corners.map(c => c.x), ys = corners.map(c => c.y);
    return { left: Math.min(...xs), top: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }
  const ray = new T.Raycaster();
  function pick(clientX, clientY, surface) {
    const rect = stage.getBoundingClientRect();
    const normal = surface === "prop" ? new T.Vector3(0,0,1) : new T.Vector3(0,1,0);
    const parent = surface === "prop" ? wallSlot : chapter;
    volume.updateMatrixWorld(true);
    const center = parent.localToWorld(localPoint({ surface, x: .5, y: .5 }));
    ray.setFromCamera(new T.Vector2((clientX - rect.left) * 2 / width - 1, 1 - (clientY - rect.top) * 2 / height), camera);
    const hit = ray.ray.intersectPlane(new T.Plane().setFromNormalAndCoplanarPoint(normal, center), new T.Vector3());
    if (!hit) return null;
    const point = parent.worldToLocal(hit);
    return surface === "prop" ? { x: point.x / 1.04 + .5, y: (1.21 - point.y) / 1.06 }
      : floorRecord({ x: point.x, y: point.z });
  }
  function pickModel(clientX, clientY) {
    if (!groundActors?.visible) return null;
    const rect = stage.getBoundingClientRect();
    volume.updateMatrixWorld(true);
    ray.setFromCamera(new T.Vector2((clientX - rect.left) * 2 / width - 1, 1 - (clientY - rect.top) * 2 / height), camera);
    const roots = [];
    for (const [id, node] of items) {
      if (id.startsWith("m:")) roots.push(node);
    }
    if (!roots.length) return null;
    const hits = ray.intersectObjects(roots, true);
    for (const hit of hits) {
      let cur = hit.object;
      while (cur) {
        if (cur.userData?.modelRecordId) return cur.userData.modelRecordId;
        cur = cur.parent;
      }
    }
    return null;
  }
  function react(id, sentiment, offset, temperament, activity) {
    const node = items.get("s:" + id);
    if (!node) return;
    cancelAnimationFrame(reactionFrames.get(id));
    const duration = 750 + temperament.敏感 * 3;
    const start = performance.now();
    function animate(now) {
      if (items.get("s:" + id) !== node) { reactionFrames.delete(id); return; }
      const progress = clamp((now - start) / duration);
      const arc = Math.sin(Math.PI * progress);
      node.position.copy(node.userData.rest);
      node.position.y += sentiment === "like" && (!activity || activity === "toy") ? arc * (.15 + temperament.活跃 * .003) : 0;
      node.scale.y = activity === "food" ? 1 - Math.abs(Math.sin(progress * Math.PI * 3)) * .19 :
        sentiment === "avoid" ? 1 - arc * .36 : 1;
      node.rotation.y = sentiment === "neutral" || activity === "plant" ? arc * .46 * Math.sign(offset.x || 1) : 0;
      node.rotation.x = activity === "plant" ? arc * .16 : 0;
      for (const [mood, face] of Object.entries(node.userData.faces)) face.visible = mood === (progress < 1 ? sentiment : "neutral");
      requestDraw();
      if (progress < 1) reactionFrames.set(id, requestAnimationFrame(animate));
      else reactionFrames.delete(id);
    }
    reactionFrames.set(id, requestAnimationFrame(animate));
  }
  function pauseResidents() {
    for (const [id, frame] of reactionFrames) {
      cancelAnimationFrame(frame);
      const node = items.get("s:" + id);
      if (!node) continue;
      node.position.copy(node.userData.rest);
      node.scale.y = 1;
      node.rotation.x = 0;
      node.rotation.y = 0;
      for (const [mood, face] of Object.entries(node.userData.faces)) face.visible = mood === "neutral";
    }
    reactionFrames.clear();
    requestDraw();
  }
  let activeHighlightFrame = 0;
  let activeHighlightCleanup = null;
  function highlightProp(recordId) {
    if (activeHighlightFrame) {
      cancelAnimationFrame(activeHighlightFrame);
      activeHighlightFrame = 0;
    }
    activeHighlightCleanup?.();
    activeHighlightCleanup = null;
    const node = items.get("m:" + recordId) || items.get("d:" + recordId) || items.get("s:" + recordId);
    if (!node || !groundActors) return;
    const baseScale = node.scale.clone();
    const ringMat = new T.MeshBasicMaterial({
      color: "#ffd67a",
      transparent: true,
      opacity: .92,
      side: T.DoubleSide,
      depthWrite: false
    });
    const ringGeo = new T.RingGeometry(.34, .49, 28);
    const ring = new T.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(node.position.x, .055, node.position.z);
    groundActors.add(ring);
    const cleanup = () => {
      if (items.get("m:" + recordId) === node || items.get("d:" + recordId) === node || items.get("s:" + recordId) === node) {
        node.scale.copy(baseScale);
      }
      ring.removeFromParent();
      ringGeo.dispose();
      ringMat.dispose();
    };
    activeHighlightCleanup = cleanup;
    const start = performance.now();
    const duration = 700;
    function step(now) {
      if (contextLost || !ring.parent) {
        activeHighlightFrame = 0;
        activeHighlightCleanup = null;
        return;
      }
      const t = clamp((now - start) / duration);
      const pulse = Math.sin(Math.PI * t);
      if (items.get("m:" + recordId) === node || items.get("d:" + recordId) === node || items.get("s:" + recordId) === node) {
        node.scale.copy(baseScale).multiplyScalar(1 + pulse * .14);
      }
      ring.scale.setScalar(.85 + t * .95);
      ringMat.opacity = (1 - t) * .9;
      requestDraw();
      if (t < 1) {
        activeHighlightFrame = requestAnimationFrame(step);
      } else {
        cleanup();
        activeHighlightFrame = 0;
        activeHighlightCleanup = null;
        requestDraw();
      }
    }
    activeHighlightFrame = requestAnimationFrame(step);
  }
  return { setWorld, pose, sync, bounds, pick, pickModel, react, view, moveResidents, pauseResidents, highlightProp };
}


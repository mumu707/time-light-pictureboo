
import * as T from "./vendor/three.module.js";
import { worlds, faces, clamp } from "./book-data.mjs";
import { bookSize, cardDepth, cardSize, baseSize, purposeOf, floorPoint, floorRecord, mountX } from "./book-home.mjs";
import { propTypes } from "../camera/prop-types.mjs";
import { regions, regionFootprints } from "./book-regions.mjs";
import { buildPaperModel, PAPER_MODELS } from "./paper-models.mjs";

const paper = document.createElement("canvas");
paper.width = paper.height = 128;
const pen = paper.getContext("2d");
const grain = pen.createImageData(128, 128);
for (let i = 0; i < grain.data.length; i += 4) {
  grain.data[i] = grain.data[i + 1] = grain.data[i + 2] = 224 + Math.random() * 31;
  grain.data[i + 3] = 255;
}
pen.putImageData(grain, 0, 0);
const grainMap = new T.CanvasTexture(paper);
grainMap.colorSpace = T.SRGBColorSpace;
const stock = color => new T.MeshStandardMaterial({ color, map: grainMap, roughness: .91 });
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
const box = (p, w, h, d, x, y, z, c) => mesh(p, new T.BoxGeometry(w, h, d), stock(c), x, y, z);
const disk = (p, radius, depth, x, y, z, c, sides = 24) =>
  mesh(p, new T.CylinderGeometry(radius, radius, depth, sides), stock(c), x, y, z);
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
  ctx.fillStyle = options.color || "#503623";
  ctx.font = `${options.size || 72}px Xiaolai, serif`;
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
      if (material.map && material.map !== grainMap) material.map.dispose();
      material.dispose();
    }
  });
  parent.removeFromParent();
}

function study(p, hinge) {
  const wall = hinge(-2.25, -2.5);
  box(wall, 2.6, 2.65, .13, 0, 1.33, 0, "#b0714f");
  box(wall, 2.36, 2.41, .05, 0, 1.33, .09, "#e7b56e");
  for (const x of [-.59, .59]) for (const y of [.75, 1.91]) {
    box(wall, 1.02, 1.01, .035, x, y, .13, y > 1 ? "#fce0a0" : "#efc184");
    cut(wall, [[-.48,-.42],[.46,.35],[.46,.49],[-.48,-.18]], .004, x, y, .151, "#fff0b9");
  }
  box(wall, 2.8, .13, .32, 0, .17, .14, "#925c47");
  box(wall, 2.8, .15, .29, 0, 2.59, .13, "#925c47");
  const shelves = hinge(1.85, -2.36);
  box(shelves, 2.2, 2.55, .12, 0, 1.27, 0, "#7c5340");
  for (const x of [-1.06, 1.06]) box(shelves, .13, 2.6, .59, x, 1.3, .2, "#9c674c");
  for (let row = 0; row < 3; row++) {
    const y = .16 + row * .79;
    box(shelves, 2.18, .12, .66, 0, y, .26, "#b77951");
    const colors = ["#d89c57", "#a75847", "#6e8b79", "#ead5a7", "#715657", "#c78758"];
    for (let i = 0; i < 6; i++) {
      const h = .33 + (i * 3 + row * 2) % 5 * .07;
      box(shelves, .24, h, .3, -.82 + i * .3, y + h / 2 + .07, .31, colors[(i + row * 2) % colors.length]);
      box(shelves, .18, .03, .012, -.82 + i * .3, y + .19, .465, "#e7cfa0");
    }
  }
  box(shelves, 2.24, .15, .68, 0, 2.54, .23, "#b77951");
  const lamp = hinge(-2.75, -.55);
  disk(lamp, .35, .1, 0, .05, 0, "#927057", 8);
  disk(lamp, .06, 1.37, 0, .72, 0, "#98653d", 8);
  mesh(lamp, new T.CylinderGeometry(.27, .64, .54, 8), stock("#f0ba70"), 0, 1.48, 0);
  disk(lamp, .6, .04, 0, 1.22, 0, "#f8d6a4", 8);
  disk(p, 1.38, .024, -2.15, .02, .85, "#ad6350", 12).scale.z = .83;
  disk(p, 1.19, .026, -2.15, .026, .85, "#dfab7b", 12).scale.z = .83;
  disk(p, .95, .025, -2.15, .034, .85, "#bc765d", 12).scale.z = .83;
}
function garden(p, hinge) {
  const foliage = ["#588064", "#89a46b", "#b7bd78", "#71967e"];
  for (let i = 0; i < 7; i++) {
    const plant = hinge(-3.32 + i * .97, -2.45 + Math.sin(i * 2) * .24);
    const h = 1.15 + i % 3 * .39;
    box(plant, .066, h, .06, 0, h / 2, .02, "#54745a");
    for (const direction of [-1, 1]) {
      const points = [[0,0],[.3 * direction,.4],[.84 * direction,.6],[.59 * direction,.18]];
      const leaf = cut(plant, points, .034, 0, h * (direction > 0 ? .51 : .28), .04, foliage[(i + 1) % 4]);
      leaf.rotation.y = direction * .37;
      cut(leaf, [[0,0],[.84 * direction,.6],[.42 * direction,.24]], .009, 0, 0, .034, foliage[(i + 2) % 4]);
    }
    cut(plant, [[0,h*.58],[-.32,h*.88],[0,h*1.16],[.27,h*.91]], .06, 0, 0, .02, foliage[i % 4]);
  }
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
function station(p, hinge) {
  const horizon = hinge(-.1, -2.8);
  horizon.scale.setScalar(.82);
  cut(horizon, [[-3.65,0],[-3.65,1.16],[-2.55,1.9],[-1.4,1.18],[.2,2.12],[1.36,1.3],[2.66,1.9],[3.7,1.1],[3.7,0]], .1, 0, 0, 0, "#535b8c", "#393e67");
  cut(horizon, [[-3.62,0],[-3.62,.7],[-2.65,1.15],[-1.96,.81],[-.79,1.43],[.71,.79],[2.05,1.32],[3.7,.72],[3.7,0]], .07, 0, 0, .18, "#7f8db5", "#505a87");
  disk(horizon, .49, .06, -2.47, 2.23, .22, "#f8dfa7").rotation.x = Math.PI / 2;
  for (const [x,y] of [[-1.6,2.25],[-.69,2.64],[.6,2.46],[2.2,2.48],[3,2.19]]) {
    cut(horizon, [[-.09,0],[0,.14],[.09,0],[0,-.13]], .014, x, y, .22, "#eadfb9");
  }
  const shelter = hinge(1.52, -1.95);
  shelter.scale.setScalar(.66);
  box(shelter, 2.7, 1.55, .12, 0, .84, 0, "#647194");
  for (const x of [-1.23, 1.23]) for (const z of [0, .86]) box(shelter, .11, 1.92, .13, x, .96, z, "#e2c696");
  box(shelter, 2.87, .13, 1.25, 0, 1.93, .4, "#af7970").rotation.x = -.12;
  box(shelter, 2.3, .13, .42, 0, .52, .23, "#c6a47f");
  box(shelter, 1.25, .29, .07, 0, 1.73, 1.04, "#edd3a3");
  print(shelter, "月光车站", 1.21, .27, 0, 1.73, 1.08, { size: 130 });
  const track = group(p, -1.65, 0, -.72);
  track.scale.setScalar(.75);
  for (const z of [-.28, .28]) box(track, 4.05, .024, .055, 0, .059, z, "#505775");
  for (let x = -1.87; x < 2; x += .34) box(track, .13, .022, .82, x, .051, 0, "#837786");
}
function creek(p, hinge) {
  box(p, 12, .045, 1.85, 0, .056, -2, "#73aeb6");
  for (let i = 0; i < 8; i++) box(p, .35, .09, 2.35, -1.2 + i * .35, .14, -2, "#bc9465");
  for (let i = 0; i < 10; i++) {
    disk(p, .24 + (i % 3) * .09, .15, i - 4.5, .09, -1.05, "#789471", 7);
  }
  const sign = hinge(1.5, -.95);
  cut(sign, [[-.46,.1],[.48,.1],[.26,.42],[-.31,.48]], .08, 0, 0, 0, "#e7bd78");
}
function marsh(p, hinge) {
  disk(p, 2.7, .035, -3.8, .058, -.9, "#628b89").scale.z = .45;
  for (let i = 0; i < 8; i++) {
    const reed = hinge(-5.9 + i * .55, -1.8);
    box(reed, .065, 1.12, .06, 0, .59, 0, "#708a5a").rotation.z = .15;
    disk(reed, .12, .2, -.07, 1.14, 0, "#d0a779", 7);
    disk(reed, .10, .10, .23, 1.27 + .14 * (i % 3), .2, "#ffdd79", 8);
    disk(p, .18, .012, -5.9 + i * .55, .082, -.55, "#9db59d", 9).scale.z = .4;
  }
}
function ridge(p, hinge) {
  const slopes = hinge(-.8, -3.65);
  cut(slopes, [[-3.6,0],[-2.2,1.3],[-.8,.65],[1.2,1.6],[3.6,0]], .12, 0, 0, 0, "#9aa56f");
  for (const x of [-2.4, 2.3]) {
    const mill = hinge(x, -3);
    box(mill, .17, 2.2, .20, 0, 1.08, 0, "#b78963");
    for (let i = 0; i < 4; i++) box(mill, .78, .21, .06, 0, 1.93, .16, "#e9ba87").rotation.z = i * Math.PI / 4;
  }
  const chimes = hinge(.2, -2.9);
  for (const x of [-.75,.75]) box(chimes, .12, 1.2, .12, x, .6, 0, "#8d6d52");
  box(chimes, 1.8, .14, .48, 0, 1.24, 0, "#c89069");
  for (let i=0;i<4;i++) disk(chimes,.08,.25+i*.11,-.52+i*.34,.85-i*.06,.12,"#e1b45d",8);
}
function coast(p, hinge) {
  box(p, 12, .04, 2, -.3, .055, -2.7, "#759db8");
  for (let i=0;i<3;i++) box(p, 12, .012, .11, -.3, .081, -3.55+i*.7, "#c5d6cd");
  for (let i=0;i<5;i++) {
    const rock = hinge(-3.3+i*1.45,-2.1);
    cut(rock, [[-.52,0],[-.4,.37],[.1,.55],[.53,.21],[.45,0]], .25, 0, 0, 0, "#9e8c91");
    disk(p,.32,.032,-3.3+i*1.45,.086,-1.75,"#d7c2a1",9);
  }
}
const builders = { study, garden, station, creek, marsh, ridge, coast };

export function createScene(stage, onLayout, onLost) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", { alpha: true, antialias: true });
  if (!context) return null;
  const renderer = new T.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  canvas.className = "book-canvas";
  canvas.setAttribute("aria-hidden", "true");
  stage.prepend(canvas);
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera();
  camera.position.set(3.2, 9.8, 13);
  camera.lookAt(0, .62, 0);
  const focus = new T.Vector3(0, .62, 0);
  const initialView = new T.Spherical().setFromVector3(camera.position.clone().sub(focus));
  const lookAt = focus.clone();
  let magnification = 1;
  const sky = new T.HemisphereLight("#fff5de", "#9583a7", 2);
  scene.add(sky);
  const sun = new T.DirectionalLight("#fff0ce", 2.15);
  sun.position.set(-5, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: .5, far: 38 });
  sun.shadow.normalBias = .025;
  scene.add(sun);
  const ground = mesh(scene, new T.PlaneGeometry(70, 70), new T.ShadowMaterial({ opacity: .23 }), 0, -1.29, 0);
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;

  const volume = group(scene);
  const cover = group(volume, 0, -.25);
  const flip = group(volume, 0, -.04);
  const rightLeaves = group(volume);
  const leftLeaves = group(volume);
  const { leafWidth, depth } = bookSize;
  const leafCenter = leafWidth / 2;
  box(volume, .66, 1.02, depth + .04, 0, -.69, 0, "#765144");
  box(volume, .49, .88, depth + .11, 0, -.70, 0, "#966953");
  box(rightLeaves, leafWidth + .09, .24, depth + .09, leafCenter, -1.16, 0, "#975645");
  box(leftLeaves, leafWidth + .09, .24, depth + .09, -leafCenter, -1.16, 0, "#975645");
  for (const side of [-1, 1]) {
    const stack = side < 0 ? leftLeaves : rightLeaves;
    for (let i = 0; i < 14; i++) {
      const stagger = (i % 3) * .025;
      box(stack, leafWidth - .12 - stagger, .061, depth - .24 - stagger,
        side * leafCenter, -1.01 + i * .063, 0, i % 3 === 0 ? "#d6b38e" : "#ebd2aa");
    }
  }
  box(cover, leafWidth + .06, .17, depth + .07, -leafCenter, 0, 0, "#935446");
  box(cover, 4.09, .023, 6.15, -2.16, -.079, 0, "#b77455");
  box(cover, 3.47, .012, 4.95, -2.14, -.096, 0, "#e3bb84");
  box(cover, 3.29, .012, 4.77, -2.14, -.106, 0, "#985c47");
  box(cover, 2.98, .012, 3.88, -2.14, -.115, -.09, "#efd3a2");
  const lettering = group(cover, -2.14, -.127, -.09);
  lettering.rotation.set(Math.PI / 2, 0, Math.PI);
  print(lettering, "拾光立体书", 2.82, .6, 0, .74, 0, { size: 135 });
  print(lettering, "☀", 1.6, 1.25, 0, -.34, 0, { size: 540, color: "#a9573c" });
  for (const node of cover.children.slice(1)) {
    node.position.x -= leafCenter - 2.14;
    node.scale.x *= 1.13;
    if (node !== lettering) node.scale.z *= 1.28;
  }
  box(flip, leafWidth - .13, .035, depth - .25, leafCenter, 0, 0, "#f0d6ab");
  let chapter, scenery, groundActors, wallSlot;
  let hinges = [];
  let width = 1, height = 1, coverProgress = 0, frame;
  const items = new Map();
  const reactionFrames = new Map();
  const requestDraw = () => {
    if (frame !== undefined) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      renderer.render(scene, camera);
    });
  };
  function compose() {
    const aspect = width / height;
    const yaw = Math.atan2(camera.position.x - lookAt.x, camera.position.z - lookAt.z);
    const spread = leafWidth * Math.abs(Math.cos(yaw)) + depth / 2 * Math.abs(Math.sin(yaw));
    const opened = Math.max(4.25, (spread * .5 + .18) / aspect) / magnification;
    const closed = Math.max(7.3, 6.1 / aspect);
    const half = closed + (opened - closed) * coverProgress;
    camera.left = -half * aspect;
    camera.right = half * aspect;
    camera.top = half;
    camera.bottom = -half;
    camera.setViewOffset(width, height, 0, 0, width, height);
    camera.updateProjectionMatrix();
    volume.position.x = -leafCenter * (1 - coverProgress);
    requestDraw();
  }
  function view(yaw = 0, tilt = 0, center = { x: 0, y: 0 }, zoom = 1) {
    const angle = Math.PI / 180;
    const spherical = initialView.clone();
    spherical.theta += clamp(yaw, -30, 30) * angle;
    spherical.phi = clamp(initialView.phi - tilt * angle, 34 * angle, 63 * angle);
    magnification = zoom;
    lookAt.copy(focus);
    lookAt.x = center.x;
    lookAt.z = center.y;
    camera.position.setFromSpherical(spherical).add(lookAt);
    camera.lookAt(lookAt);
    camera.updateMatrixWorld();
    compose();
    onLayout();
  }
  const resize = new ResizeObserver(() => {
    width = Math.max(1, stage.clientWidth);
    height = Math.max(1, stage.clientHeight);
    renderer.setSize(width, height, false);
    compose();
    onLayout();
  });
  resize.observe(stage);
  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    resize.disconnect();
    cancelAnimationFrame(frame);
    for (const reactionFrame of reactionFrames.values()) cancelAnimationFrame(reactionFrame);
    renderer.dispose();
    onLost();
    canvas.remove();
  });

  function setWorld(id) {
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
    box(chapter, .055, .025, depth - .28, 0, .014, 0, "#927256");
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

  function pose({ opening = 1, standing = 1, actors = standing, turning = 0, direction = 1 }) {
    if (opening !== coverProgress) {
      coverProgress = opening;
      compose();
    }
    leftLeaves.visible = opening > .08;
    leftLeaves.rotation.z = -Math.PI * (1 - opening) * .8;
    cover.rotation.z = -Math.PI * (1 - opening);
    cover.position.y = -.25 + .29 * (1 - opening);
    chapter.visible = opening >= 1;
    flip.visible = turning > 0 && turning < 1;
    flip.rotation.z = direction > 0 ? Math.PI * turning : Math.PI * (1 - turning);
    scenery.visible = standing > 0 && !flip.visible;
    scenery.scale.y = Math.max(.001, standing);
    scenery.position.y = .055 * (1 - standing);
    groundActors.visible = actors > 0 && !flip.visible;
    groundActors.scale.y = Math.max(.001, actors);
    groundActors.position.y = .045 * (1 - actors);
    for (const node of hinges) {
      // The paper folds within its own footprint before the turning leaf can enter.
      node.rotation.x = (1 - standing) * .3;
      node.scale.copy(node.userData.openScale);
      node.scale.z *= .5 + standing * .5;
      node.scale.y *= .55 + standing * .45;
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
          parent.add(node);
        } else {
          node = group(parent);
          node.userData.appearance = appearance;
          const map = new T.Texture(record.asset.image);
          map.colorSpace = T.SRGBColorSpace;
          map.needsUpdate = true;
          const front = texture => new T.MeshBasicMaterial({ map: texture, alphaTest: cardAlpha, side: T.DoubleSide });
          if (spirit) {
            const w = .95 * Math.min(1, record.asset.ratio);
            const h = Math.max(.44, .97 / Math.max(1, record.asset.ratio));
            disk(node, .26, .07, 0, .035, .035, "#dbba92", 8);
            for (const sign of [-1, 1]) {
              const facet = group(node, 0, .11, 0);
              facet.rotation.y = -sign * .39;
              const half = map.clone();
              half.repeat.x = .5;
              half.offset.x = sign > 0 ? .5 : 0;
              half.needsUpdate = true;
              const edge = front(half);
              edge.color.set("#c6a982");
              mesh(facet, new T.PlaneGeometry(w / 2, h), edge, sign * w / 4, h / 2, -.045);
              mesh(facet, new T.PlaneGeometry(w / 2, h), front(half), sign * w / 4, h / 2, 0);
            }
            node.userData.faces = Object.fromEntries(Object.entries({ neutral: "• •", like: "⌣ ⌣", avoid: "› ‹" }).map(([mood, eyes]) => {
              const face = print(node, eyes, w * .61, h * .24, 0, .11 + h * .53, .16, { size: 225, color: "#3f3028" });
              face.visible = mood === "neutral";
              face.castShadow = false;
              return [mood, face];
            }));
            map.dispose();
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
    requestDraw();
  }
  function moveResidents(residents) {
    let moved = false;
    const breeze = Math.sin(performance.now() * .0022) * .16;
    for (const [id, node] of items) {
      if (id.startsWith("m:") && node.userData.windPivot) {
        node.userData.windPivot.rotation.y = breeze;
        moved = true;
      }
    }
    for (const record of residents) {
      const node = items.get("s:" + record.id);
      if (!node) continue;
      const point = localPoint(record, true);
      if (point.equals(node.userData.rest) && record.activity === node.userData.activity) continue;
      const stride = point.distanceTo(node.userData.rest);
      node.userData.stride = (node.userData.stride || 0) + stride;
      node.userData.rest = point;
      node.userData.activity = record.activity;
      node.position.copy(point);
      node.rotation.z = record.activity === "rest" ? -.10 :
        record.activity === "walk" ? Math.sin(node.userData.stride * 13) * .065 : 0;
      moved = true;
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
      const [mw, md] = PAPER_MODELS[record.modelId]?.size || [1.4, 1.1];
      const sc = record.scale || 1;
      const point = localPoint(record, false);
      const corners = [-1, 1].flatMap(x => [0, 1].flatMap(y => [-1, 1].map(z =>
        project(parent.localToWorld(point.clone().add(new T.Vector3(x * mw * sc * .45, y * 1.2 * sc, z * md * sc * .45))))
      )));
      const xs = corners.map(c => c.x), ys = corners.map(c => c.y);
      return { left: Math.min(...xs), top: Math.min(...ys), width: Math.max(44, Math.max(...xs) - Math.min(...xs)), height: Math.max(44, Math.max(...ys) - Math.min(...ys)) };
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
  return { setWorld, pose, sync, bounds, pick, react, view, moveResidents, pauseResidents };
}


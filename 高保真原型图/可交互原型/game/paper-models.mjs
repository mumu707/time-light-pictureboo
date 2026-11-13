import * as T from "./vendor/three.module.js";
import { regions, regionFootprints } from "./book-regions.mjs";

const pale = "#efd2a1";
const wood = "#87614c";
const ivory = "#f2d9a9";
const coral = "#b96b55";
const sage = "#829574";
const amber = "#e7ad61";
const night = "#4e607b";

function part(parent, name, geometry, material, x, y, z) {
  const mesh = new T.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const box = (p, name, w, h, d, x, y, z, mat) => part(p, name, new T.BoxGeometry(w, h, d), mat, x, y, z);
const tube = (p, name, r, h, x, y, z, mat, sides = 9) => part(p, name, new T.CylinderGeometry(r, r, h, sides), mat, x, y, z);
const poly = (p, name, points, d, x, y, z, mat) => {
  const shape = new T.Shape(points.map(([px, py]) => new T.Vector2(px, py)));
  return part(p, name, new T.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 1 }), mat, x, y, z);
};
function node(parent, name, x = 0, y = 0, z = 0) {
  const group = new T.Group();
  group.name = name;
  group.position.set(x, y, z);
  parent?.add(group);
  return group;
}
function strut(parent, name, start, end, width, mat) {
  const a = new T.Vector3(...start), b = new T.Vector3(...end);
  const mid = a.clone().lerp(b, .5);
  const beam = box(parent, name, width, a.distanceTo(b), width, mid.x, mid.y, mid.z, mat);
  beam.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.sub(a).normalize());
  return beam;
}
function tray(p, width, depth, topMat, baseMat) {
  box(p, "paper_base", width, .095, depth, 0, .048, 0, baseMat);
  box(p, "paper_top", width * .94, .028, depth * .92, 0, .104, 0, topMat);
}
function trestle(p, mat, woodMat, top, width, depth) {
  box(p, "top", width, .10, depth, 0, top, 0, mat);
  for (const x of [-width * .4, width * .4]) {
    box(p, "leg", .14, top, depth * .68, x, top / 2, 0, woodMat);
  }
}
function seedling(p, x, z, leafMat, potMat) {
  tube(p, "pot", .19, .24, x, .12, z, potMat, 7);
  poly(p, "sprout", [[0, 0], [-.27, .26], [-.08, .31], [0, .55], [.14, .39], [.27, .3], [.1, .16]], .045, x, .22, z, leafMat);
}

export const PAPER_MODELS = {
  mail_kiosk: { name: "邮亭", batch: 1, purpose: "backdrop", category: "建筑", color: coral, size: [2.24, 1.5], anchors: { fold_pivot: [0, 0, -.59], mail_slot: [0, .99, .61], visit: [0, 0, 1.12] } },
  windsock: { name: "纸风向袋", batch: 1, purpose: "toy", category: "器物", color: sage, size: [.75, .68], anchors: { fold_pivot: [0, 0, -.19], wind_pivot: [0, 1.63, 0] } },
  parcel_bench: { name: "包裹长椅", batch: 1, purpose: "backdrop", category: "器物", color: sage, size: [2.24, 1.06], anchors: { fold_pivot: [0, 0, -.39], visit: [0, 0, .91] } },
  apricot_tree: { name: "折叶杏树", batch: 1, purpose: "plant", category: "植物", color: sage, size: [1.13, 1.04], anchors: { fold_pivot: [0, 0, 0], fruit_pick: [.66, 1.71, .48], visit: [0, 0, .92] } },
  fruit_crate: { name: "杏果筐", batch: 1, purpose: "food", category: "食物", color: amber, size: [1.47, 1.05], anchors: { visit: [0, 0, .89], fruit_pick: [0, .49, .31] } },
  orchard_ladder: { name: "果园纸梯", batch: 1, purpose: "backdrop", category: "器物", color: wood, size: [1.1, 1.32], anchors: { fold_pivot: [0, 0, -.55], visit: [0, 0, .91] } },
  paper_telescope: { name: "纸筒望远镜", batch: 1, purpose: "toy", category: "器物", color: night, size: [1.63, 1.6], anchors: { fold_pivot: [0, 0, 0], scope_pitch: [0, 1.33, 0], visit: [0, 0, .99] } },
  star_chart: { name: "星图画架", batch: 1, purpose: "backdrop", category: "器物", color: night, size: [1.45, 1.12], anchors: { fold_pivot: [0, 0, -.38], chart: [0, 1.04, .24], visit: [0, 0, .95] } },
  night_lantern: { name: "夜灯", batch: 1, purpose: "backdrop", category: "器物", color: night, size: [.96, .92], anchors: { fold_pivot: [0, 0, 0], light: [0, .84, 0], visit: [0, 0, .77] } },
  desk: { name: "书桌角", batch: 0, purpose: "backdrop", category: "器物", color: "#ab7049", size: regionFootprints.desk, anchors: { fold_pivot: [0, 0, 0] } },
  screen: { name: "折扇屏风", batch: 0, purpose: "backdrop", category: "器物", color: "#c58d65", size: regionFootprints.screen, anchors: { fold_pivot: [0, 0, 0] } },
  reading: { name: "读书地毯", batch: 0, purpose: "toy", category: "器物", color: "#ad6350", size: regionFootprints.reading, anchors: { fold_pivot: [0, 0, 0] } },
  display: { name: "陈列展台", batch: 0, purpose: "backdrop", category: "器物", color: "#8f6c4f", size: regionFootprints.display, anchors: { fold_pivot: [0, 0, 0] } },
  pond: { name: "雨水池", batch: 0, purpose: "backdrop", category: "植物", color: "#79a8a7", size: regionFootprints.pond, anchors: { fold_pivot: [0, 0, 0] } },
  arch: { name: "绿藤拱门", batch: 0, purpose: "plant", category: "植物", color: "#688658", size: regionFootprints.arch, anchors: { fold_pivot: [0, 0, 0] } },
  nursery: { name: "育苗木箱", batch: 0, purpose: "plant", category: "植物", color: "#819758", size: regionFootprints.nursery, anchors: { fold_pivot: [0, 0, 0] } },
  bench: { name: "花园长椅", batch: 0, purpose: "backdrop", category: "器物", color: "#8ba278", size: regionFootprints.bench, anchors: { fold_pivot: [0, 0, 0] } },
  rails: { name: "旧铁轨信号灯", batch: 0, purpose: "toy", category: "器物", color: "#777995", size: regionFootprints.rails, anchors: { fold_pivot: [0, 0, 0] } },
  shelter: { name: "候车亭", batch: 0, purpose: "backdrop", category: "建筑", color: "#987589", size: regionFootprints.shelter, anchors: { fold_pivot: [0, 0, 0] } },
  luggage: { name: "复古行李堆", batch: 0, purpose: "toy", category: "器物", color: "#a48068", size: regionFootprints.luggage, anchors: { fold_pivot: [0, 0, 0] } },
  clock: { name: "站台座钟", batch: 0, purpose: "backdrop", category: "器物", color: "#8583a7", size: regionFootprints.clock, anchors: { fold_pivot: [0, 0, 0] } },
  bridge: { name: "溪谷木桥", batch: 0, purpose: "backdrop", category: "建筑", color: "#9b7950", size: regionFootprints.bridge, anchors: { fold_pivot: [0, 0, 0] } },
  rocks: { name: "苔石群", batch: 0, purpose: "plant", category: "植物", color: "#83a27a", size: regionFootprints.rocks, anchors: { fold_pivot: [0, 0, 0] } },
  boats: { name: "折纸小舟", batch: 0, purpose: "toy", category: "器物", color: "#8d9872", size: regionFootprints.boats, anchors: { fold_pivot: [0, 0, 0] } },
  reeds: { name: "芦苇丛", batch: 0, purpose: "plant", category: "植物", color: "#6e8f6c", size: regionFootprints.reeds, anchors: { fold_pivot: [0, 0, 0] } },
  lantern: { name: "萤火灯台", batch: 0, purpose: "backdrop", category: "器物", color: "#b19c61", size: regionFootprints.lantern, anchors: { fold_pivot: [0, 0, 0] } },
  bells: { name: "风铃木棚", batch: 0, purpose: "toy", category: "器物", color: "#b8875a", size: regionFootprints.bells, anchors: { fold_pivot: [0, 0, 0] } },
  mill: { name: "纸风车", batch: 0, purpose: "toy", category: "建筑", color: "#c49c62", size: regionFootprints.mill, anchors: { fold_pivot: [0, 0, 0] } },
  flags: { name: "望风彩旗", batch: 0, purpose: "backdrop", category: "器物", color: "#bd8167", size: regionFootprints.flags, anchors: { fold_pivot: [0, 0, 0] } },
  shells: { name: "潮池贝壳", batch: 0, purpose: "toy", category: "其他", color: "#c69181", size: regionFootprints.shells, anchors: { fold_pivot: [0, 0, 0] } },
  beacon: { name: "海岸灯塔", batch: 0, purpose: "backdrop", category: "建筑", color: "#b37c69", size: regionFootprints.beacon, anchors: { fold_pivot: [0, 0, 0] } }
};

const BATCH1_PLACEMENTS = {
  study: [
    { asset: "night_lantern", x: 3.8, z: 1.2, yaw: -0.18, scale: 0.82 },
    { asset: "parcel_bench", x: -2.9, z: 3.1, yaw: 0.14, scale: 0.74 }
  ],
  station: [
    { asset: "mail_kiosk", x: 5.6, z: 1.55, yaw: -0.12, scale: 0.86 },
    { asset: "parcel_bench", x: 4.1, z: 3.25, yaw: 0.12, scale: 0.82 }
  ],
  garden: [
    { asset: "apricot_tree", x: -6.5, z: 1.45, yaw: 0.05, scale: 0.78 },
    { asset: "orchard_ladder", x: -7.95, z: 2.9, yaw: 0.28, scale: 0.74 },
    { asset: "fruit_crate", x: -4.1, z: 3.55, yaw: -0.12, scale: 0.76 }
  ],
  creek: [
    { asset: "fruit_crate", x: 3.2, z: 2.3, yaw: -0.15, scale: 0.78 },
    { asset: "apricot_tree", x: -3.2, z: 1.3, yaw: 0.1, scale: 0.72 }
  ],
  marsh: [
    { asset: "windsock", x: 3.4, z: 1.4, yaw: -0.22, scale: 0.82 },
    { asset: "night_lantern", x: -2.1, z: 2.4, yaw: 0.12, scale: 0.8 }
  ],
  ridge: [
    { asset: "windsock", x: 6.8, z: 2.5, yaw: -0.2, scale: 0.86 }
  ],
  coast: [
    { asset: "paper_telescope", x: 5.8, z: 1.75, yaw: 0.22, scale: 0.82 },
    { asset: "star_chart", x: 3.6, z: 2.55, yaw: 0.17, scale: 0.82 },
    { asset: "night_lantern", x: 7.5, z: 2.9, yaw: 0, scale: 0.85 }
  ]
};

export function createDefaultSceneModels(worldId, floorRecordFn) {
  const result = [];
  for (const [name, type, x, z, color] of regions[worldId] || []) {
    const spec = PAPER_MODELS[type];
    const pos = floorRecordFn({ x, y: z });
    result.push({
      id: `region-${worldId}-${type}-${Math.round(x * 10)}`,
      modelId: type,
      name: spec?.name || name,
      category: spec?.category || "器物",
      purpose: spec?.purpose || "backdrop",
      color,
      surface: "paper",
      x: pos.x,
      y: pos.y,
      scale: 1,
      rotation: 0,
      selfRotation: 0
    });
  }
  for (const piece of BATCH1_PLACEMENTS[worldId] || []) {
    const spec = PAPER_MODELS[piece.asset];
    const pos = floorRecordFn({ x: piece.x, y: piece.z });
    result.push({
      id: `model-${worldId}-${piece.asset}`,
      modelId: piece.asset,
      name: spec.name,
      category: spec.category,
      purpose: spec.purpose,
      color: spec.color,
      surface: "paper",
      x: pos.x,
      y: pos.y,
      scale: piece.scale,
      rotation: Math.round((piece.yaw || 0) * 180 / Math.PI),
      selfRotation: 0
    });
  }
  return result;
}

export function buildPaperModel(modelId, stockFn, colorOverride) {
  const root = new T.Group();
  root.name = modelId;
  const spec = PAPER_MODELS[modelId];
  const primaryColor = colorOverride || spec?.color || coral;
  const matPrimary = stockFn(primaryColor);
  const matWood = stockFn(wood);
  const matIvory = stockFn(ivory);
  const matCoral = stockFn(coral);
  const matSage = stockFn(sage);
  const matAmber = stockFn(amber);
  const matNight = stockFn(night);
  const body = node(root, "paper_body");

  switch (modelId) {
    case "mail_kiosk": {
      tray(body, 2.17, 1.47, matIvory, matWood);
      box(body, "left_wall", .11, 1.48, 1.02, -.89, .86, 0, matCoral);
      box(body, "right_wall", .11, 1.48, 1.02, .89, .86, 0, matCoral);
      box(body, "back_wall", 1.79, 1.53, .10, 0, .89, -.49, stockFn("#a25b4d"));
      box(body, "face", 1.59, .92, .13, 0, .76, .49, matCoral);
      box(body, "mail_slot_inset", .56, .09, .045, 0, .99, .575, stockFn("#58433b"));
      box(body, "envelope_plaque", .45, .27, .07, 0, .56, .575, matIvory);
      for (const direction of [-1, 1]) {
        box(body, "envelope_fold", .24, .027, .014, direction * .091, .565, .616, matWood).rotation.z = direction * .53;
        box(body, "folded_roof", 1.12, .083, 1.41, direction * .47, 1.67, 0, matCoral).rotation.z = -direction * .27;
        box(body, "front_paper_edge", 1.08, .032, .027, direction * .47, 1.656, .715, matIvory).rotation.z = -direction * .27;
      }
      box(body, "roof_ridge", .09, .075, 1.43, 0, 1.82, 0, matIvory);
      break;
    }
    case "windsock": {
      tray(body, .71, .64, matSage, matWood);
      tube(body, "pole", .043, 1.49, 0, .85, 0, matWood);
      const sock = node(body, "wind_pivot", 0, 1.63, 0);
      root.userData.windPivot = sock;
      for (const [i, [x, r]] of [[.04, .27], [.28, .23], [.51, .17], [.69, .12]].entries()) {
        const ringMat = stockFn(i % 2 ? ivory : coral);
        ringMat.side = T.DoubleSide;
        const ring = part(sock, "pleated_ribbon_" + i, new T.CylinderGeometry(r, r * .88, .27, 7, 1, true), ringMat, x, 0, 0);
        ring.rotation.z = -Math.PI / 2;
      }
      const rim = part(sock, "mouth_rim", new T.TorusGeometry(.266, .021, 4, 7), matIvory, -.084, 0, 0);
      rim.rotation.y = Math.PI / 2;
      tube(body, "cap", .09, .07, 0, 1.64, 0, matAmber);
      break;
    }
    case "parcel_bench": {
      for (const x of [-.83, .83]) box(body, "folded_leg", .16, .43, .71, x, .215, 0, matWood);
      box(body, "seat", 2.2, .10, .92, 0, .47, 0, matSage);
      box(body, "backrest", 2.17, .28, .115, 0, .72, -.39, matSage);
      for (const [x, w, h] of [[-.64, .52, .36], [.23, .63, .27], [.82, .31, .46]]) {
        box(body, "parcel", w, h, .40, x, .52 + h / 2, .04, matIvory);
        box(body, "parcel_tape", w * .21, h + .01, .412, x, .52 + h / 2, .04, matCoral);
      }
      break;
    }
    case "apricot_tree": {
      tray(body, 1.08, 1.02, matSage, matWood);
      strut(body, "trunk", [0, .10, 0], [.11, 1.75, 0], .15, matWood);
      strut(body, "branch_left", [.05, .96, 0], [-.67, 1.68, .07], .095, matWood);
      strut(body, "branch_right", [.10, 1.17, 0], [.70, 1.86, -.11], .10, matWood);
      const leafLight = stockFn("#a4ac77");
      for (const [x, y, z, w] of [[0, 1.92, 0, 1.20], [-.63, 1.75, .16, .69], [.65, 1.88, -.03, .79], [.12, 2.48, -.16, .70]]) {
        poly(body, "leaf_facet", [[-w, 0], [-w * .72, w * .46], [0, w * .61], [w * .64, w * .43], [w, 0], [w * .56, -w * .30], [-w * .43, -w * .32]], .055, x, y, z, matSage);
        poly(body, "light_facet", [[-w, 0], [0, w * .55], [w, 0], [0, -w * .14]], .036, x, y, z + .06, leafLight).rotation.y = .22;
      }
      for (const [x, y, z] of [[-.79, 1.85, .37], [-.4, 1.62, .43], [.01, 2.21, .31], [.42, 1.78, .43], [.72, 1.76, .28], [.27, 2.47, .12]]) {
        part(body, "apricot", new T.DodecahedronGeometry(.145, 0), matAmber, x, y, z);
      }
      break;
    }
    case "fruit_crate": {
      tray(body, 1.44, 1.03, matWood, matWood);
      for (const z of [-.46, .46]) for (const y of [.22, .43]) box(body, "crate_slat", 1.38, .15, .065, 0, y, z, matIvory);
      for (const x of [-.66, .66]) box(body, "crate_end", .08, .47, .98, x, .31, 0, matWood);
      for (const [x, y, z] of [[-.48, .43, -.12], [-.14, .47, .23], [.18, .52, -.20], [.45, .48, .18], [-.35, .54, -.22]]) {
        part(body, "fruit", new T.DodecahedronGeometry(.18, 0), matAmber, x, y, z);
        poly(body, "fruit_leaf", [[0, 0], [.06, .105], [.23, .075], [.11, 0]], .019, x, y + .16, z, matSage);
      }
      break;
    }
    case "orchard_ladder": {
      for (const x of [-.48, .48]) {
        strut(body, "front_rail", [x, .02, .57], [x, 1.84, -.1], .108, matWood);
        strut(body, "back_rail", [x, .02, -.58], [x, 1.84, -.1], .09, matSage);
      }
      for (let i = 0; i < 5; i++) {
        const y = .24 + i * .32;
        box(body, "rung", 1.03, .075, .22, 0, y, .57 - y * .36, matIvory);
      }
      box(body, "top_step", 1.06, .11, .34, 0, 1.84, -.1, matIvory);
      break;
    }
    case "paper_telescope": {
      for (let i = 0; i < 3; i++) {
        const a = i * 2 * Math.PI / 3;
        strut(body, "tripod_leg", [Math.sin(a) * .69, .035, Math.cos(a) * .69], [0, 1.34, 0], .105, matWood);
      }
      const pivot = node(body, "scope_pitch", 0, 1.33, 0);
      pivot.rotation.x = -.27;
      root.userData.scopePitch = pivot;
      tube(pivot, "scope_tube", .24, 1.36, 0, 0, 0, matNight).rotation.x = Math.PI / 2;
      for (const z of [-.61, .60]) tube(pivot, "paper_rim", .274, .12, 0, 0, z, matAmber).rotation.x = Math.PI / 2;
      tube(pivot, "lens", .213, .025, 0, 0, .668, stockFn("#88adab"), 12).rotation.x = Math.PI / 2;
      tube(pivot, "eyepiece", .125, .26, 0, 0, -.73, matWood).rotation.x = Math.PI / 2;
      break;
    }
    case "star_chart": {
      for (const x of [-.61, .61]) strut(body, "easel_leg", [x, .02, .37], [x * .57, 1.55, -.08], .088, matWood);
      strut(body, "rear_support", [0, .02, -.51], [0, 1.48, -.09], .11, matWood);
      box(body, "chart_back", 1.32, .98, .075, 0, 1.04, .135, matIvory);
      box(body, "sky_print", 1.18, .84, .025, 0, 1.04, .19, matNight);
      const stars = [[-.46, 1.03], [-.25, 1.24], [.04, 1.18], [.22, .89], [.46, 1.22]];
      for (const [x, y] of stars) poly(body, "star", [[0, .065], [.047, 0], [0, -.065], [-.047, 0]], .022, x, y, .215, matAmber);
      for (let i = 1; i < stars.length; i++) strut(body, "constellation", [...stars[i - 1], .222], [...stars[i], .222], .014, matIvory);
      box(body, "map_ledge", 1.44, .088, .22, 0, .54, .17, matWood);
      break;
    }
    case "night_lantern": {
      tray(body, .93, .91, matNight, matWood);
      tube(body, "stand", .117, .42, 0, .31, 0, matWood);
      tube(body, "lantern_bottom", .33, .083, 0, .55, 0, matWood);
      const glowMat = stockFn(amber);
      glowMat.emissive = new T.Color("#f6a94b");
      glowMat.emissiveIntensity = .35;
      part(body, "paper_diffuser", new T.CylinderGeometry(.265, .29, .44, 6), glowMat, 0, .80, 0);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        box(body, "lantern_rib", .033, .48, .035, Math.sin(a) * .275, .80, Math.cos(a) * .275, matIvory);
      }
      part(body, "folded_top", new T.ConeGeometry(.36, .27, 6), matNight, 0, 1.14, 0);
      const handle = part(body, "handle", new T.TorusGeometry(.11, .022, 5, 10, Math.PI), matIvory, 0, 1.24, 0);
      handle.rotation.y = Math.PI / 8;
      break;
    }
    case "desk": {
      trestle(body, matPrimary, matWood, .84, 2.35, 1.14);
      box(body, "pad", .72, .065, .46, -.36, .93, .08, matIvory).rotation.y = -.22;
      box(body, "book", .44, .078, .31, .41, .94, -.14, matSage);
      tube(body, "cup", .13, .21, .81, 1.00, .24, stockFn("#af775e"), 8);
      break;
    }
    case "screen": {
      for (const x of [-.86, 0, .86]) {
        box(body, "panel", .80, 1.37, .09, x, .72, 0, matPrimary).rotation.y = x * .20;
        box(body, "face", .67, 1.13, .03, x, .75, .062, matIvory).rotation.y = x * .20;
      }
      box(body, "base", 2.62, .10, .39, 0, .052, 0, matWood);
      break;
    }
    case "reading": {
      const rug = tube(body, "rug", 1.12, .035, 0, .025, 0, matPrimary, 14);
      rug.scale.z = .54;
      box(body, "cushion1", .72, .23, .62, -.53, .14, -.1, stockFn("#dcad76")).rotation.y = .21;
      box(body, "cushion2", .81, .19, .53, .43, .12, .12, stockFn("#a87973")).rotation.y = -.12;
      box(body, "book", .35, .06, .27, .76, .055, -.25, matIvory);
      break;
    }
    case "display": {
      trestle(body, matPrimary, matWood, .57, 2.35, 1.08);
      for (let i = 0; i < 4; i++) {
        const x = -.76 + i * .51;
        box(body, "box" + i, .30, .20 + i % 2 * .12, .30, x, .73, .04, stockFn(["#9b7561", "#ab8f60", "#83917d", "#ad785b"][i]));
        box(body, "tag" + i, .21, .09, .012, x, .74, .20, matIvory);
      }
      break;
    }
    case "pond": {
      tube(body, "pool", 1.41, .045, 0, .032, 0, matPrimary, 14).scale.z = .61;
      for (let i = 0; i < 5; i++) {
        const x = -.92 + i * .45;
        tube(body, "pad" + i, .16 + i % 2 * .06, .09, x, .07, Math.cos(i * 1.5) * .42, stockFn(i % 2 ? "#92987e" : "#bad0af"), 7);
      }
      break;
    }
    case "arch": {
      const leafM = stockFn("#a4b975");
      for (const x of [-1.10, 1.10]) {
        box(body, "post", .18, 1.40, .24, x, .72, 0, matPrimary);
        seedling(body, x, .20, leafM, matWood);
      }
      poly(body, "span", [[-1.25, 0], [-.87, .45], [0, .67], [.87, .45], [1.25, 0], [.86, .12], [0, .40], [-.86, .12]], .12, 0, 1.1, 0, matPrimary);
      break;
    }
    case "nursery": {
      box(body, "frame", 2.6, .19, 1.16, 0, .10, 0, stockFn("#ad835d"));
      box(body, "soil", 2.43, .07, .98, 0, .219, 0, stockFn("#68594b"));
      const bed = node(body, "bed", 0, .23, 0);
      for (const z of [-.26, .26]) for (const x of [-.83, 0, .83]) seedling(bed, x, z, matPrimary, matWood);
      break;
    }
    case "bench": {
      trestle(body, matPrimary, matWood, .38, 2.23, .68);
      box(body, "back", 2.25, .41, .12, 0, .67, -.26, matPrimary);
      for (const x of [-.91, .91]) box(body, "post", .11, .64, .12, x, .36, -.26, matWood);
      break;
    }
    case "rails": {
      for (const z of [-.35, .35]) box(body, "rail", 2.7, .08, .07, 0, .096, z, matPrimary);
      for (let i = 0; i < 8; i++) box(body, "tie", .13, .07, .97, -1.18 + i * .34, .04, 0, matWood);
      box(body, "signal", .09, .67, .09, 1.03, .34, -.40, matWood);
      tube(body, "lamp", .16, .07, 1.03, .69, -.36, matIvory, 8).rotation.x = Math.PI / 2;
      break;
    }
    case "shelter": {
      for (const x of [-1.15, 1.15]) box(body, "pillar", .13, 1.45, .12, x, .74, 0, matWood);
      box(body, "roof", 2.55, .13, 1.24, 0, 1.48, 0, matPrimary).rotation.x = -.1;
      box(body, "seat", 2.22, .10, .59, 0, .41, 0, matIvory);
      box(body, "back", 2.22, .28, .09, 0, .67, -.22, matPrimary);
      break;
    }
    case "luggage": {
      for (const [x, h, z] of [[-.74, .36, .19], [.07, .61, -.15], [.83, .42, .14]]) {
        box(body, "case", .62, h, .49, x, h / 2, z, matPrimary);
        box(body, "strap", .11, h, .52, x, h / 2, z, matIvory);
        box(body, "handle", .22, .065, .12, x, h + .03, z, matWood);
      }
      break;
    }
    case "clock": {
      tube(body, "base", .54, .09, 0, .05, 0, matPrimary, 9);
      box(body, "pillar", .16, 1.3, .16, 0, .67, 0, matWood);
      tube(body, "face", .44, .12, 0, 1.43, 0, matIvory).rotation.x = Math.PI / 2;
      box(body, "hand1", .045, .26, .035, 0, 1.54, .074, matPrimary);
      box(body, "hand2", .22, .045, .035, .09, 1.41, .08, matPrimary);
      break;
    }
    case "bridge": {
      box(body, "water", 2.74, .025, 1.46, 0, .02, 0, stockFn("#7da9ae"));
      for (let i = 0; i < 8; i++) box(body, "plank", .29, .105, 1.10, -1.10 + i * .315, .18 + .06 * Math.sin(i * Math.PI / 7), 0, matPrimary);
      for (const z of [-.51, .51]) {
        box(body, "rail", 2.48, .08, .08, 0, .54, z, matIvory);
        for (const x of [-1.08, 0, 1.08]) box(body, "post", .10, .46, .10, x, .33, z, matPrimary);
      }
      break;
    }
    case "rocks": {
      for (let i = 0; i < 5; i++) {
        const rock = part(body, "rock", new T.DodecahedronGeometry(.37 + i % 3 * .12), i % 2 ? stockFn("#c0ab92") : matPrimary, -1 + i * .49, .20, Math.sin(i * 2) * .26);
        rock.scale.set(1, .66, .85);
        tube(body, "moss", .20, .075, rock.position.x, .43, rock.position.z, matPrimary, 7);
      }
      break;
    }
    case "boats": {
      tube(body, "pool", 1.37, .038, 0, .028, 0, matPrimary, 14).scale.z = .55;
      const sailMat = stockFn("#cc9774");
      for (const x of [-.72, .63]) {
        const hull = poly(body, "hull", [[-.49, .19], [.49, .19], [.27, 0], [-.28, 0]], .22, x, .04, 0, matIvory);
        hull.rotation.y = x * .25;
        poly(body, "sail", [[0, 0], [0, .55], [.33, 0]], .045, x, .25, .04, sailMat);
      }
      break;
    }
    case "reeds": {
      tube(body, "pool", 1.3, .035, 0, .022, 0, stockFn("#7fa8a1"), 12).scale.z = .54;
      for (let i = 0; i < 7; i++) {
        const x = -1 + i * .33, h = .68 + i % 3 * .17, z = Math.sin(i * 2) * .28;
        box(body, "stem", .055, h, .055, x, h / 2, z, matPrimary).rotation.z = .12;
        tube(body, "head", .09, .18, x - .04, h, z, matWood, 7);
      }
      break;
    }
    case "lantern": {
      trestle(body, stockFn("#997b60"), matWood, .28, 2.35, 1.04);
      const glow = stockFn("#f5d28c");
      glow.emissive = new T.Color("#f5b95b");
      glow.emissiveIntensity = .35;
      for (const [x, h] of [[-.82, .54], [0, .79], [.82, .64]]) {
        box(body, "post", .12, h, .12, x, h / 2 + .3, 0, matWood);
        box(body, "shade", .35, .31, .33, x, h + .3, 0, glow);
        box(body, "cap", .43, .09, .40, x, h + .49, 0, matPrimary);
      }
      break;
    }
    case "bells": {
      for (const x of [-1.07, 1.07]) box(body, "post", .15, 1.39, .16, x, .72, 0, matWood);
      box(body, "beam", 2.42, .14, .68, 0, 1.42, 0, matPrimary);
      const goldMat = stockFn("#d4ac69");
      for (let i = 0; i < 4; i++) {
        const h = .28 + i * .09, x = -.72 + i * .47;
        box(body, "cord", .035, .21, .035, x, 1.25, 0, matIvory);
        tube(body, "bell", .13, h, x, 1.13 - h / 2, 0, goldMat, 8);
      }
      break;
    }
    case "mill": {
      box(body, "tower", .55, 1.48, .58, 0, .74, 0, matPrimary);
      for (let i = 0; i < 4; i++) box(body, "blade", 1.23, .17, .065, 0, 1.41, .34, matIvory).rotation.z = i * Math.PI / 4 + .24;
      tube(body, "hub", .13, .08, 0, 1.41, .39, matWood, 9).rotation.x = Math.PI / 2;
      break;
    }
    case "flags": {
      for (const x of [-1.11, 1.11]) box(body, "pole", .10, 1.22, .1, x, .61, 0, matWood);
      box(body, "line", 2.23, .045, .045, 0, 1.13, 0, matIvory);
      for (let i = 0; i < 5; i++) poly(body, "pennant", [[-.17, 0], [.17, 0], [0, -.32]], .045, -.76 + i * .38, 1.13, .02, i % 2 ? matIvory : matPrimary);
      break;
    }
    case "shells": {
      tube(body, "pool", 1.31, .046, 0, .025, 0, stockFn("#dfbb8b"), 15).scale.z = .52;
      for (const [x, z] of [[-.76, .1], [.05, -.2], [.70, .19]]) {
        poly(body, "shell", [[-.27, .15], [-.22, .35], [0, .47], [.22, .36], [.27, .15], [0, 0]], .075, x, .036, z, matPrimary);
        box(body, "ridge", .033, .25, .018, x, .26, z + .082, matIvory);
      }
      break;
    }
    case "beacon": {
      tube(body, "base", .53, .11, 0, .057, 0, matWood, 9);
      for (let i = 0; i < 5; i++) tube(body, "tier", .27 - i * .015, .22, 0, .19 + i * .22, 0, i % 2 ? matIvory : matPrimary, 9);
      tube(body, "lamp", .22, .26, 0, 1.26, 0, stockFn("#f2d98b"), 9);
      part(body, "roof", new T.ConeGeometry(.38, .28, 9), matPrimary, 0, 1.52, 0);
      break;
    }
    default: {
      tray(body, 1.2, 1.0, matPrimary, matWood);
      box(body, "block", .8, .9, .6, 0, .55, 0, matPrimary);
    }
  }
  return root;
}

const previewCache = new Map();
const MODEL_EMOJIS = {
  mail_kiosk: "📮", windsock: "🎏", parcel_bench: "🪑", apricot_tree: "🌳", fruit_crate: "🧺",
  orchard_ladder: "🪜", paper_telescope: "🔭", star_chart: "🌌", night_lantern: "🏮",
  desk: "🪵", screen: "🪟", reading: "📖", display: "🏺", pond: "🪷", arch: "🌿",
  nursery: "🌱", bench: "🪑", rails: "🛤", shelter: "🚏", luggage: "🧳", clock: "🕰",
  bridge: "🌉", rocks: "🪨", boats: "⛵", reeds: "🌾", lantern: "🏮", bells: "🎐",
  mill: "🌬", flags: "🚩", shells: "🐚", beacon: "🗼"
};

export function getModelPreviewAsset(modelId, labelOverride, colorOverride) {
  const spec = PAPER_MODELS[modelId];
  const name = labelOverride || spec?.name || modelId;
  const color = colorOverride || spec?.color || coral;
  const cacheKey = `${modelId}|${name}|${color}`;
  if (previewCache.has(cacheKey)) return previewCache.get(cacheKey);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f4e6cc";
  ctx.beginPath();
  ctx.roundRect(10, 14, 108, 100, 16);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.16;
  ctx.fillRect(20, 82, 88, 22);
  ctx.globalAlpha = 1;
  ctx.font = "52px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(MODEL_EMOJIS[modelId] || "📦", 64, 56);
  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = "#4d3524";
  ctx.fillText(name.slice(0, 5), 64, 96);
  const url = canvas.toDataURL("image/png");
  const image = new Image();
  image.src = url;
  const asset = {
    image,
    url,
    name,
    category: spec?.category || "器物",
    purpose: spec?.purpose || "backdrop",
    ratio: 1,
    isModel: true,
    modelId,
    collisionSize: spec?.size || [1.4, 1.1]
  };
  previewCache.set(cacheKey, asset);
  return asset;
}

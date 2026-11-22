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
  beacon: { name: "海岸灯塔", batch: 0, purpose: "backdrop", category: "建筑", color: "#b37c69", size: regionFootprints.beacon, anchors: { fold_pivot: [0, 0, 0] } },
  study_window: { name: "暖阳木窗", batch: 2, purpose: "backdrop", category: "建筑", color: "#b0714f", size: [2.8, .55], anchors: { fold_pivot: [0, 0, 0] } },
  study_bookshelf: { name: "实木书架", batch: 2, purpose: "backdrop", category: "器物", color: "#9c674c", size: [2.24, .75], anchors: { fold_pivot: [0, 0, 0] } },
  study_lamp: { name: "暖光台灯", batch: 2, purpose: "toy", category: "器物", color: "#f0ba70", size: [1.1, 1.1], anchors: { fold_pivot: [0, 0, 0] } },
  garden_ferns: { name: "雨后花木", batch: 2, purpose: "plant", category: "植物", color: "#588064", size: [5.4, .85], anchors: { fold_pivot: [0, 0, 0] } },
  station_skyline: { name: "月夜远山", batch: 2, purpose: "backdrop", category: "建筑", color: "#535b8c", size: [5.2, .65], anchors: { fold_pivot: [0, 0, 0] } },
  station_canopy: { name: "月光候车棚", batch: 2, purpose: "backdrop", category: "建筑", color: "#647194", size: [2.1, .98], anchors: { fold_pivot: [0, 0, 0] } },
  station_track: { name: "车站铁轨", batch: 2, purpose: "toy", category: "器物", color: "#505775", size: [3.1, .72], anchors: { fold_pivot: [0, 0, 0] } },
  creek_planks: { name: "木板栈桥", batch: 2, purpose: "backdrop", category: "建筑", color: "#bc9465", size: [2.9, 2.35], anchors: { fold_pivot: [0, 0, 0] } },
  creek_sign: { name: "溪畔路牌", batch: 2, purpose: "toy", category: "器物", color: "#e7bd78", size: [.95, .45], anchors: { fold_pivot: [0, 0, 0] } },
  marsh_reeds: { name: "萤火芦苇", batch: 2, purpose: "plant", category: "植物", color: "#708a5a", size: [4.2, .7], anchors: { fold_pivot: [0, 0, 0] } },
  ridge_slopes: { name: "青翠山坡", batch: 2, purpose: "backdrop", category: "建筑", color: "#9aa56f", size: [6.4, .55], anchors: { fold_pivot: [0, 0, 0] } },
  ridge_windmill: { name: "山脊风车", batch: 2, purpose: "toy", category: "建筑", color: "#b78963", size: [.95, .85], anchors: { fold_pivot: [0, 0, 0] } },
  ridge_chimes: { name: "铜铃风架", batch: 2, purpose: "toy", category: "器物", color: "#c89069", size: [1.8, .65], anchors: { fold_pivot: [0, 0, 0] } },
  coast_rocks: { name: "潮汐礁石", batch: 2, purpose: "plant", category: "植物", color: "#9e8c91", size: [5.4, .85], anchors: { fold_pivot: [0, 0, 0] } },

  // 30 Universal Furniture Models (batch: 3)
  round_tea_table: { name: "橡木圆茶几", batch: 3, furnGroup: "桌椅", purpose: "backdrop", category: "器物", color: "#b67e52", size: [1.1, 1.1], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .82] } },
  writing_desk: { name: "雕花书桌", batch: 3, furnGroup: "桌椅", purpose: "backdrop", category: "器物", color: "#9c6443", size: [1.85, 1.0], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .85] } },
  cozy_armchair: { name: "绒布扶手椅", batch: 3, furnGroup: "桌椅", purpose: "backdrop", category: "器物", color: "#d58665", size: [1.05, 1.0], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .82] } },
  rocking_chair: { name: "藤编摇椅", batch: 3, furnGroup: "桌椅", purpose: "toy", category: "器物", color: "#a8774e", size: [.98, 1.08], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .85] } },
  tufted_sofa: { name: "双人暖绒沙发", batch: 3, furnGroup: "桌椅", purpose: "backdrop", category: "器物", color: "#7f9674", size: [2.05, 1.02], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .86] } },
  wood_stool: { name: "圆柱小木凳", batch: 3, furnGroup: "桌椅", purpose: "toy", category: "器物", color: "#c28f5d", size: [.68, .68], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .65] } },

  tall_wardrobe: { name: "双门木衣柜", batch: 3, furnGroup: "柜架", purpose: "backdrop", category: "器物", color: "#a46d4c", size: [1.45, .82], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .78] } },
  display_cabinet: { name: "玻璃陈列柜", batch: 3, furnGroup: "柜架", purpose: "backdrop", category: "器物", color: "#8c6b53", size: [1.38, .75], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .76] } },
  chest_drawer: { name: "四斗抽屉柜", batch: 3, furnGroup: "柜架", purpose: "backdrop", category: "器物", color: "#c69262", size: [1.28, .72], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .74] } },
  wall_coat_rack: { name: "实木衣帽架", batch: 3, furnGroup: "柜架", purpose: "backdrop", category: "器物", color: "#82583c", size: [.76, .76], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .72] } },
  low_sideboard: { name: "乡村餐边柜", batch: 3, furnGroup: "柜架", purpose: "backdrop", category: "器物", color: "#96a686", size: [1.82, .74], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .76] } },
  book_caddy: { name: "移动小书车", batch: 3, furnGroup: "柜架", purpose: "toy", category: "器物", color: "#cfa16b", size: [1.02, .68], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .72] } },

  floor_lamp: { name: "百褶落地灯", batch: 3, furnGroup: "灯火", isLight: true, purpose: "backdrop", category: "器物", color: "#f1c479", size: [.82, .82], anchors: { fold_pivot: [0, 0, 0], light: [0, 1.55, 0], visit: [0, 0, .72] } },
  warm_fireplace: { name: "红砖暖壁炉", batch: 3, furnGroup: "灯火", isLight: true, purpose: "backdrop", category: "建筑", color: "#b6614c", size: [1.85, .96], anchors: { fold_pivot: [0, 0, 0], light: [0, .55, .28], visit: [0, 0, .92] } },
  mushroom_lamp: { name: "蘑菇台灯", batch: 3, furnGroup: "灯火", isLight: true, purpose: "toy", category: "器物", color: "#df785b", size: [.74, .74], anchors: { fold_pivot: [0, 0, 0], light: [0, .62, 0], visit: [0, 0, .68] } },
  candle_stand: { name: "黄铜烛台", batch: 3, furnGroup: "灯火", isLight: true, purpose: "toy", category: "器物", color: "#dfb05d", size: [.66, .66], anchors: { fold_pivot: [0, 0, 0], light: [0, .78, 0], visit: [0, 0, .65] } },
  paper_chime_arch: { name: "串灯木架", batch: 3, furnGroup: "灯火", isLight: true, purpose: "backdrop", category: "建筑", color: "#a4744e", size: [2.15, .64], anchors: { fold_pivot: [0, 0, 0], light: [0, 1.45, .1], visit: [0, 0, .82] } },
  fireplace_woodpile: { name: "壁炉柴火筐", batch: 3, furnGroup: "灯火", purpose: "backdrop", category: "器物", color: "#8c5f3f", size: [.98, .74], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .72] } },

  retro_fridge: { name: "圆角复古冰箱", batch: 3, furnGroup: "茶食", purpose: "food", category: "器物", color: "#f1e3ce", size: [1.02, .92], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .84] } },
  kitchen_stove: { name: "乡村小灶台", batch: 3, furnGroup: "茶食", purpose: "food", category: "器物", color: "#d8a878", size: [1.62, .92], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .84] } },
  tea_trolley: { name: "下午茶推车", batch: 3, furnGroup: "茶食", purpose: "food", category: "食物", color: "#e4bc80", size: [1.25, .82], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .78] } },
  bread_oven: { name: "烘焙面包桌", batch: 3, furnGroup: "茶食", purpose: "food", category: "食物", color: "#c98b57", size: [1.56, .88], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .82] } },
  gramophone: { name: "黄铜留声机", batch: 3, furnGroup: "茶食", purpose: "toy", category: "器物", color: "#d5a24c", size: [.92, .88], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .78] } },
  picnic_basket: { name: "格纹野餐篮", batch: 3, furnGroup: "茶食", purpose: "food", category: "食物", color: "#cf925b", size: [.92, .78], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .74] } },

  woven_rug: { name: "流苏编织圆毯", batch: 3, furnGroup: "绿植休闲", purpose: "toy", category: "其他", color: "#d6a674", size: [1.85, 1.85], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, 1.05] } },
  fiddle_pot: { name: "琴叶榕盆栽", batch: 3, furnGroup: "绿植休闲", purpose: "plant", category: "植物", color: "#688e5e", size: [.92, .92], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .78] } },
  flower_stand: { name: "三层花架", batch: 3, furnGroup: "绿植休闲", purpose: "plant", category: "植物", color: "#889c6b", size: [1.35, .74], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .76] } },
  wooden_easel: { name: "实木写生画架", batch: 3, furnGroup: "绿植休闲", purpose: "toy", category: "器物", color: "#b6855c", size: [1.05, 1.02], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .84] } },
  story_tent: { name: "暖绒小帐篷", batch: 3, furnGroup: "绿植休闲", purpose: "toy", category: "建筑", color: "#e5c185", size: [1.68, 1.62], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, 1.06] } },
  wooden_swing: { name: "花园秋千架", batch: 3, furnGroup: "绿植休闲", purpose: "toy", category: "建筑", color: "#9e704c", size: [1.95, 1.08], anchors: { fold_pivot: [0, 0, 0], wind_pivot: [0, 1.62, 0], visit: [0, 0, .96] } },

  // +70 Universal Furniture Models (total 100 batch:3 items, 20 per group)
  // 桌椅 (+14 => 20)
  dining_table: { name: "橡木长餐桌", batch: 3, furnGroup: "桌椅", purpose: "backdrop", category: "器物", color: "#b98456", size: [2.05, 1.12], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .92] } },
  folding_table: { name: "折叠野餐桌", batch: 3, furnGroup: "桌椅", purpose: "backdrop", category: "器物", color: "#d49b66", size: [1.45, .96], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .82] } },
  bar_stool: { name: "高脚实木吧凳", batch: 3, furnGroup: "桌椅", purpose: "toy", category: "器物", color: "#a87049", size: [.68, .68], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .65] } },
  pouf_ottoman: { name: "针织圆矮墩", batch: 3, furnGroup: "桌椅", purpose: "toy", category: "器物", color: "#dfb17c", size: [.84, .84], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .72] } },
  window_bench: { name: "飘窗软垫长凳", batch: 3, furnGroup: "桌椅", purpose: "backdrop", category: "器物", color: "#8ba17b", size: [1.92, .92], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .82] } },
  kid_study_desk: { name: "双斗带架书桌", batch: 3, furnGroup: "桌椅", purpose: "backdrop", category: "器物", color: "#ad744d", size: [1.75, .98], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .84] } },
  drafting_table: { name: "斜面板绘图桌", batch: 3, furnGroup: "桌椅", purpose: "backdrop", category: "器物", color: "#c89768", size: [1.58, .98], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .84] } },
  crescent_bench: { name: "弧形树下木凳", batch: 3, furnGroup: "桌椅", purpose: "backdrop", category: "器物", color: "#9c6d49", size: [1.92, .96], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .82] } },
  bean_bag: { name: "云朵懒人沙发", batch: 3, furnGroup: "桌椅", purpose: "toy", category: "器物", color: "#e6b89c", size: [1.12, 1.12], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .84] } },
  console_table: { name: "玄关窄边桌", batch: 3, furnGroup: "桌椅", purpose: "backdrop", category: "器物", color: "#946246", size: [1.72, .68], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .74] } },
  bamboo_chair: { name: "曲背竹藤椅", batch: 3, furnGroup: "桌椅", purpose: "toy", category: "器物", color: "#cfa36c", size: [.92, .92], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .78] } },
  vanity_table: { name: "圆镜梳妆台", batch: 3, furnGroup: "桌椅", purpose: "backdrop", category: "器物", color: "#e5c39c", size: [1.38, .88], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .82] } },
  low_chabudai: { name: "和风矮茶几", batch: 3, furnGroup: "桌椅", purpose: "backdrop", category: "器物", color: "#8c5b3e", size: [1.46, 1.46], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .96] } },
  corner_booth: { name: "转角软垫卡座", batch: 3, furnGroup: "桌椅", purpose: "backdrop", category: "器物", color: "#c97a63", size: [1.75, 1.75], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, 1.02] } },

  // 柜架 (+14 => 20)
  corner_shelf: { name: "扇形转角书架", batch: 3, furnGroup: "柜架", purpose: "backdrop", category: "器物", color: "#ab7850", size: [.98, .98], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .78] } },
  apothecary_chest: { name: "百子草药格柜", batch: 3, furnGroup: "柜架", purpose: "backdrop", category: "器物", color: "#855a41", size: [1.38, .76], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .76] } },
  vinyl_cabinet: { name: "黑胶唱片矮柜", batch: 3, furnGroup: "柜架", purpose: "toy", category: "器物", color: "#9f6c47", size: [1.46, .74], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .76] } },
  ladder_shelf: { name: "斜靠梯形置物架", batch: 3, furnGroup: "柜架", purpose: "backdrop", category: "器物", color: "#cfa172", size: [1.05, .78], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .76] } },
  linen_cupboard: { name: "百叶布艺储物柜", batch: 3, furnGroup: "柜架", purpose: "backdrop", category: "器物", color: "#8ea085", size: [1.32, .76], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .78] } },
  toy_chest: { name: "拱盖玩具木箱", batch: 3, furnGroup: "柜架", purpose: "toy", category: "器物", color: "#c9855a", size: [1.18, .78], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .76] } },
  step_tansu: { name: "阶梯木储物柜", batch: 3, furnGroup: "柜架", purpose: "backdrop", category: "器物", color: "#7d543c", size: [1.68, .74], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .78] } },
  baker_rack: { name: "铁木烘焙置物架", batch: 3, furnGroup: "柜架", purpose: "food", category: "器物", color: "#68554b", size: [1.26, .74], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .76] } },
  mail_pigeonhole: { name: "信件分拣格架", batch: 3, furnGroup: "柜架", purpose: "backdrop", category: "器物", color: "#b68057", size: [1.38, .68], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .74] } },
  umbrella_stand: { name: "木桶雨伞架", batch: 3, furnGroup: "柜架", purpose: "toy", category: "器物", color: "#9c6d48", size: [.66, .66], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .64] } },
  jewelry_armoire: { name: "立式首饰镜柜", batch: 3, furnGroup: "柜架", purpose: "backdrop", category: "器物", color: "#dbbfa0", size: [.78, .72], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .72] } },
  crate_shelf: { name: "叠拼木箱花架", batch: 3, furnGroup: "柜架", purpose: "plant", category: "植物", color: "#c5945d", size: [1.48, .72], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .76] } },
  grandfather_clock: { name: "胡桃木大摆钟", batch: 3, furnGroup: "柜架", purpose: "backdrop", category: "器物", color: "#6e4733", size: [.82, .74], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .76] } },
  tool_pegboard: { name: "手作木工工具台", batch: 3, furnGroup: "柜架", purpose: "backdrop", category: "器物", color: "#a4744e", size: [1.54, .82], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .82] } },

  // 灯火 (+14 => 20)
  star_lantern: { name: "折纸星星吊灯", batch: 3, furnGroup: "灯火", isLight: true, purpose: "toy", category: "器物", color: "#f2c873", size: [.76, .76], anchors: { fold_pivot: [0, 0, 0], light: [0, 1.32, .18], visit: [0, 0, .72] } },
  stained_lamp: { name: "彩绘琉璃台灯", batch: 3, furnGroup: "灯火", isLight: true, purpose: "toy", category: "器物", color: "#e58962", size: [.72, .72], anchors: { fold_pivot: [0, 0, 0], light: [0, .72, 0], visit: [0, 0, .68] } },
  campfire_ring: { name: "石圈营火堆", batch: 3, furnGroup: "灯火", isLight: true, purpose: "backdrop", category: "其他", color: "#e8844c", size: [1.18, 1.18], anchors: { fold_pivot: [0, 0, 0], light: [0, .55, 0], visit: [0, 0, .88] } },
  moon_nightlight: { name: "弯月云朵夜灯", batch: 3, furnGroup: "灯火", isLight: true, purpose: "toy", category: "器物", color: "#f6d887", size: [.74, .74], anchors: { fold_pivot: [0, 0, 0], light: [0, .58, 0], visit: [0, 0, .68] } },
  street_post_lamp: { name: "复古铸铁街灯", batch: 3, furnGroup: "灯火", isLight: true, purpose: "backdrop", category: "建筑", color: "#4e5662", size: [.78, .78], anchors: { fold_pivot: [0, 0, 0], light: [.28, 1.62, 0], visit: [0, 0, .76] } },
  bamboo_lantern: { name: "竹编立式地灯", batch: 3, furnGroup: "灯火", isLight: true, purpose: "backdrop", category: "器物", color: "#d5a366", size: [.76, .76], anchors: { fold_pivot: [0, 0, 0], light: [0, .72, 0], visit: [0, 0, .72] } },
  desk_banker_lamp: { name: "祖母绿银行台灯", batch: 3, furnGroup: "灯火", isLight: true, purpose: "toy", category: "器物", color: "#588b6b", size: [.74, .70], anchors: { fold_pivot: [0, 0, 0], light: [0, .68, .12], visit: [0, 0, .68] } },
  paper_cloud_lamp: { name: "蓬松云朵落地灯", batch: 3, furnGroup: "灯火", isLight: true, purpose: "toy", category: "器物", color: "#f7ead4", size: [.84, .84], anchors: { fold_pivot: [0, 0, 0], light: [0, 1.38, 0], visit: [0, 0, .74] } },
  brazier_bowl: { name: "庭院铜火盆", batch: 3, furnGroup: "灯火", isLight: true, purpose: "backdrop", category: "器物", color: "#c88652", size: [.94, .94], anchors: { fold_pivot: [0, 0, 0], light: [0, .62, 0], visit: [0, 0, .78] } },
  firefly_jar_rack: { name: "萤火虫玻璃罐架", batch: 3, furnGroup: "灯火", isLight: true, purpose: "toy", category: "器物", color: "#e5c56c", size: [1.18, .68], anchors: { fold_pivot: [0, 0, 0], light: [0, .86, 0], visit: [0, 0, .74] } },
  oil_hurricane_lamp: { name: "古铜防风马灯", batch: 3, furnGroup: "灯火", isLight: true, purpose: "toy", category: "器物", color: "#b67e4c", size: [.66, .66], anchors: { fold_pivot: [0, 0, 0], light: [0, .54, 0], visit: [0, 0, .64] } },
  tea_warmer_stove: { name: "烛火温茶小炉", batch: 3, furnGroup: "灯火", isLight: true, purpose: "food", category: "器物", color: "#d69274", size: [.72, .72], anchors: { fold_pivot: [0, 0, 0], light: [0, .42, 0], visit: [0, 0, .68] } },
  wax_letter_desk: { name: "火漆蜡烛印章台", batch: 3, furnGroup: "灯火", isLight: true, purpose: "toy", category: "器物", color: "#c26956", size: [.88, .72], anchors: { fold_pivot: [0, 0, 0], light: [-.16, .48, 0], visit: [0, 0, .72] } },
  sky_lantern_stand: { name: "天灯祈愿木架", batch: 3, furnGroup: "灯火", isLight: true, purpose: "backdrop", category: "建筑", color: "#d96b52", size: [.84, .84], anchors: { fold_pivot: [0, 0, 0], light: [0, 1.42, .12], visit: [0, 0, .76] } },

  // 茶食 (+14 => 20)
  espresso_bar: { name: "复古意式咖啡台", batch: 3, furnGroup: "茶食", purpose: "food", category: "食物", color: "#b87954", size: [1.62, .86], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .82] } },
  dessert_vitrine: { name: "玻璃甜品展示柜", batch: 3, furnGroup: "茶食", purpose: "food", category: "食物", color: "#e6b89e", size: [1.46, .84], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .82] } },
  wine_barrel_bar: { name: "橡木酒桶吧台", batch: 3, furnGroup: "茶食", purpose: "food", category: "器物", color: "#8e5f40", size: [1.74, .86], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .84] } },
  fruit_jam_stall: { name: "手工果酱小木摊", batch: 3, furnGroup: "茶食", purpose: "food", category: "食物", color: "#cf765d", size: [1.48, .92], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .84] } },
  sushi_counter: { name: "木纹点心长台", batch: 3, furnGroup: "茶食", purpose: "food", category: "食物", color: "#d9b37c", size: [1.68, .82], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .82] } },
  milk_churn_cart: { name: "鲜奶酪木推车", batch: 3, furnGroup: "茶食", purpose: "food", category: "食物", color: "#8ba6a9", size: [1.32, .84], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .78] } },
  popcorn_cart: { name: "条纹爆米花小车", batch: 3, furnGroup: "茶食", purpose: "food", category: "食物", color: "#d46453", size: [1.24, .84], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .78] } },
  ice_cream_stand: { name: "奶油冰淇淋手车", batch: 3, furnGroup: "茶食", purpose: "food", category: "食物", color: "#8fc2b4", size: [1.38, .86], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .80] } },
  fondue_table: { name: "暖锅围炉茶桌", batch: 3, furnGroup: "茶食", purpose: "food", category: "食物", color: "#c98356", size: [1.18, 1.18], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .86] } },
  teacup_tower: { name: "三层下午茶瓷架", batch: 3, furnGroup: "茶食", purpose: "food", category: "食物", color: "#ebd8c4", size: [.76, .76], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .70] } },
  rice_cooker_nook: { name: "和风竹笼灶台", batch: 3, furnGroup: "茶食", purpose: "food", category: "食物", color: "#bfa06c", size: [1.36, .84], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .80] } },
  honey_extractor: { name: "金黄蜂蜜采蜜架", batch: 3, furnGroup: "茶食", purpose: "food", category: "食物", color: "#e5b04f", size: [1.28, .78], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .78] } },
  soup_kettle_hearth: { name: "铸铁三角吊锅", batch: 3, furnGroup: "茶食", purpose: "food", category: "食物", color: "#63544d", size: [1.12, 1.12], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .84] } },
  cookie_press_bench: { name: "曲奇饼干烘焙车", batch: 3, furnGroup: "茶食", purpose: "food", category: "食物", color: "#d6a470", size: [1.44, .84], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .80] } },

  // 绿植休闲 (+14 => 20)
  upright_piano: { name: "胡桃木立式钢琴", batch: 3, furnGroup: "绿植休闲", purpose: "toy", category: "器物", color: "#754b38", size: [1.68, .92], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .86] } },
  birdbath_fountain: { name: "石雕鸟浴喷泉", batch: 3, furnGroup: "绿植休闲", purpose: "plant", category: "植物", color: "#c2bbb0", size: [.98, .98], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .80] } },
  hammock_frame: { name: "拱形木架吊床", batch: 3, furnGroup: "绿植休闲", purpose: "toy", category: "器物", color: "#cf8764", size: [2.15, .96], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .92] } },
  koi_basin: { name: "青瓷睡莲鱼缸", batch: 3, furnGroup: "绿植休闲", purpose: "plant", category: "植物", color: "#6d9d9a", size: [1.06, 1.06], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .82] } },
  bonsai_pedestal: { name: "迎客松盆景花几", batch: 3, furnGroup: "绿植休闲", purpose: "plant", category: "植物", color: "#5e8554", size: [.92, .86], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .78] } },
  weaving_loom: { name: "桌面木织布机", batch: 3, furnGroup: "绿植休闲", purpose: "toy", category: "器物", color: "#c58a5f", size: [1.14, .82], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .78] } },
  pottery_wheel: { name: "手作陶艺拉坯台", batch: 3, furnGroup: "绿植休闲", purpose: "toy", category: "器物", color: "#be7d5b", size: [1.24, .92], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .80] } },
  chess_table: { name: "国际象棋木桌", batch: 3, furnGroup: "绿植休闲", purpose: "toy", category: "器物", color: "#8b5c42", size: [1.22, 1.12], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .84] } },
  cat_tree: { name: "绒面多层猫爬架", batch: 3, furnGroup: "绿植休闲", purpose: "toy", category: "器物", color: "#dfc6a4", size: [1.05, .96], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .82] } },
  dog_kennel: { name: "尖顶宠物木小屋", batch: 3, furnGroup: "绿植休闲", purpose: "backdrop", category: "建筑", color: "#b67452", size: [1.18, 1.05], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .84] } },
  garden_wheelbarrow: { name: "独轮繁花木手车", batch: 3, furnGroup: "绿植休闲", purpose: "plant", category: "植物", color: "#8c9f72", size: [1.44, .82], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .82] } },
  sun_lounger: { name: "条纹沙滩躺椅", batch: 3, furnGroup: "绿植休闲", purpose: "toy", category: "器物", color: "#e29572", size: [1.72, 1.05], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .90] } },
  rocking_horse: { name: "彩绘木马摇椅", batch: 3, furnGroup: "绿植休闲", purpose: "toy", category: "器物", color: "#cf7d65", size: [1.12, .74], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .78] } },
  cello_stand: { name: "大提琴演奏木架", batch: 3, furnGroup: "绿植休闲", purpose: "toy", category: "器物", color: "#a45e3c", size: [.92, .86], anchors: { fold_pivot: [0, 0, 0], visit: [0, 0, .78] } }
};

export const FURNITURE_GROUPS = ["全部", "桌椅", "柜架", "灯火", "茶食", "绿植休闲", "布景"];

export const SCENE_LANDMARKS_VERSION = 2;

const LANDMARK_PLACEMENTS = {
  study: [
    { asset: "study_window", x: -2.25, z: -2.5, yaw: 0, scale: 1 },
    { asset: "study_bookshelf", x: 1.85, z: -2.36, yaw: 0, scale: 1 },
    { asset: "study_lamp", x: -2.75, z: -.55, yaw: 0, scale: 1 }
  ],
  garden: [
    { asset: "garden_ferns", x: -.35, z: -2.45, yaw: 0, scale: 1 }
  ],
  station: [
    { asset: "station_skyline", x: -.1, z: -2.8, yaw: 0, scale: 1 },
    { asset: "station_canopy", x: 1.52, z: -1.95, yaw: 0, scale: 1 },
    { asset: "station_track", x: -1.65, z: -.72, yaw: 0, scale: 1 }
  ],
  creek: [
    { asset: "creek_planks", x: 0, z: -2.0, yaw: 0, scale: 1 },
    { asset: "creek_sign", x: 1.5, z: -.95, yaw: 0, scale: 1 }
  ],
  marsh: [
    { asset: "marsh_reeds", x: -4.0, z: -1.8, yaw: 0, scale: 1 }
  ],
  ridge: [
    { asset: "ridge_slopes", x: -.8, z: -3.65, yaw: 0, scale: 1 },
    { asset: "ridge_windmill", idSuffix: "left", x: -2.4, z: -3.0, yaw: 0, scale: 1 },
    { asset: "ridge_windmill", idSuffix: "right", x: 2.3, z: -3.0, yaw: 0, scale: 1 },
    { asset: "ridge_chimes", x: .2, z: -2.9, yaw: 0, scale: 1 }
  ],
  coast: [
    { asset: "coast_rocks", x: -.4, z: -2.1, yaw: 0, scale: 1 }
  ]
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

function makeModelRecord(id, modelId, spec, pos, scale, rotation, color) {
  return {
    id,
    modelId,
    name: spec.name,
    category: spec.category,
    purpose: spec.purpose,
    color: color || spec.color,
    surface: "paper",
    x: pos.x,
    y: pos.y,
    scale,
    rotation,
    selfRotation: 0
  };
}

export function landmarkModelsFor(worldId, floorRecordFn) {
  return (LANDMARK_PLACEMENTS[worldId] || []).map(piece => {
    const spec = PAPER_MODELS[piece.asset];
    const id = `landmark-${worldId}-${piece.asset}${piece.idSuffix ? "-" + piece.idSuffix : ""}`;
    return makeModelRecord(
      id,
      piece.asset,
      spec,
      floorRecordFn({ x: piece.x, y: piece.z }),
      piece.scale,
      Math.round((piece.yaw || 0) * 180 / Math.PI)
    );
  });
}

export function ensureChapterLandmarks(worldId, existing, floorRecordFn) {
  const list = Array.isArray(existing) ? existing : [];
  const present = new Set(list.map(item => item.id));
  for (const landmark of landmarkModelsFor(worldId, floorRecordFn)) {
    if (!present.has(landmark.id)) list.push(landmark);
  }
  return list;
}

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
  result.push(...landmarkModelsFor(worldId, floorRecordFn));
  for (const piece of BATCH1_PLACEMENTS[worldId] || []) {
    const spec = PAPER_MODELS[piece.asset];
    result.push(makeModelRecord(
      `model-${worldId}-${piece.asset}`,
      piece.asset,
      spec,
      floorRecordFn({ x: piece.x, y: piece.z }),
      piece.scale,
      Math.round((piece.yaw || 0) * 180 / Math.PI)
    ));
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
    case "study_window": {
      box(body, "frame", 2.6, 2.65, .13, 0, 1.33, 0, matPrimary);
      box(body, "inner", 2.36, 2.41, .05, 0, 1.33, .09, stockFn("#e7b56e"));
      const glareMat = stockFn("#fff0b9");
      glareMat.emissive = new T.Color("#ffe39b");
      glareMat.emissiveIntensity = .22;
      for (const x of [-.59, .59]) for (const y of [.75, 1.91]) {
        box(body, "pane", 1.02, 1.01, .035, x, y, .13, stockFn(y > 1 ? "#fce0a0" : "#efc184"));
        poly(body, "glare", [[-.48, -.42], [.46, .35], [.46, .49], [-.48, -.18]], .004, x, y, .151, glareMat);
      }
      box(body, "sill", 2.8, .13, .32, 0, .17, .14, matWood);
      box(body, "lintel", 2.8, .15, .29, 0, 2.59, .13, matWood);
      break;
    }
    case "study_bookshelf": {
      box(body, "back", 2.2, 2.55, .12, 0, 1.27, 0, matWood);
      for (const x of [-1.06, 1.06]) box(body, "side", .13, 2.6, .59, x, 1.3, .2, matPrimary);
      const colors = ["#d89c57", "#a75847", "#6e8b79", "#ead5a7", "#715657", "#c78758"];
      for (let row = 0; row < 3; row++) {
        const y = .16 + row * .79;
        box(body, "shelf", 2.18, .12, .66, 0, y, .26, stockFn("#b77951"));
        for (let i = 0; i < 6; i++) {
          const h = .33 + (i * 3 + row * 2) % 5 * .07;
          box(body, "book", .24, h, .3, -.82 + i * .3, y + h / 2 + .07, .31, stockFn(colors[(i + row * 2) % colors.length]));
          box(body, "spine_band", .18, .03, .012, -.82 + i * .3, y + .19, .465, matIvory);
        }
      }
      box(body, "top", 2.24, .15, .68, 0, 2.54, .23, stockFn("#b77951"));
      break;
    }
    case "study_lamp": {
      tube(body, "base", .35, .1, 0, .05, 0, matWood, 12);
      tube(body, "stem", .06, 1.37, 0, .72, 0, stockFn("#98653d"), 8);
      const shadeMat = matPrimary.clone();
      shadeMat.emissive = new T.Color("#ffbe68");
      shadeMat.emissiveIntensity = .28;
      part(body, "shade", new T.CylinderGeometry(.27, .64, .54, 10), shadeMat, 0, 1.48, 0);
      tube(body, "bulb", .6, .04, 0, 1.22, 0, stockFn("#f8d6a4"), 10);
      break;
    }
    case "garden_ferns": {
      const foliage = ["#588064", "#89a46b", "#b7bd78", "#71967e"];
      for (let i = 0; i < 6; i++) {
        const px = -2.25 + i * .9, pz = Math.sin(i * 2) * .22;
        const h = 1.05 + i % 3 * .35;
        box(body, "stem", .066, h, .06, px, h / 2, pz + .02, stockFn("#54745a"));
        for (const dir of [-1, 1]) {
          const leaf = poly(body, "leaf", [[0, 0], [.3 * dir, .4], [.8 * dir, .58], [.56 * dir, .18]], .034, px, h * (dir > 0 ? .51 : .28), pz + .04, stockFn(foliage[(i + 1) % 4]));
          leaf.rotation.y = dir * .35;
        }
        poly(body, "crown", [[0, h * .58], [-.3, h * .88], [0, h * 1.15], [.26, h * .9]], .055, px, 0, pz + .02, stockFn(foliage[i % 4]));
      }
      break;
    }
    case "station_skyline": {
      const sky = node(body, "sky", 0, 0, 0);
      sky.scale.setScalar(.82);
      poly(sky, "ridge_back", [[-3.4, 0], [-3.4, 1.16], [-2.4, 1.85], [-1.3, 1.18], [.2, 2.08], [1.36, 1.3], [2.5, 1.88], [3.4, 1.1], [3.4, 0]], .1, 0, 0, 0, matPrimary);
      poly(sky, "ridge_front", [[-3.35, 0], [-3.35, .7], [-2.5, 1.15], [-1.85, .81], [-.75, 1.4], [.71, .79], [2.0, 1.3], [3.35, .72], [3.35, 0]], .07, 0, 0, .18, stockFn("#7f8db5"));
      const moonMat = stockFn("#f8dfa7");
      moonMat.emissive = new T.Color("#f8dfa7");
      moonMat.emissiveIntensity = .35;
      tube(sky, "moon", .48, .06, -2.35, 2.2, .22, moonMat, 16).rotation.x = Math.PI / 2;
      for (const [sx, sy] of [[-1.55, 2.22], [-.68, 2.6], [.6, 2.42], [2.15, 2.44], [2.9, 2.15]]) {
        poly(sky, "star", [[-.09, 0], [0, .14], [.09, 0], [0, -.13]], .014, sx, sy, .22, moonMat);
      }
      break;
    }
    case "station_canopy": {
      const sh = node(body, "canopy", 0, 0, 0);
      sh.scale.setScalar(.7);
      box(sh, "back", 2.7, 1.55, .12, 0, .84, 0, matPrimary);
      for (const x of [-1.23, 1.23]) for (const z of [0, .86]) box(sh, "post", .11, 1.92, .13, x, .96, z, matIvory);
      box(sh, "roof", 2.87, .13, 1.25, 0, 1.93, .4, stockFn("#af7970")).rotation.x = -.12;
      box(sh, "seat", 2.3, .13, .42, 0, .52, .23, stockFn("#c6a47f"));
      box(sh, "sign_board", 1.28, .30, .07, 0, 1.73, 1.04, stockFn("#edd3a3"));
      const sc = document.createElement("canvas");
      sc.width = 256;
      sc.height = 64;
      const sctx = sc.getContext("2d");
      sctx.textAlign = "center";
      sctx.textBaseline = "middle";
      sctx.fillStyle = "#503623";
      sctx.font = "bold 40px Xiaolai, serif";
      sctx.fillText("月光车站", 128, 32);
      const signTex = new T.CanvasTexture(sc);
      signTex.colorSpace = T.SRGBColorSpace;
      part(sh, "sign_text", new T.PlaneGeometry(1.22, .27),
        new T.MeshBasicMaterial({ map: signTex, transparent: true, depthWrite: false, side: T.DoubleSide }), 0, 1.73, 1.08);
      break;
    }
    case "station_track": {
      const tr = node(body, "track", 0, 0, 0);
      tr.scale.setScalar(.76);
      for (const z of [-.28, .28]) box(tr, "rail", 3.9, .028, .06, 0, .059, z, matPrimary);
      for (let x = -1.75; x < 1.9; x += .34) box(tr, "sleeper", .13, .024, .82, x, .051, 0, stockFn("#837786"));
      break;
    }
    case "creek_planks": {
      for (let i = 0; i < 8; i++) box(body, "plank", .35, .09, 2.35, -1.2 + i * .35, .14, 0, matPrimary);
      break;
    }
    case "creek_sign": {
      poly(body, "board", [[-.46, .1], [.48, .1], [.26, .42], [-.31, .48]], .08, 0, 0, 0, matPrimary);
      break;
    }
    case "marsh_reeds": {
      const glow = stockFn("#ffdd79");
      glow.emissive = new T.Color("#ffd15c");
      glow.emissiveIntensity = .5;
      for (let i = 0; i < 7; i++) {
        const rx = -1.65 + i * .55;
        box(body, "reed", .065, 1.12, .06, rx, .59, 0, matPrimary).rotation.z = .15;
        tube(body, "cattail", .11, .2, rx - .07, 1.14, 0, stockFn("#d0a779"), 7);
        tube(body, "firefly", .09, .09, rx + .22, 1.27 + .14 * (i % 3), .2, glow, 8);
      }
      break;
    }
    case "ridge_slopes": {
      poly(body, "ridge", [[-3.3, 0], [-2.1, 1.3], [-.8, .65], [1.2, 1.55], [3.3, 0]], .12, 0, 0, 0, matPrimary);
      break;
    }
    case "ridge_windmill": {
      box(body, "tower", .18, 2.15, .20, 0, 1.07, 0, matPrimary);
      const pivot = node(body, "wind_pivot", 0, 1.92, .16);
      for (let i = 0; i < 4; i++) {
        box(pivot, "vane", .78, .21, .06, 0, 0, 0, stockFn("#e9ba87")).rotation.z = i * Math.PI / 4;
      }
      root.userData.windPivot = pivot;
      break;
    }
    case "ridge_chimes": {
      for (const x of [-.75, .75]) box(body, "post", .12, 1.2, .12, x, .6, 0, matWood);
      box(body, "lintel", 1.8, .14, .48, 0, 1.24, 0, matPrimary);
      const brassMat = stockFn("#e1b45d");
      for (let i = 0; i < 4; i++) tube(body, "pipe", .08, .25 + i * .11, -.52 + i * .34, .85 - i * .06, .12, brassMat, 8);
      break;
    }
    case "coast_rocks": {
      for (let i = 0; i < 5; i++) {
        const rx = -2.4 + i * 1.2;
        poly(body, "boulder", [[-.52, 0], [-.4, .37], [.1, .55], [.53, .21], [.45, 0]], .25, rx, 0, 0, matPrimary);
        tube(body, "pebble", .32, .032, rx, .04, .32, stockFn("#d7c2a1"), 9);
      }
      break;
    }

    // 30 Universal Furniture Models
    case "round_tea_table": {
      tube(body, "top", .52, .08, 0, .54, 0, matPrimary, 18);
      tube(body, "rim", .48, .03, 0, .49, 0, matWood, 18);
      tube(body, "pedestal", .11, .46, 0, .25, 0, matWood, 10);
      tube(body, "foot", .32, .06, 0, .03, 0, matWood, 14);
      tube(body, "teapot", .14, .18, -.12, .67, .05, matIvory, 10);
      tube(body, "cup", .06, .08, .18, .62, .12, stockFn("#df896d"), 8);
      break;
    }
    case "writing_desk": {
      box(body, "top", 1.78, .09, .92, 0, .74, 0, matPrimary);
      box(body, "apron", 1.56, .16, .80, 0, .61, 0, matWood);
      for (const sx of [-.48, .48]) {
        box(body, "drawer", .66, .12, .04, sx, .61, .42, matIvory);
        tube(body, "knob", .03, .04, sx, .61, .45, stockFn("#d9b066"), 8).rotation.x = Math.PI / 2;
      }
      for (const sx of [-.76, .76]) for (const sz of [-.38, .38]) {
        box(body, "leg", .09, .70, .09, sx, .35, sz, matWood);
      }
      box(body, "book", .34, .05, .24, -.32, .81, .06, stockFn("#b95d4c")).rotation.y = .22;
      box(body, "pad", .44, .02, .32, .22, .795, .08, matIvory);
      break;
    }
    case "cozy_armchair": {
      box(body, "cushion", .78, .20, .74, 0, .28, .04, matPrimary);
      box(body, "back", .84, .58, .18, 0, .58, -.34, matPrimary);
      for (const sx of [-.42, .42]) box(body, "arm", .16, .34, .82, sx, .41, -.02, stockFn("#bf7455"));
      for (const sx of [-.38, .38]) for (const sz of [-.34, .34]) box(body, "leg", .08, .18, .08, sx, .09, sz, matWood);
      box(body, "pillow", .36, .26, .12, .1, .48, -.16, matIvory).rotation.set(-.25, -.15, .1);
      break;
    }
    case "rocking_chair": {
      for (const sx of [-.36, .36]) {
        poly(body, "runner", [[-.52, .08], [-.25, .01], [0, 0], [.25, .01], [.52, .08], [.50, .14], [0, .06], [-.50, .14]], .055, sx, 0, -.02, matWood).rotation.y = Math.PI / 2;
        box(body, "post", .06, .34, .06, sx, .25, .24, matWood);
        box(body, "backpost", .06, .82, .06, sx, .49, -.26, matWood).rotation.x = -.16;
      }
      box(body, "seat", .74, .08, .64, 0, .41, .02, matPrimary);
      box(body, "backrest", .68, .44, .07, 0, .74, -.30, matIvory).rotation.x = -.16;
      break;
    }
    case "tufted_sofa": {
      box(body, "base", 1.92, .18, .86, 0, .19, 0, matWood);
      box(body, "seat_l", .84, .18, .76, -.44, .36, .04, matPrimary);
      box(body, "seat_r", .84, .18, .76, .44, .36, .04, matPrimary);
      box(body, "back", 1.92, .56, .20, 0, .62, -.34, matPrimary);
      for (const sx of [-.91, .91]) box(body, "arm", .18, .44, .88, sx, .42, 0, matPrimary);
      for (const sx of [-.84, .84]) for (const sz of [-.34, .34]) tube(body, "foot", .045, .12, sx, .06, sz, matWood, 8);
      box(body, "cushion", .34, .28, .12, -.58, .54, -.16, matIvory).rotation.set(-.2, .24, -.12);
      box(body, "cushion2", .32, .26, .12, .54, .54, -.16, stockFn("#e29873")).rotation.set(-.2, -.22, .12);
      break;
    }
    case "wood_stool": {
      tube(body, "top", .28, .08, 0, .40, 0, matPrimary, 14);
      for (let i = 0; i < 3; i++) {
        const a = i * (Math.PI * 2 / 3);
        strut(body, "leg", [Math.cos(a) * .14, .38, Math.sin(a) * .14], [Math.cos(a) * .24, 0, Math.sin(a) * .24], .055, matWood);
      }
      tube(body, "ring", .19, .035, 0, .16, 0, matWood, 12);
      break;
    }

    case "tall_wardrobe": {
      box(body, "cabinet", 1.32, 1.88, .72, 0, .98, 0, matPrimary);
      box(body, "crown", 1.44, .10, .80, 0, 1.94, .02, matWood);
      for (const sx of [-.32, .32]) {
        box(body, "door", .58, 1.56, .05, sx, 1.0, .37, matIvory);
        tube(body, "handle", .03, .14, sx > 0 ? .12 : -.12, 1.0, .41, stockFn("#d9b066"), 8);
      }
      for (const sx of [-.56, .56]) for (const sz of [-.28, .28]) box(body, "foot", .09, .10, .09, sx, .05, sz, matWood);
      break;
    }
    case "display_cabinet": {
      box(body, "frame", 1.28, 1.72, .66, 0, .90, 0, matWood);
      box(body, "back", 1.18, 1.54, .05, 0, .92, -.28, matIvory);
      for (const py of [.42, .92, 1.40]) {
        box(body, "shelf", 1.16, .045, .56, 0, py, .02, matPrimary);
      }
      tube(body, "vase", .11, .28, -.28, .58, .04, stockFn("#80a29a"), 10);
      box(body, "books", .24, .26, .18, .25, 1.07, .02, stockFn("#c76e57"));
      tube(body, "bowl", .14, .10, -.12, 1.48, .04, stockFn("#e7bd73"), 10);
      break;
    }
    case "chest_drawer": {
      box(body, "body", 1.20, .98, .64, 0, .54, 0, matPrimary);
      box(body, "top", 1.28, .07, .70, 0, 1.04, 0, matWood);
      for (let r = 0; r < 4; r++) {
        const y = .22 + r * .21;
        box(body, "drawer", 1.04, .16, .045, 0, y, .33, matIvory);
        tube(body, "knob", .028, .04, 0, y, .365, stockFn("#d9b066"), 8).rotation.x = Math.PI / 2;
      }
      for (const sx of [-.52, .52]) box(body, "foot", .08, .08, .54, sx, .04, 0, matWood);
      break;
    }
    case "wall_coat_rack": {
      tube(body, "base", .32, .06, 0, .03, 0, matWood, 12);
      tube(body, "pole", .055, 1.72, 0, .89, 0, matPrimary, 10);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + .4;
        strut(body, "hook", [0, 1.56, 0], [Math.cos(a) * .26, 1.72, Math.sin(a) * .26], .04, matWood);
        tube(body, "tip", .04, .04, Math.cos(a) * .26, 1.72, Math.sin(a) * .26, matIvory, 8);
      }
      tube(body, "hat", .20, .10, .20, 1.75, .14, stockFn("#d8a46e"), 12);
      break;
    }
    case "low_sideboard": {
      box(body, "body", 1.72, .68, .64, 0, .44, 0, matPrimary);
      box(body, "counter", 1.82, .07, .70, 0, .80, 0, matWood);
      for (const sx of [-.54, 0, .54]) {
        box(body, "panel", .46, .52, .04, sx, .44, .33, matIvory);
      }
      for (const sx of [-.76, .76]) for (const sz of [-.24, .24]) box(body, "leg", .07, .12, .07, sx, .06, sz, matWood);
      tube(body, "pitcher", .11, .24, -.48, .96, .04, stockFn("#f3dfb9"), 10);
      box(body, "tray", .44, .03, .28, .38, .85, .04, matWood);
      break;
    }
    case "book_caddy": {
      for (const sx of [-.44, .44]) {
        box(body, "side", .06, .74, .56, sx, .44, 0, matWood);
        for (const sz of [-.22, .22]) tube(body, "wheel", .08, .04, sx, .08, sz, stockFn("#5b4132"), 10).rotation.z = Math.PI / 2;
      }
      for (const py of [.24, .56]) box(body, "tier", .86, .05, .52, 0, py, 0, matPrimary);
      for (let i = 0; i < 4; i++) box(body, "vol", .09, .24, .30, -.26 + i * .16, .70, 0, stockFn(["#c86d57", "#799878", "#dfb065", "#657d9d"][i]));
      break;
    }

    case "floor_lamp": {
      tube(body, "base", .28, .055, 0, .028, 0, matWood, 14);
      tube(body, "stem", .045, 1.50, 0, .78, 0, stockFn("#c89f5c"), 10);
      const glow = stockFn("#ffe6a8");
      glow.emissive = new T.Color("#ffbf5e");
      glow.emissiveIntensity = .78;
      part(body, "shade", new T.CylinderGeometry(.19, .34, .42, 16), glow, 0, 1.56, 0);
      root.userData.lightLocal = new T.Vector3(0, 1.55, 0);
      break;
    }
    case "warm_fireplace": {
      box(body, "chimney", 1.52, 1.48, .76, 0, .74, -.04, matPrimary);
      box(body, "mantel", 1.82, .12, .92, 0, 1.12, .04, matWood);
      box(body, "hearth_pad", 1.76, .08, .96, 0, .04, .06, stockFn("#84695c"));
      box(body, "cavity", .88, .66, .34, 0, .38, .22, stockFn("#3b231b"));
      const fire = stockFn("#ffae47");
      fire.emissive = new T.Color("#ff7b24");
      fire.emissiveIntensity = .95;
      poly(body, "flame", [[-.26, 0], [-.18, .32], [0, .48], [.16, .28], [.26, 0]], .16, 0, .12, .26, fire);
      tube(body, "clock", .14, .06, 0, 1.32, .12, stockFn("#e5c278"), 12).rotation.x = Math.PI / 2;
      root.userData.lightLocal = new T.Vector3(0, .55, .36);
      break;
    }
    case "mushroom_lamp": {
      const stemGlow = stockFn("#f8ebd2");
      stemGlow.emissive = new T.Color("#ffdca2");
      stemGlow.emissiveIntensity = .35;
      part(body, "stem", new T.CylinderGeometry(.10, .18, .44, 14), stemGlow, 0, .22, 0);
      const capGlow = stockFn(spec.color);
      capGlow.emissive = new T.Color("#ff9552");
      capGlow.emissiveIntensity = .45;
      part(body, "cap", new T.SphereGeometry(.32, 16, 10, 0, Math.PI * 2, 0, Math.PI * .58), capGlow, 0, .42, 0);
      root.userData.lightLocal = new T.Vector3(0, .55, 0);
      break;
    }
    case "candle_stand": {
      const brass = stockFn("#dfae57");
      tube(body, "foot", .20, .05, 0, .025, 0, brass, 12);
      tube(body, "stem", .04, .48, 0, .26, 0, brass, 8);
      box(body, "arms", .46, .04, .04, 0, .48, 0, brass);
      const flameMat = stockFn("#ffe696");
      flameMat.emissive = new T.Color("#ffaa38");
      flameMat.emissiveIntensity = .92;
      for (const sx of [-.20, 0, .20]) {
        tube(body, "wax", .045, .20, sx, .60, 0, matIvory, 8);
        part(body, "flame", new T.ConeGeometry(.035, .10, 7), flameMat, sx, .76, 0);
      }
      root.userData.lightLocal = new T.Vector3(0, .78, 0);
      break;
    }
    case "paper_chime_arch": {
      for (const sx of [-.95, .95]) box(body, "post", .11, 1.56, .11, sx, .78, 0, matWood);
      box(body, "beam", 2.12, .11, .16, 0, 1.54, 0, matPrimary);
      const bulbMat = stockFn("#ffdf8e");
      bulbMat.emissive = new T.Color("#ffba4a");
      bulbMat.emissiveIntensity = .88;
      for (let i = 0; i < 5; i++) {
        const bx = -.76 + i * .38;
        const drop = Math.sin((i / 4) * Math.PI) * .16;
        part(body, "bulb", new T.SphereGeometry(.075, 10, 8), bulbMat, bx, 1.40 - drop, .06);
      }
      root.userData.lightLocal = new T.Vector3(0, 1.38, .12);
      break;
    }
    case "fireplace_woodpile": {
      box(body, "cradle", .86, .08, .58, 0, .05, 0, matWood);
      for (const sx of [-.42, .42]) box(body, "rail", .06, .52, .56, sx, .28, 0, matWood);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3 - r; c++) {
        const log = tube(body, "log", .10, .62, -.22 + c * .22 + r * .11, .20 + r * .17, 0, stockFn(c % 2 ? "#7a4e32" : "#976441"), 9);
        log.rotation.x = Math.PI / 2;
      }
      break;
    }

    case "retro_fridge": {
      box(body, "cabinet", .90, 1.62, .78, 0, .85, 0, matPrimary);
      box(body, "top_cap", .86, .08, .74, 0, 1.68, 0, matPrimary);
      box(body, "upper_door", .82, .54, .06, 0, 1.34, .40, stockFn("#fbf0dc"));
      box(body, "lower_door", .82, .92, .06, 0, .58, .40, stockFn("#fbf0dc"));
      for (const hy of [1.26, .82]) box(body, "handle", .05, .20, .05, .28, hy, .45, stockFn("#d8b06a"));
      for (const sx of [-.34, .34]) for (const sz of [-.28, .28]) tube(body, "foot", .05, .08, sx, .04, sz, stockFn("#a47b5b"), 8);
      break;
    }
    case "kitchen_stove": {
      box(body, "counter", 1.54, .82, .78, 0, .41, 0, matPrimary);
      box(body, "worktop", 1.60, .07, .84, 0, .84, 0, matIvory);
      box(body, "oven_door", .74, .54, .05, -.28, .42, .40, stockFn("#6b5244"));
      for (const sx of [-.44, -.12]) tube(body, "burner", .12, .03, sx, .89, -.05, stockFn("#4c3a32"), 12);
      tube(body, "kettle", .15, .18, -.44, .99, -.05, stockFn("#d17b5e"), 10);
      box(body, "cutting_board", .42, .04, .30, .42, .90, .06, matWood);
      break;
    }
    case "tea_trolley": {
      for (const sx of [-.52, .52]) for (const sz of [-.32, .32]) {
        box(body, "post", .05, .74, .05, sx, .44, sz, matWood);
        tube(body, "wheel", .08, .035, sx, .08, sz, stockFn("#5b4132"), 10).rotation.z = Math.PI / 2;
      }
      box(body, "shelf_b", 1.08, .05, .66, 0, .24, 0, matPrimary);
      box(body, "shelf_t", 1.12, .05, .68, 0, .74, 0, matPrimary);
      tube(body, "cake_stand", .18, .12, -.16, .84, 0, matIvory, 12);
      tube(body, "cake", .14, .10, -.16, .93, 0, stockFn("#df896e"), 12);
      tube(body, "teapot", .12, .16, .26, .85, .04, stockFn("#80a496"), 10);
      break;
    }
    case "bread_oven": {
      box(body, "table", 1.48, .76, .78, 0, .38, 0, matWood);
      box(body, "top", 1.56, .08, .86, 0, .79, 0, matIvory);
      box(body, "hood", 1.12, .56, .46, 0, 1.10, -.16, matPrimary);
      for (let i = 0; i < 3; i++) {
        tube(body, "loaf", .14, .12, -.34 + i * .34, .89, .14, stockFn("#d8944c"), 10);
      }
      break;
    }
    case "gramophone": {
      box(body, "box", .68, .36, .64, 0, .18, 0, matWood);
      tube(body, "record", .24, .02, 0, .37, .04, stockFn("#322926"), 16);
      tube(body, "neck", .04, .34, -.04, .54, -.20, matPrimary, 8);
      const horn = part(body, "horn", new T.ConeGeometry(.30, .48, 16, 1, true), matPrimary, -.02, .74, -.02);
      horn.rotation.x = Math.PI * .36;
      break;
    }
    case "picnic_basket": {
      box(body, "basket", .82, .42, .60, 0, .21, 0, matPrimary);
      box(body, "lid", .84, .06, .62, 0, .44, 0, matIvory);
      box(body, "cloth", .76, .03, .54, 0, .48, 0, stockFn("#c96b59"));
      const arch = new T.Mesh(new T.TorusGeometry(.30, .035, 8, 16, Math.PI), matWood);
      arch.position.set(0, .46, 0);
      arch.castShadow = true;
      body.add(arch);
      break;
    }

    case "woven_rug": {
      tube(body, "outer", .92, .025, 0, .014, 0, matPrimary, 24);
      tube(body, "mid", .66, .03, 0, .018, 0, matIvory, 22);
      tube(body, "inner", .36, .034, 0, .021, 0, stockFn("#c7785c"), 18);
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        box(body, "tassel", .08, .018, .04, Math.cos(a) * .95, .01, Math.sin(a) * .95, matIvory).rotation.y = -a;
      }
      break;
    }
    case "fiddle_pot": {
      part(body, "pot", new T.CylinderGeometry(.25, .18, .38, 12), stockFn("#c77c58"), 0, .19, 0);
      tube(body, "soil", .22, .04, 0, .37, 0, matWood, 12);
      tube(body, "trunk", .04, .92, 0, .78, 0, matWood, 8);
      for (let i = 0; i < 6; i++) {
        const a = i * (Math.PI * 2 / 6);
        const leaf = poly(body, "leaf", [[0, 0], [-.20, .18], [-.24, .44], [0, .58], [.24, .44], [.20, .18]], .03,
          Math.cos(a) * .08, .84 + (i % 3) * .22, Math.sin(a) * .08, matPrimary);
        leaf.rotation.set(-.58, -a, 0);
      }
      break;
    }
    case "flower_stand": {
      for (const sx of [-.58, .58]) box(body, "side", .07, 1.05, .58, sx, .52, 0, matWood);
      for (let l = 0; l < 3; l++) {
        box(body, "tier", 1.24, .05, .26, 0, .26 + l * .34, .18 - l * .16, matIvory);
        seedling(body, -.32 + l * .28, .18 - l * .16, matPrimary, stockFn("#ca7e58"));
        seedling(body, .32 - l * .22, .18 - l * .16, stockFn("#6f9362"), stockFn("#e2b774"));
      }
      break;
    }
    case "wooden_easel": {
      strut(body, "leg_l", [-.38, 0, .28], [0, 1.56, -.10], .06, matWood);
      strut(body, "leg_r", [.38, 0, .28], [0, 1.56, -.10], .06, matWood);
      strut(body, "leg_b", [0, 0, -.52], [0, 1.48, -.08], .06, matWood);
      box(body, "ledge", .84, .06, .12, 0, .58, .22, matWood).rotation.x = -.20;
      box(body, "canvas", .76, .88, .04, 0, 1.04, .10, matIvory).rotation.x = -.20;
      box(body, "paint_sky", .64, .34, .02, 0, 1.22, .08, stockFn("#8db2c6")).rotation.x = -.20;
      box(body, "paint_hill", .64, .36, .02, 0, .88, .14, matPrimary).rotation.x = -.20;
      break;
    }
    case "story_tent": {
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        strut(body, "pole", [Math.cos(a) * .72, 0, Math.sin(a) * .72], [0, 1.62, 0], .06, matWood);
      }
      part(body, "canopy", new T.ConeGeometry(.88, 1.48, 4, 1, false, Math.PI / 4), matPrimary, 0, .82, 0);
      box(body, "mat", 1.12, .05, 1.12, 0, .025, .05, stockFn("#c9735a"));
      box(body, "pillow", .36, .12, .26, -.22, .10, .18, matIvory).rotation.y = .3;
      break;
    }
    case "wooden_swing": {
      for (const sx of [-.86, .86]) {
        strut(body, "frame_f", [sx, 0, .44], [sx * .85, 1.65, 0], .08, matWood);
        strut(body, "frame_b", [sx, 0, -.44], [sx * .85, 1.65, 0], .08, matWood);
      }
      box(body, "beam", 1.88, .10, .10, 0, 1.65, 0, matWood);
      const seatGroup = node(body, "swing_seat", 0, 1.62, 0);
      for (const sx of [-.42, .42]) strut(seatGroup, "rope", [sx, 0, 0], [sx, -1.14, 0], .03, matIvory);
      box(seatGroup, "seat", .98, .06, .34, 0, -1.16, 0, matPrimary);
      root.userData.windPivot = seatGroup;
      break;
    }

    // +70 Universal Furniture Models
    // 桌椅 (14)
    case "dining_table": {
      box(body, "top", 1.94, .09, 1.02, 0, .72, 0, matPrimary);
      box(body, "runner", 1.66, .02, .34, 0, .775, 0, matIvory);
      box(body, "stretcher", 1.44, .06, .08, 0, .24, 0, matWood);
      for (const sx of [-.76, .76]) for (const sz of [-.38, .38]) box(body, "leg", .09, .68, .09, sx, .34, sz, matWood);
      tube(body, "bowl", .18, .12, 0, .84, 0, stockFn("#cf7d60"), 12);
      break;
    }
    case "folding_table": {
      for (let i = -2; i <= 2; i++) box(body, "slat", 1.32, .05, .15, 0, .68, i * .17, matPrimary);
      for (const sx of [-.52, .52]) {
        strut(body, "x1", [sx, 0, -.36], [sx, .65, .36], .06, matWood);
        strut(body, "x2", [sx, 0, .36], [sx, .65, -.36], .06, matWood);
      }
      box(body, "picnic_box", .34, .18, .26, .22, .79, 0, matIvory);
      break;
    }
    case "bar_stool": {
      tube(body, "seat", .26, .09, 0, .78, 0, matIvory, 14);
      tube(body, "ring", .21, .04, 0, .28, 0, matWood, 12);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        strut(body, "leg", [Math.cos(a) * .25, 0, Math.sin(a) * .25], [Math.cos(a) * .15, .74, Math.sin(a) * .15], .055, matWood);
      }
      break;
    }
    case "pouf_ottoman": {
      part(body, "drum", new T.CylinderGeometry(.36, .34, .32, 16), matPrimary, 0, .22, 0);
      part(body, "cap", new T.SphereGeometry(.36, 16, 8, 0, Math.PI * 2, 0, Math.PI * .42), matPrimary, 0, .32, 0);
      tube(body, "button", .05, .04, 0, .52, 0, matIvory, 10);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + .4;
        tube(body, "foot", .045, .08, Math.cos(a) * .24, .04, Math.sin(a) * .24, matWood, 8);
      }
      break;
    }
    case "window_bench": {
      box(body, "base", 1.78, .30, .74, 0, .22, 0, matWood);
      box(body, "cushion", 1.72, .12, .72, 0, .43, 0, matPrimary);
      for (const sx of [-.68, .68]) {
        box(body, "arm", .12, .42, .76, sx * 1.15, .42, 0, matWood);
        tube(body, "bolster", .11, .46, sx, .58, -.06, matIvory, 10).rotation.x = Math.PI / 2;
      }
      for (const sx of [-.78, .78]) for (const sz of [-.3, .3]) box(body, "leg", .07, .12, .07, sx, .06, sz, matWood);
      break;
    }
    case "kid_study_desk": {
      box(body, "top", 1.62, .08, .82, 0, .72, 0, matPrimary);
      box(body, "hutch", 1.54, .46, .28, 0, .99, -.26, matWood);
      for (const sx of [-.42, .42]) box(body, "drawer", .66, .14, .74, sx, .61, 0, matIvory);
      for (const sx of [-.72, .72]) for (const sz of [-.34, .34]) box(body, "leg", .08, .70, .08, sx, .35, sz, matWood);
      tube(body, "cup", .06, .14, -.46, .83, .12, stockFn("#c76d57"), 8);
      box(body, "book", .28, .05, .20, .34, 1.24, -.24, stockFn("#6b8c6b"));
      break;
    }
    case "drafting_table": {
      for (const sx of [-.62, .62]) {
        strut(body, "a_f", [sx, 0, .38], [sx, .86, 0], .07, matWood);
        strut(body, "a_b", [sx, 0, -.38], [sx, .86, 0], .07, matWood);
      }
      box(body, "bar", 1.28, .06, .06, 0, .28, 0, matWood);
      const board = box(body, "board", 1.46, .06, .88, 0, .92, 0, matPrimary);
      board.rotation.x = .26;
      const sheet = box(body, "sheet", 1.12, .02, .68, 0, .96, .02, matIvory);
      sheet.rotation.x = .26;
      break;
    }
    case "crescent_bench": {
      for (let i = -1; i <= 1; i++) {
        const seg = box(body, "plank", .62, .08, .44, i * .56, .42, Math.abs(i) * .16 - .08, matPrimary);
        seg.rotation.y = -i * .34;
        box(body, "leg", .10, .40, .34, i * .56, .20, Math.abs(i) * .16 - .08, matWood).rotation.y = -i * .34;
      }
      break;
    }
    case "bean_bag": {
      part(body, "sack", new T.SphereGeometry(.48, 16, 12), matPrimary, 0, .34, 0).scale.set(1.06, .74, 1.06);
      part(body, "back", new T.SphereGeometry(.34, 14, 10), matPrimary, 0, .58, -.18);
      box(body, "welt", .28, .08, .22, 0, .44, .18, matIvory);
      break;
    }
    case "console_table": {
      box(body, "top", 1.62, .08, .54, 0, .78, 0, matPrimary);
      box(body, "shelf", 1.46, .05, .44, 0, .24, 0, matWood);
      for (const sx of [-.70, .70]) for (const sz of [-.20, .20]) box(body, "leg", .07, .76, .07, sx, .38, sz, matWood);
      part(body, "vase", new T.CylinderGeometry(.09, .13, .28, 12), matIvory, -.32, .96, 0);
      seedling(body, .38, 0, stockFn("#759b6c"), stockFn("#cb7a58"));
      break;
    }
    case "bamboo_chair": {
      tube(body, "seat", .34, .07, 0, .42, .04, matIvory, 14);
      for (const sx of [-.26, .26]) {
        box(body, "leg_f", .06, .42, .06, sx, .21, .24, matWood);
        box(body, "leg_b", .06, .42, .06, sx, .21, -.22, matWood);
      }
      const hoop = new T.Mesh(new T.TorusGeometry(.32, .04, 8, 18, Math.PI), matPrimary);
      hoop.position.set(0, .54, -.22);
      hoop.castShadow = true;
      body.add(hoop);
      for (const sx of [-.14, 0, .14]) box(body, "spindle", .03, .36, .03, sx, .62, -.22, matWood);
      break;
    }
    case "vanity_table": {
      box(body, "top", 1.24, .08, .66, 0, .72, -.06, matPrimary);
      for (const sx of [-.52, .52]) for (const sz of [-.30, .20]) box(body, "leg", .07, .70, .07, sx, .35, sz, matWood);
      tube(body, "mirror_rim", .32, .06, 0, 1.12, -.28, stockFn("#d9b066"), 18).rotation.x = Math.PI / 2;
      tube(body, "mirror", .27, .07, 0, 1.12, -.28, stockFn("#dceaf0"), 18).rotation.x = Math.PI / 2;
      tube(body, "stool", .22, .38, 0, .19, .30, matIvory, 12);
      break;
    }
    case "low_chabudai": {
      box(body, "top", 1.18, .08, .92, 0, .30, 0, matPrimary);
      for (const sx of [-.48, .48]) for (const sz of [-.34, .34]) box(body, "leg", .07, .28, .07, sx, .14, sz, matWood);
      for (const [cx, cz] of [[0, .64], [0, -.64], [.74, 0], [-.74, 0]]) box(body, "pad", .34, .07, .34, cx, .035, cz, matIvory);
      tube(body, "teapot", .11, .14, -.12, .41, 0, stockFn("#6b8c6b"), 10);
      break;
    }
    case "corner_booth": {
      box(body, "seat_a", 1.48, .28, .58, 0, .20, -.45, matPrimary);
      box(body, "back_a", 1.48, .48, .14, 0, .54, -.68, matPrimary);
      box(body, "seat_b", .58, .28, 1.12, -.45, .20, .34, matPrimary);
      box(body, "back_b", .14, .48, 1.12, -.68, .54, .34, matPrimary);
      box(body, "pillow", .32, .26, .12, -.26, .48, -.46, matIvory).rotation.y = .38;
      break;
    }

    // 柜架 (14)
    case "corner_shelf": {
      for (const [px, pz] of [[-.38, -.38], [.36, -.38], [-.38, .36]]) box(body, "post", .07, 1.54, .07, px, .77, pz, matWood);
      for (let i = 0; i < 4; i++) {
        part(body, "tier", new T.CylinderGeometry(.56 - i * .04, .56 - i * .04, .05, 8, 1, false, 0, Math.PI / 2), matPrimary, -.36, .24 + i * .38, -.36);
      }
      box(body, "book", .14, .22, .18, -.16, .74, -.18, stockFn("#c76b59"));
      break;
    }
    case "apothecary_chest": {
      box(body, "body", 1.24, 1.24, .58, 0, .66, 0, matWood);
      box(body, "crown", 1.32, .08, .64, 0, 1.32, 0, matPrimary);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        box(body, "cubby", .24, .22, .04, -.41 + c * .275, .26 + r * .26, .30, matIvory);
        tube(body, "pull", .025, .03, -.41 + c * .275, .26 + r * .26, .33, stockFn("#d9b066"), 6).rotation.x = Math.PI / 2;
      }
      break;
    }
    case "vinyl_cabinet": {
      box(body, "case", 1.34, .68, .56, 0, .48, 0, matPrimary);
      for (const sx of [-.56, .56]) for (const sz of [-.20, .20]) box(body, "leg", .06, .16, .06, sx, .08, sz, matWood);
      for (let i = 0; i < 7; i++) box(body, "sleeve", .04, .34, .40, -.48 + i * .11, .38, .12, stockFn(i % 2 ? "#c76c56" : "#6f8d9c"));
      box(body, "plinth", .46, .08, .38, .28, .86, 0, matIvory);
      tube(body, "disc", .15, .02, .26, .91, 0, stockFn("#2f2927"), 14);
      break;
    }
    case "ladder_shelf": {
      for (const sx of [-.42, .42]) {
        strut(body, "rail", [sx, 0, .32], [sx, 1.56, -.22], .06, matWood);
        strut(body, "back", [sx, 0, -.26], [sx, 1.56, -.22], .05, matWood);
      }
      for (let l = 0; l < 4; l++) {
        box(body, "tray", .88, .05, .44 - l * .07, 0, .26 + l * .36, .12 - l * .10, matPrimary);
      }
      box(body, "basket", .36, .20, .28, -.16, .38, .10, matIvory);
      break;
    }
    case "linen_cupboard": {
      box(body, "frame", 1.18, 1.44, .62, 0, .76, 0, matPrimary);
      box(body, "top", 1.26, .08, .68, 0, 1.50, 0, matWood);
      for (const sx of [-.26, .26]) box(body, "shutter", .48, .66, .05, sx, .52, .32, matIvory);
      for (let i = 0; i < 3; i++) box(body, "quilt", .78, .11, .44, 0, 1.02 + i * .12, .06, stockFn(i % 2 ? "#e2b278" : "#d3836b"));
      break;
    }
    case "toy_chest": {
      box(body, "box", 1.08, .54, .62, 0, .27, 0, matPrimary);
      const lid = box(body, "lid", 1.12, .12, .64, 0, .74, -.22, matWood);
      lid.rotation.x = -.62;
      box(body, "toy_block", .18, .18, .18, -.22, .56, .08, stockFn("#e2b068")).rotation.y = .4;
      part(body, "plush", new T.SphereGeometry(.16, 10, 8), matIvory, .22, .56, .06);
      break;
    }
    case "step_tansu": {
      for (let s = 0; s < 3; s++) {
        const h = .46 + s * .42;
        box(body, "col", .50, h, .56, -.50 + s * .50, h / 2, 0, s % 2 ? matPrimary : matWood);
        box(body, "front", .40, .24, .04, -.50 + s * .50, .24 + s * .34, .29, matIvory);
      }
      break;
    }
    case "baker_rack": {
      for (const sx of [-.54, .54]) for (const sz of [-.28, .28]) box(body, "post", .05, 1.56, .05, sx, .78, sz, matPrimary);
      for (const sy of [.24, .76, 1.32]) box(body, "shelf", 1.10, .06, .58, 0, sy, 0, matWood);
      for (const sx of [-.28, .24]) tube(body, "jar", .11, .22, sx, .90, 0, matIvory, 10);
      tube(body, "pan", .16, .06, 0, 1.38, 0, stockFn("#cb7d55"), 12);
      break;
    }
    case "mail_pigeonhole": {
      box(body, "cabinet", 1.24, 1.04, .48, 0, .78, 0, matPrimary);
      for (const sx of [-.52, .52]) box(body, "stand", .08, .28, .44, sx, .14, 0, matWood);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        box(body, "slot", .24, .24, .06, -.42 + c * .28, .44 + r * .28, .22, matWood);
        if ((r + c) % 2 === 0) box(body, "letter", .16, .12, .03, -.42 + c * .28, .42 + r * .28, .26, matIvory);
      }
      break;
    }
    case "umbrella_stand": {
      tube(body, "barrel", .20, .54, 0, .27, 0, matPrimary, 14);
      tube(body, "hoop", .215, .04, 0, .44, 0, stockFn("#d9b066"), 14);
      strut(body, "umb1", [-.05, .20, -.04], [.14, .88, .08], .045, stockFn("#d47360"));
      strut(body, "umb2", [.06, .20, .04], [-.10, .82, -.06], .045, stockFn("#6b929c"));
      break;
    }
    case "jewelry_armoire": {
      box(body, "pedestal", .46, .08, .46, 0, .04, 0, matWood);
      for (const sx of [-.24, .24]) box(body, "upright", .06, 1.38, .08, sx, .74, 0, matWood);
      box(body, "case", .44, .98, .16, 0, .92, 0, matPrimary).rotation.x = -.10;
      box(body, "glass", .34, .84, .03, 0, .92, .08, stockFn("#dceaf0")).rotation.x = -.10;
      break;
    }
    case "crate_shelf": {
      const spots = [[-.36, .24], [.28, .24], [-.18, .66], [.38, .66]];
      for (const [cx, cy] of spots) {
        box(body, "crate", .54, .38, .46, cx, cy, 0, matPrimary);
        box(body, "rim", .46, .30, .48, cx, cy, 0, matWood);
      }
      seedling(body, -.24, .08, stockFn("#68925c"), matIvory);
      break;
    }
    case "grandfather_clock": {
      box(body, "base", .62, .38, .48, 0, .19, 0, matWood);
      box(body, "trunk", .50, .96, .40, 0, .84, 0, matWood);
      box(body, "hood", .60, .48, .46, 0, 1.54, 0, matPrimary);
      tube(body, "dial", .18, .04, 0, 1.54, .23, matIvory, 16).rotation.x = Math.PI / 2;
      tube(body, "bob", .08, .04, 0, .74, .22, stockFn("#d9b066"), 12).rotation.x = Math.PI / 2;
      break;
    }
    case "tool_pegboard": {
      box(body, "bench", 1.42, .68, .66, 0, .34, .04, matWood);
      box(body, "board", 1.36, .78, .06, 0, 1.07, -.26, matPrimary);
      box(body, "saw", .48, .12, .03, -.32, 1.18, -.20, matIvory).rotation.z = -.25;
      box(body, "mallet", .20, .12, .08, .28, 1.16, -.20, stockFn("#c77858"));
      box(body, "plank", .68, .06, .32, 0, .72, .08, matIvory);
      break;
    }

    // 灯火 (14)
    case "star_lantern": {
      tube(body, "base", .22, .05, 0, .025, 0, matWood, 12);
      tube(body, "stem", .04, 1.48, 0, .76, -.10, matWood, 8);
      box(body, "arm", .05, .05, .36, 0, 1.48, .06, matWood);
      const starGlow = stockFn(spec.color);
      starGlow.emissive = new T.Color("#ffbe54");
      starGlow.emissiveIntensity = .88;
      poly(body, "star", [[0, .24], [.07, .07], [.24, .07], [.10, -.04], [.16, -.22], [0, -.10], [-.16, -.22], [-.10, -.04], [-.24, .07], [-.07, .07]], .08, 0, 1.24, .18, starGlow);
      root.userData.lightLocal = new T.Vector3(0, 1.28, .20);
      break;
    }
    case "stained_lamp": {
      tube(body, "foot", .18, .06, 0, .03, 0, matWood, 12);
      tube(body, "col", .05, .52, 0, .29, 0, stockFn("#d9b066"), 8);
      const mosaic = stockFn(spec.color);
      mosaic.emissive = new T.Color("#ff984f");
      mosaic.emissiveIntensity = .78;
      part(body, "shade", new T.ConeGeometry(.28, .26, 8), mosaic, 0, .64, 0);
      root.userData.lightLocal = new T.Vector3(0, .68, 0);
      break;
    }
    case "campfire_ring": {
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        part(body, "stone", new T.SphereGeometry(.13, 8, 6), stockFn("#948b83"), Math.cos(a) * .42, .08, Math.sin(a) * .42);
      }
      for (let i = 0; i < 3; i++) {
        const log = tube(body, "log", .06, .52, 0, .12, 0, matWood, 8);
        log.rotation.set(Math.PI / 2.4, i * 2.1, .35);
      }
      const fireMat = stockFn("#ffaa48");
      fireMat.emissive = new T.Color("#ff7828");
      fireMat.emissiveIntensity = .95;
      part(body, "flame_o", new T.ConeGeometry(.20, .48, 8), fireMat, 0, .34, 0);
      part(body, "flame_i", new T.ConeGeometry(.12, .32, 7), stockFn("#ffe694"), 0, .32, 0);
      root.userData.lightLocal = new T.Vector3(0, .54, 0);
      break;
    }
    case "moon_nightlight": {
      part(body, "cloud_l", new T.SphereGeometry(.18, 10, 8), matIvory, -.12, .14, 0);
      part(body, "cloud_r", new T.SphereGeometry(.15, 10, 8), matIvory, .12, .12, 0);
      const crescent = stockFn(spec.color);
      crescent.emissive = new T.Color("#ffd064");
      crescent.emissiveIntensity = .86;
      const moon = new T.Mesh(new T.TorusGeometry(.20, .065, 10, 18, Math.PI * 1.35), crescent);
      moon.position.set(0, .42, 0);
      moon.rotation.z = .65;
      moon.castShadow = true;
      body.add(moon);
      root.userData.lightLocal = new T.Vector3(0, .48, .08);
      break;
    }
    case "street_post_lamp": {
      tube(body, "base", .22, .12, 0, .06, 0, matPrimary, 12);
      tube(body, "pole", .055, 1.68, -.08, .90, 0, matPrimary, 10);
      box(body, "arm", .42, .05, .05, .10, 1.66, 0, matPrimary);
      const glow = stockFn("#ffe49e");
      glow.emissive = new T.Color("#ffba4a");
      glow.emissiveIntensity = .92;
      box(body, "lantern", .20, .24, .20, .28, 1.50, 0, glow);
      part(body, "cap", new T.ConeGeometry(.18, .12, 4), matPrimary, .28, 1.66, 0).rotation.y = Math.PI / 4;
      root.userData.lightLocal = new T.Vector3(.28, 1.48, 0);
      break;
    }
    case "bamboo_lantern": {
      tube(body, "top", .24, .05, 0, .74, 0, matWood, 12);
      tube(body, "bot", .24, .05, 0, .05, 0, matWood, 12);
      const core = stockFn("#ffdf94");
      core.emissive = new T.Color("#ffb244");
      core.emissiveIntensity = .88;
      tube(body, "core", .11, .42, 0, .38, 0, core, 10);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        box(body, "rib", .03, .68, .03, Math.cos(a) * .21, .39, Math.sin(a) * .21, matPrimary);
      }
      root.userData.lightLocal = new T.Vector3(0, .54, 0);
      break;
    }
    case "desk_banker_lamp": {
      tube(body, "base", .18, .05, 0, .025, 0, stockFn("#d9b066"), 14);
      tube(body, "stem", .04, .46, 0, .26, -.04, stockFn("#d9b066"), 8);
      const shadeMat = stockFn(spec.color);
      shadeMat.emissive = new T.Color("#5cb87c");
      shadeMat.emissiveIntensity = .35;
      part(body, "hood", new T.CylinderGeometry(.12, .12, .38, 10, 1, false, 0, Math.PI), shadeMat, 0, .52, .06).rotation.z = Math.PI / 2;
      const bulb = stockFn("#ffeca8");
      bulb.emissive = new T.Color("#ffcb66");
      bulb.emissiveIntensity = .95;
      part(body, "bulb", new T.SphereGeometry(.07, 8, 8), bulb, 0, .48, .06);
      root.userData.lightLocal = new T.Vector3(0, .52, .14);
      break;
    }
    case "paper_cloud_lamp": {
      for (let i = 0; i < 3; i++) {
        const a = i * (Math.PI * 2 / 3);
        strut(body, "leg", [Math.cos(a) * .30, 0, Math.sin(a) * .30], [0, 1.18, 0], .045, matWood);
      }
      const cloudMat = stockFn(spec.color);
      cloudMat.emissive = new T.Color("#ffe0a6");
      cloudMat.emissiveIntensity = .72;
      for (const [cx, cy, cz, r] of [[0, 1.34, 0, .24], [-.18, 1.26, .04, .18], [.18, 1.28, -.03, .17], [.04, 1.44, .06, .16]]) {
        part(body, "puff", new T.SphereGeometry(r, 12, 9), cloudMat, cx, cy, cz);
      }
      root.userData.lightLocal = new T.Vector3(0, 1.36, 0);
      break;
    }
    case "brazier_bowl": {
      for (let i = 0; i < 3; i++) {
        const a = i * (Math.PI * 2 / 3);
        strut(body, "leg", [Math.cos(a) * .34, 0, Math.sin(a) * .34], [Math.cos(a) * .18, .48, Math.sin(a) * .18], .055, matWood);
      }
      part(body, "bowl", new T.CylinderGeometry(.36, .18, .20, 14), matPrimary, 0, .46, 0);
      const embers = stockFn("#ff9a3e");
      embers.emissive = new T.Color("#ff5b1c");
      embers.emissiveIntensity = .95;
      part(body, "ember", new T.SphereGeometry(.18, 10, 6), embers, 0, .52, 0).scale.y = .45;
      root.userData.lightLocal = new T.Vector3(0, .62, 0);
      break;
    }
    case "firefly_jar_rack": {
      box(body, "base", 1.06, .06, .42, 0, .03, 0, matWood);
      for (const sx of [-.44, .44]) box(body, "post", .06, .92, .06, sx, .48, 0, matWood);
      box(body, "bar", 1.02, .06, .06, 0, .92, 0, matWood);
      const glow = stockFn("#fff09c");
      glow.emissive = new T.Color("#ffcf4a");
      glow.emissiveIntensity = .95;
      for (const jx of [-.28, 0, .28]) {
        strut(body, "cord", [jx, .88, 0], [jx, .64, 0], .02, matIvory);
        tube(body, "jar", .09, .22, jx, .52, 0, glow, 10);
      }
      root.userData.lightLocal = new T.Vector3(0, .58, .08);
      break;
    }
    case "oil_hurricane_lamp": {
      tube(body, "tank", .18, .16, 0, .08, 0, matPrimary, 12);
      const glass = stockFn("#ffeaac");
      glass.emissive = new T.Color("#ffb848");
      glass.emissiveIntensity = .88;
      part(body, "chimney", new T.SphereGeometry(.14, 12, 10), glass, 0, .28, 0).scale.y = 1.3;
      tube(body, "cap", .11, .06, 0, .46, 0, matWood, 12);
      const handle = new T.Mesh(new T.TorusGeometry(.20, .022, 8, 16, Math.PI), matWood);
      handle.position.set(0, .44, 0);
      body.add(handle);
      root.userData.lightLocal = new T.Vector3(0, .38, 0);
      break;
    }
    case "tea_warmer_stove": {
      tube(body, "warmer", .19, .24, 0, .12, 0, matPrimary, 12);
      const flame = stockFn("#ffde84");
      flame.emissive = new T.Color("#ff9d2e");
      flame.emissiveIntensity = .92;
      tube(body, "candle", .08, .06, 0, .12, .15, flame, 8);
      part(body, "pot", new T.SphereGeometry(.18, 12, 10), matIvory, 0, .38, 0);
      root.userData.lightLocal = new T.Vector3(0, .28, .12);
      break;
    }
    case "wax_letter_desk": {
      box(body, "tray", .78, .05, .58, 0, .025, 0, matWood);
      box(body, "sheet", .38, .015, .32, .14, .06, .04, matIvory);
      tube(body, "seal", .05, .02, .18, .07, .08, matPrimary, 12);
      tube(body, "candle", .05, .18, -.22, .14, -.06, matIvory, 10);
      const fMat = stockFn("#ffdf88");
      fMat.emissive = new T.Color("#ff9d30");
      fMat.emissiveIntensity = .96;
      part(body, "flame", new T.ConeGeometry(.035, .10, 7), fMat, -.22, .28, -.06);
      root.userData.lightLocal = new T.Vector3(-.18, .38, 0);
      break;
    }
    case "sky_lantern_stand": {
      tube(body, "foot", .24, .06, 0, .03, 0, matWood, 12);
      tube(body, "pole", .05, 1.54, 0, .80, -.12, matWood, 8);
      box(body, "arm", .05, .05, .32, 0, 1.54, .02, matWood);
      const skyGlow = stockFn(spec.color);
      skyGlow.emissive = new T.Color("#ff8e48");
      skyGlow.emissiveIntensity = .86;
      part(body, "lantern", new T.CylinderGeometry(.22, .14, .42, 8), skyGlow, 0, 1.26, .14);
      root.userData.lightLocal = new T.Vector3(0, 1.24, .18);
      break;
    }

    // 茶食 (14)
    case "espresso_bar": {
      box(body, "counter", 1.48, .72, .72, 0, .36, 0, matPrimary);
      box(body, "top", 1.56, .07, .78, 0, .74, 0, matIvory);
      box(body, "machine", .68, .44, .44, -.26, .99, -.04, stockFn("#cf7358"));
      box(body, "chrome", .62, .12, .48, -.26, .84, .02, stockFn("#d8cec4"));
      for (let i = 0; i < 3; i++) tube(body, "cup", .06, .09, .32 + i * .13, .82, .10, matIvory, 10);
      break;
    }
    case "dessert_vitrine": {
      box(body, "base", 1.36, .62, .70, 0, .31, 0, matPrimary);
      box(body, "case", 1.28, .54, .54, 0, .89, -.04, stockFn("#dfeff5"));
      box(body, "shelf", 1.22, .03, .44, 0, .88, -.04, matIvory);
      tube(body, "cake_a", .16, .12, -.30, .70, .02, stockFn("#e28b78"), 12);
      tube(body, "cake_b", .14, .10, .18, .96, 0, stockFn("#eab96e"), 12);
      break;
    }
    case "wine_barrel_bar": {
      for (const sx of [-.56, .56]) part(body, "cask", new T.CylinderGeometry(.28, .24, .76, 12), matWood, sx, .38, 0);
      box(body, "slab", 1.68, .09, .74, 0, .80, 0, matPrimary);
      tube(body, "tap", .04, .28, 0, .98, -.16, stockFn("#d9b066"), 8);
      for (const gx of [-.34, .34]) tube(body, "glass", .06, .14, gx, .92, .12, stockFn("#dceaf0"), 8);
      break;
    }
    case "fruit_jam_stall": {
      box(body, "cart", 1.34, .64, .74, 0, .32, 0, matWood);
      for (const sx of [-.60, .60]) box(body, "post", .05, .88, .05, sx, 1.06, -.28, matWood);
      const canopy = box(body, "roof", 1.44, .08, .86, 0, 1.48, 0, matPrimary);
      canopy.rotation.x = .22;
      for (let i = 0; i < 4; i++) tube(body, "jar", .09, .18, -.42 + i * .28, .74, .08, stockFn(i % 2 ? "#d45d55" : "#e5a34e"), 10);
      break;
    }
    case "sushi_counter": {
      box(body, "body", 1.56, .68, .68, 0, .34, 0, matWood);
      box(body, "slab", 1.64, .08, .76, 0, .72, 0, matPrimary);
      box(body, "board", .56, .04, .34, -.26, .78, .06, matIvory);
      tube(body, "tea", .08, .12, .42, .82, .06, stockFn("#6b9272"), 10);
      break;
    }
    case "milk_churn_cart": {
      box(body, "bed", 1.12, .12, .68, 0, .42, 0, matPrimary);
      for (const sx of [-.42, .42]) for (const sz of [-.36, .36]) {
        tube(body, "wheel", .16, .05, sx, .16, sz, matWood, 12).rotation.x = Math.PI / 2;
      }
      for (const cx of [-.24, .10]) tube(body, "churn", .14, .38, cx, .66, 0, matIvory, 12);
      tube(body, "cheese", .18, .12, .38, .54, .06, stockFn("#ebb95e"), 12);
      break;
    }
    case "popcorn_cart": {
      box(body, "cart", 1.06, .52, .68, 0, .38, 0, matPrimary);
      for (const sx of [-.38, .38]) tube(body, "wheel", .18, .04, sx, .18, .36, matWood, 12).rotation.x = Math.PI / 2;
      box(body, "glass", .84, .56, .58, 0, .92, 0, matIvory);
      part(body, "roof", new T.ConeGeometry(.68, .28, 4), matPrimary, 0, 1.34, 0).rotation.y = Math.PI / 4;
      break;
    }
    case "ice_cream_stand": {
      box(body, "tub", 1.24, .62, .72, 0, .42, 0, matPrimary);
      box(body, "counter", 1.30, .06, .78, 0, .76, 0, matIvory);
      for (const sx of [-.54, .54]) box(body, "pole", .05, .74, .05, sx, 1.12, -.28, matWood);
      box(body, "canopy", 1.36, .12, .84, 0, 1.50, -.04, stockFn("#e69182"));
      for (const cx of [-.24, .18]) part(body, "scoop", new T.SphereGeometry(.12, 10, 8), stockFn(cx < 0 ? "#f4d7b2" : "#e89298"), cx, .86, .08);
      break;
    }
    case "fondue_table": {
      tube(body, "top", .54, .08, 0, .54, 0, matPrimary, 16);
      tube(body, "leg", .12, .48, 0, .24, 0, matWood, 10);
      tube(body, "pot", .16, .16, 0, .66, 0, stockFn("#cf684c"), 12);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        box(body, "bread", .12, .06, .10, Math.cos(a) * .36, .61, Math.sin(a) * .36, matIvory);
      }
      break;
    }
    case "teacup_tower": {
      tube(body, "post", .035, .76, 0, .38, 0, stockFn("#d9b066"), 8);
      for (let t = 0; t < 3; t++) {
        const r = .34 - t * .07;
        tube(body, "plate", r, .03, 0, .14 + t * .24, 0, matIvory, 16);
        tube(body, "tart", .07, .06, r * .48, .18 + t * .24, 0, stockFn("#df896d"), 8);
      }
      break;
    }
    case "rice_cooker_nook": {
      box(body, "hearth", 1.24, .58, .72, 0, .29, 0, matWood);
      box(body, "top", 1.32, .07, .78, 0, .61, 0, matIvory);
      for (let s = 0; s < 3; s++) tube(body, "steamer", .22, .14, -.26, .71 + s * .14, 0, matPrimary, 14);
      tube(body, "rice_tub", .18, .22, .32, .75, .04, stockFn("#a46e48"), 12);
      break;
    }
    case "honey_extractor": {
      for (const sx of [-.52, .52]) box(body, "side", .07, .98, .54, sx, .49, 0, matWood);
      for (const sy of [.28, .72]) box(body, "shelf", 1.08, .05, .56, 0, sy, 0, matWood);
      for (const cx of [-.24, .22]) box(body, "comb", .36, .28, .08, cx, .89, 0, matPrimary);
      for (let i = 0; i < 3; i++) tube(body, "jar", .10, .18, -.32 + i * .32, .39, .06, stockFn("#f2be52"), 10);
      break;
    }
    case "soup_kettle_hearth": {
      for (let i = 0; i < 3; i++) {
        const a = i * (Math.PI * 2 / 3);
        strut(body, "pole", [Math.cos(a) * .48, 0, Math.sin(a) * .48], [0, 1.48, 0], .055, matWood);
      }
      part(body, "kettle", new T.SphereGeometry(.26, 12, 10), matPrimary, 0, .64, 0);
      strut(body, "chain", [0, .86, 0], [0, 1.44, 0], .03, matIvory);
      part(body, "ember", new T.CylinderGeometry(.24, .28, .08, 12), stockFn("#e27844"), 0, .05, 0);
      break;
    }
    case "cookie_press_bench": {
      box(body, "table", 1.36, .68, .72, 0, .34, 0, matWood);
      box(body, "top", 1.42, .07, .78, 0, .71, 0, matIvory);
      box(body, "tray", .52, .03, .38, -.26, .76, .04, stockFn("#a49b92"));
      for (let c = 0; c < 4; c++) tube(body, "cookie", .06, .025, -.42 + (c % 2) * .20, .78, -.06 + Math.floor(c / 2) * .18, matPrimary, 10);
      tube(body, "pin", .045, .36, .34, .78, .08, stockFn("#9c6b48"), 8).rotation.z = Math.PI / 2;
      break;
    }

    // 绿植休闲 (14)
    case "upright_piano": {
      box(body, "case", 1.54, 1.18, .54, 0, .59, -.08, matPrimary);
      box(body, "keys_bed", 1.48, .12, .32, 0, .68, .22, matPrimary);
      box(body, "keys", 1.34, .05, .20, 0, .76, .24, matIvory);
      box(body, "sheet", .54, .32, .03, 0, 1.34, -.04, matIvory).rotation.x = -.15;
      box(body, "bench", .82, .38, .34, 0, .19, .54, matWood);
      break;
    }
    case "birdbath_fountain": {
      tube(body, "plinth", .28, .08, 0, .04, 0, matPrimary, 14);
      tube(body, "col", .12, .56, 0, .36, 0, matPrimary, 12);
      part(body, "basin", new T.CylinderGeometry(.44, .22, .16, 16), matPrimary, 0, .68, 0);
      tube(body, "water", .38, .04, 0, .75, 0, stockFn("#78adb0"), 16);
      part(body, "bird", new T.SphereGeometry(.07, 8, 8), stockFn("#e2906c"), .22, .82, .16);
      break;
    }
    case "hammock_frame": {
      for (const sx of [-.98, .98]) strut(body, "arm", [sx * .45, .04, 0], [sx, .92, 0], .08, matWood);
      box(body, "keel", .96, .08, .18, 0, .04, 0, matWood);
      for (let i = -2; i <= 2; i++) {
        box(body, "sling", .36, .04, .66, i * .34, .58 + Math.abs(i) * .10, 0, i % 2 ? matIvory : matPrimary).rotation.z = i * .14;
      }
      box(body, "pillow", .22, .08, .38, -.68, .82, 0, matIvory).rotation.z = -.24;
      break;
    }
    case "koi_basin": {
      part(body, "bowl", new T.CylinderGeometry(.48, .32, .38, 16), matPrimary, 0, .19, 0);
      tube(body, "water", .42, .04, 0, .37, 0, stockFn("#5b9496"), 16);
      for (const [lx, lz] of [[-.16, .10], [.18, -.12]]) tube(body, "pad", .11, .02, lx, .40, lz, stockFn("#6b995e"), 12);
      part(body, "lotus", new T.ConeGeometry(.07, .09, 6), stockFn("#eca4ad"), -.16, .45, .10);
      break;
    }
    case "bonsai_pedestal": {
      box(body, "stand", .72, .52, .64, 0, .26, 0, matWood);
      box(body, "tray", .54, .12, .42, 0, .58, 0, stockFn("#69838c"));
      strut(body, "trunk", [0, .64, 0], [-.14, .98, .04], .07, matWood);
      strut(body, "branch", [-.14, .98, .04], [.14, 1.12, -.02], .05, matWood);
      for (const [px, py, r] of [[-.18, 1.06, .18], [.16, 1.18, .20], [.02, 1.24, .16]]) {
        part(body, "canopy", new T.SphereGeometry(r, 10, 7), matPrimary, px, py, 0).scale.y = .55;
      }
      break;
    }
    case "weaving_loom": {
      for (const sx of [-.48, .48]) box(body, "post", .07, 1.08, .36, sx, .54, 0, matWood);
      box(body, "top_bar", 1.06, .08, .12, 0, 1.04, 0, matWood);
      box(body, "cloth", .80, .62, .05, 0, .54, 0, matPrimary);
      box(body, "stripe", .80, .18, .06, 0, .44, 0, matIvory);
      box(body, "shuttle", .32, .05, .06, .12, .76, .08, stockFn("#e2b45e")).rotation.z = .25;
      break;
    }
    case "pottery_wheel": {
      box(body, "table", 1.12, .68, .76, 0, .34, 0, matWood);
      tube(body, "wheel", .24, .05, -.16, .71, .06, stockFn("#948e86"), 14);
      part(body, "clay", new T.CylinderGeometry(.10, .14, .26, 12), matPrimary, -.16, .86, .06);
      part(body, "finished", new T.CylinderGeometry(.08, .11, .22, 10), matIvory, .34, .80, -.12);
      break;
    }
    case "chess_table": {
      box(body, "top", .88, .08, .88, 0, .68, 0, matWood);
      box(body, "board", .68, .025, .68, 0, .735, 0, matIvory);
      tube(body, "col", .14, .64, 0, .32, 0, matWood, 12);
      for (const sx of [-.20, .18]) part(body, "piece", new T.ConeGeometry(.045, .14, 8), sx < 0 ? matIvory : matPrimary, sx, .81, .12);
      for (const sx of [-.56, .56]) tube(body, "stool", .18, .38, sx, .19, 0, matPrimary, 10);
      break;
    }
    case "cat_tree": {
      box(body, "base", .96, .06, .84, 0, .03, 0, matPrimary);
      for (const [px, py, h] of [[-.26, .44, .82], [.26, .34, .62]]) tube(body, "post", .08, h, px, py, 0, matWood, 10);
      tube(body, "cubby", .24, .34, .26, .82, 0, matPrimary, 12);
      box(body, "perch", .46, .06, .42, -.26, .88, 0, matIvory);
      part(body, "pom", new T.SphereGeometry(.07, 8, 8), stockFn("#d97e68"), .04, .68, .18);
      break;
    }
    case "dog_kennel": {
      box(body, "house", .98, .66, .86, 0, .33, 0, matPrimary);
      box(body, "door", .40, .46, .08, 0, .23, .42, stockFn("#3f2d22"));
      for (const sx of [-1, 1]) {
        const slope = box(body, "roof", .70, .07, .96, sx * .32, .84, 0, matWood);
        slope.rotation.z = -sx * .62;
      }
      box(body, "mat", .54, .05, .36, 0, .025, .58, matIvory);
      break;
    }
    case "garden_wheelbarrow": {
      box(body, "tray", .82, .34, .56, -.08, .44, 0, matPrimary);
      for (const sz of [-.20, .20]) box(body, "handle", 1.18, .05, .05, -.14, .38, sz, matWood);
      tube(body, "wheel", .22, .06, .52, .22, 0, matWood, 12).rotation.x = Math.PI / 2;
      seedling(body, -.12, 0, stockFn("#6b975e"), stockFn("#e29874"));
      break;
    }
    case "sun_lounger": {
      box(body, "frame", 1.56, .08, .72, 0, .28, 0, matWood);
      for (const sx of [-.64, .64]) for (const sz of [-.30, .30]) box(body, "leg", .07, .24, .07, sx, .12, sz, matWood);
      box(body, "mat", 1.06, .09, .64, -.18, .36, 0, matPrimary);
      box(body, "back", .56, .08, .64, .54, .52, 0, matIvory).rotation.z = -.52;
      tube(body, "pole", .04, 1.54, .46, .77, -.42, matWood, 8);
      part(body, "parasol", new T.ConeGeometry(.76, .24, 10), matPrimary, .46, 1.54, -.42);
      break;
    }
    case "rocking_horse": {
      for (const sz of [-.18, .18]) box(body, "runner", 1.04, .06, .06, 0, .04, sz, matWood);
      box(body, "torso", .62, .24, .24, 0, .44, 0, matPrimary);
      box(body, "neck", .18, .36, .16, .26, .66, 0, matPrimary).rotation.z = -.38;
      box(body, "head", .26, .16, .16, .38, .80, 0, matIvory).rotation.z = .35;
      for (const sx of [-.22, .22]) box(body, "leg", .07, .34, .07, sx, .22, 0, matWood);
      break;
    }
    case "cello_stand": {
      for (const sx of [-.24, .24]) strut(body, "stand", [sx, 0, .18], [0, .62, -.12], .05, matWood);
      part(body, "lower", new T.CylinderGeometry(.24, .24, .12, 14), matPrimary, 0, .46, .04).rotation.x = Math.PI / 2;
      part(body, "upper", new T.CylinderGeometry(.17, .17, .12, 14), matPrimary, 0, .74, .04).rotation.x = Math.PI / 2;
      box(body, "neck", .06, .48, .05, 0, 1.08, .04, matWood);
      strut(body, "bow", [.30, .16, .14], [.26, 1.18, .06], .02, matIvory);
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
  study_window: "🪟", study_bookshelf: "📚", study_lamp: "🛋", garden_ferns: "🌿",
  station_skyline: "🌙", station_canopy: "🚏", station_track: "🛤",
  creek_planks: "🪵", creek_sign: "🪧", marsh_reeds: "🌾",
  ridge_slopes: "⛰", ridge_windmill: "🌬", ridge_chimes: "🎐", coast_rocks: "🪨",
  round_tea_table: "🫖", writing_desk: "🪑", cozy_armchair: "🛋", rocking_chair: "🪑", tufted_sofa: "🛋", wood_stool: "🪵",
  tall_wardrobe: "🚪", display_cabinet: "🏺", chest_drawer: "🗄", wall_coat_rack: "🧥", low_sideboard: "🧺", book_caddy: "📚",
  floor_lamp: "💡", warm_fireplace: "🔥", mushroom_lamp: "🍄", candle_stand: "🕯", paper_chime_arch: "✨", fireplace_woodpile: "🪵",
  retro_fridge: "🧊", kitchen_stove: "🍳", tea_trolley: "🍰", bread_oven: "🥐", gramophone: "📻", picnic_basket: "🧺",
  woven_rug: "🧶", fiddle_pot: "🪴", flower_stand: "🌷", wooden_easel: "🎨", story_tent: "⛺", wooden_swing: "🎠",
  dining_table: "🍽", folding_table: "🪑", bar_stool: "🍺", pouf_ottoman: "🧶", window_bench: "🛋",
  kid_study_desk: "✏", drafting_table: "📐", crescent_bench: "🌙", bean_bag: "☁", console_table: "🏺",
  bamboo_chair: "🎋", vanity_table: "🪞", low_chabudai: "🍵", corner_booth: "🛋",
  corner_shelf: "📚", apothecary_chest: "🌿", vinyl_cabinet: "💿", ladder_shelf: "🪜", linen_cupboard: "🧺",
  toy_chest: "🧸", step_tansu: "🗄", baker_rack: "🥐", mail_pigeonhole: "✉", umbrella_stand: "☂",
  jewelry_armoire: "💎", crate_shelf: "📦", grandfather_clock: "🕰", tool_pegboard: "🔨",
  star_lantern: "⭐", stained_lamp: "🏮", campfire_ring: "🔥", moon_nightlight: "🌙", street_post_lamp: "🏮",
  bamboo_lantern: "🎋", desk_banker_lamp: "💡", paper_cloud_lamp: "☁", brazier_bowl: "🔥", firefly_jar_rack: "✨",
  oil_hurricane_lamp: "🪔", tea_warmer_stove: "🫖", wax_letter_desk: "🕯", sky_lantern_stand: "🏮",
  espresso_bar: "☕", dessert_vitrine: "🍰", wine_barrel_bar: "🍷", fruit_jam_stall: "🍓", sushi_counter: "🍣",
  milk_churn_cart: "🥛", popcorn_cart: "🍿", ice_cream_stand: "🍨", fondue_table: "🍲", teacup_tower: "🧁",
  rice_cooker_nook: "🍚", honey_extractor: "🍯", soup_kettle_hearth: "🍲", cookie_press_bench: "🍪",
  upright_piano: "🎹", birdbath_fountain: "🕊", hammock_frame: "🌴", koi_basin: "🪷", bonsai_pedestal: "🌲",
  weaving_loom: "🧵", pottery_wheel: "🏺", chess_table: "♟", cat_tree: "🐱", dog_kennel: "🐶",
  garden_wheelbarrow: "🌷", sun_lounger: "⛱", rocking_horse: "🎠", cello_stand: "🎻",
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

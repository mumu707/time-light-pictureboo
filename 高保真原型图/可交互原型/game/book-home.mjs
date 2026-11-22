import { reactionFor } from "./book-data.mjs";
import { propTypes } from "../camera/prop-types.mjs";
import { regions, regionFootprints } from "./book-regions.mjs";

export const cardDepth = .045;
const radians = Math.PI / 180;
const fixed = {
  study: [[-.39, -.48, 1.23, .46]],
  garden: [[-2.05, .8, 2.48, 1.59], [2.77, -.48, 1.23, .46]],
  station: [[2.77, -.48, 1.23, .46]],
  creek: [[0, -2, 11.4, 1.85], [2.77, -.48, 1.23, .46]],
  marsh: [[-3.8, -.9, 5.5, 2.5], [2.77, -.48, 1.23, .46]],
  ridge: [[2.77, -.48, 1.23, .46]],
  coast: [[-.3, -2.7, 12, 2.1], [2.77, -.48, 1.23, .46]]
};
export const bookSize = { leafWidth: 9.64, depth: 16.9 };
const area = { left: -8.96, right: 8.96, top: -7.5, bottom: 7.56 };
const page = { left: -9.5, right: 9.5, top: -8.24, bottom: 8.24 };
const radius = .27;

const width = area.right - area.left, depth = area.bottom - area.top;
export const floorPoint = ({ x, y }) => ({ x: area.left + x * width, y: area.top + y * depth });
export const mountX = world => world === "study" ? -.39 : 2.77;
export const floorRecord = ({ x, y }) => ({ x: (x - area.left) / width, y: (y - area.top) / depth });
export const expandFloor = ({ x, y }) => floorRecord({ x: -3.63 + x * 7.28, y: -.02 + y * 2.72 });
export const expandWideFloor = ({ x, y }) => floorRecord({ x: -4.48 + x * 8.96, y: -3.75 + y * 7.53 });
export const purposeOf = piece => {
  const raw = piece.purpose || piece.asset?.purpose || "toy";
  return propTypes[raw] ? raw : "toy";
};

export const wishes = [
  { purpose: "backdrop", title: "想有个安静角落", hint: "在这页摆一件背景" },
  { purpose: "toy", title: "想玩一会儿", hint: "在这页摆一件玩具" },
  { purpose: "plant", title: "想看一点绿意", hint: "在这页摆一件植物" },
  { purpose: "food", title: "想尝点好吃的", hint: "在这页摆一件食物" }
];
export function spiritWish(spirit) {
  const ordered = wishes.map((_, index) => wishes[(spirit.seed + index) % wishes.length]);
  const wish = ordered.find(option => !spirit.fulfilled?.includes(option.purpose)) || ordered[(spirit.wishesDone || 0) % ordered.length];
  return { ...wish, icon: propTypes[wish.purpose].icon };
}
export function matchesWish(spirit, piece) {
  const wish = spiritWish(spirit);
  const p = purposeOf(piece);
  return wish.purpose === p || wish.purpose === propTypes[p]?.basePurpose;
}

export function cardSize(record) {
  const extent = record.scale * (record.surface === "prop" ? 1.04 : 2.56);
  return [extent * Math.min(1, record.asset.ratio), extent / Math.max(1, record.asset.ratio)];
}
export function baseSize(record) {
  const [width] = cardSize(record);
  const style = propTypes[purposeOf(record)];
  return [Math.max(.14, width * style.width), Math.max(.11, record.scale * style.depth * 2.56)];
}

function rectangle(x, y, width, height, angle = 0) {
  const u = { x: Math.cos(angle), y: Math.sin(angle) };
  const v = { x: -u.y, y: u.x };
  return { x, y, width: width / 2, height: height / 2, u, v };
}
const dot = (a, b) => a.x * b.x + a.y * b.y;
const extent = (rect, axis) => Math.abs(dot(rect.u, axis)) * rect.width + Math.abs(dot(rect.v, axis)) * rect.height;
function intersects(a, b) {
  const delta = { x: a.x - b.x, y: a.y - b.y };
  return [a.u, a.v, b.u, b.v].every(axis => Math.abs(dot(delta, axis)) < extent(a, axis) + extent(b, axis));
}
function footprint(record) {
  const cappedScale = Math.min(record.scale || .3, .65);
  const capped = cappedScale === record.scale ? record : { ...record, asset: record.asset, scale: cappedScale };
  const [width, height] = cardSize(capped);
  const angle = (record.rotation || 0) * radians || 0;
  if (record.surface === "prop") return rectangle((record.x - .5) * 1.04, (record.y - .5) * 1.06, width, height, -angle);
  const center = floorPoint(record);
  return rectangle(center.x, center.y, ...baseSize(capped), -angle);
}

function modelFootprint(record) {
  const [w, d] = record.collisionSize || record.asset?.collisionSize || [1.4, 1.1];
  const scale = Math.min(record.scale || 1, 1.25);
  const center = floorPoint(record);
  return rectangle(center.x, center.y, w * scale, d * scale, -((record.rotation || 0) * radians || 0));
}

export function modelPlacement(record) {
  return record.x >= .06 && record.x <= .94 && record.y >= .06 && record.y <= .94;
}

export function placement(world, record, pieces, sceneModels) {
  if (record.isModel || record.modelId) return modelPlacement(record);
  if (record.x < 0 || record.x > 1 || record.y < 0 || record.y > 1) return false;
  const rect = footprint(record);
  const limits = record.surface === "prop"
    ? { left: -.52, right: .52, top: -.53, bottom: .53 } : page;
  const x = extent(rect, { x: 1, y: 0 });
  const y = extent(rect, { x: 0, y: 1 });
  if (rect.x - x < limits.left || rect.x + x > limits.right || rect.y - y < limits.top || rect.y + y > limits.bottom) return false;
  const obstacles = pieces.filter(piece => piece.id !== record.id && piece.surface === record.surface).map(footprint);
  if (record.surface === "paper") {
    obstacles.push(...(Array.isArray(sceneModels) ? [...fixedOnlyRects[world], ...sceneModels.map(modelFootprint)] : fixedRects[world]));
  }
  return obstacles.every(obstacle => !intersects(rect, obstacle));
}

export function freeSpot(world, record, pieces, center, sceneModels) {
  const candidates = [center];
  for (let row = 0; row <= 16; row++) {
    for (let col = 0; col <= 26; col++) candidates.push({ x: col / 26, y: row / 16 });
  }
  candidates.sort((a, b) => Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y));
  return candidates.find(point => placement(world, { ...record, asset: record.asset, ...point }, pieces, sceneModels));
}

const columns = 59;
const rows = 49;
const cell = id => ({
  x: area.left + radius + id % columns * (area.right - area.left - radius * 2) / (columns - 1),
  y: area.top + radius + Math.floor(id / columns) * (area.bottom - area.top - radius * 2) / (rows - 1)
});
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const cells = Array.from({ length: columns * rows }, (_, id) => cell(id));
const sectorWidth = 10;
const sectors = new Map();
for (const id of cells.keys()) {
  const key = Math.floor(id % columns / sectorWidth) + "/" + Math.floor(Math.floor(id / columns) / sectorWidth);
  if (!sectors.has(key)) sectors.set(key, []);
  sectors.get(key).push(id);
}
const fixedOnlyRects = Object.fromEntries(Object.entries(fixed).map(([world, values]) => [
  world, values.map(args => rectangle(...args))
]));
const fixedRects = Object.fromEntries(Object.entries(fixed).map(([world, values]) => [
  world, [...values.map(args => rectangle(...args)),
    ...regions[world].map(([, type, x, y]) => rectangle(x, y, ...regionFootprints[type]))]
]));

export function walkMap(world, pieces, previous, customModels) {
  const moving = pieces.filter(piece => piece.surface === "paper").map(footprint);
  const sceneRects = Array.isArray(customModels)
    ? [...fixedOnlyRects[world], ...customModels.map(modelFootprint)]
    : fixedRects[world];
  const obstacles = [...sceneRects, ...moving];
  const clear = (point, extra = []) => {
    const body = rectangle(point.x, point.y, radius * 2, radius * 2);
    const outside = obstacle => !intersects(body, obstacle);
    return obstacles.every(outside) && extra.every(outside);
  };
  const modelSig = Array.isArray(customModels) ? JSON.stringify(sceneRects) : "fixed";
  const walkable = previous?.world === world && previous?.modelSig === modelSig ? previous.walkable.slice() : Array(cells.length);
  const signatures = new Map();
  for (const [sector, ids] of sectors) {
    const first = cells[ids[0]], last = cells[ids.at(-1)];
    const bounds = rectangle((first.x + last.x) / 2, (first.y + last.y) / 2,
      last.x - first.x + radius * 2, last.y - first.y + radius * 2);
    const signature = JSON.stringify(moving.filter(obstacle => intersects(bounds, obstacle)));
    signatures.set(sector, signature);
    if (previous?.world === world && previous?.modelSig === modelSig && previous.signatures.get(sector) === signature) continue;
    for (const id of ids) walkable[id] = clear(cells[id]);
  }
  return { world, modelSig, clear, walkable, signatures };
}

export function planWalk(map, resident, pieces, categoryFor, random, requested = () => false) {
  const point = floorPoint(resident);
  const prefs = pieces.map(piece => ({
    piece,
    ...reactionFor(resident, categoryFor(piece), piece.expression)
  }));
  const sensitivity = (resident.traits.敏感 ?? 50) / 100;
  const margin = .08 + sensitivity * .18;
  const avoided = prefs.filter(item => item.sentiment === "avoid" && !requested(item.piece))
    .map(({ piece }) => {
      if (piece.surface === "prop") return rectangle(mountX(map.world), .13, .9 + margin, .55 + margin);
      const rect = footprint(piece);
      return { ...rect, width: rect.width + margin, height: rect.height + margin };
    });
  const allowed = avoided.length ? cells.map((pos, id) => map.walkable[id] && map.clear(pos, avoided)) : map.walkable;
  const closest = cells.reduce((best, pos, id) => map.walkable[id] &&
    (best === -1 || distance(point, pos) < distance(point, cells[best])) ? id : best, -1);
  if (closest === -1) return { path: [] };
  const visibleFrom = (a, b, extra) => [0, .25, .5, .75, 1].every(t =>
    map.clear({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, extra));
  const approach = map.clear(point, avoided) ? avoided : [];
  const start = map.clear(point) ? cells.reduce((best, pos, id) => allowed[id] &&
    (best === -1 || distance(point, pos) < distance(point, cells[best])) &&
    visibleFrom(point, pos, approach) ? id : best, -1) : closest;
  if (start === -1) return { path: [] };
  const queue = [start];
  const from = new Map([[start, -1]]);
  for (const id of queue) {
    const x = id % columns, y = Math.floor(id / columns);
    const neighbors = [x > 0 && id - 1, x < columns - 1 && id + 1,
      y > 0 && id - columns, y < rows - 1 && id + columns];
    for (const next of neighbors) {
      if (next === false || !allowed[next] || from.has(next)) continue;
      if (!map.clear({ x: (cells[id].x + cells[next].x) / 2, y: (cells[id].y + cells[next].y) / 2 },
        allowed[id] ? avoided : [])) continue;
      from.set(next, id);
      queue.push(next);
    }
  }
  const curiosity = resident.traits.好奇 / 100;
  const targets = prefs.filter(item => requested(item.piece) || (item.sentiment !== "avoid" &&
    (item.sentiment === "like" ? random < .35 + curiosity * .6 : random < .12 + curiosity * .3))).flatMap(({ piece, sentiment }) => {
    const center = piece.surface === "prop" ? { x: mountX(map.world), y: .16 } : floorPoint(piece);
    const [width, height] = cardSize(piece);
    const nearby = queue.filter(id => distance(center, cells[id]) <= Math.max(width, height) / 2 + .72);
    return nearby.map(id => ({ id, piece, priority: requested(piece) ? 2 : Number(sentiment === "like"),
      score: distance(point, cells[id]) + distance(center, cells[id]) * 2 }));
  }).sort((a, b) => b.priority - a.priority || a.score - b.score);
  const exploring = queue.filter(id => distance(point, cells[id]) > .38);
  const target = targets[0];
  let end = target?.id ?? exploring[Math.floor(random * exploring.length)] ?? start;
  const path = [];
  for (; end !== -1; end = from.get(end)) path.unshift(floorRecord(cells[end]));
  return { path, target: target?.piece, relocate: !map.clear(point) };
}

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Box3, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { walkMap } from "../../game/book-home.mjs";

const here = import.meta.url;
const json = async name => JSON.parse(await readFile(new URL(name, here), "utf8"));
const plan = await json("现有书页拼装清单.json");
const { assets } = await json(plan.assetManifest);
const loader = new GLTFLoader();
const seen = new Set();
const radius = .27; // Matches the resident clearance in book-home.mjs.
const gridStep = .12;
const inside = (x, z, box, margin = 0) => x >= box.min.x - margin && x <= box.max.x + margin
  && z >= box.min.z - margin && z <= box.max.z + margin;

for (const [world, chapter] of Object.entries(plan.chapters)) {
  const existing = walkMap(world, []);
  const models = [];
  for (const piece of chapter.pieces) {
    assert.ok(!seen.has(piece.asset), `Repeated model: ${piece.asset}`);
    seen.add(piece.asset);
    const meta = assets[piece.asset];
    const bytes = await readFile(new URL(meta.file, here));
    const { scene } = await loader.parseAsync(Uint8Array.from(bytes).buffer, "");
    scene.position.fromArray(piece.position);
    scene.rotation.y = piece.yaw;
    scene.scale.setScalar(piece.scale);
    scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene, true);
    const [baseWidth, baseDepth] = meta.collisionWidthDepth;
    const base = new Box3().setFromPoints([-1, 1].flatMap(sx => [-1, 1].map(sz =>
      scene.localToWorld(new Vector3(sx * baseWidth / 2, 0, sz * baseDepth / 2)))));
    assert.ok(!box.isEmpty() && box.min.y >= .035 && box.min.y < .055, `Floor mismatch: ${piece.asset}`);
    for (const bounds of [box, base]) {
      assert.ok(bounds.min.x >= -9.5 && bounds.max.x <= 9.5
        && bounds.min.z >= -8.24 && bounds.max.z <= 8.24, `Off page: ${piece.asset}`);
      for (let x = bounds.min.x; ; x = Math.min(x + gridStep, bounds.max.x)) {
        for (let z = bounds.min.z; ; z = Math.min(z + gridStep, bounds.max.z)) {
          assert.ok(existing.clear({ x, y: z }), `Existing scenery conflict: ${piece.asset} at ${x}, ${z}`);
          if (z === bounds.max.z) break;
        }
        if (x === bounds.max.x) break;
      }
    }
    for (const other of models) assert.ok(!box.intersectsBox(other.box), `Overlap: ${piece.asset} / ${other.id}`);
    const visit = meta.anchors.visit && scene.localToWorld(new Vector3(...meta.anchors.visit));
    models.push({ id: piece.asset, box, base, visit });
  }
  // Flood from the center using existing obstacles plus conservative new bases.
  const step = .15, cols = 116, rows = 97;
  const grid = Array.from({ length: cols * rows }, (_, i) => ({
    x: -8.625 + (i % cols) * step, z: -7.2 + Math.floor(i / cols) * step
  }));
  const free = grid.map(({ x, z }) => existing.clear({ x, y: z }) &&
    models.every(({ base }) => !inside(x, z, base, radius)));
  const start = grid.findIndex(({ x, z }, i) => free[i] && Math.abs(x) < .1 && Math.abs(z) < .1);
  assert.ok(start >= 0, `Page center blocked: ${world}`);
  const reachable = new Set([start]);
  const queue = [start];
  for (const i of queue) {
    const next = [i - cols, i + cols];
    if (i % cols) next.push(i - 1);
    if (i % cols < cols - 1) next.push(i + 1);
    for (const n of next) if (free[n] && !reachable.has(n)) {
      reachable.add(n);
      queue.push(n);
    }
  }
  for (const { id, box, visit } of models) {
    const target = visit ?? new Vector3((box.min.x + box.max.x) / 2, 0, box.max.z + .45);
    const stop = queue.map(i => grid[i]).reduce((best, candidate) => {
      const distance = p => Math.hypot(p.x - target.x, p.z - target.z);
      return distance(candidate) < distance(best) ? candidate : best;
    });
    assert.ok(Math.hypot(stop.x - target.x, stop.z - target.z) <= .55, `No reachable stop: ${id}`);
    console.log(`${world}/${id}: stop X/Z [${stop.x.toFixed(3)}, ${stop.z.toFixed(3)}]`);
  }
}
assert.equal(seen.size, Object.keys(assets).length);
console.log(`Checked ${seen.size} standalone GLBs across ${Object.keys(plan.chapters).length} chapters.`);

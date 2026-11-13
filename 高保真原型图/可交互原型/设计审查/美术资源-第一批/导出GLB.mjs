
import { mkdir, writeFile } from "node:fs/promises";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { Box3, Vector3 } from "three";
import { makeModel, makeScene, models, scenes } from "./纸模源文件.mjs";

// GLTFExporter reads Blobs through the browser's FileReader API.
globalThis.FileReader ??= class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
};
const output = new URL("./GLB/", import.meta.url);
await mkdir(output, { recursive: true });
const exporter = new GLTFExporter();
const manifest = { units: "拾光世界单位", up: "+Y", front: "+Z", assets: {}, scenes: {} };
const round = v => v.map(n => Number(n.toFixed(4)));
async function exportRoot(root) {
  const buffer = await exporter.parseAsync(root, { binary: true });
  await writeFile(new URL(root.name + ".glb", output), Buffer.from(buffer));
  const bounds = new Box3().setFromObject(root);
  return { min: round(bounds.min.toArray()), max: round(bounds.max.toArray()),
    dimensions: round(bounds.getSize(new Vector3()).toArray()) };
}
for (const [id, spec] of Object.entries(models)) {
  manifest.assets[id] = {
    name: spec.name, file: "GLB/" + id + ".glb", collisionWidthDepth: spec.size,
    anchors: spec.anchors, bounds: await exportRoot(makeModel(id))
  };
}
for (const [id, spec] of Object.entries(scenes)) {
  manifest.scenes[id] = {
    name: spec.name, file: "GLB/" + id + ".glb", bounds: await exportRoot(makeScene(id)),
    placements: spec.placements.map(([asset,x,z,yaw]) => ({asset, position:[x,0,z], yaw}))
  };
}
await writeFile(new URL("./资源清单.json", import.meta.url), JSON.stringify(manifest, null, 2) + "\n");


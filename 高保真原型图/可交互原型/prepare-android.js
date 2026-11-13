"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

async function prepare() {
  const target = path.join(__dirname, "android-app/app/src/main/assets/public");
  const vendor = path.join(target, "game/vendor");
  const three = path.join(__dirname, "node_modules/three");
  const dependencies = ["build/three.module.js", "build/three.core.js", "LICENSE"];
  await Promise.all(dependencies.map(file => fs.access(path.join(three, file))));
  await fs.mkdir(target, { recursive: true });
  for (const folder of ["assets", "camera", "game", "js"]) {
    await fs.cp(path.join(__dirname, folder), path.join(target, folder), { recursive: true });
  }
  await fs.mkdir(vendor, { recursive: true });
  await Promise.all(dependencies.map(file =>
    fs.copyFile(path.join(three, file), path.join(vendor, path.basename(file)))));
  console.log("Android Web 资源已准备。");
}

prepare().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

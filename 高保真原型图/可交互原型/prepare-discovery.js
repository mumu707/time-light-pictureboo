"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");

async function prepare() {
  const destination = path.join(__dirname, "camera/assets/inference");
  const runtime = path.join(__dirname, "node_modules/onnxruntime-web");
  await fs.mkdir(destination, { recursive: true });
  for (const name of ["ort.wasm.min.js", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) {
    await fs.copyFile(path.join(runtime, "dist", name), path.join(destination, name));
  }
  const runtimeLicense = await fetch("https://raw.githubusercontent.com/microsoft/onnxruntime/main/LICENSE", { signal: AbortSignal.timeout(20000) });
  if (!runtimeLicense.ok) throw new Error("运行时授权文件下载失败");
  await fs.writeFile(path.join(destination, "onnxruntime-LICENSE.txt"), await runtimeLicense.text());
  const modelPath = path.join(destination, "u2netp.onnx");
  let model = await fs.readFile(modelPath).catch(() => null);
  if (!model || createHash("md5").update(model).digest("hex") !== "8e83ca70e441ab06c318d82300c84806") {
    const response = await fetch("https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx", { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`模型下载失败 ${response.status}`);
    model = Buffer.from(await response.arrayBuffer());
    if (createHash("md5").update(model).digest("hex") !== "8e83ca70e441ab06c318d82300c84806") throw new Error("模型校验失败");
    await fs.writeFile(modelPath, model);
  }
  const license = await fetch("https://raw.githubusercontent.com/xuebinqin/U-2-Net/master/LICENSE", { signal: AbortSignal.timeout(20000) });
  if (!license.ok) throw new Error("模型授权文件下载失败");
  await fs.writeFile(path.join(destination, "u2net-LICENSE.txt"), await license.text());
  const manifest = {};
  for (const name of ["u2netp.onnx", "ort-wasm-simd-threaded.wasm"]) {
    const bytes = await fs.readFile(path.join(destination, name));
    manifest[name] = { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  }
  await fs.writeFile(path.join(destination, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log("本地抠图模型与 WASM 已准备，模型校验通过。");
}

prepare().catch(error => { console.error(error.message); process.exitCode = 1; });

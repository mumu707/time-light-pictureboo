"use strict";

importScripts("assets/inference/ort.wasm.min.js");

let session;
let manifest;
const cacheName = "shiguang-u2netp-ort-1.31.1-v1";

async function binary(name, phase) {
  const url = new URL(`assets/inference/${name}`, self.location.href).href;
  const cache = await caches.open(cacheName).catch(() => null);
  let response = await cache?.match(url);
  if (response) return response.arrayBuffer();
  response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error("模型文件加载失败，请检查网络后重试。");
  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    self.postMessage({ phase, progress: Math.min(99, Math.round(loaded / manifest[name].bytes * 100)) });
  }
  const blob = new Blob(chunks);
  const bytes = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== manifest[name].sha256) {
    await cache?.delete(url);
    throw new Error("模型文件校验失败，请重新加载。");
  }
  await cache?.put(url, new Response(bytes)).catch(() => {});
  return bytes;
}

function samplePrototypes(indices, lArr, aArr, bArr, maxSamples) {
  const step = Math.max(1, Math.floor(indices.length / maxSamples));
  const out = [];
  for (let i = 0; i < indices.length && out.length < maxSamples; i += step) {
    const idx = indices[i];
    out.push(lArr[idx], aArr[idx], bArr[idx]);
  }
  return out;
}

function minColorDistSq(l, a, b, protos) {
  let best = 1e9;
  for (let j = 0; j < protos.length; j += 3) {
    const dl = (l - protos[j]) * 0.7;
    const da = a - protos[j + 1];
    const db = b - protos[j + 2];
    const d = dl * dl + da * da + db * db;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

self.onmessage = async event => {
  const reqId = event.data?.id;
  try {
    if (!session) {
      const response = await fetch("assets/inference/manifest.json");
      if (!response.ok) throw new Error("抠图模型尚未准备，请稍后重试。");
      manifest = await response.json();
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.wasmPaths = new URL("assets/inference/", self.location.href).href;
      ort.env.wasm.wasmBinary = await binary("ort-wasm-simd-threaded.wasm", "加载抠图引擎");
      const model = await binary("u2netp.onnx", "下载抠图模型");
      self.postMessage({ phase: "正在准备本地模型" });
      session = await ort.InferenceSession.create(model, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
    }
    self.postMessage({ phase: "正在精修主体轮廓" });
    const rgba = new Uint8ClampedArray(event.data.rgba);
    const brush = event.data.brushMask ? new Uint8Array(event.data.brushMask) : null;
    const size = 320;
    const count = size * size;
    let maximum = 1;
    for (let i = 0; i < rgba.length; i += 4) maximum = Math.max(maximum, rgba[i], rgba[i + 1], rgba[i + 2]);
    const data = new Float32Array(count * 3);
    const mean = [.485, .456, .406];
    const deviation = [.229, .224, .225];
    // Perceptual opponent color coordinates (L, rg, yb) for fast GrabCut color affinity
    const lArr = new Float32Array(count);
    const aArr = new Float32Array(count);
    const bArr = new Float32Array(count);
    for (let p = 0; p < count; p++) {
      const r = rgba[p * 4], g = rgba[p * 4 + 1], bl = rgba[p * 4 + 2];
      data[p] = (r / maximum - mean[0]) / deviation[0];
      data[count + p] = (g / maximum - mean[1]) / deviation[1];
      data[count * 2 + p] = (bl / maximum - mean[2]) / deviation[2];
      lArr[p] = 0.299 * r + 0.587 * g + 0.114 * bl;
      aArr[p] = r - g;
      bArr[p] = 0.5 * (r + g) - bl;
    }
    const tensor = new ort.Tensor("float32", data, [1, 3, size, size]);
    let output;
    try {
      output = await session.run({ [session.inputNames[0]]: tensor });
      const values = output[session.outputNames[0]].data;
      let low = Infinity;
      let high = -Infinity;
      for (const value of values) { low = Math.min(low, value); high = Math.max(high, value); }
      if (high - low < .00001) throw new Error("暂时没有找到清晰主体，请涂抹物体后重试。");

      const prob = new Float32Array(count);
      const span = high - low;
      for (let i = 0; i < count; i++) prob[i] = (values[i] - low) / span;

      const fgIndices = [];
      const fgFallbackIndices = [];
      const bgIndices = [];
      if (brush) {
        for (let i = 0; i < count; i++) {
          if (brush[i] >= 128) {
            fgFallbackIndices.push(i);
            if (prob[i] > 0.22) fgIndices.push(i);
          } else if (brush[i] === 0 && prob[i] < 0.28) {
            bgIndices.push(i);
          }
        }
        if (fgIndices.length < 8 && fgFallbackIndices.length) {
          fgIndices.push(...fgFallbackIndices);
        }
        if (bgIndices.length < 16) {
          for (let i = 0; i < count; i++) if (brush[i] === 0) bgIndices.push(i);
        }
      } else {
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = y * size + x;
            const onEdge = x < 4 || x >= size - 4 || y < 4 || y >= size - 4;
            if (prob[idx] > 0.78) fgIndices.push(idx);
            else if (onEdge && prob[idx] < 0.25) bgIndices.push(idx);
          }
        }
      }

      const fgProtos = samplePrototypes(fgIndices, lArr, aArr, bArr, 10);
      const bgProtos = samplePrototypes(bgIndices, lArr, aArr, bArr, 14);
      const hasColor = fgProtos.length >= 3 && bgProtos.length >= 3;

      const mask = new Uint8Array(count);
      for (let i = 0; i < count; i++) {
        let p = prob[i];
        if (hasColor) {
          const dFg = minColorDistSq(lArr[i], aArr[i], bArr[i], fgProtos);
          const dBg = minColorDistSq(lArr[i], aArr[i], bArr[i], bgProtos);
          const colorScore = dBg / (dFg + dBg + 1);
          if (brush) {
            if (brush[i] >= 180) {
              p = Math.max(p, 0.42 * p + 0.58 * colorScore + 0.16);
            } else if (brush[i] > 0) {
              p = 0.62 * p + 0.38 * colorScore;
            } else {
              p = p * (0.35 + 0.65 * colorScore);
            }
          } else if (p > 0.15 && p < 0.82) {
            p = 0.80 * p + 0.20 * colorScore;
          }
        } else if (brush && brush[i] >= 180) {
          p = Math.max(p, 0.75);
        }
        mask[i] = Math.max(0, Math.min(255, Math.round(p * 255)));
      }
      self.postMessage({ mask: mask.buffer, id: reqId }, [mask.buffer]);
    } finally {
      tensor.dispose();
      for (const value of Object.values(output || {})) value.dispose();
    }
  } catch (error) {
    self.postMessage({ id: reqId, error: /[\u4e00-\u9fff]/.test(error.message) ? error.message : "抠图模型加载失败，请检查网络后重试。" });
  }
};

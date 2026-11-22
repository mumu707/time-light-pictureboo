"use strict";

importScripts("assets/inference/ort.wasm.min.js");
importScripts("matting-core.js");

let session;
let sessionPromise;
let manifest;
let cachedScene = null;
let taskQueue = Promise.resolve();
const cacheName = "shiguang-u2netp-ort-1.31.1-v1";

async function binary(name, phase, reqId) {
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
    self.postMessage({ id: reqId, phase, progress: Math.min(99, Math.round(loaded / manifest[name].bytes * 100)) });
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
  for (let i = 0; i < indices.length && out.length < maxSamples * 3; i += step) {
    const idx = indices[i];
    out.push(lArr[idx], aArr[idx], bArr[idx]);
  }
  return out;
}

function minColorDist(l, a, b, protos) {
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

// Fast 3x3 color-aware smoothing to suppress single-pixel saliency speckle while preserving edges
function smoothProbMap(prob, lArr, aArr, bArr, size) {
  const out = new Float32Array(prob.length);
  for (let y = 0; y < size; y++) {
    const y0 = Math.max(0, y - 1);
    const y1 = Math.min(size - 1, y + 1);
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const x0 = Math.max(0, x - 1);
      const x1 = Math.min(size - 1, x + 1);
      const lc = lArr[idx], ac = aArr[idx], bc = bArr[idx];
      let wSum = 0;
      let pSum = 0;
      for (let ny = y0; ny <= y1; ny++) {
        for (let nx = x0; nx <= x1; nx++) {
          const nIdx = ny * size + nx;
          const dl = lc - lArr[nIdx];
          const da = ac - aArr[nIdx];
          const db = bc - bArr[nIdx];
          const diffSq = dl * dl * 0.5 + da * da + db * db;
          const w = 1 / (1 + diffSq * 0.004);
          wSum += w;
          pSum += prob[nIdx] * w;
        }
      }
      out[idx] = pSum / wSum;
    }
  }
  return out;
}

function computeGeodesic(seeds, lArr, aArr, bArr, size, colorWeight, prob = null) {
  const count = size * size;
  const dist = new Float32Array(count);
  dist.fill(1e6);
  const BUCKETS = 64;
  const buckets = Array.from({ length: BUCKETS + 1 }, () => []);
  let hasSeeds = false;
  for (let i = 0; i < count; i++) {
    if (seeds[i] >= 128) {
      dist[i] = 0;
      buckets[0].push(i);
      hasSeeds = true;
    }
  }
  const conn = new Float32Array(count);
  if (!hasSeeds) return conn;

  const dx = [-1, 1, 0, 0];
  const dy = [0, 0, -1, 1];
  for (let b = 0; b <= BUCKETS; b++) {
    const queue = buckets[b];
    for (let q = 0; q < queue.length; q++) {
      const cur = queue[q];
      const curDist = dist[cur];
      if (curDist > 1.05 || Math.min(BUCKETS, Math.floor(curDist * BUCKETS)) < b) continue;
      const cx = cur % size;
      const cy = (cur / size) | 0;
      const cl = lArr[cur], ca = aArr[cur], cb = bArr[cur];
      for (let k = 0; k < 4; k++) {
        const nx = cx + dx[k];
        const ny = cy + dy[k];
        if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
        const next = ny * size + nx;
        const dl = cl - lArr[next];
        const da = ca - aArr[next];
        const db = cb - bArr[next];
        const colorJump = Math.min(1, Math.sqrt(dl * dl * 0.5 + da * da + db * db) / 90);
        const bgPenalty = prob ? Math.max(0, 1 - prob[next]) : 0;
        const step = 0.015 + 0.24 * bgPenalty * bgPenalty + colorWeight * colorJump;
        const nd = curDist + step;
        if (nd < dist[next] && nd <= 1.05) {
          dist[next] = nd;
          buckets[Math.min(BUCKETS, Math.floor(nd * BUCKETS))].push(next);
        }
      }
    }
  }
  for (let i = 0; i < count; i++) {
    conn[i] = Math.max(0, Math.min(1, 1 - dist[i]));
  }
  return conn;
}

function extractLab(rgba, count) {
  const lArr = new Float32Array(count);
  const aArr = new Float32Array(count);
  const bArr = new Float32Array(count);
  for (let p = 0; p < count; p++) {
    const r = rgba[p * 4], g = rgba[p * 4 + 1], bl = rgba[p * 4 + 2];
    lArr[p] = 0.299 * r + 0.587 * g + 0.114 * bl;
    aArr[p] = r - g;
    bArr[p] = 0.5 * (r + g) - bl;
  }
  return { lArr, aArr, bArr };
}

function handleRefine(data) {
  const size = 320;
  const count = size * size;
  const baseMask = new Uint8Array(data.baseMask);
  const keepMask = new Uint8Array(data.keepMask);
  const eraseMask = new Uint8Array(data.eraseMask);

  let scene = cachedScene;
  if ((!scene || (data.sceneKey && scene.key !== data.sceneKey)) && data.rgba) {
    const { lArr, aArr, bArr } = extractLab(new Uint8ClampedArray(data.rgba), count);
    const baseProb = new Float32Array(count);
    for (let i = 0; i < count; i++) baseProb[i] = baseMask[i] / 255;
    scene = { key: data.sceneKey || "", lArr, aArr, bArr, baseProb, size };
    cachedScene = scene;
  }
  if (!scene) throw new Error("缺少选区图像缓存，请重新提取。");

  const { lArr, aArr, bArr, baseProb } = scene;
  const keepSeeds = [], eraseSeeds = [], bgCore = [];
  for (let i = 0; i < count; i++) {
    if (keepMask[i] >= 128) keepSeeds.push(i);
    else if (eraseMask[i] >= 128) eraseSeeds.push(i);
    else if (baseProb[i] < 0.12 && baseMask[i] < 48) bgCore.push(i);
  }

  const fgSupport = [];
  for (let i = 0; i < count; i++) {
    if (keepMask[i] >= 128 || (baseMask[i] >= 210 && eraseMask[i] < 64)) fgSupport.push(i);
  }
  const keepProtos = samplePrototypes(keepSeeds.length ? keepSeeds : fgSupport, lArr, aArr, bArr, 36);
  const eraseProtos = samplePrototypes(eraseSeeds.length ? eraseSeeds : bgCore, lArr, aArr, bArr, 36);
  const hasKeepColor = keepSeeds.length > 0 && keepProtos.length >= 2 && eraseProtos.length >= 2;
  const hasEraseColor = eraseSeeds.length > 0 && eraseProtos.length >= 2 && keepProtos.length >= 2;

  const keepGeo = keepSeeds.length ? computeGeodesic(keepMask, lArr, aArr, bArr, size, 0.38) : null;
  const eraseGeo = eraseSeeds.length ? computeGeodesic(eraseMask, lArr, aArr, bArr, size, 0.38) : null;

  const rawOut = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let p = baseMask[i] / 255;

    if (keepMask[i] >= 180) {
      p = 0.98;
    } else if (keepMask[i] >= 64) {
      p = Math.max(p, 0.85);
    } else if (keepGeo && keepGeo[i] > 0.32) {
      const kInf = (keepGeo[i] - 0.32) / 0.68;
      let colorSupport = baseProb[i];
      if (hasKeepColor) {
        const dKeep = minColorDist(lArr[i], aArr[i], bArr[i], keepProtos);
        const dBg = minColorDist(lArr[i], aArr[i], bArr[i], eraseProtos);
        colorSupport = Math.max(colorSupport, dBg / (dKeep + dBg + 1));
      }
      if (colorSupport > 0.45) {
        p = Math.max(p, Math.min(0.95, p + kInf * (colorSupport - 0.35) * 1.15));
      }
    }

    if (eraseMask[i] >= 180) {
      p = 0.02;
    } else if (eraseMask[i] >= 64) {
      p = Math.min(p, 0.14);
    } else if (eraseGeo && eraseGeo[i] > 0.36 && keepMask[i] < 64) {
      const eInf = (eraseGeo[i] - 0.36) / 0.64;
      if (hasEraseColor) {
        const dErase = minColorDist(lArr[i], aArr[i], bArr[i], eraseProtos);
        const dKeep = minColorDist(lArr[i], aArr[i], bArr[i], keepProtos);
        const eraseBias = dKeep / (dErase + dKeep + 1);
        if (eraseBias > 0.56) {
          p *= Math.max(0.05, 1 - eInf * (eraseBias - 0.42) * 1.35);
        }
      }
    }
    rawOut[i] = Math.max(0, Math.min(1, p));
  }

  const smoothed = smoothProbMap(rawOut, lArr, aArr, bArr, size);
  const mask = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    let val = smoothed[i];
    if (keepMask[i] >= 180) val = Math.max(val, 0.96);
    if (eraseMask[i] >= 180) val = Math.min(val, 0.03);
    mask[i] = Math.max(0, Math.min(255, Math.round(val * 255)));
  }
  self.postMessage({ mask: mask.buffer, id: data.id }, [mask.buffer]);
}

function handleMatte(data) {
  const rgb = new Uint8ClampedArray(data.rgbBuffer);
  const alpha = new Uint8ClampedArray(data.alphaBuffer);
  const res = self.CameraMatting.matteSubject(
    rgb, alpha, data.w, data.h, data.radius, data.filterRadius, data.borderPad
  );
  self.postMessage({
    id: data.id,
    w: data.w,
    h: data.h,
    outW: res.outW,
    outH: res.outH,
    alphaBuffer: res.alphaData.buffer,
    subjectBuffer: res.subjectRgba.buffer,
    outlineBuffer: res.outlineRgba.buffer
  }, [res.alphaData.buffer, res.subjectRgba.buffer, res.outlineRgba.buffer]);
}

async function ensureSession(reqId) {
  if (session) return session;
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const response = await fetch("assets/inference/manifest.json");
      if (!response.ok) throw new Error("抠图模型尚未准备，请稍后重试。");
      manifest = await response.json();
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.wasmPaths = new URL("assets/inference/", self.location.href).href;
      ort.env.wasm.wasmBinary = await binary("ort-wasm-simd-threaded.wasm", "加载抠图引擎", reqId);
      const model = await binary("u2netp.onnx", "下载抠图模型", reqId);
      self.postMessage({ id: reqId, phase: "正在准备本地模型" });
      session = await ort.InferenceSession.create(model, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      return session;
    })().catch(error => {
      sessionPromise = null;
      throw error;
    });
  }
  return sessionPromise;
}

async function processMessage(dataPayload) {
  const reqId = dataPayload.id;
  try {
    if (dataPayload.type === "refine") {
      handleRefine(dataPayload);
      return;
    }
    if (dataPayload.type === "matte") {
      handleMatte(dataPayload);
      return;
    }
    await ensureSession(reqId);
    self.postMessage({ id: reqId, phase: "正在精修主体轮廓" });
    const rgba = new Uint8ClampedArray(dataPayload.rgba);
    const brush = dataPayload.brushMask ? new Uint8Array(dataPayload.brushMask) : null;
    const size = 320;
    const count = size * size;
    let maximum = 1;
    for (let i = 0; i < rgba.length; i += 4) maximum = Math.max(maximum, rgba[i], rgba[i + 1], rgba[i + 2]);
    const denom = Math.max(128, maximum);
    const data = new Float32Array(count * 3);
    const mean = [.485, .456, .406];
    const deviation = [.229, .224, .225];
    const { lArr, aArr, bArr } = extractLab(rgba, count);
    for (let p = 0; p < count; p++) {
      data[p] = (rgba[p * 4] / denom - mean[0]) / deviation[0];
      data[count + p] = (rgba[p * 4 + 1] / denom - mean[1]) / deviation[1];
      data[count * 2 + p] = (rgba[p * 4 + 2] / denom - mean[2]) / deviation[2];
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

      const needsSigmoid = low < -0.05 || high > 1.05;
      const rawProb = new Float32Array(count);
      let pLow = 1, pHigh = 0;
      for (let i = 0; i < count; i++) {
        const v = needsSigmoid ? 1 / (1 + Math.exp(-values[i])) : Math.max(0, Math.min(1, values[i]));
        rawProb[i] = v;
        if (v < pLow) pLow = v;
        if (v > pHigh) pHigh = v;
      }
      if (pHigh > 0.25 && pHigh < 0.92 && (pHigh - pLow) > 0.15) {
        const floor = Math.min(0.15, pLow);
        const span = pHigh - floor;
        for (let i = 0; i < count; i++) {
          rawProb[i] = Math.max(0, Math.min(1, (rawProb[i] - floor) / span));
        }
      }

      const prob = smoothProbMap(rawProb, lArr, aArr, bArr, size);
      cachedScene = { key: dataPayload.sceneKey || "", lArr, aArr, bArr, baseProb: prob, size };
      const mask = new Uint8Array(count);

      if (!brush) {
        for (let i = 0; i < count; i++) {
          mask[i] = Math.max(0, Math.min(255, Math.round(prob[i] * 255)));
        }
      } else {
        const fgIndices = [];
        const fgFallbackIndices = [];
        const bgIndices = [];
        for (let i = 0; i < count; i++) {
          if (brush[i] >= 128) {
            fgFallbackIndices.push(i);
            if (prob[i] > 0.28) fgIndices.push(i);
          } else if (brush[i] === 0 && prob[i] < 0.20) {
            bgIndices.push(i);
          }
        }
        if (fgIndices.length < 16 && fgFallbackIndices.length) {
          fgIndices.push(...fgFallbackIndices);
        }
        if (bgIndices.length < 24) {
          for (let i = 0; i < count; i++) {
            if (brush[i] === 0 && prob[i] < 0.35) bgIndices.push(i);
          }
        }
        const fgProtos = samplePrototypes(fgIndices, lArr, aArr, bArr, 36);
        const bgProtos = samplePrototypes(bgIndices, lArr, aArr, bArr, 48);
        const hasColor = fgProtos.length >= 3 && bgProtos.length >= 3;
        const conn = computeGeodesic(brush, lArr, aArr, bArr, size, 0.06, prob);

        for (let i = 0; i < count; i++) {
          let p = prob[i];
          const c = conn[i];
          if (hasColor) {
            const dFg = minColorDist(lArr[i], aArr[i], bArr[i], fgProtos);
            const dBg = minColorDist(lArr[i], aArr[i], bArr[i], bgProtos);
            const colorScore = dBg / (dFg + dBg + 1);
            if (brush[i] >= 180) {
              p = Math.max(p, 0.45 + 0.45 * colorScore);
            } else if (brush[i] > 0) {
              p = Math.max(p, 0.55 * p + 0.45 * colorScore);
            } else {
              const connGate = Math.min(1, c * 1.45);
              p = p * (0.12 + 0.88 * connGate);
              if (c > 0.55 && p > 0.18 && p < 0.72) {
                p = 0.78 * p + 0.22 * colorScore;
              }
            }
          } else if (brush[i] >= 180) {
            p = Math.max(p, 0.78);
          } else {
            p = p * (0.15 + 0.85 * Math.min(1, c * 1.45));
          }
          mask[i] = Math.max(0, Math.min(255, Math.round(p * 255)));
        }
      }
      self.postMessage({ mask: mask.buffer, id: reqId }, [mask.buffer]);
    } finally {
      tensor.dispose();
      for (const value of Object.values(output || {})) value.dispose();
    }
  } catch (error) {
    self.postMessage({ id: reqId, error: /[\u4e00-\u9fff]/.test(error.message) ? error.message : "抠图模型加载失败，请检查网络后重试。" });
  }
}

self.onmessage = event => {
  const dataPayload = event.data || {};
  taskQueue = taskQueue.then(() => processMessage(dataPayload));
};

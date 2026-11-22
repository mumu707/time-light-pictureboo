"use strict";

window.CameraCutout = (() => {
  const SIZE = 320;

  function canvas(width, height) {
    const node = document.createElement("canvas");
    node.width = Math.max(1, Math.round(width));
    node.height = Math.max(1, Math.round(height));
    return node;
  }

  async function prepare(photo) {
    const image = await CameraPhoto.load(photo.blob);
    const scale = Math.min(1, 1024 / Math.max(image.width, image.height));
    const result = canvas(image.width * scale, image.height * scale);
    result.getContext("2d").drawImage(image, 0, 0, result.width, result.height);
    // Calculate on the original dimensions, then scale, matching the saved paper exactly.
    const paper = CameraPaper.layout(image.width, image.height, photo.paper);
    return { image: result, region: {
      x: paper.side / image.width, y: paper.top / image.height,
      width: (image.width - paper.side * 2) / image.width,
      height: (image.height - paper.top - paper.bottom) / image.height
    } };
  }

  function fillInteriorHoles(mask) {
    const total = SIZE * SIZE;
    const exterior = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0, tail = 0;
    const seedIfHole = idx => {
      if (mask[idx] < 64 && !exterior[idx]) {
        exterior[idx] = 1;
        queue[tail++] = idx;
      }
    };
    for (let x = 0; x < SIZE; x++) {
      seedIfHole(x);
      seedIfHole((SIZE - 1) * SIZE + x);
    }
    for (let y = 0; y < SIZE; y++) {
      seedIfHole(y * SIZE);
      seedIfHole(y * SIZE + SIZE - 1);
    }
    while (head < tail) {
      const cur = queue[head++];
      const x = cur % SIZE, y = (cur / SIZE) | 0;
      if (x > 0) seedIfHole(cur - 1);
      if (x + 1 < SIZE) seedIfHole(cur + 1);
      if (y > 0) seedIfHole(cur - SIZE);
      if (y + 1 < SIZE) seedIfHole(cur + SIZE);
    }
    // Group non-exterior low-alpha regions; fill enclosed holes < 450px
    const holeVis = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
      if (mask[i] >= 64 || exterior[i] || holeVis[i]) continue;
      let h = 0, t = 1;
      queue[0] = i;
      holeVis[i] = 1;
      while (h < t) {
        const cur = queue[h++];
        const x = cur % SIZE, y = (cur / SIZE) | 0;
        if (x > 0 && mask[cur - 1] < 64 && !exterior[cur - 1] && !holeVis[cur - 1]) { holeVis[cur - 1] = 1; queue[t++] = cur - 1; }
        if (x + 1 < SIZE && mask[cur + 1] < 64 && !exterior[cur + 1] && !holeVis[cur + 1]) { holeVis[cur + 1] = 1; queue[t++] = cur + 1; }
        if (y > 0 && mask[cur - SIZE] < 64 && !exterior[cur - SIZE] && !holeVis[cur - SIZE]) { holeVis[cur - SIZE] = 1; queue[t++] = cur - SIZE; }
        if (y + 1 < SIZE && mask[cur + SIZE] < 64 && !exterior[cur + SIZE] && !holeVis[cur + SIZE]) { holeVis[cur + SIZE] = 1; queue[t++] = cur + SIZE; }
      }
      if (t <= 36) {
        for (let k = 0; k < t; k++) mask[queue[k]] = Math.max(mask[queue[k]], 235);
      }
    }
  }

  function components(mask, brushMask) {
    fillInteriorHoles(mask);
    const labels = new Int32Array(mask.length);
    const queue = new Int32Array(mask.length);
    const choices = [];
    let label = 0;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] < 64 || labels[i]) continue;
      label++;
      let head = 0;
      let tail = 1;
      queue[0] = i;
      labels[i] = label;
      let left = SIZE, top = SIZE, right = 0, bottom = 0;
      let brushHits = 0;
      while (head < tail) {
        const index = queue[head++];
        if (brushMask && brushMask[index] >= 64) brushHits++;
        const x = index % SIZE;
        const y = (index / SIZE) | 0;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
            const next = ny * SIZE + nx;
            if (!labels[next] && mask[next] >= 64) {
              labels[next] = label;
              queue[tail++] = next;
            }
          }
        }
      }
      if (tail >= 100) choices.push({ label, area: tail, brushHits, left, top, right, bottom });
    }
    choices.sort((a, b) => brushMask
      ? (b.brushHits * 4 + b.area) - (a.brushHits * 4 + a.area)
      : b.area - a.area);
    if (!choices.length || choices[0].area > mask.length * .985) throw new Error("主体轮廓不够清楚，请涂抹物体后重试。");
    return { mask, labels, choices: choices.slice(0, 8) };
  }

  function buildUnifiedSelection(mask, region, sceneKey) {
    let left = SIZE, top = SIZE, right = 0, bottom = 0, area = 0;
    const labels = new Int32Array(mask.length);
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] < 64) continue;
      labels[i] = 1;
      area++;
      const x = i % SIZE;
      const y = (i / SIZE) | 0;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
    if (area < 40) throw new Error("当前选区过小，请用「保留 +」涂抹需要提取的物体。");
    return {
      mask,
      labels,
      choices: [{ label: 1, area, brushHits: 0, left, top, right, bottom }],
      region,
      sceneKey,
      refined: true
    };
  }

  function extractBaseMask(result, label) {
    const out = new Uint8Array(SIZE * SIZE);
    if (!result?.mask || !result?.labels) return out;
    for (let i = 0; i < out.length; i++) {
      if (result.labels[i] === label) out[i] = result.mask[i];
    }
    return out;
  }

  function runner() {
    let worker;
    let pending;
    let reqCounter = 0;
    let sceneCounter = 0;

    function abortPending() {
      if (pending) {
        pending.reject(new DOMException("已取消", "AbortError"));
        pending = undefined;
      }
      reqCounter++;
    }

    function cancel() {
      worker?.terminate();
      worker = undefined;
      abortPending();
    }

    function postWorker(msg, transfers, onProgress) {
      abortPending();
      const reqId = reqCounter;
      if (!worker) worker = new Worker("segmentation-worker.js");
      msg.id = reqId;
      return new Promise((resolve, reject) => {
        pending = { id: reqId, reject };
        worker.onmessage = event => {
          if (event.data.id && event.data.id !== reqId) return;
          if (event.data.phase) { onProgress?.(event.data); return; }
          pending = undefined;
          if (event.data.error) { reject(new Error(event.data.error)); return; }
          resolve(event.data);
        };
        worker.onerror = () => {
          const active = pending;
          pending = undefined;
          cancel();
          (active ? active.reject : reject)(new Error("抠图引擎暂时无法加载，请重新提取。"));
        };
        worker.postMessage(msg, transfers);
      });
    }

    function sampleRegionRgba(image, region) {
      const input = canvas(SIZE, SIZE);
      input.getContext("2d").drawImage(image, region.x * image.width, region.y * image.height,
        region.width * image.width, region.height * image.height, 0, 0, SIZE, SIZE);
      return input.getContext("2d").getImageData(0, 0, SIZE, SIZE).data;
    }

    async function infer(image, region, progress, brushMask) {
      const rgba = sampleRegionRgba(image, region);
      let regionBrush;
      if (brushMask && brushMask.length === SIZE * SIZE) {
        regionBrush = new Uint8Array(SIZE * SIZE);
        for (let y = 0; y < SIZE; y++) {
          const sy = Math.min(SIZE - 1, Math.max(0, Math.round((region.y + (y + 0.5) / SIZE * region.height) * SIZE)));
          for (let x = 0; x < SIZE; x++) {
            const sx = Math.min(SIZE - 1, Math.max(0, Math.round((region.x + (x + 0.5) / SIZE * region.width) * SIZE)));
            regionBrush[y * SIZE + x] = brushMask[sy * SIZE + sx];
          }
        }
      }
      const sceneKey = `scene-${++sceneCounter}`;
      const msg = { type: "infer", sceneKey, rgba: rgba.buffer };
      const transfers = [rgba.buffer];
      if (regionBrush) {
        msg.brushMask = regionBrush.buffer;
        transfers.push(regionBrush.buffer);
      }
      const res = await postWorker(msg, transfers, progress);
      return { ...components(new Uint8Array(res.mask), regionBrush), region, sceneKey };
    }

    async function refine(image, region, sceneKey, baseMask, keepMask, eraseMask) {
      const rgba = sampleRegionRgba(image, region);
      const baseCopy = new Uint8Array(baseMask);
      const keepCopy = new Uint8Array(keepMask);
      const eraseCopy = new Uint8Array(eraseMask);
      const msg = {
        type: "refine",
        sceneKey,
        rgba: rgba.buffer,
        baseMask: baseCopy.buffer,
        keepMask: keepCopy.buffer,
        eraseMask: eraseCopy.buffer
      };
      const res = await postWorker(msg, [rgba.buffer, baseCopy.buffer, keepCopy.buffer, eraseCopy.buffer]);
      return buildUnifiedSelection(new Uint8Array(res.mask), region, sceneKey);
    }

    function matte(rgbData, alphaData, w, h, radius, filterRadius, borderPad) {
      const rgbCopy = new Uint8ClampedArray(rgbData);
      const alphaCopy = new Uint8ClampedArray(alphaData);
      return postWorker({
        type: "matte",
        rgbBuffer: rgbCopy.buffer,
        alphaBuffer: alphaCopy.buffer,
        w, h, radius, filterRadius, borderPad
      }, [rgbCopy.buffer, alphaCopy.buffer]);
    }

    return { infer, refine, matte, abortPending, cancel };
  }

  function prepareComposePlan(image, result, label) {
    const { mask, labels, region } = result;
    const choice = result.choices.find(item => item.label === label);
    if (!choice) throw new Error("请选择主体。");

    const lowMask = canvas(SIZE, SIZE);
    const maskContext = lowMask.getContext("2d");
    const pixels = maskContext.createImageData(SIZE, SIZE);
    for (let i = 0; i < mask.length; i++) {
      pixels.data[i * 4] = pixels.data[i * 4 + 1] = pixels.data[i * 4 + 2] = 255;
      pixels.data[i * 4 + 3] = labels[i] === label ? mask[i] : 0;
    }
    maskContext.putImageData(pixels, 0, 0);

    const alpha = canvas(image.width, image.height);
    const alphaCtx = alpha.getContext("2d");
    alphaCtx.drawImage(lowMask, region.x * image.width, region.y * image.height,
      region.width * image.width, region.height * image.height);

    const subjW = Math.max(1, ((choice.right - choice.left + 1) / SIZE) * region.width * image.width);
    const subjH = Math.max(1, ((choice.bottom - choice.top + 1) / SIZE) * region.height * image.height);
    const radius = Math.max(9, Math.min(28, Math.round(Math.min(subjW, subjH) * 0.045)));
    const borderPad = radius + 4;
    const filterRadius = Math.max(2, Math.min(5, Math.round(Math.min(subjW, subjH) * 0.008)));
    const srcPad = Math.max(4, filterRadius * 2);

    const srcX = Math.max(0, Math.floor((region.x + choice.left / SIZE * region.width) * image.width - srcPad));
    const srcY = Math.max(0, Math.floor((region.y + choice.top / SIZE * region.height) * image.height - srcPad));
    const srcRight = Math.min(image.width, Math.ceil((region.x + (choice.right + 1) / SIZE * region.width) * image.width + srcPad));
    const srcBottom = Math.min(image.height, Math.ceil((region.y + (choice.bottom + 1) / SIZE * region.height) * image.height + srcPad));
    const srcW = Math.max(1, srcRight - srcX);
    const srcH = Math.max(1, srcBottom - srcY);

    const workScale = Math.min(1, 640 / Math.max(srcW, srcH));
    const workW = Math.max(1, Math.round(srcW * workScale));
    const workH = Math.max(1, Math.round(srcH * workScale));
    const workRadius = Math.max(4, Math.round(radius * workScale));
    const workBorderPad = workRadius + Math.max(3, Math.round(4 * workScale));
    const workFilterR = Math.max(2, Math.min(5, Math.round(filterRadius * workScale)));

    const workRgbCanvas = canvas(workW, workH);
    workRgbCanvas.getContext("2d").drawImage(image, srcX, srcY, srcW, srcH, 0, 0, workW, workH);
    const workRgbData = workRgbCanvas.getContext("2d").getImageData(0, 0, workW, workH).data;

    const workAlphaCanvas = canvas(workW, workH);
    workAlphaCanvas.getContext("2d").drawImage(alpha, srcX, srcY, srcW, srcH, 0, 0, workW, workH);
    const workAlphaData = workAlphaCanvas.getContext("2d").getImageData(0, 0, workW, workH).data;

    return {
      alpha, alphaCtx,
      srcX, srcY, srcW, srcH, radius,
      x: srcX - borderPad, y: srcY - borderPad,
      width: srcW + borderPad * 2, height: srcH + borderPad * 2,
      workW, workH, workScale, workRadius, workBorderPad, workFilterR,
      workRgbData, workAlphaData
    };
  }

  function finalizeCompose(image, plan, matteRes) {
    const {
      alpha, alphaCtx, srcX, srcY, srcW, srcH, radius,
      x, y, width, height, workW, workH, workScale, workBorderPad
    } = plan;

    const workAlphaCanvas = canvas(workW, workH);
    workAlphaCanvas.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(matteRes.alphaData), workW, workH), 0, 0);

    alphaCtx.clearRect(srcX, srcY, srcW, srcH);
    alphaCtx.drawImage(workAlphaCanvas, 0, 0, workW, workH, srcX, srcY, srcW, srcH);

    const cropSubject = canvas(srcW, srcH);
    const cropSubjectCtx = cropSubject.getContext("2d");
    if (workScale === 1) {
      cropSubjectCtx.putImageData(new ImageData(new Uint8ClampedArray(matteRes.subjectRgba), srcW, srcH), 0, 0);
    } else {
      cropSubjectCtx.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      cropSubjectCtx.globalCompositeOperation = "destination-in";
      cropSubjectCtx.drawImage(workAlphaCanvas, 0, 0, workW, workH, 0, 0, srcW, srcH);
    }

    const workOutlineCanvas = canvas(matteRes.outW, matteRes.outH);
    workOutlineCanvas.getContext("2d").putImageData(
      new ImageData(new Uint8ClampedArray(matteRes.outlineRgba), matteRes.outW, matteRes.outH), 0, 0
    );

    const cropOutline = canvas(width, height);
    cropOutline.getContext("2d").drawImage(workOutlineCanvas, 0, 0, matteRes.outW, matteRes.outH, 0, 0, width, height);

    const sticker = canvas(width, height);
    const stickerContext = sticker.getContext("2d");
    stickerContext.drawImage(cropOutline, 0, 0);
    stickerContext.drawImage(cropSubject, (width - srcW) / 2, (height - srcH) / 2);

    const full = canvas(image.width, image.height);
    const fullContext = full.getContext("2d");
    fullContext.drawImage(image, 0, 0);
    fullContext.save();
    fullContext.shadowColor = "#211c2670";
    fullContext.shadowBlur = radius * 0.55;
    fullContext.shadowOffsetY = radius * 0.35;
    fullContext.drawImage(cropOutline, x, y);
    fullContext.restore();
    fullContext.drawImage(cropSubject, srcX, srcY);

    return {
      full, sticker, alpha,
      bounds: { x: x / image.width, y: y / image.height, width: width / image.width, height: height / image.height }
    };
  }

  function compose(image, result, label) {
    const plan = prepareComposePlan(image, result, label);
    const matteRes = window.CameraMatting.matteSubject(
      plan.workRgbData, plan.workAlphaData, plan.workW, plan.workH,
      plan.workRadius, plan.workFilterR, plan.workBorderPad
    );
    return finalizeCompose(image, plan, matteRes);
  }

  async function composeAsync(activeRunner, image, result, label) {
    if (!activeRunner?.matte) return compose(image, result, label);
    const plan = prepareComposePlan(image, result, label);
    const res = await activeRunner.matte(
      plan.workRgbData, plan.workAlphaData, plan.workW, plan.workH,
      plan.workRadius, plan.workFilterR, plan.workBorderPad
    );
    return finalizeCompose(image, plan, {
      alphaData: res.alphaBuffer,
      subjectRgba: res.subjectBuffer,
      outlineRgba: res.outlineBuffer,
      outW: res.outW,
      outH: res.outH
    });
  }

  function suggestTags(stickerCanvas) {
    if (!stickerCanvas) return { purpose: "toy", category: "其他", tags: ["可可爱爱", "日常小物"] };
    const sample = canvas(48, 48);
    sample.getContext("2d").drawImage(stickerCanvas, 0, 0, 48, 48);
    const pixels = sample.getContext("2d").getImageData(0, 0, 48, 48).data;
    let count = 0, greenCount = 0, warmCount = 0, brightCount = 0, flowerCount = 0, darkCount = 0, satSum = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 140) continue;
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const lum = (r + g + b) / 3;
      const sat = max ? (max - min) / max : 0;
      count++;
      satSum += sat;
      if (g > r * 1.08 && g > b * 1.12) greenCount++;
      if (r > 180 && g > 130 && b < 130) warmCount++;
      if (lum > 205) brightCount++;
      if (lum < 75) darkCount++;
      if (r > b * 1.18 && r > g * 1.05 && sat > 0.25) flowerCount++;
    }
    const aspect = stickerCanvas.width / Math.max(1, stickerCanvas.height);
    if (!count) return { purpose: "ornament", category: "其他", tags: ["奇思妙想", "日常小物"] };
    const greenRatio = greenCount / count;
    const warmRatio = warmCount / count;
    const brightRatio = brightCount / count;
    const flowerRatio = flowerCount / count;
    const avgSat = satSum / count;
    if (greenRatio > 0.24) return { purpose: "plant", category: "植物", tags: ["绿意盎然", "治愈角落"] };
    if (flowerRatio > 0.26 && brightRatio > 0.2) return { purpose: "flower", category: "花卉", tags: ["可可爱爱", "亮晶晶"] };
    if (brightRatio > 0.42 && warmRatio > 0.22) return { purpose: "lamp", category: "灯饰", tags: ["暖呼呼", "闪闪发光"] };
    if (warmRatio > 0.34) return { purpose: "food", category: "食物", tags: ["香气扑鼻", "暖呼呼"] };
    if (aspect > 1.45) return { purpose: "furniture", category: "家具", tags: ["治愈角落", "日常小物"] };
    if (darkCount / count > 0.38 && avgSat < 0.22) return { purpose: "retro", category: "复古", tags: ["复古怀旧", "古灵精怪"] };
    if (avgSat > 0.28) return { purpose: "toy", category: "玩具", tags: ["古灵精怪", "可可爱爱"] };
    return { purpose: "tableware", category: "器物", tags: ["日常小物", "治愈角落"] };
  }

  function cloudImage(image, maxSide) {
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const result = canvas(image.width * scale, image.height * scale);
    const context = result.getContext("2d");
    context.fillStyle = "#eee8dd";
    context.fillRect(0, 0, result.width, result.height);
    context.drawImage(image, 0, 0, result.width, result.height);
    return result.toDataURL("image/jpeg", .85);
  }

  function compactMask(alphaCanvas, maxSide = 480) {
    const scale = Math.min(1, maxSide / Math.max(alphaCanvas.width, alphaCanvas.height));
    if (scale >= 1) return CameraPhoto.encode(alphaCanvas, "image/png");
    const result = canvas(alphaCanvas.width * scale, alphaCanvas.height * scale);
    result.getContext("2d").drawImage(alphaCanvas, 0, 0, result.width, result.height);
    return CameraPhoto.encode(result, "image/png");
  }

  /** Render remove.bg-style darkened background mask + high-contrast contour outline onto targetCanvas. */
  function renderSelectionContour(image, result, label, targetCanvas) {
    const w = Math.max(1, Math.min(480, image.width));
    const h = Math.max(1, Math.round(image.height * (w / image.width)));
    const lowMask = canvas(SIZE, SIZE);
    const maskCtx = lowMask.getContext("2d");
    const maskImg = maskCtx.createImageData(SIZE, SIZE);
    for (let i = 0; i < result.mask.length; i++) {
      maskImg.data[i * 4] = maskImg.data[i * 4 + 1] = maskImg.data[i * 4 + 2] = 255;
      maskImg.data[i * 4 + 3] = result.labels[i] === label ? result.mask[i] : 0;
    }
    maskCtx.putImageData(maskImg, 0, 0);

    const alphaSmall = canvas(w, h);
    const aCtx = alphaSmall.getContext("2d");
    aCtx.drawImage(lowMask, result.region.x * w, result.region.y * h, result.region.width * w, result.region.height * h);
    const aData = aCtx.getImageData(0, 0, w, h).data;

    const overlay = canvas(w, h);
    const oCtx = overlay.getContext("2d");
    const oImg = oCtx.createImageData(w, h);
    const out = oImg.data;
    const inside = (px, py) => (px >= 0 && py >= 0 && px < w && py < h && aData[(py * w + px) * 4 + 3] >= 128);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const a = aData[i + 3];
        const fg = a >= 128;
        let isOuterRim = false;
        let isInnerRim = false;
        if (fg) {
          isInnerRim = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        } else {
          isOuterRim = inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1);
        }
        if (isInnerRim) {
          out[i] = 255; out[i + 1] = 228; out[i + 2] = 148; out[i + 3] = 245;
        } else if (isOuterRim) {
          out[i] = 26; out[i + 1] = 20; out[i + 2] = 15; out[i + 3] = 215;
        } else if (!fg) {
          const checker = (((x >> 3) + (y >> 3)) & 1) ? 14 : 26;
          out[i] = checker; out[i + 1] = checker - 2; out[i + 2] = checker - 4;
          out[i + 3] = Math.round((1 - a / 255) * 155);
        }
      }
    }
    oCtx.putImageData(oImg, 0, 0);

    targetCanvas.width = image.width;
    targetCanvas.height = image.height;
    const tCtx = targetCanvas.getContext("2d");
    tCtx.drawImage(image, 0, 0);
    tCtx.drawImage(overlay, 0, 0, image.width, image.height);
  }

  function thumbnail(image) {
    const scale = Math.min(1, 220 / Math.max(image.width, image.height));
    const result = canvas(image.width * scale, image.height * scale);
    result.getContext("2d").drawImage(image, 0, 0, result.width, result.height);
    return CameraPhoto.encode(result, "image/png");
  }

  return {
    prepare, runner, compose, composeAsync, extractBaseMask,
    renderSelectionContour, compactMask, suggestTags, cloudImage, thumbnail
  };
})();

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
      if (t < 450) {
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

  function runner() {
    let worker;
    let pending;
    let reqCounter = 0;
    function cancel() {
      worker?.terminate();
      worker = undefined;
      pending?.reject(new DOMException("已取消", "AbortError"));
      pending = undefined;
    }
    function infer(image, region, progress, brushMask) {
      if (pending) {
        pending.reject(new DOMException("已取消", "AbortError"));
        pending = undefined;
      }
      const reqId = ++reqCounter;
      const input = canvas(SIZE, SIZE);
      input.getContext("2d").drawImage(image, region.x * image.width, region.y * image.height,
        region.width * image.width, region.height * image.height, 0, 0, SIZE, SIZE);
      const rgba = input.getContext("2d").getImageData(0, 0, SIZE, SIZE).data;
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
      if (!worker) worker = new Worker("segmentation-worker.js");
      return new Promise((resolve, reject) => {
        pending = { id: reqId, reject };
        worker.onmessage = event => {
          if (event.data.phase) { progress(event.data); return; }
          if (event.data.id && event.data.id !== reqId) return;
          pending = undefined;
          if (event.data.error) { reject(new Error(event.data.error)); return; }
          try { resolve({ ...components(new Uint8Array(event.data.mask), regionBrush), region }); }
          catch (error) { reject(error); }
        };
        worker.onerror = () => { cancel(); reject(new Error("抠图引擎暂时无法加载，请重新提取。")); };
        const msg = { id: reqId, rgba: rgba.buffer };
        const transfers = [rgba.buffer];
        if (regionBrush) {
          msg.brushMask = regionBrush.buffer;
          transfers.push(regionBrush.buffer);
        }
        worker.postMessage(msg, transfers);
      });
    }
    return { infer, cancel };
  }

  // Separable O(N) box filter for Fast Guided Filter alpha edge matting
  function boxFilter(src, w, h, r) {
    const tmp = new Float32Array(w * h);
    const dst = new Float32Array(w * h);
    const span = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let dx = -r; dx <= r; dx++) sum += src[row + Math.max(0, Math.min(w - 1, dx))];
      tmp[row] = sum / span;
      for (let x = 1; x < w; x++) {
        sum += src[row + Math.min(w - 1, x + r)] - src[row + Math.max(0, x - r - 1)];
        tmp[row + x] = sum / span;
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let dy = -r; dy <= r; dy++) sum += tmp[Math.max(0, Math.min(h - 1, dy)) * w + x];
      dst[x] = sum / span;
      for (let y = 1; y < h; y++) {
        sum += tmp[Math.min(h - 1, y + r) * w + x] - tmp[Math.max(0, y - r - 1) * w + x];
        dst[y * w + x] = sum / span;
      }
    }
    return dst;
  }

  function guidedFilterAlpha(rgbData, alphaData, w, h, r, eps) {
    const n = w * h;
    const I = new Float32Array(n);
    const p = new Float32Array(n);
    const II = new Float32Array(n);
    const Ip = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const lum = 0.299 * rgbData[i * 4] + 0.587 * rgbData[i * 4 + 1] + 0.114 * rgbData[i * 4 + 2];
      const val = alphaData[i * 4 + 3];
      I[i] = lum;
      p[i] = val;
      II[i] = lum * lum;
      Ip[i] = lum * val;
    }
    const meanI = boxFilter(I, w, h, r);
    const meanP = boxFilter(p, w, h, r);
    const meanII = boxFilter(II, w, h, r);
    const meanIp = boxFilter(Ip, w, h, r);
    const a = new Float32Array(n);
    const b = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const varI = meanII[i] - meanI[i] * meanI[i];
      const covIp = meanIp[i] - meanI[i] * meanP[i];
      const ak = covIp / (varI + eps);
      a[i] = ak;
      b[i] = meanP[i] - ak * meanI[i];
    }
    const meanA = boxFilter(a, w, h, r);
    const meanB = boxFilter(b, w, h, r);
    for (let i = 0; i < n; i++) {
      let q = meanA[i] * I[i] + meanB[i];
      // Clean soft halo while preserving crisp object edges
      if (q <= 34) q = 0;
      else if (q >= 224) q = 255;
      else {
        const t = (q - 34) / 190;
        q = Math.round(t * t * (3 - 2 * t) * 255);
      }
      alphaData[i * 4] = alphaData[i * 4 + 1] = alphaData[i * 4 + 2] = 255;
      alphaData[i * 4 + 3] = q;
    }
  }

  function compose(image, result, label) {
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

    const radius = Math.max(3, Math.min(image.width, image.height) * .009);
    const padding = radius * 2;
    const x = Math.max(0, Math.floor((region.x + choice.left / SIZE * region.width) * image.width - padding));
    const y = Math.max(0, Math.floor((region.y + choice.top / SIZE * region.height) * image.height - padding));
    const width = Math.max(1, Math.min(image.width - x, Math.ceil((choice.right - choice.left + 1) / SIZE * region.width * image.width + padding * 2)));
    const height = Math.max(1, Math.min(image.height - y, Math.ceil((choice.bottom - choice.top + 1) / SIZE * region.height * image.height + padding * 2)));

    // Run Fast Guided Filter edge matting strictly on the cropped patch
    const cropRgbCanvas = canvas(width, height);
    const cropRgbCtx = cropRgbCanvas.getContext("2d");
    cropRgbCtx.drawImage(image, x, y, width, height, 0, 0, width, height);
    const cropRgbData = cropRgbCtx.getImageData(0, 0, width, height).data;
    const cropAlphaImg = alphaCtx.getImageData(x, y, width, height);
    const filterRadius = Math.max(2, Math.min(10, Math.round(Math.min(width, height) * .014)));
    guidedFilterAlpha(cropRgbData, cropAlphaImg.data, width, height, filterRadius, 850);
    alphaCtx.putImageData(cropAlphaImg, x, y);

    const cropAlphaCanvas = canvas(width, height);
    cropAlphaCanvas.getContext("2d").putImageData(cropAlphaImg, 0, 0);

    const cropSubject = canvas(width, height);
    const cropSubjectCtx = cropSubject.getContext("2d");
    cropSubjectCtx.drawImage(cropRgbCanvas, 0, 0);
    cropSubjectCtx.globalCompositeOperation = "destination-in";
    cropSubjectCtx.drawImage(cropAlphaCanvas, 0, 0);

    // Cropped paper outline (much faster than full-image 24x drawImage)
    const cropOutline = canvas(width, height);
    const border = cropOutline.getContext("2d");
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      border.drawImage(cropAlphaCanvas, Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    border.globalCompositeOperation = "source-in";
    border.fillStyle = "#fffaf0";
    border.fillRect(0, 0, width, height);

    const sticker = canvas(width, height);
    const stickerContext = sticker.getContext("2d");
    stickerContext.drawImage(cropOutline, 0, 0);
    stickerContext.drawImage(cropSubject, 0, 0);

    const full = canvas(image.width, image.height);
    const fullContext = full.getContext("2d");
    fullContext.drawImage(image, 0, 0);
    fullContext.save();
    fullContext.shadowColor = "#211c2670";
    fullContext.shadowBlur = radius * .6;
    fullContext.shadowOffsetY = radius * .4;
    fullContext.drawImage(cropOutline, x, y);
    fullContext.restore();
    fullContext.drawImage(cropSubject, x, y);

    return { full, sticker, alpha, bounds: { x: x / image.width, y: y / image.height, width: width / image.width, height: height / image.height } };
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

  function thumbnail(image) {
    const scale = Math.min(1, 220 / Math.max(image.width, image.height));
    const result = canvas(image.width * scale, image.height * scale);
    result.getContext("2d").drawImage(image, 0, 0, result.width, result.height);
    return CameraPhoto.encode(result, "image/png");
  }

  return { prepare, runner, compose, suggestTags, cloudImage, thumbnail };
})();

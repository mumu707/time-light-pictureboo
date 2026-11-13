"use strict";

window.CameraPhoto = (() => {
  const formats = { JPG: "image/jpeg", PNG: "image/png" };
  const maxSide = 1440;

  // Persistent offscreen canvases prevent per-frame GC stalls during 60fps preview
  const lensWorkCanvas = document.createElement("canvas");
  const developWorkCanvas = document.createElement("canvas");
  const bloomCanvas = document.createElement("canvas");
  const bloomCtx = bloomCanvas.getContext("2d");

  function canvas(width, height, target = null) {
    const result = target || document.createElement("canvas");
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    if (result.width !== w) result.width = w;
    if (result.height !== h) result.height = h;
    return result;
  }

  function encode(source, type, quality = .94) {
    return new Promise((resolve, reject) => {
      source.toBlob(blob => {
        if (blob?.type === type) resolve(blob);
        else reject(new Error("无法编码照片"));
      }, type, quality);
    });
  }

  function filter(roll, ev = 0, light = 1) {
    const brightness = 2 ** (ev / 2) * light;
    return [roll?.cssFilter, brightness === 1 ? "" : `brightness(${brightness})`].filter(Boolean).join(" ") || "none";
  }

  function sourceRect(width, height, viewWidth, viewHeight, scale, positionY = .5) {
    const cover = Math.max(viewWidth / width, viewHeight / height);
    const unscaledHeight = viewHeight / cover;
    return {
      scale: cover * scale,
      x: width / 2,
      y: height / 2 + (height - unscaledHeight) * (positionY - .5)
    };
  }

  function fromView(media, view, frame, { scale, positionY, mirror, maxDimension = maxSide, target }) {
    const width = media.videoWidth || media.naturalWidth;
    const height = media.videoHeight || media.naturalHeight;
    if (!width || !height || !frame.clientWidth || !frame.clientHeight) throw new Error("取景画面尚未就绪");
    const rect = sourceRect(width, height, view.clientWidth, view.clientHeight, scale, positionY);
    const cropWidth = frame.clientWidth / rect.scale;
    const cropHeight = frame.clientHeight / rect.scale;
    const size = Math.min(1, maxDimension / Math.max(cropWidth, cropHeight));
    const result = target || document.createElement("canvas");
    const outputWidth = Math.max(1, Math.round(cropWidth * size));
    const outputHeight = Math.max(1, Math.round(cropHeight * size));
    if (result.width !== outputWidth) result.width = outputWidth;
    if (result.height !== outputHeight) result.height = outputHeight;
    const context = result.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.clearRect(0, 0, result.width, result.height);
    context.save();
    if (mirror) {
      context.translate(result.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(media, rect.x - cropWidth / 2, rect.y - cropHeight / 2, cropWidth, cropHeight, 0, 0, result.width, result.height);
    context.restore();
    return result;
  }

  function combine(first, second) {
    const aspect = Math.min(first.width / first.height, second.width / second.height);
    const height = Math.min(first.height, second.height, Math.floor(maxSide / (aspect * 2 + .012)));
    const width = Math.max(1, Math.round(aspect * height));
    const gutter = Math.max(2, Math.round(height / 100));
    const result = canvas(width * 2 + gutter, height);
    const context = result.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.fillStyle = "#1d1d1b";
    context.fillRect(0, 0, result.width, result.height);
    [first, second].forEach((frame, index) => {
      const cropWidth = Math.min(frame.width, frame.height * aspect);
      context.drawImage(frame, (frame.width - cropWidth) / 2, 0, cropWidth, frame.height,
        index * (width + gutter), 0, width, height);
    });
    return result;
  }

  function load(blob) {
    const url = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("无法读取这张照片"));
      image.src = url;
    }).finally(() => URL.revokeObjectURL(url));
  }

  // Canvas 2D filter is optional. Use the same color operations on pixel data when absent.
  function pixelFilter(context, width, height, value, x = 0) {
    const luma = [.213, .715, .072];
    const sepia = [[.393, .769, .189], [.349, .686, .168], [.272, .534, .131]];
    const hueSin = [[-.213, -.715, .928], [.143, .140, -.283], [-.787, .715, .072]];
    const operations = Array.from(value.matchAll(/([a-z-]+)\((-?[\d.]+)(?:deg)?\)/g), ([, name, raw]) => {
      const amount = Number(raw);
      const matrix = luma.map((_, row) => luma.map((weight, column) => {
        const identity = row === column ? 1 : 0;
        switch (name) {
          case "grayscale": return identity * (1 - amount) + weight * amount;
          case "saturate": return weight + (identity - weight) * amount;
          case "sepia": return identity * (1 - amount) + sepia[row][column] * amount;
          case "hue-rotate": {
            const angle = amount * Math.PI / 180;
            return weight + (identity - weight) * Math.cos(angle) + hueSin[row][column] * Math.sin(angle);
          }
          case "contrast":
          case "brightness": return identity * amount;
          default: return identity;
        }
      })).flat();
      return { matrix, offset: name === "contrast" ? 127.5 * (1 - amount) : 0 };
    });
    const image = context.getImageData(x, 0, width, height);
    const pixels = image.data;
    for (const { matrix, offset } of operations) {
      const [rr, rg, rb, gr, gg, gb, br, bg, bb] = matrix;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        pixels[i] = r * rr + g * rg + b * rb + offset;
        pixels[i + 1] = r * gr + g * gg + b * gb + offset;
        pixels[i + 2] = r * br + g * bg + b * bb + offset;
      }
    }
    context.putImageData(image, x, 0);
  }

  function rollToneProfile(roll) {
    if (roll?.customTone) {
      const ct = roll.customTone;
      return {
        isMono: Boolean(ct.isMono),
        shR: Number(ct.shR) || 0,
        shG: Number(ct.shG) || 0,
        shB: Number(ct.shB) || 0,
        hiR: Number(ct.hiR) || 0,
        hiG: Number(ct.hiG) || 0,
        hiB: Number(ct.hiB) || 0,
        toe: Number.isFinite(ct.toe) ? ct.toe : 4,
        curve: Number.isFinite(ct.curve) ? ct.curve : 0.22,
        id: roll.id
      };
    }
    const id = roll.id;
    const cat = roll.category;
    const isMono = cat === "专业黑白";
    let shR = 0, shG = 0, shB = 0;
    let hiR = 0, hiG = 0, hiB = 0;
    let toe = 4, curve = 0.22;

    if (isMono) {
      toe = id === "20" || id === "38" ? 2 : 5;
      curve = id === "20" || id === "38" ? 0.34 : 0.22;
    } else if (cat === "柯达暖金") {
      shR = 5; shG = 1; shB = -4;
      hiR = 9; hiG = 4; hiB = -8;
      toe = id === "02" ? 8 : 4;
      curve = id === "05" || id === "06" || id === "37" ? 0.28 : 0.16;
    } else if (cat === "富士日系") {
      // Classic 4th-layer mint/cyan shadows + airy highlights
      shR = -6; shG = 5; shB = 6;
      hiR = 1; hiG = 4; hiB = 3;
      toe = id === "07" || id === "12" || id === "36" ? 7 : 4;
      curve = id === "11" || id === "09" ? 0.26 : 0.14;
    } else if (cat === "电影夜景") {
      shR = -9; shG = 3; shB = 11;
      hiR = 8; hiG = 3; hiB = -6;
      if (id === "33") { shR = -4; shB = 7; hiR = 12; hiG = 4; hiB = -7; }
      else if (id === "39") { shR = -5; shG = 2; shB = 6; hiR = 5; hiG = 4; hiB = -2; }
      toe = 5;
      curve = 0.24;
    } else if (id === "32") { // Redscale 100
      shR = 18; shG = -4; shB = -18;
      hiR = 20; hiG = 6; hiB = -24;
      toe = 3; curve = 0.28;
    } else if (id === "34") { // Phoenix 200
      shR = 12; shG = -2; shB = -10;
      hiR = 16; hiG = 5; hiB = -12;
      toe = 3; curve = 0.32;
    } else if (id === "35") { // Lomo Purple
      shR = 10; shG = -10; shB = 14;
      hiR = 8; hiG = -4; hiB = 10;
      toe = 4; curve = 0.26;
    } else if (id === "40") { // Cyber Neon 800
      shR = -12; shG = 6; shB = 16;
      hiR = 14; hiG = -5; hiB = 14;
      toe = 2; curve = 0.30;
    } else if (id === "27") { // Metropolis bleach-bypass look
      shR = -5; shG = 3; shB = 1;
      hiR = 4; hiG = 2; hiB = -5;
      toe = 3; curve = 0.35;
    } else if (id === "28") { // Y2K CCD 2004
      shR = -4; shG = 0; shB = 6;
      hiR = 5; hiG = 6; hiB = 8;
      toe = 2; curve = 0.25;
    } else {
      shR = 4; shG = -1; shB = 4;
      hiR = 7; hiG = 4; hiB = -4;
      toe = 5; curve = 0.22;
    }
    return { isMono, shR, shG, shB, hiR, hiG, hiB, toe, curve, id };
  }

  function applyFilmLook(context, x, width, height, roll, isPreview = false) {
    if (!roll || width <= 4 || height <= 4) return;
    const p = rollToneProfile(roll);
    const vigStrength = (roll.vignette || 0) * 0.12;
    const grainAmp = isPreview ? 0 : (roll.grain || 0) * 4.8 + 1.6;
    const hasLeak = !isPreview && (roll.leak || 0) > 0 && !p.isMono;
    const isHalation = !isPreview && (Boolean(roll.halation) || p.id === "16" || p.id === "14" || p.id === "32" || p.id === "33" || p.id === "34");
    const bloomStrength = isPreview ? 0 : (roll.bloom || 0);

    // 1. Highlight Bloom & Movie Halation (drawn before grain/date stamp)
    if (bloomStrength >= 10) {
      const bw = Math.max(16, Math.min(112, Math.round(width * 0.14)));
      const bh = Math.max(16, Math.min(112, Math.round(height * 0.14)));
      if (bloomCanvas.width !== bw) bloomCanvas.width = bw;
      if (bloomCanvas.height !== bh) bloomCanvas.height = bh;
      bloomCtx.clearRect(0, 0, bw, bh);
      bloomCtx.drawImage(context.canvas, x, 0, width, height, 0, 0, bw, bh);
      const bImg = bloomCtx.getImageData(0, 0, bw, bh);
      const bd = bImg.data;
      for (let i = 0; i < bd.length; i += 4) {
        const l = 0.213 * bd[i] + 0.715 * bd[i + 1] + 0.072 * bd[i + 2];
        if (l > 202) {
          const factor = (l - 202) / 53;
          if (isHalation) {
            bd[i] = Math.min(255, 255 * factor);
            bd[i + 1] = Math.min(255, 92 * factor);
            bd[i + 2] = Math.min(255, 52 * factor);
          } else {
            bd[i] = bd[i] * factor;
            bd[i + 1] = bd[i + 1] * factor * 0.98;
            bd[i + 2] = bd[i + 2] * factor * 0.94;
          }
          bd[i + 3] = 255;
        } else {
          bd[i] = bd[i + 1] = bd[i + 2] = 0;
          bd[i + 3] = 0;
        }
      }
      bloomCtx.putImageData(bImg, 0, 0);
      context.save();
      context.globalCompositeOperation = "screen";
      context.globalAlpha = Math.min(isHalation ? 0.34 : 0.22, bloomStrength / 115);
      if ("filter" in context) context.filter = "blur(6px)";
      context.drawImage(bloomCanvas, 0, 0, bw, bh, x, 0, width, height);
      context.restore();
    }

    // 2. Single-pass Split-Toning + Film S-Curve + Vignette + Leak + Silver Grain
    if (!isPreview) {
      const image = context.getImageData(x, 0, width, height);
      const d = image.data;
      const halfW = width * 0.5;
      const halfH = height * 0.5;
      const invHalfW = 1 / halfW;
      const invHalfH = 1 / halfH;

      // Precompute 256-entry Film S-Curve + Matte Toe LUT + separable 1D vignette/leak tables
      const sLut = new Float32Array(256);
      for (let v = 0; v < 256; v++) {
        const t = v / 255;
        const s = t * t * (3 - 2 * t);
        const curved = t * (1 - p.curve) + s * p.curve;
        sLut[v] = p.toe + curved * (255 - p.toe * 1.15);
      }
      const nxArr = new Float32Array(width);
      const nx2Arr = new Float32Array(width);
      const leakEdgeArr = hasLeak ? new Float32Array(width) : null;
      for (let col = 0; col < width; col++) {
        const nx = (col - halfW) * invHalfW;
        nxArr[col] = nx;
        nx2Arr[col] = nx * nx;
        if (hasLeak && nx > 0.22) {
          const edge = Math.min(1, (nx - 0.22) / 0.78);
          leakEdgeArr[col] = edge * edge;
        }
      }
      const ny2Arr = new Float32Array(height);
      const leakBandYArr = hasLeak ? new Float32Array(height) : null;
      for (let row = 0; row < height; row++) {
        const ny = (row - halfH) * invHalfH;
        ny2Arr[row] = ny * ny;
        if (hasLeak) {
          const dy = ny - 0.12;
          leakBandYArr[row] = Math.exp(-dy * dy * 3.2);
        }
      }

      for (let row = 0; row < height; row++) {
        const ny2 = ny2Arr[row];
        const leakY = hasLeak ? leakBandYArr[row] : 0;
        const rowOffset = row * width;
        const rowHash = Math.imul(row + 17, 668265263);
        const monoRowHash = Math.imul(row + 29, 668265263);
        for (let col = 0; col < width; col++) {
          const i = (rowOffset + col) * 4;
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const r2 = nx2Arr[col] + ny2;

          // Keep masked optical black corners (e.g. fisheye mask) pure and dark
          if (r < 24 && g < 24 && b < 24 && r2 > 0.85) continue;

          if (p.isMono) {
            const lum = Math.min(255, Math.max(0, (0.299 * r + 0.587 * g + 0.114 * b + 0.5) | 0));
            let v = sLut[lum];
            if (vigStrength > 0) {
              v *= Math.max(0.45, 1 - vigStrength * r2 * r2);
            }
            const tNorm = v / 255;
            const nWeight = 4 * tNorm * (1 - tNorm);
            const h = (Math.imul(col + 13, 374761393) ^ monoRowHash) >>> 0;
            const noise = ((Math.imul(h ^ (h >>> 13), 1274126177) >>> 0) / 4294967295 - 0.5) * grainAmp * nWeight;
            const out = Math.min(255, Math.max(0, (v + noise + 0.5) | 0));
            d[i] = d[i + 1] = d[i + 2] = out;
            continue;
          }

          let sr = sLut[r];
          let sg = sLut[g];
          let sb = sLut[b];

          if (p.id === "32") {
            const rr = sr * 1.08 + sg * 0.24;
            const gg = sg * 0.68 + sr * 0.22;
            const bb = sb * 0.34;
            sr = rr; sg = gg; sb = bb;
          } else if (p.id === "27") {
            const lum = 0.299 * sr + 0.587 * sg + 0.114 * sb;
            sr = sr * 0.62 + lum * 0.38;
            sg = sg * 0.62 + lum * 0.38;
            sb = sb * 0.62 + lum * 0.38;
          }

          const lumaNorm = Math.min(1, Math.max(0, (0.213 * sr + 0.715 * sg + 0.072 * sb) / 255));
          const shW = (1 - lumaNorm) * (1 - lumaNorm);
          const hiW = lumaNorm * lumaNorm;
          sr += p.shR * shW + p.hiR * hiW;
          sg += p.shG * shW + p.hiG * hiW;
          sb += p.shB * shW + p.hiB * hiW;

          if (vigStrength > 0) {
            const vig = Math.max(0.45, 1 - vigStrength * r2 * r2);
            sr *= vig; sg *= vig; sb *= vig;
          }

          // Edge organic warm amber/coral leak on right edge (leaves top-left untouched)
          if (hasLeak && leakEdgeArr[col] > 0) {
            const band = leakY * leakEdgeArr[col];
            sr += band * 68;
            sg += band * 26;
            sb += band * 8;
          }

          // Midtone-weighted organic silver grain
          const nWeight = 4 * lumaNorm * (1 - lumaNorm);
          const h = (Math.imul(col + 31, 374761393) ^ rowHash) >>> 0;
          const noise = ((Math.imul(h ^ (h >>> 13), 1274126177) >>> 0) / 4294967295 - 0.5) * grainAmp * nWeight;

          d[i] = sr + noise;
          d[i + 1] = sg + noise * 0.96;
          d[i + 2] = sb + noise * 0.92;
        }
      }
      context.putImageData(image, x, 0);
    }

    // 3. Y2K CCD 2004 Orange Digital Date Stamp
    if (roll.isCCD && !isPreview && width >= 120 && height >= 80) {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const stamp = `'${yy} ${mm} ${dd}`;
      const fontSize = Math.max(12, Math.round(Math.min(width, height) * 0.036));
      const padX = Math.max(12, Math.round(width * 0.045));
      const padY = Math.max(10, Math.round(height * 0.04));
      context.save();
      context.font = `700 ${fontSize}px ui-monospace, "Courier New", monospace`;
      context.textAlign = "right";
      context.textBaseline = "bottom";
      context.shadowColor = "rgba(255, 86, 12, 0.85)";
      context.shadowBlur = Math.max(2, fontSize * 0.25);
      context.fillStyle = "#ff8524";
      context.fillText(stamp, x + width - padX, height - padY);
      context.restore();
    }
  }

  function develop(source, { roll, ev, light, format, lenses, frames, paper, paperAspect, stickers, isPreview }, target = null) {
    const reuseTargets = Boolean(target);
    if (CameraLens.active(lenses)) {
      source = CameraLens.draw(source, reuseTargets ? lensWorkCanvas : document.createElement("canvas"), lenses, maxSide);
    }
    const width = source.naturalWidth || source.width;
    const height = source.naturalHeight || source.height;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const result = reuseTargets
      ? canvas(width * scale, height * scale, developWorkCanvas)
      : canvas(width * scale, height * scale);
    const context = result.getContext("2d", { willReadFrequently: !isPreview });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.clearRect(0, 0, result.width, result.height);
    if (format === "JPG") {
      context.fillStyle = "#fff";
      context.fillRect(0, 0, result.width, result.height);
    }
    if (frames) {
      context.drawImage(source, 0, 0, result.width, result.height);
      const gutter = Math.max(2, Math.round(height / 100));
      const sourcePanel = Math.floor((width - gutter) / 2);
      const outputPanel = Math.floor(sourcePanel * scale);
      if (outputPanel > 0) {
        frames.forEach((frame, index) => {
          const sourceX = index ? width - sourcePanel : 0;
          const outputX = index ? result.width - outputPanel : 0;
          const effect = filter(frame.roll, 0, frame.light);
          if ("filter" in context) context.filter = effect;
          context.drawImage(source, sourceX, 0, sourcePanel, height,
            outputX, 0, outputPanel, result.height);
          if ("filter" in context) context.filter = "none";
          if (effect !== "none" && !("filter" in context)) pixelFilter(context, outputPanel, result.height, effect, outputX);
          applyFilmLook(context, outputX, outputPanel, result.height, frame.roll, isPreview);
          CameraStickers.draw(context, frame.stickers, outputX, outputPanel, result.height);
        });
      }
    } else {
      const effect = filter(roll, ev, light);
      if ("filter" in context) context.filter = effect;
      context.drawImage(source, 0, 0, result.width, result.height);
      if ("filter" in context) context.filter = "none";
      if (effect !== "none" && !("filter" in context)) pixelFilter(context, result.width, result.height, effect);
      applyFilmLook(context, 0, result.width, result.height, roll, isPreview);
      CameraStickers.draw(context, stickers, 0, result.width, result.height);
    }

    return CameraPaper.draw(result, target || document.createElement("canvas"), paper, paperAspect);
  }

  async function render(source, recipe) {
    const result = develop(source, recipe);
    const [blob, thumbnail] = await Promise.all([encode(result, formats[recipe.format]), makeThumbnail(result)]);
    return { blob, thumbnail, width: result.width, height: result.height };
  }

  function makeThumbnail(source) {
    const width = source.naturalWidth || source.width;
    const height = source.naturalHeight || source.height;
    const thumbScale = Math.min(1, 220 / Math.max(width, height));
    const thumb = canvas(width * thumbScale, height * thumbScale);
    const thumbContext = thumb.getContext("2d");
    thumbContext.imageSmoothingEnabled = true;
    thumbContext.imageSmoothingQuality = "high";
    thumbContext.fillStyle = "#fff";
    thumbContext.fillRect(0, 0, thumb.width, thumb.height);
    thumbContext.drawImage(source, 0, 0, thumb.width, thumb.height);
    return encode(thumb, formats.JPG, .84);
  }

  return { formats, encode, filter, fromView, combine, sourceRect, load, render, develop, makeThumbnail };
})();

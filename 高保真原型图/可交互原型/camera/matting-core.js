"use strict";

// Shared CPU matting & exact 2D EDT die-cut outline core usable in both Window and Web Worker.
(function (root) {
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
    const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n), p = new Float32Array(n);
    const RR = new Float32Array(n), RG = new Float32Array(n), RB = new Float32Array(n);
    const GG = new Float32Array(n), GB = new Float32Array(n), BB = new Float32Array(n);
    const Rp = new Float32Array(n), Gp = new Float32Array(n), Bp = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const rv = rgbData[i * 4], gv = rgbData[i * 4 + 1], bv = rgbData[i * 4 + 2];
      const pv = alphaData[i * 4 + 3];
      R[i] = rv; G[i] = gv; B[i] = bv; p[i] = pv;
      RR[i] = rv * rv; RG[i] = rv * gv; RB[i] = rv * bv;
      GG[i] = gv * gv; GB[i] = gv * bv; BB[i] = bv * bv;
      Rp[i] = rv * pv; Gp[i] = gv * pv; Bp[i] = bv * pv;
    }

    const mR = boxFilter(R, w, h, r), mG = boxFilter(G, w, h, r), mB = boxFilter(B, w, h, r), mP = boxFilter(p, w, h, r);
    const mRR = boxFilter(RR, w, h, r), mRG = boxFilter(RG, w, h, r), mRB = boxFilter(RB, w, h, r);
    const mGG = boxFilter(GG, w, h, r), mGB = boxFilter(GB, w, h, r), mBB = boxFilter(BB, w, h, r);
    const mRp = boxFilter(Rp, w, h, r), mGp = boxFilter(Gp, w, h, r), mBp = boxFilter(Bp, w, h, r);

    const aR = new Float32Array(n), aG = new Float32Array(n), aB = new Float32Array(n), b = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const mr = mR[i], mg = mG[i], mb = mB[i], mp = mP[i];
      const rr = mRR[i] - mr * mr + eps;
      const rg = mRG[i] - mr * mg;
      const rb = mRB[i] - mr * mb;
      const gg = mGG[i] - mg * mg + eps;
      const gb = mGB[i] - mg * mb;
      const bb = mBB[i] - mb * mb + eps;

      const inv00 = gg * bb - gb * gb;
      const inv01 = rb * gb - rg * bb;
      const inv02 = rg * gb - rb * gg;
      const inv11 = rr * bb - rb * rb;
      const inv12 = rb * rg - rr * gb;
      const inv22 = rr * gg - rg * rg;
      const det = rr * inv00 + rg * inv01 + rb * inv02;

      const cRp = mRp[i] - mr * mp;
      const cGp = mGp[i] - mg * mp;
      const cBp = mBp[i] - mb * mp;

      const ar = (inv00 * cRp + inv01 * cGp + inv02 * cBp) / det;
      const ag = (inv01 * cRp + inv11 * cGp + inv12 * cBp) / det;
      const ab = (inv02 * cRp + inv12 * cGp + inv22 * cBp) / det;
      aR[i] = ar; aG[i] = ag; aB[i] = ab;
      b[i] = mp - ar * mr - ag * mg - ab * mb;
    }

    const maR = boxFilter(aR, w, h, r), maG = boxFilter(aG, w, h, r), maB = boxFilter(aB, w, h, r), mBCoef = boxFilter(b, w, h, r);
    for (let i = 0; i < n; i++) {
      let q = maR[i] * R[i] + maG[i] * G[i] + maB[i] * B[i] + mBCoef[i];
      if (q <= 82) q = 0;
      else if (q >= 148) q = 255;
      else {
        const t = (q - 82) / 66;
        q = Math.round(t * t * (3 - 2 * t) * 255);
      }
      alphaData[i * 4] = alphaData[i * 4 + 1] = alphaData[i * 4 + 2] = 255;
      alphaData[i * 4 + 3] = q;
    }
  }

  function decontaminateEdge(rgbData, alphaData, w, h) {
    const out = new Uint8ClampedArray(rgbData);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const a = alphaData[idx * 4 + 3];
        if (a <= 8 || a >= 235) continue;
        let sumR = 0, sumG = 0, sumB = 0, weight = 0;
        for (let dy = -3; dy <= 3; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -3; dx <= 3; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            const nIdx = ny * w + nx;
            if (alphaData[nIdx * 4 + 3] < 235) continue;
            const d2 = dx * dx + dy * dy;
            if (!d2) continue;
            const wgt = 1 / d2;
            sumR += rgbData[nIdx * 4] * wgt;
            sumG += rgbData[nIdx * 4 + 1] * wgt;
            sumB += rgbData[nIdx * 4 + 2] * wgt;
            weight += wgt;
          }
        }
        if (weight <= 0) continue;
        const blend = Math.min(0.85, ((235 - a) / 227) * 0.85);
        out[idx * 4] = Math.round(rgbData[idx * 4] * (1 - blend) + (sumR / weight) * blend);
        out[idx * 4 + 1] = Math.round(rgbData[idx * 4 + 1] * (1 - blend) + (sumG / weight) * blend);
        out[idx * 4 + 2] = Math.round(rgbData[idx * 4 + 2] * (1 - blend) + (sumB / weight) * blend);
      }
    }
    return out;
  }

  function edt1d(f, d, v, z, n) {
    let k = 0;
    v[0] = 0;
    z[0] = -Infinity;
    z[1] = Infinity;
    for (let q = 1; q < n; q++) {
      let s;
      while (true) {
        const r = v[k];
        s = ((f[q] + q * q) - (f[r] + r * r)) / (2 * q - 2 * r);
        if (s > z[k]) break;
        k--;
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      const dx = q - v[k];
      d[q] = dx * dx + f[v[k]];
    }
  }

  function edt2d(mask, w, h, targetValue) {
    const INF = 1e9;
    const grid = new Float32Array(w * h);
    const maxDim = Math.max(w, h);
    const f = new Float32Array(maxDim);
    const d = new Float32Array(maxDim);
    const v = new Int32Array(maxDim);
    const z = new Float32Array(maxDim + 1);

    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) f[x] = mask[row + x] === targetValue ? 0 : INF;
      edt1d(f, d, v, z, w);
      for (let x = 0; x < w; x++) grid[row + x] = d[x];
    }

    const dist = new Float32Array(w * h);
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
      edt1d(f, d, v, z, h);
      for (let y = 0; y < h; y++) dist[y * w + x] = Math.sqrt(d[y]);
    }
    return dist;
  }

  function createStickerOutlinePixels(paddedAlphaData, w, h, borderWidth) {
    const n = w * h;
    const fg = new Uint8Array(n);
    for (let i = 0; i < n; i++) fg[i] = paddedAlphaData[i * 4 + 3] >= 128 ? 1 : 0;

    const closeR = Math.max(2, Math.round(borderWidth * 0.42));
    const distFromFg = edt2d(fg, w, h, 1);
    const dilated = new Uint8Array(n);
    const dilateLimit = borderWidth + closeR;
    for (let i = 0; i < n; i++) dilated[i] = distFromFg[i] <= dilateLimit ? 1 : 0;

    const distFromBg = edt2d(dilated, w, h, 0);
    const out = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) {
      if (!dilated[i]) continue;
      const sd = closeR - distFromBg[i];
      if (sd >= 0.8) continue;
      let a = 255;
      if (sd > -0.8) a = Math.round(((0.8 - sd) / 1.6) * 255);
      let r = 255, g = 253, b = 246;
      if (sd > -1.3) {
        const rim = Math.max(0, 1 - Math.abs(sd + 0.3) / 1.0) * 0.42;
        r = Math.round(255 * (1 - rim) + 203 * rim);
        g = Math.round(253 * (1 - rim) + 187 * rim);
        b = Math.round(246 * (1 - rim) + 164 * rim);
      }
      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = a;
    }
    return out;
  }

  function matteSubject(rgbData, alphaData, w, h, radius, filterRadius, borderPad) {
    guidedFilterAlpha(rgbData, alphaData, w, h, filterRadius, 120);
    const cleanRgb = decontaminateEdge(rgbData, alphaData, w, h);
    const subjectRgba = new Uint8ClampedArray(cleanRgb.length);
    for (let i = 0; i < w * h; i++) {
      const a = alphaData[i * 4 + 3];
      subjectRgba[i * 4] = cleanRgb[i * 4];
      subjectRgba[i * 4 + 1] = cleanRgb[i * 4 + 1];
      subjectRgba[i * 4 + 2] = cleanRgb[i * 4 + 2];
      subjectRgba[i * 4 + 3] = a;
    }

    const outW = w + borderPad * 2;
    const outH = h + borderPad * 2;
    const paddedAlpha = new Uint8ClampedArray(outW * outH * 4);
    for (let y = 0; y < h; y++) {
      const srcRow = y * w * 4;
      const dstRow = ((y + borderPad) * outW + borderPad) * 4;
      paddedAlpha.set(alphaData.subarray(srcRow, srcRow + w * 4), dstRow);
    }
    const outlineRgba = createStickerOutlinePixels(paddedAlpha, outW, outH, radius);
    return { alphaData, subjectRgba, outlineRgba, outW, outH };
  }

  root.CameraMatting = {
    guidedFilterAlpha,
    decontaminateEdge,
    edt2d,
    createStickerOutlinePixels,
    matteSubject
  };
})(typeof self !== "undefined" ? self : window);

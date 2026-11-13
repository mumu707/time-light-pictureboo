"use strict";

window.CameraPaper = (() => {
  const choices = {
    none: "满版",
    white: "白边",
    cream: "奶油",
    instant: "拍立得",
    sprocket: "齿孔",
    postcard: "明信片",
    kraft: "牛皮纸",
    contact: "底片印样",
    museum: "画廊卡纸",
    diary: "手账便签",
    cyanotype: "蓝晒印相",
    sakura: "樱粉信笺"
  };

  const PAPER_COLORS = {
    white: "#fffdf8",
    cream: "#eee1c3",
    instant: "#f4eee0",
    sprocket: "#242019",
    postcard: "#f6efe2",
    kraft: "#cfa97e",
    contact: "#181614",
    museum: "#ebe4d6",
    diary: "#f8f1e3",
    cyanotype: "#1e3d5c",
    sakura: "#f6e3e5"
  };

  function layout(width, height, paper = "none") {
    const unit = Math.min(width, height);
    if (!Object.hasOwn(choices, paper) || paper === "none") return { side: 0, top: 0, bottom: 0 };
    if (paper === "contact") {
      const side = Math.min(Math.floor((unit - 1) / 2), Math.max(1, Math.round(unit * .035)));
      const edge = Math.min(Math.floor((height - 1) / 2), Math.max(1, Math.round(unit * .085)));
      return { side, top: edge, bottom: edge };
    }
    const sideRatio = paper === "sprocket" ? .065 : paper === "museum" ? .085 : paper === "kraft" ? .058 : .045;
    const side = Math.min(Math.floor((unit - 1) / 2), Math.max(1, Math.round(unit * sideRatio)));
    const top = paper === "sprocket" ? 0 : paper === "diary" ? Math.min(Math.floor((height - 1) / 2), Math.round(unit * .072)) : side;
    let bottom = top;
    if (paper === "instant") bottom = Math.round(unit * .17);
    else if (paper === "postcard") bottom = Math.round(unit * .16);
    else if (paper === "diary") bottom = Math.round(unit * .068);
    else if (paper === "museum") bottom = Math.round(unit * .105);
    bottom = Math.min(height - top - 1, bottom);
    return { side, top, bottom };
  }

  function drawDecorations(context, width, height, side, top, bottom, unit, paper) {
    const innerWidth = width - side * 2;
    const innerHeight = height - top - bottom;
    if (paper === "sprocket") {
      const pitch = Math.max(4, Math.round(unit * .07));
      context.fillStyle = "#f4eee0";
      for (let y = pitch * .25; y < height; y += pitch) {
        context.fillRect(side * .22, y, side * .55, pitch * .48);
        context.fillRect(width - side * .77, y, side * .55, pitch * .48);
      }
      return;
    }
    if (paper === "postcard") {
      context.save();
      context.strokeStyle = "rgba(138, 108, 78, 0.45)";
      context.lineWidth = Math.max(1, unit * .004);
      const stampSize = Math.max(8, Math.round(bottom * .48));
      context.strokeRect(width - side - stampSize, top + innerHeight + bottom * .22, stampSize, stampSize);
      const lineY1 = top + innerHeight + bottom * .42;
      const lineY2 = top + innerHeight + bottom * .66;
      const lineRight = width - side - stampSize - Math.max(6, unit * .03);
      context.beginPath();
      context.moveTo(side, lineY1);
      context.lineTo(Math.max(side + 12, lineRight), lineY1);
      context.moveTo(side, lineY2);
      context.lineTo(Math.max(side + 12, lineRight - unit * .08), lineY2);
      context.stroke();
      context.restore();
      return;
    }
    if (paper === "kraft") {
      context.save();
      // Subtle paper fiber flecks on border
      context.fillStyle = "rgba(68, 44, 24, 0.08)";
      for (let y = 2; y < height; y += 6) {
        for (let x = 2; x < width; x += 9) {
          if (x >= side && x <= width - side && y >= top && y <= top + innerHeight) continue;
          if (((x * 37 + y * 13) & 7) === 0) context.fillRect(x, y, 2, 1);
        }
      }
      // Four vintage black photo mounting corners
      const cSize = Math.max(6, Math.round(unit * .055));
      context.fillStyle = "#3b2d20";
      const corners = [
        [[side, top], [side + cSize, top], [side, top + cSize]],
        [[width - side, top], [width - side - cSize, top], [width - side, top + cSize]],
        [[side, top + innerHeight], [side + cSize, top + innerHeight], [side, top + innerHeight - cSize]],
        [[width - side, top + innerHeight], [width - side - cSize, top + innerHeight], [width - side, top + innerHeight - cSize]]
      ];
      for (const pts of corners) {
        context.beginPath();
        context.moveTo(pts[0][0], pts[0][1]);
        context.lineTo(pts[1][0], pts[1][1]);
        context.lineTo(pts[2][0], pts[2][1]);
        context.closePath();
        context.fill();
      }
      context.restore();
      return;
    }
    if (paper === "contact") {
      context.save();
      const pitch = Math.max(4, Math.round(unit * .065));
      context.fillStyle = "#0b0a09";
      for (let x = side + pitch * .25; x < width - side; x += pitch) {
        context.fillRect(x, top * .26, pitch * .48, top * .38);
        context.fillRect(x, height - bottom * .64, pitch * .48, bottom * .38);
      }
      if (unit >= 100) {
        const fs = Math.max(7, Math.round(unit * .026));
        context.fillStyle = "#e6a64c";
        context.font = `700 ${fs}px ui-monospace, "Courier New", monospace`;
        context.textBaseline = "bottom";
        context.fillText("TIMELIGHT 400", side, height - Math.max(2, bottom * .08));
        context.textAlign = "right";
        context.fillText("36A", width - side, height - Math.max(2, bottom * .08));
      }
      context.restore();
      return;
    }
    if (paper === "museum") {
      context.save();
      const pad = Math.max(2, unit * .01);
      context.strokeStyle = "#cbc0ae";
      context.lineWidth = Math.max(1, unit * .005);
      context.strokeRect(side - pad * .5, top - pad * .5, innerWidth + pad, innerHeight + pad);
      context.strokeStyle = "rgba(92, 82, 68, 0.25)";
      context.lineWidth = Math.max(1, unit * .0025);
      context.strokeRect(side * .55, top * .55, width - side * 1.1, height - top * .55 - bottom * .55);
      context.restore();
      return;
    }
    if (paper === "diary") {
      context.save();
      // Subtle dot grid on border
      const step = Math.max(6, Math.round(unit * .045));
      context.fillStyle = "rgba(155, 130, 102, 0.26)";
      for (let y = Math.round(step * .5); y < height; y += step) {
        for (let x = Math.round(step * .5); x < width; x += step) {
          if (x >= side - 2 && x <= width - side + 2 && y >= top - 2 && y <= top + innerHeight + 2) continue;
          context.fillRect(x, y, 1.5, 1.5);
        }
      }
      // Top washi tape graphic
      const tapeW = Math.round(width * .28);
      const tapeH = Math.max(6, Math.round(top * .82));
      const tapeX = Math.round((width - tapeW) / 2);
      const tapeY = Math.max(1, Math.round(top * .24));
      context.fillStyle = "rgba(205, 160, 112, 0.65)";
      context.fillRect(tapeX, tapeY, tapeW, tapeH);
      context.strokeStyle = "rgba(130, 92, 54, 0.35)";
      context.lineWidth = 1;
      context.strokeRect(tapeX, tapeY, tapeW, tapeH);
      context.restore();
      return;
    }
    if (paper === "cyanotype") {
      context.save();
      const pad = Math.max(2, unit * .014);
      context.strokeStyle = "rgba(222, 238, 250, 0.72)";
      context.lineWidth = Math.max(1, unit * .004);
      context.strokeRect(side - pad * .45, top - pad * .45, innerWidth + pad * .9, innerHeight + pad * .9);
      context.strokeStyle = "rgba(222, 238, 250, 0.32)";
      context.lineWidth = Math.max(1, unit * .0025);
      context.strokeRect(side * .5, top * .5, width - side, height - top * .5 - bottom * .5);
      context.restore();
      return;
    }
    if (paper === "sakura") {
      context.save();
      context.strokeStyle = "rgba(196, 132, 142, 0.55)";
      context.lineWidth = Math.max(1, unit * .0035);
      const inset = Math.max(3, side * .45);
      context.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
      context.fillStyle = "rgba(219, 138, 152, 0.75)";
      const r = Math.max(2, unit * .011);
      for (const [cx, cy] of [[side * .5, top * .5], [width - side * .5, top * .5], [side * .5, height - bottom * .5], [width - side * .5, height - bottom * .5]]) {
        context.beginPath();
        context.arc(cx, cy, r, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    }
  }

  function draw(source, target, paper = "none", aspect) {
    let width = source.width;
    let height = source.height;
    if (paper !== "none" && Number.isFinite(aspect) && aspect > 0) {
      const extent = Math.max(width, height);
      width = Math.max(1, Math.round(extent * Math.min(1, aspect)));
      height = Math.max(1, Math.round(extent / Math.max(1, aspect)));
    }
    if (target.width !== width) target.width = width;
    if (target.height !== height) target.height = height;
    const context = target.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    if (!Object.hasOwn(choices, paper) || paper === "none") {
      context.drawImage(source, 0, 0);
      return target;
    }
    const unit = Math.min(width, height);
    const { side, top, bottom } = layout(width, height, paper);
    context.fillStyle = PAPER_COLORS[paper] || "#fffdf8";
    context.fillRect(0, 0, width, height);
    // Keep the selected output ratio and preserve subjects without stretching them.
    const innerWidth = width - side * 2;
    const innerHeight = height - top - bottom;
    const scale = Math.max(innerWidth / source.width, innerHeight / source.height);
    const cropWidth = innerWidth / scale;
    const cropHeight = innerHeight / scale;
    context.drawImage(source, (source.width - cropWidth) / 2, (source.height - cropHeight) / 2, cropWidth, cropHeight,
      side, top, innerWidth, innerHeight);
    drawDecorations(context, width, height, side, top, bottom, unit, paper);
    return target;
  }

  return { choices, layout, draw };
})();

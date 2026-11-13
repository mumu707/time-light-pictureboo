"use strict";

const el = id => document.getElementById(id);
const stage = document.querySelector(".stage"), sheet = el("sheet"), area = el("imageArea"), img = el("preview");
const view = el("view"), sheetContent = el("sheetContent"), filmLauncher = el("filmLauncher");

// 32 款经典经典模拟胶卷库
const rolls = [
  // 系列一：柯达经典暖金系 (Kodak Classic Warm - 6款)
  ["01", "Gold 200", "暖阳金卷", "#e8b960", "柯达暖金", "sepia(.15) saturate(1.22) contrast(1.08) brightness(1.02)", 1, 15, 1, 0, false],
  ["02", "Portra 160", "清润人像", "#f0bfb0", "柯达暖金", "contrast(.94) brightness(1.08) saturate(1.06) sepia(.08)", 0, 10, 0, 0, false],
  ["03", "Portra 400", "万能人像", "#eec5a2", "柯达暖金", "contrast(.98) brightness(1.04) saturate(1.12)", 1, 12, 1, 0, false],
  ["04", "ColorPlus 200", "复古杂货", "#e59a68", "柯达暖金", "sepia(.22) saturate(1.28) contrast(1.12) hue-rotate(-5deg)", 1, 20, 1, 1, false],
  ["05", "Ektar 100", "极致鲜艳", "#e0533c", "柯达暖金", "saturate(1.45) contrast(1.18) brightness(1.02)", 0, 8, 1, 0, false],
  ["06", "Kodachrome 64", "传奇反转", "#d93829", "柯达暖金", "contrast(1.22) saturate(1.15) sepia(.12) hue-rotate(-6deg)", 1, 14, 2, 0, false],

  // 系列二：富士清透日系系 (Fujifilm Clean Air - 7款)
  ["07", "Pro 400H", "晨光空气", "#b8d0a8", "富士日系", "brightness(1.1) saturate(.92) contrast(.96) hue-rotate(4deg)", 0, 18, 0, 0, false],
  ["08", "Superia 400", "街头日光", "#7dae82", "富士日系", "contrast(1.12) saturate(1.1) hue-rotate(6deg) brightness(1.02)", 1, 10, 1, 0, false],
  ["09", "Velvia 50", "风光高饱", "#48a36c", "富士日系", "saturate(1.5) contrast(1.2) hue-rotate(2deg)", 0, 6, 1, 0, false],
  ["10", "Provia 100F", "自然写实", "#88c4b2", "富士日系", "contrast(1.04) saturate(1.05) brightness(1.01)", 0, 5, 0, 0, false],
  ["11", "Classic Chrome", "硬朗纪实", "#a3b5a0", "富士日系", "saturate(.78) contrast(1.16) sepia(.08)", 1, 12, 1, 0, false],
  ["12", "Astia 100F", "柔嫩淡彩", "#f3cad8", "富士日系", "contrast(.92) brightness(1.06) saturate(1.1) hue-rotate(-4deg)", 0, 16, 0, 0, false],
  ["13", "Natura 1600", "月色神卷", "#8ea3c4", "富士日系", "contrast(.95) brightness(1.12) saturate(.9) hue-rotate(-8deg)", 2, 22, 1, 0, false],

  // 系列三：电影与夜景冷暖系 (Cinema & Tungsten - 6款)
  ["14", "Cinestill 800T", "雨夜红晕", "#a3badf", "电影夜景", "hue-rotate(-14deg) contrast(1.15) saturate(1.18)", 1, 35, 1, 1, false],
  ["15", "Cinestill 50D", "日光电影", "#6b95b8", "电影夜景", "contrast(1.1) saturate(1.14) hue-rotate(-5deg)", 0, 12, 1, 0, false],
  ["16", "Vision3 250D", "好莱坞大片", "#cbb279", "电影夜景", "contrast(1.06) saturate(1.1) sepia(.1)", 1, 14, 1, 0, false],
  ["17", "Vision3 500T", "夜市霓虹", "#3f7c85", "电影夜景", "contrast(1.2) saturate(1.25) hue-rotate(-18deg)", 1, 28, 2, 1, false],
  ["18", "Wong's Cinema", "复古港风", "#9cbcaf", "电影夜景", "contrast(1.22) saturate(1.3) hue-rotate(-10deg) sepia(.12)", 2, 25, 2, 1, false],
  ["19", "Noir Night", "午夜蓝调", "#2b4162", "电影夜景", "contrast(1.3) saturate(1.1) hue-rotate(-22deg) brightness(.92)", 1, 20, 2, 0, false],

  // 系列四：专业黑白与高反差系 (Monochrome Masters - 6款)
  ["20", "Acros 100", "北欧黑白", "#deded8", "专业黑白", "grayscale(1) contrast(1.05) brightness(1.02)", 0, 8, 0, 0, false],
  ["21", "Tri-X 400", "玛格南黑白", "#b4aca1", "专业黑白", "grayscale(1) contrast(1.32) brightness(.98)", 2, 10, 1, 0, false],
  ["22", "HP5 Plus 400", "英伦温润", "#999388", "专业黑白", "grayscale(1) contrast(1.12) brightness(1.04)", 1, 12, 1, 0, false],
  ["23", "Moriyama 400", "森山粗粒", "#403c39", "专业黑白", "grayscale(1) contrast(1.6) brightness(.92)", 2, 6, 2, 0, false],
  ["24", "Agfa Scala", "黑白反转", "#c5c0b8", "专业黑白", "grayscale(1) contrast(1.25) brightness(1.06)", 1, 10, 1, 0, false],
  ["25", "Sepia 1920", "复古暖棕", "#d6b28d", "专业黑白", "sepia(.75) contrast(1.15) brightness(.98)", 1, 18, 1, 0, false],

  // 系列五：玩趣复古与特殊机种系 (Creative & Retro Y2K - 7款)
  ["26", "Polaroid 600", "宝丽来方片", "#e7aebf", "玩趣复古", "contrast(.88) saturate(1.2) brightness(1.04)", 1, 18, 1, 0, false],
  ["27", "Instax Mini", "拍立得Mini", "#fed166", "玩趣复古", "saturate(1.32) contrast(1.05) brightness(1.08)", 0, 12, 0, 0, false],
  ["28", "Y2K CCD", "千禧直闪", "#96d0ea", "玩趣复古", "contrast(1.15) brightness(1.14) saturate(1.12) hue-rotate(-6deg)", 0, 24, 1, 0, true],
  ["29", "Lomo Tiger", "浓郁暗角", "#f77f00", "玩趣复古", "contrast(1.35) saturate(1.4) brightness(.96)", 1, 15, 2, 0, false],
  ["30", "Metropolis", "末世冷翠", "#606c38", "玩趣复古", "saturate(.65) contrast(1.3) hue-rotate(10deg)", 1, 10, 2, 0, false],
  ["31", "Aerochrome IR", "奇幻红外粉", "#d4a4c4", "玩趣复古", "hue-rotate(-42deg) saturate(1.35) brightness(1.04)", 1, 20, 1, 0, false],
  ["32", "Half-Frame", "半格双联", "#e29578", "玩趣复古", "contrast(1.1) saturate(1.1) sepia(.08)", 1, 12, 1, 0, false]
];

const categories = ["★ 收藏", "柯达暖金", "富士日系", "电影夜景", "专业黑白", "玩趣复古"];

// 核心应用状态
const s = {
  drawer: "",
  cat: "柯达暖金",
  roll: "01",
  fav: new Set(["01", "07", "14", "21", "28"]),
  ratio: "3:4",
  lens: 50,
  flash: 0, // 0: 关, 1: 自动, 2: 开启, 3: 冷白直闪
  flip: false,
  grid: false,
  timer: false,
  n: 108,
  half: null, // 半格第一张
  busy: false,
  album: [],
  albumIndex: 0,
  albumFrame: "borderless", // "borderless" | "rebate" | "polaroid"
  stickerPlaced: false,
  soulInfused: false
};

let toastTimer;

// 音效系统 (Web Audio API 合成拟真机械快门)
function playShutterSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // 1. 机械快门帘片升起 (高频清脆 click)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(650, now);
    osc1.frequency.exponentialRampToValueAtTime(70, now + 0.035);
    gain1.gain.setValueAtTime(0.65, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.035);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.035);

    // 2. 快门叶片闭合 (低频沉实 thump)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(240, now + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(45, now + 0.11);
    gain2.gain.setValueAtTime(0.75, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.11);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.11);

    // 3. 机械过片弹簧微声 (whirr)
    const bufSize = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.035));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1400;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now + 0.07);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.19);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now + 0.07);
  } catch (e) {}
}

function playClickSound(freq = 520) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.025);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.025);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.025);
  } catch (e) {}
}

// 缩放适配
function scale() {
  stage.style.setProperty("--scale", Math.min(innerWidth / 390, innerHeight / 844));
}
addEventListener("resize", scale);
scale();

// 获取当前胶卷配置
function currentRoll() {
  return rolls.find(r => r[0] === s.roll) || rolls[0];
}

// 场景渲染逻辑
function scene() {
  const r = currentRoll();
  let source = s.flip ? "ccd" : (r[4] === "专业黑白" ? "preview-bw" : "photo");
  if (r[0] === "28" || s.flash === 3) source = "ccd";

  const zoom = { 28: 1, 50: 1.08, 85: 1.42 }[s.lens] || 1;
  return {
    source,
    filter: r[5],
    zoom,
    grain: r[6],
    halo: r[7],
    corner: r[8],
    leak: r[9],
    isCCD: r[10] || s.flash === 3
  };
}

// 图标辅助函数
function icon(name) {
  return '<span class="icon" aria-hidden="true" style="--icon:' + (window.cameraIconIndex[name] ?? 0) + '"></span>';
}

document.querySelectorAll("[data-static-icon]").forEach(element => {
  element.classList.add("icon");
  element.style.setProperty("--icon", window.cameraIconIndex[element.dataset.staticIcon] ?? 0);
});

// 核心渲染
function render() {
  const sc = scene();
  const r = currentRoll();
  const source = window.samples[sc.source] || window.samples["photo"];

  if (img.getAttribute("src") !== source) img.src = source;
  img.style.setProperty("--filter", sc.filter);
  img.style.setProperty("--zoom", sc.zoom);
  img.style.setProperty("--flip", s.flip ? -1 : 1);

  // 胶卷胶筒色带
  stage.style.setProperty("--can-color", r[3]);

  // 取景器机械遮光帘片与画幅联动动效
  const blades = {
    "3:4": { top: "0%", bottom: "0%", left: "0%", right: "0%" },
    "1:1": { top: "0%", bottom: "0%", left: "12.5%", right: "12.5%" },
    "16:9": { top: "22%", bottom: "22%", left: "0%", right: "0%" },
    "65:24": { top: "37%", bottom: "37%", left: "0%", right: "0%" },
    "HALF": { top: "0%", bottom: "0%", left: "0%", right: "0%" }
  }[s.ratio] || { top: "0%", bottom: "0%", left: "0%", right: "0%" };

  view.style.setProperty("--blade-top", blades.top);
  view.style.setProperty("--blade-bottom", blades.bottom);
  view.style.setProperty("--blade-left", blades.left);
  view.style.setProperty("--blade-right", blades.right);

  // 半格分割线
  el("diptychDivider").hidden = (s.ratio !== "HALF");

  // 网格与辅助线
  el("grid").hidden = !s.grid;

  // 日期戳 (千禧CCD或特定胶卷)
  const isDate = sc.isCCD || r[0] === "28";
  el("dateStamp").hidden = !isDate;
  if (isDate) {
    const today = new Date();
    el("dateStamp").textContent = `'${String(today.getFullYear()).slice(-2)} ${String(today.getMonth() + 1).padStart(2, '0')} ${String(today.getDate()).padStart(2, '0')}`;
  }

  // 状态胶带
  el("badgeRoll").textContent = r[0];
  el("badgeName").textContent = r[1];

  // 闪光按钮
  const flashLabels = ["关", "自动", "开", "直闪"];
  const flashIcons = ["flashOff", "flashAuto", "flash", "flash"];
  el("flashLabel").textContent = flashLabels[s.flash];
  el("flashIcon").style.setProperty("--icon", window.cameraIconIndex[flashIcons[s.flash]]);
  el("flashButton").setAttribute("aria-pressed", s.flash > 0);

  // 画幅按钮
  el("ratioValue").textContent = s.ratio;

  // 网格按钮
  el("gridButton").setAttribute("aria-pressed", s.grid);

  // 定时按钮
  el("timerLabel").textContent = s.timer ? "3″" : "关";
  el("timerButton").setAttribute("aria-pressed", s.timer);

  // 定焦拨片
  document.querySelectorAll("[data-lens]").forEach(btn => {
    const on = Number(btn.dataset.lens) === s.lens;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", on);
  });

  // 计数器与胶卷仓标签
  el("count").textContent = String(s.n).padStart(4, "0");
  el("stockLabel").textContent = r[0];
  el("stockName").textContent = r[1];
  filmLauncher.title = "当前胶卷 · " + r[1];

  // 相册缩略图
  if (s.album.length > 0) {
    el("albumThumb").src = s.album[0].url;
  }
}

// 提示气泡 (Toast)
function toast(t, ms = 2100) {
  clearTimeout(toastTimer);
  const toastNode = el("toast");
  toastNode.innerHTML = icon("check") + "<span>" + t + "</span>";
  toastNode.hidden = false;
  toastTimer = setTimeout(() => { toastNode.hidden = true; }, ms);
}

// 照片生成与冲洗 (Canvas 极简零等待成片)
function developFrame() {
  const c = document.createElement("canvas");
  const [w, h] = s.ratio === "65:24" ? [65, 24] :
                 s.ratio === "HALF" ? [3, 4] :
                 s.ratio.split(":").map(Number);
  const sc = scene();
  const r = currentRoll();

  c.width = 960;
  c.height = Math.round(960 * h / w);
  const ctx = c.getContext("2d");

  const f = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight) * sc.zoom;
  const ww = img.naturalWidth * f, hh = img.naturalHeight * f;

  ctx.filter = sc.filter;
  if (s.flip) {
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, (c.width - ww) / 2, (c.height - hh) / 2, ww, hh);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = "none";

  // 暗角
  if (sc.corner > 0) {
    const g = ctx.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.32, c.width / 2, c.height / 2, Math.hypot(c.width, c.height) / 2);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, sc.corner === 2 ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.38)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
  }

  // 漏光斑
  if (sc.leak > 0) {
    const g = ctx.createLinearGradient(0, 0, c.width * 0.35, 0);
    g.addColorStop(0, "rgba(255,110,50,0.32)");
    g.addColorStop(1, "rgba(255,110,50,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
  }

  // 银盐微粒
  if (sc.grain > 0) {
    const imgData = ctx.getImageData(0, 0, c.width, c.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const delta = ((i * 59 % 131) / 131 - 0.5) * sc.grain * 22;
      d[i] += delta; d[i + 1] += delta; d[i + 2] += delta;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // 日期戳
  if (sc.isCCD || r[0] === "28") {
    ctx.font = "bold 26px monospace";
    ctx.fillStyle = "#ff8c2b";
    ctx.textAlign = "right";
    const today = new Date();
    const dateStr = `'${String(today.getFullYear()).slice(-2)} ${String(today.getMonth() + 1).padStart(2, '0')} ${String(today.getDate()).padStart(2, '0')}`;
    ctx.fillText(dateStr, c.width - 24, c.height - 20);
  }

  return c;
}

// 快门触发 (随手拍即拍即存)
function captured() {
  s.busy = false;
  if (!img.complete || !img.naturalWidth) {
    toast("取景器就绪中…");
    return;
  }

  // 1. 声音与微震
  playShutterSound();
  if (navigator.vibrate) navigator.vibrate([12, 35, 18]);

  // 2. 闪光灯与快门视觉反馈
  const fx = el("flashFrame");
  fx.classList.remove("blink");
  void fx.offsetWidth;
  if (s.flash > 0 || currentRoll()[10]) fx.classList.add("blink");

  // 3. 冲洗成片
  let c = developFrame();
  const r = currentRoll();

  // 半格双联逻辑
  if (s.ratio === "HALF" && !s.half) {
    s.half = c;
    toast("第一格已就绪 · 再拍一张拼接双联");
    render();
    return;
  }
  if (s.ratio === "HALF" && s.half) {
    const pair = document.createElement("canvas");
    pair.width = c.width * 2 + 16;
    pair.height = c.height;
    const pctx = pair.getContext("2d");
    pctx.fillStyle = "#120e0a";
    pctx.fillRect(0, 0, pair.width, pair.height);
    pctx.drawImage(s.half, 0, 0, c.width, c.height);
    pctx.drawImage(c, c.width + 16, 0, c.width, c.height);
    c = pair;
    s.half = null;
  }

  // 4. 存入相册并更新计数器
  s.n++;
  const url = c.toDataURL("image/jpeg", 0.92);
  const entry = {
    id: s.n,
    url,
    roll: r[1],
    date: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    ratio: s.ratio
  };
  s.album.unshift(entry);
  s.albumIndex = 0;

  render();
  toast(`已冲洗 · EXP ${String(s.n).padStart(4, "0")} · ${r[1]}`);
}

// 抽屉渲染与内容生成
function drawer() {
  if (!s.drawer) return;

  // 1. 拟物胶卷抽屉
  if (s.drawer === "film") {
    const rCurrent = currentRoll();
    const isFav = s.fav.has(s.roll);

    let html = `<div class="sheet-head">
      ${icon("film")}
      <strong>${rCurrent[1]} · ${rCurrent[2]}</strong>
      <span class="fill"></span>
      <button class="pill${isFav ? ' active' : ''}" data-act="favRoll" title="收藏此卷">${isFav ? '★ 已收藏' : '☆ 收藏'}</button>
    </div>`;

    // 标签栏
    html += '<div class="tabs">' + categories.map(cat => {
      const active = (s.cat === cat);
      return `<button class="pill${active ? ' active' : ''}" data-act="tabCat" data-value="${cat}">${cat}</button>`;
    }).join("") + '</div>';

    // 筛选对应分类胶卷
    const filtered = rolls.filter(r => {
      if (s.cat === "★ 收藏") return s.fav.has(r[0]);
      return r[4] === s.cat;
    });

    // 胶卷筒列表
    html += '<div class="rolls">' + filtered.map(([id, name, desc, color]) => {
      const active = (s.roll === id);
      return `<button class="roll${active ? ' active' : ''}" data-act="selectRoll" data-value="${id}" title="${name} · ${desc}">
        <span class="can">
          <img src="assets/roll.png" alt="">
          <b style="--band:${color}">${id}</b>
        </span>
        <small>${name}</small>
        <em>${desc}</em>
      </button>`;
    }).join("") + '</div>';

    sheetContent.innerHTML = html;
    return;
  }

  // 2. 拾光相簿
  if (s.drawer === "album") {
    if (s.album.length === 0) {
      sheetContent.innerHTML = `<div class="sheet-head">${icon("picture")}<strong>拾光相簿</strong></div>
        <div style="text-align:center;padding:24px 0;color:#7a634a;font-size:12px;">相簿还是空的，随手拍下第一张照片吧！</div>`;
      return;
    }

    const cur = s.album[s.albumIndex] || s.album[0];
    let html = `<div class="sheet-head">
      ${icon("picture")}
      <strong>相簿照片 (${s.albumIndex + 1}/${s.album.length})</strong>
      <span class="fill"></span>
      <button class="pill" data-act="downloadPhoto" title="保存到系统相册">下载照片</button>
    </div>`;

    html += `<div class="album-view">
      <div class="album-main">
        <img src="${cur.url}" alt="胶片大片">
      </div>
      <div class="album-side">
        <div class="album-info">
          <strong>EXP ${String(cur.id).padStart(4, "0")}</strong>
          <span>${cur.roll} · ${cur.ratio} · ${cur.date}</span>
        </div>
        <div class="album-btns">
          <button class="stamp-btn" data-act="extractSticker" title="将此照片主体提取为绘本贴纸">
            ◈ 提取贴纸
          </button>
        </div>
      </div>
    </div>`;

    sheetContent.innerHTML = html;
    return;
  }

  // 3. 贴纸提取与唤灵分支
  if (s.drawer === "sticker") {
    let html = `<div class="sheet-head">
      ${icon("sticker")}
      <strong>绘本贴纸提取</strong>
      <span class="fill"></span>
      <button class="pill" data-act="open" data-value="album">返回相册</button>
    </div>`;

    html += `<div class="sticker-modal">
      <div class="sticker-preview">
        <img src="assets/sprite.png" alt="台灯贴纸">
      </div>
      <div class="sticker-details">
        <div style="font-size:11px;color:#5c4731;">
          <strong>复古台灯贴纸 (1×1)</strong>
          <div>已自动去背并生成棉浆手绘纸纹与模切白边。</div>
        </div>
        <div style="margin-top:6px;">
          ${s.soulInfused
            ? '<button class="pill active" disabled>✓ 今日已注入灵魂 (阿灯)</button>'
            : '<button class="pill active" data-act="infuseSoul" style="background:#d88942;color:#fff;">✨ 注入灵魂 (今日剩余 1/1)</button>'}
        </div>
      </div>
    </div>`;

    sheetContent.innerHTML = html;
    return;
  }
}

// 抽屉动画开关
function openDrawer(name) {
  playClickSound(420);
  s.drawer = name;
  filmLauncher.setAttribute("aria-expanded", String(name === "film"));

  if (name) {
    sheet.hidden = false;
    drawer();
    sheet.style.transform = "translateY(0px)";
  } else {
    sheet.style.transform = "translateY(240px)";
    setTimeout(() => { if (!s.drawer) sheet.hidden = true; }, 200);
  }
}

// 核心用户交互派发
function handleAction(act, val) {
  playClickSound(580);

  if (act === "close") { openDrawer(""); return; }
  if (act === "open") { openDrawer(val); return; }

  // 快门
  if (act === "capture") {
    if (s.busy) return;
    if (s.timer) {
      s.busy = true;
      toast("3 秒后抓拍…", 2900);
      setTimeout(captured, 3000);
    } else {
      captured();
    }
    return;
  }

  // 闪光模式循环 (关 -> 自动 -> 开 -> 直闪)
  if (act === "flash") {
    s.flash = (s.flash + 1) % 4;
    render();
    toast("闪光灯 · " + ["关闭", "自动", "开启", "冷白直闪"][s.flash]);
    return;
  }

  // 画幅切换 (3:4 -> 1:1 -> 16:9 -> 65:24 -> HALF)
  if (act === "ratio") {
    const list = ["3:4", "1:1", "16:9", "65:24", "HALF"];
    const idx = (list.indexOf(s.ratio) + 1) % list.length;
    s.ratio = list[idx];
    s.half = null;
    render();
    toast("画幅切换 · " + s.ratio);
    return;
  }

  // 九宫网格
  if (act === "grid") {
    s.grid = !s.grid;
    render();
    return;
  }

  // 3秒定时
  if (act === "timer") {
    s.timer = !s.timer;
    render();
    toast(s.timer ? "已开启 3 秒延时拍摄" : "已关闭延时拍摄");
    return;
  }

  // 翻转镜头
  if (act === "flip") {
    s.flip = !s.flip;
    render();
    return;
  }

  // 焦段切换 (28mm / 50mm / 85mm)
  if (act === "lens") {
    s.lens = Number(val);
    playClickSound(720);
    render();
    toast(`焦段 · ${s.lens}mm`);
    return;
  }

  // 胶卷选择
  if (act === "selectRoll") {
    s.roll = val;
    render();
    drawer();
    toast("已装入胶卷 · " + currentRoll()[1]);
    return;
  }

  // 收藏胶卷
  if (act === "favRoll") {
    if (s.fav.has(s.roll)) s.fav.delete(s.roll);
    else s.fav.add(s.roll);
    drawer();
    return;
  }

  // 切换分类标签
  if (act === "tabCat") {
    s.cat = val;
    drawer();
    return;
  }

  // 提取贴纸
  if (act === "extractSticker") {
    openDrawer("sticker");
    return;
  }

  // 注入灵魂
  if (act === "infuseSoul") {
    s.soulInfused = true;
    drawer();
    toast("唤醒成功！阿灯已加入立体折纸剧场 ❤️", 3000);
    return;
  }

  // 下载照片
  if (act === "downloadPhoto") {
    const cur = s.album[s.albumIndex];
    if (cur) {
      const a = document.createElement("a");
      a.href = cur.url;
      a.download = `拾光胶片-EXP${cur.id}-${cur.roll}.jpg`;
      a.click();
    }
    return;
  }
}

// 事件监听与委托
stage.addEventListener("click", e => {
  const hit = e.target.closest("button");
  if (!hit) return;

  if (hit.dataset.sheet) {
    openDrawer(s.drawer === hit.dataset.sheet ? "" : hit.dataset.sheet);
    return;
  }
  if (hit.dataset.lens) {
    handleAction("lens", hit.dataset.lens);
    return;
  }
  if (hit.dataset.act || hit.dataset.action) {
    handleAction(hit.dataset.act || hit.dataset.action, hit.dataset.value);
    return;
  }
});

// 点击取景器对焦
el("view").addEventListener("click", e => {
  if (s.drawer) {
    openDrawer("");
    return;
  }
  const r = area.getBoundingClientRect();
  const f = el("focus");
  f.style.left = (e.clientX - r.left) / r.width * 100 + "%";
  f.style.top = (e.clientY - r.top) / r.height * 100 + "%";
  f.hidden = false;
  playClickSound(640);
  setTimeout(() => { f.hidden = true; }, 1800);
});

// Esc 关闭抽屉
addEventListener("keydown", e => {
  if (e.key === "Escape" && s.drawer) openDrawer("");
});

// 初始化启动
render();

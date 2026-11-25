import { sfx } from "./sfx.mjs";

function makeCanvas(container, w = 360, h = 420) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.className = "mg-canvas";
  container.replaceChildren(canvas);
  return { canvas, ctx: canvas.getContext("2d"), w, h };
}

function pointerPos(canvas, event) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - r.left) * (canvas.width / Math.max(1, r.width)),
    y: (event.clientY - r.top) * (canvas.height / Math.max(1, r.height))
  };
}

// 1. 抓大鹅·花园大杂烩 (Catch the Goose)
export function playCatchGoose(container, api) {
  const wrap = document.createElement("div");
  wrap.className = "mg-stack";
  const canvasWrap = document.createElement("div");
  const trayEl = document.createElement("div");
  trayEl.className = "mg-tray";
  const holdingEl = document.createElement("div");
  holdingEl.className = "mg-holding";
  wrap.append(holdingEl, canvasWrap, trayEl);
  container.replaceChildren(wrap);
  const { canvas, ctx, w, h } = makeCanvas(canvasWrap, 360, 310);

  const ICONS = [
    { id: "mush", icon: "🍄", bg: "#f6d8c6" },
    { id: "berry", icon: "🍓", bg: "#f7cad0" },
    { id: "cone", icon: "🌰", bg: "#e4c59e" },
    { id: "cup", icon: "🫖", bg: "#cfe2d8" },
    { id: "film", icon: "🎞️", bg: "#d9d4e8" },
    { id: "flower", icon: "🌷", bg: "#f8e2b8" },
    { id: "carrot", icon: "🥕", bg: "#f9d6b3" },
    { id: "yarn", icon: "🧶", bg: "#e8c4c4" },
    { id: "goose", icon: "🦢", bg: "#fff8e8" }
  ];

  let stage = 1, score = 0, combo = 0, items = [], tray = [], holding = [], history = [];
  let shakes = 3, removes = 1 + (api.perk?.bonusHint ? 1 : 0), undos = 1, autoMatches = 1;
  let running = true, raf = 0, shakeFx = 0;

  function spawnStage(st) {
    stage = st;
    tray = [];
    holding = [];
    history = [];
    items = [];
    const sets = st === 1 ? 5 : 14;
    const pool = st === 1 ? ICONS.slice(0, 5) : ICONS;
    let uid = 0;
    for (let s = 0; s < sets; s++) {
      const kind = (st === 2 && s === 0) ? ICONS[8] : pool[s % (st === 1 ? 5 : 8)];
      for (let k = 0; k < 3; k++) {
        items.push({
          uid: uid++,
          ...kind,
          x: 75 + Math.random() * 210,
          y: 65 + Math.random() * 175,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          r: kind.id === "goose" ? 28 : 22,
          rot: (Math.random() - 0.5) * 0.8,
          z: s * 3 + k
        });
      }
    }
    api.setHud({ stage: `第 ${stage} 关${stage === 2 ? " · 抓大鹅" : " · 热身"}`, score, hint: "点满盆杂物凑3消，卡住就点「狂晃大盆」！" });
    renderTray();
    updateProps();
  }

  function updateProps() {
    api.setProps([
      { label: `狂晃大盆 (${shakes})`, disabled: shakes <= 0, onClick: () => {
        if (shakes <= 0) return;
        shakes--;
        shakeFx = 14;
        sfx.thud();
        for (const it of items) {
          it.vx = (Math.random() - 0.5) * 14;
          it.vy = -6 - Math.random() * 10;
          it.z = Math.random() * 100;
        }
        items.sort((a, b) => a.z - b.z);
        api.cheer("哗啦啦！底下大鹅露头啦！");
        updateProps();
      }},
      { label: `移出3件 (${removes})`, disabled: removes <= 0 || tray.length === 0, onClick: () => {
        if (removes <= 0 || !tray.length) return;
        removes--;
        holding.push(...tray.splice(0, 3));
        sfx.pop(1);
        renderTray();
        updateProps();
      }},
      { label: `撤回 (${undos})`, disabled: undos <= 0 || !history.length, onClick: () => {
        if (undos <= 0 || !history.length) return;
        undos--;
        const last = history.pop();
        const idx = tray.findIndex(t => t.uid === last.uid);
        if (idx >= 0) {
          tray.splice(idx, 1);
          items.push({ ...last, vy: -4 });
          sfx.click();
          renderTray();
          updateProps();
        }
      }},
      { label: `凑齐一组 (${autoMatches})`, disabled: autoMatches <= 0 || (!tray.length && !items.length), onClick: () => {
        if (autoMatches <= 0) return;
        const targetId = tray[0]?.id || items[0]?.id;
        if (!targetId) return;
        autoMatches--;
        const needed = 3 - tray.filter(t => t.id === targetId).length;
        for (let i = 0; i < needed; i++) {
          const idx = items.findIndex(it => it.id === targetId);
          if (idx >= 0) tray.push(items.splice(idx, 1)[0]);
        }
        resolveMatches();
        renderTray();
        updateProps();
      }}
    ]);
  }

  function resolveMatches() {
    const counts = {};
    for (const t of tray) counts[t.id] = (counts[t.id] || 0) + 1;
    let matched = false;
    for (const [id, c] of Object.entries(counts)) {
      if (c >= 3) {
        let rem = 3;
        tray = tray.filter(t => {
          if (t.id === id && rem > 0) { rem--; return false; }
          return true;
        });
        combo++;
        score += 30 + combo * 5 + (id === "goose" ? 80 : 0);
        sfx.pop(combo);
        matched = true;
        if (id === "goose") api.cheer("抓到大白鹅啦！！");
      }
    }
    if (!matched) combo = 0;
    api.setHud({ stage: `第 ${stage} 关`, score, hint: `剩余 ${items.length + holding.length} 件杂物` });
    if (items.length === 0 && holding.length === 0 && tray.length === 0) {
      if (stage === 1) {
        sfx.win();
        api.cheer("第1关秒过！第2关超级大杂烩来了！");
        setTimeout(() => running && spawnStage(2), 550);
      } else {
        running = false;
        sfx.win();
        api.finish({ score: score + 120, stageCleared: 2, milestoneReached: true, summary: "成功抓到花园大白鹅！" });
      }
    } else if (tray.length >= 7) {
      running = false;
      sfx.fail();
      api.finish({ score, stageCleared: stage - 1, milestoneReached: false, summary: "7格槽已满，差点就抓到大鹅了！" });
    }
  }

  function pickItem(item, fromHolding = false) {
    if (!running || tray.length >= 7) return;
    sfx.click();
    if (fromHolding) {
      const idx = holding.indexOf(item);
      if (idx >= 0) holding.splice(idx, 1);
    } else {
      const idx = items.indexOf(item);
      if (idx >= 0) items.splice(idx, 1);
      history.push(item);
    }
    const sameIdx = tray.map(t => t.id).lastIndexOf(item.id);
    if (sameIdx >= 0) tray.splice(sameIdx + 1, 0, item);
    else tray.push(item);
    resolveMatches();
    renderTray();
    updateProps();
  }

  function renderTray() {
    trayEl.replaceChildren();
    for (let i = 0; i < 7; i++) {
      const slot = document.createElement("div");
      slot.className = "mg-slot";
      if (tray[i]) {
        slot.textContent = tray[i].icon;
        slot.style.background = tray[i].bg;
      }
      trayEl.append(slot);
    }
    holdingEl.replaceChildren();
    for (const hItem of holding) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mg-slot mg-slot-btn";
      btn.textContent = hItem.icon;
      btn.style.background = hItem.bg;
      btn.onclick = () => pickItem(hItem, true);
      holdingEl.append(btn);
    }
  }

  canvas.addEventListener("pointerdown", e => {
    if (!running) return;
    const p = pointerPos(canvas, e);
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (Math.hypot(p.x - it.x, p.y - it.y) <= it.r + 5) {
        pickItem(it, false);
        return;
      }
    }
  });

  function loop() {
    if (!running || api.signal.aborted) return;
    if (shakeFx > 0) shakeFx--;
    const ox = shakeFx ? (Math.random() - 0.5) * 10 : 0;
    const oy = shakeFx ? (Math.random() - 0.5) * 8 : 0;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(ox, oy);
    // Warm ceramic bowl
    ctx.fillStyle = "#e8d2b2";
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2 + 6, 162, 134, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#b57d52";
    ctx.stroke();
    ctx.fillStyle = "#f5e7ce";
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2 + 6, 146, 118, 0, 0, Math.PI * 2);
    ctx.fill();

    const cx = w / 2, cy = h / 2 + 6;
    for (const it of items) {
      it.vy += 0.22;
      it.vx *= 0.94;
      it.vy *= 0.94;
      it.x += it.vx;
      it.y += it.vy;
      // Keep inside ellipse bowl
      const dx = (it.x - cx) / 124;
      const dy = (it.y - cy) / 96;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        it.x = cx + (dx / d) * 124;
        it.y = cy + (dy / d) * 96;
        it.vx *= -0.45;
        it.vy *= -0.45;
      }
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.rot);
      ctx.fillStyle = "rgba(62,36,18,0.22)";
      ctx.beginPath();
      ctx.arc(2, 4, it.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = it.bg;
      ctx.beginPath();
      ctx.arc(0, 0, it.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#8a5f3e";
      ctx.stroke();
      ctx.font = `${Math.round(it.r * 1.18)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(it.icon, 0, 1);
      ctx.restore();
    }
    ctx.restore();
    raf = requestAnimationFrame(loop);
  }

  spawnStage(1);
  raf = requestAnimationFrame(loop);
  api.signal.addEventListener("abort", () => { running = false; cancelAnimationFrame(raf); });
}

// 2. 纸牌叠叠消 (羊了个羊)
export function playSheepMatch(container, api) {
  const wrap = document.createElement("div");
  wrap.className = "mg-stack";
  const holdingEl = document.createElement("div");
  holdingEl.className = "mg-holding";
  const boardEl = document.createElement("div");
  boardEl.className = "mg-sheep-board";
  const trayEl = document.createElement("div");
  trayEl.className = "mg-tray";
  wrap.append(holdingEl, boardEl, trayEl);
  container.replaceChildren(wrap);

  const SYMBOLS = ["🐑", "🍄", "🫖", "🎞️", "🌙", "⛵", "🌷", "🔔", "🍓"];
  let stage = 1, score = 0, cards = [], tray = [], holding = [], history = [];
  let removes = 1 + (api.perk?.bonusHint ? 1 : 0), undos = 1, shuffles = 1;
  let running = true;

  function buildStage(st) {
    stage = st;
    cards = [];
    tray = [];
    holding = [];
    history = [];
    const sets = st === 1 ? 6 : 16;
    const symCount = st === 1 ? 4 : 8;
    const pool = [];
    for (let s = 0; s < sets; s++) {
      const sym = SYMBOLS[s % symCount];
      pool.push(sym, sym, sym);
    }
    pool.sort(() => Math.random() - 0.5);
    const cols = st === 1 ? 3 : 5;
    pool.forEach((sym, i) => {
      const layer = Math.floor(i / (cols * 3));
      const idx = i % (cols * 3);
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const offset = (layer % 2) * 18;
      cards.push({
        id: i,
        sym,
        layer,
        x: (st === 1 ? 72 : 24) + col * 58 + offset + (Math.random() - 0.5) * 6,
        y: 20 + row * 62 + offset * 0.7
      });
    });
    api.setHud({ stage: `第 ${stage} 关${stage === 1 ? " · 10秒热身" : " · 魔性叠牌"}`, score, hint: "点亮着的牌凑 3 张消除！" });
    render();
    updateProps();
  }

  function isBlocked(card) {
    return cards.some(other => other.layer > card.layer && Math.abs(other.x - card.x) < 42 && Math.abs(other.y - card.y) < 46);
  }

  function updateProps() {
    api.setProps([
      { label: `移出3张 (${removes})`, disabled: removes <= 0 || !tray.length, onClick: () => {
        if (removes <= 0 || !tray.length) return;
        removes--;
        holding.push(...tray.splice(0, 3));
        sfx.pop(1);
        render();
        updateProps();
      }},
      { label: `撤回 (${undos})`, disabled: undos <= 0 || !history.length, onClick: () => {
        if (undos <= 0 || !history.length) return;
        undos--;
        const last = history.pop();
        const idx = tray.findIndex(t => t.id === last.id);
        if (idx >= 0) {
          tray.splice(idx, 1);
          cards.push(last);
          sfx.click();
          render();
          updateProps();
        }
      }},
      { label: `洗牌 (${shuffles})`, disabled: shuffles <= 0 || cards.length < 2, onClick: () => {
        if (shuffles <= 0) return;
        shuffles--;
        const syms = cards.map(c => c.sym).sort(() => Math.random() - 0.5);
        cards.forEach((c, i) => { c.sym = syms[i]; });
        sfx.pop(2);
        render();
        updateProps();
      }}
    ]);
  }

  function pick(card, fromHolding = false) {
    if (!running || tray.length >= 7) return;
    if (!fromHolding && isBlocked(card)) { sfx.thud(); return; }
    sfx.click();
    if (fromHolding) {
      holding = holding.filter(c => c.id !== card.id);
    } else {
      cards = cards.filter(c => c.id !== card.id);
      history.push(card);
    }
    const pos = tray.map(t => t.sym).lastIndexOf(card.sym);
    if (pos >= 0) tray.splice(pos + 1, 0, card);
    else tray.push(card);

    const counts = {};
    for (const t of tray) counts[t.sym] = (counts[t.sym] || 0) + 1;
    for (const [sym, n] of Object.entries(counts)) {
      if (n >= 3) {
        let r = 3;
        tray = tray.filter(t => (t.sym === sym && r > 0 ? (r--, false) : true));
        score += 35;
        sfx.pop(3);
      }
    }
    api.setHud({ stage: `第 ${stage} 关`, score, hint: `场上还剩 ${cards.length + holding.length} 张牌` });
    render();
    updateProps();
    if (!cards.length && !holding.length && !tray.length) {
      if (stage === 1) {
        sfx.win();
        api.cheer("第1关秒过！欢迎来到真正的第2关！");
        setTimeout(() => running && buildStage(2), 500);
      } else {
        running = false;
        sfx.win();
        api.finish({ score: score + 150, stageCleared: 2, milestoneReached: true, summary: "居然通关了羊了个羊第 2 关！" });
      }
    } else if (tray.length >= 7) {
      running = false;
      sfx.fail();
      api.finish({ score, stageCleared: stage - 1, milestoneReached: false, summary: "卡槽满啦，就差最后几张！" });
    }
  }

  function render() {
    boardEl.replaceChildren();
    const sorted = [...cards].sort((a, b) => a.layer - b.layer);
    for (const c of sorted) {
      const blocked = isBlocked(c);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mg-card-tile";
      btn.dataset.blocked = String(blocked);
      btn.style.left = `${c.x}px`;
      btn.style.top = `${c.y}px`;
      btn.style.zIndex = String(c.layer * 10 + 1);
      btn.textContent = c.sym;
      btn.onclick = () => pick(c, false);
      boardEl.append(btn);
    }
    trayEl.replaceChildren();
    for (let i = 0; i < 7; i++) {
      const slot = document.createElement("div");
      slot.className = "mg-slot";
      if (tray[i]) slot.textContent = tray[i].sym;
      trayEl.append(slot);
    }
    holdingEl.replaceChildren();
    for (const c of holding) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mg-slot mg-slot-btn";
      btn.textContent = c.sym;
      btn.onclick = () => pick(c, true);
      holdingEl.append(btn);
    }
  }

  buildStage(1);
  api.signal.addEventListener("abort", () => { running = false; });
}

// 3. 六边形叠叠消 (Hexa Sort)
export function playHexaSort(container, api) {
  const wrap = document.createElement("div");
  wrap.className = "mg-stack";
  const gridEl = document.createElement("div");
  gridEl.className = "mg-hex-grid";
  const handEl = document.createElement("div");
  handEl.className = "mg-hand-row";
  wrap.append(gridEl, handEl);
  container.replaceChildren(wrap);

  const COLORS = ["#df7c65", "#76a27a", "#e6b85c", "#7492b8", "#c286a8"];
  const cells = Array.from({ length: 16 }, () => []);
  let hand = [], selectedIdx = 0, cleared = 0, score = 0, refreshes = 2 + (api.perk?.bonusHint ? 1 : 0);
  let running = true;

  function makeStack() {
    const k = Math.random() < 0.45 ? 1 : 2;
    const c1 = COLORS[Math.floor(Math.random() * COLORS.length)];
    const c2 = COLORS[Math.floor(Math.random() * COLORS.length)];
    const arr = [];
    const n1 = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n1; i++) arr.push(c1);
    if (k === 2 && c2 !== c1) {
      const n2 = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n2; i++) arr.push(c2);
    }
    return arr;
  }

  function dealHand() {
    hand = [makeStack(), makeStack(), makeStack()];
    selectedIdx = 0;
  }

  function neighborsOf(i) {
    const r = Math.floor(i / 4), c = i % 4;
    return [[-1, 0], [1, 0], [0, -1], [0, 1]]
      .map(([dr, dc]) => [r + dr, c + dc])
      .filter(([nr, nc]) => nr >= 0 && nr < 4 && nc >= 0 && nc < 4)
      .map(([nr, nc]) => nr * 4 + nc);
  }

  function topRun(stack) {
    if (!stack.length) return { color: null, count: 0 };
    const top = stack[stack.length - 1];
    let count = 0;
    for (let i = stack.length - 1; i >= 0 && stack[i] === top; i--) count++;
    return { color: top, count };
  }

  function cascade(startIdx) {
    let changed = true;
    let chain = 0;
    while (changed) {
      changed = false;
      for (let i = 0; i < cells.length; i++) {
        if (!cells[i].length) continue;
        const a = topRun(cells[i]);
        for (const nb of neighborsOf(i)) {
          if (!cells[nb].length) continue;
          const b = topRun(cells[nb]);
          if (a.color === b.color) {
            const target = i === startIdx || a.count >= b.count ? i : nb;
            const src = target === i ? nb : i;
            const run = topRun(cells[src]);
            for (let k = 0; k < run.count; k++) cells[target].push(cells[src].pop());
            changed = true;
            chain++;
            sfx.pop(chain);
            break;
          }
        }
      }
      for (let i = 0; i < cells.length; i++) {
        const run = topRun(cells[i]);
        if (run.count >= 8) {
          for (let k = 0; k < run.count; k++) cells[i].pop();
          cleared += run.count;
          score += run.count * 12;
          sfx.coin();
          api.cheer(`哗啦啦爆消 ${run.count} 片！`);
          changed = true;
        }
      }
    }
  }

  function placeAt(idx) {
    if (!running || cells[idx].length || !hand[selectedIdx]) return;
    cells[idx] = [...hand[selectedIdx]];
    hand[selectedIdx] = null;
    sfx.click();
    cascade(idx);
    if (hand.every(h => !h)) dealHand();
    else selectedIdx = hand.findIndex(Boolean);
    api.setHud({ stage: cleared >= 60 ? "目标达成！" : `已消 ${cleared}/60 片`, score, hint: "选下方纸片摞，放进相邻同色空位自动飞叠！" });
    render();
    updateProps();
    if (cleared >= 60) {
      running = false;
      sfx.win();
      api.finish({ score: score + 100, stageCleared: 2, milestoneReached: true, summary: `累计爆消 ${cleared} 片彩色六边形！` });
    } else if (cells.every(c => c.length > 0)) {
      running = false;
      sfx.fail();
      api.finish({ score, stageCleared: cleared >= 24 ? 1 : 0, milestoneReached: false, summary: `棋盘已满，共消除了 ${cleared} 片！` });
    }
  }

  function updateProps() {
    api.setProps([
      { label: `刷新手牌 (${refreshes})`, disabled: refreshes <= 0, onClick: () => {
        if (refreshes <= 0) return;
        refreshes--;
        dealHand();
        sfx.click();
        render();
        updateProps();
      }}
    ]);
  }

  function renderStackVisual(el, stack) {
    el.replaceChildren();
    if (!stack || !stack.length) return;
    const shown = stack.slice(-8);
    shown.forEach((col, i) => {
      const chip = document.createElement("span");
      chip.className = "mg-hex-chip";
      chip.style.background = col;
      chip.style.bottom = `${4 + i * 5}px`;
      el.append(chip);
    });
    const badge = document.createElement("em");
    badge.className = "mg-hex-count";
    badge.textContent = String(stack.length);
    el.append(badge);
  }

  function render() {
    gridEl.replaceChildren();
    cells.forEach((stack, i) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "mg-hex-cell";
      cell.dataset.filled = String(stack.length > 0);
      renderStackVisual(cell, stack);
      cell.onclick = () => placeAt(i);
      gridEl.append(cell);
    });
    handEl.replaceChildren();
    hand.forEach((stack, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mg-hex-hand";
      btn.dataset.selected = String(i === selectedIdx && Boolean(stack));
      btn.disabled = !stack;
      renderStackVisual(btn, stack);
      btn.onclick = () => { selectedIdx = i; render(); };
      handEl.append(btn);
    });
  }

  dealHand();
  api.setHud({ stage: "六边形叠叠消", score: 0, hint: "同色自动飞叠，满 8 片整摞炸消！" });
  render();
  updateProps();
  api.signal.addEventListener("abort", () => { running = false; });
}

// 4. 货架整理三消 (Goods Sort)
export function playGoodsSort(container, api) {
  const wrap = document.createElement("div");
  wrap.className = "mg-goods-grid";
  container.replaceChildren(wrap);

  const ITEMS = ["🍓", "🍯", "🫖", "🥐", "🪴", "📷", "🕯️", "🍪"];
  let stage = 1, score = 0, shelves = [], selected = null, running = true;
  let shuffles = 1 + (api.perk?.bonusHint ? 1 : 0);

  function buildStage(st) {
    stage = st;
    selected = null;
    const shelfCount = st === 1 ? 6 : 9;
    const sets = st === 1 ? 4 : 9;
    const frontPool = [];
    for (let s = 0; s < sets; s++) {
      const it = ITEMS[s % (st === 1 ? 4 : 7)];
      frontPool.push(it, it, it);
    }
    frontPool.sort(() => Math.random() - 0.5);
    shelves = Array.from({ length: shelfCount }, () => ({ front: [null, null, null], back: [] }));
    let idx = 0;
    for (let i = 0; i < shelfCount && idx < frontPool.length; i++) {
      for (let slot = 0; slot < 2 && idx < frontPool.length; slot++) {
        shelves[i].front[slot] = frontPool[idx++];
      }
    }
    while (idx < frontPool.length) {
      const s = shelves[idx % shelfCount];
      s.back.push(frontPool[idx++]);
    }
    api.setHud({ stage: `第 ${stage} 关 · 货架三消`, score, hint: "点选商品再点空位挪过去，同一格凑 3 个消掉！" });
    render();
    updateProps();
  }

  function updateProps() {
    api.setProps([
      { label: `重排货架 (${shuffles})`, disabled: shuffles <= 0, onClick: () => {
        if (shuffles <= 0) return;
        shuffles--;
        const all = [];
        for (const sh of shelves) {
          sh.front.forEach((v, i) => { if (v) { all.push(v); sh.front[i] = null; } });
        }
        all.sort(() => Math.random() - 0.5);
        let k = 0;
        for (const sh of shelves) for (let i = 0; i < 3 && k < all.length; i++) {
          if (i < 2 || k >= all.length - 2) sh.front[i] = all[k++];
        }
        sfx.pop(1);
        render();
        updateProps();
      }}
    ]);
  }

  function checkShelf(sh) {
    if (sh.front[0] && sh.front[0] === sh.front[1] && sh.front[1] === sh.front[2]) {
      sh.front = [null, null, null];
      score += 45;
      sfx.pop(3);
    }
    if (sh.front.every(v => !v) && sh.back.length) {
      for (let i = 0; i < 3 && sh.back.length; i++) sh.front[i] = sh.back.shift();
      sfx.click();
    }
  }

  function tapSlot(si, slotIdx) {
    if (!running) return;
    const val = shelves[si].front[slotIdx];
    if (!selected) {
      if (val) { selected = { si, slotIdx }; sfx.click(); render(); }
      return;
    }
    if (selected.si === si && selected.slotIdx === slotIdx) {
      selected = null;
      render();
      return;
    }
    if (!val) {
      shelves[si].front[slotIdx] = shelves[selected.si].front[selected.slotIdx];
      shelves[selected.si].front[selected.slotIdx] = null;
      const fromSi = selected.si;
      selected = null;
      checkShelf(shelves[si]);
      checkShelf(shelves[fromSi]);
      render();
      const left = shelves.reduce((n, sh) => n + sh.front.filter(Boolean).length + sh.back.length, 0);
      api.setHud({ stage: `第 ${stage} 关`, score, hint: `剩余 ${left} 件货品` });
      if (left === 0) {
        if (stage === 1) {
          sfx.win();
          api.cheer("货架清空！第 2 关多层补货来了！");
          setTimeout(() => running && buildStage(2), 450);
        } else {
          running = false;
          sfx.win();
          api.finish({ score: score + 120, stageCleared: 2, milestoneReached: true, summary: "全部货柜整理完毕！" });
        }
      }
    } else {
      selected = { si, slotIdx };
      sfx.click();
      render();
    }
  }

  function render() {
    wrap.replaceChildren();
    shelves.forEach((sh, si) => {
      const shelfEl = document.createElement("div");
      shelfEl.className = "mg-shelf";
      if (sh.back.length) {
        const backHint = document.createElement("div");
        backHint.className = "mg-shelf-back";
        backHint.textContent = sh.back.slice(0, 3).join("");
        shelfEl.append(backHint);
      }
      const row = document.createElement("div");
      row.className = "mg-shelf-row";
      sh.front.forEach((item, slotIdx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mg-goods-slot";
        btn.dataset.selected = String(selected?.si === si && selected?.slotIdx === slotIdx);
        btn.textContent = item || "";
        btn.onclick = () => tapSlot(si, slotIdx);
        row.append(btn);
      });
      shelfEl.append(row);
      wrap.append(shelfEl);
    });
  }

  buildStage(1);
  api.signal.addEventListener("abort", () => { running = false; });
}

// 5. 礼盒打包流水线 (Coffee Pack)
export function playCoffeePack(container, api) {
  const wrap = document.createElement("div");
  wrap.className = "mg-stack";
  const gridEl = document.createElement("div");
  gridEl.className = "mg-pack-grid";
  const handEl = document.createElement("div");
  handEl.className = "mg-hand-row";
  wrap.append(gridEl, handEl);
  container.replaceChildren(wrap);

  const PASTRIES = ["🧁", "🍩", "🥐", "🍓"];
  const board = Array.from({ length: 12 }, () => null);
  let hand = [], selectedIdx = 0, packed = 0, score = 0, running = true;
  let refreshes = 2 + (api.perk?.bonusHint ? 1 : 0);

  function makeBox() {
    const n = 2 + Math.floor(Math.random() * 3);
    const c1 = PASTRIES[Math.floor(Math.random() * PASTRIES.length)];
    const c2 = PASTRIES[Math.floor(Math.random() * PASTRIES.length)];
    const items = [];
    for (let i = 0; i < n; i++) items.push(i < Math.ceil(n / 2) ? c1 : c2);
    return items;
  }

  function deal() {
    hand = [makeBox(), makeBox(), makeBox()];
    selectedIdx = 0;
  }

  function neighbors(i) {
    const r = Math.floor(i / 4), c = i % 4;
    return [[-1, 0], [1, 0], [0, -1], [0, 1]]
      .map(([dr, dc]) => [r + dr, c + dc])
      .filter(([nr, nc]) => nr >= 0 && nr < 3 && nc >= 0 && nc < 4)
      .map(([nr, nc]) => nr * 4 + nc);
  }

  function resolvePacks() {
    let moved = true;
    while (moved) {
      moved = false;
      for (let i = 0; i < board.length; i++) {
        if (!board[i]?.length) continue;
        for (const nb of neighbors(i)) {
          if (!board[nb]?.length) continue;
          // Find shared pastry type
          const shared = board[i].find(x => board[nb].includes(x));
          if (!shared) continue;
          const cntA = board[i].filter(x => x === shared).length;
          const cntB = board[nb].filter(x => x === shared).length;
          const target = cntA >= cntB ? i : nb;
          const src = target === i ? nb : i;
          while (board[target].length < 6) {
            const k = board[src].indexOf(shared);
            if (k < 0) break;
            board[target].push(board[src].splice(k, 1)[0]);
            moved = true;
          }
          if (board[src].length === 0) board[src] = null;
          if (moved) { sfx.pop(2); break; }
        }
      }
      for (let i = 0; i < board.length; i++) {
        if (board[i] && board[i].length === 6 && board[i].every(x => x === board[i][0])) {
          board[i] = null;
          packed++;
          score += 55;
          sfx.coin();
          api.cheer(`第 ${packed} 盒点心封箱飞走！`);
          moved = true;
        }
      }
    }
  }

  function place(idx) {
    if (!running || board[idx] || !hand[selectedIdx]) return;
    board[idx] = [...hand[selectedIdx]];
    hand[selectedIdx] = null;
    sfx.click();
    resolvePacks();
    if (hand.every(h => !h)) deal();
    else selectedIdx = hand.findIndex(Boolean);
    api.setHud({ stage: `已打包 ${packed}/10 盒`, score, hint: "相邻同口味自动飞入一盒，满 6 颗盖盖飞走！" });
    render();
    updateProps();
    if (packed >= 10) {
      running = false;
      sfx.win();
      api.finish({ score: score + 110, stageCleared: 2, milestoneReached: true, summary: `一口气打包了 ${packed} 盒手工点心！` });
    } else if (board.every(Boolean)) {
      running = false;
      sfx.fail();
      api.finish({ score, stageCleared: packed >= 4 ? 1 : 0, milestoneReached: false, summary: `台面放满了，共打包 ${packed} 盒！` });
    }
  }

  function updateProps() {
    api.setProps([
      { label: `刷新礼盒 (${refreshes})`, disabled: refreshes <= 0, onClick: () => {
        if (refreshes <= 0) return;
        refreshes--;
        deal();
        sfx.click();
        render();
        updateProps();
      }}
    ]);
  }

  function renderBox(el, box) {
    el.replaceChildren();
    if (!box) return;
    for (let i = 0; i < 6; i++) {
      const s = document.createElement("span");
      s.className = "mg-pack-pip";
      s.textContent = box[i] || "";
      el.append(s);
    }
  }

  function render() {
    gridEl.replaceChildren();
    board.forEach((b, i) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "mg-pack-cell";
      cell.dataset.filled = String(Boolean(b));
      renderBox(cell, b);
      cell.onclick = () => place(i);
      gridEl.append(cell);
    });
    handEl.replaceChildren();
    hand.forEach((b, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mg-pack-cell mg-pack-hand";
      btn.dataset.selected = String(i === selectedIdx && Boolean(b));
      btn.disabled = !b;
      renderBox(btn, b);
      btn.onclick = () => { selectedIdx = i; render(); };
      handEl.append(btn);
    });
  }

  deal();
  api.setHud({ stage: "礼盒打包流水线", score: 0, hint: "选中下方礼盒放到台面，凑满 6 颗同口味自动封箱！" });
  render();
  updateProps();
  api.signal.addEventListener("abort", () => { running = false; });
}

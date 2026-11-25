import { sfx } from "./sfx.mjs";

function makeCanvas(container, w = 360, h = 360) {
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

// 6. 书桌拆螺丝 (Screw Jam)
export function playScrewJam(container, api) {
  const wrap = document.createElement("div");
  wrap.className = "mg-stack";
  const boxesEl = document.createElement("div");
  boxesEl.className = "mg-screw-boxes";
  const holesEl = document.createElement("div");
  holesEl.className = "mg-holding";
  const canvasWrap = document.createElement("div");
  wrap.append(boxesEl, holesEl, canvasWrap);
  container.replaceChildren(wrap);
  const { canvas, ctx, w, h } = makeCanvas(canvasWrap, 360, 290);

  const COLORS = [
    { id: "red", hex: "#d96556", label: "红" },
    { id: "gold", hex: "#e5b24e", label: "黄" },
    { id: "blue", hex: "#5f8db8", label: "蓝" },
    { id: "green", hex: "#6b9c72", label: "绿" }
  ];

  let stage = 1, score = 0, plates = [], screws = [], activeBoxes = [], boxQueue = [], holes = [];
  let maxHoles = 5, running = true, raf = 0;
  let extraHoleUses = 1, smashUses = 1 + (api.perk?.bonusHint ? 1 : 0);

  function buildStage(st) {
    stage = st;
    plates = [];
    screws = [];
    holes = [];
    maxHoles = 5;
    const plateCount = st === 1 ? 3 : 6;
    const colorPool = [];
    const totalScrews = plateCount * 3;
    for (let i = 0; i < totalScrews / 3; i++) {
      const col = COLORS[i % (st === 1 ? 3 : 4)];
      colorPool.push(col, col, col);
    }
    colorPool.sort(() => Math.random() - 0.5);
    const boxColors = [];
    for (let i = 0; i < totalScrews / 3; i++) boxColors.push(COLORS[i % (st === 1 ? 3 : 4)]);
    boxQueue = boxColors.sort(() => Math.random() - 0.5).map(c => ({ color: c, filled: 0 }));
    activeBoxes = [boxQueue.shift(), boxQueue.shift()].filter(Boolean);

    let sIdx = 0;
    for (let p = 0; p < plateCount; p++) {
      const pw = 148 + (p % 2) * 34;
      const ph = 86 + (p % 3) * 16;
      const px = 42 + ((p * 53) % 130);
      const py = 36 + ((p * 47) % 130);
      const plate = {
        id: p, layer: p, x: px, y: py, w: pw, h: ph,
        tint: `hsla(${24 + p * 38}, 55%, 78%, 0.72)`,
        falling: false, vy: 0, rot: 0, alpha: 1
      };
      plates.push(plate);
      const offsets = [[24, 24], [pw - 24, 24], [pw / 2, ph - 22]];
      for (const [ox, oy] of offsets) {
        const col = colorPool[sIdx++];
        screws.push({ id: sIdx, plateId: p, layer: p, x: px + ox, y: py + oy, color: col, removed: false });
      }
    }
    api.setHud({ stage: `第 ${stage} 关 · 拆螺丝`, score, hint: "点拧露出的螺丝装进上方同色盒，板子松了会直接掉落！" });
    renderTop();
    updateProps();
  }

  function isScrewBlocked(sc) {
    return plates.some(pl => !pl.falling && pl.layer > sc.layer &&
      sc.x > pl.x + 4 && sc.x < pl.x + pl.w - 4 && sc.y > pl.y + 4 && sc.y < pl.y + pl.h - 4);
  }

  function flushHolesToBoxes() {
    let moved = true;
    while (moved) {
      moved = false;
      for (let i = holes.length - 1; i >= 0; i--) {
        const box = activeBoxes.find(b => b.color.id === holes[i].id && b.filled < 3);
        if (box) {
          holes.splice(i, 1);
          box.filled++;
          score += 15;
          moved = true;
        }
      }
      for (let bi = 0; bi < activeBoxes.length; bi++) {
        if (activeBoxes[bi].filled >= 3) {
          score += 35;
          sfx.coin();
          if (boxQueue.length) activeBoxes[bi] = boxQueue.shift();
          else activeBoxes.splice(bi, 1);
          moved = true;
          break;
        }
      }
    }
  }

  function checkPlateDrops() {
    for (const pl of plates) {
      if (pl.falling) continue;
      const alive = screws.some(s => s.plateId === pl.id && !s.removed);
      if (!alive) {
        pl.falling = true;
        pl.vy = 2;
        score += 40;
        sfx.pop(3);
      }
    }
    const remaining = screws.filter(s => !s.removed).length;
    api.setHud({ stage: `第 ${stage} 关`, score, hint: `剩余 ${remaining} 颗螺丝` });
    if (remaining === 0 && holes.length === 0) {
      if (stage === 1) {
        sfx.win();
        api.cheer("第1关秒拆！第2关多层亚克力板来了！");
        setTimeout(() => running && buildStage(2), 550);
      } else {
        running = false;
        sfx.win();
        api.finish({ score: score + 140, stageCleared: 2, milestoneReached: true, summary: "全部螺丝与木板完美拆空！" });
      }
    } else if (holes.length >= maxHoles && !screws.some(s => !s.removed && !isScrewBlocked(s) && activeBoxes.some(b => b.color.id === s.color.id))) {
      running = false;
      sfx.fail();
      api.finish({ score, stageCleared: stage - 1, milestoneReached: false, summary: "临时孔满啦，差一点就拆完！" });
    }
  }

  function unscrew(sc) {
    if (!running || sc.removed) return;
    if (isScrewBlocked(sc)) { sfx.thud(); return; }
    const box = activeBoxes.find(b => b.color.id === sc.color.id && b.filled < 3);
    if (box) {
      sc.removed = true;
      box.filled++;
      score += 20;
      sfx.screw();
    } else if (holes.length < maxHoles) {
      sc.removed = true;
      holes.push(sc.color);
      sfx.screw();
    } else {
      sfx.thud();
      return;
    }
    flushHolesToBoxes();
    renderTop();
    checkPlateDrops();
    updateProps();
  }

  function updateProps() {
    api.setProps([
      { label: `扩充临时孔 (${extraHoleUses})`, disabled: extraHoleUses <= 0, onClick: () => {
        if (extraHoleUses <= 0) return;
        extraHoleUses--;
        maxHoles++;
        sfx.pop(1);
        renderTop();
        updateProps();
      }},
      { label: `震碎最顶板 (${smashUses})`, disabled: smashUses <= 0 || !plates.some(p => !p.falling), onClick: () => {
        const topPlate = [...plates].filter(p => !p.falling).sort((a, b) => b.layer - a.layer)[0];
        if (!topPlate || smashUses <= 0) return;
        smashUses--;
        for (const sc of screws) {
          if (sc.plateId === topPlate.id && !sc.removed) {
            sc.removed = true;
            const box = activeBoxes.find(b => b.color.id === sc.color.id && b.filled < 3) || boxQueue.find(b => b.color.id === sc.color.id && b.filled < 3);
            if (box) box.filled++;
          }
        }
        flushHolesToBoxes();
        renderTop();
        checkPlateDrops();
        updateProps();
      }}
    ]);
  }

  function renderTop() {
    boxesEl.replaceChildren();
    for (const b of activeBoxes) {
      const div = document.createElement("div");
      div.className = "mg-screw-box";
      div.style.borderColor = b.color.hex;
      div.innerHTML = `<span style="color:${b.color.hex}">■ ${b.color.label}盒</span><strong>${b.filled}/3</strong>`;
      boxesEl.append(div);
    }
    holesEl.replaceChildren();
    for (let i = 0; i < maxHoles; i++) {
      const hDiv = document.createElement("div");
      hDiv.className = "mg-hole";
      if (holes[i]) {
        hDiv.style.background = holes[i].hex;
        hDiv.textContent = "⊕";
      }
      holesEl.append(hDiv);
    }
  }

  canvas.addEventListener("pointerdown", e => {
    const p = pointerPos(canvas, e);
    for (let i = screws.length - 1; i >= 0; i--) {
      const sc = screws[i];
      if (!sc.removed && Math.hypot(p.x - sc.x, p.y - sc.y) <= 18) {
        unscrew(sc);
        return;
      }
    }
  });

  function loop() {
    if (!running || api.signal.aborted) return;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#e8d6bc";
    ctx.fillRect(0, 0, w, h);
    for (const pl of plates) {
      if (pl.falling) {
        pl.vy += 0.65;
        pl.y += pl.vy;
        pl.rot += 0.04;
        pl.alpha = Math.max(0, pl.alpha - 0.03);
      }
      if (pl.alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = pl.alpha;
      ctx.translate(pl.x + pl.w / 2, pl.y + pl.h / 2);
      ctx.rotate(pl.rot);
      ctx.fillStyle = pl.tint;
      ctx.strokeStyle = "#7a5337";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-pl.w / 2, -pl.h / 2, pl.w, pl.h, 12);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    for (const sc of screws) {
      if (sc.removed) continue;
      const blocked = isScrewBlocked(sc);
      ctx.save();
      ctx.globalAlpha = blocked ? 0.42 : 1;
      ctx.fillStyle = sc.color.hex;
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#fff5df";
      ctx.stroke();
      ctx.strokeStyle = "#3f2617";
      ctx.beginPath();
      ctx.moveTo(sc.x - 6, sc.y);
      ctx.lineTo(sc.x + 6, sc.y);
      ctx.moveTo(sc.x, sc.y - 6);
      ctx.lineTo(sc.x, sc.y + 6);
      ctx.stroke();
      ctx.restore();
    }
    raf = requestAnimationFrame(loop);
  }

  buildStage(1);
  raf = requestAnimationFrame(loop);
  api.signal.addEventListener("abort", () => { running = false; cancelAnimationFrame(raf); });
}

// 7. 车站挪车大堵车 (Car Jam)
export function playCarJam(container, api) {
  const wrap = document.createElement("div");
  wrap.className = "mg-stack";
  const queueEl = document.createElement("div");
  queueEl.className = "mg-car-queue";
  const baysEl = document.createElement("div");
  baysEl.className = "mg-car-bays";
  const lotEl = document.createElement("div");
  lotEl.className = "mg-car-lot";
  wrap.append(queueEl, baysEl, lotEl);
  container.replaceChildren(wrap);

  const COLORS = [
    { id: "red", hex: "#d96b5b", icon: "🟥" },
    { id: "gold", hex: "#e5b44e", icon: "🟨" },
    { id: "blue", hex: "#6292be", icon: "🟦" },
    { id: "green", hex: "#6ba074", icon: "🟩" }
  ];
  const DIRS = [
    { id: "up", dr: -1, dc: 0, arrow: "↑" },
    { id: "down", dr: 1, dc: 0, arrow: "↓" },
    { id: "left", dr: 0, dc: -1, arrow: "←" },
    { id: "right", dr: 0, dc: 1, arrow: "→" }
  ];

  let stage = 1, score = 0, grid = [], rows = 3, cols = 4, bays = [], maxBays = 4, queue = [];
  let running = true, extraBayUses = 1, shuffleUses = 1 + (api.perk?.bonusHint ? 1 : 0);

  function buildStage(st) {
    stage = st;
    rows = st === 1 ? 2 : 3;
    cols = st === 1 ? 3 : 4;
    bays = [];
    maxBays = 4;
    const totalCars = st === 1 ? 4 : 9;
    const colorList = [];
    queue = [];
    for (let i = 0; i < totalCars; i++) {
      const col = COLORS[i % (st === 1 ? 2 : 4)];
      colorList.push(col);
      queue.push(col, col, col);
    }
    queue.sort(() => Math.random() - 0.5);
    grid = Array.from({ length: rows }, () => Array(cols).fill(null));
    const slots = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots.push([r, c]);
    slots.sort(() => Math.random() - 0.5);
    colorList.forEach((col, i) => {
      const [r, c] = slots[i];
      // Favor outward-pointing arrows on edges so puzzles are solvable
      const dir = r === 0 ? DIRS[0] : r === rows - 1 ? DIRS[1] : c === 0 ? DIRS[2] : DIRS[3];
      grid[r][c] = { id: i, color: col, dir, loaded: 0 };
    });
    api.setHud({ stage: `第 ${stage} 关 · 挪车接人`, score, hint: "点前方无遮挡的小车进站台，接满 3 只同色精灵自动发车！" });
    render();
    updateProps();
  }

  function isPathClear(r, c, dir) {
    let nr = r + dir.dr, nc = c + dir.dc;
    while (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      if (grid[nr][nc]) return false;
      nr += dir.dr;
      nc += dir.dc;
    }
    return true;
  }

  function boardPassengers() {
    let moved = true;
    while (moved && queue.length) {
      moved = false;
      const head = queue[0];
      const bus = bays.find(b => b.color.id === head.id && b.loaded < 3);
      if (bus) {
        queue.shift();
        bus.loaded++;
        score += 12;
        sfx.pop(bus.loaded);
        moved = true;
        if (bus.loaded >= 3) {
          bays = bays.filter(b => b !== bus);
          score += 30;
          sfx.coin();
        }
      }
    }
    if (queue.length === 0 && bays.length === 0) {
      if (stage === 1) {
        sfx.win();
        api.cheer("第1关畅通无阻！第2关晚高峰大堵车来了！");
        setTimeout(() => running && buildStage(2), 500);
      } else {
        running = false;
        sfx.win();
        api.finish({ score: score + 140, stageCleared: 2, milestoneReached: true, summary: "全部小精灵安全搭上巴士！" });
      }
    } else if (bays.length >= maxBays) {
      running = false;
      sfx.fail();
      api.finish({ score, stageCleared: stage - 1, milestoneReached: false, summary: "候车位彻底堵死啦！" });
    }
  }

  function tapCar(r, c) {
    const car = grid[r][c];
    if (!running || !car || bays.length >= maxBays) return;
    if (!isPathClear(r, c, car.dir)) {
      sfx.thud();
      api.cheer("前方被别的车挡住啦！");
      return;
    }
    grid[r][c] = null;
    bays.push(car);
    sfx.click();
    boardPassengers();
    api.setHud({ stage: `第 ${stage} 关`, score, hint: `还有 ${queue.length} 只精灵等车` });
    render();
    updateProps();
  }

  function updateProps() {
    api.setProps([
      { label: `加开1车位 (${extraBayUses})`, disabled: extraBayUses <= 0, onClick: () => {
        if (extraBayUses <= 0) return;
        extraBayUses--;
        maxBays++;
        sfx.pop(1);
        render();
        updateProps();
      }},
      { label: `洗色调度 (${shuffleUses})`, disabled: shuffleUses <= 0, onClick: () => {
        if (shuffleUses <= 0) return;
        shuffleUses--;
        const cars = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c]) cars.push(grid[r][c]);
        const colsArr = cars.map(x => x.color).sort(() => Math.random() - 0.5);
        cars.forEach((car, i) => { car.color = colsArr[i]; });
        sfx.pop(2);
        render();
        updateProps();
      }}
    ]);
  }

  function render() {
    queueEl.replaceChildren();
    queue.slice(0, 12).forEach((col, i) => {
      const sp = document.createElement("span");
      sp.className = "mg-queue-dot";
      sp.style.background = col.hex;
      sp.textContent = i === 0 ? "★" : "•";
      queueEl.append(sp);
    });
    baysEl.replaceChildren();
    for (let i = 0; i < maxBays; i++) {
      const b = document.createElement("div");
      b.className = "mg-car-bay";
      if (bays[i]) {
        b.style.background = bays[i].color.hex;
        b.textContent = `🚌 ${bays[i].loaded}/3`;
      } else {
        b.textContent = "空位";
      }
      baysEl.append(b);
    }
    lotEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    lotEl.replaceChildren();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const car = grid[r][c];
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "mg-car-cell";
      if (car) {
        cell.style.background = car.color.hex;
        cell.textContent = `🚌 ${car.dir.arrow}`;
        cell.dataset.clear = String(isPathClear(r, c, car.dir));
        cell.onclick = () => tapCar(r, c);
      } else {
        cell.disabled = true;
      }
      lotEl.append(cell);
    }
  }

  buildStage(1);
  api.signal.addEventListener("abort", () => { running = false; });
}

// 8. 箭头拆积木 (Tap Away)
export function playTapAway(container, api) {
  const gridEl = document.createElement("div");
  gridEl.className = "mg-tap-grid";
  container.replaceChildren(gridEl);

  const DIRS = [
    { dr: -1, dc: 0, arrow: "↑", color: "#d97862" },
    { dr: 1, dc: 0, arrow: "↓", color: "#6e9e79" },
    { dr: 0, dc: -1, arrow: "←", color: "#6892b8" },
    { dr: 0, dc: 1, arrow: "→", color: "#dfa852" }
  ];

  let stage = 1, score = 0, size = 3, board = [], movesLeft = 20, running = true;
  let bombs = 1 + (api.perk?.bonusHint ? 1 : 0);

  function buildStage(st) {
    stage = st;
    size = st === 1 ? 3 : 5;
    movesLeft = st === 1 ? 15 : 34;
    board = Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => {
      // Build guaranteed solvable outward-leaning arrow configuration
      const options = [];
      if (r <= Math.floor(size / 2)) options.push(DIRS[0]);
      if (r >= Math.floor(size / 2)) options.push(DIRS[1]);
      if (c <= Math.floor(size / 2)) options.push(DIRS[2]);
      if (c >= Math.floor(size / 2)) options.push(DIRS[3]);
      return options[Math.floor(Math.random() * options.length)];
    }));
    api.setHud({ stage: `第 ${stage} 关 · 剩余 ${movesLeft} 步`, score, hint: "点前方无阻挡的箭头方块咻地飞走！" });
    render();
    updateProps();
  }

  function isClear(r, c, dir) {
    let nr = r + dir.dr, nc = c + dir.dc;
    while (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      if (board[nr][nc]) return false;
      nr += dir.dr;
      nc += dir.dc;
    }
    return true;
  }

  function tap(r, c) {
    const blk = board[r][c];
    if (!running || !blk) return;
    movesLeft--;
    if (isClear(r, c, blk)) {
      board[r][c] = null;
      score += 18;
      sfx.pop(2);
    } else {
      sfx.thud();
      api.cheer("撞到前面的积木啦！");
    }
    const left = board.flat().filter(Boolean).length;
    api.setHud({ stage: `第 ${stage} 关 · 剩余 ${movesLeft} 步`, score, hint: `还剩 ${left} 块积木` });
    render();
    updateProps();
    if (left === 0) {
      if (stage === 1) {
        sfx.win();
        api.cheer("3×3 轻松拆空！5×5 大魔方来袭！");
        setTimeout(() => running && buildStage(2), 450);
      } else {
        running = false;
        sfx.win();
        api.finish({ score: score + movesLeft * 8 + 100, stageCleared: 2, milestoneReached: true, summary: "全部箭头积木剥洋葱式拆空！" });
      }
    } else if (movesLeft <= 0) {
      running = false;
      sfx.fail();
      api.finish({ score, stageCleared: stage - 1, milestoneReached: false, summary: `步数用完了，还差 ${left} 块！` });
    }
  }

  function updateProps() {
    api.setProps([
      { label: `清掉外层2块 (${bombs})`, disabled: bombs <= 0, onClick: () => {
        if (bombs <= 0) return;
        bombs--;
        let cleared = 0;
        for (let r = 0; r < size && cleared < 2; r++) for (let c = 0; c < size && cleared < 2; c++) {
          if (board[r][c] && isClear(r, c, board[r][c])) { board[r][c] = null; cleared++; score += 15; }
        }
        sfx.pop(4);
        render();
        updateProps();
      }}
    ]);
  }

  function render() {
    gridEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    gridEl.replaceChildren();
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      const blk = board[r][c];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mg-tap-cell";
      if (blk) {
        btn.style.background = blk.color;
        btn.textContent = blk.arrow;
        btn.onclick = () => tap(r, c);
      } else {
        btn.disabled = true;
      }
      gridEl.append(btn);
    }
  }

  buildStage(1);
  api.signal.addEventListener("abort", () => { running = false; });
}

// 9. 花茶倒水排序 (Water Sort)
export function playWaterSort(container, api) {
  const rowEl = document.createElement("div");
  rowEl.className = "mg-bottle-row";
  container.replaceChildren(rowEl);

  const TEAS = ["#d95b66", "#78a66b", "#e8b954", "#6593c2", "#b879b0"];
  let stage = 1, score = 0, bottles = [], selected = -1, history = [], running = true;
  let extraBottle = 1;

  function buildStage(st) {
    stage = st;
    selected = -1;
    history = [];
    const colorCount = st === 1 ? 3 : 5;
    const pool = [];
    for (let c = 0; c < colorCount; c++) for (let k = 0; k < 4; k++) pool.push(TEAS[c]);
    pool.sort(() => Math.random() - 0.5);
    bottles = [];
    for (let c = 0; c < colorCount; c++) bottles.push(pool.slice(c * 4, c * 4 + 4));
    bottles.push([], []);
    api.setHud({ stage: `第 ${stage} 关 · 花茶分色`, score, hint: "点选源瓶再点目标瓶，凑齐一整瓶纯色花茶！" });
    render();
    updateProps();
  }

  function isSolved(b) {
    return b.length === 0 || (b.length === 4 && b.every(x => x === b[0]));
  }

  function tapBottle(i) {
    if (!running) return;
    if (selected === -1) {
      if (bottles[i].length) { selected = i; sfx.click(); render(); }
      return;
    }
    if (selected === i) { selected = -1; render(); return; }
    const src = bottles[selected];
    const dst = bottles[i];
    const top = src[src.length - 1];
    if (dst.length < 4 && (dst.length === 0 || dst[dst.length - 1] === top)) {
      history.push(bottles.map(b => [...b]));
      while (src.length && dst.length < 4 && src[src.length - 1] === top) {
        dst.push(src.pop());
      }
      score += 15;
      sfx.pop(dst.length === 4 && dst.every(x => x === top) ? 5 : 1);
      selected = -1;
      render();
      updateProps();
      if (bottles.every(isSolved)) {
        if (stage === 1) {
          sfx.win();
          api.cheer("第1关花茶分好啦！第2关 5 色花茶来了！");
          setTimeout(() => running && buildStage(2), 500);
        } else {
          running = false;
          sfx.win();
          api.finish({ score: score + 140, stageCleared: 2, milestoneReached: true, summary: "全部花茶瓶完美分色盖塞！" });
        }
      }
    } else {
      selected = bottles[i].length ? i : -1;
      sfx.thud();
      render();
    }
  }

  function updateProps() {
    api.setProps([
      { label: `撤回 (${history.length})`, disabled: !history.length, onClick: () => {
        if (!history.length) return;
        bottles = history.pop();
        selected = -1;
        sfx.click();
        render();
        updateProps();
      }},
      { label: `加1空瓶 (${extraBottle})`, disabled: extraBottle <= 0, onClick: () => {
        if (extraBottle <= 0) return;
        extraBottle--;
        bottles.push([]);
        sfx.pop(1);
        render();
        updateProps();
      }}
    ]);
  }

  function render() {
    rowEl.replaceChildren();
    bottles.forEach((b, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mg-bottle";
      btn.dataset.selected = String(i === selected);
      btn.dataset.done = String(b.length === 4 && b.every(x => x === b[0]));
      for (let k = 0; k < 4; k++) {
        const layer = document.createElement("span");
        layer.className = "mg-tea-layer";
        layer.style.background = b[3 - k] || "transparent";
        btn.append(layer);
      }
      btn.onclick = () => tapBottle(i);
      rowEl.append(btn);
    });
  }

  buildStage(1);
  api.signal.addEventListener("abort", () => { running = false; });
}

// 10. 凑十框框消 (Sum 10)
export function playSumTen(container, api) {
  const { canvas, ctx, w, h } = makeCanvas(container, 360, 400);
  const COLS = 8, ROWS = 9;
  const cw = w / COLS, ch = h / ROWS;
  const grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 1 + Math.floor(Math.random() * 9)));
  let cleared = 0, score = 0, timeLeft = 90, drag = null, running = true, raf = 0;
  let hints = 2 + (api.perk?.bonusHint ? 1 : 0), hintRect = null;

  const timer = setInterval(() => {
    if (!running || api.signal.aborted) { clearInterval(timer); return; }
    timeLeft--;
    api.setHud({ stage: `剩余 ${timeLeft}s · 已消 ${cleared}/45`, score, hint: "拖动矩形框让内部数字之和 = 10！" });
    if (timeLeft <= 0) {
      running = false;
      clearInterval(timer);
      sfx.win();
      api.finish({ score, stageCleared: cleared >= 20 ? (cleared >= 45 ? 2 : 1) : 0, milestoneReached: cleared >= 45, summary: `共凑 10 消除了 ${cleared} 块数字砖！` });
    }
  }, 1000);

  function rectCells(d) {
    const c1 = Math.max(0, Math.min(COLS - 1, Math.floor(Math.min(d.x1, d.x2) / cw)));
    const c2 = Math.max(0, Math.min(COLS - 1, Math.floor(Math.max(d.x1, d.x2) / cw)));
    const r1 = Math.max(0, Math.min(ROWS - 1, Math.floor(Math.min(d.y1, d.y2) / ch)));
    const r2 = Math.max(0, Math.min(ROWS - 1, Math.floor(Math.max(d.y1, d.y2) / ch)));
    const list = [];
    let sum = 0;
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
      if (grid[r][c] > 0) { list.push([r, c]); sum += grid[r][c]; }
    }
    return { r1, r2, c1, c2, list, sum };
  }

  function findHint() {
    for (let r1 = 0; r1 < ROWS; r1++) for (let c1 = 0; c1 < COLS; c1++) {
      for (let r2 = r1; r2 < Math.min(ROWS, r1 + 3); r2++) for (let c2 = c1; c2 < Math.min(COLS, c1 + 4); c2++) {
        let s = 0, cnt = 0;
        for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) { if (grid[r][c]) { s += grid[r][c]; cnt++; } }
        if (s === 10 && cnt >= 2) return { r1, r2, c1, c2 };
      }
    }
    return null;
  }

  function updateProps() {
    api.setProps([
      { label: `亮光提示 (${hints})`, disabled: hints <= 0, onClick: () => {
        if (hints <= 0) return;
        const found = findHint();
        if (found) { hints--; hintRect = found; sfx.pop(1); updateProps(); }
        else api.cheer("当前无邻近组合，点重排试试！");
      }},
      { label: "重排数字", disabled: false, onClick: () => {
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c]) grid[r][c] = 1 + Math.floor(Math.random() * 9);
        hintRect = null;
        sfx.click();
      }}
    ]);
  }

  canvas.addEventListener("pointerdown", e => {
    if (!running) return;
    const p = pointerPos(canvas, e);
    drag = { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", e => {
    if (!drag) return;
    const p = pointerPos(canvas, e);
    drag.x2 = p.x;
    drag.y2 = p.y;
  });
  canvas.addEventListener("pointerup", () => {
    if (!drag) return;
    const res = rectCells(drag);
    drag = null;
    if (res.sum === 10 && res.list.length >= 2) {
      for (const [r, c] of res.list) grid[r][c] = 0;
      cleared += res.list.length;
      score += res.list.length * 14;
      hintRect = null;
      sfx.pop(res.list.length);
      api.setHud({ stage: `剩余 ${timeLeft}s · 已消 ${cleared}/45`, score, hint: `凑10成功！+${res.list.length * 14}分` });
      if (cleared >= 45 && !api._sumMilestone) {
        api._sumMilestone = true;
        api.cheer("已达标 45 块里程碑！继续冲高分吧！");
      }
    } else if (res.list.length >= 2) {
      sfx.thud();
    }
  });

  function draw() {
    if (!running || api.signal.aborted) return;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#f4e6ce";
    ctx.fillRect(0, 0, w, h);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const v = grid[r][c];
      if (!v) continue;
      const x = c * cw + 3, y = r * ch + 3;
      ctx.fillStyle = v % 2 === 0 ? "#fff6e6" : "#dfecee";
      ctx.strokeStyle = "#b58b60";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, cw - 6, ch - 6, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#4d3221";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(v), x + (cw - 6) / 2, y + (ch - 6) / 2 + 1);
    }
    if (hintRect) {
      ctx.strokeStyle = "#e69a2e";
      ctx.lineWidth = 3;
      ctx.strokeRect(hintRect.c1 * cw + 2, hintRect.r1 * ch + 2, (hintRect.c2 - hintRect.c1 + 1) * cw - 4, (hintRect.r2 - hintRect.r1 + 1) * ch - 4);
    }
    if (drag) {
      const res = rectCells(drag);
      ctx.fillStyle = res.sum === 10 ? "rgba(104, 178, 108, 0.34)" : "rgba(218, 128, 86, 0.25)";
      ctx.strokeStyle = res.sum === 10 ? "#438a49" : "#c76846";
      ctx.lineWidth = 2.5;
      const rx = Math.min(drag.x1, drag.x2), ry = Math.min(drag.y1, drag.y2);
      const rw = Math.abs(drag.x2 - drag.x1), rh = Math.abs(drag.y2 - drag.y1);
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.fillStyle = "#3c2416";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(`和 = ${res.sum}`, rx + rw / 2, Math.max(16, ry - 8));
    }
    raf = requestAnimationFrame(draw);
  }

  api.setHud({ stage: `剩余 90s · 已消 0/45`, score: 0, hint: "拉出矩形框让里面数字相加等于 10！" });
  updateProps();
  raf = requestAnimationFrame(draw);
  api.signal.addEventListener("abort", () => { running = false; clearInterval(timer); cancelAnimationFrame(raf); });
}

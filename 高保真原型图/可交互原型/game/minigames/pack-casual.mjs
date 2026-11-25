import { sfx } from "./sfx.mjs";

function makeCanvas(container, w = 360, h = 380) {
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

// 16. 强迫症收纳盒 (Cozy Tidy)
export function playCozyTidy(container, api) {
  const wrap = document.createElement("div");
  wrap.className = "mg-stack";
  const boxEl = document.createElement("div");
  boxEl.className = "mg-tidy-box";
  const trayEl = document.createElement("div");
  trayEl.className = "mg-tidy-tray";
  wrap.append(boxEl, trayEl);
  container.replaceChildren(wrap);

  const STAGES = [
    [
      { id: "cam", name: "复古相机", icon: "📷" },
      { id: "film", name: "胶卷筒", icon: "🎞️" },
      { id: "pen", name: "钢笔", icon: "✒️" },
      { id: "stamp", name: "火漆印", icon: "📮" },
      { id: "scissor", name: "手工剪", icon: "✂️" },
      { id: "tape", name: "纸胶带", icon: "🩹" }
    ],
    [
      { id: "cam", name: "复古相机", icon: "📷" },
      { id: "film", name: "胶卷筒", icon: "🎞️" },
      { id: "pen", name: "钢笔", icon: "✒️" },
      { id: "stamp", name: "火漆印", icon: "📮" },
      { id: "scissor", name: "手工剪", icon: "✂️" },
      { id: "tape", name: "纸胶带", icon: "🩹" },
      { id: "brush", name: "水彩笔", icon: "🖌️" },
      { id: "loupe", name: "放大镜", icon: "🔍" },
      { id: "key", name: "铜钥匙", icon: "🗝️" }
    ]
  ];

  let stage = 1, score = 0, slots = [], loose = [], selectedId = null, running = true;
  let magnets = 1 + (api.perk?.bonusHint ? 1 : 0);

  function buildStage(st) {
    stage = st;
    selectedId = null;
    const list = STAGES[st - 1];
    slots = list.map(it => ({ ...it, filled: false }));
    loose = [...list].sort(() => Math.random() - 0.5).map(it => ({ ...it, rot: (Math.random() < 0.45 ? 90 : 0) }));
    api.setHud({ stage: `第 ${stage} 关 · 强迫症收纳`, score, hint: "点下方物件（倾斜件再点可转正），再点盒中对应凹槽磁吸归位！" });
    render();
    updateProps();
  }

  function placeInto(slot) {
    if (!running || slot.filled || !selectedId) return;
    const item = loose.find(x => x.id === selectedId);
    if (!item) return;
    if (item.rot !== 0) {
      sfx.thud();
      api.cheer("物件还是歪的！再点一下它转正！");
      return;
    }
    if (slot.id === item.id) {
      slot.filled = true;
      loose = loose.filter(x => x.id !== item.id);
      selectedId = null;
      score += 32;
      sfx.pop(3);
      render();
      updateProps();
      if (loose.length === 0) {
        if (stage === 1) {
          sfx.win();
          api.cheer("咔哒全部归位！第 2 关大号手账箱来了！");
          setTimeout(() => running && buildStage(2), 480);
        } else {
          running = false;
          sfx.win();
          api.finish({ score: score + 130, stageCleared: 2, milestoneReached: true, summary: "强迫症极度舒适！两只收纳盒全部严丝合缝！" });
        }
      }
    } else {
      sfx.thud();
      api.cheer("形状对不上凹槽哦！");
    }
  }

  function updateProps() {
    api.setProps([
      { label: `磁吸归位 (${magnets})`, disabled: magnets <= 0 || !loose.length, onClick: () => {
        if (magnets <= 0 || !loose.length) return;
        magnets--;
        const item = loose.shift();
        const slot = slots.find(s => s.id === item.id);
        if (slot) slot.filled = true;
        selectedId = null;
        score += 25;
        sfx.coin();
        render();
        updateProps();
        if (loose.length === 0) {
          if (stage === 1) setTimeout(() => running && buildStage(2), 450);
          else { running = false; sfx.win(); api.finish({ score: score + 130, stageCleared: 2, milestoneReached: true, summary: "收纳完成！" }); }
        }
      }}
    ]);
  }

  function render() {
    boxEl.style.gridTemplateColumns = `repeat(3, 1fr)`;
    boxEl.replaceChildren();
    for (const sl of slots) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mg-tidy-slot";
      btn.dataset.filled = String(sl.filled);
      btn.innerHTML = `<span class="mg-tidy-icon">${sl.icon}</span><small>${sl.name}</small>`;
      btn.onclick = () => placeInto(sl);
      boxEl.append(btn);
    }
    trayEl.replaceChildren();
    for (const it of loose) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mg-tidy-item";
      btn.dataset.selected = String(selectedId === it.id);
      btn.style.transform = `rotate(${it.rot}deg)`;
      btn.textContent = it.icon;
      btn.title = `${it.name}${it.rot ? "（点击转正）" : ""}`;
      btn.onclick = () => {
        if (selectedId === it.id && it.rot !== 0) {
          it.rot = 0;
          sfx.pop(1);
        } else {
          selectedId = it.id;
          sfx.click();
        }
        render();
      };
      trayEl.append(btn);
    }
  }

  buildStage(1);
  api.signal.addEventListener("abort", () => { running = false; });
}

// 17. 书房脑洞找茬 (疯狂梗传)
export function playMemeSpot(container, api) {
  const { canvas, ctx, w, h } = makeCanvas(container, 360, 360);
  const SCENES = [
    {
      title: "复古暖窗书房",
      bg: "#ebd4b3",
      anomalies: [
        { x: 64, y: 84, r: 24, icon: "🛸", roast: "窗外怎么飞过外星飞碟！" },
        { x: 292, y: 92, r: 24, icon: "📶", roast: "古董书架居然藏着 Wi-Fi！" },
        { x: 182, y: 158, r: 24, icon: "🧋", roast: "墨水瓶旁边放了杯珍珠奶茶！" },
        { x: 76, y: 266, r: 24, icon: "🦆", roast: "壁炉里躲着一只泡澡小黄鸭！" },
        { x: 268, y: 258, r: 24, icon: "📱", roast: "台灯下面居然在给手机充电！" },
        { x: 174, y: 292, r: 24, icon: "🦖", roast: "地毯上偷溜进来一只小恐龙！" }
      ]
    },
    {
      title: "雨后花园温室",
      bg: "#d2e2c8",
      anomalies: [
        { x: 72, y: 74, r: 24, icon: "🕶️", roast: "太阳公公戴上了墨镜！" },
        { x: 282, y: 76, r: 24, icon: "🚀", roast: "花丛后面准备发射火箭！" },
        { x: 144, y: 162, r: 24, icon: "🍔", roast: "花盆里长出了一个巨无霸汉堡！" },
        { x: 246, y: 186, r: 24, icon: "🎮", roast: "树洞里藏着一台游戏手柄！" },
        { x: 86, y: 274, r: 24, icon: "🛹", roast: "小蜗牛踩上了炫酷滑板！" },
        { x: 276, y: 284, r: 24, icon: "🍕", roast: "石桌上摆着刚送到的披萨！" }
      ]
    }
  ];

  let stage = 1, score = 0, found = new Set(), hints = 1 + (api.perk?.bonusHint ? 1 : 0), hintIdx = -1, running = true;

  function buildStage(st) {
    stage = st;
    found = new Set();
    hintIdx = -1;
    api.setHud({ stage: `第 ${stage} 关 · ${SCENES[st - 1].title} (0/6)`, score, hint: "点出画里 6 处画风离谱的穿越物品！" });
    draw();
    updateProps();
  }

  function updateProps() {
    api.setProps([
      { label: `放大镜提示 (${hints})`, disabled: hints <= 0, onClick: () => {
        if (hints <= 0) return;
        const list = SCENES[stage - 1].anomalies;
        const idx = list.findIndex((_, i) => !found.has(i));
        if (idx >= 0) { hints--; hintIdx = idx; sfx.pop(1); draw(); updateProps(); }
      }}
    ]);
  }

  function draw() {
    const sc = SCENES[stage - 1];
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = sc.bg;
    ctx.fillRect(0, 0, w, h);
    // Cozy room backdrop lines
    ctx.fillStyle = "rgba(120, 78, 46, 0.16)";
    ctx.fillRect(20, 22, 110, 105);
    ctx.fillRect(225, 22, 115, 115);
    ctx.fillRect(110, 140, 145, 76);
    ctx.fillRect(24, 232, 312, 104);

    // Normal decor decoys
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const decoys = stage === 1 ? [["🪴", 160, 74], ["📚", 252, 68], ["🕯️", 122, 178], ["🪑", 214, 244]] : [["🌷", 174, 86], ["🍄", 68, 176], ["🌿", 296, 174], ["🪴", 178, 280]];
    for (const [ic, x, y] of decoys) ctx.fillText(ic, x, y);

    // Anomalies
    sc.anomalies.forEach((a, i) => {
      ctx.font = "26px sans-serif";
      ctx.fillText(a.icon, a.x, a.y);
      if (found.has(i)) {
        ctx.strokeStyle = "#d94f43";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (hintIdx === i) {
        ctx.strokeStyle = "#e6a42e";
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }

  canvas.addEventListener("pointerdown", e => {
    if (!running) return;
    const p = pointerPos(canvas, e);
    const sc = SCENES[stage - 1];
    for (let i = 0; i < sc.anomalies.length; i++) {
      if (found.has(i)) continue;
      const a = sc.anomalies[i];
      if (Math.hypot(p.x - a.x, p.y - a.y) <= a.r + 8) {
        found.add(i);
        if (hintIdx === i) hintIdx = -1;
        score += 35;
        sfx.pop(found.size);
        api.cheer(a.roast);
        api.setHud({ stage: `第 ${stage} 关 (${found.size}/6)`, score, hint: a.roast });
        draw();
        if (found.size >= sc.anomalies.length) {
          if (stage === 1) {
            sfx.win();
            setTimeout(() => running && buildStage(2), 650);
          } else {
            running = false;
            sfx.win();
            api.finish({ score: score + 130, stageCleared: 2, milestoneReached: true, summary: "火眼金睛！揪出全部 12 处离谱穿越梗！" });
          }
        }
        return;
      }
    }
    sfx.thud();
  });

  buildStage(1);
  api.signal.addEventListener("abort", () => { running = false; });
}

// 18. 溪谷爆钓拉扯王 (欢乐钓鱼大师)
export function playFishingKing(container, api) {
  const { canvas, ctx, w, h } = makeCanvas(container, 360, 380);
  const forgive = api.perk?.forgiveMult || 1;
  const FISH_POOL = [
    { name: "溪谷纸鲫鱼", icon: "🐟", hp: 70, pull: 0.72, pts: 45, legendary: false },
    { name: "金鳞锦鲤", icon: "🐠", hp: 110, pull: 0.92, pts: 85, legendary: false },
    { name: "传说·星河鲸王", icon: "🐋", hp: 155, pull: 1.08, pts: 180, legendary: true }
  ];

  let fishIdx = 0, curFish = FISH_POOL[0], fishHp = curFish.hp;
  let tension = 0.45, rage = 0, reeling = false, score = 0, caught = 0, landedKing = false;
  let running = true, raf = 0;

  function spawnFish(idx) {
    fishIdx = idx;
    curFish = FISH_POOL[Math.min(idx, FISH_POOL.length - 1)];
    fishHp = curFish.hp;
    tension = 0.42;
    rage = 0;
    api.setHud({ stage: `正在搏斗：${curFish.name}`, score, hint: "按住收线、松手放线，把指针稳在金色暴击区消耗鱼体力！" });
    updateProps();
  }

  function updateProps() {
    api.setProps([
      { label: `⚡ 刺鱼重击 (${Math.round(rage)}%)`, disabled: rage < 100, onClick: () => {
        if (rage < 100 || !running) return;
        rage = 0;
        fishHp = Math.max(0, fishHp - 48);
        sfx.coin();
        api.cheer("暴击刺鱼！巨鱼体力大减！");
        updateProps();
      }}
    ]);
  }

  canvas.addEventListener("pointerdown", e => { reeling = true; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointerup", () => { reeling = false; });
  canvas.addEventListener("pointercancel", () => { reeling = false; });

  function loop() {
    if (!running || api.signal.aborted) return;
    if (reeling) tension += 0.013;
    else tension -= 0.011 * curFish.pull;
    tension = Math.max(0, Math.min(1, tension));

    const inGold = tension >= 0.48 / forgive && tension <= Math.min(0.88, 0.78 * forgive);
    if (reeling) {
      fishHp -= inGold ? 0.95 : 0.42;
      if (inGold && rage < 100) {
        rage = Math.min(100, rage + 1.15);
        if (rage >= 100) updateProps();
      }
    }
    if (tension >= 0.99 || tension <= 0.01) {
      running = false;
      sfx.fail();
      api.finish({ score, stageCleared: caught >= 1 ? 1 : 0, milestoneReached: landedKing, summary: tension >= 0.99 ? "鱼线拉断啦！下次注意松手泄力！" : "鱼儿脱钩游跑啦！" });
      return;
    }
    if (fishHp <= 0) {
      caught++;
      score += curFish.pts;
      sfx.win();
      if (curFish.legendary) {
        landedKing = true;
        running = false;
        api.finish({ score: score + 100, stageCleared: 2, milestoneReached: true, summary: `爆钓成功！拉起传说鱼王「${curFish.name}」！` });
        return;
      }
      api.cheer(`钓上 ${curFish.name}！下一条更大！`);
      spawnFish(fishIdx + 1);
    }

    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#a8d1cc");
    grad.addColorStop(1, "#4c7d82");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Fish bobbing
    const fx = w / 2 + Math.sin(performance.now() * 0.008) * 38;
    const fy = 175 + Math.cos(performance.now() * 0.006) * 14;
    ctx.font = `${curFish.legendary ? 62 : 46}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(curFish.icon, fx, fy);

    // Fish HP bar
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(45, 36, 270, 16);
    ctx.fillStyle = "#e87862";
    ctx.fillRect(45, 36, 270 * Math.max(0, fishHp / curFish.hp), 16);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(`${curFish.name} 体力`, w / 2, 28);

    // Tension bar with golden crit zone
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(45, 315, 270, 24);
    ctx.fillStyle = "#f2c55a";
    ctx.fillRect(45 + 270 * (0.48 / forgive), 315, 270 * (Math.min(0.88, 0.78 * forgive) - 0.48 / forgive), 24);
    ctx.fillStyle = "#fff";
    ctx.fillRect(45 + 270 * tension - 4, 310, 8, 34);
    ctx.fillText(reeling ? "收线拉扯中..." : "按住画面收线 · 松手泄力", w / 2, 358);

    raf = requestAnimationFrame(loop);
  }

  spawnFish(0);
  raf = requestAnimationFrame(loop);
  api.signal.addEventListener("abort", () => { running = false; cancelAnimationFrame(raf); });
}

// 19. 背包合成大乱斗 (背包乱斗)
export function playBackpackBrawl(container, api) {
  const wrap = document.createElement("div");
  wrap.className = "mg-stack";
  const battleEl = document.createElement("div");
  battleEl.className = "mg-brawl-log";
  const bagEl = document.createElement("div");
  bagEl.className = "mg-brawl-bag";
  const shopEl = document.createElement("div");
  shopEl.className = "mg-brawl-shop";
  wrap.append(battleEl, bagEl, shopEl);
  container.replaceChildren(wrap);

  const GEAR = [
    { id: "sword", name: "木剑", icon: "🗡️", atk: 7, def: 0, cost: 3 },
    { id: "wand", name: "星杖", icon: "🪄", atk: 9, def: 0, cost: 4 },
    { id: "shield", name: "橡盾", icon: "🛡️", atk: 1, def: 7, cost: 3 },
    { id: "chili", name: "辣椒", icon: "🌶️", atk: 4, def: 2, boost: true, cost: 3 }
  ];

  let gold = 9, round = 1, score = 0, bag = Array(9).fill(null), shop = [], selectedBag = -1, running = true;

  function rollShop() {
    shop = Array.from({ length: 3 }, () => ({ ...GEAR[Math.floor(Math.random() * GEAR.length)], lv: 1 }));
  }

  function calcPower() {
    let atk = 6, def = 4;
    bag.forEach((it, idx) => {
      if (!it) return;
      const mult = Math.pow(1.9, it.lv - 1);
      const hasChiliNeighbor = [idx - 1, idx + 1, idx - 3, idx + 3].some(n => bag[n]?.boost);
      atk += Math.round(it.atk * mult * (hasChiliNeighbor ? 1.3 : 1));
      def += Math.round(it.def * mult);
    });
    return { atk, def };
  }

  function fightRound() {
    if (!running) return;
    const { atk, def } = calcPower();
    const enemyAtk = 8 + round * 7;
    const enemyHp = 22 + round * 16;
    const myHp = 30 + def * 2;
    const myTurns = Math.ceil(enemyHp / Math.max(1, atk));
    const enemyTurns = Math.ceil(myHp / Math.max(1, enemyAtk));
    if (myTurns <= enemyTurns) {
      score += 45 + round * 15;
      sfx.win();
      battleEl.textContent = `⚔️ 第 ${round} 轮大胜！攻 ${atk} / 盾 ${def}，${myTurns} 回合秒杀纸怪！`;
      if (round >= 4) {
        running = false;
        api.finish({ score: score + 130, stageCleared: 2, milestoneReached: true, summary: "背包神装四连胜碾压全场！" });
        return;
      }
      round++;
      gold += 7;
      rollShop();
      render();
      updateProps();
    } else {
      running = false;
      sfx.fail();
      api.finish({ score, stageCleared: round >= 2 ? 1 : 0, milestoneReached: false, summary: `止步第 ${round} 轮（攻 ${atk}/盾 ${def}），多合高阶武器！` });
    }
  }

  function tapBag(i) {
    if (!running) return;
    if (selectedBag === -1) {
      if (bag[i]) { selectedBag = i; sfx.click(); render(); }
      return;
    }
    if (selectedBag === i) { selectedBag = -1; render(); return; }
    const a = bag[selectedBag], b = bag[i];
    if (a && b && a.id === b.id && a.lv === b.lv && a.lv < 3) {
      bag[i] = { ...b, lv: b.lv + 1 };
      bag[selectedBag] = null;
      selectedBag = -1;
      sfx.coin();
      api.cheer(`合成 Lv.${bag[i].lv} ${bag[i].name}！`);
    } else {
      bag[i] = a;
      bag[selectedBag] = b;
      selectedBag = -1;
      sfx.click();
    }
    render();
  }

  function buyGear(si) {
    const it = shop[si];
    if (!running || !it || gold < it.cost) { sfx.thud(); return; }
    const empty = bag.findIndex(x => !x);
    if (empty < 0) { api.cheer("背包满啦，先把两件同级装备点在一起合成！"); sfx.thud(); return; }
    gold -= it.cost;
    bag[empty] = { ...it };
    shop[si] = null;
    sfx.pop(1);
    render();
  }

  function updateProps() {
    api.setProps([
      { label: "⚔️ 出发开打！", disabled: false, onClick: fightRound },
      { label: "刷新商店 (2金)", disabled: gold < 2, onClick: () => { if (gold >= 2) { gold -= 2; rollShop(); sfx.click(); render(); updateProps(); } } }
    ]);
  }

  function render() {
    const { atk, def } = calcPower();
    api.setHud({ stage: `第 ${round}/4 轮 · 🪙${gold} · 攻${atk}/盾${def}`, score, hint: "买装备放背包，点两件同级装备合高阶，再点「出发开打」！" });
    bagEl.replaceChildren();
    bag.forEach((it, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mg-brawl-cell";
      btn.dataset.selected = String(i === selectedBag);
      btn.innerHTML = it ? `<span>${it.icon}</span><small>Lv.${it.lv}</small>` : "";
      btn.onclick = () => tapBag(i);
      bagEl.append(btn);
    });
    shopEl.replaceChildren();
    shop.forEach((it, si) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "desk-pill";
      btn.disabled = !it || gold < (it?.cost || 0);
      btn.textContent = it ? `${it.icon} ${it.name} (${it.cost}金)` : "已售罄";
      btn.onclick = () => { buyGear(si); updateProps(); };
      shopEl.append(btn);
    });
  }

  battleEl.textContent = "整备阶段：买装备摆进背包，同级两件可合成升阶！";
  rollShop();
  render();
  updateProps();
  api.signal.addEventListener("abort", () => { running = false; });
}

// 20. 星潮欢乐推币机 (Coin Pusher)
export function playCoinPusher(container, api) {
  const { canvas, ctx, w, h } = makeCanvas(container, 360, 390);
  let coinsLeft = 36, score = 0, giftsDropped = 0, running = true, raf = 0, tick = 0;
  let wallTimer = 0;
  const pieces = [];
  for (let i = 0; i < 24; i++) {
    pieces.push({
      x: 56 + (i % 6) * 48 + (Math.random() - 0.5) * 14,
      y: 135 + Math.floor(i / 6) * 46 + (Math.random() - 0.5) * 10,
      r: 15, kind: "coin", vy: 0
    });
  }
  pieces.push({ x: 120, y: 245, r: 22, kind: "gift", vy: 0 });
  pieces.push({ x: 240, y: 210, r: 22, kind: "gift", vy: 0 });

  function dropCoin(x) {
    if (!running || coinsLeft <= 0) return;
    coinsLeft--;
    pieces.push({ x: Math.max(46, Math.min(w - 46, x)), y: 95, r: 15, kind: "coin", vy: 1.2 });
    sfx.click();
    updateHud();
  }

  function updateHud() {
    api.setHud({ stage: `剩余投币 ${coinsLeft} · 礼盒 ${giftsDropped}/2`, score, hint: "点顶部落币口投币，把金币和大礼盒推下悬崖！" });
  }

  api.setProps([
    { label: "升起两侧挡板", disabled: false, onClick: () => { wallTimer = 420; sfx.pop(2); api.cheer("两侧防漏挡板升起啦！"); } },
    { label: "轻震台面", disabled: false, onClick: () => {
      if (api.useVoucher()) { for (const p of pieces) p.y += 16; sfx.thud(); }
      else api.cheer("需要消耗 1 张采风道具券！");
    }}
  ]);

  canvas.addEventListener("pointerdown", e => {
    const p = pointerPos(canvas, e);
    dropCoin(p.x);
  });

  function loop() {
    if (!running || api.signal.aborted) return;
    tick++;
    if (wallTimer > 0) wallTimer--;
    const pusherY = 126 + Math.sin(tick * 0.055) * 34;

    // Push coins forward when pusher overlaps
    for (const p of pieces) {
      if (p.y - p.r < pusherY) {
        p.y = pusherY + p.r;
        p.vy = Math.max(p.vy, 1.4);
      }
      p.y += p.vy;
      p.vy *= 0.86;
    }
    // Simple 2D circle push collisions
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const a = pieces[i], b = pieces[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const minD = a.r + b.r;
        if (d < minD) {
          const push = (minD - d) * 0.52;
          const nx = dx / d, ny = dy / d;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
        }
      }
    }
    // Check drops over bottom edge
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      if (wallTimer > 0) p.x = Math.max(38, Math.min(w - 38, p.x));
      if (p.x < 18 || p.x > w - 18) { pieces.splice(i, 1); continue; }
      if (p.y > h - 34) {
        pieces.splice(i, 1);
        if (p.kind === "gift") {
          giftsDropped++;
          score += 90;
          coinsLeft += 6;
          sfx.win();
          api.cheer("大礼盒推下悬崖！奖励 +6 枚金币雨！");
        } else {
          score += 12;
          sfx.coin();
        }
        updateHud();
      }
    }

    if (coinsLeft <= 0 && pieces.every(p => p.vy < 0.15)) {
      running = false;
      sfx.win();
      api.finish({ score, stageCleared: giftsDropped >= 1 ? (giftsDropped >= 2 ? 2 : 1) : 0, milestoneReached: giftsDropped >= 2, summary: `推落 ${giftsDropped} 个大礼盒，收获满盘金币！` });
      return;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#5c3d2a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#d9b584";
    ctx.fillRect(26, 70, w - 52, h - 104);
    // Pusher plate
    ctx.fillStyle = "#b57c48";
    ctx.fillRect(26, 70, w - 52, pusherY - 70);
    ctx.fillStyle = "#f2c66d";
    ctx.fillRect(26, pusherY - 6, w - 52, 6);
    if (wallTimer > 0) {
      ctx.fillStyle = "#f2c66d";
      ctx.fillRect(22, 120, 6, h - 156);
      ctx.fillRect(w - 28, 120, 6, h - 156);
    }
    // Cliff edge
    ctx.fillStyle = "#2b1a10";
    ctx.fillRect(26, h - 34, w - 52, 34);
    ctx.fillStyle = "#ffe6b8";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("▼ 推下此边缘即得奖励 ▼", w / 2, h - 12);

    for (const p of pieces) {
      ctx.beginPath();
      ctx.fillStyle = p.kind === "gift" ? "#d96352" : "#f2c45a";
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7a4e26";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = `${p.kind === "gift" ? 20 : 14}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.kind === "gift" ? "🎁" : "🪙", p.x, p.y + 1);
    }
    raf = requestAnimationFrame(loop);
  }

  updateHud();
  raf = requestAnimationFrame(loop);
  api.signal.addEventListener("abort", () => { running = false; cancelAnimationFrame(raf); });
}

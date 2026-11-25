import { sfx } from "./sfx.mjs";

function makeCanvas(container, w = 360, h = 400) {
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

// 11. 拾光跳一跳 (WeChat Jump)
export function playJumpHop(container, api) {
  const { canvas, ctx, w, h } = makeCanvas(container, 360, 390);
  const STYLES = [
    { color: "#d49a6a", top: "#f2d6b3", label: "📚" },
    { color: "#7f9e84", top: "#c6dfc9", label: "🫖" },
    { color: "#8c93ba", top: "#cdd3ee", label: "🎞️" },
    { color: "#c97a68", top: "#f2c6bb", label: "📮" }
  ];
  const forgive = api.perk?.forgiveMult || 1;
  let score = 0, combo = 0, revives = 1, running = true, raf = 0;
  let platforms = [
    { x: 95, y: 290, r: 36, ...STYLES[0] },
    { x: 220, y: 235, r: 34, ...STYLES[1] }
  ];
  let curIdx = 0;
  let player = { x: 95, y: 290, z: 0, squish: 1 };
  let charging = false, charge = 0;
  let jumping = null;

  function spawnNext() {
    const prev = platforms[platforms.length - 1];
    const dir = platforms.length % 2 === 1 ? 1 : -1;
    const dist = 85 + Math.random() * 95;
    const nx = Math.max(66, Math.min(w - 66, prev.x + dir * dist));
    const ny = prev.y - (45 + Math.random() * 32);
    const st = STYLES[platforms.length % STYLES.length];
    platforms.push({ x: nx, y: ny, r: Math.max(24, 36 - platforms.length * 0.4), ...st });
  }

  function shiftCamera() {
    const cur = platforms[curIdx];
    const dy = 285 - cur.y;
    if (Math.abs(dy) > 2) {
      for (const p of platforms) p.y += dy;
      player.y += dy;
    }
  }

  canvas.addEventListener("pointerdown", e => {
    if (!running || jumping) return;
    charging = true;
    charge = 0;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointerup", () => {
    if (!running || !charging || jumping) return;
    charging = false;
    const target = platforms[curIdx + 1];
    const angle = Math.atan2(target.y - player.y, target.x - player.x);
    const dist = Math.min(250, charge * 255);
    sfx.jump(charge);
    jumping = {
      sx: player.x, sy: player.y,
      tx: player.x + Math.cos(angle) * dist,
      ty: player.y + Math.sin(angle) * dist,
      t: 0
    };
    player.squish = 1;
  });

  function updateProps() {
    api.setProps([
      { label: `纸鹤续跳 (${revives})`, disabled: true, onClick: () => {} }
    ]);
  }

  function draw() {
    if (!running || api.signal.aborted) return;
    if (charging) {
      charge = Math.min(1, charge + 0.017);
      player.squish = Math.max(0.58, 1 - charge * 0.42);
    }
    if (jumping) {
      jumping.t += 0.055;
      const t = Math.min(1, jumping.t);
      player.x = jumping.sx + (jumping.tx - jumping.sx) * t;
      player.y = jumping.sy + (jumping.ty - jumping.sy) * t;
      player.z = Math.sin(Math.PI * t) * 78;
      if (t >= 1) {
        const next = platforms[curIdx + 1];
        const cur = platforms[curIdx];
        const dNext = Math.hypot(player.x - next.x, player.y - next.y);
        const dCur = Math.hypot(player.x - cur.x, player.y - cur.y);
        jumping = null;
        player.z = 0;
        if (dNext <= next.r * forgive) {
          curIdx++;
          const bullseye = dNext <= 12 * forgive;
          combo = bullseye ? combo + 1 : 0;
          const pts = bullseye ? 10 + combo * 6 : 8;
          score += pts;
          sfx.pop(combo + 1);
          if (bullseye) api.cheer(`正中靶心 ×${combo}！+${pts}`);
          spawnNext();
          shiftCamera();
          api.setHud({ stage: `第 ${curIdx} 跳 · 连击 ${combo}`, score, hint: "按住蓄力松手起跳，正中红心翻倍！" });
        } else if (dCur <= cur.r * forgive) {
          sfx.click();
        } else if (revives > 0) {
          revives--;
          player.x = cur.x;
          player.y = cur.y;
          sfx.thud();
          api.cheer("纸鹤把你拉回月台啦！再试一次！");
          updateProps();
        } else {
          running = false;
          sfx.fail();
          api.finish({ score, stageCleared: score >= 40 ? (score >= 80 ? 2 : 1) : 0, milestoneReached: score >= 80, summary: `共跃过 ${curIdx} 块月台积木，得分 ${score}！` });
          return;
        }
      }
    }

    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#29304d");
    grad.addColorStop(1, "#4a4460");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let i = Math.max(0, curIdx - 1); i < platforms.length; i++) {
      const p = platforms[i];
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 12, p.r, p.r * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.top;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c95d4c";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.label, p.x, p.y + 20);
    }

    // Charge bar
    if (charging) {
      ctx.fillStyle = "rgba(255,244,218,0.22)";
      ctx.fillRect(w / 2 - 55, h - 28, 110, 10);
      ctx.fillStyle = "#f2c265";
      ctx.fillRect(w / 2 - 55, h - 28, 110 * charge, 10);
    }

    // Spirit jumper
    ctx.save();
    ctx.translate(player.x, player.y - player.z);
    ctx.scale(2 - player.squish, player.squish);
    ctx.fillStyle = "#fff1d0";
    ctx.beginPath();
    ctx.arc(0, -16, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a5a3a";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = "#4d3221";
    ctx.fillText("• •", 0, -13);
    ctx.restore();

    raf = requestAnimationFrame(draw);
  }

  api.setHud({ stage: "拾光跳一跳", score: 0, hint: "按住屏幕蓄力、松手跳向下一块月台！" });
  updateProps();
  raf = requestAnimationFrame(draw);
  api.signal.addEventListener("abort", () => { running = false; cancelAnimationFrame(raf); });
}

// 12. 画线救小精灵 (Save the Doge)
export function playSaveSpirit(container, api) {
  const { canvas, ctx, w, h } = makeCanvas(container, 360, 380);
  const forgive = api.perk?.forgiveMult || 1;
  let stage = 1, score = 0, phase = "draw", points = [], bees = [], timer = 5.5;
  let spiritPos = { x: 180, y: 290, r: 22 };
  let hives = [];
  let running = true, raf = 0, drawing = false;

  function buildStage(st) {
    stage = st;
    phase = "draw";
    points = [];
    bees = [];
    timer = Math.max(4.0, 5.5 / forgive);
    spiritPos = { x: 180, y: 295, r: 22 };
    hives = st === 1 ? [{ x: 180, y: 66 }] : [{ x: 88, y: 74 }, { x: 272, y: 74 }];
    api.setHud({ stage: `第 ${stage} 关 · 一笔画盾`, score, hint: "按住一笔画出护盾线围住小精灵，挡住蜂群！" });
    api.setProps([
      { label: "重画本关", disabled: false, onClick: () => buildStage(stage) }
    ]);
  }

  canvas.addEventListener("pointerdown", e => {
    if (!running || phase !== "draw") return;
    drawing = true;
    points = [pointerPos(canvas, e)];
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", e => {
    if (!drawing || phase !== "draw") return;
    const p = pointerPos(canvas, e);
    const last = points[points.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= 8) points.push(p);
  });
  canvas.addEventListener("pointerup", () => {
    if (!drawing || phase !== "draw") return;
    drawing = false;
    if (points.length < 3) { points = []; return; }
    phase = "defend";
    sfx.pop(1);
    const beeCount = stage === 1 ? 8 : 14;
    for (let i = 0; i < beeCount; i++) {
      const hv = hives[i % hives.length];
      bees.push({
        x: hv.x + (Math.random() - 0.5) * 24,
        y: hv.y + 18,
        vx: (Math.random() - 0.5) * 4,
        vy: 1 + Math.random() * 2
      });
    }
  });

  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy || 1;
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = x1 + t * dx, cy = y1 + t * dy;
    return { dist: Math.hypot(px - cx, py - cy), nx: (px - cx), ny: (py - cy) };
  }

  function loop() {
    if (!running || api.signal.aborted) return;
    if (phase === "defend") {
      timer -= 1 / 60;
      api.setHud({ stage: `第 ${stage} 关 · 坚守 ${Math.max(0, timer).toFixed(1)}s`, score, hint: "护盾顶住啦！" });
      for (const b of bees) {
        const ax = spiritPos.x - b.x, ay = spiritPos.y - b.y;
        const d = Math.hypot(ax, ay) || 1;
        b.vx = b.vx * 0.96 + (ax / d) * 0.34;
        b.vy = b.vy * 0.96 + (ay / d) * 0.34;
        b.x += b.vx;
        b.y += b.vy;
        // Collide with drawn shield segments
        for (let i = 1; i < points.length; i++) {
          const hit = distToSegment(b.x, b.y, points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
          if (hit.dist < 13) {
            const len = hit.dist || 1;
            b.x += (hit.nx / len) * (13 - hit.dist);
            b.y += (hit.ny / len) * (13 - hit.dist);
            b.vx = (hit.nx / len) * 3.8 + (Math.random() - 0.5) * 1.5;
            b.vy = (hit.ny / len) * 3.8 + (Math.random() - 0.5) * 1.5;
            break;
          }
        }
        if (Math.hypot(b.x - spiritPos.x, b.y - spiritPos.y) < spiritPos.r + 7) {
          phase = "stung";
          sfx.fail();
          api.cheer("哎呀被蛰成大包子啦！");
          setTimeout(() => {
            if (!running) return;
            running = false;
            api.finish({ score, stageCleared: stage - 1, milestoneReached: false, summary: "小精灵被纸蜜蜂蛰到啦，再画严实一点！" });
          }, 500);
          break;
        }
      }
      if (phase === "defend" && timer <= 0) {
        score += stage === 1 ? 80 : 140;
        if (stage === 1) {
          phase = "next";
          sfx.win();
          api.cheer("第1关守住啦！第2关双蜂巢夹击来了！");
          setTimeout(() => running && buildStage(2), 600);
        } else {
          running = false;
          sfx.win();
          api.finish({ score, stageCleared: 2, milestoneReached: true, summary: "完美画出护盾守护小精灵！" });
          return;
        }
      }
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#e8eedc";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#b9c99e";
    ctx.fillRect(0, 322, w, 60);

    for (const hv of hives) {
      ctx.font = "34px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🍯", hv.x, hv.y + 8);
    }

    ctx.fillStyle = "#fff3d6";
    ctx.beginPath();
    ctx.arc(spiritPos.x, spiritPos.y, spiritPos.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a5a3a";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#4a2e1d";
    ctx.font = "16px sans-serif";
    ctx.fillText(phase === "stung" ? "× ×" : "• •", spiritPos.x, spiritPos.y + 5);

    if (points.length > 1) {
      ctx.strokeStyle = "#4d3524";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
    }

    for (const b of bees) {
      ctx.font = "18px sans-serif";
      ctx.fillText("🐝", b.x, b.y + 5);
    }
    raf = requestAnimationFrame(loop);
  }

  buildStage(1);
  raf = requestAnimationFrame(loop);
  api.signal.addEventListener("abort", () => { running = false; cancelAnimationFrame(raf); });
}

// 13. 萤火弹幕肉鸽 (向僵尸开炮)
export function playBulletRogue(container, api) {
  const wrap = document.createElement("div");
  wrap.className = "mg-stack";
  const canvasWrap = document.createElement("div");
  const perkModal = document.createElement("div");
  perkModal.className = "mg-rogue-picks";
  perkModal.hidden = true;
  wrap.append(canvasWrap, perkModal);
  container.replaceChildren(wrap);
  const { canvas, ctx, w, h } = makeCanvas(canvasWrap, 360, 380);

  let aimX = w / 2, score = 0, hp = 100, wave = 1, xp = 0, nextXp = 40;
  let multishot = 1, pierce = 1, split = false, frost = false, fireDelay = 16, tick = 0;
  let bullets = [], enemies = [], paused = false, running = true, raf = 0;
  let spawnedInWave = 0, waveTotal = 8;

  const UPGRADES = [
    { name: "弹道 +1", desc: "每次多发 1 颗光弹", apply: () => { multishot++; } },
    { name: "穿透 +1", desc: "光弹穿透额外目标", apply: () => { pierce++; } },
    { name: "命中分裂", desc: "击中炸出 2 颗侧火花", apply: () => { split = true; } },
    { name: "冰霜减速", desc: "命中小怪移速减半", apply: () => { frost = true; } },
    { name: "连射加速", desc: "射速大幅提升", apply: () => { fireDelay = Math.max(7, fireDelay - 4); } },
    { name: "防线回血", desc: "纸灯防线回复 40 血", apply: () => { hp = Math.min(100, hp + 40); } }
  ];

  function openUpgradePick() {
    paused = true;
    perkModal.hidden = false;
    perkModal.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = "✨ 升级！三选一肉鸽词条";
    perkModal.append(title);
    const picks = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
    for (const u of picks) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "desk-pill";
      btn.innerHTML = `<strong>${u.name}</strong><small>${u.desc}</small>`;
      btn.onclick = () => {
        u.apply();
        sfx.coin();
        perkModal.hidden = true;
        paused = false;
      };
      perkModal.append(btn);
    }
  }

  canvas.addEventListener("pointermove", e => { aimX = pointerPos(canvas, e).x; });
  canvas.addEventListener("pointerdown", e => { aimX = pointerPos(canvas, e).x; });

  api.setProps([
    { label: "紧急修补防线", disabled: false, onClick: () => {
      if (hp < 100 && api.useVoucher()) { hp = Math.min(100, hp + 45); sfx.coin(); }
      else api.cheer("需要消耗 1 张采风道具券！");
    }}
  ]);

  function loop() {
    if (!running || api.signal.aborted) return;
    if (!paused) {
      tick++;
      // Spawn wave enemies
      if (spawnedInWave < waveTotal && tick % Math.max(18, 42 - wave * 5) === 0) {
        const isBoss = wave === 4 && spawnedInWave === waveTotal - 1;
        enemies.push({
          x: 34 + Math.random() * (w - 68),
          y: -16,
          hp: isBoss ? 220 : 18 + wave * 12,
          maxHp: isBoss ? 220 : 18 + wave * 12,
          r: isBoss ? 30 : 16,
          speed: isBoss ? 0.52 : 0.72 + wave * 0.12,
          slow: 0,
          boss: isBoss
        });
        spawnedInWave++;
      }
      // Fire bolts
      if (tick % fireDelay === 0) {
        const dx = aimX - w / 2, dy = -260;
        const baseAng = Math.atan2(dy, dx);
        for (let m = 0; m < multishot; m++) {
          const spread = (m - (multishot - 1) / 2) * 0.14;
          bullets.push({
            x: w / 2, y: h - 38,
            vx: Math.cos(baseAng + spread) * 7.5,
            vy: Math.sin(baseAng + spread) * 7.5,
            pierce, child: false
          });
        }
      }
      // Update bullets
      for (const b of bullets) { b.x += b.vx; b.y += b.vy; }
      bullets = bullets.filter(b => b.x > -10 && b.x < w + 10 && b.y > -10 && b.y < h + 10 && b.pierce > 0);
      // Collisions
      for (const e of enemies) {
        const sp = e.slow > 0 ? e.speed * 0.5 : e.speed;
        if (e.slow > 0) e.slow--;
        e.y += sp;
        for (const b of bullets) {
          if (b.pierce > 0 && Math.hypot(b.x - e.x, b.y - e.y) < e.r + 7) {
            e.hp -= 14;
            b.pierce--;
            if (frost) e.slow = 70;
            if (split && !b.child) {
              bullets.push({ x: e.x, y: e.y, vx: -4.5, vy: -3.2, pierce: 1, child: true });
              bullets.push({ x: e.x, y: e.y, vx: 4.5, vy: -3.2, pierce: 1, child: true });
            }
            if (e.hp <= 0) {
              score += e.boss ? 160 : 16;
              xp += e.boss ? 50 : 12;
              sfx.pop(1);
              if (xp >= nextXp) {
                xp -= nextXp;
                nextXp = Math.round(nextXp * 1.35);
                openUpgradePick();
              }
              break;
            }
          }
        }
        if (e.y >= h - 42 && e.hp > 0) {
          hp -= e.boss ? 35 : 12;
          e.hp = 0;
          sfx.thud();
        }
      }
      enemies = enemies.filter(e => e.hp > 0);
      api.setHud({ stage: `第 ${wave}/4 波 · 防线 ${Math.max(0, hp)}%`, score, hint: "左右滑动瞄准，升级三选一叠满屏弹幕！" });

      if (hp <= 0) {
        running = false;
        sfx.fail();
        api.finish({ score, stageCleared: wave >= 3 ? 1 : 0, milestoneReached: false, summary: `坚守至第 ${wave} 波，防线失守！` });
        return;
      }
      if (spawnedInWave >= waveTotal && enemies.length === 0) {
        if (wave >= 4) {
          running = false;
          sfx.win();
          api.finish({ score: score + 150, stageCleared: 2, milestoneReached: true, summary: "击退墨水领主，守住萤火防线！" });
          return;
        }
        wave++;
        spawnedInWave = 0;
        waveTotal = 8 + wave * 3;
        api.cheer(`第 ${wave} 波来袭！`);
      }
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#222b2e";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#7a5337";
    ctx.fillRect(0, h - 42, w, 42);
    // Turret
    ctx.fillStyle = "#ffe08c";
    ctx.beginPath();
    ctx.arc(w / 2, h - 38, 16, 0, Math.PI * 2);
    ctx.fill();
    for (const b of bullets) {
      ctx.fillStyle = frost ? "#8ee4ff" : "#ffe07d";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.child ? 4 : 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const e of enemies) {
      ctx.fillStyle = e.boss ? "#b54b58" : "#6d7494";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `${e.boss ? 22 : 14}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(e.boss ? "👾" : "🦇", e.x, e.y + 5);
    }
    raf = requestAnimationFrame(loop);
  }

  raf = requestAnimationFrame(loop);
  api.signal.addEventListener("abort", () => { running = false; cancelAnimationFrame(raf); });
}

// 14. 黑洞书桌大吞噬 (Hole.io)
export function playBlackHole(container, api) {
  const { canvas, ctx, w, h } = makeCanvas(container, 360, 390);
  const PROPS = [
    { icon: "🔘", r: 9, val: 6 },
    { icon: "📎", r: 11, val: 8 },
    { icon: "✏️", r: 14, val: 12 },
    { icon: "☕", r: 18, val: 18 },
    { icon: "📚", r: 23, val: 26 },
    { icon: "🛋️", r: 29, val: 40 },
    { icon: "📮", r: 36, val: 65 }
  ];
  const items = [];
  for (let i = 0; i < 42; i++) {
    const tier = i < 16 ? 0 : i < 26 ? 1 : i < 33 ? 2 : i < 37 ? 3 : i < 40 ? 4 : i === 40 ? 5 : 6;
    const p = PROPS[tier];
    items.push({ ...p, x: 30 + Math.random() * (w - 60), y: 30 + Math.random() * (h - 60), eaten: false });
  }
  const hole = { x: w / 2, y: h / 2, r: 16, tx: w / 2, ty: h / 2 };
  let eatenCount = 0, score = 0, timeLeft = 45, running = true, raf = 0;

  const timer = setInterval(() => {
    if (!running || api.signal.aborted) { clearInterval(timer); return; }
    timeLeft--;
    const pct = Math.round((eatenCount / items.length) * 100);
    api.setHud({ stage: `剩余 ${timeLeft}s · 吞噬 ${pct}%`, score, hint: "拖动控制黑洞，先吞小纽扣变大再吞整排家具！" });
    if (timeLeft <= 0 || eatenCount >= items.length) {
      running = false;
      clearInterval(timer);
      sfx.win();
      api.finish({ score, stageCleared: pct >= 50 ? (pct >= 80 ? 2 : 1) : 0, milestoneReached: pct >= 80, summary: `黑洞吞噬了桌面 ${pct}% 的微缩物件！` });
    }
  }, 1000);

  canvas.addEventListener("pointerdown", e => { const p = pointerPos(canvas, e); hole.tx = p.x; hole.ty = p.y; });
  canvas.addEventListener("pointermove", e => { if (e.buttons || e.pointerType === "touch") { const p = pointerPos(canvas, e); hole.tx = p.x; hole.ty = p.y; } });

  api.setProps([
    { label: "洞口暴涨 +25%", disabled: false, onClick: () => {
      if (api.useVoucher()) { hole.r += 7; sfx.coin(); }
      else api.cheer("需要消耗 1 张采风道具券！");
    }}
  ]);

  function loop() {
    if (!running || api.signal.aborted) return;
    hole.x += (hole.tx - hole.x) * 0.14;
    hole.y += (hole.ty - hole.y) * 0.14;
    for (const it of items) {
      if (it.eaten) continue;
      if (hole.r >= it.r && Math.hypot(hole.x - it.x, hole.y - it.y) < hole.r + 4) {
        it.eaten = true;
        eatenCount++;
        score += it.val;
        hole.r = Math.min(54, hole.r + 0.85);
        sfx.pop(Math.min(7, Math.floor(hole.r / 7)));
      }
    }
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#ead6b7";
    ctx.fillRect(0, 0, w, h);
    // Hole
    ctx.fillStyle = "#26192c";
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f2c166";
    ctx.lineWidth = 3.5;
    ctx.stroke();

    for (const it of items) {
      if (it.eaten) continue;
      ctx.font = `${Math.round(it.r * 1.5)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(it.icon, it.x, it.y);
    }
    raf = requestAnimationFrame(loop);
  }

  raf = requestAnimationFrame(loop);
  api.signal.addEventListener("abort", () => { running = false; clearInterval(timer); cancelAnimationFrame(raf); });
}

// 15. 数字门兵团冲锋 (Blue/Red Gate Runner)
export function playGateRunner(container, api) {
  const { canvas, ctx, w, h } = makeCanvas(container, 360, 390);
  let stage = 1, squad = 3, px = w / 2, score = 0, progress = 0, running = true, raf = 0;
  let gates = [], bossHp = 28;

  function buildStage(st) {
    stage = st;
    squad = st === 1 ? 4 : 6;
    progress = 0;
    bossHp = st === 1 ? 24 : 58;
    gates = [
      { y: -40, left: { op: "+", val: 6, good: true }, right: { op: "×", val: 2, good: true }, hit: false },
      { y: -190, left: { op: "-", val: 5, good: false }, right: { op: "+", val: 12, good: true }, hit: false },
      { y: -340, left: { op: "×", val: 2, good: true }, right: { op: "+", val: 8, good: true }, hit: false },
      { y: -490, left: { op: "÷", val: 2, good: false }, right: { op: "+", val: 15, good: true }, hit: false },
      { y: -640, left: { op: "×", val: 2, good: true }, right: { op: "-", val: 10, good: false }, hit: false }
    ];
    api.setHud({ stage: `第 ${stage} 关 · 精灵团 ${squad} 只`, score, hint: "左右滑动穿过蓝门壮大纸精灵兵团，撞碎终点大 Boss！" });
    api.setProps([
      { label: "增援 +10 精灵", disabled: false, onClick: () => {
        if (api.useVoucher()) { squad += 10; sfx.coin(); }
        else api.cheer("需要消耗 1 张采风道具券！");
      }}
    ]);
  }

  canvas.addEventListener("pointerdown", e => { px = Math.max(36, Math.min(w - 36, pointerPos(canvas, e).x)); });
  canvas.addEventListener("pointermove", e => { if (e.buttons || e.pointerType === "touch") px = Math.max(36, Math.min(w - 36, pointerPos(canvas, e).x)); });

  function applyGate(g) {
    if (g.op === "+") squad += g.val;
    else if (g.op === "-") squad = Math.max(1, squad - g.val);
    else if (g.op === "×") squad = Math.min(180, squad * g.val);
    else if (g.op === "÷") squad = Math.max(1, Math.floor(squad / g.val));
    score += g.good ? 30 : 5;
    if (g.good) sfx.pop(3); else sfx.thud();
  }

  function loop() {
    if (!running || api.signal.aborted) return;
    const speed = stage === 1 ? 2.4 : 3.0;
    progress += speed;
    for (const g of gates) {
      g.y += speed;
      if (!g.hit && g.y >= h - 92) {
        g.hit = true;
        applyGate(px < w / 2 ? g.left : g.right);
        api.setHud({ stage: `第 ${stage} 关 · 精灵团 ${squad} 只`, score, hint: `终点 Boss 血量 ${bossHp}` });
      }
    }
    const bossY = -780 + progress;
    if (bossY >= h - 105) {
      if (squad >= bossHp) {
        score += squad * 3;
        if (stage === 1) {
          sfx.win();
          api.cheer("第1关大 Boss 撞飞！第2关冲锋加速！");
          buildStage(2);
        } else {
          running = false;
          sfx.win();
          api.finish({ score: score + 140, stageCleared: 2, milestoneReached: true, summary: `率领 ${squad} 只纸精灵撞碎最终大 Boss！` });
          return;
        }
      } else {
        running = false;
        sfx.fail();
        api.finish({ score, stageCleared: stage - 1, milestoneReached: false, summary: `兵团人数 ${squad} 没撞过 ${bossHp} 血的大 Boss！` });
        return;
      }
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#e4d2b4";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#c9b089";
    ctx.fillRect(26, 0, w - 52, h);

    for (const g of gates) {
      if (g.hit || g.y < -40 || g.y > h) continue;
      for (const [side, cfg, x] of [["l", g.left, 34], ["r", g.right, w / 2 + 6]]) {
        ctx.fillStyle = cfg.good ? "rgba(76, 146, 206, 0.85)" : "rgba(212, 86, 76, 0.85)";
        ctx.beginPath();
        ctx.roundRect(x, g.y, w / 2 - 40, 42, 8);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${cfg.op}${cfg.val}`, x + (w / 2 - 40) / 2, g.y + 28);
      }
    }

    if (bossY > -60) {
      ctx.fillStyle = "#b84f48";
      ctx.beginPath();
      ctx.arc(w / 2, bossY, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`👹 ${bossHp}`, w / 2, bossY + 6);
    }

    // Draw mini spirit swarm
    const drawCount = Math.min(28, squad);
    for (let i = 0; i < drawCount; i++) {
      const ang = i * 2.4;
      const rad = Math.sqrt(i) * 6.5;
      const sx = px + Math.cos(ang) * rad;
      const sy = h - 68 + Math.sin(ang) * rad * 0.55;
      ctx.fillStyle = "#fff4d8";
      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8a5a3a";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.fillStyle = "#3f2617";
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`×${squad}`, px, h - 22);
    raf = requestAnimationFrame(loop);
  }

  buildStage(1);
  raf = requestAnimationFrame(loop);
  api.signal.addEventListener("abort", () => { running = false; cancelAnimationFrame(raf); });
}

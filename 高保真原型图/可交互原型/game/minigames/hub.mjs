import { worlds } from "../book-data.mjs";
import { PAPER_MODELS } from "../paper-models.mjs";
import {
  MINIGAME_CATALOG,
  ensureProgression,
  getCompanionPerk,
  recordMinigameResult
} from "../progression.mjs";
import {
  playCatchGoose,
  playSheepMatch,
  playHexaSort,
  playGoodsSort,
  playCoffeePack
} from "./pack-sort.mjs";
import {
  playScrewJam,
  playCarJam,
  playTapAway,
  playWaterSort,
  playSumTen
} from "./pack-puzzle.mjs";
import {
  playJumpHop,
  playSaveSpirit,
  playBulletRogue,
  playBlackHole,
  playGateRunner
} from "./pack-action.mjs";
import {
  playCozyTidy,
  playMemeSpot,
  playFishingKing,
  playBackpackBrawl,
  playCoinPusher
} from "./pack-casual.mjs";

export const MINIGAME_RUNNERS = {
  catch_goose: playCatchGoose,
  sheep_match: playSheepMatch,
  hexa_sort: playHexaSort,
  goods_sort: playGoodsSort,
  coffee_pack: playCoffeePack,
  screw_jam: playScrewJam,
  car_jam: playCarJam,
  tap_away: playTapAway,
  water_sort: playWaterSort,
  sum_ten: playSumTen,
  jump_hop: playJumpHop,
  save_spirit: playSaveSpirit,
  bullet_rogue: playBulletRogue,
  black_hole: playBlackHole,
  gate_runner: playGateRunner,
  cozy_tidy: playCozyTidy,
  meme_spot: playMemeSpot,
  fishing_king: playFishingKing,
  backpack_brawl: playBackpackBrawl,
  coin_pusher: playCoinPusher
};

export function chapterMinigames(chapterId) {
  return MINIGAME_CATALOG.filter(g => g.chapter === chapterId);
}

export function openArcadeHub({ book, currentWorldId, onStateChanged, onPlaceModel, initialGameId = null, initialChapter = "all" }) {
  const dialog = document.getElementById("ecology-game");
  const titleEl = document.getElementById("ecology-title");
  const board = document.getElementById("ecology-board");
  const closeBtn = dialog.querySelector(".desk-close");
  let activeController = null;
  let selectedChapter = initialChapter;
  let companionId = book.spirits?.[0]?.id || null;

  function abortGame() {
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
  }

  closeBtn.onclick = () => {
    abortGame();
    dialog.close();
  };
  dialog.oncancel = () => abortGame();
  dialog.addEventListener("close", () => abortGame(), { once: true });

  function getCompanion() {
    return (book.spirits || []).find(s => s.id === companionId) || null;
  }

  function renderHub() {
    abortGame();
    const prog = ensureProgression(book);
    titleEl.textContent = "游乐屋 · 20 款爆款小游戏";
    board.replaceChildren();

    // Companion bar
    const topBar = document.createElement("div");
    topBar.className = "arcade-top-bar";
    const wallet = document.createElement("div");
    wallet.className = "arcade-wallet";
    wallet.textContent = `🪙 ${prog.coins}  ·  ⭐ ${prog.stars}  ·  🎟️ 道具券 ${prog.vouchers}`;

    const compWrap = document.createElement("label");
    compWrap.className = "arcade-companion";
    compWrap.textContent = "伴游精灵：";
    const compSel = document.createElement("select");
    compSel.setAttribute("aria-label", "选择伴游精灵");
    for (const sp of book.spirits || []) {
      compSel.add(new Option(sp.name, sp.id, false, sp.id === companionId));
    }
    const perkHint = document.createElement("small");
    perkHint.className = "arcade-perk-hint";
    const updatePerkHint = () => {
      const sp = getCompanion();
      const perk = getCompanionPerk(sp, book);
      perkHint.textContent = perk ? `${perk.trait}天赋：${perk.desc}` : "";
    };
    updatePerkHint();
    compSel.onchange = () => {
      companionId = compSel.value;
      updatePerkHint();
    };
    compWrap.append(compSel);
    topBar.append(wallet, compWrap, perkHint);
    board.append(topBar);

    // Chapter filter strip
    const filters = document.createElement("div");
    filters.className = "arcade-filters";
    const tabs = [{ id: "all", name: "全部 (20)" }, ...worlds.map(w => ({ id: w.id, name: `${w.symbol} ${w.name}` }))];
    for (const t of tabs) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "desk-pill";
      btn.textContent = t.name;
      btn.setAttribute("aria-pressed", String(selectedChapter === t.id));
      btn.onclick = () => { selectedChapter = t.id; renderHub(); };
      filters.append(btn);
    }
    board.append(filters);

    // Game cards grid
    const grid = document.createElement("div");
    grid.className = "arcade-grid";
    const list = selectedChapter === "all" ? MINIGAME_CATALOG : MINIGAME_CATALOG.filter(g => g.chapter === selectedChapter);
    for (const g of list) {
      const isDouble = prog.dailyDoubleIds.includes(g.id);
      const best = prog.minigames.bestScores[g.id] || 0;
      const claimed = prog.minigames.claimedMilestones.includes(g.id);
      const rewardName = PAPER_MODELS[g.rewardModel]?.name || g.rewardModel;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "arcade-card";
      card.dataset.gameId = g.id;
      card.innerHTML = `
        <div class="arcade-card-head">
          <span class="arcade-icon">${g.icon}</span>
          <div class="arcade-card-title">
            <strong>${g.name}</strong>
            <small>${g.tag} · ${g.ref}</small>
          </div>
          ${isDouble ? `<span class="arcade-badge-double">今日双倍</span>` : ""}
        </div>
        <p class="arcade-desc">${g.desc}</p>
        <div class="arcade-card-foot">
          <span>最高 ${best}</span>
          <span class="arcade-reward" data-claimed="${claimed}">${claimed ? "✓ 已领" : "🎁"} ${rewardName}</span>
        </div>
      `;
      card.onclick = () => launchGame(g.id);
      grid.append(card);
    }
    board.append(grid);
  }

  function launchGame(gameId) {
    abortGame();
    const spec = MINIGAME_CATALOG.find(g => g.id === gameId);
    const runner = MINIGAME_RUNNERS[gameId];
    if (!spec || !runner) { renderHub(); return; }

    activeController = new AbortController();
    const signal = activeController.signal;
    const companion = getCompanion();
    const perk = getCompanionPerk(companion, book);

    titleEl.textContent = `${spec.icon} ${spec.name}`;
    board.replaceChildren();

    const header = document.createElement("div");
    header.className = "mg-hud-bar";
    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "desk-pill";
    backBtn.textContent = "‹ 返回游乐屋";
    backBtn.onclick = () => renderHub();
    const stageEl = document.createElement("strong");
    stageEl.className = "mg-hud-stage";
    const scoreEl = document.createElement("span");
    scoreEl.className = "mg-hud-score";
    header.append(backBtn, stageEl, scoreEl);

    const hintEl = document.createElement("p");
    hintEl.className = "mg-hud-hint";
    const cheerEl = document.createElement("div");
    cheerEl.className = "mg-cheer";
    cheerEl.hidden = true;

    const stageHost = document.createElement("div");
    stageHost.className = "mg-stage-host";

    const propsBar = document.createElement("div");
    propsBar.className = "mg-props-bar";

    board.append(header, hintEl, cheerEl, stageHost, propsBar);

    let cheerTimer = 0;
    const api = {
      signal,
      perk,
      setHud: ({ stage, score, hint }) => {
        if (stage !== undefined) stageEl.textContent = stage;
        if (score !== undefined) scoreEl.textContent = `得分 ${score}`;
        if (hint !== undefined) hintEl.textContent = hint;
      },
      setProps: (list) => {
        propsBar.replaceChildren();
        for (const item of list) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "desk-pill";
          btn.textContent = item.label;
          btn.disabled = Boolean(item.disabled);
          btn.onclick = item.onClick;
          propsBar.append(btn);
        }
      },
      cheer: (text) => {
        clearTimeout(cheerTimer);
        cheerEl.textContent = companion ? `${companion.name}：「${text}」` : text;
        cheerEl.hidden = false;
        cheerTimer = setTimeout(() => { cheerEl.hidden = true; }, 2200);
      },
      useVoucher: () => {
        const prog = ensureProgression(book);
        if (prog.vouchers > 0) {
          prog.vouchers -= 1;
          onStateChanged?.();
          return true;
        }
        return false;
      },
      finish: ({ score = 0, stageCleared = 0, milestoneReached = false, summary = "" }) => {
        abortGame();
        const res = recordMinigameResult(book, {
          gameId,
          score,
          stageCleared,
          milestoneReached,
          companionSpirit: companion
        });
        onStateChanged?.();
        renderResult(spec, res, summary);
      }
    };

    runner(stageHost, api);
  }

  function renderResult(spec, res, summary) {
    board.replaceChildren();
    const box = document.createElement("div");
    box.className = "mg-result-card";
    box.innerHTML = `
      <div class="mg-result-icon">${spec.icon}</div>
      <h3>${spec.name} · 结算</h3>
      <p class="mg-result-summary">${summary}</p>
      <div class="mg-result-stats">
        <div><span>本局得分</span><strong>${res.finalScore} ${res.isRecord ? "🏆新纪录" : ""}</strong></div>
        <div><span>获得拾光币</span><strong>+🪙 ${res.coinsEarned} ${res.isDouble ? "(双倍!)" : ""}</strong></div>
        ${res.starsEarned ? `<div><span>获得灵感星</span><strong>+⭐ ${res.starsEarned}</strong></div>` : ""}
        ${res.droppedSnack ? `<div><span>掉落零食</span><strong>${res.droppedSnack.icon} ${res.droppedSnack.name}</strong></div>` : ""}
        ${res.companionXp ? `<div><span>伴游羁绊</span><strong>+${res.companionXp} 经验${res.companionLevelUp ? " · 升级!" : ""}</strong></div>` : ""}
      </div>
    `;
    if (res.unlockedModel) {
      const unlockBanner = document.createElement("div");
      unlockBanner.className = "mg-unlock-banner";
      unlockBanner.innerHTML = `<strong>🎉 解锁里程碑限定家具：${res.unlockedModel.name}</strong>`;
      const placeNow = document.createElement("button");
      placeNow.type = "button";
      placeNow.className = "desk-pill desk-primary";
      placeNow.textContent = "立刻摆进当前页";
      placeNow.onclick = () => {
        dialog.close();
        onPlaceModel?.(res.unlockedModel.id);
      };
      unlockBanner.append(placeNow);
      box.append(unlockBanner);
    }
    const actions = document.createElement("div");
    actions.className = "mg-result-actions";
    const again = document.createElement("button");
    again.type = "button";
    again.className = "desk-pill desk-primary";
    again.textContent = "再来一局";
    again.onclick = () => launchGame(spec.id);
    const back = document.createElement("button");
    back.type = "button";
    back.className = "desk-pill";
    back.textContent = "换一款玩";
    back.onclick = () => renderHub();
    actions.append(again, back);
    box.append(actions);
    board.append(box);
  }

  if (!dialog.open) dialog.showModal();
  if (initialGameId) launchGame(initialGameId);
  else renderHub();
}

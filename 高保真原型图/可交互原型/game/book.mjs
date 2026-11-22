
import { worlds, expressions, faces, neighbors, clamp, uid, loadBook, saveBook, createSpirit, reactionFor, satisfaction } from "./book-data.mjs";
import { placement, freeSpot, floorPoint, floorRecord, expandFloor, expandWideFloor, mountX, walkMap, planWalk, spiritWish, matchesWish, purposeOf } from "./book-home.mjs";
import { propTypes } from "../camera/prop-types.mjs";
import { starterProps, prizeFor, propImage, chapterThumbnail, playEcology } from "./book-ecology.mjs";
import { activityEmotion, displayedEmotion, express, reactionEmotion } from "./spirit-emotions.mjs";
import { primaryTrait, selectDialogueLine, buildChatFlow, pickCompanionExchange, createAmbientScheduler } from "./spirit-dialogue.mjs";
import { PAPER_MODELS, FURNITURE_GROUPS, SCENE_LANDMARKS_VERSION, createDefaultSceneModels, ensureChapterLandmarks, getModelPreviewAsset } from "./paper-models.mjs";

const el = id => document.getElementById(id);
const shell = document.querySelector(".book-shell");
const stage = el("book-stage");
const targets = el("scene-targets");
const flatPaper = el("desk-paper");
const cover = el("open-book");
const drawer = el("desk-drawer");
const library = el("desk-library");
const chapterDialog = el("chapter-dialog");
const taskDialog = el("task-dialog");
const spiritHud = el("spirit-hud");
const spiritBubble = el("spirit-speech-bubble");
const spiritCardPanel = el("spirit-card");
const spiritStatsPanel = el("spirit-card-stats");
const spiritChatPanel = el("spirit-chat-panel");
const spiritThumb = el("spirit-thumb");
const spiritTraitBadge = el("spirit-trait-badge");
const closeSpiritBtn = el("close-spirit-hud");
const ambientBubble = el("ambient-bubble");
const trashZone = el("book-trash-zone");
const furniturePanel = el("furniture-panel");
const furnitureItems = el("furniture-items");
const furnitureCount = el("furniture-count");
const toggleFurnitureBtn = el("toggle-furniture-list");
const closeFurnitureBtn = el("close-furniture-panel");
const tools = ["prev-page", "next-page", "open-tasks", "chapter-label", "desk-add", "wake-spirit", "reset-view", "toggle-furniture-list", "play-ecology"].map(el);
const LONG_PRESS_MS = 350;
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const assets = new Map();
const actors = new Map();
const cooldown = new Map();
const catalog = new Map();
const ambientScheduler = createAmbientScheduler();
const SUMMON_COOLDOWN_MS = 12 * 60 * 60 * 1000;
let lastInteractedSpiritId = null;
let companionCooldownUntil = 0;
let focusedSpiritId = null;
let activeChatSpiritId = null;
let summonCountdownTimer = null;
let lastLifeLayoutTime = 0;
let book, scene, selected, drag, gesture, noteTimer;

function clearSummonCountdown() {
  if (summonCountdownTimer !== null) {
    clearInterval(summonCountdownTimer);
    summonCountdownTimer = null;
  }
}
function remainingSummonMs() {
  return Math.max(0, Number(book?.nextSpiritSummonAt || 0) - Date.now());
}
function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
let yaw = 0, tilt = 0;
let center = { x: 0, y: 0 }, zoom = 1;
const camTarget = { yaw: 0, tilt: 0, x: 0, y: 0, zoom: 1 };
let camFrame = null, idleFloatFrame = null;
const HERO_CLOSED_VIEW = { yaw: -11, tilt: -5, zoom: 1.06 };
const touches = new Map();
let placementWarning = "";
let open = false, busy = false, saveFailed = false, missing = false, revision = 0, worldRevision = 0;
let shown = [];
let residents = [];
let storageWarning = "";
const status = el("desk-status");
const note = el("reaction-note");
const world = () => worlds[book.page];
const records = () => book.decorations[world().id];
const sceneModels = () => {
  book.sceneModels ||= {};
  const id = world().id;
  if (!Array.isArray(book.sceneModels[id])) {
    book.sceneModels[id] = createDefaultSceneModels(id, floorRecord);
  } else {
    book.sceneModels[id] = ensureChapterLandmarks(id, book.sceneModels[id], floorRecord);
  }
  return book.sceneModels[id];
};
const homeSpirits = () => book.spirits.filter(spirit => spirit.home === world().id);
const tab = new URLSearchParams(location.search).get("tab") === "compendium" ? "compendium" : "stickers";
el("return-to-collection").href = `/camera/#album/collection/${tab}`;
el("return-to-collection").setAttribute("aria-label", "返回收藏册");

try {
  const loaded = loadBook(localStorage);
  book = loaded.book;
  let dirty = loaded.migrated;
  if (book.floorVersion !== 3) {
    const remap = book.floorVersion === 2 ? expandWideFloor : expandFloor;
    for (const pieces of Object.values(book.decorations)) for (const piece of pieces) {
      if (piece.surface === "paper") Object.assign(piece, remap(piece));
    }
    book.floorVersion = 3;
    dirty = true;
  }
  if ((book.sceneModelsVersion || 1) < SCENE_LANDMARKS_VERSION) {
    book.sceneModels ||= {};
    for (const chapter of worlds) {
      book.sceneModels[chapter.id] = Array.isArray(book.sceneModels[chapter.id])
        ? ensureChapterLandmarks(chapter.id, book.sceneModels[chapter.id], floorRecord)
        : createDefaultSceneModels(chapter.id, floorRecord);
    }
    book.sceneModelsVersion = SCENE_LANDMARKS_VERSION;
    dirty = true;
  }
  if (dirty) persist();
} catch {
  book = loadBook({ getItem: () => null }).book;
  storageWarning = "之前的书本无法读取";
}
function statusLine() {
  status.textContent = [placementWarning, saveFailed ? "保存失败" : storageWarning, missing ? "部分收藏贴纸已找不到" : ""].filter(Boolean).join(" · ");
  el("desk-retry").hidden = !saveFailed;
}
function persist() {
  try {
    saveBook(localStorage, book);
    saveFailed = false;
    storageWarning = "";
  } catch {
    saveFailed = true;
  }
  statusLine();
}
function lock(value) {
  busy = value;
  shell.dataset.busy = value;
  for (const button of tools) button.disabled = value;
  el("desk-add").disabled = value;
  el("wake-spirit").disabled = value;
  el("prev-page").disabled = value || book.page === 0;
  el("next-page").disabled = value || book.page === worlds.length - 1;
  el("chapter-label").disabled = value;
  if (value) {
    pauseAmbient();
    scene?.pauseResidents();
  } else {
    layout();
    startLife();
  }
}
function showWorld() {
  shell.dataset.world = world().id;
  shell.style.setProperty("--world", world().color);
  shell.style.setProperty("--paper-color", world().paper);
  shell.style.setProperty("--page-ink", world().dark);
  if (world().game) {
    shell.style.setProperty("--halo", world().color);
    shell.style.setProperty("--room", world().dark);
  } else {
    shell.style.removeProperty("--halo");
    shell.style.removeProperty("--room");
  }
  el("play-ecology").hidden = !world().game;
  el("play-ecology").textContent = world().game || "";
  el("chapter-name").textContent = world().name;
  el("chapter-symbol").textContent = world().symbol;
  scene?.setWorld(world().id);
  hideReaction();
}

async function neighborAsset(id) {
  const companion = neighbors[id];
  const tile = document.createElement("canvas");
  tile.width = tile.height = 192;
  const ctx = tile.getContext("2d");
  ctx.lineJoin = "round";
  const outline = path => {
    const shape = new Path2D(path);
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#f6e7c5";
    ctx.stroke(shape);
    ctx.fillStyle = companion.color;
    ctx.fill(shape);
  };
  if (id === "paper-moth") {
    outline("M96 63 Q48 12 24 41 Q4 63 29 108 Q12 148 51 154 Q73 160 96 135 Q119 160 141 154 Q180 148 163 108 Q188 63 168 41 Q144 12 96 63Z");
    ctx.fillStyle = companion.pale;
    for (const x of [49, 143]) {
      ctx.beginPath();
      ctx.ellipse(x, 83, 18, 26, (x < 96 ? -.42 : .42), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#f1b981";
    ctx.fill(new Path2D("M96 52 Q117 68 113 111 Q108 145 96 151 Q82 144 78 111 Q74 69 96 52Z"));
  } else if (id === "paper-sprout") {
    outline("M94 69 Q54 67 29 26 Q66 13 96 44 Q125 12 164 27 Q148 61 107 69 Q155 72 159 114 Q162 170 96 175 Q31 170 33 115 Q37 75 94 69Z");
    ctx.fillStyle = companion.pale;
    ctx.fill(new Path2D("M94 62 Q65 62 38 29 Q72 32 94 58Z M100 58 Q130 27 155 31 Q135 56 100 62Z M47 111 Q72 78 131 91 Q149 104 139 141 Q124 162 91 162 Q42 157 47 111Z"));
  } else if (id === "paper-star") {
    outline("M96 17 L120 67 L176 76 L137 116 L145 172 L96 146 L46 172 L54 117 L15 76 L72 67Z");
    ctx.fillStyle = companion.pale;
    ctx.fill(new Path2D("M96 27 L113 77 L161 82 L130 111 L137 156 L96 136 L55 157 L63 111 L31 82 L78 77Z"));
    ctx.strokeStyle = "#ab774d";
    ctx.lineWidth = 3;
    ctx.stroke(new Path2D("M57 105 L96 126 L135 105 M59 142 L81 118 M131 142 L111 118"));
  } else {
    const shapes = {
      "paper-otter": "M43 69 Q22 29 54 26 Q73 26 76 45 Q96 35 118 46 Q125 20 148 28 Q169 36 151 70 Q179 132 127 160 Q93 177 57 153 Q23 128 43 69Z",
      "paper-glow": "M95 52 Q62 19 36 42 Q10 74 53 106 Q27 129 53 146 Q69 153 95 135 Q127 161 145 141 Q164 122 141 106 Q187 75 158 43 Q127 20 95 52Z",
      "paper-kite": "M94 21 L159 79 L103 151 L83 151 L31 79Z",
      "paper-shell": "M38 114 Q10 92 41 75 Q25 50 62 50 Q64 18 95 36 Q124 18 132 49 Q168 49 153 75 Q179 88 153 112 L114 155 H77Z"
    };
    outline(shapes[id]);
    ctx.fillStyle = companion.pale;
    ctx.beginPath();
    ctx.ellipse(96, 105, 39, 31, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const image = new Image();
  image.src = tile.toDataURL();
  await image.decode();
  return { image, url: image.src, name: companion.name, category: companion.category, ratio: 1 };
}

async function loadAsset(id) {
  if (!assets.has(id)) {
    assets.set(id, (async () => {
      if (Object.hasOwn(neighbors, id)) return neighborAsset(id);
      const starter = starterProps.find(entry => entry.id === id);
      if (starter) {
        const image = new Image();
        image.src = propImage(starter).toDataURL();
        await image.decode();
        return { ...starter, image, url: image.src, ratio: 1 };
      }
      const sticker = await CameraAlbum.getSticker(id);
      if (!sticker?.blob) return null;
      const url = URL.createObjectURL(sticker.blob);
      const image = new Image();
      image.src = url;
      try {
        await image.decode();
        return { image, url, name: sticker.name || "未命名贴纸", category: sticker.category, purpose: sticker.purpose,
          ratio: image.naturalWidth / image.naturalHeight };
      } catch (error) {
        URL.revokeObjectURL(url);
        throw error;
      }
    })());
  }
  try {
    const asset = await assets.get(id);
    if (!asset) assets.delete(id);
    return asset;
  } catch (error) {
    assets.delete(id);
    throw error;
  }
}
function sync() {
  scene?.sync(shown, residents, sceneModels());
  layout();
}
function flatBounds(record, spirit) {
  const rect = flatPaper.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const longest = Math.min(rect.width, rect.height) * (spirit ? .23 : record.isModel ? .22 * (record.scale || 1) : record.scale * (record.surface === "prop" ? .52 : 1));
  const width = longest * Math.min(1, record.asset.ratio);
  const height = longest / Math.max(1, record.asset.ratio);
  const center = record.surface === "prop"
    ? { x: .57 + .26 * record.x, y: .48 + .19 * record.y }
    : { x: record.x, y: record.y };
  return {
    left: rect.left - stageRect.left + clamp(center.x * rect.width - width / 2, 0, Math.max(0, rect.width - width)),
    top: rect.top - stageRect.top + clamp(center.y * rect.height - height / 2, 0, Math.max(0, rect.height - height)),
    width, height
  };
}
function isAmbientPaused() {
  return busy || Boolean(drag) || Boolean(gesture) || Boolean(focusedSpiritId) || Boolean(activeChatSpiritId) || Boolean(document.querySelector("dialog[open]"));
}
function hideOverheadSpeech(reduced) {
  for (const entry of actors.values()) {
    if (!entry.spirit) continue;
    const speech = entry.button.querySelector(".spirit-speech");
    if (!speech || speech.hidden) continue;
    if (reduced) {
      speech.hidden = true;
      delete speech.dataset.fading;
    } else {
      speech.dataset.fading = "true";
      setTimeout(() => { if (speech.dataset.fading === "true") speech.hidden = true; }, 250);
    }
  }
}
function pauseAmbient() {
  ambientScheduler.pause((reduced) => {
    hideOverheadSpeech(reduced);
    ambientBubble.hidden = true;
    delete ambientBubble.dataset.fading;
  }, motion.matches);
}
function showAmbient(spirit, text) {
  if (!spirit || !text || isAmbientPaused()) return false;
  const now = performance.now();
  if (!ambientScheduler.canTrigger(spirit.id, now, isAmbientPaused())) return false;
  return ambientScheduler.trigger(spirit, text, now, (sp, line) => {
    hideOverheadSpeech(true);
    const speech = actors.get("spirit:" + sp.id)?.button.querySelector(".spirit-speech");
    if (speech) {
      speech.textContent = line;
      delete speech.dataset.fading;
      speech.hidden = false;
    }
    ambientBubble.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = sp.name + "：";
    ambientBubble.append(strong, document.createTextNode(line));
    delete ambientBubble.dataset.fading;
    ambientBubble.hidden = false;
  }, (reduced) => {
    hideOverheadSpeech(reduced);
    ambientBubble.hidden = true;
    delete ambientBubble.dataset.fading;
  }, motion.matches);
}
function triggerSpiritLine(spirit, query, propName) {
  if (!spirit || isAmbientPaused()) return;
  const fallbackProp = shown.find(item => item.asset?.name)?.asset.name || "";
  const chosen = selectDialogueLine(book, spirit, query, {
    chapterName: world().name,
    propName: propName || fallbackProp,
    spiritName: spirit.name
  });
  if (chosen?.rendered) {
    if (showAmbient(spirit, chosen.rendered)) persist();
  }
}
function anchorSpiritHud(bounds) {
  if (!focusedSpiritId || spiritHud.hidden || !bounds) return;
  const sw = Math.max(1, stage.clientWidth);
  const sh = Math.max(1, stage.clientHeight);
  const cx = bounds.left + bounds.width / 2;
  const bubbleW = Math.min(280, sw - 24);
  const bx = clamp(cx, bubbleW / 2 + 12, Math.max(bubbleW / 2 + 12, sw - bubbleW / 2 - 12));
  let by = bounds.top - 10;
  if (by < 92) {
    spiritBubble.dataset.flip = "below";
    by = Math.min(sh - 120, bounds.top + bounds.height + 10);
  } else {
    delete spiritBubble.dataset.flip;
  }
  spiritHud.style.setProperty("--bubble-x", `${Math.round(bx)}px`);
  spiritHud.style.setProperty("--bubble-y", `${Math.round(by)}px`);
}
function layout(spiritsOnly = false) {
  if (!open) return;
  const spiritBoxes = [];
  let focusedBounds = null;
  for (const { record, button, spirit } of actors.values()) {
    if (spiritsOnly === true && !spirit) continue;
    const bounds = scene?.bounds(record, spirit) || flatBounds(record, spirit);
    if (spirit && scene) {
      bounds.left -= Math.max(0, 44 - bounds.width) / 2;
      bounds.top -= Math.max(0, 44 - bounds.height) / 2;
      bounds.width = Math.max(44, bounds.width);
      bounds.height = Math.max(44, bounds.height);
    }
    for (const [property, value] of Object.entries(bounds)) button.style[property] = `${value}px`;
    const image = button.querySelector("img");
    image.hidden = Boolean(scene);
    if (!spirit && !scene) image.style.transform = `rotate(${(record.rotation || 0) + (record.selfRotation || 0)}deg)`;
    if (spirit) {
      if (record.id === focusedSpiritId) focusedBounds = bounds;
      button.dataset.activity = record.activity || "idle";
      const bubble = button.querySelector(".spirit-bubble");
      const emotion = displayedEmotion(record, spiritWish(record), performance.now());
      if (bubble.textContent !== emotion.icon) bubble.textContent = emotion.icon;
      const isWish = String(Boolean(emotion.wish));
      if (bubble.dataset.wish !== isWish) bubble.dataset.wish = isWish;
      if (button.getAttribute("aria-description") !== emotion.label) button.setAttribute("aria-description", emotion.label);
      delete button.dataset.bubbleShift;
      spiritBoxes.push({ id: record.id, button, left: bounds.left, top: bounds.top, width: bounds.width });
    }
    const face = button.querySelector(".face");
    if (face) {
      face.hidden = Boolean(scene) || record.expression === "none";
      face.textContent = faces[record.expression];
    }
  }
  anchorSpiritHud(focusedBounds);
  for (let i = 0; i < spiritBoxes.length; i++) {
    for (let j = i + 1; j < spiritBoxes.length; j++) {
      const a = spiritBoxes[i], b = spiritBoxes[j];
      const ax = a.left + a.width / 2, bx = b.left + b.width / 2;
      if (Math.abs(ax - bx) < 52 && Math.abs(a.top - b.top) < 42) {
        const aPriority = a.id === lastInteractedSpiritId;
        const bPriority = b.id === lastInteractedSpiritId;
        if (aPriority && !bPriority) b.button.dataset.bubbleShift = bx >= ax ? "right" : "left";
        else if (bPriority && !aPriority) a.button.dataset.bubbleShift = ax >= bx ? "right" : "left";
        else {
          a.button.dataset.bubbleShift = ax <= bx ? "left" : "right";
          b.button.dataset.bubbleShift = ax <= bx ? "right" : "left";
        }
      }
    }
  }
}
function setFurniturePanelOpen(nextOpen) {
  if (!furniturePanel) return;
  furniturePanel.hidden = !nextOpen;
  toggleFurnitureBtn?.setAttribute("aria-expanded", String(nextOpen));
  if (nextOpen) renderFurnitureList();
}
function focusPropCamera(record) {
  if (!record || busy) return;
  if (focusedSpiritId) closeSpiritHud({ resetCamera: false });
  const pt = record.surface === "prop" ? { x: 0, y: -1.1 } : floorPoint(record);
  camTarget.x = clamp(pt.x, -7.2, 7.2);
  camTarget.y = clamp(pt.y + .06, -6.2, 6.2);
  camTarget.zoom = Math.max(zoom, 1.58);
  camTarget.yaw = clamp(yaw || 0, -28, 28);
  camTarget.tilt = clamp(tilt || 5.0, -6, 18);
  if (motion.matches || !scene) {
    stopCamFollow();
    center = { x: camTarget.x, y: camTarget.y };
    zoom = camTarget.zoom;
    setView(camTarget.yaw, camTarget.tilt);
    layout(true);
  } else {
    ensureCamFollow();
  }
  scene?.highlightProp?.(record.id);
}
function renderFurnitureList() {
  if (!furnitureItems || !furnitureCount) return;
  const list = [...sceneModels(), ...shown];
  furnitureCount.textContent = `共 ${list.length} 件`;
  if (furniturePanel?.hidden) return;
  furnitureItems.replaceChildren();
  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "furniture-empty";
    empty.textContent = "这一页还没有摆放家具或贴纸。";
    furnitureItems.append(empty);
    return;
  }
  for (const item of list) {
    const row = document.createElement("div");
    row.className = "furniture-row";
    row.setAttribute("role", "listitem");
    row.dataset.selected = String(selected === item);
    const focusBtn = document.createElement("button");
    focusBtn.type = "button";
    focusBtn.className = "furniture-focus-btn";
    const thumb = document.createElement("img");
    thumb.className = "furniture-thumb";
    thumb.alt = "";
    thumb.src = item.asset?.url || "";
    const info = document.createElement("span");
    info.className = "furniture-info";
    const title = document.createElement("strong");
    title.textContent = item.name || item.asset?.name || "场景道具";
    const meta = document.createElement("small");
    meta.textContent = item.isModel
      ? `${PAPER_MODELS[item.modelId]?.furnGroup || "纸模"} · 3D`
      : (item.surface === "prop" ? "布景贴纸" : "纸页贴纸");
    info.append(title, meta);
    focusBtn.append(thumb, info);
    focusBtn.onclick = () => focusPropCamera(item);

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "desk-pill furniture-edit-btn";
    editBtn.textContent = "编辑";
    editBtn.onclick = () => {
      focusPropCamera(item);
      select(item);
      el("desk-size")?.focus({ preventScroll: true });
    };
    row.append(focusBtn, editBtn);
    furnitureItems.append(row);
  }
}
toggleFurnitureBtn?.addEventListener("click", () => {
  if (busy) return;
  setFurniturePanelOpen(Boolean(furniturePanel?.hidden));
});
closeFurnitureBtn?.addEventListener("click", () => {
  setFurniturePanelOpen(false);
  toggleFurnitureBtn?.focus({ preventScroll: true });
});

function removeRecord(record) {
  if (!record) return;
  if (selected === record) select(undefined);
  if (record.isModel) {
    const models = sceneModels();
    const idx = models.indexOf(record);
    if (idx !== -1) models.splice(idx, 1);
  } else {
    const recs = records();
    const idx = recs.indexOf(record);
    if (idx !== -1) recs.splice(idx, 1);
    const sIdx = shown.indexOf(record);
    if (sIdx !== -1) shown.splice(sIdx, 1);
  }
  actors.get(record.id)?.button.remove();
  actors.delete(record.id);
  updateWalkMap();
  sync();
  renderFurnitureList();
  persist();
}
function select(record) {
  if (record && focusedSpiritId) closeSpiritHud({ resetCamera: false });
  if (selected) {
    const prevBtn = actors.get(selected.id)?.button;
    if (prevBtn) {
      prevBtn.setAttribute("aria-pressed", "false");
      delete prevBtn.dataset.editing;
    }
  }
  selected = record;
  if (record) shell.dataset.editing = "true";
  else delete shell.dataset.editing;
  placementMessage("");
  el("desk-selection").hidden = !record;
  if (!record) {
    renderFurnitureList();
    return;
  }
  const btn = actors.get(record.id)?.button;
  if (btn) {
    btn.setAttribute("aria-pressed", "true");
    btn.dataset.editing = "true";
  }
  el("desk-size").value = Math.round((record.scale || (record.isModel ? 1 : .3)) * 100);
  el("desk-rotation").value = record.rotation || 0;
  el("desk-self-rotation").value = record.selfRotation || 0;
  const isModel = Boolean(record.isModel);
  const surfaceEl = el("piece-surface").closest(".ui-select") || el("piece-surface");
  const faceEl = el("piece-face").closest(".ui-select") || el("piece-face");
  surfaceEl.hidden = isModel;
  faceEl.hidden = isModel;
  el("desk-self-rotation").closest("label").hidden = isModel;
  if (!isModel) {
    el("piece-face").value = record.expression || "none";
    el("piece-surface").value = record.surface || "paper";
    el("piece-face").dispatchEvent(new Event("input"));
    el("piece-surface").dispatchEvent(new Event("input"));
  }
  renderFurnitureList();
}
function placementMessage(message) {
  if (placementWarning === message) return;
  placementWarning = message;
  statusLine();
}
function placeChange(record, updates) {
  const candidate = { ...record, asset: record.asset, ...updates };
  if (!placement(world().id, candidate, shown, sceneModels())) {
    placementMessage("这里放不下，请留出一点空间");
    return false;
  }
  Object.assign(record, updates);
  placementMessage("");
  return true;
}
function pick(x, y, surface) {
  if (scene) return scene.pick(x, y, surface);
  const rect = flatPaper.getBoundingClientRect();
  const pos = { x: (x - rect.left) / rect.width, y: (y - rect.top) / rect.height };
  if (surface === "prop") return { x: (pos.x - .57) / .26, y: (pos.y - .48) / .19 };
  return pos;
}
let actorLongPressTimer;
let suppressModelClick = false;
let orbitCandidate = null;
function clearBookTrash() {
  trashZone.hidden = true;
  delete trashZone.dataset.active;
  if (drag?.button) delete drag.button.dataset.deleting;
}
function actor(record, spirit = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = spirit ? "spirit-actor" : (record.isModel ? "desk-piece scene-model-piece" : "desk-piece");
  button.setAttribute("aria-label", spirit ? `精灵 ${record.name}` : (record.isModel ? `纸模 ${record.name}` : record.asset.name));
  const img = record.asset.image.cloneNode();
  img.alt = "";
  img.draggable = false;
  button.append(img);
  const key = spirit ? "spirit:" + record.id : record.id;
  actors.set(key, { record, button, spirit });
  targets.append(button);
  if (spirit) {
    const nametag = document.createElement("span");
    nametag.className = "spirit-nametag";
    nametag.setAttribute("aria-hidden", "true");
    nametag.textContent = record.name;
    const bubble = document.createElement("span");
    bubble.className = "spirit-bubble";
    bubble.setAttribute("aria-hidden", "true");
    const speech = document.createElement("span");
    speech.className = "spirit-speech";
    speech.setAttribute("aria-hidden", "true");
    speech.hidden = true;
    button.append(nametag, bubble, speech);
    button.addEventListener("click", () => openSpirit(record.id));
    return button;
  }
  if (!record.isModel) {
    button.style.zIndex = String(10 + Math.min(190, records().indexOf(record) + 1));
    const face = document.createElement("span");
    face.className = "face";
    face.setAttribute("aria-hidden", "true");
    button.append(face);
  } else {
    button.style.zIndex = "1";
  }
  button.setAttribute("aria-pressed", "false");
  let pendingHold = null;
  button.addEventListener("click", event => {
    if (suppressModelClick) { suppressModelClick = false; return; }
    if (event.detail === 0 && !busy && selected !== record) select(record);
  });
  button.addEventListener("pointerdown", event => {
    if (busy || drag || gesture || event.button !== 0) return;
    pauseAmbient();
    if (selected === record) {
      const point = pick(event.clientX, event.clientY, record.surface || "paper");
      if (!point) return;
      drag = { id: event.pointerId, record, button, point, x: record.x, y: record.y, startX: event.clientX, startY: event.clientY, moved: false, accepted: false };
      trashZone.hidden = false;
      try { button.setPointerCapture(event.pointerId); } catch {}
      return;
    }
    pendingHold = { id: event.pointerId, startX: event.clientX, startY: event.clientY };
    if (!orbitCandidate) orbitCandidate = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw, tilt, center, record, button };
    button.dataset.pressing = "true";
    clearTimeout(actorLongPressTimer);
    actorLongPressTimer = setTimeout(() => {
      delete button.dataset.pressing;
      if (!pendingHold || pendingHold.id !== event.pointerId || busy || gesture?.moved) return;
      pendingHold = null;
      if (orbitCandidate?.id === event.pointerId) orbitCandidate = null;
      if (gesture?.id === event.pointerId) gesture = undefined;
      suppressModelClick = true;
      navigator.vibrate?.(12);
      select(record);
      const point = pick(event.clientX, event.clientY, record.surface || "paper");
      if (!point) return;
      drag = { id: event.pointerId, record, button, point, x: record.x, y: record.y, startX: event.clientX, startY: event.clientY, moved: false, accepted: false };
      trashZone.hidden = false;
      try { button.setPointerCapture(event.pointerId); } catch {}
    }, LONG_PRESS_MS);
  });
  button.addEventListener("pointermove", event => {
    if (pendingHold && event.pointerId === pendingHold.id) {
      if (Math.hypot(event.clientX - pendingHold.startX, event.clientY - pendingHold.startY) >= 8) {
        clearTimeout(actorLongPressTimer);
        delete button.dataset.pressing;
        pendingHold = null;
        if (orbitCandidate?.id === event.pointerId && !gesture) {
          gesture = { ...orbitCandidate, moved: true };
          orbitCandidate = null;
          pauseAmbient();
          try { stage.setPointerCapture(event.pointerId); } catch {}
        }
      }
      return;
    }
    if (!drag || drag.id !== event.pointerId) return;
    const point = pick(event.clientX, event.clientY, record.surface || "paper");
    if (!point) return;
    const dx = point.x - drag.point.x, dy = point.y - drag.point.y;
    if (!drag.moved && Math.hypot(dx, dy) < .013) return;
    drag.moved = true;
    clearTimeout(actorLongPressTimer);
    if (selected !== record) select(record);
    trashZone.hidden = false;
    const valid = placeChange(record, { x: drag.x + dx, y: drag.y + dy });
    button.toggleAttribute("data-invalid", !valid);
    if (valid) {
      drag.accepted = true;
      sync();
    }
    const rect = stage.getBoundingClientRect();
    const nearBottom = (event.clientY - rect.top) >= rect.height - 64 && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 35;
    trashZone.dataset.active = String(Boolean(nearBottom));
    if (nearBottom) button.dataset.deleting = "true";
    else delete button.dataset.deleting;
  });
  function endActorPointer(event) {
    if (pendingHold?.id === event.pointerId) {
      clearTimeout(actorLongPressTimer);
      delete button.dataset.pressing;
      pendingHold = null;
      if (orbitCandidate?.id === event.pointerId) orbitCandidate = null;
      return;
    }
    if (drag?.id !== event.pointerId) return;
    clearTimeout(actorLongPressTimer);
    const shouldDelete = trashZone.dataset.active === "true";
    const targetRecord = drag.record;
    const accepted = drag.accepted;
    clearBookTrash();
    drag = undefined;
    button.removeAttribute("data-invalid");
    if (shouldDelete) {
      removeRecord(targetRecord);
      return;
    }
    if (accepted) {
      changed(targetRecord);
      if (!gesture?.pinch) select(targetRecord);
    }
  }
  button.addEventListener("pointerup", endActorPointer);
  button.addEventListener("pointercancel", endActorPointer);
  button.addEventListener("lostpointercapture", endActorPointer);
  button.addEventListener("keydown", event => {
    const delta = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] }[event.key];
    if (!delta || busy) return;
    event.preventDefault();
    select(record);
    if (placeChange(record, { x: record.x + delta[0] * .035, y: record.y + delta[1] * .035 })) changed(record);
  });
  return button;
}
function rebuildActors() {
  targets.replaceChildren();
  actors.clear();
  for (const model of sceneModels()) actor(model);
  for (const record of shown) actor(record);
  for (const spirit of residents) actor(spirit, true);
  if (selected) select(selected);
  sync();
}
async function restoreWorld() {
  const decoration = records();
  const models = sceneModels();
  const population = homeSpirits();
  const activePage = book.page;
  const token = ++worldRevision;
  const all = [...decoration, ...population];
  const loaded = await Promise.all(all.map(record => loadAsset(record.stickerId).catch(() => null)));
  if (activePage !== book.page || token !== worldRevision) return;
  for (const model of models) {
    model.isModel = true;
    model.surface ||= "paper";
    setAsset(model, getModelPreviewAsset(model.modelId, model.name, model.color));
  }
  missing = loaded.some(asset => !asset);
  shown = decoration.filter((record, i) => {
    if (loaded[i]) setAsset(record, loaded[i]);
    return loaded[i];
  });
  let nextGuest = 0, nextNeighbor = 0;
  residents = population.flatMap((spirit, i) => {
    const asset = loaded[decoration.length + i];
    if (!asset) return [];
    const slot = spirit.builtin ? nextNeighbor++ : nextGuest++;
    const x = spirit.builtin ? .105 + slot * .075 : .66 + slot % 3 * .11;
    const y = spirit.builtin ? .855 : .38 + Math.floor(slot / 3) % 4 * .17;
    return [{ ...spirit, asset, fulfilled: book.fulfilled?.[spirit.id], ...expandFloor({ x, y }), ...lifePositions.get(lifeKey(spirit)) }];
  });
  updateWalkMap();
  rebuildActors();
  renderFurnitureList();
  statusLine();
}
function setAsset(record, asset) {
  Object.defineProperty(record, "asset", { value: asset, writable: true, configurable: true, enumerable: false });
}
const lerp = (a, b, t) => a + (b - a) * t;
function easeOutBack(t) {
  if (t >= 1) return 1;
  const c1 = 1.65, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function stopIdleFloat() {
  if (idleFloatFrame !== null) {
    cancelAnimationFrame(idleFloatFrame);
    idleFloatFrame = null;
  }
}
function startIdleFloat() {
  if (idleFloatFrame !== null || open || busy || !scene || motion.matches || document.hidden) return;
  function step(now) {
    idleFloatFrame = null;
    if (open || busy || !scene || motion.matches || document.hidden) return;
    const fy = Math.sin(now * .0014) * .045;
    zoom = HERO_CLOSED_VIEW.zoom;
    center = { x: 0, y: 0 };
    setView(HERO_CLOSED_VIEW.yaw + Math.sin(now * .0009) * 1.4, HERO_CLOSED_VIEW.tilt + Math.cos(now * .0011) * .7);
    scene.pose({ opening: 0, standing: 0, floatY: fy });
    idleFloatFrame = requestAnimationFrame(step);
  }
  idleFloatFrame = requestAnimationFrame(step);
}
function animate(duration, draw, ease = t => t * t * (3 - 2 * t)) {
  if (motion.matches || !scene) { draw(1); return Promise.resolve(); }
  return new Promise(resolve => {
    const start = performance.now();
    function frame(time) {
      const t = clamp((time - start) / duration);
      draw(t >= 1 ? 1 : ease(t));
      if (t >= 1 || !scene) { draw(1); resolve(); }
      else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
async function openCover() {
  if (open || busy) return;
  stopIdleFloat();
  stopCamFollow();
  lock(true);
  cover.hidden = true;
  const startYaw = yaw, startTilt = tilt, startZoom = zoom;
  await animate(700, p => {
    zoom = lerp(startZoom, 1, p);
    center = { x: 0, y: 0 };
    setView(lerp(startYaw, 0, p), lerp(startTilt, 0, p));
    scene?.pose({ opening: p, standing: 0 });
  });
  Object.assign(camTarget, { yaw: 0, tilt: 0, x: 0, y: 0, zoom: 1 });
  open = true;
  shell.dataset.open = true;
  el("page-tools").hidden = false;
  await Promise.all([
    animate(540, standing => scene?.pose({ standing }), easeOutBack),
    restoreWorld(),
    refreshCatalog()
  ]);
  lock(false);
  el("chapter-label").focus({ preventScroll: true });
}
async function turn(index) {
  if (!open || busy || drag || gesture || index === book.page || !worlds[index]) return;
  const direction = Math.sign(index - book.page);
  stopCamFollow();
  if (focusedSpiritId) closeSpiritHud({ resetCamera: false });
  lock(true);
  select(undefined);
  hideReaction();
  const startYaw = yaw, startTilt = tilt, startZoom = zoom;
  const startCenter = { ...center };
  const bankYaw = clamp(startYaw - direction * 5.5, -30, 30);
  const pullTilt = clamp(startTilt - 2.4, -8.5, 20.5);
  const pullZoom = Math.min(startZoom, .89);
  try {
    if (scene && !motion.matches) {
      shell.dataset.turnPhase = "fold";
      await animate(250, t => {
        zoom = lerp(startZoom, pullZoom, t);
        center = { x: lerp(startCenter.x, 0, t), y: lerp(startCenter.y, 0, t) };
        setView(lerp(startYaw, bankYaw, t), lerp(startTilt, pullTilt, t));
        scene?.pose({ standing: 1 - t, actors: 1 });
      });
      await animate(170, t => scene?.pose({ standing: 0, actors: 1 - t }));
      shell.dataset.turnPhase = "leaf";
      await animate(250, t => scene?.pose({ standing: 0, turning: t / 2, direction }));
    }
    book.page = index;
    persist();
    showWorld();
    if (scene && !motion.matches) {
      scene.pose({ standing: 0, turning: .5, direction });
      await Promise.all([
        animate(250, t => scene?.pose({ standing: 0, turning: .5 + t / 2, direction })),
        restoreWorld()
      ]);
      shell.dataset.turnPhase = "unfold";
      await animate(420, t => {
        zoom = lerp(pullZoom, 1, t);
        center = { x: 0, y: 0 };
        setView(lerp(bankYaw, startYaw, t), lerp(pullTilt, startTilt, t));
        scene?.pose({ standing: easeOutBack(t), actors: 0 });
      }, t => t);
      await animate(210, actors => scene?.pose({ actors }), easeOutBack);
    } else {
      center = { x: 0, y: 0 };
      zoom = 1;
      setView(startYaw, startTilt);
      await restoreWorld();
      scene?.pose({});
    }
    Object.assign(camTarget, { yaw: startYaw, tilt: startTilt, x: 0, y: 0, zoom: 1 });
  } finally {
    delete shell.dataset.turnPhase;
    lock(false);
    if (residents[0]) {
      triggerSpiritLine(residents[0], { module: "基础情境环境对白", scene: "搬家与翻页", sub: "翻页加载" });
    }
  }
}
function openChapters() {
  const list = el("chapter-list");
  el("chapter-progress").textContent = `全书满意度 ${satisfaction(book)} 点`;
  list.replaceChildren(...worlds.map((chapter, i) => {
    const button = document.createElement("button");
    button.style.setProperty("--chapter-paper", chapter.paper);
    const label = document.createElement("div");
    label.textContent = chapter.name;
    button.append(chapterThumbnail(chapter), label);
    if (i === book.page) button.setAttribute("aria-current", "page");
    button.onclick = () => { chapterDialog.close(); void turn(i); };
    return button;
  }));
  chapterDialog.showModal();
}

function openTasks() {
  el("task-progress").textContent = `${world().name} · 全书满意度 ${satisfaction(book)} 点`;
  const list = el("task-list");
  list.replaceChildren();
  for (const spirit of homeSpirits()) {
    const fulfilled = book.fulfilled?.[spirit.id] || [];
    const wish = spiritWish({ ...spirit, fulfilled });
    const button = document.createElement("button");
    button.style.setProperty("--chapter-paper", world().paper);
    const label = document.createElement("div");
    label.textContent = `${wish.icon} ${spirit.name} · ${wish.title}`;
    const detail = document.createElement("small");
    detail.textContent = fulfilled.length === 4 ? "四类心愿均已完成" : wish.hint;
    label.append(detail);
    button.append(label);
    button.onclick = () => { taskDialog.close(); openSpirit(spirit.id); };
    list.append(button);
  }
  if (world().game) {
    const button = document.createElement("button");
    button.style.setProperty("--chapter-paper", world().paper);
    const label = document.createElement("div");
    label.textContent = world().game;
    const detail = document.createElement("small");
    detail.textContent = book.prizes?.includes(world().id) ? "已领取首通摆件" : `首次通关可获得${world().prize}`;
    label.append(detail);
    button.append(label);
    button.onclick = () => { taskDialog.close(); playEcology(world(), claimPrize); };
    list.append(button);
  }
  if (!list.children.length) list.textContent = "这一页暂时没有心愿。可以唤醒精灵或邀请精灵搬过来。";
  taskDialog.showModal();
}
function hideReaction() {
  clearTimeout(noteTimer);
  note.hidden = true;
}
function changed(record) {
  sync();
  updateWalkMap();
  const reactions = [];
  for (const resident of residents) {
    const { x, y } = record.surface === "prop" ? floorRecord({ x: mountX(world().id), y: .16 }) : record;
    const offset = { x: x - resident.x, y: y - resident.y };
    const distance = Math.hypot(offset.x, offset.y);
    if (distance > .36 + resident.traits.好奇 * .0025) continue;
    const reaction = observe(resident, record, offset);
    if (reaction) reactions.push({ ...reaction, distance });
  }
  if (reactions.length) {
    const closest = reactions.sort((a, b) => a.distance - b.distance)[0];
    showReaction(closest);
  }
  renderFurnitureList();
  persist();
}
async function claimPrize(chapter) {
  if (!chapter.game) return false;
  if (book.prizes?.includes(chapter.id)) return false;
  const prize = prizeFor(chapter);
  const blob = await new Promise((resolve, reject) => propImage(prize).toBlob(value =>
    value ? resolve(value) : reject(new Error("保存失败"))));
  if (!await CameraAlbum.getSticker(prize.id)) {
    await CameraAlbum.saveSticker({ ...prize, timestamp: Date.now(), blob, thumbnail: blob });
  }
  book.prizes ||= [];
  if (!book.prizes.includes(chapter.id)) book.prizes.push(chapter.id);
  persist();
  return true;
}

const categoryFor = record => catalog.get(record.stickerId) || record.asset.category;
function observe(resident, record, offset) {
  const now = performance.now();
  const key = `${resident.id}|${record.id}|${record.expression}`;
  if (now - (cooldown.get(key) ?? -Infinity) < 1600) return;
  cooldown.set(key, now);
  const reaction = reactionFor(resident, categoryFor(record), record.expression);
  const discovered = reaction.kind && !resident.discoveries.some(value => value.kind === reaction.kind && value.value === reaction.value);
  if (discovered) resident.discoveries.push(reaction);
  express(resident, reactionEmotion[reaction.sentiment], now);
  const button = actors.get("spirit:" + resident.id)?.button;
  if (button && !motion.matches) {
    delete button.dataset.reaction;
    void button.offsetWidth;
    button.dataset.reaction = reaction.sentiment;
    scene?.react(resident.id, reaction.sentiment, offset, resident.traits);
  }
  return { name: resident.name, sentiment: reaction.sentiment, discovered };
}
function showReaction(reaction) {
  note.textContent = reaction.name + { like: " 开心地跳了一下", avoid: " 往后缩了缩", neutral: " 转头看了看" }[reaction.sentiment];
  note.dataset.sentiment = reaction.sentiment;
  note.hidden = false;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(hideReaction, 2200);
}

const lifePositions = new Map();
const lifeKey = resident => world().id + "|" + resident.id;
let navigation, lifeFrame, lastLifeTime;
function updateWalkMap() {
  navigation = walkMap(world().id, shown, navigation, sceneModels());
  for (const resident of residents) {
    resident.path = [];
    resident.target = undefined;
    resident.activity = "idle";
    resident.wait = Math.min(resident.wait ?? .65, .65);
  }
}
function startLife() {
  if (lifeFrame === undefined && open && !busy && !document.hidden) {
    lastLifeTime = undefined;
    lifeFrame = requestAnimationFrame(tickLife);
  }
}
function tickLife(now) {
  lifeFrame = undefined;
  if (busy || document.hidden || !open) return;
  const dt = lastLifeTime === undefined ? 0 : (now - lastLifeTime) / 1000;
  if (dt >= 1 / 30 || lastLifeTime === undefined) {
    lastLifeTime = now;
    if (!selected && !drag && !gesture && !document.querySelector("dialog[open]")) {
      let moved = Boolean(activeChatSpiritId);
      for (const resident of residents) {
        if (resident.id === activeChatSpiritId) continue;
        const prevX = resident.x, prevY = resident.y, prevFacing = resident.facing;
        moveResident(resident, Math.min(.1, dt));
        if (Math.abs(resident.x - prevX) > 1e-4 || Math.abs(resident.y - prevY) > 1e-4 || resident.facing !== prevFacing) {
          moved = true;
        }
      }
      detectCompanionEncounter(now);
      if (moved) scene?.moveResidents(residents);
      if (moved || now - lastLifeLayoutTime >= 250) {
        lastLifeLayoutTime = now;
        layout(true);
      }
    }
  }
  lifeFrame = requestAnimationFrame(tickLife);
}
function detectCompanionEncounter(now) {
  if (residents.length < 2 || now < companionCooldownUntil || isAmbientPaused()) return;
  for (let i = 0; i < residents.length; i++) {
    for (let j = i + 1; j < residents.length; j++) {
      const a = residents[i], b = residents[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) < 0.15) {
        companionCooldownUntil = now + 90000;
        express(a, "companion", now);
        express(b, "companion", now);
        const placeHint = a.activity === "rest" || b.activity === "rest" ? "rest" : (a.target ? purposeOf(a.target) : "walk");
        const fallbackProp = shown.find(item => item.asset?.name)?.asset.name || "";
        const exchange = pickCompanionExchange(book, a, b, placeHint, {
          chapterName: world().name,
          propName: fallbackProp
        });
        if (exchange.length) {
          showAmbient(exchange[0].spirit, exchange[0].text.replace(/^[^：]+：「|」$/g, ""));
          if (exchange[1]) {
            setTimeout(() => {
              if (!isAmbientPaused()) {
                ambientScheduler.pause(() => {}, true);
                showAmbient(exchange[1].spirit, exchange[1].text.replace(/^[^：]+：「|」$/g, ""));
              }
            }, 2600);
          }
        }
        return;
      }
    }
  }
}
function moveResident(resident, dt) {
  resident.wishPause = Math.max(0, (resident.wishPause || 0) - dt);
  if (resident.wait > 0) {
    resident.wait -= dt;
    return;
  }
  if (!resident.path.length) {
    if (resident.activity === "walk") {
      resident.activity = resident.target ? "observe" : "rest";
      resident.wait = resident.target ? 2 + resident.traits.好奇 / 35 : 1 + (100 - resident.traits.活跃) / 33;
      if (resident.target) {
        const targetProp = resident.target;
        const offset = { x: targetProp.x - resident.x, y: targetProp.y - resident.y };
        const reaction = observe(resident, targetProp, offset);
        const type = purposeOf(targetProp);
        const baseType = propTypes[type]?.basePurpose || type;
        resident.activity = baseType === "backdrop" ? "rest" : "observe";
        express(resident, activityEmotion[baseType] || activityEmotion.toy);
        if (!motion.matches && baseType !== "backdrop") scene?.react(resident.id, "like", offset, resident.traits, baseType);
        if (!resident.wishPause && matchesWish(resident, targetProp)) {
          const spirit = book.spirits.find(value => value.id === resident.id);
          resident.wishesDone = spirit.wishesDone = (spirit.wishesDone || 0) + 1;
          book.fulfilled ||= {};
          const fulfilled = book.fulfilled[resident.id] ||= [];
          if (!fulfilled.includes(baseType)) fulfilled.push(baseType);
          resident.fulfilled = fulfilled;
          resident.wishPause = 12;
          express(resident, "fulfilled");
          persist();
          note.textContent = `${resident.name}的心愿实现了！`;
          note.dataset.sentiment = "like";
          note.hidden = false;
          clearTimeout(noteTimer);
          noteTimer = setTimeout(hideReaction, 3000);
          triggerSpiritLine(resident, { module: "基础情境环境对白", scene: "心愿与完成", sub: "完成反馈" }, targetProp.asset?.name);
        } else {
          if (reaction?.discovered) {
            persist();
            showReaction(reaction);
          }
          const sceneMap = {
            backdrop: "安静角落",
            toy: "玩具与游戏",
            plant: "植物观察",
            food: "食物与分享"
          };
          if (Math.random() < .35) {
            triggerSpiritLine(resident, {
              module: "基础情境环境对白",
              scene: sceneMap[baseType] || "散步与巡查",
              sub: "摆件互动"
            }, targetProp.asset?.name);
          }
        }
        actors.get("spirit:" + resident.id)?.button.setAttribute("title", resident.name + (propTypes[type]?.activity || propTypes.toy.activity));
      } else if (Math.random() < .35) {
        triggerSpiritLine(resident, { module: "基础情境环境对白", scene: "同伴与休息", sub: "同伴/休息" });
      }
      resident.target = undefined;
      return;
    }
    resident.random = (Math.imul(resident.random ?? resident.seed, 1664525) + 1013904223) >>> 0;
    const requested = new Set(resident.wishPause ? [] : shown.filter(piece => matchesWish(resident, piece)));
    const route = planWalk(navigation, resident, shown, categoryFor, resident.random / 4294967296,
      piece => requested.has(piece));
    resident.path = route.path;
    resident.target = route.target;
    if (!route.path.length && !resident.blocked) {
      express(resident, "blocked");
      triggerSpiritLine(resident, { module: "基础情境环境对白", scene: "散步与巡查", sub: "路途反馈" });
    }
    resident.blocked = !route.path.length;
    if (route.relocate && resident.path.length) Object.assign(resident, resident.path.shift());
    resident.activity = resident.path.length ? "walk" : "idle";
    resident.wait = resident.path.length ? 0 : 2;
  }
  const next = resident.path[0];
  if (!next) return;
  const from = floorPoint(resident), to = floorPoint(next);
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const progress = distance ? Math.min(1, dt * (.35 + resident.traits.活跃 * .007) / distance) : 1;
  resident.x += (next.x - resident.x) * progress;
  resident.y += (next.y - resident.y) * progress;
  if (progress === 1) resident.path.shift();
  lifePositions.set(lifeKey(resident), { x: resident.x, y: resident.y, random: resident.random });
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(lifeFrame);
    lifeFrame = undefined;
    stopIdleFloat();
    stopCamFollow();
    scene?.pauseResidents();
  } else {
    startLife();
    if (!open) startIdleFloat();
  }
});

async function refreshCatalog() {
  try {
    for (const entry of await CameraAlbum.listDiscoveries("compendium")) catalog.set(entry.stickerId, entry.category);
  } catch {
    // Unidentified stickers can still use expression preferences.
  }
}
const thumbs = [];
function libraryMessage(message, href, label) {
  const p = document.createElement("p");
  p.textContent = message;
  library.replaceChildren(p);
  if (!href) return;
  const link = document.createElement("a");
  link.className = "desk-pill desk-primary";
  link.href = href;
  link.textContent = label;
  library.append(link);
}
async function openLibrary(wake, drawerTab = "stickers", groupFilter = "全部") {
  clearSummonCountdown();
  const token = ++revision;
  el("desk-drawer-title").textContent = wake ? "唤醒精灵" : "添加贴纸";
  el("desk-drawer-close").setAttribute("aria-label", wake ? "关闭精灵抽屉" : "关闭贴纸抽屉");
  if (!drawer.open) drawer.showModal();
  libraryMessage("正在翻找收藏册…");
  const current = () => drawer.open && token === revision;
  try {
    if (!wake && drawerTab === "models") {
      library.replaceChildren();
      const tabs = document.createElement("div");
      tabs.className = "drawer-tabs";
      const stickerTab = document.createElement("button");
      stickerTab.type = "button";
      stickerTab.className = "desk-pill";
      stickerTab.textContent = "贴纸收藏";
      stickerTab.setAttribute("aria-pressed", "false");
      stickerTab.onclick = () => { if (current()) void openLibrary(false, "stickers"); };
      const modelTab = document.createElement("button");
      modelTab.type = "button";
      modelTab.className = "desk-pill";
      modelTab.textContent = "纸模布景";
      modelTab.setAttribute("aria-pressed", "true");
      tabs.append(stickerTab, modelTab);
      library.append(tabs);

      const filters = document.createElement("div");
      filters.className = "drawer-filters";
      filters.setAttribute("role", "group");
      filters.setAttribute("aria-label", "家具分类筛选");
      for (const groupName of FURNITURE_GROUPS) {
        const filterBtn = document.createElement("button");
        filterBtn.type = "button";
        filterBtn.className = "desk-pill";
        filterBtn.textContent = groupName;
        filterBtn.setAttribute("aria-pressed", String(groupName === groupFilter));
        filterBtn.onclick = () => { if (current()) void openLibrary(false, "models", groupName); };
        filters.append(filterBtn);
      }
      library.append(filters);

      const orderedModels = Object.entries(PAPER_MODELS)
        .filter(([, spec]) => groupFilter === "全部" || (spec.furnGroup || "布景") === groupFilter)
        .sort((a, b) => (b[1].batch || 0) - (a[1].batch || 0));
      for (const [modelId, spec] of orderedModels) {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "desk-card";
        const preview = new Image();
        preview.alt = "";
        const asset = getModelPreviewAsset(modelId, spec.name, spec.color);
        preview.src = asset.url;
        const label = document.createElement("span");
        label.textContent = spec.name;
        card.append(preview, label);
        library.append(card);
        card.onclick = () => {
          const spot = floorRecord({ x: center.x + (Math.random() - .5) * 1.4, y: center.y + 1.0 + (Math.random() - .5) * 1.0 });
          const record = {
            id: uid(),
            modelId,
            name: spec.name,
            category: spec.category,
            purpose: spec.purpose,
            color: spec.color,
            surface: "paper",
            x: clamp(spot.x, .12, .88),
            y: clamp(spot.y, .12, .88),
            scale: .85,
            rotation: 0,
            selfRotation: 0,
            isModel: true
          };
          setAsset(record, asset);
          drawer.close();
          sceneModels().push(record);
          const button = actor(record);
          select(record);
          changed(record);
          button.focus({ preventScroll: true });
        };
      }
      return;
    }
    const saved = await CameraAlbum.listDiscoveries(wake ? "compendium" : "stickers");
    const list = wake ? saved : [...saved, ...starterProps];
    if (!current()) return;
    library.replaceChildren();
    if (!wake) {
      const tabs = document.createElement("div");
      tabs.className = "drawer-tabs";
      const stickerTab = document.createElement("button");
      stickerTab.type = "button";
      stickerTab.className = "desk-pill";
      stickerTab.textContent = "贴纸收藏";
      stickerTab.setAttribute("aria-pressed", "true");
      const modelTab = document.createElement("button");
      modelTab.type = "button";
      modelTab.className = "desk-pill";
      modelTab.textContent = "纸模布景";
      modelTab.setAttribute("aria-pressed", "false");
      modelTab.onclick = () => { if (current()) void openLibrary(false, "models"); };
      tabs.append(stickerTab, modelTab);
      library.append(tabs);
    }
    if (!list.length) {
      const p = document.createElement("p");
      p.textContent = wake ? "先把一张贴纸识别入图鉴，就能唤醒它。" : "从照片里提取的贴纸会出现在这里。";
      const link = document.createElement("a");
      link.className = "desk-pill desk-primary";
      link.href = wake ? "/camera/#album/collection/compendium" : "/camera/";
      link.textContent = wake ? "去图鉴" : "去相机拍照";
      library.append(p, link);
      return;
    }
    let countdownBanner;
    if (wake) {
      countdownBanner = document.createElement("div");
      countdownBanner.className = "summon-countdown";
      countdownBanner.setAttribute("role", "status");
      const updateBanner = () => {
        const left = remainingSummonMs();
        countdownBanner.dataset.cooldown = left > 0 ? "active" : "ready";
        countdownBanner.textContent = left > 0
          ? `距离下次可召唤新精灵还剩 ${formatCountdown(left)}（已唤醒的精灵仍可随时查看）`
          : "现在可以召唤一只新精灵（每次召唤后需等待 12 小时）";
      };
      updateBanner();
      summonCountdownTimer = setInterval(() => {
        if (!current()) { clearSummonCountdown(); return; }
        updateBanner();
      }, 1000);
      library.append(countdownBanner);
    } else {
      const camera = document.createElement("a");
      camera.href = "/camera/";
      camera.textContent = "去相机拍照";
      camera.className = "desk-pill";
      library.append(camera);
    }
    const showSummonConfirm = (entry, id, asset) => {
      clearSummonCountdown();
      library.replaceChildren();
      const panel = document.createElement("div");
      panel.className = "summon-confirm-card";
      const preview = new Image();
      preview.alt = "";
      preview.src = asset.url;
      const heading = document.createElement("strong");
      heading.textContent = `确认召唤「${entry.name || "未命名贴纸"}」吗？`;
      const desc = document.createElement("p");
      desc.textContent = `确认后它将来到「${world().name}」，并开启 12 小时新精灵召唤倒计时。`;
      const actions = document.createElement("div");
      actions.className = "summon-confirm-actions";
      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "desk-pill";
      confirmBtn.textContent = "确认召唤";
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "desk-pill";
      cancelBtn.textContent = "取消";
      cancelBtn.onclick = () => { if (current()) void openLibrary(true); };
      confirmBtn.onclick = async () => {
        if (confirmBtn.disabled) return;
        if (remainingSummonMs() > 0) {
          if (current()) void openLibrary(true);
          return;
        }
        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        try {
          const now = Date.now();
          book.lastSpiritSummonAt = now;
          book.nextSpiritSummonAt = now + SUMMON_COOLDOWN_MS;
          const spirit = createSpirit(entry, world().id);
          book.spirits.push(spirit);
          catalog.set(id, spirit.category);
          persist();
          await restoreWorld();
          if (current()) { drawer.close(); openSpirit(spirit.id); }
        } catch {
          confirmBtn.disabled = false;
          cancelBtn.disabled = false;
        }
      };
      actions.append(confirmBtn, cancelBtn);
      panel.append(preview, heading, desc, actions);
      library.append(panel);
    };
    for (const entry of list) {
      const id = wake ? entry.stickerId : entry.id;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "desk-card";
      const preview = new Image();
      preview.alt = "";
      const label = document.createElement("span");
      label.textContent = entry.name || "未命名贴纸";
      card.append(preview, label);
      library.append(card);
      if (entry.thumbnail) {
        preview.src = URL.createObjectURL(entry.thumbnail);
        thumbs.push(preview.src);
      } else {
        void loadAsset(id).then(asset => { if (current() && asset) preview.src = asset.url; }).catch(() => {});
      }
      card.onclick = async () => {
        if (library.inert) return;
        library.inert = true;
        try {
          const existing = wake && book.spirits.find(spirit => spirit.stickerId === id);
          if (existing) { drawer.close(); openSpirit(existing.id); return; }
          if (wake) {
            const left = remainingSummonMs();
            if (left > 0) {
              if (countdownBanner) {
                countdownBanner.dataset.cooldown = "blocked";
                countdownBanner.textContent = `召唤冷却中：还需等待 ${formatCountdown(left)} 才能召唤下一只新精灵`;
                countdownBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }
              return;
            }
          }
          const asset = await loadAsset(id);
          if (!current()) return;
          if (!asset) throw new Error("收藏已移除");
          if (wake) {
            showSummonConfirm(entry, id, asset);
          } else {
            const savedPurpose = asset.purpose || book.propPurposes?.[id];
            if (!savedPurpose) {
              libraryMessage("先选这张贴纸在家园里的用途");
              for (const [key, type] of Object.entries(propTypes)) {
                const choice = document.createElement("button");
                choice.type = "button";
                choice.className = "desk-pill";
                choice.textContent = type.name;
                choice.onclick = () => {
                  book.propPurposes ||= {};
                  book.propPurposes[id] = key;
                  placeFromLibrary(id, asset, key);
                };
                library.append(choice);
              }
              return;
            }
            placeFromLibrary(id, asset, savedPurpose);
          }
        } catch {
          if (current()) {
            const p = document.createElement("p");
            p.textContent = "这张贴纸暂时无法打开，请重新选择。";
            library.querySelector("p")?.remove();
            library.prepend(p);
          }
        } finally {
          library.inert = false;
        }
      };
    }
  } catch {
    if (current()) libraryMessage("暂时无法读取收藏册。关闭后可以重试。");
  }
}
function placeFromLibrary(id, asset, purpose) {
  const record = { id: uid(), stickerId: id, purpose, scale: .3, expression: "none", surface: "paper", rotation: 0, selfRotation: 0 };
  setAsset(record, asset);
  const spot = freeSpot(world().id, record, shown, floorRecord({ x: center.x + 1.15, y: center.y + 1.25 }));
  if (!spot) {
    const message = document.createElement("p");
    message.textContent = "这一页暂时放不下，请先腾出一些空间";
    message.setAttribute("role", "status");
    library.querySelector("p")?.remove();
    library.prepend(message);
    return;
  }
  Object.assign(record, spot);
  drawer.close();
  records().push(record);
  shown.push(record);
  const button = actor(record);
  select(record);
  changed(record);
  button.focus({ preventScroll: true });
}
function stopCamFollow() {
  if (camFrame !== null) {
    cancelAnimationFrame(camFrame);
    camFrame = null;
  }
}
function updateFocusedCamTarget() {
  if (!focusedSpiritId || gesture || drag) return;
  const resident = residents.find(r => r.id === focusedSpiritId);
  if (!resident) return;
  const pt = floorPoint(resident);
  camTarget.x = clamp(pt.x, -7.2, 7.2);
  camTarget.y = clamp(pt.y + .06, -6.2, 6.2);
}
function ensureCamFollow() {
  if (camFrame !== null || motion.matches) return;
  function step() {
    camFrame = null;
    if (!open || busy || drag || gesture) return;
    updateFocusedCamTarget();
    const k = .16;
    const dyaw = camTarget.yaw - yaw;
    const dtilt = camTarget.tilt - tilt;
    const dx = camTarget.x - center.x;
    const dy = camTarget.y - center.y;
    const dz = camTarget.zoom - zoom;
    const moving = Math.abs(dyaw) > .08 || Math.abs(dtilt) > .08 || Math.abs(dx) > .012 || Math.abs(dy) > .012 || Math.abs(dz) > .004;
    if (moving) {
      center = { x: center.x + dx * k, y: center.y + dy * k };
      zoom = zoom + dz * k;
      setView(yaw + dyaw * k, tilt + dtilt * k);
      layout(true);
    } else if (focusedSpiritId) {
      center = { x: camTarget.x, y: camTarget.y };
      zoom = camTarget.zoom;
      setView(camTarget.yaw, camTarget.tilt);
      layout(true);
    }
    if (moving || focusedSpiritId) camFrame = requestAnimationFrame(step);
  }
  camFrame = requestAnimationFrame(step);
}
function focusSpiritCamera(spirit) {
  const resident = residents.find(r => r.id === spirit.id);
  if (!resident) return;
  const pt = floorPoint(resident);
  camTarget.x = clamp(pt.x, -7.2, 7.2);
  camTarget.y = clamp(pt.y + .06, -6.2, 6.2);
  camTarget.zoom = Math.max(zoom, 1.82);
  camTarget.yaw = clamp(yaw || 0, -28, 28);
  camTarget.tilt = clamp(tilt || 4.5, -6, 18);
  if (motion.matches) {
    center = { x: camTarget.x, y: camTarget.y };
    zoom = camTarget.zoom;
    setView(camTarget.yaw, camTarget.tilt);
    layout(true);
  } else {
    ensureCamFollow();
  }
}
function closeSpiritHud({ resetCamera = true, immediate = false } = {}) {
  if (!focusedSpiritId && spiritHud.hidden && !activeChatSpiritId) return;
  const chatId = activeChatSpiritId;
  activeChatSpiritId = null;
  focusedSpiritId = null;
  if (chatId) {
    const resident = residents.find(r => r.id === chatId);
    if (resident) {
      resident.chatting = false;
      express(resident, "greeting");
    }
    scene?.moveResidents(residents);
  }
  spiritHud.hidden = true;
  delete shell.dataset.focused;
  spiritHud.dataset.mode = "inspect";
  spiritBubble.hidden = true;
  spiritStatsPanel.hidden = false;
  spiritCardPanel.hidden = false;
  spiritChatPanel.hidden = true;
  if (resetCamera) {
    Object.assign(camTarget, { yaw: 0, tilt: 0, x: 0, y: 0, zoom: 1 });
    if (immediate || motion.matches) {
      stopCamFollow();
      center = { x: 0, y: 0 };
      zoom = 1;
      setView(0, 0);
    } else {
      ensureCamFollow();
    }
  } else {
    stopCamFollow();
  }
  layout(true);
  startLife();
}
function openSpirit(id) {
  const spirit = book.spirits.find(value => value.id === id);
  if (!spirit || busy) return;
  if (selected) select(undefined);
  if (activeChatSpiritId && activeChatSpiritId !== id) {
    const prev = residents.find(r => r.id === activeChatSpiritId);
    if (prev) prev.chatting = false;
    activeChatSpiritId = null;
  }
  lastInteractedSpiritId = id;
  focusedSpiritId = id;
  pauseAmbient();
  el("spirit-name").textContent = spirit.name;
  spiritTraitBadge.textContent = `主性格：${primaryTrait(spirit)}`;
  spiritThumb.hidden = true;
  spiritThumb.removeAttribute("src");
  spiritThumb.alt = `${spirit.name}的贴纸剪影`;
  void loadAsset(spirit.stickerId).then(asset => {
    if (asset && !spiritHud.hidden && spiritCardPanel.dataset.spirit === id) {
      spiritThumb.src = asset.url;
      spiritThumb.hidden = false;
    }
  }).catch(() => {});

  const card = spiritCardPanel;
  card.replaceChildren();
  card.dataset.spirit = id;
  const stats = spiritStatsPanel;
  stats.replaceChildren();
  const traits = document.createElement("div");
  traits.className = "spirit-traits";
  for (const [trait, value] of Object.entries(spirit.traits)) {
    const label = document.createElement("span");
    label.textContent = trait;
    const meter = document.createElement("meter");
    meter.setAttribute("aria-label", trait);
    meter.max = 100;
    meter.value = value;
    traits.append(label, meter);
  }
  const discovered = document.createElement("p");
  discovered.textContent = spirit.discoveries.length ? spirit.discoveries.map(({ kind, value, sentiment }) =>
    `${sentiment === "like" ? "喜欢" : "回避"}${kind === "face" ? expressions[value] : value}`).join(" · ") : "在它附近摆放贴纸，观察它的喜好。";
  stats.append(traits, discovered);
  stats.hidden = false;

  const request = document.createElement("section");
  request.className = "spirit-wish";
  const wish = spiritWish({ ...spirit, fulfilled: book.fulfilled?.[spirit.id] });
  const wishTitle = document.createElement("strong");
  wishTitle.textContent = `${wish.icon} ${wish.title}`;
  const wishHint = document.createElement("p");
  wishHint.textContent = wish.hint + "，留一条路让它走过去。";
  request.append(wishTitle, wishHint);
  if (spirit.wishesDone) {
    const count = document.createElement("small");
    count.textContent = `已实现 ${spirit.wishesDone} 个心愿`;
    request.append(count);
  }
  const chatBtn = document.createElement("button");
  chatBtn.type = "button";
  chatBtn.className = "desk-pill desk-primary";
  chatBtn.id = "spirit-chat-btn";
  chatBtn.textContent = "💬 聊聊";
  chatBtn.onclick = () => openChat(spirit);
  card.append(request, chatBtn);
  const move = document.createElement("label");
  const destinations = document.createElement("select");
  destinations.setAttribute("aria-label", "搬家到");
  for (const chapter of worlds) destinations.add(new Option(chapter.name, chapter.id, false, chapter.id === spirit.home));
  move.append("住处", destinations);
  window.TimeLightSelect?.enhance(destinations, "paper");
  destinations.onchange = async () => {
    const nextHome = destinations.value;
    spirit.home = nextHome;
    select(undefined);
    persist();
    await restoreWorld();
    const movedLine = selectDialogueLine(book, spirit, { module: "基础情境环境对白", scene: "搬家与翻页", sub: "翻页加载" }, { chapterName: worlds.find(w => w.id === spirit.home)?.name || world().name });
    if (movedLine?.rendered && nextHome === world().id) showAmbient(spirit, movedLine.rendered);
  };
  card.append(move);

  spiritHud.dataset.mode = "inspect";
  shell.dataset.focused = "true";
  spiritCardPanel.hidden = false;
  spiritChatPanel.hidden = true;
  spiritBubble.hidden = true;
  spiritHud.hidden = false;
  focusSpiritCamera(spirit);
  layout(true);
  closeSpiritBtn.focus({ preventScroll: true });
}

function openChat(spirit) {
  if (!spirit || busy) return;
  pauseAmbient();
  focusedSpiritId = spirit.id;
  activeChatSpiritId = spirit.id;
  const resident = residents.find(r => r.id === spirit.id);
  if (resident) {
    resident.chatting = true;
    scene?.moveResidents(residents);
  }
  const fulfilled = book.fulfilled?.[spirit.id] || [];
  const wish = spiritWish({ ...spirit, fulfilled });
  const fallbackProp = shown.find(item => item.asset?.name)?.asset.name || "";
  const flow = buildChatFlow(book, spirit, {
    chapterId: world().id,
    chapterName: world().name,
    propName: fallbackProp,
    wish
  });
  el("chat-meta").textContent = `主性格：${flow.trait}（偏${flow.subTrait}）· 所在：${world().name}`;
  const bubble = el("chat-bubble");
  const optionsBox = el("chat-options");

  const makeChoice = (label, handler, primary = false) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = primary ? "desk-pill desk-primary" : "desk-pill";
    btn.textContent = label;
    btn.onclick = handler;
    return btn;
  };

  function showRoot() {
    bubble.textContent = flow.getGreeting();
    optionsBox.replaceChildren(
      makeChoice("今天怎么样", () => openBranch("today")),
      makeChoice("你想要什么", () => openBranch("wish")),
      makeChoice("聊聊这一页", () => openBranch("page")),
      makeChoice("先聊到这儿", () => closeSpiritHud())
    );
    optionsBox.querySelector("button")?.focus({ preventScroll: true });
  }

  function openBranch(key) {
    const res = flow.getBranch(key);
    persist();
    bubble.textContent = res.reply;
    optionsBox.replaceChildren();
    if (res.isWish) {
      const viewTask = makeChoice("查看任务", () => {
        closeSpiritHud({ resetCamera: false });
        openTasks();
      }, true);
      const later = makeChoice("待会再看", () => closeSpiritHud());
      optionsBox.append(viewTask, later);
    } else {
      if (res.followUpLabel) {
        optionsBox.append(makeChoice(res.followUpLabel, () => {
          bubble.textContent = res.secondReply;
          optionsBox.replaceChildren(
            makeChoice("回到话题", showRoot),
            makeChoice("结束对话", () => closeSpiritHud(), true)
          );
          optionsBox.querySelector("button")?.focus({ preventScroll: true });
        }, true));
      }
      optionsBox.append(makeChoice("回到话题", showRoot), makeChoice("结束对话", () => closeSpiritHud()));
    }
    optionsBox.querySelector("button")?.focus({ preventScroll: true });
  }

  optionsBox.onkeydown = event => {
    const buttons = [...optionsBox.querySelectorAll("button")];
    const index = buttons.indexOf(document.activeElement);
    if (index === -1) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      buttons[(index + 1) % buttons.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      buttons[(index - 1 + buttons.length) % buttons.length]?.focus();
    }
  };

  spiritHud.dataset.mode = "chat";
  shell.dataset.focused = "true";
  spiritStatsPanel.hidden = true;
  spiritCardPanel.hidden = true;
  spiritChatPanel.hidden = false;
  spiritBubble.hidden = false;
  spiritHud.hidden = false;
  showRoot();
  focusSpiritCamera(spirit);
  layout(true);
}

closeSpiritBtn.addEventListener("click", () => closeSpiritHud());

cover.addEventListener("click", () => void openCover());
el("open-tasks").addEventListener("click", openTasks);
el("chapter-label").addEventListener("click", openChapters);
el("play-ecology").addEventListener("click", () => playEcology(world(), claimPrize));
el("prev-page").addEventListener("click", () => void turn(book.page - 1));
el("next-page").addEventListener("click", () => void turn(book.page + 1));
el("desk-add").addEventListener("click", () => void openLibrary(false));
el("wake-spirit").addEventListener("click", () => void openLibrary(true));
el("desk-drawer-close").addEventListener("click", () => drawer.close());
drawer.addEventListener("close", () => {
  clearSummonCountdown();
  if (drawer.open) return;
  revision++;
  library.replaceChildren();
  for (const url of thumbs.splice(0)) URL.revokeObjectURL(url);
});
for (const dialog of [chapterDialog, taskDialog]) {
  dialog.querySelector(".desk-close").onclick = () => dialog.close();
}
for (const [id, field, factor] of [["desk-size", "scale", 100], ["desk-rotation", "rotation", 1], ["desk-self-rotation", "selfRotation", 1]]) {
  const slider = el(id);
  slider.addEventListener("input", () => {
    if (!selected || busy) return;
    if (placeChange(selected, { [field]: Number(slider.value) / factor })) sync();
  });
  slider.addEventListener("change", () => {
    if (!selected || busy) return;
    slider.value = Math.round((selected[field] || 0) * factor);
    updateWalkMap();
    persist();
  });
}
window.TimeLightSelect?.enhance(el("piece-face"), "paper");
window.TimeLightSelect?.enhance(el("piece-surface"), "paper");
el("piece-face").addEventListener("change", event => {
  if (!selected || busy) return;
  selected.expression = event.target.value;
  changed(selected);
});
el("piece-surface").addEventListener("change", event => {
  if (!selected || busy || selected.isModel) return;
  const surface = event.target.value;
  const center = surface === "prop" ? { x: .5, y: .5 } : { x: .62, y: .51 };
  const spot = freeSpot(world().id, { ...selected, asset: selected.asset, surface }, shown, center, sceneModels());
  if (spot && placeChange(selected, { surface, ...spot })) changed(selected);
  else {
    event.target.value = selected.surface;
    event.target.dispatchEvent(new Event("input"));
    placementMessage("这里放不下，请留出一点空间");
  }
});
el("desk-remove").addEventListener("click", () => {
  if (!selected || busy) return;
  removeRecord(selected);
  el("desk-add").focus();
});
el("desk-retry").addEventListener("click", persist);
el("finish-placement").addEventListener("click", () => {
  select(undefined);
  el("desk-add").focus({ preventScroll: true });
});

function setView(nextYaw = yaw, nextTilt = tilt) {
  yaw = clamp(nextYaw, -30, 30);
  tilt = clamp(nextTilt, -8.5, 20.5);
  stage.dataset.yaw = yaw;
  stage.dataset.tilt = tilt;
  stage.dataset.zoom = zoom;
  scene?.view(yaw, tilt, center, zoom);
  flatPaper.style.setProperty("--flat-scale", 1.85 * zoom);
  flatPaper.style.setProperty("--flat-x", -center.x * 9 + "%");
  flatPaper.style.setProperty("--flat-y", -center.y * 10 + "%");
  if (!scene) layout();
}

function moveCenter(origin, dx, dy, scale) {
  const factor = 11 / (stage.clientWidth * scale);
  const angle = (scene ? yaw + 14 : 0) * Math.PI / 180;
  const depth = dy * factor * (scene ? 1.6 : 1);
  center = {
    x: clamp(origin.x - dx * factor * Math.cos(angle) - depth * Math.sin(angle), -7.2, 7.2),
    y: clamp(origin.y + dx * factor * Math.sin(angle) - depth * Math.cos(angle), -6.2, 6.2)
  };
}

function zoomAt(nextZoom, anchor, destination) {
  zoom = nextZoom;
  camTarget.zoom = zoom;
  setView();
  if (!anchor) return;
  const projected = pick(destination.x, destination.y, "paper");
  if (!projected) return;
  const from = floorPoint(projected);
  const to = floorPoint(anchor);
  center = {
    x: clamp(center.x + to.x - from.x, -7.2, 7.2),
    y: clamp(center.y + to.y - from.y, -6.2, 6.2)
  };
  camTarget.x = center.x;
  camTarget.y = center.y;
  setView();
  if (focusedSpiritId) layout(true);
}

el("reset-view").addEventListener("click", () => {
  if (focusedSpiritId) {
    closeSpiritHud({ resetCamera: true, immediate: true });
    return;
  }
  Object.assign(camTarget, { yaw: 0, tilt: 0, x: 0, y: 0, zoom: 1 });
  stopCamFollow();
  center = { x: 0, y: 0 };
  zoom = 1;
  setView(0, 0);
});
stage.addEventListener("wheel", event => {
  if (!open || busy || drag || gesture) return;
  event.preventDefault();
  const cursor = { x: event.clientX, y: event.clientY };
  zoomAt(clamp(zoom * Math.exp(-event.deltaY * .0015), .5, 2.25),
    pick(cursor.x, cursor.y, "paper"), cursor);
}, { passive: false });

function pinchMetrics() {
  const [first, second] = touches.values();
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
    distance: Math.max(1, Math.hypot(first.x - second.x, first.y - second.y)),
    angle: Math.atan2(second.y - first.y, second.x - first.x) * 180 / Math.PI
  };
}
function normalizeDeg(deg) {
  let d = deg;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return Math.round(d);
}
let suppressTap = false;
stage.addEventListener("pointerdown", event => {
  if (!open || busy || event.button !== 0) return;
  const point = { x: event.clientX, y: event.clientY };
  if (event.pointerType === "touch") {
    if (!touches.size) suppressTap = false;
    if (touches.size >= 2) return;
    touches.set(event.pointerId, point);
    if (touches.size === 2) {
      if (drag) {
        clearTimeout(actorLongPressTimer);
        clearBookTrash();
        Object.assign(drag.record, { x: drag.x, y: drag.y });
        drag.button.removeAttribute("data-invalid");
        drag = undefined;
        placementMessage("");
        sync();
      }
      const pinch = pinchMetrics();
      orbitCandidate = null;
      clearTimeout(actorLongPressTimer);
      if (selected) {
        gesture = {
          pinch,
          piece: selected,
          scale: selected.scale || (selected.isModel ? 1 : .3),
          rotation: selected.rotation || 0,
          moved: true
        };
      } else {
        gesture = { pinch, zoom, anchor: pick(pinch.x, pinch.y, "paper"), moved: true };
      }
      suppressTap = true;
      for (const id of touches.keys()) stage.setPointerCapture(id);
      event.stopPropagation();
      return;
    }
  }
  const targetBtn = event.target.closest("button");
  const idleModelBtn = targetBtn?.classList.contains("scene-model-piece") && targetBtn.dataset.editing !== "true";
  const hitModelId = (!targetBtn || idleModelBtn) && scene?.pickModel ? scene.pickModel(event.clientX, event.clientY) : null;
  const hitActor = hitModelId ? actors.get(hitModelId) : null;
  if (hitActor && hitActor.button !== targetBtn && !drag && !gesture) {
    orbitCandidate = { id: event.pointerId, ...point, yaw, tilt, center, record: hitActor.record, button: hitActor.button };
    hitActor.button.dataset.pressing = "true";
    clearTimeout(actorLongPressTimer);
    actorLongPressTimer = setTimeout(() => {
      delete hitActor.button.dataset.pressing;
      if (orbitCandidate?.id !== event.pointerId || busy || drag || gesture?.moved) return;
      orbitCandidate = null;
      navigator.vibrate?.(12);
      select(hitActor.record);
      const dragPoint = pick(point.x, point.y, hitActor.record.surface || "paper");
      if (!dragPoint) return;
      drag = { id: event.pointerId, record: hitActor.record, button: hitActor.button, point: dragPoint, x: hitActor.record.x, y: hitActor.record.y, startX: point.x, startY: point.y, moved: false, accepted: false };
      trashZone.hidden = false;
      try { hitActor.button.setPointerCapture(event.pointerId); } catch {}
    }, LONG_PRESS_MS);
    if (idleModelBtn) event.stopPropagation();
    return;
  }
  if (idleModelBtn) {
    orbitCandidate = { id: event.pointerId, ...point, yaw, tilt, center, button: targetBtn };
    return;
  }
  if (drag || gesture || targetBtn) return;
  gesture = { id: event.pointerId, ...point, yaw, tilt, center, moved: false };
  stage.setPointerCapture(event.pointerId);
}, true);

stage.addEventListener("pointermove", event => {
  if (busy) return;
  if (touches.has(event.pointerId)) touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (orbitCandidate?.id === event.pointerId && !gesture && !drag) {
    const odx = event.clientX - orbitCandidate.x, ody = event.clientY - orbitCandidate.y;
    if (Math.hypot(odx, ody) >= 8) {
      clearTimeout(actorLongPressTimer);
      if (orbitCandidate.button) delete orbitCandidate.button.dataset.pressing;
      gesture = { id: orbitCandidate.id, x: orbitCandidate.x, y: orbitCandidate.y, yaw: orbitCandidate.yaw, tilt: orbitCandidate.tilt, center: orbitCandidate.center, moved: true };
      orbitCandidate = null;
      pauseAmbient();
      try { stage.setPointerCapture(event.pointerId); } catch {}
    }
  }
  if (gesture?.pinch && touches.size === 2) {
    const next = pinchMetrics();
    if (gesture.piece) {
      const nextScale = clamp(gesture.scale * next.distance / gesture.pinch.distance, .12, 1.8);
      const nextRotation = normalizeDeg(gesture.rotation + (next.angle - gesture.pinch.angle));
      if (placeChange(gesture.piece, { scale: nextScale, rotation: nextRotation })) {
        el("desk-size").value = Math.round(gesture.piece.scale * 100);
        el("desk-rotation").value = gesture.piece.rotation || 0;
        sync();
      }
      return;
    }
    zoomAt(clamp(gesture.zoom * next.distance / gesture.pinch.distance, .5, 2.25), gesture.anchor, next);
    return;
  }
  if (gesture?.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
  if (Math.hypot(dx, dy) > 5) {
    gesture.moved = true;
    pauseAmbient();
  }
  if (!gesture.moved) return;
  stage.dataset.orbiting = "true";
  if (scene) {
    setView(gesture.yaw - dx * .23, gesture.tilt + dy * .20);
    camTarget.yaw = yaw;
    camTarget.tilt = tilt;
    if (focusedSpiritId) layout(true);
  } else {
    moveCenter(gesture.center, dx, dy, zoom);
    camTarget.x = center.x;
    camTarget.y = center.y;
    setView();
  }
});
function endGesture(event) {
  touches.delete(event.pointerId);
  if (orbitCandidate?.id === event.pointerId) {
    clearTimeout(actorLongPressTimer);
    if (orbitCandidate.button) delete orbitCandidate.button.dataset.pressing;
    orbitCandidate = null;
    return;
  }
  if (gesture?.pinch) {
    if (!touches.size) {
      if (gesture.piece) changed(gesture.piece);
      gesture = undefined;
    }
    return;
  }
  if (gesture?.id !== event.pointerId) return;
  const tapped = event.type === "pointerup" && !gesture.moved;
  gesture = undefined;
  delete stage.dataset.orbiting;
  if (tapped) {
    if (selected) select(undefined);
    else if (focusedSpiritId) closeSpiritHud();
  }
}
stage.addEventListener("pointerup", endGesture);
stage.addEventListener("pointercancel", endGesture);
stage.addEventListener("lostpointercapture", event => {
  if (event.target === stage) endGesture(event);
});
stage.addEventListener("click", event => {
  if (suppressTap && event.pointerType === "touch") event.stopPropagation();
}, true);
new ResizeObserver(layout).observe(stage);

function fallback() {
  stopIdleFloat();
  stopCamFollow();
  scene = undefined;
  stage.dataset.mode = "flat";
  el("reset-view").hidden = false;
  setView(yaw, tilt);
}
statusLine();
showWorld();
stage.dataset.mode = "loading";
try {
  const { createScene } = await import("./book-scene.mjs");
  void document.fonts.load("24px Xiaolai", "Can-mie-rua拾光立体书暖窗书房雨后花园月光车站").catch(() => {});
  scene = createScene(stage, layout, fallback);
  if (scene) {
    stage.dataset.mode = "3d";
    el("reset-view").hidden = false;
    scene.setWorld(world().id);
    if (open) {
      zoom = 1;
      setView(0, 0);
      scene.pose({ opening: 1, standing: 1 });
      sync();
    } else {
      zoom = motion.matches ? 1 : HERO_CLOSED_VIEW.zoom;
      setView(motion.matches ? 0 : HERO_CLOSED_VIEW.yaw, motion.matches ? 0 : HERO_CLOSED_VIEW.tilt);
      scene.pose({ opening: 0, standing: 0 });
      startIdleFloat();
    }
  } else {
    fallback();
  }
} catch {
  fallback();
}


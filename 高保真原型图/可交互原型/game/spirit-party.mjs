import { selectDialogueLine, primaryTrait } from "./spirit-dialogue.mjs";

const PRESET_FRIENDS = [
  {
    code: "TL-GARDEN-01",
    hostName: "林小满",
    worldId: "garden",
    note: "刚摆好雨后青苔和小盆栽，欢迎来躲雨喝茶！",
    props: [
      { id: "friend-p1", stickerId: "starter-leaf", purpose: "plant", x: 0.52, y: 0.56, scale: 0.32, rotation: 0, surface: "paper", expression: "smile" },
      { id: "friend-p2", stickerId: "starter-berry", purpose: "food", x: 0.58, y: 0.58, scale: 0.28, rotation: 0, surface: "paper", expression: "none" }
    ]
  },
  {
    code: "TL-STATION-02",
    hostName: "苏砚",
    worldId: "station",
    note: "月光车站有夜班小灯和风筝，随时欢迎串门。",
    props: [
      { id: "friend-p3", stickerId: "starter-kite", purpose: "toy", x: 0.51, y: 0.56, scale: 0.31, rotation: -8, surface: "paper", expression: "surprise" },
      { id: "friend-p4", stickerId: "starter-screen", purpose: "backdrop", x: 0.58, y: 0.55, scale: 0.34, rotation: 0, surface: "paper", expression: "none" }
    ]
  }
];

function encodeSnapshot(snapshot) {
  const json = JSON.stringify(snapshot);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return "TLPARTY:" + btoa(bin);
}

function decodeSnapshot(code) {
  const trimmed = String(code || "").trim();
  const preset = PRESET_FRIENDS.find(item => item.code.toUpperCase() === trimmed.toUpperCase());
  if (preset) return preset;
  if (!trimmed.startsWith("TLPARTY:")) return null;
  try {
    const b64 = trimmed.slice(8);
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed.worldId !== "string" || !Array.isArray(parsed.props)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function renderPartyPostcard({ chapterName, spirits, props, hostName, isVisitor }) {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f6ead1";
  ctx.fillRect(0, 0, 720, 480);
  ctx.strokeStyle = "#8a6242";
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, 684, 444);
  ctx.strokeStyle = "#c9a578";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(28, 28, 664, 424);
  ctx.setLineDash([]);

  // Header
  ctx.fillStyle = "#4d3221";
  ctx.font = "bold 28px Xiaolai, serif";
  ctx.fillText(`TimeLight · ${chapterName}茶话会`, 48, 76);

  ctx.fillStyle = "#7c583c";
  ctx.font = "18px Xiaolai, sans-serif";
  const dateStr = new Date().toLocaleDateString("zh-CN");
  ctx.fillText(`${isVisitor ? `串门房主：${hostName}` : "我的立体书茶话会"} · ${dateStr}`, 48, 110);

  // Stamp
  ctx.save();
  ctx.translate(616, 86);
  ctx.rotate(-0.14);
  ctx.strokeStyle = "#944834";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#944834";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TIMELIGHT", 0, -4);
  ctx.fillText("PARTY", 0, 16);
  ctx.restore();

  // Stage card area
  ctx.fillStyle = "#efe0be";
  ctx.fillRect(48, 134, 624, 210);
  ctx.strokeStyle = "#b89066";
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 134, 624, 210);

  const count = Math.max(1, Math.min(4, spirits.length));
  const step = 624 / (count + 1);
  spirits.slice(0, 4).forEach((spirit, idx) => {
    const cx = 48 + step * (idx + 1);
    const cy = 232;
    if (spirit.asset?.image) {
      const ratio = spirit.asset.ratio || 1;
      const h = 110;
      const w = h * ratio;
      ctx.drawImage(spirit.asset.image, cx - w / 2, cy - h / 2 - 10, w, h);
    } else {
      ctx.fillStyle = "#c98553";
      ctx.beginPath();
      ctx.arc(cx, cy - 10, 34, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#4d3221";
    ctx.font = "18px Xiaolai, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(spirit.name, cx, 322);
  });

  // Props & footer caption
  ctx.textAlign = "left";
  ctx.fillStyle = "#5a402c";
  ctx.font = "17px Xiaolai, sans-serif";
  const propNames = props.map(p => p.asset?.name).filter(Boolean).slice(0, 4);
  const propLabel = propNames.length ? `茶话会摆件：${propNames.join("、")}` : "茶话会摆件：纸艺微缩茶席";
  ctx.fillText(propLabel, 48, 382);

  const spiritNames = spirits.map(s => s.name).join("、") || "小精灵";
  ctx.fillStyle = "#7a583f";
  ctx.font = "16px Xiaolai, sans-serif";
  ctx.fillText(`同行伙伴：${spiritNames} · 留下一段温柔的折纸记忆`, 48, 418);

  return canvas;
}

export function createPartyController(hooks) {
  let active = false;
  let visitorSession = null; // null | { hostName, worldId, note, props }
  let treasureState = { active: false, found: new Set(), spots: [] };

  function isVisitorMode() {
    return Boolean(visitorSession);
  }

  function getVisitorSession() {
    return visitorSession;
  }

  function isPartyActive() {
    return active || Boolean(visitorSession);
  }

  function exportHostInviteCode() {
    const world = hooks.getWorld();
    const shown = hooks.getShown();
    const snapshot = {
      hostName: "拾光旅人",
      worldId: world.id,
      note: `欢迎来到我的「${world.name}」茶话会！`,
      props: shown.map(p => ({
        id: p.id,
        stickerId: p.stickerId.startsWith("starter-") || p.stickerId.startsWith("ecology-") ? p.stickerId : "starter-kite",
        purpose: p.purpose || "toy",
        x: Number(p.x.toFixed(3)),
        y: Number(p.y.toFixed(3)),
        scale: Number(p.scale.toFixed(2)),
        rotation: Math.round(p.rotation || 0),
        surface: p.surface || "paper",
        expression: p.expression || "none"
      }))
    };
    return encodeSnapshot(snapshot);
  }

  async function enterVisitorMode(codeInput) {
    const parsed = decodeSnapshot(codeInput);
    if (!parsed) return { ok: false, error: "邀请码无效，请核对后重试（也可直接选择下方好友书页）。" };
    visitorSession = parsed;
    active = true;
    await hooks.applyVisitorWorld(parsed);
    return { ok: true, session: parsed };
  }

  async function exitVisitorMode() {
    visitorSession = null;
    active = false;
    treasureState = { active: false, found: new Set(), spots: [] };
    await hooks.restoreHostWorld();
  }

  function startTreasureHunt() {
    const spots = [
      { id: "gift-1", label: "折页纸鹤", x: 0.22, y: 0.44, icon: "🎁" },
      { id: "gift-2", label: "亮片书签", x: 0.74, y: 0.39, icon: "🎀" },
      { id: "gift-3", label: "蜂蜜糖纸", x: 0.52, y: 0.74, icon: "🍬" }
    ];
    treasureState = { active: true, found: new Set(), spots };
    return treasureState;
  }

  function collectTreasure(spotId) {
    if (!treasureState.active) return null;
    treasureState.found.add(spotId);
    const done = treasureState.found.size >= treasureState.spots.length;
    if (done) treasureState.active = false;
    return { foundCount: treasureState.found.size, total: treasureState.spots.length, done };
  }

  function getTreasureState() {
    return treasureState;
  }

  function getPartyLine(subType, spirit, context) {
    const book = hooks.getBook();
    return selectDialogueLine(book, spirit, {
      module: "聊聊与朋友聚会",
      sub: subType
    }, context);
  }

  function addGuestNote(spiritName, text) {
    const book = hooks.getBook();
    book.dialogueState ||= { seenNodes: [], recentLines: {}, guestNotes: [] };
    book.dialogueState.guestNotes ||= [];
    book.dialogueState.guestNotes.unshift({
      id: Date.now().toString(36),
      chapter: hooks.getWorld().name,
      spiritName,
      text: text.trim().slice(0, 80),
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      fromVisitor: isVisitorMode()
    });
    if (book.dialogueState.guestNotes.length > 20) book.dialogueState.guestNotes.length = 20;
    if (!isVisitorMode()) hooks.persist();
    return book.dialogueState.guestNotes;
  }

  function getPresetFriends() {
    return PRESET_FRIENDS;
  }

  function setLocalParty(enabled) {
    active = Boolean(enabled);
  }

  return {
    isPartyActive,
    isVisitorMode,
    getVisitorSession,
    setLocalParty,
    exportHostInviteCode,
    enterVisitorMode,
    exitVisitorMode,
    startTreasureHunt,
    collectTreasure,
    getTreasureState,
    getPartyLine,
    addGuestNote,
    getPresetFriends,
    primaryTrait
  };
}

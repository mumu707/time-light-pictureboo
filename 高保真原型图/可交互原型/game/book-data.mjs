
export const worlds = [
  { id: "study", name: "暖窗书房", color: "#c68a55", paper: "#edcfa0", dark: "#763d31", symbol: "☀" },
  { id: "garden", name: "雨后花园", color: "#8aaf8b", paper: "#c9dab0", dark: "#36584a", symbol: "❧" },
  { id: "station", name: "月光车站", color: "#8d9cd7", paper: "#bcc3dd", dark: "#424d7a", symbol: "☾" },
  { id: "creek", name: "苔石溪谷", color: "#689b94", paper: "#d9dfae", dark: "#365f51", symbol: "⛵", game: "溪流纸舟", prize: "溪谷纸舟", purpose: "toy" },
  { id: "marsh", name: "萤火湿地", color: "#799574", paper: "#bacfa5", dark: "#355851", symbol: "✦", game: "萤火连线", prize: "芦苇灯景", purpose: "backdrop" },
  { id: "ridge", name: "风铃高原", color: "#b19b6f", paper: "#eee0ab", dark: "#765d45", symbol: "♫", game: "风铃复奏", prize: "高原风铃", purpose: "toy" },
  { id: "coast", name: "星潮海岸", color: "#7a9eb8", paper: "#f0d6ad", dark: "#405b76", symbol: "◈", game: "潮汐拾贝", prize: "潮池贝壳景", purpose: "backdrop" }
];
export const expressions = { none: "无表情", smile: "微笑", surprise: "惊讶", angry: "生气" };
export const faces = { none: "", smile: "◡", surprise: "○", angry: "︿" };
const categories = ["动物", "植物", "食物", "器物", "建筑", "其他"];
const key = "shiguang-popup-book-v1";
export const neighbors = {
  "paper-moth": { name: "灯绒", category: "动物", home: "study", color: "#db956d", pale: "#f5c98a" },
  "paper-sprout": { name: "雨芽", category: "植物", home: "garden", color: "#62957b", pale: "#bad18f" },
  "paper-star": { name: "星邮", category: "器物", home: "station", color: "#ce9566", pale: "#f7d99b" },
  "paper-otter": { name: "石獭", category: "动物", home: "creek", color: "#a17459", pale: "#e4c09b" },
  "paper-glow": { name: "点灯", category: "动物", home: "marsh", color: "#83a278", pale: "#e1dd88" },
  "paper-kite": { name: "小岚", category: "器物", home: "ridge", color: "#b87865", pale: "#efd29f" },
  "paper-shell": { name: "潮音", category: "动物", home: "coast", color: "#a8768d", pale: "#f0c4b6" }
};
export const satisfaction = book => Object.values(book.fulfilled || {}).reduce((sum, types) => sum + new Set(types).size, 0);
export const legacyKey = "shiguang-sticker-desk-v1";
export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const uid = () => globalThis.crypto.randomUUID?.() ?? [...globalThis.crypto.getRandomValues(new Uint32Array(4))].join("-");

export function loadBook(storage) {
  const companions = Object.entries(neighbors).map(([stickerId, entry]) => ({
    ...createSpirit({ stickerId, ...entry }, entry.home), builtin: true
  }));
  const book = {
    page: 0,
    decorations: Object.fromEntries(worlds.map(({ id }) => [id, []])),
    sceneModels: {},
    spirits: companions,
    dialogueState: { seenNodes: [], recentLines: {}, guestNotes: [] }
  };
  const saved = storage.getItem(key);
  if (saved !== null) {
    const data = JSON.parse(saved);
    if (!data || !Number.isInteger(data.page) || !worlds[data.page] || !Array.isArray(data.spirits) ||
        !worlds.slice(0, 3).every(({ id }) => Array.isArray(data.decorations?.[id]))) throw new Error("无效书本");
    const newCompanions = companions.filter(companion => !data.spirits.some(spirit => spirit.id === companion.id));
    data.spirits.push(...newCompanions);
    let migrated = newCompanions.length > 0;
    if (!data.dialogueState || typeof data.dialogueState !== "object") {
      data.dialogueState = { seenNodes: [], recentLines: {}, guestNotes: [] };
    } else {
      if (!Array.isArray(data.dialogueState.seenNodes)) data.dialogueState.seenNodes = [];
      if (!data.dialogueState.recentLines || typeof data.dialogueState.recentLines !== "object") data.dialogueState.recentLines = {};
      if (!Array.isArray(data.dialogueState.guestNotes)) data.dialogueState.guestNotes = [];
    }
    for (const { id } of worlds) if (!Array.isArray(data.decorations[id])) {
      data.decorations[id] = [];
      migrated = true;
    }
    if (!data.sceneModels || typeof data.sceneModels !== "object") data.sceneModels = {};
    for (const pieces of Object.values(data.decorations)) for (const piece of pieces) {
      if (Number.isFinite(piece.rotation)) continue;
      piece.rotation = 0;
      migrated = true;
    }
    return { book: data, migrated };
  }
  const legacy = storage.getItem(legacyKey);
  if (legacy === null) return { book, migrated: false };
  const records = JSON.parse(legacy);
  if (!Array.isArray(records)) throw new Error("无效贴纸桌");
  book.decorations.study = records.filter(record => typeof record?.stickerId === "string" &&
    [record.x, record.y, record.scale].every(Number.isFinite)).map(record => ({
    id: uid(), stickerId: record.stickerId, x: clamp(record.x), y: clamp(record.y),
    scale: clamp(record.scale, .12, .65), surface: "paper", expression: "none", rotation: 0
  }));
  return { book, migrated: true };
}

export function saveBook(storage, book) {
  storage.setItem(key, JSON.stringify(book));
}

const extendedCategoryBase = {
  花卉: "植物",
  饮品: "食物",
  甜点: "食物",
  文具: "器物",
  家具: "建筑",
  灯饰: "器物",
  玩具: "器物",
  手作: "器物",
  乐器: "器物",
  复古: "器物"
};

export function createSpirit(entry, home) {
  let seed = 2166136261;
  for (const character of entry.stickerId) seed = Math.imul(seed ^ character.codePointAt(0), 16777619);
  const rawCategory = extendedCategoryBase[entry.category] || entry.category;
  const category = categories.includes(rawCategory) ? rawCategory : "其他";
  seed = Math.imul(seed ^ (categories.indexOf(category) + 1), 16777619) >>> 0;
  let state = seed;
  const roll = length => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor(state / 4294967296 * length);
  };
  const likeObject = categories[(categories.indexOf(category) + roll(2)) % categories.length];
  const others = categories.filter(value => value !== likeObject);
  const moods = Object.keys(expressions).filter(value => value !== "none");
  const [likeFace] = moods.splice(roll(moods.length), 1);
  return {
    id: entry.stickerId, stickerId: entry.stickerId, name: entry.name, category, home, seed,
    traits: { 好奇: 25 + roll(76), 活跃: 25 + roll(76), 敏感: 25 + roll(76) },
    preferences: { object: { like: likeObject, avoid: others[roll(others.length)] },
      face: { like: likeFace, avoid: moods[roll(moods.length)] } },
    discoveries: []
  };
}

export function reactionFor(spirit, category, expression) {
  const values = [["object", category], ["face", expression]];
  for (const [kind, value] of values) {
    const sentiment = ["like", "avoid"].find(label => spirit.preferences[kind][label] === value);
    if (sentiment) return { kind, value, sentiment };
  }
  return { sentiment: "neutral" };
}


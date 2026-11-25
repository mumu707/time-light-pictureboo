import { PAPER_MODELS } from "./paper-models.mjs";
import { primaryTrait } from "./spirit-dialogue.mjs";

export const LEVEL_THRESHOLDS = [0, 100, 220, 380, 580, 820, 1100, 1450, 1850, 2400];

export const LEVEL_UNLOCK_LABELS = [
  "基础散步、聊天与偏好提示",
  "解锁第 1 篇成长手账 · 赠 1 颗灵感星",
  "伴游小游戏性格天赋 Lv.1 · 挂机上限 6 小时",
  "解锁专属头饰栏与首款小草帽",
  "解锁第 2 篇成长手账 · 采风额外带回零食",
  "伴游小游戏性格天赋 Lv.2 · 挂机上限 8 小时",
  "解锁 3D 脚下暖光光环",
  "解锁第 3 篇成长手账 · 主动点评新家具",
  "挂机上限 12 小时 · 采风稀有道具券概率提升",
  "满级挚友徽章 · 终章纪念页与星冠头饰"
];

export const COLLECTION_MILESTONES = [
  { count: 10, bonus: 0.10, title: "微缩起步" },
  { count: 25, bonus: 0.20, title: "暖光装潢师" },
  { count: 50, bonus: 0.35, title: "立体书建筑家" },
  { count: 75, bonus: 0.50, title: "拾光收藏大师" },
  { count: 100, bonus: 0.80, title: "万物有灵缔造者" }
];

export const SNACK_CATALOG = [
  { id: "berry_jelly", name: "莓果冻", icon: "🍓", price: 25, hunger: 22, mood: 8, xp: 18, prefCategory: "食物" },
  { id: "honey_toast", name: "蜂蜜吐司", icon: "🍯", price: 35, hunger: 32, mood: 10, xp: 24, prefCategory: "食物" },
  { id: "hot_cocoa", name: "热可可", icon: "☕", price: 40, hunger: 16, mood: 18, energy: 25, xp: 26, prefCategory: "器物" },
  { id: "pinecone_cookie", name: "松果曲奇", icon: "🍪", price: 30, hunger: 25, mood: 12, xp: 22, prefCategory: "植物" },
  { id: "star_candy", name: "星光棉花糖", icon: "🍬", price: 0, starPrice: 1, hunger: 20, mood: 30, energy: 30, xp: 55, prefCategory: "其他" }
];

export const HAT_CATALOG = [
  { id: "straw_hat", name: "小草帽", icon: "👒", minLevel: 4, starPrice: 0 },
  { id: "beret", name: "画家贝雷帽", icon: "🎨", minLevel: 4, starPrice: 3 },
  { id: "flower_crown", name: "花瓣花环", icon: "🌼", minLevel: 5, starPrice: 4 },
  { id: "star_crown", name: "星冠头饰", icon: "👑", minLevel: 10, starPrice: 0 }
];

export const EXPEDITION_TIERS = [
  { id: "short", name: "短途散步", durationMs: 15 * 60 * 1000, energyCost: 15, coins: [45, 75], snackChance: 0.45, voucherChance: 0.25 },
  { id: "medium", name: "午后探险", durationMs: 60 * 60 * 1000, energyCost: 30, coins: [120, 185], snackChance: 0.85, voucherChance: 0.6 },
  { id: "long", name: "远行采集", durationMs: 4 * 60 * 60 * 1000, energyCost: 50, coins: [320, 460], snackChance: 1.0, voucherChance: 1.0 }
];

export const MINIGAME_CATALOG = [
  { id: "screw_jam", chapter: "study", name: "书桌拆螺丝", tag: "拧螺丝解压", icon: "🔩", ref: "打螺丝", rewardModel: "writing_desk", milestoneLabel: "通关第 2 关", desc: "拧走彩色螺丝让亚克力纸板啪嗒坠落，留心 5 个临时孔别堵死！" },
  { id: "cozy_tidy", chapter: "study", name: "强迫症收纳盒", tag: "磁吸收纳", icon: "📦", ref: "收纳物语", rewardModel: "apothecary_chest", milestoneLabel: "通关第 2 关", desc: "将杂乱相机与手账物件旋转归位，放对瞬间咔哒磁吸。" },
  { id: "meme_spot", chapter: "study", name: "书房脑洞找茬", tag: "热梗找不同", icon: "🔍", ref: "疯狂梗传", rewardModel: "grandfather_clock", milestoneLabel: "找齐 2 关全部离谱梗", desc: "在复古手绘书房里揪出 10 处离谱穿越梗，笑出声！" },
  { id: "catch_goose", chapter: "garden", name: "抓大鹅·大杂烩", tag: "3D物理翻找", icon: "🦢", ref: "抓大鹅", rewardModel: "wooden_swing", milestoneLabel: "抓到第 2 关大白鹅", desc: "在满盆堆叠杂物里凑 3 消，狂晃大盆把底下大鹅震出来！" },
  { id: "hexa_sort", chapter: "garden", name: "六边形叠叠消", tag: "飞叠解压", icon: "⬡", ref: "Hexa Sort", rewardModel: "flower_stand", milestoneLabel: "单局消满 60 片", desc: "放上六边形纸片摞，同色哗啦啦自动空翻叠满 10 片炸消。" },
  { id: "save_spirit", chapter: "garden", name: "画线救小精灵", tag: "物理护盾", icon: "🐝", ref: "划线救狗头", rewardModel: "story_tent", milestoneLabel: "闯过第 2 关", desc: "一笔画下实体木炭护盾墙，顶住纸蜂群疯狂撞击 6 秒！" },
  { id: "jump_hop", chapter: "station", name: "拾光跳一跳", tag: "蓄力连击", icon: "🦘", ref: "微信跳一跳", rewardModel: "street_post_lamp", milestoneLabel: "单局达到 80 分", desc: "长按蓄力松手跃迁，连踩中心靶心分数翻倍停不下来。" },
  { id: "car_jam", chapter: "station", name: "车站挪车大堵车", tag: "颜色接人", icon: "🚌", ref: "挪车大逃亡", rewardModel: "retro_fridge", milestoneLabel: "通关第 2 关", desc: "按排队小精灵颜色挪出没被挡住的小巴士，4 个车位紧到冒汗。" },
  { id: "tap_away", chapter: "station", name: "箭头拆积木", tag: "剥洋葱拆块", icon: "➡️", ref: "Tap Away", rewardModel: "vinyl_cabinet", milestoneLabel: "通关第 2 关", desc: "点击前方畅通的箭头木块咻地飞走，一层层把大积木剥空！" },
  { id: "sheep_match", chapter: "creek", name: "纸牌叠叠消", tag: "7格压牌3消", icon: "🐑", ref: "羊了个羊", rewardModel: "dessert_vitrine", milestoneLabel: "通关第 2 关", desc: "经典多层压牌 7 格槽 3 消，第 1 关秒过第 2 关魔性上头！" },
  { id: "fishing_king", chapter: "creek", name: "溪谷爆钓拉扯王", tag: "张力刺鱼", icon: "🎣", ref: "欢乐钓鱼大师", rewardModel: "koi_basin", milestoneLabel: "钓起传说鱼王", desc: "稳住金色暴击张力条疯狂拉扯刺鱼，把溪谷巨型鱼王扯上岸！" },
  { id: "water_sort", chapter: "creek", name: "花茶倒水排序", tag: "分色倒茶", icon: "🧪", ref: "倒水大师", rewardModel: "tea_trolley", milestoneLabel: "通关第 2 关", desc: "把彩色花茶互相倾倒凑满整瓶盖木塞，停不下来的强迫症解谜。" },
  { id: "bullet_rogue", chapter: "marsh", name: "萤火弹幕肉鸽", tag: "三选一割草", icon: "✨", ref: "向僵尸开炮", rewardModel: "firefly_jar_rack", milestoneLabel: "守住第 2 关 Boss", desc: "波次来袭升级三选一分裂/穿透/冰冻词条，两分钟满屏弹幕清怪！" },
  { id: "backpack_brawl", chapter: "marsh", name: "背包合成大乱斗", tag: "格子合神装", icon: "🎒", ref: "背包乱斗", rewardModel: "warm_fireplace", milestoneLabel: "取得 4 轮连胜", desc: "有限格子塞木剑魔杖辣椒瓶，两件合成高阶自动数值碾压！" },
  { id: "black_hole", chapter: "marsh", name: "黑洞书桌大吞噬", tag: "从小吞到大", icon: "🕳️", ref: "黑洞大作战", rewardModel: "paper_cloud_lamp", milestoneLabel: "吞噬度达 80%", desc: "从小纽扣铅笔一路吞到整排书架和邮亭，洞口越变越大超解压！" },
  { id: "gate_runner", chapter: "ridge", name: "数字门兵团冲锋", tag: "蓝红门跑酷", icon: "🚪", ref: "兵团冲冲冲", rewardModel: "hammock_frame", milestoneLabel: "撞碎第 2 关 Boss", desc: "左右闪选 +15 / ×2 蓝门，带百只迷你纸精灵撞碎终点大 Boss！" },
  { id: "goods_sort", chapter: "ridge", name: "货架整理三消", tag: "暗格补货消", icon: "🛒", ref: "Goods Sort", rewardModel: "low_sideboard", milestoneLabel: "通关第 2 关", desc: "多层木货柜左右拖拽凑 3 消，后排暗格商品实时顶上连环爆。" },
  { id: "coffee_pack", chapter: "ridge", name: "礼盒打包流水线", tag: "满6自动飞箱", icon: "🎁", ref: "Coffee Pack", rewardModel: "upright_piano", milestoneLabel: "单局打包 10 盒", desc: "放上半满点心盒，相邻同口味自动飞过去凑满 6 颗封箱飞走！" },
  { id: "coin_pusher", chapter: "coast", name: "星潮欢乐推币机", tag: "金币瀑布", icon: "🪙", ref: "欢乐推币机", rewardModel: "paper_chime_arch", milestoneLabel: "推落 2 个大礼盒", desc: "精准投币看推板把满台金币礼盒哗啦推下悬崖，触发金币雨！" },
  { id: "sum_ten", chapter: "coast", name: "凑十框框消", tag: "矩形凑10", icon: "🔟", ref: "Sum 10", rewardModel: "birdbath_fountain", milestoneLabel: "单局消除 45 块", desc: "手指拉框内数字之和等于 10 整片炸消，越玩越停不下来！" }
];

const MILESTONE_MODEL_MAP = Object.fromEntries(MINIGAME_CATALOG.map(g => [g.rewardModel, g]));

// Deterministic pricing for all 100 batch:3 furniture models
export function getFurnitureMeta(modelId) {
  const spec = PAPER_MODELS[modelId];
  if (!spec || spec.batch !== 3) {
    return { isUniversal: false, tier: "landmark", coinPrice: 0, starPrice: 0, milestoneGame: null };
  }
  const milestoneGame = MILESTONE_MODEL_MAP[modelId] || null;
  if (milestoneGame) {
    return { isUniversal: true, tier: "milestone", coinPrice: 0, starPrice: 6, milestoneGame };
  }
  const area = (spec.size?.[0] || 1) * (spec.size?.[1] || 1);
  if (area >= 1.65 || spec.isLight && area >= 1.2) {
    const coinPrice = 420 + (Math.round(area * 100) % 5) * 60;
    return { isUniversal: true, tier: "collector", coinPrice, starPrice: Math.ceil(coinPrice / 70), milestoneGame: null };
  }
  if (area >= 0.95 || spec.isLight) {
    const coinPrice = 180 + (Math.round(area * 100) % 5) * 35;
    return { isUniversal: true, tier: "refined", coinPrice, starPrice: Math.ceil(coinPrice / 60), milestoneGame: null };
  }
  const coinPrice = 80 + (Math.round(area * 100) % 4) * 20;
  return { isUniversal: true, tier: "basic", coinPrice, starPrice: Math.ceil(coinPrice / 50), milestoneGame: null };
}

export const UNIVERSAL_FURNITURE_IDS = Object.entries(PAPER_MODELS)
  .filter(([, spec]) => spec.batch === 3)
  .map(([id]) => id);

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ensureProgression(book) {
  if (!book.progression || typeof book.progression !== "object") {
    book.progression = {};
  }
  const p = book.progression;
  if (!Number.isFinite(p.coins)) p.coins = 150;
  if (!Number.isFinite(p.stars)) p.stars = 2;
  if (!Array.isArray(p.unlockedFurniture)) p.unlockedFurniture = [];
  if (!p.snacks || typeof p.snacks !== "object") {
    p.snacks = { berry_jelly: 2, honey_toast: 1, hot_cocoa: 1, pinecone_cookie: 1, star_candy: 0 };
  }
  if (!Number.isFinite(p.vouchers)) p.vouchers = 2;
  if (!p.spiritCare || typeof p.spiritCare !== "object") p.spiritCare = {};
  if (!Number.isFinite(p.idleLastClaim)) p.idleLastClaim = Date.now();
  if (!Number.isFinite(p.blindBoxPulls)) p.blindBoxPulls = 0;
  if (!p.minigames || typeof p.minigames !== "object") {
    p.minigames = { bestScores: {}, clearedStages: {}, claimedMilestones: [], totalPlays: 0 };
  }
  p.minigames.bestScores ||= {};
  p.minigames.clearedStages ||= {};
  if (!Array.isArray(p.minigames.claimedMilestones)) p.minigames.claimedMilestones = [];
  if (!Number.isFinite(p.minigames.totalPlays)) p.minigames.totalPlays = 0;

  const today = todayKey();
  if (p.dailyDoubleDate !== today || !Array.isArray(p.dailyDoubleIds) || p.dailyDoubleIds.length !== 3) {
    let seed = 0;
    for (const ch of today) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const pool = MINIGAME_CATALOG.map(g => g.id);
    const chosen = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const idx = seed % pool.length;
      chosen.push(pool.splice(idx, 1)[0]);
    }
    p.dailyDoubleDate = today;
    p.dailyDoubleIds = chosen;
  }
  return p;
}

export function isFurnitureUnlocked(book, modelId) {
  const spec = PAPER_MODELS[modelId];
  if (!spec || spec.batch !== 3) return true;
  const p = ensureProgression(book);
  return p.unlockedFurniture.includes(modelId);
}

export function unlockFurniture(book, modelId) {
  const p = ensureProgression(book);
  if (PAPER_MODELS[modelId]?.batch !== 3) return false;
  if (p.unlockedFurniture.includes(modelId)) return false;
  p.unlockedFurniture.push(modelId);
  return true;
}

export function buyFurniture(book, modelId, useStars = false) {
  const p = ensureProgression(book);
  if (isFurnitureUnlocked(book, modelId)) return { ok: false, reason: "已拥有该家具" };
  const meta = getFurnitureMeta(modelId);
  if (useStars || meta.tier === "milestone") {
    if (p.stars < meta.starPrice) return { ok: false, reason: `灵感星不足（需要 ${meta.starPrice} 颗）` };
    p.stars -= meta.starPrice;
  } else {
    if (p.coins < meta.coinPrice) return { ok: false, reason: `拾光币不足（需要 ${meta.coinPrice} 枚）` };
    p.coins -= meta.coinPrice;
  }
  p.unlockedFurniture.push(modelId);
  return { ok: true, modelId };
}

export function pullBlindBox(book, count = 1) {
  const p = ensureProgression(book);
  const cost = count === 5 ? 700 : 150 * count;
  if (p.coins < cost) return { ok: false, reason: `拾光币不足（需要 ${cost} 枚）` };
  p.coins -= cost;
  const pool = UNIVERSAL_FURNITURE_IDS.filter(id => !MILESTONE_MODEL_MAP[id]);
  const results = [];
  let gotNew = false;
  for (let i = 0; i < count; i++) {
    p.blindBoxPulls += 1;
    const unowned = pool.filter(id => !p.unlockedFurniture.includes(id));
    const forceNew = (count === 5 && i === count - 1 && !gotNew && unowned.length > 0) || (unowned.length > 0 && Math.random() < 0.72);
    const picked = forceNew
      ? unowned[Math.floor(Math.random() * unowned.length)]
      : pool[Math.floor(Math.random() * pool.length)];
    const isNew = !p.unlockedFurniture.includes(picked);
    let refundStars = 0;
    if (isNew) {
      p.unlockedFurniture.push(picked);
      gotNew = true;
    } else {
      const tier = getFurnitureMeta(picked).tier;
      refundStars = tier === "collector" ? 5 : tier === "refined" ? 3 : 2;
      p.stars += refundStars;
    }
    results.push({ modelId: picked, name: PAPER_MODELS[picked].name, isNew, refundStars });
  }
  return { ok: true, results, cost };
}

export function buySnack(book, snackId) {
  const p = ensureProgression(book);
  const snack = SNACK_CATALOG.find(s => s.id === snackId);
  if (!snack) return { ok: false, reason: "未知零食" };
  if (snack.starPrice) {
    if (p.stars < snack.starPrice) return { ok: false, reason: `灵感星不足（需要 ${snack.starPrice} 颗）` };
    p.stars -= snack.starPrice;
  } else {
    if (p.coins < snack.price) return { ok: false, reason: `拾光币不足（需要 ${snack.price} 枚）` };
    p.coins -= snack.price;
  }
  p.snacks[snackId] = (p.snacks[snackId] || 0) + 1;
  return { ok: true, snack };
}

export function spiritLevelInfo(xp = 0) {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  const curBase = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextReq = LEVEL_THRESHOLDS[level] || curBase;
  const isMax = level >= LEVEL_THRESHOLDS.length;
  return {
    level,
    xp,
    curXp: xp - curBase,
    needXp: isMax ? 0 : nextReq - curBase,
    progress: isMax ? 1 : Math.min(1, (xp - curBase) / Math.max(1, nextReq - curBase)),
    isMax,
    maxIdleHours: level >= 9 ? 12 : level >= 6 ? 8 : level >= 3 ? 6 : 4
  };
}

export function getSpiritCare(book, spirit, now = Date.now()) {
  const p = ensureProgression(book);
  const id = typeof spirit === "string" ? spirit : spirit.id;
  if (!p.spiritCare[id]) {
    p.spiritCare[id] = {
      xp: 0,
      hunger: 86,
      mood: 88,
      energy: 100,
      lastTick: now,
      petDate: "",
      petCount: 0,
      hat: null,
      ownedHats: [],
      aura: false,
      expedition: null,
      journal: [{ date: todayKey(), text: `初次来到立体书，正好奇地打量四周。` }]
    };
  }
  const c = p.spiritCare[id];
  const elapsedHours = Math.max(0, (now - (c.lastTick || now)) / 3600000);
  if (elapsedHours >= 0.05) {
    c.hunger = Math.max(40, Math.round(c.hunger - elapsedHours * 4.5));
    c.mood = Math.max(40, Math.round(c.mood - elapsedHours * 3.5));
    c.energy = Math.min(100, Math.round(c.energy + elapsedHours * 18));
    c.lastTick = now;
  }
  c.ownedHats ||= [];
  c.journal ||= [];
  return c;
}

function applySpiritXp(book, spirit, care, amount) {
  const before = spiritLevelInfo(care.xp).level;
  care.xp += Math.max(0, Math.round(amount));
  const after = spiritLevelInfo(care.xp).level;
  const leveledUp = after > before;
  if (leveledUp) {
    const p = ensureProgression(book);
    for (let lv = before + 1; lv <= after; lv++) {
      p.stars += lv === 2 ? 1 : lv >= 8 ? 2 : 1;
      if (lv === 2) care.journal.unshift({ date: todayKey(), text: `羁绊升到 Lv.2！${spirit.name}悄悄记住你喜欢的角落。` });
      if (lv === 4 && !care.ownedHats.includes("straw_hat")) {
        care.ownedHats.push("straw_hat");
        care.hat ||= "straw_hat";
      }
      if (lv === 5) care.journal.unshift({ date: todayKey(), text: `羁绊升到 Lv.5！${spirit.name}在书页缝里藏了一颗亮晶晶的小星星送给你。` });
      if (lv === 7) care.aura = true;
      if (lv === 8) care.journal.unshift({ date: todayKey(), text: `羁绊升到 Lv.8！${spirit.name}现在能认出你亲手摆下的每件家具。` });
      if (lv === 10 && !care.ownedHats.includes("star_crown")) {
        care.ownedHats.push("star_crown");
        care.hat = "star_crown";
        care.journal.unshift({ date: todayKey(), text: `挚友满级 Lv.10！${spirit.name}戴上了星冠，约定陪你记录更多拾光。` });
      }
    }
  }
  return { leveledUp, level: after };
}

export function feedSpirit(book, spirit, snackId) {
  const p = ensureProgression(book);
  const snack = SNACK_CATALOG.find(s => s.id === snackId);
  if (!snack) return { ok: false, reason: "找不到该零食" };
  if ((p.snacks[snackId] || 0) <= 0) return { ok: false, reason: "零食库存不足，可先在小卖部购买" };
  p.snacks[snackId] -= 1;
  const care = getSpiritCare(book, spirit);
  const loved = spirit.preferences?.object?.like === snack.prefCategory || snack.id === "star_candy";
  const xpGain = Math.round(snack.xp * (loved ? 1.5 : 1));
  care.hunger = Math.min(100, care.hunger + (snack.hunger || 0));
  care.mood = Math.min(100, care.mood + (snack.mood || 0) + (loved ? 8 : 0));
  if (snack.energy) care.energy = Math.min(100, care.energy + snack.energy);
  const lv = applySpiritXp(book, spirit, care, xpGain);
  return { ok: true, loved, xpGain, ...lv };
}

export function petSpirit(book, spirit) {
  const care = getSpiritCare(book, spirit);
  const today = todayKey();
  if (care.petDate !== today) {
    care.petDate = today;
    care.petCount = 0;
  }
  care.petCount += 1;
  care.mood = Math.min(100, care.mood + 8);
  const xpGain = care.petCount <= 5 ? 12 : 0;
  const lv = xpGain ? applySpiritXp(book, spirit, care, xpGain) : { leveledUp: false, level: spiritLevelInfo(care.xp).level };
  return { ok: true, xpGain, remainingDaily: Math.max(0, 5 - care.petCount), ...lv };
}

export function startExpedition(book, spirit, tierId, chapterName) {
  const tier = EXPEDITION_TIERS.find(t => t.id === tierId);
  if (!tier) return { ok: false, reason: "无效采风方案" };
  const care = getSpiritCare(book, spirit);
  if (care.expedition) return { ok: false, reason: "正在采风途中" };
  if (care.energy < tier.energyCost) return { ok: false, reason: `精力不足（需要 ${tier.energyCost}）` };
  care.energy -= tier.energyCost;
  const now = Date.now();
  care.expedition = {
    tierId: tier.id,
    tierName: tier.name,
    chapterName: chapterName || "立体书远方",
    startedAt: now,
    endsAt: now + tier.durationMs
  };
  return { ok: true, expedition: care.expedition };
}

export function claimExpedition(book, spirit, forceComplete = false) {
  const p = ensureProgression(book);
  const care = getSpiritCare(book, spirit);
  const exp = care.expedition;
  if (!exp) return { ok: false, reason: "没有进行中的采风" };
  const now = Date.now();
  const done = forceComplete || now >= exp.endsAt;
  if (!done) return { ok: false, reason: "采风尚未归来", remainingMs: exp.endsAt - now };
  const tier = EXPEDITION_TIERS.find(t => t.id === exp.tierId) || EXPEDITION_TIERS[0];
  const lv = spiritLevelInfo(care.xp).level;
  const coins = Math.round((tier.coins[0] + Math.random() * (tier.coins[1] - tier.coins[0])) * (1 + lv * 0.04));
  p.coins += coins;
  const bonusSnack = (Math.random() < tier.snackChance || lv >= 5)
    ? SNACK_CATALOG[Math.floor(Math.random() * 4)]
    : null;
  if (bonusSnack) p.snacks[bonusSnack.id] = (p.snacks[bonusSnack.id] || 0) + 1;
  const gotVoucher = Math.random() < Math.min(1, tier.voucherChance + (lv >= 9 ? 0.25 : 0));
  if (gotVoucher) p.vouchers += 1;
  const postcard = `${spirit.name}在「${exp.chapterName}」${exp.tierName}，带回了 ${coins} 枚拾光币${bonusSnack ? `与${bonusSnack.name}` : ""}。`;
  care.journal.unshift({ date: todayKey(), text: postcard });
  if (care.journal.length > 24) care.journal.length = 24;
  care.expedition = null;
  const lvRes = applySpiritXp(book, spirit, care, tier.id === "long" ? 45 : tier.id === "medium" ? 26 : 15);
  return { ok: true, coins, snack: bonusSnack, gotVoucher, postcard, ...lvRes };
}

export function equipHat(book, spirit, hatId) {
  const p = ensureProgression(book);
  const care = getSpiritCare(book, spirit);
  if (!hatId) {
    care.hat = null;
    return { ok: true };
  }
  const hat = HAT_CATALOG.find(h => h.id === hatId);
  if (!hat) return { ok: false, reason: "未找到该头饰" };
  const lv = spiritLevelInfo(care.xp).level;
  if (lv < hat.minLevel) return { ok: false, reason: `需要羁绊 Lv.${hat.minLevel}` };
  if (!care.ownedHats.includes(hatId)) {
    if (p.stars < hat.starPrice) return { ok: false, reason: `灵感星不足（需要 ${hat.starPrice} 颗）` };
    p.stars -= hat.starPrice;
    care.ownedHats.push(hatId);
  }
  care.hat = hatId;
  return { ok: true, hat };
}

export function getCollectionBonus(book) {
  const p = ensureProgression(book);
  const count = p.unlockedFurniture.length;
  let bonus = 0;
  let title = "初心收藏家";
  for (const m of COLLECTION_MILESTONES) {
    if (count >= m.count) {
      bonus = m.bonus;
      title = m.title;
    }
  }
  return { count, total: UNIVERSAL_FURNITURE_IDS.length, bonus, title };
}

export function pendingIdleCoins(book, now = Date.now()) {
  const p = ensureProgression(book);
  const minutes = Math.max(0, (now - p.idleLastClaim) / 60000);
  if (minutes < 0.5) return 0;
  const spirits = book.spirits || [];
  let maxHours = 4;
  let ratePerMin = 0;
  for (const s of spirits) {
    const care = getSpiritCare(book, s, now);
    const avg = (care.hunger + care.mood + care.energy) / 3;
    const mult = avg >= 80 ? 1.5 : avg >= 60 ? 1.0 : 0.8;
    const info = spiritLevelInfo(care.xp);
    maxHours = Math.max(maxHours, info.maxIdleHours);
    ratePerMin += (0.55 + info.level * 0.08) * mult;
  }
  const clampedMin = Math.min(minutes, maxHours * 60);
  const coll = getCollectionBonus(book);
  return Math.floor(clampedMin * ratePerMin * (1 + coll.bonus));
}

export function claimIdleCoins(book, now = Date.now()) {
  const amount = pendingIdleCoins(book, now);
  const p = ensureProgression(book);
  if (amount > 0) {
    p.coins += amount;
    p.idleLastClaim = now;
  }
  return amount;
}

export function getCompanionPerk(spirit, book) {
  if (!spirit) return null;
  const trait = primaryTrait(spirit);
  const lv = book ? spiritLevelInfo(getSpiritCare(book, spirit).xp).level : 1;
  const tier = lv >= 6 ? 2 : lv >= 3 ? 1 : 0;
  if (trait === "好奇") {
    return { trait, tier, bonusHint: tier >= 2 ? 2 : 1, desc: tier ? `消除/找茬/拆块开局多送 ${tier >= 2 ? 2 : 1} 次免费提示` : "羁绊 Lv.3 解锁免费提示天赋" };
  }
  if (trait === "活跃") {
    return { trait, tier, scoreMult: tier >= 2 ? 1.18 : 1.10, desc: tier ? `动作/连击得分 +${tier >= 2 ? 18 : 10}%` : "羁绊 Lv.3 解锁连击加分天赋" };
  }
  return { trait, tier, forgiveMult: tier >= 2 ? 1.22 : 1.12, desc: tier ? `物理/时机判定容错更宽松` : "羁绊 Lv.3 解锁时机宽容天赋" };
}

export function recordMinigameResult(book, { gameId, score = 0, stageCleared = 0, milestoneReached = false, companionSpirit = null }) {
  const p = ensureProgression(book);
  const game = MINIGAME_CATALOG.find(g => g.id === gameId);
  const isDouble = p.dailyDoubleIds.includes(gameId);
  const perk = companionSpirit ? getCompanionPerk(companionSpirit, book) : null;
  const scoreMult = perk?.scoreMult && perk.tier > 0 ? perk.scoreMult : 1;
  const finalScore = Math.round(score * scoreMult);
  const prevBest = p.minigames.bestScores[gameId] || 0;
  const isRecord = finalScore > prevBest;
  if (isRecord) p.minigames.bestScores[gameId] = finalScore;
  if (stageCleared > (p.minigames.clearedStages[gameId] || 0)) {
    p.minigames.clearedStages[gameId] = stageCleared;
  }
  p.minigames.totalPlays += 1;

  const baseCoins = Math.max(18, Math.min(260, Math.round(18 + finalScore * 0.42 + stageCleared * 28)));
  const coinsEarned = isDouble ? baseCoins * 2 : baseCoins;
  p.coins += coinsEarned;

  let starsEarned = stageCleared >= 2 ? 2 : stageCleared >= 1 ? 1 : 0;
  let unlockedModel = null;
  if (milestoneReached && game?.rewardModel && !p.minigames.claimedMilestones.includes(gameId)) {
    p.minigames.claimedMilestones.push(gameId);
    starsEarned += 2;
    if (unlockFurniture(book, game.rewardModel)) {
      unlockedModel = { id: game.rewardModel, name: PAPER_MODELS[game.rewardModel]?.name || game.rewardModel };
    }
  }
  p.stars += starsEarned;

  // Chance to drop a snack
  let droppedSnack = null;
  if (stageCleared >= 1 || finalScore >= 60) {
    droppedSnack = SNACK_CATALOG[Math.floor(Math.random() * 4)];
    p.snacks[droppedSnack.id] = (p.snacks[droppedSnack.id] || 0) + 1;
  }

  let companionXp = 0;
  let companionLevelUp = false;
  if (companionSpirit) {
    const care = getSpiritCare(book, companionSpirit);
    care.mood = Math.min(100, care.mood + 10);
    companionXp = 22 + stageCleared * 12;
    const res = applySpiritXp(book, companionSpirit, care, companionXp);
    companionLevelUp = res.leveledUp;
  }

  return {
    gameId,
    finalScore,
    isRecord,
    isDouble,
    coinsEarned,
    starsEarned,
    unlockedModel,
    droppedSnack,
    companionXp,
    companionLevelUp
  };
}

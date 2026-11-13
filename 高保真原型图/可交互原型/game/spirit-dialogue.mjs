import { dialogueLines, dialogueScripts, fallbackLines } from "./spirit-dialogue-data.mjs";

const TRAIT_ORDER = ["好奇", "活跃", "敏感"];
const PURPOSE_TO_ZH = {
  backdrop: "背景",
  toy: "玩具",
  plant: "植物",
  food: "食物"
};
const WORLD_SCENE_OBJECTS = {
  study: ["window", "lantern"],
  garden: ["pond"],
  station: ["lantern"],
  creek: ["pond"],
  marsh: ["pond", "lantern"],
  ridge: ["chime"],
  coast: ["pond", "lantern"]
};
const STYLE_AFFINITY = {
  "好奇": {
    "敏感": ["偏光影对比", "偏敏感", "偏声音", "偏安静"],
    "活跃": ["偏路径探索", "偏结构观察", "偏结构", "偏探索"]
  },
  "活跃": {
    "好奇": ["偏探索", "偏路径探索", "偏结构"],
    "敏感": ["偏休息", "偏陪伴", "偏安静"]
  },
  "敏感": {
    "好奇": ["偏声音", "偏安静", "偏光影对比"],
    "活跃": ["偏陪伴", "偏边界确认", "偏休息"]
  }
};

export function primaryTrait(spirit) {
  const traits = spirit?.traits || {};
  let best = TRAIT_ORDER[0];
  let max = -Infinity;
  for (const name of TRAIT_ORDER) {
    const score = Number(traits[name] ?? 0);
    if (score > max) {
      max = score;
      best = name;
    }
  }
  return best;
}

export function secondaryTrait(spirit) {
  const primary = primaryTrait(spirit);
  const traits = spirit?.traits || {};
  let second = TRAIT_ORDER.find(name => name !== primary) || "好奇";
  let max = -Infinity;
  for (const name of TRAIT_ORDER) {
    if (name === primary) continue;
    const score = Number(traits[name] ?? 0);
    if (score > max) {
      max = score;
      second = name;
    }
  }
  return second;
}

function nextSeeded(spirit) {
  const base = (spirit.dialogueCursor ?? spirit.seed ?? 123456789) >>> 0;
  const next = (Math.imul(base, 1664525) + 1013904223) >>> 0;
  spirit.dialogueCursor = next;
  return next / 4294967296;
}

export function fillPlaceholders(template, context = {}) {
  let text = String(template || "");
  const chapterName = context.chapterName || "";
  const propName = context.propName || "";
  const spiritName = context.spiritName || "";
  if (text.includes("{摆件名}") && !propName) return null;
  if (text.includes("{章节名}") && !chapterName) return null;
  if (text.includes("{精灵名}") && !spiritName) return null;
  text = text.replace(/\{摆件名\}/g, propName)
    .replace(/\{章节名\}/g, chapterName)
    .replace(/\{精灵名\}/g, spiritName);
  return text;
}

function ensureDialogueState(book) {
  if (!book.dialogueState || typeof book.dialogueState !== "object") {
    book.dialogueState = { seenNodes: [], recentLines: {}, guestNotes: [] };
  }
  if (!Array.isArray(book.dialogueState.seenNodes)) book.dialogueState.seenNodes = [];
  if (!book.dialogueState.recentLines || typeof book.dialogueState.recentLines !== "object") {
    book.dialogueState.recentLines = {};
  }
  if (!Array.isArray(book.dialogueState.guestNotes)) book.dialogueState.guestNotes = [];
  return book.dialogueState;
}

export function recordRecentLine(book, spiritId, lineId) {
  if (!book || !spiritId || !lineId) return;
  const state = ensureDialogueState(book);
  const queue = state.recentLines[spiritId] ||= [];
  const existing = queue.indexOf(lineId);
  if (existing !== -1) queue.splice(existing, 1);
  queue.push(lineId);
  while (queue.length > 8) queue.shift();
}

export function markNodeSeen(book, nodeId) {
  if (!book || !nodeId) return;
  const state = ensureDialogueState(book);
  if (!state.seenNodes.includes(nodeId)) state.seenNodes.push(nodeId);
}

/**
 * 三级降级选句算法：
 * Tier 1: 严格匹配主性格、情境、触发子类、前置事实条件，排除最近8条，按子风格加权
 * Tier 2: 同情境 + 同主性格通用句（不依赖未出现摆件）
 * Tier 3: 全局无事实假设保底问候语
 */
export function selectDialogueLine(book, spirit, query = {}, context = {}) {
  const trait = primaryTrait(spirit);
  const subTrait = secondaryTrait(spirit);
  const state = ensureDialogueState(book);
  const recent = new Set(state.recentLines[spirit.id] || []);
  const affinities = STYLE_AFFINITY[trait]?.[subTrait] || [];

  const canRender = (row) => fillPlaceholders(row.text, context) !== null;

  const pickWeighted = (pool) => {
    if (!pool.length) return null;
    const preferred = pool.filter(row => affinities.some(tag => row.style.includes(tag)));
    const source = preferred.length && nextSeeded(spirit) < 0.72 ? preferred : pool;
    const chosen = source[Math.floor(nextSeeded(spirit) * source.length)];
    const rendered = fillPlaceholders(chosen.text, context);
    if (!rendered) return null;
    recordRecentLine(book, spirit.id, chosen.id);
    return { ...chosen, rendered };
  };

  // Tier 1: 精准匹配
  let tier1 = dialogueLines.filter(row => {
    if (row.trait !== trait) return false;
    if (query.module && row.module !== query.module) return false;
    if (query.scene && row.scene !== query.scene) return false;
    if (query.sub && row.sub !== query.sub) return false;
    if (recent.has(row.id)) return false;
    return canRender(row);
  });
  if (tier1.length) {
    const hit = pickWeighted(tier1);
    if (hit) return hit;
  }

  // Tier 2: 同情境兜底（放宽触发子类和最近8条限制）
  let tier2 = dialogueLines.filter(row => {
    if (row.trait !== trait) return false;
    if (query.scene && row.scene !== query.scene) return false;
    if (recent.has(row.id)) return false;
    return canRender(row);
  });
  if (!tier2.length) {
    tier2 = dialogueLines.filter(row => row.trait === trait && (!query.scene || row.scene === query.scene) && canRender(row));
  }
  if (tier2.length) {
    const hit = pickWeighted(tier2);
    if (hit) return hit;
  }

  // Tier 3: 全局保底
  return {
    id: `FALLBACK-${trait}`,
    trait,
    scene: query.scene || "兜底",
    rendered: fallbackLines[trait] || fallbackLines["好奇"]
  };
}

export function buildChatFlow(book, spirit, options) {
  const trait = primaryTrait(spirit);
  const subTrait = secondaryTrait(spirit);
  const { chapterId, chapterName, propName, wish, nearSceneObject } = options;
  const ctx = { chapterName, propName, spiritName: spirit.name };

  return {
    trait,
    subTrait,
    getGreeting() {
      const line = selectDialogueLine(book, spirit, {
        module: "基础情境环境对白",
        scene: "初见与重逢",
        sub: "首次/跨会话"
      }, ctx);
      return line.rendered;
    },
    getBranch(branchKey) {
      if (branchKey === "today") {
        const scriptPool = dialogueScripts.chatToday[trait] || [];
        const affinities = STYLE_AFFINITY[trait]?.[subTrait] || [];
        const matchedScript = scriptPool.find(s => affinities.some(a => a.includes(s.style) || s.style.includes(a))) || scriptPool[0];
        const line = selectDialogueLine(book, spirit, {
          module: "聊聊与朋友聚会",
          sub: "聊聊-今天怎么样"
        }, ctx);
        const useScript = matchedScript && !(book.dialogueState?.seenNodes || []).includes(matchedScript.id);
        if (useScript) {
          markNodeSeen(book, matchedScript.id);
          return {
            nodeId: matchedScript.id,
            reply: matchedScript.reply,
            followUpLabel: matchedScript.followUp,
            secondReply: matchedScript.secondReply
          };
        }
        const parsed = /^「([^」]+)」→(.+)$/.exec(line.options || "");
        markNodeSeen(book, line.id);
        return {
          nodeId: line.id,
          reply: line.rendered,
          followUpLabel: parsed ? parsed[1] : (matchedScript?.followUp || "再说说看"),
          secondReply: parsed ? parsed[2] : (matchedScript?.secondReply || "嗯，等会儿我们再一起慢慢逛。")
        };
      }

      if (branchKey === "wish") {
        const purpose = wish?.purpose || "toy";
        const purposeZh = PURPOSE_TO_ZH[purpose] || "玩具";
        const wishScript = dialogueScripts.wishes[purpose]?.[trait];
        const line = selectDialogueLine(book, spirit, {
          module: "心愿与场景物件限定",
          sub: `心愿请求(${purposeZh})`
        }, { ...ctx, propName: ctx.propName || `${purposeZh}摆件` });
        const scriptText = wishScript ? fillPlaceholders(wishScript.reply, { ...ctx, propName: ctx.propName || `${purposeZh}摆件` }) : null;
        const useScript = wishScript && scriptText && !(book.dialogueState?.seenNodes || []).includes(wishScript.id);
        if (useScript) {
          markNodeSeen(book, wishScript.id);
          return {
            nodeId: wishScript.id,
            reply: scriptText,
            isWish: true,
            wishTitle: wish?.title || ""
          };
        }
        markNodeSeen(book, line.id);
        return {
          nodeId: line.id,
          reply: line.rendered,
          isWish: true,
          wishTitle: wish?.title || ""
        };
      }

      if (branchKey === "page") {
        const worldObjs = WORLD_SCENE_OBJECTS[chapterId] || [];
        const objKey = nearSceneObject && worldObjs.includes(nearSceneObject)
          ? nearSceneObject
          : (worldObjs.length && nextSeeded(spirit) < 0.45 ? worldObjs[0] : null);
        if (objKey && dialogueScripts.sceneObjects[objKey]) {
          const objSpec = dialogueScripts.sceneObjects[objKey];
          const seenId = `${objSpec.id}-${chapterId}`;
          if (!(book.dialogueState?.seenNodes || []).includes(seenId)) {
            markNodeSeen(book, seenId);
            return {
              nodeId: seenId,
              reply: objSpec[trait],
              followUpLabel: `关于「${objSpec.label}」`,
              secondReply: selectDialogueLine(book, spirit, {
                module: "心愿与场景物件限定",
                sub: `场景细节(${objSpec.label})`
              }, ctx).rendered
            };
          }
        }
        const scriptPool = dialogueScripts.chatPage[trait] || [];
        const line = selectDialogueLine(book, spirit, {
          module: "聊聊与朋友聚会",
          sub: "聊聊-聊聊这一页"
        }, ctx);
        const parsed = /^「([^」]+)」→(.+)$/.exec(line.options || "");
        const fallbackScript = scriptPool[0];
        markNodeSeen(book, line.id);
        return {
          nodeId: line.id,
          reply: line.rendered,
          followUpLabel: parsed ? parsed[1] : (fallbackScript?.followUp || "你最想看哪里"),
          secondReply: parsed ? parsed[2] : (fallbackScript?.secondReply || "我想看看这一页纸折后面的小路。")
        };
      }

      return { nodeId: "FALLBACK", reply: fallbackLines[trait] };
    }
  };
}

export function pickCompanionExchange(book, spiritA, spiritB, placeHint, context = {}) {
  const traitA = primaryTrait(spiritA);
  const traitB = primaryTrait(spiritB);
  const script = dialogueScripts.companions.find(item =>
    (item.traits[0] === traitA && item.traits[1] === traitB) ||
    (item.traits[0] === traitB && item.traits[1] === traitA)
  ) || dialogueScripts.companions[0];

  const placeSubs = {
    toy: "同伴相遇(在玩具旁相遇)",
    plant: "同伴相遇(在植物旁相遇)",
    food: "同伴相遇(在食物桌旁相遇)",
    backdrop: "同伴相遇(在安静角落相遇)",
    rest: "同伴相遇(休息时靠在附近)"
  };
  const sub = placeSubs[placeHint] || "同伴相遇(在书页路口相遇)";
  const lineA = selectDialogueLine(book, spiritA, { module: "聊聊与朋友聚会", sub }, { ...context, spiritName: spiritA.name });
  const lineB = selectDialogueLine(book, spiritB, { module: "聊聊与朋友聚会", sub }, { ...context, spiritName: spiritB.name });

  if (script && !(book.dialogueState?.seenNodes || []).includes(script.id)) {
    markNodeSeen(book, script.id);
    const firstIsA = script.traits[0] === traitA;
    const first = firstIsA ? spiritA : spiritB;
    const second = firstIsA ? spiritB : spiritA;
    return [
      { spirit: first, text: `${first.name}：「${script.lines[0][1]}」` },
      { spirit: second, text: `${second.name}：「${script.lines[1][1]}」` }
    ];
  }

  return [
    { spirit: spiritA, text: `${spiritA.name}：「${lineA.rendered}」` },
    { spirit: spiritB, text: `${spiritB.name}：「${lineB.rendered}」` }
  ];
}

export function createAmbientScheduler() {
  const lastBubbleAt = new Map();
  let activeUntil = 0;
  let activeSpiritId = null;
  let activeText = "";
  let timerId = null;

  return {
    canTrigger(spiritId, now, paused) {
      if (paused) return false;
      if (now < activeUntil) return false;
      const last = lastBubbleAt.get(spiritId) ?? -Infinity;
      return now - last >= 75000;
    },
    trigger(spirit, text, now, onShow, onHide, reducedMotion) {
      if (!spirit || !text) return false;
      clearTimeout(timerId);
      const duration = 4500;
      activeSpiritId = spirit.id;
      activeText = text;
      activeUntil = now + duration;
      lastBubbleAt.set(spirit.id, now);
      onShow(spirit, text, Boolean(reducedMotion));
      timerId = setTimeout(() => {
        activeUntil = 0;
        activeSpiritId = null;
        activeText = "";
        onHide(Boolean(reducedMotion));
      }, duration);
      return true;
    },
    pause(onHide, reducedMotion) {
      clearTimeout(timerId);
      activeUntil = 0;
      activeSpiritId = null;
      activeText = "";
      onHide(Boolean(reducedMotion));
    },
    getActive() {
      return activeSpiritId ? { spiritId: activeSpiritId, text: activeText } : null;
    }
  };
}

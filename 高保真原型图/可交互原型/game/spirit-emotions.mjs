export const spiritEmotions = {
  delight: { icon: "💛", label: "喜欢", duration: 2100 },
  uneasy: { icon: "💧", label: "有些不安", duration: 2100 },
  curious: { icon: "❔", label: "好奇", duration: 2100 },
  excited: { icon: "🎉", label: "玩得开心", duration: 2600 },
  calm: { icon: "😌", label: "安心休息", duration: 2600 },
  interested: { icon: "🌱", label: "正在看植物", duration: 2600 },
  savoring: { icon: "😋", label: "正在品尝", duration: 2600 },
  fulfilled: { icon: "✨", label: "心愿实现", duration: 3200 },
  blocked: { icon: "🚧", label: "前面暂时走不通", duration: 2400 },
  greeting: { icon: "👋", label: "打招呼", duration: 2400 },
  chatting: { icon: "💬", label: "正在对话", duration: 3600 },
  companion: { icon: "🤝", label: "同伴交流", duration: 3000 },
  walking: { icon: "♪", label: "正走向摆件" },
  resting: { icon: "💤", label: "在打盹" },
  observing: { icon: "👀", label: "正在观察" }
};

export const reactionEmotion = { like: "delight", avoid: "uneasy", neutral: "curious" };
export const activityEmotion = { backdrop: "calm", toy: "excited", plant: "interested", food: "savoring" };

export function express(resident, emotion, now = performance.now()) {
  resident.emotion = emotion;
  resident.moodUntil = now + spiritEmotions[emotion].duration;
}

export function displayedEmotion(resident, wish, now) {
  if (resident.chatting) return spiritEmotions.chatting;
  if (now < (resident.moodUntil || 0)) return spiritEmotions[resident.emotion];
  if (resident.activity === "rest") return spiritEmotions.resting;
  if (resident.activity === "observe") return spiritEmotions.observing;
  if (resident.activity === "walk" && resident.target) return spiritEmotions.walking;
  return { icon: wish.icon, label: wish.title, wish: true };
}

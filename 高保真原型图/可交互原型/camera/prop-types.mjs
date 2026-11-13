export const propTypes = {
  backdrop: { name: "背景", icon: "🏞️", activity: "安静地歇了一会儿", color: "#ab8256", width: .84, depth: .46, basePurpose: "backdrop" },
  toy: { name: "玩具", icon: "🧸", activity: "玩得很开心", color: "#bc855e", width: .66, depth: .36, basePurpose: "toy" },
  plant: { name: "植物", icon: "🌿", activity: "凑近看了看叶子", color: "#76945c", width: .57, depth: .48, basePurpose: "plant" },
  food: { name: "食物", icon: "🍓", activity: "尝了一口", color: "#c28f55", width: .77, depth: .49, basePurpose: "food" },
  pet: { name: "萌宠", icon: "🐾", activity: "轻轻蹭了蹭", color: "#c98a63", width: .64, depth: .40, basePurpose: "toy" },
  drink: { name: "饮品", icon: "🧋", activity: "小口抿了一下", color: "#8c9bae", width: .52, depth: .38, basePurpose: "food" },
  dessert: { name: "甜点", icon: "🍰", activity: "闻到了甜甜的香气", color: "#d18d7a", width: .62, depth: .42, basePurpose: "food" },
  flower: { name: "花卉", icon: "🌸", activity: "数了数花瓣", color: "#c77d87", width: .56, depth: .44, basePurpose: "plant" },
  stationery: { name: "文具", icon: "✒️", activity: "认真写写画画", color: "#7a8b99", width: .58, depth: .35, basePurpose: "toy" },
  furniture: { name: "家具", icon: "🪑", activity: "靠着打了个小盹", color: "#9c7a54", width: .80, depth: .48, basePurpose: "backdrop" },
  lamp: { name: "灯饰", icon: "🏮", activity: "借着暖光看书", color: "#d49b4b", width: .55, depth: .38, basePurpose: "backdrop" },
  craft: { name: "手作", icon: "🎨", activity: "端详着小巧思", color: "#b37c57", width: .62, depth: .38, basePurpose: "toy" },
  instrument: { name: "乐器", icon: "🎵", activity: "跟着哼起小调", color: "#a67b5b", width: .68, depth: .40, basePurpose: "toy" },
  retro: { name: "复古", icon: "📻", activity: "听见旧时光的声音", color: "#8f755d", width: .72, depth: .44, basePurpose: "backdrop" },
  tableware: { name: "器皿", icon: "🍵", activity: "捧起杯沿看了看", color: "#8ca096", width: .58, depth: .40, basePurpose: "food" },
  ornament: { name: "摆件", icon: "🔮", activity: "好奇地转圈打量", color: "#9e829c", width: .60, depth: .38, basePurpose: "backdrop" }
};

export const moodTags = [
  "可可爱爱", "古灵精怪", "暖呼呼", "亮晶晶",
  "毛茸茸", "绿意盎然", "香气扑鼻", "复古怀旧",
  "治愈角落", "奇思妙想", "日常小物", "闪闪发光"
];

export const categoryToPurpose = {
  动物: "pet",
  植物: "plant",
  花卉: "flower",
  食物: "food",
  饮品: "drink",
  甜点: "dessert",
  文具: "stationery",
  家具: "furniture",
  灯饰: "lamp",
  玩具: "toy",
  手作: "craft",
  乐器: "instrument",
  复古: "retro",
  器物: "tableware",
  建筑: "backdrop",
  其他: "ornament"
};

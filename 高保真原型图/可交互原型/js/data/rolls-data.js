/**
 * 《拾光绘本：万物有灵》—— 32 款大师写实胶片配方完整定义
 * File: js/data/rolls-data.js
 * 
 * 涵盖 5 大系列：柯达经典暖金系 (6款)、富士清透日系系 (7款)、电影与夜景冷暖系 (6款)、
 * 专业黑白与高反差系 (6款)、玩趣复古与特殊机种系 (7款)。
 * 包含 CSS 滤镜、银盐颗粒度、高光黑柔、暗角、漏光、CCD 标志及艺术描述。
 */

(function (global) {
  "use strict";

  // 胶卷分类标签
  const FILM_CATEGORIES = [
    "★ 收藏",
    "柯达暖金",
    "富士日系",
    "电影夜景",
    "专业黑白",
    "玩趣复古",
    "自定义"
  ];

  // 32 款写实胶片核心定义表
  // 结构: [id, name, subname, bandColor, category, cssFilter, grain(0~2), bloom(0~35%), vignette(0~2), leak(0~1), isCCD, description, defaultSwatches]
  const ROLLS_RAW = [
    // 系列一：柯达经典暖金系 (Kodak Classic Warm - 6款)
    [
      "01", "Gold 200", "暖阳金卷", "#e8b960", "柯达暖金",
      "sepia(.15) saturate(1.22) contrast(1.08) brightness(1.02)",
      1, 15, 1, 0, false,
      "温暖明亮的午后阳光色调，金黄色温润浓郁，记录日常琐碎生活的首选万能胶卷。",
      ["#d99b3b", "#944834", "#f6edda", "#606c38", "#30291f"]
    ],
    [
      "02", "Portra 160", "清润人像", "#f0bfb0", "柯达暖金",
      "contrast(.94) brightness(1.08) saturate(1.06) sepia(.08)",
      0, 10, 0, 0, false,
      "极其柔和的低对比度与细腻肤色过渡，高光通透，适合自然光人像与器物静物。",
      ["#f0bfb0", "#f8d7cc", "#eec5a2", "#c5a085", "#4a3b32"]
    ],
    [
      "03", "Portra 400", "万能人像", "#eec5a2", "柯达暖金",
      "contrast(.98) brightness(1.04) saturate(1.12)",
      1, 12, 1, 0, false,
      "影调宽容度极高的人像王者，暖粉色肤色与柔润阴影，兼顾阴天与室内抓拍。",
      ["#eec5a2", "#d99b3b", "#c28d6c", "#6e584a", "#261e19"]
    ],
    [
      "04", "ColorPlus 200", "复古杂货", "#e59a68", "柯达暖金",
      "sepia(.22) saturate(1.28) contrast(1.12) hue-rotate(-5deg)",
      1, 20, 1, 1, false,
      "发色偏黄偏红的高饱和街头卷，自带岁月痕迹与旧杂货铺温暖怀旧感。",
      ["#e59a68", "#cb6843", "#f6edda", "#7a432b", "#2c1a12"]
    ],
    [
      "05", "Ektar 100", "极致鲜艳", "#e0533c", "柯达暖金",
      "saturate(1.45) contrast(1.18) brightness(1.02)",
      0, 8, 1, 0, false,
      "世界上颗粒最细腻的彩色负片，饱和度极高，色彩浓艳饱满，风光与红绿静物极佳。",
      ["#e0533c", "#f28e2b", "#59a14f", "#edc948", "#1c1815"]
    ],
    [
      "06", "Kodachrome 64", "传奇反转", "#d93829", "柯达暖金",
      "contrast(1.22) saturate(1.15) sepia(.12) hue-rotate(-6deg)",
      1, 14, 2, 0, false,
      "国家地理杂志标志性色彩，红黄基色极其纯正厚重，暗部沉稳，致敬银盐传奇。",
      ["#d93829", "#e8a735", "#3a506b", "#f6edda", "#1c1917"]
    ],

    // 系列二：富士清透日系系 (Fujifilm Clean Air - 7款)
    [
      "07", "Pro 400H", "晨光空气", "#b8d0a8", "富士日系",
      "brightness(1.1) saturate(.92) contrast(.96) hue-rotate(4deg)",
      0, 18, 0, 0, false,
      "标志性薄荷青绿与晨光透明感，高光微微泛蓝青，展现空气感清透日系美学。",
      ["#b8d0a8", "#d1e7c4", "#88c4b2", "#f6edda", "#3a4a38"]
    ],
    [
      "08", "Superia 400", "街头日光", "#7dae82", "富士日系",
      "contrast(1.12) saturate(1.1) hue-rotate(6deg) brightness(1.02)",
      1, 10, 1, 0, false,
      "富士第四感色层经典街拍卷，阴影泛绿偏青，绿植色彩层次丰富，日光写实生动。",
      ["#7dae82", "#48a36c", "#a3b5a0", "#e8d8b8", "#253326"]
    ],
    [
      "09", "Velvia 50", "风光高饱", "#48a36c", "富士日系",
      "saturate(1.5) contrast(1.2) hue-rotate(2deg)",
      0, 6, 1, 0, false,
      "顶级专业风光反转片，极致反差与超高色彩饱和度，令天空湛蓝、草木翠绿。",
      ["#48a36c", "#2d6a4f", "#52b788", "#d8f3dc", "#1b4332"]
    ],
    [
      "10", "Provia 100F", "自然写实", "#88c4b2", "富士日系",
      "contrast(1.04) saturate(1.05) brightness(1.01)",
      0, 5, 0, 0, false,
      "中性客观的标准写实反转片，色温还原精准无偏，微距观察万物肌理的定海神针。",
      ["#88c4b2", "#a8dadc", "#457b9d", "#f1faee", "#1d3557"]
    ],
    [
      "11", "Classic Chrome", "硬朗纪实", "#a3b5a0", "富士日系",
      "contrast(1.16) saturate(.78) brightness(1.01) sepia(.08)",
      1, 8, 1, 0, false,
      "宛如20世纪新闻画报般的冷静深沉色调，弱化饱和度、强化阴影，充满文学故事性。",
      ["#a3b5a0", "#6b705c", "#b7b7a4", "#ddbea9", "#3f4238"]
    ],
    [
      "12", "Natura 1600", "夜月微光", "#4e8275", "富士日系",
      "brightness(1.15) contrast(.88) saturate(.85) hue-rotate(8deg)",
      2, 28, 1, 1, false,
      "月光机月光卷，昏暗烛光下的幽绿泛青与奶油般微朦散景，散发深夜温柔气息。",
      ["#4e8275", "#264653", "#2a9d8f", "#e9c46a", "#1a2c26"]
    ],
    [
      "13", "Industrial 100", "关东工业", "#b5c99a", "富士日系",
      "contrast(1.08) brightness(1.05) saturate(.98) sepia(.05)",
      0, 10, 0, 0, false,
      "日本业务用记录卷，干净纯粹的日间中性发色，适合街道写生与文具器物。",
      ["#b5c99a", "#97a97c", "#718355", "#cfe1b9", "#343d2c"]
    ],

    // 系列三：电影与夜景冷暖系 (Cinema & Tungsten - 6款)
    [
      "14", "Vision3 500T", "午夜电影", "#3a6073", "电影夜景",
      "contrast(1.08) hue-rotate(-12deg) saturate(1.12) brightness(1.02)",
      1, 24, 2, 0, false,
      "钨丝灯电影负片，幽深夜色中泛着冷蓝冷青，路灯与车尾灯散发金色光晕，王家卫电影质感。",
      ["#3a6073", "#16222f", "#f4a261", "#e76f51", "#0d1b2a"]
    ],
    [
      "15", "Vision3 250D", "好莱坞日光", "#5c8a99", "电影夜景",
      "contrast(1.04) saturate(1.15) brightness(1.02)",
      1, 14, 1, 0, false,
      "好莱坞顶级日光电影负片，宽容度惊人，高光柔润不溢出，呈现极佳电影胶片叙事感。",
      ["#5c8a99", "#83a9b7", "#e9d8a6", "#ee9b00", "#1f363d"]
    ],
    [
      "16", "Cinestill 800T", "红色光晕", "#2b4c7e", "电影夜景",
      "contrast(1.14) hue-rotate(-15deg) saturate(1.18)",
      1, 35, 2, 0, false,
      "去除碳层的高速钨丝灯卷，点状强光源周围绽放标志性鲜红光晕与冷调蓝调夜景。",
      ["#2b4c7e", "#d62828", "#f77f00", "#fcbf49", "#003049"]
    ],
    [
      "17", "Cinestill 50D", "细腻晨光", "#7097c2", "电影夜景",
      "contrast(1.06) saturate(1.22) brightness(1.04)",
      0, 8, 0, 0, false,
      "颗粒最细腻的电影日光卷，晴天下呈现清爽的水蓝色与高明度高光，水彩画般清丽。",
      ["#7097c2", "#90e0ef", "#0077b6", "#caf0f8", "#03045e"]
    ],
    [
      "18", "Aerocolor IV", "航拍鲜蓝", "#386fa4", "电影夜景",
      "contrast(1.18) saturate(1.35) brightness(1.05) hue-rotate(-4deg)",
      0, 10, 1, 0, false,
      "高空侦察航拍胶卷改良版，超透亮天空与红顶建筑，穿透雨雾尘埃的清爽视野。",
      ["#386fa4", "#59a5d8", "#84d2f6", "#91e5f6", "#133c55"]
    ],
    [
      "19", "Ektachrome E100", "深邃纯蓝", "#295b8d", "电影夜景",
      "contrast(1.2) saturate(1.25) brightness(1.02) hue-rotate(-2deg)",
      0, 5, 1, 0, false,
      "柯达新世代专业彩色反转片，极致纯净的冷调正色，微距与建筑轮廓如刀刻般分明。",
      ["#295b8d", "#1d3557", "#457b9d", "#f1faee", "#0e1c2e"]
    ],

    // 系列四：专业黑白与高反差系 (B&W Fine Grain - 6款)
    [
      "20", "Tri-X 400", "传奇纪实", "#4a4a4a", "专业黑白",
      "grayscale(1) contrast(1.38) brightness(.98)",
      2, 12, 2, 0, false,
      "纪实摄影殿堂级黑白卷，硬朗粗犷的银盐颗粒，深沉有力的暗部与富有冲击力的反差。",
      ["#111111", "#333333", "#777777", "#cccccc", "#ffffff"]
    ],
    [
      "21", "HP5 Plus", "英伦雅致", "#636363", "专业黑白",
      "grayscale(1) contrast(1.18) brightness(1.02)",
      1, 10, 1, 0, false,
      "伊尔福经典黑白卷，灰阶细腻平滑，宽容度极宽，无论晴阴皆能呈现丰富的阴影细节。",
      ["#1f1f1f", "#4f4f4f", "#8f8f8f", "#cfcfcf", "#f5f5f5"]
    ],
    [
      "22", "T-Max 400", "科技晶体", "#3b3b3b", "专业黑白",
      "grayscale(1) contrast(1.26) brightness(1.01)",
      1, 6, 1, 0, false,
      "T 颗粒扁平晶体专利技术，极高分辨率与锐利轮廓，展现理智沉静的器物微距素描感。",
      ["#181818", "#444444", "#808080", "#c0c0c0", "#fafafa"]
    ],
    [
      "23", "Pan F Plus", "微距银盐", "#737373", "专业黑白",
      "grayscale(1) contrast(1.32) brightness(1.04)",
      0, 4, 0, 0, false,
      "ISO 50 超低速黑白卷，颗粒近乎隐形，影调晶莹剔透，如同针管笔下精细的版画图纸。",
      ["#0f0f0f", "#383838", "#787878", "#b8b8b8", "#fcfcfc"]
    ],
    [
      "24", "Kentmere 400", "学生素描", "#595959", "专业黑白",
      "grayscale(1) contrast(1.22) brightness(1.03)",
      1, 15, 1, 0, false,
      "朴实亲切的暗房练习卷，中性反差与略带粉质的颗粒，散发自习室铅笔速写的随性美感。",
      ["#222222", "#555555", "#888888", "#bbbbbb", "#eeeeee"]
    ],
    [
      "25", "Acros 100 II", "富士黑白", "#2b2b2b", "专业黑白",
      "grayscale(1) contrast(1.28) brightness(1.02)",
      0, 6, 1, 0, false,
      "富士顶级正色性黑白片，高光极为纯净，黑白阶调过渡如水墨宣纸晕染般幽雅从容。",
      ["#141414", "#3a3a3a", "#707070", "#b0b0b0", "#f8f8f8"]
    ],

    // 系列五：玩趣复古与特殊机种系 (Fun & Retro CCD - 7款)
    [
      "26", "LomoColor 400", "高反差浓烈", "#df5286", "玩趣复古",
      "contrast(1.32) saturate(1.4) hue-rotate(-8deg)",
      1, 16, 2, 1, false,
      "浓烈奔放的 LOMO 美学，暗角深重，红黄色调极具戏剧张力，点亮平凡生活的奇想。",
      ["#df5286", "#e76f51", "#f4a261", "#2a9d8f", "#18140e"]
    ],
    [
      "27", "Metropolis", "冷淡末日", "#7b8a78", "玩趣复古",
      "contrast(1.38) saturate(.6) brightness(.98)",
      2, 10, 2, 0, false,
      "褪色冷峻的工业调色，暗部深邃泛黑，唯独红黄两色独立跳跃，营造赛博朋克或遗迹氛围。",
      ["#7b8a78", "#4f5d4c", "#e63946", "#283618", "#121212"]
    ],
    [
      "28", "Y2K CCD 2004", "千禧数码直闪", "#f39c12", "玩趣复古",
      "contrast(1.2) brightness(1.12) saturate(1.18)",
      0, 22, 1, 0, true,
      "模拟 2004 年千禧旧数码卡片机！冷白皮、硬直闪、微紫边与右下角亮橙液晶日期戳。",
      ["#f39c12", "#e67e22", "#3498db", "#ecf0f1", "#2c3e50"]
    ],
    [
      "29", "Polaroid 600", "经典即影即得", "#4a90e2", "玩趣复古",
      "contrast(1.08) brightness(1.08) sepia(.12) saturate(1.06)",
      1, 25, 2, 0, false,
      "拍立得相纸乳浊液特有温润感，自带复古白框与悬浮显影动效，按下快门瞬间拥有实体记忆。",
      ["#4a90e2", "#50e3c2", "#b8e986", "#f8e71c", "#41403e"]
    ],
    [
      "30", "XPAN Cinema", "65:24宽银幕", "#d35400", "玩趣复古",
      "contrast(1.16) saturate(1.1) brightness(1.01)",
      1, 18, 2, 0, false,
      "哈苏 XPAN 传奇电影宽银幕画幅，上下黑色电影遮罩，居中中英双语台词字幕，让日常化作电影剧照。",
      ["#d35400", "#e67e22", "#f39c12", "#f6edda", "#18140e"]
    ],
    [
      "31", "Half-Frame", "双联半格拼版", "#27ae60", "玩趣复古",
      "contrast(1.12) brightness(1.03) saturate(1.1)",
      1, 15, 1, 0, false,
      "奥林巴斯 PEN 半格机双联拼图体验！两张竖构图拼合成一张带中缝齿孔底片，让并列产生蒙太奇故事。",
      ["#27ae60", "#2ecc71", "#e8f8f5", "#f6edda", "#30291f"]
    ],
    [
      "32", "Redscale 100", "炽烈反装红调", "#c0392b", "玩趣复古",
      "sepia(.65) hue-rotate(-25deg) contrast(1.24) saturate(1.5)",
      2, 20, 2, 1, false,
      "将彩色底片反向装入暗盒的特异化学发色！全世界被染上一层金红与橘红烈焰，宛如梦幻夕阳火烧云。",
      ["#c0392b", "#d35400", "#f39c12", "#f1c40f", "#331100"]
    ],
    [
      "33", "Cinestill 400D", "日光电影红晕", "#c8523b", "电影夜景",
      "contrast(1.09) saturate(1.16) sepia(.06) brightness(1.03)",
      1, 26, 1, 0, false,
      "全天候日光宽容度电影负片，高光自带柔润橘红光晕，晴天肤色与霓虹招牌都宛如银幕定格。",
      ["#c8523b", "#e9967a", "#3d5a80", "#f6edda", "#1c2541"]
    ],
    [
      "34", "Phoenix 200", "实验暖橙狂想", "#e06d2b", "玩趣复古",
      "contrast(1.34) saturate(1.38) sepia(.18) hue-rotate(-10deg)",
      2, 22, 2, 1, false,
      "新锐高反差实验彩色负片，浓郁琥珀红棕与强烈光晕反差，拍街头与建筑最具张力。",
      ["#e06d2b", "#d94e34", "#f4a261", "#264653", "#1d1a16"]
    ],
    [
      "35", "Lomo Purple", "幻彩暮紫负片", "#8b4ca8", "玩趣复古",
      "hue-rotate(-48deg) saturate(1.35) contrast(1.18)",
      1, 16, 2, 0, false,
      "传奇红外拟色胶卷！把翡翠绿植转为梦幻丁香紫与薰衣草色调，一键坠入异想花园。",
      ["#8b4ca8", "#b56576", "#6d597a", "#e56b6f", "#24192e"]
    ],
    [
      "36", "Astia 100F", "柔和甜品日系", "#63b397", "富士日系",
      "brightness(1.07) contrast(.92) saturate(1.08) hue-rotate(3deg)",
      0, 14, 0, 0, false,
      "富士停产传奇柔和反转片，蜜桃奶油高光与清甜淡雅过渡，静物与花草质感绝佳。",
      ["#63b397", "#a8dadc", "#f4c095", "#f9f1e6", "#2a453e"]
    ],
    [
      "37", "Agfa Vista 200", "德味红绿经典", "#d9383a", "柯达暖金",
      "contrast(1.16) saturate(1.3) brightness(1.01) sepia(.05)",
      1, 12, 1, 0, false,
      "德系大众胶卷代表作，红色热烈通透、绿色厚实饱满，阴天也能拍出浓郁明艳的生活感。",
      ["#d9383a", "#2a9d8f", "#e9c46a", "#f4f1de", "#262322"]
    ],
    [
      "38", "Ortho Plus 80", "复古正色黑白", "#3d5265", "专业黑白",
      "grayscale(1) contrast(1.42) brightness(.96)",
      0, 8, 2, 0, false,
      "只对蓝绿光敏感的正色黑白胶片，红橙色调深沉凝聚如古典湿版银盐摄影。",
      ["#161b22", "#3d5265", "#6e7f91", "#c5cdd6", "#f5f7fa"]
    ],
    [
      "39", "Vision3 50D", "清冽日光剧场", "#2f768f", "电影夜景",
      "contrast(1.05) saturate(1.12) brightness(1.04) hue-rotate(2deg)",
      0, 10, 0, 0, false,
      "极低感光度超级精细电影日光卷，明媚阳光下保留海量高光层次与通透空气感。",
      ["#2f768f", "#56a3b8", "#e8d5b7", "#f6edda", "#18303b"]
    ],
    [
      "40", "Cyber Neon 800", "霓虹夜幕胶片", "#19a8b8", "玩趣复古",
      "contrast(1.25) saturate(1.42) hue-rotate(16deg) brightness(1.03)",
      1, 30, 2, 0, false,
      "专为都市雨夜霓虹打造的青品红高感卷，路灯与广告牌流光溢彩。",
      ["#19a8b8", "#e040fb", "#283593", "#ffd54f", "#0d1321"]
    ]
  ];

  // 对象化映射
  const ROLLS_DATA = ROLLS_RAW.map(item => ({
    id: item[0],
    name: item[1],
    subname: item[2],
    bandColor: item[3],
    category: item[4],
    cssFilter: item[5],
    grain: item[6],
    bloom: item[7],
    vignette: item[8],
    leak: item[9],
    isCCD: item[10],
    description: item[11],
    colorSwatches: item[12],
    // 供暗房 6 项参数微调的基准数值
    defaultRecipe: {
      grain: item[6] === 0 ? 8 : (item[6] === 1 ? 24 : 45),
      bloom: item[7],
      chrome: item[4] === "专业黑白" ? 0 : (item[5].includes("sepia") ? 8 : -4),
      vignette: item[8] === 0 ? 10 : (item[8] === 1 ? 30 : 55),
      leak: item[9] > 0 ? 30 : 0,
      dateStamp: item[10] === true
    }
  }));

  const CUSTOM_ROLLS_STORAGE_KEY = "shiguang-custom-rolls-v1";

  function buildCustomRoll(draft = {}) {
    const id = String(draft.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    const name = String(draft.name || "我的配方").trim().slice(0, 18) || "我的配方";
    const bandColor = draft.bandColor || "#d49b54";
    const exposure = Number.isFinite(Number(draft.exposure)) ? Number(draft.exposure) : 1.02;
    const contrast = Number.isFinite(Number(draft.contrast)) ? Number(draft.contrast) : 1.1;
    const saturate = Number.isFinite(Number(draft.saturate)) ? Number(draft.saturate) : 1.15;
    const sepia = Number.isFinite(Number(draft.sepia)) ? Number(draft.sepia) : 0.12;
    const hueRotate = Number.isFinite(Number(draft.hueRotate)) ? Number(draft.hueRotate) : 0;
    const shadowTemp = Number.isFinite(Number(draft.shadowTemp)) ? Number(draft.shadowTemp) : 0; // -15 cool .. +15 warm
    const highlightTemp = Number.isFinite(Number(draft.highlightTemp)) ? Number(draft.highlightTemp) : 0;
    const curve = Number.isFinite(Number(draft.curve)) ? Number(draft.curve) : 0.22;
    const isMono = Boolean(draft.isMono);
    const grain = Math.max(0, Math.min(2, Math.round(Number(draft.grain ?? 1))));
    const vignette = Math.max(0, Math.min(2, Math.round(Number(draft.vignette ?? 1))));
    const bloom = draft.halation ? 28 : Math.max(0, Math.min(35, Math.round(Number(draft.bloom ?? 14))));
    const leak = draft.leak ? 1 : 0;
    const isCCD = Boolean(draft.isCCD);

    const parts = [];
    if (isMono) parts.push("grayscale(1)");
    if (sepia > 0.005 && !isMono) parts.push(`sepia(${sepia.toFixed(2)})`);
    if (Math.abs(hueRotate) >= 1 && !isMono) parts.push(`hue-rotate(${Math.round(hueRotate)}deg)`);
    parts.push(`contrast(${contrast.toFixed(2)})`);
    if (!isMono) parts.push(`saturate(${saturate.toFixed(2)})`);
    parts.push(`brightness(${exposure.toFixed(2)})`);

    const customTone = {
      isMono,
      shR: Math.round(shadowTemp),
      shG: Math.round(shadowTemp * 0.25),
      shB: Math.round(-shadowTemp),
      hiR: Math.round(highlightTemp),
      hiG: Math.round(highlightTemp * 0.35),
      hiB: Math.round(-highlightTemp),
      toe: curve > 0.3 ? 3 : 5,
      curve,
      halation: Boolean(draft.halation)
    };

    return {
      id,
      name,
      subname: "Custom Lab · 自制配方",
      bandColor,
      category: "自定义",
      isCustom: true,
      cssFilter: parts.join(" "),
      grain,
      bloom,
      vignette,
      leak,
      isCCD,
      halation: Boolean(draft.halation),
      description: "用户暗房自制专属胶片配方。",
      colorSwatches: [bandColor, draft.accentColor || "#5c5145", "#f6edda", "#8c7a65", "#231e19"],
      customDraft: {
        id,
        name,
        bandColor,
        accentColor: draft.accentColor || "#5c5145",
        exposure,
        contrast,
        saturate,
        sepia,
        hueRotate,
        shadowTemp,
        highlightTemp,
        curve,
        isMono,
        grain,
        vignette,
        bloom,
        halation: Boolean(draft.halation),
        leak: Boolean(leak),
        isCCD
      },
      customTone
    };
  }

  const CustomRollsStore = {
    list() {
      try {
        const raw = JSON.parse(localStorage.getItem(CUSTOM_ROLLS_STORAGE_KEY));
        if (!Array.isArray(raw)) return [];
        return raw.map(item => buildCustomRoll(item?.customDraft || item));
      } catch {
        return [];
      }
    },
    save(draft) {
      const built = buildCustomRoll(draft);
      const current = this.list();
      const idx = current.findIndex(item => item.id === built.id);
      if (idx >= 0) current[idx] = built;
      else current.unshift(built);
      try {
        localStorage.setItem(CUSTOM_ROLLS_STORAGE_KEY, JSON.stringify(current.map(r => r.customDraft)));
      } catch {
        // Ignore storage errors in restricted environments
      }
      return built;
    },
    remove(id) {
      const next = this.list().filter(item => item.id !== id);
      try {
        localStorage.setItem(CUSTOM_ROLLS_STORAGE_KEY, JSON.stringify(next.map(r => r.customDraft)));
      } catch {
        // Ignore storage errors
      }
      return next;
    },
    buildRoll: buildCustomRoll
  };

  function getAllRolls() {
    return [...ROLLS_DATA, ...CustomRollsStore.list()];
  }

  // 提供标准查询接口
  function getRollById(id) {
    const custom = CustomRollsStore.list().find(r => r.id === id);
    if (custom) return custom;
    const padded = String(id).padStart(2, "0");
    return ROLLS_DATA.find(r => r.id === padded) || ROLLS_DATA[0];
  }

  function getRollsByCategory(category, favoritesSet = null) {
    const all = getAllRolls();
    if (category === "自定义") {
      return CustomRollsStore.list();
    }
    if (category === "★ 收藏") {
      if (!favoritesSet) return [ROLLS_DATA[0], ROLLS_DATA[1], ROLLS_DATA[6], ROLLS_DATA[27]];
      return all.filter(r => favoritesSet.has(r.id));
    }
    return ROLLS_DATA.filter(r => r.category === category);
  }

  // 挂载至全局对象
  global.FILM_CATEGORIES = FILM_CATEGORIES;
  global.ROLLS_DATA = ROLLS_DATA;
  global.CustomRollsStore = CustomRollsStore;
  global.getAllRolls = getAllRolls;
  global.getRollById = getRollById;
  global.getRollsByCategory = getRollsByCategory;

})(typeof window !== "undefined" ? window : globalThis);

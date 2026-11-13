/**
 * 《拾光绘本：万物有灵》—— UI 矢量图标、雪碧图映射与精灵档案配置
 * File: js/data/icons-data.js
 * 
 * 包含：
 * 1. 经典雪碧图映射 (cameraIconIndex - 38 项)：保持与既有 CSS 变量 `--icon: N` 100% 兼容。
 * 2. 现代内联矢量 SVG 库 (SVG_ICONS)：无需外部资源，在任何视口比例下保持极高清晰度。
 * 3. 精灵生态实体档案库 (SPRITE_PROFILES)：阿灯、多肉、咖啡杯、老挂钟等多维度个性化参数。
 */

(function (global) {
  "use strict";

  // 1. 经典雪碧图偏移索引 (38项)
  const cameraIconIndex = {
    "camera": 0, "picture": 1, "sticker": 2, "focus": 3, "file": 4,
    "flash": 5, "flashOff": 6, "flashAuto": 7, "sliders": 8, "book": 9,
    "rotate": 10, "film": 11, "star": 12, "savedStar": 13, "down": 14,
    "up": 15, "back": 16, "check": 17, "plus": 18, "grain": 19,
    "halo": 20, "colors": 21, "corner": 22, "leak": 23, "date": 24,
    "grid": 25, "timer": 26, "mix": 27, "ev": 28, "temp": 29,
    "iso": 30, "download": 31, "cabin": 32, "doubles": 33, "aspect": 34,
    "print": 35, "arrow": 36, "empty": 37
  };

  // 2. 纯内联现代矢量 SVG 字典 (带棉浆纸笔墨风格的 stroke 与 fill)
  const SVG_ICONS = {
    // 基础导航与相机
    camera: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
    shutter: `<svg viewBox="0 0 32 32" width="100%" height="100%"><circle cx="16" cy="16" r="14" fill="#944834" stroke="#d99b3b" stroke-width="2.5"/><circle cx="16" cy="16" r="10" fill="#a84f3a"/><circle cx="16" cy="16" r="6" fill="#7a3424"/></svg>`,
    film: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`,
    darkroom: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    sticker: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13a4 4 0 0 1-8 0" stroke-dasharray="2 2"/></svg>`,
    spirit: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    theater: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="12" y1="6" x2="16" y2="10"/><line x1="16" y1="6" x2="12" y2="10"/></svg>`,
    social: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
    travel: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="16" height="15" rx="2"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="12" y1="11" x2="12" y2="17"/></svg>`,
    
    // 控制与状态
    flashOff: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M10.41 10.41L2 14h9l-1 8 7.5-9.5M16.59 5.59L22 10h-9l1-8-3.5 4.5"/></svg>`,
    flashAuto: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/><text x="18" y="21" font-size="8" font-family="sans-serif" font-weight="bold" fill="currentColor" stroke="none">A</text></svg>`,
    flashOn: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    flashCCD: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/><circle cx="19" cy="5" r="2.5" fill="#ff9e00" stroke="none"/></svg>`,
    grid: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>`,
    timer: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    rotate: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
    sliders: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`,
    download: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    reset: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
    close: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    starFilled: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="#d99b3b" stroke="#30291f" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    starOutline: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    check: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="#944834" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
  };

  // 3. 精灵生态实体档案库 (对齐 GDD §3.2, §5.2, §6.2)
  const SPRITE_PROFILES = {
    ahDeng: {
      id: "ahDeng",
      name: "阿灯",
      species: "appliance",
      originItem: "复古墨绿双关节黄铜台灯",
      personality: "温和腼腆、热爱阅读、怕黑但尽力发光",
      favoriteFilm: "01", // Gold 200
      favoriteFood: "草莓小蛋糕",
      standeeAsset: "assets/sprite.png",
      baseQuote: "在时光的缝隙里，万物皆有回响。",
      dialogues: {
        idle: ["书页翻到第 42 页了呢...", "好想替主人多照亮一小会儿书桌。", "今天的灯丝也热乎乎的！"],
        sulking: ["多肉的花盆又往我这边挤了...", "我才没有故意挡住下午的阳光呢！"],
        happy: ["哇！是甜点！我和多肉各分一半！", "光芒好像变得更加温暖澄澈了！"],
        travel: ["背包里装好了老照片，我们一起出发吧！"]
      },
      starProgression: [
        { star: 1, name: "一星初醒", baseShape: "白卡折纸三角支撑脚", feature: "基础果冻微晃、眨眼表情气泡" },
        { star: 2, name: "二星通灵", baseShape: "牛皮纸压花底座", feature: "解锁伴生天气小雨云/小微光挂件" },
        { star: 3, name: "三星拾光", baseShape: "烫金镭射反光边框", feature: "解锁死党合体（台灯为多肉补光）" },
        { star: 4, name: "四星万灵", baseShape: "柔和水彩常驻光晕", feature: "立体书剧场双倍水彩晕染扩散" }
      ]
    },
    succulent: {
      id: "succulent",
      name: "多肉",
      species: "plant",
      originItem: "红陶方盆玉露多肉",
      personality: "傲娇、极度依赖阳光、偶尔嘴硬心软",
      favoriteFilm: "07", // Pro 400H
      favoriteFood: "阳光柠檬茶",
      standeeAsset: "assets/sprite.png",
      baseQuote: "静静晒太阳，不说话就很美好。",
      dialogues: {
        idle: ["咕嘟咕嘟，吸收了满满的光合能量！", "今天的微风吹得叶片好舒服呀。", "别戳我，叶片会掉粉的！"],
        sulking: ["阿灯的铁底座把我的阳光都挡住一半了！哼！", "不要过来，我们现在正在背对背冷战！"],
        happy: ["分到好吃的了！好吧，原谅阿灯 30 秒。", "饱满多汁，又是元气满满的一天！"],
        travel: ["趁拉链没拉上，我偷偷钻进背包一起去！"]
      },
      starProgression: [
        { star: 1, name: "一星初醒", baseShape: "白卡折纸三角支撑脚", feature: "左右歪头、冒出嫩芽小气泡" },
        { star: 2, name: "二星通灵", baseShape: "红陶质感卡纸底座", feature: "光合作用微闪星尘粒子" },
        { star: 3, name: "三星拾光", baseShape: "绿金烫印水彩边框", feature: "合体站位：跳上阿灯底座借光" },
        { star: 4, name: "四星万灵", baseShape: "翡翠剔透玉露光环", feature: "剧场全景植物生长加速" }
      ]
    }
  };

  /**
   * 辅助方法：生成指定图标 HTML
   */
  function renderIconSvg(name, extraClass = "") {
    const svg = SVG_ICONS[name] || SVG_ICONS.camera;
    return `<span class="svg-icon svg-icon-${name} ${extraClass}" aria-hidden="true">${svg}</span>`;
  }

  // 挂载至全局
  global.cameraIconIndex = cameraIconIndex;
  global.SVG_ICONS = SVG_ICONS;
  global.SPRITE_PROFILES = SPRITE_PROFILES;
  global.renderIconSvg = renderIconSvg;

})(typeof window !== "undefined" ? window : globalThis);

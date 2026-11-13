// Shared by the paper models and the placement / walking collision checks.
export const regions = {
  study: [
    ["书桌角", "desk", -6.5, -5.2, "#ab7049"],
    ["窗边", "screen", 6.4, -5.1, "#c58d65"],
    ["地毯", "reading", -6.6, 4.4, "#ad6350"],
    ["陈列角", "display", 6.5, 4.7, "#8f6c4f"]
  ],
  garden: [
    ["雨水池", "pond", -6.5, -5.3, "#79a8a7"],
    ["苔径", "arch", 6.3, -5.2, "#688658"],
    ["育苗地", "nursery", -6.5, 4.5, "#819758"],
    ["散步道", "bench", 6.5, 4.6, "#8ba278"]
  ],
  station: [
    ["旧铁轨", "rails", -6.5, -5.3, "#777995"],
    ["候车亭", "shelter", 6.3, -5.3, "#987589"],
    ["行李区", "luggage", -6.7, 4.5, "#a48068"],
    ["站前广场", "clock", 6.4, 4.5, "#8583a7"]
  ],
  creek: [
    ["上游浅滩", "pond", -6.5, -5.3, "#74abb0"],
    ["木桥", "bridge", 6.3, -5.2, "#9b7950"],
    ["苔石径", "rocks", -6.6, 4.4, "#83a27a"],
    ["停舟岸", "boats", 6.3, 4.6, "#8d9872"]
  ],
  marsh: [
    ["芦苇湾", "reeds", -6.5, -5.2, "#6e8f6c"],
    ["观灯台", "lantern", 6.4, -5.3, "#b19c61"],
    ["静水岸", "pond", -6.4, 4.5, "#7ca5a0"],
    ["草地", "nursery", 6.4, 4.6, "#8da571"]
  ],
  ridge: [
    ["迎风坡", "rocks", -6.5, -5.1, "#9ca775"],
    ["风铃棚", "bells", 6.4, -5.3, "#b8875a"],
    ["草坡", "mill", -6.4, 4.5, "#c49c62"],
    ["望风台", "flags", 6.3, 4.4, "#bd8167"]
  ],
  coast: [
    ["礁石湾", "rocks", -6.6, -5.1, "#9b8f9f"],
    ["潮池", "pond", 6.4, -5.2, "#82aebd"],
    ["贝壳滩", "shells", -6.4, 4.4, "#c69181"],
    ["岸边沙地", "beacon", 6.5, 4.4, "#b37c69"]
  ]
};

export const regionFootprints = {
  desk: [2.5, 1.35], screen: [2.8, .55], reading: [2.35, 1.3], display: [2.55, 1.35],
  pond: [2.9, 1.85], arch: [2.7, .85], nursery: [2.8, 1.35], bench: [2.45, 1.1],
  rails: [2.85, 1.15], shelter: [2.65, 1.4], luggage: [2.55, 1.35], clock: [1.65, 1.25],
  bridge: [2.9, 1.6], rocks: [2.8, 1.55], boats: [2.8, 1.65], reeds: [2.75, 1.5],
  lantern: [2.55, 1.2], bells: [2.55, 1.25], mill: [1.4, 1.15], flags: [2.6, 1.0],
  shells: [2.7, 1.6], beacon: [1.5, 1.4]
};

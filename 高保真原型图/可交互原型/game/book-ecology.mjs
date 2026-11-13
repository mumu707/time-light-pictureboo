import { propTypes } from "../camera/prop-types.mjs";

export const starterProps = [
  { id: "starter-screen", name: "纸窗屏风", icon: "🏞️", purpose: "backdrop", category: "建筑" },
  { id: "starter-kite", name: "纸风筝", icon: "🪁", purpose: "toy", category: "器物" },
  { id: "starter-leaf", name: "小叶盆栽", icon: "🌿", purpose: "plant", category: "植物" },
  { id: "starter-berry", name: "莓果盘", icon: "🍓", purpose: "food", category: "食物" }
];
export const prizeFor = chapter => ({
  id: "ecology-" + chapter.id, name: chapter.prize, icon: chapter.symbol,
  purpose: chapter.purpose, category: "器物"
});

export function propImage(entry) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 192;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fcf1ce";
  ctx.strokeStyle = propTypes[entry.purpose].color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(25, 22, 142, 147, [26, 19, 24, 16]);
  ctx.fill();
  ctx.stroke();
  ctx.font = "91px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#65503d";
  ctx.fillText(entry.icon, 96, 99);
  return canvas;
}

export function chapterThumbnail(chapter) {
  const image = document.createElement("canvas");
  image.width = 94;
  image.height = 56;
  image.className = "chapter-thumb";
  image.setAttribute("aria-hidden", "true");
  const ctx = image.getContext("2d");
  ctx.fillStyle = chapter.color;
  ctx.fillRect(0, 0, 94, 56);
  ctx.fillStyle = chapter.paper;
  ctx.beginPath();
  ctx.moveTo(0, 43);
  ctx.lineTo(25, 29);
  ctx.lineTo(44, 39);
  ctx.lineTo(70, 24);
  ctx.lineTo(94, 33);
  ctx.lineTo(94, 56);
  ctx.lineTo(0, 56);
  ctx.fill();
  ctx.font = "23px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = chapter.dark;
  ctx.fillText(chapter.symbol, 47, 30);
  return image;
}

export function playEcology(chapter, claim) {
  const dialog = document.querySelector("#ecology-game");
  const board = document.querySelector("#ecology-board");
  document.querySelector("#ecology-title").textContent = chapter.game;
  dialog.querySelector(".desk-close").onclick = () => dialog.close();
  dialog.showModal();
  const controller = new AbortController();
  const signal = controller.signal;
  dialog.addEventListener("close", () => {
    controller.abort();
    if (sound) void sound.close();
  }, { once: true });
  let sound;
  let epoch = 0;
  const make = (tag, text, className) => {
    const item = document.createElement(tag);
    item.textContent = text;
    if (className) item.className = className;
    return item;
  };
  const message = make("p", "");
  message.setAttribute("role", "status");
  const field = make("div", "", "ecology-field");
  const actions = make("div", "", "ecology-actions");
  const button = (label, handler) => {
    const item = make("button", label, "desk-pill");
    item.type = "button";
    item.onclick = handler;
    actions.append(item);
    return item;
  };
  function restart() {
    epoch++;
    board.replaceChildren(message, field, actions);
    actions.replaceChildren();
    delete field.dataset.wet;
    if (chapter.id === "creek") boat();
    else if (chapter.id === "coast") tide();
    else memory(chapter.id === "ridge");
  }
  async function win() {
    const token = ++epoch;
    actions.replaceChildren();
    field.textContent = "✦";
    message.textContent = "完成了！";
    try {
      const first = await claim(chapter);
      if (signal.aborted || token !== epoch) return;
      message.textContent = first ? "已收下「" + chapter.prize + "」。" : "「" + chapter.prize + "」已在收藏中。";
    } catch {
      if (signal.aborted) return;
      message.textContent = "摆件暂时没能保存。";
      button("重试领取", win);
    }
    if (!signal.aborted) button("再玩一次", restart);
  }
  function boat() {
    let leg = 0;
    const gates = [0, 1, 0];
    const maps = ["🚩 ～ 🪨", "🪨 ～ 🚩", "🚩 ～ 🪨"];
    const show = () => {
      field.textContent = "⛵ " + maps[leg];
      message.textContent = "沿浮标选水路，已通过 " + leg + "/3";
    };
    show();
    for (const [index, side] of ["左岔口", "右岔口"].entries()) button(side, () => {
      if (index !== gates[leg]) {
        field.textContent = "⛵ 🪨";
        message.textContent = "纸舟碰岸了。";
        actions.replaceChildren();
        button("回到起点", restart);
      } else if (++leg === gates.length) void win();
      else show();
    });
  }
  function tone(index) {
    if (!sound || sound.state !== "running") return;
    const oscillator = sound.createOscillator();
    const volume = sound.createGain();
    oscillator.frequency.value = [392, 494, 587, 698][index];
    volume.gain.setValueAtTime(.095, sound.currentTime);
    volume.gain.exponentialRampToValueAtTime(.001, sound.currentTime + .38);
    oscillator.connect(volume).connect(sound.destination);
    oscillator.start();
    oscillator.stop(sound.currentTime + .39);
  }
  function memory(chimes) {
    const patterns = chimes ? [[0, 2, 1], [1, 3, 2], [3, 1, 0, 2]] : [[1, 2], [0, 3, 1], [2, 1, 3, 0]];
    const names = chimes ? ["低铃", "木铃", "风铃", "高铃"] : ["芦苇灯", "岸边灯", "水心灯", "石头灯"];
    let round = 0;
    let index = 0;
    const demo = async () => {
      const token = ++epoch;
      index = 0;
      if (chimes && window.AudioContext) {
        sound ||= new AudioContext();
        void sound.resume().catch(() => {});
      }
      actions.replaceChildren();
      message.textContent = "观察第 " + (round + 1) + "/3 轮";
      for (const tile of patterns[round]) {
        if (signal.aborted || epoch !== token) return;
        field.textContent = "✦ " + names[tile];
        if (chimes) tone(tile);
        await new Promise(resolve => setTimeout(resolve, 650));
        if (signal.aborted || epoch !== token) return;
        field.textContent = "·";
        await new Promise(resolve => setTimeout(resolve, chimes && tile % 2 ? 360 : 200));
      }
      if (signal.aborted || epoch !== token) return;
      message.textContent = "按刚才的顺序选择";
      names.forEach((name, tile) => button(name, () => {
        if (chimes) tone(tile);
        field.textContent = name;
        if (tile !== patterns[round][index++]) {
          actions.replaceChildren();
          message.textContent = "顺序有一点不同。";
          button("重看这一轮", demo);
        } else if (index === patterns[round].length) {
          if (++round === patterns.length) void win();
          else {
            actions.replaceChildren();
            button("开始下一轮", demo);
          }
        }
      }));
    };
    field.textContent = chimes ? "♫" : "✦ ✧ ✦";
    message.textContent = "记住亮起的顺序，共三轮。";
    button("开始", demo);
  }
  function tide() {
    let shells = 0;
    let low = false;
    let collected = false;
    let timer;
    const token = epoch;
    const setTide = () => {
      if (signal.aborted || token !== epoch) return;
      low = !low;
      collected = false;
      field.dataset.wet = !low;
      field.textContent = low ? "🐚 退潮" : "≈ 涨潮";
      message.textContent = "已拾贝壳 " + shells + "/3";
      timer = setTimeout(setTide, low ? 2500 : 1500);
    };
    signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
    setTide();
    button("拾取贝壳", () => {
      if (!low || collected) {
        message.textContent = "等下一次退潮再拾取。";
        return;
      }
      collected = true;
      field.textContent = "✓";
      if (++shells === 3) { clearTimeout(timer); void win(); }
      else message.textContent = "已拾贝壳 " + shells + "/3，等下一次退潮。";
    });
  }
  restart();
}

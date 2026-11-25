let audioCtx = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (localStorage.getItem("shiguang-sound-muted") === "1") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

function tone(freq, dur = 0.09, type = "triangle", vol = 0.12, endFreq = null) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + dur);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  } catch {}
}

export const sfx = {
  pop: (combo = 0) => tone(420 + Math.min(combo, 8) * 65, 0.09, "triangle", 0.13, 660 + Math.min(combo, 8) * 70),
  click: () => tone(520, 0.045, "sine", 0.08, 620),
  screw: () => tone(310, 0.12, "sawtooth", 0.06, 680),
  coin: () => { tone(880, 0.07, "sine", 0.11, 1320); setTimeout(() => tone(1320, 0.11, "sine", 0.10), 55); },
  jump: (charge = 0.5) => tone(260 + charge * 260, 0.14, "sine", 0.11, 520 + charge * 280),
  thud: () => tone(150, 0.11, "triangle", 0.14, 72),
  win: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, "triangle", 0.12), i * 85)); },
  fail: () => { [330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.16, "sawtooth", 0.08), i * 110)); }
};

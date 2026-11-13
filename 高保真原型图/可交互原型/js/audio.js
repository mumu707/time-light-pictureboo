/**
 * 《拾光绘本：万物有灵》—— Web Audio 纯程序化音效合成引擎 (Zero-Asset Sound Engine)
 * File: js/audio.js
 * 
 * 核心特性：
 * 1. 零外部音频素材依赖：100% 纯代码基于 Web Audio API 物理建模与数学包络实时合成。
 * 2. 经典拟真快门 (playShutter)：三阶段声学模型（帘片升起 650Hz->70Hz 三角波、叶片闭合 240Hz->45Hz 正弦波、过片弹簧 1400Hz 滤波白噪）。
 * 3. 拟物按键咔哒声 (playClick)：阻尼金属旋钮与拨片快速衰减正弦波 (默认 600Hz)。
 * 4. 纸艺翻页沙沙声 (playPaperRustle)：多重带通/高通白噪微脉冲模拟棉浆水彩纸纤维摩擦。
 * 5. 灵魂唤灵仪式 (playSoulInfusion)：金印下沉重音 + 5音阶上升风铃琶音 (E5, G5, A5, B5, D6, E6) + 闪烁高频混响。
 * 6. 场景抽屉划出呼啸声 (playWhoosh)：低通动态扫频呼啸模拟纸板高速划过空气。
 * 7. 移动端/Safari 手势静音解除：首次 user gesture (click/touchstart/keydown) 自动唤醒 AudioContext。
 */

(function (global) {
  "use strict";

  let audioCtx = null;
  let isMuted = false;
  let isUnlocked = false;

  /**
   * 安全获取或初始化全局单例 AudioContext
   */
  function getAudioContext() {
    if (typeof window === "undefined") return null;
    try {
      if (!audioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) {
          audioCtx = new AudioCtxClass();
        }
      }
      // 若处于挂起状态且不是被静音，尝试 resume
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }
    } catch (e) {
      // 容错（如 headless 环境）
    }
    return audioCtx;
  }

  /**
   * 监听首次用户交互以解锁音频上下文 (解决 iOS Safari / Chrome 自动播放限制)
   */
  function setupUserGestureUnlock() {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function" || isUnlocked) return;
    const unlockEvents = ["click", "touchstart", "touchend", "keydown", "pointerdown"];

    const handleUnlock = function () {
      const ctx = getAudioContext();
      if (ctx) {
        if (ctx.state === "suspended") {
          ctx.resume().then(() => {
            isUnlocked = true;
          }).catch(() => {});
        } else {
          isUnlocked = true;
        }
      }
      unlockEvents.forEach(evt => {
        if (typeof window.removeEventListener === "function") {
          window.removeEventListener(evt, handleUnlock, { capture: true });
        }
      });
    };

    unlockEvents.forEach(evt => {
      window.addEventListener(evt, handleUnlock, { capture: true, passive: true });
    });
  }

  // 立即注册解锁监听
  setupUserGestureUnlock();

  /**
   * 1. 拟真机械快门音效 (Mechanical Shutter)
   * 包含帘片升起、快门叶片闭合撞击与机械齿轮过片弹簧回弹三个物理阶段
   */
  function playShutter() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // 阶段 1: 机械快门帘片升起 (高频清脆三角波 650Hz -> 70Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(650, now);
      osc1.frequency.exponentialRampToValueAtTime(70, now + 0.035);
      gain1.gain.setValueAtTime(0.65, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.035);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.035);

      // 阶段 2: 快门叶片闭合撞击 (低频沉实正弦波 240Hz -> 45Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(240, now + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(45, now + 0.11);
      gain2.gain.setValueAtTime(0.75, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.11);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.11);

      // 阶段 3: 机械过片齿轮弹簧微声 (1400Hz 带通白噪)
      const bufferSize = Math.floor(ctx.sampleRate * 0.12);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.035));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1400;
      filter.Q.value = 3.0;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.22, now + 0.07);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.19);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now + 0.07);
      noise.stop(now + 0.19);

    } catch (e) {
      // 捕获降级
    }
  }

  /**
   * 2. 拟物金属阻尼按键与拨盘咔哒声 (Mechanical Click)
   */
  function playClick(frequency = 600) {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, now);
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.35, now + 0.025);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.025);
    } catch (e) {}
  }

  /**
   * 3. 棉浆水彩纸纤维翻页沙沙声 (Paper Rustle)
   */
  function playPaperRustle() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const duration = 0.18;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const envelope = Math.sin((i / bufferSize) * Math.PI);
        data[i] = (Math.random() * 2 - 1) * envelope;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.linearRampToValueAtTime(1400, now + duration * 0.5);
      filter.frequency.linearRampToValueAtTime(750, now + duration);
      filter.Q.value = 1.2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    } catch (e) {}
  }

  /**
   * 4. 万物有灵 · 灵魂唤灵仪式风铃与印记重音 (Soul Infusion)
   * 金色印章重击沉底 -> 6 音阶上升琶音 (E5, G5, A5, B5, D6, E6) -> 高频微光泛音
   */
  function playSoulInfusion() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // 阶段 1: 印章落下沉重敲击 (低频正弦波 160Hz -> 50Hz)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(160, now);
      subOsc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
      subGain.gain.setValueAtTime(0.7, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.15);

      // 阶段 2: 五维光流上升风铃琶音 (五声音阶升阶)
      const pentatonicNotes = [659.25, 783.99, 880.00, 987.77, 1174.66, 1318.51];
      pentatonicNotes.forEach((freq, idx) => {
        const noteTime = now + 0.06 + idx * 0.055;

        // 基波
        const bell = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bell.type = "sine";
        bell.frequency.setValueAtTime(freq, noteTime);

        // 晶莹微光包络
        bellGain.gain.setValueAtTime(0.0, noteTime);
        bellGain.gain.linearRampToValueAtTime(0.22, noteTime + 0.015);
        bellGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.85);

        bell.connect(bellGain);
        bellGain.connect(ctx.destination);

        bell.start(noteTime);
        bell.stop(noteTime + 0.85);

        // 高阶清脆微弱泛音倍频
        const overtone = ctx.createOscillator();
        const overtoneGain = ctx.createGain();
        overtone.type = "triangle";
        overtone.frequency.setValueAtTime(freq * 2.75, noteTime);

        overtoneGain.gain.setValueAtTime(0.08, noteTime);
        overtoneGain.gain.exponentialRampToValueAtTime(0.0005, noteTime + 0.45);

        overtone.connect(overtoneGain);
        overtoneGain.connect(ctx.destination);

        overtone.start(noteTime);
        overtone.stop(noteTime + 0.45);
      });

    } catch (e) {}
  }

  /**
   * 5. 抽屉拉开 / 立体书呼啸翻开风声 (Whoosh)
   */
  function playWhoosh() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const duration = 0.24;

      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(250, now);
      filter.frequency.exponentialRampToValueAtTime(1800, now + 0.09);
      filter.frequency.exponentialRampToValueAtTime(300, now + duration);
      filter.Q.value = 1.8;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    } catch (e) {}
  }

  // 挂载至全局对象
  const SoundEngine = {
    playShutter,
    playClick,
    playPaperRustle,
    playSoulInfusion,
    playWhoosh,
    // 状态控制
    setMuted(muted) {
      isMuted = !!muted;
    },
    toggleMute() {
      isMuted = !isMuted;
      return isMuted;
    },
    isMuted() {
      return isMuted;
    },
    unlockAudio() {
      getAudioContext();
    }
  };

  global.SoundEngine = SoundEngine;
  // 保持旧样稿与测试用例函数兼容
  global.playShutterSound = playShutter;
  global.playClickSound = playClick;

})(typeof window !== "undefined" ? window : globalThis);

"use strict";

const byId = id => document.getElementById(id);
const ui = {
  source: byId("camera-source"),
  filmPicker: byId("film-picker"),
  filmTray: byId("film-tray"),
  filmTabs: byId("film-tabs"),
  filmRolls: byId("film-rolls"),
  specialLens: byId("special-lens"),
  paperPicker: byId("paper-picker"),
  lensPreview: byId("lens-preview"),
  ratio: byId("ratio"),
  flash: byId("flash"),
  video: byId("video"),
  finder: byId("viewfinder"),
  window: byId("finder-window"),
  frame: byId("capture-frame"),
  filmOverlay: byId("film-fx-overlay"),
  ccdDateStamp: byId("ccd-date-stamp"),
  prompt: byId("camera-prompt"),
  promptText: byId("camera-prompt-text"),
  retryCamera: byId("retry-camera"),
  developingOverlay: byId("developing-overlay"),
  grid: byId("grid-guide"),
  focus: byId("focus-mark"),
  countdown: byId("countdown"),
  halfStatus: byId("half-status"),
  flashFrame: byId("flash-frame"),
  toast: byId("toast"),
  latest: byId("latest"),
  shutter: byId("shutter"),
  quickPopover: byId("quick-popover"),
  quickTitle: byId("quick-title"),
  quickBody: byId("quick-body"),
};

const rolls = window.ROLLS_DATA;
const customStore = window.CustomRollsStore;
const allAvailableRolls = () => (window.getAllRolls ? window.getAllRolls() : rolls);
const categories = {
  fresh: "富士日系",
  cinema: "电影夜景",
  mono: "专业黑白",
  retro: "玩趣复古",
  custom: "自定义"
};
const recommended = ["01", "02", "05", "06", "11", "12", "08"];
const filmRolls = [
  ...recommended.map(id => rolls.find(roll => roll.id === id)),
  ...rolls.filter(roll => !recommended.includes(roll.id))
];
const shortRollNames = {
  "06": "Chrome 64", "13": "Industrial", "18": "Aerocolor", "19": "E100",
  "24": "Kentmere", "25": "Acros II", "26": "Lomo 400", "27": "Metro", "31": "Half",
  "33": "Cine 400D", "34": "Phoenix", "35": "LomoPurple", "36": "Astia",
  "37": "Vista 200", "38": "Ortho 80", "39": "50D", "40": "CyberNeon"
};
const formats = CameraPhoto.formats;
const aspects = { "4:3": .75, "1:1": 1, "16:9": 9 / 16, "65:24": 65 / 24, "半格": .75 };

function readPreferences() {
  try {
    return JSON.parse(localStorage.getItem("shiguang-camera-preferences")) || {};
  } catch {
    return {};
  }
}

const preferences = readPreferences();
const state = {
  format: Object.hasOwn(formats, preferences.format) ? preferences.format : "JPG",
  ratio: Object.hasOwn(aspects, preferences.ratio) ? preferences.ratio : "4:3",
  roll: preferences.roll === null ? null : allAvailableRolls().find(roll => roll.id === preferences.roll) || rolls[0],
  lens: Object.hasOwn(CameraLens.choices, preferences.lens) ? preferences.lens : "normal",
  paper: Object.hasOwn(CameraPaper.choices, preferences.paper) ? preferences.paper : "none",
  favorites: new Set(Array.isArray(preferences.favorites) ? preferences.favorites : []),
  grid: preferences.grid === true,
  timer: preferences.timer === true ? 3 : [3, 10].includes(preferences.timer) ? preferences.timer : 0,
  sound: preferences.sound !== false,
  autoSaveGallery: preferences.autoSaveGallery !== false,
  category: "film",
  zoom: 1,
  flash: false,
  stream: null,
  front: preferences.front === true,
  switching: false,
  capturing: false,
  controlling: false,
  halfFrame: null
};

let toastTimeout;
let focusTimeout;
let latestUrl;
let cameraRequest = 0;
let pendingCameraReady = false;
let captureTimer;
let latestRefresh = 0;
let lensAnimation = 0;
let lastVideoTime = -1;
let lastLensRenderTime = 0;
let lastLensSignature = "";
let quickTrigger = null;
const previewSource = document.createElement("canvas");
const stickerPicker = byId("sticker-picker");
const cameraStickers = CameraStickers.create(byId("camera-sticker-layer"), stickerPicker);

function savePreferences() {
  try {
    const { format, ratio, roll, lens, paper, favorites, grid, timer, sound, autoSaveGallery, front } = state;
    localStorage.setItem("shiguang-camera-preferences", JSON.stringify({
      format, ratio, roll: roll?.id ?? null, lens, paper, favorites: [...favorites], grid, timer, sound, autoSaveGallery, front
    }));
  } catch {
    // The camera remains usable when the browser disallows preference storage.
  }
}

function setIcon(element, name) {
  element.innerHTML = window.SVG_ICONS[name];
  element.setAttribute("aria-hidden", "true");
}
document.querySelectorAll("[data-icon]").forEach(element => setIcon(element, element.dataset.icon));

function pressed(button, selected) {
  button.setAttribute("aria-pressed", String(selected));
}

function toast(message) {
  clearTimeout(toastTimeout);
  ui.toast.textContent = message;
  ui.toast.hidden = false;
  toastTimeout = setTimeout(() => { ui.toast.hidden = true; }, 2300);
}

function currentTrack() {
  return state.stream?.getVideoTracks()[0];
}

function supportsTorch() {
  return currentTrack()?.getCapabilities?.().torch === true;
}

function hasHardwareUltraWide() {
  const minZoom = currentTrack()?.getCapabilities?.().zoom?.min;
  return typeof minZoom === "number" && minZoom <= .55;
}

function targetScaleForZoom(zoom) {
  if (state.stream && hasHardwareUltraWide()) return zoom;
  // Reserve 1.32x sensor headroom at 1x so 0.5x reveals the widest uncropped frame on standard lenses.
  return { .5: 1, 1: 1.32, 2: 2.64 }[zoom] || zoom;
}

function mediaScale() {
  const targetScale = targetScaleForZoom(state.zoom);
  if (state.stream) return Math.max(1, targetScale / (currentTrack()?.getSettings().zoom || 1));
  return targetScale;
}

function fillLight() {
  return state.flash && !supportsTorch() ? 1.16 : 1;
}

function activeRoll() {
  return studioCompareOriginal ? null : (studioPreviewRoll || state.roll);
}

function photoFilter() {
  return CameraPhoto.filter(activeRoll(), 0, fillLight());
}

function frameOptions() {
  return { scale: mediaScale(), positionY: .5, mirror: state.front };
}

function formatCcdDate() {
  const now = new Date();
  return `'${String(now.getFullYear()).slice(-2)} ${String(now.getMonth() + 1).padStart(2, "0")} ${String(now.getDate()).padStart(2, "0")}`;
}

function drawLensPreview() {
  if (!state.stream || !ui.video.videoWidth || !ui.frame.clientWidth || !ui.frame.clientHeight) {
    ui.lensPreview.hidden = true;
    return;
  }
  const extent = Math.max(ui.frame.clientWidth, ui.frame.clientHeight);
  const previewMax = Math.max(280, Math.min(384, Math.round(extent)));
  const source = CameraPhoto.fromView(ui.video, ui.window, ui.frame, {
    ...frameOptions(), maxDimension: previewMax, target: previewSource
  });
  CameraLens.draw(source, ui.lensPreview, [state.lens], previewMax);
  ui.lensPreview.style.filter = photoFilter();
  ui.lensPreview.hidden = false;
}

function nextLensFrame(now = performance.now()) {
  lensAnimation = 0;
  if (!state.stream || !needsPreview() || document.hidden || byId("camera-screen").hidden) return;
  if (ui.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    const roll = activeRoll();
    const signature = `${state.lens}:${roll?.id || ""}:${roll?.cssFilter || ""}:${state.zoom}:${state.ratio}:${state.front}`;
    if (signature !== lastLensSignature || (now - lastLensRenderTime >= 36 && ui.video.currentTime !== lastVideoTime)) {
      drawLensPreview();
      lastVideoTime = ui.video.currentTime;
      lastLensRenderTime = now;
      lastLensSignature = signature;
    }
  }
  lensAnimation = requestAnimationFrame(nextLensFrame);
}

function needsPreview() {
  return state.lens !== "normal";
}

function updateLensPreview() {
  if (!needsPreview() || !state.stream) {
    if (lensAnimation) cancelAnimationFrame(lensAnimation);
    lensAnimation = 0;
    lastLensSignature = "";
  }
  if (!needsPreview() || !state.stream) {
    ui.lensPreview.hidden = true;
    return;
  }
  if (ui.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    drawLensPreview();
    const roll = activeRoll();
    lastVideoTime = ui.video.currentTime;
    lastLensSignature = `${state.lens}:${roll?.id || ""}:${roll?.cssFilter || ""}:${state.zoom}:${state.ratio}:${state.front}`;
  } else {
    ui.lensPreview.hidden = true;
  }
  if (!lensAnimation) lensAnimation = requestAnimationFrame(nextLensFrame);
}

function updateView() {
  const roll = activeRoll();
  const filmName = roll?.name || "原色";
  byId("current-film").textContent = shortRollNames[roll?.id] || filmName;
  ui.filmPicker.setAttribute("aria-description", `当前胶卷 ${filmName}`);
  styleCanister(ui.filmPicker.querySelector(".canister"), roll);
  ui.paperPicker.textContent = state.paper === "none" ? "相纸" : CameraPaper.choices[state.paper];
  ui.paperPicker.classList.toggle("active", state.paper !== "none");
  ui.paperPicker.setAttribute("aria-description", `当前相纸 ${CameraPaper.choices[state.paper]}`);
  ui.paperPicker.disabled = state.capturing;
  ui.ratio.textContent = state.ratio;
  ui.ratio.setAttribute("aria-description", `当前画幅 ${state.ratio}`);
  ui.finder.style.setProperty("--aspect", aspects[state.ratio]);
  ui.finder.dataset.paper = state.paper;
  updatePaperFrame();
  ui.finder.style.setProperty("--scale", mediaScale());
  ui.finder.style.setProperty("--mirror", state.front ? -1 : 1);
  ui.video.style.filter = photoFilter();
  ui.lensPreview.style.filter = photoFilter();
  ui.frame.classList.toggle("is-default", state.ratio === "4:3");
  ui.grid.hidden = !state.grid;
  ui.source.setAttribute("aria-label", "切换镜头");
  setIcon(ui.source.firstElementChild, "rotate");
  ui.source.disabled = state.switching || state.capturing;
  ui.prompt.hidden = Boolean(state.stream);
  ui.promptText.textContent = state.switching ? "正在开启相机…" : "请开启相机权限以开始拍摄";
  ui.retryCamera.hidden = state.switching;
  ui.flash.classList.toggle("active", state.flash);
  ui.flash.setAttribute("aria-description", state.flash ? "补光已开启" : "补光已关闭");
  setIcon(ui.flash.firstElementChild, state.flash ? "flashOn" : "flashOff");
  document.querySelectorAll("[data-zoom]").forEach(button => {
    pressed(button, Number(button.dataset.zoom) === state.zoom);
    button.disabled = state.switching || state.controlling;
  });
  ui.filmPicker.disabled = state.capturing;
  ui.filmTray.inert = state.capturing;
  ui.specialLens.disabled = state.capturing;
  ui.specialLens.textContent = state.lens === "normal" ? "镜头" : CameraLens.choices[state.lens];
  ui.specialLens.setAttribute("aria-description", `当前镜头 ${CameraLens.choices[state.lens]}`);
  ui.specialLens.classList.toggle("active", state.lens !== "normal");
  ui.filmOverlay.dataset.vignette = String(roll?.vignette || 0);
  ui.filmOverlay.dataset.leak = String((roll?.leak && roll?.category !== "专业黑白") ? 1 : 0);
  ui.filmOverlay.dataset.halation = String((roll?.halation || roll?.id === "16" || roll?.id === "14" || roll?.id === "32" || roll?.id === "33" || roll?.id === "34") ? 1 : 0);
  const sh = Number(roll?.customTone?.shR || 0);
  const hi = Number(roll?.customTone?.hiR || 0);
  if ((sh || hi) && !roll?.customTone?.isMono) {
    const hiTint = hi >= 0 ? `rgb(255 190 120 / ${(hi * 0.008).toFixed(3)})` : `rgb(125 185 255 / ${(-hi * 0.008).toFixed(3)})`;
    const shTint = sh >= 0 ? `rgb(245 160 95 / ${(sh * 0.008).toFixed(3)})` : `rgb(90 145 235 / ${(-sh * 0.008).toFixed(3)})`;
    ui.filmOverlay.style.backgroundImage = `linear-gradient(180deg, ${hiTint}, ${shTint})`;
  } else {
    ui.filmOverlay.style.backgroundImage = "";
  }
  ui.ccdDateStamp.hidden = !roll?.isCCD;
  if (roll?.isCCD) ui.ccdDateStamp.textContent = formatCcdDate();
  ui.halfStatus.hidden = state.ratio !== "半格";
  ui.halfStatus.disabled = !state.halfFrame || state.capturing;
  ui.halfStatus.textContent = state.halfFrame ? "1 / 2 · 重拍第一格" : "0 / 2 · 半格";
  ui.shutter.disabled = !state.stream || state.switching || state.capturing || state.controlling;
  updateLensPreview();
}

function stopStream() {
  state.stream?.getTracks().forEach(track => track.stop());
  state.stream = null;
  state.flash = false;
  ui.video.srcObject = null;
  ui.video.hidden = true;
  updateView();
}

function suspendCamera() {
  cameraRequest++;
  captureTimer?.abort();
  closeQuickPopover();
  if (studioDraft) closeCustomStudio();
  stopStream();
}

async function openMediaStream(facing, strict) {
  const facingConstraint = strict ? { exact: facing } : { ideal: facing };
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: facingConstraint,
        width: { ideal: 2560 },
        height: { ideal: 1920 }
      },
      audio: false
    });
  } catch (err) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") throw err;
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing } },
      audio: false
    });
  }
}

async function configureTrackSharpness(track) {
  try {
    const caps = track.getCapabilities?.();
    if (!caps) return;
    const advanced = {};
    if (caps.focusMode?.includes("continuous")) advanced.focusMode = "continuous";
    if (caps.exposureMode?.includes("continuous")) advanced.exposureMode = "continuous";
    if (caps.whiteBalanceMode?.includes("continuous")) advanced.whiteBalanceMode = "continuous";
    if (Object.keys(advanced).length) {
      await track.applyConstraints({ advanced: [advanced] });
    }
  } catch {
    // Ignore when hardware does not support continuous mode constraints.
  }
}

async function connectCamera(targetFront, request, strictFacing = false) {
  const facing = targetFront ? "user" : "environment";
  const stream = await openMediaStream(facing, strictFacing);
  if (request !== cameraRequest) {
    stream.getTracks().forEach(track => track.stop());
    return;
  }
  state.stream = stream;
  const track = currentTrack();
  const actualFacing = track.getSettings().facingMode;
  state.front = actualFacing ? actualFacing === "user" : targetFront;
  state.zoom = 1;
  track.addEventListener("ended", () => {
    if (track !== currentTrack()) return;
    suspendCamera();
    toast("相机已断开，请点击开启相机");
  }, { once: true });
  ui.video.srcObject = stream;
  ui.video.hidden = false;
  await ui.video.play();
  if (request !== cameraRequest) return;
  void configureTrackSharpness(track);
}

async function startDeviceCamera(targetFront = state.front, strictFacing = false) {
  if (state.switching || state.capturing) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    toast("请在安全的浏览器页面开启相机");
    return;
  }
  const previousFront = state.front;
  const hadStream = Boolean(state.stream);
  const request = ++cameraRequest;
  state.switching = true;
  stopStream();
  try {
    await connectCamera(targetFront, request, strictFacing);
    if (request === cameraRequest && state.stream) {
      savePreferences();
    }
  } catch (error) {
    if (request !== cameraRequest) return;
    stopStream();
    if (hadStream && targetFront !== previousFront) {
      try {
        await connectCamera(previousFront, request, false);
        if (request === cameraRequest) toast("未检测到另一颗镜头，已恢复当前镜头");
        return;
      } catch {
        stopStream();
      }
    }
    toast(error.name === "NotAllowedError" ? "相机权限未开启，请先授权相机权限" : "相机暂不可用，请重试");
  } finally {
    state.switching = false;
    updateView();
    if (pendingCameraReady && !state.stream && !state.capturing && !byId("camera-screen").hidden) {
      pendingCameraReady = false;
      void startDeviceCamera(state.front, false);
    }
  }
}

async function toggleCameraFacing() {
  if (state.switching || state.capturing) return;
  closeQuickPopover();
  if (!state.stream) {
    await startDeviceCamera(state.front, false);
    return;
  }
  const nextFront = !state.front;
  await startDeviceCamera(nextFront, true);
}

async function resumeCamera() {
  if (byId("camera-screen").hidden || state.stream || state.switching) return;
  await startDeviceCamera(state.front, false);
}

async function controlTrack(values) {
  const track = currentTrack();
  if (!track || state.controlling || state.capturing || state.switching) return null;
  state.controlling = true;
  updateView();
  try {
    const constraints = track.getConstraints();
    const previous = Object.assign({}, ...(constraints.advanced || []));
    await track.applyConstraints({ ...constraints, advanced: [{ ...previous, ...values }] });
    return track === currentTrack() ? track.getSettings() : null;
  } finally {
    state.controlling = false;
    updateView();
  }
}

async function setFlash(enabled) {
  if (state.switching || state.capturing || state.controlling || enabled === state.flash) return;
  if (state.stream && supportsTorch()) {
    try {
      const settings = await controlTrack({ torch: enabled });
      if (!settings) return;
      if (settings.torch !== enabled) throw new Error("补光灯未响应");
    } catch {
      toast("补光灯暂不可用");
      return;
    }
  }
  state.flash = enabled;
  updateView();
}

async function selectZoom(zoom) {
  if (state.capturing || state.switching || state.controlling) return;
  const range = currentTrack()?.getCapabilities?.().zoom;
  const targetScale = targetScaleForZoom(zoom);
  if (range) {
    try {
      const requested = Math.min(range.max, Math.max(range.min, targetScale));
      await controlTrack({ zoom: requested });
    } catch {
      // Fallback to digital FOV scaling via mediaScale() when hardware zoom constraint is rejected.
    }
  }
  state.zoom = zoom;
  updateView();
}

async function focusAt(event) {
  const track = currentTrack();
  const capabilities = track?.getCapabilities?.();
  if (!track || !capabilities?.focusMode?.includes("single-shot") ||
      !navigator.mediaDevices.getSupportedConstraints().pointsOfInterest) return;
  const bounds = ui.frame.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;
  if (!ui.video.videoWidth || !bounds.width || !bounds.height) return;
  const point = CameraLens.sourcePoint(state.lens, x * 2 / bounds.width - 1, y * 2 / bounds.height - 1,
    bounds.width, bounds.height);
  if (!point) return;
  const rect = CameraPhoto.sourceRect(ui.video.videoWidth, ui.video.videoHeight, ui.window.clientWidth, ui.window.clientHeight, mediaScale());
  const normalized = {
    x: .5 + point.x * bounds.width / 2 * (state.front ? -1 : 1) / rect.scale / ui.video.videoWidth,
    y: .5 + point.y * bounds.height / 2 / rect.scale / ui.video.videoHeight
  };
  try {
    const result = await controlTrack({ focusMode: "single-shot", pointsOfInterest: [normalized] });
    if (result?.focusMode !== "single-shot") return;
    ui.focus.style.left = `${x}px`;
    ui.focus.style.top = `${y}px`;
    ui.focus.hidden = false;
    clearTimeout(focusTimeout);
    focusTimeout = setTimeout(() => { ui.focus.hidden = true; }, 950);
  } catch {
    toast("此镜头无法在该位置对焦");
  }
}

function showLatest(blob) {
  if (latestUrl) URL.revokeObjectURL(latestUrl);
  latestUrl = blob ? URL.createObjectURL(blob) : null;
  if (latestUrl) ui.latest.src = latestUrl;
  else ui.latest.removeAttribute("src");
  ui.latest.hidden = !latestUrl;
  ui.latest.previousElementSibling.hidden = Boolean(latestUrl);
}

async function refreshLatest() {
  const request = ++latestRefresh;
  const { items } = await CameraAlbum.list(null, 1);
  if (request === latestRefresh) showLatest(items[0]?.thumbnail);
}

function pauseForSecond(signal) {
  return new Promise(resolve => {
    const stop = () => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", stop);
      resolve();
    };
    const timeout = setTimeout(stop, 1000);
    signal.addEventListener("abort", stop, { once: true });
  });
}

async function persistPhoto(source, recipe, ratio, origin) {
  const processed = await CameraPhoto.render(source, recipe);
  const rollNames = (recipe.frames || [recipe]).map(frame => frame.roll?.name || "原色");
  const photo = {
    ...processed, ratio, origin, id: crypto.randomUUID(), timestamp: Date.now(),
    format: recipe.format, roll: [...new Set(rollNames)].join(" / "), rollNames,
    ev: recipe.ev, light: recipe.light, lenses: recipe.lenses, paper: recipe.paper
  };
  try {
    await CameraAlbum.save(photo);
  } catch {
    CameraGallery.openUnsaved(photo);
    return;
  }
  void refreshLatest().catch(() => {});
  if (state.autoSaveGallery && window.TimeLightBridge?.saveToSystemGallery) {
    const ext = recipe.format === "PNG" ? "png" : "jpg";
    void window.TimeLightBridge.saveToSystemGallery(
      photo.blob,
      `TimeLight-${photo.timestamp}.${ext}`,
      { silent: true }
    ).then(saved => {
      if (saved) toast("已存入相册并保存到本地");
    }).catch(() => {});
  }
  toast("已存入相册");
}

async function capture() {
  if (state.capturing || state.switching || state.controlling || !state.stream) return;
  state.capturing = true;
  cameraStickers.lock(true);
  const timer = new AbortController();
  captureTimer = timer;
  if (state.sound) window.SoundEngine?.unlockAudio();
  updateView();
  try {
    for (let remaining = state.timer; remaining > 0 && !timer.signal.aborted; remaining--) {
      ui.countdown.firstElementChild.textContent = remaining;
      ui.countdown.hidden = false;
      await pauseForSecond(timer.signal);
    }
    ui.countdown.hidden = true;
    if (timer.signal.aborted) return;

    const stream = state.stream;
    if (!stream || currentTrack()?.readyState !== "live") throw new Error("相机已断开");
    const ratio = state.ratio;
    const origin = "相机";
    const recipe = { roll: state.roll, ev: 0, light: fillLight(),
      format: state.format, paper: state.paper, stickers: cameraStickers.snapshot(),
      paperAspect: ratio === "半格" ? aspects[ratio] * 2 + .01 : aspects[ratio] };
    const frame = CameraPhoto.fromView(ui.video, ui.window, ui.frame, frameOptions());
    if (state.sound) window.SoundEngine?.playShutter();
    ui.flashFrame.classList.remove("firing");
    void ui.flashFrame.offsetWidth;
    ui.flashFrame.classList.add("firing");

    const first = state.halfFrame;
    if (ratio === "半格" && !first) {
      state.halfFrame = { frame, origin, lens: state.lens, roll: recipe.roll, light: recipe.light, stickers: recipe.stickers };
      return;
    }
    const source = ratio === "半格" ? CameraPhoto.combine(first.frame, frame) : frame;
    if (ratio === "半格") recipe.frames = [first, recipe];
    recipe.lenses = ratio === "半格" ? [first.lens, state.lens] : [state.lens];
    ui.developingOverlay.hidden = false;
    await new Promise(resolve => requestAnimationFrame(resolve));
    await persistPhoto(source, recipe, ratio, origin);
    if (ratio === "半格" && state.halfFrame === first) state.halfFrame = null;
  } catch (error) {
    toast(error.message || "拍摄未完成，请重试");
  } finally {
    ui.developingOverlay.hidden = true;
    ui.countdown.hidden = true;
    captureTimer = undefined;
    state.capturing = false;
    cameraStickers.lock(false);
    updateView();
  }
}

function paragraph(text) {
  const element = document.createElement("p");
  element.textContent = text;
  return element;
}

function action(text, onClick, primary = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = primary ? "panel-action primary" : "panel-action";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function actions(...buttons) {
  const row = document.createElement("div");
  row.className = "panel-actions";
  row.append(...buttons);
  return row;
}

function closeQuickPopover(restoreFocus = false) {
  if (!quickTrigger) return;
  const trigger = quickTrigger;
  quickTrigger = null;
  trigger.setAttribute("aria-expanded", "false");
  ui.quickPopover.hidden = true;
  ui.quickBody.replaceChildren();
  if (restoreFocus) trigger.focus({ preventScroll: true });
}

function toggleQuickPopover(event, title, content) {
  const trigger = event.currentTarget;
  if (quickTrigger === trigger) {
    closeQuickPopover();
    return false;
  }
  closeQuickPopover();
  if (!ui.filmTray.hidden) setFilmTray(false);
  quickTrigger = trigger;
  trigger.setAttribute("aria-expanded", "true");
  ui.quickTitle.textContent = title;
  ui.quickPopover.dataset.menu = trigger.id;
  content(ui.quickBody);
  ui.quickPopover.hidden = false;
  ui.quickPopover.scrollTop = 0;
  if (event.detail === 0) {
    const choice = ui.quickBody.querySelector('button[aria-pressed="true"]:not([disabled]), button:not([disabled]), select');
    (choice || byId("close-quick")).focus({ preventScroll: true });
  }
  return true;
}

function quickOptions(entries, current, apply) {
  const group = document.createElement("div");
  group.className = "quick-options";
  const buttons = entries.map(([key, label, disabled]) => {
    const button = action(label, async () => {
      await apply(key);
      buttons.forEach(([value, option]) => pressed(option, value === current()));
    });
    button.className = "choice";
    button.disabled = Boolean(disabled);
    pressed(button, key === current());
    group.append(button);
    return [key, button];
  });
  return group;
}

function showRatioPicker(event) {
  toggleQuickPopover(event, "画面比例", body => {
    const entries = Object.keys(aspects).map(ratio => [ratio, ratio]);
    body.append(quickOptions(entries, () => state.ratio, ratio => {
      if (ratio !== "半格" && state.halfFrame) {
        state.halfFrame = null;
        toast("已结束本次半格拍摄");
      }
      state.ratio = ratio;
      savePreferences();
      updateView();
    }));
  });
}

function showLensPicker(event) {
  toggleQuickPopover(event, "特效镜头", body => {
    body.append(quickOptions(Object.entries(CameraLens.choices), () => state.lens, lens => {
      state.lens = lens;
      savePreferences();
      updateView();
    }));
  });
}

function showPaperPicker(event) {
  toggleQuickPopover(event, "相纸", body => {
    const choices = quickOptions(Object.entries(CameraPaper.choices), () => state.paper, paper => {
      state.paper = paper;
      savePreferences();
      updateView();
    });
    choices.classList.add("paper-options");
    choices.querySelectorAll(".choice").forEach((button, index) => {
      const swatch = document.createElement("span");
      swatch.className = "paper-swatch";
      swatch.dataset.paper = Object.keys(CameraPaper.choices)[index];
      swatch.setAttribute("aria-hidden", "true");
      button.prepend(swatch);
    });
    body.append(choices, paragraph("相纸边框会随照片一起保存。"));
    if (state.ratio === "半格") body.append(paragraph("相纸包裹整张半格照片，以第二次快门时的选择为准。"));
  });
}

function showFlashPicker(event) {
  toggleQuickPopover(event, "补光", body => {
    const unavailable = Boolean(state.stream) && !supportsTorch();
    body.append(quickOptions([[false, "关闭"], [true, "开启"]], () => state.flash, setFlash));
    if (unavailable) body.append(paragraph("当前镜头不支持补光灯。"));
  });
}

function showSettings(event) {
  toggleQuickPopover(event, "相机设置", body => {
    const timer = document.createElement("select");
    timer.setAttribute("aria-label", "定时拍摄");
    timer.add(new Option("关闭", "0"));
    timer.add(new Option("3 秒", "3"));
    timer.add(new Option("10 秒", "10"));
    timer.value = String(state.timer);
    timer.addEventListener("change", () => {
      state.timer = Number(timer.value);
      savePreferences();
    });
    const timerRow = document.createElement("label");
    timerRow.className = "panel-row";
    timerRow.append("定时拍摄", timer);
    window.TimeLightSelect?.enhance(timer, "graphite");
    body.append(timerRow);
    const format = document.createElement("select");
    format.setAttribute("aria-label", "照片格式");
    for (const value of Object.keys(formats)) format.add(new Option(value, value));
    format.value = state.format;
    format.addEventListener("change", () => {
      state.format = format.value;
      savePreferences();
    });
    const formatRow = document.createElement("label");
    formatRow.className = "panel-row";
    formatRow.append("照片格式", format);
    window.TimeLightSelect?.enhance(format, "graphite");
    body.append(formatRow);
    for (const [key, label] of [["grid", "构图网格"], ["sound", "快门声音"], ["autoSaveGallery", "拍照自动存入手机相册"]]) {
      const row = document.createElement("label");
      row.className = "panel-row";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = state[key];
      input.addEventListener("change", () => {
        state[key] = input.checked;
        savePreferences();
        updateView();
      });
      row.append(label, input);
      body.append(row);
    }
  });
}

function visibleRolls() {
  if (state.category === "film") return filmRolls;
  if (state.category === "custom") return customStore ? customStore.list() : [];
  if (state.category === "favorites") return allAvailableRolls().filter(roll => state.favorites.has(roll.id));
  return rolls.filter(roll => roll.category === categories[state.category]);
}

function setFilmTray(open) {
  if (open) closeQuickPopover();
  const returnFocus = !open && ui.filmTray.contains(document.activeElement);
  ui.filmTray.hidden = !open;
  ui.filmPicker.setAttribute("aria-expanded", String(open));
  if (open) {
    renderFilmRolls();
    const active = ui.filmRolls.querySelector(".film-choice[aria-pressed=true]");
    ui.filmRolls.scrollLeft = active ? Math.max(0, active.parentElement.offsetLeft - ui.filmRolls.clientWidth / 2) : 0;
  } else if (returnFocus) {
    ui.filmPicker.focus({ preventScroll: true });
  }
}

function chooseFilm(roll) {
  state.roll = roll;
  savePreferences();
  updateView();
  updateFilmSelection();
}

function updateFilmSelection() {
  pressed(byId("original-film"), !state.roll);
  for (const button of ui.filmRolls.querySelectorAll("[data-roll-id]")) {
    pressed(button, button.dataset.rollId === state.roll?.id);
  }
}

function styleCanister(element, roll) {
  element.style.setProperty("--roll-band", roll?.bandColor || "#d4c8ac");
  element.style.setProperty("--roll-accent", roll?.colorSwatches?.[1] || "#777263");
  element.style.setProperty("--roll-tilt", `${(Number(roll?.id || 0) % 5 - 2) * 1.5}deg`);
  element.dataset.series = { "柯达暖金": "classic", "富士日系": "fresh", "电影夜景": "cinema",
    "专业黑白": "mono", "玩趣复古": "retro", "自定义": "custom" }[roll?.category] || "original";
  element.textContent = "";
  const label = document.createElement("span");
  label.className = "canister-label";
  label.textContent = shortRollNames[roll?.id] || roll?.name || "原色";
  element.append(label);
}

function renderFilmRolls() {
  for (const tab of ui.filmTabs.querySelectorAll("[data-category]")) {
    pressed(tab, tab.dataset.category === state.category);
  }
  ui.filmRolls.replaceChildren();
  if (state.category === "custom") {
    const createCard = document.createElement("div");
    createCard.className = "film-card film-card-create";
    const createBtn = action("自制胶卷", () => openCustomStudio(null));
    createBtn.className = "film-choice";
    createBtn.setAttribute("aria-label", "新建自制胶卷");
    const plus = document.createElement("span");
    plus.className = "film-create-plus";
    plus.setAttribute("aria-hidden", "true");
    plus.textContent = "+";
    createBtn.prepend(plus);
    createCard.append(createBtn);
    ui.filmRolls.append(createCard);
  }
  for (const roll of visibleRolls()) {
    const name = shortRollNames[roll.id] || roll.name;
    const card = document.createElement("div");
    card.className = "film-card";
    const button = action(name, () => chooseFilm(roll));
    button.className = "film-choice";
    button.dataset.rollId = roll.id;
    button.setAttribute("aria-label", roll.name);
    button.setAttribute("aria-description", roll.subname);
    const cartridge = document.createElement("span");
    cartridge.className = "canister film-canister";
    cartridge.setAttribute("aria-hidden", "true");
    styleCanister(cartridge, roll);
    button.prepend(cartridge);
    card.append(button);

    if (roll.isCustom) {
      const editBtn = action("改", event => {
        event.stopPropagation();
        openCustomStudio(roll);
      });
      editBtn.className = "film-edit-btn";
      editBtn.setAttribute("aria-label", `编辑 ${roll.name}`);
      card.append(editBtn);
    }

    const favorite = action("", () => {
      if (state.favorites.has(roll.id)) state.favorites.delete(roll.id);
      else state.favorites.add(roll.id);
      savePreferences();
      if (state.category === "favorites") {
        renderFilmRolls();
        (ui.filmRolls.querySelector(".film-favorite") || ui.filmTabs.querySelector('[data-category="favorites"]')).focus();
      } else updateFavorite();
    });
    favorite.className = "film-favorite";
    const icon = document.createElement("span");
    favorite.append(icon);
    function updateFavorite() {
      const saved = state.favorites.has(roll.id);
      pressed(favorite, saved);
      favorite.setAttribute("aria-label", `${saved ? "取消收藏" : "收藏"} ${roll.name}`);
      setIcon(icon, saved ? "starFilled" : "starOutline");
    }
    updateFavorite();
    card.append(favorite);
    ui.filmRolls.append(card);
  }
  updateFilmSelection();
  if (!ui.filmRolls.children.length) {
    const empty = paragraph("点胶卷旁的星标，即可收藏。");
    empty.className = "film-empty";
    ui.filmRolls.append(empty);
  }
}

ui.source.addEventListener("click", () => void toggleCameraFacing());
ui.retryCamera.addEventListener("click", () => void startDeviceCamera(state.front, false));
ui.specialLens.addEventListener("click", showLensPicker);
ui.paperPicker.addEventListener("click", showPaperPicker);
ui.ratio.addEventListener("click", showRatioPicker);
ui.flash.addEventListener("click", showFlashPicker);
byId("settings").addEventListener("click", showSettings);
byId("close-quick").addEventListener("click", () => closeQuickPopover(true));
ui.filmPicker.addEventListener("click", event => {
  setFilmTray(ui.filmTray.hidden);
  if (!ui.filmTray.hidden && event.detail === 0) byId("original-film").focus({ preventScroll: true });
});
byId("original-film").addEventListener("click", () => chooseFilm(null));
ui.filmTabs.addEventListener("click", event => {
  const tab = event.target.closest("[data-category]");
  if (!tab) return;
  state.category = tab.dataset.category;
  renderFilmRolls();
  ui.filmRolls.scrollLeft = 0;
});
ui.filmRolls.addEventListener("wheel", event => {
  if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY) ||
      ui.filmRolls.scrollWidth <= ui.filmRolls.clientWidth) return;
  event.preventDefault();
  ui.filmRolls.scrollLeft += event.deltaY;
}, { passive: false });
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (!studioUi.root.hidden) {
    closeCustomStudio();
    return;
  }
  if (byId("camera-screen").hidden) return;
  if (quickTrigger) closeQuickPopover(true);
  else if (!ui.filmTray.hidden && !state.capturing) {
    setFilmTray(false);
  }
});
document.addEventListener("click", event => {
  const path = event.composedPath();
  if (quickTrigger && !path.includes(ui.quickPopover) && !path.includes(quickTrigger)) {
    closeQuickPopover();
  }
  if (!ui.filmTray.hidden && !path.includes(ui.filmTray) && !path.includes(ui.filmPicker)) {
    setFilmTray(false);
  }
});
byId("album").addEventListener("click", CameraGallery.open);
stickerPicker.addEventListener("click", event => {
  toggleQuickPopover(event, "拍摄贴纸", body => {
    void cameraStickers.open(body);
    body.append(actions(action("打开收藏册", CameraGallery.openCollection)));
  });
});
ui.shutter.addEventListener("click", capture);
ui.countdown.addEventListener("click", () => {
  captureTimer?.abort();
  toast("已取消定时拍摄");
});
ui.halfStatus.addEventListener("click", () => {
  state.halfFrame = null;
  updateView();
  toast("可以重拍第一格");
});
byId("lenses").addEventListener("click", event => {
  const lens = event.target.closest("[data-zoom]");
  if (!lens || lens.disabled) return;
  void selectZoom(Number(lens.dataset.zoom));
});
ui.frame.addEventListener("pointerdown", focusAt);
ui.video.addEventListener("loadeddata", updateLensPreview);
function updatePaperFrame() {
  const width = ui.finder.offsetWidth;
  const height = ui.finder.offsetHeight;
  if (!width || !height) return;
  const { side, top, bottom } = CameraPaper.layout(width, height, state.paper);
  ui.finder.style.setProperty("--paper-side", `${side}px`);
  ui.finder.style.setProperty("--paper-top", `${top}px`);
  ui.finder.style.setProperty("--paper-bottom", `${bottom}px`);
  ui.finder.style.setProperty("--paper-pitch", `${Math.max(4, Math.round(Math.min(width, height) * .07))}px`);
}

new ResizeObserver(updatePaperFrame).observe(ui.finder);
new ResizeObserver(updateLensPreview).observe(ui.frame);
window.addEventListener("pagehide", suspendCamera);
window.addEventListener("pageshow", event => {
  if (event.persisted) void resumeCamera();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (lensAnimation) {
      cancelAnimationFrame(lensAnimation);
      lensAnimation = 0;
    }
    suspendCamera();
  } else if (!byId("camera-screen").hidden) {
    void resumeCamera();
  }
});
window.addEventListener("timelight:camera-ready", () => {
  if (state.stream || state.capturing) return;
  if (state.switching) {
    pendingCameraReady = true;
    return;
  }
  void startDeviceCamera(state.front, false);
});

// Custom Film Roll Darkroom Studio
const STUDIO_COLORS = [
  "#e08b46", "#d9534f", "#5cb88a", "#4a90e2",
  "#9b6bb3", "#d4b45e", "#4b5563", "#e67e6e"
];
const STUDIO_PRESETS = {
  fresh: { name: "森屿薄荷", bandColor: "#5cb88a", exposure: 1.08, contrast: 0.96, saturate: 1.06, sepia: 0.02, hueRotate: 5, shadowTemp: -6, highlightTemp: 2, curve: 0.16, isMono: false, grain: 0, vignette: 0, halation: false, leak: false, isCCD: false },
  warm: { name: "橘子汽水", bandColor: "#e08b46", exposure: 1.04, contrast: 1.14, saturate: 1.28, sepia: 0.20, hueRotate: -6, shadowTemp: 6, highlightTemp: 11, curve: 0.24, isMono: false, grain: 1, vignette: 1, halation: true, leak: true, isCCD: false },
  cyber: { name: "霓虹雨夜", bandColor: "#9b6bb3", exposure: 1.02, contrast: 1.26, saturate: 1.40, sepia: 0.00, hueRotate: 14, shadowTemp: -12, highlightTemp: 10, curve: 0.30, isMono: false, grain: 1, vignette: 2, halation: true, leak: false, isCCD: true },
  mono: { name: "夜读银盐", bandColor: "#4b5563", exposure: 1.00, contrast: 1.34, saturate: 1.00, sepia: 0.00, hueRotate: 0, shadowTemp: 0, highlightTemp: 0, curve: 0.32, isMono: true, grain: 2, vignette: 2, halation: false, leak: false, isCCD: false }
};
const studioUi = {
  root: byId("custom-film-studio"),
  close: byId("studio-close"),
  compare: byId("studio-compare"),
  save: byId("studio-save"),
  delete: byId("studio-delete"),
  canister: byId("studio-canister"),
  name: byId("studio-name"),
  colors: byId("studio-colors"),
  exposure: byId("ctrl-exposure"),
  contrast: byId("ctrl-contrast"),
  saturate: byId("ctrl-saturate"),
  sepia: byId("ctrl-sepia"),
  hueRotate: byId("ctrl-hue"),
  shadowTemp: byId("ctrl-shadow"),
  highlightTemp: byId("ctrl-highlight"),
  curve: byId("ctrl-curve"),
  grain: byId("ctrl-grain"),
  vignette: byId("ctrl-vignette"),
  isMono: byId("ctrl-mono"),
  halation: byId("ctrl-halation"),
  leak: byId("ctrl-leak"),
  isCCD: byId("ctrl-ccd")
};
let studioDraft = null;
let studioPreviewRoll = null;
let studioCompareOriginal = false;

function syncSliderTrack(slider, text) {
  slider.style.setProperty("--attr-min", slider.min || "0");
  slider.style.setProperty("--attr-max", slider.max || "100");
  slider.style.setProperty("--control-value", slider.value);
  slider.setAttribute("aria-valuetext", text);
}

function readStudioControls() {
  if (!studioDraft) return null;
  studioDraft.name = studioUi.name.value;
  studioDraft.exposure = Number(studioUi.exposure.value);
  studioDraft.contrast = Number(studioUi.contrast.value);
  studioDraft.saturate = Number(studioUi.saturate.value);
  studioDraft.sepia = Number(studioUi.sepia.value);
  studioDraft.hueRotate = Number(studioUi.hueRotate.value);
  studioDraft.shadowTemp = Number(studioUi.shadowTemp.value);
  studioDraft.highlightTemp = Number(studioUi.highlightTemp.value);
  studioDraft.curve = Number(studioUi.curve.value);
  studioDraft.grain = Number(studioUi.grain.value);
  studioDraft.vignette = Number(studioUi.vignette.value);
  studioDraft.isMono = studioUi.isMono.checked;
  studioDraft.halation = studioUi.halation.checked;
  studioDraft.leak = studioUi.leak.checked;
  studioDraft.isCCD = studioUi.isCCD.checked;
  return customStore.buildRoll(studioDraft);
}

function syncStudioControls() {
  if (!studioDraft) return;
  studioUi.name.value = studioDraft.name || "";
  studioUi.exposure.value = String(studioDraft.exposure);
  studioUi.contrast.value = String(studioDraft.contrast);
  studioUi.saturate.value = String(studioDraft.saturate);
  studioUi.sepia.value = String(studioUi.sepia);
  studioUi.hueRotate.value = String(studioDraft.hueRotate);
  studioUi.shadowTemp.value = String(studioDraft.shadowTemp);
  studioUi.highlightTemp.value = String(studioDraft.highlightTemp);
  studioUi.curve.value = String(studioDraft.curve);
  studioUi.grain.value = String(studioDraft.grain);
  studioUi.vignette.value = String(studioDraft.vignette);
  studioUi.isMono.checked = Boolean(studioDraft.isMono);
  studioUi.halation.checked = Boolean(studioDraft.halation);
  studioUi.leak.checked = Boolean(studioDraft.leak);
  studioUi.isCCD.checked = Boolean(studioDraft.isCCD);

  const labels = [
    [studioUi.exposure, "val-exposure", Number(studioDraft.exposure).toFixed(2)],
    [studioUi.contrast, "val-contrast", Number(studioDraft.contrast).toFixed(2)],
    [studioUi.saturate, "val-saturate", Number(studioDraft.saturate).toFixed(2)],
    [studioUi.sepia, "val-sepia", `${Math.round(Number(studioDraft.sepia) * 100)}%`],
    [studioUi.hueRotate, "val-hue", `${Math.round(Number(studioDraft.hueRotate))}°`],
    [studioUi.shadowTemp, "val-shadow", `${Number(studioDraft.shadowTemp) > 0 ? "+" : ""}${Math.round(Number(studioDraft.shadowTemp))}`],
    [studioUi.highlightTemp, "val-highlight", `${Number(studioDraft.highlightTemp) > 0 ? "+" : ""}${Math.round(Number(studioDraft.highlightTemp))}`],
    [studioUi.curve, "val-curve", Number(studioDraft.curve).toFixed(2)],
    [studioUi.grain, "val-grain", ["无", "细腻", "粗颗粒"][Number(studioDraft.grain)] || "细腻"],
    [studioUi.vignette, "val-vignette", ["无", "柔和", "浓郁"][Number(studioDraft.vignette)] || "柔和"]
  ];
  for (const [slider, valId, text] of labels) {
    byId(valId).textContent = text;
    syncSliderTrack(slider, text);
  }

  for (const dot of studioUi.colors.querySelectorAll("[data-color]")) {
    pressed(dot, dot.dataset.color === studioDraft.bandColor);
  }
}

function renderStudioPreview() {
  const roll = readStudioControls();
  if (!roll) return;
  studioPreviewRoll = roll;
  syncStudioControls();
  styleCanister(studioUi.canister, roll);
  updateView();
}

function initStudioColors() {
  if (studioUi.colors.childElementCount > 0) return;
  for (const color of STUDIO_COLORS) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "studio-color-dot";
    dot.dataset.color = color;
    dot.style.background = color;
    dot.setAttribute("aria-label", `暗盒颜色 ${color}`);
    dot.addEventListener("click", () => {
      if (!studioDraft) return;
      studioDraft.bandColor = color;
      renderStudioPreview();
    });
    studioUi.colors.append(dot);
  }
}

function openCustomStudio(existingRoll = null) {
  if (!customStore) return;
  initStudioColors();
  closeQuickPopover();
  if (!ui.filmTray.hidden) setFilmTray(false);
  studioCompareOriginal = false;
  pressed(studioUi.compare, false);
  if (existingRoll?.customDraft) {
    studioDraft = { ...existingRoll.customDraft };
    studioUi.delete.hidden = false;
  } else {
    studioDraft = { ...STUDIO_PRESETS.warm, id: null, name: "" };
    studioUi.delete.hidden = true;
  }
  byId("camera-screen").classList.add("is-studio-open");
  studioUi.root.hidden = false;
  syncStudioControls();
  renderStudioPreview();
  studioUi.name.focus({ preventScroll: true });
}

function closeCustomStudio() {
  studioUi.root.hidden = true;
  byId("camera-screen").classList.remove("is-studio-open");
  studioDraft = null;
  studioPreviewRoll = null;
  studioCompareOriginal = false;
  pressed(studioUi.compare, false);
  updateView();
}

studioUi.close.addEventListener("click", closeCustomStudio);
const setCompareMode = active => {
  if (!studioDraft || studioCompareOriginal === active) return;
  studioCompareOriginal = active;
  pressed(studioUi.compare, active);
  updateView();
};
studioUi.compare.addEventListener("pointerdown", () => setCompareMode(true));
studioUi.compare.addEventListener("pointerup", () => setCompareMode(false));
studioUi.compare.addEventListener("pointercancel", () => setCompareMode(false));
studioUi.compare.addEventListener("click", event => {
  if (event.detail === 0) setCompareMode(!studioCompareOriginal);
});
studioUi.save.addEventListener("click", () => {
  if (!studioDraft || !customStore) return;
  readStudioControls();
  const saved = customStore.save(studioDraft);
  state.category = "custom";
  state.roll = saved;
  savePreferences();
  closeCustomStudio();
  renderFilmRolls();
  toast(`已应用自制胶卷「${saved.name}」`);
});
studioUi.delete.addEventListener("click", () => {
  if (!studioDraft?.id || !customStore) return;
  const removedId = studioDraft.id;
  customStore.remove(removedId);
  if (state.roll?.id === removedId) {
    state.roll = rolls[0];
    savePreferences();
  }
  closeCustomStudio();
  renderFilmRolls();
  toast("已删除自制胶卷");
});
studioUi.root.addEventListener("click", event => {
  const presetBtn = event.target.closest("[data-preset]");
  if (!presetBtn || !studioDraft) return;
  const preset = STUDIO_PRESETS[presetBtn.dataset.preset];
  if (!preset) return;
  const keepId = studioDraft.id;
  const keepName = studioUi.name.value.trim();
  studioDraft = { ...preset, id: keepId || null, name: keepName || preset.name };
  syncStudioControls();
  renderStudioPreview();
});
for (const control of [
  studioUi.name, studioUi.exposure, studioUi.contrast, studioUi.saturate,
  studioUi.sepia, studioUi.hueRotate, studioUi.shadowTemp, studioUi.highlightTemp,
  studioUi.curve, studioUi.grain, studioUi.vignette,
  studioUi.isMono, studioUi.halation, studioUi.leak, studioUi.isCCD
]) {
  control.addEventListener("input", renderStudioPreview);
  control.addEventListener("change", renderStudioPreview);
}

CameraGallery.init({
  suspendCamera,
  resumeCamera() {
    updateView();
    void resumeCamera();
  },
  refreshLatest
});
updateView();
refreshLatest().catch(() => {});
void resumeCamera();

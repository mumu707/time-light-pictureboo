"use strict";

const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { startServer } = require("./server");

function loadPlaywright() {
  for (const name of ["playwright", "playwright-core"]) {
    try {
      return require(name);
    } catch (error) {
      if (error.code !== "MODULE_NOT_FOUND") throw error;
    }
  }
  throw new Error("请先安装项目的 Playwright 开发依赖");
}

function resolveBrowserPath(chromium) {
  const envPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;
  const bundled = chromium.executablePath();
  if (bundled && fs.existsSync(bundled)) return undefined;
  const candidates = process.platform === "win32"
    ? [
        path.join(process.env["PROGRAMFILES"] || "C:/Program Files", "Google/Chrome/Application/chrome.exe"),
        path.join(process.env["PROGRAMFILES(X86)"] || "C:/Program Files (x86)", "Google/Chrome/Application/chrome.exe"),
        path.join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe"),
        path.join(process.env["PROGRAMFILES(X86)"] || "C:/Program Files (x86)", "Microsoft/Edge/Application/msedge.exe"),
        path.join(process.env["PROGRAMFILES"] || "C:/Program Files", "Microsoft/Edge/Application/msedge.exe")
      ]
    : process.platform === "darwin"
      ? [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
        ]
      : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  return candidates.find(candidate => candidate && fs.existsSync(candidate));
}

async function verifyUpgrade(browser, origin) {
  const page = await browser.newPage();
  try {
    await page.goto(`${origin}/camera/camera.css`);
    await page.evaluate(async () => {
      const png = await (await fetch("/camera/assets/cartridge.png")).blob();
      await new Promise((resolve, reject) => {
        const request = indexedDB.open("shiguang-camera", 1);
        request.onupgradeneeded = () => {
          const photos = request.result.createObjectStore("photos", { keyPath: "id" });
          for (let i = 0; i < 25; i++) {
            photos.add({
              id: `old-${String(i).padStart(2, "0")}`, timestamp: 1, format: "PNG", roll: "旧照片",
              width: 136, height: 236, blob: png, thumbnail: png
            });
          }
        };
        request.onsuccess = () => { request.result.close(); resolve(); };
        request.onerror = () => reject(request.error);
      });
    });
    await page.goto(`${origin}/camera/`);
    await page.getByRole("button", { name: "打开相册" }).click();
    assert.match(page.url(), /#album$/);
    assert.equal(await page.locator("#camera-screen").isVisible(), false);
    const legacy = page.getByRole("button", { name: "查看 旧照片 成片" });
    await legacy.nth(23).waitFor();
    assert.equal(await legacy.count(), 24);
    await page.getByRole("button", { name: "加载更多" }).click();
    await legacy.nth(24).waitFor();
    assert.equal(await legacy.count(), 25);
    assert.equal(await page.evaluate(async () => {
      const first = await CameraAlbum.list();
      const second = await CameraAlbum.list(first.next);
      return new Set([...first.items, ...second.items].map(item => item.id)).size;
    }), 25);
    await legacy.first().click();
    await page.getByRole("button", { name: "分享" }).click();
    await page.getByRole("link", { name: "导出照片" }).waitFor();
    assert.equal(await page.getByRole("button", { name: "重新冲印" }).count(), 0);
    await page.goBack();
    await legacy.last().scrollIntoViewIfNeeded();
    const scrollBefore = await page.locator("#gallery-content").evaluate(node => node.scrollTop);
    assert.ok(scrollBefore > 0);
    await legacy.last().click();
    await page.locator(".gallery-full-image").waitFor();
    await page.goBack();
    await legacy.last().waitFor();
    assert.equal(await page.locator("#gallery-content").evaluate(node => node.scrollTop), scrollBefore);
  } finally {
    await page.close();
  }
}

async function verifyCamera(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["camera"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const button = name => page.getByRole("button", { name, exact: true });
  const readPhoto = (id = null) => page.evaluate(async photoId => {
    const latest = photoId ?? (await CameraAlbum.list(null, 1)).items[0].id;
    const photo = await CameraAlbum.get(latest);
    async function hash(blob) {
      if (!blob) return null;
      const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
      return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    }
    return {
      id: photo.id, origin: photo.origin, ratio: photo.ratio, width: photo.width, height: photo.height,
      roll: photo.roll, rollNames: photo.rollNames, lenses: photo.lenses, mime: photo.blob.type, originalMime: photo.original?.type,
      originalHash: await hash(photo.original), blobHash: await hash(photo.blob)
    };
  }, id);
  try {
    await page.goto(`${origin}/camera/`);
    await page.waitForFunction(() => {
      const video = document.querySelector("#video");
      return video && !video.hidden && video.videoWidth > 0;
    });
    const picker = page.getByRole("region", { name: "胶卷选择", exact: true });
    assert.equal(await picker.isVisible(), false);
    assert.equal(await page.getByRole("group", { name: "胶卷分类" }).count(), 0);
    await page.setViewportSize({ width: 320, height: 568 });
    const quick = page.locator("#quick-popover");
    await button("照片画幅").click();
    await button("1:1").click();
    assert.equal(await quick.isVisible(), true);
    assert.equal(await button("1:1").getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("dialog[open]").count(), 0);
    assert.ok(await quick.evaluate(panel => panel.getBoundingClientRect().bottom <
      document.querySelector("#viewfinder").getBoundingClientRect().bottom));
    await button("补光").click();
    assert.equal(await page.getByRole("dialog", { name: "画面比例" }).count(), 0);
    await button("开启").click();
    assert.equal(await button("开启").getAttribute("aria-pressed"), "true");
    await button("关闭").click();
    await page.keyboard.press("Escape");
    await quick.waitFor({ state: "hidden" });
    assert.equal(await page.locator(":focus").getAttribute("id"), "flash");
    await button("照片画幅").click();
    await button("4:3").click();
    await button("照片画幅").click();
    await quick.waitFor({ state: "hidden" });
    await button("选择胶卷").click();
    await button("胶片").click();
    assert.equal(await picker.locator(".film-choice").count(), 40);
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.equal(await button("选择胶卷").getAttribute("aria-expanded"), "true");
    await button("收藏 Tri-X 400").click();
    await button("收藏").click();
    assert.equal(await picker.locator(".film-choice").count(), 1);
    await button("Tri-X 400").click();
    assert.equal(await picker.isVisible(), true);
    assert.equal(await button("Tri-X 400").getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("#current-film").innerText(), "Tri-X 400");
    assert.match(await page.locator("#video").evaluate(image => image.style.filter), /grayscale/);
    await button("原色").click();
    assert.equal(await picker.isVisible(), true);
    await button("Tri-X 400").click();
    await page.locator("#viewfinder").click();
    await picker.waitFor({ state: "hidden" });
    await page.reload();
    await page.waitForFunction(() => {
      const video = document.querySelector("#video");
      return video && !video.hidden && video.videoWidth > 0;
    });
    assert.equal(await page.locator("#current-film").innerText(), "Tri-X 400");
    await page.setViewportSize({ width: 390, height: 844 });
    const zoom05 = page.locator('[data-zoom="0.5"]');
    const zoom1 = page.locator('[data-zoom="1"]');
    const zoom2 = page.locator('[data-zoom="2"]');
    assert.equal(await zoom05.isDisabled(), false, "0.5x button should stay enabled on live camera");
    const scaleAt1 = await page.locator("#viewfinder").evaluate(el => Number(el.style.getPropertyValue("--scale")));
    await zoom05.click();
    assert.equal(await zoom05.getAttribute("aria-pressed"), "true");
    const scaleAt05 = await page.locator("#viewfinder").evaluate(el => Number(el.style.getPropertyValue("--scale")));
    assert.ok(scaleAt05 < scaleAt1 && scaleAt05 >= 1, `expected 0.5x scale (${scaleAt05}) < 1x scale (${scaleAt1})`);
    await zoom2.click();
    const scaleAt2 = await page.locator("#viewfinder").evaluate(el => Number(el.style.getPropertyValue("--scale")));
    assert.ok(scaleAt2 > scaleAt1, `expected 2x scale (${scaleAt2}) > 1x scale (${scaleAt1})`);
    await zoom1.click();
    await button("选择胶卷").click();
    await button("Gold 200").click();
    assert.equal(await picker.isVisible(), true);
    await button("选择胶卷").click();
    await picker.waitFor({ state: "hidden" });
    await button("切换镜头").click();
    await page.waitForFunction(() => {
      const video = document.querySelector("#video");
      return video && !video.hidden && video.videoWidth > 0;
    });
    assert.equal(await quick.isVisible(), false);
    await button("相机设置").click();
    await page.getByRole("combobox", { name: "定时拍摄" }).selectOption("10");
    await button("关闭小窗").click();
    await button("拍照").click();
    await button("取消定时拍摄").click();
    await page.getByText("已取消定时拍摄").waitFor();
    assert.equal(await page.evaluate(async () => (await CameraAlbum.list()).items.length), 0);

    await button("相机设置").click();
    await page.getByRole("combobox", { name: "定时拍摄" }).selectOption("0");
    await button("关闭小窗").click();
    await button("照片画幅").click();
    await button("半格").click();
    await button("特效镜头").click();
    await button("鱼眼").click();
    await page.locator("#lens-preview").waitFor({ state: "visible" });
    const previewCorner = await page.locator("#lens-preview").evaluate(canvas => Array.from(canvas.getContext("2d").getImageData(0, 0, 1, 1).data));
    assert.equal(previewCorner[3], 255);
    assert.ok(previewCorner.slice(0, 3).every(channel => channel < 50));
    await button("选择胶卷").click();
    await button("拍照").click();
    await button("1 / 2 · 重拍第一格").waitFor();
    assert.equal(await picker.isVisible(), false);
    assert.equal(await page.evaluate(async () => (await CameraAlbum.list()).items.length), 0);
    await button("1 / 2 · 重拍第一格").click();
    await button("0 / 2 · 半格").waitFor();
    await button("拍照").click();
    await button("1 / 2 · 重拍第一格").waitFor();
    await button("特效镜头").click();
    await button("凸镜").click();
    await button("选择胶卷").click();
    await button("黑白").click();
    await button("Tri-X 400").click();
    await button("拍照").click();
    await page.locator("#latest").waitFor();
    const captured = await readPhoto();
    assert.equal(captured.origin, "相机");
    assert.equal(captured.ratio, "半格");
    assert.ok(captured.width > captured.height);
    assert.equal(captured.originalMime, undefined);
    assert.deepEqual(captured.lenses, ["fisheye", "convex"]);
    assert.deepEqual(captured.rollNames, ["Gold 200", "Tri-X 400"]);

    await page.reload();
    await page.waitForFunction(() => {
      const video = document.querySelector("#video");
      return video && !video.hidden && video.videoWidth > 0;
    });
    await page.waitForFunction(() => {
      const video = document.querySelector("#video");
      return video && !video.hidden && video.videoWidth > 0;
    });
    await button("选择胶卷").click();
    await button("Portra 160").click();
    await button("选择胶卷").click();
    await button("打开相册").click();
    assert.match(page.url(), /#album$/);
    await button("查看 Gold 200 / Tri-X 400 成片").click();
    assert.match(page.url(), /#album\/photo\//);
    assert.equal(await button("重新冲印").count(), 0);
    assert.equal(await button("查看原片").count(), 0);
    await page.getByRole("img", { name: "Gold 200 / Tri-X 400 成片" }).waitFor();
    await button("信息").click();
    await page.getByText(/Gold 200 \/ Tri-X 400 · JPG/).waitFor();
    const processedCorner = await page.evaluate(async () => {
      const { items } = await CameraAlbum.list(null, 1);
      const photo = await CameraAlbum.get(items[0].id);
      const image = await CameraPhoto.load(photo.blob);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    });
    assert.ok(processedCorner.slice(0, 3).every(value => value < 32));
    const capturedDownload = page.waitForEvent("download");
    await button("分享").click();
    assert.equal(await page.getByRole("link", { name: "导出原片" }).count(), 0);
    await page.getByRole("link", { name: "导出照片" }).click();
    assert.match((await capturedDownload).suggestedFilename(), /\.jpg$/);

    await button("返回相册").click();
    const chooserPromise = page.waitForEvent("filechooser");
    await button("导入照片").click();
    const importPath = path.join(__dirname, "camera", "assets", "viewfinder.jpg");
    await (await chooserPromise).setFiles(importPath);
    await button("存入相册").click();
    await button("信息").click();
    await page.getByText(/原色 · JPG.*导入/).waitFor();
    const imported = await readPhoto();
    assert.equal(imported.origin, "导入");
    assert.equal(imported.blobHash, createHash("sha256").update(fs.readFileSync(importPath)).digest("hex"));
    assert.notEqual(imported.id, captured.id);

    const downloadPromise = page.waitForEvent("download");
    await button("分享").click();
    await page.getByRole("link", { name: "导出照片" }).click();
    assert.match((await downloadPromise).suggestedFilename(), /\.jpg$/);
    const favorite = button("收藏照片");
    await favorite.click();
    await page.waitForFunction(() => document.querySelector(".gallery-heart")?.getAttribute("aria-pressed") === "true");
    const currentUrl = page.url();
    const stage = await page.locator(".gallery-stage").boundingBox();
    await page.mouse.move(stage.x + stage.width * .75, stage.y + stage.height / 2);
    await page.mouse.down();
    await page.mouse.move(stage.x + stage.width * .25, stage.y + stage.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForURL(url => url.href !== currentUrl && url.hash.startsWith("#album/photo/"));
    await page.goBack();
    await button("筛选照片，当前：全部照片").click();
    await button("收藏").click();
    await button("查看 原色 成片").waitFor();
    assert.equal(await page.locator(".gallery-tile").count(), 1);
    await button("筛选照片，当前：收藏").click();
    await button("全部照片").click();
    const firstTile = page.locator(".gallery-tile").first();
    await firstTile.waitFor();
    const firstBox = await firstTile.boundingBox();
    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
    await page.mouse.down();
    await page.getByText("已选 1 张", { exact: true }).waitFor();
    await page.mouse.up();
    await page.locator(".gallery-tile").nth(1).click();
    await page.getByText("已选 2 张", { exact: true }).waitFor();
    await button("删除").click();
    await button("移到最近删除").click();
    await page.getByText("还没有照片。拍一张，或从设备导入。").waitFor();
    await button("筛选照片，当前：全部照片").click();
    await button("最近删除").click();
    await button("选择").click();
    await page.locator(".gallery-tile").nth(0).click();
    await page.locator(".gallery-tile").nth(1).click();
    await button("恢复").click();
    await page.getByText("最近删除里没有照片。").waitFor();
    await button("筛选照片，当前：最近删除").click();
    await button("全部照片").click();
    await page.locator(".gallery-tile").nth(1).waitFor();
    assert.equal(await page.locator(".gallery-tile").count(), 2);
    assert.deepEqual(await readPhoto(captured.id), captured);
    const fallbackPixel = await page.evaluate(async () => {
      const prototype = CanvasRenderingContext2D.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "filter");
      try {
        delete prototype.filter;
        const sample = document.createElement("canvas");
        sample.width = sample.height = 1;
        const context = sample.getContext("2d");
        context.fillStyle = "#b43217";
        context.fillRect(0, 0, 1, 1);
        const roll = window.ROLLS_DATA.find(roll => roll.name === "Tri-X 400");
        const { blob } = await CameraPhoto.render(sample, { roll, ev: 0, light: 1, format: "PNG" });
        context.drawImage(await CameraPhoto.load(blob), 0, 0);
        return Array.from(context.getImageData(0, 0, 1, 1).data);
      } finally {
        if (descriptor) Object.defineProperty(prototype, "filter", descriptor);
      }
    });
    assert.equal(fallbackPixel[0], fallbackPixel[1]);
    assert.equal(fallbackPixel[1], fallbackPixel[2]);
    assert.equal(fallbackPixel[3], 255);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}

async function verifyEffects(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const button = name => page.getByRole("button", { name, exact: true });
  try {
    await page.goto(`${origin}/camera/`);
    await page.waitForFunction(() => {
      const video = document.querySelector("#video");
      return video && !video.hidden && video.videoWidth > 0;
    });
    const pixels = await page.evaluate(() => {
      const source = document.createElement("canvas");
      source.width = 192;
      source.height = 256;
      const context = source.getContext("2d");
      const image = context.createImageData(source.width, source.height);
      for (let y = 0; y < source.height; y++) {
        for (let x = 0; x < source.width; x++) {
          const i = (y * source.width + x) * 4;
          image.data[i] = (x * 3 + y * 7) % 256;
          image.data[i + 1] = (x * 5 + y * 2) % 256;
          image.data[i + 2] = (x * 11 + y * 3) % 256;
          image.data[i + 3] = 255;
        }
      }
      context.putImageData(image, 0, 0);
      const outputs = Object.keys(CameraLens.choices).map(lens => CameraPhoto.develop(source, { lenses: [lens] }).toDataURL());
      const inverted = CameraLens.draw(source, document.createElement("canvas"), ["invert"]);
      const inversePixel = Array.from(inverted.getContext("2d").getImageData(0, 0, 1, 1).data);
      const papers = Object.keys(CameraPaper.choices).map(paper => {
        const result = CameraPhoto.develop(source, { paper });
        return { paper, size: [result.width, result.height], corner: Array.from(result.getContext("2d").getImageData(0, 0, 1, 1).data) };
      });
      context.fillStyle = "#4080c0";
      context.fillRect(0, 0, 192, 256);
      const blurred = CameraLens.draw(source, document.createElement("canvas"), ["blur"]);
      const blurEdge = Array.from(blurred.getContext("2d").getImageData(191, 255, 1, 1).data);
      const gradient = context.createLinearGradient(0, 0, 192, 0);
      gradient.addColorStop(0, "#222");
      gradient.addColorStop(1, "#ddd");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 192, 256);
      const painted = CameraPhoto.develop(source, { lenses: ["painting"] });
      const wash = painted.getContext("2d").getImageData(0, 128, 192, 1).data;
      const tones = new Set(wash.filter((_, index) => index % 4 === 0));
      return { unique: new Set(outputs).size, count: outputs.length, inversePixel, papers, blurEdge, washTones: tones.size };
    });
    assert.equal(pixels.unique, pixels.count);
    assert.deepEqual(pixels.inversePixel, [255, 255, 255, 255]);
    assert.deepEqual(pixels.blurEdge, [64, 128, 192, 255]);
    assert.ok(pixels.washTones > 64);
    for (const paper of pixels.papers) assert.deepEqual(paper.size, [192, 256]);
    assert.deepEqual(pixels.papers.find(item => item.paper === "cream").corner, [238, 225, 195, 255]);

    await button("选择相纸").click();
    for (const name of ["满版", "白边", "奶油", "拍立得", "齿孔"]) {
      await button(name).click();
      await page.waitForFunction(() => {
        const finder = document.querySelector("#viewfinder");
        const { side } = CameraPaper.layout(finder.offsetWidth, finder.offsetHeight, finder.dataset.paper);
        return finder.dataset.paper === "none" || Math.abs(parseFloat(getComputedStyle(finder).borderLeftWidth) - side) < 1;
      });
      const frame = await page.evaluate(() => {
        const finder = document.querySelector("#viewfinder");
        const window = document.querySelector("#finder-window");
        const crop = document.querySelector("#capture-frame");
        const style = getComputedStyle(finder);
        return { paper: finder.dataset.paper, width: finder.offsetWidth, height: finder.offsetHeight,
          border: parseFloat(style.borderLeftWidth), innerWidth: window.offsetWidth, cropWidth: crop.offsetWidth,
          background: style.backgroundColor, imageBackground: style.backgroundImage,
          canvasHidden: document.querySelector("#lens-preview").hidden };
      });
      assert.equal(frame.canvasHidden, true);
      if (frame.paper !== "none") {
        assert.ok(Math.abs(frame.width / frame.height - .75) < .005);
        assert.ok(Math.abs(frame.width - frame.border * 2 - frame.innerWidth) <= 1);
        assert.equal(frame.innerWidth, frame.cropWidth);
      }
      if (name === "奶油") assert.equal(frame.background, "rgb(238, 225, 195)");
      if (name === "齿孔") assert.match(frame.imageBackground, /repeating-linear-gradient/);
    }
    await button("关闭小窗").click();
    await button("特效镜头").click();
    for (const name of ["挤压", "模糊", "像素", "老男孩", "高对比", "反向", "绘画", "抖色", "报纸"]) {
      await button(name).click();
      assert.equal(await page.locator("#quick-popover").isVisible(), true);
      assert.equal(await page.locator("#special-lens").innerText(), name);
    }
    await button("选择相纸").click();
    await button("奶油").click();
    await button("拍立得").click();
    assert.equal(await page.locator("#quick-popover").isVisible(), true);
    await button("关闭小窗").click();
    await button("拍照").click();
    await page.locator("#latest").waitFor();
    assert.deepEqual(await page.evaluate(async () => {
      const { items } = await CameraAlbum.list(null, 1);
      const photo = await CameraAlbum.get(items[0].id);
      return { paper: photo.paper, lenses: photo.lenses, aspect: photo.width / photo.height };
    }).then(photo => {
      assert.ok(Math.abs(photo.aspect - .75) < .005);
      return { paper: photo.paper, lenses: photo.lenses };
    }), { paper: "instant", lenses: ["newspaper"] });
    await button("打开相册").click();
    await button("返回相机").click();
    await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector("#viewfinder")).borderBottomWidth) > 20);
    await page.reload();
    await page.waitForFunction(() => {
      const video = document.querySelector("#video");
      return video && !video.hidden && video.videoWidth > 0;
    });
    assert.equal(await page.locator("#paper-picker").innerText(), "拍立得");
    assert.equal(await page.locator("#special-lens").innerText(), "报纸");
    await button("特效镜头").click();
    if (process.env.CAMERA_PREVIEW_DIR) {
      await page.screenshot({ path: path.join(process.env.CAMERA_PREVIEW_DIR, "camera-lenses.png"), animations: "disabled" });
    }
    await button("原镜头").click();
    await button("关闭小窗").click();
    await button("选择胶卷").click();
    assert.equal(await page.locator(".film-canister").count(), 40);
    const palette = await page.locator(".film-canister").evaluateAll(elements => elements.map(element => element.style.getPropertyValue("--roll-band")));
    assert.equal(new Set(palette).size, 40);
    await button("自制").click();
    await button("新建自制胶卷").click();
    await page.locator("#custom-film-studio").waitFor({ state: "visible" });
    assert.equal(await page.locator("#viewfinder").isVisible(), true);
    assert.equal(await page.locator(".camera-bar").isVisible(), true);
    assert.equal(await page.locator(".lens-bar").isVisible(), true);
    const vfBox = await page.locator("#viewfinder").boundingBox();
    const studioBox = await page.locator("#custom-film-studio").boundingBox();
    assert.ok(vfBox.height >= 160 && vfBox.y + vfBox.height <= studioBox.y + 4, "custom studio must not cover viewfinder");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator("#ctrl-exposure").fill("1.24");
    await page.locator("#ctrl-exposure").dispatchEvent("input");
    const liveFilter = await page.locator("#video").evaluate(node => node.style.filter);
    assert.ok(liveFilter.includes("brightness(1.24)"), `expected live filter brightness(1.24), got ${liveFilter}`);
    await page.locator("#studio-name").fill("落日气泡");
    await page.getByLabel("电影高光红晕").check();
    await page.getByLabel("胶片边缘漏光").check();
    if (process.env.CAMERA_PREVIEW_DIR) {
      await page.screenshot({ path: path.join(process.env.CAMERA_PREVIEW_DIR, "camera-studio-live.png"), animations: "disabled" });
    }
    await page.getByRole("button", { name: "保存并使用" }).click();
    await page.locator("#custom-film-studio").waitFor({ state: "hidden" });
    assert.equal(await page.locator("#current-film").innerText(), "落日气泡");
    await button("选择胶卷").click();
    if (process.env.CAMERA_PREVIEW_DIR) {
      await page.screenshot({ path: path.join(process.env.CAMERA_PREVIEW_DIR, "camera-film-paper.png"), animations: "disabled" });
    }
    await page.setViewportSize({ width: 320, height: 568 });
    await button("选择相纸").click();
    for (const name of ["明信片", "牛皮纸", "蓝晒印相", "拍立得"]) {
      await button(name).click();
    }
    assert.equal(await page.locator("#quick-popover").isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (process.env.CAMERA_PREVIEW_DIR) {
      await page.screenshot({ path: path.join(process.env.CAMERA_PREVIEW_DIR, "camera-paper-320.png"), animations: "disabled" });
    }
    await button("关闭小窗").click();
    await button("特效镜头").click();
    for (const name of ["万花筒", "漩涡", "热成像", "原镜头"]) {
      await button(name).click();
    }
    await button("关闭小窗").click();
    await button("照片画幅").click();
    for (const [name, aspect] of [["1:1", 1], ["16:9", 9 / 16], ["65:24", 65 / 24], ["4:3", .75]]) {
      await button(name).click();
      const actual = await page.locator("#viewfinder").evaluate(node => node.offsetWidth / node.offsetHeight);
      assert.ok(Math.abs(actual - aspect) < .015);
    }
    await button("关闭小窗").click();
    await page.setViewportSize({ width: 390, height: 844 });
    if (process.env.CAMERA_PREVIEW_DIR) {
      await page.screenshot({ path: path.join(process.env.CAMERA_PREVIEW_DIR, "camera-paper-frame.png"), animations: "disabled" });
    }
    await page.setViewportSize({ width: 320, height: 568 });
    await button("选择拍摄贴纸").click();
    await page.getByText("还没有贴纸。可以从相册照片中提取。").waitFor();
    await button("关闭小窗").click();
    await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 40;
      const context = canvas.getContext("2d");
      context.fillStyle = "#ff00fa";
      context.fillRect(6, 6, 28, 28);
      const blob = await CameraPhoto.encode(canvas, "image/png");
      await CameraAlbum.saveSticker({ id: "camera-test", name: "测试贴纸", timestamp: Date.now(), blob, thumbnail: blob });
    });
    await button("特效镜头").click();
    await button("报纸").click();
    await button("选择拍摄贴纸").click();
    await button("测试贴纸").click();
    await button("移动贴纸 测试贴纸").waitFor();
    await page.getByRole("slider", { name: "贴纸大小" }).fill("45");
    await button("关闭小窗").click();
    const sticker = await button("移动贴纸 测试贴纸").boundingBox();
    const x = sticker.x + sticker.width / 2;
    const y = sticker.y + sticker.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 37, y + 27, { steps: 5 });
    await page.mouse.up();
    const moved = await button("移动贴纸 测试贴纸").boundingBox();
    assert.ok(moved.x < sticker.x - 30 && moved.y > sticker.y + 20);
    const frame = await page.locator("#capture-frame").boundingBox();
    const position = {
      x: (moved.x + moved.width / 2 - frame.x) / frame.width,
      y: (moved.y + moved.height / 2 - frame.y) / frame.height
    };
    const previousPhoto = await page.evaluate(async () => (await CameraAlbum.list(null, 1)).items[0].id);
    await button("拍照").click();
    await page.evaluate(async id => {
      while ((await CameraAlbum.list(null, 1)).items[0]?.id === id) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }, previousPhoto);
    const color = await page.evaluate(async position => {
      const photo = await CameraAlbum.get((await CameraAlbum.list(null, 1)).items[0].id);
      const image = await CameraPhoto.load(photo.blob);
      const { side, top, bottom } = CameraPaper.layout(image.width, image.height, photo.paper);
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return Array.from(context.getImageData(
        side + position.x * (image.width - side * 2), top + position.y * (image.height - top - bottom), 1, 1
      ).data);
    }, position);
    assert.ok(color[0] > 230 && color[1] < 25 && color[2] > 215, `Unexpected sticker color: ${color}`);
    await button("选择拍摄贴纸").click();
    await button("移除贴纸").click();
    assert.equal(await button("移动贴纸 测试贴纸").count(), 0);
    assert.equal((await page.evaluate(() => CameraAlbum.listDiscoveries("stickers"))).length, 1);
    const autoSaved = await page.evaluate(() => window.TimeLightBridge?.lastGallerySave);
    assert.ok(autoSaved && /^TimeLight-\d+\.(jpg|png)$/.test(autoSaved.filename) && autoSaved.size > 0);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
}

async function main() {
  const { origin, server } = await startServer(0);
  let browser;
  try {
    const { chromium } = loadPlaywright();
    browser = await chromium.launch({
      executablePath: resolveBrowserPath(chromium),
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
    });
    await verifyUpgrade(browser, origin);
    console.log("PASS 旧相册迁移、同时间照片分页与旧片导出");
    await verifyCamera(browser, origin);
    console.log("PASS 相机、全屏相册、滑动浏览、原样导入、成片保留、收藏、批量删除与恢复");
    await verifyEffects(browser, origin);
    console.log("PASS 特效镜头、相纸、胶卷及贴纸拖动、缩放、移除与成片合成");
  } finally {
    await browser?.close();
    server.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

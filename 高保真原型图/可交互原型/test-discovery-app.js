"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { chromium } = require("playwright");
const { startServer } = require("./server");
const samplePhoto = path.join(__dirname, "test-fixtures", "discovery-photo.png");

function serveSamplePhoto(page) {
  return page.route("**/assets/photo.png", route => route.fulfill({ path: samplePhoto }));
}

async function longPress(page, locator, minWaitMs = 340) {
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  assert.ok(box, "longPress target must have bounding box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const t0 = Date.now();
  await page.locator("#desk-selection").waitFor({ state: "visible", timeout: 3000 });
  assert.ok(Date.now() - t0 >= minWaitMs - 60, "edit mode should only open after holding ~350ms");
  await page.mouse.up();
}

async function verifyHomeRoutes() {
  const { floorPoint, placement, planWalk, walkMap, spiritWish, matchesWish, expandFloor } = await import("./game/book-home.mjs");
  const { satisfaction } = await import("./game/book-data.mjs");
  const progress = { fulfilled: {} };
  const purposes = ["backdrop", "toy", "plant", "food"];
  for (let points = 0; points <= 12; points++) {
    assert.equal(satisfaction(progress), points);
    if (points === 12) break;
    const log = progress.fulfilled[Math.floor(points / 4)] ||= [];
    log.push(purposes[points % 4], purposes[points % 4]);
  }
  const resident = {
    x: .31, y: .58, seed: 2, traits: { 好奇: 90, 敏感: 90 },
    preferences: { object: { like: "植物", avoid: "器物" }, face: {} }
  };
  const card = (id, x, y, scale, ratio, category) => ({
    id, x, y, scale, surface: "paper", rotation: 0, asset: { ratio, category }, expression: "none",
    purpose: category === "植物" ? "plant" : "backdrop"
  });
  const tree = card("tree", .75, .58, .22, 1, "植物");
  const barriers = Array.from({ length: 21 }, (_, i) => card("barrier" + i, .52, i / 20, .65, .4, "器物"));
  const route = pieces => planWalk(walkMap("study", pieces), resident, pieces, piece => piece.asset.category, .08);
  assert.equal(route([tree]).target, tree);
  assert.equal(spiritWish(resident).purpose, "plant");
  assert.equal(matchesWish(resident, tree, "植物"), true);
  assert.equal(matchesWish(resident, barriers[0], "器物"), false);
  assert.equal(planWalk(walkMap("study", [tree]), resident, [tree], () => "植物", .99, () => true).target, tree);
  const oldPosition = floorPoint(expandFloor({ x: .5, y: .5 }));
  assert.ok(Math.abs(oldPosition.x - .01) < .0001 && Math.abs(oldPosition.y - 1.34) < .0001);
  const blocked = [tree, ...barriers];
  const detour = route(blocked);
  assert.equal(detour.target, undefined);
  assert.ok(detour.path.length > 0);
  const map = walkMap("study", blocked);
  assert.ok(detour.path.every(point => point.x < .52 && map.clear(floorPoint(point))));
  assert.equal(route([tree]).target, tree);
  assert.equal(placement("study", { ...tree, id: "second", rotation: 35 }, [tree]), false);
  console.log("PASS 家园摆件占用、精灵接近喜好目标、绕行与清障后重新寻路");
}

async function verifyBook(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const button = name => page.getByRole("button", { name, exact: true });
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("shiguang-popup-book-v1")));
  try {
    await page.goto(origin + "/camera/");
    const legacy = await page.evaluate(async () => {
      const blob = await (await fetch("/camera/assets/cartridge.png")).blob();
      for (const [id, name] of [["resident", "胶卷精灵"], ["decor", "测试贴纸"]]) {
        await CameraAlbum.saveSticker({ id, name, timestamp: Date.now(), blob, thumbnail: blob });
      }
      await CameraAlbum.collectSticker("resident", { name: "胶卷精灵", category: "器物", observation: "一枚小胶卷。" });
      const records = JSON.stringify([
        { stickerId: "decor", x: .56, y: .65, scale: .23 },
        { stickerId: "missing", x: .3, y: .4, scale: .22 }
      ]);
      localStorage.setItem("shiguang-sticker-desk-v1", records);
      return records;
    });
    await page.goto(origin + "/game/");
    await page.locator('#book-stage[data-mode="3d"] canvas').waitFor();
    assert.equal(await button("添加贴纸").isVisible(), false);
    await button("打开立体书").click();
    await button("测试贴纸").waitFor();
    await button("精灵 灯绒").waitFor();
    await page.getByText("部分收藏贴纸已找不到").waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem("shiguang-sticker-desk-v1")), legacy);
    assert.equal((await state()).decorations.study.length, 2);
    assert.equal((await state()).decorations.study[0].rotation, 0);
    const stage = page.locator("#book-stage");
    assert.equal(await button("全书总览").count(), 0);
    assert.equal(await button("旋转视角").count(), 0);
    assert.equal(await stage.locator(".scene-navigation").count(), 0);
    const box = await stage.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 4, box.y + 250, { steps: 5 });
    await page.mouse.up();
    assert.equal(await stage.getAttribute("data-yaw"), "30");
    assert.equal(await stage.getAttribute("data-tilt"), "20.5");
    await page.waitForFunction(() => document.querySelector('[aria-label="精灵 灯绒"]')?.dataset.activity === "walk");
    await button("下一页").click();
    await page.locator('.book-shell[data-turn-phase="leaf"]').waitFor();
    await page.locator('.book-shell[data-world="garden"][data-busy="false"]').waitFor();
    assert.equal(await stage.getAttribute("data-yaw"), "30");
    await button("重置视角").click();
    assert.equal(await stage.getAttribute("data-yaw"), "0");
    assert.equal(await button("测试贴纸").count(), 0);
    const touch = await page.context().newCDPSession(page);
    for (const [type, x] of [["touchStart", 245], ["touchMove", 195], ["touchMove", 135], ["touchEnd", 135]]) {
      await touch.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y: 180 }] });
    }
    assert.ok(Number(await stage.getAttribute("data-yaw")) > 0);
    assert.equal(await page.locator(".book-shell").getAttribute("data-world"), "garden");
    await button("重置视角").click();
    const fingers = (left, right) => [{ x: left, y: 170, id: 1 }, { x: right, y: 170, id: 2 }];
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: fingers(120, 235) });
    await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: fingers(75, 280) });
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.ok(Number(await stage.getAttribute("data-zoom")) > 1.4);
    assert.equal(await stage.getAttribute("data-yaw"), "0");
    await button("重置视角").click();
    await button("下一页").click();
    await page.locator('.book-shell[data-world="station"][data-busy="false"]').waitFor();
    await button("任务").click();
    await page.getByRole("heading", { name: "任务" }).waitFor();
    await button("关闭任务").click();
    await button("打开章节目录").click();
    for (const name of ["暖窗书房", "雨后花园", "月光车站", "苔石溪谷", "萤火湿地", "风铃高原", "星潮海岸"]) {
      assert.equal(await button(name).isEnabled(), true);
    }
    await button("星潮海岸").click();
    await page.locator('.book-shell[data-world="coast"][data-busy="false"]').waitFor();
    await button("潮汐拾贝").click();
    await button("关闭小游戏").click();
    await button("打开章节目录").click();
    await button("暖窗书房").click();
    await page.locator('.book-shell[data-world="study"][data-busy="false"]').waitFor();
    await button("唤醒精灵").click();
    await button("胶卷精灵").click();
    await button("确认召唤").click();
    await page.getByRole("heading", { name: "胶卷精灵" }).waitFor();
    assert.ok((await state()).nextSpiritSummonAt > Date.now());
    assert.equal(await page.getByRole("meter").count(), 3);
    const spirit = (await state()).spirits.find(value => value.id === "resident");
    const { createSpirit, reactionFor } = await import("./game/book-data.mjs");
    assert.deepEqual(spirit, createSpirit({ stickerId: "resident", category: "器物", name: "胶卷精灵" }, "study"));
    assert.equal(reactionFor(spirit, spirit.preferences.object.like, spirit.preferences.face.avoid).sentiment, "like");
    await button("关闭精灵卡").click();
    await button("唤醒精灵").click();
    await button("胶卷精灵").click();
    await page.getByRole("heading", { name: "胶卷精灵" }).waitFor();
    assert.equal((await state()).spirits.filter(value => !value.builtin).length, 1);
    assert.equal(await page.locator("dialog[open]").count(), 0);
    await page.locator("#spirit-hud").waitFor({ state: "visible" });
    await page.waitForFunction(() => Number(document.getElementById("book-stage")?.getAttribute("data-zoom")) > 1.5);
    await button("💬 聊聊").click();
    await page.locator('#spirit-hud[data-mode="chat"] #spirit-speech-bubble').waitFor({ state: "visible" });
    assert.equal(await page.locator("dialog[open]").count(), 0);
    await button("今天怎么样").click();
    await button("结束对话").click();
    await page.locator("#spirit-hud").waitFor({ state: "hidden" });
    await page.waitForFunction(() => Number(document.getElementById("book-stage")?.getAttribute("data-zoom")) <= 1.05);
    await button("测试贴纸").click();
    assert.equal(await page.locator("#desk-selection").isVisible(), false, "short tap must not enter edit mode");
    await longPress(page, button("测试贴纸"));
    await page.locator("#desk-selection").waitFor({ state: "visible" });
    const face = page.getByLabel("表情", { exact: true });
    await face.selectOption(spirit.preferences.face.like);
    assert.equal(await page.locator("#reaction-note").getAttribute("data-sentiment"), "like");
    await face.selectOption(spirit.preferences.face.avoid);
    assert.equal(await page.locator("#reaction-note").getAttribute("data-sentiment"), "avoid");
    await face.selectOption("none");
    assert.equal(await page.locator("#reaction-note").getAttribute("data-sentiment"), "neutral");
    await page.getByLabel("贴纸位置").selectOption("prop");
    await page.getByRole("slider", { name: "大小" }).fill("45");
    await page.getByRole("slider", { name: "旋转" }).fill("35");
    await page.getByRole("slider", { name: "自身角度" }).fill("-25");
    assert.equal((await state()).decorations.study[0].surface, "prop");
    assert.equal((await state()).decorations.study[0].rotation, 35);
    assert.equal((await state()).decorations.study[0].selfRotation, -25);
    const placed = (await state()).decorations.study[0];
    for (let step = 0; step < 20; step++) await button("测试贴纸").press("ArrowRight");
    await page.getByText("这里放不下，请留出一点空间", { exact: false }).waitFor();
    const constrained = (await state()).decorations.study[0].x;
    assert.ok(constrained >= placed.x && constrained < 1);
    await button("测试贴纸").press("ArrowRight");
    assert.equal((await state()).decorations.study[0].x, constrained);
    const lanternBefore = (await state()).sceneModels.study.find(m => m.modelId === "night_lantern");
    assert.ok(lanternBefore, "study scene should contain default 3D model night_lantern");
    await button("完成").click();
    await button("纸模 夜灯").click();
    assert.equal(await page.locator("#desk-selection").isVisible(), false, "short tap on model must not enter edit mode");
    await longPress(page, button("纸模 夜灯"));
    await page.locator("#desk-selection").waitFor({ state: "visible" });
    await page.getByRole("slider", { name: "大小" }).fill("125");
    await page.getByRole("slider", { name: "旋转" }).fill("45");
    await page.getByRole("slider", { name: "旋转" }).dispatchEvent("change");
    const lanternBox = await button("纸模 夜灯").boundingBox();
    await page.mouse.move(lanternBox.x + lanternBox.width / 2, lanternBox.y + lanternBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(lanternBox.x + lanternBox.width / 2 - 42, lanternBox.y + lanternBox.height / 2 + 28, { steps: 6 });
    await page.mouse.up();
    const lanternAfter = (await state()).sceneModels.study.find(m => m.modelId === "night_lantern");
    assert.equal(lanternAfter.scale, 1.25);
    assert.equal(lanternAfter.rotation, 45);
    assert.ok(Math.hypot(lanternAfter.x - lanternBefore.x, lanternAfter.y - lanternBefore.y) > 0.01, "scene model drag should move coordinates");
    await button("完成").click();
    await longPress(page, button("纸模 暖光台灯"));
    await page.locator("#desk-selection").waitFor({ state: "visible" });
    await page.getByRole("slider", { name: "大小" }).fill("110");
    assert.equal((await state()).sceneModels.study.find(m => m.modelId === "study_lamp").scale, 1.1);
    await button("完成").click();
    await button("重置视角").click();
    await button("家具清单").click();
    await page.locator("#furniture-panel").waitFor({ state: "visible" });
    await page.locator("#furniture-items .furniture-focus-btn", { hasText: "暖光台灯" }).click();
    await page.waitForFunction(() => Number(document.getElementById("book-stage")?.getAttribute("data-zoom")) > 1.3);
    assert.equal(await page.locator("#desk-selection").isVisible(), false);
    await page.locator("#furniture-items .furniture-row", { hasText: "暖光台灯" }).getByRole("button", { name: "编辑" }).click();
    await page.locator("#desk-selection").waitFor({ state: "visible" });
    await button("完成").click();
    await button("关闭家具列表").click();
    await button("添加贴纸").click();
    await button("纸模布景").click();
    await page.locator(".drawer-filters").getByRole("button", { name: "灯火" }).click();
    await page.getByRole("button", { name: "百褶落地灯" }).click();
    await page.locator("#desk-selection").waitFor({ state: "visible" });
    assert.ok((await state()).sceneModels.study.some(m => m.modelId === "floor_lamp"), "universal lamp model should be placed");
    await button("完成").click();
    await button("添加贴纸").click();
    await button("纸模布景").click();
    await page.locator(".drawer-filters").getByRole("button", { name: "绿植休闲" }).click();
    await page.getByRole("button", { name: "胡桃木立式钢琴" }).click();
    await page.locator("#desk-selection").waitFor({ state: "visible" });
    assert.ok((await state()).sceneModels.study.some(m => m.modelId === "upright_piano"), "expanded universal piano model should be placed");
    await button("完成").click();
    await button("重置视角").click();
    const furnitureSummary = await page.evaluate(async () => {
      const T = await import("/game/vendor/three.module.js");
      const { PAPER_MODELS, buildPaperModel, getModelPreviewAsset } = await import("/game/paper-models.mjs");
      const entries = Object.entries(PAPER_MODELS).filter(([, spec]) => spec.batch === 3);
      const groupCounts = {};
      let bad = [];
      for (const [id, spec] of entries) {
        groupCounts[spec.furnGroup] = (groupCounts[spec.furnGroup] || 0) + 1;
        const node = buildPaperModel(id, c => new T.MeshStandardMaterial({ color: c }), spec.color);
        const body = node.getObjectByName("paper_body");
        if (!body || !body.children.length || node.getObjectByName("block")) bad.push(`default-or-empty:${id}`);
        if (spec.isLight && !node.userData.lightLocal) bad.push(`missing-light:${id}`);
        const preview = getModelPreviewAsset(id, spec.name, spec.color);
        if (!preview?.url?.startsWith("data:image/png")) bad.push(`bad-preview:${id}`);
      }
      return { total: entries.length, groupCounts, bad };
    });
    assert.equal(furnitureSummary.total, 100, "expected 100 universal furniture models");
    assert.deepEqual(furnitureSummary.bad, [], `unexpected broken models: ${furnitureSummary.bad.join(", ")}`);
    for (const g of ["桌椅", "柜架", "灯火", "茶食", "绿植休闲"]) {
      assert.equal(furnitureSummary.groupCounts[g], 20, `expected 20 models in group ${g}`);
    }
    await button("精灵 胶卷精灵").click({ force: true });
    await page.getByText(/喜欢.+回避/).waitFor();
    const wingGap = await page.evaluate(() => {
      const l = document.getElementById("spirit-wing-left").getBoundingClientRect();
      const r = document.getElementById("spirit-wing-right").getBoundingClientRect();
      return r.left - l.right;
    });
    assert.ok(wingGap >= 95, `expected open center gap between spirit wings, got ${wingGap}`);
    await page.getByLabel("搬家到").selectOption("garden");
    await button("关闭精灵卡").click();
    await button("下一页").click();
    await button("精灵 胶卷精灵").waitFor();
    await page.reload();
    await page.locator('#book-stage[data-mode="3d"]').waitFor();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await button("打开立体书").click();
    await button("精灵 胶卷精灵").click({ force: true });
    await page.getByText(/喜欢.+回避/).waitFor();
    assert.equal((await state()).spirits.find(value => value.id === "resident").home, "garden");
    assert.deepEqual(errors, []);
    console.log("PASS 3D 开书与三章翻页、触摸手势、旧贴纸桌导入、精灵性格及反应、搬家和刷新");
  } finally {
    await page.close();
  }
}

async function verifyMigration(browser, origin) {
  const page = await browser.newPage();
  try {
    await page.goto(`${origin}/camera/camera.css`);
    await page.evaluate(async () => {
      const blob = await (await fetch("/camera/assets/cartridge.png")).blob();
      await new Promise((resolve, reject) => {
        const request = indexedDB.open("shiguang-camera", 3);
        request.onupgradeneeded = () => {
          const photos = request.result.createObjectStore("photos", { keyPath: "id" });
          const previews = request.result.createObjectStore("previews", { keyPath: "id" });
          previews.createIndex("newest", ["timestamp", "id"]);
          const photo = { id: "version3", timestamp: 1, blob, thumbnail: blob, favorite: true, trashedAt: 5, roll: "Gold 200" };
          photos.add(photo); previews.add(photo);
        };
        request.onsuccess = () => { request.result.close(); resolve(); };
        request.onerror = () => reject(request.error);
      });
    });
    await page.goto(`${origin}/camera/`);
    const migrated = await page.evaluate(async () => ({
      photo: await CameraAlbum.get("version3"), stickers: await CameraAlbum.listDiscoveries("stickers"),
      entries: await CameraAlbum.listDiscoveries("compendium")
    }));
    assert.equal(migrated.photo.favorite, true);
    assert.equal(migrated.photo.trashedAt, 5);
    assert.equal(migrated.stickers.length, 0);
    assert.equal(migrated.entries.length, 0);
    const concurrent = await page.evaluate(async () => {
      const photo = await CameraAlbum.get("version3");
      await CameraAlbum.saveSticker({ id: "c1", timestamp: 1, blob: photo.blob, thumbnail: photo.blob });
      await CameraAlbum.saveSticker({ id: "c2", timestamp: 2, blob: photo.blob, thumbnail: photo.blob });
      const details = { name: " 台灯 ", category: "器物", observation: "窗边的一盏灯。" };
      const first = await Promise.all([CameraAlbum.collectSticker("c1", details), CameraAlbum.collectSticker("c2", details)]);
      const winner = first.find(result => result.entry).entry.stickerId;
      const other = winner === "c1" ? "c2" : "c1";
      const updated = await CameraAlbum.collectSticker(other, details, true, winner);
      const stale = await CameraAlbum.collectSticker(winner, details, true, winner);
      return { first: first.map(result => Boolean(result.conflict)), updated: updated.entry.stickerId,
        stale: stale.conflict.stickerId, entries: await CameraAlbum.listDiscoveries("compendium"),
        stickers: await CameraAlbum.listDiscoveries("stickers") };
    });
    assert.equal(concurrent.first.filter(Boolean).length, 1);
    assert.equal(concurrent.stale, concurrent.updated);
    assert.equal(concurrent.entries.length, 1);
    assert.equal(concurrent.stickers.length, 2);
    console.log("PASS v3 相册无损升级至 v4，收藏及回收状态保留");
  } finally { await page.close(); }
}

async function verifySegmentation(browser, origin) {
  const page = await browser.newPage();
  try {
    await serveSamplePhoto(page);
    await page.goto(`${origin}/camera/`);
    const fixtures = [{ name: "object", url: "/assets/photo.png" },
      { name: "plant", url: "/assets/photo.png", region: { x: .75, y: .32, width: .25, height: .55 } }];
    if (process.env.DISCOVERY_FIXTURES_DIR) {
      for (const name of ["animal", "food"]) {
        fixtures.push({ name, url: "data:image/jpeg;base64," + fs.readFileSync(path.join(process.env.DISCOVERY_FIXTURES_DIR, `${name}.jpg`)).toString("base64") });
      }
    }
    const outputs = await page.evaluate(async fixtures => {
      const runner = CameraCutout.runner();
      const results = [];
      try {
        for (const fixture of fixtures) {
          const blob = await (await fetch(fixture.url)).blob();
          const prepared = await CameraCutout.prepare({ blob, paper: "none" });
          const mask = await runner.infer(prepared.image, fixture.region || prepared.region, () => {});
          const composition = CameraCutout.compose(prepared.image, mask, mask.choices[0].label);
          results.push({ name: fixture.name, candidates: mask.choices.length, area: mask.choices[0].area,
            full: composition.full.toDataURL(), sticker: composition.sticker.toDataURL() });
        }
      } finally { runner.cancel(); }
      return results;
    }, fixtures);
    for (const output of outputs) {
      assert.ok(output.area > 100 && output.area < 320 * 320 * .985);
      if (process.env.CAMERA_PREVIEW_DIR) {
        fs.writeFileSync(path.join(process.env.CAMERA_PREVIEW_DIR, `discovery-${output.name}-full.png`), Buffer.from(output.full.split(",")[1], "base64"));
        fs.writeFileSync(path.join(process.env.CAMERA_PREVIEW_DIR, `discovery-${output.name}-sticker.png`), Buffer.from(output.sticker.split(",")[1], "base64"));
      }
      console.log(`PASS 真实 ${output.name} 样本抠图，${output.candidates} 个分离主体`);
    }
    const geometry = await page.evaluate(async () => {
      const blob = await (await fetch("/assets/photo.png")).blob();
      const source = await CameraPhoto.load(blob);
      const results = [];
      for (const paper of ["none", "cream", "instant", "sprocket"]) {
        for (const aspect of [.75, 1, 65 / 24]) {
          const developed = CameraPhoto.develop(source, { paper, paperAspect: aspect, lenses: ["fisheye"], roll: ROLLS_DATA[0] });
          const rendered = await CameraPhoto.encode(developed, "image/png");
          const prepared = await CameraCutout.prepare({ blob: rendered, paper });
          const expected = CameraPaper.layout(developed.width, developed.height, paper);
          results.push({ actual: prepared.region, expected: { x: expected.side / developed.width, y: expected.top / developed.height,
            width: (developed.width - expected.side * 2) / developed.width,
            height: (developed.height - expected.top - expected.bottom) / developed.height } });
        }
      }
      return results;
    });
    for (const item of geometry) assert.deepEqual(item.actual, item.expected);
    console.log("PASS 胶卷、鱼眼、相纸及多画幅的主体坐标映射");
  } finally { await page.close(); }
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

async function main() {
  const previous = {
    key: process.env.DEEPSEEK_API_KEY,
    base: process.env.DEEPSEEK_BASE_URL,
    legacyKey: process.env.BIGMODEL_API_KEY,
    legacyBase: process.env.BIGMODEL_BASE_URL,
    settings: process.env.SHIGUANG_SETTINGS_FILE
  };
  const settingsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "shiguang-discovery-"));
  process.env.SHIGUANG_SETTINGS_FILE = path.join(settingsDirectory, "recognition.json");
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_BASE_URL;
  delete process.env.BIGMODEL_API_KEY;
  delete process.env.BIGMODEL_BASE_URL;
  const { server, origin } = await startServer(0);
  let calls = 0;
  let providerMode = "ok";
  const upstream = http.createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    const input = JSON.parse(body);
    calls++;
    assert.equal(request.url, "/v1/chat/completions");
    assert.equal(request.headers.authorization, "Bearer test-only-key");
    assert.equal(input.model, "dsv4.1flash");
    assert.equal(input.response_format, undefined);
    const images = input.messages[1].content.filter(item => item.type === "image_url");
    assert.equal(images.length, 2);
    for (const { image_url } of images) {
      assert.match(image_url.url, /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/);
    }
    if (providerMode === "rate") { response.writeHead(429); response.end(); return; }
    if (providerMode === "hang") { providerMode = "ok"; return; }
    if (providerMode === "delay") await new Promise(resolve => setTimeout(resolve, 1500));
    response.writeHead(200, { "Content-Type": "application/json" });
    const objectJson = JSON.stringify({
      name: "台灯", category: "器物", observation: "圆圆的灯罩，留住一小片暖光。"
    });
    const content = providerMode === "invalid" ? "invalid json"
      : calls === 1 ? "```json\n" + objectJson + "\n```" : objectJson;
    response.end(JSON.stringify({ choices: [{ message: { content } }] }));
  });
  await new Promise(resolve => upstream.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    assert.equal((await fetch(`${origin}/api/identify-object`, { method: "POST" })).status, 503);
    process.env.DEEPSEEK_API_KEY = "test-only-key";
    process.env.DEEPSEEK_BASE_URL = `http://127.0.0.1:${upstream.address().port}/v1`;
    assert.equal((await fetch(`${origin}/api/identify-object`)).status, 405);
    assert.equal((await fetch(`${origin}/api/identify-object`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subjectImage: "invalid", contextImage: "invalid" }) })).status, 400);
    assert.equal((await fetch(`${origin}/api/identify-object`, { method: "POST", headers: { Origin: "https://example.com" } })).status, 403);
    assert.equal((await fetch(`${origin}/.env`)).status, 403);
    assert.equal((await fetch(`${origin}/js/nav.js`)).status, 404);
    assert.equal((await fetch(`${origin}/assets/photo.png`)).status, 404);
    assert.equal((await fetch(origin, { redirect: "manual" })).headers.get("location"), "/camera/");
    assert.equal((await fetch(`${origin}/?from=collection&tab=stickers`, { redirect: "manual" })).headers.get("location"), "/game/?tab=stickers");
    assert.equal(calls, 0);

    browser = await chromium.launch({ executablePath: resolveBrowserPath(chromium),
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
    const settings = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await settings.addInitScript(() => {
      const context = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type === "webgl2" ? null : context.call(this, type, ...args);
      };
    });
    await settings.goto(`${origin}/camera/`);
    const cameraFrame = await settings.locator("#camera-screen").boundingBox();
    await settings.getByRole("button", { name: "打开相册" }).click();
    assert.deepEqual(await settings.locator("#gallery").boundingBox(), cameraFrame);
    assert.equal(await settings.getByRole("link", { name: "进入游戏" }).count(), 0);
    await settings.getByRole("button", { name: "收藏册", exact: true }).click();
    await settings.getByRole("button", { name: "图鉴", exact: true }).click();
    await settings.getByRole("link", { name: "进入游戏" }).click();
    await settings.getByRole("heading", { name: "Can-mie-rua 立体书" }).waitFor();
    assert.deepEqual(await settings.locator(".book-shell").boundingBox(), cameraFrame);
    assert.equal(cameraFrame.width / cameraFrame.height, 390 / 844);
    await settings.setViewportSize({ width: 320, height: 568 });
    assert.equal(await settings.locator("#view-pop, #app-stage, #global-nav-hud").count(), 0);
    await settings.getByRole("button", { name: "打开立体书" }).click();
    await settings.getByRole("button", { name: "添加贴纸", exact: true }).click();
    await settings.getByRole("link", { name: "去相机拍照" }).waitFor();
    await settings.getByRole("button", { name: "关闭贴纸抽屉" }).click();
    await settings.evaluate(async () => {
      const blob = await (await fetch("/camera/assets/cartridge.png")).blob();
      await CameraAlbum.saveSticker({ id: "desk-test", name: "胶卷贴纸", timestamp: Date.now(), blob, thumbnail: blob });
    });
    for (let i = 0; i < 2; i++) {
      await settings.getByRole("button", { name: "添加贴纸", exact: true }).click();
      await settings.getByRole("dialog").getByRole("button", { name: "胶卷贴纸" }).click();
      if (i === 0) await settings.getByRole("button", { name: "玩具", exact: true }).click();
      await settings.getByRole("button", { name: "胶卷贴纸" }).nth(i).waitFor();
    }
    const piece = settings.getByRole("button", { name: "胶卷贴纸" }).last();
    const original = await piece.boundingBox();
    await settings.mouse.move(original.x + original.width / 2, original.y + original.height / 2);
    await settings.mouse.down();
    await settings.mouse.move(original.x + original.width / 2 + 43, original.y + original.height / 2 + 32, { steps: 4 });
    await settings.mouse.up();
    const moved = await piece.boundingBox();
    assert.ok(moved.x > original.x + 35);
    await settings.getByRole("slider", { name: "大小" }).fill("48");
    const resized = await piece.boundingBox();
    assert.ok(resized.width > moved.width * 1.4);
    const savedLayout = () => settings.evaluate(() => JSON.parse(localStorage.getItem("shiguang-popup-book-v1")).decorations.study);
    const layoutBeforeReload = await savedLayout();
    await settings.reload();
    await settings.getByRole("button", { name: "打开立体书" }).click();
    await piece.waitFor();
    assert.deepEqual(await savedLayout(), layoutBeforeReload);
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
      await settings.setViewportSize(viewport);
      assert.equal(await settings.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.ok((await settings.locator("#desk-paper").boundingBox()).height > 260);
    }
    await settings.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await longPress(settings, piece);
    await settings.getByRole("button", { name: "移除", exact: true }).click();
    assert.equal(await settings.getByRole("button", { name: "胶卷贴纸" }).count(), 1);
    assert.ok(await settings.evaluate(() => CameraAlbum.getSticker("desk-test")));
    await settings.getByRole("button", { name: "设置", exact: true }).click();
    await settings.getByText("正在使用服务端环境变量中的 Key。").waitFor();
    await settings.getByLabel("DeepSeek API Key").fill("test-only-key");
    await settings.getByRole("button", { name: "保存配置" }).click();
    await settings.getByText("已配置 API Key。", { exact: true }).waitFor();
    assert.equal(await settings.getByLabel("DeepSeek API Key").inputValue(), "");
    delete process.env.DEEPSEEK_API_KEY;
    await settings.reload();
    await settings.getByRole("button", { name: "设置", exact: true }).click();
    await settings.getByText("已配置 API Key。", { exact: true }).waitFor();
    assert.deepEqual(await (await fetch(`${origin}/api/recognition-settings`)).json(), { configured: true, saved: true });
    const image = "data:image/png;base64," + fs.readFileSync(path.join(__dirname, "camera/assets/cartridge.png")).toString("base64");
    const identified = await fetch(`${origin}/api/identify-object`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectImage: image, contextImage: image })
    });
    assert.equal(identified.status, 200);
    assert.equal((await identified.json()).name, "台灯");
    calls = 0;
    await settings.getByRole("button", { name: "清除已保存的 Key" }).click();
    await settings.getByText("尚未配置 API Key。", { exact: true }).waitFor();
    await settings.getByRole("button", { name: "关闭设置" }).click();
    await settings.getByRole("link", { name: "返回收藏册" }).click();
    await settings.waitForURL("**/#album/collection/compendium");
    await settings.getByRole("button", { name: "贴纸", exact: true }).click();
    await settings.getByRole("link", { name: "进入游戏" }).click();
    await settings.waitForURL("**/game/?tab=stickers");
    await settings.goBack();
    await settings.waitForURL("**/#album/collection/stickers");
    await settings.close();
    process.env.DEEPSEEK_API_KEY = "test-only-key";
    console.log("PASS 收藏册路由、平面书页摆放与恢复、设置和识别、返回原收藏页签");
    await verifyHomeRoutes();
    await verifyBook(browser, origin);
    await verifyMigration(browser, origin);
    await verifySegmentation(browser, origin);
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await serveSamplePhoto(page);
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") console.log("BROWSER", message.text()); });
    const button = name => page.getByRole("button", { name, exact: true });
    await page.goto(`${origin}/camera/`);
    await page.evaluate(async () => {
      const blob = await (await fetch("/assets/photo.png")).blob();
      const image = await CameraPhoto.load(blob);
      await CameraAlbum.save({ id: "lamp", timestamp: Date.now(), format: "PNG", roll: "Gold 200", paper: "none",
        width: image.width, height: image.height, blob, thumbnail: await CameraPhoto.makeThumbnail(image) });
    });
    await button("打开相册").click();
    await button("查看 Gold 200 成片").click();
    await button("提取贴纸").click();
    assert.equal(await page.getByRole("img", { name: "提取出的透明贴纸" }).isVisible(), false);
    await page.getByRole("img", { name: "提取出的透明贴纸" }).waitFor({ timeout: 120000 });
    assert.equal(calls, 0);
    assert.ok(await page.getByRole("group", { name: "选择主体" }).getByRole("button").count() >= 1);
    const outputDir = process.env.CAMERA_PREVIEW_DIR;
    if (outputDir) await page.screenshot({ path: path.join(outputDir, "discovery-extract.png"), animations: "disabled" });
    await page.evaluate(() => {
      window.savedStickerWriter = CameraAlbum.saveSticker;
      CameraAlbum.saveSticker = async () => { throw new DOMException("No space", "QuotaExceededError"); };
    });
    await button("保存贴纸").click();
    await page.getByText("贴纸保存失败，请检查本机空间后重试。", { exact: true }).waitFor();
    assert.equal(await page.evaluate(async () => (await CameraAlbum.listDiscoveries("stickers")).length), 0);
    await page.evaluate(() => { CameraAlbum.saveSticker = window.savedStickerWriter; delete window.savedStickerWriter; });
    await button("保存贴纸").click();
    await button("已保存贴纸").waitFor();
    const firstId = await page.evaluate(async () => (await CameraAlbum.listDiscoveries("stickers"))[0].id);
    const alpha = await page.evaluate(async id => {
      const sticker = await CameraAlbum.getSticker(id);
      if (sticker.thumbnail.type !== "image/png") throw new Error("贴纸缩略图需要保留透明背景");
      const image = await CameraPhoto.load(sticker.blob);
      const canvas = document.createElement("canvas");
      canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0, opaque = 0, whiteBorder = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3];
        if (a < 10) transparent++;
        if (a > 245) {
          opaque++;
          if (r > 245 && g > 243 && b > 235) whiteBorder++;
        }
      }
      return { transparent, opaque, whiteBorder };
    }, firstId);
    assert.ok(alpha.transparent > 100);
    assert.ok(alpha.opaque > 100);
    assert.ok(alpha.whiteBorder > 200);
    await button("识别入图鉴").click();
    await page.getByText("确认名称、标签与观察后，收入图鉴。", { exact: true }).waitFor();
    assert.equal(calls, 1);
    assert.equal(await page.getByLabel("名称", { exact: true }).inputValue(), "台灯");
    assert.ok(await page.locator(".discovery-mood-picker button[aria-pressed='true']").count() >= 2);
    await button("确认收录").click();
    await page.getByText("已收入图鉴。", { exact: true }).waitFor();
    await button("收藏册").waitFor();
    assert.ok(page.url().endsWith("#album"), "should return directly to #album after adding to compendium");
    await button("收藏册").click();
    await button("图鉴").click();
    await page.getByRole("button", { name: "查看图鉴 台灯", exact: true }).click();
    await button("编辑观察").waitFor();
    assert.equal(await page.getByRole("heading", { name: "台灯", exact: true }).count(), 1);
    if (outputDir) await page.screenshot({ path: path.join(outputDir, "discovery-entry.png"), animations: "disabled" });

    // A repeated discovery can keep the old guide photo while retaining both stickers.
    await button("查看来源照片").click();
    await button("提取贴纸").click();
    await page.getByRole("img", { name: "提取出的透明贴纸" }).waitFor({ timeout: 120000 });
    await button("识别入图鉴").click();
    await page.getByText("确认名称、标签与观察后，收入图鉴。", { exact: true }).waitFor();
    await button("确认收录").click();
    await button("保留当前").waitFor();
    if (outputDir) await page.screenshot({ path: path.join(outputDir, "discovery-comparison.png"), animations: "disabled" });
    await button("保留当前").click();
    await button("收藏册").waitFor();
    assert.ok(page.url().endsWith("#album"), "should return directly to #album after keeping current compendium entry");
    let records = await page.evaluate(async () => ({ stickers: await CameraAlbum.listDiscoveries("stickers"), entries: await CameraAlbum.listDiscoveries("compendium") }));
    assert.equal(records.stickers.length, 2);
    assert.ok(records.stickers.every(sticker => sticker.name === "台灯" && sticker.category === "器物"));
    assert.equal(records.entries.length, 1);
    assert.ok(records.entries[0].tags?.length >= 2);
    assert.equal(records.entries[0].stickerId, firstId);
    const secondId = records.stickers.find(sticker => sticker.id !== firstId).id;
    await page.goto(`${origin}/camera/#album/sticker/${encodeURIComponent(secondId)}`);
    await button("识别入图鉴").click();
    await page.getByText("确认名称、标签与观察后，收入图鉴。", { exact: true }).waitFor();
    await button("确认收录").click();
    await button("更新图鉴").click();
    await button("收藏册").waitFor();
    assert.ok(page.url().endsWith("#album"), "should return directly to #album after updating compendium entry");
    records = await page.evaluate(async () => ({ stickers: await CameraAlbum.listDiscoveries("stickers"), entries: await CameraAlbum.listDiscoveries("compendium") }));
    assert.equal(records.stickers.length, 2);
    assert.equal(records.entries[0].stickerId, secondId);
    await button("收藏册").click();
    await button("图鉴").click();
    await page.getByRole("button", { name: "查看图鉴 台灯", exact: true }).click();
    await button("编辑观察").click();
    await page.getByLabel("观察笔记", { exact: true }).fill("窗边的一小盏光。");
    await button("保存观察").click();
    await page.getByText("窗边的一小盏光。", { exact: true }).waitFor();
    await page.evaluate(() => CameraAlbum.moveToTrash(["lamp"]));
    await button("查看来源照片").click();
    await page.getByText("来源照片已在最近删除或暂时无法打开。", { exact: true }).waitFor();
    assert.equal(await page.getByRole("img", { name: "完整照片中带白边的主体" }).count(), 1);
    await button("返回").click();
    await page.getByRole("button", { name: "查看图鉴 台灯", exact: true }).waitFor();
    await page.setViewportSize({ width: 320, height: 568 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (outputDir) await page.screenshot({ path: path.join(outputDir, "discovery-book-320.png"), animations: "disabled" });
    assert.deepEqual(errors, []);
    await page.evaluate(() => CameraAlbum.restore(["lamp"]));
    await page.goto(`${origin}/camera/#album/extract/lamp`);
    await page.getByRole("img", { name: "提取出的透明贴纸" }).waitFor({ timeout: 120000 });
    await button("涂抹选区").click();
    await button("保留 +").waitFor({ state: "visible" });
    const canvas = await page.locator(".discovery-canvas").boundingBox();
    await page.context().setOffline(true);
    await page.mouse.move(canvas.x + canvas.width * .75, canvas.y + canvas.height * .32);
    await page.mouse.down();
    await page.mouse.move(canvas.x + canvas.width * .99, canvas.y + canvas.height * .88, { steps: 8 });
    await page.mouse.up();
    await button("撤销").waitFor({ state: "visible" });
    await button("擦除 -").click();
    await page.mouse.move(canvas.x + canvas.width * .12, canvas.y + canvas.height * .2);
    await page.mouse.down();
    await page.mouse.move(canvas.x + canvas.width * .22, canvas.y + canvas.height * .3, { steps: 4 });
    await page.mouse.up();
    await button("撤销").click();
    await button("完成调整").click();
    await page.getByRole("img", { name: "提取出的透明贴纸" }).waitFor({ timeout: 120000 });
    assert.equal(await button("保存贴纸").isEnabled(), true);
    await page.context().setOffline(false);
    await page.goto(`${origin}/camera/#album/collection/stickers`);
    await page.reload();
    // Fresh-model failure has a retry path and can be cancelled by navigation.
    await page.route("**/camera/assets/inference/manifest.json", route => route.abort());
    await page.goto(`${origin}/camera/#album/extract/lamp`);
    await page.getByText(/Failed to fetch|加载失败|Failed to load/).waitFor();
    assert.equal(await button("重新提取").isEnabled(), true);
    await page.unroute("**/camera/assets/inference/manifest.json");
    await button("重新提取").click();
    await button("返回").click();
    await button("提取贴纸").waitFor();
    assert.equal(await page.locator(".discovery-canvas").count(), 0);
    console.log("PASS 框选重试、已加载模型离线推理、模型加载失败和取消");
    // Error and cancellation handling use a local provider fixture, never a paid model.
    await page.goto(`${origin}/camera/#album/sticker/${encodeURIComponent(secondId)}`);
    delete process.env.DEEPSEEK_API_KEY;
    await button("识别入图鉴").click();
    await page.getByText("云端识别尚未配置，贴纸已保存在本机。", { exact: true }).waitFor();
    process.env.DEEPSEEK_API_KEY = "test-only-key";
    providerMode = "invalid";
    await button("重新识别").click();
    await page.getByText("识别结果不完整，请重新识别。", { exact: true }).waitFor();
    providerMode = "rate";
    await button("重新识别").click();
    await page.getByText("识别请求较多，请稍后重试。", { exact: true }).waitFor();
    providerMode = "delay";
    await button("重新识别").click();
    await button("返回").click();
    await page.getByRole("heading", { name: "贴纸", exact: true }).waitFor();
    assert.equal(await page.locator(".discovery-form").count(), 0);
    providerMode = "ok";
    assert.equal(await page.evaluate(async () => (await CameraAlbum.listDiscoveries("stickers")).length), 2);
    assert.deepEqual(errors, []);

    const tinyImage = "data:image/png;base64," + fs.readFileSync(path.join(__dirname, "camera/assets/cartridge.png")).toString("base64");
    providerMode = "hang";
    const timeoutResponse = await fetch(`${origin}/api/identify-object`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectImage: tinyImage, contextImage: tinyImage })
    });
    assert.equal(timeoutResponse.status, 504);
    assert.match((await timeoutResponse.json()).error, /超时/);
    console.log("PASS 真实 U²-NetP 本地抠图、独立贴纸保存、云端接口、图鉴收录与更新/保留、来源回收、小屏、保存失败、取消和超时");
    await page.close();
  } finally {
    await browser?.close();
    server.close();
    upstream.close();
    if (previous.key === undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY = previous.key;
    if (previous.base === undefined) delete process.env.DEEPSEEK_BASE_URL; else process.env.DEEPSEEK_BASE_URL = previous.base;
    if (previous.legacyKey === undefined) delete process.env.BIGMODEL_API_KEY; else process.env.BIGMODEL_API_KEY = previous.legacyKey;
    if (previous.legacyBase === undefined) delete process.env.BIGMODEL_BASE_URL; else process.env.BIGMODEL_BASE_URL = previous.legacyBase;
    if (previous.settings === undefined) delete process.env.SHIGUANG_SETTINGS_FILE; else process.env.SHIGUANG_SETTINGS_FILE = previous.settings;
    await fs.promises.rm(path.join(settingsDirectory, "recognition.json"), { force: true });
    await fs.promises.rmdir(settingsDirectory);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });

"use strict";

window.CameraDiscovery = (() => {
  const categories = ["动物", "植物", "食物", "饮品", "甜点", "花卉", "文具", "家具", "灯饰", "玩具", "器物", "手作", "乐器", "复古", "建筑", "其他"];
  let runner;
  let cloud;
  let generation = 0;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function button(text, handle, className = "gallery-pill") {
    const element = node("button", className, text);
    element.type = "button";
    element.addEventListener("click", handle);
    return element;
  }

  function leave() {
    generation++;
    runner?.cancel();
    runner = undefined;
    cloud?.abort();
    cloud = undefined;
  }

  function frame(ctx, title, back) {
    ctx.header.replaceChildren(button("返回", back), node("h1", "", title));
    ctx.content.replaceChildren();
    ctx.footer.replaceChildren();
    ctx.content.classList.add("discovery-content");
  }

  function paragraph(text, className = "discovery-note") { return node("p", className, text); }

  function img(ctx, blob, label, className = "discovery-photo") {
    const image = node("img", className);
    image.src = ctx.urlFor(blob);
    image.alt = label;
    return image;
  }

  function status(parent) {
    const result = paragraph("", "discovery-status");
    result.setAttribute("role", "status");
    result.setAttribute("aria-live", "polite");
    parent.append(result);
    return result;
  }

  async function extract(photo, ctx) {
    frame(ctx, "提取贴纸", () => ctx.back(ctx.photoHash(photo.id)));
    if (photo.trashedAt) { ctx.content.append(paragraph("请先在相册恢复照片。")); return; }

    let loadingPhoto = false;
    let prepared;
    let result;
    let composition;
    let draft;
    let saving;
    let selecting = false;
    let brushStroke = null;
    let brushSize = 26;
    let operation = 0;
    let selectedLabel;

    const stage = node("div", "discovery-stage");
    const photoFrame = node("div", "extract-photo");
    const display = node("canvas", "discovery-canvas");
    display.setAttribute("role", "img");
    display.setAttribute("aria-label", "完整照片与主体轮廓，可点选主体或涂抹选区");

    const peelWrap = node("div", "extract-peel-wrap");
    peelWrap.hidden = true;
    const stickerPreview = node("canvas", "extract-sticker");
    stickerPreview.setAttribute("role", "img");
    stickerPreview.setAttribute("aria-label", "提取出的透明贴纸");
    stickerPreview.hidden = true;
    peelWrap.append(stickerPreview);

    const hint = paragraph("涂抹想提取的物体，松手即从原处精准撕下。", "extract-hint");
    hint.hidden = true;
    photoFrame.append(display, peelWrap, hint);
    stage.append(photoFrame);

    const tray = node("section", "extract-tray");
    tray.setAttribute("aria-label", "贴纸操作栏");
    const message = status(tray);

    const brushBar = node("label", "extract-brush-bar");
    brushBar.hidden = true;
    const brushRange = node("input");
    brushRange.type = "range";
    brushRange.min = "12";
    brushRange.max = "52";
    brushRange.value = String(brushSize);
    brushRange.setAttribute("aria-label", "笔刷粗细");
    brushRange.addEventListener("input", () => { brushSize = Number(brushRange.value) || 26; });
    brushBar.append("笔刷粗细", brushRange);

    const controls = node("div", "discovery-actions");
    const tools = node("div", "extract-tools");
    const choices = node("div", "discovery-subjects");
    choices.setAttribute("role", "group");
    choices.setAttribute("aria-label", "选择主体");
    tools.append(choices, controls);
    tray.append(tools, brushBar);
    ctx.content.append(stage, tray);

    const crop = button("涂抹选区", () => {
      selecting = !selecting;
      crop.setAttribute("aria-pressed", String(selecting));
      hint.hidden = !selecting;
      brushBar.hidden = !selecting;
      if (selecting) {
        peelWrap.hidden = stickerPreview.hidden = true;
        paint(prepared?.image);
      } else {
        if (composition) {
          paintRecessedBase();
          peelWrap.hidden = stickerPreview.hidden = false;
        } else {
          paint(prepared?.image);
        }
      }
    });
    crop.setAttribute("aria-pressed", "false");
    const retry = button("重新提取", () => {
      if (prepared) void infer(prepared.region);
      else void prepareAndInfer();
    });
    controls.append(crop, retry);

    const save = button("保存贴纸", () => void saveDraft());
    const identify = button("识别入图鉴", async () => {
      const sticker = await saveDraft();
      if (sticker && ctx.alive()) showIdentification(sticker, ctx);
    });
    identify.classList.add("discovery-primary");
    const bar = node("div", "gallery-toolbar discovery-toolbar");
    bar.append(save, identify);
    ctx.footer.append(bar);

    function busy(value) {
      save.disabled = value || !draft || Boolean(draft.saved);
      identify.disabled = value || !draft;
      retry.disabled = value;
      crop.disabled = value || !prepared;
      choices.inert = value;
    }

    function paint(source = prepared?.image) {
      if (!source) return;
      display.width = source.width;
      display.height = source.height;
      display.getContext("2d").drawImage(source, 0, 0);
    }

    function paintRecessedBase() {
      if (!prepared?.image) return;
      paint(prepared.image);
      const ctx2d = display.getContext("2d");
      ctx2d.save();
      ctx2d.fillStyle = "rgba(18, 14, 10, 0.24)";
      ctx2d.fillRect(0, 0, display.width, display.height);
      if (composition?.alpha) {
        const hole = document.createElement("canvas");
        hole.width = display.width;
        hole.height = display.height;
        const hCtx = hole.getContext("2d");
        hCtx.drawImage(composition.alpha, 0, 0, hole.width, hole.height);
        hCtx.globalCompositeOperation = "source-in";
        hCtx.fillStyle = "rgba(20, 15, 11, 0.65)";
        hCtx.fillRect(0, 0, hole.width, hole.height);
        ctx2d.drawImage(hole, 0, 0);
      }
      ctx2d.restore();
    }

    function drawBrushOverlay(points) {
      paint(prepared.image);
      const context = display.getContext("2d");
      const scaleFactor = display.width / Math.max(240, display.getBoundingClientRect().width || display.width);
      context.save();
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "rgba(255, 245, 214, 0.72)";
      context.fillStyle = "rgba(255, 245, 214, 0.72)";
      context.shadowColor = "rgba(42, 32, 20, 0.55)";
      context.shadowBlur = 8;
      const lineW = Math.max(10, brushSize * scaleFactor);
      context.lineWidth = lineW;
      if (points.length === 1) {
        context.beginPath();
        context.arc(points[0].x * display.width, points[0].y * display.height, lineW / 2, 0, Math.PI * 2);
        context.fill();
      } else {
        context.beginPath();
        context.moveTo(points[0].x * display.width, points[0].y * display.height);
        for (let i = 1; i < points.length; i++) {
          context.lineTo(points[i].x * display.width, points[i].y * display.height);
        }
        context.stroke();
      }
      context.restore();
    }

    function rasterizeBrush(points) {
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = maskCanvas.height = 320;
      const mCtx = maskCanvas.getContext("2d");
      const rectWidth = Math.max(240, display.getBoundingClientRect().width || 320);
      const radiusPx = Math.max(8, (brushSize / rectWidth) * 320 * 0.65);
      mCtx.lineCap = "round";
      mCtx.lineJoin = "round";
      mCtx.strokeStyle = "#ffffff";
      mCtx.fillStyle = "#ffffff";
      mCtx.lineWidth = radiusPx * 2;
      if (points.length === 1) {
        mCtx.beginPath();
        mCtx.arc(points[0].x * 320, points[0].y * 320, radiusPx, 0, Math.PI * 2);
        mCtx.fill();
      } else {
        mCtx.beginPath();
        mCtx.moveTo(points[0].x * 320, points[0].y * 320);
        for (let i = 1; i < points.length; i++) mCtx.lineTo(points[i].x * 320, points[i].y * 320);
        mCtx.stroke();
      }
      const data = mCtx.getImageData(0, 0, 320, 320).data;
      const out = new Uint8Array(320 * 320);
      for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3];
      return out;
    }

    function select(label) {
      composition = CameraCutout.compose(prepared.image, result, label);
      selectedLabel = label;
      draft = { id: crypto.randomUUID(), saved: false };
      save.textContent = "保存贴纸";
      paintRecessedBase();

      peelWrap.style.left = `${composition.bounds.x * 100}%`;
      peelWrap.style.top = `${composition.bounds.y * 100}%`;
      peelWrap.style.width = `${composition.bounds.width * 100}%`;
      peelWrap.style.height = `${composition.bounds.height * 100}%`;
      stickerPreview.width = composition.sticker.width;
      stickerPreview.height = composition.sticker.height;
      stickerPreview.getContext("2d").drawImage(composition.sticker, 0, 0);
      peelWrap.hidden = false;
      stickerPreview.hidden = false;

      peelWrap.getAnimations().forEach(animation => animation.cancel());
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        peelWrap.animate([
          { opacity: 0.92, transform: "perspective(650px) translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)" },
          { opacity: 1, transform: "perspective(650px) translate3d(5px, -11px, 28px) rotateX(13deg) rotateY(-12deg) rotateZ(-3deg) scale(1.05)" },
          { opacity: 1, transform: "perspective(650px) translate3d(3px, -6px, 16px) rotateX(6deg) rotateY(-7deg) rotateZ(-2deg) scale(1.03)" }
        ], { duration: 480, easing: "cubic-bezier(.18,.85,.28,1)" });
      }
      message.textContent = "已从原处撕下贴纸 · 点「识别入图鉴」由 AI 自动生成标签";
      for (const option of choices.children) option.setAttribute("aria-pressed", String(Number(option.dataset.label) === label));
      busy(false);
    }

    async function infer(region, brushMask = null) {
      if (!prepared) return;
      const request = ++operation;
      runner ||= CameraCutout.runner();
      draft = composition = result = undefined;
      choices.replaceChildren();
      peelWrap.hidden = stickerPreview.hidden = true;
      paint(prepared.image);
      busy(true);
      stage.classList.add("is-cutting");
      message.textContent = brushMask ? "正在按涂抹区域精准提取…" : "正在高速提取贴纸…";
      try {
        const next = await runner.infer(prepared.image, region, phase => {
          if (ctx.alive() && request === operation && phase?.phase) {
            message.textContent = phase.progress ? `${phase.phase} (${phase.progress}%)` : phase.phase;
          }
        }, brushMask);
        if (!ctx.alive() || request !== operation) return;
        result = next;
        if (result.choices.length > 1) result.choices.forEach((item, index) => {
          const option = button(`主体 ${index + 1}`, () => select(item.label));
          option.dataset.label = item.label;
          choices.append(option);
        });
        select(result.choices[0].label);
      } catch (error) {
        if (ctx.alive() && request === operation && error.name !== "AbortError") message.textContent = error.message;
      } finally {
        if (ctx.alive() && request === operation) {
          stage.classList.remove("is-cutting");
          busy(false);
        }
      }
    }

    async function prepareAndInfer() {
      if (loadingPhoto) return;
      loadingPhoto = true;
      busy(true);
      try {
        prepared ||= await CameraCutout.prepare(photo);
        if (ctx.alive()) await infer(prepared.region);
      } catch (error) {
        if (ctx.alive()) message.textContent = error.message;
      } finally {
        loadingPhoto = false;
        if (ctx.alive()) busy(false);
      }
    }

    async function saveDraft() {
      if (!draft) return;
      if (draft.saved) return draft.saved;
      if (saving) return saving;
      const current = draft;
      const image = composition;
      busy(true);
      saving = (async () => {
        try {
          const [blob, composite, mask, thumbnail, compositeThumbnail] = await Promise.all([
            CameraPhoto.encode(image.sticker, "image/png"), CameraPhoto.encode(image.full, "image/png"),
            CameraPhoto.encode(image.alpha, "image/png"), CameraCutout.thumbnail(image.sticker), CameraPhoto.makeThumbnail(image.full)
          ]);
          const sticker = {
            id: current.id,
            purpose: "toy",
            tags: [],
            timestamp: Date.now(),
            photoId: photo.id,
            photoTimestamp: photo.timestamp,
            roll: photo.roll,
            name: "未命名贴纸",
            category: "其他",
            blob, composite, mask, thumbnail, compositeThumbnail,
            bounds: image.bounds, width: image.full.width, height: image.full.height
          };
          await CameraAlbum.saveSticker(sticker);
          current.saved = sticker;
          if (ctx.alive() && current === draft) {
            save.textContent = "已保存贴纸";
            message.textContent = "已存入贴纸收藏 · 可点「识别入图鉴」让 AI 标注。";
          }
          return sticker;
        } catch {
          if (ctx.alive()) message.textContent = "贴纸保存失败，请检查本机空间后重试。";
        } finally { saving = undefined; if (ctx.alive()) busy(false); }
      })();
      return saving;
    }

    function point(event) {
      const rect = display.getBoundingClientRect();
      return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
    }

    display.addEventListener("pointerdown", event => {
      if (!prepared || crop.disabled || event.button !== 0) return;
      const start = point(event);
      if (selecting) {
        brushStroke = [start];
        display.setPointerCapture(event.pointerId);
        drawBrushOverlay(brushStroke);
        return;
      }
      if (!result) return;
      const x = Math.floor((start.x - result.region.x) / result.region.width * 320);
      const y = Math.floor((start.y - result.region.y) / result.region.height * 320);
      const label = x >= 0 && y >= 0 && x < 320 && y < 320 ? result.labels[y * 320 + x] : 0;
      if (result.choices.some(item => item.label === label) && label !== selectedLabel) select(label);
    });

    display.addEventListener("pointermove", event => {
      if (!brushStroke) return;
      const pt = point(event);
      const last = brushStroke[brushStroke.length - 1];
      if (!last || Math.hypot(pt.x - last.x, pt.y - last.y) >= 0.008) {
        brushStroke.push(pt);
        drawBrushOverlay(brushStroke);
      }
    });

    function finishBrush(event) {
      if (!brushStroke) return;
      const points = brushStroke;
      brushStroke = null;
      const bounds = prepared.region;
      const rectWidth = Math.max(240, display.getBoundingClientRect().width || 320);
      const padNorm = Math.max(0.035, (brushSize / rectWidth) * 1.4);
      let minX = 1, maxX = 0, minY = 1, maxY = 0;
      for (const p of points) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
      const x = Math.max(bounds.x, minX - padNorm);
      const y = Math.max(bounds.y, minY - padNorm);
      const maxRight = Math.min(bounds.x + bounds.width, maxX + padNorm);
      const maxBottom = Math.min(bounds.y + bounds.height, maxY + padNorm);
      const width = maxRight - x;
      const height = maxBottom - y;
      if (event.type === "pointercancel" || width < .035 || height < .035) {
        if (composition) {
          paintRecessedBase();
          peelWrap.hidden = stickerPreview.hidden = false;
        } else {
          paint(prepared?.image);
        }
        if (event.type !== "pointercancel") message.textContent = "请涂抹稍大一些的物体范围。";
        return;
      }
      const brushMask = rasterizeBrush(points);
      selecting = false;
      hint.hidden = true;
      brushBar.hidden = true;
      crop.setAttribute("aria-pressed", "false");
      void infer({ x, y, width, height }, brushMask);
    }

    display.addEventListener("pointerup", finishBrush);
    display.addEventListener("pointercancel", finishBrush);
    void prepareAndInfer();
  }

  async function showIdentification(sticker, ctx, entry = null) {
    cloud?.abort();
    const ticket = ++generation;
    const alive = () => ctx.alive() && ticket === generation;
    frame(ctx, entry ? "编辑观察" : "识别入图鉴", () => ctx.navigate(`#album/sticker/${encodeURIComponent(sticker.id)}`));
    const { categoryToPurpose } = await import("/camera/prop-types.mjs").catch(() => ({ categoryToPurpose: {} }));
    if (!alive()) return;
    const preview = img(ctx, sticker.composite, "完整照片上的主体贴纸", "discovery-form-photo");
    const form = node("form", "discovery-form");
    const name = node("input");
    name.required = true;
    name.maxLength = 40;
    name.value = entry?.name || "";
    const category = node("select");
    for (const value of categories) category.add(new Option(value, value));
    category.value = entry?.category || "其他";
    const observation = node("textarea");
    observation.rows = 3;
    observation.maxLength = 120;
    observation.value = entry?.observation || "";
    for (const [text, field] of [["名称", name], ["分类", category], ["观察笔记", observation]]) {
      const label = node("label", "discovery-field", text);
      field.setAttribute("aria-label", text);
      label.append(field);
      if (field === category) window.TimeLightSelect?.enhance(category, "graphite");
      form.append(label);
    }

    let aiTags = Array.isArray(entry?.tags || sticker.tags) ? [...(entry?.tags || sticker.tags)] : [];
    const tagField = node("div", "discovery-field", "AI 识别标签");
    const aiTagsBox = node("div", "discovery-mood-picker");
    aiTagsBox.setAttribute("aria-label", "AI 识别标签");
    function renderAiTags() {
      aiTagsBox.replaceChildren();
      if (!aiTags.length) {
        aiTagsBox.append(paragraph("AI 识别后自动生成贴纸标签。", "discovery-note"));
        return;
      }
      for (const t of aiTags) {
        const chip = button(`#${t}`, () => {
          const pressed = chip.getAttribute("aria-pressed") !== "true";
          chip.setAttribute("aria-pressed", String(pressed));
        });
        chip.dataset.tag = t;
        chip.setAttribute("aria-pressed", "true");
        aiTagsBox.append(chip);
      }
    }
    renderAiTags();
    tagField.append(aiTagsBox);
    form.append(tagField);

    ctx.content.append(preview, form);
    const message = status(form);
    const actions = node("div", "discovery-actions");
    const identify = button("重新识别", identifyNow);
    const submit = node("button", "gallery-pill discovery-primary", entry ? "保存观察" : "确认收录");
    submit.type = "submit";
    actions.append(identify, submit);
    form.append(actions);
    let pending = false;

    async function identifyNow() {
      cloud?.abort();
      const controller = new AbortController();
      cloud = controller;
      identify.disabled = submit.disabled = true;
      message.textContent = "正在云端识别主体与生成标签…";
      try {
        const [subject, context] = await Promise.all([CameraPhoto.load(sticker.blob), CameraPhoto.load(sticker.composite)]);
        if (!alive() || controller.signal.aborted) return;
        const response = await fetch("/api/identify-object", {
          method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subjectImage: CameraCutout.cloudImage(subject, 768), contextImage: CameraCutout.cloudImage(context, 768) })
        });
        const result = await response.json().catch(() => ({ error: "识别服务暂时无法使用，请重试。" }));
        if (!alive() || controller.signal.aborted) return;
        if (!response.ok) throw new Error(result.error || "识别未完成，请重试。");
        if (typeof result.name !== "string" || !categories.includes(result.category) || typeof result.observation !== "string") throw new Error("识别结果不完整，请重试。");
        name.value = result.name;
        category.value = result.category;
        observation.value = result.observation;
        aiTags = Array.isArray(result.tags) && result.tags.length
          ? result.tags
          : [result.category, "古灵精怪", "奇思妙想"];
        renderAiTags();
        message.textContent = "确认名称、标签与观察后，收入图鉴。";
      } catch (error) {
        if (alive() && error.name !== "AbortError") message.textContent = /[\u4e00-\u9fff]/.test(error.message) ? error.message : "网络暂时无法连接，请重试。";
      } finally {
        if (alive() && cloud === controller) identify.disabled = submit.disabled = false;
      }
    }

    async function collect(replace = false, previous = null) {
      if (pending) return;
      pending = true;
      submit.disabled = identify.disabled = true;
      const activeTags = [...aiTagsBox.querySelectorAll("button[aria-pressed='true']")].map(b => b.dataset.tag).filter(Boolean);
      const mappedPurpose = categoryToPurpose[category.value] || sticker.purpose || "toy";
      const details = { name: name.value, category: category.value, observation: observation.value, tags: activeTags, purpose: mappedPurpose };
      try {
        const result = await CameraAlbum.collectSticker(sticker.id, details, replace, previous, entry?.key);
        if (!alive()) return;
        if (result.conflict) {
          await comparison(result.conflict);
        } else {
          ctx.navigate(`#album/entry/${encodeURIComponent(result.entry.key)}`);
          ctx.notice("已收入图鉴。");
        }
      } catch (error) { if (alive()) message.textContent = error.message || "收录失败，请重试。"; }
      finally { pending = false; if (alive()) submit.disabled = identify.disabled = false; }
    }

    async function comparison(previous) {
      const old = await CameraAlbum.getSticker(previous.stickerId);
      if (!alive()) return;
      const panel = node("section", "discovery-comparison");
      panel.setAttribute("aria-label", "新旧图鉴照片对比");
      panel.append(node("h2", "", "要更新这张图鉴照片吗？"));
      const pair = node("div", "discovery-pair");
      for (const [label, item] of [["当前图鉴", old], ["这次发现", sticker]]) {
        const figure = node("figure");
        if (item) figure.append(img(ctx, item.composite, label));
        figure.append(node("figcaption", "", label));
        pair.append(figure);
      }
      const update = button("更新图鉴", () => void collect(true, previous.stickerId));
      const keep = button("保留当前", () => ctx.navigate(`#album/entry/${encodeURIComponent(previous.key)}`));
      panel.append(pair, paragraph("两张贴纸都已保存在收藏里。"), keep, update);
      form.hidden = preview.hidden = true;
      ctx.content.querySelector(".discovery-comparison")?.remove();
      ctx.content.append(panel);
      update.addEventListener("click", () => { form.hidden = preview.hidden = false; panel.remove(); });
    }
    form.addEventListener("submit", event => { event.preventDefault(); if (form.reportValidity()) void collect(); });
    if (!entry) void identifyNow();
  }

  async function collection(route, ctx) {
    const tab = route.tab || "stickers";
    frame(ctx, "我的收藏册", () => ctx.back("#album"));
    const game = node("a", "gallery-pill gallery-game", "进入游戏");
    game.href = `/game/?tab=${tab}`;
    ctx.header.append(game);
    const tabs = node("div", "discovery-tabs");
    for (const [key, title] of [["stickers", "贴纸"], ["compendium", "图鉴"]]) {
      const option = button(title, () => ctx.navigate(`#album/collection/${key}`, true));
      option.setAttribute("aria-pressed", String(tab === key));
      tabs.append(option);
    }
    const paper = node("section", "discovery-paper");
    paper.setAttribute("aria-label", tab === "stickers" ? "贴纸收藏" : "万物图鉴");
    const list = node("div", "discovery-grid");
    const filters = node("div", "discovery-filters");
    const category = node("select");
    category.setAttribute("aria-label", "筛选收藏分类");
    category.add(new Option("全部分类", ""));
    for (const value of categories) category.add(new Option(value, value));
    filters.append(category);
    window.TimeLightSelect?.enhance(category, "paper");
    const pageBar = node("div", "discovery-pages");
    paper.append(filters, list, pageBar);
    ctx.content.append(tabs, paper);
    list.append(paragraph("正在翻开收藏册…"));
    const items = await CameraAlbum.listDiscoveries(tab);
    if (!ctx.alive()) return;
    let page = 0;
    let render = 0;
    async function draw() {
      const request = ++render;
      const filtered = items.filter(item => !category.value || item.category === category.value);
      const pages = Math.max(1, Math.ceil(filtered.length / 12));
      page = Math.min(page, pages - 1);
      list.replaceChildren();
      pageBar.replaceChildren();
      if (!filtered.length) {
        list.append(paragraph(category.value ? "这一页还没有发现。" : tab === "stickers" ? "从一张照片开始，把喜欢的物体留成贴纸。" : "把喜欢的贴纸识别入册，写下你的第一条观察。"));
        return;
      }
      for (const item of filtered.slice(page * 12, (page + 1) * 12)) {
        const isEntry = tab === "compendium";
        const card = button("", () => ctx.navigate(`#album/${isEntry ? "entry" : "sticker"}/${encodeURIComponent(isEntry ? item.key : item.id)}`), "discovery-card");
        card.setAttribute("aria-label", `${isEntry ? "查看图鉴" : "查看贴纸"} ${item.name || "未命名贴纸"}`);
        const image = node("img", isEntry ? "discovery-card-photo" : "discovery-card-sticker");
        image.alt = "";
        card.append(image, node("span", "discovery-card-title", item.name || "未命名贴纸"));
        list.append(card);
        if (isEntry) {
          const sticker = await CameraAlbum.getSticker(item.stickerId);
          if (!ctx.alive() || request !== render) return;
          if (sticker) image.src = ctx.urlFor(sticker.compositeThumbnail || sticker.composite);
        } else image.src = ctx.urlFor(item.thumbnail);
      }
      const previous = button("上一页", () => { page--; void draw(); });
      const next = button("下一页", () => { page++; void draw(); });
      previous.disabled = page === 0;
      next.disabled = page >= pages - 1;
      pageBar.append(previous, node("span", "", `${page + 1} / ${pages}`), next);
    }
    category.addEventListener("change", () => { page = 0; void draw(); });
    await draw();
  }

  async function detail(route, ctx) {
    const isEntry = route.view === "entry";
    const entries = isEntry ? await CameraAlbum.listDiscoveries("compendium") : [];
    if (!ctx.alive()) return;
    const entry = entries.find(item => item.key === route.id);
    const sticker = await CameraAlbum.getSticker(isEntry ? entry?.stickerId || "" : route.id);
    if (!ctx.alive()) return;
    frame(ctx, isEntry ? "万物图鉴" : "贴纸", () => ctx.back(`#album/collection/${isEntry ? "compendium" : "stickers"}`));
    if (!sticker) { ctx.content.append(paragraph("这份收藏暂时无法打开。")); return; }
    const sheet = node("article", "discovery-paper discovery-detail");
    const stage = node("div", isEntry ? "discovery-entry-picture" : "discovery-sticker-picture");
    stage.append(img(ctx, isEntry ? sticker.composite : sticker.blob, isEntry ? "完整照片中带白边的主体" : "透明背景的实拍贴纸"));
    sheet.append(stage, node("h2", "", entry?.name || sticker.name));
    if (entry) {
      sheet.append(paragraph(entry.category, "discovery-category"), paragraph(entry.observation, "discovery-observation"));
    }
    const { propTypes } = await import("/camera/prop-types.mjs");
    if (!ctx.alive()) return;
    const purpose = propTypes[entry?.purpose || sticker.purpose]?.name;
    sheet.append(paragraph([new Date(sticker.photoTimestamp || sticker.timestamp).toLocaleDateString("zh-CN"),
      sticker.roll, purpose].filter(Boolean).join(" · ")));
    const tagList = entry?.tags?.length ? entry.tags : sticker.tags;
    if (Array.isArray(tagList) && tagList.length) {
      const tagsBox = node("div", "extract-detail-tags");
      for (const t of tagList) tagsBox.append(node("span", "discovery-category", `#${t}`));
      sheet.append(tagsBox);
    }
    const source = button("查看来源照片", async () => {
      const photo = await CameraAlbum.get(sticker.photoId);
      if (!ctx.alive()) return;
      if (!photo || photo.trashedAt) { ctx.notice("来源照片已在最近删除或暂时无法打开。"); return; }
      ctx.navigate(ctx.photoHash(sticker.photoId));
    });
    const actions = node("div", "discovery-actions");
    if (sticker.photoId) actions.append(source);
    if (isEntry) actions.append(button("编辑观察", () => showIdentification(sticker, ctx, entry)));
    else {
      if (sticker.composite && sticker.photoId) actions.append(button("识别入图鉴", () => showIdentification(sticker, ctx)));
      const download = node("a", "gallery-pill", "导出贴纸");
      download.href = ctx.urlFor(sticker.blob);
      download.download = `拾光贴纸-${sticker.id}.png`;
      actions.append(download);
    }
    sheet.append(actions);
    ctx.content.append(sheet);
  }

  async function show(route, ctx) {
    frame(ctx, "收藏册", () => ctx.back("#album"));
    try {
      if (route.view === "collection") return await collection(route, ctx);
      if (route.view === "extract") {
        const photo = await CameraAlbum.get(route.id);
        if (!ctx.alive()) return;
        if (!photo) { ctx.content.append(paragraph("来源照片暂时无法打开。")); return; }
        return await extract(photo, ctx);
      }
      await detail(route, ctx);
    } catch {
      if (ctx.alive()) ctx.content.append(paragraph("暂时无法读取收藏，请返回后重试。"));
    }
  }

  return { show, leave };
})();

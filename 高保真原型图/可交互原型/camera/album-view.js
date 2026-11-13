"use strict";

window.CameraGallery = (() => {
  const byId = id => document.getElementById(id);
  const camera = byId("camera-screen");
  const screen = byId("gallery");
  const header = byId("gallery-header");
  const content = byId("gallery-content");
  const footer = byId("gallery-footer");
  const message = byId("gallery-message");
  const confirm = byId("gallery-confirm");
  const fileInput = byId("photo-import");
  const sections = {
    all: "全部照片", favorites: "收藏", camera: "相机拍摄", imports: "导入照片", trash: "最近删除"
  };
  const selected = new Set();
  const urls = new Map();
  const dateFormat = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  const timeFormat = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  let hooks;
  let route;
  let revision = 0;
  let filter = "all";
  let selecting = false;
  let scrollPosition = 0;
  let list = freshList();
  let menu;
  let statusTimer;
  let importDraft;
  let unsaved;
  let movePhoto;
  let longPress;
  let ignoreTile = "";
  let ignoreClickUntil = 0;
  let reloadLibrary = false;

  function freshList(limit = 24) {
    return { items: [], next: null, loaded: false, loading: false, error: false, limit };
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function button(text, handle, className = "gallery-button") {
    const node = element("button", className, text);
    node.type = "button";
    node.addEventListener("click", handle);
    return node;
  }

  function iconButton(label, symbol, handle, className = "gallery-icon") {
    const node = button("", handle, className);
    node.setAttribute("aria-label", label);
    const icon = element("span", "gallery-icon-shape");
    icon.setAttribute("aria-hidden", "true");
    if (window.SVG_ICONS[symbol]) icon.innerHTML = window.SVG_ICONS[symbol];
    else icon.classList.add(symbol);
    node.append(icon);
    return node;
  }

  function urlFor(blob) {
    if (urls.has(blob)) return urls.get(blob);
    const url = URL.createObjectURL(blob);
    urls.set(blob, url);
    return url;
  }

  function clearUrls() {
    urls.forEach(url => URL.revokeObjectURL(url));
    urls.clear();
  }

  function notice(text) {
    clearTimeout(statusTimer);
    message.textContent = text;
    message.hidden = false;
    statusTimer = setTimeout(() => { message.hidden = true; }, 2600);
  }

  function parseRoute() {
    const hash = location.hash;
    const collection = /^#album\/collection\/(stickers|compendium)$/.exec(hash);
    if (collection) return { hash, view: "collection", tab: collection[1] };
    const discovery = /^#album\/(extract|sticker|entry)\/(.+)$/.exec(hash);
    if (discovery) {
      try { return { hash, view: discovery[1], id: decodeURIComponent(discovery[2]) }; }
      catch { return { hash, view: "library" }; }
    }
    if (hash === "#album") return { hash, view: "library" };
    if (hash === "#album/import") return { hash, view: "import" };
    if (hash === "#album/unsaved") return { hash, view: "unsaved" };
    const match = /^#album\/(photo|edit)\/(.+)$/.exec(hash);
    if (match) {
      try {
        return { hash, view: match[1], id: decodeURIComponent(match[2]) };
      } catch {
        return { hash, view: "library" };
      }
    }
    return { hash, view: "camera" };
  }

  function navigate(hash, replace = false) {
    const parent = replace ? history.state?.galleryParent : location.hash;
    history[replace ? "replaceState" : "pushState"]({ galleryParent: parent }, "", hash || location.pathname + location.search);
    if (route?.hash === location.hash) route = { ...route, hash: null };
    syncRoute();
  }

  function back(hash) {
    if (history.state?.galleryParent === hash) {
      const previous = route;
      history.back();
      setTimeout(() => {
        if (route === previous) navigate(hash, true);
      }, 250);
      return;
    }
    navigate(hash, true);
  }

  const photoHash = id => `#album/photo/${encodeURIComponent(id)}`;

  function resetList(preserve = false) {
    list = freshList(preserve ? Math.max(24, list.items.length) : 24);
    if (!preserve) scrollPosition = 0;
  }

  function renderFrame(view) {
    header.replaceChildren();
    content.replaceChildren();
    footer.replaceChildren();
    screen.dataset.view = view;
    content.scrollTop = 0;
    content.classList.remove("discovery-content");
  }

  function syncRoute() {
    const next = parseRoute();
    if (route?.hash === next.hash) return;
    const previous = route;
    route = next;
    const request = ++revision;
    CameraDiscovery.leave();
    closeMenu();
    if (confirm.open) confirm.close();
    clearUrls();
    clearTimeout(statusTimer);
    message.hidden = true;
    movePhoto = undefined;
    if (previous?.view === "library") scrollPosition = content.scrollTop;

    const viewing = next.view !== "camera";
    if (viewing && (!previous || previous.view === "camera")) {
      resetList();
      hooks.suspendCamera();
    }
    camera.hidden = viewing;
    screen.hidden = !viewing;
    if (!viewing) {
      selecting = false;
      selected.clear();
      if (previous) hooks.resumeCamera();
      return;
    }
    if (next.view === "edit" && next.id) {
      navigate(photoHash(next.id), true);
      return;
    }
    renderFrame(next.view);
    if (["collection", "extract", "sticker", "entry"].includes(next.view)) {
      void CameraDiscovery.show(next, { header, content, footer, navigate, back, photoHash, urlFor, notice,
        alive: () => request === revision });
      return;
    }
    if (next.view === "library") {
      if (reloadLibrary) {
        resetList(true);
        reloadLibrary = false;
      }
      renderLibrary();
      if (!list.loaded) void loadPage();
      return;
    }
    if (next.view === "import" && importDraft) {
      renderImport(importDraft);
      return;
    }
    if (next.view === "unsaved" && unsaved) {
      renderPhoto(unsaved, false);
      return;
    }
    if (!next.id) {
      navigate("#album", true);
      return;
    }

    header.append(iconButton("返回相册", "chevron-left", () => back("#album")), element("h1", "", "照片"));
    content.append(element("p", "gallery-empty", "正在打开照片…"));
    void CameraAlbum.get(next.id).then(photo => {
      if (request !== revision) return;
      if (!photo) {
        navigate("#album", true);
        notice("这张照片已不在相册中。");
      } else {
        renderPhoto(photo);
      }
    }).catch(() => {
      if (request === revision) content.replaceChildren(element("p", "gallery-empty", "暂时无法打开照片。"));
    });
  }

  function closeMenu() {
    if (!menu) return;
    menu.anchor.setAttribute("aria-expanded", "false");
    menu.node.remove();
    menu = null;
  }

  function toggleMenu(anchor, parent, children, place) {
    if (menu?.anchor === anchor) {
      closeMenu();
      return;
    }
    closeMenu();
    const node = element("div", `gallery-popover ${place}`);
    node.append(...children);
    anchor.setAttribute("aria-expanded", "true");
    menu = { anchor, node };
    parent.append(node);
  }

  function selectFilter(value) {
    if (filter === value) return;
    filter = value;
    selected.clear();
    selecting = false;
    resetList();
    clearUrls();
    renderLibrary();
    void loadPage();
  }

  function dayTitle(timestamp) {
    const day = new Date(timestamp);
    const today = new Date();
    if (day.toDateString() === today.toDateString()) return "今天";
    today.setDate(today.getDate() - 1);
    return day.toDateString() === today.toDateString() ? "昨天" : dateFormat.format(day);
  }

  function renderLibraryHeader() {
    closeMenu();
    const returnCamera = iconButton("返回相机", "chevron-left", () => back(""));
    if (selecting) {
      header.replaceChildren(returnCamera, element("h1", "", `已选 ${selected.size} 张`),
        button("取消", () => setSelecting(false), "gallery-pill"));
      return;
    }

    const picker = button(sections[filter], () => {
      const options = Object.entries(sections).map(([key, label]) => {
        const option = button(label, () => {
          closeMenu();
          selectFilter(key);
        });
        option.setAttribute("aria-pressed", String(key === filter));
        return option;
      });
      toggleMenu(picker, header, options, "gallery-filter-menu");
    }, "gallery-pill gallery-filter");
    picker.setAttribute("aria-label", `筛选照片，当前：${sections[filter]}`);
    picker.setAttribute("aria-expanded", "false");
    picker.append(element("span", "chevron-down"));
    const upload = button("导入", () => fileInput.click(), "gallery-pill");
    upload.setAttribute("aria-label", "导入照片");
    header.replaceChildren(returnCamera, picker, upload);
  }

  function renderLibraryFooter() {
    if (!selecting) {
      footer.replaceChildren(iconButton("返回相机拍摄", "camera", () => back(""), "gallery-camera"),
        button("收藏册", () => navigate("#album/collection/stickers"), "gallery-pill gallery-collection"));
      return;
    }

    const trash = filter === "trash";
    const ids = [...selected];
    const bar = element("div", "gallery-toolbar");
    if (trash) {
      const restore = button("恢复", () => void changePhotos(ids, "restore"));
      restore.disabled = !ids.length;
      bar.append(restore);
    } else {
      const favorite = button("收藏", () => void changePhotos(ids, "favorite"));
      const remove = button("删除", () => confirmTrash(ids), "gallery-button gallery-danger");
      favorite.disabled = remove.disabled = !ids.length;
      bar.append(favorite, remove);
    }
    footer.replaceChildren(bar);
  }

  function setSelecting(value) {
    selecting = value;
    if (!value) selected.clear();
    renderLibraryHeader();
    renderLibraryFooter();
    updateTiles();
    const selectionButton = content.querySelector(".gallery-select");
    if (selectionButton) selectionButton.hidden = value;
  }

  function selectTile(id) {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    renderLibraryHeader();
    renderLibraryFooter();
    updateTiles();
  }

  function updateTiles() {
    for (const tile of content.querySelectorAll("[data-photo-id]")) {
      if (selecting) tile.setAttribute("aria-pressed", String(selected.has(tile.dataset.photoId)));
      else tile.removeAttribute("aria-pressed");
    }
  }

  function cancelLongPress() {
    if (longPress) clearTimeout(longPress.timer);
    longPress = undefined;
  }

  function tileFor(item) {
    const tile = button("", () => {
      if (ignoreTile === item.id && Date.now() < ignoreClickUntil) {
        ignoreTile = "";
        return;
      }
      if (selecting) selectTile(item.id);
      else navigate(photoHash(item.id));
    }, "gallery-tile");
    tile.dataset.photoId = item.id;
    tile.setAttribute("aria-label", `查看 ${item.roll} 成片`);
    const image = element("img");
    image.alt = "";
    image.draggable = false;
    image.loading = "lazy";
    if (item.thumbnail instanceof Blob) image.src = urlFor(item.thumbnail);
    tile.append(image, element("span", "gallery-tile-check"));
    if (item.favorite) {
      const mark = element("span", "gallery-tile-favorite");
      mark.setAttribute("aria-hidden", "true");
      mark.innerHTML = window.SVG_ICONS.heart;
      tile.append(mark);
    }
    tile.addEventListener("pointerdown", event => {
      if (event.button !== 0 || selecting) return;
      ignoreTile = "";
      cancelLongPress();
      const { clientX: x, clientY: y } = event;
      const timer = setTimeout(() => {
        longPress = undefined;
        if (!tile.isConnected || route.view !== "library") return;
        ignoreTile = item.id;
        ignoreClickUntil = Date.now() + 750;
        selected.add(item.id);
        setSelecting(true);
      }, 460);
      longPress = { x, y, timer };
    });
    tile.addEventListener("pointermove", event => {
      if (longPress && Math.hypot(event.clientX - longPress.x, event.clientY - longPress.y) > 10) cancelLongPress();
    });
    ["pointercancel", "pointerleave", "pointerup"].forEach(event => tile.addEventListener(event, cancelLongPress));
    tile.addEventListener("contextmenu", event => event.preventDefault());
    return tile;
  }

  function renderLibrary() {
    renderLibraryHeader();
    renderLibraryFooter();
    const container = element("div", "gallery-timeline");
    if (!list.items.length) {
      const copy = list.error ? "暂时无法读取相册。" : !list.loaded ? "正在读取照片…" :
        filter === "all" ? "还没有照片。拍一张，或从设备导入。" :
        filter === "trash" ? "最近删除里没有照片。" : "这里还没有照片。";
      container.append(element("p", "gallery-empty", copy));
    }
    let lastDay;
    let grid;
    for (const item of list.items) {
      const day = dayTitle(item.timestamp);
      if (day !== lastDay) {
        const row = element("div", "gallery-date");
        row.append(element("h2", "", day));
        if (!lastDay) {
          const selection = button("选择", () => setSelecting(true), "gallery-select");
          selection.hidden = selecting;
          row.append(selection);
        }
        grid = element("div", "gallery-grid");
        container.append(row, grid);
        lastDay = day;
      }
      grid.append(tileFor(item));
    }
    if (list.next || list.error) {
      const more = button(list.error ? "重试" : "加载更多", () => {
        more.disabled = true;
        void loadPage();
      }, "gallery-pill gallery-more");
      container.append(more);
    }
    content.replaceChildren(container);
    content.scrollTop = scrollPosition;
    updateTiles();
  }

  async function loadPage() {
    const pending = list;
    if (pending.loading || (pending.loaded && !pending.next)) return;
    pending.loading = true;
    try {
      const result = await CameraAlbum.list(pending.next, pending.limit, filter);
      if (list !== pending) return;
      pending.items.push(...result.items);
      pending.next = result.next;
      pending.loaded = true;
      pending.error = false;
      pending.limit = 24;
    } catch {
      pending.error = true;
    } finally {
      pending.loading = false;
      if (list === pending && route.view === "library") renderLibrary();
    }
  }

  function downloadLink(photo) {
    const blob = photo.blob;
    const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    const extension = extensions[blob.type] || "png";
    const link = element("a", "gallery-button", "导出照片");
    link.href = urlFor(blob);
    link.download = `拾光-${photo.timestamp}.${extension}`;
    return link;
  }

  function showShare(photo, anchor) {
    if (menu?.anchor === anchor) {
      closeMenu();
      return;
    }
    const options = [downloadLink(photo)];
    const extension = photo.format?.toLowerCase() || "jpg";
    const file = new File([photo.blob], `拾光-${photo.timestamp}.${extension}`, { type: photo.blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      options.unshift(button("系统分享", async () => {
        try {
          await navigator.share({ files: [file] });
        } catch (error) {
          if (error.name !== "AbortError") notice("分享失败，可以导出照片。");
        }
      }));
    }
    toggleMenu(anchor, footer, options, "gallery-action-menu");
  }

  function photoInfo(photo) {
    const lens = CameraLens.active(photo.lenses) ? [...new Set(photo.lenses)].map(value => CameraLens.choices[value]).join(" / ") : null;
    const paper = photo.paper && photo.paper !== "none" ? CameraPaper.choices[photo.paper] : null;
    return [photo.roll, photo.format, `${photo.width} × ${photo.height}`, lens, paper, photo.origin].filter(Boolean);
  }

  function renderPhoto(photo, saved = true) {
    renderFrame("photo");
    const date = new Date(photo.timestamp);
    const title = element("h1", "gallery-photo-time", dateFormat.format(date));
    title.append(element("small", "", timeFormat.format(date)));
    header.append(iconButton("返回相册", "chevron-left", () => back("#album")), title);
    if (saved && !photo.trashedAt) {
      const favorite = iconButton("收藏照片", "heart", async () => {
        favorite.disabled = true;
        try {
          const value = !photo.favorite;
          await CameraAlbum.setFavorite([photo.id], value);
          photo.favorite = value;
          favorite.setAttribute("aria-pressed", String(value));
          const preview = list.items.find(item => item.id === photo.id);
          if (preview) preview.favorite = value;
          if (filter === "favorites") reloadLibrary = true;
        } catch {
          notice("暂时无法更新收藏。");
        } finally {
          favorite.disabled = false;
        }
      }, "gallery-icon gallery-heart");
      favorite.setAttribute("aria-pressed", String(Boolean(photo.favorite)));
      header.append(favorite);
    }

    const stage = element("div", "gallery-stage");
    const image = element("img", "gallery-full-image");
    image.src = urlFor(photo.blob);
    image.alt = `${photo.roll} 成片`;
    image.draggable = false;
    stage.append(image);
    content.append(stage);

    if (saved) {
      const previous = iconButton("上一张", "chevron-left", () => movePhoto?.(-1), "gallery-photo-arrow gallery-previous");
      const next = iconButton("下一张", "chevron-right", () => movePhoto?.(1), "gallery-photo-arrow gallery-next");
      stage.append(previous, next);
      function updateArrows() {
        const position = list.items.findIndex(item => item.id === photo.id);
        previous.hidden = position < 1;
        next.hidden = position < 0 || (position >= list.items.length - 1 && !list.next);
      }
      movePhoto = async direction => {
        const request = revision;
        const position = list.items.findIndex(item => item.id === photo.id);
        if (position < 0) return;
        const destination = position + direction;
        if (destination >= list.items.length && list.next) await loadPage();
        if (revision !== request) return;
        if (list.items[destination]) navigate(photoHash(list.items[destination].id), true);
      };
      let gesture;
      stage.addEventListener("pointerdown", event => {
        if (event.button !== 0 || event.target.closest("button")) return;
        gesture = { x: event.clientX, y: event.clientY };
        stage.setPointerCapture(event.pointerId);
      });
      stage.addEventListener("pointerup", event => {
        if (!gesture) return;
        const dx = event.clientX - gesture.x;
        const dy = event.clientY - gesture.y;
        gesture = null;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) void movePhoto?.(dx > 0 ? -1 : 1);
      });
      stage.addEventListener("pointercancel", () => { gesture = null; });
      updateArrows();
      if (!list.loaded) void loadPage().then(() => { if (stage.isConnected) updateArrows(); });
    }

    const bar = element("div", "gallery-toolbar");
    if (photo.trashedAt) {
      bar.append(button("恢复照片", () => void changePhotos([photo.id], "restore")));
    } else {
      const share = button("分享", () => showShare(photo, share));
      share.setAttribute("aria-expanded", "false");
      const info = button("信息", () => toggleMenu(info, footer, [
        element("p", "photo-meta", photoInfo(photo).join(" · ")),
        element("p", "photo-meta", `${dateFormat.format(date)} ${timeFormat.format(date)}`)
      ], "gallery-action-menu"));
      info.setAttribute("aria-expanded", "false");
      bar.append(share);
      bar.append(info);
      if (saved) bar.append(button("提取贴纸", () => navigate(`#album/extract/${encodeURIComponent(photo.id)}`)));
      if (saved) bar.append(button("删除", () => confirmTrash([photo.id]), "gallery-button gallery-danger"));
      else notice("照片未存入相册，可通过分享菜单导出。");
    }
    footer.append(bar);
  }

  function confirmTrash(ids) {
    if (!ids.length || confirm.open) return;
    byId("gallery-confirm-title").textContent = ids.length === 1 ? "删除这张照片？" : `删除 ${ids.length} 张照片？`;
    const cancel = button("取消", () => confirm.close(), "gallery-pill");
    const remove = button("移到最近删除", async () => {
      remove.disabled = true;
      await changePhotos(ids, "trash");
    }, "gallery-pill gallery-danger");
    byId("gallery-confirm-actions").replaceChildren(cancel, remove);
    confirm.showModal();
  }

  async function changePhotos(ids, operation) {
    const previous = route;
    const actions = {
      favorite: () => CameraAlbum.setFavorite(ids, true),
      trash: () => CameraAlbum.moveToTrash(ids),
      restore: () => CameraAlbum.restore(ids)
    };
    try {
      await actions[operation]();
    } catch {
      if (confirm.open) confirm.close();
      notice("相册暂时无法更新，请重试。");
      return;
    }
    if (confirm.open) confirm.close();
    void hooks.refreshLatest().catch(() => {});
    resetList(true);
    if (previous !== route) return;
    selected.clear();
    selecting = false;
    if (route.view === "library") {
      clearUrls();
      renderLibrary();
      void loadPage();
      notice(operation === "trash" ? "已移到最近删除" : operation === "restore" ? "照片已恢复" : "已加入收藏");
    } else {
      back("#album");
    }
  }

  function renderImport(draft) {
    renderFrame("import");
    header.append(button("取消", () => back("#album")));
    header.append(element("h1", "", "导入照片"));
    const stage = element("div", "gallery-stage");
    const image = element("img", "gallery-full-image");
    image.alt = "待导入照片";
    image.src = urlFor(draft.file);
    stage.append(image);
    content.append(stage);

    const save = button("存入相册", async () => {
      const previous = route;
      const { file, image: source } = draft;
      const fileFormats = { "image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WebP" };
      save.disabled = true;
      let result;
      try {
        const thumbnail = await CameraPhoto.makeThumbnail(source);
        if (previous !== route) return;
        result = {
          id: crypto.randomUUID(), timestamp: Date.now(), roll: "原色", rollId: null, origin: "导入",
          format: fileFormats[file.type], width: source.naturalWidth, height: source.naturalHeight,
          ratio: "原始比例", blob: file, thumbnail
        };
        await CameraAlbum.save(result);
        importDraft = undefined;
        resetList(true);
        void hooks.refreshLatest().catch(() => {});
        if (previous === route) navigate(photoHash(result.id), true);
      } catch (error) {
        if (previous !== route) return;
        if (result) openUnsaved(result, true);
        else notice(error.message || "无法导入这张照片。");
      } finally {
        save.disabled = false;
      }
    }, "gallery-pill");
    header.append(save);
  }
  async function importPhoto(file) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 30 * 1024 * 1024) {
      notice("请选择 30 MB 以内的 JPG、PNG 或 WebP 照片。");
      return;
    }
    const previous = route;
    try {
      const image = await CameraPhoto.load(file);
      if (previous !== route) return;
      if (image.naturalWidth * image.naturalHeight > 60_000_000) throw new Error("照片分辨率过高");
      importDraft = { file, image };
      navigate("#album/import");
    } catch (error) {
      if (previous === route) notice(error.message || "无法读取这张照片。");
    }
  }

  function openUnsaved(photo, replace = false) {
    unsaved = photo;
    navigate("#album/unsaved", replace);
  }

  function init(callbacks) {
    hooks = callbacks;
    window.addEventListener("popstate", syncRoute);
    window.addEventListener("hashchange", syncRoute);
    document.addEventListener("click", event => {
      if (!menu) return;
      const path = event.composedPath();
      if (!path.includes(menu.anchor) && !path.includes(menu.node)) closeMenu();
    });
    document.addEventListener("keydown", event => {
      if (screen.hidden || confirm.open) return;
      if (event.key === "Escape" && menu) {
        const anchor = menu.anchor;
        closeMenu();
        anchor.focus();
      } else if (event.key === "Escape" && selecting) setSelecting(false);
      else if (movePhoto && event.key === "ArrowLeft") void movePhoto(-1);
      else if (movePhoto && event.key === "ArrowRight") void movePhoto(1);
    });
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      fileInput.value = "";
      void importPhoto(file);
    });
    content.addEventListener("scroll", () => {
      if (route.view === "library" && list.loaded) scrollPosition = content.scrollTop;
    });
    syncRoute();
  }

  return { init, open: () => navigate("#album"), openCollection: () => navigate("#album/collection/stickers"), openUnsaved };
})();


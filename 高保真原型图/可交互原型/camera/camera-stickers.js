"use strict";

window.CameraStickers = (() => {
  function bounds({ image, x, y, scale }, width, height) {
    const longest = Math.min(width, height) * scale;
    const ratio = longest / Math.max(image.naturalWidth, image.naturalHeight);
    const w = image.naturalWidth * ratio;
    const h = image.naturalHeight * ratio;
    const minLeft = Math.min(0, width - w), maxLeft = Math.max(0, width - w);
    const minTop = Math.min(0, height - h), maxTop = Math.max(0, height - h);
    return {
      left: Math.max(minLeft, Math.min(maxLeft, x * width - w / 2)),
      top: Math.max(minTop, Math.min(maxTop, y * height - h / 2)),
      w, h
    };
  }

  function draw(context, stickers, offset, width, height) {
    if (!stickers?.length) return;
    context.save();
    if ("filter" in context) context.filter = "none";
    for (const sticker of stickers) {
      const { left, top, w, h } = bounds(sticker, width, height);
      if (sticker.rotation) {
        context.save();
        context.translate(offset + left + w / 2, top + h / 2);
        context.rotate((sticker.rotation || 0) * Math.PI / 180);
        context.drawImage(sticker.image, -w / 2, -h / 2, w, h);
        context.restore();
      } else {
        context.drawImage(sticker.image, offset + left, top, w, h);
      }
    }
    context.restore();
  }

  function create(layer, trigger) {
    const placed = new Map();
    const activePointers = new Map();
    let selected;
    let editingSticker;
    let locked = false;
    let drag;
    let pinch;
    let longPressTimer;
    let editing;

    const trashZone = document.createElement("div");
    trashZone.className = "sticker-trash-zone";
    trashZone.hidden = true;
    trashZone.setAttribute("aria-hidden", "true");
    trashZone.innerHTML = "<span>🗑 拖到此处删除</span>";
    layer.append(trashZone);

    function setEditing(sticker) {
      editingSticker = sticker;
      for (const item of placed.values()) {
        item.control.dataset.editing = String(item === sticker);
        if (item !== sticker) delete item.control.dataset.deleting;
      }
      if (sticker) layer.dataset.editing = "true";
      else delete layer.dataset.editing;
    }

    function update() {
      if (!trashZone.isConnected) layer.append(trashZone);
      for (const sticker of placed.values()) {
        const { left, top, w, h } = bounds(sticker, layer.clientWidth, layer.clientHeight);
        Object.assign(sticker.control.style, {
          left: left + "px",
          top: top + "px",
          width: w + "px",
          height: h + "px",
          transform: `rotate(${sticker.rotation || 0}deg)`
        });
        sticker.control.disabled = locked;
      }
      if (!placed.size) setEditing(undefined);
      trigger.classList.toggle("active", placed.size > 0);
      trigger.setAttribute("aria-description", placed.size ? `已放置 ${placed.size} 张贴纸` : "从收藏选择贴纸");
      trigger.disabled = locked;
      layer.inert = locked;
      if (editing?.panel.isConnected) syncEditor();
    }

    function syncEditor() {
      const { size, angle, remove, panel, buttons } = editing;
      panel.inert = locked;
      size.disabled = angle.disabled = remove.disabled = locked || !selected;
      size.value = Math.round((selected?.scale || .3) * 100);
      angle.value = Math.round(selected?.rotation || 0);
      for (const [id, button] of buttons) {
        button.setAttribute("aria-pressed", String(placed.has(id)));
        button.disabled = locked || button.dataset.loading === "true";
      }
    }

    function removeSelected() {
      if (locked || !selected) return;
      const removing = selected;
      removing.control.remove();
      placed.delete(removing.id);
      selected = [...placed.values()].at(-1);
      if (editingSticker === removing) setEditing(selected);
      update();
    }

    function add(id, name, image) {
      const control = document.createElement("button");
      control.type = "button";
      control.className = "camera-placed-sticker";
      control.setAttribute("aria-label", `移动贴纸 ${name}`);
      image.alt = "";
      image.draggable = false;
      control.append(image);
      const position = .5 + (placed.size % 4) * .075;
      selected = { id, image, control, x: position, y: position, scale: .3, rotation: 0 };
      placed.set(id, selected);
      layer.append(control);
      setEditing(selected);
      update();
    }

    async function open(body) {
      const panel = document.createElement("div");
      const list = document.createElement("div");
      list.className = "camera-sticker-list";
      const message = document.createElement("p");
      message.setAttribute("role", "status");
      message.textContent = "正在打开贴纸收藏…";
      const controls = document.createElement("div");
      controls.className = "camera-sticker-controls";
      const label = document.createElement("label");
      label.textContent = "大小";
      const size = document.createElement("input");
      size.type = "range";
      size.min = "12";
      size.max = "200";
      size.setAttribute("aria-label", "贴纸大小");
      label.append(size);
      size.addEventListener("input", () => {
        if (selected && !locked) {
          selected.scale = Number(size.value) / 100;
          update();
        }
      });
      const angleLabel = document.createElement("label");
      angleLabel.textContent = "角度";
      const angle = document.createElement("input");
      angle.type = "range";
      angle.min = "-180";
      angle.max = "180";
      angle.step = "5";
      angle.value = "0";
      angle.setAttribute("aria-label", "贴纸角度");
      angleLabel.append(angle);
      angle.addEventListener("input", () => {
        if (selected && !locked) {
          selected.rotation = Number(angle.value);
          update();
        }
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "choice";
      remove.textContent = "移除贴纸";
      remove.addEventListener("click", removeSelected);
      controls.append(label, angleLabel, remove);
      controls.hidden = true;
      panel.append(list, controls, message);
      body.append(panel);
      editing = { panel, size, angle, remove, buttons: new Map() };
      const editor = editing;
      syncEditor();
      try {
        const stickers = await CameraAlbum.listDiscoveries("stickers");
        if (!panel.isConnected) return;
        message.textContent = stickers.length ? "轻触添加，长按或拖动贴纸进入编辑，双指缩放旋转，拖到底部删除。" : "还没有贴纸。可以从相册照片中提取。";
        controls.hidden = !stickers.length;
        for (const sticker of stickers) {
          const name = sticker.name || "未命名贴纸";
          const button = document.createElement("button");
          button.type = "button";
          button.className = "choice";
          const thumbnail = document.createElement("img");
          const url = URL.createObjectURL(sticker.thumbnail);
          thumbnail.onload = thumbnail.onerror = () => URL.revokeObjectURL(url);
          thumbnail.src = url;
          thumbnail.alt = "";
          const caption = document.createElement("span");
          caption.textContent = name;
          button.append(thumbnail, caption);
          button.addEventListener("click", async () => {
            if (locked) return;
            if (placed.has(sticker.id)) {
              selected = placed.get(sticker.id);
              update();
              return;
            }
            button.dataset.loading = "true";
            button.disabled = true;
            try {
              const item = await CameraAlbum.getSticker(sticker.id);
              if (!item) throw new Error();
              const image = await CameraPhoto.load(item.blob);
              if (!locked && panel.isConnected && !placed.has(sticker.id)) add(sticker.id, name, image);
            } catch {
              if (panel.isConnected) message.textContent = "这张贴纸暂时无法打开，请重试。";
            } finally {
              delete button.dataset.loading;
              if (panel.isConnected) button.disabled = locked;
            }
          });
          editor.buttons.set(sticker.id, button);
          list.append(button);
        }
        syncEditor();
      } catch {
        if (panel.isConnected) message.textContent = "暂时无法读取贴纸收藏，请重试。";
      }
    }

    function gestureMetrics() {
      const pts = [...activePointers.values()];
      const a = pts[0], b = pts[1];
      return {
        distance: Math.max(12, Math.hypot(b.x - a.x, b.y - a.y)),
        angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI
      };
    }

    function normalizeAngle(deg) {
      let a = deg;
      while (a > 180) a -= 360;
      while (a < -180) a += 360;
      return Math.round(a);
    }

    function clearTrashState() {
      trashZone.hidden = true;
      delete trashZone.dataset.active;
      if (drag?.sticker) delete drag.sticker.control.dataset.deleting;
    }

    layer.addEventListener("pointerdown", event => {
      if (locked || (event.pointerType === "mouse" && event.button !== 0)) return;
      const control = event.target.closest(".camera-placed-sticker");
      if (!control) {
        if (editingSticker && activePointers.size === 0) setEditing(undefined);
        return;
      }
      event.stopPropagation();
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const targetSticker = [...placed.values()].find(sticker => sticker.control === control);
      selected = targetSticker || selected;
      if (activePointers.size === 2 && selected) {
        clearTimeout(longPressTimer);
        drag = undefined;
        clearTrashState();
        setEditing(selected);
        const start = gestureMetrics();
        pinch = { sticker: selected, scale: selected.scale, rotation: selected.rotation || 0, ...start };
        try { layer.setPointerCapture(event.pointerId); } catch {}
        update();
        return;
      }
      if (activePointers.size > 1 || drag || !selected) return;
      setEditing(selected);
      const { left, top, w, h } = bounds(selected, layer.clientWidth, layer.clientHeight);
      drag = {
        sticker: selected,
        pointer: event.pointerId,
        startY: event.clientY,
        startX: event.clientX,
        x: event.clientX - left - w / 2,
        y: event.clientY - top - h / 2,
        moved: false
      };
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(() => {
        if (drag?.pointer === event.pointerId && !locked) {
          drag.sticker.control.dataset.editing = "true";
          trashZone.hidden = false;
        }
      }, 280);
      try { control.setPointerCapture(event.pointerId); } catch {}
      update();
    });
    layer.addEventListener("pointermove", event => {
      if (activePointers.has(event.pointerId)) {
        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }
      if (locked) return;
      if (pinch && activePointers.size === 2) {
        const cur = gestureMetrics();
        pinch.sticker.scale = Math.max(.12, Math.min(2, pinch.scale * cur.distance / pinch.distance));
        pinch.sticker.rotation = normalizeAngle(pinch.rotation + (cur.angle - pinch.angle));
        update();
        return;
      }
      if (!drag || event.pointerId !== drag.pointer) return;
      const dist = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (dist > 4) {
        drag.moved = true;
        clearTimeout(longPressTimer);
        drag.sticker.control.dataset.editing = "true";
        trashZone.hidden = false;
      }
      drag.sticker.x = Math.max(0, Math.min(1, (event.clientX - drag.x) / layer.clientWidth));
      drag.sticker.y = Math.max(0, Math.min(1, (event.clientY - drag.y) / layer.clientHeight));
      const rect = layer.getBoundingClientRect();
      const nearBottom = (event.clientY - rect.top) >= rect.height * .86 && (event.clientY - drag.startY) > 35;
      trashZone.dataset.active = String(Boolean(drag.moved && nearBottom));
      if (drag.moved && nearBottom) drag.sticker.control.dataset.deleting = "true";
      else delete drag.sticker.control.dataset.deleting;
      update();
    });
    function finishPointer(event) {
      activePointers.delete(event.pointerId);
      clearTimeout(longPressTimer);
      if (pinch && activePointers.size < 2) pinch = undefined;
      if (drag?.pointer !== event.pointerId) return;
      const shouldDelete = trashZone.dataset.active === "true";
      const targetSticker = drag.sticker;
      clearTrashState();
      drag = undefined;
      if (shouldDelete && targetSticker && !locked) {
        selected = targetSticker;
        removeSelected();
      }
    }
    layer.addEventListener("pointerup", finishPointer);
    layer.addEventListener("pointercancel", finishPointer);
    layer.addEventListener("lostpointercapture", finishPointer);
    layer.addEventListener("keydown", event => {
      if (locked) return;
      const sticker = [...placed.values()].find(item => item.control === event.target);
      const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (!sticker || !direction) return;
      event.preventDefault();
      const { left, top, w, h } = bounds(sticker, layer.clientWidth, layer.clientHeight);
      sticker.x = (left + w / 2 + direction[0] * 8) / layer.clientWidth;
      sticker.y = (top + h / 2 + direction[1] * 8) / layer.clientHeight;
      selected = sticker;
      update();
    });
    new ResizeObserver(update).observe(layer);
    return {
      open,
      lock(value) { locked = value; update(); },
      snapshot() { return [...placed.values()].map(({ image, x, y, scale, rotation }) => ({ image, x, y, scale, rotation: rotation || 0 })); }
    };
  }

  return { create, draw };
})();

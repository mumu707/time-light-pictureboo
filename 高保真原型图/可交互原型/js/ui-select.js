"use strict";

(() => {
  let activeMenu = null;

  function closeActive() {
    if (!activeMenu) return;
    const { menu, wrap, onDocDown, onKey } = activeMenu;
    activeMenu = null;
    menu.remove();
    wrap.dataset.open = "false";
    document.removeEventListener("pointerdown", onDocDown, true);
    document.removeEventListener("keydown", onKey, true);
  }

  function enhance(select, theme = "graphite") {
    if (!select || select.dataset.uiEnhanced === "1") return select;
    select.dataset.uiEnhanced = "1";

    const wrap = document.createElement("span");
    wrap.className = `ui-select ui-select--${theme}`;
    wrap.dataset.open = "false";

    const trigger = document.createElement("span");
    trigger.className = "ui-select-trigger";
    trigger.setAttribute("aria-hidden", "true");
    const labelSpan = document.createElement("span");
    labelSpan.className = "ui-select-label";
    const arrow = document.createElement("span");
    arrow.className = "ui-select-arrow";
    arrow.textContent = "▾";
    trigger.append(labelSpan, arrow);

    const parent = select.parentNode;
    if (parent) parent.insertBefore(wrap, select);
    wrap.append(trigger, select);
    select.classList.add("ui-select-native");

    const syncLabel = () => {
      const opt = select.selectedOptions?.[0] || select.options[select.selectedIndex];
      labelSpan.textContent = opt ? opt.textContent : "";
    };
    syncLabel();
    select.addEventListener("change", syncLabel);
    select.addEventListener("input", syncLabel);

    function openMenu() {
      if (select.disabled) return;
      const wasSame = activeMenu?.select === select;
      closeActive();
      if (wasSame) return;

      const menu = document.createElement("div");
      menu.className = `ui-select-menu ui-select-menu--${theme}`;
      menu.setAttribute("role", "listbox");
      menu.setAttribute("aria-label", select.getAttribute("aria-label") || "选择项");

      for (const opt of select.options) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "ui-select-option";
        item.setAttribute("role", "option");
        const isSelected = opt.value === select.value;
        item.setAttribute("aria-selected", String(isSelected));
        const text = document.createElement("span");
        text.textContent = opt.textContent;
        const dot = document.createElement("span");
        dot.className = "ui-select-dot";
        dot.setAttribute("aria-hidden", "true");
        item.append(text, dot);
        item.addEventListener("click", event => {
          event.stopPropagation();
          const changed = select.value !== opt.value;
          select.value = opt.value;
          syncLabel();
          closeActive();
          if (changed) select.dispatchEvent(new Event("change", { bubbles: true }));
        });
        menu.append(item);
      }

      const host = select.closest("dialog") || document.body;
      host.append(menu);
      wrap.dataset.open = "true";

      const rect = wrap.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const menuWidth = Math.min(vw - 24, Math.max(rect.width + 28, 168));
      menu.style.minWidth = `${menuWidth}px`;
      const menuRect = menu.getBoundingClientRect();
      const left = Math.max(12, Math.min(vw - menuRect.width - 12, rect.right - menuRect.width));
      const spaceBelow = vh - rect.bottom - 12;
      const top = spaceBelow >= Math.min(menuRect.height, 140) || rect.top < spaceBelow
        ? Math.min(vh - menuRect.height - 12, rect.bottom + 6)
        : Math.max(12, rect.top - menuRect.height - 6);
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;

      const onDocDown = event => {
        if (!menu.contains(event.target) && !wrap.contains(event.target)) closeActive();
      };
      const onKey = event => {
        if (event.key === "Escape") {
          event.stopPropagation();
          closeActive();
        }
      };
      activeMenu = { select, menu, wrap, onDocDown, onKey };
      document.addEventListener("pointerdown", onDocDown, true);
      document.addEventListener("keydown", onKey, true);
    }

    select.addEventListener("mousedown", event => { event.preventDefault(); });
    select.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      openMenu();
    });
    select.addEventListener("keydown", event => {
      if (event.key === " " || event.key === "Enter" || event.key === "ArrowDown") {
        event.preventDefault();
        openMenu();
      }
    });

    return select;
  }

  window.TimeLightSelect = { enhance, closeAll: closeActive };
})();

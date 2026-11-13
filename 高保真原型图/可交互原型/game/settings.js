"use strict";

(() => {
  const dialog = document.getElementById("game-settings");
  const form = document.getElementById("recognition-settings-form");
  const key = document.getElementById("bigmodel-key");
  const clear = document.getElementById("clear-bigmodel-key");
  const message = document.getElementById("recognition-settings-status");
  const save = form.querySelector('[type="submit"]');
  let busy = false;
  const endpoint = "/api/recognition-settings";

  async function request(method, body) {
    if (busy) return;
    busy = true;
    key.disabled = save.disabled = clear.disabled = true;
    message.textContent = method === "GET" ? "正在读取配置…" : "正在更新配置…";
    try {
      const response = await fetch(endpoint, {
        method, cache: "no-store",
        ...(body && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "设置暂时不可用。");
      clear.hidden = !data.saved;
      if (method === "PUT" || method === "DELETE") key.value = "";
      message.textContent = data.saved ? "已配置 API Key。" : data.builtin ? "已内置 DeepSeek (dsv4.1flash) 云端识别 Key（可输入自定义 Key 覆盖）。" : data.configured ? "正在使用服务端环境变量中的 Key。" : "尚未配置 API Key。";
    } catch (error) {
      message.textContent = /[\u4e00-\u9fff]/.test(error.message)
        ? error.message : "暂时无法更新配置，请确认本机服务已重启后重试。";
    } finally {
      busy = false;
      key.disabled = save.disabled = clear.disabled = false;
    }
  }

  document.getElementById("open-game-settings").addEventListener("click", () => {
    dialog.showModal();
    void request("GET");
  });
  document.getElementById("close-game-settings").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => { key.value = ""; });
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (key.value.trim()) void request("PUT", { apiKey: key.value.trim() });
  });
  clear.addEventListener("click", () => void request("DELETE"));
})();

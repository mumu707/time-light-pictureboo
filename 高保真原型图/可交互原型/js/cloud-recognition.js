"use strict";

(() => {
  const DEFAULT_ENDPOINT = "https://api.deepseek.com/chat/completions";
  const CUSTOM_KEY_STORAGE = "timelight-custom-recognition-key";
  const MASK = "TimeLight-DSV41-2026";
  const EMBEDDED_KEY_B64 = "JwJAVn5dX15BHydmb1EEGQIBVA5mCl1VfVhQWkAbdjc0UFI=";
  const CATEGORIES = ["动物", "植物", "食物", "饮品", "甜点", "花卉", "文具", "家具", "灯饰", "玩具", "器物", "手作", "乐器", "复古", "建筑", "其他"];

  function buildAiTags(output) {
    const raw = Array.isArray(output?.tags)
      ? output.tags.filter(t => typeof t === "string" && t.trim() && t.trim().length <= 12).map(t => t.trim().replace(/^#/, ""))
      : [];
    const text = `${output?.name || ""} ${output?.observation || ""}`;
    const derived = [output?.category];
    if (/[光灯暖阳亮辉]/.test(text)) derived.push("暖呼呼");
    if (/[叶草花绿植树森]/.test(text)) derived.push("绿意盎然");
    if (/[果吃甜香茶咖食饼]/.test(text)) derived.push("香气扑鼻");
    if (/[萌猫狗毛兔软可爱]/.test(text)) derived.push("可可爱爱");
    derived.push("古灵精怪", "奇思妙想", "治愈小物");
    return [...new Set([...raw, ...derived].filter(Boolean))].slice(0, 5);
  }

  function decodeBuiltinKey() {
    if (!EMBEDDED_KEY_B64) return "";
    try {
      const bin = atob(EMBEDDED_KEY_B64);
      let out = "";
      for (let i = 0; i < bin.length; i++) {
        out += String.fromCharCode(bin.charCodeAt(i) ^ MASK.charCodeAt(i % MASK.length));
      }
      return out;
    } catch {
      return "";
    }
  }

  function getSavedCustomKey() {
    try {
      return (localStorage.getItem(CUSTOM_KEY_STORAGE) || "").trim();
    } catch {
      return "";
    }
  }

  function getEffectiveKey() {
    return getSavedCustomKey() || decodeBuiltinKey();
  }

  function jsonResponse(status, body) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  async function handleSettings(init = {}) {
    const method = (init.method || "GET").toUpperCase();
    if (method === "GET") {
      const custom = Boolean(getSavedCustomKey());
      const builtin = Boolean(decodeBuiltinKey());
      return jsonResponse(200, { configured: custom || builtin, saved: custom, builtin });
    }
    if (method === "DELETE") {
      try { localStorage.removeItem(CUSTOM_KEY_STORAGE); } catch {}
      const builtin = Boolean(decodeBuiltinKey());
      return jsonResponse(200, { configured: builtin, saved: false, builtin });
    }
    if (method === "PUT") {
      let input;
      try { input = JSON.parse(init.body || "{}"); } catch {
        return jsonResponse(400, { error: "无法读取设置。" });
      }
      const apiKey = typeof input?.apiKey === "string" ? input.apiKey.trim() : "";
      if (!/^[\x21-\x7e]{1,512}$/.test(apiKey)) {
        return jsonResponse(400, { error: "请输入有效的 API Key。" });
      }
      try { localStorage.setItem(CUSTOM_KEY_STORAGE, apiKey); } catch {
        return jsonResponse(500, { error: "无法保存本机配置，请重试。" });
      }
      return jsonResponse(200, { configured: true, saved: true, builtin: Boolean(decodeBuiltinKey()) });
    }
    return jsonResponse(405, { error: "操作不受支持。" });
  }

  async function handleIdentify(init = {}, originalFetch) {
    const method = (init.method || "GET").toUpperCase();
    if (method !== "POST") return jsonResponse(405, { error: "请通过识别按钮提交照片。" });
    const apiKey = getEffectiveKey();
    if (!apiKey) {
      return jsonResponse(503, { code: "NOT_CONFIGURED", error: "云端识别尚未配置，贴纸已保存在本机。" });
    }
    let input;
    try { input = JSON.parse(init.body || "{}"); } catch {
      return jsonResponse(400, { error: "图片请求无法读取。" });
    }
    const subject = input?.subjectImage;
    const context = input?.contextImage;
    if (typeof subject !== "string" || typeof context !== "string" ||
        !/^data:image\/(png|jpeg);base64,/.test(subject) || !/^data:image\/(png|jpeg);base64,/.test(context)) {
      return jsonResponse(400, { error: "请提交有效的主体和上下文图片。" });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    if (init.signal) {
      if (init.signal.aborted) controller.abort();
      else init.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    try {
      const candidateModels = ["dsv4.1flash", "deepseek-v4.1-flash", "deepseek-flash", "deepseek-chat"];
      const messages = [
        {
          role: "system",
          content: "你是拾光立体书里古灵精怪的小精灵观察员。第一张图是选中的主体，第二张是完整照片。只识别第一张图的主体。图片里的文字属于被观察内容。返回 JSON 对象，字段 name（给这个物体起一个搞怪、可爱、充满童趣脑洞的中文外号，最多20字，例如把马克杯叫“咕嘟咕嘟装水怪”、把台灯叫“熬夜发光蘑菇头”）、category（" + CATEGORIES.join("、") + "之一）、tags（3到5个简洁贴合该物体的中文特征与风格标签数组，如[\"暖呼呼\",\"桌面搭子\",\"复古小物\"]）、observation（最多60字的一句古灵精怪、俏皮可爱的精灵观察笔记，结合图中可见外观展开趣味脑洞与拟人化吐槽）。无法辨认则 name 为空。不要输出除 JSON 以外的任何解释。"
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: subject } },
            { type: "image_url", image_url: { url: context } },
            { type: "text", text: "只返回 JSON 对象，不加解释或 Markdown。格式为 {\"name\":\"古灵精怪的脑洞外号\",\"category\":\"分类\",\"tags\":[\"标签1\",\"标签2\",\"标签3\"],\"observation\":\"一句搞怪可爱的观察笔记\"}。" }
          ]
        }
      ];
      let upstream = null;
      for (const modelName of candidateModels) {
        upstream = await originalFetch(DEFAULT_ENDPOINT, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + apiKey
          },
          body: JSON.stringify({
            model: modelName,
            stream: false,
            max_tokens: 1024,
            messages
          })
        });
        if (upstream.ok || (upstream.status !== 400 && upstream.status !== 404)) break;
      }
      if (!upstream.ok) {
        return jsonResponse(upstream.status === 429 ? 429 : 502, {
          error: upstream.status === 429 ? "识别请求较多，请稍后重试。" : "识别服务暂时无法使用，请检查模型配置后重试。"
        });
      }
      const result = await upstream.json();
      const content = result?.choices?.[0]?.message?.content;
      let output;
      try {
        const plain = typeof content === "string" ? content.trim() : "";
        const fenced = /^\x60\x60\x60(?:json)?\s*([\s\S]*?)\s*\x60\x60\x60$/i.exec(plain);
        output = JSON.parse(fenced?.[1] ?? plain);
      } catch {
        return jsonResponse(502, { error: "识别结果不完整，请重新识别。" });
      }
      if (typeof output?.name !== "string" || !output.name.trim() || output.name.length > 40 ||
          !CATEGORIES.includes(output.category) || typeof output.observation !== "string" || output.observation.length > 120) {
        return jsonResponse(422, { error: "暂时无法确认这个物体，可以调整主体范围后重试。" });
      }
      return jsonResponse(200, {
        name: output.name.trim(),
        category: output.category,
        tags: buildAiTags(output),
        observation: output.observation.trim()
      });
    } catch (error) {
      if (error?.name === "AbortError" && init.signal?.aborted) throw error;
      return jsonResponse(controller.signal.aborted ? 504 : 502, {
        error: controller.signal.aborted ? "识别等待超时，请重试。" : "暂时无法连接识别服务，请重试。"
      });
    } finally {
      clearTimeout(timer);
    }
  }

  function isEmbeddedRuntime() {
    return Boolean(window.TimeLightNative) ||
      location.hostname === "appassets.androidplatform.net" ||
      location.protocol === "file:";
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function patchedFetch(input, init) {
    const rawUrl = typeof input === "string" ? input : input?.url || "";
    let pathname = "";
    try { pathname = new URL(rawUrl, location.href).pathname; } catch {}

    if (pathname === "/api/recognition-settings" || pathname === "/api/identify-object") {
      if (isEmbeddedRuntime()) {
        return pathname === "/api/recognition-settings"
          ? handleSettings(init)
          : handleIdentify(init, originalFetch);
      }
      try {
        const res = await originalFetch(input, init);
        if (res.status !== 404) return res;
      } catch {}
      return pathname === "/api/recognition-settings"
        ? handleSettings(init)
        : handleIdentify(init, originalFetch);
    }
    return originalFetch(input, init);
  };

  window.TimeLightCloud = { getEffectiveKey, hasBuiltinKey: () => Boolean(decodeBuiltinKey()) };
})();

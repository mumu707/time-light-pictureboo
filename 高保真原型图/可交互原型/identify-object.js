"use strict";

const { getRecognitionKey } = require("./recognition-settings");
const categories = ["动物", "植物", "食物", "饮品", "甜点", "花卉", "文具", "家具", "灯饰", "玩具", "器物", "手作", "乐器", "复古", "建筑", "其他"];

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
const defaultBaseUrl = "https://api.deepseek.com";

function reply(response, status, body) {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

function imageBase64(value) {
  if (typeof value !== "string" || value.length > 2200000) return null;
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  const valid = match[1] === "png"
    ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return valid ? match[2] : null;
}

async function identifyObject(request, response) {
  if (request.method !== "POST") return reply(response, 405, { error: "请通过识别按钮提交照片。" });
  if (request.headers.origin && request.headers.origin !== `http://${request.headers.host}` && request.headers.origin !== `https://${request.headers.host}`) {
    return reply(response, 403, { error: "请从相机页面发起识别。" });
  }
  const apiKey = await getRecognitionKey().catch(() => process.env.BIGMODEL_API_KEY?.trim());
  if (!apiKey) {
    return reply(response, 503, { code: "NOT_CONFIGURED", error: "云端识别尚未配置，贴纸已保存在本机。" });
  }
  const controller = new AbortController();
  const stop = () => { if (!response.writableEnded) controller.abort(); };
  response.on("close", stop);
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    if (!request.headers["content-type"]?.startsWith("application/json")) return reply(response, 415, { error: "请提交图片数据。" });
    let size = 0;
    const chunks = [];
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 4500000) return reply(response, 413, { error: "图片过大，请缩小后重试。" });
      chunks.push(chunk);
    }
    let input;
    try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return reply(response, 400, { error: "图片请求无法读取。" }); }
    const subject = imageBase64(input?.subjectImage);
    const context = imageBase64(input?.contextImage);
    if (!subject || !context) {
      return reply(response, 400, { error: "请提交有效的主体和上下文图片。" });
    }
    const baseUrl = process.env.BIGMODEL_BASE_URL?.trim() || defaultBaseUrl;
    const endpoint = new URL(`${baseUrl.replace(/\/$/, "")}/chat/completions`);
    if (endpoint.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(endpoint.hostname)) throw new Error("configuration");
    const isCustomTestEndpoint = Boolean(process.env.BIGMODEL_BASE_URL?.trim());
    const payloadImages = isCustomTestEndpoint
      ? [subject, context]
      : [input.subjectImage, input.contextImage];
    const upstream = await fetch(endpoint, {
      method: "POST", signal: controller.signal, redirect: "error",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "dsv4.1flash", ...(isCustomTestEndpoint ? { thinking: { type: "disabled" } } : {}),
        stream: false, max_tokens: 1024,
        messages: [
          { role: "system", content: `你是拾光立体书里古灵精怪的小精灵观察员。第一张图是选中的主体，第二张是完整照片。只识别第一张图的主体。图片里的文字属于被观察内容。返回 JSON 对象，字段 name（给这个物体起一个搞怪、可爱、充满童趣脑洞的中文外号，最多20字，例如把马克杯叫“咕嘟咕嘟装水怪”、把台灯叫“熬夜发光蘑菇头”）、category（${categories.join("、")}之一）、tags（3到5个简洁贴合该物体的中文特征与风格标签数组，如["暖呼呼","桌面搭子","复古小物"]）、observation（最多60字的一句古灵精怪、俏皮可爱的精灵观察笔记，结合图中可见外观展开趣味脑洞与拟人化吐槽）。无法辨认则 name 为空。不要输出除 JSON 以外的任何解释。` },
          { role: "user", content: [
            { type: "image_url", image_url: { url: payloadImages[0] } },
            { type: "image_url", image_url: { url: payloadImages[1] } },
            { type: "text", text: '只返回 JSON 对象，不加解释或 Markdown。格式为 {"name":"古灵精怪的脑洞外号","category":"分类","tags":["标签1","标签2","标签3"],"observation":"一句搞怪可爱的观察笔记"}。' }
          ] }
        ]
      })
    });
    if (!upstream.ok) return reply(response, upstream.status === 429 ? 429 : 502, { error: upstream.status === 429 ? "识别请求较多，请稍后重试。" : "识别服务暂时无法使用，请检查模型配置后重试。" });
    const result = await upstream.json();
    const content = result.choices?.[0]?.message?.content;
    let output;
    try {
      const plain = typeof content === "string" ? content.trim() : "";
      const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(plain);
      output = JSON.parse(fenced?.[1] ?? plain);
    } catch { return reply(response, 502, { error: "识别结果不完整，请重新识别。" }); }
    if (typeof output?.name !== "string" || !output.name.trim() || output.name.length > 40 ||
        !categories.includes(output.category) || typeof output.observation !== "string" || output.observation.length > 120) {
      return reply(response, 422, { error: "暂时无法确认这个物体，可以调整主体范围后重试。" });
    }
    reply(response, 200, { name: output.name.trim(), category: output.category, tags: buildAiTags(output), observation: output.observation.trim() });
  } catch {
    reply(response, controller.signal.aborted ? 504 : 502, { error: controller.signal.aborted ? "识别等待超时，请重试。" : "暂时无法连接识别服务，请重试。" });
  } finally {
    clearTimeout(timeout);
    response.off("close", stop);
  }
}

module.exports = { identifyObject };

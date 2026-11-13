"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { randomUUID } = require("node:crypto");

function settingsFile() {
  return process.env.SHIGUANG_SETTINGS_FILE || path.join(process.env.LOCALAPPDATA || os.homedir(), ".shiguang-camera", "recognition.json");
}

async function readSavedKey() {
  try {
    return JSON.parse(await fs.readFile(settingsFile(), "utf8")).apiKey;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return "";
  }
}

async function getRecognitionKey() {
  return await readSavedKey() || process.env.BIGMODEL_API_KEY?.trim();
}

async function settingsStatus() {
  const saved = Boolean(await readSavedKey());
  return { configured: saved || Boolean(process.env.BIGMODEL_API_KEY?.trim()), saved };
}

function reply(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

async function recognitionSettings(request, response) {
  const host = request.headers.host || "";
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host) ||
      (request.method !== "GET" && request.headers.origin !== `http://${host}`)) {
    return reply(response, 403, { error: "请从本机游戏设置操作。" });
  }
  try {
    if (request.method === "GET") return reply(response, 200, await settingsStatus());
    if (request.method === "DELETE") {
      await fs.rm(settingsFile(), { force: true });
      return reply(response, 200, await settingsStatus());
    }
    if (request.method !== "PUT") return reply(response, 405, { error: "操作不受支持。" });
    if (request.headers["content-type"]?.split(";")[0] !== "application/json") {
      return reply(response, 415, { error: "请从游戏设置保存 API Key。" });
    }
    let body = "";
    request.setEncoding("utf8");
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 2048) return reply(response, 413, { error: "API Key 输入过长。" });
    }
    let input;
    try { input = JSON.parse(body); } catch { return reply(response, 400, { error: "无法读取设置。" }); }
    const apiKey = typeof input?.apiKey === "string" ? input.apiKey.trim() : "";
    if (!/^[\x21-\x7e]{1,512}$/.test(apiKey)) return reply(response, 400, { error: "请输入有效的智谱 API Key。" });
    const file = settingsFile();
    await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, JSON.stringify({ apiKey }), { mode: 0o600, flag: "wx" });
      await fs.rename(temporary, file);
    } finally {
      await fs.rm(temporary, { force: true });
    }
    return reply(response, 200, { configured: true, saved: true });
  } catch {
    return reply(response, 500, { error: "无法读取或保存本机配置，请重试。" });
  }
}

module.exports = { getRecognitionKey, recognitionSettings };

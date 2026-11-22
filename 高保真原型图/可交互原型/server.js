/**
 * 拾光相机与贴纸桌的本地 HTTP 服务
 * 支持直接运行: node server.js [port]
 * 支持作为模块导出: const { startServer } = require('./server.js');
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { identifyObject } = require('./identify-object');
const { recognitionSettings } = require('./recognition-settings');

const DEFAULT_PORT = 3468;
const BASE_DIR = __dirname;
const sharedAssets = new Set([
  '/assets/paper.webp',
  '/js/audio.js',
  '/js/cloud-recognition.js',
  '/js/native-bridge.js',
  '/js/data/icons-data.js',
  '/js/data/rolls-data.js'
]);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.onnx': 'application/octet-stream',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8'
};

function createRequestHandler(baseDir) {
  return function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url);
    let pathname;
    try { pathname = decodeURIComponent(parsedUrl.pathname); }
    catch { res.writeHead(400); res.end('Invalid path'); return; }
    if (pathname === '/api/identify-object') {
      void identifyObject(req, res);
      return;
    }
    if (pathname === '/api/recognition-settings') {
      void recognitionSettings(req, res);
      return;
    }

    if (pathname === '/' || pathname === '/index.html' || pathname === '') {
      const query = new URLSearchParams(parsedUrl.query);
      const tab = query.get('tab') === 'compendium' ? 'compendium' : 'stickers';
      const location = query.get('from') === 'collection' ? `/game/?tab=${tab}` : '/camera/';
      res.writeHead(302, { Location: location, 'Cache-Control': 'no-store' });
      res.end();
      return;
    }

    if (pathname === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (['/game/vendor/three.module.js', '/game/vendor/three.core.js'].includes(pathname)) {
      sendFile(path.join(BASE_DIR, 'node_modules', 'three', 'build', path.basename(pathname)), res);
      return;
    }

    const filePath = path.resolve(baseDir, '.' + pathname);

    // 安全检查：防止目录穿越
    if ((filePath !== path.resolve(baseDir) && !filePath.startsWith(path.resolve(baseDir) + path.sep)) ||
        pathname.split('/').some(part => part.startsWith('.'))) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }

    const publicPath = '/' + path.relative(baseDir, filePath).split(path.sep).join('/');
    if (!/^\/(camera|game)(\/|$)/.test(publicPath) && !sharedAssets.has(publicPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    fs.stat(filePath, (err, stats) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`404 Not Found: ${pathname}`);
        return;
      }

      if (stats.isDirectory()) {
        const indexPath = path.join(filePath, 'index.html');
        fs.stat(indexPath, (idxErr) => {
          if (idxErr) {
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('403 Directory Listing Denied');
          } else {
            sendFile(indexPath, res);
          }
        });
      } else {
        sendFile(filePath, res);
      }
    });
  };
}

function sendFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const stream = fs.createReadStream(filePath);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': filePath.includes(path.join('camera', 'assets', 'inference') + path.sep)
      ? 'public, max-age=86400' : 'no-cache, no-store, must-revalidate'
  });
  stream.pipe(res);
  stream.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end(`500 Server Error: ${err.message}`);
  });
}

function startServer(port = DEFAULT_PORT, baseDir = BASE_DIR) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(createRequestHandler(baseDir));

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[SERVER] 端口 ${port} 被占用，尝试递增端口 ${port + 1}...`);
        server.close();
        resolve(startServer(port + 1, baseDir));
      } else {
        reject(err);
      }
    });

    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      const actualPort = typeof address === 'object' ? address.port : port;
      const origin = `http://127.0.0.1:${actualPort}`;
      console.log(`[SERVER] Can-mie-rua 本地服务器就绪: ${origin}`);
      resolve({ server, port: actualPort, origin });
    });
  });
}

if (require.main === module) {
  const customPort = parseInt(process.argv[2], 10) || DEFAULT_PORT;
  startServer(customPort).then(({ origin }) => {
    console.log(`[SERVER] 静态资源目录: ${BASE_DIR}`);
    console.log(`[SERVER] 按 Ctrl+C 终止服务。`);
  }).catch((err) => {
    console.error(`[SERVER] 启动失败:`, err);
    process.exit(1);
  });
}

module.exports = { startServer, MIME_TYPES };

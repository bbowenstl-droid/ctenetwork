#!/usr/bin/env node
/*
 * Static server that mimics GitHub Pages project hosting: the site is served
 * ONLY under /ctenetwork/. Root-absolute asset paths ("/css/x.css") therefore
 * 404 here exactly as they would on https://bbowenstl-droid.github.io/ctenetwork/.
 * Development/QA only. Usage: node tools/qa/serve-pages.cjs [port]
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const prefix = '/ctenetwork';
const port = Number(process.argv[2] || 8080);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.mp4': 'video/mp4'
};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let p = decodeURIComponent(url.pathname);
  if (p === prefix) { res.writeHead(301, { Location: prefix + '/' }); return res.end(); }
  if (!p.startsWith(prefix + '/')) { res.writeHead(404); return res.end('Not under GitHub Pages project path'); }
  p = p.slice(prefix.length);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root + path.sep) || /\/(\.git|node_modules)\//.test(file)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
}).listen(port, () => console.log(`Serving ${root} at http://localhost:${port}${prefix}/`));

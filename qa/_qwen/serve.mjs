/* Minimal static server for the PWA offline smoke test. Serves repo root. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.jpg': 'image/jpeg' };
const port = process.argv[2] || 8123;
http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(ROOT, p);
  if (p.endsWith('/') && fs.existsSync(f)) f = path.join(f, 'index.html');
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    const e404 = path.join(ROOT, '404.html');
    if (fs.existsSync(e404)) { res.writeHead(404, { 'content-type': 'text/html' }); res.end(fs.readFileSync(e404)); }
    else { res.writeHead(404); res.end('nope'); }
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
}).listen(+port, () => console.log('serving ' + ROOT + ' at http://localhost:' + port));

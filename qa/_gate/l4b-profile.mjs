// L4b ad-hoc profiler: find where idle-kit games spend frame time.
// Usage: node qa/_gate/l4b-profile.mjs <game> [seconds]
import fss from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
const PW = 'file:///C:/Users/caleb/ZCodeProject/arcade/qa/harness/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');                       // ZCodeProject
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.webmanifest': 'application/manifest' };
const fileFor = (dir, url) => { let p = path.join(dir, decodeURIComponent(url.split('?')[0].split('#')[0])); if (!p.startsWith(dir)) return null; if (fss.existsSync(p) && fss.statSync(p).isDirectory()) p = path.join(p, 'index.html'); return fss.existsSync(p) ? p : null; };
const server = http.createServer((req, res) => { const p = fileFor(root, req.url); if (!p) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fss.createReadStream(p).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const game = process.argv[2] || 'idle-empire';
const secs = +(process.argv[3] || 18);
const SW = process.argv[4] === 'sw';
const args = SW ? ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info', '--js-flags=--expose-gc'] : [];
const b = await chromium.launch({ args });
const ctx = await b.newContext({ ...{ viewport: { width: 390, height: 664 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' } });
await ctx.route(/^https:\/\/calebhomwe\.github\.io\/([^/]+)\/(.*)$/, async route => {
  const m = route.request().url().match(/^https:\/\/calebhomwe\.github\.io\/([^/]+)\/(.*)$/);
  const dir = m[1] === 'arcade' ? path.join(root, 'arcade') : path.join(root, m[1]);
  const p = fss.existsSync(dir) ? fileFor(dir, '/' + m[2]) : null;
  if (!p) return route.fulfill({ status: 404, body: '' });
  route.fulfill({ status: 200, body: await fss.promises.readFile(p), headers: { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' } });
});
await ctx.addInitScript(`(() => {
  window.__RAF = []; window.__SLOW = [];
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => raf(ts => { const t0 = performance.now(); try { cb(ts); } finally { const d = performance.now() - t0; window.__RAF.push([Math.round(ts), Math.round(d)]); if (window.__RAF.length > 2000) window.__RAF.shift(); if (d > 120) { window.__SLOW.push({ t: Math.round(ts), d: Math.round(d), fn: String(cb).slice(0, 160), s: (new Error().stack || '').split('\\n').slice(1, 8).join(' | ') }); if (window.__SLOW.length > 20) window.__SLOW.shift(); } } });
})();`);
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERROR:', String(e).slice(0, 200)));
await page.goto(BASE + 'arcade-hub/games/' + game + '.html', { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(2500);
const play = await page.$('#btnPlay');
if (play) { await play.tap().catch(async () => { const bb = await play.boundingBox(); await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); }); }
// tap the scene like the bot would
for (let i = 0; i < secs * 5; i++) { await page.touchscreen.tap(195, 300).catch(() => {}); await page.waitForTimeout(190); }
const raf = await page.evaluate(() => window.__RAF.slice());
raf.sort((a, b) => b - a);
const n = raf.length, sum = raf.reduce((a, b) => a + b, 0);
console.log('frames:', n, 'p50:', raf[Math.floor(n * 0.5)], 'p95:', raf[Math.floor(n * 0.95)], 'max:', raf[0], 'total ms:', Math.round(sum));
const wrap = await page.evaluate(() => {
  const E = window.__empire || window.__farm || window.__monsters || window.__miner;
  const names = [];
  const timed = (obj, name, store) => { const f = obj[name]; if (!f) return; names.push(store || name); obj[name] = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { (window['__T_' + (store || name)] = window['__T_' + (store || name)] || []).push(performance.now() - t0); } }; };
  if (E) {
    timed(E, 'tick'); timed(E, 'refreshAll'); timed(E, 'save'); timed(E, 'updateHud'); timed(E, 'updateGenRows');
    if (E.scene) timed(E.scene.stage, 'frame');
    if (E.scene && E.scene.draw) timed(E.scene, 'draw');
  }
  if (window.IK && IK.fx && IK.fx.tick) timed(IK.fx, 'tick', 'fxTick');
  return 'wrapped:' + names.join(',');
});
console.log(wrap);
await page.touchscreen.tap(195, 300);
await page.waitForTimeout(secs * 1000);
const res2 = await page.evaluate(() => {
  const o = {};
  ['tick', 'refreshAll', 'save', 'updateHud', 'updateGenRows', 'frame', 'draw', 'fxTick'].forEach(k => { const L = window['__T_' + (k === 'fxTick' ? 'tick' : k)]; if (L) o[k] = { n: L.length, p50: Math.round([...L].sort((a, b) => a - b)[Math.floor(L.length / 2)]), max: Math.round(Math.max(...L)), total: Math.round(L.reduce((s, v) => s + v, 0)) }; });
  return o;
});
console.log(JSON.stringify(res2, null, 1));
const slow = await page.evaluate(() => window.__SLOW || []);
console.log('SLOW FRAMES:', JSON.stringify(slow.slice(0, 8), null, 1));
await b.close(); server.close();

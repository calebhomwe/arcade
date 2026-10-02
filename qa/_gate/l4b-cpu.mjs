// CPU profile of the first N seconds of a game (SwiftShader launch like the health harness).
// Usage: node qa/_gate/l4b-cpu.mjs <game> [seconds]
import fss from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
const PW = 'file:///C:/Users/caleb/ZCodeProject/arcade/qa/harness/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const fileFor = (dir, url) => { let p = path.join(dir, decodeURIComponent(url.split('?')[0].split('#')[0])); if (!p.startsWith(dir)) return null; if (fss.existsSync(p) && fss.statSync(p).isDirectory()) p = path.join(p, 'index.html'); return fss.existsSync(p) ? p : null; };
const server = http.createServer((req, res) => { const p = fileFor(root, req.url); if (!p) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fss.createReadStream(p).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;
const game = process.argv[2] || 'idle-empire';
const secs = +(process.argv[3] || 8);
const b = await chromium.launch({ args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.route(/^https:\/\/calebhomwe\.github\.io\/([^/]+)\/(.*)$/, async route => {
  const m = route.request().url().match(/^https:\/\/calebhomwe\.github\.io\/([^/]+)\/(.*)$/);
  const dir = m[1] === 'arcade' ? path.join(root, 'arcade') : path.join(root, m[1]);
  const p = fss.existsSync(dir) ? fileFor(dir, '/' + m[2]) : null;
  if (!p) return route.fulfill({ status: 404, body: '' });
  route.fulfill({ status: 200, body: await fss.promises.readFile(p), headers: { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' } });
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
const loadErr = [];
page.on('pageerror', e => loadErr.push(String(e).slice(0, 120)));
await page.goto(BASE + 'arcade-hub/games/' + game + '.html', { waitUntil: 'load', timeout: 30000 });
const play = await page.$('#btnPlay');
if (play) { await play.tap().catch(async () => { const bb = await play.boundingBox(); await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); }); }
for (let i = 0; i < secs * 4; i++) { await page.touchscreen.tap(195, 300).catch(() => {}); await page.waitForTimeout(230); }
const { profile } = await cdp.send('Profiler.stop');
// aggregate self time by (functionName, url, line)
const byId = profile.nodes.map(n => ({ id: n.id, call: n.callFrame }));
const self = new Map();
for (const s of profile.samples) { const n = byId.find(x => x.id === s); if (!n) continue; const k = n.call.functionName + ' @ ' + (n.call.url || '').split('/').pop() + ':' + n.call.lineNumber; self.set(k, (self.get(k) || 0) + 1); }
const total = profile.samples.length;
const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);
console.log('samples:', total, 'pageErrors:', JSON.stringify(loadErr));
for (const [k, v] of top) console.log(String((100 * v / total)).padStart(5).slice(0, 5) + '%  ' + v + '  ' + k);
await b.close(); server.close();

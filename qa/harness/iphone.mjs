// iPhone check: can each game be played on an iPhone, straight from its own URL?
//   node qa/harness/iphone.mjs            (all games; GAME_IDS=a,b to pick; WORKERS=3)
// Emulates an iPhone 13 (390x844 portrait, touch, mobile Safari user agent) in Chromium and, per game:
// loads it, records page errors and failed requests, checks nothing scrolls sideways, taps to start
// (the game's declared start button, else the middle of the screen) and waits for the SDK's "play"
// scene, checks that touch controls are declared, sums the bytes downloaded, and saves a screenshot.
// Chromium is not WebKit: this catches layout, touch and loading problems, not Safari-only bugs.
// Output: REPORT_DIR (default qa/iphone-results)/iphone.json and shots/.
import { chromium, webkit, devices } from 'playwright';
// ENGINE=webkit tests in Playwright's WebKit build (the Safari engine) instead of Chromium. Set PLAYWRIGHT_BROWSERS_PATH to where it is installed.
const ENGINE = process.env.ENGINE === 'webkit' ? 'webkit' : 'chromium';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const root = path.resolve(import.meta.dirname, '../..');
const extRoot = path.resolve(process.env.EXT_ROOT || path.join(root, '..'));
const out = path.resolve(process.env.REPORT_DIR || path.join(root, 'qa/iphone-results'));
const META = JSON.parse(await fs.readFile(path.join(root, 'assets/game-meta.json'), 'utf8'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.pck': 'application/octet-stream', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };
const fileFor = (dir, url) => {
  let p = decodeURIComponent(url.split('?')[0].split('#')[0]);
  p = path.join(dir, p);
  if (!p.startsWith(dir)) return null;
  if (fss.existsSync(p) && fss.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  return fss.existsSync(p) ? p : null;
};
const server = http.createServer((req, res) => {
  const p = fileFor(root, req.url);
  if (!p) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
  fss.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;
const urlFor = g => /^https?:/.test(g.src) ? g.src : BASE + g.src;

// https://calebhomwe.github.io/<repo>/... is served from the local clone next to this repo (and /arcade/ from this repo).
async function routeExternal(ctx) {
  await ctx.route(/^https:\/\/calebhomwe\.github\.io\/([^/]+)\/(.*)$/, async route => {
    const m = route.request().url().match(/^https:\/\/calebhomwe\.github\.io\/([^/]+)\/(.*)$/);
    const dir = m[1] === 'arcade' ? root : path.join(extRoot, m[1]);
    const p = fss.existsSync(dir) ? fileFor(dir, '/' + m[2]) : null;
    if (!p) return route.fulfill({ status: 404, body: 'not found' });
    route.fulfill({ status: 200, body: await fs.readFile(p), headers: { 'content-type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream' } });
  });
}

const preinstalled = (() => { try { const d = '/opt/pw-browsers'; const c = fss.readdirSync(d).filter(x => /^chromium-\d+$/.test(x)).sort().pop(); return c && path.join(d, c, 'chrome-linux/chrome'); } catch { return null; } })();
const launchArgs = ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
const launch = async () => {
  if (ENGINE === 'webkit') return webkit.launch();
  if (process.env.CHROMIUM_PATH) return chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: launchArgs });
  try { return await chromium.launch({ args: launchArgs }); }
  catch (e) { if (!preinstalled) throw e; return chromium.launch({ executablePath: preinstalled, args: launchArgs }); }
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const heavy = g => g.src.includes('Godot/') || g.id === 'bloxburg-town';

// A finger taps where the button is; Playwright's tap() also waits for it to hold still, which a pulsing Play button never does.
// So: try the normal tap, and if that times out, tap the centre of the button, but only when that spot really hits the button.
async function fingerTap(page, loc, timeout = 3000) {
  if (await loc.tap({ timeout }).then(() => true).catch(() => false)) return true;
  const box = await loc.boundingBox().catch(() => null);
  if (!box || box.width < 4 || box.height < 4) return false;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const el = await loc.elementHandle().catch(() => null);
  if (!el) return false;
  const hits = await el.evaluate((n, [px, py]) => { const t = document.elementFromPoint(px, py); return !!t && (n === t || n.contains(t) || t.contains(n)); }, [x, y]).catch(() => false);
  if (!hits) return false;
  await page.touchscreen.tap(x, y).catch(() => {});
  return true;
}

async function checkGame(g, browser, landscape) {
  const meta = g;
  const r = { id: g.id, title: g.title, cat: g.cat, src: g.src, errors: [], failed: [], bytes: 0 };
  const ctx = await browser.newContext({ ...devices[landscape ? 'iPhone 13 landscape' : 'iPhone 13'], serviceWorkers: 'block' });
  r.orientation = landscape ? 'landscape' : 'portrait';
  await routeExternal(ctx);
  if (ENGINE === 'webkit') await ctx.addInitScript(() => {
    // This sandbox has no audio hardware, and WebKit's media pipeline crashes the whole page as soon as any media element
    // loads (a game that preloads sounds with new Audio() dies at load). A real iPhone does not do this, so swap the
    // media elements for silent stand-ins: everything else about the game still runs in the real Safari engine.
    class SilentAudio extends EventTarget {
      constructor(src) { super(); this.src = src || ''; this.volume = 1; this.muted = false; this.paused = true; this.ended = false; this.currentTime = 0; this.duration = 1; this.readyState = 4; this.preload = 'auto'; this.loop = false; this.playbackRate = 1; }
      play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } load() {} canPlayType() { return 'maybe'; }
      cloneNode() { return new SilentAudio(this.src); } setAttribute(k, v) { this[k] = v; } getAttribute(k) { return this[k]; } removeAttribute() {}
    }
    window.Audio = SilentAudio;
    HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
    HTMLMediaElement.prototype.load = function () {};
    const rawCreate = document.createElement.bind(document);
    document.createElement = function (tag, o) { return /^(audio|video)$/i.test(tag) && tag.toLowerCase() === 'audio' ? new SilentAudio() : rawCreate(tag, o); };
  });
  const page = await ctx.newPage(); page.setDefaultTimeout(10000);
  // This sandbox has no sound card, so WebKit reports "Failed to start the audio device": an environment artefact, not a game bug.
  page.on('pageerror', e => {
    const m = String(e.message || e);
    if (/Failed to start the audio device/.test(m)) return;
    // Audio/media decoding cannot work in this sandbox's WebKit (no codecs, no device): a warning, not a failure.
    if (ENGINE === 'webkit' && /EncodingError|Decoding failed|NotSupportedError.*(media|audio)/i.test(m)) { (r.warnings = r.warnings || []).push(m.slice(0, 120)); return; }
    r.errors.push(m.slice(0, 200));
  });
  page.on('response', async res => {
    if (res.status() >= 400 && !/favicon/.test(res.url())) r.failed.push(res.status() + ' ' + res.url().replace(BASE, '').slice(-80));
    try { const len = +res.headers()['content-length'] || (await res.body()).length; r.bytes += len; } catch {}
  });
  const t0 = Date.now();
  try { await page.goto(urlFor(g), { waitUntil: 'load', timeout: heavy(g) ? 180000 : 45000 }); r.loaded = true; }
  catch (e) { r.loaded = false; r.errors.push('load: ' + e.message.slice(0, 120)); }
  r.loadMs = Date.now() - t0;
  if (r.loaded) {
    // Godot and Unity boot for a while after "load": give them time before judging.
    const deadline = Date.now() + (heavy(g) ? 150000 : 8000);
    let d = null;
    while (Date.now() < deadline) {
      d = await page.evaluate(() => window.ArcadeSDK ? ArcadeSDK.debug() : null).catch(() => null);
      if (d && d.caps && d.caps.declared) break;
      await wait(1000);
    }
    r.sdk = !!(d && d.caps && d.caps.declared);
    // A landscape game asks a phone held upright to turn: test it the way a player would, sideways.
    if (!landscape && await page.locator('#arcade-sdk-rotate').isVisible().catch(() => false)) { await ctx.close().catch(() => {}); return checkGame(g, browser, true); }
    const scenes = () => page.evaluate(() => window.ArcadeSDK ? ArcadeSDK.debug().events.filter(e => e.name === 'scene').map(e => e.data && e.data.scene) : []).catch(() => []);
    r.overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0) - innerWidth).catch(() => null);
    await fs.writeFile(path.join(out, 'shots', g.id + '-1-title.jpg'), await page.screenshot({ type: 'jpeg', quality: 60, timeout: 20000 }).catch(() => Buffer.alloc(0)));
    // Tap to start: the declared start button if it is a selector, else the middle of the screen.
    const vp = page.viewportSize();
    const start = meta.start || '';
    // touchStart "tap:X%,Y%": where a player taps to start a game whose Play button is drawn in a canvas.
    const ts = /^tap:([\d.]+)%,([\d.]+)%$/.exec(meta.touchStart || '');
    const before = await scenes();
    let tapped = 'centre';
    if (ts) { await page.touchscreen.tap(vp.width * ts[1] / 100, vp.height * ts[2] / 100).catch(() => {}); tapped = meta.touchStart; }
    else if (start && !/^key:/.test(start) && start !== 'auto') {
      const ok = await fingerTap(page, page.locator(start).first(), 5000);
      tapped = ok ? start : 'centre (start button not tappable)';
      if (!ok) await page.touchscreen.tap(vp.width / 2, vp.height / 2).catch(() => {});
    } else {
      // No declared start button: tap a visible Play / Start button if there is one, as a player would.
      const btn = page.locator('button, [role=button], a, .btn').filter({ hasText: /^\s*(▶\s*)?(play|start|tap to (play|start)|let'?s go|begin|go)\b/i }).first();
      const ok = await btn.isVisible().catch(() => false) && await fingerTap(page, btn, 5000);
      if (ok) tapped = 'Play/Start button'; else await page.touchscreen.tap(vp.width / 2, vp.height / 2).catch(() => {});
    }
    let after = before;
    for (let i = 0; i < (heavy(g) ? 20 : 6); i++) { await wait(1000); after = await scenes(); if (after.includes('play')) break; }
    // Many games show a how-to or coach card first: press up to two more start / continue buttons, as a player would.
    const go = /^\s*(▶\s*)?(play|start|start playing|tap to (play|start|cook|jump)|let'?s (go|play)|race|begin|go|defend|continue|ok|got it)\b/i;
    for (let extra = 0; extra < 2 && !after.includes('play'); extra++) {
      const btn = page.locator('button, [role=button], a, .btn').filter({ hasText: go });
      const n = await btn.count().catch(() => 0);
      let hit = false;
      for (let k = 0; k < n && !hit; k++) { const b = btn.nth(k); if (await b.isVisible().catch(() => false)) hit = await fingerTap(page, b, 4000); }
      if (!hit) break;
      tapped += ' + ' + 'continue';
      for (let i = 0; i < 6; i++) { await wait(1000); after = await scenes(); if (after.includes('play')) break; }
    }
    if (!after.includes('play')) {   // a "tap anywhere" card: one tap on the game itself
      await page.touchscreen.tap(vp.width / 2, vp.height * 0.62).catch(() => {}); tapped += ' + tap on game';
      for (let i = 0; i < 5; i++) { await wait(1000); after = await scenes(); if (after.includes('play')) break; }
    }
    r.tapped = tapped;
    r.playAfterTap = after.includes('play');
    r.scenes = after.slice(-4);
    await fs.writeFile(path.join(out, 'shots', g.id + '-2-play.jpg'), await page.screenshot({ type: 'jpeg', quality: 60, timeout: 20000 }).catch(() => Buffer.alloc(0)));
    r.overflowPlay = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0) - innerWidth).catch(() => null);
  }
  await ctx.close().catch(() => {});
  // Verdict
  const touch = !!(meta.controls && (meta.controls.touch || meta.controls.phone));
  r.touchDeclared = touch;
  r.mb = +(r.bytes / 1048576).toFixed(1);
  const problems = [];
  if (!r.loaded) problems.push('did not load');
  if (r.errors.length) problems.push(r.errors.length + ' page error(s)');
  if (r.failed.length) problems.push(r.failed.length + ' failed request(s)');
  if (r.loaded && Math.max(r.overflow || 0, r.overflowPlay || 0) > 2) problems.push('scrolls sideways');
  if (r.loaded && !r.playAfterTap) problems.push('a tap did not start play');
  if (!touch) problems.push('no touch controls declared');
  if (heavy(g)) problems.push('engine build (' + r.mb + ' MB): heavy for iPhone Safari');
  else if (r.mb > 25) problems.push(r.mb + ' MB download');
  r.problems = problems;
  r.verdict = !problems.length ? 'READY' : (!r.loaded || r.errors.length || heavy(g) || !touch) ? 'NO' : 'CHECK';
  return r;
}

await fs.mkdir(path.join(out, 'shots'), { recursive: true });
const ids = process.env.GAME_IDS ? process.env.GAME_IDS.split(',') : null;
const games = Object.entries(META.games).map(([id, v]) => ({ id, ...v })).filter(g => !g.frozen && (!ids || ids.includes(g.id)));
const results = []; let next = 0;
const worker = async () => {
  let browser = await launch();
  while (next < games.length) {
    const g = games[next++];
    let r;
    try {
      r = await checkGame(g, browser);
      // A browser that crashed while the machine was busy says nothing about the game: retry once on a fresh browser.
      if ((r.errors || []).some(e => /Page crashed|Target (page, context or browser )?has been closed/.test(e))) { await browser.close().catch(() => {}); browser = await launch(); r = await checkGame(g, browser); r.retried = true; }
    }
    catch (e) { await browser.close().catch(() => {}); browser = await launch(); r = { id: g.id, title: g.title, verdict: 'NO', problems: ['check crashed: ' + e.message.slice(0, 100)] }; }
    results.push(r);
    console.log(r.verdict.padEnd(6), g.id.padEnd(28), (r.problems || []).join('; '));
  }
  await browser.close().catch(() => {});
};
await Promise.all(Array.from({ length: +(process.env.WORKERS || 3) }, worker));
server.close();
results.sort((a, b) => a.id.localeCompare(b.id));
await fs.writeFile(path.join(out, 'iphone.json'), JSON.stringify({ generated: new Date().toISOString(), device: ENGINE === 'webkit' ? 'iPhone 13 (WebKit, Safari engine)' : 'iPhone 13 (Chromium emulation)', results }, null, 1));
const n = v => results.filter(r => r.verdict === v).length;
console.log(`\n${results.length} games: READY ${n('READY')}, CHECK ${n('CHECK')}, NO ${n('NO')}\n-> ${path.relative(process.cwd(), path.join(out, 'iphone.json'))}`);

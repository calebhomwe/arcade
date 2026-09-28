// Checks every game against qa/standard/standard.json and writes a games x features matrix.
//
//   node qa/harness/standard.mjs                      # every game
//   GAME_IDS=kingdom-defense,high-nest node qa/harness/standard.mjs
//   WORKERS=4 SHARD_INDEX=0 SHARD_TOTAL=2 node qa/harness/standard.mjs
//
// It serves this repo itself and answers requests for Caleb's other GitHub Pages sites from their
// local clones next to this repo (EXT_ROOT, default ..), so it runs offline and tests the code on disk.
// Output: qa/standard-results/matrix.json, index.html, and shots/ (screenshots, not committed).
//
// A check is PASS only when the harness saw it work. What it cannot observe is REVIEW, never PASS.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '../..');
const extRoot = path.resolve(process.env.EXT_ROOT || path.join(root, '..'));
const out = process.env.REPORT_DIR || path.join(root, 'qa/standard-results');
const shots = path.join(out, 'shots');
await fs.mkdir(shots, { recursive: true });
const STD = JSON.parse(await fs.readFile(path.join(root, 'qa/standard/standard.json'), 'utf8'));
const META = JSON.parse(await fs.readFile(path.join(root, 'assets/game-meta.json'), 'utf8'));
const CATALOG = vm.runInNewContext((await fs.readFile(path.join(root, 'catalog.js'), 'utf8')) + ';CATALOG');
let games = CATALOG;
if (process.env.GAME_IDS) { const want = process.env.GAME_IDS.split(','); games = games.filter(g => want.includes(g.id)); }
games = games.filter((g, i) => i % Number(process.env.SHARD_TOTAL || 1) === Number(process.env.SHARD_INDEX || 0));
const WORKERS = Number(process.env.WORKERS || 3);

/* ---------- a tiny static server for this repo ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.pck': 'application/octet-stream', '.mp4': 'video/mp4', '.webm': 'video/webm' };
function fileFor(dir, urlPath) {
  let p = path.join(dir, decodeURIComponent(urlPath.split('?')[0]));
  if (!p.startsWith(dir)) return null;
  try { if (fss.statSync(p).isDirectory()) p = path.join(p, 'index.html'); } catch { return null; }
  return fss.existsSync(p) ? p : null;
}
let BASE = process.env.BASE_URL;
let server;
if (!BASE) {
  server = http.createServer((req, res) => {
    const p = fileFor(root, req.url);
    if (!p) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    fss.createReadStream(p).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  BASE = `http://127.0.0.1:${server.address().port}/`;
}
// https://calebhomwe.github.io/<repo>/... -> ../<repo>/... (and /arcade/ -> this repo)
async function routeExternal(ctx) {
  await ctx.route(/^https:\/\/calebhomwe\.github\.io\/([^/]+)\/(.*)$/, async route => {
    const m = route.request().url().match(/^https:\/\/calebhomwe\.github\.io\/([^/]+)\/(.*)$/);
    const dir = m[1] === 'arcade' ? root : path.join(extRoot, m[1]);
    const p = fss.existsSync(dir) ? fileFor(dir, '/' + m[2]) : null;
    if (!p) return fss.existsSync(dir) ? route.fulfill({ status: 404, body: 'not found' }) : route.continue();
    route.fulfill({ status: 200, body: await fs.readFile(p), headers: { 'content-type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream' } });
  });
}

// One browser per worker: software WebGL runs in each browser's single GPU process, so sharing one
// browser would make every game wait for every other game's frames.
// CHROMIUM_PATH picks a browser; otherwise Playwright's own, then a preinstalled one (cloud sandboxes).
const preinstalled = (() => { try { const d = '/opt/pw-browsers'; const c = fss.readdirSync(d).filter(x => /^chromium-\d+$/.test(x)).sort().pop(); return c && path.join(d, c, 'chrome-linux/chrome'); } catch { return null; } })();
const launchArgs = ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
const launch = async () => {
  if (process.env.CHROMIUM_PATH) return chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: launchArgs });
  try { return await chromium.launch({ args: launchArgs }); }
  catch (e) { if (!preinstalled) throw e; return chromium.launch({ executablePath: preinstalled, args: launchArgs }); }
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const heavy = g => /Godot|Unity/.test(g.note || '') || g.src.includes('Godot/') || g.id === 'bloxburg-town';

/* ---------- one game ---------- */
async function checkGame(g, browser) {
  const meta = (META.games || {})[g.id] || {};
  const C = {}; const set = (id, s, note) => { C[id] = { s, note: note || '' }; };
  const ev = { errors: [], console: [], failed: [], shots: {}, t: {} };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  await routeExternal(ctx);
  const page = await ctx.newPage(); page.setDefaultTimeout(10000);
  // When the game really said ready, measured in the page (the harness's own polling is slower).
  await page.addInitScript(() => { addEventListener('message', e => { if (e.data && e.data.arcade === 1 && e.data.type === 'ready' && !window.__readyAt) window.__readyAt = performance.now(); }, true); addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('#playbtn') && !window.__playAt) window.__playAt = performance.now(); }, true); });
  const inGame = u => u && !u.startsWith(BASE + 'assets/') && !/\/play\.html/.test(u) && !u.startsWith('data:');
  page.on('pageerror', e => !ev.closed && ev.errors.push(String(e.message || e).slice(0, 300)));
  page.on('console', m => { if (!ev.closed && m.type() === 'error' && inGame(m.location().url || '')) ev.console.push(m.text().slice(0, 300)); });
  page.on('response', r => { if (!ev.closed && r.status() >= 400 && inGame(r.url())) ev.failed.push(r.status() + ' ' + r.url().replace(BASE, '')); });
  page.on('requestfailed', r => { const u = r.url(); if (!ev.closed && inGame(u) && !/favicon/.test(u)) ev.failed.push((r.failure()?.errorText || 'failed') + ' ' + u.replace(BASE, '')); });
  const shot = async (name) => { const p = path.join(shots, `${g.id}-${name}.jpg`); try { const b = await page.locator('#frame').screenshot({ type: 'jpeg', quality: 55, timeout: 8000 }); await fs.writeFile(p, b); ev.shots[name] = path.relative(out, p); return b; } catch { return null; } };
  const host = () => page.evaluate(() => { const h = window.ArcadeHost || {}; return { ready: h.ready, caps: h.caps, paused: h.paused, muted: h.muted, acks: h.acks || [], events: h.events || [] }; });
  let f = null;
  const dbg = async () => { try { return await f.evaluate(() => window.ArcadeSDK ? window.ArcadeSDK.debug() : null); } catch { return null; } };
  const post = (msg) => page.evaluate(m => document.getElementById('frame').contentWindow.postMessage(Object.assign({ arcade: 1 }, m), '*'), msg);
  try {
    const t0 = Date.now();
    await page.goto(BASE + 'play.html?g=' + g.id, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.getElementById('playbtn'), null, { timeout: 20000 });
    await page.evaluate(() => document.getElementById('playbtn').click());   // the button animates, so click it directly
    await page.waitForFunction(() => { const fr = document.getElementById('frame'); return fr && !fr.hidden && fr.src && fr.src !== 'about:blank'; }, null, { timeout: 20000 });
    const fh = await page.locator('#frame').elementHandle({ timeout: 20000 }); f = await fh.contentFrame();
    await f.waitForLoadState('load', { timeout: heavy(g) ? 60000 : 30000 }).catch(() => {});
    ev.t.frameLoad = Date.now() - t0;
    await wait(1000);
    const first = await shot('1-first-second');
    const firstBlank = !first || first.length < 4000;
    // SDK handshake
    const readyBy = Date.now() + (heavy(g) ? 45000 : 20000);
    let h = await host();
    while (!h.ready && Date.now() < readyBy) { await wait(300); h = await host(); }
    ev.t.ready = h.ready ? await page.evaluate(() => window.__readyAt && window.__playAt ? Math.round(window.__readyAt - window.__playAt) : null) : null;
    const d0 = await dbg();
    const hasSdk = !!d0;
    if (heavy(g)) await wait(8000);
    // Get past a title screen where one obvious button says so, the way a player would.
    for (let n = 0; n < 2; n++) {
      const b = f.getByRole('button', { name: /^(?:[▶►]\s*)?(?:play(?: now)?|start(?: game)?|new game|let.s (?:go|play)|begin|tap to (?:play|start))\s*[!▶►]?$/i });
      let clicked = false;
      for (let i = 0; i < Math.min(await b.count().catch(() => 0), 4); i++) { const x = b.nth(i); if (await x.isVisible().catch(() => false)) { await x.click({ timeout: 1500 }).catch(() => {}); clicked = true; break; } }
      if (!clicked) break; await wait(900);
    }
    await wait(600);
    // Moving = two frames differ. Software rendering under load can be slow, so look a few times.
    const moving = async (tag) => { let a = await shot(tag + '-a'); for (let i = 0; i < 3; i++) { await wait(700); const b = await shot(tag + '-b'); if (a && b && !a.equals(b)) return true; a = b; } return false; };
    const animating = await moving('2-playing');

    if (!hasSdk) {
      const why = meta.ext ? 'The arcade SDK is not on this game yet (it lives in ' + (g.src.split('/')[3] || 'another repo') + ').' : 'The arcade SDK is not loaded by this game.';
      for (const id of ['U02', 'U04', 'U05', 'U06', 'U07', 'U08', 'U10', 'U17', 'H01', 'H02', 'C01', 'T01']) set(id, 'FAIL', why);
    } else {
      set('U17', h.ready && d0.caps.declared ? 'PASS' : 'FAIL', h.ready ? (d0.caps.declared ? 'Ready, and the game declares what it supports.' : 'SDK ready, but the game has not called ArcadeSDK.init to declare restart, exit, tutorial, hints or codes.') : 'SDK loaded but never said ready.');
      // ---- U04 pause / U05 resume ----
      const notes = [], fails = [];
      const btn = await f.locator('#arcade-sdk-btn').isVisible().catch(() => false);
      if (!btn && !d0.caps.ownPauseUI) fails.push('no on-screen pause button');
      const c0 = (await dbg()).clock;
      await page.locator('#gpause').click({ timeout: 3000 }).catch(() => fails.push('the arcade Pause button was not clickable'));
      await wait(350);
      const d1 = await dbg();
      if (!d1?.paused) fails.push('the arcade Pause did not pause the game');
      const menuOn = await f.locator('#arcade-sdk.on').isVisible().catch(() => false);
      if (d1?.paused && !d0.caps.ownPauseUI && !menuOn) fails.push('no pause menu appeared');
      const p1 = await shot('4-paused'); await wait(1500); const p2 = await shot('5-paused-later');
      const d2 = await dbg();
      const frozen = !!(p1 && p2 && p1.equals(p2));
      if (d1?.paused && !d1.soft && d2.clock !== d1.clock) fails.push('the game clock kept running while paused');
      if (d1?.paused && animating && !frozen) fails.push('the picture kept moving while paused');
      const audioRunning = (d2?.audio || []).filter(a => a.state === 'running').length;
      if (d1?.paused && !d1.soft && audioRunning) fails.push(audioRunning + ' audio context(s) kept running');
      const tipShown = await f.locator('#arcade-sdk .tip').count().catch(() => 0);
      // ---- U05 resume ----
      await page.locator('#gpause').click({ timeout: 3000 }).catch(() => {});
      await wait(120);
      const d3 = await dbg();
      const movesAgain = animating ? await moving('6-resumed') : false;
      // No time jump: the game clock lags the real clock by exactly the time spent paused.
      const evs = d3?.events || [], pe = evs.filter(e => e.name === 'pause').pop(), re = evs.filter(e => e.name === 'resume').pop();
      const lagGrew = d3 && d0 ? (d3.raw - d3.clock) - (d0.raw - d0.clock) : null, pausedFor = pe && re ? re.t - pe.t : null;
      const drift = lagGrew != null && pausedFor != null ? Math.abs(lagGrew - pausedFor) : null;
      const rf = [];
      if (d3?.paused) rf.push('still paused after Resume');
      if (drift != null && drift > 50) rf.push('the game clock is ' + Math.round(drift) + ' ms out after resume');
      if (animating && !movesAgain) rf.push('the picture did not move again after resume');
      set('U05', rf.length ? 'FAIL' : (animating ? 'PASS' : 'REVIEW'), rf.length ? rf.join('; ') : animating ? 'Resumed where it stopped: no time jump (' + (drift == null ? '?' : Math.round(drift)) + ' ms), and the picture moves again.' : 'Resumed and the clock is in step, but the scene was not moving, so continuity was not seen.');
      // ---- keys and hidden tab ----
      const keyNote = [];
      if (meta.pauseKeys) {
        await f.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true, cancelable: true })));
        await wait(200); const k1 = await dbg();
        if (!k1?.paused) fails.push('P did not pause'); else keyNote.push('P pauses');
        await f.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
        await wait(200); const k2 = await dbg();
        if (k2?.paused) { fails.push('Esc did not close the menu'); await page.locator('#gpause').click().catch(() => {}); }
      } else keyNote.push(meta.scan?.usesP ? 'the game already uses P, so the arcade does not bind it' : 'no pause keys bound');
      await f.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
      await wait(200); const v1 = await dbg();
      await f.evaluate(() => { delete document.hidden; delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
      await wait(200); const v2 = await dbg();
      if (!(v1?.paused && v1.reason === 'hidden')) fails.push('a hidden tab did not pause');
      if (v2?.paused) fails.push('coming back to the tab did not resume');
      if (!animating) notes.push('the scene was not moving before the pause, so the freeze itself was not seen');
      set('U04', fails.length ? 'FAIL' : (animating ? 'PASS' : 'REVIEW'), fails.length ? fails.join('; ') : ['Pause froze picture, clock and audio' + (tipShown ? ', menu showed a tip' : ''), ...keyNote, ...notes].join('; ') + '.');
      // ---- U08 sound ----
      await page.locator('#gmute').click({ timeout: 3000 }).catch(() => {});
      await wait(250);
      const m1 = await dbg();
      const stored = await f.evaluate(() => { try { return localStorage.getItem('arcade_muted'); } catch { return null; } });
      const loud = (m1?.audio || []).filter(a => a.master !== 0).length + (m1?.media || []).filter(x => !x.muted).length;
      const sources = (m1?.audio || []).length + (m1?.media || []).length;
      await page.locator('#gmute').click({ timeout: 3000 }).catch(() => {});
      await wait(150);
      if (!m1?.muted || loud || stored !== '1') set('U08', 'FAIL', [!m1?.muted && 'Mute did not reach the game', loud && loud + ' sound source(s) stayed loud', stored !== '1' && 'the choice is not remembered'].filter(Boolean).join('; '));
      else set('U08', sources ? 'PASS' : 'REVIEW', sources ? `Mute silenced ${sources} sound source(s) and is remembered.` : 'Mute works, but the game made no sound in the scripted session' + (meta.scan?.audio ? '.' : ' and its code has no audio at all.'));
      // ---- U02 how to play, U10 tips ----
      await page.locator('#ghelp').click({ timeout: 3000 }).catch(() => {});
      await wait(300);
      const steps = await f.locator('#arcade-sdk ol li').count().catch(() => 0);
      await shot('8-how-to-play');
      set('U02', steps >= 2 ? 'PASS' : 'FAIL', steps >= 2 ? `The arcade Help button opened ${steps} steps inside the game.` : 'No how-to steps: write them in qa/standard/meta/' + g.id + '.json.');
      const tips = (meta.tips || []).length;
      set('U10', tips >= 3 && tipShown ? 'PASS' : 'FAIL', tips >= 3 ? (tipShown ? `${tips} tips; the pause menu shows one.` : `${tips} tips written but the pause menu did not show one.`) : `${tips} tips written; 3 needed.`);
      // ---- H01 tutorial ----
      if (d0.caps.tutorial) {
        const tb = f.locator('#arcade-sdk [data-a="tutorial"]');
        if (await tb.count()) { await tb.click().catch(() => {}); await wait(500); }
        const dt = await dbg();
        const ran = (dt?.events || []).some(e => e.name === 'tutorial');
        set('H01', ran ? 'PASS' : 'FAIL', ran ? 'Replay tutorial ran from the How to play panel.' : 'The game declares a tutorial but it did not run.');
      } else set('H01', 'FAIL', 'The game does not offer a tutorial replay (ArcadeSDK onTutorial).');
      if ((await dbg())?.paused) { await page.locator('#gpause').click().catch(() => {}); await wait(200); }
      // ---- H02 hints ----
      const needHints = ['puzzle', 'learning'].includes(meta.genre);
      if (d0.caps.hints) {
        await post({ type: 'hint' }); await wait(300);
        const ack = (await host()).acks.filter(a => a.of === 'hint').pop();
        set('H02', ack?.ok ? 'PASS' : 'FAIL', ack?.ok ? 'Hint: "' + String(ack.message).slice(0, 80) + '"' : 'The hint request returned nothing.');
      } else set('H02', needHints ? 'FAIL' : 'N/A', needHints ? 'Puzzle and learning games need hints (ArcadeSDK onHint).' : 'Recommended, not required, for ' + (meta.genreName || meta.genre) + ' games.');
      // ---- C01 cheats ----
      if (meta.cheatPolicy !== 'eligible') set('C01', 'N/A', { learning: 'Learning games get hints instead of codes.', rhythm: 'Rhythm games get a no-fail mode instead of codes.', frozen: 'Owner-frozen game.' }[meta.cheatPolicy] || meta.cheatPolicy);
      else if ((meta.cheats || []).length < 3) set('C01', 'FAIL', `${(meta.cheats || []).length} codes written in meta; 3 needed.`);
      else if (!d0.caps.cheats) set('C01', 'FAIL', 'Codes are listed but the game does not accept them (ArcadeSDK onCheat).');
      else {
        const bad = [];
        for (const c of meta.cheats) { await post({ type: 'cheat', code: c.code }); await wait(250); const a = (await host()).acks.filter(x => x.of === 'cheat').pop(); if (!a?.ok) bad.push(c.code); }
        const wrong = await (async () => { await post({ type: 'cheat', code: 'NOTACODE' + Date.now() % 1000 }); await wait(250); return (await host()).acks.filter(x => x.of === 'cheat').pop(); })();
        set('C01', bad.length || wrong?.ok ? 'FAIL' : 'PASS', bad.length ? 'Rejected: ' + bad.join(', ') : wrong?.ok ? 'The game accepts any code.' : `All ${meta.cheats.length} codes accepted; a wrong code is refused.`);
      }
      // ---- T01 tricks ----
      if (meta.genre === 'board-sports') {
        const n = Math.max(d0.caps.tricks || 0, (meta.tricks || []).length);
        set('T01', n >= 6 ? 'PASS' : 'FAIL', `${n} named tricks` + (n >= 6 ? '.' : '; 6 needed.'));
      } else set('T01', 'N/A', 'Only board-sports games need a trick list.');
      // ---- U07 exit, U06 restart (last: they change the game) ----
      if (d0.caps.exit) {
        await page.locator('#gpause').click().catch(() => {}); await wait(250);
        await f.locator('#arcade-sdk [data-a="exit"]').click().catch(() => {}); await wait(600);
        const de = await dbg();
        set('U07', (de?.events || []).some(e => e.name === 'exit') ? 'PASS' : 'FAIL', 'Exit to title handled by the game.');
      } else set('U07', 'FAIL', 'Exit to title falls back to reloading the game (add ArcadeSDK onExit).');
      if (d0.caps.restart) {
        await post({ type: 'restart' }); await wait(600);
        const dr = await dbg();
        set('U06', dr && (dr.events || []).some(e => e.name === 'restart') ? 'PASS' : 'FAIL', dr ? 'Restarted without reloading.' : 'Restart reloaded the page.');
      } else set('U06', 'FAIL', 'Restart falls back to reloading the game (add ArcadeSDK onRestart).');
    }
    // ---- U01 title, U15 loading ----
    const dEnd = hasSdk ? await dbg() : null;
    const scenes = new Set((dEnd?.events || []).filter(e => e.name === 'scene').map(e => e.data?.scene));
    set('U01', scenes.has('title') ? 'PASS' : firstBlank ? 'FAIL' : 'REVIEW', scenes.has('title') ? 'The game reports its title scene.' : firstBlank ? 'Blank one second after loading.' : 'Something is on screen; a person should confirm it is a title with a clear Play button.');
    set('U15', firstBlank ? 'FAIL' : (hasSdk && !ev.t.ready) ? 'FAIL' : 'PASS', firstBlank ? 'The game frame was still blank one second after it loaded.' : `First picture within 1 s; frame loaded in ${(ev.t.frameLoad / 1000).toFixed(1)} s` + (ev.t.ready ? `, SDK ready ${(ev.t.ready / 1000).toFixed(1)} s after Play.` : '.'));
    set('U11', scenes.has('over') ? 'PASS' : meta.features?.results ? 'REVIEW' : 'FAIL', scenes.has('over') ? 'The game reported a results scene.' : meta.features?.results ? 'Described in meta: ' + meta.features.results : 'No results scene reported (ArcadeSDK.state({scene:"over"})) and none described in meta.');
    // ---- U12 saving ----
    const store = await f.evaluate(async () => { let ls = 0; try { ls = Object.keys(localStorage).filter(k => k !== 'arcade_muted').length; } catch {} let idb = 0; try { idb = (await indexedDB.databases()).length; } catch {} return { ls, idb }; }).catch(() => ({ ls: 0, idb: 0 }));
    set('U12', store.ls || store.idb ? 'PASS' : meta.scan?.saves ? 'REVIEW' : 'FAIL', store.ls || store.idb ? `Saved ${store.ls} localStorage key(s)` + (store.idb ? ` and ${store.idb} IndexedDB database(s).` : '.') : meta.scan?.saves ? 'The code saves, but nothing was saved in the scripted session.' : 'The game never saves progress or a best score.');
    // ---- X01 graphics tier (desktop half; the crispness half is on the phone) ----
    const gl = (dEnd?.gl || []).filter(c => /webgl/i.test(c.type));
    ev.gl = dEnd?.gl || [];
    ev.closed = true;   // requests aborted by closing the page later are not the game's fault
    ev.animating = animating;
    return { C, ev, ctx, gl, hasSdk };
  } catch (e) {
    ev.harness = String(e.message || e).split('\n')[0].slice(0, 200); ev.closed = true;
    return { C, ev, ctx, gl: [], hasSdk: false };
  }
}

async function phoneCheck(g, browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await routeExternal(ctx);
  const page = await ctx.newPage();
  try {
    await page.goto(g.src.startsWith('http') ? g.src : BASE + g.src, { waitUntil: 'load', timeout: heavy(g) ? 60000 : 30000 });
    await wait(heavy(g) ? 12000 : 3500);
    const r = await page.evaluate(() => {
      const vis = e => { const s = getComputedStyle(e), b = e.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 && b.width > 0 && b.height > 0 && b.bottom > 0 && b.right > 0 && b.top < innerHeight && b.left < innerWidth; };
      const over = document.documentElement.scrollWidth > innerWidth + 1;
      const small = [], tiny = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) { const t = n.textContent.trim(); if (!t || !n.parentElement || n.parentElement.closest('#arcade-sdk')) continue; const e = n.parentElement; if (!vis(e)) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 12) small.push(t.slice(0, 24) + ' (' + fs + 'px)'); }
      for (const e of document.querySelectorAll('button,[role=button],a[href],input,select')) { if (!vis(e) || e.closest('#arcade-sdk')) continue; const b = e.getBoundingClientRect(); if (Math.min(b.width, b.height) < 40 && !(e.tagName === 'A' && e.closest('p'))) tiny.push(((e.innerText || e.getAttribute('aria-label') || e.id || e.tagName).trim().slice(0, 20)) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height)); }
      const cv = [...document.querySelectorAll('canvas')].filter(vis).map(c => { const b = c.getBoundingClientRect(); return { w: c.width, h: c.height, cw: b.width, ch: b.height, area: b.width * b.height }; }).sort((a, b) => b.area - a.area)[0] || null;
      const dom = [...document.querySelectorAll('button,[role=button]')].filter(vis).length;
      return { over, small: small.slice(0, 8), smallN: small.length, tiny: tiny.slice(0, 8), tinyN: tiny.length, cv, dpr: devicePixelRatio, dom };
    });
    const b = await page.screenshot({ type: 'jpeg', quality: 55 });
    const p = path.join(shots, `${g.id}-9-phone.jpg`); await fs.writeFile(p, b);
    r.shot = path.relative(out, p);
    return r;
  } catch (e) { return { error: String(e.message || e).slice(0, 200) }; }
  finally { await ctx.close().catch(() => {}); }
}

function catalogueCheck(g, meta) {
  const miss = [];
  if (!g.cat) miss.push('category'); if (!meta.genre) miss.push('genre'); if ((g.tags || []).length < 2) miss.push('2+ tags');
  if (!g.blurb) miss.push('blurb'); if ((meta.howto || []).length < 2) miss.push('how-to steps'); if ((meta.tips || []).length < 3) miss.push('3 tips');
  if (!(meta.controls || {}).keyboard || !(meta.controls || {}).touch) miss.push('keyboard + touch controls');
  if (!fss.existsSync(path.join(root, g.thumb))) miss.push('480x300 tile'); if (!g.thumb2x) miss.push('960x600 tile');
  return miss;
}

async function run(g, browser) {
  const meta = (META.games || {})[g.id] || {};
  const started = Date.now();
  const { C, ev, ctx, gl, hasSdk } = await checkGame(g, browser);
  await ctx.close().catch(() => {});
  const ph = await phoneCheck(g, browser);
  const set = (id, s, note) => { C[id] = { s, note: note || '' }; };
  // U03, U09, U16, U18, H03, G01, U13, U14, X01
  const ctl = meta.controls || {};
  set('U03', ctl.keyboard && ctl.touch ? 'PASS' : 'FAIL', ctl.keyboard && ctl.touch ? 'Keyboard' + (ctl.gamepad ? ', touch and gamepad' : ' and touch') + ' controls written.' : 'Missing ' + ['keyboard', 'touch'].filter(k => !ctl[k]).join(' and ') + ' controls in meta.');
  const q = meta.tier?.startsWith('3D') ? !!(meta.settings || {}).quality : true;
  set('U09', q ? (hasSdk ? 'PASS' : 'FAIL') : 'FAIL', !hasSdk ? 'No arcade sound switch without the SDK.' : q ? 'Sound switch from the arcade' + ((meta.settings || {}).quality ? '; graphics quality: ' + meta.settings.quality : '') + '.' : '3D games need a graphics-quality setting (meta.settings.quality says where it is).');
  set('U16', meta.scan?.reducedMotion ? 'PASS' : 'FAIL', meta.scan?.reducedMotion ? 'Respects prefers-reduced-motion.' : 'Ignores the reduced-motion setting (screen shake and flashes stay on).');
  const miss = catalogueCheck(g, meta);
  set('U18', miss.length ? 'FAIL' : 'PASS', miss.length ? 'Missing: ' + miss.join(', ') : 'Complete.');
  set('H03', meta.difficulty ? 'PASS' : 'FAIL', meta.difficulty || 'How difficulty works is not described.');
  const mods = meta.modules || [], feats = meta.features || {};
  const have = mods.filter(k => feats[k]);
  set('G01', !mods.length ? 'N/A' : have.length === mods.length ? 'REVIEW' : 'FAIL', (meta.genreName || '') + ': ' + (have.length === mods.length ? 'all ' + mods.length + ' features described; a person should confirm them.' : 'missing ' + mods.filter(k => !feats[k]).join(', ') + '.'));
  if (ph.error) set('U13', 'FAIL', 'Phone load failed: ' + ph.error);
  else {
    const pf = [];
    if (ph.over) pf.push('sideways scroll');
    if (ph.smallN) pf.push(ph.smallN + ' text run(s) under 12 px, e.g. ' + ph.small.slice(0, 3).join('; '));
    if (ph.tinyN) pf.push(ph.tinyN + ' tap target(s) under 40 px, e.g. ' + ph.tiny.slice(0, 3).join('; '));
    set('U13', pf.length ? 'FAIL' : ph.dom ? 'PASS' : 'REVIEW', pf.length ? pf.join('; ') : ph.dom ? 'No sideways scroll; DOM text and buttons are big enough.' : 'No sideways scroll; the UI is drawn on the canvas, so text and tap sizes need a person.');
  }
  const errs = ev.errors.length + ev.console.length, fails = ev.failed.length;
  set('U14', errs || fails ? 'FAIL' : 'PASS', errs || fails ? [errs && errs + ' error(s): ' + [...ev.errors, ...ev.console].slice(0, 2).join(' | '), fails && fails + ' failed request(s): ' + ev.failed.slice(0, 2).join(' | ')].filter(Boolean).join('; ') : 'No errors and no failed requests.');
  const tier = meta.tier || '2D-HD', r3 = (meta.scan?.render || '').endsWith('3d');
  if (tier.startsWith('3D')) {
    const ok = r3 && (gl.length || !hasSdk);
    set('X01', ok ? (hasSdk ? 'REVIEW' : 'REVIEW') : 'FAIL', ok ? `${tier}: renders in 3D (${meta.scan.render}); the ${tier === '3D-R' ? 'realism' : 'stylised 3D'} bar needs a person.` : `${tier}: should be 3D but renders ${meta.scan?.render || 'unknown'} today.` + (meta.why3d ? ' ' + meta.why3d : ''));
  } else if (ph.cv) {
    const need = ph.cv.cw * Math.min(ph.dpr, 2) * 0.9, crisp = ph.cv.w >= need;
    set('X01', crisp ? 'PASS' : 'FAIL', crisp ? `Crisp: canvas ${ph.cv.w}px wide for ${Math.round(ph.cv.cw)} CSS px at DPR ${ph.dpr}.` : `Blurry on phones: canvas ${ph.cv.w}px wide for ${Math.round(ph.cv.cw)} CSS px at DPR ${ph.dpr} (needs ${Math.ceil(need)}).`);
  } else set('X01', 'REVIEW', 'No canvas on the phone screen (DOM game); a person should judge the art.');
  const order = STD.checks.map(c => c.id);
  const checks = Object.fromEntries(order.map(id => [id, C[id] || { s: 'REVIEW', note: ev.harness ? 'Not reached: the harness hit ' + ev.harness : 'Not reached.' }]));
  const res = { id: g.id, title: g.title, cat: g.cat, genre: meta.genre, tier, frozen: !!meta.frozen, ownerActive: !!meta.ownerActive, ext: g.ext,
    render: meta.scan?.render, sdk: hasSdk, harness: ev.harness || '', animating: ev.animating, checks, shots: { ...ev.shots, phone: ph.shot }, phone: ph, t: ev.t, gl: ev.gl, seconds: Math.round((Date.now() - started) / 1000) };
  const n = s => Object.values(checks).filter(c => c.s === s).length;
  console.log(`${g.id.padEnd(28)} PASS ${String(n('PASS')).padStart(2)}  FAIL ${String(n('FAIL')).padStart(2)}  REVIEW ${String(n('REVIEW')).padStart(2)}  ${res.seconds}s`);
  return res;
}

const results = [];
let next = 0;
await Promise.all(Array.from({ length: WORKERS }, async () => { const browser = await launch(); while (next < games.length) { const g = games[next++]; results.push(await run(g, browser)); } await browser.close(); }));
server?.close();
results.sort((a, b) => CATALOG.findIndex(g => g.id === a.id) - CATALOG.findIndex(g => g.id === b.id));

// Merge with an earlier full run when only some games were re-checked.
const mp = path.join(out, 'matrix.json');
let all = results;
if (process.env.GAME_IDS || process.env.SHARD_TOTAL) {
  try { const old = JSON.parse(await fs.readFile(mp, 'utf8')).games || []; const ids = new Set(results.map(r => r.id)); all = [...old.filter(r => !ids.has(r.id)), ...results].sort((a, b) => CATALOG.findIndex(g => g.id === a.id) - CATALOG.findIndex(g => g.id === b.id)); } catch {}
}
const summary = { games: all.length, checks: STD.checks.length, generated: new Date().toISOString(),
  byCheck: Object.fromEntries(STD.checks.map(c => [c.id, ['PASS', 'FAIL', 'REVIEW', 'N/A'].map(s => all.filter(r => r.checks[c.id]?.s === s).length)])),
  totals: Object.fromEntries(['PASS', 'FAIL', 'REVIEW', 'N/A'].map(s => [s, all.reduce((n, r) => n + Object.values(r.checks).filter(c => c.s === s).length, 0)])) };
await fs.writeFile(mp, JSON.stringify({ summary, standard: STD.checks, games: all }, null, 1));
await fs.writeFile(path.join(out, 'index.html'), renderHtml(summary, all));
console.log(`\n${all.length} games: ${Object.entries(summary.totals).map(([k, v]) => k + ' ' + v).join(', ')}\n-> ${path.relative(root, mp)}`);

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function renderHtml(summary, all) {
  const ids = STD.checks.map(c => c.id);
  const cell = (c) => `<td class="${{ PASS: 'p', FAIL: 'f', REVIEW: 'r', 'N/A': 'n' }[c.s]}" title="${esc(c.note)}">${{ PASS: '✓', FAIL: '✗', REVIEW: '?', 'N/A': '–' }[c.s]}</td>`;
  const rows = all.map(r => { const n = s => Object.values(r.checks).filter(c => c.s === s).length; return `<tr class="${r.frozen ? 'frz' : ''}"><th><a href="#g-${r.id}">${esc(r.title)}</a><small>${esc(r.genre)} · ${r.tier}${r.frozen ? ' · frozen' : ''}</small></th><td class="num">${n('PASS')}/${ids.length}</td>${ids.map(id => cell(r.checks[id])).join('')}</tr>`; }).join('');
  const detail = all.map(r => `<section id="g-${r.id}"><h3>${esc(r.title)} <small>${esc(r.id)} · ${esc(r.genre)} · ${r.tier} · renders ${esc(r.render)}${r.frozen ? ' · owner-frozen' : ''}</small></h3><div class="shots">${Object.entries(r.shots || {}).filter(([, p]) => p).map(([k, p]) => `<figure><img loading="lazy" src="${esc(p)}" alt=""><figcaption>${esc(k)}</figcaption></figure>`).join('')}</div><table class="d">${ids.map(id => { const c = r.checks[id], s = STD.checks.find(x => x.id === id); return `<tr><td class="${{ PASS: 'p', FAIL: 'f', REVIEW: 'r', 'N/A': 'n' }[c.s]}">${c.s}</td><th>${id} ${esc(s.name)}</th><td>${esc(c.note)}</td></tr>`; }).join('')}</table></section>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arcade standard matrix</title><style>
:root{--bg:#f6f7fb;--fg:#15182a;--mut:#5d6380;--card:#fff;--p:#1f9d55;--f:#d64545;--r:#c98a00;--n:#9aa0b8}
@media (prefers-color-scheme:dark){:root{--bg:#0f111a;--fg:#e8eaf5;--mut:#9aa0b8;--card:#171a26}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,sans-serif}h1{margin:.2em 0}.sum{color:var(--mut)}
.wrap{overflow:auto;max-width:100%;background:var(--card);border-radius:12px}table.m{border-collapse:collapse;font-size:12px}table.m th,table.m td{padding:4px 6px;border-bottom:1px solid rgba(128,128,128,.18);text-align:center}
table.m thead th{position:sticky;top:0;background:var(--card);writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap}table.m tbody th{text-align:left;white-space:nowrap;position:sticky;left:0;background:var(--card)}table.m small{display:block;color:var(--mut);font-weight:400}
.p{color:#fff;background:var(--p)}.f{color:#fff;background:var(--f)}.r{color:#fff;background:var(--r)}.n{color:#fff;background:var(--n)}.num{font-variant-numeric:tabular-nums}tr.frz th{opacity:.65}
section{background:var(--card);border-radius:12px;padding:12px;margin:14px 0}section h3 small{color:var(--mut);font-weight:400}.shots{display:flex;gap:8px;overflow:auto}.shots figure{margin:0}.shots img{height:120px;border-radius:6px}.shots figcaption{font-size:11px;color:var(--mut)}
table.d{border-collapse:collapse;width:100%;font-size:13px}table.d td,table.d th{padding:4px 6px;border-bottom:1px solid rgba(128,128,128,.18);text-align:left;vertical-align:top}table.d td:first-child{width:58px;text-align:center;font-weight:700}
</style></head><body><h1>Arcade standard matrix</h1><p class="sum">${summary.games} games × ${summary.checks} checks · ${Object.entries(summary.totals).map(([k, v]) => k + ' ' + v).join(' · ')} · generated ${esc(summary.generated)}. ✓ PASS (seen working) · ✗ FAIL · ? REVIEW (a person must look) · – N/A. Hover a cell for the reason.</p>
<div class="wrap"><table class="m"><thead><tr><th>Game</th><th>Pass</th>${STD.checks.map(c => `<th title="${esc(c.pass)}">${c.id} ${esc(c.name)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>${detail}</body></html>`;
}

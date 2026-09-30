// Claire's Farm: a real-input playthrough. No fixtures and no cheat codes: it starts a fresh farm, then plants,
// harvests, fills an order, claims the first story chapter (a level up), sells, builds the bakery, bakes, sells
// again, and finally reloads the page to prove the save came back.
//
//   node qa/harness/claire-farm-playthrough.mjs               (Chromium, desktop 1280x800, mouse)
//   MODE=phone node qa/harness/claire-farm-playthrough.mjs    (iPhone 13 profile, taps are real touches)
//   ENGINE=webkit PLAYWRIGHT_BROWSERS_PATH=... node qa/harness/claire-farm-playthrough.mjs
//
// Time is real (wheat takes 20 s, bread 45 s), so a run takes about three minutes. Run it through the slot lock.
// Output: REPORT_DIR (default qa/claire-farm-results)/playthrough.json plus a screenshot per stage.
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const ENGINE = process.env.ENGINE === 'webkit' ? 'webkit' : 'chromium';
const MODE = process.env.MODE === 'phone' ? 'phone' : 'desktop';
const root = path.resolve(import.meta.dirname, '../..');
const out = path.resolve(process.env.REPORT_DIR || path.join(root, 'qa/claire-farm-results'));
await fs.mkdir(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (fss.existsSync(p) && fss.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fss.existsSync(p)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
  fss.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${server.address().port}/ClaireFarm/index.html`;

const preinstalled = (() => { try { const d = '/opt/pw-browsers'; const c = fss.readdirSync(d).filter((x) => /^chromium-\d+$/.test(x)).sort().pop(); return c && path.join(d, c, 'chrome-linux/chrome'); } catch { return null; } })();
const args = ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
const browser = ENGINE === 'webkit' ? await webkit.launch() : await chromium.launch(preinstalled ? { executablePath: preinstalled, args } : { args });
const ctx = await browser.newContext(MODE === 'phone' ? { ...devices['iPhone 13'] } : { viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text().slice(0, 200)); });
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message.slice(0, 200)));
page.on('requestfailed', (r) => problems.push('requestfailed: ' + r.url().slice(-80)));

const results = []; const log = (name, ok, note = '') => { results.push({ name, ok, note }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (note ? '  ' + note : '')); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (n) => page.screenshot({ path: path.join(out, `${ENGINE}-${MODE}-${n}.png`) }).catch(() => {});
const until = async (fn, ms, label, arg) => { const t0 = Date.now(); for (;;) { let v = false; try { v = await page.evaluate(fn, arg); } catch (e) {} if (v) return v; if (Date.now() - t0 > ms) throw new Error('timeout: ' + label); await wait(250); } };
const state = () => page.evaluate(() => { const S = __cf.farm.S; return { level: S.level, xp: S.xp, coins: S.coins, inv: { ...S.inv }, plots: Object.keys(S.plots).length, harvests: S.stats.harvests, orders: S.stats.orders, batches: S.stats.batches, chapter: S.story.i, bakery: !!(S.blds.bakery && S.blds.bakery.built), v: S.v, name: S.name }; });
const at = (id) => page.evaluate((id) => { const P = window.__cfPlots[id]; return __cf.screenOf(P.x, 0.25, P.z); }, id);
const atSite = (id) => page.evaluate((id) => { const s = window.__cfSites.find((q) => q.id === id); return __cf.screenOf(s.x, 1.6, s.z); }, id);
const settle = () => until(() => { const r = __cf.game.rig; return !r.tween && Math.abs(r.offsetY - r.tOffsetY) < 0.003 && Math.hypot(r.cur.x - r.tgt.x, r.cur.z - r.tgt.z) < 0.02; }, 15000, 'camera settled');
const tap = async (pt) => { if (MODE === 'phone') await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y); };
async function drag(ids) {
  await settle();
  const pts = []; for (const id of ids) pts.push(await at(id));
  await page.mouse.move(pts[0].x, pts[0].y); await page.mouse.down();
  for (let i = 1; i < pts.length; i++) for (let k = 1; k <= 10; k++) { await page.mouse.move(pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k / 10, pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k / 10); await wait(25); }
  await page.mouse.up(); await wait(500);
}
async function dismiss() {
  for (let i = 0; i < 12; i++) {
    const b = await page.$('.dlg [data-act=claimDaily], .dlg [data-act=claimAway], .dlg [data-act=closeDialog], .dlg button.btn');
    if (!b) { await wait(500); if (!(await page.$('.dlg'))) return; continue; }
    try { await b.click({ timeout: 3000 }); } catch (e) { try { const bb = await b.boundingBox(); if (bb) await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); } catch (e2) {} }
    await wait(700);
  }
}
async function plantRow(seed = 'wheat') {
  // tap an empty field, choose the seed, drag over the rest of the patch, press Done
  await settle(); await tap(await at('A1')); await page.waitForSelector(`.seed[data-id=${seed}]`, { timeout: 8000 });
  await page.click(`.seed[data-id=${seed}]`); await wait(500); await settle();
  await drag(['A2', 'A5', 'A4', 'A3', 'A0']);
  await page.click('[data-act=brushDone]'); await wait(300);
}

try {
  await page.goto(URL_ + '?fresh=1', { waitUntil: 'load' });
  await page.waitForSelector('#playBtn', { timeout: 120000 });
  await page.evaluate(async () => { const m = await import('./js/state.js'); const l = await import('./js/layout.js'); window.__cfPlots = m.PLOT; window.__cfSites = l.SITES; });
  await shot('01-title');
  const before = await state();
  log('fresh farm starts at level 1 with 60 coins', before.level === 1 && before.coins === 60 && before.v === 3, JSON.stringify({ level: before.level, coins: before.coins, v: before.v }));
  await page.click('#playBtn'); await page.waitForSelector('.dlg', { timeout: 20000 }); await wait(500); await shot('02-intro');
  await dismiss(); await wait(800);

  // ---- plant ------------------------------------------------------------------------------------------------------
  await plantRow();
  const planted = await state(); await shot('03-planted');
  log('tapping a field and dragging over five more plants six wheat', planted.plots === 6, `plots ${planted.plots}, coins ${planted.coins}`);
  log('seeds cost coins', planted.coins < before.coins, `${before.coins} -> ${planted.coins}`);

  // ---- grow and harvest -----------------------------------------------------------------------------------------------
  await until(() => __cf.farm.ripePlots().length === 6, 90000, 'wheat ripe');
  await wait(600); await shot('04-ripe');
  log('all six wheat plots ripen on their own (about 20 s)', true);
  await drag(['A0', 'A3', 'A4', 'A5', 'A2', 'A1']);
  const harvested = await state(); await shot('05-harvested');
  log('dragging across ripe wheat harvests six plots', harvested.harvests >= 6 && (harvested.inv.wheat || 0) >= 6, `harvests ${harvested.harvests}, wheat ${harvested.inv.wheat}`);

  // ---- chapter 1: level up ----------------------------------------------------------------------------------------------
  await until(() => document.querySelector('#goalbar').classList.contains('ready'), 8000, 'goal ready');
  await page.click('[data-act=claimChapter]'); await wait(900); await shot('06-chapter');
  await dismiss(); await wait(600);
  const claimed = await state();
  log('claiming chapter 1 pays coins and XP and moves the story on', claimed.chapter >= 1 && claimed.coins > harvested.coins, `chapter ${claimed.chapter}, coins ${harvested.coins} -> ${claimed.coins}`);
  log('the level goes up', claimed.level > before.level, `level ${before.level} -> ${claimed.level}`);

  // ---- order board ---------------------------------------------------------------------------------------------------------
  await page.click('[data-act=orders]'); await page.waitForSelector('.sheet.on', { timeout: 8000 }); await wait(700); await shot('07-orders');
  const fill = await page.$('.sheet.on [data-act=fillOrder]');
  if (fill) { await fill.click(); await wait(900); }
  await dismiss();
  const ordered = await state();
  log('filling an order pays out', !!fill && ordered.orders >= 1, `orders ${ordered.orders}, coins ${claimed.coins} -> ${ordered.coins}`);
  await page.keyboard.press('Escape'); await wait(500);

  // ---- more farming until the bakery is open and affordable -------------------------------------------------------------------
  let cycles = 0, st = await state();
  while ((st.level < 3 || st.coins < 150 || (st.inv.wheat || 0) < 3) && cycles < 4) {
    cycles++;
    if (!(await page.evaluate(() => Object.keys(__cf.farm.S.plots).length))) { await plantRow(); }
    await until(() => __cf.farm.ripePlots().length >= 6, 90000, 'wheat ripe again');
    await drag(['A0', 'A3', 'A4', 'A5', 'A2', 'A1']); await dismiss();
    st = await state();
    if ((st.inv.wheat || 0) > 3) {   // sell the surplus in the market, keep three for bread
      await page.click('#coinpill'); await page.waitForSelector('.sheet.on [data-act=sell]', { timeout: 8000 }); await wait(500);
      const sell = await page.$('.sheet.on [data-act=sell][data-id=wheat][data-n="1"]');
      const c0 = (await state()).coins;
      for (let i = 0; i < (st.inv.wheat - 3) && sell; i++) { await page.click('.sheet.on [data-act=sell][data-id=wheat][data-n="1"]'); await wait(250); }
      await shot('08-market'); const c1 = (await state()).coins;
      log('selling wheat at the market adds coins', c1 > c0, `${c0} -> ${c1}`);
      await page.keyboard.press('Escape'); await wait(500); st = await state();
    }
    if (st.level < 3 || st.coins < 150) { await plantRow(); }
  }
  st = await state();
  log('the bakery unlocks at level 3 and can be paid for', st.level >= 3 && st.coins >= 150, `level ${st.level}, coins ${st.coins}, wheat ${st.inv.wheat || 0}, cycles ${cycles}`);

  // ---- build the bakery ------------------------------------------------------------------------------------------------------
  await page.click('[data-act=shop]'); await page.waitForSelector('.sheet.on [data-act=buySite][data-id=bakery]', { timeout: 8000 }); await wait(500); await shot('09-shop');
  await page.click('.sheet.on [data-act=buySite][data-id=bakery]'); await page.waitForSelector('[data-act=confirmBuy]', { timeout: 8000 });
  await page.click('[data-act=confirmBuy]'); await wait(1500);
  await dismiss(); await page.keyboard.press('Escape'); await wait(800); await shot('10-bakery-built');
  const built = await state();
  log('building the bakery spends coins and puts it on the farm', built.bakery && built.coins < st.coins, `coins ${st.coins} -> ${built.coins}`);

  // ---- bake -------------------------------------------------------------------------------------------------------------------------
  await tap(await atSite('bakery')); await page.waitForSelector('.sheet.on [data-act=startJob][data-r=bread]', { timeout: 8000 }); await wait(500); await shot('11-bakery-sheet');
  await page.click('.sheet.on [data-act=startJob][data-r=bread]'); await wait(900);
  const baking = await page.evaluate(() => __cf.farm.jobs('bakery').length);
  log('starting a recipe puts a batch in the oven', baking >= 1, `${baking} job(s)`);
  await until(() => __cf.farm.readyJobs('bakery') >= 1, 80000, 'bread ready');
  await wait(600); await shot('12-bread-ready');
  const collect = await page.$('.sheet.on [data-act=collectJobs]');
  if (collect) await collect.click(); else await page.evaluate(() => __cf.farm.collectJobs('bakery'));
  await wait(900);
  const baked = await state();
  log('the finished batch is collected into the barn', (baked.inv.bread || 0) >= 1 && baked.batches >= 1, `bread ${baked.inv.bread || 0}, batches ${baked.batches}`);
  await page.keyboard.press('Escape'); await wait(500);

  // ---- save proof ------------------------------------------------------------------------------------------------------------------------
  await page.evaluate(() => __cf.farm.save(true));
  const raw = await page.evaluate(() => localStorage.getItem('claireFarm.save'));
  const saved = raw ? JSON.parse(raw) : null;
  log('the save is in localStorage with a version number', !!saved && saved.v === 3 && saved.level === baked.level, saved ? `v${saved.v}, level ${saved.level}, ${Object.keys(saved.plots).length} plots` : 'no save');
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('#playBtn', { timeout: 120000 });
  const btnText = await page.$eval('#playBtn', (e) => e.textContent.trim());
  const after = await page.evaluate(() => { const S = __cf.farm.S; return { level: S.level, coins: S.coins, inv: { ...S.inv }, harvests: S.stats.harvests, bakery: !!(S.blds.bakery && S.blds.bakery.built), batches: S.stats.batches, chapter: S.story.i }; });
  await shot('13-after-reload');
  log('after a reload the title offers Continue', /continue/i.test(btnText), btnText);
  log('level, coins, barn, workshops and story all came back', after.level === baked.level && after.coins === baked.coins && after.bakery && after.batches === baked.batches && after.chapter === baked.chapter && (after.inv.bread || 0) === (baked.inv.bread || 0), JSON.stringify(after));
  await page.click('#playBtn'); await wait(1500); await shot('14-continued');
  log('Continue returns to the farm', await page.evaluate(() => __cf.game.mode === 'play'));
} catch (e) {
  log('playthrough finished without an exception', false, String(e.message).slice(0, 300));
  await shot('99-failure');
}
log('no console errors, page errors or failed requests', problems.length === 0, problems.slice(0, 4).join(' | '));
await fs.writeFile(path.join(out, `playthrough-${ENGINE}-${MODE}.json`), JSON.stringify({ engine: ENGINE, mode: MODE, results, problems }, null, 1));
await browser.close(); server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);

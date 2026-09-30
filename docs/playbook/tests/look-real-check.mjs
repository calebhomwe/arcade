// Realistic demo: several variants in one browser session per engine (fewer slot waits). Screenshots go to OUT/<engine>-<name>.png.
//   PLAYWRIGHT_BROWSERS_PATH=<webkit dir> node look-real-check.mjs <out-dir> [engines] [variants name=query,...]
import { chromium, webkit, devices } from '/home/user/arcade/qa/harness/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.argv[2] || '/tmp/lookreal', engines = (process.argv[3] || 'chromium,webkit').split(',');
const VAR = (process.argv[4] || 'hud=still=1&ui=hud,sheet=still=1&ui=sheet,none=still=1&ui=none').split(',').map(v => { const i = v.indexOf('='); return [v.slice(0, i), v.slice(i + 1)]; });
const base = process.env.BASE || 'http://localhost:8765/arcade/docs/playbook/look-real-demo.html', WAIT = +(process.env.WAIT || 180000);
const cp = (() => { const d = '/opt/pw-browsers'; const c = fs.readdirSync(d).filter(x => /^chromium-\d+$/.test(x)).sort().pop(); return `${d}/${c}/chrome-linux/chrome`; })();
fs.mkdirSync(out, { recursive: true }); const res = {};
for (const eng of engines) {
  const b = eng === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: cp, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  res[eng] = { version: b.version(), rows: {} };
  for (const [name, q] of VAR) {
    const ctx = await b.newContext({ ...devices['iPhone 13'], ...(name.startsWith('land') ? { viewport: { width: 844, height: 390 } } : {}) }), page = await ctx.newPage(), logs = [];
    page.on('console', m => { const t = m.text(); if (!/audio device/.test(t)) logs.push(m.type() + ': ' + t.slice(0, 220)); }); page.on('pageerror', e => logs.push('pageerror: ' + e.message.slice(0, 220)));
    try {
      await page.goto(`${base}?${q}`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__ready === true, null, { timeout: WAIT });
      let ctxNote; if (name.startsWith('ctx')) ctxNote = await page.evaluate(async () => { const e = document.getElementById('c').getContext('webgl2')?.getExtension('WEBGL_lose_context'); if (!e) return 'no WEBGL_lose_context'; e.loseContext(); await new Promise(r => setTimeout(r, 500)); e.restoreContext(); await new Promise(r => setTimeout(r, 2500)); return 'lost and restored'; });
      if (q.includes('ui=sheet')) await page.waitForFunction(() => window.__icons > 0, null, { timeout: 60000 }).catch(() => logs.push('icons timeout')); await page.waitForTimeout(500);
      const stats = await page.evaluate(() => window.__stats), draws = await page.evaluate(() => window.__draws()), frame = await page.evaluate(() => window.__frameStats()), hz = await page.evaluate(() => window.__horizon());
      await page.screenshot({ path: `${out}/${eng}-${name}.png` }); res[eng].rows[name] = { q, calls: stats.calls, gpuDraws: draws, tris: stats.triangles, geoms: stats.geometries, textures: stats.textures, programs: stats.programs, texMB: stats.texMBest, loadMs: stats.loadMs, canvas: stats.canvas, info: stats.info, errors: stats.shaderErrors, ctxNote, ...frame, horizon: hz, logs };
    } catch (e) { res[eng].rows[name] = { q, error: String(e).slice(0, 240), logs }; try { await page.screenshot({ path: `${out}/${eng}-${name}-fail.png` }); } catch {} }
    await ctx.close(); fs.writeFileSync(`${out}/real.json`, JSON.stringify(res, null, 1));
  }
  await b.close();
}
fs.writeFileSync(`${out}/real.json`, JSON.stringify(res, null, 1));
for (const e of engines) { console.log('==', e, res[e].version); for (const [n, r] of Object.entries(res[e].rows)) console.log(n.padEnd(10), r.error ? 'ERR ' + r.error : `calls ${r.calls} gpu ${r.gpuDraws} tris ${r.tris} geoms ${r.geoms} tex ${r.textures} prog ${r.programs} texMB~${r.texMB} load ${r.loadMs}ms sat ${r.meanSat} luma ${r.meanLuma} green ${r.greenShare} dark ${r.darkShare} errs ${r.errors.length} logs ${r.logs.length}`); }

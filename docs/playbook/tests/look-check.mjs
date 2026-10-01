// Load look-demo.html at iPhone size in Chromium and WebKit, record stats, console output and a screenshot.
//   PLAYWRIGHT_BROWSERS_PATH=<webkit dir> node look-check.mjs "<query>" <out-prefix> [engines]
import { chromium, webkit, devices } from '/home/user/arcade/qa/harness/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const q = process.argv[2] || '', prefix = process.argv[3] || '/tmp/look', engines = (process.argv[4] || 'chromium,webkit').split(',');
const base = process.env.BASE || 'http://localhost:8765/arcade/docs/playbook/look-demo.html';
const cp = (() => { const d = '/opt/pw-browsers'; const c = fs.readdirSync(d).filter(x => /^chromium-\d+$/.test(x)).sort().pop(); return `${d}/${c}/chrome-linux/chrome`; })();
const res = {};
for (const eng of engines) {
  const b = eng === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: cp, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }), page = await ctx.newPage(), logs = [];
  page.on('console', m => { const t = m.text(); if (!/Failed to start the audio device/.test(t)) logs.push(m.type() + ': ' + t.slice(0, 300)); });
  page.on('pageerror', e => logs.push('pageerror: ' + e.message.slice(0, 300)));
  page.on('requestfailed', r => logs.push('requestfailed: ' + r.url()));
  const t0 = Date.now();
  try {
    await page.goto(base + (q ? '?' + q : ''), { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: +(process.env.WAIT || 60000) });
    await page.waitForTimeout(400);
    const stats = await page.evaluate(() => window.__stats), fs2 = await page.evaluate(() => window.__frameStats && window.__frameStats());
    await page.screenshot({ path: `${prefix}-${eng}.png` });
    res[eng] = { version: b.version(), loadMs: Date.now() - t0, stats, frame: fs2, logs };
  } catch (e) { res[eng] = { error: String(e).slice(0, 300), logs }; try { await page.screenshot({ path: `${prefix}-${eng}-fail.png` }); } catch {} }
  await b.close();
}
console.log(JSON.stringify(res, null, 1));

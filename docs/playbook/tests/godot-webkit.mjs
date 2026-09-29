// Does a Godot 4 web export from this arcade boot in Playwright WebKit (iPhone 13 profile)? Report time-to-first-paint, errors, memory hints.
import { chromium, webkit, devices } from '/home/user/arcade/qa/harness/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const games = (process.argv[2] || 'city-builder,heat-firm').split(','), out = process.argv[3] || '/tmp/godot-wk'; fs.mkdirSync(out, { recursive: true });
const cp = (() => { const d = '/opt/pw-browsers'; const c = fs.readdirSync(d).filter(x => /^chromium-\d+$/.test(x)).sort().pop(); return `${d}/${c}/chrome-linux/chrome`; })();
const res = {};
for (const g of games) for (const eng of (process.argv[4] || 'webkit,chromium').split(',')) {
  const b = eng === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: cp, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }), page = await ctx.newPage(), logs = []; const t0 = Date.now();
  page.on('console', m => { const t = m.text(); if (!/audio device/.test(t)) logs.push(m.type() + ': ' + t.slice(0, 200)); }); page.on('pageerror', e => logs.push('pageerror: ' + e.message.slice(0, 200)));
  page.on('crash', () => logs.push('PAGE CRASH'));
  let key = `${g}/${eng}`; res[key] = {};
  try {
    await page.goto(`http://localhost:8765/arcade/Godot/${g}/index.html`, { waitUntil: 'load', timeout: 60000 });
    const marks = []; for (let i = 0; i < 12; i++) { await page.waitForTimeout(2500); const p = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const gl = c.getContext('webgl2'); return { w: c.width, h: c.height, hidden: getComputedStyle(c).display }; }).catch(() => null); marks.push([Date.now() - t0, p && p.w]); }
    await page.screenshot({ path: `${out}/${g}-${eng}.png` });
    res[key] = { version: b.version(), marks: marks.slice(-3), logs: logs.slice(0, 8), totalLogs: logs.length };
  } catch (e) { res[key] = { error: String(e).slice(0, 200), logs: logs.slice(0, 6) }; }
  await b.close();
}
console.log(JSON.stringify(res, null, 1));

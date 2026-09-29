// Tap Harvest with real touch in both engines, screenshot mid-animation; then the WebGL context-loss drill.
import { chromium, webkit, devices } from '/home/user/arcade/qa/harness/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.argv[2] || '/tmp/lookint'; fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'http://localhost:8765/arcade/docs/playbook/look-demo.html';
const cp = (() => { const d = '/opt/pw-browsers'; const c = fs.readdirSync(d).filter(x => /^chromium-\d+$/.test(x)).sort().pop(); return `${d}/${c}/chrome-linux/chrome`; })();
const res = {};
for (const eng of ['chromium', 'webkit']) {
  const b = eng === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: cp, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }), page = await ctx.newPage(), logs = []; res[eng] = { version: b.version() };
  page.on('console', m => { if (!/audio device|Failed to load resource/.test(m.text())) logs.push(m.type() + ': ' + m.text().slice(0, 200)); }); page.on('pageerror', e => logs.push('pageerror: ' + e.message));
  await page.goto(base + '?still=0'); await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
  const before = await page.textContent('#coinN'); await page.tap('#go'); await page.waitForTimeout(330); await page.screenshot({ path: `${out}/${eng}-tap-mid.png` });
  await page.waitForTimeout(1500); const after = await page.textContent('#coinN');
  res[eng].tap = { before, after, coinsInDom: await page.evaluate(() => document.querySelectorAll('.coin').length), buttonTransform: await page.evaluate(() => document.getElementById('go').style.transform) };
  // context loss drill
  const can = await page.evaluate(() => !!window.__lose());
  res[eng].lossSupported = can;
  if (can) {
    await page.waitForTimeout(400); res[eng].ctxAfterLose = await page.evaluate(() => window.__ctx); const overlay = await page.evaluate(() => getComputedStyle(document.getElementById('lost')).display);
    res[eng].overlayWhileLost = overlay; await page.screenshot({ path: `${out}/${eng}-lost.png` });
    await page.evaluate(() => window.__restore()); await page.waitForTimeout(1500);
    res[eng].ctxAfterRestore = await page.evaluate(() => window.__ctx); res[eng].overlayAfter = await page.evaluate(() => getComputedStyle(document.getElementById('lost')).display);
    res[eng].pixelAfterRestore = await page.evaluate(() => window.__pixel(0.5, 0.5)); res[eng].frameAfter = await page.evaluate(() => window.__frameStats());
    await page.screenshot({ path: `${out}/${eng}-restored.png` });
  }
  // visibility drill: hide/show
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(600); res[eng].visibilityFrameOk = await page.evaluate(() => { const a = window.__frameStats(); return a.meanLuma > 0.2; });
  res[eng].logs = logs; await b.close();
}
console.log(JSON.stringify(res, null, 1));

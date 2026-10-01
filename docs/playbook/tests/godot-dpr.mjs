// Recipe test: capping devicePixelRatio for a Godot 4 web export by shadowing window.devicePixelRatio before godot.js runs.
import { webkit, devices } from '/home/user/arcade/qa/harness/node_modules/playwright/index.mjs';
const game = process.argv[2] || 'heat-firm', res = {};
const CAP = `(() => { const d = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio'); if (!d || !d.get) return; Object.defineProperty(window, 'devicePixelRatio', { get: () => Math.min(2, d.get.call(window)), configurable: true }); })();`;
for (const capped of [false, true]) {
  const b = await webkit.launch(), ctx = await b.newContext({ ...devices['iPhone 13'] }), page = await ctx.newPage();
  if (capped) await page.addInitScript(CAP);
  await page.goto(`http://localhost:8765/arcade/Godot/${game}/index.html`, { waitUntil: 'load', timeout: 60000 });
  let w = 0; for (let i = 0; i < 30 && !w; i++) { await page.waitForTimeout(1500); w = await page.evaluate(() => { const c = document.querySelector('canvas'); return c && c.width > 300 ? c.width : 0; }); }
  res[capped ? 'capped' : 'native'] = await page.evaluate(() => { const c = document.querySelector('canvas'); return { dpr: window.devicePixelRatio, canvas: [c.width, c.height], css: [Math.round(c.getBoundingClientRect().width), Math.round(c.getBoundingClientRect().height)] }; });
  await b.close();
}
console.log(JSON.stringify(res));

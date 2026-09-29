// True GPU draw counts and the sky/fog horizon seam, per engine.
import { chromium, webkit, devices } from '/home/user/arcade/qa/harness/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:8765/arcade/docs/playbook/look-demo.html';
const cp = (() => { const d = '/opt/pw-browsers'; const c = fs.readdirSync(d).filter(x => /^chromium-\d+$/.test(x)).sort().pop(); return `${d}/${c}/chrome-linux/chrome`; })();
const Q = [['default', ''], ['shadow=none', 'shadow=none'], ['shadow=map', 'shadow=map'], ['shadow=both', 'shadow=both'], ['outline=0', 'outline=0'], ['grass=0', 'grass=0'], ['skytm=1 (sky tone-mapped)', 'skytm=1'], ['fog=0', 'fog=0'], ['tm=agx', 'tm=agx'], ['tm=neutral', 'tm=neutral']];
const out = {};
for (const eng of ['chromium', 'webkit']) {
  const b = eng === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: cp, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] }); out[eng] = { version: b.version() };
  for (const [label, q] of Q) {
    const ctx = await b.newContext({ ...devices['iPhone 13'] }), page = await ctx.newPage();
    await page.goto(`${base}?still=1&ui=0&${q}`); await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
    out[eng][label] = { gpuDraws: await page.evaluate(() => window.__draws()), horizon: await page.evaluate(() => window.__horizon()), info: await page.evaluate(() => window.__stats.calls) }; await ctx.close();
  }
  await b.close();
}
console.log(JSON.stringify(out, null, 1));

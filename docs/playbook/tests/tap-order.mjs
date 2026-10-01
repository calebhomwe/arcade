// How stable is the event order of a real touch tap? Six taps per engine, distinct orders reported.
import { chromium, webkit, devices } from '/home/user/arcade/qa/harness/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const url = 'http://localhost:8765/arcade/docs/playbook/tests/iphone-test.html';
const cp = (() => { const d = '/opt/pw-browsers'; const c = fs.readdirSync(d).filter(x => /^chromium-\d+$/.test(x)).sort().pop(); return `${d}/${c}/chrome-linux/chrome`; })();
const out = {};
for (const eng of ['chromium', 'webkit']) {
  const b = eng === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: cp, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }), page = await ctx.newPage(); await page.goto(url); await page.waitForFunction(() => window.__done === true);
  const seen = {};
  for (let i = 0; i < 6; i++) { await page.evaluate(() => { window.__events.length = 0; }); await page.tap('#tapme'); await page.waitForTimeout(450); const o = await page.evaluate(() => window.__events.join(' > ')); seen[o] = (seen[o] || 0) + 1; }
  out[eng] = { version: b.version(), orders: seen }; await b.close();
}
console.log(JSON.stringify(out, null, 1));

// Trusted-input checks in both engines: tap event order, audio unlock by a real tap, landscape orientation gate,
// safe-area/dvh values, and the zoom-related computed styles.
import { chromium, webkit, devices } from '/home/user/arcade/qa/harness/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const url = process.env.URL || 'http://localhost:8765/arcade/docs/playbook/tests/iphone-test.html';
const cp = (() => { const d = '/opt/pw-browsers'; const c = fs.readdirSync(d).filter(x => /^chromium-\d+$/.test(x)).sort().pop(); return `${d}/${c}/chrome-linux/chrome`; })();
const res = {};
for (const eng of ['chromium', 'webkit']) {
  const b = eng === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: cp, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }), page = await ctx.newPage(); res[eng] = { version: b.version() };
  await page.goto(url); await page.waitForFunction(() => window.__done === true, null, { timeout: 30000 });
  await page.evaluate(() => { window.__events.length = 0; });
  await page.tap('#tapme'); await page.waitForTimeout(500); res[eng].tapOrder = await page.evaluate(() => window.__events.join(' > '));
  await page.evaluate(() => { window.__events.length = 0; }); await page.click('#tapme'); await page.waitForTimeout(300); res[eng].clickOrder = await page.evaluate(() => window.__events.join(' > '));
  // does a trusted tap open audio?
  res[eng].audioAfterTrustedTap = null;
  const p = page.evaluate(() => new Promise(r => { const g = IPhone.audioGate(); document.addEventListener('touchend', () => setTimeout(() => r({ state: g.ctx && g.ctx.state, running: g.running }), 400), { once: true }); }));
  await page.waitForTimeout(100); await page.tap('#tapme'); res[eng].audioAfterTrustedTap = await p;
  // css facts
  res[eng].css = await page.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;height:100dvh;width:10px;padding-top:env(safe-area-inset-top)'; document.body.appendChild(d); const cs = getComputedStyle(d); const o = { dvhPx: d.getBoundingClientRect().height, innerHeight, safeTop: cs.paddingTop, htmlTouchAction: getComputedStyle(document.documentElement).touchAction, vv: [visualViewport.width, visualViewport.height, visualViewport.scale] }; d.remove(); return o; });
  // landscape
  await page.setViewportSize({ width: 664, height: 390 }); await page.waitForTimeout(300);
  res[eng].landscape = await page.evaluate(() => ({ portraitMatches: matchMedia('(orientation: portrait)').matches, landscapeMatches: matchMedia('(orientation: landscape)').matches, w: innerWidth, h: innerHeight }));
  await b.close();
}
console.log(JSON.stringify(res, null, 1));

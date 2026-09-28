// Unit tests for assets/arcade-sdk.js: pause really stops timers and clocks, resume continues them.
//   node qa/harness/sdk-test.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const sdk = fs.readFileSync(path.join(root, 'assets/arcade-sdk.js'), 'utf8').replace(/<\/script/gi, '<\\/script');   // inlined below
const preinstalled = (() => { try { const d = '/opt/pw-browsers'; const c = fs.readdirSync(d).filter(x => /^chromium-\d+$/.test(x)).sort().pop(); return c && path.join(d, c, 'chrome-linux/chrome'); } catch { return null; } })();
let browser;
try { browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}); }
catch (e) { if (!preinstalled) throw e; browser = await chromium.launch({ executablePath: preinstalled }); }
const page = await browser.newPage();
await page.setContent(`<!doctype html><html><head><script>${sdk}</script></head><body><p>test</p></body></html>`);
const wait = ms => page.waitForTimeout(ms);
let failed = 0;
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); if (!ok) failed++; };

// 1. A timeout keeps its remaining time across a pause.
await page.evaluate(() => { window.t0 = performance.now(); window.fired = null; setTimeout(() => { window.fired = performance.now() - window.t0; window.firedWall = Date.now(); }, 600); window.wall0 = Date.now(); });
await wait(200);
await page.evaluate(() => ArcadeSDK.pause());
await wait(900);                                  // the timeout would have fired during this pause
const duringPause = await page.evaluate(() => window.fired);
check('timeout does not fire while paused', duringPause === null, 'fired=' + duringPause);
await page.evaluate(() => ArcadeSDK.resume());
await wait(250);
check('timeout has not fired early on resume', await page.evaluate(() => window.fired) === null);
await wait(400);
const fired = await page.evaluate(() => window.fired);
check('timeout fires after its 600 ms of game time', fired != null && fired >= 590 && fired < 800, 'game-clock ms=' + (fired && Math.round(fired)));

// 2. Intervals do not tick while paused.
await page.evaluate(() => { window.ticks = 0; window.iv = setInterval(() => window.ticks++, 100); });
await wait(550);
await page.evaluate(() => { window.before = window.ticks; ArcadeSDK.pause(); });
await wait(600);
const pausedTicks = await page.evaluate(() => window.ticks - window.before);
check('interval does not tick while paused', pausedTicks === 0, 'ticks while paused=' + pausedTicks);
await page.evaluate(() => ArcadeSDK.resume());
await wait(550);
const after = await page.evaluate(() => { clearInterval(window.iv); return window.ticks - window.before; });
check('interval keeps ticking after resume', after >= 3 && after <= 7, 'ticks after resume=' + after);

// 3. performance.now and Date.now stand still while paused and do not jump on resume.
const c = await page.evaluate(() => { const p0 = performance.now(), d0 = Date.now(); ArcadeSDK.pause(); return { p0, d0 }; });
await wait(900);                                  // a jump would add at least this much
const c2 = await page.evaluate(() => ({ p: performance.now(), d: Date.now() }));
check('performance.now frozen while paused', c2.p - c.p0 < 5, Math.round(c2.p - c.p0) + ' ms');
check('Date.now frozen while paused', c2.d - c.d0 < 5, (c2.d - c.d0) + ' ms');
await page.evaluate(() => ArcadeSDK.resume());
await wait(100);
const c3 = await page.evaluate(() => ({ p: performance.now(), d: Date.now(), real: new Date().getTime() }));
check('performance.now continues without a jump', c3.p - c.p0 < 650, Math.round(c3.p - c.p0) + ' ms');
check('Date.now continues without a jump', c3.d - c.d0 < 650, (c3.d - c.d0) + ' ms');
check('new Date() stays on the real clock', c3.real - c3.d >= 600, 'real minus game = ' + (c3.real - c3.d) + ' ms');

// 4. clearTimeout / clearInterval cancel timers created by the wrappers, paused or not.
await page.evaluate(() => { window.cancelled = 0; const a = setTimeout(() => window.cancelled++, 50); clearTimeout(a); const b = setInterval(() => window.cancelled++, 30); ArcadeSDK.pause(); clearInterval(b); ArcadeSDK.resume(); });
await wait(200);
check('cleared timers never run', await page.evaluate(() => window.cancelled) === 0);

// 5. Pause keys: 'esc' binds only Escape, 'p' only P, 'p+esc' both.
for (const [keys, pressP, pressEsc] of [['esc', false, true], ['p', true, false], ['p+esc', true, true]]) {
  await page.evaluate(k => ArcadeSDK.init({ pauseKeys: k }), keys);
  const r = await page.evaluate(() => {
    const press = key => document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    const out = {};
    press('p'); out.p = ArcadeSDK.paused; if (ArcadeSDK.paused) ArcadeSDK.resume();
    press('Escape'); out.esc = ArcadeSDK.paused; if (ArcadeSDK.paused) ArcadeSDK.resume();
    return out;
  });
  check(`pauseKeys '${keys}'`, r.p === pressP && r.esc === pressEsc, JSON.stringify(r));
}

await browser.close();
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);

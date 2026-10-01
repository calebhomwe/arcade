// Run a test page in Chromium AND WebKit (iPhone 13 profile) and print window.__results.
//   PLAYWRIGHT_BROWSERS_PATH=<webkit dir> node run.mjs <url> [--shot out.png] [--wait 8000] [--engines chromium,webkit]
// A test page sets window.__done = true and window.__results = { name: {ok, note} ... }.
import { chromium, webkit, devices } from '/home/user/arcade/qa/harness/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const args = process.argv.slice(2);
const url = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const shot = opt('--shot', ''), wait = +opt('--wait', 10000), engines = opt('--engines', 'chromium,webkit').split(',');
const chromiumPath = (() => { try { const d = '/opt/pw-browsers'; const c = fs.readdirSync(d).filter(x => /^chromium-\d+$/.test(x)).sort().pop(); return c && `${d}/${c}/chrome-linux/chrome`; } catch { return undefined; } })();
const out = {};
for (const eng of engines) {
  const t0 = Date.now();
  let browser;
  try {
    browser = eng === 'webkit'
      ? await webkit.launch()
      : await chromium.launch({ executablePath: chromiumPath, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await ctx.newPage();
    const logs = [];
    page.on('console', m => logs.push(`${m.type()}: ${m.text()}`));
    page.on('pageerror', e => logs.push(`pageerror: ${e.message}`));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__done === true, null, { timeout: wait }).catch(() => logs.push('TIMEOUT waiting for __done'));
    const results = await page.evaluate(() => window.__results || null);
    if (shot) await page.screenshot({ path: shot.replace('.png', `-${eng}.png`) });
    const ua = await page.evaluate(() => navigator.userAgent);
    out[eng] = { ms: Date.now() - t0, engine: `${eng} ${browser.version()}`, ua, results, logs: logs.filter(l => !/Failed to start the audio device/.test(l)) };
  } catch (e) { out[eng] = { error: String(e).slice(0, 400) }; }
  finally { try { await browser?.close(); } catch {} }
}
console.log(JSON.stringify(out, null, 1));

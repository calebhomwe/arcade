// A/B matrix for look-demo.html: tone mappers, toon/outline/shadow/fog/grass/dpr flags, horizon seam.
//   PLAYWRIGHT_BROWSERS_PATH=<webkit dir> node look-matrix.mjs <out-dir> [engines]
import { chromium, webkit, devices } from '/home/user/arcade/qa/harness/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.argv[2] || '/tmp/lookm', engines = (process.argv[3] || 'chromium,webkit').split(',');
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'http://localhost:8765/arcade/docs/playbook/look-demo.html';
const cp = (() => { const d = '/opt/pw-browsers'; const c = fs.readdirSync(d).filter(x => /^chromium-\d+$/.test(x)).sort().pop(); return `${d}/${c}/chrome-linux/chrome`; })();
const VARIANTS = [
  ['tm=agx', 'AgX (default)'], ['tm=aces', 'ACES Filmic'], ['tm=neutral', 'Khronos Neutral'], ['tm=linear', 'Linear'], ['tm=none', 'No tone mapping'],
  ['toon=0', 'Standard material (no toon ramp)'], ['outline=0', 'No outlines'], ['shadow=none', 'No shadows at all'], ['shadow=map', 'Shadow map only'], ['shadow=both', 'Shadow map + blobs'],
  ['fog=0', 'No fog'], ['skytm=1', 'Sky tone-mapped (fog seam)'], ['grass=0', 'No grass'], ['grass=12000', 'Grass x2'], ['dpr=1', 'DPR 1'], ['dpr=3', 'DPR 3'], ['aa=1', 'MSAA on at DPR 2'],
];
const res = {};
for (const eng of engines) {
  const b = eng === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: cp, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  res[eng] = { version: b.version(), rows: {} };
  for (const [q, label] of VARIANTS) {
    const ctx = await b.newContext({ ...devices['iPhone 13'] }), page = await ctx.newPage(), logs = [];
    page.on('console', m => { if (!/audio device|Failed to load resource/.test(m.text())) logs.push(m.type() + ': ' + m.text().slice(0, 160)); });
    page.on('pageerror', e => logs.push('pageerror: ' + e.message.slice(0, 160)));
    try {
      await page.goto(`${base}?still=1&ui=0&${q}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 }); await page.waitForTimeout(200);
      const stats = await page.evaluate(() => window.__stats), frame = await page.evaluate(() => window.__frameStats());
      const strip = await page.evaluate(() => window.__strip(0.5, 0.12, 0.5, 90));
      let seam = 0, at = 0; for (let i = 1; i < strip.length; i++) { const d = Math.max(Math.abs(strip[i][1] - strip[i - 1][1]), Math.abs(strip[i][2] - strip[i - 1][2]), Math.abs(strip[i][3] - strip[i - 1][3])); if (d > seam) { seam = d; at = strip[i][0]; } }
      await page.screenshot({ path: `${out}/${eng}-${q.replace(/[=&]/g, '_')}.png` });
      res[eng].rows[q] = { label, calls: stats.calls, tris: stats.triangles, prog: stats.programs, canvas: stats.canvas, aa: stats.aa, errors: stats.shaderErrors.length, ...frame, seam, seamAt: +at.toFixed(3), logs };
    } catch (e) { res[eng].rows[q] = { label, error: String(e).slice(0, 200), logs }; }
    await ctx.close();
  }
  await b.close();
}
fs.writeFileSync(`${out}/matrix.json`, JSON.stringify(res, null, 1));
for (const eng of engines) { console.log('==', eng, res[eng].version); for (const [q, r] of Object.entries(res[eng].rows)) console.log(q.padEnd(14), r.error ? 'ERR ' + r.error : `calls ${r.calls} tris ${r.tris} sat ${r.meanSat} luma ${r.meanLuma} dark ${r.darkShare} white ${r.whiteShare} seam ${r.seam}@${r.seamAt} canvas ${r.canvas} logs ${r.logs.length}`); }

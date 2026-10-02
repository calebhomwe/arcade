// probe several games: start play, dump localStorage keys + page errors
import path from 'node:path';
import fss from 'node:fs';
import { startServer, routeExternal, launch, wait, root } from '../harness/lib/common.mjs';
const ids = (process.argv[2] || 'sky-cut-rope').split(',');
const metaAll = JSON.parse(fss.readFileSync(path.join(root, 'assets/game-meta.json'), 'utf8')).games;
const { server, BASE } = await startServer();
const browser = await launch();
for (const id of ids) {
  const src = metaAll[id].src.replace(/^https:\/\/calebhomwe\.github\.io\//, '');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true });
  await routeExternal(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 160)));
  await page.goto('https://calebhomwe.github.io/' + src, { waitUntil: 'load', timeout: 60000 });
  for (let i = 0; i < 30; i++) { const c = await page.evaluate(() => window.ArcadeSDK ? ArcadeSDK.debug().caps : null).catch(() => null); if (c && c.declared) break; await wait(1000); }
  await wait(2000);
  await page.touchscreen.tap(195, 332).catch(() => {});
  await wait(6000);
  // play a bit: a few more taps
  await page.touchscreen.tap(195, 300).catch(() => {});
  await wait(2500);
  const st = await page.evaluate(() => ({ ls: Object.keys(localStorage).map(k => k + '=' + String(localStorage.getItem(k)).slice(0, 90)) })).catch(e => ({ err: String(e) }));
  console.log('===', id, '| errors:', errors.length ? JSON.stringify(errors.slice(0, 4)) : 'none');
  console.log('   keys:', JSON.stringify(st.ls || st.err));
  await ctx.close().catch(() => {});
}
await browser.close().catch(() => {});
server.close();
process.exit(0);

// L5a probe: load one skywalker game, start play, watch localStorage writes + errors.
import path from 'node:path';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import { startServer, routeExternal, launch, wait, extRoot, root } from '../harness/lib/common.mjs';

const id = process.argv[2] || 'sky-hole-eater';
const meta = JSON.parse(fss.readFileSync(path.join(root, 'assets/game-meta.json'), 'utf8')).games[id];
const src = meta.src.replace(/^https:\/\/calebhomwe\.github\.io\//, '');
const { server, BASE } = await startServer();
const url = 'https://calebhomwe.github.io/' + src;
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true });
await routeExternal(ctx);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message).slice(0, 200)));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
// wait for sdk declared like the harness does
for (let i = 0; i < 30; i++) {
  const c = await page.evaluate(() => window.ArcadeSDK ? ArcadeSDK.debug().caps : null).catch(() => null);
  if (c && c.declared) break;
  await wait(1000);
}
await wait(3000);
const state1 = await page.evaluate(() => ({
  sdkScene: window.ArcadeSDK && ArcadeSDK.debug ? JSON.stringify(ArcadeSDK.debug()) : null,
  ls: Object.fromEntries(Object.entries(localStorage)),
})).catch(e => ({ err: String(e) }));
// tap centre to start
await page.touchscreen.tap(195, 332).catch(() => {});
await wait(5000);
const state2 = await page.evaluate(() => ({
  ls: Object.fromEntries(Object.entries(localStorage)),
  pk: window.PK ? 'PK global' : 'PK not global',
})).catch(e => ({ err: String(e) }));
console.log('=== after load:', JSON.stringify(state1).slice(0, 600));
console.log('=== after tap+5s:', JSON.stringify(state2).slice(0, 900));
console.log('=== errors:', JSON.stringify(errors.slice(0, 6), null, 1));
await ctx.close().catch(() => {});
await browser.close().catch(() => {});
server.close();
process.exit(0);

#!/usr/bin/env node
// Play harness for Caleb's Arcade. It plays games THROUGH the portal (play.html?g=<id> -> Play splash -> iframe),
// the way a visitor does, and can fail. Two jobs:
//
//  1. One game, like a player:  node qa/harness/play.mjs --game hole-grind [--episodes 3] [--secs 60]
//                               [--mode default|mobile|storm|resize|blur|storage-blocked|long] [--fault <name>]
//     Waits for the game's ready predicate, presses start (again, up to 3 presses, if no run begins; the count is
//     reported), acts every tick from that game's own policy (see GAMES below) until the end screen or --secs, then
//     restarts (end-screen button, or reload + start), for N episodes. Exits 1 on: a page error, a NaN/undefined/out-of-bounds state field, an illegal
//     phase transition, a stuck run (playing but no state change for stuckAfterMs), no progression signal
//     moving in an episode, a restart that does not reach play, or heap growth past the limit in long mode.
//     --fault <name> rewrites a served file to prove the harness detects a real break; that run MUST exit 1.
//
//  2. Every game, 20 s each:    node qa/harness/play.mjs --sweep [--secs 20] [--only a,b] [--local] [--mode mobile]
//     Opens every catalog game through the portal, starts it (assets/game-meta.json `start`, then any visible
//     Play-like button), drives it with a generic policy for --secs, and records per game: how it started,
//     the SDK scenes it reported (title/play/over), whether visible text changed, page errors, console errors,
//     failed requests, NaN/undefined on screen, fps. Exits 1 if any game throws, shows NaN/undefined, or
//     never loads. --local skips the external cabinets (hosted on the sibling GitHub Pages sites; locally they
//     are served from clones next to this repo when present, otherwise from the live site).
//
// Reports: harness-out/report-<game>-<mode>[-fault-x].json, harness-out/sweep-<mode>.json + .md, screenshots.
// Playwright comes from qa/harness/node_modules (npm install --prefix qa/harness). Chromium runs on SwiftShader.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { root, extRoot, META, startServer, fileFor, typeOf, launch } from './lib/common.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------------------------
// GAMES: one profile per game that gets the full episode harness. readState runs INSIDE THE GAME FRAME every
// tick and must be cheap and side-effect free; it returns { phase, ...numbers } with phase one of
// 'menu' | 'playing' | 'paused' | 'over'. start/restart run in node with (frame, page). policy returns actions
// for one tick: {key, hold} {click:[x,y]} {tap:[x,y]} {move:[x,y]} {tdrag:[x1,y1,x2,y2,ms]} {sel:'css'} (click an
// element in the frame) — click/tap/move/tdrag use FRAME coordinates. ready (optional) runs in the frame and says when
// the start control can take a press. Documented in docs/GAME_WIKI.md and docs/wiki/<game>.md.
// ---------------------------------------------------------------------------------------------
// Wait until the element shows, then click it with force: pulsing Play buttons never "hold still" for Playwright.
const clickSel = async (f, sel, timeout = 8000) => { const l = f.locator(sel).first(); await l.waitFor({ state: 'visible', timeout }); await l.click({ timeout, force: true }); };
const GAMES = {
  'hole-grind': {
    // HoleGrind/index.html: window.__DEBUG.state (the game's own debug handle, lines 1143-1170).
    readState: () => {
      const s = window.__DEBUG && window.__DEBUG.state; if (!s) return { phase: 'menu', loading: 1 };
      return { phase: s.over ? 'over' : s.paused ? 'paused' : (s.running ? 'playing' : 'menu'),
        score: s.score, holeMass: s.holeMass, timeLeft: s.timeLeft, nearest: s.nearest, edible: s.edible, coins: s.coins, best: s.best, level: s.level, x: s.x, y: s.y };
    },
    transitions: { menu: ['playing'], playing: ['paused', 'over', 'menu'], paused: ['playing', 'menu'], over: ['menu', 'playing'] },
    // DROP IN sits under the "LOADING THE CITY…" cover until models/city.glb is in (index.html:79, 1180): a click before that is lost.
    ready: () => !document.getElementById('loading') && !!(window.__DEBUG && window.__DEBUG.state.ready),
    start: async (f) => { await clickSel(f, '#btnPlay'); },
    restart: async (f) => { await clickSel(f, '#btnAgain'); },
    resumeSel: '#btnResume',
    // Steer by the "nearest edible prop" distance the debug state exposes: keep the heading while it shrinks, turn when it grows.
    policy: (s, tick, rnd, mem) => {
      const dirs = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
      if (mem.dir == null) mem.dir = 0;
      if (mem.lastNearest != null && s.nearest >= 0 && s.nearest >= mem.lastNearest - 0.5) mem.dir = (mem.dir + (rnd() < 0.5 ? 1 : 3)) % 4;
      mem.lastNearest = s.nearest;
      return [{ key: dirs[mem.dir], hold: 160 }];
    },
    touchMap: { ArrowUp: [195, 250], ArrowDown: [195, 650], ArrowLeft: [60, 450], ArrowRight: [330, 450] },
    progression: ['score', 'holeMass'],
    bounded: { timeLeft: [0, 400], holeMass: [0, 1e7], score: [0, 1e9] },
    tickMs: 120, stuckAfterMs: 15000, heapLimitMB: 80, settleMs: 4000,
    faults: {
      // HoleGrind/index.html:523 — the swallow score line. A NaN score must be caught by readState.
      'nan-score': { file: 'HoleGrind/index.html', from: 'R.score += Math.round(p.m*4*', to: 'R.score += undefined + Math.round(p.m*4*' },
    },
  },
  'survivor-wave': {
    // SurvivorWave/index.html: top-level `state` (ready|play|paused|levelup|chest|over|win, line 1712), `score` (1780), `player` (1600),
    // `enemies`/`gems` (1708), `gameTime` (1710, the run clock directorTick() advances at line 3213; `elapsed` on the same line is
    // never written, so it is not used). All are script-global, readable from the frame.
    readState: () => {
      if (typeof state === 'undefined') return { phase: 'menu', loading: 1 };
      const ph = state === 'ready' ? 'menu' : (state === 'over' || state === 'win') ? 'over' : (state === 'paused' || state === 'pause') ? 'paused' : 'playing';
      const o = { phase: ph, sub: state, score, hp: player.hp, maxHp: player.maxHp, level: player.level, kills: player.kills, time: Math.floor(gameTime), nEnemies: enemies.length, nGems: gems.length };
      let best = 1e9, ex = 0, ey = 0; for (const e of enemies) { const d = Math.hypot(e.x - player.x, e.y - player.y); if (d < best) { best = d; ex = e.x - player.x; ey = e.y - player.y; } }
      o.enemyDist = best < 1e9 ? Math.round(best) : -1; o.ex = Math.round(ex); o.ey = Math.round(ey);
      best = 1e9; let gx = 0, gy = 0; for (const g of gems) { const d = Math.hypot(g.x - player.x, g.y - player.y); if (d < best) { best = d; gx = g.x - player.x; gy = g.y - player.y; } }
      o.gemDist = best < 1e9 ? Math.round(best) : -1; o.gx = Math.round(gx); o.gy = Math.round(gy);
      return o;
    },
    transitions: { menu: ['playing'], playing: ['paused', 'over', 'menu'], paused: ['playing', 'menu'], over: ['menu', 'playing'] },
    ready: () => typeof state !== 'undefined' && !!document.getElementById('playBtn'),
    start: async (f) => { await clickSel(f, '#playBtn'); },
    resumeSel: '#pResume',   // its own pause overlay (index.html:702); window blur pauses the run and waits for the player
    // Its full effects (bloom canvas, gradients) render at 0-1 fps on SwiftShader on a loaded box, so the game clock barely moves
    // (dt is capped at 0.05 s, index.html:13806). Play with the game's own "Low effects" setting (settings.lowFx, applyLowFx() at
    // 13855), as a player on a slow machine would; it is stored in survivorSettings, so storage-blocked runs keep full effects.
    setup: async (ctx) => { await ctx.addInitScript(() => { try { if (!localStorage.getItem('survivorSettings')) localStorage.setItem('survivorSettings', JSON.stringify({ lowFx: true })); } catch (e) {} }); },
    restart: async (f) => { if (await f.locator('#winAgainBtn').isVisible().catch(() => false)) await clickSel(f, '#winAgainBtn'); else await clickSel(f, '#againBtn'); },
    // Dodge the nearest zombie when it is close, otherwise walk to the nearest XP gem; pick the first card on level-up, open chests.
    policy: (s, tick, rnd) => {
      if (s.sub === 'levelup') return [{ sel: '#lvlChoices button' }];
      if (s.sub === 'chest') return [{ sel: '#chestBtn' }];
      let dx = 0, dy = 0;
      if (s.enemyDist >= 0 && s.enemyDist < 170) { dx = -s.ex; dy = -s.ey; }
      else if (s.gemDist >= 0) { dx = s.gx; dy = s.gy; }
      else { const a = tick / 12; dx = Math.cos(a); dy = Math.sin(a); }
      const acts = [];
      if (Math.abs(dx) > Math.abs(dy) * 0.5) acts.push({ key: dx > 0 ? 'ArrowRight' : 'ArrowLeft', hold: 140 });
      if (Math.abs(dy) > Math.abs(dx) * 0.5) acts.push({ key: dy > 0 ? 'ArrowDown' : 'ArrowUp', hold: 140 });
      if (s.enemyDist >= 0 && s.enemyDist < 60 && rnd() < 0.5) acts.push({ key: 'Space', hold: 40 });
      return acts;
    },
    // Phone: the game reads a virtual joystick from touchstart/touchmove (tStart/tMove, lines 2455-2480): drag from the lower-left.
    touchPolicy: (s, tick, rnd) => {
      if (s.sub === 'levelup') return [{ sel: '#lvlChoices button' }];
      if (s.sub === 'chest') return [{ sel: '#chestBtn' }];
      let dx = 0, dy = 0;
      if (s.enemyDist >= 0 && s.enemyDist < 170) { dx = -s.ex; dy = -s.ey; } else if (s.gemDist >= 0) { dx = s.gx; dy = s.gy; } else { const a = tick / 12; dx = Math.cos(a); dy = Math.sin(a); }
      const n = Math.hypot(dx, dy) || 1;
      return [{ tdrag: [120, 650, 120 + dx / n * 70, 650 + dy / n * 70, 220] }];
    },
    progression: ['score', 'kills', 'time'],
    bounded: { hp: [0, 100000], level: [1, 999], time: [0, 7200] },
    tickMs: 120, stuckAfterMs: 15000, heapLimitMB: 120, settleMs: 3500,
    faults: {
      // SurvivorWave/index.html:3687 — the kill score line.
      'nan-score': { file: 'SurvivorWave/index.html', from: 'score+=10+Math.min(player.combo,50);', to: 'score+=undefined+10+Math.min(player.combo,50);' },
    },
  },
  'long-way-home': {
    // SpellMathsGalaxy/index.html: the game's own read-mostly test hook window.__tlwh_debug.state() (line 5411, written for
    // its tools/playtest.py) returns running/paused/score/hull/q/total/correct/dist and every gate with its world position
    // and `correct` flag; screens are .screen.on (#s-menu, #s-pause, #s-end). Nothing is added to the game.
    readState: () => {
      const d = window.__tlwh_debug; if (!d) return { phase: 'menu', loading: 1 };
      const h = d.state();
      const on = id => { const e = document.querySelector(id); return !!(e && e.classList.contains('on')); };
      const ph = on('#s-end') ? 'over' : on('#s-pause') ? 'paused' : h.running ? 'playing' : 'menu';
      const gate = h.gates.filter(g => g.correct && g.z < 0).sort((a, b) => b.z - a.z)[0] || null;
      const r1 = v => Math.round(v * 10) / 10;
      return { phase: ph, score: h.score, hull: h.hull, q: h.q, total: h.total, correct: h.correct, dist: r1(h.dist),
        gateX: gate ? r1(gate.x) : 0, gateY: gate ? r1(gate.y) : 0, gateZ: gate ? r1(gate.z) : 1, nGates: h.gates.length };
    },
    transitions: { menu: ['playing'], playing: ['paused', 'over', 'menu'], paused: ['playing', 'menu'], over: ['menu', 'playing'] },
    // #boot (index.html:166) covers the hangar until the renderer has compiled the scene and hides at line 5438.
    ready: () => !!window.__tlwh_debug && getComputedStyle(document.getElementById('boot')).display === 'none',
    start: async (f) => { await clickSel(f, '[data-play="quick"]'); },
    resumeSel: '#resume',   // "Resume transit" on #s-pause
    restart: async (f) => { await clickSel(f, '#again'); },
    // Fly through the ring that carries the correct answer: the pointer aims the ship (aim(), line 5163, maps the viewport
    // to tx in [-11.5, 11.5] and ty in [-5.6, 5.6]; the ship sits at y = ty - 1, line 5262), so put the pointer where
    // the ship must be to cross the correct gate.
    policy: (s, tick, rnd, mem, box) => {
      if (s.gateZ >= 0) return [];
      const px = ((s.gateX / 11.5) + 1) / 2 * box.width, py = (1 - ((s.gateY + 1) / 5.6)) / 2 * box.height;
      return [{ move: [Math.max(2, Math.min(box.width - 2, px)), Math.max(2, Math.min(box.height - 2, py))] }];
    },
    // Phone: the ship follows touchmove (index.html:5165-5166), so a short drag that ends on the aim point, not a tap.
    touchPolicy: (s, tick, rnd, mem, box) => {
      if (s.gateZ >= 0) return [];
      const px = Math.max(2, Math.min(box.width - 2, ((s.gateX / 11.5) + 1) / 2 * box.width)), py = Math.max(2, Math.min(box.height - 2, (1 - ((s.gateY + 1) / 5.6)) / 2 * box.height));
      return [{ tdrag: [px, Math.min(box.height - 2, py + 24), px, py, 120] }];
    },
    progression: ['score', 'q', 'dist'],
    bounded: { hull: [0, 3], score: [0, 1e7] },
    tickMs: 100, stuckAfterMs: 15000, heapLimitMB: 100, settleMs: 5000,
    faults: {
      // SpellMathsGalaxy/index.html:5012 (resolve()) — the correct-answer score line.
      'nan-score': { file: 'SpellMathsGalaxy/index.html', from: 'state.score+=gain; state.correct++;', to: 'state.score+=undefined+gain; state.correct++;' },
    },
  },
  'chili-firm': {
    // ChiliFirm/js/main.js: window.CF.state (money, rep, day, plots[], stats) and CF.ui.started. An idle game: no end screen.
    readState: () => {
      const CF = window.CF; if (!CF || !CF.state || !CF.ui) return { phase: 'menu', loading: 1 };
      const s = CF.state, st = s.plots.slice(0, s.plotCount).map(p => p.status);
      return { phase: CF.ui.started ? 'playing' : 'menu', money: Math.round(s.money), rep: Math.round(s.rep), day: s.day, mission: s.missionIdx,
        planted: s.stats.planted, harvested: s.stats.harvested, sold: s.stats.sold,
        empty: st.filter(x => x === 'empty').length, ready: st.filter(x => x === 'ready' || x === 'wilted').length, panel: document.querySelector('#panel-root.open') ? 1 : 0, dlg: CF.ui.dialog ? 1 : 0 };
    },
    transitions: { menu: ['playing'], playing: ['menu', 'paused'], paused: ['playing', 'menu'] },   // paused = the arcade SDK's pause sheet
    ready: () => !!(window.CF && window.CF.ui && window.CF.state && document.querySelector('#title .playbtn')),
    start: async (f) => { await clickSel(f, '#title .playbtn'); },
    restart: async (f) => { await clickSel(f, '#title .playbtn'); },
    // Tap pots in turn (plant / water / harvest, ui.js onPointerDown), then every 40 ticks open the Market and sell everything.
    // A story dialogue (#dlg: a full-screen shade with a .dbox that advances on a tap, js/ui/ui.js:411-425) covers the pots:
    // read it on, as a player would, before tapping pots.
    policy: (s, tick) => {
      if (s.dlg) return [{ sel: '#dlg .dbox' }];
      const m = tick % 40;
      if (m === 30) return [{ sel: '#d-market' }];
      if (m === 32) return [{ sel: '[data-action="sell-strain"][data-qty="999999"]:not([disabled])' }];
      if (m === 34) return [{ sel: '#panel-root.open .panel .x' }];
      if (s.panel && (m < 30 || m > 34)) return [{ sel: '#panel-root.open .panel .x' }];   // leave the Market open while selling
      return [{ sel: '.plot[data-idx="' + (tick % 12) + '"]' }];
    },
    progression: ['planted', 'harvested', 'sold'],
    bounded: { money: [0, 1e12], day: [1, 100000] },
    tickMs: 250, stuckAfterMs: 20000, heapLimitMB: 80, settleMs: 2500,
    faults: {
      // ChiliFirm/js/core/logic.js sellStrain(): the money from a sale.
      'nan-money': { file: 'ChiliFirm/js/core/logic.js', from: 'const money = n * price;', to: 'const money = undefined + n * price;' },
    },
  },
};
// A fault every game shares: the portal's own Play button disappears (play.html), so nothing can start.
const HUB_FAULTS = { 'hub-no-play': { file: 'play.html', from: 'id="playbtn"', to: 'id="playbtn-broken"' } };

// ---------------------------------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const has = n => { const i = args.indexOf(n); if (i < 0) return false; args.splice(i, 1); return true; };
const SWEEP = has('--sweep');
const LOCAL = has('--local');
const GAME_ID = flag('--game', null);
const EPISODES = +flag('--episodes', '3');
const MODE = flag('--mode', 'default');
const SECS = +flag('--secs', SWEEP ? '20' : MODE === 'long' ? '180' : '60');
const ONLY = flag('--only', null);
const OUT = path.resolve(flag('--out', path.join(root, 'harness-out')));
let seed = +flag('--seed', '7');
const FAULT = flag('--fault', null);
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
if (!SWEEP && !GAME_ID) { console.error('usage: play.mjs --game <id> | --sweep   (see the header)'); process.exit(2); }
if (GAME_ID && !GAMES[GAME_ID]) { console.error('no profile for', GAME_ID, '- profiles:', Object.keys(GAMES).join(', ')); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const CATALOG = vm.runInNewContext(fs.readFileSync(path.join(root, 'catalog.js'), 'utf8') + ';CATALOG');
const byId = Object.fromEntries(CATALOG.map(g => [g.id, g]));
const metaOf = id => (META.games || {})[id] || {};
let commit = 'unknown';
try { commit = execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}

const { server, BASE } = await startServer();
const mobile = MODE === 'mobile';
const VIEW = mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 };
const browser = await launch();   // lib/common.mjs: SwiftShader flags, falls back to the box's preinstalled Chromium

async function newContext() {
  const ctx = await browser.newContext(Object.assign({ serviceWorkers: 'block' }, mobile
    ? { viewport: VIEW, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: VIEW }));
  // External cabinets: serve https://calebhomwe.github.io/<repo>/... from a clone next to this repo when there is one, else go live.
  await ctx.route(/^https:\/\/calebhomwe\.github\.io\/([^/]+)\/(.*)$/, async route => {
    const m = route.request().url().match(/^https:\/\/calebhomwe\.github\.io\/([^/]+)\/(.*)$/);
    const dir = m[1] === 'arcade' ? root : path.join(extRoot, m[1]);
    if (!fs.existsSync(dir)) return route.continue();
    const p = fileFor(dir, '/' + m[2]);
    if (!p) return route.fulfill({ status: 404, body: 'not found' });
    return route.fulfill({ status: 200, body: fs.readFileSync(p), headers: { 'content-type': typeOf(p) } });
  });
  if (MODE === 'storage-blocked') {
    await ctx.addInitScript(() => {
      const boom = () => { throw new DOMException('The operation is insecure.', 'SecurityError'); };
      try { Object.defineProperty(window, 'localStorage', { get: boom }); Object.defineProperty(window, 'sessionStorage', { get: boom }); } catch {}
    });
  }
  // Record every SDK message the game posts to the portal (ArcadeSDK.state -> {arcade:1,type:'state',scene,score}).
  await ctx.addInitScript(() => {
    if (window !== window.top) return;
    window.__hs = [];
    window.addEventListener('message', e => { const m = e.data; if (m && m.arcade === 1 && typeof m.type === 'string' && (m.type === 'state' || m.type === 'ready' || m.type === 'event')) window.__hs.push({ t: Date.now(), type: m.type, scene: m.scene, score: m.score, event: m.name || m.event }); });
  });
  return ctx;
}
async function applyFaults(page, faults) {
  for (const f of faults) {
    await page.route('**/' + f.file, async route => {
      const body = (await (await route.fetch()).text());
      if (!body.includes(f.from)) { console.error('fault text not found in', f.file); process.exit(2); }
      await route.fulfill({ body: body.replace(f.from, f.to), contentType: typeOf(f.file) });
    });
  }
}
const extSource = g => { if (!g.ext) return 'local'; const m = g.src.match(/^https:\/\/calebhomwe\.github\.io\/([^/]+)\//); return m && fs.existsSync(path.join(extRoot, m[1])) ? 'clone:' + m[1] : 'live'; };
const heavy = g => /Godot\//.test(g.src) || g.id === 'bloxburg-town';

// Open play.html for a game, press the portal's Play, wait for the game frame to load. Returns the frame.
async function openGame(page, g, rec) {
  const t0 = Date.now();
  await page.goto(BASE + 'play.html?g=' + g.id, { waitUntil: 'load', timeout: 45000 });
  // The portal's Play pulses, so it is clicked with force; a profile toast or sheet can sit on top of it on a repeat
  // visit, so the press is retried, and the third try is a DOM click. rec.portalPresses records how many it took.
  const pb = page.locator('#playbtn');
  await pb.waitFor({ state: 'visible', timeout: 15000 });
  const frameSet = () => { const f = document.querySelector('#frame'); return !!(f && f.src && f.src !== 'about:blank' && !f.hidden); };
  let presses = 0;
  while (presses < 3 && !(await page.evaluate(frameSet))) {
    presses++;
    if (presses < 3) await pb.click({ timeout: 8000, force: true }).catch(() => {});
    else await page.evaluate(() => document.getElementById('playbtn').click()).catch(() => {});
    await page.waitForFunction(frameSet, null, { timeout: 8000 }).catch(() => {});
  }
  if (rec) rec.portalPresses = presses;
  await page.waitForFunction(frameSet, null, { timeout: 2000 });
  const h = await page.$('#frame'); const frame = await h.contentFrame();
  await frame.waitForLoadState('load', { timeout: heavy(g) ? 120000 : 90000 });
  if (rec) rec.loadMs = Date.now() - t0;
  return frame;
}
const frameOf = async page => { const h = await page.$('#frame'); return h ? await h.contentFrame() : null; };
const frameBox = async page => (await page.locator('#frame').boundingBox().catch(() => null)) || { x: 0, y: 0, width: VIEW.width, height: VIEW.height };
// The arcade SDK holds a paused game's timers and animation frames, so an in-page timeout can never fire while the
// game sits on its pause sheet: the node side gives up after 4 s and records null (no sample).
const fpsIn = f => Promise.race([
  f.evaluate(ms => new Promise(res => { let n = 0; const t0 = performance.now(); const step = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(step); else res(Math.round(n * 1000 / ms)); }; requestAnimationFrame(step); setTimeout(() => res(0), ms + 2000); }), 1000).catch(() => null),
  new Promise(r => setTimeout(() => r(null), 4000))]);
const heapIn = f => f.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null).catch(() => null);
const BAD_TEXT = /\bNaN\b|\bundefined\b|\[object Object\]|\bInfinity\b/;
const scanText = f => f.evaluate(src => { const t = document.body ? document.body.innerText : ''; const m = t.match(new RegExp(src, 'g')) || []; const i = m.length ? t.search(new RegExp(src)) : -1; return { count: m.length, sample: i >= 0 ? t.slice(Math.max(0, i - 30), i + 30).replace(/\s+/g, ' ') : '' }; }, BAD_TEXT.source).catch(() => ({ count: 0, sample: '' }));

let cdp = null;
async function act(page, frame, box, a) {
  try {
    if (a.key) { await page.keyboard.down(a.key); await page.waitForTimeout(a.hold || 80); await page.keyboard.up(a.key); }
    else if (a.click) await page.mouse.click(box.x + a.click[0], box.y + a.click[1]);
    else if (a.move) await page.mouse.move(box.x + a.move[0], box.y + a.move[1], { steps: 2 });
    else if (a.tap) await page.touchscreen.tap(box.x + a.tap[0], box.y + a.tap[1]);
    else if (a.drag) { await page.mouse.move(box.x + a.drag[0], box.y + a.drag[1]); await page.mouse.down(); await page.mouse.move(box.x + a.drag[2], box.y + a.drag[3], { steps: 8 }); await page.waitForTimeout(a.drag[4] || 100); await page.mouse.up(); }
    else if (a.tdrag) {
      // a real touch drag through CDP (Playwright's touchscreen only taps)
      if (!cdp) cdp = await page.context().newCDPSession(page);
      const [x1, y1, x2, y2, ms] = a.tdrag; const steps = 6;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + x1, y: box.y + y1 }] });
      for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + x1 + (x2 - x1) * i / steps, y: box.y + y1 + (y2 - y1) * i / steps }] }); await page.waitForTimeout((ms || 200) / steps); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    else if (a.sel) { const l = frame.locator(a.sel).first(); if (await l.isVisible().catch(() => false)) await l.click({ timeout: 1500, force: true }); }
    else if (a.wheel != null) await page.mouse.wheel(0, a.wheel);
  } catch {}
}
const randomAction = (box) => {
  const r = rnd();
  if (mobile || r < 0.3) return { tap: [10 + rnd() * (box.width - 20), 10 + rnd() * (box.height - 20)] };
  if (r < 0.6) return { key: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'Escape', 'KeyP', 'KeyM'][Math.floor(rnd() * 9)], hold: 30 + rnd() * 100 };
  if (r < 0.85) return { click: [rnd() * box.width, rnd() * box.height] };
  return { wheel: (rnd() - 0.5) * 400 };
};

// =============================================================================================
// 1. One game, episodes, invariants, stress modes.
// =============================================================================================
async function playOne() {
  const g = byId[GAME_ID], GAME = GAMES[GAME_ID];
  const report = { game: g.title, id: g.id, mode: MODE, fault: FAULT, commit, url: BASE + 'play.html?g=' + g.id, load1: null, episodes: [], pageErrors: [], consoleErrors: [], failedRequests: [], fps: [], heap: [], verdict: { pass: true, reasons: [] } };
  const fail = (why) => { report.verdict.pass = false; if (!report.verdict.reasons.includes(why)) report.verdict.reasons.push(why); };
  const ctx = await newContext(); if (GAME.setup) await GAME.setup(ctx, MODE); const page = await ctx.newPage();
  page.on('pageerror', e => { report.pageErrors.push(String(e.message || e).slice(0, 300)); fail('page error'); });
  page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text().slice(0, 300)); });
  page.on('requestfailed', r => report.failedRequests.push(r.url().replace(BASE, '/') + ' ' + (r.failure()?.errorText || '')));
  page.on('response', r => { if (r.status() >= 400) report.failedRequests.push(r.url().replace(BASE, '/') + ' HTTP ' + r.status()); });
  if (FAULT) {
    const f = GAME.faults[FAULT] || HUB_FAULTS[FAULT];
    if (!f) { console.error('unknown fault', FAULT, '- known:', Object.keys(GAME.faults).concat(Object.keys(HUB_FAULTS)).join(', ')); process.exit(2); }
    await applyFaults(page, [f]);
  }
  let frame = null;
  const readState = () => frame ? frame.evaluate(GAME.readState).catch(e => ({ phase: 'unreadable', error: String(e.message || e).split('\n')[0].slice(0, 120) })) : Promise.resolve({ phase: 'unreadable' });
  // record each distinct invariant failure once per episode (a broken readState would otherwise repeat every tick)
  const note = (ep, msg) => { if (!ep.invariantFailures.includes(msg) && ep.invariantFailures.length < 25) ep.invariantFailures.push(msg); };
  function checkState(prev, cur, ep) {
    for (const [k, v] of Object.entries(cur)) {
      if (typeof v === 'number' && !Number.isFinite(v)) { note(ep, `${k} is ${v}`); fail('non-finite value'); }
      if (v === undefined) { note(ep, `${k} is undefined`); fail('undefined value'); }
      const b = GAME.bounded[k];
      if (b && typeof v === 'number' && (v < b[0] || v > b[1])) { note(ep, `${k}=${v} outside [${b}]`); fail('out of bounds'); }
    }
    if (!['menu', 'playing', 'paused', 'over'].includes(cur.phase)) { note(ep, `unknown phase ${cur.phase}${cur.error ? ' (' + cur.error + ')' : ''}`); fail('unknown phase'); }
    if (prev && prev.phase !== cur.phase && GAME.transitions[prev.phase] && !GAME.transitions[prev.phase].includes(cur.phase)) { note(ep, `illegal transition ${prev.phase} -> ${cur.phase}`); fail('illegal transition'); }
  }
  const open = async (rec) => { frame = await openGame(page, g, rec); await page.waitForTimeout(GAME.settleMs || 3000); };
  const waitReady = async () => {
    if (!GAME.ready) return true;
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) { if (await frame.evaluate(GAME.ready).catch(() => false)) return true; await page.waitForTimeout(500); }
    return false;
  };
  const pressUntilPlaying = async (fn) => {
    if (!(await waitReady())) throw new Error('game never became ready (GAME.ready) within 60 s');
    for (let i = 1; i <= 3; i++) {
      await fn(frame, page).catch(() => {});
      for (let k = 0; k < 8; k++) { await page.waitForTimeout(500); if ((await readState()).phase === 'playing') return i; }
    }
    return 0;
  };
  try {
    const first = {}; await open(first); report.load1 = first.loadMs; report.portalPresses1 = first.portalPresses;
    report.heap.push({ t: 0, mb: await heapIn(frame) });
    for (let e = 0; e < EPISODES; e++) {
      const ep = { index: e, startedAt: Date.now(), ticks: 0, invariantFailures: [], progression: {}, stuck: false, endPhase: null, restartOk: null, restartVia: null };
      report.episodes.push(ep);
      const mem = {};
      try {
        if (e === 0) { ep.presses = await pressUntilPlaying(GAME.start); if (!ep.presses) { ep.invariantFailures.push('start: 3 presses and the run never began'); fail('could not start'); } }
        else {
          const before = await readState();
          if (before.phase === 'over') { ep.restartVia = 'restart'; ep.presses = await pressUntilPlaying(GAME.restart); }
          else { await open(ep); ep.restartVia = 'reload+start'; ep.presses = await pressUntilPlaying(GAME.start); }
          let s = await readState();
          if (s.phase === 'menu') { ep.presses = await pressUntilPlaying(GAME.start); s = await readState(); }
          ep.restartOk = s.phase === 'playing';
          if (!ep.restartOk) { ep.invariantFailures.push(`restart did not reach playing (phase=${s.phase}, via ${ep.restartVia})`); fail('restart did not work'); }
        }
      } catch (err) { ep.invariantFailures.push('start/restart failed: ' + String(err.message).split('\n')[0].slice(0, 160)); fail(e === 0 ? 'could not start' : 'restart did not work'); }
      await page.waitForTimeout(600);
      let prev = null, lastChange = Date.now(), lastKey = '';
      const t0 = Date.now(); let tick = 0, nextFps = 10000, nextStress = 5000;
      while (Date.now() - t0 < SECS * 1000) {
        let cur = await readState();
        // The arcade SDK's own pause sheet (P / Esc in the portal) freezes the game without telling its state: count it as paused.
        if (cur.phase === 'playing' && await frame.evaluate(() => !!(window.ArcadeSDK && window.ArcadeSDK.paused)).catch(() => false)) cur = { ...cur, phase: 'paused', sdkPaused: 1 };
        checkState(prev, cur, ep);
        const key = JSON.stringify(cur);
        if (key !== lastKey) { lastKey = key; lastChange = Date.now(); }
        if (cur.phase === 'playing' && Date.now() - lastChange > GAME.stuckAfterMs) { ep.stuck = true; fail('stuck while playing'); break; }
        for (const s of GAME.progression) if (typeof cur[s] === 'number') { const p = ep.progression[s] || (ep.progression[s] = { first: cur[s], max: cur[s], last: cur[s] }); p.max = Math.max(p.max, cur[s]); p.last = cur[s]; }
        if (cur.phase === 'over') {
          // long mode is one long session: start the next run from the end screen and keep going until --secs
          if (MODE === 'long' && Date.now() - t0 < SECS * 1000 - 8000) {
            ep.longRestarts = (ep.longRestarts || 0) + 1;
            const n = await pressUntilPlaying(GAME.restart).catch(() => 0);
            if (!n) { ep.invariantFailures.push('long: restart from the end screen did not reach playing'); fail('restart did not work'); break; }
            prev = null; lastChange = Date.now(); lastKey = ''; tick++; continue;
          }
          break;
        }
        // storm input and blur events may legitimately pause the game or leave the run; elsewhere it must still be going at tick 15
        if (e === 0 && tick === 15 && cur.phase !== 'playing' && MODE !== 'storm' && MODE !== 'blur') { ep.invariantFailures.push(`not playing after start (phase=${cur.phase})`); fail('start did not reach playing'); }
        const box = await frameBox(page);
        let actions;
        if (cur.phase === 'playing') actions = (mobile && GAME.touchPolicy ? GAME.touchPolicy : GAME.policy)(cur, tick, rnd, mem, box) || [];
        else if (cur.phase === 'paused') {
          // a player resumes: the SDK sheet's Resume, else the game's own resume control, else P
          mem.pausedTicks = (mem.pausedTicks || 0) + 1;
          actions = mem.pausedTicks % 6 === 3 ? [{ sel: cur.sdkPaused ? '[data-a="resume"]' : (GAME.resumeSel || '[data-a="resume"]') }] : mem.pausedTicks % 6 === 0 ? [{ key: 'p' }] : [];
          if (mem.pausedTicks % 6 === 3) ep.resumes = (ep.resumes || 0) + 1;
        } else if (cur.phase === 'menu' && tick - (mem.lastRestartTick ?? -99) > 20) {
          // back on the title mid-episode (storm input left the run): press start again, as a player would
          mem.lastRestartTick = tick; ep.menuReturns = (ep.menuReturns || 0) + 1;
          await pressUntilPlaying(GAME.start).catch(() => 0); actions = [];
        } else actions = [{ key: 'Enter' }];
        if (cur.phase !== 'paused') mem.pausedTicks = 0;
        if (mobile && !GAME.touchPolicy) actions = actions.map(a => (a.key && GAME.touchMap && GAME.touchMap[a.key]) ? { tap: GAME.touchMap[a.key] } : a);
        if (MODE === 'storm') actions = actions.concat([randomAction(box), randomAction(box)]);
        for (const a of actions) await act(page, frame, box, a);
        const now = Date.now() - t0;
        if (now > nextStress) {
          nextStress += 5000;
          if (MODE === 'resize') { const small = (nextStress / 5000) % 2 === 0; await page.setViewportSize(small ? { width: 390, height: 844 } : VIEW).catch(() => {}); }
          if (MODE === 'blur') {
            const blurry = () => { window.dispatchEvent(new Event('blur')); document.dispatchEvent(new Event('visibilitychange')); setTimeout(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); }, 400); };
            await page.evaluate(blurry).catch(() => {}); await frame.evaluate(blurry).catch(() => {});
          }
        }
        if (now > nextFps) { nextFps += 10000; report.fps.push({ t: now, fps: await fpsIn(frame), episode: e }); if (MODE === 'long') report.heap.push({ t: now, mb: await heapIn(frame) }); }
        prev = cur; tick++; ep.ticks = tick;
        await page.waitForTimeout(GAME.tickMs);
      }
      const final = await readState();
      ep.endPhase = final.phase; ep.final = final; ep.durationMs = Date.now() - t0;
      const moved = GAME.progression.some(s => ep.progression[s] && ep.progression[s].max > ep.progression[s].first);
      if (!moved) { ep.invariantFailures.push('no progression signal moved: ' + GAME.progression.join(',')); fail('no progression'); }
      await page.screenshot({ path: path.join(OUT, `${g.id}-${MODE}-ep${e}-end.png`), timeout: 5000 }).catch(() => {});
    }
    if (MODE === 'long') {
      const mbs = report.heap.map(h => h.mb).filter(x => x != null);
      if (mbs.length > 2 && mbs[mbs.length - 1] - Math.min(...mbs.slice(0, 2)) > GAME.heapLimitMB) fail(`heap grew more than ${GAME.heapLimitMB} MB`);
    }
    const bad = frame ? await scanText(frame) : { count: 0 };
    report.badText = bad; if (bad.count) fail('NaN/undefined on screen');
  } catch (err) { report.pageErrors.push('HARNESS: ' + String(err.message || err).slice(0, 300)); fail('harness exception'); }
  await settle(ctx.close());
  report.finishedAt = new Date().toISOString(); report.load1 = report.load1; report.loadavg = loadavg();
  const outFile = path.join(OUT, `report-${g.id}-${MODE}${FAULT ? '-fault-' + FAULT : ''}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  const summary = report.episodes.map(e => `ep${e.index}: ${e.endPhase} ${Math.round((e.durationMs || 0) / 1000)}s presses ${e.presses ?? '-'} ` + Object.entries(e.progression).map(([k, v]) => `${k} ${v.first}->${v.max}`).join(' ') + (e.invariantFailures.length ? ' FAIL ' + e.invariantFailures.join('; ') : '')).join('\n');
  console.log(`${g.title} [${MODE}${FAULT ? ' fault=' + FAULT : ''}] ${report.verdict.pass ? 'PASS' : 'FAIL'} ${report.verdict.reasons.join(', ')}\n${summary}\nfps ${report.fps.map(f => f.fps).join(',') || '-'}  load ${report.loadavg}  errors ${report.pageErrors.length}\nreport: ${outFile}`);
  return report.verdict.pass;
}
const settle = (p, ms = 8000) => Promise.race([p.catch(() => {}), new Promise(r => setTimeout(r, ms))]);
const loadavg = () => { try { return fs.readFileSync('/proc/loadavg', 'utf8').split(' ').slice(0, 3).join(' '); } catch { return '?'; } };

// =============================================================================================
// 2. Sweep: every catalog game for SECS seconds with a generic policy.
// =============================================================================================
const PLAYISH = /^(?:[▶►▷]\s*)?(?:play(?:\s+now)?|start(?:\s+(?:game|run|wave|building|adventure|playing))?|fight|go|begin|continue|new game|let.s (?:go|play)|drop in|tap to start|ok|got it|skip|next|again|try again|retry|resume|easy|normal|classic)(?:\s*[!▶►])?$/i;
async function sweepOne(g) {
  const meta = metaOf(g.id);
  const r = { id: g.id, title: g.title, cat: g.cat, source: extSource(g), src: g.src, loadMs: null, started: null, scenes: [], textChanged: null, pageErrors: [], consoleErrors: [], failedRequests: [], badText: null, fps: null, canvases: 0, verdict: 'ok', note: '' };
  const ctx = await newContext(); const page = await ctx.newPage();
  page.on('pageerror', e => r.pageErrors.push(String(e.message || e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') r.consoleErrors.push(m.text().slice(0, 200)); });
  page.on('requestfailed', q => r.failedRequests.push(q.url().replace(BASE, '/').slice(0, 160) + ' ' + (q.failure()?.errorText || '')));
  page.on('response', q => { if (q.status() >= 400) r.failedRequests.push(q.url().replace(BASE, '/').slice(0, 160) + ' HTTP ' + q.status()); });
  const deadline = setTimeout(() => { r.note += 'deadline; '; ctx.close().catch(() => {}); }, (SECS + (heavy(g) ? 150 : 75)) * 1000);
  try {
    const frame = await openGame(page, g, r);
    await page.waitForTimeout(heavy(g) ? 15000 : 2500);
    const before = await frame.evaluate(() => document.body ? document.body.innerText.slice(0, 12000) : '').catch(() => '');
    // start: the catalog's start selector/key, then any visible Play-like button (twice)
    let box = await frameBox(page);
    if (meta.start && /^key:(\w+)$/.test(meta.start)) {
      const k = meta.start.slice(4); const cv = frame.locator('canvas:visible').first();
      if (await cv.count()) await cv.click({ position: { x: 10, y: 10 }, timeout: 1500, force: true }).catch(() => {}); else await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.3).catch(() => {});
      await page.keyboard.press(k === 'Space' ? ' ' : k).catch(() => {}); r.started = 'key ' + k;
    } else if (meta.start && meta.start !== 'auto') {
      const l = frame.locator(meta.start).first();
      if (await l.isVisible().catch(() => false)) { await (mobile ? l.tap({ timeout: 2000, force: true }) : l.click({ timeout: 2000, force: true })).catch(() => {}); r.started = 'meta ' + meta.start; }
    }
    for (let n = 0; n < 2; n++) {
      const btns = frame.getByRole('button', { name: PLAYISH });
      let hit = null; for (let i = 0; i < Math.min(await btns.count().catch(() => 0), 12); i++) { const b = btns.nth(i); if (await b.isVisible().catch(() => false)) { hit = b; break; } }
      if (!hit) break;
      const label = (await hit.innerText().catch(() => '')).trim().slice(0, 30);
      await (mobile ? hit.tap({ timeout: 1500, force: true }) : hit.click({ timeout: 1500, force: true })).catch(() => {});
      r.started = (r.started ? r.started + ' > ' : '') + 'button "' + label + '"'; await page.waitForTimeout(700);
    }
    if (!r.started) { await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2).catch(() => {}); r.started = 'centre click'; }
    // play: generic policy for SECS
    const t0 = Date.now(); let tick = 0;
    while (Date.now() - t0 < SECS * 1000) {
      box = await frameBox(page);
      const acts = [];
      if (tick % 8 === 7) acts.push({ sel: 'button:visible' }); // whatever button is showing (level-up card, Nice!, Continue...)
      if (mobile) { acts.push({ tap: [box.width * (0.2 + rnd() * 0.6), box.height * (0.3 + rnd() * 0.5)] }); if (rnd() < 0.4) acts.push({ tdrag: [box.width / 2, box.height * 0.6, box.width * (0.2 + rnd() * 0.6), box.height * (0.3 + rnd() * 0.5), 200] }); }
      else {
        acts.push({ key: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Enter'][Math.floor(rnd() * 10)], hold: 60 + rnd() * 140 });
        if (rnd() < 0.5) acts.push({ click: [box.width * (0.15 + rnd() * 0.7), box.height * (0.2 + rnd() * 0.6)] });
        if (rnd() < 0.3) acts.push({ drag: [box.width / 2, box.height / 2, box.width * (0.2 + rnd() * 0.6), box.height * (0.2 + rnd() * 0.6), 120] });
      }
      for (const a of acts) await act(page, frame, box, a);
      tick++; await page.waitForTimeout(150);
    }
    r.fps = await fpsIn(frame);
    const after = await frame.evaluate(() => document.body ? document.body.innerText.slice(0, 12000) : '').catch(() => '');
    r.textChanged = before !== after;
    r.canvases = await frame.evaluate(() => document.querySelectorAll('canvas').length).catch(() => 0);
    r.badText = await scanText(frame);
    r.scenes = await page.evaluate(() => (window.__hs || []).filter(m => m.type === 'state' && m.scene).map(m => m.scene).filter((s, i, a) => i === 0 || a[i - 1] !== s)).catch(() => []);
    r.sdk = await page.evaluate(() => (window.__hs || []).some(m => m.type === 'ready')).catch(() => false);
    await page.screenshot({ path: path.join(OUT, `sweep-${MODE}-${g.id}.jpg`), type: 'jpeg', quality: 60, timeout: 4000 }).catch(() => {});
  } catch (e) { r.note += 'blocked: ' + String(e.message || e).slice(0, 160); }
  clearTimeout(deadline); await settle(ctx.close(), 4000);
  r.ownFailed = r.failedRequests.filter(x => !/^https?:\/\/(?!127\.0\.0\.1)/.test(x) || r.source !== 'live').length;
  r.verdict = r.pageErrors.length ? 'error' : (r.badText && r.badText.count) ? 'bad-text' : /blocked|deadline/.test(r.note) ? 'blocked'
    : (r.scenes.includes('play') || r.textChanged) ? 'ok' : 'no-start';
  return r;
}
async function sweep() {
  let games = CATALOG.slice();
  if (LOCAL) games = games.filter(g => !g.ext);
  if (ONLY) { const want = ONLY.split(','); games = games.filter(g => want.includes(g.id)); }
  const out = { mode: MODE, secs: SECS, commit, loadavgStart: loadavg(), games: [], startedAt: new Date().toISOString() };
  const jsonFile = path.join(OUT, `sweep-${MODE}${LOCAL ? '-local' : ''}${ONLY ? '-only' : ''}.json`);
  for (const g of games) {
    const r = await sweepOne(g); r.loadavg = loadavg(); out.games.push(r);
    console.log(`${String(out.games.length).padStart(3)}/${games.length} ${r.verdict.padEnd(9)} ${g.id.padEnd(28)} ${(r.started || '-').slice(0, 34).padEnd(34)} scenes ${r.scenes.join('>') || '-'}  text ${r.textChanged ? 'changed' : 'same'}  err ${r.pageErrors.length}  fps ${r.fps ?? '-'}  load ${r.loadavg.split(' ')[0]}${r.note ? '  ' + r.note.slice(0, 80) : ''}`);
    fs.writeFileSync(jsonFile, JSON.stringify(out, null, 1));
  }
  out.finishedAt = new Date().toISOString(); out.loadavgEnd = loadavg();
  const counts = out.games.reduce((a, r) => (a[r.verdict] = (a[r.verdict] || 0) + 1, a), {});
  out.counts = counts; fs.writeFileSync(jsonFile, JSON.stringify(out, null, 1));
  const md = ['| # | Game | Category | Source | Started via | SDK scenes | Text changed | Page errors | Bad text | fps | Verdict |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
    .concat(out.games.map((r, i) => `| ${i + 1} | ${r.title} (\`${r.id}\`) | ${r.cat} | ${r.source} | ${(r.started || '-').replace(/\|/g, '/')} | ${r.scenes.join(' > ') || '-'} | ${r.textChanged ? 'yes' : 'no'} | ${r.pageErrors.length ? r.pageErrors.length + ': ' + r.pageErrors[0].slice(0, 60) : '0'} | ${r.badText && r.badText.count ? r.badText.count + ' "' + r.badText.sample + '"' : '0'} | ${r.fps ?? '-'} | ${r.verdict}${r.note ? ' (' + r.note.slice(0, 60) + ')' : ''} |`));
  fs.writeFileSync(jsonFile.replace(/\.json$/, '.md'), md.join('\n') + '\n');
  const bad = out.games.filter(r => r.verdict === 'error' || r.verdict === 'bad-text' || r.verdict === 'blocked');
  console.log(`SWEEP [${MODE}${LOCAL ? ' local' : ''}] ${bad.length ? 'FAIL' : 'PASS'} ${JSON.stringify(counts)} load start ${out.loadavgStart} end ${out.loadavgEnd}\nreport: ${jsonFile}`);
  return bad.length === 0;
}

let ok = false;
try { ok = SWEEP ? await sweep() : await playOne(); }
catch (e) { console.error('HARNESS:', e); ok = false; }
await settle(browser.close()); server.close();
process.exit(ok ? 0 : 1);

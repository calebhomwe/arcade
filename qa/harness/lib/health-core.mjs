// checkHealth(): load a game on an iPhone 13 profile, start it, play it with the monkey bot for DURATION seconds while the
// page instrumentation (lib/inject.js) records long tasks, frame costs, stalls, errors and resource growth; then judge.
import fs from 'node:fs/promises';
import path from 'node:path';
import { devices, os, wait, heavy, urlFor, routeExternal, ENGINE, rng, pct, median, signature, sigDiff, contention } from './common.mjs';
import { makeBot } from './bot.mjs';

const INJECT = await fs.readFile(path.join(import.meta.dirname, 'inject.js'), 'utf8');
const race = (p, ms, label = 'timeout') => Promise.race([p, wait(ms).then(() => label)]);
const round = (n, d = 1) => typeof n !== 'number' || Number.isNaN(n) ? null : +n.toFixed(d);

export async function checkHealth(g, browser, o) {
  const { BASE, out, DURATION = 45, THROTTLE = 4 } = o;
  const landscape = !!o.landscape;
  const rand = rng(g.id + (o.seed || ''));
  const r = { id: g.id, title: g.title || g.id, cat: g.cat, genre: g.genre, src: g.src, engine: ENGINE, throttle: ENGINE === 'chromium' ? THROTTLE : 1, throttled: ENGINE === 'chromium' && THROTTLE > 1, durationS: DURATION, orientation: landscape ? 'landscape' : 'portrait', verdicts: [], evidence: {}, notes: [], shots: {} };
  const cs = [contention(120)];
  r.machine = { load1Start: round(os.loadavg()[0], 2), cores: os.cpus().length };
  const ctx = await browser.newContext({ ...devices[landscape ? 'iPhone 13 landscape' : 'iPhone 13'], serviceWorkers: 'block' });
  await ctx.addInitScript(INJECT);
  await routeExternal(ctx);
  const page = await ctx.newPage(); page.setDefaultTimeout(10000);
  const shotDir = path.join(out, 'shots'); await fs.mkdir(shotDir, { recursive: true });

  // ---- what the page and the browser report ----
  const R = { errors: [], consoleErrors: [], failed: [], nav: [], crashed: false, closed: false, dialogs: 0 };
  const T0 = Date.now();
  page.on('pageerror', e => { const m = String(e.message || e); if (!/Failed to start the audio device/.test(m) && !/ResizeObserver loop/.test(m)) R.errors.push({ at: Date.now() - T0, msg: m.slice(0, 220) }); });
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (!/Failed to start the audio device|favicon|Failed to load resource/.test(t)) R.consoleErrors.push(t.slice(0, 200)); } });
  page.on('response', res => { if (res.status() >= 400 && !/favicon/.test(res.url())) R.failed.push(res.status() + ' ' + res.url().replace(BASE, '').slice(-90)); });
  page.on('crash', () => { R.crashed = true; R.crashAt = Date.now() - T0; });
  page.on('close', () => { R.closed = true; });
  page.on('dialog', d => { R.dialogs++; (d.type() === 'confirm' || d.type() === 'prompt' ? d.dismiss() : d.accept()).catch(() => {}); });
  ctx.on('page', p => { if (p !== page) p.close().catch(() => {}); });
  let loaded = false, lastBotAction = { at: 0, kind: '' };
  page.on('framenavigated', f => { if (f === page.mainFrame() && loaded) R.nav.push({ at: Date.now() - T0, abs: f.url(), url: f.url().replace(BASE, ''), afterAction: Date.now() - lastBotAction.at, kind: lastBotAction.kind, txt: lastBotAction.txt || '' }); });

  let cdp = null;
  if (ENGINE === 'chromium') {
    cdp = await ctx.newCDPSession(page);
    await cdp.send('Performance.enable').catch(() => {});
    if (r.throttled) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE }).catch(e => r.notes.push('throttle failed: ' + e.message.slice(0, 80)));
  }

  // ---- drained page data ----
  const D = { L: [], A: [], B: [], R: [], r: [], F: [], P: [], X: [], V: [], E: [], S: [], N: [], M: [], polls: [], pollTimeouts: 0, last: null };
  const drain = async () => {
    const t0 = Date.now();
    const d = await race(page.evaluate(() => window.__Hdrain && window.__Hdrain()).catch(() => null), 6000);
    const ms = Date.now() - t0; D.polls.push({ at: t0 - T0, ms });
    if (d === 'timeout') { D.pollTimeouts++; return null; }
    if (!d) return null;
    for (const it of d.q) (D[it[0]] || (D[it[0]] = [])).push(it.slice(1));
    D.offs = (Date.now() - T0) - d.now; D.last = d; return d;
  };
  const scenes = () => D.S.map(s => s[1] && s[1].scene).filter(Boolean);
  const hasScene = s => D.S.some(x => x[1] && x[1].scene === s);
  const setPhase = async ph => { await race(page.evaluate(p => { window.__H && (window.__H.phase = p); return window.__H ? window.__H.now() : 0; }, ph).catch(() => 0), 4000); };
  const shot = async name => {
    const p = path.join(shotDir, `${g.id}-${ENGINE === 'webkit' ? 'wk-' : ''}${name}.jpg`);
    const b = await race(page.screenshot({ type: 'jpeg', quality: 55, timeout: 12000, scale: 'css' }).catch(() => null), 15000);
    if (b && b !== 'timeout') { await fs.writeFile(p, b); r.shots[name] = path.relative(out, p); return true; }
    r.shots[name] = null; return false;
  };
  const sigs = [];
  const sample = async () => {
    const b = await race(page.screenshot({ type: 'png', timeout: 8000, scale: 'css' }).catch(() => null), 10000);
    if (!b || b === 'timeout') { sigs.push({ at: Date.now() - T0, sig: null }); return null; }
    try { const s = signature(b); sigs.push({ at: Date.now() - T0, sig: s }); return s; } catch { return null; }
  };

  // ---- load ----
  const t0 = Date.now();
  try { await page.goto(urlFor(g, BASE), { waitUntil: 'load', timeout: heavy(g) ? 240000 : 60000 }); loaded = true; }
  catch (e) { r.evidence.loadError = e.message.slice(0, 160); }
  r.loadMs = Date.now() - t0; r.loaded = loaded; r.startUrl = page.url(); r.startPath = r.startUrl.split('#')[0].split('?')[0];
  let bot = null;
  const finish = async () => { await race(ctx.close().catch(() => {}), 15000); };
  if (!loaded) { r.verdicts.push('STALL'); r.evidence.STALL = 'did not load: ' + (r.evidence.loadError || ''); await drain(); summarise(r, D, R, [], null); await finish(); return r; }

  // engine-heavy builds boot for a while after "load"
  const bootDeadline = Date.now() + (heavy(g) ? 180000 : 8000);
  let caps = null;
  while (Date.now() < bootDeadline) {
    caps = await race(page.evaluate(() => window.ArcadeSDK ? ArcadeSDK.debug().caps : null).catch(() => null), 6000);
    if (caps && caps.declared) break;
    await wait(1000);
  }
  if (caps === 'timeout') caps = null;
  r.sdk = !!(caps && caps.declared);
  if (!landscape && await page.locator('#arcade-sdk-rotate').isVisible().catch(() => false)) { await finish(); return checkHealth(g, browser, { ...o, landscape: true }); }
  await drain();

  // ---- calibration: how slow is this machine right now, and does the throttle bite? ----
  const bench = () => page.evaluate(() => { const now = window.__H ? window.__H.now : performance.now.bind(performance), res = []; for (let k = 0; k < 5; k++) { const t = now(); let x = 1; for (let i = 0; i < 2e6; i++) x = (x * 1.0000001 + i) % 1000003; res.push(now() - t); } res.sort((a, b) => a - b); return res[2]; }).catch(() => null);
  await setPhase('calib');   // the benchmark is our own long task: keep it out of the load numbers
  const benchThrottled = await race(bench(), 20000);
  let bench1 = null;
  if (cdp && r.throttled) { await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {}); bench1 = await race(bench(), 20000); await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE }).catch(() => {}); }
  await setPhase('load');
  r.calibration = { benchMs: round(benchThrottled), bench1Ms: round(bench1), effectiveSlowdown: bench1 && typeof benchThrottled === 'number' ? round(benchThrottled / bench1) : null };

  // ---- title screen, then start ----
  await shot('1-title');
  const sig0 = await sample();
  await setPhase('start');
  const startAt = Date.now();
  const meta = g;
  bot = makeBot(page, ctx, { rand, hasPlay: () => hasScene('play'), keyboard: !!(g.controls && g.controls.keyboard), startKey: null });
  bot.onAction = (kind, txt) => { lastBotAction = { at: Date.now(), kind, txt }; };
  const track = async fn => { lastBotAction = { at: Date.now(), kind: 'button' }; return fn(); };
  // drain while starting so the scene events are visible to startGame
  const startPoll = setInterval(() => { drain().catch(() => {}); }, 700);
  let st = { how: '', viaKey: false };
  // Games that report scenes through the SDK are judged by them. Others (no ArcadeSDK.state) count as started when the start
  // button has gone or the screen changed by more than 10% from the title.
  const sdkKnown = () => r.sdk || D.S.length > 0;
  let startedBy = null;
  const startedNow = async s => {
    if (sdkKnown()) { const ok = hasScene(s); if (ok) startedBy = 'sdk'; return ok; }
    if (s !== 'play') return false;
    const sel0 = meta.start && !/^key:|^auto$/.test(meta.start) ? meta.start : null;
    if (sel0 && await race(page.locator(sel0).first().isVisible().catch(() => true), 3000) === false) { startedBy = 'start button gone'; return true; }
    const sg = await sample();
    if (sg && sig0 && sigDiff(sig0, sg) > 0.10) { startedBy = 'screen changed ' + Math.round(sigDiff(sig0, sg) * 100) + '%'; return true; }
    return false;
  };
  try { st = await track(() => bot.startGame(meta, startedNow)); } catch (e) { r.notes.push('start threw: ' + e.message.slice(0, 80)); }
  clearInterval(startPoll);
  await drain();
  r.start = { how: st.how, viaKey: st.viaKey, detectedBy: startedBy };
  const sel = meta.start && !/^key:|^auto$/.test(meta.start) ? meta.start : null;
  if (sel) r.start.buttonStillVisible = await race(page.locator(sel).first().isVisible().catch(() => false), 3000);
  await setPhase('play');
  const playStartWall = Date.now();
  if (cdp) await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
  const m0 = cdp ? await race(cdp.send('Performance.getMetrics').then(x => Object.fromEntries(x.metrics.map(m => [m.name, m.value]))).catch(() => null), 8000) : null;
  const heap0 = cdp ? await race(cdp.send('Runtime.getHeapUsage').catch(() => null), 6000) : null;
  const sigAfterStart = await sample();
  cs.push(contention(120)); cs.push(contention(120));

  // ---- play ----
  const tEnd = playStartWall + DURATION * 1000, actions = [];
  let nextDrain = 0, nextSig = 0, midShot = false;
  while (Date.now() < tEnd && !R.crashed && !R.closed && D.pollTimeouts < 3) {
    const lab = await race(bot.step().catch(e => 'err:' + e.message.slice(0, 30)), 12000, 'step-timeout');
    actions.push(lab === 'step-timeout' ? 'step-timeout' : String(lab).split(':')[0]);
    // left the game page (a link, a redirect)? note it and go back, so the run continues
    if (R.nav.length && !R.crashed) {
      const cur = page.url().split('#')[0].split('?')[0];
      if (cur !== r.startPath) { R.left = (R.left || 0) + 1; r.notes.push('bot navigated away to ' + cur.replace(BASE, '').slice(0, 60) + ' and was sent back'); await race(page.goto(r.startUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}), 25000); if (R.left > 3) break; }
    }
    if (Date.now() >= nextDrain) { await drain(); nextDrain = Date.now() + 1000; }
    if (Date.now() >= nextSig) { await sample(); nextSig = Date.now() + 2500; }
    if (!midShot && Date.now() > playStartWall + DURATION * 500) { midShot = true; cs.push(contention(120)); cs.push(contention(120)); await shot('2-mid'); }
    await wait(120 + rand() * 280);
  }
  await drain();
  // ---- end-of-run measurements ----
  if (cdp && !R.crashed) await race(cdp.send('HeapProfiler.collectGarbage').catch(() => {}), 8000);
  const m1 = cdp && !R.crashed ? await race(cdp.send('Performance.getMetrics').then(x => Object.fromEntries(x.metrics.map(m => [m.name, m.value]))).catch(() => null), 8000) : null;
  const heap1 = cdp && !R.crashed ? await race(cdp.send('Runtime.getHeapUsage').catch(() => null), 6000) : null;
  const canv = R.crashed ? null : await race(page.evaluate(() => window.__H && window.__H.canvasReport()).catch(() => null), 6000);
  const sdkEnd = R.crashed ? null : await race(page.evaluate(() => window.ArcadeSDK ? { paused: ArcadeSDK.paused, dbg: (() => { const d = ArcadeSDK.debug(); return { timers: d.timers, frames: d.frames, audio: d.audio.length, gl: d.gl }; })() } : null).catch(() => null), 6000);
  const bodyText = R.crashed ? '' : await race(page.evaluate(() => (document.body && document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300)).catch(() => ''), 6000);
  await shot('3-end');
  r.machine.load1End = round(os.loadavg()[0], 2);
  cs.push(contention(120)); cs.push(contention(120));
  r.machine.contention = round(median(cs), 2); r.machine.contentionSamples = cs.map(x => round(x, 2));   // median: a single spin can be descheduled

  // ---- judge ----
  summarise(r, D, R, sigs, { m0, m1, heap0, heap1, canv, sdkEnd, bot, actions, sig0, sigAfterStart, playStartWall, T0, hasPlay: hasScene('play'), scenes: scenes(), bodyText, startAt, sdkDeclared: r.sdk });
  await finish();
  return r;
}

// Turn the raw signals into the report row. Pure function of what was measured.
function summarise(r, D, R, sigs, X) {
  const V = (name, ev) => { if (!r.verdicts.includes(name)) r.verdicts.push(name); r.evidence[name] = (r.evidence[name] ? r.evidence[name] + ' | ' : '') + ev; };
  // main thread blocking: longtask (Chromium) and heartbeat lateness (both engines); load phase and play phase apart.
  // Time inside GPU-blocking WebGL calls is taken out (software GL here), and durations are divided by the machine slowdown measured
  // at the time (wall time / CPU time of a spin in the harness), so a loaded machine does not read as a frozen game.
  const c = Math.min(4, Math.max(1, (r.machine && r.machine.contention) || 1));
  const lt = D.L.map(a => ({ t: a[0], d: a[1], ph: a[2], gl: a[3] || 0 })), bt = D.B.map(a => ({ t: a[0], d: a[1], ph: a[2], gl: a[3] || 0 }));
  const probes = (D.P || []).map(a => ({ t: a[0], d: a[1] }));   // the bot's own look at the screen (one evaluate): not the game's cost
  const isProbe = (t, d) => probes.some(p => t + d >= p.t - 5 && t <= p.t + p.d + 60 && d <= p.d * 1.5 + 40);
  const ev = arr => arr.filter(a => !(a.ph !== 'load' && (isProbe(a.t, a.d) || isProbe(a.t - a.d, a.d)))).map(a => ({ ...a, js: Math.max(0, a.d - a.gl), norm: Math.max(0, a.d - a.gl) / c }));
  const LT = ev(lt), BT = ev(bt);
  const worstOf = (arr, ph) => arr.filter(a => ph.includes(a.ph)).reduce((m, a) => (a.norm > (m ? m.norm : -1) ? a : m), null);
  const pick2 = ph => { const a = worstOf(LT, ph), b = worstOf(BT, ph); return !a ? b : !b ? a : (a.norm >= b.norm ? a : b); };
  const wl = pick2(['load']), wp = pick2(['start', 'play']);
  const tbt = ph => LT.filter(a => ph.includes(a.ph)).reduce((s2, a) => s2 + Math.max(0, a.norm - 50), 0);
  const outsideMax = D.polls.filter(p => p.at > 0).reduce((m, p) => Math.max(m, p.ms), 0);
  const cmp = D.last && D.last.compile ? D.last.compile : null;
  r.block = { c: round(c, 2), loadMs: wl ? round(wl.norm, 0) : 0, playMs: wp ? round(wp.norm, 0) : 0, loadRawMs: wl ? round(wl.d, 0) : 0, playRawMs: wp ? round(wp.d, 0) : 0, playGlMs: wp ? round(wp.gl, 0) : 0, loadGlMs: wl ? round(wl.gl, 0) : 0, longTasksPlay: LT.filter(a => a.ph !== 'load').length, longTasks100Play: LT.filter(a => a.ph !== 'load' && a.norm >= 100).length, tbtLoadMs: round(tbt(['load']), 0), tbtPlayMs: round(tbt(['start', 'play']), 0), longtaskApi: !!(D.last && D.last.ltSupported), heartbeatOver100Play: BT.filter(a => a.ph !== 'load' && a.norm >= 100).length, slowestPollMs: outsideMax, pollTimeouts: D.pollTimeouts, shaderCompileMs: cmp ? cmp.ms : null, shaderCompileMaxCallMs: cmp ? cmp.maxCall : null };
  r.loafTop = D.A.sort((a, b) => b[1] - a[1]).slice(0, 3).map(a => ({ ms: a[1], blocking: a[2], scripts: a[3], phase: a[4] }));
  const worst = Math.max(r.block.loadMs, r.block.playMs), worstEv = r.block.loadMs >= r.block.playMs ? wl : wp;
  if (worst > 1500) V('FREEZE', `main thread blocked ${round(worstEv.d, 0)} ms (${r.block.loadMs >= r.block.playMs ? 'during load' : 'while playing'}), ${round(worstEv.gl, 0)} ms of it inside WebGL calls (software GL), machine slowdown x${round(c, 1)} -> about ${round(worst, 0)} ms of JS; ${r.block.longtaskApi ? 'long-task API + timer heartbeat' : 'timer heartbeat (no long-task API in this engine)'}` + (r.loafTop[0] && r.loafTop[0].ms >= 1500 ? `; longest frame ${r.loafTop[0].ms} ms: ${(r.loafTop[0].scripts.map(s => s.join(' ')).join(' / ')) || 'unattributed'}` : ''));
  if (worst > 1500 && worstEv && worstEv.gl > 0.4 * worstEv.d) r.notes.push('software-GL artefact: over 40% of the longest block was inside synchronous WebGL calls (getProgramInfoLog, readPixels, draw...) waiting for this box\'s software GL; an iPhone GPU would not wait');
  if (D.pollTimeouts >= 1) V('FREEZE', `page did not answer the harness for 6 s (${D.pollTimeouts} poll timeout(s))`);
  if (X && X.bot && X.bot.stats.timeouts >= 2 && r.block.playMs >= 500) V('FREEZE', `${X.bot.stats.timeouts} touch inputs not acknowledged within 4 s while the main thread was blocked`);
  else if (X && X.bot && X.bot.stats.timeouts >= 1) r.notes.push(`${X.bot.stats.timeouts} touch input(s) took over 4 s to be acknowledged (machine slowdown x${round(c, 1)})`);
  if (r.block.shaderCompileMaxCallMs > 500) r.notes.push(`one shader compile/link call took ${r.block.shaderCompileMaxCallMs} ms (${r.block.shaderCompileMs} ms in total)`);
  // rAF loop that was running steadily and stopped: a freeze only if the game also errored right then or the screen stopped changing
  const stalls = D.R.map(a => ({ t: a[0], ph: a[1] })), recov = D.r.map(a => ({ t: a[0], d: a[1] }));
  const sceneAt = t => { let sc = null; for (const s of D.S) { if (s[0] <= t) sc = s[1] && s[1].scene || sc; } return sc; };
  const offs = D.offs || 0, endPage = D.last ? D.last.now : 0;
  r.rafStalls = [];
  const realStalls = [];
  for (const s of stalls) {
    const rc = recov.find(x => x.t > s.t), tEndStall = rc ? s.t + rc.d : endPage, sc0 = sceneAt(s.t);
    const errNear = D.E.some(e => e[0] >= s.t - 300 && e[0] <= s.t + 2500 && !/^resource/.test(e[1]));
    const inWin = sigs.filter(x => x.sig && (x.at - offs) >= s.t + 400 && (x.at - offs) <= tEndStall);
    let staticScreen = false; if (inWin.length >= 2) staticScreen = Math.max(...inWin.slice(1).map(x => sigDiff(inWin[0].sig, x.sig))) < 0.003;
    const menu = ['over', 'title'].includes(sc0);
    r.rafStalls.push({ atMs: round(s.t, 0), scene: sc0, seconds: round((tEndStall - s.t) / 1000, 1), recovered: !!rc, errorAtStall: errNear, screenStatic: inWin.length >= 2 ? staticScreen : null, counted: !menu && (errNear || staticScreen) });
    if (!menu && (errNear || staticScreen)) realStalls.push({ s, rc, errNear, staticScreen, dur: tEndStall - s.t });
  }
  if (realStalls.length) { const q = realStalls[0]; V('FREEZE', `game loop (requestAnimationFrame) stopped for ${round(q.dur / 1000, 1)} s while visible in scene ${sceneAt(q.s.t) || 'unknown'}` + (q.rc ? ', then recovered' : ', never recovered') + (q.errNear ? `; an uncaught error was thrown at that moment: ${(D.E.find(e => e[0] >= q.s.t - 300 && e[0] <= q.s.t + 2500) || [0, ''])[1].slice(0, 110)}` : '') + (q.staticScreen ? '; the screen did not change during the stall' : '')); }
  else if (r.rafStalls.length) r.notes.push(`animation loop paused ${r.rafStalls.length}x (over 3 s) but the screen kept changing, so it is not counted (DOM game or idle loop)`);
  if (R.crashed) V('FREEZE', 'page crashed (renderer process died)');
  const home = r.startPath;
  const navs = R.nav.filter(n => n.at > 0 && (n.abs || '').split('#')[0].split('?')[0] === home);
  const reloads = navs.filter(n => !((n.kind === 'button' || n.kind === 'item') && n.afterAction < 3000));
  if (navs.length) r.navigations = navs.slice(0, 5);
  if (reloads.length) V('FREEZE', `page reloaded ${reloads.length}x without a button press (${reloads[0].url.slice(0, 60)}; last input was ${reloads[0].kind || 'none'} ${reloads[0].afterAction} ms earlier)`);
  else if (navs.length) r.notes.push(`page reloaded ${navs.length}x right after a button press (the game's own restart): ${navs[0].txt.slice(0, 30)}`);
  // WebGL lost
  const lost = D.X.filter(a => a[1] === 'lost');
  if (lost.length) V('FREEZE', `WebGL context lost ${lost.length}x (iOS does this under memory pressure; the game must recover)`), r.webglLost = lost.length;

  // frames
  const fr = D.F.map(a => ({ ts: a[0], gap: a[1], cost: a[2], gl: a[3], n: a[4], ph: a[5] })).filter(f => f.ph !== 'load');
  const jsRaw = fr.map(f => Math.max(0, f.cost - f.gl)), js = jsRaw.map(x => x / c), raw = fr.map(f => f.cost), gaps = fr.map(f => f.gap).filter(x => x > 0 && x < 3000);
  r.frames = { n: fr.length, jsMedian: round(median(js), 2), jsP95: round(pct(js, 95), 2), jsP99: round(pct(js, 99), 2), jsMax: round(js.length ? Math.max(...js) : null), jsP95Raw: round(pct(jsRaw, 95), 2), rawWithGlP95: round(pct(raw, 95), 2), glP95: round(pct(fr.map(f => f.gl), 95), 2), gapP95: round(pct(gaps, 95), 1), gapMedian: round(median(gaps), 1), over100: js.filter(x => x > 100).length };
  const limit = r.throttled ? 16 : 33;
  r.frames.limit = limit;
  if (fr.length >= 30 && r.frames.jsP95 > limit) V('JANK', `p95 JS frame cost ${r.frames.jsP95} ms over ${limit} ms (${r.throttled ? 'CPU throttled x' + r.throttle : 'unthrottled'}, divided by machine slowdown x${round(c, 1)}; raw p95 ${r.frames.jsP95Raw}, median ${r.frames.jsMedian}, p99 ${r.frames.jsP99}, max ${r.frames.jsMax}; time inside WebGL calls excluded, p95 of it ${r.frames.glP95})`);
  else if (fr.length < 30 && r.block.longTasks100Play >= 3) V('JANK', `${r.block.longTasks100Play} long tasks of 100 ms or more while playing (no rAF loop to measure)`);

  // errors
  const uniq = [...new Set(R.errors.map(e => e.msg))];
  r.errors = uniq.slice(0, 5); r.errorCount = R.errors.length; r.consoleErrors = [...new Set(R.consoleErrors)].slice(0, 3); r.failed = [...new Set(R.failed)].slice(0, 4);
  if (R.errors.length) V('ERRORS', `${R.errors.length} uncaught page error(s): ${uniq[0].slice(0, 120)}`);

  if (!X) { r.severity = severity(r); return; }

  // resources and the leak signal
  const samples = D.M.map(a => a[0]);
  const heapMB = h => h && h.usedSize != null ? h.usedSize / 1048576 : null;
  const h0 = heapMB(X.heap0), h1 = heapMB(X.heap1);
  const nodes = samples.map(s => s.nodes).filter(Boolean);
  r.resources = { heap0MB: round(h0), heap1MB: round(h1), heapGrowthPct: h0 && h1 ? round((h1 / h0 - 1) * 100, 0) : null, heapMeasured: h0 != null, nodesStart: nodes[0] || null, nodesEnd: nodes[nodes.length - 1] || null, nodesMax: nodes.length ? Math.max(...nodes) : null, listeners0: X.m0 ? X.m0.JSEventListeners : null, listeners1: X.m1 ? X.m1.JSEventListeners : null, audioContexts: D.last ? D.last.counts.ac : null, audioElements: D.last ? D.last.counts.audioEl : null, webglContexts: D.last ? D.last.counts.gl : null, canvases: X.canv || null, sdkTimers: X.sdkEnd && X.sdkEnd.dbg ? X.sdkEnd.dbg.timers : null };
  if (X.m0 && X.m1) { const dt = X.m1.Timestamp - X.m0.Timestamp; r.cpu = { mainThreadBusyPct: dt > 0 ? round((X.m1.TaskDuration - X.m0.TaskDuration) / dt * 100, 0) : null, scriptPct: dt > 0 ? round((X.m1.ScriptDuration - X.m0.ScriptDuration) / dt * 100, 0) : null, layoutPerSec: dt > 0 ? round((X.m1.LayoutCount - X.m0.LayoutCount) / dt, 1) : null }; }
  if (h0 != null && h1 != null && h1 / h0 > 1.6 && h1 - h0 > 8) V('LEAK', `JS heap ${round(h0)} -> ${round(h1)} MB after forced GC (+${round((h1 / h0 - 1) * 100, 0)}%) over ${r.durationS} s`);
  const n0 = r.resources.nodesStart, n1 = r.resources.nodesEnd;
  if (n0 && n1 && n1 > n0 * 3 && n1 - n0 > 2000) V('LEAK', `DOM nodes ${n0} -> ${n1}`);
  const l0 = r.resources.listeners0, l1 = r.resources.listeners1;
  if (l0 && l1 && l1 > l0 * 2.5 && l1 - l0 > 1500) V('LEAK', `event listeners ${l0} -> ${l1}`);
  // iPhone memory risks (not verdicts on their own, but the reason a game reloads on Safari)
  const risks = [];
  const cv = X.canv;
  if (cv) {
    if (cv.totalMB > 224) risks.push(`canvas memory ${cv.totalMB} MB (iOS Safari limit is about 224 to 384 MB in total)`);
    if (cv.tooBig) risks.push(`${cv.tooBig} canvas over 16.7 megapixels (iOS refuses larger than 4096x4096)`);
    if (cv.biggest && cv.biggest[0] && cv.biggest[0].mpx > 8) risks.push(`largest canvas ${cv.biggest[0].w}x${cv.biggest[0].h} = ${cv.biggest[0].mpx} Mpx at device pixel ratio ${cv.dpr}`);
  }
  if (r.resources.audioContexts > 4) risks.push(`${r.resources.audioContexts} AudioContexts created (Safari allows very few; sounds go silent or the tab dies)`);
  if (r.resources.audioElements > 24) risks.push(`${r.resources.audioElements} Audio elements created`);
  if (r.resources.webglContexts > 3) risks.push(`${r.resources.webglContexts} WebGL contexts created (iOS loses the oldest above ~8)`);
  if (r.resources.sdkTimers > 200) risks.push(`${r.resources.sdkTimers} timers alive`);
  r.risks = risks;
  if (risks.length && !r.verdicts.length) r.notes.push('memory risks: ' + risks.join('; '));

  // stalls
  const scenes = X.scenes, hasPlay = X.hasPlay, over = scenes.filter(s => s === 'over').length;
  r.sdkDeclared = X.sdkDeclared || D.S.length > 0;
  r.scenes = { sequence: collapse(scenes).slice(0, 24), reachedPlay: hasPlay, gameOvers: over };
  let restarts = 0; for (let i = 1; i < scenes.length; i++) if (scenes[i] === 'play' && scenes[i - 1] === 'over') restarts++;
  r.scenes.restartsAfterOver = restarts;
  const sc = D.S.filter(s => s[1] && typeof s[1].score === 'number');
  if (sc.length) { const v = sc.map(s => s[1].score); r.gameScore = { updates: sc.length, first: v[0], last: v[v.length - 1], max: Math.max(...v), trajectory: thin(sc.map(s => [round(s[0] / 1000, 0), s[1].score]), 10) }; }
  if (X.bot) r.bot = { taps: X.bot.stats.taps, swipes: X.bot.stats.swipes, holds: X.bot.stats.holds, keys: X.bot.stats.keys, buttonPresses: X.bot.stats.buttons, resumes: X.bot.stats.resumes, touchApi: X.bot.stats.touchApi, inputLatencyMedianMs: median(X.bot.stats.lat), inputLatencyP95Ms: pct(X.bot.stats.lat, 95), inputLatencyMaxMs: X.bot.stats.lat.length ? Math.max(...X.bot.stats.lat) : null, inputTimeouts: X.bot.stats.timeouts };
  // screen change: longest stretch in play with no visible change
  const play0 = X.playStartWall - X.T0, ps = sigs.filter(s => s.at >= play0 - 100 && s.sig);
  let longestStatic = 0, curStart = null, prev = null;
  for (const s of ps) { if (prev && sigDiff(prev.sig, s.sig) < 0.003) { if (curStart == null) curStart = prev.at; longestStatic = Math.max(longestStatic, s.at - curStart); } else curStart = null; prev = s; }
  const changeAfterStart = X.sig0 && X.sigAfterStart ? sigDiff(X.sig0, X.sigAfterStart) : null;
  const anyChange = ps.length > 1 ? Math.max(...ps.slice(1).map(s => sigDiff(ps[0].sig, s.sig))) : null;
  r.screen = { longestStaticS: round(longestStatic / 1000, 1), changeTitleToPlayPct: changeAfterStart == null ? null : round(changeAfterStart * 100, 1), maxChangeFromStartPct: anyChange == null ? null : round(anyChange * 100, 1), samples: ps.length };
  const startMsg = `start: ${r.start.how}`;
  if (r.sdkDeclared && !hasPlay) V('STALL', `game never reported play after the start attempts (${startMsg}); scenes seen: ${collapse(scenes).join('>') || 'none'}`);
  else if (r.start.viaKey) V('STALL', `started only with a keyboard key (${r.start.how}); a phone has no keyboard`);
  if (!r.sdkDeclared && (changeAfterStart || 0) < 0.03 && ((anyChange != null && anyChange < 0.02) || r.start.buttonStillVisible === true)) V('STALL', `game reports no scenes; after the start attempts (${startMsg}) ` + (r.start.buttonStillVisible === true ? 'the start button is still showing and ' : '') + `the screen changed only ${changeAfterStart == null ? '?' : round(changeAfterStart * 100, 1)}% from the title`);
  if (longestStatic >= 20000) V('STALL', `nothing on screen changed for ${round(longestStatic / 1000, 0)} s while the bot kept tapping`);
  if (over > 0 && restarts === 0) {
    const lastOverT = [...D.S].reverse().find(s => s[1] && s[1].scene === 'over');
    const tEndPage = D.last ? D.last.now : 0;
    if (lastOverT && tEndPage - lastOverT[0] > 12000) V('STALL', `game over screen reached ${over}x and the game never got back to play (bot pressed buttons for ${round((tEndPage - lastOverT[0]) / 1000, 0)} s)`);
  }
  if (!r.sdkDeclared) r.notes.push('game does not call ArcadeSDK.state(), so scenes and score could not be read');
  if (!r.throttled) r.notes.push(ENGINE === 'webkit' ? 'WebKit has no CPU throttle: numbers are unthrottled on this machine' : 'unthrottled run');
  r.severity = severity(r);
}

const collapse = a => a.filter((x, i) => x !== a[i - 1]);
const thin = (a, n) => a.length <= n ? a : Array.from({ length: n }, (_, i) => a[Math.floor(i * (a.length - 1) / (n - 1))]);
export function severity(r) {
  const w = { FREEZE: 100, STALL: 80, JANK: 40, LEAK: 30, ERRORS: 20 };
  let s = r.verdicts.reduce((m, v) => Math.max(m, w[v] || 0), 0);
  s += r.verdicts.length * 2;
  s += Math.min(10, ((r.block && Math.max(r.block.loadMs || 0, r.block.playMs || 0)) || 0) / 1000);
  s += Math.min(5, (r.errorCount || 0) / 5);
  s += (r.risks && r.risks.length ? 3 : 0);
  return +s.toFixed(1);
}

/* Injected before any page script (page.addInitScript). Records what a phone player would feel:
 *   - long tasks (Chromium PerformanceObserver) and a timer heartbeat (all engines: a timer that fires late = blocked main thread)
 *   - long-animation-frame attribution (Chromium): which script blocked
 *   - requestAnimationFrame: JS cost per frame (sum of all callbacks in the frame, minus time spent inside blocking WebGL calls), gap between frames
 *   - rAF loop stopped (no frame for 3 s while visible and not paused, after the loop had been running)
 *   - visibilitychange / pagehide / freeze, webglcontextlost / restored, uncaught errors, unhandled rejections
 *   - the SDK's ArcadeSDK.state() calls (scene + score trajectory) and ArcadeSDK.event()
 *   - resource counts: DOM nodes, AudioContexts, <audio>/Audio elements, canvases and their memory, WebGL contexts, JS heap (Chromium)
 * Everything is queued in window.__H.q and drained by the harness once a second (window.__Hdrain()).
 * Uses its own captured clock and timers: the arcade SDK later replaces performance.now / setTimeout to make pause work.
 */
(() => {
  if (window.__H) return;
  const now = performance.now.bind(performance), rST = window.setTimeout.bind(window), rCT = window.clearTimeout.bind(window);
  const H = window.__H = { phase: 'load', q: [], lastRaf: 0, rafSeen: 0, ac: 0, audioEl: 0, glCtx: 0, ctx2d: 0, offscreen: 0, canvases: [], stalled: false, ltSupported: false, loafSupported: false, t0: now() };
  const push = (...a) => { if (H.q.length < 20000) H.q.push(a); };
  H.push = push; H.now = now;
  const paused = () => { try { return !!(window.ArcadeSDK && window.ArcadeSDK.paused); } catch (e) { return false; } };

  // ---- heartbeat: a 100 ms timer; lateness = the main thread was busy. Time spent inside GPU-blocking WebGL calls is recorded
  // beside it, because software GL on this machine makes those calls block for ages where an iPhone's GPU would not. ----
  let glAcc = 0, cmpAcc = 0, cmpMax = 0;
  const tl = [];   // [time, glAcc] every beat, to find how much of a long task was spent inside GL calls
  const glAt = t => { let lo = 0, hi = tl.length - 1, r = 0; while (lo <= hi) { const m = (lo + hi) >> 1; if (tl[m][0] <= t) { r = tl[m][1]; lo = m + 1; } else hi = m - 1; } return r; };
  const glNext = t => { let lo = 0, hi = tl.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (tl[m][0] >= t) { r = m; hi = m - 1; } else lo = m + 1; } return r < 0 ? glAcc : tl[r][1]; };
  H.gl = () => glAcc; H.compile = () => ({ ms: +cmpAcc.toFixed(1), maxCall: +cmpMax.toFixed(1) });
  let last = now(), lastGl = 0;
  const ft = [];   // times of the last 80 frames: a loop that had been running (20+ frames in the 2.5 s before it stopped) counts as a loop
  const beat = () => {
    const t = now(), late = t - last - 100; last = t;
    const gd = glAcc - lastGl; lastGl = glAcc;
    if (tl.length < 6000) tl.push([t, glAcc]);
    if (late > 40) push('B', +t.toFixed(1), +late.toFixed(1), H.phase, +Math.min(gd, late + 100).toFixed(1));
    // rAF loop that was running steadily (30+ frames in a row under 100 ms apart) has stopped?
    const vis = document.visibilityState === 'visible';
    if (H.rafSeen > 30 && vis && !paused() && ft.filter(x => x >= H.lastRaf - 2500).length >= 20) {
      const idle = t - H.lastRaf;
      if (idle > 3000 && !H.stalled) { H.stalled = true; H.stallT = H.lastRaf; push('R', +H.lastRaf.toFixed(1), H.phase); }
    }
    rST(beat, 100);
  };
  rST(beat, 100);
  // ---- long tasks / long animation frames ----
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) { const gl = Math.max(0, Math.min(e.duration, glNext(e.startTime + e.duration) - glAt(e.startTime))); push('L', +e.startTime.toFixed(1), +e.duration.toFixed(1), H.phase, +gl.toFixed(1)); } }).observe({ type: 'longtask', buffered: true }); H.ltSupported = !!(PerformanceObserver.supportedEntryTypes && PerformanceObserver.supportedEntryTypes.indexOf('longtask') >= 0); } catch (e) {}
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) { if (e.duration < 120) continue; push('A', +e.startTime.toFixed(1), +e.duration.toFixed(1), +(e.blockingDuration || 0).toFixed(1), (e.scripts || []).slice(0, 3).map(s => [String(s.sourceURL || '').split('/').slice(-2).join('/'), s.sourceFunctionName || s.invoker || '', +s.duration.toFixed(0)]), H.phase); } }).observe({ type: 'long-animation-frame', buffered: true }); H.loafSupported = !!(PerformanceObserver.supportedEntryTypes && PerformanceObserver.supportedEntryTypes.indexOf('long-animation-frame') >= 0); } catch (e) {}

  // ---- rAF cost and gaps ----
  const rRAF = window.requestAnimationFrame.bind(window);
  let curTs = -1, curCost = 0, curGl = 0, prevTs = -1, cbs = 0, lastFrameTs = -1;
  const flush = () => { if (curTs >= 0) { push('F', +curTs.toFixed(1), prevTs >= 0 ? +(curTs - prevTs).toFixed(1) : 0, +curCost.toFixed(2), +curGl.toFixed(2), cbs, H.phase); prevTs = curTs; curTs = -1; curCost = 0; curGl = 0; cbs = 0; } };
  H.flush = flush;
  window.requestAnimationFrame = function (cb) {
    return rRAF(function (ts) {
      const t0 = now(), g0 = glAcc;
      if (ts == null) ts = t0;
      if (ts !== curTs) { flush(); curTs = ts; lastFrameTs = ts; ft.push(t0); if (ft.length > 80) ft.shift(); }
      if (H.stalled) { H.stalled = false; push('r', +t0.toFixed(1), +(t0 - H.stallT).toFixed(1)); }
      H.lastRaf = t0; H.rafSeen++;
      try { return cb.apply(this, arguments); }
      finally { const t1 = now(); curCost += t1 - t0; curGl += glAcc - g0; cbs++; }
    });
  };

  // ---- WebGL: count contexts, time the calls that block on the GPU process (software GL makes them meaningless on this machine) ----
  const BLOCKING = ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements', 'flush', 'finish', 'readPixels', 'getError', 'texImage2D', 'texSubImage2D', 'texStorage2D', 'compressedTexImage2D', 'bufferData', 'bufferSubData', 'checkFramebufferStatus', 'generateMipmap', 'clear', 'getParameter', 'readBuffer', 'blitFramebuffer', 'texImage3D', 'texSubImage3D', 'getProgramInfoLog', 'getShaderInfoLog', 'getShaderParameter', 'getProgramParameter', 'getUniform', 'getActiveUniform', 'getActiveAttrib', 'getSyncParameter', 'clientWaitSync'];
  const COMPILE = ['compileShader', 'linkProgram'];   // CPU work on a phone too: counted as JS, reported separately
  for (const name of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
    const P = window[name] && window[name].prototype; if (!P) continue;
    for (const m of BLOCKING) {
      const o = P[m]; if (typeof o !== 'function') continue;
      try { Object.defineProperty(P, m, { configurable: true, writable: true, value: function () { const t = now(); try { return o.apply(this, arguments); } finally { glAcc += now() - t; } } }); } catch (e) {}
    }
    for (const m of COMPILE) {
      const o = P[m]; if (typeof o !== 'function') continue;
      try { Object.defineProperty(P, m, { configurable: true, writable: true, value: function () { const t = now(); try { return o.apply(this, arguments); } finally { const d = now() - t; cmpAcc += d; if (d > cmpMax) cmpMax = d; } } }); } catch (e) {}
    }
  }
  const CP = window.HTMLCanvasElement && HTMLCanvasElement.prototype;
  if (CP && CP.getContext) {
    const gc = CP.getContext;
    CP.getContext = function (type) { const r = gc.apply(this, arguments); try { if (r) { if (/webgl/i.test(type)) H.glCtx++; else if (type === '2d') H.ctx2d++; H.canvases.push(new WeakRef(this)); } } catch (e) {} return r; };
  }
  const ce = Document.prototype.createElement;
  Document.prototype.createElement = function (tag) { const el = ce.apply(this, arguments); try { if (String(tag).toLowerCase() === 'canvas') H.canvases.push(new WeakRef(el)); } catch (e) {} return el; };
  window.addEventListener('webglcontextlost', e => push('X', +now().toFixed(1), 'lost', H.phase), true);
  window.addEventListener('webglcontextrestored', e => push('X', +now().toFixed(1), 'restored', H.phase), true);

  // ---- audio: count the graphs and elements a game makes ----
  for (const n of ['AudioContext', 'webkitAudioContext', 'OfflineAudioContext']) {
    const O = window[n]; if (!O) continue;
    try { window[n] = new Proxy(O, { construct(t, a, nt) { H.ac++; return Reflect.construct(t, a, nt); } }); } catch (e) {}
  }
  if (window.Audio) { try { window.Audio = new Proxy(window.Audio, { construct(t, a, nt) { H.audioEl++; return Reflect.construct(t, a, nt); } }); } catch (e) {} }
  if (window.OffscreenCanvas) { try { window.OffscreenCanvas = new Proxy(window.OffscreenCanvas, { construct(t, a, nt) { H.offscreen++; return Reflect.construct(t, a, nt); } }); } catch (e) {} }

  // ---- lifecycle and errors ----
  document.addEventListener('visibilitychange', () => push('V', +now().toFixed(1), document.visibilityState));
  for (const ev of ['pagehide', 'pageshow', 'freeze', 'resume']) window.addEventListener(ev, () => push('V', +now().toFixed(1), ev), true);
  window.addEventListener('error', e => { if (e.target && e.target !== window) { push('E', +now().toFixed(1), 'resource: ' + (e.target.src || e.target.href || e.target.tagName), H.phase); return; } push('E', +now().toFixed(1), String(e.message || 'error').slice(0, 200) + (e.filename ? ' @' + String(e.filename).split('/').slice(-2).join('/') + ':' + e.lineno : ''), H.phase); }, true);
  window.addEventListener('unhandledrejection', e => push('E', +now().toFixed(1), 'rejection: ' + String(e.reason && (e.reason.message || e.reason)).slice(0, 200), H.phase));

  // ---- the arcade SDK: capture scene and score as the game reports them ----
  let sdk;
  Object.defineProperty(window, 'ArcadeSDK', {
    configurable: true, enumerable: true,
    get() { return sdk; },
    set(v) {
      sdk = v;
      try {
        const st = v.state, ev = v.event;
        v.state = function (s) { try { push('S', +now().toFixed(1), s ? JSON.parse(JSON.stringify(s)) : {}, H.phase); } catch (e) {} return st.apply(this, arguments); };
        v.event = function (n, d) { try { push('N', +now().toFixed(1), String(n), d == null ? null : JSON.parse(JSON.stringify(d))); } catch (e) {} return ev.apply(this, arguments); };
      } catch (e) {}
    }
  });

  // ---- periodic resource sample (2 s) ----
  const sample = () => {
    try {
      const s = { t: +now().toFixed(0), nodes: document.getElementsByTagName('*').length, ac: H.ac, audioEl: H.audioEl, gl: H.glCtx };
      if (performance.memory) s.heap = performance.memory.usedJSHeapSize;
      const d = window.ArcadeSDK && window.ArcadeSDK.debug ? window.ArcadeSDK.debug() : null;
      if (d) { s.timers = d.timers; s.frames = d.frames; s.paused = d.paused; }
      push('M', s);
    } catch (e) {}
    rST(sample, 2000);
  };
  rST(sample, 2000);

  // ---- canvases alive right now: size and memory (iOS Safari: 16.7 Mpx per canvas, ~384 MB in total on newer iOS, 224 MB on older) ----
  H.canvasReport = () => {
    const out = []; let total = 0;
    const seen = new Set();
    const add = (c, inDom) => {
      if (!c || seen.has(c)) return; seen.add(c);
      const w = c.width | 0, h = c.height | 0, px = w * h; total += px * 4;
      out.push({ w, h, mpx: +(px / 1e6).toFixed(2), dom: inDom, css: inDom ? [Math.round(c.getBoundingClientRect().width), Math.round(c.getBoundingClientRect().height)] : null });
    };
    document.querySelectorAll('canvas').forEach(c => add(c, true));
    for (const r of H.canvases) { const c = r.deref(); if (c) add(c, document.contains(c)); }
    out.sort((a, b) => b.mpx - a.mpx);
    return { n: out.length, totalMB: +(total / 1048576).toFixed(1), biggest: out.slice(0, 4), tooBig: out.filter(c => c.w * c.h > 16777216).length, dpr: window.devicePixelRatio };
  };

  // ---- drain: called by the harness ----
  window.__Hdrain = () => { H.flush(); const q = H.q; H.q = []; return { q, phase: H.phase, lastRaf: H.lastRaf, now: now(), vis: document.visibilityState, paused: paused(), compile: H.compile(), gl: H.gl(), counts: { ac: H.ac, audioEl: H.audioEl, gl: H.glCtx, ctx2d: H.ctx2d, offscreen: H.offscreen }, ltSupported: H.ltSupported, loafSupported: H.loafSupported }; };
})();

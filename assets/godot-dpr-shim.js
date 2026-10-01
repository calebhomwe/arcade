/* godot-dpr-shim.js: make Godot 4 web builds far more likely to survive on a phone.
 *
 * Loaded by tools/inject_sdk.py in <head> of every Godot export, BEFORE godot.js (so it can change what the engine sees).
 * Plain JS, no dependencies, every piece wrapped so a failure here can never stop the game from starting.
 *
 * 1. Pixel budget. Godot sizes its canvas as innerWidth * devicePixelRatio, so a phone at DPR 3 gets a 1170x1992 (2.3 MP)
 *    canvas, which is the main reason these builds are heavy on iPhone. On touch devices this file makes
 *    window.devicePixelRatio return a smaller number so the canvas stays inside a budget:
 *      phone   1.2 MP  (390x844 phone: DPR 1.91, canvas about 745x1612 max)
 *      tablet  4.2 MP  (short screen side >= 600 css px; an iPad at DPR 2 is 3.5 to 4 MP, so it is left alone)
 *      desktop untouched (a mouse-and-keyboard machine at DPR 1, 1.5, 2, 3 ... gets exactly what the browser reports)
 *    The real value is read lazily on every call (the engine asks every frame). Reading it once at document start was tried
 *    and is wrong in WebKit (it once returned 1.19). The budget is worked out from the SCREEN size (the biggest the
 *    page can ever be), not from the current window, so the DPR does not wobble when Safari's toolbar slides in and out
 *    and the engine is not asked to rebuild its framebuffers each time.
 *    If the previous load of this game died (see 3) the budget drops one tier (0.8 MP, then 0.5 MP) for a day.
 *
 * 2. Loading screen. The stock Godot shell shows the Godot logo and an unlabelled bar. This adds the game's name, a percent,
 *    a "starting" message for the quiet seconds after the download (compiling the engine), a slow-connection hint and,
 *    if the engine reports an error, a plain message with a Reload button. It reads the stock #status / #status-progress
 *    elements, so it works with any Godot 4 HTML shell that keeps those ids, and does nothing if they are missing.
 *
 * 3. Crash notices. If the browser throws the graphics context away (webglcontextlost), or the wasm runtime aborts (out of
 *    memory), a full-screen message with a Reload button replaces Godot's blocking alert(). If the previous load of this game
 *    ended without a pagehide (the tab was reloaded by the browser, or crashed), a short notice says so and the lower tier
 *    above is used. That breadcrumb lives in sessionStorage and is a heuristic: whether iOS keeps it across a memory kill
 *    has not been verified on a device.
 *
 * Testing: add query parameters to the game's URL (or to play.html, same origin), no rebuild needed.
 *   ?dpr=1.5        force the DPR the engine sees to exactly 1.5 (any device)
 *   ?dpr=native     switch the cap off: the engine sees the browser's real DPR
 *   ?dprmp=0.8      change the phone/tablet budget, in megapixels
 *   ?dprmode=phone  pretend to be a phone / tablet / desktop (to try the cap on a desktop browser)
 * Inspect: window.__gdShim  (raw, eff(), cls, budgetMP, capped, died, lost, phase, ...)
 */
(function () {
  'use strict';
  var W = window, D = document, VERSION = 3;
  if (W.__gdShim) return;
  var S = W.__gdShim = { version: VERSION, cls: 'desktop', budgetMP: 0, tier: 0, died: false, lost: false, aborted: false, phase: 'boot', override: null };
  function safe(fn) { try { return fn(); } catch (e) { return undefined; } }

  // ---------------------------------------------------------------- options
  var Q = {};
  safe(function () {
    var srcs = [W.location.search];
    try { if (W.parent && W.parent !== W) srcs.push(W.parent.location.search); } catch (e) { /* cross-origin parent */ }
    srcs.forEach(function (s) { new URLSearchParams(s).forEach(function (v, k) { if (!(k in Q)) Q[k] = v; }); });
  });
  var forced = null;                                         // number, 'native' or null
  if (Q.dpr) {
    if (/^(native|raw|off|none|0)$/i.test(Q.dpr)) forced = 'native';
    else { var f = parseFloat(Q.dpr); if (f > 0.25 && f < 8) forced = f; }
  }
  S.override = forced;

  // ---------------------------------------------------------------- crash breadcrumb (sessionStorage, per game path)
  var KEY = 'arcade_gd_alive:' + safe(function () { return W.location.pathname; });
  var TIER_KEY = 'arcade_gd_tier';
  var TIER_MS = 24 * 3600 * 1000;
  var BUDGETS = { phone: [1.2e6, 0.8e6, 0.5e6], tablet: [4.2e6, 2.4e6, 1.2e6] };
  function readTier() {
    var v = safe(function () { return JSON.parse(W.localStorage.getItem(TIER_KEY)); });
    if (v && typeof v.n === 'number' && Date.now() - v.t < TIER_MS) return Math.max(0, Math.min(2, v.n | 0));
    return 0;
  }
  function bumpTier() {
    var n = Math.min(2, readTier() + 1);
    safe(function () { W.localStorage.setItem(TIER_KEY, JSON.stringify({ n: n, t: Date.now() })); });
    return n;
  }
  safe(function () { S.died = W.sessionStorage.getItem(KEY) === '1'; });
  function alive() { safe(function () { W.sessionStorage.setItem(KEY, '1'); }); }
  alive();
  W.addEventListener('pageshow', alive);
  W.addEventListener('pagehide', function () { safe(function () { W.sessionStorage.removeItem(KEY); }); });

  // ---------------------------------------------------------------- device class
  function mm(q) { return !!safe(function () { return W.matchMedia(q).matches; }); }
  function detect() {
    if (Q.dprmode === 'phone' || Q.dprmode === 'tablet' || Q.dprmode === 'desktop') return Q.dprmode;
    var touch = safe(function () { return W.navigator.maxTouchPoints > 0 || 'ontouchstart' in W; });
    var coarse = mm('(pointer: coarse)') || (touch && mm('(hover: none)'));
    if (!coarse) return 'desktop';
    var sw = safe(function () { return W.screen.width; }) || 0, sh = safe(function () { return W.screen.height; }) || 0;
    var shortSide = Math.min(sw || 9999, sh || 9999);
    return shortSide < 600 ? 'phone' : 'tablet';
  }
  S.cls = detect();
  S.tier = S.died && S.cls !== 'desktop' ? bumpTier() : readTier();
  function budget() {
    var mp = parseFloat(Q.dprmp);
    if (mp > 0.05 && mp < 30) return mp * 1e6;
    var list = BUDGETS[S.cls];
    return list ? list[S.tier] : 0;
  }
  S.budgetMP = budget() / 1e6;

  // ---------------------------------------------------------------- devicePixelRatio
  var desc = safe(function () { return Object.getOwnPropertyDescriptor(W, 'devicePixelRatio'); });
  var origGet = desc && desc.get;
  function raw() { var r = origGet ? origGet.call(W) : desc && desc.value; return r > 0 ? r : 1; }
  var memo = { k: '', v: 1 };
  function eff() {
    var r = raw();
    if (forced === 'native') return r;
    if (typeof forced === 'number') return forced;
    if (S.cls === 'desktop') return r;
    var b = budget();
    if (!(b > 0)) return r;
    var iw = W.innerWidth || 0, ih = W.innerHeight || 0;
    var sw = safe(function () { return W.screen.width; }) || 0, sh = safe(function () { return W.screen.height; }) || 0;
    var k = r + '|' + iw + '|' + ih + '|' + sw + '|' + sh + '|' + b;
    if (memo.k === k) return memo.v;
    var area = Math.max(iw * ih, sw * sh);                  // the biggest the drawing area can get (toolbars away)
    var v = r;
    if (area > 0) { var maxD = Math.floor(Math.sqrt(b / area) * 100) / 100; v = Math.min(r, Math.max(1, maxD)); }
    memo.k = k; memo.v = v;
    return v;
  }
  S.raw = raw; S.eff = eff;
  S.capped = function () { return eff() < raw() - 0.001; };
  if (origGet) {
    safe(function () {
      Object.defineProperty(W, 'devicePixelRatio', {
        configurable: true, enumerable: desc.enumerable,
        get: function () { return eff(); },
        set: function (v) { Object.defineProperty(W, 'devicePixelRatio', { value: v, writable: true, configurable: true, enumerable: true }); }   // [Replaceable], as in browsers
      });
    });
  }

  // ---------------------------------------------------------------- DOM part: styles, loading screen, notices
  function ready(fn) { if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn); else fn(); }
  var CSS = [
    // Godot rounds the canvas CSS size down (floor(width / dpr)); at a fractional DPR that can leave a 1px black edge. Fill the window instead.
    'html.gd-capped #canvas{position:fixed!important;left:0;top:0;width:100%!important;height:100%!important}',
    '#gd-shim,#gd-alert,#gd-toast{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#fff;-webkit-text-size-adjust:100%;text-size-adjust:100%;-webkit-user-select:none;user-select:none}',
    '#gd-shim{position:fixed;left:0;right:0;top:0;bottom:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 20px;padding-bottom:max(24px,env(safe-area-inset-bottom));text-align:center;pointer-events:none;transition:opacity .35s}',
    '#gd-shim.gd-out{opacity:0}',
    '#gd-shim .gd-title{font-size:26px;font-weight:700;line-height:1.2;letter-spacing:.01em;margin:0 0 28px;max-width:22em;text-shadow:0 2px 12px rgba(0,0,0,.5)}',
    '#gd-shim .gd-bar{width:min(320px,74vw);height:8px;border-radius:4px;background:rgba(255,255,255,.16);overflow:hidden}',
    '#gd-shim .gd-bar i{display:block;height:100%;width:0;border-radius:4px;background:#ffcf4d;transition:width .25s ease-out}',
    '#gd-shim .gd-bar.gd-ind i{width:38%;animation:gd-slide 1.3s ease-in-out infinite}',
    '#gd-shim .gd-msg{font-size:17px;font-weight:600;margin:14px 0 4px;min-height:1.3em}',
    '#gd-shim .gd-hint{font-size:14px;line-height:1.4;opacity:.72;max-width:22em;min-height:2.8em;margin:2px 0 0}',
    '#gd-shim .gd-reload{pointer-events:auto;margin-top:14px}',
    '@keyframes gd-slide{0%{margin-left:-38%}100%{margin-left:100%}}',
    '@media (prefers-reduced-motion:reduce){#gd-shim .gd-bar.gd-ind i{animation:none;width:100%;opacity:.5}#gd-shim,#gd-shim .gd-bar i{transition:none}}',
    '#gd-alert{position:fixed;left:0;right:0;top:0;bottom:0;z-index:2147483600;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 24px;text-align:center;background:rgba(10,12,20,.94)}',
    '#gd-alert h2{font-size:22px;margin:0 0 10px;font-weight:700}',
    '#gd-alert p{font-size:16px;line-height:1.45;max-width:24em;margin:0 0 22px;opacity:.9}',
    '.gd-btn[hidden]{display:none}',
    '.gd-btn{font:inherit;font-size:17px;font-weight:700;min-height:48px;min-width:160px;padding:0 26px;border:0;border-radius:24px;background:#ffcf4d;color:#1a1a1a;touch-action:manipulation;cursor:pointer}',
    '#gd-toast{position:fixed;left:50%;transform:translateX(-50%);top:max(12px,env(safe-area-inset-top));z-index:2147483500;max-width:min(92vw,26em);padding:12px 16px;border-radius:12px;background:rgba(20,22,32,.94);font-size:14px;line-height:1.4;text-align:center;box-shadow:0 4px 18px rgba(0,0,0,.4)}'
  ].join('\n');
  var title = '';
  var els = {};
  function build() {
    var st = D.createElement('style'); st.id = 'gd-shim-css'; st.textContent = CSS; (D.head || D.documentElement).appendChild(st);
    title = (D.title || 'Loading').replace(/\s+/g, ' ').trim();
    var box = D.createElement('div'); box.id = 'gd-shim'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
    box.innerHTML = '<p class="gd-title"></p><div class="gd-bar gd-ind"><i></i></div><p class="gd-msg">Getting ready</p><p class="gd-hint"></p><button type="button" class="gd-btn gd-reload" hidden>Reload</button>';
    box.querySelector('.gd-title').textContent = title;
    D.body.appendChild(box);
    var st2 = D.createElement('style'); st2.id = 'gd-shim-css2'; st2.textContent = '#status-splash,#status-progress{display:none!important}'; (D.head || D.documentElement).appendChild(st2);   // hide the stock logo and bar only once ours is on screen
    els.box = box; els.bar = box.querySelector('.gd-bar'); els.fill = box.querySelector('.gd-bar i'); els.msg = box.querySelector('.gd-msg'); els.hint = box.querySelector('.gd-hint'); els.reload = box.querySelector('.gd-reload'); els.reload.addEventListener('click', function () { safe(function () { W.location.reload(); }); });
    if (S.capped()) D.documentElement.classList.add('gd-capped');
  }
  function setText(el, t) { if (el && el.textContent !== t) el.textContent = t; }

  var t0 = Date.now(), lastMove = t0, lastPos = -2, timer = 0, done = false;
  function finish() {
    if (done) return; done = true; clearInterval(timer); S.phase = 'running';
    if (els.box) { els.box.classList.add('gd-out'); setTimeout(function () { safe(function () { els.box.remove(); }); }, 450); }
  }
  function tick() {
    var status = D.getElementById('status');
    if (!status || !status.isConnected) { finish(); return; }              // stock shell removes #status once the engine is running
    var notice = D.getElementById('status-notice');
    var noticeShown = notice && notice.style.display === 'block';
    var prog = D.getElementById('status-progress');
    var now = Date.now(), pos = prog ? prog.position : -1;
    if (pos !== lastPos) { lastPos = pos; lastMove = now; }
    if (noticeShown) {                                                      // the engine's own error message is showing: say it plainly and offer a way out
      var why = (notice.textContent || '').replace(/\s+/g, ' ').trim();
      els.box.style.display = 'none'; S.phase = 'error'; clearInterval(timer);
      if (/features required|missing/i.test(why)) showAlert('This browser cannot run the game', 'It needs a newer browser with WebGL 2. Try the latest Safari or Chrome.', '');
      else showAlert('The game could not start', 'The download failed or was interrupted. Check your connection, then tap Reload.', 'Reload');
      return;
    }
    var stalled = false;
    if (pos >= 0 && pos < 0.995) {
      S.phase = 'download'; els.bar.classList.remove('gd-ind'); els.fill.style.width = (pos * 100).toFixed(1) + '%';
      setText(els.msg, 'Downloading ' + Math.floor(pos * 100) + '%');
      stalled = now - lastMove > 9000;
      setText(els.hint, stalled ? 'Still going. If this stays stuck, check your connection and tap Reload.' : (prog.max > 60e6 ? 'This is a big game, so the first load takes a while.' : ''));
      if (stalled) S.phase = 'download-stalled';
    } else if (pos >= 0.995) {
      S.phase = 'starting'; els.bar.classList.remove('gd-ind'); els.fill.style.width = '100%';
      setText(els.msg, 'Starting the game');
      stalled = now - lastMove > 30000;
      setText(els.hint, stalled ? 'Taking longer than usual. If nothing appears, close other tabs and tap Reload.' : 'Setting things up. On a phone this can take a few seconds.');
      if (stalled) S.phase = 'starting-slow';
    } else {
      S.phase = 'connecting'; els.bar.classList.add('gd-ind');
      setText(els.msg, now - t0 > 4000 ? 'Connecting' : 'Getting ready');
      stalled = now - t0 > 20000;
      setText(els.hint, now - t0 > 12000 ? 'Slow connection. Still trying. You can tap Reload to try again.' : '');
      if (stalled) S.phase = 'connecting-slow';
    }
    if (els.reload.hidden === stalled) els.reload.hidden = !stalled;
  }
  function halt() { clearInterval(timer); if (els.box) els.box.style.display = 'none'; }   // a crash message replaces the loader
  function showAlert(head, body, btn) {
    if (!D.body) return;
    var a = D.getElementById('gd-alert');
    if (!a) {
      a = D.createElement('div'); a.id = 'gd-alert'; a.setAttribute('role', 'alertdialog'); a.setAttribute('aria-live', 'assertive');
      a.innerHTML = '<h2></h2><p></p><button type="button" class="gd-btn"></button>';
      a.querySelector('button').addEventListener('click', function () { safe(function () { W.location.reload(); }); });
      D.body.appendChild(a);
    }
    a.querySelector('h2').textContent = head; a.querySelector('p').textContent = body;
    var b = a.querySelector('button'); b.textContent = btn || 'Reload'; b.hidden = !btn;
  }
  function toast(text) {
    if (!D.body) return;
    var t = D.getElementById('gd-toast') || D.createElement('div'); t.id = 'gd-toast'; t.textContent = text; t.setAttribute('role', 'status');
    if (!t.parentNode) D.body.appendChild(t);
    t.onclick = function () { safe(function () { t.remove(); }); };
    setTimeout(function () { safe(function () { t.remove(); }); }, 9000);
  }

  // Context loss: the engine cannot rebuild its GL objects, so a reload is the only recovery. Capture phase on window so this
  // runs before the engine's own canvas listener (which opens a blocking alert()).
  W.addEventListener('webglcontextlost', function (e) {
    if (S.lost) return; S.lost = true; S.phase = 'context-lost';
    safe(function () { e.stopImmediatePropagation(); e.preventDefault(); });
    if (S.cls !== 'desktop') bumpTier();
    ready(function () { halt(); showAlert('The graphics were reset', 'Your device took the game\'s graphics away, usually because it ran low on memory. Close other tabs or apps, then tap Reload.' + (S.cls !== 'desktop' ? ' The game will use lighter graphics.' : ''), 'Reload'); });
  }, true);
  // wasm runtime death (out of memory, abort): the canvas would just freeze.
  var FATAL = /RuntimeError|Aborted\(|out of memory|Cannot enlarge memory|memory access out of bounds/i;
  function fatal(msg) {
    if (S.aborted || !FATAL.test(String(msg || ''))) return;
    S.aborted = true; S.phase = 'aborted';
    if (S.cls !== 'desktop') bumpTier();
    ready(function () { halt(); showAlert('The game stopped', 'It ran into a problem, often low memory on a phone. Tap Reload to start again.', 'Reload'); });
  }
  W.addEventListener('error', function (e) { fatal(e && (e.message || (e.error && e.error.message))); });
  W.addEventListener('unhandledrejection', function (e) { fatal(e && e.reason && (e.reason.message || e.reason)); });

  ready(function () {
    safe(function () {
      if (D.getElementById('status') && D.body) { build(); timer = setInterval(tick, 200); tick(); }
      else S.phase = 'no-shell';
      if (S.died) toast(S.cls === 'desktop' ? 'This page was reloaded by the browser.' : 'This page was reloaded by your browser, probably because it ran low on memory. Using lighter graphics.');
    });
  });
})();

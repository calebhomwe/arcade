/* Caleb's Arcade SDK v1. Load FIRST in <head>, before any game script:
 *   <script src="../assets/arcade-sdk.js"></script>
 *
 * With no game code at all it gives the game what qa/standard/STANDARD.md requires:
 * - pause and resume: animation frames, timers, performance.now() and Web Audio freeze
 *   together, so the game resumes without a time jump;
 * - mute: every Web Audio graph and media element goes through one master switch;
 * - a standard pause menu: Resume, Restart, How to play, Tips, Sound, Codes, Exit;
 * - the arcade page's Pause, Mute and Help buttons and automatic pause when the tab hides.
 *
 * Games go deeper by calling ArcadeSDK.init({...}), for example:
 *   ArcadeSDK.init({
 *     ownPauseUI: false,             // true if the game draws its own pause menu (then handle onPause)
 *     onPause(){}, onResume(){},     // optional: extra work beyond the automatic freeze
 *     onRestart(){},                 // restart the run without reloading (else the page reloads)
 *     onExit(){},                    // go back to the title screen (else the page reloads)
 *     onTutorial(){},                // replay the tutorial
 *     onHint(){ return 'Try the corner'; },    // or call ArcadeSDK.setHint(text) whenever the best hint changes
 *     onCheat(code){ return code==='GODMODE' ? {ok:true, message:'Invincible'} : {ok:false}; },
 *     // or declare the codes and just get told which one was entered (engines that can't return values):
 *     // cheats: [{code:'GODMODE', effect:'Invincible'}], onCheat(code){ ... },
 *     tricks: [{name:'Backflip', input:'Up + Space'}],
 *   });
 *   ArcadeSDK.state({scene:'play', score:120});  // title | play | over
 *   ArcadeSDK.event('tutorial-done');
 *   ArcadeSDK.gamePaused(true);                 // a game with its own pause menu (ownPauseUI) reports it
 *   if (ArcadeSDK.cheated) skipSavingBest();
 *
 * Nothing in here may break a game: every hook is guarded and falls back to the original.
 */
(function () {
  'use strict';
  if (window.ArcadeSDK) return;
  var V = 1, W = window, D = document;
  var inFrame = false; try { inFrame = W.parent && W.parent !== W; } catch (e) { inFrame = true; }
  function post(type, data) { if (!inFrame) return; try { var m = { arcade: V, type: type }; for (var k in data) m[k] = data[k]; W.parent.postMessage(m, '*'); } catch (e) {} }

  var cfg = {}, meta = {}, paused = false, reason = '', muted = false, cheated = false, events = [], glTypes = [];
  var rawST = W.setTimeout.bind(W), rawCT = W.clearTimeout.bind(W), rawSI = W.setInterval.bind(W), rawCI = W.clearInterval.bind(W);
  try { muted = W.localStorage.getItem('arcade_muted') === '1'; } catch (e) {}

  /* ---------- clock: performance.now stands still while paused ---------- */
  var rawNow = W.performance && W.performance.now ? W.performance.now.bind(W.performance) : Date.now;
  var pausedAt = 0, pausedTotal = 0;
  function vnow() { return (paused && !soft ? pausedAt : rawNow()) - pausedTotal; }
  try { W.performance.now = vnow; } catch (e) {}

  /* ---------- animation frames ---------- */
  var rawRAF = W.requestAnimationFrame ? W.requestAnimationFrame.bind(W) : null, rawCAF = W.cancelAnimationFrame ? W.cancelAnimationFrame.bind(W) : null;
  var nextId = 1, frames = new Map();
  function schedule(id, e) {
    e.raw = rawRAF(function () {
      e.raw = 0;
      if (paused && !soft) return;        // stays queued; flushed on resume
      frames.delete(id);
      try { e.cb(vnow()); } catch (err) { setTimeoutRaw(function () { throw err; }, 0); }
    });
  }
  function setTimeoutRaw(f, ms) { return rawST(f, ms); }
  if (rawRAF) {
    W.requestAnimationFrame = function (cb) { var id = nextId++, e = { cb: cb, raw: 0 }; frames.set(id, e); if (!paused || soft) schedule(id, e); return id; };
    W.cancelAnimationFrame = function (id) { var e = frames.get(id); if (e) { if (e.raw) rawCAF(e.raw); frames.delete(id); } else if (rawCAF) { try { rawCAF(id); } catch (x) {} } };
  }

  /* ---------- timers: a timeout that falls due while paused runs on resume; intervals skip paused ticks ---------- */
  var deferred = new Map(), tmap = new Map(), tid = 1e6;
  W.setTimeout = function (fn, ms) {
    if (typeof fn !== 'function') return rawST.apply(W, arguments);
    var args = Array.prototype.slice.call(arguments, 2), id = tid++;
    tmap.set(id, rawST(function () { tmap.delete(id); if (paused && !soft) deferred.set(id, function () { fn.apply(W, args); }); else fn.apply(W, args); }, ms));
    return id;
  };
  W.clearTimeout = function (id) { if (tmap.has(id)) { rawCT(tmap.get(id)); tmap.delete(id); } else if (deferred.has(id)) deferred.delete(id); else rawCT(id); };
  W.setInterval = function (fn, ms) {
    if (typeof fn !== 'function') return rawSI.apply(W, arguments);
    var args = Array.prototype.slice.call(arguments, 2);
    return rawSI(function () { if (!paused || soft) fn.apply(W, args); }, ms);
  };
  W.clearInterval = function (id) { rawCI(id); };

  /* ---------- audio: one master gain per context, suspend on pause ---------- */
  var ctxs = new Set(), masters = new Map(), wasRunning = new Set(), media = new Set(), mediaWasPlaying = new Set();
  var AC = W.AudioContext || W.webkitAudioContext;
  function masterOf(ctx) {
    var m = masters.get(ctx);
    if (!m) { m = ctx.createGain(); rawConnect.call(m, ctx.destination); m.gain.value = muted ? 0 : 1; masters.set(ctx, m); ctxs.add(ctx); }
    return m;
  }
  var rawConnect = W.AudioNode && W.AudioNode.prototype.connect;
  if (AC && rawConnect) {
    try {
      var Wrapped = class extends AC { constructor(a) { super(a); ctxs.add(this); if (paused && !soft) { try { this.suspend(); wasRunning.add(this); } catch (e) {} } } };
      W.AudioContext = Wrapped; if (W.webkitAudioContext) W.webkitAudioContext = Wrapped;
      W.AudioNode.prototype.connect = function (dest) {
        try {
          if (dest && W.AudioDestinationNode && dest instanceof W.AudioDestinationNode && !(W.OfflineAudioContext && dest.context instanceof W.OfflineAudioContext)) {
            var args = Array.prototype.slice.call(arguments); args[0] = masterOf(dest.context);
            return rawConnect.apply(this, args);
          }
        } catch (e) {}
        return rawConnect.apply(this, arguments);
      };
    } catch (e) {}
  }
  if (W.HTMLMediaElement) {
    var rawPlay = W.HTMLMediaElement.prototype.play;
    W.HTMLMediaElement.prototype.play = function () {
      media.add(this); if (muted) this.muted = true;
      if (paused && !soft) { mediaWasPlaying.add(this); return Promise.resolve(); }
      return rawPlay.apply(this, arguments);
    };
  }
  function applyMute() {
    masters.forEach(function (m) { try { m.gain.value = muted ? 0 : 1; } catch (e) {} });
    media.forEach(function (el) { try { el.muted = muted; } catch (e) {} });
    D.querySelectorAll && D.querySelectorAll('audio,video').forEach(function (el) { media.add(el); el.muted = muted; });
  }

  /* ---------- graphics telemetry for the harness (which contexts the game asked for) ---------- */
  try {
    var rawGC = W.HTMLCanvasElement.prototype.getContext;
    W.HTMLCanvasElement.prototype.getContext = function (type) { var c = rawGC.apply(this, arguments); if (c && glTypes.length < 40) glTypes.push({ type: String(type), w: this.width, h: this.height }); return c; };
  } catch (e) {}

  /* ---------- pause / resume ---------- */
  // Hard pause: the SDK freezes frames, timers, the clock, audio and CSS. Soft pause (games with their own
  // pause menu, ownPauseUI): the game stops its own simulation in onPause and keeps drawing its menu.
  var soft = false;
  function pause(why) {
    if (paused) { if (why === 'user') reason = 'user'; return; }
    paused = true; reason = why || 'user';
    soft = !!cfg.ownPauseUI && reason !== 'hidden';
    if (!soft) {
      pausedAt = rawNow();
      ctxs.forEach(function (c) { if (c.state === 'running') { wasRunning.add(c); try { c.suspend(); } catch (e) {} } });
      media.forEach(function (el) { if (!el.paused) { mediaWasPlaying.add(el); try { el.pause(); } catch (e) {} } });
      freezeCss(true);
    }
    try { cfg.onPause && cfg.onPause(reason); } catch (e) {}
    if (!cfg.ownPauseUI && reason !== 'hidden') showMenu('pause');
    post('state', { paused: true, reason: reason }); log('pause', { reason: reason, soft: soft });
  }
  function resume(why) {
    if (!paused) return;
    if (why === 'visible' && reason !== 'hidden') return;   // never un-pause a pause the player chose
    var wasSoft = soft; paused = false; reason = ''; soft = false;
    if (!wasSoft) {
      pausedTotal += rawNow() - pausedAt;
      wasRunning.forEach(function (c) { try { c.resume(); } catch (e) {} }); wasRunning.clear();
      mediaWasPlaying.forEach(function (el) { try { rawPlay.call(el); } catch (e) {} }); mediaWasPlaying.clear();
      frames.forEach(function (e, id) { if (!e.raw) schedule(id, e); });
      var run = Array.from(deferred.values()); deferred.clear(); run.forEach(function (f) { try { f(); } catch (e) { rawST(function () { throw e; }, 0); } });
      freezeCss(false);
    }
    try { cfg.onResume && cfg.onResume(); } catch (e) {}
    hideMenu();
    post('state', { paused: false }); log('resume');
  }
  // A game with its own pause menu reports it here, so the arcade's Pause button stays in step.
  function gamePaused(on) {
    if (!!on === paused) return;
    if (on) { paused = true; soft = true; reason = 'game'; } else { paused = false; soft = false; reason = ''; }
    post('state', { paused: paused, reason: reason }); log(on ? 'pause' : 'resume', { reason: 'game', soft: true });
  }
  var freezeEl = null;
  function freezeCss(on) {   // CSS animations stop with the game; the menu keeps its own
    try {
      if (on && !freezeEl) { freezeEl = el('style', { id: 'arcade-sdk-freeze', text: 'body *:not(#arcade-sdk):not(#arcade-sdk *):not(#arcade-sdk-btn){animation-play-state:paused!important}' }); (D.head || D.documentElement).appendChild(freezeEl); }
      else if (!on && freezeEl) { freezeEl.remove(); freezeEl = null; }
    } catch (e) {}
  }
  // One capture-phase key listener. While the menu is open the game gets no keys, and Esc or P
  // steps back (or resumes). P / Esc open the menu only for games whose meta says those keys are free.
  var pauseKeys = '';
  W.addEventListener('keydown', function (e) {
    var k = e.key, inMenu = !!(root && e.target && e.target.nodeType && root.contains(e.target));
    if (panel) {
      if (k === 'Escape' || ((k === 'p' || k === 'P') && !(e.target && e.target.tagName === 'INPUT'))) {
        e.preventDefault(); e.stopPropagation(); if (panel === 'pause') resume('user'); else showMenu('pause');
      } else if (!inMenu) e.stopPropagation();
      return;
    }
    var t = e.target && e.target.tagName; if (!pauseKeys || t === 'INPUT' || t === 'TEXTAREA' || e.repeat) return;
    if (k === 'p' || k === 'P' || (pauseKeys === 'esc' && k === 'Escape')) { e.preventDefault(); e.stopPropagation(); if (paused) resume('user'); else pause('user'); }
  }, true);
  function setMuted(v) { muted = !!v; try { W.localStorage.setItem('arcade_muted', muted ? '1' : '0'); } catch (e) {} applyMute(); post('state', { muted: muted }); paintMenu(); }
  function restart() {
    hideMenu(); if (paused) resume('user');
    if (cfg.onRestart) { try { cfg.onRestart(); log('restart', { how: 'game' }); return; } catch (e) {} }
    if (inFrame) post('request-restart', {}); else W.location.reload();
  }
  function exitToTitle() {
    hideMenu(); if (paused) resume('user');
    if (cfg.onExit) { try { cfg.onExit(); log('exit', { how: 'game' }); return; } catch (e) {} }
    if (inFrame) post('request-restart', { toTitle: true }); else W.location.reload();
  }
  D.addEventListener('visibilitychange', function () { if (D.hidden) pause('hidden'); else resume('visible'); });

  /* ---------- the standard pause menu ---------- */
  var root = null, panel = '', tipIx = 0;
  function el(tag, attrs, kids) { var e = D.createElement(tag); for (var k in attrs) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); } (kids || []).forEach(function (c) { e.appendChild(c); }); return e; }
  function ensureRoot() {
    if (root || !D.body) return root;
    var css = el('style', { text:
      '#arcade-sdk{position:fixed;inset:0;z-index:2147483600;display:none;align-items:center;justify-content:center;background:rgba(8,10,20,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1c1f2e}' +
      '#arcade-sdk.on{display:flex}#arcade-sdk .c{background:#fffdf7;border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.45),inset 0 -5px 0 rgba(0,0,0,.08);padding:22px 22px 18px;width:min(380px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;text-align:center}' +
      '#arcade-sdk h2{margin:0 0 4px;font-size:24px;font-weight:900;letter-spacing:.2px}#arcade-sdk .sub{margin:0 0 14px;color:#6a6f86;font-size:13px}' +
      '#arcade-sdk button{display:block;width:100%;min-height:46px;margin:8px 0;border:0;border-radius:14px;font:800 16px system-ui,sans-serif;cursor:pointer;color:#1c1f2e;background:#eef0f8;box-shadow:inset 0 -4px 0 rgba(0,0,0,.12)}' +
      '#arcade-sdk button.p{background:linear-gradient(#5ee07c,#23b04b);color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.25)}#arcade-sdk button:focus-visible{outline:3px solid #6c7cff;outline-offset:2px}' +
      '#arcade-sdk .row{display:flex;gap:8px}#arcade-sdk .row button{flex:1}#arcade-sdk ol,#arcade-sdk ul{text-align:left;margin:6px 0 10px;padding-left:22px}#arcade-sdk li{margin:4px 0}' +
      '#arcade-sdk .tip{background:#fff4d6;border-radius:12px;padding:10px 12px;margin:10px 0;font-size:14px;text-align:left}#arcade-sdk input{width:100%;box-sizing:border-box;min-height:44px;border:2px solid #d9dcea;border-radius:12px;padding:0 12px;font:700 16px system-ui;text-transform:uppercase}' +
      '#arcade-sdk .msg{min-height:20px;font-weight:700;color:#23804a}#arcade-sdk table{width:100%;border-collapse:collapse;font-size:14px;text-align:left}#arcade-sdk td{padding:4px 6px;border-bottom:1px solid #eee}' +
      '#arcade-sdk-btn{position:fixed;z-index:2147483599;width:40px;height:40px;border-radius:50%;border:0;background:rgba(10,12,24,.55);color:#fff;font:900 15px system-ui;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.3)}' +
      '#arcade-sdk-btn:focus-visible{outline:3px solid #6c7cff}@media (prefers-reduced-motion:reduce){#arcade-sdk{backdrop-filter:none}}' });
    D.head ? D.head.appendChild(css) : D.body.appendChild(css);
    root = el('div', { id: 'arcade-sdk', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Game menu' });
    root.addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('[data-a]') : null; if (b) act(b.getAttribute('data-a')); });
    D.body.appendChild(root);
    return root;
  }
  function pauseButton() {
    if (cfg.ownPauseUI || cfg.pauseButton === 'none' || D.getElementById('arcade-sdk-btn') || !D.body) return;
    var pos = cfg.pauseButton || meta.pauseButton || 'tr', b = el('button', { id: 'arcade-sdk-btn', type: 'button', 'aria-label': 'Pause', title: pauseKeys ? 'Pause (P)' : 'Pause' });
    b.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.6" height="12" rx="1.2" fill="#fff"/><rect x="9.4" y="2" width="3.6" height="12" rx="1.2" fill="#fff"/></svg>';
    b.style[pos[0] === 't' ? 'top' : 'bottom'] = '10px'; b.style[pos[1] === 'l' ? 'left' : 'right'] = '10px';
    b.addEventListener('click', function (e) { e.stopPropagation(); pause('user'); });
    D.body.appendChild(b);
  }
  function list(tag, items) { return el(tag, {}, (items || []).map(function (t) { return el('li', { text: t }); })); }
  function paintMenu() { if (root && root.classList.contains('on')) render(); }
  function render() {
    var c = el('div', { class: 'c' }), title = meta.title || D.title || 'Paused', tips = meta.tips || [], howto = meta.howto || [], cheats = hasCheats();
    if (panel === 'pause') {
      c.appendChild(el('h2', { text: 'Paused' })); c.appendChild(el('p', { class: 'sub', text: title }));
      c.appendChild(el('button', { class: 'p', 'data-a': 'resume', text: 'Resume' }));
      c.appendChild(el('button', { 'data-a': 'restart', text: 'Restart' }));
      c.appendChild(el('div', { class: 'row' }, [el('button', { 'data-a': 'howto', text: 'How to play' }), el('button', { 'data-a': 'sound', text: muted ? 'Sound: off' : 'Sound: on', 'aria-pressed': String(!muted) })]));
      var extra = [];
      if (hasHints()) extra.push(el('button', { 'data-a': 'hint', text: 'Hint' }));
      if ((cfg.tricks || meta.tricks || []).length) extra.push(el('button', { 'data-a': 'tricks', text: 'Tricks' }));
      if (cheats) extra.push(el('button', { 'data-a': 'codes', text: 'Codes' }));
      if (extra.length) c.appendChild(el('div', { class: 'row' }, extra));
      if (tips.length) c.appendChild(el('div', { class: 'tip', text: '💡 ' + tips[tipIx++ % tips.length] }));
      c.appendChild(el('button', { 'data-a': 'exit', text: 'Exit to title' }));
    } else if (panel === 'howto') {
      c.appendChild(el('h2', { text: 'How to play' }));
      if (howto.length) c.appendChild(list('ol', howto)); else c.appendChild(el('p', { text: 'Explore and have fun!' }));
      var ctl = meta.controls || {}, rows = [];
      ['keyboard', 'touch', 'gamepad'].forEach(function (k) { if (ctl[k]) rows.push(el('tr', {}, [el('td', { text: k[0].toUpperCase() + k.slice(1) }), el('td', { text: ctl[k] })])); });
      if (rows.length) c.appendChild(el('table', {}, rows));
      if (tips.length) { c.appendChild(el('p', { class: 'sub', text: 'Tips' })); c.appendChild(list('ul', tips)); }
      if (cfg.onTutorial) c.appendChild(el('button', { 'data-a': 'tutorial', text: 'Replay tutorial' }));
      c.appendChild(el('button', { class: 'p', 'data-a': 'back', text: 'Back' }));
    } else if (panel === 'tricks') {
      c.appendChild(el('h2', { text: 'Trick list' }));
      c.appendChild(el('table', {}, (cfg.tricks || meta.tricks || []).map(function (t) { return el('tr', {}, [el('td', { text: t.name }), el('td', { text: t.input || '' })]); })));
      c.appendChild(el('button', { class: 'p', 'data-a': 'back', text: 'Back' }));
    } else if (panel === 'codes') {
      c.appendChild(el('h2', { text: 'Codes' })); c.appendChild(el('p', { class: 'sub', text: 'Codes are just for fun: a run with codes on never replaces your best score.' }));
      var inp = el('input', { id: 'arcade-sdk-code', 'aria-label': 'Code', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false' });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); act('enter-code'); } });
      c.appendChild(inp); c.appendChild(el('p', { class: 'msg', id: 'arcade-sdk-msg' }));
      c.appendChild(el('button', { class: 'p', 'data-a': 'enter-code', text: 'Enter code' })); c.appendChild(el('button', { 'data-a': 'back', text: 'Back' }));
    } else if (panel === 'hint') {
      var h = currentHint();
      c.appendChild(el('h2', { text: 'Hint' })); c.appendChild(el('div', { class: 'tip', text: h || 'Keep going, you are doing great!' }));
      c.appendChild(el('button', { class: 'p', 'data-a': 'back', text: 'Back' })); log('hint');
    }
    root.innerHTML = ''; root.appendChild(c);
    var f = root.querySelector('input,button.p,button'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
  }
  function showMenu(which) { if (!ensureRoot()) return; panel = which || 'pause'; root.classList.add('on'); render(); }
  function hideMenu() { if (root) { root.classList.remove('on'); root.innerHTML = ''; } panel = ''; }
  function act(a) {
    if (a === 'resume') resume('user');
    else if (a === 'restart') restart();
    else if (a === 'exit') exitToTitle();
    else if (a === 'sound') setMuted(!muted);
    else if (a === 'back') showMenu('pause');
    else if (a === 'tutorial') { hideMenu(); if (paused) resume('user'); try { cfg.onTutorial(); log('tutorial'); } catch (e) { log('tutorial-error', { message: String(e) }); } }
    else if (a === 'enter-code') {
      var inp = D.getElementById('arcade-sdk-code'), msg = D.getElementById('arcade-sdk-msg'), code = (inp && inp.value || '').trim().toUpperCase(), r = { ok: false };
      r = tryCode(code);
      if (msg) { msg.textContent = r.ok ? (r.message || 'Code on!') : 'Not a code. Try again.'; msg.style.color = r.ok ? '#23804a' : '#b3261e'; }
    } else showMenu(a);
  }

  /* ---------- codes and hints ----------
   * A game either answers directly (onCheat returns {ok, message}; onHint returns text) or, when its
   * engine cannot return values into JavaScript (Godot's JavaScriptBridge), declares its codes up front
   * (init({cheats:[{code, effect}], onCheat})) and keeps the current hint fresh with setHint(text). */
  var hintText = '';
  function tryCode(code) {
    code = String(code || '').trim().toUpperCase();
    var r = { ok: false }, list = cfg.cheats;
    if (list && list.length) {
      var hit = null; for (var i = 0; i < list.length; i++) if (String(list[i].code).toUpperCase() === code) hit = list[i];
      if (hit) { r = { ok: true, message: hit.effect || 'Code on!' }; try { cfg.onCheat && cfg.onCheat(code); } catch (e) {} }
    } else if (cfg.onCheat) { try { r = cfg.onCheat(code) || { ok: false }; } catch (e) { r = { ok: false }; } }
    if (r.ok) { cheated = true; post('event', { name: 'cheat', data: { code: code } }); log('cheat', { code: code }); }
    return r;
  }
  function currentHint() { var h = ''; try { h = cfg.onHint ? cfg.onHint() : ''; } catch (e) {} return h || hintText || ''; }
  function hasHints() { return !!(cfg.onHint || hintText); }
  function hasCheats() { return !!(cfg.onCheat || (cfg.cheats && cfg.cheats.length)); }

  /* ---------- messages from the arcade page ---------- */
  W.addEventListener('message', function (e) {
    var m = e.data; if (!m || m.arcade !== V || e.source !== W.parent) return;
    if (m.type === 'config') { meta = m.meta || {}; pauseButton(); pauseKeys = cfg.pauseKeys != null ? cfg.pauseKeys : (meta.pauseKeys || ''); }
    else if (m.type === 'pause') pause(m.reason || 'user');
    else if (m.type === 'resume') resume(m.reason || 'user');
    else if (m.type === 'mute') setMuted(true);
    else if (m.type === 'unmute') setMuted(false);
    else if (m.type === 'howto') { pause('user'); showMenu('howto'); }
    else if (m.type === 'menu') pause('user');
    else if (m.type === 'restart') restart();
    else if (m.type === 'cheat') { var r = tryCode(m.code); post('ack', { of: 'cheat', ok: !!r.ok, message: r.message || '' }); }
    else if (m.type === 'hint') { var h = currentHint(); if (h) log('hint'); post('ack', { of: 'hint', ok: !!h, message: h }); }
  });

  function caps() {
    return { sdk: V, pause: true, mute: true, menu: !cfg.ownPauseUI, ownPauseUI: !!cfg.ownPauseUI, restart: !!cfg.onRestart, exit: !!cfg.onExit,
      tutorial: !!cfg.onTutorial, hints: hasHints(), cheats: hasCheats(), tricks: (cfg.tricks || []).length, declared: !!cfg.declared };
  }
  function log(name, data) { events.push({ t: Math.round(rawNow()), name: name, data: data || null }); if (events.length > 200) events.shift(); }

  var api = {
    version: V,
    init: function (o) { o = o || {}; for (var k in o) cfg[k] = o[k]; cfg.declared = true; if (cfg.pauseKeys != null) pauseKeys = cfg.pauseKeys; post('ready', { caps: caps() }); if (D.body) pauseButton(); return api; },
    pause: function () { pause('user'); }, resume: function () { resume('user'); }, gamePaused: gamePaused,
    get paused() { return paused; }, get muted() { return muted; }, get cheated() { return cheated; },
    setMuted: setMuted, restart: restart, showMenu: function (w) { pause('user'); showMenu(w || 'pause'); },
    state: function (s) { post('state', s || {}); if (s && s.scene) log('scene', { scene: s.scene }); },
    event: function (name, data) { log(name, data); post('event', { name: name, data: data || null }); },
    now: vnow,
    setHint: function (t) { var had = hasHints(); hintText = String(t || ''); if (!had && hintText) post('ready', { caps: caps() }); },
    tryCode: tryCode,
    debug: function () {
      return { version: V, paused: paused, soft: soft, reason: reason, pauseKeys: pauseKeys, muted: muted, cheated: cheated, clock: vnow(), raw: rawNow(), pausedTotal: pausedTotal, caps: caps(), meta: !!meta.title,
        audio: Array.from(ctxs).map(function (c) { var m = masters.get(c); return { state: c.state, master: m ? m.gain.value : null }; }),
        media: Array.from(media).map(function (el) { return { muted: el.muted, paused: el.paused }; }),
        gl: glTypes.slice(), frames: frames.size, deferred: deferred.size, events: events.slice(-40), menu: panel };
    }
  };
  W.ArcadeSDK = api;
  function boot() { applyMute(); post('ready', { caps: caps() }); if (!inFrame) pauseButton(); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
  W.addEventListener('load', function () { post('ready', { caps: caps() }); });   // again, in case the arcade page was not listening yet
})();

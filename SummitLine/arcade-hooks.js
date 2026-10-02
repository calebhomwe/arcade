/* Summit Line <-> Caleb's Arcade SDK (assets/arcade-sdk.js).
 *
 * Everything the arcade standard asks for that the game does not do on its own, built only on what the
 * game already offers: its DOM (buttons and screens), window.__game (state, player, racers) and the
 * exports of js/course.js. The game's own files stay untouched, so this file merges cleanly with work
 * on js/ and css/. It is loaded by one <script> line at the end of <body>, before the game module runs.
 *
 * What it adds:
 * - ArcadeSDK.init: restart, exit to title, a trick tutorial, a hint that reads the course ahead,
 *   three codes, the trick list, and scene reports (title / play / over with time, place and points).
 * - Pause: in a race the game keeps its own pause button and panel (ownPauseUI + gamePaused, kept in step
 *   both ways; its gameplay test uses them); the arcade's Pause opens it. On the title and results, which have
 *   no pause of their own, the arcade's button and menu stand in. The panel now shows a tip and
 *   pausing also silences the game's audio. The Controls panel gains the trick list and volume sliders.
 * - A first-run trick tutorial (carve, tuck, ollie, trick off the beginner kicker, boost), skippable and
 *   replayable from How to play.
 * - A run with codes on never writes the personal best, and shows CODES ON.
 * - Reduced motion: no white crash flash and no pop-in animations.
 * - Sound from audio/: race music under the game's own effects and a finish-line crowd; Music and Effects
 *   sliders in the Controls panel and the arcade's How to play panel (saved as summitline.volume).
 */
(function () {
  'use strict';
  var SDK = window.ArcadeSDK, W = window, doc = document;
  if (!SDK) return;
  var $ = function (id) { return doc.getElementById(id); };
  var G = function () { return W.__game || null; };           // set by js/main.js once the mountain is built
  var gstate = function () { var g = G(); try { return g ? g.state() : 'loading'; } catch (e) { return 'loading'; } };
  var player = function () { var g = G(); try { return g ? g.player() : null; } catch (e) { return null; } };
  var click = function (id) { var b = $(id); if (b) b.click(); return !!b; };
  var isTouch = (W.matchMedia && W.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in W;
  var on = {};                                               // codes entered this session
  var lastState = '';                                        // last game state seen by watch()
  var course = null;                                         // js/course.js: KICKERS, RAILS, LENGTH
  import('./js/course.js').then(function (m) { course = m; }).catch(function () {});

  /* ---------- look: pause tip, trick list, codes label, coach card, reduced motion ---------- */
  var css = doc.createElement('style');
  css.textContent =
    'body.sl-racing #arcade-sdk-btn{display:none!important}' +
    '#pause .sl-tip{margin:16px 0 0;font-size:15px;line-height:1.45;color:#33455e}#pause .sl-tip b{color:var(--accent);font-family:var(--cond);font-style:italic;text-transform:uppercase;letter-spacing:.04em}' +
    '#help .sl-vol label{display:flex;align-items:center;gap:12px;font-size:15px;font-weight:700;margin:6px 0}#help .sl-vol span{width:64px}' +
    '#help .sl-vol input{flex:1;min-height:40px;accent-color:var(--accent)}#help .sl-tricks dt{white-space:normal}' +
    '.sl-codes{position:fixed;left:22px;top:126px;z-index:7;pointer-events:none;font:800 italic 14px/1 var(--cond);letter-spacing:.08em;text-transform:uppercase;' +
      'color:var(--ink);background:linear-gradient(100deg,var(--accent2),#fff4b0);padding:6px 11px;border-radius:5px;transform:skewX(-8deg);box-shadow:0 4px 14px rgba(0,10,30,.35)}' +
    '.sl-coach{position:fixed;left:50%;top:60px;transform:translateX(-50%);z-index:7;width:min(460px,calc(100vw - 132px));display:flex;align-items:center;gap:14px;' +
      'padding:12px 12px 12px 18px;border-radius:6px;background:var(--glass);border:1px solid var(--glass-b);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);' +
      'box-shadow:0 8px 24px rgba(0,10,30,.3);color:#fff;font-family:var(--font)}' +
    '.sl-coach[hidden]{display:none}.sl-coach .tx{flex:1;min-width:0}' +
    '.sl-coach .st{font:800 italic 15px/1.1 var(--cond);letter-spacing:.08em;text-transform:uppercase;color:var(--accent2)}' +
    '.sl-coach .do{font-weight:600;font-size:15px;line-height:1.35;margin-top:3px}' +
    '.sl-coach kbd{display:inline-block;min-width:24px;padding:1px 6px;margin:0 2px;text-align:center;border-radius:4px;background:#fff;color:var(--ink);font:700 13px var(--font);border-bottom:2px solid #c9d4e1}' +
    '.sl-coach .btn{flex:none;font-size:16px;min-height:44px;padding:8px 14px}' +
    '@media (max-width:640px){.sl-codes{left:14px;top:96px;font-size:13px}.sl-coach{top:132px;padding:10px 10px 10px 14px;gap:10px}.sl-coach .do{font-size:14px}}' +
    '@media (prefers-reduced-motion:reduce){#flash{display:none!important}.trick-pop .t,.trick-pop .p,.countdown span{animation:none!important}.boost.full .boost-bar{animation:none!important}}';
  (doc.head || doc.body).appendChild(css);

  /* ---------- the game's own pause, kept in step with the arcade ---------- */
  var gamePausedNow = function () { var p = $('pause'); return !!(p && p.classList.contains('show')); };
  var TIPS = [
    'Let go of the spin just before you land: the board settles onto the fall line by itself.',
    'Hold a grab for more than 0.7 s to tweak it for extra points.',
    'Land your next trick within 3.5 s to raise the combo, up to x5. A crash resets it.',
    'Rail points only count once you land cleanly after popping off the rail.',
    'Trees and rocks crash you and cost about two seconds: pick lines through the open snow.',
  ], tipIx = 0, hushed = false, hiddenPause = false;
  var pausePanel = $('pause');
  if (pausePanel && W.MutationObserver) {
    // The game pauses itself on Esc / P, its pause button, window blur and a hidden tab. Tell the arcade,
    // show a tip, and hold the game's audio (its wind and carve loops would otherwise keep sounding).
    var was = false;
    new MutationObserver(function () {
      var now = gamePausedNow(); if (now === was) return; was = now;
      var a = SA.a && SA.a.ctx;
      if (now) {
        var box = pausePanel.querySelector('.panel'), t = box && box.querySelector('.sl-tip');
        if (box && !t) { t = doc.createElement('p'); t.className = 'sl-tip'; box.appendChild(t); }
        if (t) t.innerHTML = '<b>Tip</b> ' + TIPS[tipIx++ % TIPS.length];
        if (a && a.state === 'running') { hushed = true; try { a.suspend(); } catch (e) {} }
      } else if (hushed) { hushed = false; if (a && (!SDK.paused || SDK.debug().soft)) try { a.resume(); } catch (e) {} }
      SDK.gamePaused(now);
    }).observe(pausePanel, { attributes: true, attributeFilter: ['class'] });
  }
  function onPause(reason) {
    if (reason === 'hidden') { hiddenPause = true; return; }  // the SDK freezes everything; mid-race the game pauses itself too
    if (!ownPause) return;                                   // title and results: the arcade menu freezes everything
    var st = gstate();
    if ((st === 'race' || st === 'countdown') && !gamePausedNow()) click('btnPause');   // the game's own pause panel
  }
  // Mode: during a race the game's own pause button and panel (ownPauseUI); on loading, title and results,
  // which have no pause of their own, the arcade's button and menu. Switched only while nothing is paused.
  var ownPause = null;
  function syncMode() {
    var st = gstate(), want = st === 'countdown' || st === 'race' || st === 'finish';
    doc.body.classList.toggle('sl-racing', want);
    if (want === ownPause || SDK.paused) return;
    ownPause = want; SDK.init({ ownPauseUI: want });
  }
  function onResume() {
    if (hiddenPause) {   // back from a hidden tab: a race the game paused itself stays paused, as it always did
      hiddenPause = false;
      if (gamePausedNow()) {
        var a = SA.a && SA.a.ctx;
        W.setTimeout(function () {
          SDK.gamePaused(true);
          if (!a) return;
          hushed = true;     // the SDK has just asked the audio to wake: hush it again once it has
          var hush = function () { if (gamePausedNow()) try { a.suspend(); } catch (e) {} };
          if (a.state === 'running') hush();
          else a.addEventListener('statechange', function once() { if (a.state !== 'running') return; a.removeEventListener('statechange', once); hush(); });
        }, 0);
      }
      return;
    }
    if (gamePausedNow()) click('btnResume');
  }

  /* ---------- restart / exit ---------- */
  function restart() { if (!G()) return; hideCoach(); lastState = ''; click('btnRestart'); }   // the game's own Restart run
  function exitToTitle() { if (!G()) return; hideCoach(); click('btnQuit'); }  // the game's own Quit to title

  /* ---------- saving: a run with codes on never writes the personal best ---------- */
  try {
    var rawSet = W.Storage.prototype.setItem;
    W.Storage.prototype.setItem = function (k, v) {
      if (k === 'summitline.best' && SDK.cheated) return;
      return rawSet.apply(this, arguments);
    };
  } catch (e) {}

  /* ---------- codes (applied to the player's racer every physics step) ---------- */
  var hooked = null;
  function hookPlayer() {
    var p = player(); if (!p || hooked === p) return; hooked = p;
    var step = p.step, check = p.checkColliders;
    p.step = function (dt, inp) {
      if (on.ENDLESSBOOST && !this.finished) this.boost = 1;
      // 1/6 g in the air: add back five sixths of the gravity the air step is about to take away.
      if (on.MOONJUMP && !this.grounded && !this.grind && this.crashT <= 0) this.vel.y += 9.81 * (5 / 6) * dt;
      return step.call(this, dt, inp);
    };
    p.checkColliders = function () { if (on.GHOSTRIDER) return; return check.apply(this, arguments); };
  }
  var CODES = {
    ENDLESSBOOST: 'Unlimited boost: the meter never drains',
    MOONJUMP: 'Moon gravity: one sixth g in the air, huge hang time',
    GHOSTRIDER: 'Ride straight through trees and rocks',
  };
  var label = null;
  function cheat(code) {
    var key = String(code || '').trim().toUpperCase();
    if (!CODES[key]) return { ok: false };
    on[key] = true; hookPlayer();
    if (!label) { label = doc.createElement('div'); label.className = 'sl-codes'; label.textContent = 'Codes on'; doc.body.appendChild(label); }
    return { ok: true, message: CODES[key] };
  }

  /* ---------- tricks the physics really scores (js/physics.js scoreAir, stepGrind) ---------- */
  var TRICKS = [
    { name: 'FS 180 / 360 / 540 / 720+', input: 'Hold D or → in the air (touch: thumb pad right)' },
    { name: 'BS 180 / 360 / 540 / 720+', input: 'Hold A or ← in the air (touch: thumb pad left)' },
    { name: 'Frontflip (Double, Triple)', input: 'Hold W or ↑ in the air (touch: thumb pad up)' },
    { name: 'Backflip (Double, Triple)', input: 'Hold S or ↓ in the air (touch: thumb pad down)' },
    { name: 'Indy grab', input: 'Hold J in the air (gamepad X)' },
    { name: 'Melon grab', input: 'Hold K in the air (gamepad Y)' },
    { name: 'Method grab', input: 'Hold L in the air (gamepad B); touch GRAB cycles Melon, Method, Indy' },
    { name: 'Tweaked grab / Indy to Melon', input: 'Hold a grab past 0.7 s, or switch grab keys mid-air' },
    { name: 'Boardslide', input: 'Ride onto a rail with speed; tap Space (JUMP) to pop off early' },
    { name: '50-50 to Boardslide', input: 'Stay on a rail for more than 1.4 s' },
    { name: 'Big Air', input: 'Hang 1.25 s or more with no other trick' },
    { name: 'Combo x2 to x5', input: 'Land the next trick within 3.5 s; a crash resets it' },
  ];

  /* ---------- hint: reads the course ahead ---------- */
  var K = isTouch
    ? { steer: 'the thumb pad', tuck: 'push the pad up', jump: 'hold JUMP and let go', grab: 'hold GRAB', spin: 'push the pad sideways', boost: 'tap BOOST' }
    : { steer: 'A / D', tuck: 'hold W', jump: 'hold Space and release', grab: 'hold J, K or L', spin: 'hold ← or →', boost: 'hold Shift' };
  function hint() {
    var st = gstate(), p = player();
    if (st === 'loading') return 'The mountain is still loading.';
    if (!p || st === 'title' || st === 'results') return 'Press Drop in. The beginner kicker is at 90 m: go straight over it, ' + K.jump + ' at the lip, then ' + K.grab + ' for a grab.';
    if (p.crashT > 0) return 'Land with the board pointing down the hill: let go of the spin before touchdown and it settles by itself.';
    if (p.boost > 0.98) return 'Your boost meter is full: ' + K.boost + ' on a straight to pass the rivals.';
    if (course) {
      var s = p.s, next = null;
      course.KICKERS.forEach(function (k) { var d = k.s - s; if (d > 0 && d < 170 && (!next || d < next.d)) next = { d: d, k: k, kind: 'kick' }; });
      course.RAILS.forEach(function (r) { var d = r.s0 - s; if (d > 0 && d < 140 && (!next || d < next.d)) next = { d: d, r: r, kind: 'rail' }; });
      var side = function (v) { return Math.abs(v) < 3 ? 'in the middle' : v > 0 ? 'on the right' : 'on the left'; };
      if (next && next.kind === 'kick') return 'Kicker in ' + Math.round(next.d) + ' m ' + side(next.k.v) + ': hit it straight and fast (' + K.tuck + '), then ' + K.grab + ' or ' + K.spin + ' to spin. Stop spinning early so you land straight.';
      if (next && next.kind === 'rail') return 'Rail in ' + Math.round(next.d) + ' m ' + side(next.r.v) + ': ride onto it with speed for a Boardslide, then ' + K.jump + ' to pop off. Rail points count once you land.';
    }
    if (p.combo > 1 && p.comboT > 0) return 'Combo x' + Math.min(5, p.combo) + ' is live for ' + p.comboT.toFixed(1) + ' s: land another trick to keep it.';
    return 'Tuck (' + K.tuck + ') on the straights, and chain tricks within 3.5 s to build the combo up to x5.';
  }

  /* ---------- trick tutorial: coach marks that finish when you do the move ---------- */
  var coach = null, coachStep = -1, coachBase = 0, coachDoneT = 0, coachLoaded = false;
  var STEPS = [
    { t: 'Carve', d: isTouch ? 'Drag the thumb pad left and right to carve.' : 'Carve with <kbd>A</kbd><kbd>D</kbd> or <kbd>←</kbd><kbd>→</kbd>.', done: function (p) { return Math.abs(p.edge) > 0.55; } },
    { t: 'Tuck', d: isTouch ? 'Push the thumb pad up to tuck for speed.' : 'Hold <kbd>W</kbd> or <kbd>↑</kbd> to tuck for speed.', done: function (p) { return p.tuck > 0.6; } },
    { t: 'Ollie', d: isTouch ? 'Hold JUMP to crouch, let go to pop.' : 'Hold <kbd>Space</kbd> to crouch, release to pop.', done: function (p) { if (p.jumpHeld || p.charge > 0.1) coachLoaded = true; return coachLoaded && !p.grounded && !p.grind && p.crashT <= 0; } },
    { t: 'First trick', d: isTouch ? 'Ollie or take a kicker (the first is at 90 m). In the air hold GRAB, or push the pad sideways to spin. Land straight!' : 'Ollie or take a kicker (the first is at 90 m). In the air hold <kbd>J</kbd> to grab, or <kbd>←</kbd><kbd>→</kbd> to spin. Land straight!', done: function (p) { return p.score > coachBase; } },
    { t: 'Boost', d: isTouch ? 'Tricks fill the boost meter. Tap BOOST to burn it.' : 'Tricks fill the boost meter. Hold <kbd>Shift</kbd> to burn it.', done: function (p) { return p.boosting; } },
  ];
  function ensureCoach() {
    if (coach) return coach;
    coach = doc.createElement('div'); coach.className = 'sl-coach'; coach.hidden = true; coach.setAttribute('role', 'status'); coach.setAttribute('aria-live', 'polite');
    coach.innerHTML = '<div class="tx"><div class="st"></div><div class="do"></div></div><button class="btn small" type="button"><span>Skip</span></button>';
    coach.querySelector('button').addEventListener('click', function () { hideCoach(); });
    doc.body.appendChild(coach);
    return coach;
  }
  function showStep(i) {
    var c = ensureCoach(); coachStep = i;
    if (i >= STEPS.length) { c.querySelector('.st').textContent = 'You are ready'; c.querySelector('.do').textContent = 'Beat the three rivals to the finish arch. Tricks score, crashes cost time.'; coachDoneT = Date.now() + 4500; }
    else { c.querySelector('.st').textContent = (i + 1) + ' / ' + STEPS.length + ' · ' + STEPS[i].t; c.querySelector('.do').innerHTML = STEPS[i].d; }
    var p = player(); coachBase = p ? p.score : 0; coachLoaded = false;
    c.hidden = false;
  }
  function hideCoach() { if (coach) coach.hidden = true; coachStep = -1; }
  function startCoach() { try { localStorage.setItem('summitline.coach', '1'); } catch (e) {} showStep(0); }
  function tickCoach() {
    if (coachStep < 0) return;
    var st = gstate(), p = player();
    if (st === 'title' || st === 'results') { hideCoach(); return; }
    if (!p || st !== 'race') return;
    if (coachStep >= STEPS.length) { if (Date.now() > coachDoneT) hideCoach(); return; }
    if (STEPS[coachStep].done(p)) showStep(coachStep + 1);
  }
  function tutorial() {
    if (!G()) return;
    lastState = ''; click('btnRestart');           // a fresh run on the same mountain
    startCoach();
  }

  /* ---------- sound: race music and finish crowd from audio/ (audio.json lists each file's gain) ----------
   * js/audio.js already makes wind, carve, skid, grind, landing and trick sounds and a procedural music loop,
   * so wind_loop and carve_loop are not used. race.mp3 plays under the effects from the countdown to the
   * finish, standing in for the procedural loop (two tracks at different tempos would clash); the loop keeps
   * the title. crowd.mp3 cheers as you cross the finish. Everything plays in the game's own audio context,
   * so its sound button, the arcade's mute and pause all cover it; nothing loads before the game's audio
   * starts on the first tap or key. Music and Effects volumes are saved in localStorage (summitline.volume). */
  var VOL = { music: 0.8, sfx: 1 };
  try { var sv = JSON.parse(localStorage.getItem('summitline.volume') || 'null'); if (sv) { if (sv.music >= 0) VOL.music = +sv.music; if (sv.sfx >= 0) VOL.sfx = +sv.sfx; } } catch (e) {}
  var SA = { a: null, man: null, bufs: {}, loading: {}, track: null, mBus: null, fBus: null, lv: {} };
  function fileGain(p) { return (SA.man && SA.man[p] && +SA.man[p].gain) || 1; }
  function aload(p) {
    if (SA.bufs[p] !== undefined) return Promise.resolve(SA.bufs[p]);
    if (!SA.loading[p]) SA.loading[p] = W.fetch('audio/' + p).then(function (r) { if (!r.ok) throw new Error(p); return r.arrayBuffer(); })
      .then(function (b) {
        // promise form, always caught: a codec-less engine stays silent instead of throwing an uncaught EncodingError
        var dec = null;
        try { dec = SA.a.ctx.decodeAudioData(b); } catch (e) { return null; }
        return Promise.resolve(dec).catch(function () { return null; });
      })
      .then(function (buf) { SA.bufs[p] = buf || null; return SA.bufs[p]; }, function () { SA.bufs[p] = null; return null; });   // a missing file stays silent
    return SA.loading[p];
  }
  function level(bus, k, v) { if (bus && SA.lv[k] !== v) { SA.lv[k] = v; try { bus.gain.setTargetAtTime(v, SA.a.ctx.currentTime, 0.08); } catch (e) {} } }
  // The game's audio graph is effects -> compressor -> master and music -> compressor -> master. Split it
  // into an Effects bus and a Music bus in front of the master so each has its own volume.
  function adopt(a) {
    if (SA.a === a || !a || !a.ctx || !a.master) return;
    SA.a = a;
    var c = a.ctx; SA.mBus = c.createGain(); SA.fBus = c.createGain();
    SA.mBus.connect(a.master); SA.fBus.connect(a.master);
    try { if (a.comp && a.music && a.music.out) { a.comp.disconnect(); a.comp.connect(SA.fBus); a.music.out.disconnect(); a.music.out.connect(SA.mBus); } } catch (e) {}
    if (W.fetch) W.fetch('audio/audio.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
      .then(function (m) { SA.man = (m && m.files) || {}; aload('music/race.mp3'); aload('sfx/crowd.mp3'); });
  }
  function raceTrack(want) {
    var a = SA.a; if (!a) return false;
    var p = 'music/race.mp3', t = a.ctx.currentTime, cur = SA.track, buf = SA.bufs[p];
    if (want && !cur && buf) {
      var s = a.ctx.createBufferSource(), g = a.ctx.createGain();
      s.buffer = buf; s.loop = true; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.55 * fileGain(p), t + 1);
      s.connect(g); g.connect(SA.mBus); s.start(t); SA.track = { s: s, g: g };
    } else if (!want && cur) {
      try { cur.g.gain.cancelScheduledValues(t); cur.g.gain.setValueAtTime(cur.g.gain.value, t); cur.g.gain.linearRampToValueAtTime(0, t + 1); cur.s.stop(t + 1.05); } catch (e) {}
      SA.track = null;
    }
    return !!SA.track;
  }
  function crowd() {
    var a = SA.a, buf = SA.bufs['sfx/crowd.mp3']; if (!a || !buf) return;
    var s = a.ctx.createBufferSource(), g = a.ctx.createGain(); s.buffer = buf; g.gain.value = fileGain('sfx/crowd.mp3');
    s.connect(g); g.connect(SA.fBus); s.start();
  }
  import('./js/audio.js').then(function (m) {
    var P = m && m.Audio && m.Audio.prototype; if (!P || typeof P.update !== 'function' || P.__arcadeHooks) return;
    P.__arcadeHooks = true;
    var update = P.update;
    P.update = function (st) {          // runs every frame from the game loop
      try {
        adopt(this);
        var g = gstate(), racing = g === 'countdown' || g === 'race' || g === 'finish';
        level(SA.mBus, 'm', VOL.music); level(SA.fBus, 'f', VOL.sfx);
        if (raceTrack(racing) && st) st = Object.assign({}, st, { musicOn: false });   // the race track stands in for the loop
      } catch (e) {}
      return update.call(this, st);
    };
  }).catch(function () {});
  function setVolume(k, v) { VOL[k] = v; try { localStorage.setItem('summitline.volume', JSON.stringify(VOL)); } catch (e) {} level(SA.mBus, 'm', VOL.music); level(SA.fBus, 'f', VOL.sfx); }

  /* ---------- Music and Effects sliders in the arcade's How to play panel ---------- */
  var volCss = doc.createElement('style');
  volCss.textContent = '#arcade-sdk .arc-vol{margin:6px 0 10px;text-align:left}#arcade-sdk .arc-vol label{display:flex;align-items:center;gap:12px;font-weight:800;font-size:14px;margin:2px 0}' +
    '#arcade-sdk .arc-vol label span{width:64px}#arcade-sdk .arc-vol input{flex:1;min-height:40px;border:0;padding:0;accent-color:#23b04b;background:none}';
  (doc.head || doc.body).appendChild(volCss);
  function addSliders() {
    var m = $('arcade-sdk'), c = m && m.classList.contains('on') && m.querySelector('.c'), h = c && c.querySelector('h2');
    if (!h || h.textContent !== 'How to play' || c.querySelector('.arc-vol')) return;
    var box = doc.createElement('div'); box.className = 'arc-vol';
    [['music', 'Music'], ['sfx', 'Effects']].forEach(function (k) {
      var lab = doc.createElement('label'), sp = doc.createElement('span'), inp = doc.createElement('input');
      sp.textContent = k[1]; inp.type = 'range'; inp.min = '0'; inp.max = '100'; inp.value = String(Math.round(VOL[k[0]] * 100));
      inp.setAttribute('aria-label', k[1] + ' volume');
      inp.addEventListener('input', function () { setVolume(k[0], +inp.value / 100); });
      lab.appendChild(sp); lab.appendChild(inp); box.appendChild(lab);
    });
    c.insertBefore(box, c.querySelector('[data-a="tutorial"]') || c.querySelector('[data-a="back"]'));
  }
  if (W.MutationObserver) {   // the arcade menu is built on first use; watch it (not the whole page) once it exists
    var menuWatch = new MutationObserver(addSliders), bodyWatch = new MutationObserver(function () {
      var m = $('arcade-sdk'); if (m) { bodyWatch.disconnect(); menuWatch.observe(m, { childList: true }); addSliders(); }
    });
    bodyWatch.observe(doc.body, { childList: true });
  }

  /* ---------- the game's Controls panel: trick list and sound sliders ---------- */
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function enrichHelp() {
    var help = $('help'), grid = help && help.querySelector('.help-grid'); if (!grid || grid.querySelector('.sl-tricks')) return;
    var col = doc.createElement('div'); col.className = 'help-col sl-tricks';
    col.innerHTML = '<h3><svg class="ic"><use href="#i-trophy"/></svg>Tricks</h3><dl>' +
      TRICKS.map(function (t) { return '<dt>' + esc(t.name) + '</dt><dd>' + esc(t.input) + '</dd>'; }).join('') + '</dl>';
    var snd = doc.createElement('div'); snd.className = 'help-col sl-vol';
    snd.innerHTML = '<h3><svg class="ic"><use href="#i-vol"/></svg>Sound</h3>';
    var inputs = {};
    [['music', 'Music'], ['sfx', 'Effects']].forEach(function (k) {
      var lab = doc.createElement('label'), sp = doc.createElement('span'), inp = doc.createElement('input');
      sp.textContent = k[1]; inp.type = 'range'; inp.min = '0'; inp.max = '100'; inp.setAttribute('aria-label', k[1] + ' volume');
      inp.addEventListener('input', function () { setVolume(k[0], +inp.value / 100); });
      lab.appendChild(sp); lab.appendChild(inp); snd.appendChild(lab); inputs[k[0]] = inp;
    });
    grid.appendChild(col); grid.appendChild(snd);
    var sync = function () { inputs.music.value = String(Math.round(VOL.music * 100)); inputs.sfx.value = String(Math.round(VOL.sfx * 100)); };
    sync(); if (W.MutationObserver) new MutationObserver(sync).observe(help, { attributes: true, attributeFilter: ['class'] });
  }
  enrichHelp();

  /* ---------- scenes ---------- */
  function watch() {
    var st = gstate();
    if (G()) hookPlayer();
    syncMode();
    if (st !== lastState) {
      if (st === 'title') SDK.state({ scene: 'title' });
      else if (st === 'countdown') {
        SDK.state({ scene: 'play' });
        var seen = '1'; try { seen = localStorage.getItem('summitline.coach'); } catch (e) {}
        if (!seen && coachStep < 0) startCoach();
      } else if (st === 'finish') crowd();
      else if (st === 'results') {
        var p = player() || {}, place = parseInt(($('resPlace') || {}).textContent, 10) || null;
        SDK.state({ scene: 'over', score: p.score || 0, level: CAREER.lvl, stars: CAREER.stars, time: p.finishTime, place: place, rank: ($('resRank') || {}).textContent, codes: !!SDK.cheated });
      }
      lastState = st;
    }
    tickCoach();
  }
  W.setInterval(watch, 120);

  /* ---------- init ---------- */
  SDK.init({
    orientation: 'landscape',   // a sideways racer: phones held upright get the turn-sideways card
    ownPauseUI: false,              // switched by syncMode (see above)
    onPause: onPause,
    onResume: onResume,
    onRestart: restart,
    onExit: exitToTitle,
    onTutorial: tutorial,
    onHint: hint,
    onCheat: cheat,
    tricks: TRICKS,
  });

  /* ---------- career: levels, stars, coins, skins, a daily challenge and badges ----------
   * Saved in summitline.career. The title shows the circuit strip (level + XP bar, stars, coins,
   * the daily goal, a Skins shop); the results panel shows what a run earned. Skins re-colour the
   * player's jacket, helmet and goggle lens before the riders are built. */
  var CAREER = {
    lvl: 1, xp: 0, stars: 0, coins: 0, races: 0, wins: 0, podiums: 0, bestScore: 0,
    skins: { owned: ['ember'], cur: 'ember' },
    daily: { d: '', kind: 0, prog: 0, done: false, streak: 0 },
    ach: {},
  };
  try { var savedC = JSON.parse(localStorage.getItem('summitline.career') || 'null'); if (savedC) { for (var k in CAREER) if (savedC[k] !== undefined) CAREER[k] = savedC[k]; } } catch (e) {}
  function saveCareer() { try { localStorage.setItem('summitline.career', JSON.stringify(CAREER)); } catch (e) {} }
  saveCareer();   // written at boot too: the save exists even before the first race finishes
  var SKINS = [
    { id: 'ember',   name: 'Ember',   cost: 0,    jacket: 0xff5a1f, jacket2: 0x16213a, helmet: 0xf2f4f7, lens: 0xff8a1a, gaiter: 0x2a3a52 },
    { id: 'glacier', name: 'Glacier', cost: 300,  jacket: 0x9fdcff, jacket2: 0x123a5e, helmet: 0xeaf6ff, lens: 0x2f8cff, gaiter: 0x123a5e },
    { id: 'toxic',   name: 'Toxic',   cost: 600,  jacket: 0xa6ff3d, jacket2: 0x1c2a10, helmet: 0x14161a, lens: 0x7cff3d, gaiter: 0x33511a },
    { id: 'royal',   name: 'Royal',   cost: 1000, jacket: 0x8b4dff, jacket2: 0xffd35a, helmet: 0xffd35a, lens: 0xff3d9a, gaiter: 0x4a2a80 },
  ];
  function curSkin() { var s = SKINS.find(function (x) { return x.id === CAREER.skins.cur; }); return s || SKINS[0]; }
  function applySkin() {
    var s = curSkin();
    import('./js/rider.js').then(function (m) {
      var p = m.PALETTES && m.PALETTES.player; if (!p) return;
      p.jacket = s.jacket; p.jacket2 = s.jacket2; p.helmet = s.helmet; p.lens = s.lens; p.gaiter = s.gaiter;
    }).catch(function () {});
  }
  applySkin();
  function xpNeed(l) { return 220 + (l - 1) * 140; }
  function addXp(n) {
    CAREER.xp += n; var ups = 0;
    while (CAREER.xp >= xpNeed(CAREER.lvl)) { CAREER.xp -= xpNeed(CAREER.lvl); CAREER.lvl++; ups++; }
    if (ups) unlockAch('level5', CAREER.lvl >= 5, 'Rider level 5');
    return ups;
  }
  function unlockAch(id, cond, title) {
    if (!cond || CAREER.ach[id]) return false;
    CAREER.ach[id] = 1; saveCareer();
    try { SDK.profile && SDK.profile.achievement('sl-' + id, { title: title, desc: title, tier: 'silver' }); } catch (e) {}
    return true;
  }
  var DAILY_GOALS = ['Finish a race', 'Finish 1st or 2nd', 'Score 4,000+ trick points'];
  function todayKey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function rollDaily() {
    var t = todayKey(); if (CAREER.daily.d === t) return;
    var seed = 0; for (var i = 0; i < t.length; i++) seed = (seed * 31 + t.charCodeAt(i)) >>> 0;
    CAREER.daily = { d: t, kind: seed % DAILY_GOALS.length, prog: 0, done: false, streak: CAREER.daily.streak || 0 };
    saveCareer();
  }
  function tickDaily(place, score, finished) {
    rollDaily();
    if (CAREER.daily.done || !finished) return;
    if (CAREER.daily.kind === 0) CAREER.daily.prog = 1;
    else if (CAREER.daily.kind === 1 && place <= 2) CAREER.daily.prog = 1;
    else if (CAREER.daily.kind === 2 && score >= 4000) CAREER.daily.prog = 1;
    if (CAREER.daily.prog >= 1) {
      CAREER.daily.done = true; CAREER.daily.streak = (CAREER.daily.streak || 0) + 1;
      CAREER.coins += 150; saveCareer();
    }
  }
  function awardRun(place, score) {
    rollDaily();
    var coins = Math.round(score / 50) + [0, 120, 80, 50][Math.min(place, 4)] || 20;
    if (place > 3) coins = Math.round(score / 50) + 20;
    var stars = place === 1 ? 3 : place === 2 ? 2 : place === 3 ? 1 : 0;
    var xp = Math.round(score / 100) + (4 - Math.min(place, 4)) * 20;
    CAREER.races++; if (place === 1) CAREER.wins++; if (place <= 3) CAREER.podiums++;
    if (score > CAREER.bestScore && !SDK.cheated) CAREER.bestScore = score;
    CAREER.coins += SDK.cheated ? 0 : coins;
    CAREER.stars += SDK.cheated ? 0 : stars;
    var ups = SDK.cheated ? 0 : addXp(xp);
    tickDaily(place, score, true);
    unlockAch('firstwin', place === 1 && !SDK.cheated, 'First victory');
    unlockAch('podium5', CAREER.podiums >= 5, 'Five podiums');
    unlockAch('score8k', score >= 8000, '8,000 trick points in one run');
    saveCareer();
    return { coins: SDK.cheated ? 0 : coins, stars: SDK.cheated ? 0 : stars, xp: SDK.cheated ? 0 : xp, ups: ups };
  }

  /* ---------- career UI: title circuit strip + results earnings + skins shop ---------- */
  var cCss = doc.createElement('style');
  cCss.textContent =
    '#circuit{margin:10px auto 0;max-width:340px;display:flex;flex-direction:column;gap:8px;font-family:var(--font)}' +
    '#circuit .rowline{display:flex;align-items:center;gap:10px;font-weight:800;font-size:14px;letter-spacing:.02em;color:#fff}' +
    '#circuit .lvl{font:800 italic 15px/1 var(--cond);letter-spacing:.06em;text-transform:uppercase;color:#0b1a30;background:linear-gradient(100deg,var(--accent2),#ffe08a);padding:6px 10px;border-radius:5px;transform:skewX(-8deg)}' +
    '#circuit .xpbar{flex:1;height:9px;border-radius:5px;background:#12233d;border:1px solid #2c4a74;overflow:hidden}' +
    '#circuit .xpbar i{display:block;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:5px;transition:width .5s}' +
    '#circuit .pill{font-size:13px;min-height:26px;display:flex;align-items:center;gap:4px;color:#dfeaff;background:#12233dbf;border:1px solid #2c4a74;border-radius:99px;padding:4px 11px}' +
    '#circuit .daily{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;color:#ffe08a}' +
    '#circuit .daily.done{color:#8dffb0}' +
    '.sl-skins{display:none;flex-wrap:wrap;gap:8px;justify-content:center}' +
    '.sl-skins.open{display:flex}' +
    '.sl-skins button{font:700 13px var(--font);color:#fff;background:#12233dcc;border:1.5px solid #2c4a74;border-radius:99px;padding:9px 14px;min-height:40px;cursor:pointer;touch-action:manipulation}' +
    '.sl-skins button .dot{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:6px;vertical-align:-1px}' +
    '.sl-skins button.on{border-color:var(--accent);background:var(--accent);color:#0b1a30}' +
    '.sl-earn{margin:12px 0 0;font-weight:800;font-size:14px;color:#33455e;text-align:center}' +
    '.sl-earn b{color:var(--ink)}' +
    '@media (prefers-reduced-motion:reduce){#circuit .xpbar i{transition:none}}';
  (doc.head || doc.body).appendChild(cCss);
  function fmt(n) { return n.toLocaleString('en-GB'); }
  var circuit = null, shop = null;
  function ensureCircuit() {
    if (circuit) return circuit;
    circuit = doc.createElement('div'); circuit.id = 'circuit';
    circuit.innerHTML =
      '<div class="rowline"><span class="lvl">Rider LV <b class="lv">1</b></span><span class="xpbar"><i></i></span></div>' +
      '<div class="rowline"><span class="pill">★ <b class="st">0</b></span><span class="pill">🪙 <b class="co">0</b></span>' +
      '<span class="pill daily"></span></div>' +
      '<button type="button" class="pill skins-btn" style="cursor:pointer;width:100%;justify-content:center">🎨 Skins &amp; board wax</button>' +
      '<div class="sl-skins"></div>';
    var best = $('bestLbl'); if (best && best.parentNode) best.parentNode.insertBefore(circuit, best); else doc.body.appendChild(circuit);
    shop = circuit.querySelector('.sl-skins');
    circuit.querySelector('.skins-btn').addEventListener('click', function () { shop.classList.toggle('open'); renderShop(); });
    return circuit;
  }
  function renderShop() {
    if (!shop) return;
    shop.innerHTML = SKINS.map(function (s) {
      var owned = CAREER.skins.owned.indexOf(s.id) >= 0, on = CAREER.skins.cur === s.id;
      var label = on ? s.name + ' ✓' : owned ? s.name : s.name + ' · 🪙 ' + s.cost;
      return '<button type="button" data-skin="' + s.id + '" class="' + (on ? 'on' : '') + '"' + (owned ? '' : '') + '><span class="dot" style="background:#' + s.jacket.toString(16).padStart(6, '0') + '"></span>' + label + '</button>';
    }).join('');
    shop.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        var s = SKINS.find(function (x) { return x.id === b.getAttribute('data-skin'); }); if (!s) return;
        var owned = CAREER.skins.owned.indexOf(s.id) >= 0;
        if (!owned) { if (CAREER.coins < s.cost) return; CAREER.coins -= s.cost; CAREER.skins.owned.push(s.id); }   // buy: coins are spent
        CAREER.skins.cur = s.id; saveCareer(); applySkin(); renderShop(); renderCircuit();
      });
    });
  }
  function renderCircuit() {
    var c = ensureCircuit();
    c.querySelector('.lv').textContent = CAREER.lvl;
    c.querySelector('.xpbar i').style.width = Math.min(100, CAREER.xp / xpNeed(CAREER.lvl) * 100).toFixed(1) + '%';
    c.querySelector('.st').textContent = CAREER.stars;
    c.querySelector('.co').textContent = fmt(CAREER.coins);
    var d = c.querySelector('.daily');
    d.textContent = (CAREER.daily.done ? 'Daily done · ' : 'Daily: ') + DAILY_GOALS[CAREER.daily.kind] + (CAREER.daily.done ? ' ✓' : '');
    d.classList.toggle('done', !!CAREER.daily.done);
    if (shop && shop.classList.contains('open')) renderShop();
  }
  renderCircuit();
  var lastTitlePaint = '';
  var circuitWatch = W.setInterval(function () {
    var st = gstate();
    var want = st === 'title' || st === 'results' ? '' : 'none';
    if (want !== lastTitlePaint) { lastTitlePaint = want; var c = ensureCircuit(); c.style.display = want; }
    if (st === 'title') { rollDaily(); renderCircuit(); }
  }, 400);

  /* ---------- results: earnings line + level/star reporting ---------- */
  var resObserved = null;
  var resultsWatch = W.setInterval(function () {
    var st = gstate(); if (st !== 'results') { resObserved = null; return; }
    var p = player(); if (!p || resObserved === p) return;
    resObserved = p;
    var place = parseInt(($('resPlace') || {}).textContent, 10) || 4;
    var score = p.score || 0;
    var earn = awardRun(place, score);
    var box = doc.createElement('p'); box.className = 'sl-earn';
    var skinNext = SKINS.find(function (s) { return CAREER.skins.owned.indexOf(s.id) < 0; });
    box.innerHTML = '+<b>' + earn.xp + ' XP</b> · 🪙 +<b>' + earn.coins + '</b> · ★ +<b>' + earn.stars + '</b>' +
      (earn.ups ? ' · <b>Level up!</b> Now LV ' + CAREER.lvl : '') +
      (skinNext ? '<br>Next unlock: ' + skinNext.name + ' kit · 🪙 ' + skinNext.cost : '');
    var panel = $('results') && $('results').querySelector('.panel');
    if (panel && !panel.querySelector('.sl-earn')) panel.insertBefore(box, panel.querySelector('.menu'));
    else if (panel) panel.querySelector('.sl-earn').outerHTML = box.outerHTML;
    renderCircuit();
  }, 300);

  /* ---------- race HUD: a small level chip next to the trick score ---------- */
  var hudChip = null;
  var hudWatch = W.setInterval(function () {
    var st = gstate(); if (st !== 'race' && st !== 'countdown') return;
    if (!hudChip) {
      var hud = $('hud'); if (!hud) return;
      hudChip = doc.createElement('div');
      hudChip.style.cssText = 'position:absolute;top:calc(52px + env(safe-area-inset-top,0px));right:14px;font:800 italic 14px var(--cond);letter-spacing:.06em;color:#fff;background:#12233dbf;border:1px solid #2c4a74;border-radius:99px;padding:5px 10px';
      hud.appendChild(hudChip);
    }
    hudChip.textContent = 'LV ' + CAREER.lvl + ' · ★ ' + CAREER.stars + ' · 🪙 ' + CAREER.coins;
  }, 500);
})();

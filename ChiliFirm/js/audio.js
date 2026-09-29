/* ============================================================
   Chili Firm 2 — sound. Synthesized WebAudio SFX and a lo-fi
   boom-bap loop, plus the recorded pack in audio/ (music, Tito's
   voice lines and a few effects), which is used when its files
   load and falls back to the synth when they don't. Nothing plays
   or loads before the first user gesture.
   ============================================================ */
(function (global) {
  'use strict';

  let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let gestured = false;
  const vol = { music: 1, sfx: 1 };   // the player's Music and Effects sliders (Settings), 0..1

  function ensure() {
    if (!gestured) return null;
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.26 * vol.sfx; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.0; musicBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  if (typeof document !== 'undefined') {
    const g = () => { const first = !gestured; gestured = true; ensure(); if (wantMusic && first) music(true); };
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, g, { capture: true }));
  }

  function tone(freq, dur, type, vol, when, slide, bus) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + (when || 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(dur, vol, when, fType, fFreq, bus, t0abs) {
    const c = ensure();
    if (!c) return;
    const t0 = t0abs != null ? t0abs : c.currentTime + (when || 0);
    const s = c.createBufferSource(); s.buffer = noiseBuf;
    const f = c.createBiquadFilter(); f.type = fType || 'highpass'; f.frequency.value = fFreq || 6000;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus);
    s.start(t0); s.stop(t0 + dur + 0.02);
  }

  function enabled() {
    const L = global.CF;
    if (!L || !L.state) return true;
    return !!(L.state.settings && L.state.settings.sound);
  }
  const on = f => function () { if (enabled() && ensure()) f.apply(null, arguments); };

  const sfx = {
    click: on(() => tone(720, 0.05, 'square', 0.05)),
    pop: on(() => { tone(520, 0.08, 'sine', 0.16, 0, 1100); }),
    blip: on(() => tone(880 + Math.random() * 120, 0.03, 'square', 0.025)),
    plant: on(() => { noise(0.08, 0.12, 0, 'lowpass', 900); tone(240, 0.1, 'sine', 0.14, 0.02, 420); }),
    water: on(() => { tone(600, 0.08, 'sine', 0.1, 0, 900); tone(820, 0.08, 'sine', 0.08, 0.06, 1200); noise(0.12, 0.05, 0, 'bandpass', 3000); }),
    harvest: on(() => { tone(660, 0.08, 'triangle', 0.14); tone(990, 0.12, 'triangle', 0.14, 0.06); noise(0.06, 0.06, 0, 'highpass', 5000); }),
    coin: on(() => { tone(1320 + Math.random() * 200, 0.07, 'square', 0.045); tone(1980, 0.09, 'square', 0.035, 0.035); }),
    cash: on(() => { noise(0.05, 0.14, 0, 'highpass', 4000); tone(1568, 0.08, 'square', 0.07, 0.03); tone(2093, 0.18, 'square', 0.07, 0.09); tone(196, 0.12, 'triangle', 0.12, 0); }),
    buy: on(() => { tone(392, 0.07, 'triangle', 0.12); tone(523, 0.07, 'triangle', 0.12, 0.06); tone(784, 0.14, 'triangle', 0.12, 0.12); }),
    error: on(() => { tone(180, 0.14, 'sawtooth', 0.08); tone(130, 0.18, 'sawtooth', 0.07, 0.05); }),
    ach: on(() => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, i * 0.08))),
    fanfare: on(() => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.24, 'triangle', 0.12, i * 0.1))),
    levelup: on(() => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'square', 0.06, i * 0.09)); [1047, 1319, 1568].forEach((f, i) => tone(f, 0.4, 'triangle', 0.1, 0.4 + i * 0.05)); }),
    story: on(() => { tone(523, 0.12, 'sine', 0.09); tone(784, 0.16, 'sine', 0.08, 0.1); }),
    event: on(() => { tone(300, 0.1, 'sawtooth', 0.08); tone(450, 0.14, 'sawtooth', 0.08, 0.09); tone(600, 0.2, 'sawtooth', 0.06, 0.18); }),
    open: on(() => { tone(300, 0.12, 'sine', 0.12, 0, 700); }),
    close: on(() => { tone(600, 0.1, 'sine', 0.1, 0, 260); }),
    whoosh: on(() => noise(0.25, 0.12, 0, 'bandpass', 1200)),
    knock: on(() => { tone(160, 0.06, 'sine', 0.25, 0, 90); tone(160, 0.06, 'sine', 0.25, 0.14, 90); }),
  };

  /* ---------- lo-fi boom-bap (88 bpm, 16 steps) ---------- */
  let wantMusic = false, musicTimer = null, nextStep = 0, step = 0;
  const BPM = 88, STEP = 60 / BPM / 4;
  const KICK = [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0];
  const SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1];
  const HAT = [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1];
  const CHORDS = [[220, 261.6, 329.6, 392], [174.6, 220, 261.6, 329.6], [196, 246.9, 293.7, 349.2], [164.8, 207.7, 246.9, 329.6]];
  const BASS = [110, 87.3, 98, 82.4];
  let bar = 0;
  function schedule() {
    const c = ctx;
    if (!c) return;
    while (nextStep < c.currentTime + 0.25) {
      const t = nextStep + (step % 2 ? STEP * 0.12 : 0); // swing
      if (KICK[step]) { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.32); }
      if (SNARE[step]) { noise(0.16, 0.35, 0, 'bandpass', 1800, musicBus, t); const o = c.createOscillator(), g = c.createGain(); o.frequency.value = 190; g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.12); }
      if (HAT[step]) noise(step % 4 === 2 ? 0.07 : 0.035, 0.12, 0, 'highpass', 7500, musicBus, t);
      if (step === 0 || step === 8) {
        const ch = CHORDS[bar % 4];
        ch.forEach((f, i) => {
          const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
          o.type = 'triangle'; o.frequency.value = f * (step === 8 ? 1 : 1); lp.type = 'lowpass'; lp.frequency.value = 1400;
          g.gain.setValueAtTime(0.0001, t + i * 0.012); g.gain.exponentialRampToValueAtTime(0.07, t + 0.03 + i * 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 7.5);
          o.connect(lp); lp.connect(g); g.connect(musicBus); o.start(t); o.stop(t + STEP * 8);
        });
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = BASS[bar % 4] / 2;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 6);
        o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + STEP * 7);
      }
      nextStep += STEP;
      step = (step + 1) % 16;
      if (step === 0) bar++;
    }
  }
  function startMusic() {
    const c = ensure();
    if (!c || musicTimer) return;
    nextStep = c.currentTime + 0.1; step = 0;
    musicBus.gain.cancelScheduledValues(c.currentTime);
    musicBus.gain.setTargetAtTime(0.16 * vol.music, c.currentTime, 0.6);
    musicTimer = setInterval(schedule, 90);
  }
  function stopMusic() {
    if (!ctx || !musicTimer) return;
    musicBus.gain.setTargetAtTime(0.0, ctx.currentTime, 0.2);
    const t = musicTimer; musicTimer = null;
    setTimeout(() => clearInterval(t), 600);
  }
  /* ============================================================
     Recorded pack (audio/, see audio/AUDIO.md). HTMLAudio, so it also
     plays when the game is opened straight from disk. Level = the
     file's loudness gain (audio/audio.json) x a base level x the
     player's Music or Effects slider, never over 1. Files load only
     when first needed; a file that fails is marked bad and the synth
     (or silence, for voice) takes over.
     ============================================================ */
  const HAS_DOM = typeof document !== 'undefined' && typeof global.Audio !== 'undefined';
  const GAIN = { 'music/theme': 0.324, 'music/rush': 0.263, 'sfx/bell': 0.785, 'sfx/flame': 0.692, 'sfx/grow_hum': 2.042,
    'sfx/pluck': 2.884, 'sfx/register': 1.549, 'sfx/sizzle': 0.891, 'sfx/water': 0.871 };
  const BASE = { sfx: 0.34, voice: 0.45, music: 0.4, hum: 0.1 };
  // Tito Scorch's lines: [text, loudness gain]
  const LINES = {
    1: ['Yo! Welcome to Scorch Farms!', 1.622], 2: ['Plant it, water it, watch it grow. Let\u2019s get spicy!', 1.549],
    3: ['Those peppers are looking hot!', 1.622], 4: ['Harvest time, let\u2019s go!', 1.479], 5: ['Fresh batch, fresh cash!', 1.096],
    6: ['Ooh, a customer! Show them the heat!', 1.514], 7: ['Sold! Scorch Farms, baby!', 1.549],
    8: ['New grow light? Now we\u2019re cooking!', 1.445], 9: ['Level up! The empire grows!', 1.585],
    10: ['Don\u2019t let them dry out. Water those pots!', 1.396], 11: ['Grandma Rosa would be proud.', 1.445],
    12: ['That\u2019s a Carolina Reaper. Handle with care!', 1.718], 13: ['Hire a crew. Work smarter, not harder!', 1.479],
    14: ['We\u2019re on fire today! Not literally. Okay, a little.', 2.018] };
  const VOL_KEY = 'chili_firm2_audio';
  const bad = {};
  const clamp01 = v => Math.max(0, Math.min(1, +v || 0));
  const nowS = () => Date.now() / 1000;
  try { const v = JSON.parse(global.localStorage.getItem(VOL_KEY)); if (v) { if (v.music != null) vol.music = clamp01(v.music); if (v.sfx != null) vol.sfx = clamp01(v.sfx); } } catch (e) { /* no storage */ }

  function setVolume(kind, v) {
    if (kind !== 'music' && kind !== 'sfx') return;
    vol[kind] = clamp01(v);
    try { global.localStorage.setItem(VOL_KEY, JSON.stringify(vol)); } catch (e) { /* no storage */ }
    if (ctx) { sfxBus.gain.value = 0.26 * vol.sfx; if (musicTimer) musicBus.gain.setTargetAtTime(0.16 * vol.music, ctx.currentTime, 0.1); }
    for (const n in tracks) if (tracks[n]) tracks[n].el.volume = tracks[n].fade * musicLevel(n);
    if (hum) hum.volume = humLevel();
  }

  /* ---------- effects: a small pool per file so a swipe of harvests can overlap ---------- */
  const pools = {};
  function playFile(name, level) {
    if (!HAS_DOM || !gestured || bad[name]) return false;
    const pool = pools[name] || (pools[name] = []);
    let el = pool.find(a => a.paused || a.ended);
    if (!el && pool.length < 3) {
      el = new global.Audio(); el.preload = 'auto';
      el.addEventListener('error', () => { bad[name] = true; });
      el.src = 'audio/' + name + '.mp3';
      pool.push(el);
    }
    if (!el) el = pool[0];
    try { el.currentTime = 0; } catch (e) { /* not loaded yet */ }
    el.volume = Math.min(1, level * GAIN[name]);
    const p = el.play(); if (p && p.catch) p.catch(() => {});
    return true;
  }
  const fxLevel = () => BASE.sfx * vol.sfx;
  const synth = Object.assign({}, sfx);
  const FILE_FX = { water: 'sfx/water', harvest: 'sfx/pluck', cash: 'sfx/register', knock: 'sfx/bell' };
  Object.keys(FILE_FX).forEach(k => {
    sfx[k] = function () {
      if (enabled() && !playFile(FILE_FX[k], fxLevel())) synth[k]();
      moment(k);
    };
  });
  ['levelup', 'ach'].forEach(k => { sfx[k] = function () { synth[k](); moment(k); }; });
  sfx.sizzle = () => { if (enabled()) playFile('sfx/sizzle', fxLevel()); };
  sfx.flame = () => { if (enabled()) playFile('sfx/flame', fxLevel()); };

  /* ---------- music: theme in normal play, rush when the shop is busy, 1 s crossfades ---------- */
  const tracks = { theme: null, rush: null };
  let current = 'theme', fadeTimer = null;
  const musicLevel = n => Math.min(1, BASE.music * GAIN['music/' + n] * vol.music);
  const filesMusic = () => HAS_DOM && !bad['music/theme'];
  function track(n) {
    if (!tracks[n]) {
      const el = new global.Audio(); el.loop = true; el.preload = 'auto'; el.volume = 0;
      el.addEventListener('error', () => {
        bad['music/' + n] = true;
        if (n === 'theme') { for (const k in tracks) if (tracks[k]) tracks[k].el.pause(); if (wantMusic) startMusic(); }
        else { current = 'theme'; kick(); }
      });
      el.src = 'audio/music/' + n + '.mp3';
      tracks[n] = { el, fade: 0 };
    }
    return tracks[n];
  }
  function fadeStep() {
    let moving = false;
    for (const n in tracks) {
      const tr = tracks[n];
      if (!tr) continue;
      const goal = wantMusic && gestured && n === current && !bad['music/' + n] ? 1 : 0;
      if (tr.fade !== goal) { tr.fade = goal > tr.fade ? Math.min(goal, tr.fade + 0.05) : Math.max(goal, tr.fade - 0.05); moving = true; }
      tr.el.volume = tr.fade * musicLevel(n);
      if (tr.fade === 0 && !tr.el.paused) tr.el.pause();
      else if (tr.fade > 0 && tr.el.paused && !tr.starting) {
        tr.starting = true;
        const p = tr.el.play(); const done = () => { tr.starting = false; };
        if (p && p.then) p.then(done, done); else done();
      }
    }
    if (!moving) { clearInterval(fadeTimer); fadeTimer = null; }
  }
  function kick() { if (!fadeTimer) fadeTimer = setInterval(fadeStep, 50); }
  function music(onOff) {
    wantMusic = !!onOff;
    if (!filesMusic()) { if (wantMusic) startMusic(); else stopMusic(); return; }
    stopMusic();
    if (wantMusic && gestured) track(current);
    kick();
  }
  function setTrack(n) {
    if (bad['music/' + n]) n = 'theme';
    if (n === current) return;
    current = n;
    if (filesMusic() && wantMusic && gestured) { track(n); kick(); }
  }

  /* ---------- Tito's voice: one line every 25 s at most, never the same twice running.
     The line also shows in his speech bubble, so it reads with the sound off. A line that
     comes up while a panel or story box is open waits for it to close (important ones only). ---------- */
  const VO = { last: -1e9, lastId: 0, pending: null };
  function uiFree() {
    const ui = global.CF && global.CF.ui;
    return !!(ui && ui.started && !ui.panel && !ui.dialog);
  }
  function voice(ids, important) {
    ids = ids.filter(i => i !== VO.lastId);
    if (!ids.length) return;
    const id = ids[Math.floor(Math.random() * ids.length)];
    if (uiFree() && nowS() - VO.last >= 25) speak(id);
    else if (important) VO.pending = { id, at: nowS() };
  }
  function speak(id) {
    const line = LINES[id];
    VO.last = nowS(); VO.lastId = id; VO.pending = null;
    try { global.CF.ui.say(line[0], { pose: 'cheer', ms: 4200 }); } catch (e) { /* no bubble yet */ }
    const name = 'vo/tito_' + (id < 10 ? '0' : '') + id;
    if (!enabled() || !gestured || !HAS_DOM || bad[name]) return;
    const el = new global.Audio();
    el.addEventListener('error', () => { bad[name] = true; });
    el.src = 'audio/' + name + '.mp3';
    el.volume = Math.min(1, BASE.voice * vol.sfx * line[1]);
    const p = el.play(); if (p && p.catch) p.catch(() => {});
  }
  const sales = [];
  function moment(k) {
    if (k === 'harvest') voice([4, 5]);
    else if (k === 'cash') { sales.push(nowS()); voice([7, 5]); }
    else if (k === 'knock') voice([6]);
    else if (k === 'levelup') voice([9], true);
    else if (k === 'ach') voice([11]);
  }

  /* ---------- the grow-light hum: quiet, only with grow lights on screen or the Upgrades panel open ---------- */
  let hum = null;
  const humLevel = () => Math.min(1, BASE.hum * GAIN['sfx/grow_hum'] * vol.sfx);
  function humOn(on) {
    if (on && (!HAS_DOM || bad['sfx/grow_hum'])) return;
    if (on && !hum) {
      hum = new global.Audio(); hum.loop = true; hum.preload = 'auto';
      hum.addEventListener('error', () => { bad['sfx/grow_hum'] = true; });
      hum.src = 'audio/sfx/grow_hum.mp3';
    }
    if (!hum) return;
    hum.volume = humLevel();
    if (on && hum.paused) { const p = hum.play(); if (p && p.catch) p.catch(() => {}); }
    else if (!on && !hum.paused) hum.pause();
  }

  /* ---------- watcher: moments the effects don't mark (welcome, ripe, dry pots, the Reaper, rush) ---------- */
  const W = { welcomed: false, planted: null, ready: null, thirsty: 0, unlocked: null, reaper: null, busyUntil: 0, rush: false };
  function watch() {
    const CF = global.CF;
    if (!CF || !CF.state || !CF.ui) return;
    const s = CF.state, ui = CF.ui, t = nowS();
    if (ui.started && !W.welcomed) { W.welcomed = true; voice([1], true); }
    if (W.planted === 0 && s.stats.planted > 0) voice([2], true);
    W.planted = s.stats.planted;
    let ready = 0, thirsty = 0;
    for (let i = 0; i < s.plotCount; i++) {
      const p = s.plots[i];
      if (p.status === 'ready' || p.status === 'wilted') ready++;
      else if (p.status === 'growing' && p.boostUntil < t) thirsty++;
    }
    if (W.ready === 0 && ready > 0 && ui.started) voice([3]);
    W.ready = ready;
    W.thirsty = thirsty >= 3 ? W.thirsty + 0.5 : 0;
    if (W.thirsty >= 20) { W.thirsty = 0; voice([10]); }
    const un = s.unlocked.length, reaper = s.unlocked.indexOf('reaper') !== -1;
    if (W.unlocked != null && un > W.unlocked) sfx.flame();
    if (W.reaper === false && reaper) voice([12], true);
    W.unlocked = un; W.reaper = reaper;
    // a busy shop: a rush event (heatwave, festival, critic), or a buyer at the door after 3+ sales in 90 s
    while (sales.length && t - sales[0] > 90) sales.shift();
    const ev = s.event && s.event.id;
    if (ev === 'heatwave' || ev === 'festival' || ev === 'critic' || (sales.length >= 3 && ui.visitor && ui.visitor.kind === 'buyer')) W.busyUntil = t + 25;
    const rush = t < W.busyUntil;
    if (rush !== W.rush) { W.rush = rush; setTrack(rush ? 'rush' : 'theme'); if (rush) voice([14]); }
    if (VO.pending && uiFree() && t - VO.last >= 25) { if (t - VO.pending.at < 30) speak(VO.pending.id); else VO.pending = null; }
    humOn(enabled() && gestured && ui.started && (ui.panel === 'lab' || (!ui.panel && s.upgrades.greenhouse >= 1)));
  }

  /* ---------- a few more moments, marked where the rules report success ---------- */
  function hookLogic() {
    const L = global.CF && global.CF.logic;
    if (!L || L.__audio) return !!L;
    L.__audio = true;
    const after = (name, fn) => { const orig = L[name]; if (typeof orig !== 'function') return;
      L[name] = function () { const r = orig.apply(this, arguments); try { if (r && r.ok) fn.apply(null, arguments); } catch (e) { /* sound only */ } return r; }; };
    after('hireWorker', () => voice([13], true));
    after('buyUpgrade', (st, id) => { if (id === 'greenhouse') { sfx.flame(); voice([8], true); } });
    after('recipeUp', () => sfx.sizzle());
    after('buyBusiness', (st, id) => { if (id === 'jerky') sfx.sizzle(); });
    after('bizLevelUp', (st, id) => { if (id === 'jerky') sfx.sizzle(); });
    return true;
  }

  /* ---------- Music and Effects sliders in Settings (the panel renders them without a value) ---------- */
  function paintSliders() {
    if (!HAS_DOM) return;
    document.querySelectorAll('input[data-vol]').forEach(i => {
      const v = Math.round(vol[i.dataset.vol] * 100);
      if (document.activeElement !== i && +i.value !== v) i.value = v;
      // write only on a change: the label is watched by the MutationObserver that calls this
      const out = i.parentNode && i.parentNode.querySelector('b'); if (out && out.textContent !== v + '%') out.textContent = v + '%';
    });
  }
  if (HAS_DOM) {
    document.addEventListener('input', e => {
      const k = e.target && e.target.dataset && e.target.dataset.vol;
      if (k) { setVolume(k, e.target.value / 100); paintSliders(); }
    });
    const start = () => {
      const pr = document.getElementById('panel-root');
      if (pr && global.MutationObserver) new MutationObserver(paintSliders).observe(pr, { childList: true, subtree: true });
      const hook = setInterval(() => { if (hookLogic()) clearInterval(hook); }, 200);
      setInterval(watch, 500);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }

  const audioMod = { sfx, ensure, music, setVolume, volume: () => Object.assign({}, vol), say: voice };
  if (typeof module !== 'undefined' && module.exports) module.exports = audioMod;
  global.CF = global.CF || {};
  global.CF.audio = audioMod;
})(typeof window !== 'undefined' ? window : globalThis);

/* ============================================================
   Chili Firm 2 — WebAudio sound: synthesized SFX + a lo-fi
   boom-bap loop. No audio files. The context is only created
   after the first user gesture (no autoplay warnings).
   ============================================================ */
(function (global) {
  'use strict';

  let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let gestured = false;

  function ensure() {
    if (!gestured) return null;
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.26; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.0; musicBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  if (typeof document !== 'undefined') {
    const g = () => { gestured = true; ensure(); if (wantMusic) startMusic(); };
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
    musicBus.gain.setTargetAtTime(0.16, c.currentTime, 0.6);
    musicTimer = setInterval(schedule, 90);
  }
  function stopMusic() {
    if (!ctx || !musicTimer) return;
    musicBus.gain.setTargetAtTime(0.0, ctx.currentTime, 0.2);
    const t = musicTimer; musicTimer = null;
    setTimeout(() => clearInterval(t), 600);
  }
  function music(onOff) {
    wantMusic = !!onOff;
    if (wantMusic) startMusic(); else stopMusic();
  }

  const audioMod = { sfx, ensure, music };
  if (typeof module !== 'undefined' && module.exports) module.exports = audioMod;
  global.CF = global.CF || {};
  global.CF.audio = audioMod;
})(typeof window !== 'undefined' ? window : globalThis);

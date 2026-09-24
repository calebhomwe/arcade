/* ============================================================
   Chili Firm 2 — WebAudio sound effects (synth, no assets)
   ============================================================ */
(function (global) {
  'use strict';

  let ctx = null;
  let master = null;

  function ensure() {
    const L = global.CF;
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type, vol, when, slide) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + (when || 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function enabled() {
    const L = global.CF;
    if (!L || !L.state) return true;
    return !!(L.state.settings && L.state.settings.sound);
  }

  const sfx = {
    click() { if (!enabled()) return; tone(660, 0.05, 'square', 0.06); },
    plant() { if (!enabled()) return; tone(220, 0.10, 'sine', 0.10); tone(330, 0.08, 'sine', 0.06, 0.06); },
    water() { if (!enabled()) return; tone(500, 0.09, 'sine', 0.08); tone(700, 0.07, 'sine', 0.05, 0.05); },
    harvest() { if (!enabled()) return; tone(659, 0.09, 'triangle', 0.12); tone(880, 0.12, 'triangle', 0.12, 0.07); },
    cash() { if (!enabled()) return; tone(988, 0.06, 'square', 0.07); tone(1319, 0.10, 'square', 0.07, 0.05); },
    buy() { if (!enabled()) return; tone(392, 0.08, 'triangle', 0.10); tone(523, 0.12, 'triangle', 0.10, 0.06); },
    error() { if (!enabled()) return; tone(160, 0.16, 'sawtooth', 0.09); tone(120, 0.18, 'sawtooth', 0.07, 0.03); },
    ach() { if (!enabled()) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.11, i * 0.09)); },
    fanfare() { if (!enabled()) return; [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.12)); },
    story() { if (!enabled()) return; tone(523, 0.12, 'sine', 0.08); tone(659, 0.14, 'sine', 0.08, 0.10); },
    event() { if (!enabled()) return; tone(300, 0.10, 'sawtooth', 0.08); tone(450, 0.14, 'sawtooth', 0.08, 0.09); },
  };

  const audioMod = { sfx, ensure };
  if (typeof module !== 'undefined' && module.exports) module.exports = audioMod;
  global.CF = global.CF || {};
  global.CF.audio = audioMod;
})(typeof window !== 'undefined' ? window : globalThis);

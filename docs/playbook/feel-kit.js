/* feel-kit.js: the juice recipes from docs/playbook/FEEL.md in one dependency-free file.
 * Tested in Chromium and Playwright WebKit by docs/playbook/tests/feel-test.html (see FEEL.md).
 * Every recipe takes dt in SECONDS and never reads the clock itself, so it freezes with the
 * arcade SDK pause and can be stepped deterministically in a test. */
(function (G) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* 1. Easing: the standard easings.net formulas (https://easings.net). */
  const c1 = 1.70158, c3 = c1 + 1, c4 = (2 * Math.PI) / 3;
  const Ease = {
    linear: t => t,
    outQuad: t => 1 - (1 - t) * (1 - t),
    inCubic: t => t * t * t,
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inBack: t => c3 * t * t * t - c1 * t * t,
    outBack: t => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
    outElastic: t => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1),
    outBounce: t => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
  };

  /* 2. Screen shake with trauma (Squirrel Eiserloh, GDC 2016): shake = trauma^2, trauma decays
   *    linearly, smooth noise instead of Math.random(), so it looks the same at any frame rate. */
  function noise1(x) {
    const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
    const h = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; };
    return lerp(h(i), h(i + 1), s);
  }
  class Shake {
    constructor(o = {}) {
      this.trauma = 0; this.t = 0;
      this.decay = o.decay ?? 1.4;          // trauma lost per second
      this.power = o.power ?? 2;            // 2 = squared (Eiserloh), 3 = cubed (softer small hits)
      this.maxOffset = o.maxOffset ?? 18;   // px at full shake (scale it with canvas size)
      this.maxAngle = o.maxAngle ?? 0.05;   // radians at full shake
      this.freq = o.freq ?? 22;             // noise samples per second
      this.reduced = !!o.reduced;           // prefers-reduced-motion: no shake at all
    }
    add(amount) { this.trauma = clamp(this.trauma + amount, 0, 1); }
    update(dt) {
      this.t += dt; this.trauma = Math.max(0, this.trauma - this.decay * dt);
      const s = this.reduced ? 0 : Math.pow(this.trauma, this.power), f = this.t * this.freq;
      return { x: this.maxOffset * s * noise1(f), y: this.maxOffset * s * noise1(f + 100), angle: this.maxAngle * s * noise1(f + 200), shake: s };
    }
  }

  /* 3. Hit-stop: the simulation gets dt = 0 for a few frames; feedback (particles, shake, UI) keeps real dt. */
  class TimeScale {
    constructor() { this.freezeLeft = 0; this.slowLeft = 0; this.slowScale = 0.3; }
    hit(ms, o = {}) { this.freezeLeft = Math.max(this.freezeLeft, ms / 1000); this.slowLeft = (o.slowMs || 0) / 1000; this.slowScale = o.slowScale ?? 0.3; }
    step(realDt) {
      if (this.freezeLeft > 0) { this.freezeLeft -= realDt; return 0; }
      if (this.slowLeft > 0) { this.slowLeft -= realDt; return realDt * this.slowScale; }
      return realDt;
    }
  }

  /* 4. Spring, and squash and stretch on top of it (volume preserved: sx * sy = 1). */
  class Spring {
    constructor(k = 260, damping = 14) { this.k = k; this.d = damping; this.x = 0; this.v = 0; }
    punch(x) { this.x = x; }                 // set a displacement
    impulse(v) { this.v += v; }              // or kick the velocity (camera kicks)
    update(dt) {
      dt = Math.min(dt, 1 / 30); const n = 4, h = dt / n;   // sub-steps keep it stable on a slow frame
      for (let i = 0; i < n; i++) { this.v += (-this.k * this.x - this.d * this.v) * h; this.x += this.v * h; }
      return this.x;
    }
  }
  const squashScale = x => { const sy = Math.max(0.2, 1 + x); return { sx: 1 / sy, sy }; };

  /* 5. Keyframe track: anticipation, action, follow-through in a few lines. */
  class Track {
    constructor(v0, frames) { this.v = v0; this.from = v0; this.f = frames; this.i = 0; this.t = 0; this.done = false; }
    update(dt) {
      if (this.done) return this.v;
      this.t += dt * 1000;
      while (this.i < this.f.length) {
        const k = this.f[this.i];
        if (this.t >= k.ms) { this.t -= k.ms; this.v = this.from = k.to; this.i++; continue; }
        this.v = lerp(this.from, k.to, (k.ease || Ease.linear)(this.t / k.ms));
        return this.v;
      }
      this.done = true; return this.v;
    }
  }
  const popTrack = (rest = 1) => new Track(rest, [
    { to: rest * 0.85, ms: 90, ease: Ease.outQuad },      // anticipation: dip before the pop
    { to: rest * 1.25, ms: 110, ease: Ease.outBack },     // the action
    { to: rest, ms: 260, ease: Ease.outElastic },         // follow-through: wobble to rest
  ]);

  /* 6. Coins that fly to the counter: quadratic Bezier, ease-in so they accelerate into the HUD. */
  const bez = (a, c, b, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;
  function coinPos(p0, p1, t, arc = 80) {
    const e = Ease.inCubic(t), cx = (p0.x + p1.x) / 2, cy = Math.min(p0.y, p1.y) - arc;
    return { x: bez(p0.x, cx, p1.x, e), y: bez(p0.y, cy, p1.y, e) };
  }
  function flyCoins(root, from, toEl, n, o = {}) {
    const dur = o.dur ?? 600, gap = o.gap ?? 45, t0 = performance.now(), coins = [];
    const tr = toEl.getBoundingClientRect(), p1 = { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2 };
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div'); el.className = o.className || 'coin';
      el.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;pointer-events:none;will-change:transform;background:#ffd23f;border:3px solid #b9770e;box-sizing:border-box;opacity:0';
      root.appendChild(el);
      const scatter = { x: from.x + (Math.random() - 0.5) * 50, y: from.y + (Math.random() - 0.5) * 30 };
      coins.push({ el, p0: scatter, start: i * gap, landed: false });
    }
    let landed = 0;
    return new Promise(res => {
      (function frame(now) {
        const el = now - t0;
        for (const c of coins) {
          if (c.landed) continue;
          const t = clamp((el - c.start) / dur, 0, 1);
          if (el < c.start) continue;
          const p = coinPos(c.p0, p1, t, o.arc ?? 80);
          c.el.style.opacity = 1; c.el.style.transform = `translate(${p.x}px,${p.y}px) scale(${1 - 0.4 * t})`;
          if (t >= 1) { c.landed = true; c.el.remove(); landed++; if (o.onLand) o.onLand(landed, n); }
        }
        landed < n ? requestAnimationFrame(frame) : res(landed);
      })(t0);
    });
  }

  /* 7. Number pop: rises, overshoots, fades. Web Animations keep it off the main game loop. */
  function popNumber(root, x, y, text, o = {}) {
    const el = document.createElement('div'); el.textContent = text;
    el.style.cssText = `position:fixed;left:${x}px;top:${y}px;transform:translate(-50%,-50%);pointer-events:none;font:900 ${o.size || 28}px/1 Fredoka,system-ui,sans-serif;color:${o.color || '#fff'};-webkit-text-stroke:5px ${o.stroke || '#5a2d0c'};paint-order:stroke fill;text-shadow:0 3px 0 ${o.stroke || '#5a2d0c'}`;
    root.appendChild(el);
    const a = el.animate([
      { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
      { transform: 'translate(-50%,-90%) scale(1.25)', opacity: 1, offset: 0.25 },
      { transform: 'translate(-50%,-260%) scale(1)', opacity: 0 },
    ], { duration: o.ms || 750, easing: 'cubic-bezier(.2,.9,.3,1)' });
    a.onfinish = () => el.remove();
    return a;
  }

  /* 8. Combo escalation: a musical pitch ladder (major scale), a decay window, one 0..1 intensity knob. */
  const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12];
  const comboPitch = n => Math.pow(2, MAJOR[Math.min(Math.max(n, 0), MAJOR.length - 1)] / 12);   // playbackRate multiplier
  class Combo {
    constructor(windowMs = 1500) { this.n = 0; this.window = windowMs; this.left = 0; }
    hit() { this.n++; this.left = this.window; return this.n; }
    update(dt) { if (this.n && (this.left -= dt * 1000) <= 0) this.n = 0; }
    get intensity() { return Math.min(1, this.n / 10); }   // drive shake trauma, label size, particle count from this
  }

  /* 9. Sound layering and pitch variation (Web Audio; works on an OfflineAudioContext for tests). */
  let lastV = 0;
  function varied(base, spread = 0.06) {            // +-spread, and never the same value twice in a row
    let v; do { v = base * (1 + (Math.random() * 2 - 1) * spread); } while (Math.abs(v - lastV) < base * 0.004);
    return (lastV = v);
  }
  function blip(ctx, dest, t, { type = 'triangle', f = 880, dur = 0.14, gain = 0.3, slide = 1 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  function tick(ctx, dest, t, dur = 0.04, gain = 0.2) {   // a filtered noise burst = the "sparkle" layer
    const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 5000; g.gain.value = gain; s.buffer = buf;
    s.connect(hp); hp.connect(g); g.connect(dest); s.start(t);
  }
  function coinSfx(ctx, dest, t = ctx.currentTime, combo = 0) {
    const f = varied(880) * comboPitch(combo);
    blip(ctx, dest, t, { f, dur: 0.12, gain: 0.28 });                 // body
    blip(ctx, dest, t + 0.05, { f: f * 1.5, dur: 0.16, gain: 0.22 }); // a fifth above, a hair late
    tick(ctx, dest, t);                                               // sparkle
  }

  /* 10. Haptics. navigator.vibrate does not exist on iOS Safari; a native <input type=checkbox switch>
   *     clicked from a user gesture fires the Taptic Engine on iOS 17.4 to 26.4 (reported patched in 26.5). */
  const Haptics = (() => {
    let label = null;
    const ios = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    function ensure() {
      if (label) return label;
      label = document.createElement('label'); label.setAttribute('aria-hidden', 'true');
      label.style.cssText = 'position:fixed;left:-99px;top:-99px;width:1px;height:1px;opacity:0.01;overflow:hidden;pointer-events:none';
      const i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', ''); i.tabIndex = -1;
      label.appendChild(i); document.body.appendChild(label); return label;
    }
    return {
      mode: () => (typeof navigator.vibrate === 'function' ? 'vibrate' : ios() ? 'switch' : 'none'),
      tap(pattern = 10) {                          // call ONLY from a tap/click handler
        try {
          if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 'skipped';
          if (typeof navigator.vibrate === 'function') { navigator.vibrate(pattern); return 'vibrate'; }
          if (ios()) { ensure().click(); return 'switch'; }
        } catch (e) {}
        return 'none';
      },
    };
  })();

  G.Feel = { clamp, lerp, Ease, noise1, Shake, TimeScale, Spring, squashScale, Track, popTrack, coinPos, flyCoins, popNumber, MAJOR, comboPitch, Combo, varied, coinSfx, blip, tick, Haptics };
})(typeof window !== 'undefined' ? window : globalThis);

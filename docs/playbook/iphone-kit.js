/* iphone-kit.js: the iPhone survival recipes from docs/playbook/IPHONE.md, dependency-free.
 * Tested in Chromium and Playwright WebKit by tests/iphone-test.html. Playwright WebKit is NOT an iPhone:
 * see IPHONE.md, "What Playwright WebKit can and cannot tell you". */
(function (G) {
  'use strict';
  const MB = 1024 * 1024;

  /* 1. Resolution budget: cap DPR, then cap total pixels, so a 3x phone never renders 3x. */
  function pickDpr(cssW, cssH, { maxDpr = 2, maxPixels = 2.6e6, dpr = G.devicePixelRatio || 1 } = {}) {
    let d = Math.min(dpr, maxDpr);
    while (d > 1 && cssW * cssH * d * d > maxPixels) d = Math.max(1, d - 0.25);
    return d;
  }
  /* Adaptive DPR: step down fast when frames are slow, step up slowly when they are comfortably fast. */
  class AdaptiveDpr {
    constructor({ min = 1, max = 2, step = 0.25, slowMs = 24, fastMs = 15, frames = 45 } = {}) { Object.assign(this, { min, max, step, slowMs, fastMs, frames }); this.dpr = max; this.buf = []; this.calm = 0; }
    push(ms) {                                  // returns the new dpr when it changes, else null
      this.buf.push(ms); if (this.buf.length < this.frames) return null;
      const avg = this.buf.reduce((a, b) => a + b, 0) / this.buf.length; this.buf.length = 0;
      if (avg > this.slowMs && this.dpr > this.min) { this.calm = 0; this.dpr = Math.max(this.min, this.dpr - this.step); return this.dpr; }
      if (avg < this.fastMs && this.dpr < this.max && ++this.calm >= 4) { this.calm = 0; this.dpr = Math.min(this.max, this.dpr + this.step); return this.dpr; }
      if (avg >= this.fastMs) this.calm = 0;
      return null;
    }
  }

  /* 2. Memory arithmetic: texture and canvas bytes. ASTC is 16 bytes per block, whatever the block size. */
  const texMB = (w, h, { bytesPerPx = 4, mips = true } = {}) => (w * h * bytesPerPx * (mips ? 4 / 3 : 1)) / MB;
  const astcMB = (w, h, blk = 4, mips = true) => (Math.ceil(w / blk) * Math.ceil(h / blk) * 16 * (mips ? 4 / 3 : 1)) / MB;
  const canvasMB = (cssW, cssH, dpr, { samples = 1 } = {}) => (cssW * dpr * cssH * dpr * (4 * 2 + 4) * Math.max(1, samples)) / MB;  // 2 colour buffers + depth/stencil, times MSAA samples

  /* 3. Audio that survives iOS: create and resume inside a gesture WebKit counts, resume "interrupted" too. */
  function audioGate({ create = () => new (G.AudioContext || G.webkitAudioContext)(), events = ['pointerup', 'touchend', 'click', 'keydown'], target = document } = {}) {
    const gate = { ctx: null, running: false, onChange: null };
    const set = r => { if (gate.running !== r) { gate.running = r; gate.onChange && gate.onChange(r); } };
    function poke() {                                   // call synchronously from a gesture handler: no await before resume()
      try {
        if (!gate.ctx) { gate.ctx = create(); gate.ctx.addEventListener && gate.ctx.addEventListener('statechange', () => set(gate.ctx.state === 'running')); }
        const c = gate.ctx;
        if (c.state !== 'running' && c.state !== 'closed') c.resume();      // covers 'suspended' AND Safari's 'interrupted'
        if (c.createBuffer && c.createBufferSource) { const b = c.createBufferSource(); b.buffer = c.createBuffer(1, 1, 22050); b.connect(c.destination); b.start(0); }   // one silent frame opens the route
        if (G.navigator && navigator.audioSession) navigator.audioSession.type = 'playback';   // iOS 17+: play through the silent switch
        set(c.state === 'running');
      } catch (e) {}
    }
    const handler = () => poke();
    events.forEach(t => target.addEventListener(t, handler, { passive: true }));
    document.addEventListener('visibilitychange', () => { if (!document.hidden && gate.ctx && gate.ctx.state !== 'running') set(false); });   // coming back: wait for the next tap
    gate.poke = poke; gate.destroy = () => events.forEach(t => target.removeEventListener(t, handler)); return gate;
  }

  /* 4. WebGL context loss: preventDefault() is what allows the restore event at all. */
  function guardContext(canvas, { onLost = () => {}, onRestored = () => {} } = {}) {
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); onLost(); });
    canvas.addEventListener('webglcontextrestored', () => onRestored());
  }

  /* 5. Lifecycle: pause on hide, and on return STAY paused and ask for a tap. */
  function lifecycle({ onHide, onShow }) {
    let hidden = false;
    const hide = why => { if (!hidden) { hidden = true; onHide(why); } };
    const show = why => { if (hidden) { hidden = false; onShow(why); } };
    document.addEventListener('visibilitychange', () => (document.hidden ? hide('visibilitychange') : show('visibilitychange')));
    addEventListener('pagehide', () => hide('pagehide'));
    addEventListener('pageshow', e => { if (e.persisted) show('bfcache'); });
    return { get hidden() { return hidden; } };
  }

  /* 6. Orientation: iPhone Safari cannot lock it, so show a card. matchMedia is the trigger. */
  function orientationGate(want, onWrong) {
    const mq = matchMedia(`(orientation: ${want})`), apply = () => onWrong(!mq.matches);
    mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply); apply(); return mq;
  }

  /* 7. Screen wake lock, re-acquired every time the page becomes visible (it is released when hidden). */
  function keepAwake() {
    let lock = null;
    const get = async () => { try { if ('wakeLock' in navigator && document.visibilityState === 'visible' && !lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => (lock = null)); } } catch (e) {} return !!lock; };
    document.addEventListener('visibilitychange', get); return get;
  }

  /* 8. Touch guards: iOS ignores user-scalable=no. Block pinch, block the double-tap zoom, keep buttons working. */
  function touchGuards(root = document) {
    const stops = [];
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => root.addEventListener(t, e => e.preventDefault(), { passive: false }));
    let last = 0;
    root.addEventListener('touchend', e => {
      const dt = e.timeStamp - last; last = e.timeStamp;
      if (dt < 350 && e.cancelable) { e.preventDefault(); const b = e.target.closest && e.target.closest('button,[role=button],label'); if (b) b.click(); stops.push(dt); }   // the cancelled touchend also cancels the click, so click for it
    }, { passive: false });
    root.addEventListener('touchmove', e => { if (e.touches.length > 1 && e.cancelable) e.preventDefault(); }, { passive: false });
    return stops;
  }

  /* 9. Viewport: publish the visible height as --app-h (visualViewport tracks the Safari toolbar). */
  function fitViewport(el = document.documentElement) {
    let raf = 0;
    const set = () => { raf = 0; const v = G.visualViewport; el.style.setProperty('--app-h', (v ? v.height : innerHeight) + 'px'); el.style.setProperty('--app-w', (v ? v.width : innerWidth) + 'px'); };
    const kick = () => { if (!raf) raf = requestAnimationFrame(set); };
    addEventListener('resize', kick); addEventListener('orientationchange', kick); G.visualViewport && G.visualViewport.addEventListener('resize', kick); set(); return set;
  }

  /* 10. Storage that never throws (private windows, blocked site data, full quota). */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };

  /* 11. Did the previous load in this tab die? iOS reloads a tab that exceeds its memory budget with no error and no event. */
  function crashBreadcrumb(key = 'arcade_alive') {
    const set = () => { try { sessionStorage.setItem(key, '1'); } catch (e) {} };
    let died = false; try { died = sessionStorage.getItem(key) === '1'; } catch (e) {}
    set(); addEventListener('pageshow', set);
    addEventListener('pagehide', () => { try { sessionStorage.removeItem(key); } catch (e) {} });
    return died;                       // true: last load ended without a pagehide (killed for memory, or crashed). Start on the low-quality tier.
  }

  G.IPhone = { crashBreadcrumb, pickDpr, AdaptiveDpr, texMB, astcMB, canvasMB, audioGate, guardContext, lifecycle, orientationGate, keepAwake, touchGuards, fitViewport, store };
})(typeof window !== 'undefined' ? window : globalThis);

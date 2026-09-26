/* ============================================================
   Chili Firm 2 — Juice: particles, flying loot, number pops,
   counter tweening, screen shake. Web Animations API only.
   ============================================================ */
(function (global) {
  'use strict';

  const A = () => global.CF.art;
  const layer = () => document.getElementById('fx');
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let live = 0;
  const MAX_LIVE = 90; // keep software rendering happy

  function el(html, cls, size) {
    const d = document.createElement('div');
    d.className = cls || 'fx';
    if (size) { d.style.width = size + 'px'; d.style.height = size + 'px'; }
    d.innerHTML = html;
    layer().appendChild(d);
    live++;
    return d;
  }
  function kill(d) { if (d && d.parentNode) { d.remove(); live--; } }
  function center(target) {
    if (!target) return { x: innerWidth / 2, y: innerHeight / 2 };
    if (typeof target.x === 'number') return target;
    const r = target.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* number pop: rises and fades */
  function num(at, text, cls) {
    if (live > MAX_LIVE) return;
    const p = center(at);
    const d = el('', 'num ' + (cls || ''));
    d.textContent = text;
    d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
    const a = d.animate([
      { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
      { transform: 'translate(-50%,-90%) scale(1.25)', opacity: 1, offset: 0.2 },
      { transform: 'translate(-50%,-150%) scale(1)', opacity: 1, offset: 0.7 },
      { transform: 'translate(-50%,-190%) scale(.9)', opacity: 0 },
    ], { duration: reduced() ? 400 : 1100, easing: 'ease-out' });
    a.onfinish = () => kill(d);
  }

  /* loot that arcs from a point to a HUD target */
  function fly(from, to, html, n, opts) {
    opts = opts || {};
    const a0 = center(from);
    const toEl = typeof to === 'string' ? document.querySelector(to) : to;
    n = Math.min(n || 1, 12);
    let arrived = 0;
    for (let i = 0; i < n; i++) {
      if (live > MAX_LIVE) { if (opts.onArrive) opts.onArrive(i === n - 1); continue; }
      const size = opts.size || 34;
      const d = el(html, 'fx', size);
      const sx = a0.x + (Math.random() - 0.5) * 30, sy = a0.y + (Math.random() - 0.5) * 20;
      const b = center(toEl);
      const burstX = sx + (Math.random() - 0.5) * 140, burstY = sy - 40 - Math.random() * 80;
      const dur = reduced() ? 300 : 700 + Math.random() * 250;
      const anim = d.animate([
        { transform: `translate(${sx - size / 2}px,${sy - size / 2}px) scale(.4) rotate(0deg)`, opacity: 0 },
        { transform: `translate(${burstX - size / 2}px,${burstY - size / 2}px) scale(1.15) rotate(${(Math.random() - 0.5) * 200}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${b.x - size / 2}px,${b.y - size / 2}px) scale(.6) rotate(0deg)`, opacity: 1 },
      ], { duration: dur, delay: i * 45, easing: 'cubic-bezier(.3,.1,.5,1)', fill: 'backwards' });
      anim.onfinish = () => {
        kill(d);
        arrived++;
        if (toEl && toEl.classList) { toEl.classList.remove('bump'); void toEl.offsetWidth; toEl.classList.add('bump'); }
        if (opts.onArrive) opts.onArrive(arrived === n);
        if (opts.tick) opts.tick();
      };
    }
  }

  /* radial particle burst */
  function burst(at, kind, n) {
    if (reduced()) return;
    const p = center(at);
    n = n || 10;
    for (let i = 0; i < n; i++) {
      if (live > MAX_LIVE) return;
      let html, size = 14, cls = 'fx';
      if (kind === 'water') { html = `<svg viewBox="0 0 20 26" width="100%" height="100%"><path d="M10 1C6 8 2 12 2 17a8 8 0 0 0 16 0c0-5-4-9-8-16z" fill="#56c8ff" stroke="#1e0b22" stroke-width="2.4"/></svg>`; size = 14 + Math.random() * 8; }
      else if (kind === 'dirt') { html = `<svg viewBox="0 0 20 20" width="100%" height="100%"><circle cx="10" cy="10" r="8" fill="#7a4a2a" stroke="#1e0b22" stroke-width="2.4"/></svg>`; size = 8 + Math.random() * 8; }
      else if (kind === 'leaf') { html = `<svg viewBox="0 0 24 14" width="100%" height="100%"><path d="M1 7C6 0 18 0 23 7 18 14 6 14 1 7z" fill="#5fd068" stroke="#1e0b22" stroke-width="2.2"/></svg>`; size = 16 + Math.random() * 8; }
      else if (kind === 'star') { html = A().icon('star', 24); size = 18 + Math.random() * 14; }
      else if (kind === 'coin') { html = A().icon('coin', 24); size = 22 + Math.random() * 10; }
      else if (kind === 'confetti') { const c = ['#ff4fd8', '#ffd12a', '#7cff5b', '#56e0ff', '#ff5a1f'][i % 5]; html = `<div style="width:100%;height:100%;background:${c};border:2px solid #1e0b22;border-radius:2px"></div>`; size = 10 + Math.random() * 8; }
      else { html = `<svg viewBox="0 0 20 20" width="100%" height="100%"><path d="M10 0l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff6c0" stroke="#1e0b22" stroke-width="1.6"/></svg>`; size = 12 + Math.random() * 10; }
      const d = el(html, cls, size);
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.6;
      const dist = 40 + Math.random() * (kind === 'confetti' ? 220 : 70);
      const tx = p.x + Math.cos(ang) * dist, ty = p.y + Math.sin(ang) * dist - 20;
      const fall = kind === 'water' || kind === 'dirt' || kind === 'confetti' ? 60 + Math.random() * 60 : 0;
      const anim = d.animate([
        { transform: `translate(${p.x - size / 2}px,${p.y - size / 2}px) scale(.5) rotate(0)`, opacity: 1 },
        { transform: `translate(${tx - size / 2}px,${ty - size / 2}px) scale(1) rotate(${Math.random() * 300}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${tx - size / 2}px,${ty + fall - size / 2}px) scale(.6) rotate(${Math.random() * 400}deg)`, opacity: 0 },
      ], { duration: 650 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.4,1)' });
      anim.onfinish = () => kill(d);
    }
  }

  function ring(at, color) {
    if (reduced() || live > MAX_LIVE) return;
    const p = center(at);
    const d = el('', 'ring');
    d.style.borderColor = color || '#fff';
    d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
    const a = d.animate([
      { width: '10px', height: '10px', transform: 'translate(-50%,-50%)', opacity: 0.9 },
      { width: '130px', height: '130px', transform: 'translate(-50%,-50%)', opacity: 0 },
    ], { duration: 450, easing: 'ease-out' });
    a.onfinish = () => kill(d);
  }

  function shake(target) {
    if (reduced()) return;
    const t = target || document.getElementById('world');
    t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake');
  }

  /* counters that roll toward their value */
  const counters = new Map();
  function counter(elm, value, fmt) {
    if (!elm) return;
    let c = counters.get(elm);
    if (!c) { c = { shown: value, target: value, fmt }; counters.set(elm, c); elm.textContent = fmt(value); return; }
    c.target = value; c.fmt = fmt;
  }
  function stepCounters(dt) {
    counters.forEach((c, elm) => {
      if (!elm.isConnected) { counters.delete(elm); return; }
      if (c.shown === c.target) return;
      const diff = c.target - c.shown;
      const k = Math.min(1, dt * 7);
      c.shown += diff * k;
      if (Math.abs(c.target - c.shown) < Math.max(0.5, Math.abs(c.target) * 0.0005)) c.shown = c.target;
      elm.textContent = c.fmt(c.shown);
    });
  }

  global.CF = global.CF || {};
  global.CF.fx = { num, fly, burst, ring, shake, counter, stepCounters, reduced };
})(typeof window !== 'undefined' ? window : globalThis);

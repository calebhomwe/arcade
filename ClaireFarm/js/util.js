// Small helpers shared by every module.
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const TAU = Math.PI * 2;
export const wrapAngle = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };

// Deterministic random so the farm looks the same every visit.
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export const hash2 = (x, y) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  const u = smooth(xf), v = smooth(yf);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
export function fbm(x, y, oct = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f); f *= 2; a *= 0.5; } return s; }

// The real wall clock. ArcadeSDK freezes Date.now() while paused, but new Date() stays real,
// which is what crops, animals and offline progress need.
export const realNow = () => new Date().getTime();

export function fmt(n) {
  n = Math.floor(n);
  if (n < 10000) return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (n < 1e6) return (n / 1e3).toFixed(n < 1e5 ? 1 : 0).replace(/\.0$/, '') + 'K';
  if (n < 1e9) return (n / 1e6).toFixed(n < 1e7 ? 2 : 1).replace(/\.?0+$/, '') + 'M';
  return (n / 1e9).toFixed(2) + 'B';
}
export function fmtTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return m + 'm' + (s && m < 10 ? ' ' + s + 's' : '');
  const h = Math.floor(m / 60), mm = m % 60;
  if (h < 24) return h + 'h' + (mm ? ' ' + mm + 'm' : '');
  const d = Math.floor(h / 24);
  return d + 'd ' + (h % 24) + 'h';
}
export const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length) % arr.length];
export function shuffle(arr, r = Math.random) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

export function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function safeStore() {
  try { const k = '__cf_t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch (e) {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i], get length() { return m.size; } };
  }
}

// A tiny event emitter.
export class Emitter {
  constructor() { this.h = new Map(); }
  on(t, f) { (this.h.get(t) || this.h.set(t, []).get(t)).push(f); return () => this.off(t, f); }
  off(t, f) { const a = this.h.get(t); if (a) { const i = a.indexOf(f); if (i >= 0) a.splice(i, 1); } }
  emit(t, d) { const a = this.h.get(t); if (a) for (const f of a.slice()) { try { f(d); } catch (e) { console.error(e); } } }
}

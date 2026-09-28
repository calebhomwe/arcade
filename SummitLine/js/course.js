// Course definition: one analytic height function shared by rendering and physics.
// World: y up, the run descends toward -z. s = distance down the fall line (= -z),
// v = lateral offset from the piste centre line (x - centerX(s)).
import { fbm, ridged, noise, noiseB, smoothstep, clamp } from './noise.js';

export const LENGTH = 2000;          // finish line at s = LENGTH
export const RUNOUT = 160;
export const S_MIN = -700, S_MAX = 2800;
export const TREELINE = 80;        // y above which trees thin out

export const KICKERS = [
  { s: 90, v: 0, h: 1.3, len: 9, w: 8 },
  { s: 300, v: 0, h: 2.2, len: 10, w: 7 },
  { s: 640, v: -7, h: 2.8, len: 12, w: 6.5 },
  { s: 1010, v: 6, h: 3.0, len: 12, w: 7 },
  { s: 1480, v: -2, h: 3.6, len: 14, w: 8 },
  { s: 1820, v: 3, h: 3.0, len: 12, w: 7.5 },
];
export const RAILS = [
  { s0: 160, s1: 182, v: 9, h: 0.65 },
  { s0: 440, s1: 474, v: 9, h: 0.75 },
  { s0: 820, s1: 858, v: -10, h: 0.8 },
  { s0: 1240, s1: 1282, v: 8, h: 0.8 },
  { s0: 1650, s1: 1690, v: -9, h: 0.8 },
];

export function centerX(s) {
  return 58 * Math.sin(s / 250) + 20 * Math.sin(s / 93 + 1.1) + 8 * Math.sin(s / 41 + 0.3) * smoothstep(200, 400, s);
}
export function centerDX(s) {
  return 58 / 250 * Math.cos(s / 250) + 20 / 93 * Math.cos(s / 93 + 1.1) + 8 / 41 * Math.cos(s / 41 + 0.3) * smoothstep(200, 400, s);
}
export function halfWidth(s) {
  return 25 + 7 * Math.sin(s / 170 + 0.5) + 4 * Math.sin(s / 61);
}

// ---- longitudinal profile (fall line) -------------------------------------
const STEP = 1;
const N = Math.ceil((S_MAX - S_MIN) / STEP) + 1;
const grade = new Float32Array(N);
const y0tab = new Float32Array(N);
(function buildProfile() {
  const deg = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const s = S_MIN + i * STEP;
    let a;
    if (s < -40) a = 31 + 6 * smoothstep(-200, -600, s);     // face above the start
    else if (s < 30) a = 12;                                   // start ramp
    else a = 18 + 3 * Math.sin(s / 130) + 2 * Math.sin(s / 47 + 1);
    for (const k of KICKERS) {
      if (s > k.s - 70 && s < k.s - 4) a = Math.min(a, 12);   // flatter approach
      if (s > k.s + 4 && s < k.s + 75) a = Math.max(a, 21 + k.h * 0.6); // steep landing
    }
    if (s > LENGTH - 60) a = 11;
    if (s > LENGTH + 10) a = 4 + 3 * smoothstep(LENGTH + 120, LENGTH + 500, s);
    deg[i] = a;
  }
  // smooth the grade so transitions read as natural terrain
  const tmp = new Float32Array(N);
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < N; i++) {
      let acc = 0, c = 0;
      for (let j = -9; j <= 9; j++) { const k = i + j; if (k >= 0 && k < N) { acc += deg[k]; c++; } }
      tmp[i] = acc / c;
    }
    deg.set(tmp);
  }
  for (let i = 0; i < N; i++) grade[i] = Math.tan(deg[i] * Math.PI / 180);
  const i0 = Math.round(-S_MIN / STEP);
  y0tab[i0] = 0;
  for (let i = i0 + 1; i < N; i++) y0tab[i] = y0tab[i - 1] - 0.5 * (grade[i] + grade[i - 1]) * STEP;
  for (let i = i0 - 1; i >= 0; i--) y0tab[i] = y0tab[i + 1] + 0.5 * (grade[i] + grade[i + 1]) * STEP;
})();

export function baseY(s) {
  const f = (clamp(s, S_MIN, S_MAX - 1) - S_MIN) / STEP;
  const i = Math.floor(f), t = f - i;
  return y0tab[i] * (1 - t) + y0tab[Math.min(N - 1, i + 1)] * t;
}

// ---- features ---------------------------------------------------------------
function kickerH(s, v) {
  let h = 0;
  for (const k of KICKERS) {
    const ds = s - k.s;
    if (ds < -k.len || ds > 4) continue;
    const lat = 1 - smoothstep(k.w - 2.8, k.w + 1.2, Math.abs(v - k.v));
    if (lat <= 0) continue;
    let p;
    if (ds <= 0) { const t = (ds + k.len) / k.len; p = t * t * (1.25 - 0.25 * t); }
    else { const t = ds / 4; p = Math.pow(1 - t, 1.6); }
    h = Math.max(h, k.h * p * lat);
  }
  return h;
}

function rollers(s, v) {
  const win = smoothstep(1300, 1330, s) * (1 - smoothstep(1400, 1430, s));
  if (win <= 0) return 0;
  const lat = 1 - smoothstep(12, 20, Math.abs(v));
  return win * lat * 1.1 * Math.pow(Math.max(0, Math.sin((s - 1300) / 16 * Math.PI)), 2);
}

export function lateralProfile(s, v) {
  const W = halfWidth(s);
  const a = Math.abs(v);
  let h = 0.0022 * a * a;
  if (a > W) { const e = a - W; h = 0.0022 * W * W + 0.0022 * 2 * W * Math.min(e, 3) + 13 * (1 - Math.exp(-e / 50)) + e * 0.015; }
  h += v * 0.025 * Math.sin(s / 290 + 0.7);          // gentle side camber
  return h;
}

// Large-scale landform: the run descends a broad forested face; a valley opens
// to the right and a ring of sharp, glaciated peaks stands 1.5-6 km away.
export const PEAKS = [
  { x: -2600, z: -900, h: 1350, r: 560 },
  { x: -2300, z: -2900, h: 1250, r: 520 },
  { x: -3700, z: -1900, h: 1700, r: 760 },
  { x: 3600, z: -4200, h: 2000, r: 820 },
  { x: 4600, z: -1500, h: 1800, r: 780 },
  { x: 1500, z: -6200, h: 2300, r: 900 },
  { x: -1500, z: -5400, h: 1700, r: 700 },
  { x: -900, z: 1800, h: 1000, r: 520 },
  { x: 1400, z: 2600, h: 1300, r: 650 },
];
function landform(x, z, s, v) {
  const a = Math.abs(v);
  let h = 0;
  const near = smoothstep(40, 300, a);
  // rolling shoulders and gullies beside the run
  h += fbm(x / 420 + 7.7, z / 420 - 2.2, 4) * 45 * near;
  // left shoulder rises gently, right side falls into the valley
  h += smoothstep(80, 900, -v) * 180;
  h -= smoothstep(150, 1500, v) * 520;
  // summit face above the start
  h += smoothstep(-60, -700, s) * 120 * (1 - smoothstep(300, 900, a));
  // the valley keeps dropping away below the finish
  h -= smoothstep(LENGTH + 300, LENGTH + 3000, s) * 350;
  // peaks: pyramidal massifs (faces + aretes) carved by ridged noise
  let pk = 0;
  for (let i = 0; i < PEAKS.length; i++) {
    const p = PEAKS[i];
    const dx = x - p.x, dz = z - p.z;
    const base = p.r * 2.7;
    if (Math.abs(dx) > base * 1.5 || Math.abs(dz) > base * 1.5) continue;
    const th = i * 0.7 + 0.3, c = Math.cos(th), sn = Math.sin(th);
    const rx = dx * c - dz * sn, rz = dx * sn + dz * c;
    const de = Math.hypot(dx, dz), dc = Math.max(Math.abs(rx), Math.abs(rz)) * 1.08;
    const d = de * 0.45 + dc * 0.55;
    const k = Math.max(0, 1 - d / base);
    pk = Math.max(pk, p.h * Math.pow(k, 1.55));
  }
  pk *= smoothstep(120, 700, a);
  if (pk > 1) {
    const r = ridged(x / 700 + 3.1, z / 700 - 1.7, 6);
    const w = fbm(x / 230, z / 230, 3);
    h += pk * (0.8 + 0.32 * r) + w * 30 * Math.min(1, pk / 200);
  }
  // distant broad range filling the horizon
  const far = smoothstep(4000, 7000, Math.hypot(x, z + 1100));
  if (far > 0) h += far * ((ridged(x / 2400 + 9.2, z / 2400 + 1.3, 6) * 0.55 + (fbm(x / 3000, z / 3000, 4) * 0.5 + 0.5) * 0.45) * 1400 + 50);
  return h * near;
}

// Full terrain height at world (x, z)
export function heightAt(x, z) {
  const s = -z;
  const v = x - centerX(s);
  const a = Math.abs(v);
  const W = halfWidth(s);
  let h = baseY(s) + lateralProfile(s, v);
  // subtle snow undulation on the piste, stronger off-piste
  const offp = smoothstep(W - 2, W + 25, a);
  h += fbm(x / 11, z / 11, 3) * (0.18 + 1.2 * offp);
  h += noise(x / 60, z / 60) * 2.5 * offp;
  if (a > 40 || s < -80) h += landform(x, z, s, v);
  if (a < W + 12) { h += kickerH(s, v) + rollers(s, v); }
  return h;
}

export function normalAt(x, z, out, e = 0.6) {
  const hl = heightAt(x - e, z), hr = heightAt(x + e, z);
  const hd = heightAt(x, z - e), hu = heightAt(x, z + e);
  let nx = hl - hr, ny = 2 * e, nz = hd - hu;
  const l = Math.hypot(nx, ny, nz);
  out.x = nx / l; out.y = ny / l; out.z = nz / l;
  return out;
}

// Rail world endpoints (top of the rail bar)
export function railEnds(r) {
  const x0 = centerX(r.s0) + r.v, z0 = -r.s0, x1 = centerX(r.s1) + r.v, z1 = -r.s1;
  return { x0, z0, y0: heightAt(x0, z0) + r.h, x1, z1, y1: heightAt(x1, z1) + r.h };
}


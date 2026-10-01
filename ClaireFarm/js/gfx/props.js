// Small hand-built props (fence pieces, signs, the dock, a scarecrow...) made from boxes with
// painted vertex colours. They are modelled in code because they are simple and must be cheap.
import * as THREE from 'three';
import { rng } from '../util.js';

const C = (h) => new THREE.Color(h);

class Boxes {
  constructor() { this.p = []; this.n = []; this.c = []; }
  box(cx, cy, cz, sx, sy, sz, color, rotY = 0, tiltZ = 0) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2, cs = Math.cos(rotY), sn = Math.sin(rotY), ct = Math.cos(tiltZ), st = Math.sin(tiltZ);
    const faces = [
      [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [1, 0, 0], 0.86], [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], [-1, 0, 0], 0.78],
      [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz], [0, 1, 0], 1.08], [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz], [0, -1, 0], 0.6],
      [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz], [0, 0, 1], 0.94], [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz], [0, 0, -1], 0.8],
    ];
    for (const [a, b, c, d, nrm, shade] of faces) {
      const tr = (v) => { let x = v[0], y = v[1], z = v[2]; const x1 = x * ct - y * st, y1 = x * st + y * ct; x = x1; y = y1; return [cx + x * cs + z * sn, cy + y, cz - x * sn + z * cs]; };
      const nn = (() => { let x = nrm[0], y = nrm[1], z = nrm[2]; const x1 = x * ct - y * st, y1 = x * st + y * ct; x = x1; y = y1; return [x * cs + z * sn, y, -x * sn + z * cs]; })();
      for (const t of [[a, b, c], [a, c, d]]) for (const v of t) { const w = tr(v); this.p.push(w[0], w[1], w[2]); this.n.push(nn[0], nn[1], nn[2]); this.c.push(color.r * shade, color.g * shade, color.b * shade); }
    }
    return this;
  }
  cyl(cx, cy, cz, r, h, color, sides = 8) {
    for (let i = 0; i < sides; i++) {
      const a0 = i / sides * Math.PI * 2, a1 = (i + 1) / sides * Math.PI * 2, m = (a0 + a1) / 2;
      const x0 = cx + Math.cos(a0) * r, z0 = cz + Math.sin(a0) * r, x1 = cx + Math.cos(a1) * r, z1 = cz + Math.sin(a1) * r, nx = Math.cos(m), nz = Math.sin(m), sh = 0.8 + 0.2 * Math.cos(m - 0.8);
      for (const v of [[x0, cy, z0], [x1, cy, z1], [x1, cy + h, z1], [x0, cy, z0], [x1, cy + h, z1], [x0, cy + h, z0]]) { this.p.push(v[0], v[1], v[2]); this.n.push(nx, 0, nz); this.c.push(color.r * sh, color.g * sh, color.b * sh); }
      for (const v of [[cx, cy + h, cz], [x0, cy + h, z0], [x1, cy + h, z1]].reverse()) { this.p.push(v[0], v[1], v[2]); this.n.push(0, 1, 0); this.c.push(color.r * 1.08, color.g * 1.08, color.b * 1.08); }
    }
    return this;
  }
  cone(cx, cy, cz, r, h, color, sides = 8) {
    for (let i = 0; i < sides; i++) {
      const a0 = i / sides * Math.PI * 2, a1 = (i + 1) / sides * Math.PI * 2, m = (a0 + a1) / 2, sh = 0.85 + 0.2 * Math.cos(m - 0.8);
      for (const v of [[cx + Math.cos(a0) * r, cy, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, cy, cz + Math.sin(a1) * r], [cx, cy + h, cz]]) { this.p.push(v[0], v[1], v[2]); this.n.push(Math.cos(m) * 0.6, 0.8, Math.sin(m) * 0.6); this.c.push(color.r * sh, color.g * sh, color.b * sh); }
    }
    return this;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingBox(); g.computeBoundingSphere(); return g;
  }
}

const WOOD = C(0xb9814a), WOOD2 = C(0x9a6a38), WOOD_D = C(0x7c5228), CREAM = C(0xfff2cf), RED = C(0xd8443a);

// a 2-unit fence segment running along +x, standing on the ground
export function fenceGeometry() {
  const b = new Boxes(), r = rng(3);
  for (const x of [-0.94, 0.94]) b.box(x, 0.46, 0, 0.13, 0.92, 0.13, WOOD2.clone().multiplyScalar(0.94 + r() * 0.1));
  b.box(0, 0.7, 0, 2.0, 0.09, 0.07, WOOD); b.box(0, 0.36, 0, 2.0, 0.09, 0.07, WOOD.clone().multiplyScalar(0.96));
  return b.geometry();
}
export function postGeometry() { const b = new Boxes(); b.box(0, 0.5, 0, 0.16, 1.0, 0.16, WOOD2); b.box(0, 1.03, 0, 0.22, 0.08, 0.22, WOOD_D); return b.geometry(); }

// "for sale" lot: four corner stakes joined by rope, plus a sign board on a post at the front
export function lotGeometry(w, d) {
  const b = new Boxes(), hw = w / 2, hd = d / 2;
  for (const [x, z] of [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]]) b.box(x, 0.45, z, 0.14, 0.9, 0.14, WOOD2).box(x, 0.93, z, 0.2, 0.07, 0.2, WOOD_D);
  const rope = C(0xe8d7a8);
  b.box(0, 0.72, -hd, w, 0.04, 0.04, rope).box(0, 0.72, hd, w, 0.04, 0.04, rope).box(-hw, 0.72, 0, 0.04, 0.04, d, rope).box(hw, 0.72, 0, 0.04, 0.04, d, rope);
  return b.geometry();
}
export function signGeometry() {
  const b = new Boxes();
  b.box(0, 0.75, 0, 0.12, 1.5, 0.12, WOOD2);
  b.box(0, 1.5, 0.04, 1.2, 0.7, 0.08, C(0xf7e2ae)); b.box(0, 1.5, 0.0, 1.32, 0.82, 0.06, WOOD);
  b.box(0, 1.5, 0.09, 1.0, 0.12, 0.02, RED);
  return b.geometry();
}
export function boardGeometry() {   // the order board: two posts, a big board, pinned notes
  const b = new Boxes(), r = rng(8);
  b.box(-0.9, 0.95, 0, 0.16, 1.9, 0.16, WOOD2).box(0.9, 0.95, 0, 0.16, 1.9, 0.16, WOOD2);
  b.box(0, 1.3, 0.0, 2.3, 1.4, 0.12, WOOD).box(0, 1.3, 0.07, 2.1, 1.2, 0.04, C(0xd8b07a));
  b.box(0, 2.05, 0.02, 2.5, 0.16, 0.3, RED).box(0, 2.16, 0.02, 2.2, 0.1, 0.22, RED.clone().multiplyScalar(0.85));
  const notes = [0xfff7d8, 0xd8f0ff, 0xffe0e0, 0xe4ffd8];
  for (let i = 0; i < 6; i++) b.box(-0.7 + (i % 3) * 0.7, 1.0 + Math.floor(i / 3) * 0.55, 0.11, 0.5, 0.42, 0.02, C(notes[i % 4]), 0, (r() - 0.5) * 0.2);
  return b.geometry();
}
export function troughGeometry() { const b = new Boxes(); b.box(0, 0.3, 0, 1.6, 0.12, 0.5, WOOD_D).box(0, 0.42, 0.22, 1.6, 0.34, 0.08, WOOD).box(0, 0.42, -0.22, 1.6, 0.34, 0.08, WOOD).box(-0.78, 0.42, 0, 0.08, 0.34, 0.5, WOOD).box(0.78, 0.42, 0, 0.08, 0.34, 0.5, WOOD); b.box(0, 0.5, 0, 1.4, 0.06, 0.34, C(0xe0c060)); b.box(-0.6, 0.15, 0, 0.1, 0.3, 0.4, WOOD2).box(0.6, 0.15, 0, 0.1, 0.3, 0.4, WOOD2); return b.geometry(); }
export function scarecrowGeometry() {
  const b = new Boxes();
  b.box(0, 0.9, 0, 0.1, 1.8, 0.1, WOOD2).box(0, 1.35, 0, 1.3, 0.1, 0.1, WOOD2);
  b.box(0, 1.2, 0, 0.55, 0.7, 0.3, C(0x4a7fc0)).box(0.0, 1.62, 0.02, 0.36, 0.36, 0.34, C(0xf1cf8a));
  b.cone(0, 1.8, 0, 0.42, 0.14, C(0xc99a3a), 8).cyl(0, 1.78, 0, 0.26, 0.28, C(0xd8b04a), 8).box(0, 1.85, 0, 0.3, 0.08, 0.3, RED);
  b.box(-0.55, 1.28, 0, 0.3, 0.28, 0.12, C(0xd8b04a)).box(0.55, 1.28, 0, 0.3, 0.28, 0.12, C(0xd8b04a));
  b.box(-0.15, 0.4, 0, 0.16, 0.8, 0.2, C(0x3a5f9a)).box(0.15, 0.4, 0, 0.16, 0.8, 0.2, C(0x3a5f9a));
  return b.geometry();
}
export function benchGeometry() { const b = new Boxes(); b.box(0, 0.5, 0, 1.8, 0.1, 0.55, WOOD).box(0, 0.95, -0.26, 1.8, 0.4, 0.08, WOOD).box(-0.78, 0.25, 0, 0.12, 0.5, 0.5, WOOD2).box(0.78, 0.25, 0, 0.12, 0.5, 0.5, WOOD2).box(-0.78, 0.7, -0.24, 0.1, 0.45, 0.08, WOOD2).box(0.78, 0.7, -0.24, 0.1, 0.45, 0.08, WOOD2); return b.geometry(); }
export function picnicGeometry() {
  const b = new Boxes(); const a = C(0xe4453b), w = C(0xfff5e0);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) b.box(-1.25 + i * 0.5, 0.03, -1.25 + j * 0.5, 0.5, 0.05, 0.5, (i + j) % 2 ? w : a);
  b.cyl(0.2, 0.06, 0.1, 0.32, 0.22, C(0xd9a45c), 10); b.cyl(-0.6, 0.06, -0.4, 0.14, 0.18, C(0xf5f0e0), 8);
  return b.geometry();
}
export function hiveGeometry() {
  const b = new Boxes(); for (const [x, z] of [[-1.1, 0], [0, 0.3], [1.1, 0]]) { b.box(x, 0.22, z, 0.7, 0.44, 0.7, C(0xf6d878)).box(x, 0.56, z, 0.66, 0.26, 0.66, C(0xf0c040)).box(x, 0.76, z, 0.72, 0.08, 0.72, C(0xe8e0d0)); b.box(x, 0.22, z + 0.36, 0.2, 0.1, 0.04, C(0x3a2a14)); b.box(x, 0.06, z, 0.5, 0.12, 0.5, WOOD2); }
  return b.geometry();
}
export function dockGeometry() {   // planks running east into the bay, with posts
  const b = new Boxes(), r = rng(4);
  const L = 11, W = 2.6;
  for (let i = 0; i < L * 2; i++) b.box(i * 0.5, 0.0, 0, 0.46, 0.14, W, WOOD.clone().multiplyScalar(0.92 + r() * 0.16));
  for (const z of [-W / 2 + 0.1, W / 2 - 0.1]) for (let i = 0; i <= 5; i++) b.box(i * 2.2, -0.3, z, 0.22, 1.5, 0.22, WOOD_D);
  b.box(L, 0.55, 0, 0.14, 0.14, W, WOOD2);
  b.box(2, 0.5, -W / 2, 0.08, 0.08, 0.08, CREAM);
  return b.geometry();
}
export function bunting(len, n = 8, colors = [0xe4453b, 0xffc93c, 0x58b947, 0x4f9cf0, 0xff7fb0]) {
  const b = new Boxes();
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = -len / 2 + t * len, sag = Math.sin(t * Math.PI) * 0.35; b.box(x, 2.2 - sag - 0.14, 0, 0.3, 0.3, 0.02, C(colors[i % colors.length]), 0, Math.PI / 4); }
  return b.geometry();
}
export { Boxes };

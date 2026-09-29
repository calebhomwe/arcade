// Trees, bushes, rocks, grass tufts and wildflowers: all instanced, chunked so off-screen patches
// are culled, and drawn in a handful of calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GRASS_VERT, GRASS_FRAG, SU } from './shaders.js';
import { farmMaterial } from './shaders.js';
import { heightAt, WATER_Y } from './terrain.js';
import { blocked } from '../layout.js';
import { rng, fbm, clamp, lerp } from '../util.js';

const col = (h) => new THREE.Color(h);

// ---- procedural geometry ------------------------------------------------------------------------
function paint(geo, base, top, jitter, r, shade = 1) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  const bb = geo.boundingBox, pos = geo.attributes.position, n = pos.count, out = new Float32Array(n * 3);
  const c = new THREE.Color();
  for (let i = 0; i < n; i += 3) {
    const j = 1 + (r() - 0.5) * jitter;
    for (let k = 0; k < 3; k++) {
      const y = (pos.getY(i + k) - bb.min.y) / Math.max(1e-3, bb.max.y - bb.min.y);
      c.copy(base).lerp(top, y).multiplyScalar(j * shade);
      out[(i + k) * 3] = c.r; out[(i + k) * 3 + 1] = c.g; out[(i + k) * 3 + 2] = c.b;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(out, 3));
  return geo;
}
function blob(radius, detail, x, y, z, sy, r, wob = 0.14) {
  const g = new THREE.IcosahedronGeometry(radius, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 1 + (Math.sin(p.getX(i) * 3.1 + p.getY(i) * 2.3 + x) * Math.cos(p.getZ(i) * 2.7 + y)) * wob;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * sy, p.getZ(i) * k);
  }
  g.translate(x, y, z);
  return g;
}

export function makeTreeGeometry(kind, seed = 1, detail = 1) {
  const r = rng(seed * 977);
  const parts = [];
  const trunkC = col(0x6e4426), trunkT = col(0x8b5a33);
  if (kind === 'pine') {
    const t = new THREE.CylinderGeometry(0.1, 0.18, 1.2, 6, 1); t.translate(0, 0.6, 0); parts.push(paint(t, trunkC, trunkT, 0.1, r));
    const rad = [1.35, 1.05, 0.75], hh = [1.6, 1.4, 1.2], yy = [0.9, 1.9, 2.8];
    for (let i = 0; i < 3; i++) { const cn = new THREE.ConeGeometry(rad[i], hh[i], 8, 1); cn.translate(0, yy[i] + hh[i] / 2, 0); parts.push(paint(cn, col(0x1f6b3c), col(0x3fa04f), 0.16, r)); }
  } else {
    const leaf = { round: [0x3f9a3a, 0x7ccf52], blossom: [0xe98fb3, 0xffc6dc], orange: [0x3f9a3a, 0x7ccf52], oak: [0x4a8f2f, 0x86c04a], autumn: [0xc8641e, 0xf0b040] }[kind] || [0x3f9a3a, 0x7ccf52];
    const t = new THREE.CylinderGeometry(0.13, 0.22, 1.5, 6, 1); t.translate(0, 0.75, 0); parts.push(paint(t, trunkC, trunkT, 0.1, r));
    const big = kind === 'oak' ? 1.25 : 1.0;
    const blobs = [[0, 2.35, 0, 1.15 * big, 0.92], [0.7, 1.95, 0.25, 0.8 * big, 0.9], [-0.68, 2.05, -0.2, 0.85 * big, 0.9], [0.1, 2.95, -0.1, 0.78 * big, 0.9]];
    for (const [x, y, z, rad, sy] of blobs) parts.push(paint(blob(rad, detail, x, y, z, sy, r), col(leaf[0]), col(leaf[1]), 0.22, r));
    if (kind === 'orange') { for (let i = 0; i < 9; i++) { const a = r() * 6.28, h = 1.7 + r() * 1.2; const o = new THREE.OctahedronGeometry(0.11, 0); o.translate(Math.cos(a) * (0.9 + r() * 0.2), h, Math.sin(a) * (0.9 + r() * 0.2)); parts.push(paint(o, col(0xf08a1e), col(0xffb040), 0.1, r)); } }
  }
  const g = mergeGeometries(parts.map((p) => { const q = p.index ? p.toNonIndexed() : p; if (!q.attributes.color) q.setAttribute('color', new THREE.BufferAttribute(new Float32Array(q.attributes.position.count * 3).fill(0.8), 3)); q.deleteAttribute('uv'); return q; }));
  g.computeBoundingSphere();
  return g;
}
export function makeBushGeometry(seed = 3, tone = [0x3d9138, 0x77c650]) {
  const r = rng(seed * 313);
  const parts = [blob(0.55, 1, 0, 0.42, 0, 0.8, r, 0.2), blob(0.4, 1, 0.4, 0.32, 0.15, 0.8, r, 0.2), blob(0.38, 1, -0.38, 0.3, -0.1, 0.8, r, 0.2)].map((g) => paint(g, col(tone[0]), col(tone[1]), 0.24, r));
  const g = mergeGeometries(parts.map((p) => { p.deleteAttribute('uv'); return p; })); g.computeBoundingSphere(); return g;
}
export function makeRockGeometry(seed = 2) {
  const r = rng(seed * 71);
  const g = blob(0.55, 1, 0, 0.3, 0, 0.62, r, 0.32);
  const p = paint(g, col(0x77746f), col(0xb2aea6), 0.3, r); p.deleteAttribute('uv'); p.computeBoundingSphere(); return p;
}

// ---- chunked instances --------------------------------------------------------------------------
export class Chunked {
  constructor(scene, geometry, material, cell = 36) { this.scene = scene; this.geo = geometry; this.mat = material; this.cell = cell; this.group = new THREE.Group(); scene.add(this.group); this.chunks = []; }
  build(items) {   // items: {x,y,z,rot,scale,tint:[r,g,b]}
    const cells = new Map();
    for (const it of items) { const k = Math.floor(it.x / this.cell) + ',' + Math.floor(it.z / this.cell); (cells.get(k) || cells.set(k, []).get(k)).push(it); }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    for (const arr of cells.values()) {
      const mesh = new THREE.InstancedMesh(this.geo, this.mat, arr.length);
      arr.forEach((it, i) => {
        e.set(0, it.rot || 0, 0); q.setFromEuler(e); s.setScalar(it.scale || 1); p.set(it.x, it.y, it.z);
        m.compose(p, q, s); mesh.setMatrixAt(i, m);
        const t = it.tint || [1, 1, 1]; mesh.setColorAt(i, c.setRGB(t[0], t[1], t[2]));
      });
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere(); mesh.frustumCulled = true;
      mesh.userData.total = arr.length;
      this.group.add(mesh); this.chunks.push(mesh);
    }
    return this;
  }
  setDensity(f) { for (const m of this.chunks) m.count = Math.max(0, Math.floor(m.userData.total * f)); }
}

// ---- scatter ------------------------------------------------------------------------------------
export function buildForest(scene) {
  const r = rng(4242);
  const trees = { round: [], pine: [], blossom: [], oak: [], orange: [] }, bushes = [], rocks = [];
  const place = (list, x, z, sc, tint) => list.push({ x, y: heightAt(x, z), z, rot: r() * 6.28, scale: sc * (0.85 + r() * 0.5), tint: tint || [0.9 + r() * 0.2, 0.92 + r() * 0.16, 0.9 + r() * 0.2] });
  // forest ring around the farm, thicker with distance; none on the bay side or in the stream
  for (let i = 0; i < 900; i++) {
    const a = r() * Math.PI * 2, d = 34 + Math.pow(r(), 0.8) * 70;
    const x = -2 + Math.cos(a) * d * 1.15, z = 4 + Math.sin(a) * d * 0.95;
    if (x > 24 && z > -30) continue;
    const h = heightAt(x, z); if (h < WATER_Y + 0.5) continue;
    if (blocked(x, z, 1)) continue;
    const far = d > 60;
    const pineChance = far ? 0.65 : 0.45;
    place(r() < pineChance ? trees.pine : (r() < 0.4 ? trees.oak : trees.round), x, z, far ? 1.5 : 1.2);
  }
  // hand placed trees near the farm: orchard, blossoms, shade
  const spots = [
    ['orange', -16, 0.5], ['orange', -18.5, 2], ['orange', -14.5, 2.4],
    ['blossom', 4, -15], ['blossom', -3, -15.5], ['blossom', 10.5, 8],
    ['oak', -28, -6], ['oak', -28, 8], ['round', -27, 22], ['round', 27, -12], ['oak', 24, -22], ['round', -20, -20], ['oak', -4, -24], ['round', 8, -25], ['round', 30, 20], ['oak', 24, 30], ['round', -4, 34], ['oak', 12, 33], ['round', -22, 30], ['round', 16, -18],
  ];
  for (const [k, x, z] of spots) if (!blocked(x, z, -1.5)) place(trees[k], x, z, k === 'oak' ? 1.5 : 1.35);
  // bushes and rocks
  for (let i = 0; i < 160; i++) {
    const x = -34 + r() * 68, z = -30 + r() * 66; const h = heightAt(x, z);
    if (blocked(x, z, 0.4) || h < WATER_Y + 0.35 || (x > 24 && z > -26)) continue;
    if (r() < 0.75) place(bushes, x, z, 0.8 + r() * 0.6); else place(rocks, x, z, 0.7 + r() * 0.9, [0.9, 0.9, 0.9]);
  }
  // stones along the stream
  for (let i = 0; i < 26; i++) { const t = r() * 6; const x = -20 + t * 9 + r() * 2, z = -33 + Math.sin(t) * 3 + r() * 5; if (heightAt(x, z) > WATER_Y - 0.5 && !blocked(x, z)) place(rocks, x, Math.max(z, -60), 0.5 + r() * 0.8, [0.9, 0.9, 0.9]); }
  const out = { chunks: [] };
  const mk = (geo, list, cell = 30, mat) => { const c = new Chunked(scene, geo, mat || farmMaterial({ vertexColors: true, foliage: true, rim: 0.25 }), cell).build(list); out.chunks.push(c); return c; };
  out.pine = mk(makeTreeGeometry('pine', 1), trees.pine);
  out.round = mk(makeTreeGeometry('round', 2, 1), trees.round);
  out.oak = mk(makeTreeGeometry('oak', 3, 1), trees.oak);
  out.blossom = mk(makeTreeGeometry('blossom', 4, 1), trees.blossom);
  out.orange = mk(makeTreeGeometry('orange', 5, 1), trees.orange);
  out.bush = mk(makeBushGeometry(3), bushes, 40);
  out.rock = mk(makeRockGeometry(2), rocks, 60, farmMaterial({ vertexColors: true, rim: 0.2 }));
  out.setDensity = (f) => { out.pine.setDensity(f); out.round.setDensity(f); out.oak.setDensity(f); out.bush.setDensity(Math.min(1, f + 0.2)); };
  out.lists = { trees, bushes, rocks };
  return out;
}

// ---- grass and flowers --------------------------------------------------------------------------
function grassTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
  const r = rng(9);
  for (let b = 0; b < 9; b++) {
    const x = 12 + b * 13 + r() * 6, h = 34 + r() * 26, lean = (r() - 0.5) * 16, w = 4 + r() * 3;
    const grad = g.createLinearGradient(0, 64, 0, 64 - h); grad.addColorStop(0, 'rgb(70,70,70)'); grad.addColorStop(1, 'rgb(255,255,255)');
    g.fillStyle = grad; g.beginPath(); g.moveTo(x - w, 64); g.quadraticCurveTo(x - w * 0.4 + lean * 0.4, 64 - h * 0.55, x + lean, 64 - h); g.quadraticCurveTo(x + w * 0.4 + lean * 0.4, 64 - h * 0.55, x + w, 64); g.closePath(); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; return t;
}
function flowerTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = 'rgb(0,0,255)'; g.fillRect(30, 26, 4, 38);
  g.beginPath(); g.ellipse(24, 46, 8, 3, -0.5, 0, 6.3); g.ellipse(41, 40, 8, 3, 0.5, 0, 6.3); g.fill();
  g.fillStyle = 'rgb(255,0,0)';
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; g.beginPath(); g.ellipse(32 + Math.cos(a) * 9, 18 + Math.sin(a) * 9, 7, 5, a, 0, 6.3); g.fill(); }
  g.fillStyle = 'rgb(0,255,0)'; g.beginPath(); g.arc(32, 18, 5.5, 0, 6.3); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}

function crossedQuads(w, h, planes) {
  const pos = [], uv = [], idx = [];
  for (let p = 0; p < planes; p++) {
    const a = (p / planes) * Math.PI, cx = Math.cos(a) * w / 2, cz = Math.sin(a) * w / 2, i = pos.length / 3;
    pos.push(-cx, 0, -cz, cx, 0, cz, cx, h, cz, -cx, h, -cz); uv.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}

export class GrassField {
  constructor(scene, kind, count, area, seed) {
    this.scene = scene; this.kind = kind; this.total = count; this.group = new THREE.Group(); scene.add(this.group);
    const r = rng(seed);
    const isFlower = kind === 'flower';
    const base = isFlower ? crossedQuads(0.55, 0.62, 2) : crossedQuads(1.1, 0.7, 3);
    const tex = isFlower ? flowerTexture() : grassTexture();
    this.spots = [];
    const cell = 24, cells = new Map();
    let tries = 0;
    while (this.spots.length < count && tries++ < count * 6) {
      const x = area.x0 + r() * (area.x1 - area.x0), z = area.z0 + r() * (area.z1 - area.z0);
      const h = heightAt(x, z); if (h < WATER_Y + 0.28 || h > 3) continue;
      if (blocked(x, z, isFlower ? 0.6 : 0.2)) continue;
      // thicker at the meadow edge and along the stream, patchy in the middle
      const patch = fbm(x * 0.12 + 5, z * 0.12 - 2, 2);
      if (patch < (isFlower ? 0.55 : 0.28)) continue;
      const s = { x, z, y: h, rot: r() * 6.28, sc: (isFlower ? 0.7 : 0.8) + r() * 0.7, n: r(), pal: Math.floor(r() * 6) };
      this.spots.push(s);
      const k = Math.floor(x / cell) + ',' + Math.floor(z / cell); (cells.get(k) || cells.set(k, []).get(k)).push(s);
    }
    this.mat = new THREE.ShaderMaterial({ vertexShader: GRASS_VERT, fragmentShader: GRASS_FRAG, side: THREE.DoubleSide, uniforms: Object.assign({}, SU, { map: { value: tex }, uFlower: { value: isFlower ? 1 : 0 } }) });
    this.chunks = [];
    for (const arr of cells.values()) {
      const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
      const d = new Float32Array(arr.length * 4), c = new Float32Array(arr.length * 3);
      arr.forEach((s, i) => { d[i * 4] = s.x; d[i * 4 + 1] = s.z; d[i * 4 + 2] = s.rot; d[i * 4 + 3] = s.sc; });
      g.setAttribute('aData', new THREE.InstancedBufferAttribute(d, 4)); g.setAttribute('aCol', new THREE.InstancedBufferAttribute(c, 3));
      g.instanceCount = arr.length;
      // positions need the terrain height: bake y into the geometry base via aData? use per-chunk offset in y through a translated attribute
      const yv = new Float32Array(arr.length); arr.forEach((s, i) => { yv[i] = s.y; });
      g.setAttribute('aY', new THREE.InstancedBufferAttribute(yv, 1));
      const m = new THREE.Mesh(g, this.mat); m.frustumCulled = true;
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; arr.forEach((s) => { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); z0 = Math.min(z0, s.z); z1 = Math.max(z1, s.z); });
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, 0.5, (z0 + z1) / 2), Math.hypot(x1 - x0, z1 - z0) / 2 + 2);
      m.userData = { arr, total: arr.length };
      this.group.add(m); this.chunks.push(m);
    }
    this.setSeason();
  }
  setSeason() {
    const A = SU.uGrassA.value, B = SU.uGrassB.value, tmp = new THREE.Color();
    const pal = [[1, 0.35, 0.4], [1, 0.62, 0.78], [0.72, 0.45, 0.95], [1, 1, 1], [1, 0.9, 0.25], [0.35, 0.6, 1]];
    for (const m of this.chunks) {
      const c = m.geometry.attributes.aCol; m.userData.arr.forEach((s, i) => {
        if (this.kind === 'flower') { const p = pal[s.pal]; c.setXYZ(i, p[0], p[1], p[2]); }
        else { tmp.copy(A).lerp(B, s.n); tmp.multiplyScalar(0.9 + s.n * 0.25); c.setXYZ(i, tmp.r, tmp.g, tmp.b); }
      });
      c.needsUpdate = true;
    }
  }
  setDensity(f) { for (const m of this.chunks) m.geometry.instanceCount = Math.floor(m.userData.total * f); }
}

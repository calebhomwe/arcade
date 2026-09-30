// Trees, bushes, rocks, grass tufts and wildflowers: all instanced, chunked so off-screen patches
// are culled, and drawn in a handful of calls.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GRASS_VERT, GRASS_FRAG, SU } from './shaders.js';
import { farmMaterial } from './shaders.js';
import { SHADOW_LAYER } from './shadow.js';
import { heightAt, WATER_Y } from './terrain.js';
import { blocked } from '../layout.js';
import { rng, fbm, clamp, lerp } from '../util.js';

const col = (h) => new THREE.Color(h);

// ---- procedural geometry ------------------------------------------------------------------------
// Foliage is built from soft clumps whose normals point away from the clump AND the crown centre, so
// light rolls over the whole tree like one painted mass; vertex colour carries baked AO (dark inside and
// below, warm and bright on top). The fragment shader adds leaf-scale speckle.
const SUNISH = new THREE.Vector3(0.45, 0.8, 0.35).normalize();
function strip(g) { g.deleteAttribute('uv'); if (g.attributes.uv1) g.deleteAttribute('uv1'); return g; }
function clump(cx, cy, cz, rad, sy, r, o) {
  let g = new THREE.IcosahedronGeometry(rad, o.detail || 1);
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);
  const p = g.attributes.position, n = p.count, nor = new Float32Array(n * 3), colr = new Float32Array(n * 3);
  const ph = r() * 6.28, cc = new THREE.Color(), lo = o.lo, hi = o.hi, cen = o.center, jit = 1 + (r() - 0.5) * 0.22;
  const hueJ = (r() - 0.5) * 0.06, v = new THREE.Vector3(), nn = new THREE.Vector3(), out = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + (Math.sin(x * 4.1 + ph) * Math.cos(z * 3.7 - ph) + Math.sin(y * 5.3 + ph * 2)) * 0.5 * (o.wob != null ? o.wob : 0.16);
    x *= k; y *= k * sy; z *= k;
    v.set(cx + x, cy + y, cz + z); p.setXYZ(i, v.x, v.y, v.z);
    out.set(x, y / sy, z).normalize();
    nn.copy(v).sub(cen).normalize();
    nn.multiplyScalar(0.5).addScaledVector(out, 0.5).normalize();
    nor[i * 3] = nn.x; nor[i * 3 + 1] = nn.y; nor[i * 3 + 2] = nn.z;
    const up = clamp((v.y - o.base) / Math.max(0.1, o.top - o.base), 0, 1);
    const sunny = Math.max(0, nn.dot(SUNISH));
    const t = clamp(up * 0.55 + sunny * 0.5 - 0.08, 0, 1);
    cc.copy(lo).lerp(hi, t); cc.offsetHSL(hueJ, 0, (r() - 0.5) * 0.01).multiplyScalar(jit * (0.78 + 0.3 * up));
    colr[i * 3] = cc.r; colr[i * 3 + 1] = cc.g; colr[i * 3 + 2] = cc.b;
  }
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  return g;
}
function solid(geo, color, aoBottom = 0.55, aoTop = 1.0) {   // trunks, cones: uniform colour with a baked bottom-to-top AO ramp
  let g = geo.index ? geo : mergeVertices(geo.deleteAttribute('uv') || geo, 1e-4);
  if (g.attributes.uv) g.deleteAttribute('uv');
  g.computeBoundingBox(); const bb = g.boundingBox, p = g.attributes.position, n = p.count, c = new Float32Array(n * 3), k = new THREE.Color();
  for (let i = 0; i < n; i++) { const t = (p.getY(i) - bb.min.y) / Math.max(1e-3, bb.max.y - bb.min.y); k.copy(color).multiplyScalar(aoBottom + (aoTop - aoBottom) * t); c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
function branch(x0, y0, z0, x1, y1, z1, r0, r1, color) {
  const d = new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0), len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, 5, 1); g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.applyQuaternion(q); g.translate(x0, y0, z0);
  return solid(g, color, 0.7, 1.0);
}

const LEAF = {
  round:   { lo: col(0x1f5a22), hi: col(0x97c94a) },
  oak:     { lo: col(0x2b5a1e), hi: col(0x86b83e) },
  orange:  { lo: col(0x1f5a22), hi: col(0x8dc248) },
  blossom: { lo: col(0xa8527a), hi: col(0xffd3e2) },
  autumn:  { lo: col(0x8a3a12), hi: col(0xf2b23c) },
};

export function makeTreeGeometry(kind, seed = 1, detail = 1) {
  const r = rng(seed * 977);
  const parts = [];
  const bark = col(0x5a3b22);
  if (kind === 'pine') {
    const lo = col(0x0f3a26), hi = col(0x3f8f4c);
    parts.push(solid(new THREE.CylinderGeometry(0.1, 0.2, 1.4, 6, 1).translate(0, 0.7, 0), bark, 0.7));
    const tiers = detail >= 1 ? 5 : 3;
    for (let i = 0; i < tiers; i++) {
      const t = i / (tiers - 1), rad = 1.5 - t * 1.05, h = 1.9 - t * 0.5, y = 0.9 + t * 3.0;
      const cn = new THREE.ConeGeometry(rad, h, 10, 1); cn.deleteAttribute('uv'); let g = mergeVertices(cn, 1e-4);
      const p = g.attributes.position, n = p.count, c = new Float32Array(n * 3), nor = new Float32Array(n * 3), k = new THREE.Color(), v = new THREE.Vector3();
      for (let j = 0; j < n; j++) {
        let x = p.getX(j), yy = p.getY(j), z = p.getZ(j);
        const rr = Math.hypot(x, z), a = Math.atan2(z, x), w = 1 + 0.16 * Math.sin(a * 5 + i * 1.7) * (rr / rad);
        x *= w; z *= w; p.setXYZ(j, x, yy + y + h / 2, z);
        const up = (yy / h + 0.5), rad01 = rr / rad;
        v.set(x, 0.35, z).normalize(); nor[j * 3] = v.x; nor[j * 3 + 1] = v.y; nor[j * 3 + 2] = v.z;
        k.copy(lo).lerp(hi, clamp(up * 0.6 + (1 - rad01) * 0.05 + (i / tiers) * 0.35, 0, 1)); k.multiplyScalar(0.7 + 0.35 * up + 0.1 * (1 - rad01));
        c[j * 3] = k.r; c[j * 3 + 1] = k.g; c[j * 3 + 2] = k.b;
      }
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); parts.push(g);
    }
  } else {
    const pal = LEAF[kind] || LEAF.round, big = kind === 'oak' ? 1.22 : 1.0;
    const trunkH = 1.5;
    parts.push(solid(new THREE.CylinderGeometry(0.13 * big, 0.24 * big, trunkH + 0.2, 7, 1).translate(0, (trunkH + 0.2) / 2, 0), bark, 0.6));
    const hi = detail >= 1;
    const spec = hi
      ? [[0, 2.5, 0, 1.05, 0.9], [0.85, 2.15, 0.3, 0.78, 0.88], [-0.82, 2.2, -0.25, 0.8, 0.88], [0.15, 3.05, -0.1, 0.72, 0.9], [-0.3, 2.0, 0.85, 0.7, 0.85], [0.5, 2.05, -0.8, 0.68, 0.85], [-0.55, 2.85, 0.45, 0.6, 0.9], [0.62, 2.85, 0.4, 0.58, 0.9]]
      : [[0, 2.5, 0, 1.15, 0.9], [0.8, 2.15, 0.25, 0.8, 0.88], [-0.75, 2.15, -0.2, 0.82, 0.88], [0.1, 3.0, -0.1, 0.7, 0.9]];
    const cen = new THREE.Vector3(0, 2.4 * big, 0);
    const o = { lo: pal.lo, hi: pal.hi, center: cen, base: 1.5, top: 3.7 * big, detail: 1, wob: hi ? 0.2 : 0.14 };
    for (const [x, y, z, rad, sy] of spec) parts.push(clump(x * big, y * big, z * big, rad * big, sy, r, o));
    if (hi) { parts.push(branch(0, 1.3, 0, 0.7 * big, 2.0 * big, 0.25 * big, 0.07, 0.04, bark)); parts.push(branch(0, 1.4, 0, -0.65 * big, 2.05 * big, -0.2 * big, 0.07, 0.04, bark)); }
    if (kind === 'orange') { for (let i = 0; i < 9; i++) { const a = r() * 6.28, h = 1.9 + r() * 1.2; const oct = new THREE.OctahedronGeometry(0.11, 0); oct.translate(Math.cos(a) * (0.95 + r() * 0.25), h, Math.sin(a) * (0.95 + r() * 0.25)); parts.push(solid(oct, col(0xf59a1c), 1, 1)); } }
  }
  const g = mergeGeometries(parts.map((q) => { strip(q); if (!q.attributes.normal) q.computeVertexNormals(); return q.index ? q.toNonIndexed() : q; }), false);
  g.computeBoundingSphere();
  return g;
}
export function makeBushGeometry(seed = 3, tone = [0x2a6a2a, 0x8fc548]) {
  const r = rng(seed * 313), cen = new THREE.Vector3(0, 0.4, 0);
  const o = { lo: col(tone[0]), hi: col(tone[1]), center: cen, base: 0, top: 0.95, detail: 1, wob: 0.22 };
  const parts = [clump(0, 0.42, 0, 0.55, 0.8, r, o), clump(0.42, 0.3, 0.15, 0.4, 0.8, r, o), clump(-0.4, 0.3, -0.1, 0.38, 0.8, r, o), clump(0.05, 0.3, 0.4, 0.32, 0.8, r, o)];
  const g = mergeGeometries(parts.map((q) => strip(q).toNonIndexed()), false); g.computeBoundingSphere(); return g;
}
export function makeRockGeometry(seed = 2) {
  const r = rng(seed * 71);
  let g = new THREE.IcosahedronGeometry(0.55, 1); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g, 1e-4);
  const p = g.attributes.position, n = p.count, c = new Float32Array(n * 3), k = new THREE.Color(), lo = col(0x5a5750), hi = col(0xa9a498), moss = col(0x5f7a34);
  for (let i = 0; i < n; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const w = 1 + 0.34 * (Math.sin(x * 5.1 + 1.3) * Math.cos(z * 4.3) + Math.sin(y * 6.1) * 0.5);
    x *= w * 1.1; y *= w * 0.62; z *= w; p.setXYZ(i, x, y + 0.26, z);
    const t = clamp((y + 0.3) / 0.6, 0, 1); k.copy(lo).lerp(hi, t * 0.9 + (r() - 0.5) * 0.25).lerp(moss, clamp((t - 0.55) * 1.2, 0, 0.45) * (0.5 + r()));
    c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g = g.toNonIndexed(); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}

// ---- chunked instances --------------------------------------------------------------------------
export class Chunked {
  // geometry = the detailed tree; geometryLo (optional) = a cheaper one shown on chunks far from the focus
  constructor(scene, geometry, material, cell = 36, geometryLo = null) { this.scene = scene; this.geo = geometry; this.geoLo = geometryLo; this.mat = material; this.cell = cell; this.group = new THREE.Group(); scene.add(this.group); this.chunks = []; this.hiDist = 34; }
  build(items) {   // items: {x,y,z,rot,scale,tint:[r,g,b]}
    const cells = new Map();
    for (const it of items) { const k = Math.floor(it.x / this.cell) + ',' + Math.floor(it.z / this.cell); (cells.get(k) || cells.set(k, []).get(k)).push(it); }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    for (const arr of cells.values()) {
      const make = (geo) => {
        const mesh = new THREE.InstancedMesh(geo, this.mat, arr.length);
        arr.forEach((it, i) => {
          e.set(0, it.rot || 0, 0); q.setFromEuler(e); s.setScalar(it.scale || 1); p.set(it.x, it.y, it.z);
          m.compose(p, q, s); mesh.setMatrixAt(i, m);
          const t = it.tint || [1, 1, 1]; mesh.setColorAt(i, c.setRGB(t[0], t[1], t[2]));
        });
        mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere(); mesh.frustumCulled = true;
        mesh.userData.total = arr.length; mesh.layers.enable(SHADOW_LAYER);
        this.group.add(mesh); return mesh;
      };
      const hi = make(this.geo), lo = this.geoLo ? make(this.geoLo) : null; if (lo) lo.visible = false;
      hi.userData.lo = lo; hi.userData.cx = arr.reduce((a, t) => a + t.x, 0) / arr.length; hi.userData.cz = arr.reduce((a, t) => a + t.z, 0) / arr.length;
      hi.userData.rad = Math.max(...arr.map((t) => Math.hypot(t.x - hi.userData.cx, t.z - hi.userData.cz))) + 3;
      this.chunks.push(hi);
    }
    return this;
  }
  // near chunks get the detailed tree, far ones the cheap one
  update(fx, fz) {
    for (const m of this.chunks) { const u = m.userData; if (!u.lo) continue; const near = Math.hypot(u.cx - fx, u.cz - fz) - u.rad < this.hiDist; m.visible = near; u.lo.visible = !near; }
  }
  setDensity(f) { for (const m of this.chunks) { m.count = Math.max(0, Math.floor(m.userData.total * f)); if (m.userData.lo) m.userData.lo.count = m.count; } }
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
  const mk = (geo, list, cell = 24, mat, geoLo) => { const c = new Chunked(scene, geo, mat || farmMaterial({ vertexColors: true, foliage: true }), cell, geoLo).build(list); out.chunks.push(c); return c; };
  out.pine = mk(makeTreeGeometry('pine', 1, 1), trees.pine, 24, null, makeTreeGeometry('pine', 1, 0));
  out.round = mk(makeTreeGeometry('round', 2, 1), trees.round, 24, null, makeTreeGeometry('round', 2, 0));
  out.oak = mk(makeTreeGeometry('oak', 3, 1), trees.oak, 24, null, makeTreeGeometry('oak', 3, 0));
  out.blossom = mk(makeTreeGeometry('blossom', 4, 1), trees.blossom);
  out.orange = mk(makeTreeGeometry('orange', 5, 1), trees.orange);
  out.bush = mk(makeBushGeometry(3), bushes, 40);
  out.rock = mk(makeRockGeometry(2), rocks, 60, farmMaterial({ vertexColors: true, spec: 0.08 }));
  out.setDensity = (f) => { out.pine.setDensity(f); out.round.setDensity(f); out.oak.setDensity(f); out.bush.setDensity(Math.min(1, f + 0.2)); };
  out.update = (fx, fz) => { out.pine.update(fx, fz); out.round.update(fx, fz); out.oak.update(fx, fz); };
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

// Landscape dressing: working fields all around the farm, hedgerows, tree clusters, haystacks, barrels,
// crates, stumps and a clothesline. Everything is a static merged mesh or a chunked InstancedMesh with
// per-instance colour, so it stays inside the phone budget (tri-cheap shapes, density scaled by tier).
import * as THREE from 'three';
import { farmMaterial } from './shaders.js';
import { Chunked, makeBushGeometry, makeTreeGeometry, makeRockGeometry } from './flora.js';
import { heightAt, WATER_Y } from './terrain.js';
import { Boxes, scarecrowGeometry, fenceGeometry } from './props.js';
import { SU } from './shaders.js';
import { SHADOW_LAYER } from './shadow.js';
import { SCENIC, PATCHES, PATHS, blocked } from '../layout.js';
import { rng, fbm, clamp } from '../util.js';

const col = (h) => new THREE.Color(h);

// ---- one row of crop, 2 units long, standing on the ground (indexed, smooth ridge with baked colour) ----------
const KINDS = {
  wheat:      { h: 0.62, w: 0.5, base: 0x6f8a2c, top: 0xe6b940, spike: 0xf3d060 },
  greenwheat: { h: 0.38, w: 0.5, base: 0x4f8a2a, top: 0x9cc648 },
  corn:       { h: 1.25, w: 0.46, base: 0x36702a, top: 0x8db238, spike: 0xe8d47a },
  sunflower:  { h: 0.95, w: 0.46, base: 0x2f6a26, top: 0x5a9a34, heads: 0xf6c21c },
  tomato:     { h: 0.62, w: 0.5, base: 0x2f6a28, top: 0x62a23a, dots: 0xdc3a2c },
  lettuce:    { h: 0.3, w: 0.5, base: 0x5a9a34, top: 0xb2dd66, balls: true },
  pumpkin:    { h: 0.28, w: 0.55, base: 0x3f7a2c, top: 0x6aa63e, dots: 0xef8620, big: true },
  lavender:   { h: 0.55, w: 0.42, base: 0x4f6a3a, top: 0xa47ad8, spike: 0xc9a4f0 },
};

function cropRowGeometry(kind, seed) {
  const K = KINDS[kind], r = rng(seed * 97 + kind.length), L = 2.0, segs = 6, prof = 5;
  const pos = [], colr = [], idx = [];
  const lo = col(K.base), hi = col(K.top), tmp = new THREE.Color();
  const hs = [0.0, 0.72, 1.0, 0.72, 0.0], xs = [-0.5, -0.27, 0, 0.27, 0.5];
  for (let i = 0; i <= segs; i++) {
    const x = (i / segs - 0.5) * L, nz = 0.75 + 0.5 * r(), hv = 0.85 + 0.3 * Math.sin(i * 1.7 + seed) * 0.5 + 0.15 * r();
    for (let j = 0; j < prof; j++) {
      const hh = K.h * hs[j] * hv * nz;
      pos.push(x, hh + 0.02, xs[j] * K.w);
      const t = hs[j] * (0.55 + 0.45 * nz);
      tmp.copy(lo).lerp(hi, t); if (K.spike && j === 2 && i % 2) tmp.lerp(col(K.spike), 0.55);
      if (j === 0 || j === 4) tmp.multiplyScalar(0.55);
      colr.push(tmp.r, tmp.g, tmp.b);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < prof - 1; j++) { const a = i * prof + j, b = a + prof; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); g.setIndex(idx);
  g = g.toNonIndexed(); g.computeVertexNormals();
  // heads, dots and balls on top, as small merged shapes
  const extras = [];
  const add = (geo, c, x, y, z, s) => { geo.scale(s, s, s); geo.translate(x, y, z); const n = geo.attributes.position.count, cc = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const shade = 0.8 + 0.3 * clamp((geo.attributes.position.getY(i) - y) / s + 0.5, 0, 1); cc[i * 3] = c.r * shade; cc[i * 3 + 1] = c.g * shade; cc[i * 3 + 2] = c.b * shade; } geo.setAttribute('color', new THREE.BufferAttribute(cc, 3)); geo.deleteAttribute('uv'); extras.push(geo.index ? geo.toNonIndexed() : geo); };
  if (K.heads) for (let i = 0; i < 4; i++) { const d = new THREE.CircleGeometry(0.21, 7); d.rotateX(-0.5); add(d, col(K.heads), -0.75 + i * 0.5 + r() * 0.1, K.h * 0.95, 0.12, 1); const c = new THREE.CircleGeometry(0.1, 5); c.rotateX(-0.5); add(c, col(0x5a3a18), -0.75 + i * 0.5, K.h * 0.95 + 0.02, 0.135, 1); }
  if (K.dots) for (let i = 0; i < 5; i++) add(new THREE.OctahedronGeometry(K.big ? 0.16 : 0.08, 0), col(K.dots), -0.8 + i * 0.4 + r() * 0.06, K.big ? 0.2 : K.h * (0.45 + r() * 0.3), (r() - 0.5) * 0.3, 1);
  if (K.balls) for (let i = 0; i < 5; i++) add(new THREE.OctahedronGeometry(0.19, 0), col(i % 2 ? 0x9bd15a : 0xb6e070), -0.8 + i * 0.4, 0.17, (r() - 0.5) * 0.18, 1);
  const parts = [g, ...extras];
  let total = 0; parts.forEach((q) => { total += q.attributes.position.count; });
  const P = new Float32Array(total * 3), N = new Float32Array(total * 3), Cc = new Float32Array(total * 3); let o = 0;
  for (const q of parts) { if (!q.attributes.normal) q.computeVertexNormals(); P.set(q.attributes.position.array, o * 3); N.set(q.attributes.normal.array, o * 3); Cc.set(q.attributes.color.array, o * 3); o += q.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
  out.computeBoundingSphere(); return out;
}

// ---- small props built from boxes and cylinders ---------------------------------------------------------------------
function haystack() { const b = new Boxes(); b.cyl(0, 0, 0, 0.95, 0.95, col(0xd9b04a), 9); b.cone(0, 0.95, 0, 1.0, 0.75, col(0xe6c25c), 9); return b.geometry(); }
function bale() { const b = new Boxes(); b.cyl(0, 0, 0, 0.62, 0.62, col(0xe0b850), 8); b.cyl(0, 0.62, 0, 0.5, 0.06, col(0xb98a34), 8); return b.geometry(); }
function barrel() { const b = new Boxes(); b.cyl(0, 0, 0, 0.36, 0.78, col(0x8a5a30), 8); b.cyl(0, 0.16, 0, 0.375, 0.07, col(0x3c2a1a), 8); b.cyl(0, 0.55, 0, 0.375, 0.07, col(0x3c2a1a), 8); return b.geometry(); }
function crates() { const b = new Boxes(); const w = col(0xb98a52), w2 = col(0x9a6d3a); b.box(0, 0.32, 0, 0.72, 0.64, 0.72, w).box(0.05, 0.96, 0.02, 0.62, 0.6, 0.62, w2, 0.4).box(0.85, 0.28, 0.2, 0.62, 0.56, 0.62, w2, -0.3); b.box(0.85, 0.6, 0.2, 0.5, 0.06, 0.5, col(0xd9503a), -0.3); return b.geometry(); }
function stump() { const b = new Boxes(); b.cyl(0, 0, 0, 0.34, 0.42, col(0x6a4628), 7); b.cyl(0, 0.42, 0, 0.26, 0.02, col(0xd6b07a), 7); return b.geometry(); }
function logs() { const b = new Boxes(); const c = col(0x7a5030), e = col(0xd6b07a); for (let i = 0; i < 3; i++) b.box(0, 0.16 + (i > 1 ? 0.28 : 0), (i % 2 ? 0.2 : -0.2) * (i > 1 ? 0 : 1), 1.5, 0.3, 0.3, c); b.box(0, 0.16, -0.5, 1.5, 0.3, 0.3, c); return b.geometry(); }
function clothesline() {
  const b = new Boxes(), wood = col(0x8a5a32);
  b.box(-1.6, 0.9, 0, 0.1, 1.8, 0.1, wood).box(1.6, 0.9, 0, 0.1, 1.8, 0.1, wood).box(0, 1.65, 0, 3.2, 0.03, 0.03, col(0xd9d2c0));
  const cl = [0xf2f0ea, 0xd9503a, 0x4f8fe0, 0xf2c94c, 0xffffff, 0x8ec86a];
  cl.forEach((c, i) => b.box(-1.25 + i * 0.5, 1.3, 0, 0.36, 0.6 + (i % 3) * 0.12, 0.03, col(c)));
  return b.geometry();
}
function mergeStatic(list) {   // [{geo, x, z, rot, sc}] -> one BufferGeometry with heights baked
  let total = 0; for (const it of list) total += it.geo.attributes.position.count;
  const P = new Float32Array(total * 3), N = new Float32Array(total * 3), C = new Float32Array(total * 3); let o = 0;
  const m = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3();
  for (const it of list) {
    const y = it.y != null ? it.y : heightAt(it.x, it.z); m.compose(new THREE.Vector3(it.x, y, it.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, it.rot || 0, 0)), new THREE.Vector3(it.sc || 1, it.sc || 1, it.sc || 1)); nm.getNormalMatrix(m);
    const a = it.geo.attributes, n = a.position.count;
    for (let i = 0; i < n; i++) { v.fromBufferAttribute(a.position, i).applyMatrix4(m); P.set([v.x, v.y, v.z], (o + i) * 3); v.fromBufferAttribute(a.normal, i).applyMatrix3(nm).normalize(); N.set([v.x, v.y, v.z], (o + i) * 3); C.set([a.color.getX(i), a.color.getY(i), a.color.getZ(i)], (o + i) * 3); }
    o += n;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.computeBoundingSphere(); return g;
}

export function buildDress(scene, q) {
  const r = rng(777), out = { chunks: [] };
  const dens = q.trees || 1;
  const shuf = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const chunk = (geo, list, cell, mat) => { shuf(list); const c = new Chunked(scene, geo, mat || farmMaterial({ vertexColors: true, foliage: true }), cell); c.build(list); c.mat = c.mat; out.chunks.push(c); return c; };
  const item = (x, z, sc, tint, rot) => ({ x, y: heightAt(x, z), z, rot: rot != null ? rot : r() * 6.28, scale: sc, tint });
  const dry = (x, z) => heightAt(x, z) > WATER_Y + 0.4;

  // ---- fields ---------------------------------------------------------------------------------------------------------------
  const rows = {}; const soil = [];
  for (const f of SCENIC) {
    const w = f.x1 - f.x0, d = f.z1 - f.z0, nb = f.kinds.length;
    soil.push({ x0: f.x0, z0: f.z0, x1: f.x1, z1: f.z1 });
    // blocks run across the field (strips of the long side), each a different crop or growth stage
    const long = w >= d;
    f.kinds.forEach((kind, b) => {
      const a0 = b / nb, a1 = (b + 1) / nb;
      const bx0 = long ? f.x0 + w * a0 : f.x0, bx1 = long ? f.x0 + w * a1 : f.x1, bz0 = long ? f.z0 : f.z0 + d * a0, bz1 = long ? f.z1 : f.z0 + d * a1;
      const nrow = Math.max(1, Math.floor((bz1 - bz0 - 0.4) / 0.72)), ncol = Math.max(1, Math.floor((bx1 - bx0) / 2.0));
      const ox = bx0 + ((bx1 - bx0) - ncol * 2.0) / 2 + 1.0;
      for (let i = 0; i < nrow; i++) for (let k = 0; k < ncol; k++) {
        const x = ox + k * 2.0, z = bz0 + 0.5 + i * 0.72 + ((bz1 - bz0 - 0.4) - (nrow - 1) * 0.72) / 2 - 0.05;
        const g = 0.85 + 0.3 * r(), ripe = kind === 'wheat' ? 0.9 + 0.2 * fbm(x * 0.2, z * 0.2, 2) : g;
        (rows[kind] || (rows[kind] = [])).push({ x, y: heightAt(x, z), z, rot: 0, scale: 1, tint: [ripe, ripe * (0.96 + 0.08 * r()), g * 0.96] });
      }
    });
  }
  // soil under every field: one merged, darkened quad set with the shared soil detail
  { const pos = [], colr = [], idx = []; let n = 0;
    for (const s of soil) { const S = 4; for (let j = 0; j <= S; j++) for (let i = 0; i <= S; i++) { const x = s.x0 - 0.3 + (s.x1 - s.x0 + 0.6) * i / S, z = s.z0 - 0.3 + (s.z1 - s.z0 + 0.6) * j / S; pos.push(x, heightAt(x, z) + 0.03, z); const t = 0.85 + 0.3 * fbm(x * 0.4, z * 0.4, 2); colr.push(0.34 * t, 0.21 * t, 0.11 * t); } for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const a = n + j * (S + 1) + i, b = a + 1, c = a + S + 1, d = c + 1; idx.push(a, c, b, b, c, d); } n += (S + 1) * (S + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, farmMaterial({ vertexColors: true, detail: 'soil', spec: 0.02, rough: 0.95 })); m.frustumCulled = false; m.name = 'scenic-soil'; scene.add(m); out.soil = m; }
  const cropMat = farmMaterial({ vertexColors: true, foliage: false, spec: 0.05, rough: 0.8 });
  out.fields = {};
  for (const [kind, list] of Object.entries(rows)) { const c = new Chunked(scene, cropRowGeometry(kind, kind.length * 7), cropMat, 30); out.fields[kind] = c; c.build(shuf(list)); out.chunks.push(c); }

  // ---- fields waiting to be bought: the unowned lots look like working farmland until you take them ---------------------------
  const fallowKinds = ['wheat', 'sunflower', 'lavender', 'corn', 'lettuce', 'tomato', 'pumpkin', 'greenwheat', 'wheat'];
  const rowGeos = {}; const fallow = {};
  PATCHES.forEach((p, pi) => {
    const kind = fallowKinds[pi % fallowKinds.length], g = new THREE.Group(); g.name = 'fallow-' + p.id;
    const geo = rowGeos[kind] || (rowGeos[kind] = cropRowGeometry(kind, kind.length * 7));
    const mesh = new THREE.InstancedMesh(geo, cropMat, 18), m4 = new THREE.Matrix4(), c = new THREE.Color(); let n = 0;
    for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++) { const x = p.x + (k - 1) * 2.0, z = p.z + (i - 2.5) * 0.72; m4.makeTranslation(x, heightAt(x, z), z); mesh.setMatrixAt(n, m4); const t = 0.88 + 0.24 * r(); mesh.setColorAt(n++, c.setRGB(t, t * 0.98, t * 0.94)); }
    mesh.frustumCulled = false; g.add(mesh);
    const sg = new THREE.PlaneGeometry(6.9, 4.7, 3, 3); sg.rotateX(-Math.PI / 2); const sp = sg.attributes.position, sc = new Float32Array(sp.count * 3);
    for (let i = 0; i < sp.count; i++) { sp.setXYZ(i, sp.getX(i) + p.x, heightAt(p.x, p.z) + 0.03, sp.getZ(i) + p.z); const t = 0.85 + 0.3 * r(); sc[i * 3] = 0.34 * t; sc[i * 3 + 1] = 0.21 * t; sc[i * 3 + 2] = 0.11 * t; }
    sg.setAttribute('color', new THREE.BufferAttribute(sc, 3)); sg.deleteAttribute('uv');
    g.add(new THREE.Mesh(sg, farmMaterial({ vertexColors: true, detail: 'soil', spec: 0.02, rough: 0.95 })));
    g.traverse((o) => { o.frustumCulled = false; }); scene.add(g); fallow[p.id] = g;
  });
  out.syncPatches = (owned) => { for (const id of Object.keys(fallow)) fallow[id].visible = !owned[id]; };

  // ---- hedgerows: bushes marching around every field and along the lanes ----------------------------------------------------
  const B1 = makeBushGeometry(21, [0x27561f, 0x86b043], 0), B2 = makeBushGeometry(22, [0x2f5a22, 0xa3b44a], 0), B3 = makeBushGeometry(23, [0x1f4a27, 0x6f9c3c], 0), B4 = makeBushGeometry(24, [0x3a5a24, 0xc0b552], 0), BF = makeBushGeometry(25, [0x2f5a24, 0xf28fb8], 0), BY = makeBushGeometry(26, [0x35602a, 0xf5d24a], 0);
  const bushLists = [[], [], [], [], [], []];
  const tone = () => { const t = 0.85 + r() * 0.35; return [t, t * (0.95 + r() * 0.1), t * (0.9 + r() * 0.12)]; };
  const putBush = (x, z, sc) => { if (!dry(x, z) || blocked(x, z, 0.2)) return; const pick = r(); const li = pick < 0.24 ? 0 : pick < 0.46 ? 1 : pick < 0.68 ? 2 : pick < 0.82 ? 3 : pick < 0.92 ? 4 : 5; bushLists[li].push(item(x, z, sc, li >= 4 ? [1, 1, 1] : tone())); };
  for (const f of SCENIC) {
    const step = 1.9;
    for (let x = f.x0 - 1.2; x <= f.x1 + 1.2; x += step) { if (r() < 0.8) putBush(x + (r() - 0.5) * 0.6, f.z0 - 1.5 + (r() - 0.5) * 0.5, 0.9 + r() * 0.5); if (r() < 0.8) putBush(x + (r() - 0.5) * 0.6, f.z1 + 1.5 + (r() - 0.5) * 0.5, 0.9 + r() * 0.5); }
    for (let z = f.z0; z <= f.z1; z += step) { if (r() < 0.7) putBush(f.x0 - 1.5 + (r() - 0.5) * 0.5, z + (r() - 0.5) * 0.6, 0.9 + r() * 0.5); if (r() < 0.7) putBush(f.x1 + 1.5 + (r() - 0.5) * 0.5, z + (r() - 0.5) * 0.6, 0.9 + r() * 0.5); }
  }
  // borders of the playable field patches: broken hedges, and flower borders along the lanes
  for (const p of PATCHES) for (let a = 0; a < 6.28; a += 0.36) { if (r() < 0.55) continue; putBush(p.x + Math.cos(a) * 7.6 * 1.0 + (r() - 0.5) * 0.5, p.z + Math.sin(a) * 5.2 + (r() - 0.5) * 0.4, 0.7 + r() * 0.5); }
  for (const path of PATHS) for (let i = 0; i < path.length - 1; i++) { const [ax, az] = path[i], [bx, bz] = path[i + 1], len = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / len, nz = (bx - ax) / len; for (let t = 0; t < len; t += 2.3) { const x = ax + (bx - ax) * t / len, z = az + (bz - az) * t / len; for (const sd of [-1, 1]) if (r() < 0.32) putBush(x + nx * sd * (1.9 + r() * 0.8), z + nz * sd * (1.9 + r() * 0.8), 0.55 + r() * 0.45); } }
  // scattered shrubs in the meadow
  for (let i = 0; i < 90; i++) { const a = r() * 6.28, d = 12 + r() * 30; putBush(-2 + Math.cos(a) * d * 1.15, 4 + Math.sin(a) * d * 0.9, 0.7 + r() * 0.8); }
  const BG = [B1, B2, B3, B4, BF, BY]; out.bushes = BG.map((g, i) => chunk(g, bushLists[i], 40));

  // ---- tree clusters and hedgerow trees --------------------------------------------------------------------------------------
  const T = { round: makeTreeGeometry('round', 12, 0), oak: makeTreeGeometry('oak', 13, 0), pine: makeTreeGeometry('pine', 14, 0), blossom: makeTreeGeometry('blossom', 15, 0), orange: makeTreeGeometry('orange', 16, 0) };
  const tl = { round: [], oak: [], pine: [], blossom: [], orange: [] };
  const putTree = (kind, x, z, sc) => { if (!dry(x, z) || blocked(x, z, 0.8)) return; tl[kind].push(item(x, z, sc * (0.85 + r() * 0.4), [0.88 + r() * 0.24, 0.9 + r() * 0.2, 0.86 + r() * 0.24])); };
  const clusters = [[-30, -20], [-26, 12], [-32, 37], [-10, -24], [12, -22], [26, -16], [30, 14], [34, 30], [14, 30], [-6, 30], [-27, 21], [-21, -30], [20, -30], [24, 32], [-16, 40], [0, 46]];
  for (const [cx, cz] of clusters) { const n = 4 + Math.floor(r() * 5); for (let i = 0; i < n; i++) { const a = r() * 6.28, d = r() * 4.6; const k = r() < 0.36 ? 'round' : r() < 0.55 ? 'oak' : r() < 0.7 ? 'blossom' : r() < 0.85 ? 'orange' : 'pine'; putTree(k, cx + Math.cos(a) * d, cz + Math.sin(a) * d * 0.8, 1.0 + r() * 0.7); } }
  // a row of trees on the far side of each scenic field, like a shelter belt
  for (const f of SCENIC) for (let x = f.x0 - 2; x <= f.x1 + 2; x += 4.5) putTree(r() < 0.5 ? 'round' : 'oak', x + (r() - 0.5), f.z0 - 4.6 + (r() - 0.5) * 1.2, 1.2 + r() * 0.5);
  out.trees = Object.entries(tl).map(([k, list]) => chunk(T[k], list, 40));

  // ---- clutter ---------------------------------------------------------------------------------------------------------------
  const st = [];
  const put = (geo, x, z, rot, sc) => st.push({ geo, x, z, rot, sc });
  const hay = haystack(), bl = bale(), br = barrel(), cr = crates(), sp = stump(), lg = logs(), cl = clothesline(), sc = scarecrowGeometry();
  for (const f of SCENIC) {
    put(hay, f.x1 + 2.4 * (r() < 0.5 ? 1 : -1) * 0 + 2.8, f.z1 - 1.5, r() * 6, 1.0 + r() * 0.3);
    put(bl, f.x0 - 2.6, f.z0 + 2 + r() * 4, r() * 6, 1); put(bl, f.x0 - 2.7, f.z0 + 3.3 + r() * 4, r() * 6, 0.9);
    put(sc, (f.x0 + f.x1) / 2 + (r() - 0.5) * 3, (f.z0 + f.z1) / 2 + 0.2, r() * 6, 1.1);
  }
  // near the barn, cottage and market: the small things that make a farm look lived in
  put(br, -12.7, -5.6, 0, 1); put(br, -13.4, -5.0, 1, 1); put(br, -12.6, -4.6, 2, 0.9); put(cr, -7.4, -6.6, 0.3, 1); put(cr, -1.6, -5.2, 2.6, 0.9);
  put(hay, -14.8, -1.4, 0.4, 1.1); put(hay, -17.2, -3.4, 1.4, 0.95); put(bl, -13.6, -2.4, 0, 1); put(bl, -12.4, -1.8, 1, 0.9);
  put(cl, 6.4, -7.4, 0.15, 1); put(lg, 4.2, -13.2, 0.5, 1); put(lg, -4.6, -14.4, -0.4, 1);
  put(br, 3.7, -5.9, 0, 0.9); put(cr, 3.0, -6.1, 0.4, 0.8);
  for (let i = 0; i < 14; i++) { const a = r() * 6.28, d = 16 + r() * 22, x = -2 + Math.cos(a) * d * 1.1, z = 4 + Math.sin(a) * d * 0.85; if (dry(x, z) && !blocked(x, z, 0.5)) put(r() < 0.55 ? sp : lg, x, z, r() * 6, 0.8 + r() * 0.5); }
  const rocks = [];
  for (let i = 0; i < 60; i++) { const a = r() * 6.28, d = 10 + r() * 34, x = -2 + Math.cos(a) * d * 1.1, z = 4 + Math.sin(a) * d * 0.9; if (dry(x, z) && !blocked(x, z, 0.3)) rocks.push(item(x, z, 0.5 + r() * 0.7, [0.85 + r() * 0.2, 0.85 + r() * 0.2, 0.85 + r() * 0.2])); }
  out.rocks = chunk(makeRockGeometry(9), rocks, 50, farmMaterial({ vertexColors: true, spec: 0.08 }));
  const merged = mergeStatic(st);
  const pm = new THREE.Mesh(merged, farmMaterial({ vertexColors: true, detail: 'wood', spec: 0.06, rough: 0.85 })); pm.frustumCulled = false; pm.name = 'clutter'; pm.layers.enable(SHADOW_LAYER); scene.add(pm); out.clutter = pm;

  for (const c of out.chunks) c.group.traverse((o) => { if (o.isMesh) o.layers.enable(SHADOW_LAYER); });
  out.setDensity = (f) => { for (const c of out.chunks) c.setDensity(Math.min(1, f)); };
  out.setDensity(dens);
  return out;
}

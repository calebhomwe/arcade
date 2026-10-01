// Field beds and the crops growing in them. Each crop type is one instanced mesh; the plant's growth
// (seed -> sprout -> leafy -> ripe with swelling fruit) is decided in the vertex shader from a single number.
import * as THREE from 'three';
import { CROP_VERT, CROP_FRAG, SU, farmMaterial } from './shaders.js';
import { CROPS } from '../data.js';
import { ALL_PLOTS, CROP as CROPD } from '../state.js';
import { PLOT } from '../layout.js';
import { rng, clamp } from '../util.js';

const col = (h) => new THREE.Color(h);

// ---- tiny mesh builder ----------------------------------------------------------------------------------
class MB {
  constructor() { this.p = []; this.c = []; this.part = []; this.anc = []; }
  tri(a, b, c, color, part = 0, anchor = [0, 0, 0]) { for (const v of [a, b, c]) { this.p.push(v[0], v[1], v[2]); this.c.push(color.r, color.g, color.b); this.part.push(part); this.anc.push(anchor[0], anchor[1], anchor[2]); } }
  quad(a, b, c, d, color, part, anchor) { this.tri(a, b, c, color, part, anchor); this.tri(a, c, d, color, part, anchor); }
  blade(base, ang, len, w, color, curl = 0.4, part = 0, tip = null) {
    const dx = Math.cos(ang), dz = Math.sin(ang), px = -dz, pz = dx, seg = 3;
    let prev = null;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, r = len * t, y = base[1] + len * (0.55 * t + 0.6 * (1 - curl) * t) * (1 - 0.35 * curl * t) - curl * len * 0.5 * t * t, ww = w * (1 - t * 0.92) * 0.5;
      const cx = base[0] + dx * r * (0.35 + 0.65 * curl + 0.2), cz = base[2] + dz * r * (0.35 + 0.65 * curl + 0.2);
      const cur = [[cx - px * ww, y, cz - pz * ww], [cx + px * ww, y, cz + pz * ww]];
      if (prev) { const shade = col(0x000000).copy(tip && i === seg ? tip : color).multiplyScalar(0.82 + 0.18 * t); this.quad(prev[0], prev[1], cur[1], cur[0], shade, part, base); }
      prev = cur;
    }
  }
  tube(x, z, h, r0, r1, color, sides = 5, part = 0, y0 = 0, lean = [0, 0]) {
    for (let i = 0; i < sides; i++) {
      const a0 = i / sides * Math.PI * 2, a1 = (i + 1) / sides * Math.PI * 2;
      const b0 = [x + Math.cos(a0) * r0, y0, z + Math.sin(a0) * r0], b1 = [x + Math.cos(a1) * r0, y0, z + Math.sin(a1) * r0];
      const t0 = [x + lean[0] + Math.cos(a0) * r1, y0 + h, z + lean[1] + Math.sin(a0) * r1], t1 = [x + lean[0] + Math.cos(a1) * r1, y0 + h, z + lean[1] + Math.sin(a1) * r1];
      this.quad(b0, b1, t1, t0, color, part, [x, y0, z]);
    }
  }
  blob(cx, cy, cz, rx, ry, rz, color, part = 0, detail = 0, tint = 0.1, seed = 1) {
    const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position, r = rng(seed * 13 + 1);
    for (let i = 0; i < p.count; i += 3) {
      const j = 1 + (r() - 0.5) * tint * 2; const c = color.clone().multiplyScalar(j);
      const v = [0, 1, 2].map((k) => [cx + p.getX(i + k) * rx, cy + p.getY(i + k) * ry, cz + p.getZ(i + k) * rz]);
      this.tri(v[0], v[1], v[2], c, part, [cx, cy, cz]);
    }
  }
  cone(cx, cy, cz, r, h, color, part = 0, sides = 6, ang = 0) {
    const tip = [cx, cy - h * 0.0, cz], top = [cx, cy + h, cz];
    for (let i = 0; i < sides; i++) {
      const a0 = i / sides * Math.PI * 2 + ang, a1 = (i + 1) / sides * Math.PI * 2 + ang;
      this.tri([cx + Math.cos(a0) * r, cy, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, cy, cz + Math.sin(a1) * r], top, color, part, [cx, cy, cz]);
    }
  }
  disc(cx, cy, cz, r, color, part = 0, sides = 10, tilt = 0.5) {
    const c = [cx, cy + Math.sin(tilt) * 0.0, cz];
    for (let i = 0; i < sides; i++) {
      const a0 = i / sides * Math.PI * 2, a1 = (i + 1) / sides * Math.PI * 2;
      const mk = (a) => [cx + Math.cos(a) * r * Math.cos(tilt), cy + Math.sin(a) * r, cz + Math.cos(a) * r * Math.sin(tilt) * 0.0 + Math.sin(a) * 0];
      this.tri([cx, cy, cz + 0.0], [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r * 0.55 + 0.0, cz + 0.0 + Math.sin(a0) * r * 0.4], [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r * 0.55, cz + Math.sin(a1) * r * 0.4], color, part, [cx, cy, cz]);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aPart', new THREE.Float32BufferAttribute(this.part, 1));
    g.setAttribute('aAnchor', new THREE.Float32BufferAttribute(this.anc, 3));
    g.computeVertexNormals();
    return g;
  }
}

// ---- one recipe per crop ------------------------------------------------------------------------------------
const G = (h) => col(h);
function bushLeaves(b, n, len, w, color, rr, h0, r) { for (let i = 0; i < n; i++) b.blade([Math.cos(i * 2.4) * rr * r(), h0, Math.sin(i * 2.4) * rr * r()], i * 2.4 + r(), len * (0.8 + r() * 0.4), w, color, 0.35 + r() * 0.3); }
const RECIPE = {
  wheat: (b, r) => { for (let i = 0; i < 6; i++) { const a = i * 1.05, x = Math.cos(a) * 0.12 * r(), z = Math.sin(a) * 0.12 * r(), h = 0.62 + r() * 0.16; b.tube(x, z, h, 0.014, 0.01, G(0xb8c040), 4, 0, 0, [Math.cos(a) * 0.05, Math.sin(a) * 0.05]); b.blob(x + Math.cos(a) * 0.05, h + 0.09, z + Math.sin(a) * 0.05, 0.035, 0.11, 0.035, G(0xe9b73a), 2, 0, 0.08, i); }
    for (let i = 0; i < 5; i++) b.blade([0, 0.02, 0], i * 1.3, 0.42, 0.06, G(0x7fb33c), 0.5); },
  corn: (b, r) => { b.tube(0, 0, 0.9, 0.05, 0.035, G(0x7fb33c), 5); for (let i = 0; i < 5; i++) b.blade([0, 0.15 + i * 0.15, 0], i * 1.9, 0.55, 0.11, G(0x63a832), 0.55);
    b.blob(0.09, 0.55, 0.03, 0.05, 0.13, 0.05, G(0xf5c518), 1, 0, 0.06, 2); b.blob(-0.07, 0.42, -0.04, 0.045, 0.11, 0.045, G(0xf2bb14), 1, 0, 0.06, 3); b.cone(0, 0.92, 0, 0.05, 0.14, G(0xe8c060), 2, 5); },
  carrot: (b, r) => { for (let i = 0; i < 7; i++) b.blade([0, 0.02, 0], i * 0.9, 0.42, 0.07, G(0x4fb03a), 0.4 + (i % 3) * 0.12);
    b.cone(0.04, 0.03, 0.02, 0.055, -0.16, G(0xf58a1e), 1, 5); b.blob(0.04, 0.03, 0.02, 0.058, 0.03, 0.058, G(0xf58a1e), 1, 0, 0.05, 4); },
  sunflower: (b, r) => { b.tube(0, 0, 1.05, 0.04, 0.03, G(0x5aa030), 5, 0, 0, [0.02, 0.0]); for (let i = 0; i < 4; i++) b.blade([0, 0.2 + i * 0.2, 0], i * 1.7, 0.36, 0.14, G(0x4f9a2c), 0.6);
    const hy = 1.08; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; b.blob(Math.cos(a) * 0.15, hy + Math.sin(a) * 0.15 * 0.4, Math.sin(a) * 0.05 + 0.09, 0.07, 0.04, 0.02, G(0xffcc18), 2, 0, 0.05, i + 5); }
    b.blob(0.0, hy, 0.07, 0.11, 0.08, 0.04, G(0x6a3f18), 2, 0, 0.05, 9); },
  tomato: (b, r) => { for (let i = 0; i < 3; i++) b.tube(Math.cos(i * 2.1) * 0.05, Math.sin(i * 2.1) * 0.05, 0.55 + i * 0.05, 0.02, 0.014, G(0x6aa63a), 4);
    bushLeaves(b, 9, 0.28, 0.13, G(0x3f9a30), 0.15, 0.2, r); for (let i = 0; i < 5; i++) b.blob(Math.cos(i * 1.4) * 0.16, 0.18 + (i % 3) * 0.14, Math.sin(i * 1.4) * 0.16, 0.06, 0.06, 0.06, G(0xe23b2e), 1, 0, 0.06, i); },
  strawberry: (b, r) => { bushLeaves(b, 9, 0.24, 0.14, G(0x3d9a33), 0.12, 0.03, r); for (let i = 0; i < 6; i++) { const a = i * 1.1; b.cone(Math.cos(a) * 0.17, 0.09, Math.sin(a) * 0.17, 0.045, -0.09, G(0xe8284a), 1, 6); b.blob(Math.cos(a) * 0.17, 0.1, Math.sin(a) * 0.17, 0.05, 0.03, 0.05, G(0xe8284a), 1, 0, 0.05, i); } },
  potato: (b, r) => { bushLeaves(b, 11, 0.32, 0.13, G(0x4a9a35), 0.14, 0.05, r); for (let i = 0; i < 4; i++) b.blob(Math.cos(i * 1.6) * 0.14, 0.34 + (i % 2) * 0.08, Math.sin(i * 1.6) * 0.14, 0.04, 0.04, 0.04, G(0xb890d8), 2, 0, 0.05, i);
    for (let i = 0; i < 3; i++) b.blob(Math.cos(i * 2.1) * 0.18, 0.03, Math.sin(i * 2.1) * 0.18, 0.07, 0.05, 0.06, G(0xc99a5b), 1, 0, 0.06, i + 3); },
  blueberry: (b, r) => { b.blob(0, 0.28, 0, 0.26, 0.24, 0.26, G(0x3f8f34), 0, 1, 0.14, 1); for (let i = 0; i < 9; i++) { const a = i * 0.8, y = 0.2 + (i % 4) * 0.08; b.blob(Math.cos(a) * 0.2, y, Math.sin(a) * 0.2, 0.038, 0.038, 0.038, G(0x4f6bd8), 1, 0, 0.05, i); } },
  cotton: (b, r) => { for (let i = 0; i < 3; i++) { b.tube(Math.cos(i * 2.1) * 0.07, Math.sin(i * 2.1) * 0.07, 0.6, 0.018, 0.012, G(0x8a7a48), 4); } bushLeaves(b, 8, 0.24, 0.12, G(0x4f9a35), 0.12, 0.25, r);
    for (let i = 0; i < 6; i++) { const a = i * 1.05; b.blob(Math.cos(a) * 0.14, 0.36 + (i % 3) * 0.12, Math.sin(a) * 0.14, 0.07, 0.065, 0.07, G(0xf7f7f2), 1, 0, 0.03, i); } },
  chili: (b, r) => { b.tube(0, 0, 0.45, 0.025, 0.018, G(0x63a032), 4); bushLeaves(b, 9, 0.26, 0.11, G(0x3f9a30), 0.12, 0.15, r); for (let i = 0; i < 6; i++) { const a = i * 1.05; b.cone(Math.cos(a) * 0.15, 0.32 + (i % 2) * 0.1, Math.sin(a) * 0.15, 0.03, -0.16, G(0xd8281c), 1, 5); b.blob(Math.cos(a) * 0.15, 0.32 + (i % 2) * 0.1, Math.sin(a) * 0.15, 0.033, 0.04, 0.033, G(0xd8281c), 1, 0, 0.05, i); } },
  sugarcane: (b, r) => { for (let i = 0; i < 4; i++) { const a = i * 1.6, x = Math.cos(a) * 0.1, z = Math.sin(a) * 0.1; b.tube(x, z, 1.25 + i * 0.05, 0.035, 0.028, G(0xa6c850), 5, 0, 0, [Math.cos(a) * 0.04, Math.sin(a) * 0.04]);
    for (let k = 0; k < 4; k++) b.blade([x, 0.85 + i * 0.05, z], a + k * 1.6, 0.4, 0.07, G(0x6db03a), 0.5); } },
  grapes: (b, r) => { b.tube(0, 0, 0.7, 0.04, 0.03, G(0x6a4a30), 5); bushLeaves(b, 10, 0.3, 0.16, G(0x3e9a36), 0.13, 0.35, r); for (let i = 0; i < 5; i++) { const a = i * 1.3; for (let k = 0; k < 4; k++) b.blob(Math.cos(a) * 0.15 + (k % 2) * 0.04, 0.42 - k * 0.055, Math.sin(a) * 0.15, 0.04, 0.04, 0.04, G(0x7a3fa8), 1, 0, 0.06, i * 4 + k); } },
  pumpkin: (b, r) => { for (let i = 0; i < 6; i++) b.blade([0, 0.03, 0], i * 1.1, 0.4, 0.2, G(0x3f9a30), 0.5); b.blob(0.05, 0.11, 0.06, 0.2, 0.15, 0.2, G(0xf07a1a), 1, 1, 0.08, 3); b.cone(0.05, 0.24, 0.06, 0.03, 0.06, G(0x5a8a30), 1, 4); },
  watermelon: (b, r) => { for (let i = 0; i < 5; i++) b.blade([0, 0.03, 0], i * 1.3, 0.38, 0.18, G(0x3a9a34), 0.5); b.blob(0.03, 0.14, 0.04, 0.22, 0.17, 0.17, G(0x3fa84a), 1, 1, 0.14, 4); },
  pineapple: (b, r) => { for (let i = 0; i < 9; i++) b.blade([0, 0.03, 0], i * 0.7, 0.5, 0.09, G(0x4a9a30), 0.35 + (i % 3) * 0.1); b.blob(0, 0.25, 0, 0.11, 0.17, 0.11, G(0xf0c020), 1, 1, 0.08, 5); for (let i = 0; i < 7; i++) b.blade([0, 0.4, 0], i * 0.9, 0.24, 0.06, G(0x4f9a30), 0.2, 1); },
};

const GRIDS = { blueberry: 2, tomato: 2, strawberry: 3, potato: 2, cotton: 2, chili: 2, grapes: 2, pumpkin: 2, watermelon: 2, pineapple: 2, sunflower: 3 };

export function makeCropGeometry(id) {
  const b = new MB(), r = rng(id.length * 131 + id.charCodeAt(0));
  RECIPE[id](b, r);
  return b.geometry();
}

// soil bed with three ridges and a wooden frame, as one merged geometry
export function makeBedGeometry() {
  // One plot of tilled soil: three furrowed rows running along x, crests at z = -0.62, 0, +0.62. Neighbouring plots
  // touch, so a patch reads as one continuous field with no picture frames around each square.
  const pos = [], col_ = [], idx = [];
  const W = 2.12, rows = 12, segs = 6, period = 0.62;
  const soilLo = col(0x3a2412), soilHi = col(0x6d4726);
  const push = (x, y, z, c) => { pos.push(x, y, z); col_.push(c.r, c.g, c.b); return pos.length / 3 - 1; };
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= segs; i++) {
    const x = (i / segs - 0.5) * W, z = (j / rows - 0.5) * W;
    const ridge = 0.5 + 0.5 * Math.cos(z / period * Math.PI * 2);
    const y = 0.05 + ridge * 0.11;
    const edge = Math.min(1, Math.min(Math.abs(x), Math.abs(z)) < W / 2 - 0.04 ? 1 : 0.6);
    const c = soilLo.clone().lerp(soilHi, ridge * 0.9).multiplyScalar((0.9 + 0.2 * Math.sin(i * 12.9 + j * 4.1)) * edge);
    push(x, y, z, c);
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < segs; i++) { const a = j * (segs + 1) + i, b = a + 1, c = a + segs + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col_, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;   // indexed and smooth, so the furrows shade like soil
}

export class CropSystem {
  constructor(scene, farm) {
    this.scene = scene; this.farm = farm;
    this.group = new THREE.Group(); scene.add(this.group);
    const n = ALL_PLOTS.length;
    // beds
    const bedMat = farmMaterial({ vertexColors: true, detail: 'soil', spec: 0.03, rough: 0.95 });
    this.beds = new THREE.InstancedMesh(makeBedGeometry(), bedMat, n);
    this.beds.frustumCulled = false; this.group.add(this.beds);
    this.plots = ALL_PLOTS;
    this.bedIndex = new Map(); ALL_PLOTS.forEach((p, i) => this.bedIndex.set(p.id, i));
    const m = new THREE.Matrix4(), c = new THREE.Color();
    ALL_PLOTS.forEach((p, i) => { m.makeTranslation(p.x, 0, p.z); this.beds.setMatrixAt(i, m); this.beds.setColorAt(i, c.setRGB(1, 1, 1)); });
    this.beds.count = 0;
    // crop meshes
    this.mats = {};
    this.cropMesh = {};
    const cropMat = new THREE.ShaderMaterial({ vertexShader: CROP_VERT, fragmentShader: CROP_FRAG, vertexColors: true, side: THREE.DoubleSide, uniforms: SU });
    for (const cdef of CROPS) {
      const grid = GRIDS[cdef.id] || 3, cap = n * grid * grid;
      const mesh = new THREE.InstancedMesh(makeCropGeometry(cdef.id), cropMat, cap);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
      mesh.frustumCulled = false; mesh.count = 0; mesh.visible = false; mesh.userData.grid = grid;
      this.group.add(mesh); this.cropMesh[cdef.id] = mesh;
    }
    this.rand = rng(99);
    this.jit = new Map();    // per plot jitter so plants don't reshuffle every update
    this.lastFrac = new Map();
    this.pops = new Map();
    this.glowData = new Float32Array(n * 4);
    this.acc = 0;
  }

  jitter(plotId, grid) {
    const key = plotId + ':' + grid;
    let j = this.jit.get(key);
    if (!j) {
      const r = rng([...plotId].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) + grid), arr = [];
      const sz = grid >= 3 ? 0.62 : 1.24, sx = grid >= 3 ? 0.62 : 1.0;   // plants stand on the furrow crests
      for (let i = 0; i < grid; i++) for (let k = 0; k < grid; k++) arr.push({ x: (i - (grid - 1) / 2) * sx + (r() - 0.5) * 0.12, z: (k - (grid - 1) / 2) * sz + (r() - 0.5) * 0.05, rot: r() * 6.28, s: 0.86 + r() * 0.3, ph: r() });
      j = arr; this.jit.set(key, j);
    }
    return j;
  }

  // rebuild every instance from the farm state (cheap: at most 54 plots)
  sync() {
    const S = this.farm.S, m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
    let nb = 0;
    const counts = {};
    for (const cid of Object.keys(this.cropMesh)) counts[cid] = 0;
    // beds first: owned patches only, in a stable order
    const c = new THREE.Color();
    for (const p of ALL_PLOTS) {
      if (!S.patches[p.patch]) continue;
      const bi = nb++;
      m.makeTranslation(p.x, 0, p.z); this.beds.setMatrixAt(bi, m);
      const info = this.farm.plotInfo(p.id);
      const wet = info.state === 'empty' ? 1 : 0.82;
      this.beds.setColorAt(bi, c.setRGB(wet, wet, wet));
      if (info.state === 'empty') continue;
      const mesh = this.cropMesh[info.crop], grid = mesh.userData.grid, jit = this.jitter(p.id, grid), pop = this.pops.get(p.id) || 0;
      for (const jt of jit) {
        const idx = counts[info.crop]++;
        e.set(0, jt.rot, 0); q.setFromEuler(e); sc.setScalar(jt.s); pos.set(p.x + jt.x, 0.14, p.z + jt.z);
        m.compose(pos, q, sc); mesh.setMatrixAt(idx, m);
        mesh.instanceColor.setXYZ(idx, info.frac, jt.ph, pop);
      }
    }
    this.beds.count = nb; this.beds.instanceMatrix.needsUpdate = true; if (this.beds.instanceColor) this.beds.instanceColor.needsUpdate = true;
    for (const [cid, mesh] of Object.entries(this.cropMesh)) {
      mesh.count = counts[cid]; mesh.visible = counts[cid] > 0;
      mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    }
    this.syncGrowth();
  }

  // update only the growth number (runs twice a second)
  syncGrowth() {
    const S = this.farm.S, counts = {};
    for (const cid of Object.keys(this.cropMesh)) counts[cid] = 0;
    for (const p of ALL_PLOTS) {
      if (!S.patches[p.patch]) continue;
      const info = this.farm.plotInfo(p.id); if (info.state === 'empty') continue;
      const mesh = this.cropMesh[info.crop], grid = mesh.userData.grid, jit = this.jitter(p.id, grid), pop = this.pops.get(p.id) || 0;
      for (const jt of jit) { const idx = counts[info.crop]++; mesh.instanceColor.setXYZ(idx, info.frac, jt.ph, pop); }
    }
    for (const mesh of Object.values(this.cropMesh)) if (mesh.visible) mesh.instanceColor.needsUpdate = true;
  }

  // which plots are ripe (for the glow layer)
  ripe() { const out = []; const S = this.farm.S; for (const p of ALL_PLOTS) { if (!S.patches[p.patch] || !S.plots[p.id]) continue; if (this.farm.plotInfo(p.id).state === 'ripe') out.push(p); } return out; }

  update(dt) {
    this.acc += dt;
    if (this.acc > 0.5) { this.acc = 0; this.syncGrowth(); }
  }
}
export { PLOT };

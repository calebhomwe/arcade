// Everything that stands on the farm and reacts to the game state: the cottage and barn, fields, pens,
// workshops (or the empty lots waiting for them), the dock and boat, decorations, and what you can tap.
import * as THREE from 'three';
import { farmMaterial, SU, PATH_VERT, PATH_FRAG } from './shaders.js';
import { CropSystem } from './plots.js';
import { casts } from './shadow.js';
import { fenceGeometry, lotGeometry, signGeometry, boardGeometry, troughGeometry, scarecrowGeometry, benchGeometry, picnicGeometry, hiveGeometry, dockGeometry, bunting, postGeometry } from './props.js';
import { makeTreeGeometry, makeBushGeometry, makeRockGeometry } from './flora.js';
import { heightAt, shoreX, WATER_Y } from './terrain.js';
import { PATCHES, PENS, SITES, FIXED, PATHS, PLOT, GROUND } from '../layout.js';
import { DECOR, ITEMS, BUILDINGS, ANIMALS, BOAT_AWAY_SEC } from '../data.js';
import { ALL_PLOTS } from '../state.js';
import { clamp, lerp, rng } from '../util.js';

const V3 = THREE.Vector3;
function catmull(pts, n = 8) {
  if (pts.length < 3) return pts.map((p) => p.slice());
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]); }
  }
  out.push(pts[pts.length - 1].slice()); return out;
}

function pathMesh(paint) {
  const pos = [], uv = [], idx = [];
  let v = 0;
  for (const path of PATHS) {
    const pts = catmull(path, 8); let dist = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const w = 1.05; if (i) dist += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      pos.push(pts[i][0] - dz * w, 0.03, pts[i][1] + dx * w, pts[i][0] + dz * w, 0.03, pts[i][1] - dx * w); uv.push(0, dist, 1, dist);
      if (i) { idx.push(v - 2, v - 1, v, v - 1, v + 1, v); }
      v += 2;
    }
    v += 0;
  }
  // fix the joins between separate paths (the loop above bridges the last quad of one path to the first of the next)
  const clean = []; let base = 0;
  for (const path of PATHS) { const n = catmull(path, 8).length; for (let i = 1; i < n; i++) { const a = (base + i - 1) * 2, b = (base + i) * 2; clean.push(a, a + 1, b, a + 1, b + 1, b); } base += n; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(clean);
  const mat = new THREE.ShaderMaterial({ vertexShader: PATH_VERT, fragmentShader: PATH_FRAG, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, uniforms: Object.assign({}, SU, { uPaint: { value: paint } }) });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 0; return m;
}

export class FarmScene {
  constructor(ctx) {
    Object.assign(this, ctx);   // engine, scene, assets, farm, labels, blobs, particles, floaters, paint
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.hits = [];             // tappable things
    this.spinners = []; this.emitters = []; this.bobbers = [];
    this.siteObjs = {}; this.penObjs = {}; this.patchObjs = {};
    this.decorMeshes = {};
    this.time = 0;
    this.shadowCount = 0;
  }

  // -------------------------------------------------------------------------------------------------
  place(model, x, z, yaw = 0, y = GROUND) {
    const g = model.group || model;
    g.position.set(x, y, z); g.rotation.y = yaw; this.root.add(g); g.updateMatrixWorld(true);
    return g;
  }
  addHit(h) { this.hits.push(h); return h; }
  boxOf(obj) { obj.updateMatrixWorld(true); return new THREE.Box3().setFromObject(obj); }
  shadow(x, z, r, h, strength = 0.42) { return this.blobs.add({ x, z, r, h, strength, kind: 0 }); }

  build() {
    const A = this.assets, farm = this.farm, S = farm.S;
    this.root.add(pathMesh(this.paint));
    this.crops = new CropSystem(this.root, farm);
    // ---- always there --------------------------------------------------------------------------
    const F = FIXED;
    const cottage = A.model('cottage', { width: F.cottage.width, shell: true }); this.place(cottage, F.cottage.x, F.cottage.z, F.cottage.yaw);
    this.cottage = cottage; this.shadow(F.cottage.x, F.cottage.z, 3.4, 4.2, 0.4);
    this.addHit({ kind: 'cottage', id: 'cottage', box: this.boxOf(cottage.group), prio: 2 });
    const barn = A.model('red_barn', { width: F.barn.width, shell: true }); this.barn = barn; this.place(barn, F.barn.x, F.barn.z, F.barn.yaw); this.shadow(F.barn.x, F.barn.z, 3.6, 5, 0.42);
    this.addHit({ kind: 'barn', id: 'barn', box: this.boxOf(barn.group), prio: 3 });
    for (const [k, p] of [['silo1', F.silo1], ['silo2', F.silo2]]) { const m = A.model('silo', { height: p.height, shell: true }); this.place(m, p.x, p.z, p.yaw + (k === 'silo2' ? 0.8 : 0)); this.shadow(p.x, p.z, 1.9, p.height * 0.9, 0.42); this.addHit({ kind: 'barn', id: 'barn', box: this.boxOf(m.group), prio: 2 }); }
    const tractor = A.model('tractor', { width: F.tractor.width, shell: true }); this.place(tractor, F.tractor.x, F.tractor.z, F.tractor.yaw); this.shadow(F.tractor.x, F.tractor.z, 1.9, 1.6, 0.4);
    const market = A.model('market_stall', { width: F.market.width, shell: true }); this.place(market, F.market.x, F.market.z, F.market.yaw); this.shadow(F.market.x, F.market.z, 2.4, 2.4, 0.4);
    this.addHit({ kind: 'market', id: 'market', box: this.boxOf(market.group), prio: 3 });
    const fountain = A.model('fountain', { width: F.fountain.width, shell: true }); this.place(fountain, F.fountain.x, F.fountain.z, 0); this.shadow(F.fountain.x, F.fountain.z, 2.0, 1.4, 0.3);
    const well = A.model('well', { height: 2.3, shell: true }); this.place(well, F.well.x, F.well.z, 0.5); this.shadow(F.well.x, F.well.z, 0.9, 1.6, 0.4);
    const wp = A.model('windpump', { height: 8.4, shell: true }); this.place(wp, F.windpump.x, F.windpump.z, -0.6); this.shadow(F.windpump.x, F.windpump.z, 1.5, 3, 0.3);
    if (wp.parts.blades) this.spinners.push({ mesh: wp.parts.blades, axis: 'z', speed: 1.2 });
    // order board
    const board = new THREE.Mesh(boardGeometry(), farmMaterial({ vertexColors: true, detail: 'wood' })); board.position.set(F.board.x, 0, F.board.z); board.rotation.y = F.board.yaw; this.root.add(board); casts(board);
    this.board = board; this.shadow(F.board.x, F.board.z, 1.4, 2, 0.35);
    this.addHit({ kind: 'board', id: 'board', box: this.boxOf(board), prio: 3 });
    // hay and crates near the barn and stall: the rich foreground
    const props = [['hay_bales', -6.2, -8, 0.4, { width: 2.1 }], ['hay_bales', -13.5, -5.4, 2.0, { width: 1.9 }], ['crate', -3, 1.6, 0.3, { width: 0.95 }], ['crate', -2.2, 1.9, 0.9, { width: 0.8 }], ['barrel', -5.8, 1.4, 0, { width: 0.9 }], ['crate_large', -13, -2.3, 0.2, { width: 1.2 }], ['barrel', -12.2, -2.1, 0, { width: 0.9 }], ['crate', 4.2, 3.2, 0.5, { width: 0.9 }], ['bucket', 5.8, 2.0, 0, { width: 0.6 }], ['signpost', -1.4, 3.4, 0.3, { height: 1.9 }]];
    for (const [id, x, z, yaw, o] of props) { if (!A.has(id)) continue; const m = A.model(id, Object.assign({ shell: !/crate|barrel|bucket|signpost/.test(id) }, o)); this.place(m, x, z, yaw); this.shadow(x, z, 0.9, 1.0, 0.32); }
    // ---- fences (one instanced mesh for every pen) -------------------------------------------------
    this.fenceMat = farmMaterial({ vertexColors: true, detail: 'wood' });
    this.fences = new THREE.InstancedMesh(fenceGeometry(), this.fenceMat, 460); this.fences.count = 0; this.fences.frustumCulled = false; this.root.add(this.fences); casts(this.fences);
    this.posts = new THREE.InstancedMesh(postGeometry(), this.fenceMat, 120); this.posts.count = 0; this.posts.frustumCulled = false; this.root.add(this.posts); casts(this.posts);
    // lots and signs (all lots share geometry)
    this.signGeo = signGeometry(); this.signMat = farmMaterial({ vertexColors: true, detail: 'wood' });
    // ---- pens, sites, patches ----------------------------------------------------------------------
    for (const p of PENS) this.buildPen(p);
    for (const s of SITES) this.buildSite(s);
    for (const p of PATCHES) this.buildPatch(p);
    this.syncFences();
    // dock and boat
    this.buildDock();
    this.buildScenery();
    // decor
    this.syncDecor();
    this.crops.sync();
    this.badgeAcc = 0;
  }

  // ---- fields: owned patches get beds; others wait as meadow with a sign -------------------------------
  buildPatch(p) {
    const owned = !!this.farm.S.patches[p.id];
    const old = this.patchObjs[p.id];
    if (old) { old.forEach((o) => { if (o.parent) o.parent.remove(o); }); this.hits = this.hits.filter((h) => !(h.kind === 'patch' && h.id === p.id)); this.labels.remove('patch_' + p.id); this.blobs.remove(old.blob); }
    const objs = [];
    const soon = p.level <= this.farm.S.level + 5;   // far-future plots stay plain meadow until you are close
    if (!owned && !soon) { this.patchObjs[p.id] = objs; return; }
    if (!owned) {
      const sign = new THREE.Mesh(this.signGeo, this.signMat); sign.position.set(p.x - 3.2, 0, p.z + 3.1); sign.rotation.y = 0.5; this.root.add(sign); casts(sign); objs.push(sign);
      const lot = new THREE.Mesh(lotGeometry(7.2, 4.7), this.signMat); lot.position.set(p.x, 0, p.z); this.root.add(lot); objs.push(lot);
      objs.blob = this.blobs.add({ x: p.x, z: p.z, sx: 7.4, sz: 5.0, kind: 2, strength: 0.16, y: 0.02 });
      const need = this.farm.S.level >= p.level;
      this.labels.add('patch_' + p.id, { x: p.x, y: 1.9, z: p.z + 0.5, cls: 'lot ' + (need ? '' : 'locked'), html: `${this.icon(need ? 'land' : 'lock', 26)}<b>Field ${p.id}</b><span>${need ? this.coin() + ' ' + p.cost : 'Level ' + p.level}</span>`, onTap: () => this.onTapObject && this.onTapObject({ kind: 'patch', id: p.id }), label: `Buy field ${p.id}` });
      this.addHit({ kind: 'patch', id: p.id, box: new THREE.Box3(new V3(p.x - 3.4, 0, p.z - 2.4), new V3(p.x + 3.4, 1.2, p.z + 2.4)), prio: 1 });
    } else {
      this.labels.remove('patch_' + p.id);
      // wooden corner posts for tidy edges
      objs.blob = this.blobs.add({ x: p.x, z: p.z, sx: 8.0, sz: 5.6, kind: 2, strength: 0.12, y: 0.02 });
    }
    this.patchObjs[p.id] = objs;
  }

  // ---- pens ----------------------------------------------------------------------------------------------
  buildPen(p) {
    const built = this.farm.penBuilt(p.id);
    const old = this.penObjs[p.id];
    if (old) { old.forEach((o) => { if (o.parent) o.parent.remove(o); }); this.hits = this.hits.filter((h) => !(h.kind === 'pen' && h.id === p.id)); this.labels.remove('pen_' + p.id); if (old.blob != null) this.blobs.remove(old.blob); }
    const objs = [];
    if (built || p.level <= this.farm.S.level + 5) objs.blob = this.blobs.add({ x: p.x, z: p.z, sx: p.w + 0.6, sz: p.d + 0.6, kind: 2, strength: built ? 0.22 : 0.12, y: 0.025 });
    if (built) {
      if (p.model && this.assets.has(p.model)) {
        const w = p.model === 'coop' ? 3.0 : 5.0;
        const m = this.assets.model(p.model, { width: w, shell: true });
        const mx = p.x - p.w / 2 + w / 2 + 0.6, mz = p.z - p.d / 2 + 1.6;
        this.place(m, mx, mz, p.model === 'coop' ? 0.2 : 0); objs.push(m.group);
        this.shadow(mx, mz, w * 0.55, 3, 0.4);
        objs.model = m;
      }
      const tr = new THREE.Mesh(troughGeometry(), farmMaterial({ vertexColors: true, detail: 'wood' })); tr.position.set(p.x + p.w / 2 - 1.6, 0, p.z + p.d / 2 - 1.5); tr.rotation.y = 0.2; this.root.add(tr); casts(tr); objs.push(tr);
      if (p.id === 'bees') { const hv = new THREE.Mesh(hiveGeometry(), farmMaterial({ vertexColors: true, detail: 'wood' })); hv.position.set(p.x, 0, p.z - 0.5); this.root.add(hv); casts(hv); objs.push(hv); }
      this.addHit({ kind: 'pen', id: p.id, box: new THREE.Box3(new V3(p.x - p.w / 2, 0, p.z - p.d / 2), new V3(p.x + p.w / 2, 1.6, p.z + p.d / 2)), prio: 1 });
    } else if (p.level > this.farm.S.level + 5) {
      /* far-future pen: plain meadow */
    } else {
      const sign = new THREE.Mesh(this.signGeo, this.signMat); sign.position.set(p.x - p.w / 2 + 0.2, 0, p.z + p.d / 2 - 0.2); sign.rotation.y = 0.6; this.root.add(sign); casts(sign); objs.push(sign);
      const lot = new THREE.Mesh(lotGeometry(p.w, p.d), this.signMat); lot.position.set(p.x, 0, p.z); this.root.add(lot); objs.push(lot);
      const ok = this.farm.S.level >= p.level;
      this.labels.add('pen_' + p.id, { x: p.x, y: 2.0, z: p.z, cls: 'lot ' + (ok ? '' : 'locked'), html: `${this.icon(ok ? p.animal === 'bee' ? 'bee' : p.animal : 'lock', 28)}<b>${p.name}</b><span>${ok ? this.coin() + ' ' + p.cost : 'Level ' + p.level}</span>`, onTap: () => this.onTapObject && this.onTapObject({ kind: 'pen', id: p.id }), label: 'Build ' + p.name });
      this.addHit({ kind: 'pen', id: p.id, box: new THREE.Box3(new V3(p.x - p.w / 2, 0, p.z - p.d / 2), new V3(p.x + p.w / 2, 1.6, p.z + p.d / 2)), prio: 1 });
    }
    this.penObjs[p.id] = objs;
  }

  syncFences() {
    const fm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3();
    let nf = 0, np = 0;
    const seg = (x, z, rot) => { if (nf >= 460) return; e.set(0, rot, 0); q.setFromEuler(e); pos.set(x, 0, z); fm.compose(pos, q, s); this.fences.setMatrixAt(nf++, fm); };
    for (const p of PENS) {
      if (!this.farm.penBuilt(p.id)) continue;
      const hw = p.w / 2, hd = p.d / 2, n1 = Math.max(2, Math.round(p.w / 2)), n2 = Math.max(2, Math.round(p.d / 2));
      for (let i = 0; i < n1; i++) { const x = p.x - hw + (i + 0.5) * p.w / n1; seg(x, p.z - hd, 0); if (!(i === Math.floor(n1 / 2))) seg(x, p.z + hd, 0); }
      for (let i = 0; i < n2; i++) { const z = p.z - hd + (i + 0.5) * p.d / n2; seg(p.x - hw, z, Math.PI / 2); seg(p.x + hw, z, Math.PI / 2); }
    }
    this.fences.count = nf; this.fences.instanceMatrix.needsUpdate = true; this.posts.count = np; this.posts.instanceMatrix.needsUpdate = true;
  }

  // ---- workshops ---------------------------------------------------------------------------------------------
  buildSite(s) {
    const built = this.farm.buildingBuilt(s.id);
    const old = this.siteObjs[s.id];
    if (old) { old.forEach((o) => { if (o.parent) o.parent.remove(o); }); this.hits = this.hits.filter((h) => !(h.kind === 'site' && h.id === s.id)); this.labels.remove('site_' + s.id); this.spinners = this.spinners.filter((sp) => !old.spin || !old.spin.includes(sp)); if (old.blob != null) this.blobs.remove(old.blob); this.emitters = this.emitters.filter((e) => e.site !== s.id); }
    const objs = []; objs.spin = [];
    if (built) {
      const m = this.assets.model(s.model, { width: s.width, shell: true, hue: 0 });
      this.place(m, s.x, s.z, s.yaw); objs.push(m.group);
      objs.blob = this.shadow(s.x, s.z, s.width * 0.55, 4, 0.42);
      if (m.parts.blades) { const sp = { mesh: m.parts.blades, axis: 'z', speed: 1.1 }; this.spinners.push(sp); objs.spin.push(sp); }
      const box = this.boxOf(m.group);
      this.addHit({ kind: 'site', id: s.id, box, prio: 4 });
      if (s.id === 'bakery' || s.id === 'kitchen' || s.id === 'jam') this.emitters.push({ site: s.id, x: s.x + s.width * 0.18, y: box.max.y * 0.95, z: s.z - s.width * 0.12, t: 0 });
      objs.model = m;
    } else if (s.level > this.farm.S.level + 5) {
      /* far-future workshop: plain meadow */
    } else {
      const sign = new THREE.Mesh(this.signGeo, this.signMat); sign.position.set(s.x - 2.2, 0, s.z + 2.6); sign.rotation.y = 0.5; this.root.add(sign); casts(sign); objs.push(sign);
      const lot = new THREE.Mesh(lotGeometry(4.6, 4.6), this.signMat); lot.position.set(s.x, 0, s.z); this.root.add(lot); objs.push(lot);
      objs.blob = this.blobs.add({ x: s.x, z: s.z, sx: 5.4, sz: 5.4, kind: 2, strength: 0.2, y: 0.025 });
      const ok = this.farm.S.level >= s.level;
      this.labels.add('site_' + s.id, { x: s.x, y: 2.1, z: s.z, cls: 'lot ' + (ok ? '' : 'locked'), html: `${this.icon(ok ? 'hammer' : 'lock', 28)}<b>${s.name}</b><span>${ok ? this.coin() + ' ' + s.cost : 'Level ' + s.level}</span>`, onTap: () => this.onTapObject && this.onTapObject({ kind: 'site', id: s.id }), label: 'Build ' + s.name });
      this.addHit({ kind: 'site', id: s.id, box: new THREE.Box3(new V3(s.x - 2.4, 0, s.z - 2.4), new V3(s.x + 2.4, 2.4, s.z + 2.4)), prio: 1 });
    }
    this.siteObjs[s.id] = objs;
  }

  // ---- dock, boat ------------------------------------------------------------------------------------------------
  buildDock() {
    const z = FIXED.dock.z, sx = shoreX(z);
    const dock = new THREE.Mesh(dockGeometry(), farmMaterial({ vertexColors: true, detail: 'wood' }));
    dock.position.set(sx - 1.5, 0.1, z); this.root.add(dock); casts(dock); this.dock = dock; this.dockX = sx - 1.5 + 11;
    this.shadow(sx + 4, z, 4, 0.5, 0.25);
    if (this.assets.has('ship_cargo')) {
      const boat = this.assets.model('ship_cargo', { long: 7.2, shell: true });
      this.boat = boat; this.boatBase = new V3(this.dockX + 2.6, WATER_Y + 0.12, z + 3.4);
      this.place(boat, this.boatBase.x, this.boatBase.z, Math.PI / 2 + 0.0, this.boatBase.y);
      this.boatBox = this.boxOf(boat.group);
      this.addHit({ kind: 'boat', id: 'boat', box: this.boatBox, prio: 4 });
    }
    this.addHit({ kind: 'dock', id: 'dock', box: new THREE.Box3(new V3(sx - 1.5, 0, z - 1.4), new V3(sx + 9.5, 1.2, z + 1.4)), prio: 2 });
  }


  // ---- scenery beyond the farm: a hamlet across the stream, a lighthouse islet, boats on the bay ------------------
  buildScenery() {
    const A = this.assets, g = this.scenery = new THREE.Group(); this.root.add(g);
    const stand = (id, x, z, yaw, w) => {
      if (!A.has(id)) return null;
      const m = A.model(id, { width: w });
      let y = 1e9; for (const [dx, dz] of [[0, 0], [w / 2, 0], [-w / 2, 0], [0, w / 2], [0, -w / 2]]) y = Math.min(y, heightAt(x + dx, z + dz));
      m.group.position.set(x, y - 0.25, z); m.group.rotation.y = yaw; g.add(m.group); return m;
    };
    const hamlet = [['house_yellow', -22, -43, 0.35, 5.0], ['house_brick', -13, -45, 0.05, 4.8], ['farmhouse', -3, -47, -0.15, 5.8], ['workshop', 8, -46, 0.1, 5.2], ['cafe', 18, -42, -0.35, 5.4], ['chapel', -32, -38, 0.6, 4.4], ['library', 27, -37, -0.7, 4.8], ['house_brick', 3, -55, 0.2, 4.6], ['house_yellow', -9, -56, -0.1, 4.6]];
    for (const [id, x, z, yaw, w] of hamlet) stand(id, x, z, yaw, w);
    // a lighthouse on a rocky islet in the bay
    const rockGeo = makeRockGeometry(5), rockMat = farmMaterial({ vertexColors: true, spec: 0.08 });
    const islet = (x, z, sc) => { for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(rockGeo, rockMat); const a = i * 1.26; m.position.set(x + Math.cos(a) * sc * 1.1, WATER_Y - 0.25, z + Math.sin(a) * sc * 0.9); m.scale.set(sc * (1.1 + i % 2 * 0.4), sc * (0.9 + (i % 3) * 0.3), sc); m.rotation.y = i; g.add(m); casts(m); } const c = new THREE.Mesh(rockGeo, rockMat); c.position.set(x, WATER_Y - 0.3, z); c.scale.set(sc * 2.4, sc * 2.0, sc * 2.2); g.add(c); casts(c); };
    islet(60, -8, 2.2);
    if (A.has('lighthouse')) { const lh = A.model('lighthouse', { height: 11 }); lh.group.position.set(60, WATER_Y + 1.7, -8); g.add(lh.group); }
    // boats drifting on the bay (they only bob; the cargo boat at the dock is the interactive one)
    const boat = (id, x, z, yaw, len) => { if (!A.has(id)) return; const m = A.model(id, { long: len }); m.group.position.set(x, WATER_Y + 0.08, z); m.group.rotation.y = yaw; g.add(m.group); this.bobbers.push({ g: m.group, y: WATER_Y + 0.08, ph: Math.random() * 6, yaw, sway: 0.03 }); };
    boat('tug', 62, 22, 1.2, 6.5); boat('rowboat', 46, -4, 0.4, 3.2); boat('rowboat', 44.5, 26, -0.7, 3.0);
  }

  // ---- decorations (one instanced mesh per kind) --------------------------------------------------------------------
  decorGeometry(d) {
    const mdl = d.model;
    if (mdl.startsWith('tree:')) return { geo: makeTreeGeometry(mdl.slice(5), 11 + mdl.length, 1), mat: farmMaterial({ vertexColors: true, foliage: true, rim: 0.25 }), h: 4.4 };
    if (mdl === 'bush') return { geo: makeBushGeometry(6), mat: farmMaterial({ vertexColors: true, foliage: true, rim: 0.25 }), h: 1 };
    if (mdl === 'scarecrow') return { geo: scarecrowGeometry(), mat: farmMaterial({ vertexColors: true, detail: 'wood' }), h: 2 };
    if (mdl === 'bench') return { geo: benchGeometry(), mat: farmMaterial({ vertexColors: true, detail: 'wood' }), h: 1.1 };
    if (mdl === 'picnic') return { geo: picnicGeometry(), mat: farmMaterial({ vertexColors: true, detail: 'wood' }), h: 0.2 };
    return null;
  }
  syncDecor() {
    const S = this.farm.S;
    // clear
    for (const k of Object.keys(this.decorMeshes)) { const m = this.decorMeshes[k]; m.count = 0; }
    this.hits = this.hits.filter((h) => h.kind !== 'decor');
    this.decorLamps = [];
    const groups = {};
    for (const d of S.decor) (groups[d.type] || (groups[d.type] = [])).push(d);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    for (const [type, list] of Object.entries(groups)) {
      const def = DECOR.find((q2) => q2.id === type); if (!def) continue;
      let mesh = this.decorMeshes[type];
      if (!mesh || mesh.userData.cap < list.length) {
        if (mesh) { this.root.remove(mesh); mesh.dispose(); }
        const cap = Math.max(16, list.length * 2);
        const proc = this.decorGeometry(def);
        if (proc) { mesh = new THREE.InstancedMesh(proc.geo, proc.mat, cap); mesh.userData.h = proc.h; mesh.userData.scale = def.model.startsWith('tree:') ? 1.35 : 1; }
        else { mesh = this.assets.instanced(def.model, { width: def.width, height: def.height, shell: true }, cap); mesh.userData.h = mesh.userData.size.y; mesh.userData.scale = 1; }
        mesh.frustumCulled = false; mesh.userData.cap = cap; this.root.add(mesh); casts(mesh); this.decorMeshes[type] = mesh;
      }
      mesh.count = list.length;
      list.forEach((d, i) => {
        e.set(0, d.rot || 0, 0); q.setFromEuler(e); sc.setScalar(mesh.userData.scale); p.set(d.x, GROUND, d.z); m4.compose(p, q, sc); mesh.setMatrixAt(i, m4);
        const h = mesh.userData.h * mesh.userData.scale;
        this.addHit({ kind: 'decor', id: d.id, box: new THREE.Box3(new V3(d.x - def.r, 0, d.z - def.r), new V3(d.x + def.r, h, d.z + def.r)), prio: 1, decor: d });
        if (def.glow) this.decorLamps.push({ x: d.x, z: d.z, h });
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    // shadows for decor
    if (this._decorBlobs) this._decorBlobs.forEach((b) => this.blobs.remove(b));
    this._decorBlobs = [];
    for (const d of S.decor) { const def = DECOR.find((q2) => q2.id === d.type); if (!def) continue; this._decorBlobs.push(this.blobs.add({ x: d.x, z: d.z, r: def.r * 0.8, h: def.height || 1.4, strength: 0.32, kind: 0 })); }
    // lamp glows on the ground
    if (this._lampBlobs) this._lampBlobs.forEach((b) => this.blobs.remove(b));
    this._lampBlobs = this.decorLamps.map((l) => this.blobs.add({ x: l.x, z: l.z, sx: 6.5, sz: 6.5, kind: 1, strength: 0, y: 0.05 }));
    this._lampNight = -1;
  }

  // ---- picking ------------------------------------------------------------------------------------------------------
  plotAt(gx, gz) {
    let best = null, bd = 1e9;
    for (const p of ALL_PLOTS) {
      if (!this.farm.S.patches[p.patch]) continue;
      const dx = Math.abs(gx - p.x), dz = Math.abs(gz - p.z);
      if (dx < 1.05 && dz < 1.05) { const d = dx + dz; if (d < bd) { bd = d; best = p; } }
    }
    return best;
  }
  pick(sx, sy) {
    const rig = this.engine.rig, W = rig.w, H = rig.h;
    let best = null, bestScore = -1e9;
    const corners = [], tmp = new V3();
    for (const h of this.hits) {
      const b = h.box; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, zc = 0, behind = false;
      for (let i = 0; i < 8; i++) {
        tmp.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(rig.camera);
        if (tmp.z > 1) behind = true;
        const px = (tmp.x * 0.5 + 0.5) * W, py = (-tmp.y * 0.5 + 0.5) * H; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); zc += tmp.z;
      }
      if (behind) continue;
      // grow tiny targets to a comfortable size for a fingertip
      const w = x1 - x0, hh = y1 - y0, padx = Math.max(6, (44 - w) / 2), pady = Math.max(6, (44 - hh) / 2);
      if (sx < x0 - padx || sx > x1 + padx || sy < y0 - pady || sy > y1 + pady) continue;
      const score = h.prio * 10 - zc / 8 - (w * hh) / (W * H) * 4;   // nearer and more important wins; huge rectangles lose ties
      if (score > bestScore) { bestScore = score; best = h; }
    }
    return best;
  }

  // ---- animation -----------------------------------------------------------------------------------------------------
  update(dt) {
    this.time += dt;
    for (const s of this.spinners) s.mesh.rotation[s.axis] += dt * s.speed;
    for (const b of this.bobbers) { b.g.position.y = b.y + Math.sin(this.time * 1.3 + b.ph) * 0.06; b.g.rotation.z = Math.sin(this.time * 1.0 + b.ph) * b.sway; b.g.rotation.x = Math.sin(this.time * 0.8 + b.ph * 1.7) * b.sway * 0.6; }
    // smoke from chimneys
    for (const e of this.emitters) {
      e.t -= dt; if (e.t <= 0 && this.farm.readyJobs(e.site) + (this.farm.jobs(e.site).length) > 0) { e.t = 0.35 + Math.random() * 0.3; this.particles.emit({ x: e.x + (Math.random() - 0.5) * 0.2, y: e.y, z: e.z, vx: 0.25, vy: 0.9, vz: 0.05, life: 2.6, size: 0.7, size2: 2.2, color: [0.95, 0.95, 0.95], alpha: 0.55, alpha2: 0, wob: 0.25, kind: 1 }); }
    }
    // the boat
    if (this.boat && this.farm.S.level >= 3) {
      const b = this.farm.S.boat; const g = this.boat.group;
      let x = this.boatBase.x, vis = true;
      if (b && b.state === 'away') {
        const now = this.farm.now(), sent = b.returnAt - BOAT_AWAY_SEC * 1000;
        const off = now < sent + 40000 ? (now - sent) / 40000 : now > b.returnAt - 40000 ? (b.returnAt - now) / 40000 : 1;
        x = this.boatBase.x + clamp(off, 0, 1) * 90; vis = off < 0.98;
      }
      g.visible = vis;
      g.position.set(x, this.boatBase.y + Math.sin(this.time * 1.4) * 0.05, this.boatBase.z + Math.sin(this.time * 0.6) * 0.1);
      g.rotation.z = Math.sin(this.time * 1.1) * 0.02; g.rotation.x = Math.sin(this.time * 0.9 + 1) * 0.015;
      if (this.boatBox) { this.boatBox.setFromObject(g); }
    }
    // lamps glow as it gets dark
    const night = SU.uNight.value;
    if (Math.abs(night - this._lampNight) > 0.02) {
      this._lampNight = night;
      const s = clamp((night - 0.15) / 0.5, 0, 1) * 0.55;
      (this._lampBlobs || []).forEach((b) => this.blobs.set(b, { strength: s }));
      for (const k of Object.keys(this.decorMeshes)) { const def = DECOR.find((d) => d.id === k); const m = this.decorMeshes[k]; if (def && def.glow && m.material.uniforms) m.material.uniforms.uEmis.value.setRGB(1.0 * s * 1.1, 0.7 * s * 1.1, 0.3 * s * 1.1); }
    }
    this.crops.update(dt);
  }

  icon(name, size) { return this.iconHtml ? this.iconHtml(name, size) : ''; }
  coin() { return this.iconHtml ? this.iconHtml('coin', 18) : '$'; }
}

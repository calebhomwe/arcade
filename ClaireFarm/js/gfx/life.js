// The living things: animals in their pens, the neighbours, Claire and Pip, wild critters, and the
// little portrait renders used in dialogs.
import * as THREE from 'three';
import { SU } from './shaders.js';
import { PENS, FIXED, SITES } from '../layout.js';
import { NPCS, ANIMALS, CRITTERS } from '../data.js';
import { clamp, lerp, wrapAngle, rng, TAU } from '../util.js';

const V3 = THREE.Vector3;

class Wanderer {
  constructor(o) { Object.assign(this, { x: 0, z: 0, yaw: 0, tx: 0, tz: 0, speed: 0.55, state: 'idle', t: Math.random() * 3, phase: Math.random() * 6.28, bounds: null }, o); }
  pickTarget() {
    const b = this.bounds; if (!b) return;
    this.tx = b.x0 + Math.random() * (b.x1 - b.x0); this.tz = b.z0 + Math.random() * (b.z1 - b.z0);
    for (let i = 0; i < 6 && b.avoid && Math.hypot(this.tx - b.avoid[0], this.tz - b.avoid[1]) < b.avoid[2]; i++) { this.tx = b.x0 + Math.random() * (b.x1 - b.x0); this.tz = b.z0 + Math.random() * (b.z1 - b.z0); }
  }
}

export class Life {
  constructor(ctx) {
    Object.assign(this, ctx);   // engine, scene(FarmScene), assets, farm, labels, particles, floaters, blobs, audio
    this.root = new THREE.Group(); this.engine.scene.add(this.root);
    this.herds = {}; this.npcs = {}; this.time = 0; this.mixers = [];
    this.portraits = {}; this.critters = []; this.critterTimer = 12; this.claireTimer = 0;
    this.hits = [];
  }

  // ---- bring everything to life ----------------------------------------------------------------
  build() {
    this.buildClaire(); this.buildPip(); this.buildNpcs();
    for (const p of PENS) this.syncHerd(p.id);
  }

  actor(name, opts) {
    const c = this.assets.character(name, opts);
    this.root.add(c.group);
    this.mixers.push(c.mixer);
    return c;
  }
  play(c, name, fade = 0.25, loop = true) {
    const a = c.actions[name]; if (!a) return null;
    if (c.cur === a) return a;
    a.reset(); a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = !loop; a.fadeIn(fade).play();
    if (c.cur) c.cur.fadeOut(fade);
    c.cur = a; return a;
  }

  buildClaire() {
    const c = this.actor('claire', { height: 1.62, shell: true, rim: 0.6 });
    this.claire = { c, x: 0.6, z: -6.3, yaw: 0.3, tx: 0.6, tz: -6.3, state: 'idle', wait: 2, speed: 3.0, wave: 0 };
    c.group.position.set(this.claire.x, 0, this.claire.z);
    this.play(c, 'Idle'); this.claireShadow = this.blobs.add({ x: 0.6, z: -6.3, r: 0.5, h: 1.5, strength: 0.4 });
    this.addHit('claire');
    this.attachHat();
  }
  buildPip() {
    const c = this.actor('pip', { height: 0.62, shell: true });
    this.pip = { c, x: 1.7, z: -5.8, yaw: 0, state: 'idle', hop: 0, happy: 0 };
    this.play(c, 'Idle'); this.pipShadow = this.blobs.add({ x: 1.7, z: -5.8, r: 0.35, h: 0.6, strength: 0.4 });
    this.addHit('pip');
  }
  addHit(id) { /* people are tapped through the scene picker using their live boxes */ }

  buildNpcs() {
    for (const [id, def] of Object.entries(NPCS)) {
      const c = this.actor(id, { height: 1.72, shell: true, rim: 0.5 });
      const n = { id, c, x: def.pos[0], z: def.pos[1], yaw: Math.PI * 0.15, home: def.pos.slice(), t: 3 + Math.random() * 4, name: def.name };
      c.group.position.set(n.x, 0, n.z); this.play(c, Math.random() < 0.5 ? 'Idle' : 'Idle_Neutral');
      n.shadow = this.blobs.add({ x: n.x, z: n.z, r: 0.5, h: 1.7, strength: 0.4 });
      this.npcs[id] = n;
    }
  }

  // ---- animals ---------------------------------------------------------------------------------------
  animalModel(kind) {
    const A = this.assets;
    if (kind === 'cow') return { m: A.model('cow', { long: 1.55, shell: true, anim: true }), mode: 'bend', speed: 0.5 };
    if (kind === 'sheep') return { m: A.model('sheep', { long: 1.25, shell: true, anim: true }), mode: 'bend', speed: 0.45 };
    if (kind === 'chicken') return { m: A.model('chicken', { long: 0.72, shell: true, anim: true }), mode: 'peck', speed: 0.9 };
    return null;
  }
  syncHerd(penId) {
    const pen = PENS.find((p) => p.id === penId);
    const info = this.farm.penInfo(penId);
    let herd = this.herds[penId];
    if (!herd) herd = this.herds[penId] = { list: [], pen };
    const want = info ? info.animals.length : 0;
    while (herd.list.length > want) { const a = herd.list.pop(); this.root.remove(a.group); this.blobs.remove(a.shadow); }
    const kind = pen.animal;
    while (herd.list.length < want) {
      let a;
      const bounds = { x0: pen.x - pen.w / 2 + 1.2, x1: pen.x + pen.w / 2 - 1.2, z0: pen.z - pen.d / 2 + 1.6, z1: pen.z + pen.d / 2 - 1.2, avoid: pen.model ? [pen.x - pen.w / 2 + 2.6, pen.z - pen.d / 2 + 1.6, 2.4] : null };
      const w = new Wanderer({ bounds, x: pen.x + (Math.random() - 0.5) * 3, z: pen.z + (Math.random() - 0.3) * 2, yaw: Math.random() * TAU });
      if (kind === 'cow' || kind === 'sheep' || kind === 'chicken') {
        const am = this.animalModel(kind); const m = am.m; this.root.add(m.group);
        const bb = m.body.geometry.boundingBox || (m.body.geometry.computeBoundingBox(), m.body.geometry.boundingBox);
        const mat = m.body.material; mat.uniforms.uBounds.value.set(bb.min.z, bb.max.z, bb.max.y, (bb.min.z + bb.max.z) / 2);
        a = Object.assign(w, { kind, group: m.group, mat, mode: am.mode, speed: am.speed, static: true });
      } else {
        const name = kind === 'llama' ? 'llama' : kind === 'pig' ? 'pig' : null;
        if (!name) continue;
        const c = this.actor(name, { height: kind === 'llama' ? 1.9 : 0.95, shell: true });
        this.play(c, 'Idle');
        a = Object.assign(w, { kind, group: c.group, c, static: false, speed: 0.5 });
      }
      a.shadow = this.blobs.add({ x: a.x, z: a.z, r: 0.6, h: 1.0, strength: 0.38 });
      a.pop = 0; a.hop = 0;
      a.group.position.set(a.x, 0, a.z); a.group.scale.setScalar(0.01);
      herd.list.push(a);
    }
  }
  cheer(penId) { const h = this.herds[penId]; if (!h) return; for (const a of h.list) a.hop = 1; }

  updateHerds(dt) {
    for (const herd of Object.values(this.herds)) for (const a of herd.list) {
      a.t -= dt; a.phase += dt;
      if (a.pop < 1) { a.pop = Math.min(1, a.pop + dt * 3); const k = a.pop, s = k < 1 ? 1 + Math.sin(k * Math.PI) * 0.25 : 1; a.group.scale.setScalar(Math.max(0.01, k) * s); }
      if (a.t <= 0) {
        const r = Math.random();
        if (a.state === 'idle' && r < 0.5) { a.state = 'walk'; a.pickTarget(); a.t = 6; }
        else if (a.state === 'walk') { a.state = r < 0.7 ? 'graze' : 'idle'; a.t = 2.5 + Math.random() * 4; }
        else { a.state = 'idle'; a.t = 1.5 + Math.random() * 3; if (r < 0.4) { a.state = 'graze'; a.t = 3 + Math.random() * 3; } }
      }
      let moving = false;
      if (a.state === 'walk') {
        const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
        if (d < 0.25) { a.state = 'idle'; a.t = 1 + Math.random() * 2; }
        else { const want = Math.atan2(dx, dz); a.yaw += wrapAngle(want - a.yaw) * Math.min(1, dt * 5); const sp = a.speed * (a.kind === 'chicken' ? 1.5 : 1); a.x += Math.sin(a.yaw) * sp * dt; a.z += Math.cos(a.yaw) * sp * dt; moving = true; }
      }
      a.hop = Math.max(0, a.hop - dt * 1.6);
      const hopY = a.hop > 0 ? Math.abs(Math.sin(a.hop * Math.PI * 2.4)) * 0.28 * Math.min(1, a.hop * 3) : 0;
      if (a.static) {
        const u = a.mat.uniforms.uAnim.value;
        const graze = a.state === 'graze' ? (a.mode === 'peck' ? 0.45 * Math.max(0, Math.sin(a.phase * 7)) : 0.55 * (0.5 - 0.5 * Math.cos(a.phase * 1.3))) : 0;
        u.x += (graze - u.x) * Math.min(1, dt * 8);
        u.y = moving ? Math.abs(Math.sin(a.phase * (a.kind === 'chicken' ? 11 : 6))) * (a.kind === 'chicken' ? 0.06 : 0.05) : hopY;
        u.z = moving ? Math.sin(a.phase * 6) * 0.05 : 0;
        u.w = Math.sin(a.phase * 2.2) * 0.012;
        if (a.hop > 0) u.y = hopY;
      } else {
        a.c.mixer.timeScale = moving ? 1.6 : 1;
        a.group.position.y = moving ? Math.abs(Math.sin(a.phase * 6)) * 0.05 : hopY;
      }
      a.group.position.x = a.x; a.group.position.z = a.z; if (a.static) a.group.position.y = 0; a.group.rotation.y = a.yaw;
      this.blobs.set(a.shadow, { x: a.x, z: a.z });
    }
  }

  // ---- Claire and Pip ------------------------------------------------------------------------------------------------------------
  claireGo(x, z) {
    const C = this.claire; if (!C) return;
    // stand a step short of the target, on the side nearest her
    const dx = x - C.x, dz = z - C.z, d = Math.hypot(dx, dz) || 1, stop = Math.max(0, d - 1.4);
    C.tx = C.x + dx / d * stop; C.tz = C.z + dz / d * stop; C.state = 'walk'; C.wait = 5 + Math.random() * 3; C.hop = 0;
    this.pipCheer();
  }
  claireWave() { const C = this.claire; if (C && C.c.actions.Wave) { C.wave = 2.2; this.play(C.c, 'Wave', 0.15); } }
  pipCheer() { if (this.pip) this.pip.happy = 1.2; }
  petPip() { if (this.pip) { this.pip.happy = 2; this.pip.hopT = 1; const a = this.pip.c.actions.Jump; if (a) { a.reset().setLoop(THREE.LoopOnce, 1).play(); a.clampWhenFinished = false; } } }

  updatePeople(dt) {
    const C = this.claire, P = this.pip;
    if (C) {
      C.wave -= dt; C.wait -= dt;
      if (C.state === 'walk') {
        const dx = C.tx - C.x, dz = C.tz - C.z, d = Math.hypot(dx, dz);
        if (d < 0.12) { C.state = 'idle'; this.play(C.c, 'Idle'); }
        else { const want = Math.atan2(dx, dz); C.yaw += wrapAngle(want - C.yaw) * Math.min(1, dt * 9); const sp = Math.min(C.speed, d * 4 + 0.6); C.x += Math.sin(C.yaw) * sp * dt; C.z += Math.cos(C.yaw) * sp * dt; this.play(C.c, 'Walk'); }
      } else if (C.wave > 0) { /* waving */ }
      else { this.play(C.c, 'Idle'); if (C.wait <= 0 && C.state === 'idle') { C.tx = 0.4 + (Math.random() - 0.5) * 1.5; C.tz = -6.4 + (Math.random() - 0.5) * 1.2; C.state = 'walk'; C.wait = 6 + Math.random() * 4; } }
      C.c.group.position.set(C.x, 0, C.z); C.c.group.rotation.y = C.yaw;
      this.blobs.set(this.claireShadow, { x: C.x, z: C.z });
    }
    if (P && C) {
      P.happy = Math.max(0, P.happy - dt);
      const dx = C.x + Math.sin(C.yaw + 2.2) * 1.3 - P.x, dz = C.z + Math.cos(C.yaw + 2.2) * 1.3 - P.z, d = Math.hypot(dx, dz);
      let moving = false;
      if (d > 0.5) { const want = Math.atan2(dx, dz); P.yaw += wrapAngle(want - P.yaw) * Math.min(1, dt * 8); const sp = Math.min(3.4, d * 2.2); P.x += Math.sin(P.yaw) * sp * dt; P.z += Math.cos(P.yaw) * sp * dt; moving = true; }
      else if (Math.hypot(C.x - P.x, C.z - P.z) < 3) { P.yaw += wrapAngle(Math.atan2(C.x - P.x, C.z - P.z) - P.yaw) * Math.min(1, dt * 3); }
      const bob = moving ? Math.abs(Math.sin(this.time * 14)) * 0.08 : (P.happy > 0 ? Math.abs(Math.sin(this.time * 9)) * 0.1 : 0);
      P.c.mixer.timeScale = moving ? 2.2 : P.happy > 0 ? 1.8 : 1;
      P.c.group.position.set(P.x, bob, P.z); P.c.group.rotation.y = P.yaw;
      this.blobs.set(this.pipShadow, { x: P.x, z: P.z });
    }
    for (const n of Object.values(this.npcs)) {
      n.t -= dt;
      if (n.t <= 0) { n.t = 4 + Math.random() * 6; n.yaw = (Math.random() - 0.5) * 1.2 + 0.3; const a = n.c.actions.Interact; if (a && Math.random() < 0.25) { a.reset().setLoop(THREE.LoopOnce, 1).play(); } }
      n.c.group.position.set(n.x, 0, n.z); n.c.group.rotation.y += wrapAngle(n.yaw - n.c.group.rotation.y) * Math.min(1, dt * 2);
    }
  }

  // the hat rides on Claire's head bone
  attachHat() {
    const C = this.claire; if (!C) return;
    let head = null; C.c.obj.traverse((o) => { if (o.isBone && /head/i.test(o.name) && !head) head = o; });
    this.headBone = head;
    this.hat = new THREE.Group(); (head || C.c.group).add(this.hat);
    this.syncCosmetics();
  }
  syncCosmetics() {
    const wear = this.farm.S.cos.wear, hat = this.hat;
    if (!hat) return;
    while (hat.children.length) { const ch = hat.children.pop(); ch.geometry && ch.geometry.dispose(); }
    const id = wear.hat; if (!id || id === 'hat_none') return;
    const mk = this.hatMesh(id); if (!mk) return;
    // the head bone lives at neck height in the Meshy rig; scale is in the bone's own (unscaled) space
    const sc = 1 / (this.claire.c.scale || 1);
    mk.scale.setScalar(sc); mk.position.set(0, 0.16 * sc, 0.0);
    hat.add(mk);
    this.hatObj = mk;
  }
  hatMesh(id) {
    const { farmMaterial } = this._sh || (this._sh = null) || {};
    return this.makeHat ? this.makeHat(id) : null;
  }

  // ---- wild critters ------------------------------------------------------------------------------------------------------------------
  spawnCritter() {
    if (this.critters.length >= 2) return;
    const night = SU.uNight.value > 0.5;
    const pool = CRITTERS.filter((c) => (c.id === 'firefly') === night);
    const c = pool[Math.floor(Math.random() * pool.length)];
    const cam = this.engine.rig.cur;
    const a = Math.random() * TAU, d = 3 + Math.random() * 6;
    const x = clamp(cam.x + Math.cos(a) * d, -24, 30), z = clamp(cam.z + Math.sin(a) * d, -22, 28);
    const id = 'crit' + Math.random().toString(36).slice(2, 7);
    const it = { id, def: c, x, z, y: c.id === 'bird' ? 3.0 : c.id === 'butterfly' || c.id === 'firefly' ? 1.4 : 0.5, t: 0, life: 16, seed: Math.random() * 6 };
    this.labels.add(id, { x, y: it.y, z, cls: 'critter', html: this.iconHtml(c.id, 44), label: c.name, onTap: () => this.tapCritter(it) });
    this.critters.push(it);
  }
  tapCritter(it) {
    const isNew = this.farm.foundCritter(it.def.id);
    this.particles.burst(12, { x: it.x, y: it.y, z: it.z, life: 0.9, size: 0.3, speed: 2.2, up: 1.4, gravity: 3, color: [1, 0.9, 0.4], kind: 3, alpha: 1, alpha2: 0 });
    this.floaters.spawn(it.x, it.y, it.z, isNew ? `New friend! ${it.def.name}` : it.def.name, 'crit', 1.6);
    if (this.audio) this.audio.sfx(isNew ? 'unlock' : 'pop');
    it.t = it.life;
  }
  updateCritters(dt) {
    this.critterTimer -= dt;
    if (this.critterTimer <= 0) { this.critterTimer = 35 + Math.random() * 45; if (this.enabled !== false) this.spawnCritter(); }
    for (let i = this.critters.length - 1; i >= 0; i--) {
      const it = this.critters[i]; it.t += dt;
      const fly = it.def.id === 'butterfly' || it.def.id === 'firefly' || it.def.id === 'bird';
      const bx = it.x + Math.sin(it.t * (fly ? 0.9 : 0.2) + it.seed) * (fly ? 1.6 : 0.2), bz = it.z + Math.cos(it.t * 0.7 + it.seed) * (fly ? 1.2 : 0.2), by = it.y + (fly ? Math.sin(it.t * 3 + it.seed) * 0.35 : Math.abs(Math.sin(it.t * 2.2 + it.seed)) * 0.25);
      const lab = this.labels.items.get(it.id); if (lab) lab.pos.set(bx, by, bz);
      if (it.t > it.life) { this.labels.remove(it.id); this.critters.splice(i, 1); }
    }
  }

  // ---- portraits (head shots rendered once and reused as images) ---------------------------------------------------------------------------
  renderPortraits() {
    const R = this.engine.renderer, size = 200;
    const rt = new THREE.WebGLRenderTarget(size, size, { samples: 0 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
    const scn = new THREE.Scene(), cam = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
    const jobs = { claire: this.claire && this.claire.c, pip: this.pip && this.pip.c };
    for (const [id, n] of Object.entries(this.npcs)) jobs[id] = n.c;
    const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d');
    const buf = new Uint8Array(size * size * 4);
    const saved = new THREE.Color(); R.getClearColor(saved); const savedA = R.getClearAlpha();
    for (const [id, c] of Object.entries(jobs)) {
      if (!c) continue;
      const parent = c.group.parent, pos = c.group.position.clone(), rot = c.group.rotation.clone();
      const restoreVis = []; // hide the shell outline thickness issues by keeping as is
      c.group.position.set(0, 0, 0); c.group.rotation.set(0, 0.35, 0); scn.add(c.group);
      c.mixer.update(0.001);
      const h = c.size.y, head = id === 'pip' ? h * 0.75 : h * 0.86;
      const dist = id === 'pip' ? 2.3 : 3.2;
      cam.position.set(Math.sin(0.25) * dist, head + 0.05, Math.cos(0.25) * dist); cam.lookAt(0, head - (id === 'pip' ? 0.02 : 0.02), 0);
      R.setRenderTarget(rt); R.setClearColor(0x000000, 0); R.clear(); R.render(scn, cam); R.setRenderTarget(null);
      R.readRenderTargetPixels(rt, 0, 0, size, size, buf);
      const img = g.createImageData(size, size);
      for (let y = 0; y < size; y++) { const src = (size - 1 - y) * size * 4; img.data.set(buf.subarray(src, src + size * 4), y * size * 4); }
      g.putImageData(img, 0, 0);
      this.portraits[id] = cv.toDataURL('image/png');
      scn.remove(c.group); if (parent) parent.add(c.group); c.group.position.copy(pos); c.group.rotation.copy(rot);
    }
    R.setClearColor(saved, savedA); rt.dispose();
    return this.portraits;
  }

  update(dt) {
    this.time += dt;
    for (const m of this.mixers) m.update(dt);
    this.updateHerds(dt); this.updatePeople(dt); this.updateCritters(dt);
  }
}

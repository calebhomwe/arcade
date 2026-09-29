// Particles (smoke, sparkles, confetti, petals, snow, fireflies), rain streaks, and floating
// "+12" numbers. Everything is pooled and tiny.
import * as THREE from 'three';
import { PART_VERT, PART_FRAG, SU } from './shaders.js';
import { rng } from '../util.js';

export class Particles {
  constructor(scene, cap = 500, additive = false) {
    this.cap = cap; this.p = new Array(cap); this.n = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(cap * 3); this.col = new Float32Array(cap * 4); this.siz = new Float32Array(cap * 2);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.siz, 2).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({ vertexShader: PART_VERT, fragmentShader: PART_FRAG, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { uScale: { value: 600 } } });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 6; scene.add(this.points);
    this.g = g; this.scale = 1;
  }
  setViewport(h) { this.mat.uniforms.uScale.value = h * 0.9; }
  emit(o) {
    if (this.n >= this.cap) return;
    const c = o.color || [1, 1, 1];
    this.p[this.n++] = {
      x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, life: o.life || 1, age: 0, size: o.size || 0.5, size2: o.size2 == null ? (o.size || 0.5) : o.size2,
      r: c[0], g: c[1], b: c[2], a: o.alpha == null ? 1 : o.alpha, a2: o.alpha2 == null ? 0 : o.alpha2, grav: o.gravity || 0, drag: o.drag || 0, kind: o.kind || 0, wob: o.wob || 0, ph: Math.random() * 6.28,
    };
  }
  burst(n, o) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = (o.speed || 2) * (0.4 + Math.random() * 0.8), up = (o.up == null ? 1.5 : o.up) * (0.5 + Math.random()); this.emit(Object.assign({}, o, { vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: up, color: o.colors ? o.colors[i % o.colors.length] : o.color })); } }
  update(dt) {
    let w = 0;
    for (let i = 0; i < this.n; i++) {
      const q = this.p[i]; q.age += dt; if (q.age >= q.life) continue;
      const k = q.age / q.life;
      q.vy -= q.grav * dt; const d = Math.max(0, 1 - q.drag * dt); q.vx *= d; q.vy *= d; q.vz *= d;
      q.x += (q.vx + (q.wob ? Math.sin(q.age * 3 + q.ph) * q.wob : 0)) * dt; q.y += q.vy * dt; q.z += (q.vz + (q.wob ? Math.cos(q.age * 2.4 + q.ph) * q.wob : 0)) * dt;
      const j = w * 3; this.pos[j] = q.x; this.pos[j + 1] = q.y; this.pos[j + 2] = q.z;
      const c = w * 4; this.col[c] = q.r; this.col[c + 1] = q.g; this.col[c + 2] = q.b; this.col[c + 3] = q.a + (q.a2 - q.a) * k;
      const s = w * 2; this.siz[s] = q.size + (q.size2 - q.size) * k; this.siz[s + 1] = q.kind;
      this.p[w++] = q;
    }
    this.n = w; this.g.setDrawRange(0, w);
    this.g.attributes.position.needsUpdate = true; this.g.attributes.aColor.needsUpdate = true; this.g.attributes.aSize.needsUpdate = true;
  }
}

// rain: streaks that wrap around the camera target on the GPU
export class Rain {
  constructor(scene) {
    const N = 420, r = rng(31), pos = [], seed = [];
    for (let i = 0; i < N; i++) { const x = (r() - 0.5) * 60, z = (r() - 0.5) * 60, y = r() * 30; pos.push(x, y, z, x, y - 1.0, z); seed.push(r(), 0, r(), 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed.map((v, i) => v), 2 - 1 + 1 ? 2 : 2).setUsage(THREE.StaticDrawUsage));
    const seeds = new Float32Array(N * 2 * 2); for (let i = 0; i < N * 2; i++) { seeds[i * 2] = r(); seeds[i * 2 + 1] = r(); }
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 2));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: SU.uTime, uCenter: { value: new THREE.Vector3() }, uAmt: { value: 0 }, uFogCol: SU.uFogCol },
      vertexShader: `attribute vec2 aSeed; uniform float uTime; uniform vec3 uCenter; varying float vA;
        void main(){ vec3 p = position; float sp = 22.0 + aSeed.y * 6.0; p.y = mod(position.y - uTime * sp, 30.0);
          p.x = mod(position.x + uCenter.x + 30.0, 60.0) - 30.0 + (uCenter.x - mod(uCenter.x + 30.0, 60.0) + 30.0) * 0.0; p.z = position.z;
          vec3 w = vec3(position.x + floor((uCenter.x - position.x + 30.0) / 60.0) * 60.0, p.y, position.z + floor((uCenter.z - position.z + 30.0) / 60.0) * 60.0);
          if (position.y < 0.0) w.y = p.y; vA = 0.5; gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
      fragmentShader: `uniform float uAmt; uniform vec3 uFogCol; varying float vA; void main(){ gl_FragColor = vec4(mix(vec3(0.72, 0.84, 1.0), uFogCol, 0.3), vA * uAmt);\n #include <colorspace_fragment>\n }`,
    });
    this.lines = new THREE.LineSegments(g, this.mat); this.lines.frustumCulled = false; this.lines.renderOrder = 7; this.lines.visible = false; scene.add(this.lines);
  }
  set(amt, center) { this.mat.uniforms.uAmt.value = amt; this.lines.visible = amt > 0.02; if (center) this.mat.uniforms.uCenter.value.copy(center); }
}

// ambient life: petals, leaves, snow, fireflies around the camera target
export class Ambient {
  constructor(scene) { this.ps = new Particles(scene, 240, false); this.glow = new Particles(scene, 90, true); this.mode = 'spring'; this.acc = 0; this.center = new THREE.Vector3(); this.rand = rng(5); }
  setViewport(h) { this.ps.setViewport(h); this.glow.setViewport(h); }
  update(dt, cx, cz, night, season, weather, density) {
    this.ps.update(dt); this.glow.update(dt);
    this.acc += dt;
    const rate = 0.06 / Math.max(0.2, density);
    while (this.acc > rate) {
      this.acc -= rate; const r = Math.random;
      const x = cx + (r() - 0.5) * 34, z = cz + (r() - 0.5) * 30;
      if (weather === 'snow' || season === 'winter') this.ps.emit({ x, y: 14 + r() * 4, z, vx: 0.3, vy: -1.2 - r(), vz: 0.1, life: 12, size: 0.16 + r() * 0.1, color: [1, 1, 1], alpha: 0.9, alpha2: 0.7, wob: 0.6, kind: 0 });
      else if (season === 'spring') this.ps.emit({ x, y: 9 + r() * 5, z, vx: 0.7, vy: -0.7 - r() * 0.4, vz: 0.2, life: 14, size: 0.26, color: [1, 0.72 + r() * 0.15, 0.82], alpha: 0.9, alpha2: 0.7, wob: 0.9, kind: 2 });
      else if (season === 'autumn') this.ps.emit({ x, y: 10 + r() * 4, z, vx: 0.9, vy: -0.9 - r() * 0.5, vz: 0.3, life: 12, size: 0.3, color: [0.95, 0.5 + r() * 0.3, 0.12], alpha: 1, alpha2: 0.8, wob: 1.1, kind: 2 });
      else if (r() < 0.25 && night < 0.3) this.ps.emit({ x, y: 1.5 + r() * 2, z, vx: 0.2, vy: 0.1, vz: 0.1, life: 8, size: 0.11, color: [1, 0.95, 0.7], alpha: 0.55, alpha2: 0, wob: 0.5, kind: 1 });
      if (night > 0.5 && r() < 0.5) this.glow.emit({ x: cx + (r() - 0.5) * 26, y: 0.6 + r() * 2.2, z: cz + (r() - 0.5) * 24, vx: 0.2, vy: 0.05, vz: 0.1, life: 6, size: 0.24, color: [0.9, 1, 0.45], alpha: 0.9, alpha2: 0, wob: 0.8, kind: 1 });
    }
  }
}

// floating numbers and icons in the DOM
export class Floaters {
  constructor(root, rig) { this.root = root; this.rig = rig; this.v = new THREE.Vector3(); this.active = new Set(); }
  spawn(x, y, z, html, cls = '', dur = 1.3) {
    if (this.active.size > 26) return;
    const el = document.createElement('div'); el.className = 'fl ' + cls; el.innerHTML = html;
    this.root.appendChild(el);
    const it = { el, pos: new THREE.Vector3(x, y, z), t: 0, dur, dx: (Math.random() - 0.5) * 16 };
    this.active.add(it);
  }
  spawnScreen(sx, sy, html, cls = '', dur = 1.3) {
    const el = document.createElement('div'); el.className = 'fl ' + cls; el.innerHTML = html; this.root.appendChild(el);
    this.active.add({ el, screen: [sx, sy], t: 0, dur, dx: 0 });
  }
  update(dt) {
    const cam = this.rig.camera, W = this.rig.w, H = this.rig.h;
    for (const it of this.active) {
      it.t += dt; const k = it.t / it.dur;
      if (k >= 1) { it.el.remove(); this.active.delete(it); continue; }
      let x, y;
      if (it.screen) { x = it.screen[0]; y = it.screen[1]; } else { this.v.copy(it.pos).project(cam); x = (this.v.x * 0.5 + 0.5) * W; y = (-this.v.y * 0.5 + 0.5) * H; }
      const rise = 46 * (1 - Math.pow(1 - k, 2));
      it.el.style.transform = `translate(${(x + it.dx * k).toFixed(1)}px,${(y - rise).toFixed(1)}px) translate(-50%,-100%) scale(${(k < 0.12 ? 0.6 + k / 0.12 * 0.5 : 1.1 - Math.min(0.1, k * 0.1)).toFixed(3)})`;
      it.el.style.opacity = k > 0.72 ? String(1 - (k - 0.72) / 0.28) : '1';
    }
  }
}

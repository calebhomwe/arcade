// Visual effects: powder spray / landing bursts, carve trails, drifting ice
// crystals around the camera.
import * as THREE from 'three';
import { heightAt } from './course.js';

const PVERT = /* glsl */`
attribute float aSize; attribute float aAlpha; attribute float aShade;
varying float vAlpha; varying float vShade;
uniform float uScale;
#include <fog_pars_vertex>
void main(){
  vec3 transformed = position;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aSize * uScale / max(0.5, -mvPosition.z);
  vAlpha = aAlpha; vShade = aShade;
  #include <fog_vertex>
}`;
const PFRAG = /* glsl */`
varying float vAlpha; varying float vShade;
uniform vec3 uLit; uniform vec3 uShadow;
#include <common>
#include <fog_pars_fragment>
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  float a = smoothstep(0.5, 0.12, r) * vAlpha;
  if (a < 0.01) discard;
  // cheap volume: brighter toward the sun-facing top-left of each puff
  float lit = clamp(0.65 + (-c.x - c.y) * 0.9, 0.0, 1.0);
  vec3 col = mix(uShadow, uLit, lit * vShade);
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export class Particles {
  constructor(max) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.size0 = new Float32Array(max);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.shade = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.cursor = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aShade', new THREE.BufferAttribute(this.shade, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uScale: { value: 400 }, uLit: { value: new THREE.Color(2.3, 2.3, 2.35) }, uShadow: { value: new THREE.Color(0.95, 1.05, 1.3) },
      }]),
      vertexShader: PVERT, fragmentShader: PFRAG, transparent: true, depthWrite: false, fog: true,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.geo = g;
  }
  setScale(h) { this.mat.uniforms.uScale.value = h * 0.62; }
  emit(x, y, z, vx, vy, vz, size, life, opts = {}) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = life; this.maxLife[i] = life; this.size0[i] = size;
    this.shade[i] = opts.shade ?? 1; this.drag[i] = opts.drag ?? 2.2; this.grav[i] = opts.grav ?? 4.5;
    this.alphaMul = 1;
  }
  update(dt) {
    const P = this.pos, V = this.vel;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; this.size[i] = 0; continue; }
      this.life[i] -= dt;
      const t = 1 - this.life[i] / this.maxLife[i];
      const d = Math.exp(-this.drag[i] * dt);
      V[i * 3] *= d; V[i * 3 + 1] = V[i * 3 + 1] * d - this.grav[i] * dt; V[i * 3 + 2] *= d;
      P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt;
      this.size[i] = this.size0[i] * (0.5 + t * 1.6);
      this.alpha[i] = Math.min(1, t * 6) * (1 - t) * 0.75;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.geo.attributes.aShade.needsUpdate = true;
  }
}

// Carve trail: a ribbon pressed into the snow, drawn with multiply blending so
// it darkens whatever lighting the snow already has.
export class Trail {
  constructor(maxPts) {
    this.max = maxPts;
    this.pos = new Float32Array(maxPts * 2 * 3);
    this.col = new Float32Array(maxPts * 2 * 3);
    this.uv = new Float32Array(maxPts * 2 * 2);
    this.age = new Float32Array(maxPts);
    this.count = 0; this.head = 0; this.last = null; this.dist = 0;
    const idx = [];
    for (let i = 0; i < maxPts - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2));
    g.setIndex(idx);
    this.geo = g;
    const c = document.createElement('canvas'); c.width = 64; c.height = 4;
    const cx = c.getContext('2d');
    const gr = cx.createLinearGradient(0, 0, 64, 0);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.18, '#e9eef7'); gr.addColorStop(0.3, '#a9b8d0'); gr.addColorStop(0.5, '#c4cfe0');
    gr.addColorStop(0.7, '#a9b8d0'); gr.addColorStop(0.82, '#e9eef7'); gr.addColorStop(1, '#ffffff');
    cx.fillStyle = gr; cx.fillRect(0, 0, 64, 4);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    this.mat = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, blending: THREE.MultiplyBlending, premultipliedAlpha: true, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
  }
  // write the ring buffer out in order (oldest -> newest) so the strip is contiguous
  add(p, side, n, width, depth) {
    if (this.last && this.last.distanceToSquared(p) < 0.16) return;
    const k = this.head; this.head = (this.head + 1) % this.max; this.count = Math.min(this.max, this.count + 1);
    this.ring = this.ring || new Array(this.max);
    this.ring[k] = { x: p.x, y: p.y, z: p.z, sx: side.x, sz: side.z, nx: n.x, ny: n.y, nz: n.z, w: width, d: depth, age: 0, brk: !this.last };
    this.last = (this.last || new THREE.Vector3()).copy(p);
  }
  cut() { this.last = null; }
  update(dt) {
    if (!this.ring) return;
    const n = this.count;
    for (let i = 0; i < n; i++) {
      const k = (this.head - n + i + this.max) % this.max;
      const r = this.ring[k];
      r.age += dt;
      const off = 0.03;
      const brk = r.brk || (i + 1 < n && this.ring[(k + 1) % this.max].brk);
      const x = r.x + r.nx * off, y = r.y + r.ny * off, z = r.z + r.nz * off;
      const w = brk ? 0 : r.w * 0.5;
      this.pos.set([x - r.sx * w, y, z - r.sz * w, x + r.sx * w, y, z + r.sz * w], i * 6);
      const c = 1; // the groove texture does the darkening
      this.col.set([c, c, c, c, c, c], i * 6);
      this.uv.set([0, 0, 1, 0], i * 4);
    }
    // collapse unused tail
    for (let i = n; i < this.max; i++) { this.pos.set([0, -9999, 0, 0, -9999, 0], i * 6); }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.uv.needsUpdate = true;
    this.geo.setDrawRange(0, Math.max(0, n - 1) * 6);
  }
}

// Diamond dust: tiny sparkling ice crystals hanging in the sunlit air.
export class Crystals {
  constructor(n = 350) {
    this.n = n;
    const pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos.set([(Math.random() - 0.5) * 40, (Math.random() - 0.2) * 14, (Math.random() - 0.5) * 40], i * 3); seed[i] = Math.random(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uScale: { value: 400 } },
      vertexShader: `attribute float seed; uniform float uTime; uniform vec3 uCenter; uniform float uScale; varying float vTw;
        void main(){
          vec3 p = position;
          p.y -= mod(uTime * (0.25 + seed * 0.3), 14.0);
          p.x += sin(uTime * 0.7 + seed * 40.0) * 0.6;
          vec3 w = uCenter + mod(p - uCenter + 20.0, 40.0) - 20.0;
          w.y = uCenter.y + mod(position.y - uTime * (0.25 + seed * 0.3) + 4.0, 14.0) - 4.0;
          vec4 mv = modelViewMatrix * vec4(w, 1.0);
          gl_Position = projectionMatrix * mv;
          vTw = pow(max(0.0, sin(uTime * (2.0 + seed * 5.0) + seed * 60.0)), 12.0);
          gl_PointSize = (1.5 + vTw * 5.0) * uScale / 400.0 * clamp(8.0 / -mv.z, 0.4, 2.2);
        }`,
      fragmentShader: `varying float vTw; void main(){ vec2 c = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(c)); float star = max(smoothstep(0.08,0.0,abs(c.x)), smoothstep(0.08,0.0,abs(c.y))) * vTw; gl_FragColor = vec4(vec3(1.0), (a * 0.35 + star) * (0.3 + vTw)); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
  }
  update(t, center, h) { this.mat.uniforms.uTime.value = t; this.mat.uniforms.uCenter.value.copy(center); this.mat.uniforms.uScale.value = h; }
}


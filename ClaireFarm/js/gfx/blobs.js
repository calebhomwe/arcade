// Soft contact shadows and glows: instanced flat quads, one draw call. Shadows lean away from the sun.
import * as THREE from 'three';
import { BLOB_VERT, BLOB_FRAG, SU } from './shaders.js';

export class BlobLayer {
  constructor(scene, cap = 420) {
    this.cap = cap; this.n = 0; this.free = [];
    const quad = new THREE.PlaneGeometry(1, 1); quad.rotateX(-Math.PI / 2);
    const g = new THREE.InstancedBufferGeometry(); g.index = quad.index; g.setAttribute('position', quad.attributes.position); g.setAttribute('uv', quad.attributes.uv);
    this.a = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); this.b = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
    this.a.setUsage(THREE.DynamicDrawUsage); this.b.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aBlob', this.a); g.setAttribute('aBlob2', this.b); g.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({ vertexShader: BLOB_VERT, fragmentShader: BLOB_FRAG, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, uniforms: SU });
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 1; scene.add(this.mesh);
    this.items = []; this.dirty = true; this.lastSun = new THREE.Vector3(); this.geo = g;
  }
  // o: {x,z,r,h,strength,y,kind} ; kind 0 shadow (leans from the sun), 1 glow, 2 flat decal (no lean)
  add(o) {
    const id = this.free.length ? this.free.pop() : this.n++;
    this.items[id] = Object.assign({ r: 1, h: 1, strength: 0.4, y: 0.03, kind: 0, active: true }, o);
    this.geo.instanceCount = this.n; this.dirty = true; return id;
  }
  set(id, o) { Object.assign(this.items[id], o); this.dirty = true; }
  remove(id) { if (this.items[id]) { this.items[id].active = false; this.free.push(id); this.dirty = true; } }
  update() {
    const sun = SU.uSunDir.value, night = SU.uNight.value;
    const moved = this.lastSun.distanceToSquared(sun) > 1e-5;
    if (!this.dirty && !moved && Math.abs(night - (this._night || 0)) < 0.01) return;
    this.lastSun.copy(sun); this._night = night; this.dirty = false;
    const el = Math.max(0.35, sun.y), hl = Math.hypot(sun.x, sun.z) || 1, dx = -sun.x / hl, dz = -sun.z / hl;
    const lean = Math.min(3.2, Math.sqrt(Math.max(0, 1 - el * el)) / el);
    const A = this.a.array, B = this.b.array;
    for (let i = 0; i < this.n; i++) {
      const it = this.items[i];
      if (!it || !it.active) { A[i * 4 + 2] = 0; A[i * 4 + 3] = 0; B[i * 4 + 1] = 0; continue; }
      if (it.kind === 0) {
        const l = it.h * lean * 0.5;
        A[i * 4] = it.x + dx * l * 0.55; A[i * 4 + 1] = it.z + dz * l * 0.55; A[i * 4 + 2] = it.r * 1.7 + l * 0.8; A[i * 4 + 3] = it.r * 1.55;
        B[i * 4] = Math.atan2(dz, dx); B[i * 4 + 1] = it.strength * (1 - night * 0.6);
      } else {
        A[i * 4] = it.x; A[i * 4 + 1] = it.z; A[i * 4 + 2] = it.sx || it.r * 2; A[i * 4 + 3] = it.sz || it.r * 2;
        B[i * 4] = it.rot || 0; B[i * 4 + 1] = it.strength;
      }
      B[i * 4 + 2] = it.y; B[i * 4 + 3] = it.kind === 1 ? 1 : 0;
    }
    this.a.needsUpdate = true; this.b.needsUpdate = true;
  }
}

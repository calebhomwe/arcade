// The orbit camera. One finger pans (with inertia), two fingers pinch-zoom AND twist to rotate,
// buttons and keys rotate / tilt / zoom, double-tap focuses. It never fights the player: any touch
// cancels a programmatic move instantly, and tilt is clamped so the map can never be seen from below.
import * as THREE from 'three';
import { clamp, lerp, wrapAngle } from '../util.js';

const DEG = Math.PI / 180;
export const PITCH_MIN = 24 * DEG, PITCH_MAX = 68 * DEG;

export class CameraRig {
  constructor(camera, dom, opts = {}) {
    this.camera = camera; this.dom = dom;
    this.fov = opts.fov || 32;
    camera.fov = this.fov; camera.near = 0.5; camera.far = 700;
    this.cur = { x: 0, z: 0, yaw: 32 * DEG, pitch: 42 * DEG, size: 15 };
    this.tgt = { x: 0, z: 0, yaw: this.cur.yaw, pitch: this.cur.pitch, size: 15 };
    this.bounds = opts.bounds || { minX: -24, maxX: 24, minZ: -24, maxZ: 24 };
    this.sizeMin = 8; this.sizeMax = 26;
    this.aspect = 1;
    this.vel = { x: 0, z: 0 };
    this.pointers = new Map();
    this.samples = [];
    this.gesture = null;       // {kind:'pan'|'pinch'|'orbit'}
    this.tween = null;         // programmatic move
    this.offsetY = 0;          // screen-space vertical offset (fraction of the view) so a bottom sheet doesn't hide the focus
    this.tOffsetY = 0;
    this.enabled = true;
    this.onTap = null; this.onDoubleTap = null; this.onUser = null;
    this.lastTap = { t: 0, x: 0, y: 0 };
    this._v = new THREE.Vector3(); this._r = new THREE.Raycaster();
    this._bind();
  }

  setViewport(w, h) {
    this.w = w; this.h = h; this.aspect = w / h;
    this.camera.aspect = this.aspect;
    const portrait = this.aspect < 1;
    this.sizeMin = portrait ? 8 : 9;
    this.sizeMax = portrait ? 27 : 30;
    this.cur.size = clamp(this.cur.size, this.sizeMin, this.sizeMax);
    this.tgt.size = clamp(this.tgt.size, this.sizeMin, this.sizeMax);
    this.apply();
  }

  // distance from the target that shows `size` world units across the shorter screen side
  distFor(size) { const half = Math.tan((this.fov * DEG) / 2); return size / (2 * half * Math.min(1, this.aspect)); }

  apply() {
    const c = this.cur, cam = this.camera;
    const d = this.distFor(c.size);
    const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    cam.position.set(c.x + d * cp * Math.sin(c.yaw), d * sp, c.z + d * cp * Math.cos(c.yaw));
    cam.lookAt(c.x, 0, c.z);
    // shift the picture up so the focus sits above a bottom sheet
    if (Math.abs(this.offsetY) > 1e-3 && this.w) cam.setViewOffset(this.w, this.h, 0, this.offsetY * this.h, this.w, this.h); else if (cam.view) cam.clearViewOffset();
    cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  }

  // ground (y = 0) point under a screen position for some other camera state (no side effects)
  groundFrom(state, sx, sy, out = new THREE.Vector3()) {
    const cam = this._tmp || (this._tmp = new THREE.PerspectiveCamera());
    cam.fov = this.fov; cam.aspect = this.aspect; cam.near = 0.5; cam.far = 700;
    const d = this.distFor(state.size), cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
    cam.position.set(state.x + d * cp * Math.sin(state.yaw), d * sp, state.z + d * cp * Math.cos(state.yaw));
    cam.lookAt(state.x, 0, state.z);
    if (Math.abs(this.offsetY) > 1e-3) cam.setViewOffset(this.w, this.h, 0, this.offsetY * this.h, this.w, this.h); else if (cam.view) cam.clearViewOffset();
    cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
    const ndc = new THREE.Vector2((sx / this.w) * 2 - 1, -(sy / this.h) * 2 + 1);
    this._r.setFromCamera(ndc, cam);
    const ray = this._r.ray, t = -ray.origin.y / (ray.direction.y || -1e-6);
    return out.copy(ray.origin).addScaledVector(ray.direction, t);
  }
  ground(sx, sy, out) { const ndc = new THREE.Vector2((sx / this.w) * 2 - 1, -(sy / this.h) * 2 + 1); this._r.setFromCamera(ndc, this.camera); const ray = this._r.ray; const t = -ray.origin.y / (ray.direction.y || -1e-6); return (out || new THREE.Vector3()).copy(ray.origin).addScaledVector(ray.direction, t); }
  project(v, out = { x: 0, y: 0, z: 0 }) { this._v.copy(v).project(this.camera); out.x = (this._v.x * 0.5 + 0.5) * this.w; out.y = (-this._v.y * 0.5 + 0.5) * this.h; out.z = this._v.z; return out; }

  clampTarget(x, z, soft = 0) {
    const b = this.bounds;
    const cx = clamp(x, b.minX, b.maxX), cz = clamp(z, b.minZ, b.maxZ);
    if (!soft) return [cx, cz];
    const rub = (e) => Math.sign(e) * soft * (1 - Math.exp(-Math.abs(e) / soft));
    return [cx + rub(x - cx), cz + rub(z - cz)];
  }

  // ---- programmatic moves --------------------------------------------------------------------
  focus(x, z, size, dur = 0.7, offsetY = 0) {
    const [cx, cz] = this.clampTarget(x, z);
    this.tween = { t: 0, dur, from: { ...this.cur }, offFrom: this.offsetY, to: { x: cx, z: cz, size: clamp(size || this.cur.size, this.sizeMin, this.sizeMax), off: offsetY } };
    this.vel.x = this.vel.z = 0;
  }
  rotate(deltaDeg) { this.cancelTween(); this.tgt.yaw = this.cur.yaw + deltaDeg * DEG; this.tgt.yaw = this.tgt.yaw; this._userMove(); }
  tilt(deltaDeg) { this.cancelTween(); this.tgt.pitch = clamp(this.tgt.pitch + deltaDeg * DEG, PITCH_MIN, PITCH_MAX); this._userMove(); }
  zoom(factor) { this.cancelTween(); this.tgt.size = clamp(this.tgt.size * factor, this.sizeMin, this.sizeMax); this._userMove(); }
  reset(x = 0, z = 0, size = 15) { this.tween = null; const [cx, cz] = this.clampTarget(x, z); this.tgt.x = cx; this.tgt.z = cz; this.tgt.size = clamp(size, this.sizeMin, this.sizeMax); this.tgt.pitch = 42 * DEG; this.vel.x = this.vel.z = 0; }
  cancelTween() { this.tween = null; }
  _userMove() { if (this.onUser) this.onUser(); }

  // ---- per-frame -----------------------------------------------------------------------------
  update(dt) {
    dt = Math.min(dt, 0.1);
    const c = this.cur, t = this.tgt;
    if (this.tween) {
      const tw = this.tween; tw.t += dt / tw.dur;
      const k = tw.t >= 1 ? 1 : 1 - Math.pow(1 - tw.t, 3);
      c.x = lerp(tw.from.x, tw.to.x, k); c.z = lerp(tw.from.z, tw.to.z, k); c.size = lerp(tw.from.size, tw.to.size, k);
      this.offsetY = lerp(tw.offFrom, tw.to.off, k);
      t.x = c.x; t.z = c.z; t.size = c.size;
      if (tw.t >= 1) this.tween = null;
    } else if (!this.gesture) {
      // inertia
      const sp = Math.hypot(this.vel.x, this.vel.z);
      if (sp > 0.02) {
        t.x += this.vel.x * dt; t.z += this.vel.z * dt;
        const f = Math.exp(-dt * 3.6); this.vel.x *= f; this.vel.z *= f;
      } else this.vel.x = this.vel.z = 0;
      // spring back inside the bounds
      const [bx, bz] = this.clampTarget(t.x, t.z);
      const k = 1 - Math.exp(-dt * 9);
      t.x += (bx - t.x) * k; t.z += (bz - t.z) * k;
      const s = 1 - Math.exp(-dt * 12);
      c.x += (t.x - c.x) * s; c.z += (t.z - c.z) * s;
      c.yaw += wrapAngle(t.yaw - c.yaw) * s;
      c.pitch += (t.pitch - c.pitch) * s;
      c.size += (t.size - c.size) * s;
      this.offsetY += (this.tOffsetY - this.offsetY) * s;
      if (Math.abs(t.yaw - c.yaw) < 1e-4) c.yaw = t.yaw;
    }
    c.pitch = clamp(c.pitch, PITCH_MIN, PITCH_MAX);
    c.size = clamp(c.size, this.sizeMin, this.sizeMax);
    if (this.keys) this._keys(dt);
    this.apply();
  }

  _keys(dt) {
    const k = this.keys; let dx = 0, dz = 0;
    if (k.ArrowLeft || k.KeyA) dx -= 1; if (k.ArrowRight || k.KeyD) dx += 1; if (k.ArrowUp || k.KeyW) dz -= 1; if (k.ArrowDown || k.KeyS) dz += 1;
    if (dx || dz) {
      this.cancelTween();
      const sp = this.tgt.size * 0.9 * dt, y = this.cur.yaw, cs = Math.cos(y), sn = Math.sin(y);
      this.tgt.x += (dx * cs + dz * sn) * sp; this.tgt.z += (-dx * sn + dz * cs) * sp;
      this.vel.x = this.vel.z = 0; this._userMove();
    }
    if (k.KeyQ) this.tgt.yaw += 1.4 * dt; if (k.KeyE) this.tgt.yaw -= 1.4 * dt;
    if (k.KeyR) this.tgt.pitch = clamp(this.tgt.pitch + 0.8 * dt, PITCH_MIN, PITCH_MAX); if (k.KeyF) this.tgt.pitch = clamp(this.tgt.pitch - 0.8 * dt, PITCH_MIN, PITCH_MAX);
    if (k.Equal || k.NumpadAdd) this.tgt.size = clamp(this.tgt.size * (1 - dt * 1.2), this.sizeMin, this.sizeMax);
    if (k.Minus || k.NumpadSubtract) this.tgt.size = clamp(this.tgt.size * (1 + dt * 1.2), this.sizeMin, this.sizeMax);
  }

  // ---- input ---------------------------------------------------------------------------------
  _bind() {
    const d = this.dom;
    d.style.touchAction = 'none';
    d.addEventListener('pointerdown', (e) => this._down(e));
    d.addEventListener('pointermove', (e) => this._move(e));
    const up = (e) => this._up(e);
    d.addEventListener('pointerup', up); d.addEventListener('pointercancel', up); d.addEventListener('lostpointercapture', (e) => { if (this.pointers.has(e.pointerId)) this._up(e); });
    d.addEventListener('wheel', (e) => this._wheel(e), { passive: false });
    d.addEventListener('contextmenu', (e) => e.preventDefault());
    this.keys = {};
    addEventListener('keydown', (e) => { if (!this.enabled || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return; this.keys[e.code] = true; if (e.code === 'Home') this.reset(); });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });
  }

  _down(e) {
    if (!this.enabled) return;
    try { this.dom.setPointerCapture(e.pointerId); } catch (x) {}
    this.cancelTween(); this._userMove();
    const rect = this.dom.getBoundingClientRect();
    const p = { id: e.pointerId, x: e.clientX - rect.left, y: e.clientY - rect.top, sx: e.clientX - rect.left, sy: e.clientY - rect.top, t: performance.now(), type: e.pointerType, button: e.button, moved: false, ctrl: e.ctrlKey || e.metaKey };
    this.pointers.set(e.pointerId, p);
    this.vel.x = this.vel.z = 0; this.samples.length = 0;
    if (this.pointers.size === 1) {
      const orbit = e.pointerType === 'mouse' && (e.button === 2 || p.ctrl);
      this.gesture = { kind: orbit ? 'orbit' : 'pan', grab: this.ground(p.x, p.y), multi: false, startYaw: this.cur.yaw, startPitch: this.cur.pitch };
    } else if (this.pointers.size === 2) this._startPinch();
    if (e.pointerType === 'mouse') e.preventDefault();
  }

  _startPinch() {
    const [a, b] = [...this.pointers.values()];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    this.gesture = { kind: 'pinch', multi: true, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, a0: Math.atan2(b.y - a.y, b.x - a.x), size0: this.cur.size, yaw0: this.cur.yaw, pitch0: this.cur.pitch, my0: my, grab: this.ground(mx, my) };
    this.vel.x = this.vel.z = 0;
    for (const p of this.pointers.values()) p.moved = true;
  }

  _move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p || !this.gesture) return;
    const rect = this.dom.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const g = this.gesture;
    if (!p.moved && Math.hypot(x - p.sx, y - p.sy) > (p.type === 'touch' ? 9 : 5)) p.moved = true;
    p.x = x; p.y = y;
    if (g.kind === 'pan') {
      if (!p.moved) return;
      // keep the ground point that was grabbed under the finger
      const now = this.ground(x, y);
      let nx = this.cur.x + (g.grab.x - now.x), nz = this.cur.z + (g.grab.z - now.z);
      [nx, nz] = this.clampTarget(nx, nz, 3.5);
      const t = performance.now();
      this.samples.push({ t, x: nx, z: nz }); if (this.samples.length > 8) this.samples.shift();
      this.cur.x = this.tgt.x = nx; this.cur.z = this.tgt.z = nz;
      this.apply();
    } else if (g.kind === 'orbit') {
      if (!p.moved) return;
      const dx = x - (g.lx == null ? p.sx : g.lx), dy = y - (g.ly == null ? p.sy : g.ly); g.lx = x; g.ly = y;
      this.tgt.yaw -= dx * 0.008; this.cur.yaw = this.tgt.yaw;
      this.tgt.pitch = clamp(this.tgt.pitch + dy * 0.006, PITCH_MIN, PITCH_MAX); this.cur.pitch = this.tgt.pitch;
      this.apply();
    } else if (g.kind === 'pinch' && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const c = this.cur;
      c.size = clamp(g.size0 * g.d0 / d, this.sizeMin, this.sizeMax);
      c.yaw = g.yaw0 - wrapAngle(ang - g.a0);
      // dragging the two fingers up/down together tilts a little
      c.pitch = clamp(g.pitch0 + (my - g.my0) * 0.0018, PITCH_MIN, PITCH_MAX);
      // keep the grabbed ground point under the fingers' midpoint
      const sx = c.x, sz = c.z; c.x = 0; c.z = 0; this.apply();
      const off = this.ground(mx, my); c.x = clamp(g.grab.x - off.x, this.bounds.minX - 3, this.bounds.maxX + 3); c.z = clamp(g.grab.z - off.z, this.bounds.minZ - 3, this.bounds.maxZ + 3);
      this.tgt.x = c.x; this.tgt.z = c.z; this.tgt.yaw = c.yaw; this.tgt.pitch = c.pitch; this.tgt.size = c.size;
      this.apply();
    }
  }

  _up(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    try { this.dom.releasePointerCapture(e.pointerId); } catch (x) {}
    const g = this.gesture;
    if (this.pointers.size === 0) {
      const dur = performance.now() - p.t;
      if (g && !g.multi && !p.moved && dur < 500 && e.type === 'pointerup') {
        this._tap(p);
      } else if (g && g.kind === 'pan' && p.moved) {
        // fling
        const s = this.samples, now = performance.now();
        const recent = s.filter((q) => now - q.t < 110);
        if (recent.length >= 2) {
          const a = recent[0], b = recent[recent.length - 1], dt = (b.t - a.t) / 1000;
          if (dt > 0.005) { this.vel.x = clamp((b.x - a.x) / dt, -40, 40); this.vel.z = clamp((b.z - a.z) / dt, -40, 40); }
        }
        this.tgt.x = this.cur.x; this.tgt.z = this.cur.z;
      }
      this.gesture = null;
      this.tgt.x = this.cur.x; this.tgt.z = this.cur.z; this.tgt.yaw = this.cur.yaw; this.tgt.pitch = this.cur.pitch; this.tgt.size = this.cur.size;
    } else if (this.pointers.size === 1) {
      // one finger left after a pinch: continue as a pan from here without a jump
      const q = [...this.pointers.values()][0]; q.sx = q.x; q.sy = q.y; q.moved = true;
      this.gesture = { kind: 'pan', grab: this.ground(q.x, q.y), multi: true };
      this.tgt.x = this.cur.x; this.tgt.z = this.cur.z; this.tgt.yaw = this.cur.yaw; this.tgt.pitch = this.cur.pitch; this.tgt.size = this.cur.size;
      this.samples.length = 0;
    }
  }

  _tap(p) {
    const now = performance.now();
    const lt = this.lastTap;
    const dbl = now - lt.t < 340 && Math.hypot(p.x - lt.x, p.y - lt.y) < 34;
    this.lastTap = { t: dbl ? 0 : now, x: p.x, y: p.y };
    if (dbl && this.onDoubleTap) this.onDoubleTap(p.x, p.y);
    else if (this.onTap) this.onTap(p.x, p.y, p.type);
  }

  _wheel(e) {
    if (!this.enabled) return;
    e.preventDefault(); this.cancelTween(); this._userMove();
    const rect = this.dom.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const factor = Math.exp(clamp(e.deltaY, -240, 240) * 0.0016);
    if (e.ctrlKey && false) return;
    const T = this.tgt;
    // zoom about the cursor: keep the ground point under it
    const st = { x: 0, z: 0, yaw: T.yaw, pitch: T.pitch, size: T.size };
    const before = this.groundFrom({ x: T.x, z: T.z, yaw: T.yaw, pitch: T.pitch, size: T.size }, sx, sy);
    T.size = clamp(T.size * factor, this.sizeMin, this.sizeMax);
    const after = this.groundFrom({ x: T.x, z: T.z, yaw: T.yaw, pitch: T.pitch, size: T.size }, sx, sy);
    T.x += before.x - after.x; T.z += before.z - after.z;
    [T.x, T.z] = this.clampTarget(T.x, T.z);
  }
}

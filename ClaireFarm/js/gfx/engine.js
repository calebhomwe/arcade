// Renderer, camera rig, frame loop, adaptive quality and WebGL context-loss handling.
import * as THREE from 'three';
import { CameraRig } from './camera.js';
import { SU } from './shaders.js';
import { ShadowMap } from './shadow.js';
import { clamp } from '../util.js';

// dpr is a ceiling: the engine also keeps the canvas near a pixel budget (about 1.3 MP on phones)
export const QUALITY = {
  high:   { dpr: 2,   pix: 4.2e6, grass: 6500, flowers: 900, trees: 1,    shadow: 2048, aa: true,  particles: 1.0 },
  medium: { dpr: 1.5, pix: 1.5e6, grass: 3200, flowers: 500, trees: 0.8,  shadow: 1024, aa: true,  particles: 0.7 },
  low:    { dpr: 1,   pix: 0.9e6, grass: 1200, flowers: 220, trees: 0.55, shadow: 0,    aa: false, particles: 0.4 },
};

function detectSoftware(gl) {
  try {
    const e = gl.getExtension('WEBGL_debug_renderer_info');
    const name = e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    return { software: /swiftshader|llvmpipe|software|mesa offscreen/i.test(name), name };
  } catch (e) { return { software: false, name: '?' }; }
}

export class Engine {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.qualityName = opts.quality || 'auto';
    const phone = Math.min(screen.width, screen.height) < 700 || /iPhone|iPad|Android/i.test(navigator.userAgent);
    this.phone = phone;
    // pick the antialias setting once: it cannot change later
    const aa = !(opts.noAA) && (window.devicePixelRatio || 1) <= 3;
    let gl2 = true;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: aa, alpha: false, stencil: false, depth: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
    } catch (e) { gl2 = false; throw e; }
    const r = this.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NoToneMapping;
    r.setClearColor(0xcde7fb, 1);
    r.info.autoReset = false;
    this.shadow = new ShadowMap(r, null);
    const det = detectSoftware(r.getContext());
    this.software = det.software; this.gpuName = det.name;
    this.scene = new THREE.Scene(); this.shadow.scene = this.scene;
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 700);
    this.rig = new CameraRig(this.camera, canvas, { fov: 32 });
    this.clock = { t: 0, dt: 0, last: 0 };
    this.frameMs = 16; this.slow = 0; this.fast = 0; this.dyn = 1; this.lastAdapt = 0;
    this.onUpdate = []; this.onQuality = [];
    this.running = false; this.lost = false;
    this.stats = { calls: 0, tris: 0, fps: 60, ms: 16, dpr: 1 };
    this.setQuality(this.qualityName === 'auto' ? (det.software ? 'low' : 'high') : this.qualityName, true);
    this.resize();
    addEventListener('resize', () => this.resize());
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.resize());
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; if (this.onLost) this.onLost(); });
    canvas.addEventListener('webglcontextrestored', () => { this.lost = false; this.resize(true); if (this.onRestored) this.onRestored(); });
    this._raf = this._raf.bind(this);
  }

  setQuality(name, silent) {
    if (name === 'auto') name = this.software ? 'low' : (this.phone ? 'medium' : 'high');
    this.quality = name; this.q = QUALITY[name];
    this.dpr = this.pickDpr();
    this.shadow.setSize(this.q.shadow); SU.uBlobScale.value = this.q.shadow ? 0.5 : 1;
    if (!silent) { this.resize(true); this.onQuality.forEach((f) => f(name, this.q)); }
  }

  pickDpr() { return Math.max(0.6, Math.min(window.devicePixelRatio || 1, this.q.dpr) * this.dyn); }

  resize(force) {
    const vv = window.visualViewport;
    const w = Math.max(1, Math.round(innerWidth)), h = Math.max(1, Math.round(vv ? Math.min(vv.height + vv.offsetTop, innerHeight) : innerHeight));
    const dpr = this.pickDpr();
    if (!force && w === this.w && h === this.h && dpr === this.dpr) return;
    this.w = w; this.h = h; this.dpr = dpr;
    // iOS Safari has a hard canvas-area limit; stay well inside it
    let pr = dpr; const maxPix = this.q.pix; if (w * h * pr * pr > maxPix) pr = Math.sqrt(maxPix / (w * h));
    this.renderer.setPixelRatio(pr); this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.rig.setViewport(w, h);
    this.stats.dpr = +pr.toFixed(2);
    // setSize clears the canvas: draw again straight away so a resize never flashes an empty frame
    if (this.running && !this.lost && this.rig.w) { try { this.rig.apply(); this.renderer.render(this.scene, this.camera); } catch (err) {} }
  }

  start() { if (this.running) return; this.running = true; this.clock.last = performance.now(); requestAnimationFrame(this._raf); }
  stop() { this.running = false; }

  _raf(now) {
    if (!this.running) return;
    requestAnimationFrame(this._raf);
    if (this.lost) return;
    const dt = Math.min(0.1, (now - this.clock.last) / 1000); this.clock.last = now;
    if (dt <= 0) return;
    this.clock.dt = dt; this.clock.t += dt;
    SU.uTime.value = this.clock.t;
    for (const f of this.onUpdate) f(dt, this.clock.t);
    this.rig.update(dt);
    SU.uCamPos.value.copy(this.camera.position);
    SU.uFogStart.value = this.rig.distFor(this.rig.cur.size) * 1.05;
    const r = this.renderer; r.info.reset();
    if (this.shadow.on) {
      const c = this.rig.cur, a = this.rig.aspect, half = clamp(0.75 * c.size * Math.max(1, a, 1 / a) * 1.15 + 4, 18, 40);
      const sunY = SU.uSunDir.value.y, k = clamp((sunY - 0.05) / 0.2, 0, 1) * (1 - SU.uNight.value * 0.55);
      this.shadow.render(c.x, c.z, half, k * 0.92);
    }
    r.render(this.scene, this.camera);
    const info = r.info.render; this.stats.calls = info.calls; this.stats.tris = info.triangles;
    this._adapt(dt);
  }

  // Drop the resolution, then the quality tier, when frames run long. Never goes back up on its own
  // (that would make the picture pump); a person can raise it in Settings.
  _adapt(dt) {
    const ms = dt * 1000;
    this.frameMs += (ms - this.frameMs) * 0.06;
    this.stats.ms = +this.frameMs.toFixed(1); this.stats.fps = Math.round(1000 / this.frameMs);
    const t = this.clock.t;
    if (t < 4 || t - this.lastAdapt < 2.5 || document.hidden) return;
    if (this.frameMs > 30) this.slow++; else this.slow = Math.max(0, this.slow - 1);
    if (this.slow > 50) {
      this.slow = 0; this.lastAdapt = t;
      if (this.dyn > 0.75) { this.dyn = this.dyn > 0.9 ? 0.8 : 0.66; this.dpr = this.pickDpr(); this.resize(true); this.adapted = (this.adapted || 0) + 1; }
      else if (this.quality === 'high') { this.dyn = 1; this.setQuality('medium'); this.adapted = (this.adapted || 0) + 1; }
      else if (this.quality === 'medium') { this.dyn = 1; this.setQuality('low'); this.adapted = (this.adapted || 0) + 1; }
      else if (this.dyn > 0.6) { this.dyn = 0.6; this.resize(true); }
    }
  }
}

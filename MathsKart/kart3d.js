/* kart3d.js: the 3D stage for Maths Kart GP.  three.js r180, vendored in ./vendor (no CDN).
 *
 * The race itself (karts, laps, questions, balloons, items) lives in index.html and works in
 * track units: s = distance along the centreline, lat = sideways offset (positive = the kart's
 * right).  This module only draws it: a textured road ribbon with kerbs and a maths-symbol wall,
 * Kenney karts (wheels spin, front wheels steer, the driver leans), answer balloons that pop,
 * rainbow item boxes, scrolling boost pads, toon + rim shading, inverted-hull outlines on the
 * karts, soft sun shadows, a gradient sky with a sun, hills on the horizon and pooled particles.
 *
 * Bridge: index.html sets window.MK before this module runs; this module sets window.K3.
 * Metres, y up.  1 track unit = 1/20 m.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const MK = window.MK;
const U = 1 / 20;
const KS = 2.2;                    // kart model scale (a Kenney kart is 1.4 m long; ours are 3 m)
const rm = () => MK.RM.matches;    // prefers-reduced-motion, read live

/* ───────────── shared look: 3-step toon ramp with a warm rim light ───────────── */
function makeRamp() {
  const d = new Uint8Array([95, 95, 95, 255, 175, 175, 175, 255, 238, 238, 238, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}
const RAMP = makeRamp();
function toon(src, rim = 0.4) {
  const m = new THREE.MeshToonMaterial({
    color: src.color ? src.color.clone() : new THREE.Color(1, 1, 1),
    map: src.map || null, gradientMap: RAMP,
    transparent: !!src.transparent, opacity: src.opacity == null ? 1 : src.opacity,
  });
  if (m.map) { m.map.colorSpace = THREE.SRGBColorSpace; m.map.anisotropy = 4; }
  else if (!(src.userData && src.userData.linear)) {
    m.color.convertSRGBToLinear();                        // Kenney palettes are sRGB numbers
    const n = src.name || '';
    if (/^leafs?Green/i.test(n)) m.color.setStyle('#57b84a');     // the kits' mint leaves read teal at sunset: warm green
    else if (/^grass\.0/i.test(n)) m.color.setStyle('#86cf4e');
    else if (/^grass$/i.test(n)) m.color.setStyle('#4faa46');
  }
  m.userData.rim = { value: rim };
  m.onBeforeCompile = sh => {
    sh.uniforms.rimK = m.userData.rim;
    sh.fragmentShader = 'uniform float rimK;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
      'float rimF = 1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);\n' +
      'outgoingLight += vec3(1.0, 0.95, 0.85) * pow(rimF, 3.0) * rimK;\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'toonrim';
  return m;
}
/* inverted hull: the back faces pushed out along the normals, drawn dark */
const OUTLINE = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: { k: { value: 0.022 }, col: { value: new THREE.Color('#1a1030') } },
  vertexShader: 'uniform float k; void main(){ vec3 p = position + normal * k; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
  fragmentShader: 'uniform vec3 col; void main(){ gl_FragColor = vec4(col, 1.0); }',
});

function dequantize(g) {
  for (const name of Object.keys(g.attributes)) {
    const a = g.attributes[name];
    if (a.array instanceof Float32Array && !a.isInterleavedBufferAttribute) continue;
    const out = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
    g.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize));
  }
  return g;
}

/** true when WebGL runs on a CPU rasteriser (SwiftShader, llvmpipe): such a device starts on Low */
export function softwareGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|software/i.test(name);
  } catch (e) { return false; }
}

/* seeded random, so a track's scenery is the same every race */
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ───────────── per-track look ───────────── */
const THEMES = [
  { // SUNSET SPEEDWAY: palms, grandstands, a low orange sun
    skyTop: '#3a2f8f', skyMid: '#d0609a', skyLow: '#ffb46e', fog: '#f7a577',
    sun: '#ffd6a0', sunI: 2.9, sunDir: [-0.7, 0.52, 0.55], hemiSky: '#d2c4ff', hemiGround: '#7a6040', hemiI: 1.35,
    ground: 'grass', groundTint: '#b5e07a', hillA: '#6b3f8f', hillB: '#9c5a9a', wallA: '#ffd257', wallB: '#4a6fe0',
    flora: [['tree_palmTall', 9, 5], ['tree_palmBend', 8, 4], ['tree_palmDetailedShort', 6, 3], ['tree_oak', 7, 2], ['plant_bushLarge', 1.8, 4], ['flower_yellowA', 0.9, 3], ['flower_redA', 0.9, 3], ['grass_large', 0.8, 3]],
  },
  { // CANYON CIRCUIT: red mesas, cactus, a high desert sun
    skyTop: '#2166d9', skyMid: '#62a8ff', skyLow: '#ffe0b0', fog: '#f6d2a4',
    sun: '#fff1d6', sunI: 2.9, sunDir: [0.45, 0.7, 0.4], hemiSky: '#bcdcff', hemiGround: '#a0603a', hemiI: 1.2,
    ground: 'sand', groundTint: '#ffc48e', hillA: '#b3522c', hillB: '#d9804a', wallA: '#ff8a3d', wallB: '#3fb6a8',
    flora: [['cactus_tall', 5.5, 5], ['cactus_short', 2.8, 4], ['rock_tallA', 8, 3], ['rock_tallE', 6, 3], ['rock_largeA', 3.5, 3], ['cliff_large_rock', 12, 2], ['plant_bushLarge', 1.4, 2]],
    tintRock: '#d9774a',
  },
];

/* ───────────── canvas textures ───────────── */
function canvasTex(w, h, paint, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = ANISO;
  return t;
}
let ANISO = 8;     // anisotropic filtering: 8 on High, off on Low (it is costly on CPU-rendered WebGL)
function loadImg(url) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; }); }

/* ═════════════════════════════════════════════════════════════════════════════════════ */
class KartStage {
  constructor(canvas, quality) {
    this.canvas = canvas;
    this.quality = quality;
    this.dyn = 1; this.ema = 16; this.lastT = 0; this.slowFor = 0; this.fastFor = 0;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high' && (devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.18;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.3, 900);
    this.camPos = new THREE.Vector3(); this.camLook = new THREE.Vector3(); this.camInit = false;
    this.fov = 58; this.shake = 0;
    this.scene.fog = new THREE.Fog('#f7a577', 80, 520);
    this.hemi = new THREE.HemisphereLight('#fff', '#666', 1.1); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff', 2.6);
    this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target);
    this.trackGroup = new THREE.Group(); this.scene.add(this.trackGroup);
    this.dynGroup = new THREE.Group(); this.scene.add(this.dynGroup);
    this.kinds = new Map();
    this.karts = [];
    this.balloons = new Map(); this.leaving = [];
    this.itemViews = [];
    this.builtFor = -1;
    this.t = 0;
    this._sky();
    this._particles();
    this.resize();
  }

  /* ---------------- loading ---------------- */
  async load() {
    const [gltf, asphalt, grass, sand] = await Promise.all([
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('models/kart.glb'),
      loadImg('textures/asphalt.jpg'), loadImg('textures/grass.jpg'), loadImg('textures/sand.jpg'),
    ]);
    this.imgs = { asphalt, grass, sand };
    const mats = new Map();
    gltf.scene.updateMatrixWorld(true);
    for (const node of gltf.scene.children) {
      const parts = [], box = new THREE.Box3();
      node.traverse(o => {
        if (!o.isMesh) return;
        const g = dequantize(o.geometry.clone()); g.applyMatrix4(o.matrixWorld);
        g.computeBoundingBox(); box.union(g.boundingBox);
        let m = mats.get(o.material);
        if (!m) { m = toon(o.material); mats.set(o.material, m); }
        parts.push({ g, m });
      });
      if (!parts.length) continue;
      // re-centre every model on its footprint, standing on y = 0
      const c = box.getCenter(new THREE.Vector3());
      for (const p of parts) { p.g.translate(-c.x, -box.min.y, -c.z); p.g.computeBoundingSphere(); }
      const size = box.getSize(new THREE.Vector3());
      this.kinds.set(node.name, { parts, w: size.x, h: size.y, d: size.z });
    }
    // wheels spin about their own centre
    const wk = this.kinds.get('wheel');
    if (wk) for (const p of wk.parts) p.g.translate(0, -wk.h / 2, 0);
    this._textures();
    this._buildKarts();
    this.ready = true;
  }

  _textures() {
    const hi = this.quality === 'high';
    const px = 512;
    // road: the asphalt photo twice across, painted edge lines and a dashed centre line
    this.roadTex = canvasTex(px * 2, px, (g, w, h) => {
      g.drawImage(this.imgs.asphalt, 0, 0, w / 2, h); g.drawImage(this.imgs.asphalt, w / 2, 0, w / 2, h);
      g.fillStyle = 'rgba(150,158,190,0.34)'; g.fillRect(0, 0, w, h);        // lighter, cooler, clean race tarmac
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.fillRect(w * 0.035, 0, w * 0.018, h); g.fillRect(w * (1 - 0.053), 0, w * 0.018, h);
      g.fillRect(w * 0.494, 0, w * 0.012, h * 0.5);
    }, true);
    // kerbs: red and white blocks
    this.kerbTex = canvasTex(64, 128, (g, w, h) => {
      g.fillStyle = '#e8343c'; g.fillRect(0, 0, w, h / 2); g.fillStyle = '#f6f3ee'; g.fillRect(0, h / 2, w, h / 2);
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 0, 6, h);
    }, true);
    // start line: checkers
    this.checkTex = canvasTex(256, 64, (g, w, h) => {
      const n = 16, m = 4;
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { g.fillStyle = (i + j) % 2 ? '#111' : '#fafafa'; g.fillRect(i * w / n, j * h / m, w / n + 1, h / m + 1); }
    });
    // boost pad: glowing chevrons (the texture scrolls)
    this.padTex = canvasTex(128, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, 'rgba(40,220,140,0)'); gr.addColorStop(0.12, 'rgba(40,220,140,.85)'); gr.addColorStop(0.88, 'rgba(40,220,140,.85)'); gr.addColorStop(1, 'rgba(40,220,140,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(235,255,245,.95)'; g.lineWidth = 16; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(w * 0.22, h * 0.78); g.lineTo(w * 0.5, h * 0.3); g.lineTo(w * 0.78, h * 0.78); g.stroke();
    }, true);
    this.padTex.wrapS = THREE.ClampToEdgeWrapping;
    // soft round sprite for smoke, sparks and flames
    this.dotTex = canvasTex(64, 64, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    this.blobTex = canvasTex(64, 64, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    this.blobTex.colorSpace = THREE.NoColorSpace;
    this.blobMat = new THREE.MeshBasicMaterial({ map: this.blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    this.cloudTex = canvasTex(256, 128, (g, w, h) => {
      const puff = (x, y, r) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.7, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
      puff(70, 80, 46); puff(120, 62, 58); puff(175, 82, 44); puff(140, 92, 40); puff(95, 95, 36);
    });
    void hi;
  }

  /* ---------------- sky, sun, clouds ---------------- */
  _sky() {
    this.skyU = { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, low: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() } };
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: this.skyU,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 low; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vP;
        void main(){ float h = clamp(vP.y, 0.0, 1.0);
          vec3 c = mix(low, mid, smoothstep(0.0, 0.18, h)); c = mix(c, top, smoothstep(0.15, 0.75, h));
          if (vP.y < 0.0) c = low;
          float s = max(dot(normalize(vP), normalize(sunDir)), 0.0);
          c += sunCol * (pow(s, 900.0) * 3.0 + pow(s, 28.0) * 0.45 + pow(s, 5.0) * 0.18);
          gl_FragColor = vec4(c, 1.0); }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), m);
    this.sky.renderOrder = -10; this.sky.frustumCulled = false;
    this.scene.add(this.sky);
  }

  setQuality(q) {
    this.quality = q === 'low' ? 'low' : 'high';
    const hi = this.quality === 'high';
    this.dyn = 1;
    this.renderer.shadowMap.enabled = hi;
    this.sun.castShadow = hi;
    const ms = hi ? 2048 : 512;
    if (this.sun.shadow.mapSize.x !== ms) {
      this.sun.shadow.mapSize.set(ms, ms);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    }
    this.maxParts = hi ? 700 : 220;
    for (const o of this.trackGroup.children) if (o.userData.detail) o.visible = hi;
    ANISO = hi ? 8 : 1;
    this.scene.traverse(o => {
      const m = o.material; if (!m || Array.isArray(m)) return;
      if (m.map && m.map.anisotropy !== ANISO) { m.map.anisotropy = ANISO; m.map.needsUpdate = true; }
      m.needsUpdate = true;
    });
    this.resize();
  }

  pixelRatio() { return Math.max(0.5, Math.min(devicePixelRatio || 1, this.quality === 'high' ? 2 : 1) * this.dyn); }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.camera.aspect = w / Math.max(1, h);
    // portrait phones: widen the view so the road still fits across the screen
    this.baseFov = this.camera.aspect < 0.8 ? 74 : this.camera.aspect < 1.2 ? 66 : 58;
    this.camera.updateProjectionMatrix();
    this.W = w; this.H = h;
  }
  _adapt() {
    const now = performance.now(), d = this.lastT ? now - this.lastT : 16; this.lastT = now;
    if (d > 500) return;
    this.ema += (d - this.ema) * 0.1;
    if (this.ema > 40) { this.slowFor += d; this.fastFor = 0; } else if (this.ema < 22) { this.fastFor += d; this.slowFor = 0; } else this.slowFor = this.fastFor = 0;
    let want = this.dyn;
    if (this.slowFor > 1500 && this.dyn > 0.5) want = Math.max(0.5, this.dyn * 0.8);
    if (this.fastFor > 4000 && this.dyn < 1) want = Math.min(1, this.dyn * 1.2);
    if (want !== this.dyn) { this.dyn = want; this.slowFor = this.fastFor = 0; this.resize(); }
  }

  /* ---------------- world helpers ---------------- */
  /** 3D position of track point (s, lat) */
  at(tr, s, lat, y = 0, out = new THREE.Vector3()) {
    const w = MK.worldOf(tr, s, lat);
    return out.set(w.x * U, y, w.y * U);
  }
  yawAt(tr, s) { const p = MK.trackAt(tr, s); return Math.atan2(p.tx, p.ty); }

  /** strip mesh following the track from lateral a to b (track units), for the whole loop or [s0, s1] */
  ribbon(tr, a, b, y, vLen, s0, s1, step) {
    const closed = s0 == null;
    step = step || MK.DS;
    const L = tr.len;
    if (closed) { s0 = 0; s1 = L; }
    const n = Math.max(2, Math.round((s1 - s0) / step));
    // stretch the texture a hair so the loop seam lands on a whole tile
    const vl = closed ? (L * U) / Math.max(1, Math.round((L * U) / vLen)) : vLen;
    const pos = [], uv = [], idx = [];
    const p = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      const s = s0 + (s1 - s0) * i / n;
      this.at(tr, s, a, y, p); pos.push(p.x, p.y, p.z);
      this.at(tr, s, b, y, p); pos.push(p.x, p.y, p.z);
      const v = (s - s0) * U / vl;
      uv.push(0, v, 1, v);
      if (i < n) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    // a strip wound the other way faces down: flip it
    if (g.attributes.normal.getY(0) < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.computeVertexNormals(); }
    return g;
  }
  /** vertical wall strip along lateral `lat`, h metres high */
  wall(tr, lat, h, vLen) {
    const L = tr.len, n = Math.round(L / MK.DS);
    const vl = (L * U) / Math.max(1, Math.round((L * U) / vLen));
    const pos = [], uv = [], idx = [], p = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      const s = L * i / n;
      this.at(tr, s, lat, 0, p); pos.push(p.x, 0, p.z, p.x, h, p.z);
      const u = s * U / vl; uv.push(u, 0, u, 1);
      if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  /** instanced static props: list of {x, z, yaw, s} */
  addProps(id, list, detail, tint) {
    const k = this.kinds.get(id); if (!k || !list.length) return;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (const part of k.parts) {
      let mat = part.m;
      if (tint) { mat = part.m.clone(); mat.color.multiply(new THREE.Color(tint)); mat.userData.rim = part.m.userData.rim; mat.onBeforeCompile = part.m.onBeforeCompile; mat.customProgramCacheKey = part.m.customProgramCacheKey; }
      const im = new THREE.InstancedMesh(part.g, mat, list.length);
      list.forEach((t, i) => {
        q.setFromAxisAngle(up, t.yaw || 0); sc.setScalar(t.s); pv.set(t.x, t.y || 0, t.z);
        m4.compose(pv, q, sc); im.setMatrixAt(i, m4);
      });
      im.computeBoundingSphere();
      im.castShadow = true; im.receiveShadow = true;
      im.userData.detail = !!detail; im.userData.dispose = !!tint;
      im.visible = this.quality === 'high' || !detail;
      this.trackGroup.add(im);
    }
  }

  clearTrack() {
    for (const o of this.trackGroup.children.slice()) {
      this.trackGroup.remove(o);
      if (o.isInstancedMesh) { o.dispose(); if (o.userData.dispose) o.material.dispose(); continue; }
      o.traverse(c => {
        if (c.geometry && !c.userData.shared) c.geometry.dispose();
        if (c.material && c.userData.ownMat) { if (c.material.map && c.userData.ownMap) c.material.map.dispose(); c.material.dispose(); }
      });
    }
  }

  /* ---------------- building a track ---------------- */
  buildTrack(idx) {
    const tr = MK.TRACKS[idx], th = THEMES[idx];
    this.clearTrack();
    this.builtFor = idx; this.theme = th;
    const R = MK.ROAD_HALF;
    // lights and sky
    this.skyU.top.value.set(th.skyTop); this.skyU.mid.value.set(th.skyMid); this.skyU.low.value.set(th.skyLow);
    this.sunDir = new THREE.Vector3(...th.sunDir).normalize();
    this.skyU.sunDir.value.copy(this.sunDir); this.skyU.sunCol.value.set(th.sun);
    this.scene.fog.color.set(th.fog);
    this.hemi.color.set(th.hemiSky); this.hemi.groundColor.set(th.hemiGround); this.hemi.intensity = th.hemiI;
    this.sun.color.set(th.sun); this.sun.intensity = th.sunI;

    const own = (mesh, detail) => { mesh.userData.ownMat = true; mesh.userData.detail = !!detail; mesh.receiveShadow = true; this.trackGroup.add(mesh); return mesh; };
    // bounds
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const p of tr.pts) { x0 = Math.min(x0, p.x * U); x1 = Math.max(x1, p.x * U); z0 = Math.min(z0, p.y * U); z1 = Math.max(z1, p.y * U); }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rad = Math.hypot(x1 - x0, z1 - z0) / 2;
    this.center = { x: cx, z: cz, r: rad };

    // ground
    const gImg = this.imgs[th.ground];
    const gTex = canvasTex(512, 512, (g, w, h) => { g.drawImage(gImg, 0, 0, w, h); g.globalCompositeOperation = 'multiply'; g.fillStyle = th.groundTint; g.fillRect(0, 0, w, h); }, true);
    const gs = rad * 2 + 900;
    gTex.repeat.set(gs / 9, gs / 9);
    const ground = own(new THREE.Mesh(new THREE.PlaneGeometry(gs, gs).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: gTex })));
    ground.position.set(cx, -0.02, cz); ground.userData.ownMap = true;

    // road, kerbs, run-off, wall
    own(new THREE.Mesh(this.ribbon(tr, -R, R, 0.02, 8.5), new THREE.MeshLambertMaterial({ map: this.roadTex })));
    const kerbM = new THREE.MeshLambertMaterial({ map: this.kerbTex });
    own(new THREE.Mesh(this.ribbon(tr, -R - 26, -R, 0.05, 3), kerbM));
    own(new THREE.Mesh(this.ribbon(tr, R, R + 26, 0.05, 3), kerbM.clone()));
    const wallTex = canvasTex(512, 64, (g, w, h) => {
      const sym = ['+', '−', '×', '÷', '=', '%', '+', '×'];
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? th.wallA : th.wallB; g.fillRect(i * w / 8, 0, w / 8 + 1, h);
        g.fillStyle = 'rgba(255,255,255,.95)'; g.font = 'bold 44px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(sym[i], i * w / 8 + w / 16, h / 2 + 2);
      }
      g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(0, 0, w, 5); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, h - 6, w, 6);
    }, true);
    const wallM = new THREE.MeshLambertMaterial({ map: wallTex, side: THREE.DoubleSide });
    const w1 = own(new THREE.Mesh(this.wall(tr, -R - 70, 1.0, 12), wallM)); w1.castShadow = true; w1.userData.ownMap = true;
    const w2 = own(new THREE.Mesh(this.wall(tr, R + 70, 1.0, 12), wallM.clone())); w2.castShadow = true;

    // start line and boost pads (decals just above the road)
    own(new THREE.Mesh(this.ribbon(tr, -R, R, 0.06, 1.1, 4, 26, 4), new THREE.MeshLambertMaterial({ map: this.checkTex, polygonOffset: true, polygonOffsetFactor: -1 })));
    this.padMat = new THREE.MeshBasicMaterial({ map: this.padTex, transparent: true, depthWrite: false, fog: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
    for (let s = MK.GATE_SPACING; s < tr.len - 80; s += MK.GATE_SPACING) {
      const m = own(new THREE.Mesh(this.ribbon(tr, -60, 60, 0.07, 1.15, s, s + 46, 4), this.padMat));
      m.userData.ownMat = false; m.receiveShadow = false;
    }

    // horizon hills: two jagged rings, coloured toward the fog so they sit in the distance
    this.trackGroup.add(this.hills(cx, cz, rad + 330, 70, th.hillA, 0.5, 11));
    this.trackGroup.add(this.hills(cx, cz, rad + 460, 110, th.hillB, 0.72, 23));

    // clouds (High only)
    const cm = new THREE.SpriteMaterial({ map: this.cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.9 });
    const rr = rng(idx * 97 + 5);
    for (let i = 0; i < 10; i++) {
      const a = rr() * Math.PI * 2, d = rad + 260 + rr() * 200;
      const sp = new THREE.Sprite(cm); sp.scale.set(120 + rr() * 80, 50 + rr() * 30, 1);
      sp.position.set(cx + Math.cos(a) * d, 110 + rr() * 90, cz + Math.sin(a) * d);
      sp.userData.detail = true; sp.userData.shared = true; sp.visible = this.quality === 'high';
      this.trackGroup.add(sp);
    }

    this._scenery(tr, th, idx);
    this.itemViews.forEach(v => this.dynGroup.remove(v.g));
    this.itemViews = [];
  }

  hills(cx, cz, r, hMax, col, fogMix, seed) {
    const rr = rng(seed), n = 96, pos = [], colr = [], idx = [];
    const base = new THREE.Color(col), fog = new THREE.Color(this.theme.fog), top = base.clone().lerp(fog, fogMix * 0.6), bot = base.clone().lerp(fog, fogMix);
    let h = hMax * 0.5;
    const hs = [];
    for (let i = 0; i < n; i++) { h = Math.max(hMax * 0.2, Math.min(hMax, h + (rr() - 0.5) * hMax * 0.45)); hs.push(h); }
    for (let i = 0; i <= n; i++) {
      const a = i / n * Math.PI * 2, hh = hs[i % n];
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      pos.push(x, -2, z, x, hh, z);
      colr.push(bot.r, bot.g, bot.b, top.r, top.g, top.b);
      if (i < n) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
    m.userData.ownMat = true; m.renderOrder = -5;
    return m;
  }

  /* trees, rocks, grandstands, gantry: placed once per track from a seeded random */
  _scenery(tr, th, idx) {
    const rr = rng(idx * 131 + 7);
    const R = MK.ROAD_HALF;
    const pts = tr.pts;
    const clear = (x, z, m) => {        // metres from the nearest centreline point
      let best = 1e9;
      for (let i = 0; i < pts.length; i += 2) { const dx = pts[i].x * U - x, dz = pts[i].y * U - z; const d = dx * dx + dz * dz; if (d < best) best = d; }
      return Math.sqrt(best) > m;
    };
    const lists = new Map(), add = (id, o, detail) => { const key = id + (detail ? '|d' : ''); if (!lists.has(key)) lists.set(key, []); lists.get(key).push(o); };
    const k = id => this.kinds.get(id);
    const put = (id, x, z, h, yaw, detail) => { const kk = k(id); if (!kk) return; add(id, { x, z, yaw, s: h / kk.h }, detail); };
    const tot = th.flora.reduce((a, f) => a + f[2], 0);
    const pickFlora = () => { let r = rr() * tot; for (const f of th.flora) { if ((r -= f[2]) <= 0) return f; } return th.flora[0]; };
    const p = new THREE.Vector3();
    // roadside flora in bands, denser near the road
    for (let s = 0; s < tr.len; s += 70) {
      for (const side of [-1, 1]) {
        const n = 1 + (rr() < 0.6 ? 1 : 0);
        for (let j = 0; j < n; j++) {
          const f = pickFlora();
          const off = R + 110 + rr() * (f[1] > 3 ? 520 : 260);
          this.at(tr, s + rr() * 60, side * off, 0, p);
          if (!clear(p.x, p.z, (R + 90) * U + f[1] * 0.25)) continue;
          put(f[0], p.x, p.z, f[1] * (0.8 + rr() * 0.45), rr() * 6.28, j > 0);
        }
      }
    }
    // far scatter: big pieces that fill the land between the road and the hills
    for (let i = 0; i < 110; i++) {
      const a = rr() * Math.PI * 2, d = this.center.r * (0.2 + rr() * 1.3) + 20;
      const x = this.center.x + Math.cos(a) * d, z = this.center.z + Math.sin(a) * d;
      const f = th.flora[rr() < 0.5 ? 0 : Math.floor(rr() * Math.min(3, th.flora.length))];
      if (!clear(x, z, (R + 140) * U + f[1] * 0.3)) continue;
      put(f[0], x, z, f[1] * (0.9 + rr() * 0.6), rr() * 6.28, true);
    }
    // the start straight: gantry over the line, grandstands, banner towers, flags, tents
    const yaw0 = this.yawAt(tr, 0);
    const gk = k('overheadLights');
    if (gk) {
      this.at(tr, -6, 0, 0, p);
      const sc = ((R * 2 + 90) * U) / gk.w;
      add('overheadLights', { x: p.x, z: p.z, yaw: yaw0, s: sc });
    }
    for (let i = 0; i < 3; i++) {
      for (const side of [-1, 1]) {
        const s = -260 + i * 300;
        this.at(tr, s, side * (R + 250), 0, p);
        if (!clear(p.x, p.z, (R + 150) * U)) continue;
        const id = side < 0 ? 'grandStandCovered' : (i === 1 ? 'grandStandCovered' : 'grandStand');
        const kk = k(id); if (!kk) continue;
        add(id, { x: p.x, z: p.z, yaw: this.yawAt(tr, s) + (side < 0 ? -Math.PI / 2 : Math.PI / 2), s: 14 / kk.w });
      }
    }
    const deco = [['bannerTowerRed', 7], ['bannerTowerGreen', 7], ['flagCheckers', 5], ['flagRed', 4.5], ['flagGreen', 4.5], ['lightPostLarge', 8], ['billboard', 7], ['tent', 4], ['tentLong', 4]];
    for (let s = 150; s < tr.len; s += 260 + rr() * 200) {
      const d = deco[Math.floor(rr() * deco.length)], side = rr() < 0.5 ? -1 : 1;
      this.at(tr, s, side * (R + 120 + rr() * 60), 0, p);
      if (!clear(p.x, p.z, (R + 95) * U)) continue;
      put(d[0], p.x, p.z, d[1], this.yawAt(tr, s) + (side < 0 ? -Math.PI / 2 : Math.PI / 2), d[0].startsWith('tent'));
    }
    for (const [key, list] of lists) {
      const [id, det] = key.split('|');
      this.addProps(id, list, !!det, /rock|cliff/.test(id) ? th.tintRock : null);
    }
  }

  /* ---------------- karts ---------------- */
  _buildKarts() {
    const ids = ['ooli', 'oodi', 'oopi', 'oobi'];   // YOU yellow, BLAZE red, TURBO teal, NOVA purple
    const wk = this.kinds.get('wheel');
    for (let i = 0; i < 4; i++) {
      const root = new THREE.Group(), tilt = new THREE.Group(), body = new THREE.Group();
      root.add(tilt); tilt.add(body);
      const mesh = (kind, parent) => {
        const k = this.kinds.get(kind); const g = new THREE.Group();
        if (!k) return g;
        for (const p of k.parts) {
          const m = new THREE.Mesh(p.g, p.m); m.castShadow = true; m.receiveShadow = true; g.add(m);
          const o = new THREE.Mesh(p.g, OUTLINE); o.userData.outline = true; g.add(o);
        }
        parent.add(g); return g;
      };
      mesh('kart-' + ids[i] + '-body', body);
      const ch = mesh('kart-' + ids[i] + '-char', body); ch.position.set(0, 0.306, -0.05);
      const wheels = [];
      for (const [x, z] of [[0.2774, 0.3237], [-0.2774, 0.3237], [0.2774, -0.3606], [-0.2774, -0.3606]]) {
        const piv = new THREE.Group(); piv.position.set(x, wk ? wk.h / 2 : 0.21, z); body.add(piv);
        const w = mesh('wheel', piv); if (x < 0) w.rotation.y = Math.PI;
        wheels.push({ piv, w, front: z > 0 });
      }
      body.scale.setScalar(KS);
      const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.6).rotateX(-Math.PI / 2), this.blobMat);
      blob.position.y = 0.06; blob.renderOrder = 1; root.add(blob);
      this.dynGroup.add(root);
      this.karts.push({ root, tilt, body, ch, wheels, roll: 0, sq: 0, sqV: 0, yawVis: 0, lastBoost: 0, lastSpin: 0, spinRot: 0, bob: 0 });
    }
  }

  /** place kart view i for kart state k */
  poseKart(i, k, dt, tr) {
    const v = this.karts[i];
    const pos = this.at(tr, k.s, k.lat, 0, v.root.position);
    const yaw = this.yawAt(tr, k.s);
    const sp = Math.max(1, k.speed);
    const slip = Math.atan2(k.latV || 0, sp) * 0.9;
    const spinning = k.spinT > 0;
    if (spinning) v.spinRot += dt * 13;
    else { v.spinRot = Math.atan2(Math.sin(v.spinRot), Math.cos(v.spinRot)); v.spinRot *= Math.pow(0.002, dt); }   // unwind the short way
    v.root.rotation.y = yaw + slip + v.spinRot + (spinning ? 0 : (k.driftA || 0) * 0.6);
    // lean into the turn, squash on boost, a hop on a spin-out
    const steer = MK.clamp((k.latV || 0) / 260, -1, 1);
    v.roll += ((-steer * 0.12) - v.roll) * Math.min(1, dt * 8);
    v.tilt.rotation.z = v.roll;
    if (k.boostT > 2.2 && v.lastBoost <= 0) { v.sqV += 5; }
    if (k.spinT > 1.4 && v.lastSpin <= 0) { v.sqV -= 6; }
    v.lastBoost = k.boostT > 0 ? k.boostT : 0; v.lastSpin = k.spinT > 0 ? k.spinT : 0;
    v.sqV += (-v.sq * 90 - v.sqV * 9) * dt; v.sq += v.sqV * dt;
    const sq = rm() ? 0 : MK.clamp(v.sq * 0.12, -0.2, 0.2);
    v.bob += dt * (6 + sp * 0.02);
    let hop = spinning && !rm() ? Math.abs(Math.sin(k.spinT * 6)) * 0.35 : 0;
    if (i === 0 && MK.G.phase === 'results' && !rm()) hop = Math.max(0, Math.sin(this.t * 5)) * 0.45;
    v.body.position.y = hop + Math.sin(v.bob) * 0.03 * Math.min(1, sp / 300);
    v.body.scale.set(KS * (1 - sq * 0.5), KS * (1 + sq), KS * (1 - sq * 0.5));
    v.ch.rotation.z = -steer * 0.18; v.ch.rotation.x = k.boostT > 0 ? -0.12 : 0;
    const roll = (sp * U * dt) / 0.21;
    for (const w of v.wheels) { w.w.rotation.x += roll; w.piv.rotation.y = w.front ? steer * 0.45 : 0; }
    return pos;
  }

  /* ---------------- particles: soft sprites (normal + additive) and confetti ---------------- */
  _particles() {
    const mk = (add) => {
      const N = 700, g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('col', new THREE.BufferAttribute(new Float32Array(N * 4), 4).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(N), 1).setUsage(THREE.DynamicDrawUsage));
      g.setDrawRange(0, 0);
      const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
        uniforms: { scale: { value: 400 }, map: { value: null } },
        vertexShader: 'attribute vec4 col; attribute float size; uniform float scale; varying vec4 vC; void main(){ vC = col; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(size * scale / -mv.z, 1.0, 90.0); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'varying vec4 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; float a = smoothstep(1.0, 0.15, r); if (a <= 0.01) discard; gl_FragColor = vec4(vC.rgb, vC.a * a); }',
      });
      const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 5;
      this.scene.add(pts);
      return { pts, list: [] };
    };
    this.pNorm = mk(false); this.pAdd = mk(true);
    // confetti: little flat cards
    const cg = new THREE.PlaneGeometry(0.28, 0.16);
    const cm = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    this.conf = new THREE.InstancedMesh(cg, cm, 500);
    this.conf.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(1500).fill(1), 3);
    this.conf.count = 0; this.conf.frustumCulled = false;
    this.scene.add(this.conf); this.confList = [];
    this.maxParts = 700;
  }
  /** soft particle: add = additive glow (flames, sparks), else normal (smoke, dust) */
  spark(add, x, y, z, vx, vy, vz, life, s0, s1, col, a, grav = 0, drag = 1) {
    const P = add ? this.pAdd : this.pNorm;
    if (P.list.length >= Math.min(700, this.maxParts)) return;
    const c = col.isColor ? col : new THREE.Color(col);
    P.list.push({ x, y, z, vx, vy, vz, t: 0, life, s0, s1, r: c.r, g: c.g, b: c.b, a, grav, drag });
  }
  confetti(x, y, z, n, colors, speed = 7) {
    for (let i = 0; i < n && this.confList.length < (this.quality === 'high' ? 500 : 160); i++) {
      const a = Math.random() * Math.PI * 2, sp = speed * (0.35 + Math.random() * 0.8);
      this.confList.push({ x, y, z, vx: Math.cos(a) * sp, vy: speed * (0.5 + Math.random() * 0.9), vz: Math.sin(a) * sp, t: 0, life: 1.4 + Math.random() * 0.9,
        rx: Math.random() * 6, ry: Math.random() * 6, wx: 4 + Math.random() * 8, wy: 3 + Math.random() * 6, c: new THREE.Color(colors[i % colors.length]) });
    }
  }
  _stepParticles(dt) {
    for (const P of [this.pNorm, this.pAdd]) {
      const pa = P.pts.geometry.attributes.position.array, ca = P.pts.geometry.attributes.col.array, sa = P.pts.geometry.attributes.size.array;
      let n = 0;
      for (let i = P.list.length - 1; i >= 0; i--) {
        const p = P.list[i]; p.t += dt;
        if (p.t >= p.life) { P.list[i] = P.list[P.list.length - 1]; P.list.pop(); continue; }
        p.vy -= p.grav * dt; const dr = Math.pow(p.drag, dt); p.vx *= dr; p.vy *= dr; p.vz *= dr;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const k = p.t / p.life;
        pa[n * 3] = p.x; pa[n * 3 + 1] = p.y; pa[n * 3 + 2] = p.z;
        ca[n * 4] = p.r; ca[n * 4 + 1] = p.g; ca[n * 4 + 2] = p.b; ca[n * 4 + 3] = p.a * (1 - k * k);
        sa[n] = p.s0 + (p.s1 - p.s0) * k;
        n++;
      }
      const g = P.pts.geometry; g.setDrawRange(0, n);
      g.attributes.position.needsUpdate = g.attributes.col.needsUpdate = g.attributes.size.needsUpdate = true;
      P.pts.material.uniforms.scale.value = this.H * this.renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
    }
    const im = this.conf, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    let n = 0;
    for (let i = this.confList.length - 1; i >= 0; i--) {
      const p = this.confList[i]; p.t += dt;
      if (p.t >= p.life) { this.confList[i] = this.confList[this.confList.length - 1]; this.confList.pop(); continue; }
      p.vy -= 9 * dt; const dr = Math.pow(0.35, dt); p.vx *= dr; p.vz *= dr; if (p.vy < -3) p.vy = -3;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.y < 0.05) { p.y = 0.05; p.vx = p.vz = 0; }
      p.rx += p.wx * dt; p.ry += p.wy * dt;
      q.setFromEuler(e.set(p.rx, p.ry, 0)); v.set(p.x, p.y, p.z);
      const s = 1 - Math.pow(p.t / p.life, 4);
      m4.compose(v, q, one.set(s, s, s)); im.setMatrixAt(n, m4); im.setColorAt(n, p.c); n++;
    }
    im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }

  /* ---------------- balloons ---------------- */
  balloonGeo() {
    if (this._bg) return this._bg;
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20, a = -Math.PI / 2 + t * Math.PI;           // bottom to top
      const r = Math.cos(a) * (1 - 0.18 * (1 - t) * (1 - t));      // narrower at the bottom
      pts.push(new THREE.Vector2(Math.max(0.001, r), Math.sin(a) * 1.15));
    }
    const body = new THREE.LatheGeometry(pts, 24);
    const knot = new THREE.CylinderGeometry(0.02, 0.13, 0.18, 10); knot.translate(0, -1.22, 0);
    this._bg = { body, knot };
    return this._bg;
  }
  labelTex(txt) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    const fs = txt.length > 3 ? 88 : txt.length > 2 ? 108 : 132;
    g.font = `${fs}px "Lilita One", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = 22; g.strokeStyle = 'rgba(20,14,48,.92)'; g.strokeText(txt, 128, 136);
    g.fillStyle = '#ffffff'; g.fillText(txt, 128, 136);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }
  makeBalloon(b) {
    const { body, knot } = this.balloonGeo();
    const g = new THREE.Group();
    const mat = toon({ color: new THREE.Color(b.col) }, 0.55);
    const m = new THREE.Mesh(body, mat); m.castShadow = true; g.add(m);
    const o = new THREE.Mesh(body, OUTLINE); o.scale.setScalar(1.035); g.add(o);
    g.add(new THREE.Mesh(knot, mat));
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, fog: false }));
    shine.position.set(-0.38, 0.52, 0.62); shine.scale.set(1, 1.5, 0.5); g.add(shine);
    const str = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.3, 0), new THREE.Vector3(0.08, -2.0, 0), new THREE.Vector3(-0.05, -2.6, 0)]),
      new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 }));
    g.add(str);
    const tex = this.labelTex(b.txt);
    const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, fog: false }));
    lab.scale.set(2.7, 2.7, 1); lab.renderOrder = 6; g.add(lab);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2).rotateX(-Math.PI / 2), this.blobMat);
    this.dynGroup.add(g, blob);
    return { g, lab, tex, mat, blob, shine, str, born: this.t, b, wob: Math.random() * 6 };
  }
  dropBalloon(v) {
    this.dynGroup.remove(v.g, v.blob);
    v.tex.dispose(); v.lab.material.dispose(); v.mat.dispose(); v.blob.geometry.dispose();
    v.shine.geometry.dispose(); v.shine.material.dispose(); v.str.geometry.dispose(); v.str.material.dispose();
  }
  _stepBalloons(dt, tr) {
    const cur = (MK.G.question && MK.G.qBalloons) || [];
    const seen = new Set(cur);
    for (const b of cur) if (!this.balloons.has(b)) this.balloons.set(b, this.makeBalloon(b));
    for (const [b, v] of this.balloons) {
      if (seen.has(b)) continue;
      this.balloons.delete(b);
      if (b === this.popped) {           // driven through: pop in a burst of its colour
        const p = v.g.position;
        const col = new THREE.Color(b.col);
        for (let i = 0; i < (this.quality === 'high' ? 26 : 10); i++) {
          const a = Math.random() * 6.28, e = Math.random() * 2 - 1, sp = 4 + Math.random() * 6;
          this.spark(false, p.x, p.y, p.z, Math.cos(a) * sp, e * sp, Math.sin(a) * sp, 0.5, 0.5, 0.15, col, 1, 4, 0.2);
        }
        this.confetti(p.x, p.y, p.z, b.ok ? 36 : 10, b.ok ? ['#ffd257', '#5ee0a0', '#ffffff', b.col] : [b.col, '#ffffff']);
        this.dropBalloon(v);
      } else { v.leave = 0; this.leaving.push(v); }   // the rest drift up and away
    }
    const P = new THREE.Vector3();
    for (const v of this.balloons.values()) {
      const b = v.b;
      this.at(tr, b.s, b.lat, 0, P);
      const age = this.t - v.born, pop = Math.min(1, age / 0.35);
      const sc = rm() ? 1 : 1 + Math.sin(pop * Math.PI) * 0.25 * (1 - pop) + (pop < 1 ? pop - 1 : 0);
      const bob = rm() ? 0 : Math.sin(this.t * 2.4 + v.wob) * 0.18;
      v.g.position.set(P.x, 3.1 + bob, P.z);
      v.g.scale.setScalar(Math.max(0.05, sc) * 1.05);
      v.g.rotation.z = rm() ? 0 : Math.sin(this.t * 1.7 + v.wob) * 0.08;
      v.blob.position.set(P.x, 0.08, P.z);
      // the label faces the camera from just in front of the balloon
      v.lab.position.set(0, 0.05, 0);
      const toCam = this.camera.position.clone().sub(v.g.position).setY(0).normalize().multiplyScalar(1.25);
      v.lab.position.x = toCam.x; v.lab.position.z = toCam.z;
      v.g.rotation.y = 0;
    }
    for (let i = this.leaving.length - 1; i >= 0; i--) {
      const v = this.leaving[i]; v.leave += dt;
      v.g.position.y += dt * (4 + v.leave * 8);
      v.g.scale.multiplyScalar(Math.pow(0.25, dt));
      if (v.leave > 0.9) { this.dropBalloon(v); this.leaving.splice(i, 1); }
    }
  }

  /* ---------------- item boxes ---------------- */
  itemIconTex(kind) {
    const key = '_icon' + kind; if (this[key]) return this[key];
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.translate(64, 64); g.lineJoin = 'round'; g.lineWidth = 10; g.strokeStyle = '#1b1440';
    if (kind === 'shield') {
      g.beginPath(); g.moveTo(0, -46); g.lineTo(38, -30); g.quadraticCurveTo(38, 22, 0, 48); g.quadraticCurveTo(-38, 22, -38, -30); g.closePath();
      g.fillStyle = '#5ee0a0'; g.fill(); g.stroke();
      g.beginPath(); g.moveTo(0, -30); g.lineTo(22, -20); g.quadraticCurveTo(22, 12, 0, 30); g.closePath(); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill();
    } else {
      g.beginPath(); g.moveTo(0, -48); g.bezierCurveTo(26, -14, 36, 4, 36, 18); g.arc(0, 18, 36, 0, Math.PI); g.bezierCurveTo(-36, 4, -26, -14, 0, -48);
      g.fillStyle = '#2b2440'; g.fill(); g.strokeStyle = '#ffb14a'; g.stroke();
      g.beginPath(); g.ellipse(-12, 14, 8, 14, -0.4, 0, 7); g.fillStyle = 'rgba(180,140,255,.8)'; g.fill();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return (this[key] = t);
  }
  roundedBox(r = 0.18) {
    if (this._rb) return this._rb;
    const g = new THREE.BoxGeometry(1, 1, 1, 5, 5, 5), p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
    const h = 0.5 - r;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      c.set(MK.clamp(v.x, -h, h), MK.clamp(v.y, -h, h), MK.clamp(v.z, -h, h));
      v.sub(c); if (v.lengthSq() > 0) v.normalize().multiplyScalar(r); v.add(c);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return (this._rb = g);
  }
  _stepItems(dt, tr) {
    const items = MK.G.items || [];
    if (this.itemViews.length !== items.length || this.itemViews.some((v, i) => v.it !== items[i])) {
      this.itemViews.forEach(v => { this.dynGroup.remove(v.g); v.boxMat.dispose(); v.iconMat.dispose(); });
      this.itemViews = items.map(it => {
        const g = new THREE.Group();
        const boxMat = new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, uniforms: { t: { value: 0 } },
          vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }',
          fragmentShader: 'uniform float t; varying vec3 vN; varying vec3 vV; varying vec3 vP; vec3 hue(float h){ return clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); } void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); vec3 c = hue(fract(t*0.25 + vP.y*0.6 + vP.x*0.3)); c = mix(vec3(1.0), c, 0.75); float a = 0.28 + pow(f, 1.6) * 0.7; gl_FragColor = vec4(c + pow(f,4.0)*0.6, a); }',
        });
        const box = new THREE.Mesh(this.roundedBox(), boxMat); box.scale.setScalar(1.9); box.userData.shared = true;
        const iconMat = new THREE.SpriteMaterial({ map: this.itemIconTex(it.kind), depthWrite: false, fog: false });
        const icon = new THREE.Sprite(iconMat); icon.scale.set(1.35, 1.35, 1);
        g.add(icon, box);
        const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2).rotateX(-Math.PI / 2), this.blobMat); blob.userData.shared = false;
        const holder = new THREE.Group(); holder.add(g); holder.add(blob);
        this.dynGroup.add(holder);
        return { it, g: holder, spin: g, box, boxMat, iconMat, blob, taken: it.taken, grow: 1 };
      });
    }
    const P = new THREE.Vector3();
    for (const v of this.itemViews) {
      const it = v.it;
      if (it.taken && !v.taken) {         // picked up: sparkle burst
        const p = v.spin.getWorldPosition(new THREE.Vector3());
        for (let i = 0; i < (this.quality === 'high' ? 24 : 10); i++) { const a = Math.random() * 6.28, sp = 3 + Math.random() * 5; this.spark(true, p.x, p.y, p.z, Math.cos(a) * sp, Math.random() * 5, Math.sin(a) * sp, 0.6, 0.6, 0.1, it.kind === 'shield' ? '#7dffc0' : '#ffc070', 1, 6, 0.3); }
        v.grow = 0;
      }
      v.taken = it.taken;
      v.g.visible = !it.taken;
      if (it.taken) continue;
      v.grow = Math.min(1, v.grow + dt * 2.5);
      this.at(tr, it.s, it.lat, 0, P);
      v.g.position.copy(P);
      v.spin.position.y = 1.7 + (rm() ? 0 : Math.sin(this.t * 2.5 + it.s) * 0.2);
      v.box.rotation.set(this.t * 0.7, this.t * 1.1, 0);
      v.spin.scale.setScalar(v.grow);
      v.boxMat.uniforms.t.value = this.t;
    }
  }

  /* ---------------- camera ---------------- */
  _camera(dt, pp, tr) {
    const G = MK.G, pl = MK.player, cam = this.camera;
    const want = new THREE.Vector3(), look = new THREE.Vector3();
    const reduce = rm();
    if (G.phase === 'menu') {
      // hover over the road in front of the grid, drifting from side to side, looking back at the karts
      const a = this.t * 0.22 * (reduce ? 0.3 : 1);
      const c = this.at(tr, 150 + Math.sin(a * 0.7) * 40, Math.sin(a) * 110, 0), l = this.at(tr, -70, Math.sin(a) * 30, 0);
      want.set(c.x, 3.2 + Math.sin(a * 0.5) * 0.8, c.z); look.set(l.x, 1.2, l.z);
      this.camInit = false;
      cam.position.copy(want); cam.lookAt(look);
    } else if (G.phase === 'results') {
      // victory shot: in front of the kart, over the road, swaying gently
      const a = this.t * 0.4 * (reduce ? 0.3 : 1), pl2 = MK.player;
      const c = this.at(tr, pl2.s + 170, pl2.lat * 0.5 + Math.sin(a) * 70, 0);
      const pt = cam.aspect < 0.8;   // phones: the card covers the bottom, so frame the kart high
      want.set(c.x, (pt ? 3.4 : 2.6) + Math.sin(a * 0.6) * 0.4, c.z); look.set(pp.x, pt ? -2.2 : 1.7, pp.z);
      if (this.lastPhase !== 'results') this.camPos.copy(want); else this.camPos.lerp(want, 1 - Math.pow(0.02, dt));
      cam.position.copy(this.camPos); cam.lookAt(look);
    } else {
      const ca = G.camAng;                              // eased heading from the game (looks 6 m ahead)
      const fx = Math.cos(ca), fz = Math.sin(ca);
      const portrait = cam.aspect < 0.8;                // phones: sit further back so the road reads
      const B0 = portrait ? 11 : 8.2, U0 = portrait ? 4.8 : 3.6;
      let back = B0, up = U0;
      // countdown: swing round from in front of the kart to behind it
      let swing = 0;
      if (G.phase === 'countdown' && !reduce && !portrait) swing = Math.PI * Math.pow(1 - Math.min(1, G.t / 2.0), 2);
      const sw = Math.sin(swing) * 0.4;   // stay inside the road: the gantry legs and grandstands are beside it
      const bx = -fx * Math.cos(swing) + fz * sw, bz = -fz * Math.cos(swing) - fx * sw;
      // the swing passes over the kart's roof, not out through the grandstands
      if (swing) { up = U0 + 1.4 * Math.sin(swing) - 1.2 * Math.pow(swing / Math.PI, 2); }
      if (G.phase === 'countdown') up += 2.4;   // lifted over the rivals on the grid
      want.set(pp.x + bx * back, up, pp.z + bz * back);
      const la = (portrait ? 7 : 4) * Math.cos(swing / 2);   // during the swing, look at the driver
      look.set(pp.x + fx * la, portrait ? 1.1 : 1.5 + 0.6 * Math.sin(swing / 2), pp.z + fz * la);
      if (!this.camInit || G.phase === 'countdown') { this.camPos.copy(want); this.camInit = true; }
      else this.camPos.lerp(want, 1 - Math.pow(0.0005, dt));
      cam.position.copy(this.camPos);
      if (this.shake > 0 && !reduce) { cam.position.x += (Math.random() - 0.5) * this.shake; cam.position.y += (Math.random() - 0.5) * this.shake * 0.6; }
      cam.lookAt(look);
    }
    this.lastPhase = G.phase;
    // wide screens: the menu card sits left and the results card right, so slide the picture the other way
    const off = cam.aspect > 1.2 ? (G.phase === 'menu' ? -0.2 : G.phase === 'results' ? 0.2 : 0) : 0;
    if (off !== this.viewOff || (off && (cam.view && cam.view.fullWidth !== this.W))) {
      this.viewOff = off;
      if (off) cam.setViewOffset(this.W, this.H, this.W * off, 0, this.W, this.H); else cam.clearViewOffset();
    }
    this.shake = Math.max(0, this.shake - dt * 1.8);
    const boost = pl.boostT > 0 && G.phase === 'playing' && !reduce;
    const tf = this.baseFov + (boost ? 12 : 0) + (reduce ? 0 : Math.min(4, pl.speed * 0.01));
    this.fov += (tf - this.fov) * Math.min(1, dt * 4);
    if (Math.abs(cam.fov - this.fov) > 0.01) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
    this.sky.position.copy(cam.position);
    // tight shadow box round the player, snapped to texels so it does not shimmer
    const ext = 34, sh = this.sun.shadow.camera;
    sh.left = -ext; sh.right = ext; sh.top = ext; sh.bottom = -ext; sh.near = 1; sh.far = 260; sh.updateProjectionMatrix();
    const texel = (2 * ext) / this.sun.shadow.mapSize.x;
    const fx0 = pp.x + Math.cos(G.camAng) * 12, fz0 = pp.z + Math.sin(G.camAng) * 12;
    const sx = Math.round(fx0 / texel) * texel, sz = Math.round(fz0 / texel) * texel;
    this.sun.target.position.set(sx, 0, sz);
    this.sun.position.set(sx + this.sunDir.x * 120, this.sunDir.y * 120, sz + this.sunDir.z * 120);
  }

  /** screen position (CSS px) of a world point, or null when behind the camera */
  project(v) {
    const p = v.clone().project(this.camera);
    if (p.z > 1 || p.z < -1) return null;
    return { x: (p.x + 1) / 2 * this.W, y: (1 - p.y) / 2 * this.H };
  }

  /* ---------------- one frame ---------------- */
  frame(dt) {
    if (!this.ready) return;
    this._adapt();
    this.t += dt;
    const G = MK.G, pl = MK.player, ais = MK.getAis();
    if (this.builtFor !== G.trackIdx) { this.buildTrack(G.trackIdx); this.camInit = false; }
    const tr = G.tr;
    // karts: on the menu they sit on the grid; in a race they follow the simulation
    let pp;
    if (G.phase === 'menu') {
      const grid = [{ s: 0, lat: 0 }, { s: -40, lat: -70 }, { s: -95, lat: 0 }, { s: -150, lat: 70 }];
      grid.forEach((g, i) => this.poseKart(i, { s: g.s, lat: g.lat, latV: 0, speed: 0, spinT: 0, boostT: 0, driftA: 0 }, dt, tr));
      pp = this.karts[0].root.position;
    } else {
      pp = this.poseKart(0, pl, dt, tr).clone();
      ais.forEach((a, i) => this.poseKart(i + 1, a, dt, tr));
    }
    for (const k of this.karts) k.root.visible = true;
    // events from the race
    for (const e of MK.fxDrain()) this.onFx(e, pp, tr);
    // continuous effects: boost flames, drift smoke, dust
    const hi = this.quality === 'high';
    if (G.phase === 'playing') {
      const all = [pl].concat(ais);
      all.forEach((k, i) => {
        const v = this.karts[i], yaw = v.root.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw);
        const rx = Math.cos(yaw), rz = -Math.sin(yaw);
        const base = v.root.position;
        if (k.boostT > 0 && Math.random() < (hi ? 1 : 0.5)) {
          for (const side of [-0.35, 0.35]) {
            const x = base.x - fx * 1.7 + rx * side, z = base.z - fz * 1.7 + rz * side;
            this.spark(true, x, 0.85, z, -fx * 6 + (Math.random() - 0.5), 0.6 + Math.random(), -fz * 6 + (Math.random() - 0.5), 0.28, 0.9, 0.2, Math.random() < 0.5 ? '#ffb030' : '#ff5a20', 0.95);
          }
        }
        const steer = Math.abs(k.latV || 0);
        if (i === 0 && ((steer > 150 && k.speed > 200) || k.spinT > 0) && Math.random() < (hi ? 0.8 : 0.3)) {
          for (const side of [-0.8, 0.8]) {
            const x = base.x - fx * 1.2 + rx * side, z = base.z - fz * 1.2 + rz * side;
            this.spark(false, x, 0.3, z, (Math.random() - 0.5) * 1.5, 0.8 + Math.random(), (Math.random() - 0.5) * 1.5, 0.7, 0.6, 1.8, '#f4efe8', 0.55);
          }
          if (k.spinT <= 0 && hi && Math.random() < 0.5) {       // drift sparks, blue then orange
            const x = base.x - fx * 1.2 + rx * (k.latV > 0 ? -0.8 : 0.8), z = base.z - fz * 1.2 + rz * (k.latV > 0 ? -0.8 : 0.8);
            this.spark(true, x, 0.25, z, (Math.random() - 0.5) * 4, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 4, 0.3, 0.3, 0.05, steer > 220 ? '#ffa040' : '#6fc8ff', 1, 12);
          }
        }
      });
    }
    this._stepBalloons(dt, tr);
    this._stepItems(dt, tr);
    // boost pads scroll; pads pulse
    if (this.padTex) this.padTex.offset.y = rm() ? 0 : -(this.t * 1.6 % 1);
    if (this.padMat) this.padMat.opacity = rm() ? 0.9 : 0.75 + 0.25 * Math.sin(this.t * 6);
    this._camera(dt, pp, tr);
    this._stepParticles(dt);
    // on a device that cannot keep up even at the lowest resolution, draw every other frame
    if (this.dyn <= 0.5 && this.ema > 120) { this.odd = !this.odd; if (this.odd) return; }
    this.renderer.render(this.scene, this.camera);
  }

  onFx(e, pp, tr) {
    const G = MK.G;
    if (e.type === 'good') {
      this.popped = e.b;
      const v = this.karts[0].root.position;
      for (let i = 0; i < (this.quality === 'high' ? 30 : 12); i++) { const a = Math.random() * 6.28, sp = 2 + Math.random() * 4; this.spark(true, v.x, 1.4, v.z, Math.cos(a) * sp, 2 + Math.random() * 4, Math.sin(a) * sp, 0.7, 0.7, 0.1, '#7dffc0', 1, 5, 0.4); }
    } else if (e.type === 'bad') {
      this.popped = e.b; this.shake = 0.5;
      const v = this.karts[0].root.position;
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; this.spark(true, v.x + Math.cos(a) * 1.2, 3.2, v.z + Math.sin(a) * 1.2, 0, 0.3, 0, 1.3, 0.8, 0.5, '#ffe45a', 1); }
    } else if (e.type === 'finish') {
      const v = this.karts[0].root.position;
      this.confetti(v.x, 4, v.z, this.quality === 'high' ? 160 : 60, ['#ffd257', '#5ee0a0', '#ff6b8a', '#6fb2ff', '#ffffff'], 9);
    } else if (e.type === 'lap') {
      const v = this.karts[0].root.position;
      this.confetti(v.x, 3, v.z, this.quality === 'high' ? 50 : 20, ['#ffd257', '#ffffff', '#5ee0a0'], 6);
    }
    void G; void pp; void tr;
  }
}

/* ───────────── boot ───────────── */
async function boot() {
  const canvas = document.getElementById('cv');
  let q = MK.gfxPref();
  if (!q) q = softwareGL() ? 'low' : 'high';     // no saved choice: CPU WebGL starts on Low
  MK.setGfx(q, false);
  const st = new KartStage(canvas, q);
  st.setQuality(q);
  window.K3 = st;
  addEventListener('resize', () => st.resize());
  try { await document.fonts.load('40px "Lilita One"'); } catch (e) { /* the label falls back to system-ui */ }
  await st.load();
  st.setQuality(st.quality);
  MK.onReady();
}
boot().catch(err => { console.warn('3D stage failed to start', err); MK.onFail(String(err && err.message || err)); });

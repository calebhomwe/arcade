// Sky dome, clouds, stars, and the day/night + season palette that every material reads.
import * as THREE from 'three';
import { SU, SKY_VERT, SKY_FRAG } from './shaders.js';
import { lerp, smooth, clamp, rng } from '../util.js';

const C = (h) => new THREE.Color(h);
// time of day keyframes; phase 0 = midnight, .25 sunrise, .5 noon, .75 sunset
const KEYS = [
  { p: 0.00, top: C(0x0b1236), mid: C(0x17265a), hor: C(0x2c3d78), sun: C(0x5c72b8), ambSky: C(0x3a4c96), ambGround: C(0x262c50), fog: C(0x2a3a72), night: 1, sunI: 0.35 },
  { p: 0.19, top: C(0x1c2c66), mid: C(0x4d4a8c), hor: C(0xc07a80), sun: C(0xffa070), ambSky: C(0x6a6aa6), ambGround: C(0x4a3c48), fog: C(0xb08090), night: 0.55, sunI: 0.6 },
  { p: 0.27, top: C(0x4a86d6), mid: C(0xf4b892), hor: C(0xffcf98), sun: C(0xffc088), ambSky: C(0x86a6d8), ambGround: C(0x8a6a50), fog: C(0xf6d0a8), night: 0.08, sunI: 1.0 },
  { p: 0.37, top: C(0x3d94ec), mid: C(0x8ccbf6), hor: C(0xd6eeff), sun: C(0xffe6bc), ambSky: C(0x8db8f0), ambGround: C(0x7f9a5a), fog: C(0xcfe8fa), night: 0, sunI: 1.05 },
  { p: 0.50, top: C(0x2f86e4), mid: C(0x7ec4f6), hor: C(0xd2ecff), sun: C(0xfff4dc), ambSky: C(0x8dbbf5), ambGround: C(0x85a15e), fog: C(0xcde7fb), night: 0, sunI: 1.1 },
  { p: 0.64, top: C(0x3a86dc), mid: C(0x8ec6f0), hor: C(0xf0e6c4), sun: C(0xffdca0), ambSky: C(0x94b6e6), ambGround: C(0x9a9058), fog: C(0xecdfc0), night: 0, sunI: 1.05 },
  { p: 0.73, top: C(0x4a80d0), mid: C(0xd6b48e), hor: C(0xffd39a), sun: C(0xffc078), ambSky: C(0xa6b0d6), ambGround: C(0xa07c50), fog: C(0xf7d2a2), night: 0.05, sunI: 1.0 },
  { p: 0.80, top: C(0x34509e), mid: C(0xd88aa2), hor: C(0xffa864), sun: C(0xff9a58), ambSky: C(0x8a86c0), ambGround: C(0x84604a), fog: C(0xf2a877), night: 0.25, sunI: 0.85 },
  { p: 0.88, top: C(0x1c2a68), mid: C(0x5a4a90), hor: C(0xd0687a), sun: C(0xd07a90), ambSky: C(0x5a5a9c), ambGround: C(0x3c3450), fog: C(0x8a5f88), night: 0.7, sunI: 0.5 },
  { p: 1.00, top: C(0x0b1236), mid: C(0x17265a), hor: C(0x2c3d78), sun: C(0x5c72b8), ambSky: C(0x3a4c96), ambGround: C(0x262c50), fog: C(0x2a3a72), night: 1, sunI: 0.35 },
];
const tmp = new THREE.Color();
function mixKeys(p) {
  let a = KEYS[0], b = KEYS[1];
  for (let i = 0; i < KEYS.length - 1; i++) if (p >= KEYS[i].p && p <= KEYS[i + 1].p) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  const t = smooth((p - a.p) / Math.max(1e-4, b.p - a.p));
  const out = {};
  for (const k of ['top', 'mid', 'hor', 'sun', 'ambSky', 'ambGround', 'fog']) out[k] = a[k].clone().lerp(b[k], t);
  out.night = lerp(a.night, b.night, t); out.sunI = lerp(a.sunI, b.sunI, t);
  return out;
}

// season palettes: grass A/B, foliage multiplier, snow
export const SEASONS = {
  spring: { a: C(0x66c43a), b: C(0x3fa83a), foliage: C(0xfff2f6), snow: 0, name: 'Spring' },
  summer: { a: C(0x5cbf2c), b: C(0x2f9a2e), foliage: C(0xffffff), snow: 0, name: 'Summer' },
  autumn: { a: C(0x9fb830), b: C(0xc48a2a), foliage: C(0xffb060), snow: 0, name: 'Autumn' },
  winter: { a: C(0xb8d6c0), b: C(0x9cc0b0), foliage: C(0xcfe0e8), snow: 1, name: 'Winter' },
};

function makeCloudTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  const r = rng(11);
  const blobs = [[0.5, 0.6, 0.30], [0.3, 0.68, 0.22], [0.7, 0.68, 0.24], [0.42, 0.45, 0.2], [0.6, 0.42, 0.22], [0.2, 0.78, 0.14], [0.82, 0.78, 0.15]];
  for (const pass of [0, 1]) for (const [x, y, rad] of blobs) {
    const px = x * 256, py = y * 128 - (pass ? 5 : 0), R = rad * 128 * 1.3;
    const gr = g.createRadialGradient(px, py, R * 0.1, px, py, R);
    if (pass === 0) { gr.addColorStop(0, 'rgba(170,190,225,0.95)'); gr.addColorStop(0.7, 'rgba(170,190,225,0.6)'); gr.addColorStop(1, 'rgba(170,190,225,0)'); }
    else { gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.65, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
    g.fillStyle = gr; g.beginPath(); g.arc(px, py, R, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
}

function makeStarTexture() {
  const s = 128, d = new Uint8Array(s * s), r = rng(5);
  for (let i = 0; i < 90; i++) d[Math.floor(r() * s * s)] = 255;
  for (let i = 0; i < 260; i++) d[Math.floor(r() * s * s)] = 200 + r() * 55;
  const t = new THREE.DataTexture(d, s, s, THREE.RedFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.phase = 0.36;             // 0..1 time of day
    this.season = 'spring';
    this.rate = 1 / 900;           // one full day per 15 minutes of play
    this.frozen = false;
    const geo = new THREE.SphereGeometry(500, 24, 12);
    const uni = { uSkyTop: { value: new THREE.Color() }, uSkyMid: { value: new THREE.Color() }, uSkyHor: { value: new THREE.Color() }, uSunDir: SU.uSunDir, uSunCol: SU.uSunCol, uNight: SU.uNight, uTime: SU.uTime, uStars: { value: makeStarTexture() } };
    this.dome = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: uni, side: THREE.BackSide, depthWrite: false, depthTest: false }));
    this.dome.frustumCulled = false; this.dome.renderOrder = -100; scene.add(this.dome);
    this.uni = uni;
    // clouds: instanced camera-facing quads
    const n = 12, quad = new THREE.PlaneGeometry(1, 0.5);
    const ig = new THREE.InstancedBufferGeometry(); ig.index = quad.index; ig.setAttribute('position', quad.attributes.position); ig.setAttribute('uv', quad.attributes.uv);
    const data = new Float32Array(n * 4), r = rng(21);
    this.cloudData = [];
    for (let i = 0; i < n; i++) { const ang = r() * Math.PI * 2, rad = 170 + r() * 240; this.cloudData.push({ ang, rad, y: 60 + r() * 60, s: 70 + r() * 90, sp: 0.0006 + r() * 0.0009 }); }
    this.cloudAttr = new THREE.InstancedBufferAttribute(data, 4); this.cloudAttr.setUsage(THREE.DynamicDrawUsage);
    ig.setAttribute('aC', this.cloudAttr); ig.instanceCount = n;
    const cmat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { map: { value: makeCloudTexture() }, uSunCol: SU.uSunCol, uAmbSky: SU.uAmbSky, uFogCol: SU.uFogCol, uCamPos: SU.uCamPos, uNight: SU.uNight, uCover: { value: 1 } },
      vertexShader: `attribute vec4 aC; uniform vec3 uCamPos; varying vec2 vUv; varying float vD;
        void main(){ vec3 c = vec3(aC.x, aC.y, aC.z); vec3 toC = normalize(vec3(uCamPos.x - c.x, 0.0, uCamPos.z - c.z) + 1e-4); vec3 right = vec3(toC.z, 0.0, -toC.x);
          vec3 wp = c + right * position.x * aC.w + vec3(0.0, position.y * aC.w, 0.0); vUv = uv; vD = length(c.xz - uCamPos.xz);
          vec4 p = projectionMatrix * viewMatrix * vec4(wp, 1.0); gl_Position = p; }`,
      fragmentShader: `uniform sampler2D map; uniform vec3 uSunCol; uniform vec3 uAmbSky; uniform vec3 uFogCol; uniform float uNight; uniform float uCover; varying vec2 vUv; varying float vD;
        void main(){ vec4 t = texture2D(map, vUv); vec3 c = t.rgb * (uAmbSky * 0.55 + uSunCol * 0.62 + 0.25); c = mix(c, uFogCol, 0.25); c *= mix(1.0, 0.35, uNight);
          gl_FragColor = vec4(c, t.a * 0.92 * uCover * smoothstep(650.0, 420.0, vD));
          #include <colorspace_fragment>
        }`,
    });
    this.clouds = new THREE.Mesh(ig, cmat); this.clouds.frustumCulled = false; this.clouds.renderOrder = -90; scene.add(this.clouds);
    this.setSeason('spring');
    this.update(0);
  }

  setSeason(name) {
    this.season = name;
    const s = SEASONS[name];
    SU.uGrassA.value.copy(s.a); SU.uGrassB.value.copy(s.b); SU.uFoliage.value.copy(s.foliage); SU.uSnow.value = s.snow;
  }
  setCover(v) { this.clouds.material.uniforms.uCover.value = v; }

  update(dt, camYaw = 0) {
    if (!this.frozen) this.phase = (this.phase + dt * this.rate) % 1;
    const k = mixKeys(this.phase);
    this.uni.uSkyTop.value.copy(k.top); this.uni.uSkyMid.value.copy(k.mid); this.uni.uSkyHor.value.copy(k.hor);
    SU.uSunCol.value.copy(k.sun).multiplyScalar(k.sunI);
    SU.uAmbSky.value.copy(k.ambSky).multiplyScalar(0.62); SU.uAmbGround.value.copy(k.ambGround).multiplyScalar(0.58);
    SU.uFogCol.value.copy(k.fog);
    SU.uNight.value = k.night;
    // sun path: east at sunrise, south at noon, west at sunset. At night the moon takes over, high and to the left.
    const day = clamp((this.phase - 0.22) / 0.56, 0, 1);
    const isDay = this.phase > 0.2 && this.phase < 0.8;
    const az = isDay ? (90 + 180 * day) * Math.PI / 180 : (250 * Math.PI / 180);
    const el = isDay ? (12 + 52 * Math.sin(Math.PI * day)) * Math.PI / 180 : 48 * Math.PI / 180;
    SU.uSunDir.value.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    SU.uRimCol.value.copy(k.sun).lerp(new THREE.Color(1, 1, 1), 0.35);
    // clouds drift
    const d = this.cloudAttr.array;
    for (let i = 0; i < this.cloudData.length; i++) {
      const c = this.cloudData[i]; c.ang += c.sp * dt * 8;
      d[i * 4] = Math.cos(c.ang) * c.rad; d[i * 4 + 1] = c.y; d[i * 4 + 2] = Math.sin(c.ang) * c.rad; d[i * 4 + 3] = c.s;
    }
    this.cloudAttr.needsUpdate = true;
    this.dome.position.set(0, 0, 0);
  }

  // the colour the sky is at the horizon (also what fog uses)
  horizon() { return SU.uFogCol.value; }
}

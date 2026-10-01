// The far scenery: a ring of painted mountains, the waterfall that feeds the stream, and a small
// city across the bay (one merged mesh each, so they cost three draw calls in total).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { farmMaterial, SU } from './shaders.js';
import { rng, fbm, clamp, lerp, smooth } from '../util.js';
import { heightAt } from './terrain.js';

const col = (h) => new THREE.Color(h);

function mountain(cx, cz, radius, height, seed, lowY = -2) {
  const r = rng(seed);
  const g = new THREE.ConeGeometry(radius, height, 18, 9, true);
  const p = g.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const forestLo = col(0x2e7a3e), forestHi = col(0x5aa14d), rock = col(0x8d8478), rockDk = col(0x6b6559), snow = col(0xf4f8ff), shade = col(0xc7d6ea);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (y + height / 2) / height;             // 0 base .. 1 tip
    const ang = Math.atan2(z, x);
    const rid = Math.abs(Math.sin(ang * 3 + seed) * 0.5 + Math.sin(ang * 7 + seed * 2) * 0.25);
    const n = fbm(x * 0.05 + seed, z * 0.05, 3);
    const k = 1 + (n - 0.5) * 0.55 + rid * 0.18 * (1 - t);
    x *= k; z *= k; y += (n - 0.5) * height * 0.08 * (1 - t);
    p.setXYZ(i, x, y, z);
    const snowLine = 0.6 + (n - 0.5) * 0.18;
    if (t > snowLine) c.copy(snow).lerp(shade, clamp((n - 0.5) * 1.6 + (1 - (t - snowLine) / (1 - snowLine)) * 0.35, 0, 1) * 0.6);
    else if (t > snowLine - 0.24) c.copy(rock).lerp(rockDk, clamp(n * 1.4 - 0.2, 0, 1));
    else if (t > 0.18) c.copy(forestHi).lerp(rock, clamp((t - 0.18) / 0.3 * 0.7 + (n - 0.5), 0, 1));
    else c.copy(forestLo).lerp(forestHi, t / 0.18);
    // painted shadow side
    const light = 0.86 + 0.24 * Math.cos(ang - 2.4);
    c.multiplyScalar(light);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  let ng = g.toNonIndexed(); ng.computeVertexNormals(); ng.deleteAttribute('uv');
  ng.translate(cx, height / 2 + lowY, cz);
  return ng;
}

export function buildMountains(scene) {
  const parts = [];
  const list = [
    // north wall
    [-30, -118, 46, 62, 1], [12, -128, 50, 74, 2], [58, -112, 40, 52, 3], [-78, -100, 44, 58, 4], [-108, -66, 42, 50, 5],
    [-10, -150, 60, 86, 6], [-60, -140, 52, 70, 7], [46, -150, 56, 66, 8],
    // west
    [-112, -20, 46, 46, 9], [-118, 30, 44, 40, 10], [-100, 76, 40, 36, 11],
    // south
    [-30, 118, 44, 34, 12], [30, 122, 48, 38, 13], [-70, 112, 40, 32, 14],
    // north east, across the bay
    [110, -110, 44, 48, 15], [140, -60, 40, 40, 16],
    // waterfall cliff in the back left
    [-64, -92, 32, 44, 17],
  ];
  for (const [x, z, r, h, s] of list) parts.push(mountain(x, z, r, h, s));
  const geo = mergeGeometries(parts);
  const m = new THREE.Mesh(geo, farmMaterial({ vertexColors: true, spec: 0.03 })); m.name = 'mountains';
  m.frustumCulled = false; m.renderOrder = -20;
  scene.add(m);
  return m;
}

// waterfall: a tall ribbon with scrolling white streaks that pours into the head of the stream
export function buildWaterfall(scene) {
  const g = new THREE.PlaneGeometry(7, 26, 1, 1);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: SU.uTime, uFogCol: SU.uFogCol, uCamPos: SU.uCamPos, uFogDensity: SU.uFogDensity, uFogStart: SU.uFogStart, uNight: SU.uNight },
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uFogCol; uniform vec3 uCamPos; uniform float uFogDensity; uniform float uFogStart; uniform float uNight; varying vec2 vUv; varying vec3 vW;
      float h(float n){ return fract(sin(n*91.3)*437.5); }
      void main(){
        float x = vUv.x; float edge = smoothstep(0.0,0.08,x)*smoothstep(1.0,0.92,x);
        float s = 0.0;
        for (int i=0;i<5;i++){ float fi=float(i); float cx = 0.1+0.8*h(fi+1.0); float w = 0.05+0.06*h(fi+7.0); float sp = 0.5+0.5*h(fi+3.0); float yy = fract(vUv.y*0.7 + uTime*sp*0.55 + h(fi)); s += smoothstep(w, 0.0, abs(x-cx+0.03*sin(vUv.y*9.0+uTime*2.0+fi))) * (0.5+0.5*smoothstep(0.0,0.5,yy)); }
        float a = clamp(0.62 + s*0.5, 0.0, 1.0) * edge * smoothstep(0.0,0.06,vUv.y);
        vec3 c = mix(vec3(0.72,0.9,1.0), vec3(1.0), clamp(s,0.0,1.0));
        c *= mix(1.0, 0.5, uNight);
        float f = 1.0 - exp(-pow(max(distance(uCamPos, vW) - uFogStart, 0.0) * uFogDensity, 1.55));
        c = mix(c, uFogCol, clamp(f,0.0,0.9));
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(g, mat); m.position.set(-56, 12, -74); m.rotation.y = 0.55; m.renderOrder = 3; m.frustumCulled = false;
  scene.add(m);
  // mist at the foot
  return m;
}

// a little city on the far shore
// The skyline across the bay: real Kenney City Kit buildings (CC0), packed into one GLB and merged here
// into a single draw call. Tall ones stand at the back, small ones in front, and the haze does the rest.
export function buildCity(scene, assets) {
  const r = rng(77);
  const base = [108, -72];
  const tall = ['city_skyscraper_a', 'city_skyscraper_b', 'city_skyscraper_c', 'city_skyscraper_d', 'city_skyscraper_e'];
  const mid = ['city_a', 'city_b', 'city_c', 'city_d', 'city_e', 'city_f', 'city_g', 'city_h', 'city_i', 'city_k'];
  const low = ['city_ld_a', 'city_ld_b', 'city_ld_c', 'city_ld_d', 'city_ld_e', 'city_ld_wide_a'];
  const parts = []; let material = null;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  const cache = new Map();
  const put = (id, x, z, h, yaw) => {
    if (!assets.has(id)) return;
    let b = cache.get(id + h);
    if (!b) { b = assets.bakedGeometry(id, { height: h }); cache.set(id + h, b); if (!material) material = b.material; }
    const g = b.geometry.clone();
    e.set(0, yaw, 0); q.setFromEuler(e); p.set(x, -0.6, z); sc.set(1, 1, 1); m4.compose(p, q, sc); g.applyMatrix4(m4);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    parts.push(g);
  };
  // rows from the back (north-east) to the shoreline, so tall towers stand behind low ones
  for (let row = 0; row < 5; row++) for (let i = 0; i < 8; i++) {
    const x = base[0] - 14 + row * 9.5 + (r() - 0.5) * 3, z = base[1] - 38 + i * 10.4 + (r() - 0.5) * 3;
    const yaw = Math.floor(r() * 4) * Math.PI / 2;
    const dist = Math.hypot(x - base[0] - 10, z - base[1]);
    const pick = r();
    if (row <= 1 && dist < 34 && pick < 0.75) put(tall[Math.floor(r() * tall.length)], x, z, 34 + r() * 26 - row * 6, yaw);
    else if (row <= 3 && pick < 0.65) put(mid[Math.floor(r() * mid.length)], x, z, 12 + r() * 12, yaw);
    else put(low[Math.floor(r() * low.length)], x, z, 6 + r() * 4, yaw);
  }
  // land under the city
  const land = new THREE.CylinderGeometry(52, 60, 3, 16); land.translate(base[0], -1.6, base[1]);
  const lc = new Float32Array(land.attributes.position.count * 3); for (let i = 0; i < lc.length; i += 3) { lc[i] = 0.3; lc[i + 1] = 0.44; lc[i + 2] = 0.22; }
  land.setAttribute('color', new THREE.BufferAttribute(lc, 3)); land.deleteAttribute('uv');
  const landMesh = new THREE.Mesh(land, farmMaterial({ vertexColors: true, spec: 0.02 })); landMesh.frustumCulled = false; landMesh.renderOrder = -20; scene.add(landMesh);
  if (!parts.length) return landMesh;
  const geo = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false);
  const mat = farmMaterial({ map: material && material.uniforms && material.uniforms.map.value, spec: 0.12, rough: 0.35 });
  const m = new THREE.Mesh(geo, mat); m.name = 'city';
  m.frustumCulled = false; m.renderOrder = -19;
  scene.add(m);
  return m;
}

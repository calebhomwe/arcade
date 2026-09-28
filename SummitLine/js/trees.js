// Conifer forest: 8-view impostors baked from the Poly Haven fir_tree_01 and
// fir_sapling_medium models (see tools/bake_impostors.py), relit per pixel with
// the baked normals and dusted with snow on upward-facing needles.
import * as THREE from 'three';
import { heightAt, normalAt, centerX, halfWidth, LENGTH, RUNOUT, TREELINE, KICKERS, RAILS } from './course.js';
import { makeRng, noise, fbm, smoothstep } from './noise.js';
import { SUN_DIR } from './sky.js';

export class Forest {
  constructor(tex, meta, quality) {
    this.meta = meta;
    this.q = quality;
    this.group = new THREE.Group();
    this.colliders = []; // near-piste trunks: {x,z,r}
    // variants 0..2 fir_tree_01, 3..5 fir_sapling_medium; one row each in the atlas
    const cells = meta.trees.map((t, row) => new THREE.Vector4(t.halfW, t.halfH, row, 0));
    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        tAlb: { value: null }, tNor: { value: null },
        uCells: { value: cells },
        uSun: { value: SUN_DIR.clone() },
        uSunCol: { value: new THREE.Color(1.0, 0.95, 0.86).multiplyScalar(2.6) },
        uSky: { value: new THREE.Color(0.42, 0.56, 0.78) },
        uGround: { value: new THREE.Color(0.55, 0.58, 0.62) },
        uRows: { value: meta.trees.length },
      }]),
      vertexShader: VERT, fragmentShader: FRAG,
      fog: true, side: THREE.DoubleSide,
    });
    this.material.alphaToCoverage = quality.name !== 'Low';
    this.material.uniforms.tAlb.value = tex.treeA;
    this.material.uniforms.tNor.value = tex.treeN;
    this.material.uniforms.uCells.value = cells;
  }

  // Scatter: dense edges along the piste + forests over the lower massif.
  populate() {
    const rng = makeRng(99);
    const pts = [];
    const n = new THREE.Vector3();
    const tryAdd = (x, z, near) => {
      const y = heightAt(x, z);
      if (y > TREELINE + 60 * noise(x / 300, z / 300) + (near ? 40 : 0)) return;
      normalAt(x, z, n, 2);
      if (n.y < 0.72) return;
      const s = -z, v = x - centerX(s);
      // never on the piste, keep the start and finish areas open
      const W = halfWidth(s);
      if (s > -60 && s < LENGTH + RUNOUT && Math.abs(v) < W + 4) return;
      const dens = fbm(x / 140, z / 140, 3);
      if (dens < (near ? -0.25 : -0.05)) return;
      const variant = (rng() < 0.55 ? 3 : 0) + Math.floor(rng() * 3);
      const tall = variant < 3;
      const scale = tall ? 0.75 + rng() * 0.45 : 1.25 + rng() * 0.75;
      pts.push({ x, y, z, scale, yaw: rng() * 6.283, variant, snow: 0.55 + rng() * 0.45, tint: rng() });
      if (near && Math.abs(v) < W + 40 && s > -100 && s < LENGTH + RUNOUT + 50) this.colliders.push({ x, z, r: 0.45 * scale + 0.2 });
    };
    // near the run: clustered edges
    const nearCount = this.q.treesNear;
    for (let i = 0; i < nearCount; i++) {
      const s = -150 + rng() * (LENGTH + RUNOUT + 500);
      const side = rng() < 0.5 ? -1 : 1;
      const W = halfWidth(s);
      const d = W + 5 + Math.pow(rng(), 1.7) * 230;
      tryAdd(centerX(s) + side * d + (rng() - 0.5) * 3, -s, true);
    }
    // wider forests on the massif
    const farCount = this.q.treesFar;
    for (let i = 0; i < farCount; i++) {
      const x = (rng() - 0.5) * 9000, z = -1100 + (rng() - 0.5) * 9000;
      tryAdd(x, z, false);
    }
    this.count = pts.length;
    // chunk into cells for frustum culling
    const CH = 400;
    const buckets = new Map();
    for (const p of pts) {
      const k = Math.floor(p.x / CH) + ':' + Math.floor(p.z / CH);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(p);
    }
    const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    for (const list of buckets.values()) {
      const g = new THREE.InstancedBufferGeometry();
      g.index = quad.index; g.attributes.position = quad.attributes.position; g.attributes.uv = quad.attributes.uv;
      const off = new Float32Array(list.length * 3), par = new Float32Array(list.length * 4), ext = new Float32Array(list.length * 2);
      list.forEach((p, i) => {
        off.set([p.x, p.y - 0.4 * p.scale, p.z], i * 3);
        par.set([p.scale, p.yaw, p.variant, p.tint], i * 4);
        ext.set([p.snow, 0], i * 2);
      });
      g.setAttribute('offset', new THREE.InstancedBufferAttribute(off, 3));
      g.setAttribute('params', new THREE.InstancedBufferAttribute(par, 4));
      g.setAttribute('extra', new THREE.InstancedBufferAttribute(ext, 2));
      g.instanceCount = list.length;
      // bounding sphere from instance positions
      const box = new THREE.Box3();
      list.forEach(p => { box.expandByPoint(new THREE.Vector3(p.x, p.y, p.z)); box.expandByPoint(new THREE.Vector3(p.x, p.y + 30, p.z)); });
      g.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      g.boundingSphere.radius += 15;
      const mesh = new THREE.Mesh(g, this.material);
      this.group.add(mesh);
    }
    return this;
  }
}

const VERT = /* glsl */`
attribute vec3 offset; attribute vec4 params; attribute vec2 extra;
uniform vec4 uCells[6];
uniform float uRows;
varying vec2 vUv0; varying vec2 vUv1; varying float vFr;
varying vec3 vRight; varying vec3 vFwd; varying float vSnow; varying float vTint; varying float vH; varying float vDist;
#include <fog_pars_vertex>
void main(){
  float scale = params.x, yaw = params.y; int variant = int(params.z + 0.5);
  vec4 cell = uCells[variant];
  vec3 toCam = cameraPosition - offset;
  vec2 d = normalize(toCam.xz);
  vec3 right = vec3(d.y, 0.0, -d.x);
  float ang = atan(d.x, d.y) - yaw;
  float f = fract(ang / 6.2831853) * 8.0;
  float i0 = floor(f); float i1 = mod(i0 + 1.0, 8.0);
  vFr = f - i0;
  float rows = uRows;
  vec2 cuv = uv; // quad uv 0..1
  float rowV = (rows - 1.0 - cell.z) / rows;
  vUv0 = vec2((i0 + cuv.x) / 8.0, rowV + cuv.y / rows);
  vUv1 = vec2((i1 + cuv.x) / 8.0, rowV + cuv.y / rows);
  // the bake camera was centred at halfH, so the quad spans 0..2*halfH
  vec3 transformed = offset + right * position.x * cell.x * 2.0 * scale + vec3(0.0, 1.0, 0.0) * position.y * cell.y * 2.0 * scale;
  vRight = right; vFwd = vec3(d.x, 0.0, d.y);
  vSnow = extra.x; vTint = params.w; vH = uv.y;
  vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);
  vDist = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */`
uniform sampler2D tAlb; uniform sampler2D tNor;
uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uSky; uniform vec3 uGround;
varying vec2 vUv0; varying vec2 vUv1; varying float vFr;
varying vec3 vRight; varying vec3 vFwd; varying float vSnow; varying float vTint; varying float vH; varying float vDist;
#include <common>
#include <fog_pars_fragment>
vec2 gDx; vec2 gDy;
vec4 alb(vec2 uv){ return textureGrad(tAlb, uv, gDx, gDy); }
vec3 nor(vec2 uv){ return textureGrad(tNor, uv, gDx, gDy).xyz; }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  // stochastic cross-fade between the two nearest baked views: one fetch per map
  gDx = dFdx(vUv0); gDy = dFdy(vUv0);
  float hs = hash12(gl_FragCoord.xy);
  vec2 uvv = vFr > 0.5 + (hs - 0.5) * 0.25 ? vUv1 : vUv0;
  vec4 a = alb(uvv);
  // keep coverage in the small mips so distant trees do not thin out, then sharpen
  vec2 dxs = gDx * vec2(2048.0, 3072.0), dys = gDy * vec2(2048.0, 3072.0);
  float mip = max(0.0, 0.5 * log2(max(dot(dxs, dxs), dot(dys, dys))));
  float al = a.a * (1.0 + mip * 0.28);
  al = (al - 0.5) / max(length(vec2(dFdx(a.a), dFdy(a.a))) * (1.0 + mip * 0.28), 1e-4) + 0.5;
  if (al < 0.5) discard;
  vec3 nb = normalize(nor(uvv) * 2.0 - 1.0);
  vec3 n = normalize(vRight * nb.x + vec3(0.0, 1.0, 0.0) * nb.y + vFwd * nb.z);
  // albedo: cooler, deeper alpine green, per-tree variation
  vec3 col = pow(a.rgb, vec3(2.2));
  col = mix(col, vec3(dot(col, vec3(0.3, 0.55, 0.15))), 0.35) * mix(vec3(0.34, 0.47, 0.46), vec3(0.42, 0.48, 0.40), vTint);
  // snow load on upward-facing needles
  float up = n.y + (hash12(floor(vUv0 * 180.0)) - 0.5) * 0.5;
  float snow = smoothstep(0.05, 0.5, up) * vSnow * smoothstep(0.08, 0.3, vH);
  col = mix(col, vec3(0.80, 0.84, 0.90), snow);
  // lighting: wrapped sun + sky/ground ambient + fake crown occlusion
  float ndl = max(dot(n, uSun) * 0.8 + 0.2, 0.0);
  float ao = mix(0.45, 1.0, smoothstep(0.0, 0.9, vH)) * mix(0.75, 1.0, snow);
  vec3 amb = mix(uGround, uSky, n.y * 0.5 + 0.5) * 0.9;
  vec3 lit = col * (uSunCol * ndl * mix(0.75, 1.0, ao) + amb * ao);
  gl_FragColor = vec4(lit, clamp(al, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;


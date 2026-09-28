// Terrain meshes (fine ribbon along the run + coarse surrounding massif + far
// panorama ring) and the snow/rock material.
import * as THREE from 'three';
import { heightAt, centerX, halfWidth, KICKERS, LENGTH, RUNOUT, S_MIN } from './course.js';
import { ridged, fbm, smoothstep } from './noise.js';
import { SUN_DIR } from './sky.js';

const GLSL_COURSE = `
float courseCX(float s){ return 58.0*sin(s/250.0) + 20.0*sin(s/93.0+1.1) + 8.0*sin(s/41.0+0.3)*smoothstep(200.0,400.0,s); }
float courseHW(float s){ return 25.0 + 7.0*sin(s/170.0+0.5) + 4.0*sin(s/61.0); }
`;

export function makeSnowMaterial(tex, quality, variant = 'ribbon') {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0.0, envMapIntensity: 1.0 });
  const uniforms = {
    tSnowN: { value: tex.snowN }, tSnowD: { value: tex.snowD }, tWindN: { value: tex.windN },
    tRockD: { value: tex.rockD }, tRockN: { value: tex.rockN },
  };
  mat.userData.uniforms = uniforms;
  mat.defines = {};
  if (variant === 'ribbon') mat.defines.PISTE = '';
  if (variant === 'ribbon' && quality.sparkle) mat.defines.SPARKLE = '';
  if (quality.name !== 'Low' && variant === 'ribbon') mat.defines.DETAIL = '';
  const rockScale = variant === 'ribbon' ? '1.0/8.0' : '1.0/45.0';
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWNorm;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWPos = (modelMatrix * vec4(transformed,1.0)).xyz; vWNorm = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWPos; varying vec3 vWNorm;
uniform sampler2D tSnowN; uniform sampler2D tSnowD; uniform sampler2D tWindN; uniform sampler2D tRockD; uniform sampler2D tRockN;
${GLSL_COURSE}
vec3 hash33(vec3 p){ p = fract(p*vec3(0.1031,0.1030,0.0973)); p += dot(p, p.yxz+33.33); return fract((p.xxy+p.yxx)*p.zyx); }
float gPiste; float gRock; vec3 gSparkN; float gSparkMask; float gV; float gCam; vec3 gW;
`)
      .replace('#include <map_fragment>', `
  vec3 wp = vWPos;
  vec3 gn = normalize(vWNorm);
  float camDist = length(wp - cameraPosition);
  gCam = camDist;
  gPiste = 0.0; gV = 0.0;
#ifdef PISTE
  float s = -wp.z;
  gV = wp.x - courseCX(s);
  gPiste = (1.0 - smoothstep(courseHW(s) - 1.5, courseHW(s) + 3.0, abs(gV))) * step(-40.0, s) * step(s, ${(LENGTH + RUNOUT).toFixed(1)});
#endif
  // rock where it is too steep for snow to stick, broken up by noise
  float rn = texture2D(tSnowD, wp.xz*0.0021).r;
  float rn2 = texture2D(tSnowD, wp.xz*0.013 + 0.61).r;
  float steep = 1.0 - gn.y;
  #ifdef PISTE
  gRock = smoothstep(0.34, 0.39, steep + (rn-0.5)*0.30 + (rn2-0.5)*0.22) * (1.0 - gPiste);
#else
  gRock = smoothstep(0.24, 0.29, steep + (rn-0.5)*0.34 + (rn2-0.5)*0.26);
#endif
  vec3 snowMacro = texture2D(tSnowD, wp.xz*0.017 + 0.37).rgb;
  float det = dot(snowMacro, vec3(0.333));
#ifdef PISTE
  det = det * 0.45 + dot(texture2D(tSnowD, wp.xz*0.23).rgb, vec3(0.333)) * 0.55;
#endif
  vec3 snowCol = vec3(0.90, 0.93, 0.975) * mix(0.90, 1.08, det);
  snowCol = mix(snowCol, vec3(0.86, 0.905, 0.96), gPiste*0.6);
  vec3 w3 = pow(abs(gn), vec3(4.0)); w3 /= (w3.x + w3.y + w3.z);
  gW = w3;
  vec3 psc = wp * (${rockScale});
  vec3 rockCol = texture2D(tRockD, psc.zy).rgb*w3.x + texture2D(tRockD, psc.xz).rgb*w3.y + texture2D(tRockD, psc.xy).rgb*w3.z;
  rockCol = mix(rockCol, vec3(dot(rockCol, vec3(0.33))), 0.35) * mix(0.8, 1.15, rn2) * vec3(0.95, 0.97, 1.02);
  float dust = smoothstep(0.45, 0.85, gn.y + (rn2 - 0.5)*0.6);
  diffuseColor.rgb = mix(snowCol, mix(rockCol * 0.8, snowCol*0.95, dust*0.6), gRock);
`)
      .replace('#include <roughnessmap_fragment>', `
  float roughnessFactor = mix(mix(0.72, 0.5, gPiste), 0.85, gRock);
`)
      .replace('#include <normal_fragment_maps>', `
  {
    vec3 wp = vWPos; vec3 gn = normalize(vWNorm);
    float camDist = gCam;
    float fadeN = 1.0 - smoothstep(60.0, 420.0, camDist);
    vec3 tn = texture2D(tWindN, wp.xz*0.11).xyz*2.0-1.0;
#ifdef PISTE
    vec3 tn1 = texture2D(tSnowN, wp.xz*0.23).xyz*2.0-1.0;
    tn = mix(tn, tn1, gPiste);
#endif
    vec3 wn = normalize(gn + vec3(tn.x, 0.0, -tn.y) * (0.55 * fadeN + 0.12));
#ifdef PISTE
    // groomer corduroy: fine ridges along the fall line + faint pass seams
    float v = gV;
    float cord = sin(v * 6.2831 / 0.075);
    float aa = clamp(1.0 - fwidth(v) * 9.0, 0.0, 1.0);
    float seam = smoothstep(0.93, 1.0, abs(sin(v * 3.14159 / 4.2 + 0.4)));
    wn.x += (cord * 0.09 * aa + seam * 0.06) * gPiste;
#endif
#ifdef DETAIL
    vec3 psc = wp * (${rockScale});
    vec3 w3 = gW;
    vec3 ra = texture2D(tRockN, psc.zy).xyz*2.0-1.0; vec3 rb = texture2D(tRockN, psc.xz).xyz*2.0-1.0; vec3 rc = texture2D(tRockN, psc.xy).xyz*2.0-1.0;
    vec3 rockN = normalize(gn + (vec3(0.0, ra.y, ra.x)*sign(gn.x)*w3.x + vec3(rb.x, 0.0, -rb.y)*sign(gn.y)*w3.y + vec3(rc.x, rc.y, 0.0)*sign(gn.z)*w3.z) * 0.9);
    wn = normalize(mix(wn, rockN, gRock));
#endif
    // far-field relief so big faces do not read as flat facets
    float farF = smoothstep(150.0, 900.0, camDist);
    vec3 bigS = texture2D(tWindN, wp.xz*0.004).xyz*2.0-1.0;
    wn = normalize(wn + vec3(bigS.x, 0.0, -bigS.y) * 0.55 * farF);
    normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
    gSparkMask = 0.0;
#ifdef SPARKLE
    // sparkle micro-facets (ice crystals catching the sun)
    vec3 r = hash33(floor(wp * 22.0));
    gSparkMask = step(0.82, r.x) * (1.0 - smoothstep(20.0, 45.0, camDist)) * (1.0 - gRock);
    gSparkN = normalize((viewMatrix * vec4(normalize(wn + (r - 0.5) * 1.6), 0.0)).xyz);
#endif
  }
`)
      .replace('#include <lights_fragment_begin>', `
  vec3 sparkleAcc = vec3(0.0);
#include <lights_fragment_begin>`)
      .replace(/RE_Direct\( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight \);/g,
        `RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#ifdef SPARKLE
         if (gSparkMask > 0.0) { float sp = pow(max(dot(reflect(-geometryViewDir, gSparkN), directLight.direction), 0.0), 900.0); sparkleAcc += directLight.color * sp * gSparkMask * 55.0; }
#endif
`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  reflectedLight.directSpecular += sparkleAcc;`);
  };
  mat.customProgramCacheKey = () => 'snow-' + variant + '-' + quality.name;
  return mat;
}

// Build a grid mesh from a height array, with normals from central differences.
function gridGeometry(nx, nz, posFn, heights, flip = false) {
  const pos = new Float32Array(nx * nz * 3);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i; const p = posFn(i, j);
    pos[k * 3] = p[0]; pos[k * 3 + 1] = heights[k]; pos[k * 3 + 2] = p[1];
  }
  const idx = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    if (flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(nx * nz > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

// Fine ribbon that follows the run. Split into chunks for culling.
export function buildRibbon(q, material) {
  const group = new THREE.Group();
  const vs = [];
  const inner = 42, outer = 230;
  for (let v = -outer; v <= outer + 1e-6;) {
    vs.push(v);
    const a = Math.abs(v);
    let step = a < inner ? q.dv : q.dv + (a - inner) * 0.09;
    if (v < 0 && v + step > 0) step = -v; // hit zero exactly
    v += step;
  }
  const nx = vs.length;
  const s0 = -260, s1 = LENGTH + RUNOUT + 380;
  const chunkLen = 160;
  for (let cs = s0; cs < s1; cs += chunkLen) {
    const ce = Math.min(s1, cs + chunkLen);
    const nz = Math.round((ce - cs) / q.ds) + 1;
    const heights = new Float32Array(nx * nz);
    const posFn = (i, j) => { const s = cs + (ce - cs) * j / (nz - 1); return [centerX(s) + vs[i], -s]; };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const p = posFn(i, j); heights[j * nx + i] = heightAt(p[0], p[1]); }
    const g = gridGeometry(nx, nz, posFn, heights, true);
    const m = new THREE.Mesh(g, material);
    m.receiveShadow = true;
    group.add(m);
  }
  return group;
}

// Surrounding massif as a polar grid centred on the run: fine near the course,
// ~25-60 m cells out at the peaks. Sinks under the ribbon so the ribbon wins.
export function buildMassif(q, material) {
  const group = new THREE.Group();
  const cx = 0, cz = -1100;
  const nA = q.massifAng, nR = q.massifRings;
  const r0 = 60, r1 = 7600;
  const radii = [];
  for (let j = 0; j < nR; j++) radii.push(r0 * Math.pow(r1 / r0, j / (nR - 1)));
  const hfn = (x, z) => {
    let h = heightAt(x, z);
    const s = -z;
    if (s > -250 && s < LENGTH + RUNOUT + 370) { const v = Math.abs(x - centerX(s)); h -= 14 * (1 - smoothstep(200, 236, v)); }
    return h;
  };
  const sectors = 12, perA = nA / sectors;
  const bands = [[0, Math.floor(nR * 0.55)], [Math.floor(nR * 0.55), Math.floor(nR * 0.8)], [Math.floor(nR * 0.8), nR - 1]];
  for (let sct = 0; sct < sectors; sct++) for (const [j0, j1] of bands) {
    const nx = perA + 1, nz = j1 - j0 + 1;
    const heights = new Float32Array(nx * nz);
    const posFn = (i, j) => { const a = (sct * perA + i) / nA * Math.PI * 2, r = radii[j0 + j]; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const p = posFn(i, j); heights[j * nx + i] = hfn(p[0], p[1]); }
    const g = gridGeometry(nx, nz, posFn, heights, true);
    group.add(new THREE.Mesh(g, material));
  }
  return group;
}

// Distant alpine panorama: a ring of big peaks far beyond the massif.
export function buildPanorama(material) {
  const cx = 0, cz = -1100;
  const nr = 34, na = 420;
  const r0 = 7000, r1 = 34000;
  const pos = [], idx = [];
  for (let j = 0; j < nr; j++) {
    const t = j / (nr - 1);
    const r = r0 + (r1 - r0) * Math.pow(t, 1.6);
    for (let i = 0; i <= na; i++) {
      const a = i / na * Math.PI * 2;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      const inner = heightAt(x, z);
      const big = ridged(x / 4200 + 11.3, z / 4200 + 4.1, 7) * 1700 + (fbm(x / 5000, z / 5000, 4) * 0.5 + 0.5) * 1500 + fbm(x / 1500, z / 1500, 3) * 250 - 600;
      const w = smoothstep(0, 0.35, t);
      let h = inner * (1 - w) + big * w;
      pos.push(x, h, z);
    }
  }
  for (let j = 0; j < nr - 1; j++) for (let i = 0; i < na; i++) {
    const a = j * (na + 1) + i, b = a + 1, c = a + na + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, material);
  m.frustumCulled = false;
  return m;
}


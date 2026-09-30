// All the GLSL in one place, plus the shared uniforms every material reads (sun, sky, fog, shadow, time).
// Look: physically-minded lighting (sun + hemisphere + soft shadow map + baked AO), ACES tone mapping and a
// gentle grade, real CC0 texture detail on the ground, haze that matches the sky. No toon ramp, no outlines.
import * as THREE from 'three';

const WHITE = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat); WHITE.needsUpdate = true;

// Shared uniforms: one object per value so every material points at the same numbers.
export const SU = {
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0.5, 0.75, 0.4).normalize() },
  uSunCol: { value: new THREE.Color(1.0, 0.82, 0.55) },
  uAmbSky: { value: new THREE.Color(0.52, 0.62, 0.86) },
  uAmbGround: { value: new THREE.Color(0.5, 0.42, 0.3) },
  uFogCol: { value: new THREE.Color(0.78, 0.86, 0.95) },
  uFogDensity: { value: 0.0075 },
  uFogStart: { value: 30 },
  uNight: { value: 0 },
  uCamPos: { value: new THREE.Vector3() },
  uSat: { value: 1.08 },
  uExposure: { value: 0.92 },
  uWind: { value: 1 },
  uSnow: { value: 0 },
  uGrassA: { value: new THREE.Color(0.36, 0.62, 0.13) },
  uGrassB: { value: new THREE.Color(0.24, 0.5, 0.11) },
  uFoliage: { value: new THREE.Color(1, 1, 1) },
  uWet: { value: 0 },
  uBlobScale: { value: 1 },
  uPaint: { value: WHITE },
  uGA: { value: WHITE },        // packed CC0 detail: R leafy grass, G sparse grass, B dirt
  uGB: { value: WHITE },        // packed CC0 detail: R sand, G rock, B tilled soil
  uPlanks: { value: WHITE },    // CC0 plank grain, used as a brightness pattern on wooden props
  uShadowMap: { value: WHITE },
  uShadowMat: { value: new THREE.Matrix4() },
  uShadowInfo: { value: new THREE.Vector4(0, 1 / 2048, 0.0004, 0.9) },   // on, texel, bias, strength
};

const COMMON_FRAG = /* glsl */`
#include <packing>
uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmbSky; uniform vec3 uAmbGround; uniform vec3 uFogCol; uniform vec3 uCamPos;
uniform float uFogDensity; uniform float uFogStart; uniform float uNight; uniform float uSat; uniform float uExposure; uniform float uTime;
uniform sampler2D uShadowMap; uniform mat4 uShadowMat; uniform vec4 uShadowInfo;
vec3 satur(vec3 c, float s){ float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); return mix(vec3(l), c, s); }
float fogAmt(vec3 w){ float d = max(distance(uCamPos, w) - uFogStart, 0.0); float f = 1.0 - exp(-pow(d * uFogDensity, 1.55)); return clamp(f, 0.0, 0.94); }
vec3 aces(vec3 x){ const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0); }
float shadowTap(vec2 uv, float z){ return step(z, unpackRGBAToDepth(texture2D(uShadowMap, uv))); }
// soft PCF: 12 taps on two rings, fading out at the edge of the map and with the sun's height
float shadowAt(vec3 wp, vec3 N){
  if (uShadowInfo.x < 0.5) return 1.0;
  float ndl = clamp(dot(N, uSunDir), 0.0, 1.0);
  vec3 p = wp + N * (0.03 + 0.06 * (1.0 - ndl));
  vec3 s = (uShadowMat * vec4(p, 1.0)).xyz * 0.5 + 0.5;
  if (s.x <= 0.0 || s.x >= 1.0 || s.y <= 0.0 || s.y >= 1.0 || s.z >= 1.0) return 1.0;
  float t = uShadowInfo.y, z = s.z - uShadowInfo.z * (1.0 + 2.0 * (1.0 - ndl));
  float sum = shadowTap(s.xy, z) * 2.0;
  sum += shadowTap(s.xy + vec2( 1.0,  0.0) * t * 1.4, z) + shadowTap(s.xy + vec2(-1.0,  0.0) * t * 1.4, z);
  sum += shadowTap(s.xy + vec2( 0.0,  1.0) * t * 1.4, z) + shadowTap(s.xy + vec2( 0.0, -1.0) * t * 1.4, z);
  sum += shadowTap(s.xy + vec2( 0.7,  0.7) * t * 2.6, z) + shadowTap(s.xy + vec2(-0.7,  0.7) * t * 2.6, z);
  sum += shadowTap(s.xy + vec2( 0.7, -0.7) * t * 2.6, z) + shadowTap(s.xy + vec2(-0.7, -0.7) * t * 2.6, z);
  sum += shadowTap(s.xy + vec2( 1.0,  0.3) * t * 4.0, z) + shadowTap(s.xy + vec2(-0.3, -1.0) * t * 4.0, z);
  float lit = sum / 12.0;
  vec2 e = min(s.xy, 1.0 - s.xy); float edge = smoothstep(0.0, 0.1, min(e.x, e.y));
  return mix(1.0, lit, edge * uShadowInfo.w);
}
// sun + sky/ground hemisphere + a touch of highlight; albedo is linear
vec3 paintLight(vec3 albedo, vec3 N, vec3 V, float shadow, float ao, float spec, float rough){
  float ndl = dot(N, uSunDir);
  float w = clamp((ndl + 0.22) / 1.22, 0.0, 1.0);
  w = w * w * (3.0 - 2.0 * w) * 0.4 + w * 0.6;
  vec3 hemi = mix(uAmbGround, uAmbSky, N.y * 0.5 + 0.5);
  vec3 c = albedo * (hemi * ao + uSunCol * w * shadow * (0.35 + 0.65 * ao));
  if (spec > 0.001) {
    vec3 H = normalize(uSunDir + V); float nh = max(dot(N, H), 0.0);
    float sh = mix(120.0, 10.0, rough);
    c += uSunCol * pow(nh, sh) * (0.35 + sh * 0.012) * spec * shadow * step(0.0, ndl);
    float fr = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 4.0);
    c += uAmbSky * fr * spec * 0.55 * ao;
  }
  return c;
}
// tone map, grade, then haze
vec3 finishColor(vec3 c, vec3 wp){
  c = aces(c * uExposure);
  c = satur(c, uSat);
  return mix(c, uFogCol, fogAmt(wp));
}
vec3 hueRot(vec3 c, float a){ const vec3 k = vec3(0.57735); float ca = cos(a), sa = sin(a); return c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca); }
`;

// ---------------------------------------------------------------------------------------------
// FarmMaterial: lit model with optional texture / vertex colour / procedural animal idle.
// Works with instancing and skinning.
// ---------------------------------------------------------------------------------------------
const FARM_VERT = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying vec3 vCol;
#ifdef ANIM
uniform vec4 uAnim; uniform vec4 uBounds;
#endif
void main(){
  vec3 objectNormal = vec3(normal);
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  vec3 transformed = vec3(position);
  #include <skinning_vertex>
  #ifdef ANIM
  {
    float zf = (transformed.z - uBounds.x) / max(uBounds.y - uBounds.x, 0.001);
    float fr = smoothstep(0.45, 0.9, zf);
    float pivY = uBounds.z * 0.42; float pivZ = uBounds.w;
    float a = uAnim.x * fr;
    float yy = transformed.y - pivY, zz = transformed.z - pivZ;
    float ca = cos(a), sa = sin(a);
    transformed.y = pivY + yy * ca - zz * sa;
    transformed.z = pivZ + yy * sa + zz * ca;
    transformed.y *= 1.0 + uAnim.w;
    transformed.y += uAnim.y;
    float cr = cos(uAnim.z), sr = sin(uAnim.z);
    transformed.xy = mat2(cr, sr, -sr, cr) * transformed.xy;
    vec3 tn = objectNormal; tn.yz = vec2(tn.y * ca - tn.z * sa * fr, tn.y * sa * fr + tn.z * ca); objectNormal = normalize(tn);
  }
  #endif
  vec4 wp = vec4(transformed, 1.0);
  vec3 nw = objectNormal;
  #ifdef USE_INSTANCING
  wp = instanceMatrix * wp; nw = mat3(instanceMatrix) * nw;
  #endif
  wp = modelMatrix * wp; nw = normalize(mat3(modelMatrix) * nw);
  vW = wp.xyz; vN = nw; vUv = uv;
  #ifdef USE_COLOR
  vCol = color.rgb;
  #else
  vCol = vec3(1.0);
  #endif
  #ifdef USE_INSTANCING_COLOR
  vCol *= instanceColor;
  #endif
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FARM_FRAG = /* glsl */`
${COMMON_FRAG}
uniform vec3 uTint; uniform vec3 uEmis; uniform float uHue; uniform float uSpec; uniform float uRough;
uniform vec3 uFoliage; uniform float uSnow; uniform sampler2D uPaint; uniform sampler2D uGB; uniform sampler2D uPlanks;
#ifdef USE_MAP
uniform sampler2D map;
#endif
varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying vec3 vCol;
void main(){
  vec4 base = vec4(1.0);
  #ifdef USE_MAP
  base = texture2D(map, vUv, 0.3);
  #endif
  #ifdef ALPHATEST
  if (base.a < 0.5) discard;
  #endif
  vec3 albedo = base.rgb * vCol * uTint;
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCamPos - vW);
  // slow painterly variation so big flat areas never look like plastic
  float dn = texture2D(uPaint, vW.xz * 0.31 + vec2(vW.y * 0.17, vW.y * 0.11)).g - 0.5;
  float dn2 = texture2D(uPaint, vW.xz * 1.3 + vW.y * 0.6).b - 0.5;
  if (abs(uHue) > 0.001) {
    float mx = max(albedo.r, max(albedo.g, albedo.b)), mn = min(albedo.r, min(albedo.g, albedo.b));
    float redness = smoothstep(0.08, 0.3, albedo.r - max(albedo.g, albedo.b)) * smoothstep(0.1, 0.25, mx - mn);
    albedo = mix(albedo, hueRot(albedo, uHue), redness);
  }
  float ao = 0.7 + 0.3 * smoothstep(0.0, 1.6, vW.y);
  #ifdef FOLIAGE
  {
    float leafy = smoothstep(0.0, 0.1, albedo.g - max(albedo.r, albedo.b) * 0.9);
    albedo = mix(albedo, albedo * uFoliage, leafy);
    albedo *= 1.0 + dn * 0.7 + dn2 * 0.35;
    albedo = mix(albedo, vec3(0.86, 0.9, 0.95), uSnow * leafy * smoothstep(0.2, 0.9, N.y) * 0.8);
    ao = mix(0.82, 1.0, smoothstep(0.1, 3.0, vW.y));
  }
  #else
  albedo *= 1.0 + dn * 0.26 + dn2 * 0.1;
  #endif
  #ifdef DETAIL_SOIL
  { float d = mix(texture2D(uGB, vW.xz * 0.55).b, texture2D(uGB, vW.xz * 0.13 + 0.4).b, 0.4); albedo *= 0.45 + 1.3 * d; }
  #endif
  #ifdef DETAIL_WOOD
  { vec3 an = abs(N); vec2 uvw = an.x > an.z ? (an.x > an.y ? vW.zy : vW.xz) : (an.z > an.y ? vW.xy : vW.xz); vec3 wt = texture2D(uPlanks, uvw * 0.3).rgb; albedo *= 0.5 + 1.1 * dot(wt, vec3(0.33)); }
  #endif
  float sh = shadowAt(vW, N);
  vec3 c = paintLight(albedo, N, V, sh, ao, uSpec, uRough);
  c += uEmis;
  c = finishColor(c, vW);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

export function farmMaterial(o = {}) {
  const defines = {};
  if (o.map) defines.USE_MAP = '';
  if (o.anim) defines.ANIM = '';
  if (o.alphaTest) defines.ALPHATEST = '';
  if (o.foliage) defines.FOLIAGE = '';
  if (o.detail === 'soil') defines.DETAIL_SOIL = '';
  if (o.detail === 'wood') defines.DETAIL_WOOD = '';
  const uniforms = Object.assign({}, SU, {
    uTint: { value: new THREE.Color(o.tint != null ? o.tint : 0xffffff) },
    uEmis: { value: new THREE.Color(0, 0, 0) },
    uHue: { value: 0 },
    uSpec: { value: o.spec != null ? o.spec : (o.foliage ? 0.05 : 0.16) },
    uRough: { value: o.rough != null ? o.rough : 0.7 },
    map: { value: o.map || null },
    uAnim: { value: new THREE.Vector4(0, 0, 0, 0) },
    uBounds: { value: new THREE.Vector4(-1, 1, 1, 0) },
  });
  const m = new THREE.ShaderMaterial({
    uniforms, defines, vertexShader: FARM_VERT, fragmentShader: FARM_FRAG,
    vertexColors: !!o.vertexColors, side: o.doubleSided ? THREE.DoubleSide : THREE.FrontSide, transparent: false,
  });
  m.userData.farm = true;
  return m;
}

// ---------------------------------------------------------------------------------------------
// Terrain: vertex colour channels are (grass mix, dirt, rock, sand). The palette comes from uniforms
// so seasons swap without touching the mesh. Real CC0 detail (Poly Haven) is tiled at two scales and
// tinted by the palette, so the ground has grain without ever looking like a photograph pasted on.
// ---------------------------------------------------------------------------------------------
export const TERRAIN_VERT = /* glsl */`
varying vec3 vW; varying vec3 vN; varying vec4 vC;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal);
  vC = color;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
export const TERRAIN_FRAG = /* glsl */`
${COMMON_FRAG}
uniform sampler2D uPaint; uniform sampler2D uGA; uniform sampler2D uGB; uniform vec3 uGrassA; uniform vec3 uGrassB; uniform float uSnow; uniform float uWet;
varying vec3 vW; varying vec3 vN; varying vec4 vC;
void main(){
  vec2 xz = vW.xz;
  vec4 p1 = texture2D(uPaint, xz * 0.045);
  vec4 p2 = texture2D(uPaint, xz * 0.23 + 0.37);
  vec4 p3 = texture2D(uPaint, xz * 0.9 + 0.11);
  // two scales of every detail texture, blended, so the repeat never shows
  vec3 a1 = texture2D(uGA, xz * 0.34).rgb, a2 = texture2D(uGA, xz * 0.079 + vec2(0.31, 0.17)).rgb;
  vec3 b1 = texture2D(uGB, xz * 0.34).rgb, b2 = texture2D(uGB, xz * 0.079 + vec2(0.31, 0.17)).rgb;
  vec3 A = mix(a1, a2, 0.42), B = mix(b1, b2, 0.42);
  float gpatch = clamp(vC.r + (p1.r - 0.5) * 0.9, 0.0, 1.0);
  vec3 grass = mix(uGrassA, uGrassB, gpatch);
  float gd = 0.45 + 1.1 * mix(A.r, A.g, 0.35 + 0.4 * p2.r);
  grass *= gd * (0.8 + 0.5 * p2.b) * (0.85 + 0.3 * p1.g);
  grass = mix(grass, grass * vec3(1.22, 1.1, 0.62), smoothstep(0.6, 0.9, p1.b) * 0.5);   // sun-dried patches
  grass = mix(grass, grass * vec3(0.7, 0.82, 0.75), smoothstep(0.62, 0.86, p1.g) * 0.5); // cool clover patches
  vec3 dirt = mix(vec3(0.30, 0.19, 0.10), vec3(0.42, 0.29, 0.16), p2.r) * (0.5 + 1.0 * A.b);
  vec3 rock = mix(vec3(0.36, 0.33, 0.30), vec3(0.5, 0.46, 0.4), p2.g) * (0.55 + 0.9 * B.g);
  vec3 sand = mix(vec3(0.66, 0.55, 0.34), vec3(0.78, 0.66, 0.42), p2.r) * (0.6 + 0.8 * B.r);
  vec3 col = grass;
  col = mix(col, sand, vC.a);
  col = mix(col, dirt, vC.g);
  col = mix(col, rock, vC.b);
  col = mix(col, vec3(0.86, 0.9, 0.95), uSnow * smoothstep(0.35, 0.6, p1.g + vN.y * 0.4));
  col *= 1.0 - uWet * 0.22;
  vec3 N = normalize(vN);
  vec3 V = normalize(uCamPos - vW);
  float ao = 0.85 + 0.15 * smoothstep(0.3, 0.6, p3.g);
  float sh = shadowAt(vW, N);
  vec3 c = paintLight(col, N, V, sh, ao, 0.04, 0.9);
  c = finishColor(c, vW);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------------------------------------
// Water: reads a baked depth texture (R = height of the ground, 0.5 = level with the surface) for
// shore foam and colour, so rivers and the bay share one plane.
// ---------------------------------------------------------------------------------------------
export const WATER_VERT = /* glsl */`
varying vec3 vW;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
export const WATER_FRAG = /* glsl */`
${COMMON_FRAG}
uniform sampler2D uDepth; uniform sampler2D uPaint; uniform vec4 uDepthRect; uniform float uHRange; uniform float uWaterY;
varying vec3 vW;
void main(){
  vec2 duv = (vW.xz - uDepthRect.xy) / uDepthRect.zw;
  float h = (texture2D(uDepth, duv).r - 0.5) * 2.0 * uHRange;
  float depth = uWaterY - h;
  float t = uTime;
  vec2 q = vW.xz * 0.18;
  float n1 = texture2D(uPaint, q + vec2(t * 0.012, t * 0.006)).r;
  float n2 = texture2D(uPaint, q * 1.9 + vec2(-t * 0.02, t * 0.011)).g;
  float n3 = texture2D(uPaint, q * 4.3 + vec2(t * 0.03, -t * 0.02)).b;
  float ripple = n1 * 0.5 + n2 * 0.32 + n3 * 0.18;
  vec3 shallow = vec3(0.05, 0.36, 0.40);
  vec3 mid = vec3(0.02, 0.19, 0.33);
  vec3 deep = vec3(0.008, 0.06, 0.20);
  float dd = smoothstep(0.0, 3.4, depth + (ripple - 0.5) * 0.4);
  vec3 col = mix(shallow, mix(mid, deep, smoothstep(0.35, 1.0, dd)), smoothstep(0.0, 0.55, dd));
  // sky reflection towards the horizon, sharper the flatter you look
  vec3 V = normalize(uCamPos - vW);
  vec3 Nw = normalize(vec3((n1 - 0.5) * 0.28 + (n3 - 0.5) * 0.16, 1.0, (n2 - 0.5) * 0.28));
  float fres = 0.04 + 0.96 * pow(1.0 - clamp(dot(Nw, V), 0.0, 1.0), 5.0);
  vec3 skyRef = mix(uFogCol, uAmbSky * 1.7, 0.45);
  col = mix(col, skyRef, clamp(fres * 1.15, 0.0, 0.9));
  // sun glitter
  vec3 R = reflect(-uSunDir, Nw);
  float sp = pow(clamp(dot(R, V), 0.0, 1.0), 90.0);
  col += uSunCol * sp * 2.6 * (1.0 - uNight * 0.8);
  col += uSunCol * pow(clamp(dot(R, V), 0.0, 1.0), 12.0) * 0.06;
  // shore foam: two soft bands that pulse
  float w1 = 0.10 + 0.05 * sin(t * 1.3 + vW.x * 0.6 + vW.z * 0.4);
  float foam = smoothstep(w1 + 0.2, w1, depth) * (0.6 + 0.4 * n3);
  float foam2 = smoothstep(0.62, 0.5, abs(depth - 0.46 - 0.09 * sin(t * 0.9 + vW.z * 0.5))) * step(0.52, ripple) * 0.6;
  col = mix(col, vec3(0.95, 0.98, 1.0) * (0.9 - uNight * 0.55), clamp(foam + foam2 * (1.0 - dd), 0.0, 1.0));
  col *= mix(1.0, 0.4, uNight);
  col = aces(col * uExposure);
  col = satur(col, uSat);
  col = mix(col, uFogCol, fogAmt(vW));
  float alpha = smoothstep(-0.02, 0.28, depth) * 0.97 + 0.03;
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------------------------------------
// Sky dome, drawn at the horizon colour that fog uses so the farm melts into it.
// ---------------------------------------------------------------------------------------------
export const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main(){ vDir = position; vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0); gl_Position = p.xyww; }`;
export const SKY_FRAG = /* glsl */`
uniform vec3 uSkyTop; uniform vec3 uSkyMid; uniform vec3 uSkyHor; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uNight; uniform float uTime; uniform sampler2D uStars;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float y = clamp(d.y, -0.2, 1.0);
  float t1 = smoothstep(0.0, 0.16, y), t2 = smoothstep(0.1, 0.75, y);
  vec3 col = mix(uSkyHor, uSkyMid, t1);
  col = mix(col, uSkyTop, t2);
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunCol * (pow(sd, 6.0) * 0.28 + pow(sd, 90.0) * 0.55 + smoothstep(0.9993, 0.9997, sd) * 1.2) * (1.0 - uNight * 0.85);
  if (uNight > 0.02) {
    vec2 su = vec2(atan(d.x, d.z) * 1.4, d.y * 2.2);
    float st = texture2D(uStars, su * 1.6).r;
    col += vec3(0.9, 0.95, 1.0) * smoothstep(0.86, 1.0, st) * uNight * smoothstep(0.05, 0.4, d.y);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------------------------------------
// Instanced grass tufts and flowers: crossed quads with a painted alpha texture. Shadow is read once
// per tuft in the vertex shader (cheap), the blade base is darker than the tip.
// ---------------------------------------------------------------------------------------------
export const GRASS_VERT = /* glsl */`
attribute vec4 aData;   // x, z, rot, scale
attribute vec3 aCol; attribute float aY;
uniform float uTime; uniform float uWind; uniform vec3 uCamPos;
uniform sampler2D uShadowMap; uniform mat4 uShadowMat; uniform vec4 uShadowInfo; uniform vec3 uSunDir;
varying vec2 vUv; varying vec3 vCol; varying vec3 vW; varying float vH; varying float vSh;
#include <packing>
void main(){
  float c = cos(aData.z), s = sin(aData.z);
  vec3 p = position * aData.w;
  vec3 wp = vec3(aData.x + p.x * c - p.z * s, p.y + aY, aData.y + p.x * s + p.z * c);
  float h = position.y;
  float sw = sin(uTime * 1.9 + aData.x * 0.55 + aData.y * 0.35) * 0.5 + sin(uTime * 3.1 + aData.x * 1.3) * 0.25;
  wp.x += sw * h * h * 0.18 * uWind * aData.w;
  wp.z += cos(uTime * 1.5 + aData.y * 0.6) * h * h * 0.08 * uWind * aData.w;
  vSh = 1.0;
  if (uShadowInfo.x > 0.5) {
    vec3 b = vec3(aData.x, aY + 0.1 + h * 0.4, aData.y);
    vec3 sc = (uShadowMat * vec4(b, 1.0)).xyz * 0.5 + 0.5;
    if (sc.x > 0.0 && sc.x < 1.0 && sc.y > 0.0 && sc.y < 1.0 && sc.z < 1.0) {
      float z = sc.z - uShadowInfo.z * 3.0, t = uShadowInfo.y * 2.0, l = 0.0;
      l += step(z, unpackRGBAToDepth(texture2D(uShadowMap, sc.xy)));
      l += step(z, unpackRGBAToDepth(texture2D(uShadowMap, sc.xy + vec2(t, 0.0))));
      l += step(z, unpackRGBAToDepth(texture2D(uShadowMap, sc.xy - vec2(t, 0.0))));
      l += step(z, unpackRGBAToDepth(texture2D(uShadowMap, sc.xy + vec2(0.0, t))));
      l += step(z, unpackRGBAToDepth(texture2D(uShadowMap, sc.xy - vec2(0.0, t))));
      vec2 e = min(sc.xy, 1.0 - sc.xy); float edge = smoothstep(0.0, 0.1, min(e.x, e.y));
      vSh = mix(1.0, l / 5.0, edge * uShadowInfo.w);
    }
  }
  vUv = uv; vCol = aCol; vW = wp; vH = h;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
export const GRASS_FRAG = /* glsl */`
${COMMON_FRAG}
uniform sampler2D map; uniform vec3 uFoliage; uniform float uFlower;
varying vec2 vUv; varying vec3 vCol; varying vec3 vW; varying float vH; varying float vSh;
void main(){
  vec4 t = texture2D(map, vUv);
  if (t.a < 0.5) discard;
  vec3 c; float spec = 0.0;
  if (uFlower > 0.5) {
    // R = petal mask, G = centre mask, B = stem
    c = mix(vCol, vec3(1.0, 0.82, 0.2), step(0.5, t.g));
    c = mix(c, vec3(0.2, 0.46, 0.1), step(0.5, t.b) * (1.0 - step(0.5, t.r)));
    c *= 0.85 + 0.3 * t.r;
    c *= c * 1.2 + 0.2;
  } else {
    c = mix(vCol * 0.55, vCol * 1.2, t.r) * uFoliage;
    c *= mix(0.5, 1.0, smoothstep(0.0, 0.7, vH));
  }
  vec3 N = normalize(vec3(0.0, 1.0, 0.0) + (vec3(t.r, 0.0, t.g) - 0.5) * 0.4);
  vec3 V = normalize(uCamPos - vW);
  vec3 lit = paintLight(c, N, V, vSh, 1.0, 0.0, 1.0);
  // light glowing through thin blades
  lit += c * uSunCol * vSh * 0.16 * smoothstep(0.2, 1.0, vH);
  lit = finishColor(lit, vW);
  gl_FragColor = vec4(lit, 1.0);
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------------------------------------
// Crops: procedural plants. instanceColor = (growth 0..1, phase, pop).
// vertex colour = ripe colour, aPart = 0 leaf/stalk, 1 fruit (swells late), 2 head (green -> ripe)
// ---------------------------------------------------------------------------------------------
export const CROP_VERT = /* glsl */`
#include <common>
attribute float aPart; attribute vec3 aAnchor;
uniform float uTime; uniform float uWind; uniform vec3 uCamPos;
varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying float vRipe; varying float vY;
void main(){
  float g = instanceColor.r, ph = instanceColor.g, pop = instanceColor.b;
  vec3 p = position;
  float grow = mix(0.12, 1.0, smoothstep(0.02, 0.72, g));
  float ripe = smoothstep(0.66, 0.98, g);
  vec3 pos = p;
  if (aPart > 0.5 && aPart < 1.5) { float f = smoothstep(0.62, 0.95, g); f = f * (1.0 + 0.25 * sin(f * 3.14159)); pos = aAnchor + (p - aAnchor) * f; }
  pos *= vec3(grow, grow, grow);
  pos.y *= 1.0 + pop * 0.25;
  vec4 wp = instanceMatrix * vec4(pos, 1.0);
  wp = modelMatrix * wp;
  float sw = sin(uTime * 1.7 + wp.x * 0.9 + wp.z * 0.6 + ph * 6.28) * 0.05 + sin(uTime * 2.9 + wp.z * 1.3) * 0.02;
  wp.x += sw * p.y * uWind * (0.4 + 0.6 * grow);
  wp.z += sw * 0.5 * p.y * uWind;
  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vW = wp.xyz; vY = p.y;
  vec3 col = color.rgb;
  vec3 unripe = vec3(0.09, 0.30, 0.05);
  if (aPart > 0.5) col = mix(unripe, col, ripe);
  else col = mix(vec3(0.12, 0.36, 0.06), col, smoothstep(0.1, 0.9, g) * 0.8 + 0.2);
  vCol = col; vRipe = ripe * step(0.5, aPart);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
export const CROP_FRAG = /* glsl */`
${COMMON_FRAG}
varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying float vRipe; varying float vY;
void main(){
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCamPos - vW);
  float sh = shadowAt(vW, N);
  float ao = mix(0.45, 1.0, smoothstep(0.0, 0.9, vY));
  vec3 c = paintLight(vCol, N, V, sh, ao, 0.06, 0.6);
  c += vec3(1.0, 0.72, 0.22) * vRipe * 0.07;
  c = finishColor(c, vW);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------------------------------------
// Soft blob shadows / glows: instanced flat quads with a radial falloff.
// instance attributes: aBlob = (x, z, sx, sz), aBlob2 = (rot, strength, y, kind)
// ---------------------------------------------------------------------------------------------
export const BLOB_VERT = /* glsl */`
attribute vec4 aBlob; attribute vec4 aBlob2;
uniform float uTime;
varying vec2 vUv; varying float vS; varying float vKind; varying vec3 vW;
void main(){
  float c = cos(aBlob2.x), s = sin(aBlob2.x);
  vec2 p = position.xz * aBlob.zw;
  vec3 wp = vec3(aBlob.x + p.x * c - p.y * s, aBlob2.z, aBlob.y + p.x * s + p.y * c);
  vUv = position.xz * 2.0; vS = aBlob2.y; vKind = aBlob2.w; vW = wp;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
export const BLOB_FRAG = /* glsl */`
uniform float uNight; uniform float uTime; uniform vec3 uFogCol; uniform vec3 uCamPos; uniform float uFogDensity; uniform float uFogStart; uniform float uBlobScale;
varying vec2 vUv; varying float vS; varying float vKind; varying vec3 vW;
void main(){
  float r = length(vUv);
  float a = smoothstep(1.0, 0.15, r); a *= a;
  vec3 col = vec3(0.03, 0.02, 0.05);
  float alpha = a * vS * uBlobScale;
  if (vKind > 0.5) {  // soft golden ring / glow
    float ring = smoothstep(1.0, 0.3, r);
    col = mix(vec3(1.0, 0.85, 0.35), vec3(1.0, 0.95, 0.7), 1.0 - r);
    alpha = ring * ring * vS * (0.75 + 0.25 * sin(uTime * 3.0 + vW.x * 2.0 + vW.z));
  }
  float f = 1.0 - exp(-pow(max(distance(uCamPos, vW) - uFogStart, 0.0) * uFogDensity, 1.55));
  alpha *= 1.0 - clamp(f, 0.0, 0.94);
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------------------------------------
// Particles: round soft points with size in pixels; a = (size, life, kind, rot)
// ---------------------------------------------------------------------------------------------
export const PART_VERT = /* glsl */`
attribute vec4 aColor; attribute vec2 aSize;
uniform float uScale;
varying vec4 vColor; varying float vKind;
void main(){
  vColor = aColor; vKind = aSize.y;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize.x * uScale / max(-mv.z, 0.5), 0.0, 96.0);
}`;
export const PART_FRAG = /* glsl */`
varying vec4 vColor; varying float vKind;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length(p);
  float a;
  if (vKind > 2.5) { // star
    float ang = atan(p.y, p.x);
    float star = 0.35 + 0.65 * abs(cos(ang * 2.0));
    a = smoothstep(star, star * 0.4, r);
  } else if (vKind > 1.5) { // petal / leaf: soft oval
    a = smoothstep(1.0, 0.5, length(p * vec2(1.0, 1.7)));
  } else if (vKind > 0.5) { // soft glow
    a = pow(smoothstep(1.0, 0.0, r), 1.6);
  } else { a = smoothstep(1.0, 0.7, r); }
  if (a < 0.02) discard;
  gl_FragColor = vec4(vColor.rgb, vColor.a * a);
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------------------------------------
// Dirt paths: ribbons laid on the ground, ragged at the edges, with gravel grain and wheel ruts.
// uv.x runs across the path (0..1), uv.y along it (world units).
// ---------------------------------------------------------------------------------------------
export const PATH_VERT = /* glsl */`
varying vec2 vUv; varying vec3 vW;
void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
export const PATH_FRAG = /* glsl */`
${COMMON_FRAG}
uniform sampler2D uPaint; uniform sampler2D uGA; uniform sampler2D uGB;
varying vec2 vUv; varying vec3 vW;
void main(){
  float n = texture2D(uPaint, vW.xz * 0.21).g;
  float n2 = texture2D(uPaint, vW.xz * 0.9 + 0.3).r;
  float across = abs(vUv.x - 0.5) * 2.0;
  float edge = smoothstep(1.0, 0.55 + 0.3 * n, across + (n2 - 0.5) * 0.25);
  if (edge < 0.02) discard;
  vec3 g1 = texture2D(uGA, vW.xz * 0.5).rgb, g2 = texture2D(uGA, vW.xz * 0.11 + 0.2).rgb;
  float grain = mix(g1.b, g2.b, 0.4);
  vec3 dirt = mix(vec3(0.34, 0.23, 0.12), vec3(0.5, 0.36, 0.2), n) * (0.55 + 0.95 * grain);
  float rut = smoothstep(0.1, 0.0, abs(across - 0.42)) * 0.2;
  dirt *= 1.0 - rut - (1.0 - edge) * 0.25;
  float peb = step(0.86, texture2D(uPaint, vW.xz * 2.7).b) * 0.35;
  dirt = mix(dirt, vec3(0.62, 0.56, 0.48), peb);
  vec3 N = vec3(0.0, 1.0, 0.0), V = normalize(uCamPos - vW);
  float sh = shadowAt(vW, N);
  vec3 c = paintLight(dirt, N, V, sh, 1.0, 0.03, 0.9);
  c = finishColor(c, vW);
  gl_FragColor = vec4(c, edge);
  #include <colorspace_fragment>
}`;

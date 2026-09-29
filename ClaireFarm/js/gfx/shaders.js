// All the GLSL in one place, plus the shared uniforms every material reads (sun, sky, fog, time).
import * as THREE from 'three';

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
  uPxWorld: { value: 0.001 },
  uOutlinePx: { value: 1.6 },
  uOutlineCol: { value: new THREE.Color(0.11, 0.055, 0.03) },
  uRimCol: { value: new THREE.Color(1.0, 0.8, 0.5) },
  uSat: { value: 1.14 },
  uWind: { value: 1 },
  uSnow: { value: 0 },
  uGrassA: { value: new THREE.Color(0.36, 0.62, 0.13) },
  uGrassB: { value: new THREE.Color(0.24, 0.5, 0.11) },
  uFoliage: { value: new THREE.Color(1, 1, 1) },
  uWet: { value: 0 },
};

const COMMON_FRAG = /* glsl */`
uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmbSky; uniform vec3 uAmbGround; uniform vec3 uFogCol; uniform vec3 uCamPos;
uniform float uFogDensity; uniform float uFogStart; uniform float uNight; uniform float uSat; uniform float uTime; uniform vec3 uRimCol;
vec3 satur(vec3 c, float s){ float l = dot(c, vec3(0.299, 0.587, 0.114)); return mix(vec3(l), c, s); }
float fogAmt(vec3 w){ float d = max(distance(uCamPos, w) - uFogStart, 0.0); float f = 1.0 - exp(-pow(d * uFogDensity, 1.55)); return clamp(f, 0.0, 0.94); }
vec3 toonLight(vec3 albedo, vec3 N, vec3 V, float rimAmt){
  float ndl = dot(N, uSunDir);
  float wrap = ndl * 0.5 + 0.5;
  float lit = smoothstep(0.30, 0.58, wrap) * 0.55 + smoothstep(0.56, 0.90, wrap) * 0.45;
  vec3 hemi = mix(uAmbGround, uAmbSky, N.y * 0.5 + 0.5);
  vec3 c = albedo * (hemi + uSunCol * lit * 0.78);
  float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
  c += uRimCol * rim * rimAmt * (0.35 + 0.65 * max(ndl, 0.0)) * (1.0 - uNight);
  return c;
}
`;

// ---------------------------------------------------------------------------------------------
// FarmMaterial: toon-lit model with optional texture / vertex colour / inverted-hull outline in the
// same draw call / procedural animal idle. Works with instancing and skinning.
// ---------------------------------------------------------------------------------------------
const FARM_VERT = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
uniform vec3 uCamPos; uniform float uPxWorld; uniform float uOutlinePx; uniform float uTime;
varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying vec3 vCol; varying float vShell;
#ifdef USE_SHELL
attribute float aShell; attribute vec3 aOutN;
#endif
#ifdef ANIM
uniform vec4 uAnim; uniform vec4 uBounds;
#endif
void main(){
  vec3 objectNormal = vec3(normal);
  #ifdef USE_SHELL
  if (aShell > 0.5) objectNormal = aOutN;
  #endif
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
  vShell = 0.0;
  #ifdef USE_SHELL
  vShell = aShell;
  if (aShell > 0.5) { float d = distance(uCamPos, wp.xyz); wp.xyz += nw * (uOutlinePx * uPxWorld * d); }
  #endif
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
uniform vec3 uOutlineCol; uniform vec3 uTint; uniform vec3 uEmis; uniform float uHue; uniform float uRimAmt; uniform vec3 uFoliage; uniform float uSnow;
#ifdef USE_MAP
uniform sampler2D map;
#endif
varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying vec3 vCol; varying float vShell;
vec3 hueRot(vec3 c, float a){ const vec3 k = vec3(0.57735); float ca = cos(a), sa = sin(a); return c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca); }
void main(){
  if (vShell > 0.5) {
    float f = fogAmt(vW);
    gl_FragColor = vec4(mix(uOutlineCol * (1.0 - uNight * 0.55), uFogCol, f), 1.0);
    #include <colorspace_fragment>
    return;
  }
  vec4 base = vec4(1.0);
  #ifdef USE_MAP
  base = texture2D(map, vUv);
  #endif
  #ifdef ALPHATEST
  if (base.a < 0.5) discard;
  #endif
  vec3 albedo = base.rgb * vCol * uTint;
  float N0y = normalize(vN).y;
  if (abs(uHue) > 0.001) {
    float mx = max(albedo.r, max(albedo.g, albedo.b)), mn = min(albedo.r, min(albedo.g, albedo.b));
    float redness = smoothstep(0.08, 0.3, albedo.r - max(albedo.g, albedo.b)) * smoothstep(0.1, 0.25, mx - mn);
    albedo = mix(albedo, hueRot(albedo, uHue), redness);
  }
  #ifdef FOLIAGE
  {
    float leafy = smoothstep(0.0, 0.1, albedo.g - max(albedo.r, albedo.b) * 0.9);
    albedo = mix(albedo, albedo * uFoliage, leafy);
    albedo = mix(albedo, vec3(0.86, 0.9, 0.95), uSnow * leafy * smoothstep(0.2, 0.9, N0y) * 0.8);
  }
  #endif
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCamPos - vW);
  vec3 c = toonLight(albedo, N, V, uRimAmt);
  c += uEmis;
  c = satur(c, uSat);
  c = mix(c, uFogCol, fogAmt(vW));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

let _farmProgId = 0;
export function farmMaterial(o = {}) {
  const defines = {};
  if (o.map) defines.USE_MAP = '';
  if (o.shell) defines.USE_SHELL = '';
  if (o.anim) defines.ANIM = '';
  if (o.alphaTest) defines.ALPHATEST = '';
  if (o.foliage) defines.FOLIAGE = '';
  const uniforms = Object.assign({}, SU, {
    uTint: { value: new THREE.Color(o.tint != null ? o.tint : 0xffffff) },
    uEmis: { value: new THREE.Color(0, 0, 0) },
    uHue: { value: 0 },
    uRimAmt: { value: o.rim != null ? o.rim : 0.5 },
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
// so seasons swap without touching the mesh.
// ---------------------------------------------------------------------------------------------
export const TERRAIN_VERT = /* glsl */`
uniform vec3 uCamPos;
varying vec3 vW; varying vec3 vN; varying vec4 vC;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal);
  vC = color;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
export const TERRAIN_FRAG = /* glsl */`
${COMMON_FRAG}
uniform sampler2D uPaint; uniform vec3 uGrassA; uniform vec3 uGrassB; uniform float uSnow; uniform float uWet;
varying vec3 vW; varying vec3 vN; varying vec4 vC;
void main(){
  vec4 p1 = texture2D(uPaint, vW.xz * 0.045);
  vec4 p2 = texture2D(uPaint, vW.xz * 0.23 + 0.37);
  vec4 p3 = texture2D(uPaint, vW.xz * 0.9 + 0.11);
  float gpatch = clamp(vC.r + (p1.r - 0.5) * 0.9, 0.0, 1.0);
  vec3 grass = mix(uGrassA, uGrassB, gpatch);
  grass *= 0.86 + 0.2 * p2.b + 0.14 * (p3.g - 0.5);
  grass = mix(grass, grass * vec3(1.18, 1.1, 0.7), smoothstep(0.62, 0.9, p1.b) * 0.55);
  vec3 dirt = mix(vec3(0.42, 0.29, 0.16), vec3(0.55, 0.4, 0.23), p2.r) * (0.9 + 0.2 * p3.g);
  vec3 rock = mix(vec3(0.5, 0.47, 0.44), vec3(0.62, 0.58, 0.52), p2.g);
  vec3 sand = mix(vec3(0.86, 0.76, 0.52), vec3(0.94, 0.85, 0.62), p2.r);
  vec3 col = grass;
  col = mix(col, sand, vC.a);
  col = mix(col, dirt, vC.g);
  col = mix(col, rock, vC.b);
  col = mix(col, vec3(0.94, 0.97, 1.0), uSnow * smoothstep(0.35, 0.6, p1.g + vN.y * 0.4));
  col *= 1.0 - uWet * 0.18;
  vec3 N = normalize(vN);
  vec3 V = normalize(uCamPos - vW);
  vec3 c = toonLight(col, N, V, 0.0);
  c = satur(c, uSat);
  c = mix(c, uFogCol, fogAmt(vW));
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
  float ripple = n1 * 0.6 + n2 * 0.4;
  vec3 shallow = vec3(0.30, 0.82, 0.78);
  vec3 deep = vec3(0.10, 0.44, 0.78);
  float dd = smoothstep(0.0, 2.6, depth + (ripple - 0.5) * 0.35);
  vec3 col = mix(shallow, deep, dd);
  // sky reflection towards the horizon
  vec3 V = normalize(uCamPos - vW);
  float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
  col = mix(col, mix(uFogCol, uAmbSky * 1.4, 0.4), fres * 0.55);
  // moving light streaks
  float streak = smoothstep(0.62, 0.9, ripple) * 0.28;
  col += vec3(1.0, 0.96, 0.85) * streak * (1.0 - uNight * 0.7);
  // shore foam: two soft bands that pulse
  float w1 = 0.10 + 0.05 * sin(t * 1.3 + vW.x * 0.6 + vW.z * 0.4);
  float foam = smoothstep(w1 + 0.16, w1, depth) ;
  float foam2 = smoothstep(0.62, 0.5, abs(depth - 0.42 - 0.08 * sin(t * 0.9 + vW.z * 0.5))) * step(0.5, ripple) * 0.55;
  col = mix(col, vec3(1.0), clamp(foam + foam2 * (1.0 - dd), 0.0, 1.0));
  // sun glitter
  vec3 R = reflect(-uSunDir, vec3(0.0, 1.0, 0.0));
  float sp = pow(clamp(dot(R, V) * 0.5 + 0.5, 0.0, 1.0), 40.0) * smoothstep(0.55, 0.85, ripple);
  col += uSunCol * sp * 0.9;
  col *= mix(1.0, 0.45, uNight);
  col = satur(col, uSat);
  col = mix(col, uFogCol, fogAmt(vW));
  float alpha = smoothstep(-0.02, 0.28, depth) * 0.96 + 0.04;
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
// Billboard sprites baked from 3D models (trees, bushes, rocks): one atlas, one draw call.
// ---------------------------------------------------------------------------------------------
export const SPRITE_VERT = /* glsl */`
attribute vec4 aRect;   // atlas u0,v0,u1,v1
attribute vec4 aInfo;   // width, height, sway, tint (0..1 hue/brightness variant)
attribute vec3 aPos;
uniform vec3 uCamPos; uniform float uTime; uniform float uWind;
varying vec2 vUv; varying vec3 vW; varying float vTint; varying float vBase;
void main(){
  vec3 toCam = uCamPos - aPos; toCam.y = 0.0; toCam = normalize(toCam + vec3(1e-4));
  vec3 right = vec3(toCam.z, 0.0, -toCam.x);
  float w = aInfo.x, h = aInfo.y;
  float sway = sin(uTime * 1.3 + aPos.x * 0.7 + aPos.z * 0.9) * aInfo.z * uWind * position.y * position.y * 0.06;
  vec3 wp = aPos + right * ((position.x - 0.5) * w + sway * w) + vec3(0.0, position.y * h, 0.0) ;
  wp += toCam * 0.02 * position.y;
  vUv = mix(aRect.xy, aRect.zw, vec2(position.x, position.y));
  vW = wp; vTint = aInfo.w; vBase = position.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
export const SPRITE_FRAG = /* glsl */`
${COMMON_FRAG}
uniform sampler2D map; uniform vec3 uFoliage; uniform float uSnow;
varying vec2 vUv; varying vec3 vW; varying float vTint; varying float vBase;
vec3 hueRot(vec3 c, float a){ const vec3 k = vec3(0.57735); float ca = cos(a), sa = sin(a); return c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca); }
void main(){
  vec4 s = texture2D(map, vUv);
  if (s.a < 0.42) discard;
  vec3 c = s.rgb;
  float g = c.g - max(c.r, c.b);
  float leafy = smoothstep(0.0, 0.12, g);
  c = mix(c, c * uFoliage, leafy);
  c *= 0.9 + 0.2 * vTint;
  c = mix(c, vec3(0.93, 0.96, 1.0), uSnow * smoothstep(0.35, 0.8, vBase) * leafy * 0.85);
  // baked light, tinted by the time of day
  vec3 amb = mix(uAmbGround, uAmbSky, 0.65);
  c *= (amb * 0.95 + uSunCol * 0.62);
  c = satur(c, uSat);
  c = mix(c, uFogCol, fogAmt(vW));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------------------------------------
// Instanced grass tufts and flowers: crossed quads with a painted alpha texture.
// ---------------------------------------------------------------------------------------------
export const GRASS_VERT = /* glsl */`
attribute vec4 aData;   // x, z, rot, scale
attribute vec3 aCol; attribute float aY;
uniform float uTime; uniform float uWind; uniform vec3 uCamPos;
varying vec2 vUv; varying vec3 vCol; varying vec3 vW; varying float vH;
void main(){
  float c = cos(aData.z), s = sin(aData.z);
  vec3 p = position * aData.w;
  vec3 wp = vec3(aData.x + p.x * c - p.z * s, p.y + aY, aData.y + p.x * s + p.z * c);
  float h = position.y;
  float sw = sin(uTime * 1.9 + aData.x * 0.55 + aData.y * 0.35) * 0.5 + sin(uTime * 3.1 + aData.x * 1.3) * 0.25;
  wp.x += sw * h * h * 0.18 * uWind * aData.w;
  wp.z += cos(uTime * 1.5 + aData.y * 0.6) * h * h * 0.08 * uWind * aData.w;
  vUv = uv; vCol = aCol; vW = wp; vH = h;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
export const GRASS_FRAG = /* glsl */`
${COMMON_FRAG}
uniform sampler2D map; uniform vec3 uFoliage; uniform float uFlower;
varying vec2 vUv; varying vec3 vCol; varying vec3 vW; varying float vH;
void main(){
  vec4 t = texture2D(map, vUv);
  if (t.a < 0.5) discard;
  vec3 c;
  if (uFlower > 0.5) {
    // R = petal mask, G = centre mask, B = stem
    c = mix(vCol, vec3(1.0, 0.82, 0.2), step(0.5, t.g));
    c = mix(c, vec3(0.28, 0.6, 0.15), step(0.5, t.b) * (1.0 - step(0.5, t.r)));
    c *= 0.85 + 0.3 * t.r;
  } else {
    c = mix(vCol * 0.62, vCol * 1.22, t.r) * uFoliage;
  }
  vec3 amb = mix(uAmbGround, uAmbSky, 0.7);
  c *= amb * 0.95 + uSunCol * 0.66;
  c = satur(c, uSat);
  c = mix(c, uFogCol, fogAmt(vW));
  gl_FragColor = vec4(c, 1.0);
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
varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying float vRipe;
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
  vW = wp.xyz;
  vec3 col = color.rgb;
  vec3 unripe = vec3(0.32, 0.58, 0.16);
  if (aPart > 0.5) col = mix(unripe, col, ripe);
  else col = mix(vec3(0.42, 0.7, 0.2), col, smoothstep(0.1, 0.9, g) * 0.8 + 0.2);
  vCol = col; vRipe = ripe * step(0.5, aPart);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
export const CROP_FRAG = /* glsl */`
${COMMON_FRAG}
varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying float vRipe;
void main(){
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCamPos - vW);
  vec3 c = toonLight(vCol, N, V, 0.35);
  c += vec3(1.0, 0.85, 0.3) * vRipe * 0.09;
  c = satur(c, uSat);
  c = mix(c, uFogCol, fogAmt(vW));
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
uniform float uNight; uniform float uTime; uniform vec3 uFogCol; uniform vec3 uCamPos; uniform float uFogDensity; uniform float uFogStart;
varying vec2 vUv; varying float vS; varying float vKind; varying vec3 vW;
void main(){
  float r = length(vUv);
  float a = smoothstep(1.0, 0.15, r); a *= a;
  vec3 col = vec3(0.10, 0.06, 0.12);
  float alpha = a * vS;
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

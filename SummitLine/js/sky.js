// Sky dome (tonemapped Poly Haven HDRI backplate), image-based lighting and
// height-based aerial-perspective fog shared by every material.
import * as THREE from 'three';
import { HDRLoader } from '../vendor/three/jsm/loaders/HDRLoader.js';

// Sun: elevation taken from the HDRI (28.3 deg); azimuth chosen so the sun sits
// square to the right of the fall line: side light models the peaks and the
// slope while the sky down the run stays a deep blue.
const EL = 28.3 * Math.PI / 180, AZ = 86 * Math.PI / 180;
export const SUN_DIR = new THREE.Vector3(Math.sin(AZ) * Math.cos(EL), Math.sin(EL), -Math.cos(AZ) * Math.cos(EL)).normalize();
const SUN_U_IN_HDRI = 0.59985;
export const SKY_U_OFFSET = SUN_U_IN_HDRI - (Math.atan2(SUN_DIR.z, SUN_DIR.x) / (Math.PI * 2) + 0.5);
export const SKY_V_SPAN = 0.52; // the backplate keeps the top 52% of the equirect

// Fog colours in output (display) space: fog is applied after tonemapping in three.
export const FOG = {
  haze: new THREE.Color(0.66, 0.77, 0.90),
  sun: new THREE.Color(0.99, 0.95, 0.86),
  density: 0.00011,   // a
  falloff: 0.0011,    // b (per metre of altitude)
  refY: -200,
};

export function installFog() {
  const f = (v) => v.toFixed(5);
  THREE.ShaderChunk.fog_pars_vertex = `
#ifdef USE_FOG
  varying vec3 vFogWorld;
#endif`;
  THREE.ShaderChunk.fog_vertex = `
#ifdef USE_FOG
  #ifdef USE_INSTANCING
    vFogWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
  #else
    vFogWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
  #endif
#endif`;
  THREE.ShaderChunk.fog_pars_fragment = `
#ifdef USE_FOG
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
  varying vec3 vFogWorld;
  vec4 aerialFog(vec3 wp) {
    vec3 rd = wp - cameraPosition;
    float dist = length(rd);
    rd /= max(dist, 1e-3);
    float a = fogNear, b = fogFar;
    float cy = cameraPosition.y - (${f(FOG.refY)});
    float ry = rd.y;
    float amt;
    if (abs(ry) < 1e-4) amt = a * exp(-cy * b) * dist;
    else amt = (a / b) * exp(-cy * b) * (1.0 - exp(-dist * ry * b)) / ry;
    float fogF = 1.0 - exp(-max(amt, 0.0));
    fogF = min(fogF, 0.97);
    float sunAmt = max(dot(rd, vec3(${f(SUN_DIR.x)}, ${f(SUN_DIR.y)}, ${f(SUN_DIR.z)})), 0.0);
    vec3 col = mix(fogColor, vec3(${f(FOG.sun.r)}, ${f(FOG.sun.g)}, ${f(FOG.sun.b)}), pow(sunAmt, 6.0) * 0.8);
    return vec4(col, fogF);
  }
#endif`;
  THREE.ShaderChunk.fog_fragment = `
#ifdef USE_FOG
  vec4 fogRes = aerialFog(vFogWorld);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogRes.rgb, fogRes.a);
#endif`;
}

export function makeFog() {
  // THREE.Fog carries our params: near = density, far = altitude falloff.
  const fog = new THREE.Fog(FOG.haze.getHex(), FOG.density, FOG.falloff);
  fog.color.setRGB(FOG.haze.r, FOG.haze.g, FOG.haze.b, THREE.LinearSRGBColorSpace);
  return fog;
}

export function makeSkyDome(tex) {
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tSky: { value: tex },
      uOff: { value: SKY_U_OFFSET },
      uSpan: { value: SKY_V_SPAN },
      uHaze: { value: FOG.haze },
    },
    vertexShader: `varying vec3 vDir;
      void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform sampler2D tSky; uniform float uOff; uniform float uSpan; uniform vec3 uHaze; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float u = atan(d.z, d.x) * 0.15915494 + 0.5 + uOff;
        float el = asin(clamp(d.y,-1.0,1.0));
        float v = (1.5707963 - el) / (3.1415926 * uSpan);
        vec3 c = texture2D(tSky, vec2(u, 1.0 - clamp(v, 0.0, 0.995))).rgb;
        // melt the lowest band of the plate into the valley haze
        float h = smoothstep(0.17, 0.035, d.y);
        c = mix(c, uHaze, h);
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: true,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  mesh.onBeforeRender = (r, s, cam) => { mesh.position.copy(cam.position); };
  return mesh;
}

export async function loadEnvironment(renderer, url) {
  const hdr = await new HDRLoader().loadAsync(url);
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(hdr).texture;
  hdr.dispose(); pm.dispose();
  return env;
}
// environmentRotation.y that lines the HDRI sun up with SUN_DIR
export const ENV_ROT_Y = -SKY_U_OFFSET * Math.PI * 2;


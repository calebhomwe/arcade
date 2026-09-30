// One sun shadow map for everything on the farm. Casters are drawn a second time (depth only) into a
// packed RGBA target from an orthographic camera that follows the focus, snapped to texels so nothing
// shimmers while you pan. Receivers (every material in shaders.js) do the soft PCF themselves.
import * as THREE from 'three';
import { SU } from './shaders.js';

export const SHADOW_LAYER = 1;

// mark a model (and everything under it) as something that throws a shadow
export function casts(obj) {
  obj.traverse((o) => { if (o.isMesh) o.layers.enable(SHADOW_LAYER); });
  return obj;
}

export class ShadowMap {
  constructor(renderer, scene) {
    this.r = renderer; this.scene = scene; this.size = 0; this.rt = null;
    this.cam = new THREE.OrthographicCamera(-20, 20, 20, -20, 1, 260);
    this.cam.layers.set(SHADOW_LAYER);
    this.mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    this.mat.side = THREE.DoubleSide;
    this.focus = new THREE.Vector3(); this.tmp = new THREE.Vector3(); this.clear = new THREE.Color();
    this.range = 260 - 1; this.on = false; this.frame = 0;
  }

  setSize(n) {
    if (n === this.size) return;
    this.size = n;
    if (this.rt) { this.rt.dispose(); this.rt = null; }
    const info = SU.uShadowInfo.value;
    if (!n) { this.on = false; info.x = 0; SU.uShadowMap.value = null; return; }
    this.rt = new THREE.WebGLRenderTarget(n, n, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat, type: THREE.UnsignedByteType, depthBuffer: true, generateMipmaps: false });
    SU.uShadowMap.value = this.rt.texture;
    this.on = true;
  }

  // focus = where the camera looks; half = half the size of the covered square in metres
  render(focusX, focusZ, half, strength) {
    if (!this.on) return;
    const info = SU.uShadowInfo.value, L = SU.uSunDir.value;
    const s = strength;
    info.x = s > 0.02 ? 1 : 0; info.w = s;
    if (info.x === 0) return;
    const cam = this.cam, size = this.size, texel = (2 * half) / size;
    cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half; cam.near = 1; cam.far = 260; cam.updateProjectionMatrix();
    this.focus.set(focusX, 0, focusZ);
    cam.position.copy(this.focus).addScaledVector(L, 120);
    cam.up.set(0, 1, 0); if (Math.abs(L.y) > 0.97) cam.up.set(0, 0, 1);
    cam.lookAt(this.focus); cam.updateMatrixWorld(true);
    // snap the centre to whole texels along the light's right and up axes
    const inv = cam.matrixWorldInverse; this.tmp.copy(this.focus).applyMatrix4(inv);
    const sx = Math.round(this.tmp.x / texel) * texel - this.tmp.x, sy = Math.round(this.tmp.y / texel) * texel - this.tmp.y;
    const e = cam.matrixWorld.elements;
    cam.position.x += e[0] * sx + e[4] * sy; cam.position.y += e[1] * sx + e[5] * sy; cam.position.z += e[2] * sx + e[6] * sy;
    cam.updateMatrixWorld(true);
    SU.uShadowMat.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    info.y = 1 / size; info.z = 0.05 / (cam.far - cam.near);
    // draw the casters
    const r = this.r, scene = this.scene;
    const prevRT = r.getRenderTarget(), prevAlpha = r.getClearAlpha(); r.getClearColor(this.clear);
    const prevOverride = scene.overrideMaterial, prevFog = scene.fog;
    scene.overrideMaterial = this.mat; scene.fog = null;
    r.setRenderTarget(this.rt); r.setClearColor(0xffffff, 1); r.clear(true, true, false);
    r.render(scene, cam);
    r.setRenderTarget(prevRT); r.setClearColor(this.clear, prevAlpha);
    scene.overrideMaterial = prevOverride; scene.fog = prevFog;
  }

  dispose() { if (this.rt) this.rt.dispose(); this.rt = null; this.on = false; }
}

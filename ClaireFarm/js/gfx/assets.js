// Loads the GLB packs, turns their meshes into lit models (sun, shadow, haze), and hands out clones. Everything is fetched with real progress for the splash bar.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { farmMaterial } from './shaders.js';
import { SHADOW_LAYER } from './shadow.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export async function fetchProgress(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
  const total = +res.headers.get('content-length') || 0;
  if (!res.body || !res.body.getReader) { const b = await res.arrayBuffer(); onProgress && onProgress(b.byteLength, b.byteLength); return b; }
  const reader = res.body.getReader(); const chunks = []; let got = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.length; onProgress && onProgress(got, total || got); }
  const out = new Uint8Array(got); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
  return out.buffer;
}

// Quantised attributes (normalised ints from gltfpack) become plain floats so matrices can be baked in.
export function floatize(geo) {
  for (const name of Object.keys(geo.attributes)) {
    const at = geo.attributes[name];
    if (name === 'skinIndex') continue;
    if (at.array.constructor !== Float32Array || at.isInterleavedBufferAttribute) {
      const arr = new Float32Array(at.count * at.itemSize);
      for (let i = 0; i < at.count; i++) { arr[i * at.itemSize] = at.getX(i); if (at.itemSize > 1) arr[i * at.itemSize + 1] = at.getY(i); if (at.itemSize > 2) arr[i * at.itemSize + 2] = at.getZ(i); if (at.itemSize > 3) arr[i * at.itemSize + 3] = at.getW(i); }
      geo.setAttribute(name, new THREE.BufferAttribute(arr, at.itemSize));
    }
  }
  return geo;
}

export class Assets {
  constructor() {
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.nodes = new Map();      // name -> Object3D (top level nodes of every pack)
    this.anims = new Map();      // pack file -> clips
    this.texCache = new Map();
  }

  async loadPack(url, onProgress) {
    const buf = await fetchProgress(url, onProgress);
    const gltf = await new Promise((res, rej) => this.loader.parse(buf, url.replace(/[^/]*$/, ''), res, rej));
    gltf.scene.updateMatrixWorld(true);
    for (const child of gltf.scene.children) this.nodes.set(child.name, child);
    this.anims.set(url, gltf.animations || []);
    return gltf;
  }

  has(id) { return this.nodes.has(id); }

  // rigged characters live in their own GLB each; the first call prepares the shared geometry (floats)
  async loadCharacter(name, url, onProgress) {
    const buf = await fetchProgress(url, onProgress);
    const gltf = await new Promise((res, rej) => this.loader.parse(buf, url.replace(/[^/]*$/, ''), res, rej));
    this.chars = this.chars || {};
    this.chars[name] = { scene: gltf.scene, clips: gltf.animations, ready: false, url };
    return gltf;
  }
  character(name, opts = {}) {
    const src = this.chars[name]; if (!src) throw new Error('missing character ' + name);
    if (!src.ready) {
      // remember each skinned mesh's texture / colour by traversal order (Object3D.clone JSON-copies userData, which would destroy a Texture)
      src.info = [];
      src.scene.traverse((o) => {
        if (!o.isSkinnedMesh) return;
        const g = floatize(o.geometry.clone());
        src.info.push({ map: o.material && o.material.map ? this._texture(o.material.map) : null, vc: !!g.attributes.color, baseColor: o.material && o.material.color ? o.material.color.clone() : new THREE.Color(1, 1, 1) });
        o.geometry = g; o.frustumCulled = false;
      });
      src.ready = true;
    }
    const obj = SkeletonUtils.clone(src.scene);
    let ix = 0;
    obj.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const inf = src.info[ix++];
      const mat = farmMaterial({ map: inf.map, vertexColors: inf.vc, tint: opts.tint, spec: opts.spec != null ? opts.spec : 0.1, rough: opts.rough != null ? opts.rough : 0.75 });
      if (!inf.map && !inf.vc) mat.uniforms.uTint.value.copy(inf.baseColor);
      o.material = mat; o.frustumCulled = false; if (opts.cast !== false) o.layers.enable(SHADOW_LAYER);
    });
    // measure the skinned pose, not the bind pose (Meshy rigs carry a 100x bone scale that the raw mesh bounds hide)
    obj.updateMatrixWorld(true);
    obj.traverse((o) => { if (o.isSkinnedMesh) { o.skeleton.update(); o.boundingBox = null; o.computeBoundingBox(); } });
    const box = new THREE.Box3().setFromObject(obj);
    // skinned bounds come from the bind pose; good enough to size the character
    const size = box.getSize(new THREE.Vector3());
    const h = opts.height || size.y, s = h / (size.y || 1);
    const wrap = new THREE.Group(); obj.scale.setScalar(s); obj.position.y = -box.min.y * s; wrap.add(obj);
    const mixer = new THREE.AnimationMixer(obj), actions = {};
    for (const c of src.clips) { actions[c.name] = mixer.clipAction(c); }
    return { group: wrap, obj, mixer, actions, scale: s, size: size.multiplyScalar(s) };
  }

  // A finished model: { group, body, parts:{name:mesh}, box, size }. opts.width / opts.height scale it to
  // a size in world units (one is enough); opts.yaw turns it; opts.tint/hue tweak colour.
  model(id, opts = {}) {
    const node = this.nodes.get(id);
    if (!node) throw new Error('missing model ' + id);
    const group = new THREE.Group(); group.name = id;
    const parts = {}; let body = null;
    node.updateMatrixWorld(true);
    const rootInv = new THREE.Matrix4().copy(node.matrixWorld).invert();
    node.traverse((o) => {
      if (!o.isMesh) return;
      const isBody = /_body$/.test(o.name) || o === node;
      const rel = new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld);
      let geo = floatize(o.geometry.clone());
      if (!isBody) {
        // part: keep its own origin so code can spin it; bake only rotation/scale, translation goes on the mesh
        geo.applyMatrix4(rel); geo.computeBoundingBox();
        const c = geo.boundingBox.getCenter(new THREE.Vector3());
        geo.translate(-c.x, -c.y, -c.z);
        const mesh = new THREE.Mesh(geo, this._material(o, geo, opts));
        mesh.position.copy(c); mesh.name = o.name; mesh.frustumCulled = false; if (opts.cast !== false) mesh.layers.enable(SHADOW_LAYER);
        parts[o.name.replace(id + '_', '')] = mesh;
        group.add(mesh);
        return;
      }
      geo.applyMatrix4(rel);
      const mat = this._material(o, geo, opts);
      body = new THREE.Mesh(geo, mat); body.name = id + '_body'; group.add(body); if (opts.cast !== false) body.layers.enable(SHADOW_LAYER);
    });
    // scale into world units
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    let s = 1;
    if (opts.height) s = opts.height / size.y; else if (opts.width) s = opts.width / Math.max(size.x, size.z); else if (opts.long) s = opts.long / Math.max(size.x, size.y, size.z); else if (opts.scale) s = opts.scale;
    const wrap = new THREE.Group(); wrap.name = id + '_root';
    group.scale.setScalar(s); group.rotation.y = opts.yaw || 0;
    wrap.add(group);
    // sit on the ground, centred on x/z
    group.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(group), cc = b2.getCenter(new THREE.Vector3());
    group.position.set(-cc.x, -b2.min.y, -cc.z);
    wrap.updateMatrixWorld(true);
    const fin = new THREE.Box3().setFromObject(wrap);
    return { group: wrap, body, parts, box: fin, size: fin.getSize(new THREE.Vector3()), scale: s, inner: group };
  }

  // An InstancedMesh of one model, sized like model(); capacity copies at most.
  instanced(id, opts, cap) {
    const m = this.model(id, opts);
    m.group.updateMatrixWorld(true);
    let geo = null, mat = null;
    m.group.traverse((o) => { if (o.isMesh && !geo) { geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld); mat = o.material; } });
    const im = new THREE.InstancedMesh(geo, mat, cap);
    im.count = 0; im.frustumCulled = false; if (opts.cast !== false) im.layers.enable(SHADOW_LAYER);
    im.userData.size = m.size;
    return im;
  }

  // Raw geometry baked into world-of-model space (for instancing many copies)
  bakedGeometry(id, opts = {}) {
    const m = this.model(id, opts);
    m.group.updateMatrixWorld(true);
    const geos = [];
    m.group.traverse((o) => { if (o.isMesh) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); geos.push(g); } });
    return { geometry: geos[0], material: m.body ? m.body.material : null, size: m.size };
  }

  _texture(map) {
    if (!map) return null;
    if (this.texCache.has(map.uuid)) return this.texCache.get(map.uuid);
    map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; map.needsUpdate = true;
    this.texCache.set(map.uuid, map); return map;
  }

  _material(srcMesh, geo, opts) {
    const src = Array.isArray(srcMesh.material) ? srcMesh.material[0] : srcMesh.material;
    const map = src && src.map ? this._texture(src.map) : null;
    const hasVC = !!geo.attributes.color;
    const skinned = !!srcMesh.isSkinnedMesh;
    const mat = farmMaterial({ map, vertexColors: hasVC, anim: !!opts.anim, tint: opts.tint, spec: opts.spec, rough: opts.rough, alphaTest: src && src.alphaTest > 0, doubleSided: opts.doubleSided });
    if (!map && !hasVC && src && src.color) mat.uniforms.uTint.value.copy(src.color).multiply(new THREE.Color(opts.tint != null ? opts.tint : 0xffffff));
    if (opts.hue) mat.uniforms.uHue.value = opts.hue;
    if (opts.emissive) mat.uniforms.uEmis.value.set(opts.emissive);
    return mat;
  }
}

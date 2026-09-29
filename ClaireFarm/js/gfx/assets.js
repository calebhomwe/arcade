// Loads the GLB packs, turns their meshes into toon-shaded models (with an ink outline in the same
// draw call), and hands out clones. Everything is fetched with real progress for the splash bar.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { farmMaterial } from './shaders.js';

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

// Smooth per-vertex normals merged across seams, used to push the outline shell outwards evenly.
function smoothNormals(geo) {
  const pos = geo.attributes.position, idx = geo.index;
  const n = pos.count, acc = new Float32Array(n * 3), key = new Map(), rep = new Uint32Array(n);
  const q = 1e4;
  for (let i = 0; i < n; i++) {
    const k = Math.round(pos.getX(i) * q) + ',' + Math.round(pos.getY(i) * q) + ',' + Math.round(pos.getZ(i) * q);
    let r = key.get(k); if (r === undefined) { r = i; key.set(k, r); } rep[i] = r;
  }
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const tri = idx ? idx.count / 3 : n / 3;
  for (let t = 0; t < tri; t++) {
    const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    e1.subVectors(b, a); e2.subVectors(c, a); e1.cross(e2); // area weighted
    for (const i of [i0, i1, i2]) { const r = rep[i] * 3; acc[r] += e1.x; acc[r + 1] += e1.y; acc[r + 2] += e1.z; }
  }
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = rep[i] * 3; let x = acc[r], y = acc[r + 1], z = acc[r + 2]; const l = Math.hypot(x, y, z) || 1;
    out[i * 3] = x / l; out[i * 3 + 1] = y / l; out[i * 3 + 2] = z / l;
  }
  return out;
}

// original triangles first, then a reversed-winding copy flagged aShell=1 (drawn as the ink outline)
export function addOutlineShell(geo) {
  const n = geo.attributes.position.count;
  const src = geo.index ? geo.index.array : null;
  const idx = new Uint32Array(src ? src.length * 2 : n * 2);
  const baseCount = src ? src.length : n;
  for (let i = 0; i < baseCount; i++) idx[i] = src ? src[i] : i;
  for (let t = 0; t < baseCount; t += 3) { idx[baseCount + t] = (src ? src[t] : t) + n; idx[baseCount + t + 1] = (src ? src[t + 2] : t + 2) + n; idx[baseCount + t + 2] = (src ? src[t + 1] : t + 1) + n; }
  const g = new THREE.BufferGeometry();
  for (const name of Object.keys(geo.attributes)) {
    const at = geo.attributes[name], sz = at.itemSize, Arr = at.array.constructor;
    const arr = new Arr(n * 2 * sz);
    if (at.isInterleavedBufferAttribute || at.normalized) { for (let i = 0; i < n; i++) for (let k = 0; k < sz; k++) { const v = [at.getX, at.getY, at.getZ, at.getW][k].call(at, i); arr[i * sz + k] = v; arr[(n + i) * sz + k] = v; } }
    else { arr.set(at.array.subarray(0, n * sz), 0); arr.set(at.array.subarray(0, n * sz), n * sz); }
    g.setAttribute(name, new THREE.BufferAttribute(arr, sz, at.normalized));
  }
  const on = smoothNormals(geo);
  const outN = new Float32Array(n * 6); outN.set(on, 0); outN.set(on, n * 3);
  g.setAttribute('aOutN', new THREE.BufferAttribute(outN, 3));
  const sh = new Float32Array(n * 2); sh.fill(1, n); g.setAttribute('aShell', new THREE.BufferAttribute(sh, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.userData.baseIndexCount = baseCount;
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
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
    this.shellOn = true;
    this.models = [];            // every model we built, so outlines can be toggled with quality
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

  // A finished model: { group, body, parts:{name:mesh}, box, size }. opts.width / opts.height scale it to
  // a size in world units (one is enough); opts.shell adds the outline; opts.yaw turns it; opts.tint/hue tweak colour.
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
        const mesh = new THREE.Mesh(geo, this._material(o, geo, opts, false));
        mesh.position.copy(c); mesh.name = o.name; mesh.frustumCulled = false;
        parts[o.name.replace(id + '_', '')] = mesh;
        group.add(mesh);
        return;
      }
      geo.applyMatrix4(rel);
      const shell = !!opts.shell;
      if (shell) geo = addOutlineShell(geo);
      const mat = this._material(o, geo, opts, !!shell);
      body = new THREE.Mesh(geo, mat); body.name = id + '_body'; group.add(body);
      if (shell) this.models.push(body);
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

  // An InstancedMesh of one model (outline included), sized like model(); capacity copies at most.
  instanced(id, opts, cap) {
    const m = this.model(id, Object.assign({}, opts, { shell: opts.shell !== false }));
    m.group.updateMatrixWorld(true);
    let geo = null, mat = null;
    m.group.traverse((o) => { if (o.isMesh && !geo) { geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld); mat = o.material; } });
    const im = new THREE.InstancedMesh(geo, mat, cap);
    im.count = 0; im.frustumCulled = false;
    if (geo.userData.baseIndexCount === undefined && geo.attributes.aShell) geo.userData.baseIndexCount = geo.index.count / 2;
    if (geo.userData.baseIndexCount) this.models.push(im);
    im.userData.size = m.size;
    return im;
  }

  // Raw geometry baked into world-of-model space (for instancing many copies)
  bakedGeometry(id, opts = {}) {
    const m = this.model(id, Object.assign({}, opts, { shell: false }));
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

  _material(srcMesh, geo, opts, shell) {
    const src = Array.isArray(srcMesh.material) ? srcMesh.material[0] : srcMesh.material;
    const map = src && src.map ? this._texture(src.map) : null;
    const hasVC = !!geo.attributes.color;
    const skinned = !!srcMesh.isSkinnedMesh;
    const mat = farmMaterial({ map, vertexColors: hasVC, shell, anim: !!opts.anim, tint: opts.tint, rim: opts.rim, alphaTest: src && src.alphaTest > 0, doubleSided: opts.doubleSided });
    if (!map && !hasVC && src && src.color) mat.uniforms.uTint.value.copy(src.color).multiply(new THREE.Color(opts.tint != null ? opts.tint : 0xffffff));
    if (opts.hue) mat.uniforms.uHue.value = opts.hue;
    if (opts.emissive) mat.uniforms.uEmis.value.set(opts.emissive);
    return mat;
  }

  setOutlines(on) {
    this.shellOn = on;
    for (const m of this.models) {
      const g = m.geometry, base = g.userData.baseIndexCount;
      if (base) g.setDrawRange(0, on ? Infinity : base);
    }
  }
}

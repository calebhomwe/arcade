// Asset loading with a progress callback. Everything is served locally.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/jsm/loaders/GLTFLoader.js';

export async function loadAll(renderer, onProgress) {
  const manager = new THREE.LoadingManager();
  manager.onProgress = (url, done, total) => onProgress && onProgress(done / total);
  const tl = new THREE.TextureLoader(manager);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const tex = (url, srgb, repeat = true) => new Promise((res, rej) => tl.load(url, t => {
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = aniso;
    res(t);
  }, undefined, rej));
  const json = (url) => fetch(url).then(r => r.json());
  const gltf = (url) => new Promise((res, rej) => new GLTFLoader(manager).load(url, res, undefined, rej));

  const [snowD, snowN, windN, rockD, rockN, sky, treeA, treeN, treeMeta, rider, boulder] = await Promise.all([
    tex('assets/tex/snow_02_diffuse_1k.jpg', true),
    tex('assets/tex/snow_02_nor_gl_1k.jpg', false),
    tex('assets/tex/snow_01_nor_gl_1k.jpg', false),
    tex('assets/tex/dark_rock_diffuse_1k.jpg', true),
    tex('assets/tex/dark_rock_nor_gl_1k.jpg', false),
    tex('assets/hdri/sky_4k.jpg', false),
    tex('assets/trees/conifers_albedo.webp', false, false),
    tex('assets/trees/conifers_normal.webp', false, false),
    json('assets/trees/conifers_meta.json'),
    gltf('assets/models/rider/rider.gltf'),
    gltf('assets/models/boulder/boulder_01.gltf'),
  ]);
  for (const t of [treeA, treeN]) { t.anisotropy = 1; t.generateMipmaps = true; }
  return { snowD, snowN, windN, rockD, rockN, sky, treeA, treeN, treeMeta, rider, boulder };
}


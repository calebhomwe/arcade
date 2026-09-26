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
  const json = (url) => fetch(url).then(r => {if(!r.ok)throw new Error(url+' HTTP '+r.status);return r.json();});
  const gltf = (url) => new Promise((res, rej) => new GLTFLoader(manager).load(url, res, undefined, rej));

  const pending=new Set();
  const track=(url,p)=>{pending.add(url);window.__assetLoads=pending;let timer;return Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Timed out loading '+url)),45000);})]).finally(()=>{clearTimeout(timer);pending.delete(url);});};
  const texture=tex,model=gltf;
  const loadTex=(url,...args)=>track(url,texture(url,...args));
  const loadModel=url=>track(url,model(url));
  const [snowD, snowN, windN, rockD, rockN, sky, treeA, treeN, treeMeta, rider, boulder] = await Promise.all([
    loadTex('assets/tex/snow_02_diffuse_1k.jpg', true),
    loadTex('assets/tex/snow_02_nor_gl_1k.jpg', false),
    loadTex('assets/tex/snow_01_nor_gl_1k.jpg', false),
    loadTex('assets/tex/dark_rock_diffuse_1k.jpg', true),
    loadTex('assets/tex/dark_rock_nor_gl_1k.jpg', false),
    loadTex('assets/hdri/sky_4k.jpg', false),
    loadTex('assets/trees/conifers_albedo.webp', false, false),
    loadTex('assets/trees/conifers_normal.webp', false, false),
    track('tree metadata',json('assets/trees/conifers_meta.json')),
    loadModel('assets/models/rider/rider.gltf'),
    loadModel('assets/models/boulder/boulder_01.gltf'),
  ]);
  for (const t of [treeA, treeN]) { t.anisotropy = 1; t.generateMipmaps = true; }
  return { snowD, snowN, windN, rockD, rockN, sky, treeA, treeN, treeMeta, rider, boulder };
}


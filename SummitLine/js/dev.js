// Development harness: renders stills of the world/rider for look-dev.
// Usage: index-dev.html?cam=x,y,z,tx,ty,tz&rider=s,v
import * as THREE from 'three';
import { loadAll } from './assets.js';
import { World } from './world.js';
import { PRESETS } from './quality.js';
import { Rider, PALETTES } from './rider.js';
import { heightAt, centerX, normalAt } from './course.js';

const qs = new URLSearchParams(location.search);
const q = PRESETS[qs.get('q') || 'medium'];
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = parseFloat(qs.get('exp') || '1.0');
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(parseFloat(qs.get('fov') || '55'), innerWidth / innerHeight, 0.3, 60000);
window.__ready = false;
(async () => {
  await document.fonts.load("italic 800 40px 'Barlow Condensed'");
  const assets = await loadAll(renderer);
  const world = new World(renderer, q);
  await world.build(assets);
  const rs = (qs.get('rider') || '60,0').split(',').map(Number);
  const rider = new Rider(assets.rider, PALETTES[qs.get('pal') || 'player']);
  const x = centerX(rs[0]) + rs[1], z = -rs[0];
  const y = heightAt(x, z);
  rider.root.position.set(x, y, z);
  const n = normalAt(x, z, new THREE.Vector3());
  // heading down the fall line (-z), board nose = travel direction
  const heading = parseFloat(qs.get('head') || '0');
  const fwd = new THREE.Vector3(Math.sin(heading), 0, -Math.cos(heading));
  const right = new THREE.Vector3().crossVectors(fwd, n).normalize();
  const f2 = new THREE.Vector3().crossVectors(n, right).normalize();
  const m = new THREE.Matrix4().makeBasis(f2, n, right);
  rider.root.quaternion.setFromRotationMatrix(m);
  Object.assign(rider.pose, JSON.parse(qs.get('pose') || '{}'));
  world.scene.add(rider.root);
  rider.applyPose(0.016);
  world.follow(rider.root.position);
  const c = (qs.get('cam') || '').split(',').map(Number);
  if (c.length === 6) { camera.position.set(x + c[0], y + c[1], z + c[2]); camera.lookAt(x + c[3], y + c[4], z + c[5]); }
  else { camera.position.set(x + 3, y + 1.6, z + 5); camera.lookAt(x, y + 0.9, z); }
  renderer.render(world.scene, camera);
  renderer.render(world.scene, camera);
  window.__ready = true;
  window.__world = world; window.__rider = rider; window.__cam = camera; window.__r = renderer;
  window.__render = () => renderer.render(world.scene, camera);
  window.__perf = () => {
    const gl = renderer.getContext();
    const px = new Uint8Array(4);
    const t = (label) => { const t0 = performance.now(); renderer.render(world.scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return label + ':' + Math.round(performance.now() - t0); };
    const out = [t('all'), t('all2')];
    world.forest.group.visible = false; out.push(t('noTrees'));
    world.massif.visible = false; world.panorama.visible = false; out.push(t('noMassif'));
    renderer.shadowMap.enabled = false; world.sun.castShadow = false; out.push(t('noShadow'));
    world.ribbon.visible = false; out.push(t('noRibbon'));
    world.ribbon.visible = true; out.push(t('again'));
    const plain = new THREE.MeshStandardMaterial({ color: 0xffffff });
    world.ribbon.children.forEach(m => m.material = plain); out.push(t('plainStd')); out.push(t('plainStd2'));
    const basic = new THREE.MeshBasicMaterial({ color: 0xffffff });
    world.ribbon.children.forEach(m => m.material = basic); out.push(t('basic'));
    out.push('verts:' + world.ribbon.children.reduce((a, m) => a + m.geometry.attributes.position.count, 0));
    return out.join(' ');
  };
  window.__view = (c, riderS, pose) => {
    if (riderS) {
      const x = centerX(riderS[0]) + riderS[1], z = -riderS[0], y = heightAt(x, z);
      rider.root.position.set(x, y, z);
      const n = normalAt(x, z, new THREE.Vector3());
      const fwd = new THREE.Vector3(Math.sin(heading), 0, -Math.cos(heading));
      const right = new THREE.Vector3().crossVectors(fwd, n).normalize();
      const f2 = new THREE.Vector3().crossVectors(n, right).normalize();
      rider.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f2, n, right));
      world.follow(rider.root.position);
    }
    if (pose) Object.assign(rider.pose, pose);
    rider.applyPose(0.016);
    const p = rider.root.position;
    camera.position.set(p.x + c[0], p.y + c[1], p.z + c[2]); camera.lookAt(p.x + c[3], p.y + c[4], p.z + c[5]);
    renderer.render(world.scene, camera);
    return true;
  };
})().catch(e => { console.error(e); document.title = 'ERR ' + e.message; });


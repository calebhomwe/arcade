// Course furniture: rails, start gate, inflatable finish arch, piste poles,
// race banners, safety netting and boulders.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/jsm/loaders/GLTFLoader.js';
import { heightAt, normalAt, centerX, halfWidth, RAILS, KICKERS, LENGTH, railEnds } from './course.js';
import { makeRng, smoothstep } from './noise.js';

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}

export const BRAND = 'SUMMIT LINE';

function bannerTex(text, sub, bg = '#0d2a52', fg = '#ffffff', accent = '#ff5a1f') {
  return canvasTex(1024, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, bg); grd.addColorStop(1, shade(bg, -0.25));
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = accent; g.fillRect(0, h - 26, w, 26); g.fillRect(0, 0, w, 10);
    g.fillStyle = fg;
    g.font = "italic 800 124px 'Barlow Condensed', sans-serif";
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h * 0.44);
    if (sub) { g.font = "600 34px 'Barlow Condensed', sans-serif"; g.globalAlpha = 0.85; g.fillText(sub, w / 2, h * 0.78); g.globalAlpha = 1; }
  });
}
function shade(hex, k) {
  const c = new THREE.Color(hex); c.multiplyScalar(1 + k); return '#' + c.getHexString();
}

export function buildProps(scene, assets, q) {
  const out = { rails: [], group: new THREE.Group(), boulders: [] };
  scene.add(out.group);
  const G = out.group;
  const steel = new THREE.MeshStandardMaterial({ color: 0xd8dde3, metalness: 1.0, roughness: 0.22 });
  const paint = new THREE.MeshStandardMaterial({ color: 0x1c2733, metalness: 0.4, roughness: 0.5 });
  const nrm = new THREE.Vector3();

  // ---- rails -------------------------------------------------------------
  for (const r of RAILS) {
    const e = railEnds(r);
    const a = new THREE.Vector3(e.x0, e.y0, e.z0), b = new THREE.Vector3(e.x1, e.y1, e.z1);
    const len = a.distanceTo(b);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 16, 1), steel);
    bar.position.copy(a).lerp(b, 0.5);
    bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    bar.castShadow = true; G.add(bar);
    // end caps: kinked-down entry ramp piece
    const n = Math.max(3, Math.round(len / 4));
    for (let i = 0; i <= n; i++) {
      const p = a.clone().lerp(b, i / n);
      const gy = heightAt(p.x, p.z);
      const hgt = p.y - gy;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, hgt + 0.3, 0.08), paint);
      post.position.set(p.x, gy + (hgt - 0.3) / 2, p.z);
      post.castShadow = true; G.add(post);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.25), paint);
      foot.position.set(p.x, gy - 0.02, p.z); foot.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      G.add(foot);
    }
    out.rails.push({ a, b, len, def: r });
  }

  // ---- kicker dye lines (painted take-off lip, transition line, side edges)
  const dye = new THREE.MeshStandardMaterial({ color: 0x0b3fd6, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const strip = (pts, width) => {
    // pts: [[x,z],...] centre line; ribbon of given width draped on the terrain
    const pos = [], idx = [];
    for (let i = 0; i < pts.length; i++) {
      const [x, z] = pts[i];
      const [x2, z2] = pts[Math.min(pts.length - 1, i + 1)], [x0, z0] = pts[Math.max(0, i - 1)];
      let dx = x2 - x0, dz = z2 - z0; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const sx = -dz * width / 2, sz = dx * width / 2;
      pos.push(x + sx, heightAt(x + sx, z + sz) + 0.025, z + sz, x - sx, heightAt(x - sx, z - sz) + 0.025, z - sz);
      if (i) { const a = i * 2 - 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, dye); m.receiveShadow = true; G.add(m);
  };
  for (const kk of KICKERS) {
    const across = (ds) => { const s = kk.s + ds, c = centerX(s) + kk.v; const pts = []; for (let v = -kk.w + 1.2; v <= kk.w - 1.2 + 1e-6; v += 0.5) pts.push([c + v, -s]); return pts; };
    strip(across(-0.45), 0.35);
    strip(across(-kk.len * 0.7), 0.25);
    for (const side of [-1, 1]) {
      const pts = []; for (let ds = -kk.len + 0.5; ds <= -0.3; ds += 0.4) { const s = kk.s + ds; pts.push([centerX(s) + kk.v + side * (kk.w - 1.5), -s]); }
      strip(pts, 0.2);
    }
  }

  // ---- piste marker poles (instanced) -----------------------------------
  const poleTex = canvasTex(32, 256, (g, w, h) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f4f4f4' : '#d4151c'; g.fillRect(0, i * h / 8, w, h / 8); }
  });
  const poleGeo = new THREE.CylinderGeometry(0.035, 0.04, 2.0, 8, 1).translate(0, 1.0, 0);
  const poleMat = new THREE.MeshStandardMaterial({ map: poleTex, roughness: 0.5 });
  const poles = [];
  for (let s = 20; s < LENGTH; s += 32) {
    for (const side of [-1, 1]) {
      const W = halfWidth(s);
      const x = centerX(s) + side * (W + 1.5), z = -s;
      poles.push(new THREE.Vector3(x, heightAt(x, z) - 0.2, z));
    }
  }
  const poleMesh = new THREE.InstancedMesh(poleGeo, poleMat, poles.length);
  const m4 = new THREE.Matrix4();
  poles.forEach((p, i) => { m4.makeTranslation(p.x, p.y, p.z); poleMesh.setMatrixAt(i, m4); });
  poleMesh.castShadow = true; G.add(poleMesh);

  // ---- start gate -----------------------------------------------------------
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.8 });
  const startBanner = new THREE.MeshStandardMaterial({ map: bannerTex('START', BRAND + '  ·  ALPINE DOWNHILL SERIES'), roughness: 0.7 });
  {
    const s = 8, cx = centerX(s), z = -s, y = heightAt(cx, z);
    const span = 9;
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.4, 0.35), wood);
      post.position.set(cx + side * span / 2, y + 2.2 - 0.3, z); post.castShadow = true; G.add(post);
    }
    const ban = new THREE.Mesh(new THREE.BoxGeometry(span + 0.6, 1.3, 0.12), [paint, paint, paint, paint, startBanner, startBanner]);
    ban.position.set(cx, y + 3.9, z); ban.castShadow = true; G.add(ban);
  }

  // ---- inflatable finish arch --------------------------------------------
  {
    const s = LENGTH, cx = centerX(s), z = -s, y = heightAt(cx, z);
    const W = 2 * halfWidth(s) * 0.62;
    const curve = new THREE.CatmullRomCurve3([...Array(25)].map((_, i) => {
      const t = i / 24, a = Math.PI * t;
      return new THREE.Vector3(cx - Math.cos(a) * W / 2, y - 0.8 + Math.sin(a) * 9.5, z);
    }));
    const archTex = canvasTex(2048, 256, (g, w, h) => {
      g.fillStyle = '#e8401c'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff';
      g.font = "italic 800 150px 'Barlow Condensed', sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let i = 0; i < 3; i++) { g.save(); g.translate(w * (i + 0.5) / 3, h / 2); g.fillText(i === 1 ? 'FINISH' : BRAND, 0, 0); g.restore(); }
      g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 24; i++) g.fillRect(i * w / 24, 0, 3, h);
    });
    archTex.wrapT = THREE.RepeatWrapping;
    archTex.rotation = 0;
    const geo = new THREE.TubeGeometry(curve, 96, 1.05, 24, false);
    // put the text band on the outward (camera-facing, +z) side
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 2.0 + 0.75);
    archTex.wrapS = THREE.ClampToEdgeWrapping;
    const archMat = new THREE.MeshStandardMaterial({ map: archTex, roughness: 0.55, color: 0xffffff });
    const arch = new THREE.Mesh(geo, archMat);
    arch.castShadow = true; G.add(arch);
    out.finishArch = arch;
  }

  // ---- A-frame race banners along the final stretch + at kickers ----------
  const bannerMats = [
    new THREE.MeshStandardMaterial({ map: bannerTex(BRAND, 'ALPINE DOWNHILL SERIES · ROUND 3'), roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ map: bannerTex('AIGUILLE NOIRE', 'ELEV. 2,860 M  ·  RED RUN 7', '#f4f6f8', '#10233f', '#1f6fff'), roughness: 0.75 }),
  ];
  const panelGeo = new THREE.BoxGeometry(4, 1.0, 0.05);
  const placeBanner = (s, side, k) => {
    const W = halfWidth(s);
    const x = centerX(s) + side * (W + 3.2), z = -s;
    const y = heightAt(x, z);
    const m = new THREE.Mesh(panelGeo, [paint, paint, paint, paint, bannerMats[k % 2], bannerMats[k % 2]]);
    m.position.set(x, y + 0.55, z);
    const dx = Math.atan((centerX(s + 1) - centerX(s - 1)) / 2);
    m.rotation.y = Math.PI / 2 - dx; m.rotation.z = 0;
    m.rotation.order = 'YXZ'; m.rotation.x = -0.25 * side;
    m.castShadow = true; G.add(m);
  };
  let k = 0;
  for (let s = LENGTH - 180; s < LENGTH + 20; s += 4.4) { placeBanner(s, -1, k); placeBanner(s, 1, k + 1); k++; }
  for (const kk of KICKERS) for (let s = kk.s - 16; s < kk.s + 26; s += 4.4) { placeBanner(s, -1, k++); }

  // ---- orange safety netting on the outside of the big landings ---------
  const netTex = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#ff6a13'; g.lineWidth = 7;
    for (let i = -w; i < w * 2; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); }
    g.fillStyle = '#ff6a13'; g.fillRect(0, 0, w, 14);
  });
  netTex.wrapS = THREE.RepeatWrapping;
  const netMat = new THREE.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.8 });
  for (const kk of KICKERS) {
    for (const side of [1]) {
      const pts = [];
      for (let s = kk.s + 4; s <= kk.s + 60; s += 4) {
        const x = centerX(s) + side * (halfWidth(s) + 5.5), z = -s;
        pts.push(new THREE.Vector3(x, heightAt(x, z), z));
      }
      const pos = [], uvs = [], idx = [];
      pts.forEach((p, i) => { pos.push(p.x, p.y - 0.2, p.z, p.x, p.y + 1.6, p.z); uvs.push(i * 0.6, 0, i * 0.6, 1); if (i) { const a = i * 2 - 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
      const gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); gg.setIndex(idx); gg.computeVertexNormals();
      G.add(new THREE.Mesh(gg, netMat));
    }
  }

  // ---- boulders off the piste ---------------------------------------------
  const b = assets.boulder;
  if (b) {
    let bm = null; b.scene.traverse(o => { if (o.isMesh && !bm) bm = o; });
    const bmat = bm.material; bmat.envMapIntensity = 0.8;
    const rng = makeRng(5);
    const list = [];
    for (let i = 0; i < q.boulders; i++) {
      const s = 30 + rng() * (LENGTH + 100);
      const side = rng() < 0.5 ? -1 : 1;
      const d = halfWidth(s) + 6 + rng() * 60;
      const x = centerX(s) + side * d, z = -s;
      const sc = 0.8 + rng() * 2.6;
      list.push({ x, z, y: heightAt(x, z) - 0.35 * sc, sc, ry: rng() * 6.28, r: 0.85 * sc });
    }
    const inst = new THREE.InstancedMesh(bm.geometry, bmat, list.length);
    const qn = new THREE.Quaternion(), e = new THREE.Euler();
    list.forEach((o, i) => {
      e.set((rng() - 0.5) * 0.4, o.ry, (rng() - 0.5) * 0.4);
      m4.compose(new THREE.Vector3(o.x, o.y, o.z), qn.setFromEuler(e), new THREE.Vector3(o.sc, o.sc * (0.7 + rng() * 0.5), o.sc));
      inst.setMatrixAt(i, m4);
    });
    inst.castShadow = true; inst.receiveShadow = true;
    G.add(inst);
    out.boulders = list;
  }
  return out;
}


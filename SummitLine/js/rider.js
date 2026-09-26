// Snowboarder: Quaternius base body dressed in procedural outerwear (baggy
// jacket and pants, gloves, boots, helmet, mirrored goggles), a shaped board,
// and a procedural IK pose driven by the physics state.
import * as THREE from 'three';
import * as SkeletonUtils from '../vendor/three/jsm/utils/SkeletonUtils.js';

export const PALETTES = {
  player: { jacket: 0xff5a1f, jacket2: 0x16213a, pants: 0x1f2a3a, glove: 0x14161a, boot: 0x2a2d33, helmet: 0xf2f4f7, lens: 0xff8a1a, board: ['#0d2a52', '#ff5a1f', '#ffb400'], gaiter: 0x2a3a52 },
  kaya: { jacket: 0x16b3a8, jacket2: 0xf2f2f2, pants: 0xe9e6df, glove: 0x222222, boot: 0x3a3f46, helmet: 0x1a1d22, lens: 0x2f8cff, board: ['#f4f4f4', '#16b3a8', '#0b1a30'], gaiter: 0x16b3a8 },
  mac: { jacket: 0xd41f3a, jacket2: 0x101218, pants: 0x3b4a33, glove: 0x1c1c1c, boot: 0x2b2b2b, helmet: 0xd41f3a, lens: 0xc0c8d0, board: ['#101218', '#d41f3a', '#f2f2f2'], gaiter: 0x101218 },
  elise: { jacket: 0x7a4dff, jacket2: 0xffd35a, pants: 0x14161c, glove: 0xf0f0f0, boot: 0x404550, helmet: 0xffffff, lens: 0xff3d9a, board: ['#7a4dff', '#ffd35a', '#ffffff'], gaiter: 0x7a4dff },
};

const ZONE = { skin: 0, jacket: 1, pants: 2, glove: 3, boot: 4, gaiter: 5 };

function boneZone(name, y) {
  if (/^(hand|index|middle|pinky|ring|thumb)/.test(name)) return ZONE.glove;
  if (/^(foot|ball)/.test(name)) return ZONE.boot;
  if (/^(thigh|calf)/.test(name)) return ZONE.pants;
  if (name === 'pelvis') return y > 0.93 ? ZONE.jacket : ZONE.pants;
  if (/^(spine|clavicle|upperarm|lowerarm)/.test(name)) return ZONE.jacket;
  if (name === 'neck_01') return ZONE.gaiter;
  if (name === 'Head') return y < 1.575 ? ZONE.gaiter : ZONE.skin;
  return ZONE.jacket;
}

function dressGeometry(mesh) {
  const g = mesh.geometry;
  const bones = mesh.skeleton.bones;
  const si = g.attributes.skinIndex, sw = g.attributes.skinWeight, pos = g.attributes.position;
  const n = pos.count;
  const zone = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let best = 0, bw = -1;
    for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
    let z = boneZone(bones[best].name, pos.getY(i));
    // jacket sleeves end at the wrist; boots start just above the ankle
    if (z === ZONE.pants && pos.getY(i) < 0.2) z = ZONE.boot;
    zone[i] = z;
  }
  g.setAttribute('zone', new THREE.BufferAttribute(zone, 1));
}

function outerwearMaterial(base, pal) {
  const m = new THREE.MeshStandardMaterial({ map: base.map, normalMap: base.normalMap, roughness: 0.8, metalness: 0 });
  const u = {
    cJacket: { value: new THREE.Color(pal.jacket) }, cJacket2: { value: new THREE.Color(pal.jacket2) },
    cPants: { value: new THREE.Color(pal.pants) }, cGlove: { value: new THREE.Color(pal.glove) },
    cBoot: { value: new THREE.Color(pal.boot) }, cGaiter: { value: new THREE.Color(pal.gaiter) },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute float zone; varying float vZone; varying vec3 vBind;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vZone = zone; vBind = position;
float infl = 0.0;
if (zone > 0.5 && zone < 1.5) infl = 0.020 + 0.008 * smoothstep(1.05, 1.35, position.y);
else if (zone > 1.5 && zone < 2.5) infl = 0.026 + 0.008 * smoothstep(0.45, 0.75, position.y);
else if (zone > 2.5 && zone < 3.5) infl = 0.010;
else if (zone > 3.5 && zone < 4.5) infl = 0.030;
else if (zone > 4.5) infl = 0.018;
// soft fabric folds
infl += 0.006 * sin(position.y * 55.0 + position.x * 20.0) * step(0.5, zone) * step(zone, 2.5);
transformed += objectNormal * infl;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 cJacket; uniform vec3 cJacket2; uniform vec3 cPants; uniform vec3 cGlove; uniform vec3 cBoot; uniform vec3 cGaiter;
varying float vZone; varying vec3 vBind;
float fh(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(fh(i),fh(i+vec3(1,0,0)),f.x), mix(fh(i+vec3(0,1,0)),fh(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(fh(i+vec3(0,0,1)),fh(i+vec3(1,0,1)),f.x), mix(fh(i+vec3(0,1,1)),fh(i+vec3(1,1,1)),f.x),f.y), f.z); }
float gFabric; float gZoneRough;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
  gFabric = 0.0; gZoneRough = 0.8;
  vec3 b = vBind;
  float ax = abs(b.x);
  if (vZone > 0.5) {
    vec3 c;
    float wrinkle = vn(b * vec3(18.0, 60.0, 18.0)) * 0.5 + vn(b * 140.0) * 0.5;
    if (vZone < 1.5) {
      // jacket: colour-blocked yoke + sleeve panels, dark zip, cuffs, hem
      c = cJacket;
      float yoke = smoothstep(1.43, 1.45, b.y) * step(ax, 0.36);
      float sleevePanel = smoothstep(0.52, 0.55, ax);
      c = mix(c, cJacket2, max(yoke, sleevePanel) * 0.95);
      float zip = (1.0 - smoothstep(0.006, 0.012, abs(b.x))) * step(0.0, b.z) * step(ax, 0.2);
      c = mix(c, vec3(0.05), zip);
      float cuff = smoothstep(0.66, 0.68, ax);
      c = mix(c, cJacket2 * 0.6, cuff);
      float hem = 1.0 - smoothstep(0.945, 0.965, b.y);
      c = mix(c, c * 0.55, hem * step(ax, 0.3));
      float reflective = (1.0 - smoothstep(0.004, 0.009, abs(b.y - 1.30))) * step(0.3, ax) * step(ax, 0.52);
      c = mix(c, vec3(0.85), reflective);
      gZoneRough = 0.72;
    } else if (vZone < 2.5) {
      c = cPants;
      float seam = 1.0 - smoothstep(0.004, 0.008, abs(b.z + 0.0) - 0.0);
      float knee = smoothstep(0.42, 0.45, b.y) * (1.0 - smoothstep(0.58, 0.61, b.y)) * step(0.0, b.z);
      c = mix(c, c * 1.35, knee * 0.6);
      gZoneRough = 0.85;
    } else if (vZone < 3.5) { c = cGlove; gZoneRough = 0.55; }
    else if (vZone < 4.5) { c = cBoot; float lace = step(0.0, b.z) * smoothstep(0.1, 0.2, b.y); c = mix(c, c * 0.5, lace * step(0.5, fract(b.y * 40.0))); gZoneRough = 0.6; }
    else { c = cGaiter; gZoneRough = 0.9; }
    c *= mix(0.86, 1.06, wrinkle);
    diffuseColor.rgb = c;
    gFabric = 1.0;
  }
`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  if (gFabric > 0.5) roughnessFactor = gZoneRough;`)
      .replace('#include <normal_fragment_maps>', `
  if (gFabric < 0.5) {
    #include <normal_fragment_maps>
  }`);
  };
  m.customProgramCacheKey = () => 'outerwear-' + pal.jacket;
  return m;
}

function boardTexture(colors) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  const [base, a, b] = colors;
  g.fillStyle = base; g.fillRect(0, 0, 1024, 256);
  // bold diagonal graphic
  g.fillStyle = a;
  g.beginPath(); g.moveTo(260, 0); g.lineTo(560, 0); g.lineTo(430, 256); g.lineTo(130, 256); g.fill();
  g.fillStyle = b;
  g.beginPath(); g.moveTo(600, 0); g.lineTo(660, 0); g.lineTo(530, 256); g.lineTo(470, 256); g.fill();
  g.globalAlpha = 0.9; g.fillStyle = '#ffffff';
  g.font = "italic 800 88px 'Barlow Condensed', sans-serif"; g.textBaseline = 'middle';
  g.fillText('SUMMIT', 690, 128);
  g.globalAlpha = 0.25; g.fillStyle = '#000';
  for (let i = 0; i < 40; i++) g.fillRect(0, i * 6.4, 1024, 1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// Snowboard: shaped outline (nose/tail, sidecut), rockered kicks, steel edges.
function buildBoard(pal) {
  const L = 1.56, half = L / 2, waist = 0.125, tipW = 0.148, tipR = 0.14;
  const sh = new THREE.Shape();
  const N = 40;
  const pts = [];
  for (let i = 0; i <= N; i++) { // toe side edge from tail to nose, sidecut
    const x = -half + tipR + (L - 2 * tipR) * i / N;
    const t = (x) / (half - tipR);
    pts.push([x, waist + (tipW - waist) * t * t]);
  }
  sh.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts) sh.lineTo(p[0], p[1]);
  // nose round
  sh.absellipse(half - tipR, 0, tipR, tipW, Math.PI / 2, -Math.PI / 2, true);
  for (let i = N; i >= 0; i--) sh.lineTo(pts[i][0], -pts[i][1]);
  sh.absellipse(-half + tipR, 0, tipR, tipW, -Math.PI / 2, -Math.PI * 1.5, true);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.004, bevelSegments: 2, curveSegments: 18 });
  geo.rotateX(-Math.PI / 2); // extrude along +y
  // kicks: raise nose and tail
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), ax = Math.abs(x);
    const k = Math.max(0, ax - (half - 0.2)) / 0.2;
    p.setY(i, p.getY(i) + k * k * 0.075);
  }
  geo.computeVertexNormals();
  // planar UV for top graphic
  const uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, 1 - (p.getX(i) + half) / L, (p.getZ(i) + tipW) / (2 * tipW));
  const top = new THREE.MeshStandardMaterial({ map: boardTexture(pal.board), roughness: 0.35, metalness: 0.05 });
  const side = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.3, metalness: 0.9 });
  const mesh = new THREE.Mesh(geo, [top, side]);
  mesh.castShadow = true;
  const grp = new THREE.Group(); grp.add(mesh);
  // bindings: base plate + highback + straps
  const bmat = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.5 });
  const strap = new THREE.MeshStandardMaterial({ color: new THREE.Color(pal.jacket), roughness: 0.6 });
  for (const [fx, ang] of [[0.26, 0.26], [-0.26, -0.16]]) {
    const b = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 20), bmat); plate.scale.set(1.25, 1, 0.95); plate.position.y = 0.025; b.add(plate);
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.2, 16, 1, true, Math.PI * 0.2, Math.PI * 0.6), bmat);
    hb.material = bmat; hb.position.set(0, 0.13, 0); hb.rotation.y = Math.PI; b.add(hb);
    const s1 = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 6, 16, Math.PI), strap); s1.position.set(0, 0.08, 0.03); s1.rotation.set(0, Math.PI / 2, 0); b.add(s1);
    b.position.set(fx, 0.01, 0); b.rotation.y = ang;
    b.traverse(o => { if (o.isMesh) o.castShadow = true; });
    grp.add(b);
  }
  return grp;
}

function buildHelmet(pal, headInfo) {
  const g = new THREE.Group();
  const r = headInfo.radius * 1.2;
  // shell: lathe profile with a slight rear flare
  const prof = [];
  for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 0.56; prof.push(new THREE.Vector2(Math.sin(a) * r, Math.cos(a) * r)); }
  prof.push(new THREE.Vector2(r * 1.02, -r * 0.2));
  const shell = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), new THREE.MeshStandardMaterial({ color: pal.helmet, roughness: 0.28, metalness: 0.1 }));
  shell.scale.set(0.92, 0.95, 1.1);
  g.add(shell);
  // vents
  const ventMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.6 });
  for (let i = -1; i <= 1; i++) {
    const v = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.05, 3, 8), ventMat);
    v.position.set(i * 0.035, r * 0.93, 0.0); v.rotation.x = Math.PI / 2; g.add(v);
  }
  // goggles: curved frame + mirrored lens + strap
  const lensMat = new THREE.MeshPhysicalMaterial({ color: pal.lens, metalness: 1.0, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0.6, envMapIntensity: 1.6 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.55 });
  const gr = r * 1.04;
  const frame = new THREE.Mesh(new THREE.CylinderGeometry(gr, gr, 0.07, 36, 1, true, -Math.PI * 0.42, Math.PI * 0.84), frameMat);
  frame.rotation.y = 0; frame.position.set(0, -r * 0.22, 0.0); frame.scale.set(0.93, 1, 1.12); g.add(frame);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(gr * 1.012, gr * 1.012, 0.056, 36, 1, true, -Math.PI * 0.36, Math.PI * 0.72), lensMat);
  lens.position.copy(frame.position); lens.scale.copy(frame.scale); g.add(lens);
  const strapMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(pal.jacket), roughness: 0.7 });
  const strap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.0, r * 1.0, 0.04, 32, 1, true, Math.PI * 0.55, Math.PI * 0.9), strapMat);
  strap.position.copy(frame.position); strap.scale.set(0.95, 1, 1.12); g.add(strap);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material.side = THREE.DoubleSide; } });
  return g;
}

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

function aimBone(bone, child, dirWorld) {
  const bp = bone.getWorldPosition(_v1);
  const cp = child.getWorldPosition(_v2);
  const cur = _v3.subVectors(cp, bp).normalize();
  _q1.setFromUnitVectors(cur, _v4.copy(dirWorld).normalize());
  bone.getWorldQuaternion(_q2);
  _q1.multiply(_q2);
  bone.parent.getWorldQuaternion(_q3).invert();
  bone.quaternion.copy(_q3.multiply(_q1));
  bone.updateMatrixWorld(true);
}
function rotateBoneWorld(bone, axisWorld, angle) {
  _q1.setFromAxisAngle(axisWorld, angle);
  bone.getWorldQuaternion(_q2);
  _q1.multiply(_q2);
  bone.parent.getWorldQuaternion(_q3).invert();
  bone.quaternion.copy(_q3.multiply(_q1));
  bone.updateMatrixWorld(true);
}
function twoBone(upper, lower, end, target, pole, L1, L2) {
  const H = upper.getWorldPosition(new THREE.Vector3());
  const d0 = target.clone().sub(H);
  let d = d0.length();
  d = Math.min(d, (L1 + L2) * 0.999); d = Math.max(d, Math.abs(L1 - L2) + 1e-3);
  const dir = d0.normalize();
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const pp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
  const knee = H.clone().addScaledVector(dir, a).addScaledVector(pp, h);
  aimBone(upper, lower, knee.clone().sub(H));
  const kp = lower.getWorldPosition(new THREE.Vector3());
  aimBone(lower, end, target.clone().sub(kp));
}

export class Rider {
  constructor(gltf, palette) {
    this.pal = palette;
    this.root = new THREE.Group();          // world placement (heading/tilt from physics)
    this.rig = new THREE.Group();           // board-relative frame (x = nose, z = toe side)
    this.root.add(this.rig);
    const body = SkeletonUtils.clone(gltf.scene);
    this.body = body;
    this.rig.add(body);
    let skinned = null;
    body.traverse(o => {
      if (o.isSkinnedMesh && (!skinned || o.geometry.attributes.position.count > skinned.geometry.attributes.position.count)) skinned = o;
      if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; }
    });
    body.traverse(o => { if (o.isMesh && o !== skinned) o.visible = false; });
    this.mesh = skinned;
    skinned.geometry = skinned.geometry.clone();
    dressGeometry(skinned);
    skinned.material = outerwearMaterial(skinned.material, palette);
    this.bones = {};
    skinned.skeleton.bones.forEach(b => { this.bones[b.name] = b; });
    this.rest = new Map();
    skinned.skeleton.bones.forEach(b => this.rest.set(b, b.quaternion.clone()));
    // head size from bind pose
    body.updateMatrixWorld(true);
    const hb = this.bones.Head;
    const hp = hb.getWorldPosition(new THREE.Vector3());
    this.headInfo = { radius: 0.125 };
    const helmet = buildHelmet(palette, this.headInfo);
    helmet.position.copy(hp).add(new THREE.Vector3(0, 0.105, 0.012));
    this.rig.add(helmet);
    hb.attach(helmet);
    this.helmet = helmet;
    const B = this.bones;
    this.len = {
      thigh: B.thigh_l.getWorldPosition(new THREE.Vector3()).distanceTo(B.calf_l.getWorldPosition(new THREE.Vector3())),
      calf: B.calf_l.getWorldPosition(new THREE.Vector3()).distanceTo(B.foot_l.getWorldPosition(new THREE.Vector3())),
      uarm: B.upperarm_l.getWorldPosition(new THREE.Vector3()).distanceTo(B.lowerarm_l.getWorldPosition(new THREE.Vector3())),
      farm: B.lowerarm_l.getWorldPosition(new THREE.Vector3()).distanceTo(B.hand_l.getWorldPosition(new THREE.Vector3())),
    };
    this.hipY = B.pelvis.getWorldPosition(new THREE.Vector3()).y;
    this.board = buildBoard(palette);
    this.rig.add(this.board);
    this.body.position.set(0, 0.03, 0);
    this.pose = { crouch: 0.35, lean: 0, twist: 0.6, grab: 0, grabType: 0, arms: 0, crash: 0, t: 0, air: 0, tuck: 0, brake: 0 };
  }

  // p: pose params; call after root is placed in the world
  applyPose(dt) {
    const P = this.pose; P.t += dt;
    const B = this.bones;
    for (const [b, q] of this.rest) b.quaternion.copy(q);
    // body frame: face toe side (+z), open the hips toward the nose
    const hipYaw = 0.34 + P.twist * 0.12;
    this.body.rotation.set(0, hipYaw, 0);
    const drop = 0.2 + P.crouch * 0.26 + P.air * 0.06 + P.grab * 0.14;
    this.body.position.set(-0.02, 0.05 - drop, -0.05 - P.lean * 0.05);
    this.root.updateMatrixWorld(true);
    // world helpers from the rig frame
    const rigQ = this.rig.getWorldQuaternion(new THREE.Quaternion());
    const toW = (x, y, z) => new THREE.Vector3(x, y, z).applyQuaternion(rigQ);
    const rigP = (x, y, z) => this.rig.localToWorld(new THREE.Vector3(x, y, z));
    const nose = toW(1, 0, 0), up = toW(0, 1, 0), toe = toW(0, 0, 1);
    // spine: forward bend (crouch) toward the toe side and counter-rotation toward the nose
    const bend = 0.16 + P.crouch * 0.28 + P.grab * 0.35 + P.tuck * 0.2;
    const lat = toW(1, 0, 0);
    rotateBoneWorld(B.spine_01, lat, 0);
    const side = new THREE.Vector3().crossVectors(up, toW(Math.sin(hipYaw), 0, Math.cos(hipYaw))).normalize();
    rotateBoneWorld(B.spine_01, side, -bend * 0.5);
    rotateBoneWorld(B.spine_02, side, -bend * 0.5);
    rotateBoneWorld(B.spine_02, up, 0.18 + P.twist * 0.35);
    rotateBoneWorld(B.spine_03, up, 0.12 + P.twist * 0.25);
    // lean into the carve: tilt the upper body toward toe (+) / heel (-)
    rotateBoneWorld(B.spine_02, nose, -P.lean * 0.25);
    // head looks down the fall line (toward the nose), slightly down
    rotateBoneWorld(B.neck_01, up, 0.5);
    rotateBoneWorld(B.Head, up, 0.45);
    rotateBoneWorld(B.Head, toW(0, 0, 1), -0.05);
    // legs: feet planted on the bindings
    const bh = 0.105;
    const footF = rigP(0.26, bh, 0.0), footB = rigP(-0.26, bh, 0.0);
    const kneeOut = toW(0.25, 0, 1).normalize().add(up.clone().multiplyScalar(0.0));
    twoBone(B.thigh_l, B.calf_l, B.foot_l, footF, toW(0.15, 0.1, 1).normalize(), this.len.thigh, this.len.calf);
    twoBone(B.thigh_r, B.calf_r, B.foot_r, footB, toW(0.05, 0.1, 1).normalize(), this.len.thigh, this.len.calf);
    aimBone(B.foot_l, B.ball_l, toW(0.26, -0.02, 1));
    aimBone(B.foot_r, B.ball_r, toW(-0.16, -0.02, 1));
    // arms
    const g = P.grab;
    const swing = Math.sin(P.t * 1.3) * 0.05;
    if (P.crash > 0) {
      const f = P.t * 9;
      twoBone(B.upperarm_l, B.lowerarm_l, B.hand_l, B.upperarm_l.getWorldPosition(new THREE.Vector3()).add(toW(Math.sin(f), 0.6 + Math.cos(f * 0.7) * 0.4, 0.3).multiplyScalar(0.5)), toW(0, -1, 0), this.len.uarm, this.len.farm);
      twoBone(B.upperarm_r, B.lowerarm_r, B.hand_r, B.upperarm_r.getWorldPosition(new THREE.Vector3()).add(toW(-Math.cos(f), 0.6 + Math.sin(f * 0.8) * 0.4, -0.3).multiplyScalar(0.5)), toW(0, -1, 0), this.len.uarm, this.len.farm);
    } else {
      // lead arm reaches toward the nose, trail arm hangs over the tail; both drop with a tuck
      const tuck = P.tuck;
      const leadT = rigP(0.62 - tuck * 0.2, 0.95 - drop * 0.8 - tuck * 0.2 + swing + P.lean * 0.12, 0.28 + P.lean * 0.15);
      const trailT = rigP(-0.5 + tuck * 0.15, 0.78 - drop * 0.7 - tuck * 0.15 - swing + P.lean * 0.1, 0.12 + P.lean * 0.1);
      const shL = B.upperarm_l.getWorldPosition(new THREE.Vector3()), shR = B.upperarm_r.getWorldPosition(new THREE.Vector3());
      let lt = leadT, tt = trailT;
      if (g > 0) {
        // grab targets on the board edge
        const types = [
          [rigP(0.0, 0.03, 0.15), 'r'],   // Indy: trail hand, toe edge between the feet
          [rigP(0.08, 0.03, -0.15), 'l'], // Melon: lead hand, heel edge
          [rigP(0.1, 0.03, -0.15), 'l'],  // Method: lead hand heel edge, board tweaked
        ];
        const [gt, hand] = types[P.grabType % 3];
        if (hand === 'r') tt = trailT.clone().lerp(gt, g); else lt = leadT.clone().lerp(gt, g);
      }
      twoBone(B.upperarm_l, B.lowerarm_l, B.hand_l, lt, toW(-0.3, -0.8, -0.5).normalize(), this.len.uarm, this.len.farm);
      twoBone(B.upperarm_r, B.lowerarm_r, B.hand_r, tt, toW(0.3, -0.8, -0.5).normalize(), this.len.uarm, this.len.farm);
      // relax the wrists along the forearm and curl the fingers into a fist-ish pose
      for (const s of ['l', 'r']) {
        const lf = B['lowerarm_' + s], hd = B['hand_' + s];
        const d = hd.getWorldPosition(new THREE.Vector3()).sub(lf.getWorldPosition(new THREE.Vector3()));
        aimBone(hd, B['middle_01_' + s], d);
      }
    }
  }
}


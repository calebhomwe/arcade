import * as THREE from 'three';
import { Engine } from './gfx/engine.js';
import { Sky } from './gfx/sky.js';
import { buildTerrain, buildDepthTexture, buildWater, makePaintTexture } from './gfx/terrain.js';
import { buildMountains, buildWaterfall, buildCity } from './gfx/backdrop.js';
import { buildForest, GrassField } from './gfx/flora.js';
import { CAMERA_BOUNDS } from './layout.js';

const engine = new Engine(document.getElementById('gl'), { preserve: false });
window.__engine = engine;
engine.rig.bounds = CAMERA_BOUNDS;
const scene = engine.scene;
const paint = makePaintTexture(256);
const sky = new Sky(scene);
scene.add(buildTerrain(paint));
const depth = buildDepthTexture(384);
scene.add(buildWater(depth, paint));
buildMountains(scene); buildWaterfall(scene); buildCity(scene);
const forest = buildForest(scene);
const grass = new GrassField(scene, 'grass', engine.q.grass, { x0: -40, x1: 44, z0: -34, z1: 40 }, 5);
const flowers = new GrassField(scene, 'flower', engine.q.flowers, { x0: -36, x1: 36, z0: -30, z1: 36 }, 6);
engine.onUpdate.push((dt) => sky.update(dt));
engine.rig.reset(0, 4, 17);
const qp = new URLSearchParams(location.search);
if (qp.get('cam')) { const [x, z, size, yaw, pitch] = qp.get('cam').split(',').map(Number); const c = engine.rig.cur, t = engine.rig.tgt; c.x = t.x = x; c.z = t.z = z; c.size = t.size = size; c.yaw = t.yaw = yaw * Math.PI / 180; c.pitch = t.pitch = pitch * Math.PI / 180; }
if (qp.get('t')) sky.phase = +qp.get('t');
if (qp.get('q')) engine.setQuality(qp.get('q'));
engine.start();
document.getElementById('splash').classList.add('gone');

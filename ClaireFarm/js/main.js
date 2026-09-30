// Boot: load the save, the models and the icons with a real progress bar, build the world, start the game.
import { Engine } from './gfx/engine.js';
import { Assets } from './gfx/assets.js';
import { Sky } from './gfx/sky.js';
import { buildTerrain, buildDepthTexture, buildWater, makePaintTexture } from './gfx/terrain.js';
import { buildMountains, buildWaterfall, buildCity } from './gfx/backdrop.js';
import { buildForest, GrassField } from './gfx/flora.js';
import { buildDress } from './gfx/dress.js';
import * as THREE from 'three';
import { SU } from './gfx/shaders.js';
import { Farm } from './state.js';
import { GameAudio } from './audio.js';
import { Game } from './game.js';
import { loadIcons } from './ui/icons.js';
import { safeStore } from './util.js';

const $ = (id) => document.getElementById(id);
const splash = $('splash'), bar = $('spBar'), msg = $('spMsg');
const qp = new URLSearchParams(location.search);
if (qp.get('ui') === '0') { const st = document.createElement('style'); st.textContent = '#ui{display:none!important}'; document.head.appendChild(st); }
let prog = 0;
const setProg = (f, m) => { prog = Math.max(prog, Math.min(1, f)); bar.style.width = (prog * 100).toFixed(0) + '%'; if (m) msg.textContent = m; };
const yieldFrame = () => new Promise((r) => setTimeout(r, 0));

function fail(text, err) {
  console.error(err || text);
  msg.textContent = text; msg.classList.add('err'); bar.style.background = '#c0392b';
}

async function boot() {
  const store = safeStore();
  if (qp.get('fresh')) { try { store.removeItem('claireFarm.save'); store.removeItem('claireFarm.save.bak'); } catch (e) {} }
  const farm = new Farm(store); farm.load();
  setProg(0.02, 'Waking up the farm…');

  let engine;
  try { engine = new Engine($('gl'), { quality: qp.get('q') || farm.S.settings.quality || 'auto', preserve: !!qp.get('keep') }); }
  catch (e) { return fail('This device could not start 3D graphics. Try another browser, or update your phone.', e); }
  window.__cf = { engine, farm };

  const assets = new Assets();
  const jobs = [
    ['models/core.glb', 0.9, (u, p) => assets.loadPack(u, p)],
    ['models/town.glb', 1.3, (u, p) => assets.loadPack(u, p)],
    ['models/city.glb', 0.2, (u, p) => assets.loadPack(u, p)],
  ];
  for (const n of ['claire', 'pip', 'milo', 'june', 'hazel', 'theo', 'pig', 'llama']) jobs.push([`models/${n}.glb`, n === 'claire' ? 0.27 : n === 'pip' || n === 'pig' || n === 'llama' ? 0.06 : 0.2, (u, p) => assets.loadCharacter(n, u, p)]);
  const totalW = jobs.reduce((s, j) => s + j[1], 0), frac = jobs.map(() => 0);
  const report = () => setProg(0.05 + 0.6 * frac.reduce((s, f, i) => s + f * jobs[i][1], 0) / totalW);
  const icons = loadIcons('textures/icons.json');
  const loadDetail = async (url) => { const t = await new THREE.TextureLoader().loadAsync(url); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = Math.min(4, engine.renderer.capabilities.getMaxAnisotropy()); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; return t; };
  const details = Promise.all([loadDetail('textures/ground_a.jpg'), loadDetail('textures/ground_b.jpg'), loadDetail('textures/planks.jpg')]).then(([a, b, c]) => { SU.uGA.value = a; SU.uGB.value = b; SU.uPlanks.value = c; });
  await Promise.all([icons, details, ...jobs.map((j, i) => j[2](j[0], (got, tot) => { frac[i] = tot ? got / tot : 0; report(); }).then(() => { frac[i] = 1; report(); }))]);
  setProg(0.68, 'Planting the meadow…'); await yieldFrame();

  const scene = engine.scene, paint = makePaintTexture(256); SU.uPaint.value = paint;
  const sky = new Sky(scene);
  scene.add(buildTerrain(paint));
  scene.add(buildWater(buildDepthTexture(384), paint));
  buildMountains(scene); buildWaterfall(scene); buildCity(scene, assets);
  setProg(0.76, 'Growing the trees…'); await yieldFrame();
  const forest = buildForest(scene);
  const dress = buildDress(scene, engine.q);
  const grass = new GrassField(scene, 'grass', engine.q.grass, { x0: -40, x1: 44, z0: -34, z1: 40 }, 5);
  const flowers = new GrassField(scene, 'flower', engine.q.flowers, { x0: -36, x1: 36, z0: -30, z1: 36 }, 6);
  setProg(0.84, 'Building the barn…'); await yieldFrame();

  const audio = new GameAudio(farm.S.settings);
  const game = new Game({ engine, assets, farm, audio, sky });
  Object.assign(game, { grass, flowers, forest, dress });
  game.build(paint);
  window.__cf.game = game; window.__cf.assets = assets; window.__cf.scene = scene; window.__cf.sky = sky;
  window.__cf.screenOf = (x, y, z) => game.rig.project(new THREE.Vector3(x, y, z));
  setProg(0.94, 'Almost ready…'); await yieldFrame();

  engine.onLost = () => { const o = $('lost'); if (o) o.classList.add('on'); };
  engine.onRestored = () => { const o = $('lost'); if (o) o.classList.remove('on'); };
  const saveNow = () => { try { if (farm.S) { farm.S.phase = sky.phase; farm.save(true); } } catch (e) {} };
  addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

  wireSdk(game, farm);
  engine.start();
  game.showTitle();
  if (qp.get('play')) game.play();
  if (qp.get('cam')) { const [x, z, size, yaw, pitch] = qp.get('cam').split(',').map(Number); const rg = engine.rig; rg.cancelTween && rg.cancelTween(); const c = rg.cur, t = rg.tgt; c.x = t.x = x; c.z = t.z = z; c.size = t.size = size; c.yaw = t.yaw = yaw * Math.PI / 180; c.pitch = t.pitch = pitch * Math.PI / 180; game.titleT = -1e9; game.freezeTitleCam = true; if (!qp.get('play')) game.mode = 'title'; }
  if (qp.get('t')) { sky.phase = +qp.get('t'); sky.frozen = true; game.todTarget = null; }
  setProg(1);
  splash.classList.add('gone');
  setTimeout(() => splash.remove(), 900);
}

function wireSdk(game, farm) {
  if (!window.ArcadeSDK) return;
  ArcadeSDK.init({
    pauseButton: 'tr',
    onRestart: () => { if (game.mode === 'play') { game.ui.closeSheet(true); game.ui.closeDialog(true); game.rig.focus(-1, 5, game.rig.aspect < 1 ? 16 : 17, 0.6, 0); game.replayTutorial(); } else game.showTitle(); },
    onExit: () => { farm.save(true); game.showTitle(); },
    onTutorial: () => { if (game.mode !== 'play') game.play(); game.replayTutorial(); },
    onHint: () => game.hintText(),
    cheats: [
      { code: 'COINS500', effect: '+500 coins' },
      { code: 'GROWNOW', effect: 'Every crop and animal is ready' },
      { code: 'LEVELUP', effect: 'Go up one level' },
      { code: 'BUILDALL', effect: 'Every workshop, pen and field is built' },
    ],
    onCheat: (code) => farm.code(code),
  });
}

boot().catch((e) => fail('The farm could not finish loading. Please reload the page.', e));

// Headless smoke test: builds the whole game in node (no GL) with jsdom + stubs and drives it.
//   cd ClaireFarm/tools/headless && npm i jsdom && node --import ./register.mjs headless.mjs
// It loads every model pack, builds the scene, plays a few minutes of game, opens every sheet and dialog, and prints
// an estimate of visible draw calls and triangles per camera plus anything that threw or warned.
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
const dom = new JSDOM('<!doctype html><html><body><canvas id="gl"></canvas><div id="ui"></div><div id="splash"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
const W = dom.window;
for (const k of ['window', 'document', 'localStorage', 'navigator', 'screen', 'HTMLElement']) { try { Object.defineProperty(globalThis, k, { value: W[k === 'window' ? 'window' : k] || W, configurable: true, writable: true }); } catch (e) {} }
globalThis.self = globalThis; globalThis.window = W; globalThis.document = W.document; globalThis.localStorage = W.localStorage;
Object.defineProperty(globalThis, 'navigator', { value: W.navigator, configurable: true });
globalThis.screen = { width: 1280, height: 800 }; W.screen = globalThis.screen;
globalThis.innerWidth = 1280; globalThis.innerHeight = 800; W.innerWidth = 1280; W.innerHeight = 800; W.devicePixelRatio = 1; globalThis.devicePixelRatio = 1;
globalThis.addEventListener = (...a) => W.addEventListener(...a); globalThis.requestAnimationFrame = (f) => setTimeout(() => f(performance.now()), 16); globalThis.cancelAnimationFrame = clearTimeout;
globalThis.Audio = class { constructor() { this.volume = 1; } play() { return Promise.resolve(); } pause() {} };
const stubCtx = new Proxy({}, { get: (t, k) => (k === 'canvas' ? {} : (...a) => (k === 'createRadialGradient' || k === 'createLinearGradient' ? { addColorStop() {} } : k === 'getImageData' ? { data: new Uint8Array(4) } : k === 'createImageData' ? { data: new Uint8Array(a[0] * a[1] * 4) } : undefined)), set: () => true });
const origCreate = W.document.createElement.bind(W.document);
W.document.createElement = (tag, o) => { if (String(tag).toLowerCase() === 'canvas') { const c = origCreate('canvas'); c.getContext = () => stubCtx; c.toDataURL = () => 'data:image/png;base64,AA=='; return c; } return origCreate(tag, o); };
W.document.createElementNS = (ns, tag) => { const e = { _l: {}, addEventListener(t, f) { this._l[t] = f; }, removeEventListener() {}, set src(v) { this._s = v; setTimeout(() => this._l.load && this._l.load({}), 0); }, get src() { return this._s; }, width: 8, height: 8, style: {} }; return e; };
const THREE = await import('three');
const R = '../../';
const ROOT = new URL('../../', import.meta.url).pathname;
const { Farm } = await import(R + 'js/state.js');
const { Assets } = await import(R + 'js/gfx/assets.js');
const { CameraRig } = await import(R + 'js/gfx/camera.js');
const { QUALITY } = await import(R + 'js/gfx/engine.js').catch((e) => { throw e; });
const { Sky } = await import(R + 'js/gfx/sky.js');
const { buildTerrain, buildDepthTexture, buildWater, makePaintTexture } = await import(R + 'js/gfx/terrain.js');
const { buildMountains, buildWaterfall, buildCity } = await import(R + 'js/gfx/backdrop.js');
const { buildForest, GrassField } = await import(R + 'js/gfx/flora.js');
const { Game } = await import(R + 'js/game.js');
const { loadIcons } = await import(R + 'js/ui/icons.js');
const { GameAudio } = await import(R + 'js/audio.js');
const problems = [];
const origErr = console.error, origWarn = console.warn;
console.warn = (...a) => { problems.push('warn: ' + a.join(' ').slice(0, 200) + ' @ ' + new Error().stack.split('\n').slice(2, 6).join(' <- ')); }; console.error = (...a) => { problems.push('error: ' + a.join(' ').slice(0, 200)); };
process.on('unhandledRejection', (e) => problems.push('unhandled: ' + (e && e.stack || e)));
globalThis.fetch = async (u) => { const p = ROOT + String(u).replace(/^\.?\//, ''); if (!fs.existsSync(p)) return { ok: false, status: 404 }; const b = fs.readFileSync(p); return { ok: true, status: 200, headers: { get: () => String(b.length) }, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), json: async () => JSON.parse(b.toString()), body: null }; };
await loadIcons('textures/icons.json');
const store = { m: new Map(), getItem(k) { return this.m.get(k) ?? null; }, setItem(k, v) { this.m.set(k, v); }, removeItem(k) { this.m.delete(k); } };
const farm = new Farm(store); farm.load();
const assets = new Assets();
for (const f of ['core', 'town', 'city']) await assets.loadPack(`models/${f}.glb`);
for (const n of ['claire', 'pip', 'milo', 'june', 'hazel', 'theo', 'pig', 'llama']) await assets.loadCharacter(n, `models/${n}.glb`);
console.log('assets ok; nodes:', assets.nodes.size);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1.6, 0.5, 700);
const dom_ = W.document.getElementById('gl'); dom_.setPointerCapture = () => {}; dom_.releasePointerCapture = () => {};
const rig = new CameraRig(camera, dom_, { fov: 32 }); rig.setViewport(1280, 800);
const fakeR = { getClearColor: () => new THREE.Color(), getClearAlpha: () => 1, setClearColor() {}, setRenderTarget() {}, clear() {}, render() {}, readRenderTargetPixels() {}, getRenderTarget: () => null, info: { reset() {}, render: { calls: 0, triangles: 0 } }, capabilities: { getMaxAnisotropy: () => 4 } };
const engine = { scene, camera, rig, renderer: fakeR, q: QUALITY.high, quality: 'high', w: 1280, h: 800, stats: { fps: 60, calls: 0, tris: 0, ms: 16 }, onUpdate: [], onQuality: [], setQuality() {}, shadow: { on: false }, clock: { t: 0 }, dyn: 1 };
const paint = makePaintTexture(64);
const sky = new Sky(scene);
scene.add(buildTerrain(paint)); scene.add(buildWater(buildDepthTexture(64), paint));
buildMountains(scene); buildWaterfall(scene); buildCity(scene, assets);
const forest = buildForest(scene);
const grass = new GrassField(scene, 'grass', 800, { x0: -40, x1: 44, z0: -34, z1: 40 }, 5), flowers = new GrassField(scene, 'flower', 200, { x0: -36, x1: 36, z0: -30, z1: 36 }, 6);
const audio = new GameAudio(farm.S.settings);
const game = new Game({ engine, assets, farm, audio, sky }); Object.assign(game, { grass, flowers, forest });
game.build(paint);
console.log('game built. scene children', scene.children.length);
let n = 0; scene.traverse((o) => { if (o.isMesh) n++; }); console.log('meshes', n);
game.showTitle(); for (let i = 0; i < 30; i++) game.update(0.05);
game.act('play'); for (let i = 0; i < 30; i++) game.update(0.05);
console.log('mode', game.mode, 'busy', game.ui.busy);
game.ui.closeDialog(true);
// drive some actions
const A = (a, d = {}) => { try { game.act(a, d, W.document.body, {}); } catch (e) { problems.push('act ' + a + ': ' + e.stack.split('\n').slice(0, 3).join(' | ')); } };
game.tapPlot({ id: 'A1', x: -8, z: 9 }); A('pickSeed', { id: 'wheat', plot: 'A1' }); for (const id of ['A0', 'A2', 'A3', 'A4', 'A5']) farm.plant(id, 'wheat');
for (let i = 0; i < 20; i++) game.update(0.1);
farm.code('GROWNOW'); for (let i = 0; i < 20; i++) game.update(0.1);
for (const id of ['A0', 'A1', 'A2', 'A3', 'A4', 'A5']) farm.harvest(id);
for (let i = 0; i < 30; i++) game.update(0.1);
for (const a of ['goals', 'orders', 'shop', 'barn', 'market', 'daily', 'more', 'settings']) { A(a); for (let i = 0; i < 3; i++) game.update(0.05); game.ui.closeSheet(true); game.ui.closeDialog(true); }
farm.code('BUILDALL'); for (let i = 0; i < 40; i++) game.update(0.1);
for (let l = 0; l < 25; l++) { farm.code('LEVELUP'); game.update(0.05); game.ui.closeDialog(true); game.queue.length = 0; }
for (const id of ['milo', 'june', 'hazel', 'theo']) { try { game.openNpc(id); game.ui.closeDialog(true); } catch (e) { problems.push('npc ' + id + ' ' + e.stack.split('\n').slice(0, 3).join(' | ')); } }
for (const p of ['chicken', 'cow', 'pig', 'sheep', 'llama', 'bees']) { try { farm.buyAnimal(p); game.life.syncHerd(p); game.update(0.1); A('buyAnimal', { id: p }); } catch (e) { problems.push('herd ' + p + ' ' + e.stack.split('\n').slice(0, 3).join(' | ')); } }
for (let i = 0; i < 60; i++) game.update(0.1);
game.startGhost('bench'); game.updateGhost(); game.endGhost();
const T = (name, fn) => { try { fn(); game.ui.closeDialog(true); game.ui.closeSheet(true); } catch (e) { problems.push('DLG ' + name + ': ' + e.stack.split('\n').slice(0, 3).join(' | ')); } };
const { CHAPTERS, DECOR } = await import(R + 'js/data.js');
T('welcomeBack', () => { farm.away = { secs: 5 * 3600, ripe: 3, animals: 2, jobs: 1, boat: true, coins: 120 }; game.welcomeBack(); });
T('daily', () => { farm.S.daily.last = 0; game.dailyDialog(); });
T('chapter', () => game.chapterDialog({ index: 0, ch: CHAPTERS[0], xp: 150, cos: 'hat_straw' }));
T('level', () => game.levelDialog({ level: 5, reward: { coins: 100, stars: 5 }, unlocks: [{ name: 'Cows', icon: 'cow' }] }));
T('npc', () => game.renderNpc('milo', 'Hi'));
T('decorMenu', () => game.decorMenu({ id: 1, type: DECOR[0].id }));
T('confirm site', () => game.confirmBuy('site', 'bakery')); T('confirm pen', () => game.confirmBuy('pen', 'cow')); T('confirm patch', () => game.confirmBuy('patch', 'B'));
T('credits', () => game.credits()); T('howto', () => game.howTo()); T('intro', () => game.introDialog()); T('item', () => game.itemDialog('wheat'));
T('hint', () => { const h = game.hintText(); if (typeof h !== 'string' || !h) throw new Error('empty hint'); });
T('settings sheet', () => { game.open('settings'); game.setSetting('quality', 'low'); game.setSetting('tod', 'gold'); game.setSetting('season', 'winter'); game.setSetting('quality', 'high'); game.setVolume('music', 0.3); });
for (const cos of ['hat_straw', 'hat_flower', 'hat_cowgirl', 'hat_party', 'hat_lantern', 'hat_bee', 'hat_beret', 'hat_crown', 'hat_halo']) T('hat ' + cos, () => { if (!game.makeHat(cos)) throw new Error('no hat ' + cos); });
try { game.finale(); } catch (e) { problems.push('finale ' + e.stack); }
for (let i = 0; i < 10; i++) game.update(0.1);
// ---- visible-set estimate for a few cameras
function visibleStats(label) {
  camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
  const fr = new THREE.Frustum(), m4 = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); fr.setFromProjectionMatrix(m4);
  let calls = 0, tris = 0; const by = {};
  scene.traverse((o) => {
    if (!(o.isMesh || o.isPoints)) return;
    let vis = o.visible; for (let p = o.parent; p && vis; p = p.parent) vis = p.visible; if (!vis) return;
    if (o.frustumCulled && !o.isPoints && !fr.intersectsObject(o)) return;
    const g = o.geometry, pos = g.attributes.position, idx = g.index ? g.index.count : pos.count, inst = o.isInstancedMesh ? o.count : (g.isInstancedBufferGeometry ? g.instanceCount : 1);
    if (o.isInstancedMesh && o.count === 0) return; if (g.isInstancedBufferGeometry && g.instanceCount === 0) return;
    const t = o.isPoints ? 0 : inst * idx / 3; calls++; tris += t; (visibleStats.list = visibleStats.list || []).push([Math.round(t), (o.name || o.parent && o.parent.name || '') + ' ' + (o.isInstancedMesh ? 'inst' + o.count + 'x' + Math.round(idx / 3) : g.isInstancedBufferGeometry ? 'ibg' + g.instanceCount : o.isSkinnedMesh ? 'skin' : 'mesh') + ' ' + (o.material.type || '')]);
    const key = o.isInstancedMesh ? 'inst' : o.isSkinnedMesh ? 'skin' : o.isPoints ? 'pts' : g.isInstancedBufferGeometry ? 'grass/blob' : 'mesh'; by[key] = (by[key] || 0) + Math.round(t / 1000) + 'k/' + '1'.repeat(0);
  });
  console.log(label, 'visible drawables', calls, 'tris', Math.round(tris / 1000) + 'k'); if (label.startsWith('default')) console.log(visibleStats.list.sort((a, b) => b[0] - a[0]).slice(0, 26).map((x) => '   ' + x[0] + '  ' + x[1]).join('\n')); visibleStats.list = [];
}
rig.cur.x = rig.tgt.x = -1; rig.cur.z = rig.tgt.z = 5; rig.cur.size = rig.tgt.size = 17; rig.cur.yaw = rig.tgt.yaw = 28 * Math.PI / 180; rig.cur.pitch = rig.tgt.pitch = 42 * Math.PI / 180; rig.apply(); visibleStats('default (all built)');
rig.cur.size = rig.tgt.size = 28; rig.cur.pitch = rig.tgt.pitch = 30 * Math.PI / 180; rig.apply(); visibleStats('far (all built)');
rig.cur.size = rig.tgt.size = 10; rig.cur.pitch = rig.tgt.pitch = 50 * Math.PI / 180; rig.apply(); visibleStats('close (all built)');
// ---- big objects
scene.updateMatrixWorld(true);
const bigs = [];
scene.traverse((o) => { if (!o.isMesh || o.isInstancedMesh) return; o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); const sz = b.getSize(new THREE.Vector3()); if (Math.max(sz.x, sz.y, sz.z) > 25) bigs.push([o.name || o.parent && o.parent.name || o.material.type, sz.x.toFixed(0) + 'x' + sz.y.toFixed(0) + 'x' + sz.z.toFixed(0), b.min.x.toFixed(0) + ',' + b.min.y.toFixed(0) + ',' + b.min.z.toFixed(0)].join(' ')); });
console.log('BIG:\n' + bigs.join('\n'));
// ---- audit: samplers, NaNs, draw-call and triangle distribution
const groups = {}; let bad = 0;
scene.traverse((o) => {
  if (!(o.isMesh || o.isPoints)) return;
  const m = o.material; const uni = m && m.uniforms;
  if (uni) for (const [k, u] of Object.entries(uni)) if (/^map$|^uPaint$|^uGA$|^uGB$|^uDepth$/.test(k) && u.value && !u.value.isTexture) { problems.push('bad sampler ' + k + ' on ' + (o.name || o.type)); }
  const pos = o.geometry && o.geometry.attributes.position; if (pos) { for (let i = 0; i < Math.min(pos.count, 5000); i++) if (!isFinite(pos.getX(i) + pos.getY(i) + pos.getZ(i))) { problems.push('NaN position in ' + (o.name || o.type)); break; } }
  let vis = o.visible; for (let p = o.parent; p && vis; p = p.parent) vis = p.visible;
  if (!vis) return;
  const g = o.geometry, idx = g.index ? g.index.count : (pos ? pos.count : 0), inst = o.isInstancedMesh ? o.count : 1;
  const tri = o.isPoints ? 0 : (g.instanceCount !== undefined && g.isInstancedBufferGeometry ? g.instanceCount : inst) * idx / 3;
  const key = (o.isInstancedMesh ? 'inst:' : o.isSkinnedMesh ? 'skinned:' : o.isPoints ? 'points:' : 'mesh:') + (o.name || (m && m.userData && m.userData.farm ? 'farm' : m && m.type) || '?');
  const e = groups[key] || (groups[key] = { calls: 0, tris: 0 }); e.calls++; e.tris += tri;
});
const tot = Object.values(groups).reduce((a, g) => ({ calls: a.calls + g.calls, tris: a.tris + g.tris }), { calls: 0, tris: 0 });
console.log('DRAWABLES (all, before frustum culling):', JSON.stringify(tot));
console.log(Object.entries(groups).sort((a, b) => b[1].calls - a[1].calls).slice(0, 14).map(([k, v]) => k + ' calls ' + v.calls + ' tris ' + Math.round(v.tris)).join('\n'));
console.log('problems:', problems.length ? '\n' + [...new Set(problems)].join('\n') : 'none');
process.exit(0);

// Summit Line: game shell (loading, title, race, results), input, camera, HUD.
import * as THREE from 'three';
import { loadAll } from './assets.js';
import { World } from './world.js';
import { PRESETS, currentQualityKey, nextQualityKey, saveQualityKey } from './quality.js';
import { Rider, PALETTES } from './rider.js';
import { Racer, Colliders } from './physics.js';
import { AIDriver } from './ai.js';
import { Particles, Trail, Crystals } from './fx.js';
import { Audio } from './audio.js';
import { heightAt, normalAt, centerX, halfWidth, LENGTH, KICKERS } from './course.js';
import { clamp, lerp } from './noise.js';

const $ = (id) => document.getElementById(id);
const qKey = currentQualityKey();
const Q = PRESETS[qKey];
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const params = new URLSearchParams(location.search);
const AUTOPLAY = params.get('autoplay'); // QA hook: scripted input
let QA_STEPS = parseInt(params.get('timelapse') || '0', 10); // QA hook: fixed sim steps per rendered frame

// ---------------------------------------------------------------- renderer
const canvas = $('gl');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: qKey !== 'low', powerPreference: 'high-performance' }); }
catch(error) {
  $('loadTxt').textContent = '3D graphics are unavailable here. Open this game in Safari or Chrome on your device.';
  $('loadFill').style.width = '0%';
  throw error;
}
const dpr = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(Math.min(2, dpr * Q.pixelRatio));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
renderer.shadowMap.enabled = Q.shadows > 0;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(60, 1, 0.3, 60000);
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (fx.parts) fx.parts.setScale(h * renderer.getPixelRatio());
}
addEventListener('resize', resize);

const audio = new Audio();
const fx = {};
let world, player, racers = [], ais = [], riders = [], trails = [], colliders;
let state = 'loading', raceT = 0, countdownT = 0, finishT = 0, paused = false;
const clock = new THREE.Clock();

// ---------------------------------------------------------------- loading
function setLoad(p, txt) { if(state==='error')return; $('loadFill').style.width = Math.round(p * 100) + '%'; if (txt) $('loadTxt').textContent = txt; }

async function boot() {
  resize();
  await document.fonts.load("italic 800 40px 'Barlow Condensed'").catch(() => {});
  await document.fonts.load("600 40px 'Barlow Condensed'").catch(() => {});
  const assets = await loadAll(renderer, (p) => setLoad(p * 0.55, 'Loading the mountain'));
  const wait = () => new Promise(r => setTimeout(r, 0));
  setLoad(0.58, 'Lighting the sky'); await wait();
  world = new World(renderer, Q);
  const steps = { light: [0.62, 'Sculpting the run'], ribbon: [0.72, 'Raising the peaks'], massif: [0.82, 'Growing the forest'], forest: [0.9, 'Building the course'], props: [0.95, 'Waxing boards'] };
  await world.build(assets, (k) => { const s = steps[k]; if (s) setLoad(s[0], s[1]); });
  colliders = new Colliders(world.forest.colliders, world.props.boulders);

  // riders
  const roster = [
    { name: 'YOU', pal: 'player', v: 0, player: true },
    { name: 'KAYA', pal: 'kaya', v: -5, drag: 0.97, aggr: 0.6, style: 0.8 },
    { name: 'MAC', pal: 'mac', v: 5, drag: 0.99, aggr: 0.8, style: 0.4 },
    { name: 'ELISE', pal: 'elise', v: -10, drag: 1.0, aggr: 0.4, style: 0.9 },
  ];
  roster.forEach((r, i) => {
    const racer = new Racer({ name: r.name, isPlayer: !!r.player, colliders, rails: world.props.rails, s: 3, v: r.v, dragMul: r.drag || 1 });
    racer.palette = PALETTES[r.pal];
    racers.push(racer);
    const rider = new Rider(assets.rider, PALETTES[r.pal]);
    world.scene.add(rider.root);
    riders.push(rider);
    const tr = new Trail(Q.trailLen);
    world.scene.add(tr.mesh); trails.push(tr);
    if (r.player) player = racer; else ais.push(new AIDriver(racer, { seed: i * 3 + 1, aggression: r.aggr, style: r.style }));
  });
  fx.parts = new Particles(Q.particles);
  world.scene.add(fx.parts.points);
  fx.crystals = new Crystals(isTouch ? 180 : 320);
  world.scene.add(fx.crystals.points);
  resize();
  setLoad(1, 'Ready');
  // warm up shaders once so the title does not hitch
  placeRiders(0);
  titleCam(0);
  renderer.compile(world.scene, camera);
  renderer.render(world.scene, camera);
  $('loading').classList.remove('show');
  toTitle();
  window.__game = { state: () => state, player: () => player, racers: () => racers, timelapse: (n) => { QA_STEPS = n; }, hold: (b) => { paused = b; }, height: () => player.pos.y - heightAt(player.pos.x, player.pos.z) };
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- input
const keys = new Set();
const touchIn = { x: 0, y: 0, jump: false, grab: false, boost: false };
let grabKey = 0;
addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === 'KeyJ') grabKey = 0; if (e.code === 'KeyK') grabKey = 1; if (e.code === 'KeyL') grabKey = 2;
  if ((e.code === 'Escape' || e.code === 'KeyP') && state === 'race') togglePause();
  if ((e.code === 'Enter' || e.code === 'Space') && state === 'title' && !$('help').classList.contains('show')) startRace();
  if (e.code === 'Escape' && $('help').classList.contains('show')) closeHelp();
});
addEventListener('keyup', (e) => keys.delete(e.code));
function clearInput(){keys.clear();Object.assign(touchIn,{x:0,y:0,jump:false,grab:false,boost:false});$('knob').style.transform='';document.querySelectorAll('.tbtn.on').forEach(el=>el.classList.remove('on'));}
addEventListener('blur', () => {clearInput();if(['race','countdown'].includes(state)&&!paused)togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(['race','countdown'].includes(state)&&!paused)togglePause();}});

function readInput() {
  const k = (c) => keys.has(c);
  let steer = (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0);
  let tuck = k('KeyW') || k('ArrowUp'), brake = k('KeyS') || k('ArrowDown');
  let jump = k('Space'), grab = k('KeyJ') || k('KeyK') || k('KeyL'), boost = k('ShiftLeft') || k('ShiftRight');
  // gamepad
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(g => g) : null;
  if (gp) {
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    if (Math.abs(ax) > 0.15) steer = ax;
    if (ay < -0.5) tuck = true; if (ay > 0.5) brake = true;
    if (gp.buttons[0]?.pressed) jump = true;
    if (gp.buttons[2]?.pressed) { grab = true; grabKey = 0; } if (gp.buttons[3]?.pressed) { grab = true; grabKey = 1; } if (gp.buttons[1]?.pressed) { grab = true; grabKey = 2; }
    if (gp.buttons[5]?.pressed || gp.buttons[7]?.pressed) boost = true;
  }
  if (isTouch) {
    if (Math.abs(touchIn.x) > 0.12) steer = touchIn.x;
    if (touchIn.y < -0.45) tuck = true; if (touchIn.y > 0.45) brake = true;
    if (touchIn.jump) jump = true; if (touchIn.grab) { grab = true; }
    if (touchIn.boost) boost = true;
  }
  if (AUTOPLAY) return autoInput();
  return { steer, tuck, brake, jump, grab, grabType: grabKey, boost };
}

// scripted input for QA runs: carve down the line, ollie, spin and grab off kickers
let autoAI = null;
function autoInput() {
  if (!autoAI) autoAI = new AIDriver(player, { seed: 42, aggression: 1, style: 1 });
  const i = autoAI.input(1 / 60, player.s, true);
  i.boost = player.boost > 0.5 && player.grounded;
  // an occasional ollie on the straights (hold for ~0.4 s, then release)
  const ph = player.time % 7;
  if (player.grounded && Math.abs(i.steer) < 0.3 && ph > 3 && ph < 3.4) i.jump = true;
  return i;
}

// touch controls
function setupTouch() {
  if (!isTouch) return;
  const stick = $('stick'), knob = $('knob');
  let sid = null, cx = 0, cy = 0;
  const R = 58;
  const move = (e) => {
    const dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy); const k = l > R ? R / l : 1;
    touchIn.x = dx * k / R; touchIn.y = dy * k / R;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  };
  stick.addEventListener('pointerdown', (e) => { e.preventDefault(); sid = e.pointerId; const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; stick.setPointerCapture(sid); move(e); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === sid) move(e); });
  const end = (e) => { if (e.pointerId !== sid) return; sid = null; touchIn.x = touchIn.y = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);stick.addEventListener('lostpointercapture',end);
  const hold = (id, key) => {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); touchIn[key] = true; el.classList.add('on'); el.setPointerCapture(e.pointerId); if (key === 'grab') grabKey = (grabKey + 1) % 3; });
    const up = () => { touchIn[key] = false; el.classList.remove('on'); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);el.addEventListener('lostpointercapture',up);
  };
  hold('tJump', 'jump'); hold('tGrab', 'grab'); hold('tBoost', 'boost');
}

// ---------------------------------------------------------------- UI wiring
function show(id, on) { $(id).classList.toggle('show', on); }
function toTitle() {
  state = 'title'; paused = false;
  show('title', true); show('results', false); show('pause', false);
  $('hud').classList.add('hidden'); $('touch').classList.add('hidden');
  resetRace();
  const best = loadBest();
  $('bestLbl').textContent = best ? `Personal best ${fmtTime(best.time)} · ${best.score.toLocaleString()} pts` : 'Beat three rivals to the finish arch';
  updateQualityLbl(); updateSoundBtn();
}
function updateQualityLbl() { $('qualityLbl').textContent = 'Quality: ' + Q.name; }
function updateSoundBtn() { $('btnSound').innerHTML = `<svg class="ic"><use href="#i-${audio.enabled ? 'vol' : 'mute'}"/></svg>`; }
$('btnPlay').addEventListener('click', () => startRace());
$('btnControls').addEventListener('click', () => { audio.start(); audio.click(); show('help', true); });
$('helpClose').addEventListener('click', () => closeHelp());
$('help').addEventListener('click', (e) => { if (e.target === $('help')) closeHelp(); });
function closeHelp() { show('help', false); if(paused)show('pause',true); }
$('btnQuality').addEventListener('click', () => { const n = nextQualityKey(qKey); saveQualityKey(n); const u = new URL(location.href); u.searchParams.delete('q'); location.href = u.toString(); });
$('btnSound').addEventListener('click', () => { audio.start(); audio.setEnabled(!audio.enabled); updateSoundBtn(); audio.click(); });
$('btnPause').addEventListener('click', () => togglePause());
$('btnResume').addEventListener('click', () => togglePause());
$('btnRestart').addEventListener('click', () => { show('pause', false); paused = false; startRace(); });
$('btnPauseHelp').addEventListener('click', () => {show('pause',false);show('help',true);});
$('btnQuit').addEventListener('click', () => { audio.click(); toTitle(); });
$('btnAgain').addEventListener('click', () => startRace());
$('btnTitle').addEventListener('click', () => { audio.click(); toTitle(); });

function togglePause() {
  if (state !== 'race' && state !== 'countdown') return;
  paused = !paused;clearInput();$('touch').classList.toggle('hidden',paused||!isTouch);show('pause', paused); audio.click();
}

function resetRace() {
  clearInput();acc=0;autoAI=null;ais.forEach(ai=>{ai.air=null;ai.boostT=0;});
  const starts = [0, -5, 5, -10];
  racers.forEach((r, i) => { r.reset(3, starts[i], 0); r.finished = false; });
  trails.forEach(t => { t.count = 0; t.head = 0; t.last = null; t.update(0); });
  raceT = 0; finishT = 0; camState.init = false;
}

function startRace() {
  audio.start(); audio.click();
  paused=false;show('pause',false);
  show('title', false); show('results', false); show('help', false);
  $('hud').classList.remove('hidden');
  if (isTouch) $('touch').classList.remove('hidden');
  resetRace();
  state = 'countdown'; countdownT = 3.2; lastCount = 4;
  buildProgressDots();
}

let lastCount = 4;
function showCount(n) {
  const el = $('countdown');
  if (n === null) { el.innerHTML = ''; el.classList.remove('go'); return; }
  el.classList.toggle('go', n === 0);
  el.innerHTML = `<span>${n === 0 ? 'GO!' : n}</span>`;
}

// ---------------------------------------------------------------- HUD
const ORD = (n) => (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
function fmtTime(t) { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s.toFixed(2).padStart(5, '0')}`; }
function buildProgressDots() {
  $('progDots').innerHTML = racers.map((r, i) => `<b class="${r.isPlayer ? 'me' : ''}" style="background:${r.isPlayer ? '' : '#' + new THREE.Color(r.palette.jacket).getHexString()}"></b>`).join('');
}
function standings() {
  return [...racers].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1; if (b.finished) return 1;
    return b.s - a.s;
  });
}
let hudT = 0;
function updateHUD(dt) {
  hudT -= dt; if (hudT > 0) return; hudT = 0.08;
  const st = standings();
  const place = st.indexOf(player) + 1;
  $('hudPos').textContent = place; $('hudPosSuf').textContent = ORD(place);
  $('hudTime').textContent = fmtTime(player.finished ? player.finishTime : player.time);
  $('hudSpeed').textContent = Math.round(player.speed * 3.6);
  $('hudScore').textContent = player.score.toLocaleString();
  $('boostFill').style.width = (player.boost * 100).toFixed(1) + '%';
  document.querySelector('.boost').classList.toggle('full', player.boost > 0.98);
  $('progFill').style.width = clamp(player.s / LENGTH, 0, 1) * 100 + '%';
  const dots = $('progDots').children;
  racers.forEach((r, i) => { dots[i].style.left = (clamp(r.s / LENGTH, 0, 1) * 100) + '%'; });
}
let popT = 0;
function popTrick(name, pts, mult, bad, tag) {
  const el = $('trickPop');
  el.classList.remove('fade', 'bad');
  if (bad) el.classList.add('bad');
  el.innerHTML = `<span class="t">${name}</span>${pts ? `<span class="p">+${pts.toLocaleString()}${mult > 1 ? `  x${mult}` : ''}${tag ? ' · ' + tag : ''}</span>` : ''}`;
  popT = 1.8;
}
function comboLabel() {
  $('combo').textContent = player.combo > 1 && player.comboT > 0 ? `COMBO x${Math.min(5, player.combo)}` : '';
}

// ---------------------------------------------------------------- camera
const camState = { init: false, pos: new THREE.Vector3(), look: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, -1), shake: 0, fov: 60 };
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _u = new THREE.Vector3();
function chaseCam(dt, r) {
  const portrait = innerHeight > innerWidth;
  const v = r.vel;
  const hv = _v.set(v.x, 0, v.z);
  const sFall = Math.max(0, r.s);
  const fall = _u.set(centerX(sFall + 8) - centerX(sFall), 0, -8).normalize();
  const w = clamp((hv.length() - 3) / 10, 0, 1);
  const want = hv.lengthSq() > 0.01 ? hv.normalize().multiplyScalar(w).addScaledVector(fall, 1 - w).normalize() : fall;
  camState.dir.lerp(want, 1 - Math.exp(-dt * (r.grounded ? 3.2 : 1.2))).normalize();
  const sp = r.speed;
  const dist = (portrait ? 7.4 : 5.4) + sp * 0.04 + (r.grounded ? 0 : 0.4);
  const height = (portrait ? 3.0 : 2.1) + (r.grounded ? 0 : 0.8);
  const target = _w.copy(r.pos).addScaledVector(camState.dir, -dist);
  const gh = heightAt(target.x, target.z);
  target.y = Math.max(r.pos.y + height, gh + 1.4);
  if (!camState.init) { camState.pos.copy(target); camState.look.copy(r.pos); camState.init = true; }
  camState.pos.lerp(target, 1 - Math.exp(-dt * 6));
  const look = _u.copy(r.pos).addScaledVector(camState.dir, 5 + sp * 0.12);
  look.y = r.pos.y + (portrait ? 0.2 : 0.6);
  camState.look.lerp(look, 1 - Math.exp(-dt * 9));
  camera.position.copy(camState.pos);
  if (camState.shake > 0) {
    const s = camState.shake;
    camera.position.x += (Math.random() - 0.5) * s * 0.3; camera.position.y += (Math.random() - 0.5) * s * 0.3;
    camState.shake = Math.max(0, s - dt * 3);
  }
  camera.lookAt(camState.look);
  const baseFov = portrait ? 74 : 58;
  camState.fov = lerp(camState.fov, baseFov + clamp((sp - 12) * 0.55, 0, 16) + (r.boosting ? 6 : 0), 1 - Math.exp(-dt * 3));
  camera.fov = camState.fov; camera.updateProjectionMatrix();
}
function titleCam(t) {
  const r = racers[0] || { pos: new THREE.Vector3(centerX(3), heightAt(centerX(3), -3), -3) };
  const p = r.pos;
  const portrait = innerHeight > innerWidth;
  // front three-quarter view of the player (who faces the toe side, +x), peaks behind
  const a = 1.2 + Math.sin(t * 0.09) * 0.22;
  const R = portrait ? 6.8 : 4.6;
  camera.position.set(p.x + Math.sin(a) * R, p.y + 1.5 + Math.sin(t * 0.13) * 0.2, p.z + Math.cos(a) * R);
  const side = portrait ? 0 : 1.6;
  camera.lookAt(p.x - Math.cos(a) * side, p.y + (portrait ? 0.4 : 1.05), p.z + Math.sin(a) * side);
  camera.fov = portrait ? 62 : 50; camera.updateProjectionMatrix();
}
function finishCam(dt, t) {
  const r = player;
  const s = LENGTH + 30;
  const cx = centerX(s);
  const target = _w.set(cx + 14, heightAt(cx + 14, -s) + 3.2, -s + 6);
  camera.position.lerp(target, 1 - Math.exp(-dt * 2));
  camera.lookAt(r.pos.x, r.pos.y + 1, r.pos.z);
}

// ---------------------------------------------------------------- per-frame rider placement
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
function placeRiders(dt) {
  racers.forEach((r, i) => {
    const rd = riders[i];
    const up = _y.copy(r.grounded || r.grind ? r.up : _y.set(0, 1, 0)).normalize();
    const yaw = r.yaw;
    _x.set(Math.sin(yaw), 0, -Math.cos(yaw));
    _x.addScaledVector(up, -_x.dot(up)).normalize();
    _z.crossVectors(_x, up).normalize();
    _m.makeBasis(_x, up, _z);
    rd.root.quaternion.setFromRotationMatrix(_m);
    // edge roll (carve) + flips + crash tumble
    const roll = r.crashT > 0 ? r.visualFlip : r.flip;
    rd.root.quaternion.multiply(_q.setFromAxisAngle(_x.set(1, 0, 0), r.lean * 0.55 + roll));
    rd.root.position.copy(r.pos);
    if (r.crashT > 0) { rd.root.position.y += 0.1; }
    const P = rd.pose;
    const inAir = !r.grounded && !r.grind;
    P.crouch = clamp(0.3 + r.charge * 0.55 + r.land * 0.45 + r.tuck * 0.35 + (inAir ? 0.25 : 0) + (r.brakeAmt || 0) * 0.2, 0, 1);
    P.lean = r.lean; P.tuck = r.tuck || 0; P.air = inAir ? 1 : 0;
    P.grab = r.grab; P.grabType = r.grabType;
    P.crash = r.crashT > 0 ? 1 : 0;
    P.twist = r.grind ? 1.2 : 0.6;
    rd.applyPose(dt);
    rd.root.visible = !(r.invuln > 0 && Math.floor(r.invuln * 10) % 2 === 0);
  });
}

// ---------------------------------------------------------------- effects per racer
const _side = new THREE.Vector3(), _nrm = new THREE.Vector3();
function racerFx(i, r, dt) {
  const tr = trails[i];
  const sp = r.speed;
  if (r.grounded && r.crashT <= 0) {
    normalAt(r.pos.x, r.pos.z, _nrm, 0.5);
    _side.set(r.vel.z, 0, -r.vel.x).normalize();
    tr.add(r.pos, _side, _nrm, 0.26 + Math.abs(r.edge) * 0.06, 0.4);
    // powder spray off the tail, stronger when carving/braking
    const carve = Math.abs(r.edge) * Math.min(1, sp / 14) + r.brakeAmt * 1.4;
    const n = Math.floor(carve * 55 * dt * (Q.particles / 1400) + Math.random());
    const outside = Math.sign(r.edge || 1);
    for (let k = 0; k < n; k++) {
      const s = 0.5 + Math.random() * 0.9;
      fx.parts.emit(r.pos.x - r.vel.x * 0.03, r.pos.y + 0.1, r.pos.z - r.vel.z * 0.03,
        r.vel.x * 0.35 - _side.x * outside * (2 + Math.random() * 3) * s + (Math.random() - 0.5),
        1.2 + Math.random() * 2.4 * s,
        r.vel.z * 0.35 - _side.z * outside * (2 + Math.random() * 3) * s + (Math.random() - 0.5),
        0.22 + Math.random() * 0.35, 0.6 + Math.random() * 0.7, { shade: 0.9 + Math.random() * 0.2 });
    }
  } else if (!r.grind) tr.cut();
  if (r.grind && Math.random() < 0.6) {
    fx.parts.emit(r.pos.x, r.pos.y + 0.05, r.pos.z, (Math.random() - 0.5) * 2, 1 + Math.random() * 2, (Math.random() - 0.5) * 2, 0.08, 0.25, { shade: 1.4, grav: 9 });
  }
  if (r.boosting && r.grounded) {
    for (let k = 0; k < 2; k++) fx.parts.emit(r.pos.x, r.pos.y + 0.1, r.pos.z, -r.vel.x * 0.2 + (Math.random() - 0.5) * 2, 2 + Math.random() * 2, -r.vel.z * 0.2 + (Math.random() - 0.5) * 2, 0.35, 0.7, { shade: 1.1 });
  }
  tr.update(dt);
  for (const e of r.events) handleEvent(r, e, i);
}
function burst(p, n, power, size = 0.5) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, s = Math.random() * power;
    fx.parts.emit(p.x, p.y + 0.2, p.z, Math.cos(a) * s, 1 + Math.random() * power * 0.8, Math.sin(a) * s, size * (0.6 + Math.random()), 0.8 + Math.random() * 0.9, { shade: 0.85 + Math.random() * 0.3, drag: 1.8 });
  }
}
function handleEvent(r, e, i) {
  const me = r.isPlayer;
  const dist = r.pos.distanceTo(camera.position);
  switch (e.type) {
    case 'land':
      burst(r.pos, Math.floor(18 + e.impact * 40), 3 + e.impact * 4);
      if (me) { camState.shake = Math.min(1.2, 0.25 + e.impact * 0.8); audio.land(e.impact); }
      break;
    case 'ollie': if (me) audio.ollie(); burst(r.pos, 8, 2, 0.3); break;
    case 'launch': if (me) audio.whoosh(); break;
    case 'crash':
      burst(r.pos, 90, 6, 0.8);
      if (me) { camState.shake = 1.4; audio.crash(); popTrick(e.reason, 0, 1, true); flash(); }
      break;
    case 'trick':
      if (me) { popTrick(e.name, e.pts, e.mult, false, e.tag); audio.trick(e.pts); }
      break;
    case 'grindStart': if (me) audio.ollie(); break;
    case 'finish':
      if (me) { finishT = 0; state = 'finish'; audio.trick(2000); }
      break;
  }
}
function flash() {
  const f = $('flash'); f.style.transition = 'none'; f.style.background = 'rgba(255,255,255,0.55)'; f.style.opacity = 1;
  requestAnimationFrame(() => { f.style.transition = 'opacity .6s'; f.style.opacity = 0; });
}

// ---------------------------------------------------------------- results
function loadBest() { try { return JSON.parse(localStorage.getItem('summitline.best') || 'null'); } catch (e) { return null; } }
function saveBest(b) { try { localStorage.setItem('summitline.best', JSON.stringify(b)); } catch (e) { /* ignore */ } }
function showResults() {
  state = 'results';
  $('hud').classList.add('hidden'); $('touch').classList.add('hidden');
  // rivals still on course: project their finish from remaining distance
  for (const r of racers) if (!r.finished) { r.finishTime = r.time + Math.max(0, LENGTH - r.s) / Math.max(8, r.speed); r.finished = true; }
  const st = standings();
  const place = st.indexOf(player) + 1;
  const medal = $('resMedal');
  medal.className = 'medal ' + (place === 1 ? '' : place === 2 ? 'silver' : place === 3 ? 'bronze' : 'none');
  $('resPlace').textContent = place + ORD(place);
  $('resTitle').textContent = place === 1 ? 'Victory' : place <= 3 ? 'Podium finish' : 'Run complete';
  $('resTime').textContent = fmtTime(player.finishTime);
  $('resScore').textContent = player.score.toLocaleString();
  $('resTop').textContent = Math.round(player.topSpeed * 3.6) + ' km/h';
  $('resAir').textContent = player.totalAir.toFixed(1) + ' s';
  $('resBest').textContent = player.bestTrick ? `${player.bestTrick} (+${player.bestTrickPts.toLocaleString()})` : 'No tricks landed';
  const total = player.score + Math.max(0, Math.round((150 - player.finishTime) * 60)) + (4 - place) * 1500;
  const rank = total > 16000 ? 'S' : total > 11000 ? 'A' : total > 7000 ? 'B' : total > 4000 ? 'C' : 'D';
  $('resRank').textContent = rank;
  $('resBoard').innerHTML = st.map((r, i) => `<div class="${r.isPlayer ? 'me' : ''}"><span class="n">${i + 1}${ORD(i + 1)}</span><i style="background:#${new THREE.Color(r.palette.jacket).getHexString()}"></i>${r.name}<span class="t">${fmtTime(r.finishTime)}</span></div>`).join('');
  const best = loadBest();
  if (!best || player.finishTime < best.time) saveBest({ time: player.finishTime, score: Math.max(player.score, best?.score || 0) });
  else if (player.score > best.score) saveBest({ time: best.time, score: player.score });
  show('results', true);
}

// ---------------------------------------------------------------- main loop
let acc = 0, tTotal = 0;
const STEP = 1 / 60;
const frameTimes = []; window.__frameTimes = frameTimes;
function loop() {
  requestAnimationFrame(loop);
  window.__frames = (window.__frames || 0) + 1;
  const realDt = clock.getDelta();
  let dt = QA_STEPS ? QA_STEPS / 60 : Math.min(0.1, realDt);
  frameTimes.push(realDt * 1000); if (frameTimes.length > 3000) frameTimes.shift();
  tTotal += dt;
  if (paused) { renderer.render(world.scene, camera); return; }
  let simDt = dt;
  if (state === 'finish') simDt *= finishT < 1.4 ? 0.35 : 1;

  if (state === 'title') {
    // idle riders at the gate, gently shifting their weight
    racers.forEach((r) => { r.lean = Math.sin(tTotal * 0.8 + r.v) * 0.12; });
    placeRiders(dt);
    titleCam(tTotal);
  } else if (state === 'countdown') {
    countdownT -= dt;
    const n = Math.ceil(countdownT - 0.2);
    if (n !== lastCount && n >= 0) { lastCount = n; showCount(n); audio.beep(n === 0); }
    if (countdownT <= 0.2) { state = 'race'; racers.forEach(r => r.vel.copy(r.noseDir(new THREE.Vector3())).multiplyScalar(7)); setTimeout(() => showCount(null), 700); }
    placeRiders(dt);
    chaseCam(dt, player);
  } else if (state === 'race' || state === 'finish') {
    acc += simDt;
    let steps = 0;
    const inp = readInput();
    while (acc >= STEP - 1e-9 && steps < (QA_STEPS || 6)) {
      player.step(STEP, state === 'finish' ? { steer: 0, brake: player.speed > 5, tuck: false } : (AUTOPLAY ? readInput() : inp));
      racerFx(0, player, STEP);
      ais.forEach((ai, k) => { const r = racers[k + 1]; r.step(STEP, ai.input(STEP, player.s, true)); racerFx(k + 1, r, STEP); });
      acc -= STEP; steps++;
    }
    if (steps >= (QA_STEPS || 6)) acc = 0;
    placeRiders(simDt);
    if (state === 'finish') {
      finishT += dt;
      finishCam(dt, finishT);
      if (finishT > 3.2) showResults();
    } else chaseCam(dt, player);
    updateHUD(dt);
    comboLabel();
    if (popT > 0) { popT -= dt; if (popT <= 0.5) $('trickPop').classList.add('fade'); }
  } else if (state === 'results') {
    placeRiders(dt);
    const t = tTotal * 0.12;
    const p = player.pos;
    camera.position.lerp(_w.set(p.x + Math.sin(t) * 9, p.y + 3.5, p.z + Math.cos(t) * 9), 1 - Math.exp(-dt));
    camera.lookAt(p.x, p.y + 1, p.z);
  }
  // world upkeep
  const focus = state === 'title' ? racers[0].pos : player.pos;
  world.follow(focus);
  fx.parts.update(dt);
  fx.crystals.update(tTotal, camera.position, innerHeight * renderer.getPixelRatio());
  audio.update({
    speed: state === 'race' ? player.speed : 0, edge: player.edge, brake: player.brakeAmt, grounded: player.grounded,
    grind: !!player.grind, air: !player.grounded, boosting: player.boosting, musicOn: state !== 'loading',
  });
  renderer.render(world.scene, camera);
}

canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;clearInput();$('loading').classList.add('show');$('loadTxt').textContent='Graphics interrupted. Reload to return to the mountain.';});
canvas.addEventListener('webglcontextrestored',()=>location.reload());
setupTouch();
boot().catch((e) => { state='error';console.error(e); $('loadTxt').textContent = 'Could not load: ' + e.message; });


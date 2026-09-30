// The game controller: turns taps into farm actions, farm events into sound / particles / dialogs,
// runs the title, the first-play guide, the story moments and the Arcade SDK hooks.
import * as THREE from 'three';
import { SU } from './gfx/shaders.js';
import { UI } from './ui/ui.js';
import { icon } from './ui/icons.js';
import { makePanels } from './ui/panels.js';
import { FarmScene } from './gfx/scene.js';
import { Life } from './gfx/life.js';
import { Labels } from './gfx/labels.js';
import { BlobLayer } from './gfx/blobs.js';
import { Particles, Ambient, Rain, Floaters } from './gfx/fx.js';
import { SEASONS } from './gfx/sky.js';
import { heightAt, WATER_Y } from './gfx/terrain.js';
import { blocked, PENS, SITES, PATCHES, FIXED, CAMERA_BOUNDS } from './layout.js';
import { CROPS, ANIMALS, ITEMS, BUILDINGS, RECIPES, DECOR, NPCS, CHAPTERS, UNLOCKS, itemName, xpNeed, TIPS, COSMETICS } from './data.js';
import { ALL_PLOTS, PLOT, dayNumber } from './state.js';
import { fmt, fmtTime, clamp, pick, el } from './util.js';

const I = (n, s = 32) => icon(n, s);
const V3 = THREE.Vector3;

export class Game {
  constructor({ engine, assets, farm, audio, sky }) {
    Object.assign(this, { engine, assets, farm, audio, sky });
    this.rig = engine.rig; this.scene3 = engine.scene;
    this.ui = null; this.mode = 'boot'; this.queue = []; this.brush = null; this.hold = 0; this.tick1 = 0; this.tick5 = 0; this.ghost = null;
    this.lastActor = 0; this.lastHint = ''; this.weather = { type: 'clear', t: 0, next: 120 + Math.random() * 200, amt: 0, target: 0 };
    this.seenTips = new Set(); this.titleT = 0; this.paused = false;
  }

  // ---- setup ---------------------------------------------------------------------------------------------
  build(paint) {
    const { engine, assets, farm } = this;
    this.ui = new UI(this); this.P = makePanels(this);
    this.labels = new Labels(this.ui.labelsRoot, engine.rig);
    this.blobs = new BlobLayer(engine.scene);
    this.particles = new Particles(engine.scene, 520, false); this.glow = new Particles(engine.scene, 260, true);
    this.ambient = new Ambient(engine.scene); this.rain = new Rain(engine.scene);
    this.floaters = new Floaters(this.ui.floatRoot, engine.rig);
    const ctx = { engine, scene: engine.scene, assets, farm, labels: this.labels, blobs: this.blobs, particles: this.particles, floaters: this.floaters, paint, audio: this.audio, iconHtml: I };
    this.farmScene = new FarmScene(ctx); this.farmScene.onTapObject = (o) => this.tapObject(o);
    this.farmScene.build();
    this.life = new Life(Object.assign({}, ctx, { scene: this.farmScene, iconHtml: I })); this.life.makeHat = (id) => this.makeHat(id);
    this.life.build();
    this.crops = this.farmScene.crops;
    this.portraits = this.life.renderPortraits();
    this.life.syncCosmetics();
    this.hookRig(); this.hookFarm();
    for (const [id, n] of Object.entries(this.life.npcs)) this.labels.add('npc_' + id, { x: n.x, y: 2.15, z: n.z, cls: 'name', html: `<b>${n.name}</b>`, prio: 0, max: 22 });
    this.applyEnvironment(true);
    this.resize();
    engine.onUpdate.push((dt) => this.update(dt));
    engine.onQuality.push((q, cfg) => this.qualityChanged(q, cfg));
    this.qualityChanged(engine.quality, engine.q, true);
  }

  resize() { const h = this.engine.h; this.particles.setViewport(h); this.glow.setViewport(h); this.ambient.setViewport(h); }

  qualityChanged(name, cfg, first) {
    if (this.grass) { this.grass.setDensity(cfg.grass / this.grass.total); this.flowers.setDensity(cfg.flowers / this.flowers.total); }
    if (this.forest) this.forest.setDensity(cfg.trees);
    this.particleScale = cfg.particles;
    if (!first) this.toastOnce('gfx', `Graphics set to ${name} to keep things smooth.`);
  }

  hookRig() {
    const rig = this.rig;
    rig.bounds = CAMERA_BOUNDS;
    rig.onTap = (x, y) => this.tap(x, y);
    rig.onDoubleTap = (x, y) => this.doubleTap(x, y);
    rig.onUser = () => { this.userMoved = true; };
    rig.brushTest = (x, y) => this.brushTest(x, y);
    rig.onBrush = (phase, x, y) => this.onBrush(phase, x, y);
  }

  // ---- farm events -> feel ---------------------------------------------------------------------------------
  hookFarm() {
    const f = this.farm, A = this.audio, ui = this.ui, self = this;
    let dirtyTimer = 0;
    f.on('change', () => { self.needsRefresh = true; });
    f.on('coins', (e) => { if (e.n > 0 && !self.suppressCoinFly) self.coinsFly(e.n, e.why); ui.updateHud(); });
    f.on('stars', () => ui.updateHud());
    f.on('xp', (e) => { ui.updateHud(); if (e.at) this.farmScene.floaters.spawn(e.at.x, 2.4, e.at.z, `+${e.n} XP`, 'xp'); });
    f.on('plant', (e) => { A.sfx('plant'); this.puff(e.x, 0.3, e.z, [0.45, 0.3, 0.15], 7); this.life.claireGo(e.x, e.z); this.farmScene.crops.sync(); this.checkTips(); });
    f.on('harvest', (e) => { A.sfx('harvest'); A.sfx('collect', { gain: 0.5 }); this.sparkle(e.x, 0.8, e.z, 12); this.floaters.spawn(e.x, 1.4, e.z, `+${e.qty} ${I(ITEMS[e.crop].icon, 30)}`, 'coin'); const p = this.rig.project(new V3(e.x, 1, e.z)); ui.fly(I(ITEMS[e.crop].icon, 40), [p.x, p.y], this.railPoint('barn'), 650); this.life.claireGo(e.x, e.z); this.farmScene.crops.sync(); if (e.crop === 'sunflower' && !this.said7 && f.S.stats.harvests > 3) { this.said7 = true; A.voice('claire_07'); } else if (!this.said3) { this.said3 = true; A.voice('claire_03'); } });
    f.on('collect', (e) => { A.sfx({ egg: 'cluck', milk: 'moo', truffle: 'oink', wool: 'baa', fleece: 'baa' }[e.item] || 'pop'); A.sfx('collect'); this.sparkle(e.x, 1, e.z, 12); this.floaters.spawn(e.x, 1.8, e.z, `+${e.qty} ${I(ITEMS[e.item].icon, 30)}`, 'coin'); const p = this.rig.project(new V3(e.x, 1.2, e.z)); ui.fly(I(ITEMS[e.item].icon, 40), [p.x, p.y], this.railPoint('barn'), 650); this.life.cheer(e.pen); });
    f.on('feed', (e) => { A.sfx(f.S.pens[e.pen] && PENS.find((p) => p.id === e.pen).animal === 'chicken' ? 'cluck' : 'pop'); this.floaters.spawn(e.x, 1.8, e.z, 'Yum!', 'coin'); this.life.cheer(e.pen); this.life.claireGo(e.x, e.z + 2); });
    f.on('jobstart', (e) => { A.sfx('place'); this.puff(e.x, 2.2, e.z, [1, 1, 1], 5); });
    f.on('made', (e) => { A.sfx('ding'); this.sparkle(e.x, 2.2, e.z, 14); const first = Object.keys(e.got)[0]; this.floaters.spawn(e.x, 3, e.z, `+${e.got[first]} ${I(ITEMS[first].icon, 32)}`, 'coin'); const p = this.rig.project(new V3(e.x, 2, e.z)); ui.fly(I(ITEMS[first].icon, 40), [p.x, p.y], this.railPoint('barn'), 700); this.life.claireGo(e.x, e.z + 2.4); if (e.building === 'bakery' && !this.said6) { this.said6 = true; A.voice('claire_06'); } });
    f.on('sold', (e) => { A.sfx('coin'); });
    f.on('order', (e) => { A.sfx('reward'); A.voice('claire_05'); this.life.claireWave(); ui.confettiBurst(24); });
    f.on('orders', () => { this.needsRefresh = true; });
    f.on('boatsent', (e) => { A.sfx('horn'); A.sfx('cheer'); ui.confettiBurst(40); });
    f.on('boatback', () => { A.voice('claire_08'); A.sfx('horn'); ui.toast("Marta's boat is back!", 'good'); });
    f.on('built', (e) => { A.sfx('unlock'); A.sfx('place'); if (e.x !== undefined) { this.sparkle(e.x, 1.5, e.z, 30); this.puff(e.x, 0.6, e.z, [0.85, 0.8, 0.7], 16); } this.refreshBuilt(e); });
    f.on('animal', (e) => { A.sfx('pop'); this.life.syncHerd(e.pen); this.needsRefresh = true; });
    f.on('decor', () => { this.farmScene.syncDecor(); this.needsRefresh = true; });
    f.on('levelup', (e) => { this.sdkState(this.mode === 'play' ? 'play' : this.mode); A.sfx('levelup'); A.voice('claire_09', true); this.life.claireWave(); ui.confettiBurst(80); this.queueDialog(() => this.levelDialog(e)); this.applyProgressUnlocks(e); });
    f.on('chapterready', (e) => { A.sfx('powerup'); ui.toast(`Goal done: ${e.ch.title}! Tap the goal bar.`, 'good', 3600); });
    f.on('chapter', (e) => { A.sfx('win'); this.queueDialog(() => this.chapterDialog(e)); });
    f.on('finale', () => { this.queue.push(() => this.finale()); });
    f.on('met', (e) => { A.voice('claire_04', true); A.sfx('unlock'); });
    f.on('critter', () => { ui.toast('A new critter friend for the album!', 'good'); });
    f.on('albumset', (e) => { ui.toast(`Album page finished: ${e.set.name}! +${e.set.reward.coins} coins`, 'good', 3600); A.sfx('win'); ui.confettiBurst(50); });
    f.on('ach', (e) => { A.sfx('unlock'); ui.toast(`Award: ${e.def.name}!`, 'good'); });
    f.on('daily', () => { A.voice('claire_14', true); A.sfx('reward'); ui.confettiBurst(50); });
    f.on('newday', () => { this.needsRefresh = true; });
    f.on('quests', () => { this.needsRefresh = true; });
    f.on('questdone', () => { A.sfx('reward'); });
    f.on('eventbasket', () => { A.sfx('reward'); ui.confettiBurst(30); });
    f.on('wear', () => { this.life.syncCosmetics(); this.applyBarnColor(); this.needsRefresh = true; });
    f.on('barn', () => { A.sfx('unlock'); ui.toast('The barn is bigger now!', 'good'); });
    f.on('gift', () => { A.sfx('reward'); });
    f.on('favour', () => { A.sfx('reward'); ui.confettiBurst(24); });
    f.on('invite', (e) => { A.sfx('bell'); ui.confettiBurst(20); });
    f.on('codes', () => { ui.updateHud(); ui.toast('Codes on: awards rest until you reload.', 'warn'); });
    f.on('savefail', () => this.toastOnce('savefail', 'Your device would not let me save. Try freeing some space.'));
    f.on('reset', () => location.reload());
  }

  sdkState(scene) { if (!window.ArcadeSDK) return; try { const S = this.farm.S; ArcadeSDK.state({ scene, score: S.level * 1000 + Math.min(999, S.stats.harvests), level: S.level, stars: Math.min(3, Math.floor(this.farm.S.story.i / 4)) }); } catch (e) {} }
  toastOnce(key, text, kind) { if (this.seenTips.has(key)) return; this.seenTips.add(key); this.ui.toast(text, kind); }
  railPoint(which) { const b = this.ui.hud.querySelector('[data-act="barn"]'); if (b) { const r = b.getBoundingClientRect(); if (r.width) return [r.left + r.width / 2, r.top + r.height / 2]; } return [40, 300]; }
  puff(x, y, z, c, n) { if (this.particleScale === 0) return; this.particles.burst(Math.round(n * (this.particleScale || 1)), { x, y, z, life: 0.8, size: 0.6, size2: 1.4, speed: 1.3, up: 0.8, gravity: -0.2, drag: 1.5, color: c, alpha: 0.6, alpha2: 0, kind: 1 }); }
  sparkle(x, y, z, n) { this.glow.burst(Math.round(n * (this.particleScale || 1)), { x, y, z, life: 0.9, size: 0.34, size2: 0.05, speed: 2.4, up: 2.2, gravity: 4, color: [1, 0.85, 0.3], alpha: 1, alpha2: 0, kind: 3 }); }
  coinsFly(n, why) {
    const to = this.ui.hudPoint('coins'); const cnt = Math.min(6, 2 + Math.floor(n / 40));
    const from = this.lastTapPos || [innerWidth / 2, innerHeight * 0.6];
    for (let i = 0; i < cnt; i++) setTimeout(() => this.ui.fly(I('coin', 30), [from[0] + (Math.random() - 0.5) * 40, from[1] + (Math.random() - 0.5) * 30], to, 650 + i * 40), i * 70);
  }

  // ---- input ---------------------------------------------------------------------------------------------------------
  brushTest(x, y) {
    if (window.__cfDebug) console.log('brushTest', x | 0, y | 0, 'busy', this.ui.busy, 'mode', this.mode, 'ghost', !!this.ghost, 'brush', JSON.stringify(this.brush));
    if (this.ui.busy || this.mode !== 'play' || this.ghost) return false;
    const g = this.rig.ground(x, y), plot = this.farmScene.plotAt(g.x, g.z);
    if (this.brush && this.brush.mode === 'plant') return true;
    return !!(plot && this.farm.plotInfo(plot.id).state === 'ripe');
  }
  onBrush(phase, x, y) {
    if (window.__cfDebug && phase !== 'move') console.log('onBrush', phase, x | 0, y | 0);
    if (phase === 'cancel' || phase === 'up') { if (phase === 'up' && this.brushStroke && this.brushStroke.n === 0 && this.brush && this.brush.mode === 'plant') { /* a tap on ground in plant mode: nothing */ } this.brushStroke = null; this.lastTapPos = [x, y]; return; }
    const g = this.rig.ground(x, y), plot = this.farmScene.plotAt(g.x, g.z);
    if (phase === 'down') { this.brushStroke = { n: 0, last: null, harvest: !(this.brush && this.brush.mode === 'plant') }; this.lastTapPos = [x, y]; }
    if (!this.brushStroke || !plot || this.brushStroke.last === plot.id) return;
    this.brushStroke.last = plot.id;
    const info = this.farm.plotInfo(plot.id);
    if (this.brush && this.brush.mode === 'plant') {
      if (info.state === 'empty') {
        const r = this.farm.plant(plot.id, this.brush.crop);
        if (r.ok) this.brushStroke.n++; else if (r.reason === 'coins') { this.ui.toast('Not enough coins for more seeds.', 'warn'); this.endBrush(); }
      } else if (info.state === 'ripe' && phase === 'down') { if (this.farm.harvest(plot.id).ok) this.brushStroke.n++; }
    } else if (info.state === 'ripe') { if (this.farm.harvest(plot.id).ok) this.brushStroke.n++; }
  }
  endBrush() { this.brush = null; this.rig.tOffsetY = 0; this.ui.hideDock(); this.ui.brush(null); }

  actorAt(x, y) {
    const rig = this.rig, v = new V3(); let best = null, bd = 1e9;
    const test = (id, gx, gz, h, r) => { v.set(gx, h, gz).project(rig.camera); if (v.z > 1) return; const px = (v.x * 0.5 + 0.5) * rig.w, py = (-v.y * 0.5 + 0.5) * rig.h, d = Math.hypot(px - x, py - y); if (d < r && d < bd) { bd = d; best = id; } };
    for (const [id, n] of Object.entries(this.life.npcs)) test('npc:' + id, n.x, n.z, 0.9, 40);
    const C = this.life.claire, P = this.life.pip;
    if (C) test('claire', C.x, C.z, 0.8, 38); if (P) test('pip', P.x, P.z, 0.35, 34);
    return best;
  }
  tap(x, y) {
    this.audio.unlock(); this.lastTapPos = [x, y];
    if (this.mode !== 'play' || this.ui.busy) return;
    if (this.ghost) return;
    const who = this.actorAt(x, y);
    if (who) return this.tapActor(who);
    const g = this.rig.ground(x, y), plot = this.farmScene.plotAt(g.x, g.z), hit = this.farmScene.pick(x, y);
    if (plot && (!hit || ['patch', 'pen', 'decor', 'dock'].includes(hit.kind))) return this.tapPlot(plot);
    if (hit) return this.tapObject(hit);
    if (this.brush) return;   // stay in planting mode until Done
  }
  doubleTap(x, y) {
    if (this.mode !== 'play' || this.ui.busy) return this.tap(x, y);
    const hit = this.farmScene.pick(x, y);
    if (hit && ['site', 'barn', 'cottage', 'market', 'pen', 'board'].includes(hit.kind)) {
      const c = hit.box.getCenter(new V3()); this.rig.focus(c.x, c.z, 11, 0.8, 0.12); this.tap(x, y);
    } else this.tap(x, y);
  }

  tapPlot(plot) {
    const info = this.farm.plotInfo(plot.id);
    if (info.state === 'empty') {
      if (this.brush && this.brush.mode === 'plant') { const r = this.farm.plant(plot.id, this.brush.crop); if (!r.ok && r.reason === 'coins') { this.ui.toast('Not enough coins for more seeds.', 'warn'); this.audio.sfx('error'); } return; }
      this.openSeedDock(plot.id);
    } else if (info.state === 'growing') {
      const c = ALL_CROP(info.crop); this.audio.sfx('tap'); this.floaters.spawn(plot.x, 1.3, plot.z, `${c.name} ${fmtTime(info.left)}`, 'xp', 1.6); this.life.claireGo(plot.x, plot.z);
    } else if (info.state === 'ripe') this.farm.harvest(plot.id);
  }
  tapActor(who) {
    this.audio.sfx('tap');
    if (who === 'claire') { this.life.claireWave(); this.audio.voice(pick(['claire_13', 'claire_01', 'claire_02']), true); this.ui.toast(pick(TIPS), '', 4200); return; }
    if (who === 'pip') { this.life.petPip(); this.audio.sfx('bark'); this.particles.burst(6, { x: this.life.pip.x, y: 0.9, z: this.life.pip.z, life: 1.1, size: 0.5, speed: 0.7, up: 1.4, gravity: -0.4, color: [1, 0.35, 0.5], kind: 3, alpha: 1, alpha2: 0 }); this.farm.stat('pips'); return; }
    if (who.startsWith('npc:')) this.openNpc(who.slice(4));
  }
  tapObject(o) {
    this.audio.sfx('tap');
    const f = this.farm;
    switch (o.kind) {
      case 'barn': return this.open('barn');
      case 'market': return this.open('market');
      case 'board': return this.open('orders');
      case 'cottage': this.life.claireWave(); return this.open('goals');
      case 'boat': case 'dock': return f.S.level >= 3 ? this.open('boat') : this.ui.toast("Marta's boat comes at level 3.", '');
      case 'patch': return this.confirmBuy('patch', o.id);
      case 'pen': { if (!f.penBuilt(o.id)) return this.confirmBuy('pen', o.id); return this.penQuick(o.id); }
      case 'site': { if (!f.buildingBuilt(o.id)) return this.confirmBuy('site', o.id); if (f.readyJobs(o.id)) return f.collectJobs(o.id); if (o.id === 'hall') { this.life.claireWave(); return this.open('more', 'event'); } return this.open('building', o.id); }
      case 'decor': return this.decorMenu(o.decor || o);
    }
  }
  penQuick(id) {
    const f = this.farm, info = f.penInfo(id);
    if (info.ready) { f.collectPen(id); return; }
    if (info.hungry) { const r = f.feedPen(id); if (r.ok) return; }
    this.open('pen', id);
  }

  // ---- crops dock ----------------------------------------------------------------------------------------------------------
  openSeedDock(plotId) {
    const f = this.farm, L = f.S.level;
    const list = CROPS.filter((c) => c.level <= L + 3).slice(0, 12);
    const html = `<div class="seeds" role="listbox" aria-label="Pick a seed">${list.map((c) => { const ok = c.level <= L; return `<button class="seed ${ok ? '' : 'locked'}" data-act="${ok ? 'pickSeed' : 'seedLocked'}" data-id="${c.id}" data-lv="${c.level}" data-plot="${plotId}">${I(ok ? c.icon : 'lock', 44)}<div>${c.name}</div><small>${ok ? I('coin', 14) + ' ' + c.seed + ' &middot; ' + fmtTime(c.sec) : 'Level ' + c.level}</small></button>`; }).join('')}</div><button class="btn grey small cancel" data-act="brushDone">Cancel</button>`;
    this.ui.seedDock(html);
    this.ui.tip(null);
    this.pendingPlot = plotId;
    // lift the picture only when the tapped field would sit behind the seed tray, and keep it lifted while planting so the fields never slide under your finger
    const P = PLOT[plotId], sp = P ? this.rig.project(new V3(P.x, 0, P.z)) : null;
    this.rig.tOffsetY = sp && sp.y > this.rig.h * 0.55 ? Math.min(0.22, (sp.y - this.rig.h * 0.45) / this.rig.h) : 0;
    this.audio.voice('claire_02');
  }

  // ---- sheets ----------------------------------------------------------------------------------------------------------------
  open(name, arg) {
    if (this.mode !== 'play') return;
    this.endBrush();
    const P = this.P; let def;
    if (name === 'barn') def = P.barn(); else if (name === 'market') def = P.market(); else if (name === 'orders') def = P.orders(); else if (name === 'boat') def = P.boat();
    else if (name === 'shop') def = P.shop(arg); else if (name === 'building') def = P.building(arg); else if (name === 'pen') def = P.pen(arg);
    else if (name === 'goals') def = P.goals(arg); else if (name === 'more') def = P.more(arg); else if (name === 'settings') def = P.settings();
    if (!def) return;
    if (arg && (name === 'goals' || name === 'more' || name === 'shop')) def.tab = arg;
    this.ui.openSheet(def);
    if (name === 'building') this.rig.tOffsetY = 0.16;
    this.audio.sfx('button');
  }
  sheetOpened(id) { this.rig.tOffsetY = /^(b_|pen_)/.test(id) ? 0.14 : 0; }
  sheetClosed(id) { this.rig.tOffsetY = 0; this.needsRefresh = true; this.flushQueue(); }
  dialogClosed() { this.flushQueue(); }

  confirmBuy(kind, id) {
    const f = this.farm, ui = this.ui;
    const def = kind === 'patch' ? PATCHES.find((p) => p.id === id) : kind === 'pen' ? PENS.find((p) => p.id === id) : SITES.find((s) => s.id === id);
    const name = kind === 'patch' ? `Field ${id}` : def.name;
    if (f.S.level < def.level) { ui.dialog(`<h2>${name}</h2><p>${I('lock', 40)}</p><p>This unlocks at <b>level ${def.level}</b>. Keep farming and you will get there!</p><div class="btns"><button class="btn" data-act="closeDialog">OK</button></div>`); return; }
    const ic = kind === 'patch' ? 'land' : kind === 'pen' ? (def.animal === 'bee' ? 'bee' : def.animal) : 'hammer';
    const blurb = kind === 'patch' ? 'Six more beds for your crops.' : kind === 'pen' ? `Room for ${def.cap} ${ANIMALS.find((a) => a.pen === id).name.toLowerCase()}s.` : BUILDINGS[id].blurb;
    ui.dialog(`<h2>${name}</h2><p>${I(ic, 64)}</p><p>${blurb}</p><div class="btns"><button class="btn buy" data-act="confirmBuy" data-kind="${kind}" data-id="${id}">${I('coin', 24)} ${fmt(def.cost)}</button><button class="btn grey" data-act="closeDialog">Not now</button></div>`, { close: false });
  }

  decorMenu(d) {
    const def = DECOR.find((q) => q.id === d.type); if (!def) return;
    this.ui.dialog(`<h2>${def.name}</h2><div class="btns"><button class="btn blue" data-act="moveDecor" data-id="${d.id}">Move</button><button class="btn red" data-act="storeDecor" data-id="${d.id}">Put away</button><button class="btn grey" data-act="closeDialog">Close</button></div><p class="note">Putting it away is free: you can place it again any time.</p>`);
  }

  // ---- decoration placement (the circle stays at the middle of the screen; slide the farm under it) ---------------------------------------------
  startGhost(type, movingId) {
    const def = DECOR.find((d) => d.id === type); if (!def) return;
    this.ui.closeSheet(); this.ui.closeDialog(); this.endBrush();
    const cam = this.rig.cur;
    let mesh = null;
    const proxy = this.makeGhostMesh(def);
    this.ghost = { def, type, moving: movingId || null, x: cam.x, z: cam.z, rot: 0, mesh: proxy, ok: true };
    this.farmScene.root.add(proxy);
    this.ui.ghost(true); this.ui.tip('Slide the farm so the circle sits where you like, then tap Place.');
    if (movingId) { this.movingHidden = movingId; }
    this.audio.sfx('button');
  }
  makeGhostMesh(def) {
    let g;
    try { g = def.model.startsWith('tree:') || ['bush', 'scarecrow', 'bench', 'picnic'].includes(def.model) ? null : this.assets.model(def.model, { width: def.width, height: def.height, shell: false }).group; } catch (e) { g = null; }
    if (!g) { g = new THREE.Mesh(new THREE.CylinderGeometry(def.r, def.r, 0.3, 16), new THREE.MeshBasicMaterial({ color: 0x66ff66, transparent: true, opacity: 0.6 })); }
    g.traverse((o) => { if (o.isMesh && o.material && o.material.uniforms && o.material.uniforms.uEmis) o.material.uniforms.uEmis.value.setRGB(0.15, 0.3, 0.1); });
    return g;
  }
  updateGhost() {
    const G = this.ghost; if (!G) return;
    const cam = this.rig.cur; G.x = Math.round(cam.x * 2) / 2; G.z = Math.round(cam.z * 2) / 2;
    G.mesh.position.set(G.x, 0.02, G.z); G.mesh.rotation.y = G.rot;
    const ok = this.canPlace(G.def, G.x, G.z, G.moving);
    G.ok = ok; this.ui.reticleBad(!ok);
    G.mesh.visible = true;
    G.mesh.traverse((o) => { if (o.isMesh && o.material && o.material.uniforms && o.material.uniforms.uEmis) o.material.uniforms.uEmis.value.setRGB(ok ? 0.05 : 0.5, ok ? 0.3 : 0.05, ok ? 0.05 : 0.05); });
  }
  canPlace(def, x, z, ignoreId) {
    if (x < -25 || x > 33 || z < -24 || z > 32) return false;
    if (heightAt(x, z) < WATER_Y + 0.45) return false;
    if (blocked(x, z, def.r * 0.5)) return false;
    for (const d of this.farm.S.decor) { if (d.id === ignoreId) continue; const o = DECOR.find((q) => q.id === d.type); if (Math.hypot(d.x - x, d.z - z) < (o ? o.r : 1) + def.r * 0.8) return false; }
    const c = this.life.claire; if (c && Math.hypot(c.x - x, c.z - z) < 0.6) return false;
    return true;
  }
  endGhost() { const G = this.ghost; if (!G) return; this.farmScene.root.remove(G.mesh); this.ghost = null; this.ui.ghost(false); this.ui.tip(null); }

  // ---- neighbours -------------------------------------------------------------------------------------------------------------------
  openNpc(id) {
    const f = this.farm, def = NPCS[id], n = f.npc(id);
    const first = !n.met; const r = f.greet(id);
    this.ui.tip(null);
    this.renderNpc(id, first ? "Hello! I'm " + def.name + ". Welcome to the meadow." : null);
    if (first) this.audio.sfx('unlock');
  }
  renderNpc(id, line) {
    const f = this.farm, def = NPCS[id], n = f.npc(id), ui = this.ui;
    f.ensureFavour(id);
    const fav = n.favour, hearts = Math.min(10, Math.floor(n.pts / 10));
    const txt = line || def.lines[(n.pts + dayNumber(f.now())) % def.lines.length];
    const canGift = f.have(def.gift) > 0 && n.lastGift !== dayKeyNow(f);
    const fair = f.chapterId() === 'fair' && !n.invited;
    ui.dialog(`<div class="who" style="background-image:url(${this.portraits[id] || ''})"></div><h2>${def.name}</h2><p style="margin:0;color:var(--ink2)">${def.role} &middot; friendship ${n.pts}</p><div class="chips" style="justify-content:center">${'<span class="chip" style="padding:0 4px">' + I('heart', 20) + '</span>'.repeat(0)}${Array.from({ length: 5 }, (_, i) => I(i < Math.floor(n.pts / 20) ? 'heart' : 'lock', 20)).join('')}</div><div class="speech">${txt}</div>
      ${fair ? `<div class="btns"><button class="btn buy" data-act="invite" data-id="${id}">${I('lantern', 28)} Invite to the Lantern Fair</button></div>` : n.invited ? `<p class="note">${I('check', 20)} ${def.name} is coming to the fair!</p>` : ''}
      ${fav ? `<div class="row" style="text-align:left;margin:8px 0 0"><div class="grow"><h3>${def.name} asks:</h3><div class="chips">${chipHtml(f, fav.item, fav.qty)}</div><div class="rew"><span>${I('coin', 20)}${fav.coins}</span><span style="color:#2f83c4">${fav.xp} XP</span><span>${I('heart', 20)}+${fav.pts}</span></div></div><button class="btn small ${f.have(fav.item) >= fav.qty ? '' : 'grey'}" data-act="favour" data-id="${id}">Give</button></div>` : ''}
      <div class="btns"><button class="btn blue small ${canGift ? '' : 'grey'}" data-act="giftNpc" data-id="${id}">${I(ITEMS[def.gift].icon, 24)} Give a gift</button><button class="btn grey small" data-act="closeDialog">Bye!</button></div>`, { close: false });
  }

  // ---- dialogs: level, chapter, welcome, finale ---------------------------------------------------------------------------------------
  queueDialog(fn) { this.queue.push(fn); this.flushQueue(); }
  flushQueue() { if (this.mode !== 'play' || this.ui.busy || this.brushBusy) return; const fn = this.queue.shift(); if (fn) setTimeout(() => { if (!this.ui.busy) fn(); else this.queue.unshift(fn); }, 350); }

  levelDialog(e) {
    const un = e.unlocks || [];
    const uh = un.length ? `<p style="margin-top:8px"><b>New:</b></p><div class="unl">${un.slice(0, 8).map((u) => `<div>${I(u.icon || 'sparkles', 44)}<span>${u.name}</span></div>`).join('')}</div>` : '';
    this.ui.dialog(`<div class="who" style="background-image:url(${this.portraits.claire || ''})"></div><div class="bigl">${e.level}</div><h2>Level up!</h2><p>You are now level ${e.level}.</p><div class="rew" style="justify-content:center;font-size:20px"><span>${I('coin', 26)}+${fmt(e.reward.coins)}</span><span>${I('gem', 26)}+${e.reward.stars}</span></div>${uh}<div class="btns"><button class="btn" data-act="closeDialog">Yay!</button></div>`, { close: false });
  }
  chapterDialog(e) {
    const next = CHAPTERS[e.index + 1];
    this.ui.dialog(`<div class="who" style="background-image:url(${this.portraits.claire || ''})"></div><h2>${e.ch.title}</h2><p>Chapter ${e.index + 1} finished!</p><div class="rew" style="justify-content:center;font-size:20px"><span>${I('coin', 26)}+${e.ch.coins}</span><span style="color:#2f83c4">${I('star', 26)}+${e.xp} XP</span></div>${e.cos ? `<p>${I('gift', 28)} A new ${COSMETICS.find((c) => c.id === e.cos).name} for Claire!</p>` : ''}${next ? `<div class="speech"><b>Next:</b> ${next.title}<br>${next.text}</div>` : ''}<div class="btns"><button class="btn" data-act="closeDialog">${next ? "Let's go!" : 'Wonderful!'}</button></div>`, { close: false });
    if (next) this.audio.voice(next.voice, true);
  }
  welcomeBack() {
    const a = this.farm.away; if (!a) return this.dailyPrompt();
    const mins = Math.round(a.secs / 60), ago = mins < 90 ? mins + ' minutes' : mins < 60 * 36 ? Math.round(mins / 60) + ' hours' : Math.round(mins / 1440) + ' days';
    const lines = [];
    if (a.ripe) lines.push(`${I('wheat', 26)} ${a.ripe} field${a.ripe > 1 ? 's' : ''} ripened`);
    if (a.animals) lines.push(`${I('egg', 26)} ${a.animals} animal${a.animals > 1 ? 's' : ''} made something`);
    if (a.jobs) lines.push(`${I('bread', 26)} ${a.jobs} batch${a.jobs > 1 ? 'es' : ''} finished`);
    if (a.boat) lines.push(`${I('boat', 26)} Marta's boat is back`);
    this.ui.dialog(`<div class="who" style="background-image:url(${this.portraits.claire || ''})"></div><h2>Welcome back!</h2><p>You were away for about ${ago}. The farm kept ticking along.</p>${lines.length ? `<div class="banner" style="text-align:left">${lines.join('<br>')}</div>` : ''}<p>Pip and the neighbours tidied up and left you a thank-you.</p><div class="rew" style="justify-content:center;font-size:22px"><span>${I('coin', 28)}+${a.coins}</span></div><div class="btns"><button class="btn" data-act="claimAway">Thank you!</button></div>`, { close: false, onClose: () => { this.farm.claimAway(); this.dailyPrompt(); } });
    this.audio.voice('claire_10', true);
  }
  dailyPrompt() {
    if (this.farm.dailyClaimable() && this.farm.S.story.i > 0) this.queueDialog(() => this.dailyDialog());
  }
  dailyDialog() {
    const f = this.farm; if (!f.dailyClaimable()) return;
    const d = f.S.daily, r = f.dailyReward(), scale = 1 + f.S.level / 8;
    const note = d.reset ? 'A fresh start today!' : d.rested ? 'Your streak took a little nap, and it is still safe.' : `Day ${d.streak} in a row!`;
    this.ui.dialog(`<div class="who" style="background-image:url(${this.portraits.claire || ''})"></div><h2>Good morning, farm!</h2><p>${note}</p><div style="margin:8px 0">${I('gift', 84)}</div><div class="rew" style="justify-content:center;font-size:22px">${r.coins ? `<span>${I('coin', 28)}+${Math.round(r.coins * scale)}</span>` : ''}${r.stars ? `<span>${I('gem', 28)}+${r.stars}</span>` : ''}${r.item ? `<span>${I(ITEMS[r.item].icon, 30)}x${r.qty}</span>` : ''}</div><div class="btns"><button class="btn buy" data-act="claimDaily">Open my gift</button><button class="btn grey small" data-act="closeDialog">Later</button></div>`, { close: false });
  }

  finale() {
    const ui = this.ui, f = this.farm; this.finaleOn = true;
    ui.closeSheet(true); ui.closeDialog(true);
    this.sky.frozen = true; this.todTarget = 0.82;
    this.audio.sfx('bell'); setTimeout(() => this.audio.voice('claire_11', true), 800);
    this.audio.playMusic('night');
    this.sdkState('over');
    this.rig.focus(FIXED.fountain.x, FIXED.fountain.z, 14, 2.5, 0.05);
    ui.dark.classList.add('on'); ui.show(false);
    // lanterns rise one by one, then fireworks
    let n = 0;
    const iv = setInterval(() => { n++; for (let i = 0; i < 6; i++) this.glow.emit({ x: FIXED.fountain.x + (Math.random() - 0.5) * 14, y: 0.4, z: FIXED.fountain.z + (Math.random() - 0.5) * 10, vx: 0.05, vy: 0.6 + Math.random() * 0.4, vz: 0.05, life: 9, size: 0.7, size2: 0.55, color: [1, 0.7 + Math.random() * 0.2, 0.3], alpha: 0.95, alpha2: 0, kind: 1, wob: 0.4 }); if (n % 3 === 0) this.audio.sfx('lantern'); if (n > 26) clearInterval(iv); }, 350);
    setTimeout(() => { this.audio.sfx('fireworks'); for (let k = 0; k < 6; k++) setTimeout(() => { const cx = FIXED.fountain.x + (Math.random() - 0.5) * 16, cz = FIXED.fountain.z - 6 + Math.random() * 3, cy = 7 + Math.random() * 3, c = [[1, 0.4, 0.4], [1, 0.85, 0.3], [0.5, 0.8, 1], [0.7, 1, 0.5]][k % 4]; this.glow.burst(40, { x: cx, y: cy, z: cz, life: 1.6, size: 0.4, size2: 0.06, speed: 6, up: 0.1, gravity: 2.2, drag: 0.8, color: c, alpha: 1, alpha2: 0, kind: 3 }); this.audio.sfx('pop'); }, k * 550); }, 3600);
    setTimeout(() => {
      ui.show(true); ui.dark.classList.remove('on');
      ui.dialog(`<div class="who" style="background-image:url(${this.portraits.claire || ''})"></div><h2>The first Lantern Fair!</h2><p>The lane glows, the tables are full, and every neighbour is here. Milo, June, Hazel and Theo say thank you.</p><p>${I('lantern', 48)}</p><div class="speech">Thank you, God, for another beautiful day!</div><p class="note">This is the beginning of life here, not the end. The farm is all yours.</p><div class="btns"><button class="btn buy" data-act="finaleDone">Keep playing</button></div>`, { close: false });
      ui.confettiBurst(120);
      this.audio.voice('claire_14', true);
    }, 9000);
  }
  finaleDone() {
    this.ui.closeDialog(true); this.finaleOn = false; this.sky.frozen = false; this.todTarget = null;
    this.sdkState('play');
    this.audio.playMusic('day'); this.rig.focus(0, 3, 16, 1.5, 0);
    this.farm.claimAch('fair_finale');
  }

  // ---- title & first play ------------------------------------------------------------------------------------------------------------------
  showTitle() {
    const ui = this.ui, f = this.farm;
    this.mode = 'title'; ui.show(false); this.endBrush(); ui.closeSheet(true); ui.closeDialog(true);
    const has = !f.isNew;
    ui.title.innerHTML = `<div class="logo">Claire's<br>Farm<small>${has ? `Level ${f.S.level} &middot; ${fmt(f.S.coins)} coins` : 'A cosy 3D farm for everyone'}</small></div>
      <div class="menu"><button class="btn buy play" id="playBtn" data-act="play">${has ? 'Continue' : 'Play'}</button><div class="sm"><button class="btn blue small" data-act="howto">How to play</button><button class="btn grey small" data-act="titleSettings">Settings</button></div></div><div class="ver">3D edition &middot; runs great on phones</div>`;
    ui.title.classList.add('on'); this.ui.title.querySelectorAll('button').forEach((b) => (b.style.pointerEvents = 'auto'));
    this.rig.enabled = false; this.titleT = 0; this.sky.frozen = false;
    this.sdkState('title');
    this.audio.playMusic('theme');
  }
  play() {
    const ui = this.ui, f = this.farm;
    this.audio.unlock(); this.audio.playMusic('day');
    ui.title.classList.remove('on'); ui.title.innerHTML = '';
    this.mode = 'play'; ui.show(true); this.rig.enabled = true; this.userMoved = false;
    this.rig.tgt.pitch = 42 * Math.PI / 180; this.rig.tgt.yaw = 28 * Math.PI / 180;
    this.rig.focus(-1, 5, this.rig.aspect < 1 ? 16 : 17, 1.4, 0);
    this.sdkState('play');
    ui.updateHud(); this.updateGoal(); this.refreshBadges();
    this.audio.voice('claire_01', true);
    if (!f.S.story.intro) { f.S.story.intro = true; this.introDialog(); } else this.welcomeBack();
    this.checkTips(); this.applyEnvironment();
  }
  introDialog() {
    this.ui.dialog(`<div class="who" style="background-image:url(${this.portraits.milo || ''})"></div><h2>Welcome, Claire!</h2><div class="speech">Hello! I'm Milo. This quiet corner of Little Meadow once hosted the Lantern Fair. Plant a few seeds and let's see if we can light it up again.</div><p class="note">Drag to look around. Pinch to zoom. Twist two fingers to turn the farm.</p><div class="btns"><button class="btn" data-act="closeDialog">Let's plant!</button></div>`, { close: false, onClose: () => { this.audio.voice('claire_02', true); this.checkTips(); } });
  }
  howTo() {
    this.ui.dialog(`<h2>How to play</h2><div style="text-align:left;font-size:17px;line-height:1.3"><p>${I('seedling', 26)} <b>Tap a field</b>, pick a seed, then <b>drag over more fields</b> to plant them.</p><p>${I('sunflower', 26)} When crops <b>glow gold</b>, tap or drag across them to harvest.</p><p>${I('cow', 26)} Tap your <b>animal pens</b> to feed them and collect.</p><p>${I('bread', 26)} Build <b>workshops</b> to turn crops into treats.</p><p>${I('orders', 26)} Fill <b>orders</b> and Marta's <b>boat</b> for coins and XP.</p><p>${I('crown', 26)} Drag one finger to look around, pinch to zoom, <b>twist two fingers</b> to turn, or use the buttons on the right.</p></div><div class="btns"><button class="btn" data-act="closeDialog">Got it</button></div>`, { close: true });
  }

  // ---- goal bar, badges, tips -----------------------------------------------------------------------------------------------------------
  updateGoal() {
    const f = this.farm, c = f.chapter(), ui = this.ui;
    if (c.done) { const q = f.S.quests.list.find((q) => !q.claimed); ui.goal({ small: 'The Lantern Fair is lit', text: q ? `Today: ${questLine(q)}` : 'Keep growing and decorating!', frac: q ? f.questProgress(q) / q.n : 1, face: this.portraits.claire, ready: false }); return; }
    ui.goal({ small: `Chapter ${c.index + 1}: ${c.ch.title}`, text: `${c.ch.goal}  ${c.have}/${c.target}`, frac: c.have / c.target, face: this.portraits.claire, ready: c.ready });
  }
  refreshBadges() {
    const f = this.farm, ui = this.ui, S = f.S;
    const fillable = S.orders.filter((o) => f.canFill(o)).length;
    ui.dot('dotOrders', f.orderSlots() ? fillable : 0);
    ui.dot('dotGoals', f.chapter().ready ? 1 : 0);
    ui.dot('dotDaily', (f.dailyClaimable() ? 1 : 0) + S.quests.list.filter((q) => !q.claimed && f.questProgress(q) >= q.n).length);
    ui.dot('dotBarn', f.basketCount() ? 1 : 0);
    ui.dot('dotMore', f.achReady());
    let shop = 0; for (const s of SITES) if (!f.buildingBuilt(s.id) && S.level >= s.level && S.coins >= s.cost) shop++; for (const p of PENS) if (!f.penBuilt(p.id) && S.level >= p.level && S.coins >= p.cost) shop++;
    ui.dot('dotShop', shop);
    // world badges for things that are ready
    const L = this.labels;
    for (const s of SITES) {
      const id = 'ready_' + s.id; const n = f.buildingBuilt(s.id) ? f.readyJobs(s.id) : 0;
      if (n) { const out = Object.keys(RECIPES[(f.jobs(s.id).find((j) => j.done) || {}).recipe || Object.keys(RECIPES)[0]].out)[0]; L.add(id, { x: s.x, y: 5.4, z: s.z, cls: 'ready', html: `${I(ITEMS[out].icon, 40)}<b>${n}</b>`, onTap: () => f.collectJobs(s.id), label: 'Collect', max: 30 }); } else L.remove(id);
    }
    for (const p of PENS) {
      const id = 'penr_' + p.id; const info = f.penBuilt(p.id) ? f.penInfo(p.id) : null;
      if (info && info.ready) L.add(id, { x: p.x, y: 3.2, z: p.z, cls: 'ready', html: `${I(ITEMS[info.animal.product].icon, 40)}<b>${info.ready}</b>`, onTap: () => f.collectPen(p.id), label: 'Collect' });
      else if (info && info.hungry) L.add(id, { x: p.x, y: 3.0, z: p.z, cls: 'ready', html: `${I(ITEMS[Object.keys(info.animal.feed)[0]].icon, 40)}<span>Feed me</span>`, onTap: () => f.feedPen(p.id).ok || this.open('pen', p.id), label: 'Feed' });
      else L.remove(id);
    }
    const b = f.boatInfo();
    if (b && b.state === 'docked') L.add('boatbadge', { x: this.farmScene.boatBase.x, y: 5, z: this.farmScene.boatBase.z, cls: 'ready', html: `${I('boat', 40)}<span>${f.boatFill() ? 'Ready!' : 'Orders'}</span>`, onTap: () => this.open('boat'), label: 'Open the boat' }); else L.remove('boatbadge');
    if (fillable) L.add('orderbadge', { x: FIXED.board.x, y: 3.6, z: FIXED.board.z, cls: 'ready', html: `${I('orders', 38)}<b>${fillable}</b>`, onTap: () => this.open('orders'), label: 'Orders ready' }); else L.remove('orderbadge');
    if (f.dailyClaimable() && S.story.i > 0) L.add('giftbadge', { x: FIXED.cottage.x + 2.2, y: 5.6, z: FIXED.cottage.z + 1, cls: 'ready', html: `${I('gift', 40)}`, onTap: () => this.dailyDialog(), label: 'Daily gift' }); else L.remove('giftbadge');
  }
  checkTips() {
    const f = this.farm, S = f.S, ui = this.ui;
    if (this.mode !== 'play') return;
    const hasPlanted = Object.keys(S.plots).length > 0, ripe = f.ripePlots().length;
    let tip = null, pt = null;
    if (S.story.i === 0 && S.stats.harvests < 6) {
      if (!hasPlanted && S.stats.planted === 0) { tip = 'Tap a field to plant your first wheat!'; pt = PLOT.A1; }
      else if (ripe) { tip = 'Golden wheat! Tap it, or drag across a row to harvest.'; pt = PLOT[f.ripePlots()[0]]; }
      else if (hasPlanted && Object.keys(S.plots).length < 6) { const empty = ALL_PLOTS.find((p) => p.patch === 'A' && !S.plots[p.id]); tip = 'Plant more fields: pick wheat and drag over them.'; pt = empty; }
      else if (hasPlanted) tip = 'Wheat is growing. It ripens in about 20 seconds.';
    } else if (S.story.i === 1 && S.stats.orders === 0 && S.orders.length) { tip = "Milo's first order is on the board. Tap the board!"; pt = FIXED.board; }
    ui.tip(this.ui.busy || this.brush ? null : tip);
    this.pointAt(this.ui.busy || this.brush ? null : pt);
  }
  pointAt(p) { this.pointTarget = p ? new V3(p.x, 0.6, p.z) : null; this.ui.pointer.classList.toggle('on', !!p); }

  applyProgressUnlocks() { this.farmScene.buildAllLots && 0; this.refreshWorldLots(); }
  refreshWorldLots() { for (const p of PATCHES) this.farmScene.buildPatch(p); for (const p of PENS) if (!this.farm.penBuilt(p.id)) this.farmScene.buildPen(p); for (const s of SITES) if (!this.farm.buildingBuilt(s.id)) this.farmScene.buildSite(s); }
  refreshBuilt(e) {
    const fs = this.farmScene;
    if (e.kind === 'patch') { fs.buildPatch(PATCHES.find((p) => p.id === e.id)); fs.crops.sync(); }
    else if (e.kind === 'pen') { const p = PENS.find((q) => q.id === e.id); fs.buildPen(p); fs.syncFences(); this.life.syncHerd(e.id); }
    else if (e.kind === 'building') fs.buildSite(SITES.find((s) => s.id === e.id));
    else if (e.kind === 'all') { for (const p of PATCHES) fs.buildPatch(p); for (const p of PENS) { fs.buildPen(p); this.life.syncHerd(p.id); } for (const s of SITES) fs.buildSite(s); fs.syncFences(); fs.crops.sync(); }
    this.applyBarnColor(); this.needsRefresh = true;
  }

  // ---- environment: season, time of day, weather --------------------------------------------------------------------------------------------
  applyEnvironment(first) {
    const s = this.farm.S.settings, season = this.farm.seasonNow();
    if (this.curSeason !== season) { this.curSeason = season; this.sky.setSeason(season); if (this.grass) this.grass.setSeason(); if (this.flowers) this.flowers.setSeason(); }
    if (s.tod === 'day') { this.sky.frozen = true; this.todTarget = 0.5; } else if (s.tod === 'gold') { this.sky.frozen = true; this.todTarget = 0.7; } else if (s.tod === 'night') { this.sky.frozen = true; this.todTarget = 0.02; } else if (!this.finaleOn) { this.sky.frozen = false; this.todTarget = null; }
    document.documentElement.classList.toggle('reduce', !!s.reduceMotion && s.reduceMotion !== 'false');
    document.documentElement.style.setProperty('--fs', 16 * (+s.textSize || 1) + 'px');
    if (first) this.sky.phase = this.farm.S.phase || 0.68;
    this.applyBarnColor();
  }
  applyBarnColor() {
    const id = this.farm.S.cos.wear.barn, c = COSMETICS.find((q) => q.id === id), body = this.farmScene.barn && this.farmScene.barn.body;
    if (body && body.material.uniforms) body.material.uniforms.uHue.value = c ? c.hue || 0 : 0;
  }

  makeHat(id) {
    const g = new THREE.Group();
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    const add = (geo, c, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(0, y, z); g.add(m); return m; };
    if (id === 'hat_straw') { add(new THREE.CylinderGeometry(0.34, 0.36, 0.03, 16), 0xe8c66a, 0.0); add(new THREE.CylinderGeometry(0.17, 0.2, 0.15, 12), 0xe8c66a, 0.08); add(new THREE.CylinderGeometry(0.205, 0.205, 0.04, 12), 0xe4453b, 0.03); }
    else if (id === 'hat_flower') { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const m = add(new THREE.SphereGeometry(0.06, 6, 5), [0xff7fb0, 0xffd45a, 0xffffff, 0xff9b6b][i % 4], 0.02, 0); m.position.set(Math.cos(a) * 0.19, 0.03, Math.sin(a) * 0.19); } }
    else if (id === 'hat_cowgirl') { add(new THREE.CylinderGeometry(0.36, 0.36, 0.025, 16), 0x8a5a2b, 0); add(new THREE.CylinderGeometry(0.16, 0.2, 0.2, 12), 0x8a5a2b, 0.1); add(new THREE.CylinderGeometry(0.205, 0.205, 0.04, 12), 0xffc93c, 0.04); }
    else if (id === 'hat_party') { add(new THREE.ConeGeometry(0.17, 0.4, 10), 0xff6bb0, 0.18); add(new THREE.SphereGeometry(0.05, 8, 6), 0xffd45a, 0.4); }
    else if (id === 'hat_lantern') { add(new THREE.TorusGeometry(0.19, 0.03, 6, 14), 0xffc93c, 0.05).rotation.x = Math.PI / 2; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const m = add(new THREE.SphereGeometry(0.07, 8, 6), 0xff9b2f, 0.09); m.position.set(Math.cos(a) * 0.19, 0.1, Math.sin(a) * 0.19); m.material = new THREE.MeshBasicMaterial({ color: 0xffb84a }); } }
    else if (id === 'hat_bee') { add(new THREE.TorusGeometry(0.19, 0.025, 6, 14), 0x3a2a14, 0.03).rotation.x = Math.PI / 2; for (const s of [-1, 1]) { const m = add(new THREE.SphereGeometry(0.05, 6, 5), 0xffc93c, 0.16); m.position.x = s * 0.09; } }
    else if (id === 'hat_beret') { const m = add(new THREE.SphereGeometry(0.22, 12, 8), 0xc0392b, 0.04); m.scale.set(1, 0.4, 1); add(new THREE.SphereGeometry(0.03, 6, 5), 0x3a2a14, 0.14); }
    else if (id === 'hat_crown') { add(new THREE.CylinderGeometry(0.19, 0.17, 0.12, 8), 0xffc93c, 0.06); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const m = add(new THREE.ConeGeometry(0.04, 0.1, 5), 0xffc93c, 0.16); m.position.set(Math.cos(a) * 0.18, 0.16, Math.sin(a) * 0.18); } }
    else if (id === 'hat_halo') { add(new THREE.TorusGeometry(0.2, 0.025, 6, 16), 0xfff2a0, 0.25).rotation.x = Math.PI / 2; g.children[0].material = new THREE.MeshBasicMaterial({ color: 0xfff2a0 }); }
    else return null;
    return g;
  }

  // ---- per frame ---------------------------------------------------------------------------------------------------------------------------------
  update(dt) {
    this.blobs.update(); this.labels.update(); this.floaters.update(dt); this.particles.update(dt); this.glow.update(dt);
    this.farmScene.update(dt); this.life.update(dt);
    this.lodAcc = (this.lodAcc || 0) + dt; if (this.lodAcc > 0.3 && this.forest) { this.lodAcc = 0; this.forest.update(this.rig.cur.x, this.rig.cur.z); }
    // sky / time of day
    if (this.todTarget != null) { let d = this.todTarget - this.sky.phase; if (d > 0.5) d -= 1; if (d < -0.5) d += 1; this.sky.phase = (this.sky.phase + d * Math.min(1, dt * 0.8) + 1) % 1; }
    this.sky.update(dt);
    const c = this.rig.cur;
    this.weatherUpdate(dt);
    this.ambient.update(dt, c.x, c.z, SU.uNight.value, this.curSeason, this.weather.type, this.particleScale || 1);
    // title cinematic
    if (this.mode === 'title' && !this.freezeTitleCam) {
      this.titleT += dt; const t = this.titleT;
      const T = this.rig.tgt, C = this.rig.cur;
      T.yaw = C.yaw = 0.55 + Math.sin(t * 0.09) * 0.5; T.pitch = C.pitch = (17 + Math.sin(t * 0.13) * 2.5) * Math.PI / 180; T.size = C.size = this.rig.aspect < 1 ? 30 : 28; T.x = C.x = 4 + Math.sin(t * 0.07) * 6; T.z = C.z = -4 + Math.cos(t * 0.05) * 4;
    }
    if (this.ghost) this.updateGhost();
    if (this.pointTarget) { const p = this.rig.project(this.pointTarget); this.ui.pointer.style.transform = `translate(${(p.x - 30).toFixed(0)}px,${(p.y - 20).toFixed(0)}px)`; }
    // ripe glows
    this.glowAcc = (this.glowAcc || 0) + dt;
    if (this.glowAcc > 0.4) { this.glowAcc = 0; this.syncRipeGlow(); }
    this.tick1 += dt;
    if (this.tick1 >= 1) {
      this.tick1 = 0; this.farm.tick();
      if (this.mode === 'play') {
        this.updateGoal(); this.refreshBadges(); this.checkTips();
        if (this.ui.sheetState && this.ui.sheetState.live) this.ui.refreshSheet();
        this.farm.S.phase = this.sky.phase;
        this.flushQueue();
        this.audio.setAmbience(this.weather.type === 'rain' ? 'rain' : SU.uNight.value > 0.5 ? 'night' : 'day');
        const wantMusic = SU.uNight.value > 0.6 ? 'night' : 'day'; if (!this.finaleOn && this.audio.cur && this.audio.cur !== wantMusic && this.audio.cur !== 'theme') this.audio.playMusic(wantMusic);
        this.nightVoice();
      }
    }
    if (this.needsRefresh) { this.needsRefresh = false; this.ui.updateHud(); if (this.mode === 'play') { this.updateGoal(); this.refreshBadges(); this.checkTips(); this.ui.sheetState && this.ui.refreshSheet(); this.farmScene.crops.sync(); } }
    // apply camera-mounted settings once
    this.tick5 += dt; if (this.tick5 > 5) { this.tick5 = 0; if (this.mode === 'play') this.farm.save(); }
  }
  nightVoice() {
    const n = SU.uNight.value > 0.7;
    if (n && !this.wasNight) { this.wasNight = true; if (this.farm.S.stats.harvests > 3) this.audio.voice('claire_15'); }
    if (!n && SU.uNight.value < 0.2) this.wasNight = false;
  }
  syncRipeGlow() {
    const ripe = this.farmScene.crops.ripe(), ids = new Set(ripe.map((p) => p.id));
    this.glowBlobs = this.glowBlobs || new Map();
    for (const p of ripe) if (!this.glowBlobs.has(p.id)) this.glowBlobs.set(p.id, this.blobs.add({ x: p.x, z: p.z, sx: 2.9, sz: 2.9, kind: 1, strength: 0.75, y: 0.28 }));
    for (const [id, b] of this.glowBlobs) if (!ids.has(id)) { this.blobs.remove(b); this.glowBlobs.delete(id); }
    // a little sparkle on ripe fields
    if (this.particleScale > 0.3) for (const p of ripe) if (Math.random() < 0.35) this.glow.emit({ x: p.x + (Math.random() - 0.5) * 1.5, y: 0.7 + Math.random() * 0.4, z: p.z + (Math.random() - 0.5) * 1.5, vx: 0, vy: 0.5, vz: 0, life: 1.1, size: 0.22, size2: 0.02, color: [1, 0.9, 0.4], alpha: 0.95, alpha2: 0, kind: 3 });
  }
  weatherUpdate(dt) {
    const w = this.weather, s = this.farm.S.settings;
    w.t += dt;
    if (s.weather === 'clear' || this.mode !== 'play') { w.target = 0; } else if (w.t > w.next) {
      w.t = 0;
      if (w.type === 'clear' && Math.random() < 0.22 && this.curSeason !== 'winter') { w.type = 'rain'; w.target = 1; w.next = 50 + Math.random() * 60; }
      else if (w.type === 'clear' && this.curSeason === 'winter') { w.type = 'snow'; w.target = 0.6; w.next = 80 + Math.random() * 80; }
      else { w.type = 'clear'; w.target = 0; w.next = 160 + Math.random() * 240; }
    }
    w.amt += (w.target - w.amt) * Math.min(1, dt * 0.5);
    this.rain.set(w.type === 'rain' ? w.amt : 0, this.rig.cur ? new V3(this.rig.cur.x, 0, this.rig.cur.z) : undefined);
    this.sky.setCover(1 + w.amt * 0.0);
    SU.uWet.value = w.type === 'rain' ? w.amt : 0;
    if (w.type === 'rain' && w.amt > 0.05) SU.uSat.value = 1.14 - w.amt * 0.12; else SU.uSat.value = 1.14;
  }

  // ---- actions from buttons ---------------------------------------------------------------------------------------------------------------------------------
  act(a, d, el, ev) {
    const f = this.farm, ui = this.ui, A = this.audio;
    A.unlock();
    const tick = () => A.sfx('button');
    switch (a) {
      case 'play': return this.play();
      case 'howto': A.sfx('button'); return this.howTo();
      case 'titleSettings': A.sfx('button'); return this.titleSettings();
      case 'closeSheet': A.sfx('tap'); return ui.closeSheet();
      case 'closeDialog': A.sfx('tap'); return ui.closeDialog();
      case 'tab': A.sfx('tap'); return ui.setTab(d.id);
      case 'goals': return this.open('goals');
      case 'orders': if (f.S.level < 2 && f.S.story.i < 1) { ui.toast('Orders open once you finish chapter 1.', ''); return; } return this.open('orders');
      case 'shop': return this.open('shop', 'sites');
      case 'barn': return this.open('barn');
      case 'market': return this.open('market');
      case 'daily': if (f.dailyClaimable() && f.S.story.i > 0) return this.dailyDialog(); return this.open('goals', 'today');
      case 'more': return this.open('more');
      case 'settings': return this.open('settings');
      case 'stars': ui.toast('Gems come from orders, awards and daily gifts. Spend them on cosy things.', ''); return;
      case 'camHome': A.sfx('tap'); this.rig.focus(-1, 5, this.rig.aspect < 1 ? 16 : 17, 0.8, 0); this.rig.tgt.pitch = 42 * Math.PI / 180; return;
      case 'camRotL': this.rig.rotate(-30); return A.sfx('tap');
      case 'camRotR': this.rig.rotate(30); return A.sfx('tap');
      case 'camTiltUp': this.rig.tilt(8); return A.sfx('tap');
      case 'camTiltDown': this.rig.tilt(-8); return A.sfx('tap');
      case 'brushDone': A.sfx('tap'); this.rig.tOffsetY = 0; this.endBrush(); return this.checkTips();
      case 'pickSeed': {
        const c = CROPS.find((q) => q.id === d.id); this.brush = { mode: 'plant', crop: d.id }; A.sfx('pop');
        ui.hideDock(); ui.brush(`${I(c.icon, 32)} Planting ${c.name} &middot; drag over the fields`);
        if (d.plot) { const r = f.plant(d.plot, d.id); if (!r.ok && r.reason === 'coins') { ui.toast('Not enough coins for that seed.', 'warn'); this.endBrush(); } }
        return;
      }
      case 'seedLocked': A.sfx('error'); return ui.toast(`${itemName(d.id)} grows from level ${d.lv}.`, '');
      case 'itemInfo': return this.itemDialog(d.id);
      case 'sell': { const r = f.sell(d.id, +d.n); if (r.ok) { this.lastTapPos = [el.getBoundingClientRect().left + 20, el.getBoundingClientRect().top]; ui.toast(`Sold ${d.n} for ${r.coins} coins`, 'good', 1600); } return; }
      case 'upgradeBarn': { const r = f.upgradeBarn(); if (!r.ok) ui.toast(r.reason === 'coins' ? 'Not enough coins yet.' : 'Not yet!', 'warn'); return; }
      case 'fillOrder': { const r = f.fillOrder(+d.id); if (r.ok) { const b = el.getBoundingClientRect(); this.lastTapPos = [b.left + b.width / 2, b.top]; } return; }
      case 'orderMissing': A.sfx('error'); return ui.toast('You need a few more things for that one.', '');
      case 'skipOrder': A.sfx('tap'); return f.skipOrder(+d.id);
      case 'sendBoat': { const r = f.sendBoat(); if (r.ok) { ui.closeSheet(); ui.toast(`Marta sails off! +${r.reward.coins} coins`, 'good', 3200); } return; }
      case 'boatMissing': A.sfx('error'); return ui.toast('Fill every crate first.', '');
      case 'buySite': return this.confirmBuy('site', d.id);
      case 'buyPen': return this.confirmBuy('pen', d.id);
      case 'buyPatch': return this.confirmBuy('patch', d.id);
      case 'confirmBuy': { ui.closeDialog(true); const r = d.kind === 'patch' ? f.buyPatch(d.id) : d.kind === 'pen' ? f.buyPen(d.id) : f.buyBuilding(d.id); if (!r.ok) { A.sfx('error'); ui.toast(r.reason === 'coins' ? 'Not enough coins yet. Sell a few crops!' : 'You cannot build that yet.', 'warn'); } else { const def = d.kind === 'patch' ? PATCHES.find((p) => p.id === d.id) : d.kind === 'pen' ? PENS.find((p) => p.id === d.id) : SITES.find((s) => s.id === d.id); this.rig.focus(def.x, def.z, 13, 0.9, 0.1); this.audio.voice('claire_04'); } return; }
      case 'buyAnimal': { const r = f.buyAnimal(d.id); if (!r.ok) { A.sfx('error'); ui.toast(r.reason === 'coins' ? 'Not enough coins for that one.' : 'The pen is full.', 'warn'); } return; }
      case 'feedPen': { const r = f.feedPen(d.id); if (!r.ok) { A.sfx('error'); ui.toast(r.reason === 'nofeed' ? `Feed needed: ${Object.entries(r.need).map(([k, q]) => q + ' ' + itemName(k).toLowerCase()).join(', ')}` : 'Everyone has eaten.', 'warn'); } return; }
      case 'collectPen': return f.collectPen(d.id);
      case 'startJob': { const r = f.startJob(d.b, d.r); if (!r.ok) ui.toast(r.reason === 'queue' ? 'All slots are busy.' : 'Missing something.', 'warn'); return; }
      case 'jobMissing': A.sfx('error'); return ui.toast('You need more ingredients (or a free slot).', '');
      case 'collectJobs': return f.collectJobs(d.b);
      case 'speedUp': { const r = f.speedUp(d.id, +d.i); if (r.ok) A.sfx('powerup'); return; }
      case 'claimChapter': { const r = f.claimChapter(); return; }
      case 'claimDaily': { ui.closeDialog(true); f.claimDaily(); ui.refreshSheet(); return; }
      case 'claimQuest': return f.claimQuest(+d.i);
      case 'claimQuestChest': return f.claimQuestChest();
      case 'claimAch': return f.claimAch(d.id);
      case 'eventFill': return f.eventFill(+d.i);
      case 'wear': return f.wear(d.id);
      case 'buyCos': { const r = f.buyCosmetic(d.id); if (!r.ok) { A.sfx('error'); ui.toast(r.reason === 'level' ? `Unlocks at level ${r.need}.` : r.reason === 'earn' ? 'Earn this one by playing the story or awards.' : 'Not enough yet.', 'warn'); } return; }
      case 'placeDecor': return this.startGhost(d.id);
      case 'decorLocked': A.sfx('error'); return ui.toast(`Unlocks at level ${d.lv}.`, '');
      case 'ghostRot': this.ghost.rot += Math.PI / 2; return A.sfx('tap');
      case 'ghostNo': A.sfx('tap'); { const mv = this.ghost && this.ghost.moving; this.endGhost(); return; }
      case 'ghostOk': {
        const G = this.ghost; if (!G) return;
        if (!G.ok) { A.sfx('error'); return ui.toast("That spot is taken. Slide the farm a little.", 'warn'); }
        let r;
        if (G.moving) r = f.moveDecor(G.moving, G.x, G.z, G.rot); else r = f.buyDecor(G.type, G.x, G.z, G.rot);
        if (r.ok) { A.sfx('place'); this.sparkle(G.x, 0.6, G.z, 14); this.endGhost(); } else { A.sfx('error'); ui.toast(r.reason === 'coins' ? 'Not enough coins for that.' : 'Cannot place that.', 'warn'); }
        return;
      }
      case 'moveDecor': { ui.closeDialog(true); const dd = f.S.decor.find((q) => q.id === +d.id); if (dd) { this.startGhost(dd.type, dd.id); this.ghost.rot = dd.rot || 0; } return; }
      case 'storeDecor': { ui.closeDialog(true); f.storeDecor(+d.id); ui.toast('Put away. Place it again for free any time.', ''); return; }
      case 'giftNpc': { const r = f.gift(d.id); if (r.ok) this.renderNpc(d.id, 'Oh, how thoughtful! Thank you!'); else if (r.reason === 'today') ui.toast('One gift a day is plenty.', ''); else ui.toast(`Bring ${NPCS[d.id].name} some ${itemName(r.item).toLowerCase()}.`, ''); return; }
      case 'favour': { const r = f.doFavour(d.id); if (r.ok) this.renderNpc(d.id, 'That is exactly what I needed. Thank you, Claire!'); else if (r.reason === 'missing') { A.sfx('error'); ui.toast(`You need ${r.qty} ${itemName(r.item).toLowerCase()}.`, ''); } return; }
      case 'invite': { const r = f.invite(d.id); if (r.ok) this.renderNpc(d.id, `A Lantern Fair? I would love to come!`); return; }
      case 'setting': return this.setSetting(d.k, d.v);
      case 'tutorial': ui.closeSheet(true); this.replayTutorial(); return;
      case 'codes': ui.closeSheet(true); if (window.ArcadeSDK) ArcadeSDK.showMenu('codes'); return;
      case 'credits': return this.credits();
      case 'toTitle': ui.closeSheet(true); f.save(true); return this.showTitle();
      case 'newFarm': return ui.dialog(`<h2>Start a new farm?</h2><p>Your current farm will be replaced. This cannot be undone.</p><div class="btns"><button class="btn red" data-act="newFarmYes">Yes, start over</button><button class="btn grey" data-act="closeDialog">Keep my farm</button></div>`);
      case 'newFarmYes': ui.closeDialog(true); return f.reset();
      case 'finaleDone': return this.finaleDone();
      case 'claimAway': ui.closeDialog(); return;
      case 'sellFromDialog': { const r = f.sell(d.id, 1); if (r.ok) ui.toast(`Sold 1 for ${r.coins} coins`, 'good', 1400); ui.closeDialog(); return; }
    }
  }
  // one friendly suggestion for the SDK Hint button
  hintText() {
    const f = this.farm, S = f.S, c = f.chapter();
    if (f.ripePlots().length) return 'Golden crops are ready. Tap them, or drag across a row to harvest.';
    for (const s of SITES) if (f.buildingBuilt(s.id) && f.readyJobs(s.id)) return `${s.name} has something ready. Tap the glowing icon above it.`;
    for (const p of PENS) { const i = f.penBuilt(p.id) ? f.penInfo(p.id) : null; if (i && i.ready) return 'An animal pen has something to collect. Tap the glowing icon.'; if (i && i.hungry) return 'Some animals are hungry. Tap their pen to feed them.'; }
    if (S.orders.some((o) => f.canFill(o))) return 'You can fill an order right now. Tap the order board.';
    if (Object.keys(S.plots).length < 6) return 'Tap an empty field, pick a seed and drag over more fields to plant them.';
    if (!c.done) return `Goal: ${c.ch.goal} (${c.have}/${c.target})`;
    return 'Plant something, then check the order board and the daily gift.';
  }
  setVolume(k, v) {
    const s = this.farm.S.settings; s[k] = Math.max(0, Math.min(1, v)); this.audio.applyVolumes(); this.farm.save();
    if (k === 'sfx' && !this._sfxT) { this._sfxT = setTimeout(() => { this._sfxT = 0; this.audio.sfx('tap'); }, 250); }
  }
  itemDialog(id) {
    const it = ITEMS[id], f = this.farm;
    this.ui.dialog(`<h2>${it.name}</h2><p>${I(it.icon, 72)}</p><p>You have <b>${f.have(id)}</b>. Sells for ${I('coin', 20)} ${f.price(id)} each.</p><div class="btns"><button class="btn buy small" data-act="sellFromDialog" data-id="${id}">Sell 1</button><button class="btn grey small" data-act="closeDialog">Close</button></div>`);
  }
  titleSettings() { this.mode2 = 'title'; this.ui.openSheet(this.P.settings()); }
  setSetting(k, v) {
    const s = this.farm.S.settings; this.audio.sfx('tap');
    if (k === 'reduceMotion') s[k] = v === 'true'; else if (k === 'textSize') s[k] = +v; else s[k] = v;
    if (k === 'quality') { this.engine.dyn = 1; this.engine.setQuality(v); }
    this.applyEnvironment(); this.farm.save(true); this.ui.refreshSheet();
    if (k === 'season') { this.sky.setSeason(this.farm.seasonNow()); }
  }
  replayTutorial() {
    const f = this.farm; f.S.story.intro = false; f.S.tut = {}; this.introDialog(); this.checkTips();
    if (window.ArcadeSDK) ArcadeSDK.event('tutorial-replayed');
  }
  credits() {
    this.ui.dialog(`<h2>Credits</h2><div style="text-align:left;font-size:15px;line-height:1.3"><p>Made for Claire, with love.</p><p>3D art: Meshy models made for this project, Quaternius (farm buildings, animals), Kenney (props, boat). CC0 where marked.</p><p>Icons: Microsoft Fluent Emoji 3D (MIT). Font: Lilita One (SIL OFL). three.js (MIT).</p><p>Voice and music made with ElevenLabs. See LICENSES.md for every file.</p></div><div class="btns"><button class="btn" data-act="closeDialog">Close</button></div>`);
  }
}
const ALL_CROP = (id) => CROPS.find((c) => c.id === id);
const dayKeyNow = (f) => { const d = new Date(f.now()); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
const chipHtml = (f, id, need) => { const have = f.have(id), ok = have >= need; return `<span class="chip ${ok ? 'ok' : 'no'}">${I(ITEMS[id].icon, 28)}${have}/${need}</span>`; };
const questLine = (q) => ({ harvest: `Harvest ${q.n} crops`, orders: `Fill ${q.n} orders`, collect: `Collect ${q.n} animal goods`, batch: `Finish ${q.n} batches`, sell: `Sell ${q.n} items`, plant: `Plant ${q.n} seeds` }[q.kind]);

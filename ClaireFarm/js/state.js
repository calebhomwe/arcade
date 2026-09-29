// The farm itself: all game rules, no drawing. Every action returns {ok, ...} and emits events the
// view listens to. Times are real wall-clock milliseconds, so crops keep growing while the page is closed.
import { Emitter, clamp, realNow, pick, rng, shuffle } from './util.js';
import {
  CROPS, ANIMALS, ITEMS, BUILDINGS, RECIPES, xpNeed, levelReward, MAX_LEVEL, BARN_BASE, BARN_UPGRADES, DECOR, COSMETICS, NPCS, CHAPTERS, CHAPTER_XP,
  ORDER_TITLES, CUSTOMERS, BOAT_AWAY_SEC, ACHIEVEMENTS, CRITTERS, ALBUM_SETS, DAILY_REWARDS, EVENTS, QUEST_KINDS, UNLOCKS, itemName,
} from './data.js';
import { PATCHES, PENS, SITES, plotPositions } from './layout.js';

export const SAVE_KEY = 'claireFarm.save';
export const SAVE_VERSION = 3;

const CROP = Object.fromEntries(CROPS.map((c) => [c.id, c]));
const ANIMAL = Object.fromEntries(ANIMALS.map((a) => [a.id, a]));
const PEN = Object.fromEntries(PENS.map((p) => [p.id, p]));
const SITE = Object.fromEntries(SITES.map((s) => [s.id, s]));
const PATCH = Object.fromEntries(PATCHES.map((p) => [p.id, p]));
export const ALL_PLOTS = PATCHES.flatMap((p) => plotPositions(p));
const PLOT = Object.fromEntries(ALL_PLOTS.map((p) => [p.id, p]));

export function dayKey(ms) { const d = new Date(ms); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
export function dayNumber(ms) { const d = new Date(ms); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); }

export function seasonFor(ms, hemi = 'south') {
  const m = new Date(ms).getMonth(); // 0 = Jan
  const north = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'][m];
  if (hemi === 'north') return north;
  return { winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring' }[north];
}

function defaults(now) {
  return {
    v: SAVE_VERSION, created: now, lastSeen: now, lastSave: now, name: 'Claire',
    level: 1, xp: 0, coins: 60, stars: 0,
    inv: {}, basket: {}, barnLvl: 0,
    patches: { A: true }, plots: {}, pens: {}, blds: {}, decor: [], nextDecor: 1,
    orders: [], orderWait: [], orderSeq: 0, boat: null, seenLevel: 1,
    story: { i: 0, claimed: [], intro: false },
    npcs: {}, stats: { harvests: 0, planted: 0, collects: 0, batches: 0, bakery: 0, orders: 0, sold: 0, earned: 0, boat: 0, favours: 0, critters: 0, fair: 0, bestStreak: 0, taps: 0 },
    ach: {}, album: {}, albumDone: {}, daily: { streak: 0, best: 0, last: 0, claimed: 0, grace: 0, graceWeek: 0 },
    quests: { day: 0, list: [], chest: false }, events: {}, cos: { own: { hat_none: true, pip_none: true, barn_red: true, flag_none: true }, wear: { hat: 'hat_none', pip: 'pip_none', barn: 'barn_red', flag: 'flag_none' } },
    settings: { music: 0.6, sfx: 0.9, voice: 0.9, quality: 'auto', season: 'auto', hemi: 'south', tod: 'cycle', weather: 'auto', reduceMotion: false, textSize: 1 },
    tut: {}, phase: 0.36, seed: Math.floor(Math.random() * 1e9),
  };
}

function deepFill(target, def) {
  for (const k of Object.keys(def)) {
    if (target[k] === undefined) target[k] = JSON.parse(JSON.stringify(def[k]));
    else if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k]) && target[k] && typeof target[k] === 'object') deepFill(target[k], def[k]);
  }
  return target;
}

// Older saves are upgraded one version at a time and never lose what the player earned.
export function migrate(s, now) {
  if (!s || typeof s !== 'object') return defaults(now);
  const from = +s.v || 0;
  if (from < 1) { s.v = 1; }
  if (from < 2) { // v2: plots stored the crop id under `c`
    for (const p of Object.values(s.plots || {})) { if (p && p.c && !p.crop) { p.crop = p.c; delete p.c; } }
    s.v = 2;
  }
  if (from < 3) { // v3: album, cosmetics and events arrive; keep everything else
    s.album = s.album || {}; s.cos = s.cos || undefined; s.events = s.events || {}; s.v = 3;
  }
  deepFill(s, defaults(now));
  // sanity: numbers and tables the game relies on
  s.level = clamp(Math.floor(+s.level || 1), 1, MAX_LEVEL); s.xp = Math.max(0, Math.floor(+s.xp || 0));
  s.coins = Math.max(0, Math.floor(+s.coins || 0)); s.stars = Math.max(0, Math.floor(+s.stars || 0));
  for (const k of Object.keys(s.inv)) if (!(s.inv[k] > 0) || !ITEMS[k]) delete s.inv[k];
  for (const k of Object.keys(s.plots)) if (!PLOT[k] || !CROP[(s.plots[k] || {}).crop]) delete s.plots[k];
  if (s.lastSeen > now + 3600e3) s.lastSeen = now;     // clock went backwards: don't invent time
  s.v = SAVE_VERSION;
  return s;
}

export class Farm extends Emitter {
  constructor(store, opts = {}) {
    super();
    this.store = store; this.now = opts.now || realNow;
    this.S = null; this.cheated = false; this.dirty = false; this.lastSaveAt = 0; this.away = null;
    this.rand = Math.random;
  }

  // ---- load / save --------------------------------------------------------------------------
  load() {
    const now = this.now();
    let raw = null;
    try { raw = this.store.getItem(SAVE_KEY); } catch (e) {}
    let s = null;
    if (raw) { try { s = JSON.parse(raw); } catch (e) { s = null; } }
    if (!s) { try { const b = this.store.getItem(SAVE_KEY + '.bak'); if (b) s = JSON.parse(b); } catch (e) { s = null; } }
    const fresh = !s;
    this.S = fresh ? defaults(now) : migrate(s, now);
    this.isNew = fresh;
    const prev = this.S.lastSeen;
    if (!fresh) this.away = this.offlineReport(prev, now);
    this.S.lastSeen = now;
    this.ensureOrders(true); this.ensureQuests(); this.checkDay(true);
    return this.S;
  }
  save(force) {
    if (!this.S) return;
    const now = this.now();
    if (!force && now - this.lastSaveAt < 1500) { this.dirty = true; return; }
    this.S.lastSeen = now; this.S.lastSave = now;
    try {
      const prev = this.store.getItem(SAVE_KEY);
      if (prev) this.store.setItem(SAVE_KEY + '.bak', prev);
      this.store.setItem(SAVE_KEY, JSON.stringify(this.S));
      this.lastSaveAt = now; this.dirty = false;
    } catch (e) { this.emit('savefail', e); }
  }
  reset() { try { this.store.removeItem(SAVE_KEY); this.store.removeItem(SAVE_KEY + '.bak'); } catch (e) {} const keepSettings = this.S ? this.S.settings : null; this.S = defaults(this.now()); if (keepSettings) this.S.settings = keepSettings; this.away = null; this.isNew = true; this.ensureOrders(true); this.ensureQuests(); this.checkDay(true); this.emit('reset'); this.save(true); }

  touch() { this.dirty = true; this.emit('change'); }

  // ---- economy primitives -----------------------------------------------------------------------
  barnCap() { return BARN_BASE + (this.S.barnLvl > 0 ? BARN_UPGRADES[this.S.barnLvl - 1].cap - BARN_BASE : 0); }
  barnUsed() { let n = 0; for (const v of Object.values(this.S.inv)) n += v; return n; }
  barnFree() { return Math.max(0, this.barnCap() - this.barnUsed()); }
  basketCount() { let n = 0; for (const v of Object.values(this.S.basket)) n += v; return n; }
  have(id) { return this.S.inv[id] || 0; }
  addItem(id, qty) {
    const put = Math.min(qty, this.barnFree());
    if (put > 0) this.S.inv[id] = (this.S.inv[id] || 0) + put;
    if (qty > put) this.S.basket[id] = (this.S.basket[id] || 0) + (qty - put);
    return put;
  }
  takeItem(id, qty) { if (this.have(id) < qty) return false; this.S.inv[id] -= qty; if (this.S.inv[id] <= 0) delete this.S.inv[id]; this.flushBasket(); return true; }
  flushBasket() {
    for (const [id, q] of Object.entries(this.S.basket)) {
      const put = Math.min(q, this.barnFree()); if (put <= 0) break;
      this.S.inv[id] = (this.S.inv[id] || 0) + put; this.S.basket[id] = q - put; if (this.S.basket[id] <= 0) delete this.S.basket[id];
    }
  }
  addCoins(n, why) { if (n <= 0) return; this.S.coins += n; if (!this.cheated) this.S.stats.earned += n; this.emit('coins', { n, why }); }
  spend(n) { if (this.S.coins < n) return false; this.S.coins -= n; this.emit('coins', { n: -n }); return true; }
  addStars(n) { this.S.stars += n; this.emit('stars', { n }); }
  addXp(n, at) {
    if (n <= 0) return;
    const S = this.S;
    if (S.level >= MAX_LEVEL) { this.emit('xp', { n, at }); return; }
    S.xp += n; this.emit('xp', { n, at });
    while (S.level < MAX_LEVEL && S.xp >= xpNeed(S.level)) {
      S.xp -= xpNeed(S.level); S.level++;
      const r = levelReward(S.level);
      S.coins += r.coins; S.stars += r.stars;
      this.emit('levelup', { level: S.level, reward: r, unlocks: UNLOCKS[S.level] || [] });
      this.checkStory(); this.ensureOrders(); this.ensureQuests();
    }
    if (S.level >= MAX_LEVEL) S.xp = 0;
  }
  xpFrac() { const S = this.S; return S.level >= MAX_LEVEL ? 1 : S.xp / xpNeed(S.level); }
  stat(name, n = 1) {
    if (!this.S) return;
    if (this.cheated) return;
    this.S.stats[name] = (this.S.stats[name] || 0) + n;
    this.emit('stat', { name, n });
  }
  statValue(name) {
    const S = this.S;
    switch (name) {
      case 'level': return S.level;
      case 'buildings': return Object.values(S.blds).filter((b) => b.built).length;
      case 'decor': return S.decor.length;
      case 'lanterns': return S.decor.filter((d) => d.type === 'lamp').length;
      case 'met': return Object.values(S.npcs).filter((n) => n.met).length;
      case 'invites': return Object.values(S.npcs).filter((n) => n.invited).length;
      case 'bestFriend': return Math.max(0, ...Object.values(S.npcs).map((n) => n.pts || 0));
      case 'album': return Object.keys(S.album).length;
      case 'critters': return Object.keys(S.album).filter((k) => k.startsWith('crit_')).length;
      default: return S.stats[name] || 0;
    }
  }

  // ---- unlocks ------------------------------------------------------------------------------------
  cropUnlocked(id) { return CROP[id].level <= this.S.level; }
  hasFeature(f) { const L = this.S.level; const need = { orders: 2, boat: 3, decor: 3, daily: 1, album: 10 }[f]; return need === undefined ? true : L >= need; }
  patchOwned(id) { return !!this.S.patches[id]; }
  penBuilt(id) { return !!(this.S.pens[id] && this.S.pens[id].built); }
  buildingBuilt(id) { return !!(this.S.blds[id] && this.S.blds[id].built); }

  // ---- fields ---------------------------------------------------------------------------------------
  plotInfo(id) {
    const p = this.S.plots[id]; if (!p) return { state: 'empty' };
    const c = CROP[p.crop], t = this.now();
    const total = c.sec * 1000, el = t - p.at, frac = clamp(el / total, 0, 1);
    return { state: el >= total ? 'ripe' : 'growing', crop: p.crop, frac, left: Math.max(0, (total - el) / 1000) };
  }
  plant(plotId, cropId) {
    const S = this.S, c = CROP[cropId], plot = PLOT[plotId];
    if (!c || !plot) return { ok: false, reason: 'unknown' };
    if (!S.patches[plot.patch]) return { ok: false, reason: 'locked' };
    if (S.plots[plotId]) return { ok: false, reason: 'busy' };
    if (c.level > S.level) return { ok: false, reason: 'level' };
    if (S.coins < c.seed) return { ok: false, reason: 'coins' };
    this.spend(c.seed);
    S.plots[plotId] = { crop: cropId, at: this.now() };
    this.stat('planted'); this.questTouch(); this.emit('plant', { plotId, crop: cropId, x: plot.x, z: plot.z });
    this.touch(); return { ok: true };
  }
  harvest(plotId) {
    const S = this.S, info = this.plotInfo(plotId);
    if (info.state !== 'ripe') return { ok: false, reason: info.state };
    const c = CROP[info.crop], plot = PLOT[plotId];
    delete S.plots[plotId];
    const qty = 2;
    this.addItem(c.id, qty);
    this.stat('harvests'); this.discover(c.id);
    this.emit('harvest', { plotId, crop: c.id, qty, x: plot.x, z: plot.z, xp: c.xp });
    this.addXp(c.xp, { x: plot.x, z: plot.z });
    this.checkStory(); this.questTouch(); this.touch();
    return { ok: true, crop: c.id, qty };
  }
  ripePlots() { return Object.keys(this.S.plots).filter((k) => this.plotInfo(k).state === 'ripe'); }
  buyPatch(id) {
    const S = this.S, p = PATCH[id];
    if (!p || S.patches[id]) return { ok: false, reason: 'owned' };
    if (S.level < p.level) return { ok: false, reason: 'level', need: p.level };
    if (!this.spend(p.cost)) return { ok: false, reason: 'coins' };
    S.patches[id] = true; this.emit('built', { kind: 'patch', id, x: p.x, z: p.z }); this.touch(); return { ok: true };
  }

  // ---- animals ----------------------------------------------------------------------------------------
  penInfo(id) {
    const pen = this.S.pens[id]; if (!pen || !pen.built) return null;
    const a = ANIMAL[PEN[id].animal], t = this.now();
    const animals = pen.animals.map((an) => {
      if (an.state === 'growing' && t >= an.at + a.sec * 1000) an.state = 'ready';
      return { state: an.state, left: an.state === 'growing' ? Math.max(0, (an.at + a.sec * 1000 - t) / 1000) : 0 };
    });
    return { animals, cap: PEN[id].cap, animal: a, ready: animals.filter((x) => x.state === 'ready').length, hungry: animals.filter((x) => x.state === 'hungry').length };
  }
  buyPen(id) {
    const S = this.S, p = PEN[id];
    if (!p || this.penBuilt(id)) return { ok: false, reason: 'owned' };
    if (S.level < p.level) return { ok: false, reason: 'level', need: p.level };
    if (!this.spend(p.cost)) return { ok: false, reason: 'coins' };
    S.pens[id] = { built: true, animals: [] };
    this.emit('built', { kind: 'pen', id, x: p.x, z: p.z }); this.touch(); return { ok: true };
  }
  buyAnimal(id) {
    const S = this.S, pen = S.pens[id]; if (!pen || !pen.built) return { ok: false, reason: 'nopen' };
    const a = ANIMAL[PEN[id].animal];
    if (pen.animals.length >= PEN[id].cap) return { ok: false, reason: 'full' };
    if (!this.spend(a.cost)) return { ok: false, reason: 'coins' };
    pen.animals.push({ state: 'hungry', at: 0 });
    this.discover('animal_' + a.id); this.emit('animal', { pen: id, n: pen.animals.length }); this.touch(); return { ok: true };
  }
  feedPen(id) {
    const S = this.S, pen = S.pens[id]; if (!pen || !pen.built) return { ok: false, reason: 'nopen' };
    const a = ANIMAL[PEN[id].animal]; this.penInfo(id);
    const hungry = pen.animals.filter((x) => x.state === 'hungry');
    if (!hungry.length) return { ok: false, reason: 'nohungry' };
    // feed as many as the barn can supply
    let fed = 0;
    for (const an of hungry) {
      let ok = true; for (const [k, q] of Object.entries(a.feed)) if (this.have(k) < q) ok = false;
      if (!ok) break;
      for (const [k, q] of Object.entries(a.feed)) this.takeItem(k, q);
      an.state = 'growing'; an.at = this.now(); fed++;
    }
    if (!fed) return { ok: false, reason: 'nofeed', need: a.feed };
    this.emit('feed', { pen: id, fed, x: PEN[id].x, z: PEN[id].z }); this.questTouch(); this.touch(); return { ok: true, fed };
  }
  collectPen(id) {
    const S = this.S, pen = S.pens[id]; if (!pen || !pen.built) return { ok: false, reason: 'nopen' };
    const a = ANIMAL[PEN[id].animal]; this.penInfo(id);
    const ready = pen.animals.filter((x) => x.state === 'ready');
    if (!ready.length) return { ok: false, reason: 'noready' };
    for (const an of ready) { an.state = 'hungry'; an.at = 0; }
    const qty = ready.length * a.qty;
    this.addItem(a.product, qty); this.discover(a.product);
    this.stat('collects', qty);
    this.emit('collect', { pen: id, item: a.product, qty, x: PEN[id].x, z: PEN[id].z });
    this.addXp(a.xp * ready.length, { x: PEN[id].x, z: PEN[id].z });
    this.checkStory(); this.questTouch(); this.touch(); return { ok: true, item: a.product, qty };
  }

  // ---- buildings and recipes ---------------------------------------------------------------------------
  buyBuilding(id) {
    const S = this.S, s = SITE[id];
    if (!s || this.buildingBuilt(id)) return { ok: false, reason: 'owned' };
    if (S.level < s.level) return { ok: false, reason: 'level', need: s.level };
    if (!this.spend(s.cost)) return { ok: false, reason: 'coins' };
    S.blds[id] = { built: true, queue: [] };
    this.emit('built', { kind: 'building', id, x: s.x, z: s.z }); this.checkStory(); this.touch(); return { ok: true };
  }
  jobs(id) {
    const b = this.S.blds[id]; if (!b) return [];
    const t = this.now();
    return b.queue.map((j) => ({ recipe: j.recipe, end: j.end, done: t >= j.end, left: Math.max(0, (j.end - t) / 1000), start: j.start }));
  }
  startJob(bid, rid) {
    const S = this.S, b = S.blds[bid], r = RECIPES[rid], def = BUILDINGS[bid];
    if (!b || !b.built || !r || r.building !== bid) return { ok: false, reason: 'unknown' };
    if (r.level > S.level) return { ok: false, reason: 'level', need: r.level };
    if (b.queue.length >= def.slots) return { ok: false, reason: 'queue' };
    for (const [k, q] of Object.entries(r.in)) if (this.have(k) < q) return { ok: false, reason: 'missing', item: k };
    for (const [k, q] of Object.entries(r.in)) this.takeItem(k, q);
    const now = this.now();
    const last = b.queue.length ? b.queue[b.queue.length - 1].end : now;
    const start = Math.max(now, last);
    b.queue.push({ recipe: rid, start, end: start + r.sec * 1000 });
    this.emit('jobstart', { building: bid, recipe: rid, x: SITE[bid].x, z: SITE[bid].z }); this.touch(); return { ok: true };
  }
  collectJobs(bid) {
    const S = this.S, b = S.blds[bid]; if (!b) return { ok: false };
    const t = this.now(); const done = b.queue.filter((j) => t >= j.end);
    if (!done.length) return { ok: false, reason: 'none' };
    b.queue = b.queue.filter((j) => t < j.end);
    let xp = 0; const got = {};
    for (const j of done) {
      const r = RECIPES[j.recipe];
      for (const [k, q] of Object.entries(r.out)) { this.addItem(k, q); got[k] = (got[k] || 0) + q; this.discover(k); }
      xp += r.xp; this.stat('batches'); if (bid === 'bakery') this.stat('bakery');
    }
    this.emit('made', { building: bid, got, x: SITE[bid].x, z: SITE[bid].z });
    this.addXp(xp, { x: SITE[bid].x, z: SITE[bid].z });
    this.checkStory(); this.questTouch(); this.touch(); return { ok: true, got };
  }
  readyJobs(bid) { return this.jobs(bid).filter((j) => j.done).length; }
  speedUp(bid, idx = 0) {   // spend a star to finish the running job at once (never required)
    const b = this.S.blds[bid]; if (!b || !b.queue[idx]) return { ok: false };
    if (this.S.stars < 1) return { ok: false, reason: 'stars' };
    this.S.stars -= 1; const j = b.queue[idx], now = this.now(); const shift = Math.max(0, j.end - now);
    for (let k = idx; k < b.queue.length; k++) { b.queue[k].end -= shift; b.queue[k].start = Math.max(now - 1, b.queue[k].start - shift); }
    this.emit('stars', { n: -1 }); this.touch(); return { ok: true };
  }

  // ---- market -------------------------------------------------------------------------------------------
  special() { // one item sells for +50% today
    const key = dayKey(this.now()), rnd = rng(key * 31 + this.S.seed % 977);
    const pool = Object.values(ITEMS).filter((it) => it.sell > 0 && it.level <= this.S.level && (it.kind !== 'good' || true));
    return pool.length ? pool[Math.floor(rnd() * pool.length)].id : 'wheat';
  }
  price(id) { return Math.round(ITEMS[id].sell * (id === this.special() ? 1.5 : 1)); }
  sell(id, qty) {
    qty = Math.min(qty, this.have(id)); if (qty <= 0) return { ok: false };
    const coins = this.price(id) * qty;
    this.takeItem(id, qty); this.addCoins(coins, 'sell'); this.stat('sold', qty);
    this.emit('sold', { id, qty, coins }); this.questTouch(); this.touch(); return { ok: true, coins };
  }
  upgradeBarn() {
    const S = this.S, u = BARN_UPGRADES[S.barnLvl]; if (!u) return { ok: false, reason: 'max' };
    if (S.level < u.level) return { ok: false, reason: 'level', need: u.level };
    if (!this.spend(u.cost)) return { ok: false, reason: 'coins' };
    S.barnLvl++; this.flushBasket(); this.emit('barn', { cap: this.barnCap() }); this.touch(); return { ok: true };
  }

  // ---- orders ---------------------------------------------------------------------------------------------
  orderSlots() { return this.S.level < 2 && this.S.story.i < 1 ? 0 : Math.min(6, 3 + Math.floor((this.S.level - 2) / 6)); }
  availableItems() {
    const S = this.S, out = [];
    for (const c of CROPS) if (c.level <= S.level) out.push(c.id);
    for (const a of ANIMALS) if (S.pens[a.pen] && S.pens[a.pen].built) out.push(a.product);
    for (const [bid, b] of Object.entries(BUILDINGS)) if (S.blds[bid] && S.blds[bid].built) for (const r of b.recipes) if (r.level <= S.level && r.building !== 'mill') for (const k of Object.keys(r.out)) out.push(k);
    for (const r of BUILDINGS.mill.recipes) if (S.blds.mill && S.blds.mill.built && r.level <= S.level) for (const k of Object.keys(r.out)) out.push(k);
    return [...new Set(out)];
  }
  makeOrder(forStory) {
    const S = this.S, r = this.rand, avail = this.availableItems();
    const L = S.level;
    const kinds = clamp(1 + Math.floor(r() * (1 + L / 9)), 1, 4);
    const pool = shuffle(avail.slice(), r);
    // early on stick to what the player can already grow
    const need = {};
    let value = 0, xp = 0;
    let picked = 0;
    for (const id of pool) {
      if (picked >= kinds) break;
      const it = ITEMS[id]; if (!it || it.sell <= 0) continue;
      let q = Math.max(1, Math.round((28 + L * 3) / (it.sell + 8) * (0.7 + r() * 0.8)));
      q = clamp(q, 1, id === 'wheat' || id === 'corn' ? 8 : 5);
      need[id] = q; value += it.sell * q; xp += (it.made ? RECIPES[it.made].xp / Math.max(1, Object.values(RECIPES[it.made].out)[0]) : (CROP[id] ? CROP[id].xp : (ANIMALS.find((a) => a.product === id) || { xp: 4 }).xp)) * q; picked++;
    }
    if (!picked) { need.wheat = 3; value = 18; xp = 6; }
    const coins = Math.round(value * (1.28 + r() * 0.16) + 6);
    const o = {
      id: ++S.orderSeq, customer: pick(CUSTOMERS, r), title: pick(ORDER_TITLES, r), need, coins, xp: Math.max(4, Math.round(xp * 0.85)),
      stars: r() < 0.12 + L * 0.004 ? 1 : 0, at: this.now(),
    };
    return o;
  }
  ensureOrders(quiet) {
    const S = this.S, slots = this.orderSlots(), now = this.now();
    while (S.orders.length > slots) S.orders.pop();
    // waiting slots come back after a short pause (a quiet moment, not a punishment)
    S.orderWait = (S.orderWait || []).filter((t) => t > 0);
    while (S.orders.length + S.orderWait.length < slots) {
      if (S.orders.length === 0 && S.story.i === 1 && this.statValue('orders') === 0) {  // chapter 2: first orders are friendly
        const o = this.makeOrder(); o.need = { wheat: 3 }; o.coins = 40; o.xp = 8; o.customer = 'Milo'; o.title = "Milo's Breakfast"; S.orders.push(o); continue;
      }
      S.orders.push(this.makeOrder());
    }
    for (let i = S.orderWait.length - 1; i >= 0; i--) if (now >= S.orderWait[i] && S.orders.length < slots) { S.orderWait.splice(i, 1); S.orders.push(this.makeOrder()); }
    if (!quiet) this.emit('orders');
  }
  canFill(o) { return Object.entries(o.need).every(([k, q]) => this.have(k) >= q); }
  fillOrder(id) {
    const S = this.S, i = S.orders.findIndex((o) => o.id === id); if (i < 0) return { ok: false };
    const o = S.orders[i];
    if (!this.canFill(o)) return { ok: false, reason: 'missing' };
    for (const [k, q] of Object.entries(o.need)) this.takeItem(k, q);
    S.orders.splice(i, 1); S.orderWait.push(this.now() + 12000);
    this.addCoins(o.coins, 'order'); if (o.stars) this.addStars(o.stars);
    this.stat('orders'); this.emit('order', { order: o });
    this.addXp(o.xp);
    this.checkStory(); this.questTouch(); this.touch(); return { ok: true, order: o };
  }
  skipOrder(id) {   // set an order aside; a fresh one arrives after a moment
    const S = this.S, i = S.orders.findIndex((o) => o.id === id); if (i < 0) return { ok: false };
    S.orders.splice(i, 1); S.orderWait.push(this.now() + 20000); this.emit('orders'); this.touch(); return { ok: true };
  }

  // ---- boat -------------------------------------------------------------------------------------------------
  boatInfo() {
    const S = this.S; if (S.level < 3) return null;
    if (!S.boat) this.newBoat();
    const b = S.boat, t = this.now();
    if (b.state === 'away' && t >= b.returnAt) { b.state = 'docked'; this.newBoat(true); this.emit('boatback'); }
    return S.boat;
  }
  newBoat(keepTrips) {
    const S = this.S, L = S.level, r = this.rand;
    const n = clamp(3 + Math.floor(L / 10), 3, 6);
    const avail = this.availableItems().filter((k) => ITEMS[k].sell > 0);
    const crates = []; let value = 0;
    const pool = shuffle(avail.slice(), r);
    for (let i = 0; i < n; i++) {
      const id = pool[i % pool.length] || 'wheat', it = ITEMS[id];
      const q = clamp(Math.round((60 + L * 6) / (it.sell + 6)), 1, 10);
      crates.push({ item: id, qty: q }); value += it.sell * q;
    }
    S.boat = { state: 'docked', crates, coins: Math.round(value * 1.6 + 30), stars: n - 1, xp: 30 + L * 4, returnAt: 0 };
  }
  boatFill() { const b = this.boatInfo(); return b && b.state === 'docked' && b.crates.every((c) => this.have(c.item) >= c.qty); }
  sendBoat() {
    const b = this.boatInfo(); if (!b || b.state !== 'docked') return { ok: false };
    if (!this.boatFill()) return { ok: false, reason: 'missing' };
    for (const c of b.crates) this.takeItem(c.item, c.qty);
    this.addCoins(b.coins, 'boat'); this.addStars(b.stars);
    const rw = { coins: b.coins, stars: b.stars, xp: b.xp };
    b.state = 'away'; b.returnAt = this.now() + BOAT_AWAY_SEC * 1000;
    this.stat('boat'); this.emit('boatsent', rw); this.addXp(b.xp);
    this.checkStory(); this.questTouch(); this.touch(); return { ok: true, reward: rw };
  }

  // ---- decorations ------------------------------------------------------------------------------------------
  buyDecor(type, x, z, rot) {
    const S = this.S, d = DECOR.find((q) => q.id === type);
    if (!d) return { ok: false };
    if (S.level < d.level) return { ok: false, reason: 'level', need: d.level };
    const free = S.decorFree && S.decorFree[type] > 0;   // event rewards
    if (free) S.decorFree[type]--; else if (!this.spend(d.cost)) return { ok: false, reason: 'coins' };
    S.decor.push({ id: S.nextDecor++, type, x, z, rot: rot || 0 });
    this.emit('decor', { type, x, z }); this.checkStory(); this.questTouch(); this.touch(); return { ok: true };
  }
  moveDecor(id, x, z, rot) { const d = this.S.decor.find((q) => q.id === id); if (!d) return { ok: false }; d.x = x; d.z = z; d.rot = rot; this.emit('decor', { type: d.type, x, z, moved: true }); this.touch(); return { ok: true }; }
  storeDecor(id) {   // put it back in the bag for a full refund of what it cost (never lose coins on a change of mind)
    const i = this.S.decor.findIndex((q) => q.id === id); if (i < 0) return { ok: false };
    const d = this.S.decor.splice(i, 1)[0], def = DECOR.find((q) => q.id === d.type);
    this.S.decorFree = this.S.decorFree || {}; this.S.decorFree[d.type] = (this.S.decorFree[d.type] || 0) + 1;
    this.emit('decor', { type: d.type, removed: true }); this.touch(); return { ok: true, def };
  }

  // ---- neighbours ---------------------------------------------------------------------------------------------
  npc(id) { return this.S.npcs[id] || (this.S.npcs[id] = { met: false, pts: 0, invited: false, lastChat: 0, lastGift: 0, favour: null, favourAt: 0 }); }
  greet(id) {
    const n = this.npc(id), first = !n.met, today = dayKey(this.now());
    if (first) { n.met = true; n.pts += 5; this.discover('npc_' + id); this.emit('met', { id }); this.addXp(6); }
    let pts = 0;
    if (n.lastChat !== today) { n.lastChat = today; if (!first) pts = 3; n.pts += pts; }
    this.ensureFavour(id);
    this.checkStory(); this.touch(); return { ok: true, first, pts };
  }
  gift(id) {
    const n = this.npc(id), def = NPCS[id], today = dayKey(this.now());
    if (n.lastGift === today) return { ok: false, reason: 'today' };
    if (this.have(def.gift) < 1) return { ok: false, reason: 'missing', item: def.gift };
    this.takeItem(def.gift, 1); n.lastGift = today; n.pts += 10; this.emit('gift', { id }); this.checkStory(); this.touch(); return { ok: true };
  }
  ensureFavour(id) {
    const n = this.npc(id), def = NPCS[id], now = this.now();
    if (n.favour || !n.met || now < n.favourAt) return;
    const avail = def.favour.filter((k) => ITEMS[k] && (this.availableItems().includes(k) || CROP[k] && CROP[k].level <= this.S.level)); const pool = avail.length ? avail : ['wheat'];
    const item = pick(pool, this.rand), it = ITEMS[item];
    const q = clamp(Math.round((26 + this.S.level * 2) / (it.sell + 6)) + 1, 1, 6);
    n.favour = { item, qty: q, coins: Math.round(it.sell * q * 1.4 + 12), xp: 10 + this.S.level, pts: 15 };
  }
  doFavour(id) {
    const n = this.npc(id); this.ensureFavour(id); const f = n.favour; if (!f) return { ok: false };
    if (this.have(f.item) < f.qty) return { ok: false, reason: 'missing', item: f.item, qty: f.qty };
    this.takeItem(f.item, f.qty); n.favour = null; n.favourAt = this.now() + 60000; n.pts += f.pts;
    this.addCoins(f.coins, 'favour'); this.stat('favours'); this.emit('favour', { id, f }); this.addXp(f.xp);
    this.checkStory(); this.touch(); return { ok: true, f };
  }
  invite(id) {
    const n = this.npc(id); if (!n.met) return { ok: false, reason: 'unmet' };
    if (n.invited) return { ok: false, reason: 'done' };
    if (this.chapterId() !== 'fair') return { ok: false, reason: 'notyet' };
    n.invited = true; n.pts += 10; this.emit('invite', { id }); this.checkStory(); this.touch(); return { ok: true };
  }

  // ---- story --------------------------------------------------------------------------------------------------
  chapterId() { const c = CHAPTERS[this.S.story.i]; return c ? c.id : 'done'; }
  chapter() {
    const S = this.S, ch = CHAPTERS[S.story.i];
    if (!ch) return { done: true, index: CHAPTERS.length, ch: null };
    const have = Math.min(ch.target, this.statValue(ch.stat));
    return { done: false, index: S.story.i, ch, have, target: ch.target, ready: have >= ch.target };
  }
  checkStory() {
    const c = this.chapter(); if (c.done) return;
    if (c.ready && !this._chapterReadyFor) { this._chapterReadyFor = c.index; this.emit('chapterready', { index: c.index, ch: c.ch }); }
    this.emit('story');
  }
  claimChapter() {
    const c = this.chapter(); if (c.done || !c.ready) return { ok: false };
    const S = this.S, ch = c.ch;
    S.story.claimed.push(ch.id); S.story.i++;
    this._chapterReadyFor = null;
    this.addCoins(ch.coins, 'story'); this.stat('chapters', 1);
    const cxp = Math.max(40, Math.round(xpNeed(S.level) * 0.85 / 5) * 5);
    const cos = ch.id === 'lanterns' ? 'flag_lanterns' : ch.id === 'fair' ? 'hat_lantern' : null;
    if (cos) this.S.cos.own[cos] = true;
    this.emit('chapter', { index: S.story.i - 1, ch, cos, xp: cxp });
    this.addXp(cxp);
    if (ch.id === 'fair') { S.stats.fair = 1; this.emit('finale'); }
    this.ensureOrders(); this.checkStory(); this.touch(); return { ok: true, ch, cos };
  }

  // ---- album ---------------------------------------------------------------------------------------------------
  discover(id) {
    const S = this.S; if (S.album[id]) return false;
    S.album[id] = true; this.emit('sticker', { id });
    for (const set of ALBUM_SETS) if (!S.albumDone[set.id] && set.items.every((k) => S.album[k])) { S.albumDone[set.id] = true; this.addCoins(set.reward.coins, 'album'); this.addStars(set.reward.stars); this.emit('albumset', { set }); }
    return true;
  }
  foundCritter(id) { if (this.discover('crit_' + id)) { this.stat('critters', 0); this.emit('critter', { id }); this.addXp(5); this.touch(); return true; } return false; }

  // ---- achievements ------------------------------------------------------------------------------------------
  achStatus() {
    const S = this.S;
    return ACHIEVEMENTS.map((a) => {
      const v = this.statValue(a.stat), claimed = S.ach[a.id] || 0, next = a.tiers[claimed] || null;
      return { def: a, value: v, claimed, next, ready: !!next && v >= next.n, done: claimed >= a.tiers.length };
    });
  }
  claimAch(id) {
    const st = this.achStatus().find((a) => a.def.id === id); if (!st || !st.ready) return { ok: false };
    if (this.cheated) return { ok: false, reason: 'codes' };
    const t = st.next; this.S.ach[id] = st.claimed + 1;
    if (t.coins) this.addCoins(t.coins, 'ach'); if (t.stars) this.addStars(t.stars);
    if (t.cos) this.S.cos.own[t.cos] = true;
    if (id === 'fair_finale') this.S.cos.own.hat_party = true;
    this.emit('ach', { def: st.def, tier: t, index: st.claimed }); this.touch(); return { ok: true };
  }
  achReady() { return this.achStatus().filter((a) => a.ready).length; }

  // ---- daily reward and streak ----------------------------------------------------------------------------------
  checkDay(quiet) {
    const S = this.S, now = this.now(), today = dayNumber(now), d = S.daily;
    if (d.last === today) return;
    if (d.last === 0) d.streak = 1;
    else {
      const gap = today - d.last, wk = Math.floor(today / 7);
      d.rested = false; d.reset = false;
      if (gap === 1) d.streak++;
      else if (gap === 2 && d.graceWeek !== wk) { d.streak++; d.graceWeek = wk; d.rested = true; }   // one rest day a week keeps the streak
      else if (gap > 0) { d.streak = 1; d.reset = true; }
    }
    d.last = today; d.best = Math.max(d.best, d.streak); S.stats.bestStreak = Math.max(S.stats.bestStreak || 0, d.streak);
    d.claimable = true;
    this.ensureQuests();
    if (!quiet) this.emit('newday');
  }
  dailyClaimable() { const d = this.S.daily; return this.S.level >= 1 && d.claimed !== d.last; }
  dailyReward() { const d = this.S.daily; return DAILY_REWARDS[(d.streak - 1) % 7]; }
  claimDaily() {
    const S = this.S, d = S.daily; if (d.claimed === d.last) return { ok: false };
    const r = this.dailyReward(), scale = 1 + S.level / 8;
    if (r.coins) this.addCoins(Math.round(r.coins * scale), 'daily');
    if (r.stars) this.addStars(r.stars);
    if (r.item) this.addItem(r.item, r.qty);
    d.claimed = d.last; this.emit('daily', { r, day: (d.streak - 1) % 7 }); this.touch(); return { ok: true, r };
  }

  // ---- daily quests ------------------------------------------------------------------------------------------------
  ensureQuests() {
    const S = this.S, today = dayNumber(this.now());
    if (S.quests.day === today && S.quests.list.length) return;
    const rnd = rng(today * 7919 + S.seed % 10007), L = S.level;
    const kinds = QUEST_KINDS.filter((k) => !k.need || (k.need === 'pen' && Object.values(S.pens).some((p) => p.built)) || (k.need === 'building' && Object.values(S.blds).some((b) => b.built)));
    shuffle(kinds, rnd);
    const list = [];
    for (const k of kinds.slice(0, 3)) {
      const n = Math.max(k.min, Math.round(k.base + L * k.per * 3));
      list.push({ kind: k.kind, stat: k.stat, n, start: S.stats[k.stat] || 0, coins: Math.round(20 + n * (8 + L * 0.7)), xp: Math.round(6 + n * 1.5 + L), claimed: false });
    }
    S.quests = { day: today, list, chest: false };
  }
  questProgress(q) { return clamp((this.S.stats[q.stat] || 0) - q.start, 0, q.n); }
  questTouch() { this.emit('quests'); }
  claimQuest(i) {
    const q = this.S.quests.list[i]; if (!q || q.claimed || this.questProgress(q) < q.n) return { ok: false };
    q.claimed = true; this.addCoins(q.coins, 'quest'); this.addXp(q.xp); this.emit('questdone', { q }); this.touch(); return { ok: true };
  }
  claimQuestChest() {
    const Q = this.S.quests; if (Q.chest || !Q.list.every((q) => q.claimed)) return { ok: false };
    Q.chest = true; const stars = 2 + Math.floor(this.S.level / 15); this.addStars(stars); this.addCoins(60 + this.S.level * 8, 'quest'); this.emit('questchest', { stars }); this.touch(); return { ok: true, stars };
  }

  // ---- seasonal event --------------------------------------------------------------------------------------------
  seasonNow() { const s = this.S.settings; return s.season === 'auto' ? seasonFor(this.now(), s.hemi) : s.season; }
  event() {
    const season = this.seasonNow(), def = EVENTS[season], S = this.S;
    const key = def.id + '_' + new Date(this.now()).getFullYear();
    const ev = S.events[key] || (S.events[key] = { done: [] });
    return { key, def, season, done: ev.done };
  }
  eventCanFill(i) { const e = this.event(); const b = e.def.baskets[i]; return b && !e.done[i] && Object.entries(b.need).every(([k, q]) => this.have(k) >= q); }
  eventFill(i) {
    const e = this.event(), b = e.def.baskets[i];
    if (!b || e.done[i]) return { ok: false };
    if (i > 0 && !e.done[i - 1]) return { ok: false, reason: 'order' };
    if (!this.eventCanFill(i)) return { ok: false, reason: 'missing' };
    for (const [k, q] of Object.entries(b.need)) this.takeItem(k, q);
    e.done[i] = true; const S = this.S;
    if (b.reward.coins) this.addCoins(b.reward.coins, 'event'); if (b.reward.stars) this.addStars(b.reward.stars);
    if (b.reward.decor) { S.decorFree = S.decorFree || {}; S.decorFree[b.reward.decor] = (S.decorFree[b.reward.decor] || 0) + 1; }
    this.emit('eventbasket', { i, b }); this.addXp(20 + this.S.level * 2); this.touch(); return { ok: true };
  }

  // ---- cosmetics ----------------------------------------------------------------------------------------------------
  cosOwned(id) { return !!this.S.cos.own[id]; }
  cosUnlockable(c) { return c.free || this.S.cos.own[c.id]; }
  buyCosmetic(id) {
    const c = COSMETICS.find((q) => q.id === id); if (!c || this.cosOwned(id)) return { ok: false };
    if (c.story || c.ach) return { ok: false, reason: 'earn' };
    if (this.S.level < (c.level || 1)) return { ok: false, reason: 'level', need: c.level };
    if (c.coins) { if (!this.spend(c.cost)) return { ok: false, reason: 'coins' }; } else { if (this.S.stars < c.cost) return { ok: false, reason: 'stars' }; this.S.stars -= c.cost; this.emit('stars', { n: -c.cost }); }
    this.S.cos.own[id] = true; this.wear(id); this.touch(); return { ok: true };
  }
  wear(id) { const c = COSMETICS.find((q) => q.id === id); if (!c || !this.cosOwned(id)) return { ok: false }; this.S.cos.wear[c.slot] = id; this.emit('wear', { slot: c.slot, id }); this.touch(); return { ok: true }; }

  // ---- offline -------------------------------------------------------------------------------------------------------
  offlineReport(prev, now) {
    const S = this.S, secs = Math.max(0, (now - prev) / 1000);
    if (secs < 90) return null;
    const rep = { secs, ripe: 0, animals: 0, jobs: 0, boat: false, coins: 0 };
    for (const [id, p] of Object.entries(S.plots)) { const c = CROP[p.crop]; if (c && prev < p.at + c.sec * 1000 && now >= p.at + c.sec * 1000) rep.ripe++; }
    for (const [id, pen] of Object.entries(S.pens)) { const a = ANIMAL[PEN[id].animal]; for (const an of pen.animals) if (an.state === 'growing' && prev < an.at + a.sec * 1000 && now >= an.at + a.sec * 1000) rep.animals++; }
    for (const b of Object.values(S.blds)) for (const j of b.queue) if (prev < j.end && now >= j.end) rep.jobs++;
    if (S.boat && S.boat.state === 'away' && prev < S.boat.returnAt && now >= S.boat.returnAt) rep.boat = true;
    // a gentle thank-you for coming back: Pip and the neighbours tidied up. Capped at four hours, never a penalty for staying away.
    const hours = Math.min(4, secs / 3600);
    rep.coins = Math.round(hours * (24 + S.level * 5));
    return rep;
  }
  claimAway() { const a = this.away; if (!a) return; if (a.coins) this.addCoins(a.coins, 'away'); this.away = null; this.touch(); }

  // ---- codes ----------------------------------------------------------------------------------------------------------
  code(text) {
    const c = String(text || '').trim().toUpperCase(), S = this.S;
    const on = (msg) => { this.cheated = true; this.emit('codes'); this.touch(); return { ok: true, message: msg }; };
    if (c === 'COINS500') { this.addCoins(500, 'code'); return on('+500 coins'); }
    if (c === 'GROWNOW') { const t = this.now(); for (const p of Object.values(S.plots)) p.at = t - 1e9; for (const [id, pen] of Object.entries(S.pens)) for (const an of pen.animals) if (an.state === 'growing') an.at = t - 1e9; for (const b of Object.values(S.blds)) for (const j of b.queue) { j.end = t - 1; } return on('Everything is ripe'); }
    if (c === 'LEVELUP') { this.addXp(xpNeed(S.level) - S.xp); return on('Level up'); }
    if (c === 'BUILDALL') { for (const s of SITES) if (!S.blds[s.id]) S.blds[s.id] = { built: true, queue: [] }; for (const p of PENS) if (!S.pens[p.id]) S.pens[p.id] = { built: true, animals: [] }; for (const p of PATCHES) S.patches[p.id] = true; this.emit('built', { kind: 'all' }); return on('Everything built'); }
    return { ok: false };
  }

  // ---- ticking -----------------------------------------------------------------------------------------------------------
  tick() {
    if (!this.S) return;
    this.ensureOrders(); this.boatInfo();
    const d = dayNumber(this.now()); if (this.S.daily.last !== d) this.checkDay();
    if (this.dirty) this.save();
  }
}
export { PLOT, PEN, SITE, PATCH, CROP, ANIMAL };

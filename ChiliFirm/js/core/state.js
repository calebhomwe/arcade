/* ============================================================
   Chili Firm 2 — Game state: creation, save, load, migration
   ============================================================ */
(function (global) {
  'use strict';

  const SAVE_KEY = 'chili_firm2_save';
  const VERSION = 3;

  function newPlot() {
    return { strain: null, progress: 0, status: 'empty', boostUntil: 0, readyAt: 0 };
  }

  function createState(now) {
    now = now || Date.now() / 1000;
    const plots = [];
    for (let i = 0; i < 12; i++) plots.push(newPlot());
    return {
      v: VERSION,
      money: 50,
      rep: 0,
      day: 1,
      dayClock: 0,          // seconds elapsed in current day
      inventory: { strains: {}, jerky: 0 },
      plots,
      plotCount: 12,
      selectedPlot: 0,
      unlocked: ['jalapeno'],
      selectedStrain: 'jalapeno',
      workers: {
        farmhand: { owned: 0, lvl: 1 },
        buyer: { owned: 0, lvl: 1 },
        foreman: { owned: 0, lvl: 1 },
        driver: { owned: 0, lvl: 1 },
        chef: { owned: 0, lvl: 1 },
        brand: { owned: 0, lvl: 1 },
      },
      upgrades: { soil: 0, irrigation: 0, greenhouse: 0, fertilizer: 0, storage: 0, marketing: 0 },
      biz: {
        jerky: { unlocked: false, level: 0, recipe: 0, made: 0, sold: 0 },
        fashion: { unlocked: false, level: 0, designed: 0, collection: null },
        mining: { unlocked: false, level: 0, caveUntil: 0, strikes: 0 },
        media: { unlocked: false, level: 0, earned: 0 },
      },
      research: [],
      missionIdx: 0,
      pendingDialogue: null,
      dialogueQueue: [],
      choice: null,
      story: { vega: null, festivalSold: 0 },
      contract: { offer: null, active: null },
      event: null,
      infested: false,
      stats: {
        planted: 0, harvested: 0, sold: 0, earned: 0, spent: 0,
        contracts: 0, festivals: 0, offlineEarned: 0, bestHarvest: 0,
      },
      ach: {},
      settings: { sound: true, speed: 1, music: true },
      coach: {},
      log: [],
      wt: { farmhand: 0, buyer: 0 },
      last: now,
      finished: false,
      legacy: false,
      created: now,
      totalDays: 1,
    };
  }

  function sanitize(s) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) s = createState(Date.now() / 1000);
    // Merge a loaded state onto a fresh one so new fields never break old saves.
    const fresh = createState(Date.now() / 1000);
    for (const k of Object.keys(fresh)) {
      if (typeof s[k] === 'undefined') s[k] = fresh[k];
    }
    if (!s.v || s.v !== VERSION) { s.v = VERSION; }
    s.plots = (s.plots || []).map(p => Object.assign(newPlot(), p));
    while (s.plots.length < s.plotCount) s.plots.push(newPlot());
    s.inventory = s.inventory || { strains: {}, jerky: 0 };
    s.inventory.strains = s.inventory.strains || {};
    s.workers = Object.assign({}, fresh.workers, s.workers);
    s.upgrades = Object.assign({}, fresh.upgrades, s.upgrades);
    s.biz = Object.assign({}, fresh.biz, s.biz);
    s.biz.jerky = Object.assign({}, fresh.biz.jerky, s.biz.jerky);
    s.biz.fashion = Object.assign({}, fresh.biz.fashion, s.biz.fashion);
    s.biz.mining = Object.assign({}, fresh.biz.mining, s.biz.mining);
    s.biz.media = Object.assign({}, fresh.biz.media, s.biz.media);
    s.stats = Object.assign({}, fresh.stats, s.stats);
    s.settings = Object.assign({}, fresh.settings, s.settings);
    s.coach = (s.coach && typeof s.coach === 'object') ? s.coach : {};
    s.wt = Object.assign({ farmhand: 0, buyer: 0 }, s.wt || {});
    s.contract = Object.assign({ offer: null, active: null, forced: null }, s.contract || {});
    s.story = Object.assign({ festivalSold: 0, vega: null }, s.story);
    s.dialogueQueue = s.dialogueQueue || [];
    s.ach = s.ach || {};
    s.log = (s.log || []).slice(-60);
    return s;
  }

  function saveState(state, storage) {
    state.last = Date.now() / 1000;
    const data = JSON.stringify(state);
    if (storage) {
      try { storage.setItem(SAVE_KEY, data); } catch (e) { /* quota */ }
    }
    return data;
  }

  function loadState(storage, now) {
    if (!storage) return null;
    let raw = null;
    try { raw = storage.getItem(SAVE_KEY); } catch (e) { return null; }
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      return sanitize(s);
    } catch (e) { return null; }
  }

  function exportState(state) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  }

  function importState(str, now) {
    try {
      const s = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
      s.last = now || Date.now() / 1000;
      return sanitize(s);
    } catch (e) { return null; }
  }

  function wipeSave(storage) {
    try { if (storage) storage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  const stateMod = { SAVE_KEY, VERSION, createState, sanitize, saveState, loadState, exportState, importState, wipeSave };
  if (typeof module !== 'undefined' && module.exports) module.exports = stateMod;
  global.CF = global.CF || {};
  global.CF.stateMod = stateMod;
})(typeof window !== 'undefined' ? window : globalThis);

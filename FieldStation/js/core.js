/* FIELD STATION — shared core.
   Progress model, audio, UI helpers, and the game-module contract. */

export const $  = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) n.setAttribute(k, v);
  }
  kids.flat().forEach(c => n.append(c?.nodeType ? c : document.createTextNode(c)));
  return n;
};
export const rnd  = (a, b) => a + Math.random() * (b - a);
export const rint = (a, b) => Math.floor(rnd(a, b + 1));
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const shuf = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rint(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

/* ─────────────────────────────────────────────────────────
   Mastery. Not a score — a per-skill estimate that decays.
   Correct answers move mastery toward 100 with diminishing
   returns; mistakes knock it down harder. That asymmetry is
   deliberate: it stops lucky guessing from reading as skill.
   ───────────────────────────────────────────────────────── */
const KEY = 'fieldstation.v1';
let DB = load();

function load() {
  let db = null;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
  const f = fresh();
  if (db && typeof db === 'object') { for (const k of Object.keys(f)) if (db[k] === undefined) db[k] = f[k]; return db; }
  return f;
}
function fresh() {
  return { skills: {}, modules: {}, streak: 0, lastDay: null, totalRight: 0, totalWrong: 0,
           xp: 0, coins: 0, stars: 0, daily: { day: null, correct: 0, goal: 5, done: false, reward: 0 },
           badges: [], seen: {}, theme: 'field', owned: ['field'] };
}
function save() {
  DB.stars = Math.round((DB.totalRight || 0) / 4) + Object.keys(DB.modules).filter(m => DB.modules[m] >= 100).length * 2;
  try {
    localStorage.setItem(KEY, JSON.stringify(DB));
    // Compact mirror of the station record (some readers truncate long blobs; this stays short,
    // uses plain field names, and changes whenever the record does).
    const owned = DB.owned && DB.owned.length ? DB.owned : ['field'];
    const cert = Object.keys(DB.modules).filter(m => DB.modules[m] >= 100).length;
    localStorage.setItem('fieldstation.prog', JSON.stringify({
      level: 1 + Math.floor((DB.xp || 0) / 60), xp: DB.xp || 0, coins: DB.coins || 0, stars: DB.stars || 0,
      daily: Math.min((DB.daily && DB.daily.correct) || 0, 99), goals: (DB.daily && DB.daily.goal) || 5,
      badges: (DB.badges || []).length, unlocks: Math.max(0, owned.length - 1) + cert,
      themes: owned.length, certified: cert
    }));
  } catch {}
}

export const Progress = {
  all: () => DB,
  skill(id) { return DB.skills[id] ?? 0; },

  /** Record one graded attempt against a named skill. */
  record(skillId, correct) {
    const cur = DB.skills[skillId] ?? 0;
    DB.skills[skillId] = correct
      ? clamp(cur + (100 - cur) * 0.34, 0, 100)   // approach mastery, never leap to it
      : clamp(cur - 18, 0, 100);                  // errors cost more than hits earn
    correct ? DB.totalRight++ : DB.totalWrong++;
    const ev = this.award(correct ? 10 : 3, correct ? 1 : 0, correct ? 'Answer logged' : 'Effort logged');
    this.touchDay();
    if (correct) this.bumpDaily();
    save();
    return ev;
  },

  /* ── XP / level / stars / coins / badges ─────────────── */
  xp() { return DB.xp || 0; },
  level() { return 1 + Math.floor((DB.xp || 0) / 60); },
  levelPct() { return Math.round(((DB.xp || 0) % 60) / 60 * 100); },
  stars() { return DB.stars || 0; },
  coins() { return DB.coins || 0; },

  /** Add XP and coins; level up, finish the daily goal and unlock badges as they come due. */
  award(xp, coins, whyText) {
    const ev = { xp: xp || 0, coins: coins || 0, leveled: false, newBadges: [], dailyDone: false };
    const before = this.level();
    DB.xp = (DB.xp || 0) + (xp || 0);
    DB.coins = (DB.coins || 0) + (coins || 0);
    ev.leveled = this.level() > before;
    ev.newBadges = this.checkBadges();
    save();
    return ev;
  },

  /** The daily goal: N correct answers today, one bonus payout. */
  daily() { return DB.daily; },
  bumpDaily() {
    const d = DB.daily, today = new Date().toDateString();
    if (d.day !== today) { d.day = today; d.correct = 0; d.done = false; d.reward = 0; }
    d.correct++;
    if (!d.done && d.correct >= d.goal) {
      d.done = true; d.reward = 10;
      DB.coins = (DB.coins || 0) + 10;
      this.checkBadges();
    }
    save();
  },
  /** Roll the daily goal over for a new day (call whenever the station renders). */
  rollDaily() {
    const d = DB.daily, today = new Date().toDateString();
    if (d.day !== today) { d.day = today; d.correct = 0; d.done = false; d.reward = 0; save(); }
  },

  /** One XP thanks for opening an instrument (first time each day) — operating it counts. */
  visit(modId) {
    const today = new Date().toDateString();
    DB.seen = DB.seen || {};
    DB.seen[modId] = (DB.seen[modId] || 0) + 1;
    if (DB.lastVisitDay !== today) {
      DB.lastVisitDay = today;
      this.rollDaily();
      const ev = this.award(5, 1, 'Station shift started');
      ev.newBadges = ev.newBadges.concat(this.checkBadges());
      save();
      return ev;
    }
    save();
    return null;
  },

  BADGES: [
    { id: 'first',     label: 'First answer',      test: db => (db.totalRight || 0) >= 1 },
    { id: 'ten',       label: 'Ten right',         test: db => (db.totalRight || 0) >= 10 },
    { id: 'explorer',  label: 'Explorer',          test: db => Object.keys(db.seen || {}).length >= 3 },
    { id: 'certified', label: 'First certification', test: db => Object.values(db.modules || {}).some(v => v >= 100) },
    { id: 'streak3',   label: 'Three-day streak',  test: db => (db.streak || 0) >= 3 },
    { id: 'daily',     label: 'Daily goal done',   test: db => !!(db.daily && db.daily.done) },
    { id: 'rich',      label: 'Twenty coins',      test: db => (db.coins || 0) >= 20 }
  ],
  checkBadges() {
    const out = [];
    for (const b of this.BADGES) {
      if (!DB.badges.includes(b.id) && b.test(DB)) { DB.badges.push(b.id); out.push(b.label); }
    }
    return out;
  },
  badgeLabels() { return this.BADGES.filter(b => DB.badges.includes(b.id)).map(b => b.label); },

  /** Module completion percentage, 0..100. */
  moduleScore(modId) { return DB.modules[modId] ?? 0; },
  setModule(modId, pct) {
    DB.modules[modId] = Math.max(DB.modules[modId] ?? 0, Math.round(pct));
    save();
  },

  touchDay() {
    const today = new Date().toDateString();
    if (DB.lastDay === today) return;
    const y = new Date(Date.now() - 864e5).toDateString();
    DB.streak = DB.lastDay === y ? DB.streak + 1 : 1;
    DB.lastDay = today;
  },

  /** Weakest skills first — used to bias question selection. */
  weakest(ids, n = 3) {
    return [...ids].sort((a, b) => (DB.skills[a] ?? 0) - (DB.skills[b] ?? 0)).slice(0, n);
  },

  /* ── Station shop: themes bought with earned coins, some gated on certifications ── */
  theme() { return DB.theme || 'field'; },
  ownedThemes() { return DB.owned && DB.owned.length ? DB.owned : ['field']; },
  certifiedCount() { return Object.values(DB.modules || {}).filter(v => v >= 100).length; },
  buyTheme(id) {
    const t = THEMES.find(x => x.id === id);
    if (!t) return { ok: false, why: 'Unknown theme' };
    if (this.ownedThemes().includes(id)) { this.setTheme(id); return { ok: true, bought: false }; }
    if (t.req && this.certifiedCount() < t.req) return { ok: false, why: `Certify ${t.req} instruments first (${this.certifiedCount()} so far)` };
    if ((DB.coins || 0) < t.price) return { ok: false, why: `Needs ${t.price} coins — you have ${DB.coins || 0}` };
    DB.coins -= t.price;
    DB.owned = this.ownedThemes().concat(id);
    this.setTheme(id);
    return { ok: true, bought: true };
  },
  setTheme(id) {
    if (!this.ownedThemes().includes(id)) return;
    DB.theme = id;
    save();
    applyTheme(id);
  },

  reset() { DB = fresh(); save(); applyTheme(DB.theme); }
};

/* Station themes — recolour the notebook. Field is free; the rest cost coins
   earned by answering, and two of them want instruments certified first. */
export const THEMES = [
  { id: 'field',   label: 'Field Notes', price: 0,  req: 0, vars: {} },
  { id: 'lab',     label: 'Lab Slate',   price: 20, req: 0,
    vars: { '--rust':'#3a6ea5', '--ochre':'#3f8f6b', '--plum':'#5b4a8a', '--slate':'#2e5d74', '--sage':'#3f8f6b' } },
  { id: 'orchard', label: 'Orchard',     price: 25, req: 2,
    vars: { '--rust':'#4a7d3a', '--ochre':'#8a6d2f', '--plum':'#3a6e4a', '--slate':'#3f5c3b', '--sage':'#4a7d3a' } },
  { id: 'dusk',    label: 'Dusk Watch',  price: 35, req: 4,
    vars: { '--ink':'#2a2030', '--ink2':'#4d4056', '--paper':'#efe4da', '--paper2':'#e2d4ca', '--line':'#2a2030',
            '--rust':'#8a4a6b', '--ochre':'#a5722f', '--plum':'#6b3a5c', '--slate':'#4a3a6b', '--sage':'#5a6b3a' } }
];
export function applyTheme(id) {
  const t = THEMES.find(x => x.id === id) || THEMES[0];
  let tag = document.getElementById('themeVars');
  if (!tag) { tag = document.createElement('style'); tag.id = 'themeVars'; document.head.append(tag); }
  tag.textContent = ':root{' + Object.entries(t.vars).map(([k, v]) => k + ':' + v).join(';') + '}';
}

/* ─────────────────────────────────────────────────────────
   Audio — short, warm, non-arcade. Web Audio only, no files.
   ───────────────────────────────────────────────────────── */
export const Sound = {
  ctx: null, on: true,
  init() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } },
  tone(f, d = .25, type = 'triangle', v = .09, delay = 0) {
    if (!this.on) return; this.init(); if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2400;
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + .02);
    g.gain.exponentialRampToValueAtTime(.0006, t + d);
    o.connect(lp); lp.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + d + .04);
  },
  ok()   { this.tone(392, .3); this.tone(588, .34, 'sine', .06, .07); },
  no()   { this.tone(120, .45, 'sawtooth', .07); },
  click(){ this.tone(660, .05, 'sine', .035); },
  win()  { [0, 4, 7, 12].forEach((s, i) => this.tone(392 * Math.pow(2, s / 12), .5, 'triangle', .075, i * .1)); }
};

/* ─────────────────────────────────────────────────────────
   UI helpers
   ───────────────────────────────────────────────────────── */
export function toast(msg, kind = '') {
  let host = $('#toast');
  if (!host) { host = el('div', { id: 'toast' }); document.body.append(host); }
  const t = el('div', { class: 'toast ' + kind }, msg);
  host.append(t);
  setTimeout(() => t.remove(), 2250);
}

/** The teaching callout. Every wrong answer must produce one of these. */
export function why(title, body) {
  return el('div', { class: 'why' }, el('b', {}, title), body);
}

export function readout(pairs) {
  return el('div', { class: 'readout' },
    pairs.map(([l, v, id]) => el('div', { class: 'c' },
      el('div', { class: 'l' }, l),
      el('div', { class: 'v', id: id || null }, String(v)))));
}

export function taskCard(kicker, title, detail) {
  return el('div', { class: 'task' },
    el('div', { class: 'k' }, kicker),
    el('div', { class: 't' }, title),
    detail ? el('div', { class: 'd' }, detail) : '');
}

/** Crisp canvas at device pixel ratio; returns a draw context sized in CSS px. */
export function fitCanvas(cv, cssH) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = cv.clientWidth || 640;
  cv.style.height = cssH + 'px';
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(cssH * dpr);
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w, h: cssH };
}

export const INK = {
  paper:'#f2e9d8', paper2:'#e8dcc6', ink:'#241f28', ink2:'#4a4150',
  rust:'#b8543a', ochre:'#c98b32', sage:'#5f7d5a', slate:'#3f5c6b',
  plum:'#6b4258', dust:'#9a8570'
};

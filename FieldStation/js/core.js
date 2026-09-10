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
  try { return JSON.parse(localStorage.getItem(KEY)) || fresh(); }
  catch { return fresh(); }
}
function fresh() { return { skills: {}, modules: {}, streak: 0, lastDay: null, totalRight: 0, totalWrong: 0 }; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch {} }

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
    this.touchDay();
    save();
  },

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

  reset() { DB = fresh(); save(); }
};

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

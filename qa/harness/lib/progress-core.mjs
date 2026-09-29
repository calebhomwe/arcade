// checkProgression(): does the game have REAL progression? Play a monkey session, diff what was saved, start a second session
// on the same profile, and look for the progression systems a child would come back for.
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import { devices, wait, heavy, urlFor, routeExternal, ENGINE, rng, root, extRoot, STDMETA, META } from './common.mjs';
import { makeBot } from './bot.mjs';

const INJECT = await fs.readFile(path.join(import.meta.dirname, 'inject.js'), 'utf8');
// localStorage traffic: which keys does the game read at boot, which does it write, and when
const PROG_INJECT = `(() => {
  const P = window.__P = { reads: {}, writes: {}, removes: 0, t0: performance.now() };
  try {
    const S = Storage.prototype, gi = S.getItem, si = S.setItem, ri = S.removeItem;
    S.getItem = function (k) { const v = gi.apply(this, arguments); try { if (this === window.localStorage) { const e = P.reads[k] || (P.reads[k] = { n: 0, found: false }); e.n++; if (v != null) e.found = true; } } catch (x) {} return v; };
    S.setItem = function (k, v) { try { if (this === window.localStorage) { const e = P.writes[k] || (P.writes[k] = { n: 0 }); e.n++; e.last = String(v).slice(0, 100); e.t = Math.round(performance.now() - P.t0); } } catch (x) {} return si.apply(this, arguments); };
    S.removeItem = function (k) { try { if (this === window.localStorage) P.removes++; } catch (x) {} return ri.apply(this, arguments); };
  } catch (e) {}
})();`;

const race = (p, ms, label = 'timeout') => Promise.race([p, wait(ms).then(() => label)]);

// ---- what counts as which system ----
export const SYSTEMS = ['levels', 'unlocks', 'upgrades', 'stars', 'goals', 'achievements', 'daily', 'cosmetics'];
export const SINKS = ['upgrades', 'unlocks', 'cosmetics'], SOURCES = ['levels', 'stars', 'goals', 'achievements', 'daily'];
export const RX = {
  levels: /\b(level|lvl|stage|world|chapter|island|zone|track|course|campaign|shift|day|round|wave|map)\s*#?\s*\d+|\blevel select\b|\bworlds?\b|\bchoose (a |your )?(level|stage|track|world|map)\b|\bnext level\b|\bcampaign\b|\blevels\b|\bprogress(ion)?\b|\bxp\b|\bexperience\b/i,
  unlocks: /\bunlock(s|ed|ing|able)?\b|🔒|\blocked\b|\bnew (skin|character|track|level|item|kit|mode)\b|\binventory\b|\bowned\b/i,
  upgrades: /\bupgrade[sd]?\b|\bshop\b|\bstore\b|\bperks?\b|\btalents?\b|\bskill tree\b|\btech tree\b|\bbuy\b|\bprestige\b|\bpurchase[sd]?\b|\bbought\b|\bresearch\b/i,
  stars: /[★☆⭐]|\bstars?\b|\bmedals?\b|\bratings?\b|\bgrades?\b|\b[SABCD] rank\b|\brank [SABCD]\b|\bstars earned\b/i,
  goals: /\bquests?\b|\bmissions?\b|\bgoals?\b|\bchallenges?\b|\bobjectives?\b|\btargets?\b|\btasks?\b|\borders?\b|\bcontracts?\b|\bbounties\b/i,
  achievements: /\bachievements?\b|\bbadges?\b|\btroph(y|ies)\b|\bstickers?\b|\bmilestones?\b|\bawards?\b|\bcollection\b|\bcollectibles?\b/i,
  daily: /\bdaily\b|\bstreak\b|\bcome back\b|\btomorrow\b|\bevery day\b|\blogin bonus\b|\bday \d+ reward\b|\bcalendar\b|\bweekly\b|\blastday\b|\blast[_ ]?(played|login|visit)\b/i,
  cosmetics: /\bskins?\b|\bcosmetics?\b|\boutfits?\b|\bcostumes?\b|\bhats?\b|\bthemes?\b|\bcustomi[sz]e\b|\bwardrobe\b|\bavatars?\b|\bpalettes?\b|\bcharacter select\b|\bequipped\b|\bdress\b/i,
};
const CURRENCY = /\bcoins?\b|\bgems?\b|\bgold\b|\bcash\b|\bmoney\b|\bdiamonds?\b|\btokens?\b|\bbux\b|\bcredits?\b|\bbalance\b|\bwallet\b/i;
const BEST = /\b(best|high[_ -]?score|hi[_ -]?score|record|personal[_ -]?best|top[_ -]?score|highest|bestTime|best[_ -]?streak)\b|best|highscore|hiscore/i;
const SETTINGS = /^(arcade_|__)|sound|music|mute|volume|sfx|settings|quality|lang|tutorial|seen|hint|onboard|intro|version|^ver$|haptic|vibrat|sensitiv|controls?|cookie|consent|analytics|uuid|clientid|firstrun|first_run|firsttime|welcome|howto|orientation|reduced|debug|cheat/i;
const GENRE_EXPECT = {
  'board-sports': ['levels', 'unlocks', 'stars', 'cosmetics', 'achievements'],
  racing: ['levels', 'unlocks', 'stars', 'cosmetics', 'achievements'],
  'tower-defense': ['levels', 'stars', 'upgrades', 'unlocks', 'achievements'],
  puzzle: ['levels', 'stars', 'daily', 'goals', 'unlocks'],
  learning: ['levels', 'stars', 'achievements', 'daily', 'goals'],
  idle: ['upgrades', 'unlocks', 'achievements', 'daily', 'goals'],
  management: ['goals', 'upgrades', 'unlocks', 'stars', 'levels'],
  rhythm: ['levels', 'stars', 'unlocks', 'achievements'],
  'life-sim': ['goals', 'unlocks', 'cosmetics', 'achievements', 'daily'],
  arcade: ['levels', 'upgrades', 'unlocks', 'achievements', 'daily'],
  board: ['levels', 'stars', 'achievements', 'unlocks'],
  'hyper-casual': ['unlocks', 'cosmetics', 'daily', 'achievements', 'goals'],
};
export { GENRE_EXPECT };

// ---- storage snapshot: localStorage, IndexedDB (names, stores, counts, a few keys), cookies ----
const SNAPSHOT = async () => {
  const out = { ls: {}, idb: [], err: null };
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); out.ls[k] = String(localStorage.getItem(k)).slice(0, 400); } } catch (e) { out.err = 'localStorage: ' + e.message; }
  try {
    const dbs = indexedDB.databases ? await indexedDB.databases() : [];
    for (const d of dbs.slice(0, 8)) {
      const info = { name: d.name, version: d.version, stores: [] };
      try {
        const db = await new Promise((res, rej) => { const rq = indexedDB.open(d.name); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); rq.onblocked = () => rej(new Error('blocked')); setTimeout(() => rej(new Error('timeout')), 3000); });
        for (const sn of Array.from(db.objectStoreNames).slice(0, 6)) {
          const tx = db.transaction(sn, 'readonly'), st = tx.objectStore(sn);
          const count = await new Promise(r => { const q = st.count(); q.onsuccess = () => r(q.result); q.onerror = () => r(-1); });
          const keys = await new Promise(r => { const q = st.getAllKeys ? st.getAllKeys(undefined, 25) : null; if (!q) return r([]); q.onsuccess = () => r(q.result.map(String)); q.onerror = () => r([]); });
          info.stores.push({ name: sn, count, keys });
        }
        db.close();
      } catch (e) { info.err = String(e.message || e).slice(0, 60); }
      out.idb.push(info);
    }
  } catch (e) { out.idbErr = String(e.message || e).slice(0, 80); }
  return out;
};

const flat = (o, prefix = '', depth = 0, acc = []) => {   // field names of a JSON value, to classify a save blob
  if (o && typeof o === 'object' && depth < 4) for (const [k, v] of Object.entries(o).slice(0, 60)) { acc.push({ name: prefix + k, value: v }); flat(v, prefix + k + '.', depth + 1, acc); }
  return acc;
};
export function classifyKey(key, valueStr) {
  const cats = new Set(), names = [key];
  let json = null; try { json = JSON.parse(valueStr); } catch {}
  if (json && typeof json === 'object') for (const f of flat(json)) names.push(f.name);
  else if (typeof valueStr === 'string' && /^[\w-]+(,[\w-]+)+$/.test(valueStr)) names.push(valueStr.slice(0, 80));
  for (const n of names) {
    if (SETTINGS.test(n) && !/score|best|level|coin|star|unlock/i.test(n)) { cats.add('settings'); continue; }
    if (BEST.test(n)) cats.add('score');
    if (CURRENCY.test(n)) cats.add('currency');
    for (const s of SYSTEMS) if (RX[s].test(n)) cats.add(s);
    if (/score|points/i.test(n)) cats.add('score');
    if (/(level|lvl|stage|world|wave|day|chapter)/i.test(n)) cats.add('levels');
  }
  if (!cats.size) cats.add(json && typeof json === 'object' ? 'save-blob' : 'other');
  return [...cats];
}

export async function checkProgression(g, browser, o) {
  const { BASE, out, DURATION = 40, DURATION2 = 12 } = o;
  const std = STDMETA(g.id), gm = META.games[g.id] || g;
  const declaredSaves = std.saves || gm.saves || [];
  const r = { id: g.id, title: g.title || g.id, cat: g.cat, genre: g.genre, src: g.src, engine: ENGINE, notes: [], shots: {}, declaredSaves };
  const rand = rng('prog' + g.id);
  const ctx = await browser.newContext({ ...devices[o.landscape ? 'iPhone 13 landscape' : 'iPhone 13'], serviceWorkers: 'block' });
  await ctx.addInitScript(INJECT); await ctx.addInitScript(PROG_INJECT);
  await routeExternal(ctx);
  const shotDir = path.join(out, 'shots'); await fs.mkdir(shotDir, { recursive: true });
  const T = { texts: [], buttons: new Set() };
  const errors = [];
  let page = null, bot = null, S = [];
  const D = { S: [] };
  const drain = async () => { const d = await race(page.evaluate(() => window.__Hdrain && window.__Hdrain()).catch(() => null), 6000); if (d && d !== 'timeout') for (const it of d.q) if (it[0] === 'S') D.S.push(it.slice(1)); return d; };
  const hasPlay = () => D.S.some(x => x[1] && x[1].scene === 'play');
  let creating = false;
  ctx.on('page', p => { if (!creating && p !== page) p.close().catch(() => {}); });   // popups and new tabs
  const newPage = async () => {
    creating = true; page = await ctx.newPage(); creating = false; page.setDefaultTimeout(10000);
    page.on('pageerror', e => { const m = String(e.message || e); if (!/audio device/.test(m)) errors.push(m.slice(0, 160)); });
    page.on('dialog', d => (d.type() === 'confirm' ? d.dismiss() : d.accept()).catch(() => {}));
    D.S = [];
    bot = makeBot(page, ctx, { rand, hasPlay, keyboard: !!(g.controls && g.controls.keyboard) });
  };
  const load = async () => {
    try { await page.goto(urlFor(g, BASE), { waitUntil: 'load', timeout: heavy(g) ? 240000 : 60000 }); } catch (e) { return false; }
    const dl = Date.now() + (heavy(g) ? 180000 : 6000);
    while (Date.now() < dl) { const c = await race(page.evaluate(() => window.ArcadeSDK ? ArcadeSDK.debug().caps : null).catch(() => null), 6000); if (c && c.declared) break; await wait(1000); }
    return true;
  };
  const snap = async () => { const s = await race(page.evaluate(SNAPSHOT).catch(e => ({ err: String(e.message).slice(0, 80), ls: {}, idb: [] })), 15000); return s === 'timeout' ? { err: 'snapshot timeout', ls: {}, idb: [] } : s; };
  const grab = async (label) => { const c = await bot.probe(); if (c) { T.texts.push({ label, text: c.text }); c.items.filter(i => !i.sdk).forEach(i => i.txt && T.buttons.add(i.txt)); } return c; };
  const finish = async () => { await race(ctx.close().catch(() => {}), 15000); };

  // ---- session 1 ----
  await newPage();
  const ok = await load();
  if (!ok) { r.level = 0; r.label = 'P0'; r.notes.push('did not load'); await finish(); return r; }
  if (!o.landscape && await page.locator('#arcade-sdk-rotate').isVisible().catch(() => false)) { await finish(); return checkProgression(g, browser, { ...o, landscape: true }); }
  await drain();
  const snap0 = await snap();
  await grab('title-1');
  await race(page.screenshot({ type: 'jpeg', quality: 55, timeout: 12000, scale: 'css' }).then(b => fs.writeFile(path.join(shotDir, `${g.id}-1-title.jpg`), b)).catch(() => {}), 15000);
  const poll = setInterval(() => drain().catch(() => {}), 800);
  let st = { how: '' };
  try { st = await bot.startGame(g, s => D.S.some(x => x[1] && x[1].scene === s)); } catch (e) { r.notes.push('start: ' + e.message.slice(0, 60)); }
  const tEnd = Date.now() + DURATION * 1000; let nextGrab = Date.now() + 5000;
  while (Date.now() < tEnd) {
    await race(bot.step().catch(() => {}), 12000);
    if (Date.now() > nextGrab) { await grab('play-1'); nextGrab = Date.now() + 6000; }
    await wait(100 + rand() * 250);
    if (page.isClosed()) break;
  }
  clearInterval(poll); await drain();
  await race(page.screenshot({ type: 'jpeg', quality: 55, timeout: 12000, scale: 'css' }).then(b => fs.writeFile(path.join(shotDir, `${g.id}-2-end.jpg`), b)).catch(() => {}), 15000);
  const scenes1 = D.S.map(s => s[1] && s[1].scene).filter(Boolean);
  const gameScore1 = D.S.filter(s => s[1] && typeof s[1].score === 'number').map(s => s[1].score);
  const P1 = await race(page.evaluate(() => JSON.parse(JSON.stringify(window.__P || {}))).catch(() => null), 6000);
  const snap1 = await snap();
  const cookies1 = await ctx.cookies().catch(() => []);
  r.session1 = { start: st.how, reachedPlay: scenes1.includes('play'), scenes: scenes1.filter((x, i) => x !== scenes1[i - 1]).slice(0, 12), gameOvers: scenes1.filter(x => x === 'over').length, score: gameScore1.length ? { first: gameScore1[0], last: gameScore1[gameScore1.length - 1], max: Math.max(...gameScore1) } : null, botTaps: bot.stats.taps + bot.stats.swipes + bot.stats.holds, pageErrors: errors.length };
  await page.close().catch(() => {});

  // ---- session 2: the same profile, a fresh page ----
  await newPage();
  const ok2 = await load();
  let snap2 = snap1, P2 = null, title2 = '';
  if (ok2) {
    await drain(); const c2 = await grab('title-2'); title2 = c2 ? c2.text : '';
    P2 = await race(page.evaluate(() => JSON.parse(JSON.stringify(window.__P || {}))).catch(() => null), 6000);
    await race(page.screenshot({ type: 'jpeg', quality: 55, timeout: 12000, scale: 'css' }).then(b => fs.writeFile(path.join(shotDir, `${g.id}-3-session2-title.jpg`), b)).catch(() => {}), 15000);
    const poll2 = setInterval(() => drain().catch(() => {}), 800);
    try { await bot.startGame(g, s => D.S.some(x => x[1] && x[1].scene === s)); } catch {}
    const t2 = Date.now() + DURATION2 * 1000;
    while (Date.now() < t2) { await race(bot.step().catch(() => {}), 12000); await wait(100 + rand() * 250); if (page.isClosed()) break; }
    clearInterval(poll2); await grab('play-2');
    snap2 = await snap();
    r.session2 = { reachedPlay: hasPlay() };
  } else r.notes.push('session 2 did not load');
  await finish();

  // ---- what changed on disk ----
  const before = snap0.ls, after = snap1.ls;
  const added = Object.keys(after).filter(k => !(k in before)), changed = Object.keys(after).filter(k => k in before && before[k] !== after[k]), removed = Object.keys(before).filter(k => !(k in after));
  const rel = k => !/^arcade_/.test(k);
  const idbSummary = s => s.idb.map(d => d.name + ':' + d.stores.map(x => x.name + '=' + x.count).join(',')).join(' ');
  const idbChanged = idbSummary(snap1) !== idbSummary(snap0);
  const idbNames = snap1.idb.filter(d => d.stores.some(x => x.count > 0)).map(d => d.name + '(' + d.stores.map(x => x.name + ' ' + x.count).join(', ') + ')');
  const lsAll = Object.entries(after).filter(([k]) => rel(k));
  const keyCats = {};
  for (const [k, v] of lsAll) keyCats[k] = classifyKey(k, v);
  const catsChanged = new Set(); for (const k of [...added, ...changed].filter(rel)) for (const c of keyCats[k] || classifyKey(k, after[k])) catsChanged.add(c);
  const catsPresent = new Set(); for (const k of Object.keys(keyCats)) for (const c of keyCats[k]) catsPresent.add(c);
  // IndexedDB: file names of an engine's persistent filesystem (Godot) count as a save
  const idbKeys = snap1.idb.flatMap(d => d.stores.flatMap(x => x.keys.map(String)));
  const idbSaveish = idbKeys.filter(k => !/^\/(userfs|home)?\/?$/.test(k)).length;
  const idbCats = new Set(); for (const k of idbKeys) for (const c of classifyKey(k, '')) idbCats.add(c);
  r.storage = { localStorageKeys: Object.keys(after).filter(rel).length, added: added.filter(rel), changed: changed.filter(rel), removed: removed.filter(rel), sample: Object.fromEntries(lsAll.slice(0, 8).map(([k, v]) => [k, v.slice(0, 70)])), indexedDB: idbNames, indexedDBChanged: idbChanged, indexedDBKeys: idbKeys.slice(0, 8), cookies: cookies1.length, categoriesChanged: [...catsChanged], categoriesPresent: [...catsPresent], writesDuringPlay: P1 && P1.writes ? Object.fromEntries(Object.entries(P1.writes).filter(([k]) => rel(k)).slice(0, 10).map(([k, v]) => [k, v.n + 'x'])) : {} };
  // did session 2 read the saved state at boot, and does it show on the title?
  const savedKeys = [...added, ...changed].filter(rel), reads2 = P2 && P2.reads ? P2.reads : {};
  const readSaved = savedKeys.filter(k => reads2[k] && reads2[k].found);
  const num = t => (t.match(/\d+/g) || []).slice(0, 40).join(',');
  const t1 = (T.texts.find(t => t.label === 'title-1') || {}).text || '';
  const titleChanged = !!title2 && (t1 !== title2) && (num(t1) !== num(title2) || /best|level|coins?|streak|welcome back|continue|score/i.test(title2.replace(t1, '')));
  const kept = Object.keys(snap2.ls).filter(rel).filter(k => k in after && snap2.ls[k] !== after[k]);
  r.session2 = { ...(r.session2 || {}), readsSavedKeysAtBoot: readSaved.slice(0, 6), savedKeysWrittenInSession1: savedKeys.length, titleTextChanged: titleChanged, title1: t1.slice(0, 140), title2: title2.slice(0, 140), keysUpdatedAgain: kept.slice(0, 6), startsFromSaved: readSaved.length > 0 || (titleChanged && savedKeys.length > 0) };

  // ---- systems ----
  const domText = T.texts.map(t => t.text).join(' \n ') + ' \n ' + [...T.buttons].join(' \n ');
  const metaText = [...Object.values(std.features || gm.features || {}), ...(std.howto || gm.howto || []), ...(std.tips || gm.tips || []), gm.difficulty || '', ...Object.values(gm.settings || {})].join(' \n ');
  const storageBlob = Object.entries(after).filter(([k]) => rel(k)).map(([k, v]) => k + ' ' + v).join(' \n ') + ' ' + idbKeys.join(' ');
  const sys = {};
  for (const s of SYSTEMS) {
    const storage = SYSTEMS.includes(s) && ((catsPresent.has(s)) || (idbCats.has(s))), dom = RX[s].test(domText), meta = RX[s].test(metaText);
    sys[s] = { storage, dom, meta };
  }
  const currency = { storage: catsPresent.has('currency') || idbCats.has('currency'), dom: CURRENCY.test(domText), meta: CURRENCY.test(metaText) };
  r.systems = sys; r.currency = currency;
  const observed = s => sys[s].storage || sys[s].dom;
  const obs = SYSTEMS.filter(observed), claimedOnly = SYSTEMS.filter(s => !observed(s) && sys[s].meta);
  r.observedSystems = obs; r.claimedOnly = claimedOnly;
  const progressCats = ['levels', 'stars', 'currency', 'unlocks', 'upgrades', 'goals', 'achievements', 'daily', 'cosmetics', 'save-blob'];
  const persistedProgress = progressCats.filter(c => catsChanged.has(c) || (idbCats.has(c) && c !== 'save-blob'));
  const persistsScore = catsChanged.has('score') || savedKeys.some(k => BEST.test(k));
  const persistsAnything = savedKeys.length > 0 || idbSaveish > 0 && idbChanged || cookies1.length > 0;
  r.persists = { anything: persistsAnything, bestScore: persistsScore, progress: persistedProgress, unclassifiedBlob: catsChanged.has('save-blob') || catsChanged.has('other') };
  const sinks = obs.filter(s => SINKS.includes(s)), sources = obs.filter(s => SOURCES.includes(s)).concat(currency.storage || currency.dom ? ['currency'] : []);
  const feeds = (sinks.length >= 1 && sources.length >= 2 && obs.length >= 3) && persistedProgress.length >= 2;
  let level;
  if (!persistsAnything || (catsChanged.size && [...catsChanged].every(c => c === 'settings'))) level = 0;
  else if (!persistedProgress.length || (persistedProgress.length === 1 && persistedProgress[0] === 'save-blob' && obs.length === 0)) level = 1;
  else if (feeds) level = 3;
  else level = obs.length >= 1 ? 2 : 1;
  if (!r.session1.reachedPlay) { r.notes.push('the bot never reached play: what persists after real play was not measured'); r.lowConfidence = true; }
  r.level = level; r.label = 'P' + level;
  const why = { 0: 'nothing that counts as progress was saved (' + (persistsAnything ? 'settings only' : 'no localStorage, IndexedDB or cookie change') + ')', 1: 'saves ' + (persistsScore ? 'a best score' : 'some state') + (persistedProgress.length ? ' and ' + persistedProgress.join(', ') : '') + ' but shows no unlock, upgrade, goal or level system', 2: 'progress persists (' + persistedProgress.join(', ') + ') with ' + obs.join(', '), 3: 'progress persists (' + persistedProgress.join(', ') + '); systems seen: ' + obs.join(', ') + '; sinks ' + sinks.join('/') + ' fed by ' + sources.join('/') };
  r.why = why[level];
  const genre = g.genre || (gm && gm.genre) || 'arcade';
  r.expected = GENRE_EXPECT[genre] || GENRE_EXPECT.arcade;
  r.lacks = r.expected.filter(s => !observed(s));
  r.pageErrors = errors.slice(0, 3);
  return r;
}

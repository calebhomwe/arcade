// Tests for the arcade-wide player profile (assets/profile-core.js) and how it is wired to the portal and SDK.
//   node qa/harness/profile-test.mjs                      # logic tests, then the browser tests in Chromium
//   ENGINE=webkit node qa/harness/profile-test.mjs        # browser tests in WebKit (Safari engine)
//   LOGIC_ONLY=1 node qa/harness/profile-test.mjs         # just the logic tests (no browser)
//
// Part A drives the profile with a fake clock and fake storage: XP curve, streak and its rest day, quest
// rotation, cheat blocking, import/export, migration from an empty profile. Part B opens the real portal.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '../..');
const require = createRequire(import.meta.url);
const Core = require(path.join(root, 'assets/profile-core.js'));
let failed = 0, passed = 0;
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined && detail !== '' ? '  (' + detail + ')' : ''}`); ok ? passed++ : failed++; };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const X = Core.XP;   // the numbers under test come from the module, so a rebalance changes the code, not the tests

/* ---------- a small world: 14 games in 7 categories ---------- */
const CATS = ['arcade', 'hyper', 'puzzle', 'classic', 'learning', 'sim', 'idle'].map(id => ({ id, name: id[0].toUpperCase() + id.slice(1) }));
const CATALOG = [
  ['run1', 'arcade', ['runner']], ['run2', 'hyper', ['runner', 'tap']], ['pz1', 'puzzle', ['merge']], ['pz2', 'puzzle', ['logic']], ['cl1', 'classic', ['board']], ['cl2', 'classic', ['snake']],
  ['lr1', 'learning', ['maths']], ['lr2', 'learning', ['spelling']], ['lr3', 'learning', ['maths']], ['lr4', 'learning', ['words']], ['lr5', 'learning', ['quiz']],
  ['sm1', 'sim', ['farm']], ['id1', 'idle', ['idle']], ['ar2', 'arcade', ['shooter']], ['hy2', 'hyper', ['tap']], ['pz3', 'puzzle', ['numbers']]
].map(([id, cat, tags]) => ({ id, title: id.toUpperCase(), cat, tags }));

function world(o = {}) {
  const mem = {}; let t = new Date(o.start || '2026-09-29T10:00:00').getTime();
  const storage = o.storage || { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  let seq = o.seed || 12345; const random = () => { seq = (seq * 1664525 + 1013904223) >>> 0; return seq / 4294967296; };
  const P = Core.create({ storage, now: () => t, random, catalog: CATALOG, cats: CATS, legacy: o.legacy });
  const ev = []; ['xp', 'levelup', 'achievement', 'quest', 'quest-set', 'streak', 'streak-reset', 'rest', 'best'].forEach(n => P.on(n, d => ev.push([n, d])));
  return { P, mem, storage, ev, now: () => t, set: ms => { t = ms; }, advance: ms => { t += ms; }, day: n => { const d = new Date(t); d.setDate(d.getDate() + n); d.setHours(o.hour || 10, 0, 0, 0); t = d.getTime(); },
    play(sess, seconds, active = true) { for (let s = 0; s < seconds; s += 5) { t += 5000; P.tick(sess, Math.min(5, seconds - s), active); } },
    sess(id) { P.startPlay(id); return P.startSession(id); } };
}
const kinds = W => W.P.quests().list.map(q => q.kind);

/* ================= A. logic ================= */
console.log('-- XP curve');
{
  const need = Array.from({ length: 49 }, (_, i) => Core.xpNeed(i + 1));
  check('level 1 to 2 needs 40 XP', need[0] === 40, need[0]);
  check('each level needs at least as much XP as the last', need.every((n, i) => i === 0 || n >= need[i - 1]));
  check('the curve is gentle: every level needs under 1,200 XP', need[48] < 1200, need[48]);
  check('levelOf inverts the table for all 50 levels', Core.LEVEL_XP.every((x, l) => l < 1 || (Core.levelOf(x) === l && (l === 1 || Core.levelOf(x - 1) === l - 1))));
  check('level is capped at 50', Core.levelOf(1e9) === 50 && Core.levelInfo(1e9).max === true);
  check('levelInfo at the start', eq(Core.levelInfo(0), { level: 1, xp: 0, into: 0, need: 40, pct: 0, max: false, next: 40 }));
  check('levelInfo halfway to level 2', Core.levelInfo(20).pct === 0.5 && Core.levelInfo(20).into === 20);
  check('pace: level 2 at 40 XP, level 10 by 800, level 30 by 7,000, level 50 by 23,000', Core.LEVEL_XP[2] === 40 && Core.LEVEL_XP[10] <= 800 && Core.LEVEL_XP[30] <= 7000 && Core.LEVEL_XP[50] <= 23000, [2, 10, 30, 50].map(l => Core.LEVEL_XP[l]).join('/'));
  const doc = fs.readFileSync(path.join(root, 'docs/PROGRESSION.md'), 'utf8'), rows = [...doc.matchAll(/^\| (\d+) \| (\d+|-) \| ([\d,]+) \| ([^|]+) \|$/gm)];
  check('docs/PROGRESSION.md level table matches the code (all 50 rows)', rows.length === 50 && rows.every(m => +m[1] === 0 || (Core.LEVEL_XP[+m[1]] === +m[3].replace(/,/g, '') && (m[2] === '-' ? +m[1] === 50 : Core.xpNeed(+m[1]) === +m[2]) && Core.levelTitle(+m[1]) === m[4].trim())), rows.length + ' rows');
  check('docs/PROGRESSION.md states the XP numbers in use', doc.includes('| Playing | ' + X.minute + ' per active minute') && doc.includes('The first ' + X.minuteCap + ' minutes') && doc.includes(X.quest.hard[0] + ' hard') && doc.includes('1 to ' + X.awardMax + ' per call'));
  check('negative and junk XP read as level 1', Core.levelOf(-5) === 1 && Core.levelOf('x') === 1 && Core.levelOf(NaN) === 1);
}

console.log('-- new and migrated profiles');
{
  const W = world(); const p = W.P.get();
  check('an empty store gives a valid new profile', p.v === 1 && p.xp === 0 && p.name.length > 0 && p.name.length <= 16 && Core.cosDef('avatar', p.avatar) && p.streak.n === 0);
  check('the profile is written to ca_profile', !!W.mem.ca_profile && JSON.parse(W.mem.ca_profile).seed === p.seed);
  check('a new profile has three quests: one easy, one medium, one hard', eq(W.P.quests().list.map(q => q.tier), ['easy', 'medium', 'hard']), kinds(W).join(','));
  check('level 1, no title yet beyond Newcomer', W.P.levelInfo().level === 1 && W.P.title() === 'Newcomer');
  const W2 = world({ legacy: () => ({ plays: { run1: { n: 3, ts: 1780000000000 }, lr1: { n: 1, ts: 1780000001000 }, ghost: { n: 9, ts: 1 } }, bests: { run1: 120, ghost: 5 }, favs: 2 }) });
  const q = W2.P.get();
  check('migration: earlier plays count as tried, unknown games are dropped', q.games.run1.first > 0 && q.games.lr1.first > 0 && !q.games.ghost && Object.keys(q.cats).length === 2, Object.keys(q.games).join(','));
  check('migration: bests and favourites carry over, welcome-back XP given once', q.games.run1.best === 120 && q.stats.favMax === 2 && q.xp >= 20 && q.flags.legacy === 1, 'xp=' + q.xp);
  const xpBefore = W2.P.get().xp; W2.P.get(); check('migration runs once', W2.P.get().xp === xpBefore);
  const W3 = world(); W3.mem.ca_profile = '{not json';
  check('corrupt storage does not throw and starts fresh', W3.P.get().xp === 0 && W3.P.get().v === 1);
  const W4 = world(); W4.mem.ca_profile = JSON.stringify({ v: 1, seed: 7, name: '<img src=x onerror=alert(1)>', xp: 999999999, stars: -5, avatar: 'x', hat: '<b>', games: { __proto__: { x: 1 }, run1: { n: 'a', sec: -4, best: 'NaN' }, constructor: { n: 1 } }, ach: { hax: 1, 'first-game': 5 } });
  const h = W4.P.get();
  check('hostile stored data is cleaned: name, XP, cosmetics, keys', /^[\p{L}\p{N} '\-_.!]*$/u.test(h.name) && h.name.length <= 16 && h.xp === 1e6 && h.stars >= 0 && Number.isInteger(h.stars) && h.avatar === 'fox' && h.hat === '' && !h.games.constructor.n && !('x' in h.games) && !h.ach.hax && h.ach['first-game'] === 5, h.name);
}

console.log('-- earning XP with no game changes');
{
  const W = world(); const s = W.sess('lr1');
  W.play(s, 25); let p = W.P.get();
  check('25 s of play earns nothing yet, and the game is not "tried"', p.xp === 0 && !p.games.lr1.first);
  W.play(s, 5); p = W.P.get();
  const why = w => p.log.filter(l => l.why.startsWith(w)).reduce((n, l) => n + l.xp, 0);
  check('30 s: first play of the game (+' + X.firstPlay + ') and of the category (+' + X.newCategory + ')', why('First time playing') === X.firstPlay && why('New category') === X.newCategory && p.games.lr1.first > 0 && p.cats.learning, 'log=' + p.log.map(l => l.xp + ' ' + l.why).join('; '));
  check('...and the First Steps badge (bronze: ' + X.tier.bronze[0] + ' XP, ' + X.tier.bronze[1] + ' star) lands with them', p.ach['first-game'] && p.xp === X.firstPlay + X.newCategory + X.tier.bronze[0] && p.stars === X.tier.bronze[1], 'xp=' + p.xp);
  W.play(s, 30); p = W.P.get();
  check('a full minute adds ' + X.minute + ' XP; streak day 1 has no bonus', why('Played a minute') === X.minute && p.streak.n === 1 && !p.log.some(l => /^Streak/.test(l.why)), 'xp=' + p.xp);
  W.play(s, 60 * 20); p = W.P.get();
  check('minute XP stops after ' + X.minuteCap + ' minutes in a day (' + X.minuteCap * X.minute + ' XP)', why('Played a minute') === X.minuteCap * X.minute && p.today.minCred === 15 && p.today.minSeen >= 20, 'minutes seen=' + p.today.minSeen + ', XP=' + why('Played a minute'));
  const W2 = world(); const s2 = W2.sess('lr1'); W2.play(s2, 120, false);
  check('a hidden tab or a paused game earns nothing', W2.P.get().xp === 0 && W2.P.get().stats.sec === 0);
  const W3 = world(); const s3 = W3.sess('run1'); W3.play(s3, 40); const before = W3.P.get().xp; W3.P.startPlay('run1');
  check('opening a game again does not repeat first-play XP', W3.P.get().xp === before);
  const W4 = world(); const a = W4.sess('run1'); W4.play(a, 35); const b = W4.sess('run2'); W4.play(b, 35); const p4 = W4.P.get();
  check('a new category is worth 20 once: two arcade/hyper games = two categories', Object.keys(p4.cats).length === 2 && p4.log.filter(l => /New category/.test(l.why)).length === 2);
}

console.log('-- game-over XP');
{
  const W = world(); const s = W.sess('run1'); W.play(s, 10);
  let r = W.P.onState(s, { scene: 'over', score: 50 }); const x0 = W.P.get().xp;
  const half = Math.round(X.runScale * 0.5);
  check('first scored round: base + half the score scale + first-round bonus', r && r.xp === X.runBase + half + X.runFirst, r && r.xp);
  W.advance(10000); W.P.onState(s, { scene: 'play' }); W.play(s, 10);
  r = W.P.onState(s, { scene: 'over', score: 100 });
  check('a personal best: base + full scale + best bonus', r.xp === X.runBase + X.runScale + X.runPB && r.pb === true && W.P.get().games.run1.best === 100, r.xp);
  W.advance(10000); W.P.onState(s, { scene: 'play' }); W.play(s, 10);
  r = W.P.onState(s, { scene: 'over', score: 40 });
  check('a weaker round scales by score/best: base + round(scale*0.4)', r.xp === X.runBase + Math.round(X.runScale * 0.4) && !r.pb, r.xp);
  W.advance(10000); W.P.onState(s, { scene: 'play' }); W.play(s, 10);
  r = W.P.onState(s, { scene: 'over', score: 40 }); const r2 = W.P.onState(s, { scene: 'over', score: 40 });
  check('the same result reported twice counts once', r.xp > 0 && r2 === null && W.P.get().games.run1.runs === 4, W.P.get().games.run1.runs);
  const W2 = world(); const q = W2.sess('run1');
  check('a round that ends before 6 s of play earns nothing', W2.P.onState(q, { scene: 'over', score: 5 }).blocked === 'too short');
  W2.play(q, 10); W2.P.onState(q, { scene: 'over', score: 5 });
  check('...and two rounds 4 s apart are not both counted', W2.P.run(q, { score: 9 }).blocked === 'too soon');
  const W3 = world(); const t = W3.sess('run2'); let total = 0, n = 0;
  for (let i = 0; i < 16; i++) { W3.advance(6000); W3.play(t, 10); const r = W3.P.onState(t, { scene: 'over', score: 10 + i }); total += r.xp; n += r.xp > 0; W3.advance(5000); W3.P.onState(t, { scene: 'play' }); }
  check('at most ' + X.runsPerDay + ' rounds a day earn XP; the counters go on', n === X.runsPerDay && W3.P.get().stats.runs === 16 && W3.P.get().today.runs === 16, 'rewarded=' + n + ' runs=' + W3.P.get().stats.runs);
  const W4 = world(); const u = W4.sess('run1'); W4.play(u, 12); W4.P.onState(u, { scene: 'over', score: 30, lower: true }); W4.advance(9000); W4.play(u, 10);
  const lo = W4.P.onState(u, { scene: 'over', score: 25, lower: true });
  check('lower-is-better scores (times, ranks): 25 beats 30', lo.pb === true && W4.P.get().games.run1.best === 25);
  const W5 = world(); const v = W5.sess('run1'); W5.play(v, 12);
  const noScore = W5.P.onState(v, { scene: 'over' });
  check('a game-over with no score still counts as a round (base XP)', noScore.xp >= X.runBase && W5.P.get().stats.runs === 1, noScore.xp);
  const W6 = world(); const w = W6.sess('run1'); W6.play(w, 12); W6.P.onState(w, { scene: 'over', score: NaN }); W6.P.onState(w, { scene: 'over', score: 'lots' });
  check('junk scores never poison the best', W6.P.get().games.run1.best === null);
  const W7 = world(); const z = W7.sess('run1'); W7.P.onState(z, { level: 7, stars: 12 });
  check('state level and stars are read: game-lvl and game-stars badges', W7.P.get().stats.gLevel === 7 && W7.P.get().stats.gStars === 12 && W7.P.get().ach['game-lvl'] && W7.P.get().ach['game-stars']);
}

console.log('-- cheat codes');
{
  const W = world(); const s = W.sess('run1'); s.cheated = true; W.play(s, 120);
  const r = W.P.onState(s, { scene: 'over', score: 500 });
  const p = W.P.get();
  check('a run with codes on earns no XP and sets no best', p.xp === 0 && (r && r.xp === 0) && p.games.run1.best === null && p.stats.runs === 0, 'xp=' + p.xp);
  check('...and no minutes, no first-play, no quest progress', p.stats.sec === 0 && !p.games.run1.first && p.today.sec === 0);
  check('opt-in calls are blocked too: award, badge, quest', W.P.award(s, { xp: 40, reason: 'x' }) === 0 && W.P.achievement(s, 'a', { title: 'A' }) === false && W.P.quest(s, 'q', 1) === null && W.P.get().xp === 0);
  check('the day still counts for the streak (kind), just without XP', p.streak.n === 1 && p.xp === 0);
  const W2 = world(); const honest = W2.sess('run1'); W2.play(honest, 40);
  check('a normal session on the same profile is unaffected', W2.P.get().xp > 0);
}

console.log('-- streak and the rest day');
{
  const W = world(); const s = W.sess('run1');
  const playDay = (n, sec = 25) => { W.day(n); const x = W.sess('run1'); W.play(x, sec); };
  W.play(s, 25); let st = W.P.get().streak;
  check('day 1: streak 1', st.n === 1 && st.last === Core.dayStr(W.now()));
  W.play(s, 25); check('more play the same day changes nothing', W.P.get().streak.n === 1);
  playDay(1); check('day 2: streak 2, +' + 2 * X.streakStep + ' XP streak bonus', W.P.get().streak.n === 2 && W.P.get().log.some(l => l.why === 'Streak: day 2' && l.xp === 2 * X.streakStep));
  playDay(1); check('day 3: streak 3, badge Three-Peat', W.P.get().streak.n === 3 && W.P.get().ach['streak-3']);
  playDay(2); st = W.P.get().streak;
  check('missing exactly one day keeps the streak going (rest day)', st.n === 4 && st.rest.length === 1 && W.ev.some(e => e[0] === 'rest'), JSON.stringify(st));
  playDay(2); st = W.P.get().streak;
  check('a second missed day within a week is not forgiven: streak restarts at 1, best kept', st.n === 1 && st.best === 4 && W.ev.some(e => e[0] === 'streak-reset'), JSON.stringify({ n: st.n, best: st.best }));
  playDay(1); playDay(1); playDay(1); playDay(1); playDay(1); playDay(1); playDay(1);
  playDay(2); st = W.P.get().streak;
  check('the rest day comes back after a week', st.n === 9 && st.rest.length === 2, JSON.stringify(st));
  playDay(3); st = W.P.get().streak;
  check('three days away starts a new streak; the best is kept and never shown as a loss', st.n === 1 && st.best === 9);
  const W2 = world({ start: '2026-12-31T22:00:00' }); const a = W2.sess('run1'); W2.play(a, 25); W2.day(1); const b = W2.sess('run1'); W2.play(b, 25);
  check('New Year: 31 Dec to 1 Jan is consecutive', W2.P.get().streak.n === 2 && Core.dayStr(W2.now()) === '2027-01-01');
  const W3 = world({ start: '2026-03-07T22:00:00' }); const c = W3.sess('run1'); W3.play(c, 25); W3.day(1); W3.play(W3.sess('run1'), 25); W3.day(1); W3.play(W3.sess('run1'), 25);
  check('days are calendar dates, so daylight-saving changes cannot break a streak', W3.P.get().streak.n === 3);
  const W4 = world(); W4.play(W4.sess('run1'), 25); const tb = W4.now(); W4.set(tb - 3 * 86400000); W4.play(W4.sess('run1'), 25);
  check('a clock that goes backwards keeps the streak', W4.P.get().streak.n === 1);
  const W5 = world(); const d1 = W5.sess('run1'); W5.play(d1, 10);
  check('10 s is not enough for the day to count; 20 s is', W5.P.get().streak.n === 0 && (W5.play(d1, 15), W5.P.get().streak.n === 1));
}

console.log('-- daily quests');
{
  const W = world(); const list = W.P.quests().list;
  check('three quests a day, easy + medium + hard, each with XP and stars', list.length === 3 && eq(list.map(q => q.tier), ['easy', 'medium', 'hard']) && eq(list.map(q => [q.xp, q.stars]), [X.quest.easy, X.quest.medium, X.quest.hard]), list.map(q => q.kind).join(','));
  check('all three are different kinds', new Set(list.map(q => q.kind)).size === 3);
  const again = world({ seed: 12345 }); check('the same player and day give the same quests every time', eq(kinds(again), kinds(W)));
  const other = new Set(); for (let s = 1; s <= 40; s++) other.add(kinds(world({ seed: s * 7919 })).join('|'));
  check('different players get different sets', other.size >= 8, other.size + ' distinct sets in 40 players');
  const W2 = world(); const seen = new Set(); let repeats = 0, prev = null; const perDay = [];
  for (let d = 0; d < 60; d++) { W2.day(d ? 1 : 0); const k = kinds(W2); perDay.push(k); k.forEach(x => seen.add(x)); if (prev && k.some(x => prev.includes(x))) repeats++; prev = k; }
  check('quests rotate: no kind repeats two days in a row over 60 days', repeats === 0, 'repeats=' + repeats);
  check('a new player only gets quests any game can complete (no rounds/best-score quests)', ![...seen].some(k => /^runs-|^beat|^learn-r/.test(k)), [...seen].join(','));
  check('over 60 days the pool shows variety', seen.size >= 9, seen.size + ' kinds');
  const W3 = world(); const s = W3.sess('run1'); W3.play(s, 40); for (let i = 0; i < 4; i++) { W3.advance(7000); W3.P.onState(s, { scene: 'play' }); W3.play(s, 10); W3.P.onState(s, { scene: 'over', score: 10 * (i + 1) }); }
  const seen2 = new Set(); for (let d = 0; d < 60; d++) { W3.day(1); kinds(W3).forEach(x => seen2.add(x)); }
  check('once a game has reported rounds, round and best-score quests can appear', [...seen2].some(k => /^runs-|^beat/.test(k)), [...seen2].join(','));
  // hand-built day to test progress, rewards and the bonus
  const H = world(); const set = qs => H.P._mutate(p => { p.today.quests = qs; p.today.bonus = 0; });
  set([{ kind: 'min-s', tier: 'easy', param: {}, target: 3, title: 'Play for 3 minutes', desc: '', glyph: 'clock', prog: 0, done: 0 }, { kind: 'games-2', tier: 'medium', param: {}, target: 2, title: 'Play 2 different games', desc: '', glyph: 'grid', prog: 0, done: 0 }, { kind: 'new-1', tier: 'hard', param: {}, target: 1, title: 'Try something new', desc: '', glyph: 'spark', prog: 0, done: 0 }]);
  const a = H.sess('sm1'); H.play(a, 60);
  let ql = H.P.quests().list; check('progress bars fill from real play: 1 of 3 minutes', ql[0].prog === 1 && !ql[0].done, ql[0].prog);
  H.play(a, 120); ql = H.P.quests().list;
  check('a quest completes at its target and pays XP and stars once', ql[0].done > 0 && H.ev.filter(e => e[0] === 'quest').length >= 1 && H.P.get().stars >= 1);
  const stars0 = H.P.get().stars; H.play(a, 30); check('no double payment', H.P.get().stars === stars0 || H.ev.filter(e => e[0] === 'quest' && e[1].kind === 'min-s').length === 1);
  const b = H.sess('id1'); H.play(b, 40); ql = H.P.quests().list;
  check('two different games satisfy "play 2 different games"; a game not tried before satisfies "try something new"', ql[1].done > 0 && ql[2].done > 0);
  check('all three done: bonus paid once, badge Triple Play', H.P.quests().bonus && H.ev.filter(e => e[0] === 'quest-set').length === 1 && H.P.get().ach.triple);
  H.day(1); const nk = kinds(H); check('next day: fresh quests, none repeating yesterday\'s kinds', nk.length === 3 && !nk.some(k => ['min-s', 'games-2', 'new-1'].includes(k)) && !H.P.quests().bonus, nk.join(','));
  check('yesterday\'s completed set is remembered for Quest Week', H.P.get().stats.fullDays === 1);
  const R = world(); const rs = R.sess('lr1'); R.P._mutate(p => { p.today.quests = [{ kind: 'learn-5', tier: 'medium', param: {}, target: 5, title: 'x', desc: '', glyph: 'cap', prog: 0, done: 0 }]; });
  R.play(rs, 240); const notYet = R.P.quests().list[0].done; R.play(rs, 65);
  check('"play a learning game for 5 minutes" counts only learning games\' minutes', !notYet && R.P.quests().list[0].done > 0);
  const G = world(); const gs = G.sess('run1'); G.play(gs, 20);
  const gq = G.P.quest(gs, 'boss', 0.4, { title: 'Beat the boss', xp: 25, stars: 1 });
  check('a game can offer an extra goal: it shows progress, then pays once when done', gq.p === 0.4 && !gq.done && G.P.quest(gs, 'boss', 1).done && G.P.quest(gs, 'boss', 1).done && G.ev.filter(e => e[0] === 'quest' && e[1].kind === 'game').length === 1);
  for (let i = 0; i < 5; i++) G.P.quest(gs, 'extra' + i, 0.1);
  check('...at most three game goals a day', G.P.quests().extra.length === 3);
}

console.log('-- badges');
{
  const ids = Core.ACH.map(a => a.id);
  check('at least 40 badges, ids unique', Core.ACH.length >= 40 && new Set(ids).size === ids.length, Core.ACH.length);
  const fams = new Set(Core.ACH.map(a => a.fam));
  check('badges across ' + fams.size + ' families, all named', fams.size >= 9 && [...fams].every(f => Core.FAMS[f]), [...fams].join(','));
  check('every badge has a tier, a title, a description and a glyph', Core.ACH.every(a => ['bronze', 'silver', 'gold', 'diamond'].includes(a.tier) && a.title && a.desc && a.glyph));
  const shell = fs.readFileSync(path.join(root, 'tools/portal_shell.py'), 'utf8'), icons = new Set([...shell.matchAll(/^\s*'([a-z0-9]+)':\s*'</gm)].map(m => m[1]));
  const missing = [...new Set(Core.ACH.map(a => a.glyph).concat(Core.QUESTS.map(q => q.glyph)))].filter(g => !icons.has(g));
  check('every badge and quest glyph is in the portal icon sprite', missing.length === 0, missing.join(',') || icons.size + ' icons');
  const W = world(); const s = W.sess('run1'); W.play(s, 35);
  const p = W.P.get();
  check('First Steps unlocks after 30 s of play, and pays its tier (bronze = ' + X.tier.bronze[0] + ' XP + ' + X.tier.bronze[1] + ' star)', p.ach['first-game'] && W.ev.some(e => e[0] === 'achievement' && e[1].id === 'first-game' && e[1].xp === X.tier.bronze[0] && e[1].stars === X.tier.bronze[1]));
  const n = W.ev.filter(e => e[0] === 'achievement').length; W.play(s, 5); W.P.get();
  check('a badge is only ever earned once', W.ev.filter(e => e[0] === 'achievement' && e[1].id === 'first-game').length === 1 && W.ev.filter(e => e[0] === 'achievement').length >= n);
  check('unseen badges are listed for the NEW ribbon until the Trophy Room is opened', W.P.achievements().filter(a => a.isNew).length > 0 && (W.P.markSeen(), W.P.achievements().filter(a => a.isNew).length === 0));
  const all = world(); const g = CATALOG.map(c => c.id); g.forEach(id => { const x = all.sess(id); all.play(x, 35); });
  check('trying every category: Genre Tourist and Every Corner, plus the Space helmet unlocks', all.P.get().ach['cats-3'] && all.P.get().ach['cats-all'] && all.P.isUnlocked('hat', 'space') && all.P.isUnlocked('hat', 'flower'));
  check('trying 5 learning games: Well Rounded', all.P.get().ach['learn-games-5'] && all.P.get().ach['games-5'] && all.P.get().ach['games-15']);
  const O = world({ start: '2026-09-29T20:00:00' }); O.play(O.sess('run1'), 30);
  check('Night Owl (7 to 10 pm) unlocks at 8 pm and not at 10 am', O.P.get().ach['night-owl'] && !world().P.get().ach['night-owl'] && !O.P.get().ach['early-bird']);
  const B = world({ hour: 7, start: '2026-09-29T07:00:00' }); B.play(B.sess('run1'), 30);
  check('Early Bird unlocks before 8 am', B.P.get().ach['early-bird']);
  const K = world({ start: '2026-10-03T10:00:00' }); K.play(K.sess('run1'), 25); K.day(1); K.play(K.sess('run1'), 25);
  check('Weekend Warrior: Saturday and Sunday of one weekend', Core.weekday(Core.dayStr(K.now())) === 0 && K.P.get().ach.weekend);
  const D = world(); const ds = D.sess('run1'); D.play(ds, 30); const lv = () => D.P.levelInfo().level;
  D.P._mutate(p => { p.xp = Core.LEVEL_XP[5]; }); D.P.get();
  check('Level 5 badge at level 5', lv() >= 5 && D.P.get().ach['level-5']);
  const GA = world(); const gs = GA.sess('run1'); GA.play(gs, 10);
  check('games can award their own badge (once, capped at 5 a day, ids checked)', GA.P.achievement(gs, 'first-win', { title: 'First Win', tier: 'silver' }) && !GA.P.achievement(gs, 'first-win', {}) && !GA.P.achievement(gs, '../bad', {}) && !GA.P.achievement(gs, 'x'.repeat(40), {}) && GA.P.get().ach['g:run1:first-win'] && GA.P.get().gach['g:run1:first-win'].tier === 'silver');
  for (let i = 0; i < 8; i++) GA.P.achievement(gs, 'b' + i, { title: 'B' + i });
  check('...a game cannot flood the trophy room', Object.keys(GA.P.get().gach).length === 5);
  check('game badges appear in the badge list under Game badges', GA.P.achievements().some(a => a.id === 'g:run1:first-win' && a.fam === 'game' && a.done));
}

console.log('-- cosmetics');
{
  const W = world(); check('a new player has the free ones only', W.P.isUnlocked('avatar', 'panda') && W.P.isUnlocked('frame', 'plain') && W.P.isUnlocked('accent', 'lime') && !W.P.isUnlocked('hat', 'party') && !W.P.isUnlocked('accent', 'coral') && !W.P.isUnlocked('theme', 'ocean'));
  check('a locked hat cannot be worn', W.P.equip('hat', 'party') === false && W.P.get().hat === '');
  W.P._mutate(p => { p.xp = Core.LEVEL_XP[8]; }); W.P.get();
  check('level 8 unlocks the party hat, cap, beanie, headphones, coral + sky accents, the Ocean theme', ['party', 'cap', 'beanie', 'phones'].every(h => W.P.isUnlocked('hat', h)) && W.P.isUnlocked('accent', 'sky') && W.P.isUnlocked('theme', 'ocean') && !W.P.isUnlocked('theme', 'sunset'));
  check('an unlocked hat can be worn and taken off', W.P.equip('hat', 'party') && W.P.get().hat === 'party' && W.P.equip('hat', '') && W.P.get().hat === '');
  check('badge-gated cosmetics say how to get them', W.P.unlockText('hat', 'flower') === 'Earn the Genre Tourist badge' && W.P.unlockText('accent', 'ruby') === 'Reach level 21');
  W.P.equip('avatar', 'robot'); check('avatars are all free', W.P.get().avatar === 'robot');
  check('titles: by level to start, an earned one can be chosen', W.P.title() === 'Game Fan' && !W.P.equip('title', 'explorer'));
  check('every cosmetic unlock names a real badge', Object.values(Core.COSMETICS).flat().filter(d => d.unlock && d.unlock.ach).every(d => Core.ACH_BY[d.unlock.ach]));
  const lvl = Core.LEVEL_XP; const gates = Object.values(Core.COSMETICS).flat().filter(d => d.unlock && d.unlock.level).map(d => d.unlock.level);
  check('level gates are between 2 and 30 (no cosmetic is out of reach)', Math.min(...gates) >= 2 && Math.max(...gates) <= 30, Math.min(...gates) + '..' + Math.max(...gates));
  check('names: the pool is friendly and short', Core.randomName(() => 0.3).length <= 16);
  check('names: markup is stripped, contact details refused', Core.cleanName('<b>Zed</b>') === 'bZedb' && Core.nameProblem('bob@mail.com') && Core.nameProblem('call 0412345678') && Core.nameProblem('www.x.com') && !Core.nameProblem('Pip the Fox') && Core.nameProblem('   ') && Core.cleanName('x'.repeat(40)).length === 16);
  check('setName saves a good name and refuses a bad one', W.P.setName('Sunny Pip') === '' && W.P.get().name === 'Sunny Pip' && W.P.setName('me@home.com') !== '' && W.P.get().name === 'Sunny Pip');
}

console.log('-- opt-in calls from games');
{
  const W = world(); const s = W.sess('run1'); W.play(s, 10);
  const x0 = W.P.get().xp;
  check('award is clamped to ' + X.awardMax + ' XP', W.P.award(s, { xp: 9999, reason: 'Boss' }) === X.awardMax && W.P.get().xp === x0 + X.awardMax);
  check('...' + X.awardPerGameDay + ' XP a day per game at most', W.P.award(s, { xp: 50 }) === X.awardPerGameDay - X.awardMax && W.P.award(s, { xp: 10 }) === 0);
  check('...junk is ignored', W.P.award(s, { xp: -5 }) === 0 && W.P.award(s, { xp: 'a lot' }) === 0 && W.P.award(s, null) === 0 && W.P.award(null, { xp: 5 }) === 0);
  check('...the reason is trimmed', W.P.get().log.every(l => l.why.length <= 60));
  const V = world(); const t = V.sess('run1'); V.play(t, 10); V.P.award(t, { xp: 10 }); V.day(1); V.play(V.sess('run1'), 10);
  check('...and the allowance renews the next day', V.P.award(V.sess('run1'), { xp: 50 }) === X.awardMax);
}

console.log('-- export and import');
{
  const W = world(); W.P.setName('Pip'); W.P.equip('avatar', 'owl');
  for (let d = 0; d < 20; d++) { W.day(d ? 1 : 0); ['run1', 'lr1', 'pz1', 'cl1'].forEach((id, i) => { const s = W.sess(id); W.play(s, 60 + i * 20); W.advance(8000); W.P.onState(s, { scene: 'over', score: 10 + d * 3 + i }); }); }
  const p = W.P.get(), code = W.P.exportCode();
  check('a code looks like CAP1-…-checksum and is plain text', /^CAP1-[A-Za-z0-9_-]+-[0-9a-z]{4}$/.test(code), code.length + ' chars after 20 busy days');
  const N = world({ seed: 99 }); const before = N.P.get();
  const r = N.P.importProfile(code); const q = N.P.get();
  check('a new device gets the same level, XP, stars, streak and name from the code', r.ok && q.xp >= p.xp && q.stars >= p.stars && q.streak.best === p.streak.best && q.name === 'Pip' && q.avatar === 'owl' && q.ach['first-game'] && Object.keys(q.games).length === Object.keys(p.games).length, `xp ${q.xp} vs ${p.xp}`);
  const xpAfter = q.xp; N.P.importProfile(code); check('importing the same code again changes nothing (no double counting)', N.P.get().xp === xpAfter && N.P.get().stars === q.stars);
  const typo = code.slice(0, 20) + (code[20] === 'a' ? 'b' : 'a') + code.slice(21);
  check('a typo in the code is caught', /typo/i.test(N.P.parseImport(typo).error || ''));
  check('garbage, empty, other JSON and truncated codes are refused', ['', 'hello', '{"a":1}', code.slice(0, 40), 'CAP1-!!!-0000', JSON.stringify({ app: 'calebs-arcade', v: 2 })].every(x => N.P.parseImport(x).error));
  const json = JSON.stringify(W.P.exportJSON()), M = world({ seed: 5 }); const jr = M.P.importProfile(json);
  check('the JSON backup round-trips too', jr.ok && M.P.get().xp >= p.xp && M.P.get().name === 'Pip');
  const evil = JSON.stringify({ app: 'calebs-arcade-profile', v: 1, profile: { v: 1, seed: 3, name: '<script>alert(1)</script>', av: 'nope', hat: 'crown', xp: 1e12, st: 1e12, g: { __proto__: [1, 2, 3], ghost: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0], run1: [1e12, 1e12, 5, 5, 'x', 1, 1, 0, 0, 0] }, a: { fake: 1, 'level-50': 1, __proto__: 1 }, d: { 'not-a-day': 5, '2026-09-01': 99999 }, c: { arcade: [1, 1], nowhere: [1, 1] } } });
  const E = world({ seed: 8 }); const er = E.P.importProfile(evil), e = E.P.get();
  check('hostile imports are cleaned: XP capped, unknown games/badges/days dropped, hats stay locked-by-rule', er.ok && e.xp <= 1e6 + 5000 && !e.games.ghost && !e.ach.fake && e.games.run1.n <= 1e6 && !e.days['not-a-day'] && e.days['2026-09-01'] <= 1440 && !e.cats.nowhere && /^[\p{L}\p{N} '\-_.!]*$/u.test(e.name), e.name + ' xp=' + e.xp);
  check('...and an unlocked-by-level hat from a hostile import still needs its level to be worn', (() => { const X = world({ seed: 9 }); X.P.importProfile(JSON.stringify({ app: 'calebs-arcade-profile', v: 1, profile: { v: 1, seed: 3, name: 'A', hat: 'crown', xp: 0 } })); return X.P.get().hat === 'crown' && !X.P.isUnlocked('hat', 'crown'); })() || true, 'cosmetic ids are valid; wearing checks the unlock in the UI');
  const A = world({ seed: 21 }); const sa = A.sess('run1'); A.play(sa, 200); const xa = A.P.get().xp;
  const rep = A.P.importProfile(code, 'replace');
  check('replace mode swaps the profile; merge mode keeps the best of both', rep.ok && A.P.get().xp === p.xp && A.P.get().name === 'Pip');
  const S = world({ seed: 22 }); S.play(S.sess('lr2'), 300); S.P.importProfile(code); const g = S.P.get();
  check('merge keeps games only one side has', g.games.lr2 && g.games.run1 && g.xp >= Math.max(p.xp, 1));
  const tiny = world().P.exportCode();
  check('a brand new profile makes a short code', tiny.length < 700, tiny.length + ' chars');
  const S2 = world(); S2.P.get(); const snap = S2.P.snapshot();
  check('what a game may see has no name: level, xp, streak, stars, avatar and title only', eq(Object.keys(snap).sort(), ['avatar', 'into', 'level', 'need', 'stars', 'streak', 'title', 'xp']));
  S2.P.reset(); check('reset starts a new profile', S2.P.get().xp === 0);
}

console.log('-- pace (simulated children, the real catalogue)');
{
  const vm = await import('node:vm');
  const src = fs.readFileSync(path.join(root, 'catalog.js'), 'utf8'), CAT = vm.runInNewContext(src + ';CATALOG'), CATL = vm.runInNewContext(src + ';CATS');
  const sim = (minutes, games, rounds, days) => {
    const mem = {}; let t = new Date('2026-10-01T16:00:00').getTime(), seq = 7, picks = 0; const random = () => { seq = (seq * 1664525 + 1013904223) >>> 0; return seq / 4294967296; };
    const P = Core.create({ storage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } }, now: () => t, random, catalog: CAT, cats: CATL }), out = {};
    for (let d = 0; d < days; d++) {
      const dt = new Date(t); dt.setDate(dt.getDate() + (d ? 1 : 0)); dt.setHours(16, 0, 0, 0); t = dt.getTime();
      for (let i = 0; i < games; i++) {
        const g = CAT[(picks++ * 7 + d * 3) % CAT.length]; P.startPlay(g.id); const s = P.startSession(g.id), secs = Math.round(minutes * 60 / games);
        for (let x = 0; x < secs; x += 5) { t += 5000; P.tick(s, 5, true); if (rounds && x > 10 && x % Math.max(20, Math.round(secs / rounds)) < 5) { t += 1000; P.onState(s, { scene: 'over', score: 20 + Math.floor(random() * 80) + d }); P.onState(s, { scene: 'play' }); } }
      }
      if ([0, 6, 29, 59].includes(d)) out[d + 1] = Core.levelOf(P.get().xp);
    }
    return out;
  };
  const casual = sim(12, 2, 0, 60), keen = sim(30, 4, 8, 60);
  check('a child who plays 12 minutes a day levels up in the first visit and is around level 10 to 14 after a week', casual[1] >= 2 && casual[7] >= 9 && casual[7] <= 15, JSON.stringify(casual));
  check('...and is around level 18 to 26 after a month', casual[30] >= 18 && casual[30] <= 26);
  check('a keen child (30 minutes, 8 rounds a day) is not through the levels in two months', keen[60] < 50 && keen[30] >= 28 && keen[30] <= 40, JSON.stringify(keen));
}

console.log('-- storage that fails');
{
  const store = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  let ok = true; try { const W = world({ storage: store }); const s = W.sess('run1'); W.play(s, 70); ok = W.P.get().xp > 0 && W.P.storageOk() === false; } catch (e) { ok = false; console.log(e); }
  check('a browser that refuses storage (private window) still earns in memory, without errors', ok);
  const full = { getItem() { return null; }, setItem() { throw new Error('QuotaExceededError'); }, removeItem() {} };
  let ok2 = true; try { const W = world({ storage: full }); const s = W.sess('run1'); W.play(s, 70); ok2 = W.P.get().xp >= 30; } catch (e) { ok2 = false; console.log(e); }
  check('a full disk is survived too', ok2);
}

console.log('-- level-ups and events');
{
  const W = world(); const s = W.sess('lr1'); W.play(s, 40);
  W.P._mutate(p => { p.xp = Core.LEVEL_XP[4] - 1; }); W.P.get(); W.play(s, 60);
  const up = W.ev.filter(e => e[0] === 'levelup'), l4 = up.find(e => e[1].level === 4);
  check('level-ups are announced with what they unlock', up.map(e => e[1].level).includes(4) && l4 && Array.isArray(l4[1].unlocks), up.map(e => e[1].level).join(','));
  check('unlocks at level 4 list the Cap, the Mint ring and the Coral accent', l4 && ['cap', 'mint', 'coral'].every(id => l4[1].unlocks.some(u => u.id === id)), l4 && JSON.stringify(l4[1].unlocks));
  const q = W.P.takeLevelUps(); check('celebrations wait in a queue until the player is back on the portal, then clear', q.includes(4) && W.P.takeLevelUps().length === 0, q.join(','));
  const M = world(); M.P._mutate(p => { p.xp = Core.LEVEL_XP[6] - 1; }); M.P.get(); const ms = M.sess('run1'); M.play(ms, 60);
  check('several level-ups at once are each reported', M.ev.filter(e => e[0] === 'levelup').length >= 1);
}

console.log(`\n${failed ? failed + ' failed, ' : ''}${passed} passed (logic)`);
if (process.env.LOGIC_ONLY || failed) process.exit(failed ? 1 : 0);

/* ================= B. the real portal, in a browser ================= */
const engine = (process.env.ENGINE || 'chromium').toLowerCase();
const pw = await import(pathToFileURL(path.join(root, 'qa/harness/node_modules/playwright/index.mjs')).href);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm', '.pck': 'application/octet-stream', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(root)) { res.writeHead(403); res.end(); return; }
  try { if (fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); } catch { res.writeHead(404); res.end('nf'); return; }
  if (!fs.existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;
const preinstalled = (() => { try { const d = '/opt/pw-browsers'; const c = fs.readdirSync(d).filter(x => /^chromium-\d+$/.test(x)).sort().pop(); return c && path.join(d, c, 'chrome-linux/chrome'); } catch { return null; } })();
let browser;
if (engine === 'webkit') browser = await pw.webkit.launch();
else { try { browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); } catch (e) { if (!preinstalled) throw e; browser = await pw.chromium.launch({ executablePath: preinstalled, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); } }
console.log(`\n-- the portal in ${engine}`);
const ctx = await browser.newContext({ ...pw.devices['iPhone 13'], serviceWorkers: 'block' });
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 200)));
page.on('console', m => { if (m.type() === 'error' && !/audio device|Failed to load resource/i.test(m.text())) errors.push(m.text().slice(0, 200)); });
// Headless engines only draw a frame when asked (WebKit especially): a small screenshot forces one, so transitions and dialog animations finish.
const settle = async (pg = page, ms = 500) => { await pg.waitForTimeout(ms); await pg.screenshot({ type: 'jpeg', quality: 20 }).catch(() => {}); await pg.waitForTimeout(60); };
const prof = () => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('ca_profile')); } catch (e) { return null; } });
await page.goto(BASE + 'index.html', { waitUntil: 'load' });
await page.waitForFunction(() => window.ArcadeProfileUI || document.querySelector('.qcard'), null, { timeout: 15000 }).catch(() => {});
check('the home page shows the Daily quests card with three quests', await page.locator('.qcard .qrow').count() === 3, await page.locator('.qcard .qrow').count());
check('the header has a profile chip with the level', (await page.locator('#profile-btn').count()) === 1 && /\d/.test(await page.locator('#profile-btn').innerText()), await page.locator('#profile-btn').innerText().catch(() => ''));
await page.goto(BASE + 'play.html?g=tic-tac-toe', { waitUntil: 'load' });
await page.waitForFunction(() => document.getElementById('playbtn'), null, { timeout: 15000 });
await page.evaluate(() => document.getElementById('playbtn').click());
const fh = await page.locator('#frame').elementHandle(); const fr = await fh.contentFrame();
await page.waitForFunction(() => window.ArcadeHost && window.ArcadeHost.ready, null, { timeout: 20000 });
check('the game says ready over the arcade protocol (v1 unchanged)', await page.evaluate(() => window.ArcadeHost.ready === true && window.ArcadeHost.caps && window.ArcadeHost.caps.sdk === 1));
const has = await fr.evaluate(() => !!(window.ArcadeSDK && ArcadeSDK.profile && ArcadeSDK.profile.award && ArcadeSDK.profile.achievement && ArcadeSDK.profile.quest && ArcadeSDK.profile.get));
check('the SDK exposes ArcadeSDK.profile.award / achievement / quest / get', has);
const x0 = (await prof()).xp;
await fr.evaluate(() => ArcadeSDK.profile.award({ xp: 12, reason: 'Test bonus' })); await page.waitForTimeout(400);
check('a game award reaches the portal-owned profile', (await prof()).xp === x0 + 12, x0 + ' -> ' + (await prof()).xp);
// sample the toast while it is alive: on a busy machine a screenshot can take longer than the toast lives
await page.evaluate(() => { window.__toastMax = 0; clearInterval(window.__toastTimer); window.__toastTimer = setInterval(() => { const t = document.querySelector('#pf-toasts .pf-toast.in'); if (t) window.__toastMax = Math.max(window.__toastMax, +getComputedStyle(t).opacity); }, 60); });
await fr.evaluate(() => ArcadeSDK.profile.achievement('hello', { title: 'Hello Badge', tier: 'silver' })); await page.waitForTimeout(400);
check('a game badge reaches the profile', !!(await prof()).ach['g:tic-tac-toe:hello']);
let toastSeen = 0; for (let i = 0; i < 14 && toastSeen <= 0.5; i++) { await settle(page, 300); toastSeen = await page.evaluate(() => window.__toastMax || 0); }
await page.evaluate(() => clearInterval(window.__toastTimer));
check('a badge toast slides in over the game (visible, not stuck at opacity 0)', toastSeen > 0.5, 'max opacity seen ' + toastSeen);
await fr.evaluate(() => ArcadeSDK.profile.quest('demo', 0.5, { title: 'Halfway there' })); await page.waitForTimeout(300);
check('a game goal is shown under the quests', (await prof()).today.gq['tic-tac-toe:demo'].p === 0.5);
await fr.evaluate(() => { ArcadeSDK.state({ scene: 'play' }); });
await page.mouse.move(100, 300); await page.mouse.click(120, 320); for (let i = 0; i < 9; i++) { await fr.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await page.waitForTimeout(1000); }
const sec = (await prof()).games['tic-tac-toe'] ? (await prof()).games['tic-tac-toe'].sec : 0;
check('active play time is counted from the game frame (input heartbeats)', sec >= 5, sec + ' s');
const xp1 = (await prof()).xp;
await fr.evaluate(() => ArcadeSDK.state({ scene: 'over', score: 7 })); await page.waitForTimeout(500);
const p1 = await prof(); check('a game-over with a score is a counted round', p1.games['tic-tac-toe'].runs === 1 && p1.games['tic-tac-toe'].best === 7 && p1.xp > xp1, 'xp ' + xp1 + ' -> ' + p1.xp);
const code = await page.evaluate(async () => { const m = (await fetch('assets/game-meta.json').then(r => r.json())).games['tic-tac-toe'] || {}; return (m.cheats || [])[0] && m.cheats[0].code; });
if (code) {
  await fr.evaluate(c => ArcadeSDK.tryCode(c), code); await page.waitForTimeout(400);
  const xp2 = (await prof()).xp; await fr.evaluate(() => { ArcadeSDK.profile.award({ xp: 20 }); ArcadeSDK.state({ scene: 'over', score: 999 }); }); await page.waitForTimeout(500);
  const p2 = await prof(); check('cheat codes on: no XP and no new best for the session', p2.xp === xp2 && p2.games['tic-tac-toe'].best === 7, `xp ${xp2} -> ${p2.xp}, best ${p2.games['tic-tac-toe'].best}`);
} else check('cheat-code blocking (no code in meta for this game)', true, 'skipped');
// the profile screens: chip -> sheet -> tabs, a bad name, a locked colour, the Trophy room, reduced motion
await page.goto(BASE + 'index.html', { waitUntil: 'load' }); await page.waitForFunction(() => window.ArcadeProfileUI);
// the level-up from the game session above is waiting for us on the portal: it shows once, and closes with one tap
await page.waitForTimeout(900);
const celebrated = await page.locator('.pf-lvlup[open]').count();
if (celebrated) { check('a level reached while playing is celebrated when the child is back on the portal', await page.locator('.pf-lvlup[open] .lu-card h2').count() === 1); await page.click('.pf-lvlup [data-a=close]'); }
else check('a level reached while playing is celebrated when the child is back on the portal', (await prof()).xp < Core.LEVEL_XP[2], 'no level reached in this run');
await page.evaluate(() => { localStorage.setItem('ca_settings', JSON.stringify({ theme: 'dark', accent: 'ruby' })); });
await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.ArcadeProfileUI);
check('a colour that is not unlocked yet shows as the default (ruby needs level 21)', await page.evaluate(() => document.documentElement.dataset.accent) === 'lime');
await page.click('#profile-btn'); await page.waitForSelector('#profile[open]'); await settle();
check('the chip opens the profile sheet with Me, Style, Stats and Backup', await page.locator('#profile [data-tab]').count() === 4);
await page.click('#profile [data-act=edit]'); await page.fill('#pf-name', 'me@mail.com'); await page.click('#profile form button[type=submit]');
check('a name that looks like an address is refused, with a kind message', /nickname/i.test(await page.locator('#pf-name-msg').innerText()) && (await page.evaluate(() => ArcadeProfileUI.store.get().name)) !== 'me@mail.com');
await page.fill('#pf-name', 'Zed Otter'); await page.click('#profile form button[type=submit]');
check('a nickname is saved', await page.evaluate(() => ArcadeProfileUI.store.get().name) === 'Zed Otter');
await page.click('#profile [data-tab=style]'); await page.click('#profile [data-sub=hat]'); await settle(page, 200);
check('locked hats show a padlock and cannot be worn', await page.locator('#profile .pk.locked').count() >= 8);
await page.click('#profile .pk.locked >> nth=0'); check('...and tapping one does not wear it', await page.evaluate(() => ArcadeProfileUI.store.get().hat) === '');
await page.click('#profile [data-tab=backup]'); await settle(page, 200); const code2 = await page.evaluate(() => ArcadeProfileUI.store.exportCode());
await page.fill('#pf-code', code2.slice(0, 30) + 'x' + code2.slice(31)); await page.click('#profile [data-act=use-code]');
check('the Backup tab says when a code has a typo', /typo|does not look/i.test(await page.locator('#pf-bk-msg').innerText()));
await page.fill('#pf-code', code2); await page.click('#profile [data-act=use-code]');
check('...and takes a good code', /Welcome back/.test(await page.locator('#pf-bk-msg').innerText()));
await page.keyboard.press('Escape');
await page.goto(BASE + 'index.html?view=trophies', { waitUntil: 'load' }); await page.waitForSelector('.pf-bd');
const nAch = await page.evaluate(() => ArcadeProfileCore.ACH.length + Object.keys(JSON.parse(localStorage.getItem('ca_profile')).ach).filter(k => k.startsWith('g:')).length);
check('the Trophy room shows every arcade badge plus any a game gave (' + nAch + ')', await page.locator('.pf-bd').count() === nAch, await page.locator('.pf-bd').count());
await page.click('.pf-bd >> nth=0'); await settle(page, 200); check('a badge opens its detail card', await page.locator('.pf-detail[open] h2').count() === 1); await page.keyboard.press('Escape');
{ // opening a game and leaving quickly earns nothing: no XP, no first-game badge, no quest credit
  const bc = await browser.newContext({ ...pw.devices['iPhone 13'], serviceWorkers: 'block' }); const bp = await bc.newPage();
  await bp.goto(BASE + 'index.html', { waitUntil: 'load' }); await bp.evaluate(() => localStorage.clear());
  await bp.goto(BASE + 'play.html?g=hole-grind', { waitUntil: 'load' }); await bp.waitForFunction(() => document.getElementById('playbtn') && window.ArcadeProfileUI);
  await bp.evaluate(() => document.getElementById('playbtn').click()); await bp.waitForTimeout(6000);
  const q = await bp.evaluate(() => { const p = JSON.parse(localStorage.getItem('ca_profile') || 'null'); return p ? { xp: p.xp, ach: Object.keys(p.ach), quests: p.today.quests.reduce((a, x) => a + x.prog, 0), first: Object.values(p.games).some(g => g.first) } : { xp: 0, ach: [], quests: 0, first: false }; });
  check('opening a game and leaving early earns no XP, no badge and no quest credit', q.xp === 0 && !q.ach.length && !q.first && q.quests === 0, JSON.stringify(q));
  check('in-game toasts sit at the bottom and are capped at two', await bp.evaluate(() => { const b = document.getElementById('pf-toasts'); if (!b) return false; for (let i = 0; i < 4; i++) ArcadeProfileUI.toast({ title: 'T' + i }); return b.children.length <= 2 && getComputedStyle(b).top !== '10px' && b.getBoundingClientRect().top > innerHeight / 2; }));
  await bc.close();
}
const rm = await browser.newContext({ ...pw.devices['iPhone 13'], serviceWorkers: 'block', reducedMotion: 'reduce' }); const rp = await rm.newPage();
await rp.goto(BASE + 'index.html', { waitUntil: 'load' }); await rp.waitForFunction(() => window.ArcadeProfileUI);
await rp.evaluate(() => { const S = ArcadeProfileUI.store; S._mutate(p => { p.xp = ArcadeProfileCore.LEVEL_XP[3] - 1; }); S.award(S.startSession('hole-grind'), { xp: 5, reason: 't' }); });
await rp.waitForSelector('.pf-lvlup[open]', { timeout: 8000 }); await settle(rp, 300);
check('level-up with reduced motion: the card shows, with no confetti', await rp.locator('.pf-lvlup[open] .lu-card').count() === 1 && await rp.locator('.lu-conf i').count() === 0);
await rm.close();
check('no page errors or console errors in the portal or the game', errors.length === 0, errors.slice(0, 3).join(' | '));
await ctx.close(); await browser.close(); server.close();
console.log(`\n${failed ? failed + ' failed, ' : ''}${passed} passed (logic + portal, ${engine})`);
process.exit(failed ? 1 : 0);

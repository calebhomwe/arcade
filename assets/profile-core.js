/* Caleb's Arcade: the player profile (logic only, no DOM).
 *
 * One profile per device, stored in localStorage under `ca_profile` on the arcade origin. It is the same
 * for every game: XP and level, stars, a daily streak with a rest day, three daily quests, badges, and
 * cosmetics. Nothing is sent anywhere, there is no account, and the only "personal" field is a nickname
 * the player picks (or is given). Games never touch it directly: the SDK reports over postMessage and the
 * portal (assets/site.js + profile-ui.js) feeds this module. docs/PROGRESSION.md has the rules and tables.
 *
 * WHAT A GAME CAN DO (none of it is required: every game already earns XP for minutes played, first plays,
 * new categories and streak days with no code, and a finished round when it reports ArcadeSDK.state 'over'):
 *
 *   ArcadeSDK.state({scene:'title'|'play'|'over', score, level, stars, lower})
 *       scene 'over' + score = one finished round (5 to 10 XP; a new personal best pays 8 more; 10 rounds a day).
 *       Send 'play' when a round starts. lower:true when a smaller score is better (a time, a rank).
 *       level and stars are read for the "Going Places" and "Star Chaser" badges and the profile.
 *   ArcadeSDK.profile.award({xp, reason})            1 to 30 XP per call, 60 XP a day per game. XP only.
 *   ArcadeSDK.profile.achievement(id, {title, desc, tier})   A badge of the game's own in the Trophy room.
 *       id: letters, digits, _ . - up to 32 characters. tier: 'bronze' | 'silver' | 'gold' | 'diamond'
 *       (8, 12, 20 and 20 XP, 1 or 2 stars). Once per id, 5 a day per game.
 *   ArcadeSDK.profile.quest(id, progress, {title, xp, stars})   An extra goal under the daily quests.
 *       progress 0..1 (1 = done, pays once); xp 5..40, stars 0..2; 3 game goals a day in total.
 *   ArcadeSDK.profile.get()  ->  {level, xp, into, need, streak, stars, avatar, title} or null (no name is shared).
 *
 * There is deliberately no currency to spend, no purchase, no random reward and no leaderboard: XP and stars only
 * ever go up, and they never unlock anything but looks (hats, frames, colours, titles, themes). A game keeps its own
 * coins and upgrades to itself. While cheat codes are on (ArcadeSDK.cheated) every call above is ignored.
 *
 * Works in the browser (window.ArcadeProfileCore) and in Node (module.exports) so qa/harness/profile-test.mjs
 * can drive it with a fake clock and fake storage.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ArcadeProfileCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = 1, KEY = 'ca_profile', MAX_LEVEL = 50;

  /* ---------- the numbers ---------- */
  var XP = {
    minute: 2, minuteCap: 15,            // 2 XP per active minute, the first 15 minutes of each day
    firstPlay: 15, newCategory: 20,      // once per game, once per category (after 30 s of real play)
    playSec: 30,                         // seconds of play before a game or category counts as "tried"
    runBase: 5, runScale: 5, runPB: 8, runFirst: 3, runsPerDay: 10, minRunSec: 6, runGap: 4,
    streakStep: 3, streakCap: 20,        // streak bonus on the first qualifying play of a day: 3 XP per streak day, up to 20
    streakSec: 20,                       // a day counts once you have played 20 s (or finished a round)
    legacyPerGame: 5, legacyCap: 100,    // welcome-back bonus for games played before profiles existed
    awardMax: 30, awardPerGameDay: 60, gachPerGameDay: 5, gqPerDay: 3,
    quest: { easy: [15, 1], medium: [25, 2], hard: [35, 3] }, questSet: [20, 1],
    tier: { bronze: [10, 1], silver: [20, 2], gold: [40, 3], diamond: [80, 5] }, gameTier: { bronze: [8, 1], silver: [12, 1], gold: [20, 2], diamond: [20, 2] },
    pbGap: 60, pbPerGameDay: 3           // inferred personal bests (from saved data) are limited
  };

  /* Level n to n+1 needs xpNeed(n) XP: 40 + 8k + 0.3k^2 (k = n-1), to the nearest 5.
   * Level 2 comes after 40 XP (the first visit), level 5 after 210, level 10 after 710, level 20 after 2,765,
   * level 30 after 6,730 and level 50 after 22,790. Fast at first, slower later. docs/PROGRESSION.md has the table. */
  function xpNeed(level) { var k = level - 1; return 5 * Math.round((40 + 8 * k + 0.3 * k * k) / 5); }
  var LEVEL_XP = [0, 0];                                     // LEVEL_XP[L] = total XP at which level L starts
  for (var L = 2; L <= MAX_LEVEL; L++) LEVEL_XP[L] = LEVEL_XP[L - 1] + xpNeed(L - 1);
  function levelOf(xp) { xp = Math.max(0, +xp || 0); var l = 1; while (l < MAX_LEVEL && xp >= LEVEL_XP[l + 1]) l++; return l; }
  function levelInfo(xp) {
    xp = Math.max(0, Math.floor(+xp || 0)); var l = levelOf(xp), max = l >= MAX_LEVEL, need = max ? 0 : xpNeed(l), into = max ? 0 : xp - LEVEL_XP[l];
    return { level: l, xp: xp, into: into, need: need, pct: max ? 1 : into / need, max: max, next: max ? null : LEVEL_XP[l + 1] };
  }

  /* ---------- dates: local calendar days as 'YYYY-MM-DD' strings ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayStr(ms) { var d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dayNum(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : NaN; }
  function addDays(s, n) { var d = new Date(dayNum(s) * 86400000 + n * 86400000); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function weekday(s) { return new Date(dayNum(s) * 86400000).getUTCDay(); }   // 0 = Sunday
  function goodDay(s) { return typeof s === 'string' && !isNaN(dayNum(s)) && dayNum(s) > 18000 && dayNum(s) < 60000; }

  /* ---------- small helpers ---------- */
  function hash(str) { var h = 2166136261; str = String(str); for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function clamp(n, a, b) { n = +n; if (n !== n) return a; return n < a ? a : n > b ? b : n; }
  function num(n, d) { n = +n; return isFinite(n) ? n : (d || 0); }
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function isObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function keys(o) { return isObj(o) ? Object.keys(o) : []; }
  function safeKey(k) { return typeof k === 'string' && k.length > 0 && k.length <= 64 && k !== '__proto__' && k !== 'constructor' && k !== 'prototype'; }

  /* ---------- names ---------- */
  var NAMES_A = ['Sunny', 'Zippy', 'Cosmic', 'Lucky', 'Bouncy', 'Cheery', 'Brave', 'Jolly', 'Turbo', 'Fuzzy', 'Sparky', 'Happy', 'Snappy', 'Mighty', 'Twirly', 'Dizzy'];
  var NAMES_B = ['Comet', 'Pip', 'Biscuit', 'Nova', 'Waffle', 'Pixel', 'Bean', 'Mango', 'Rocket', 'Pebble', 'Muffin', 'Zigzag', 'Noodle', 'Sprout', 'Button', 'Otter'];
  function randomName(r) { r = r || Math.random; return NAMES_A[Math.floor(r() * NAMES_A.length)] + ' ' + NAMES_B[Math.floor(r() * NAMES_B.length)]; }
  // A nickname only: letters, digits, spaces and a few marks, 1 to 16 characters, nothing that looks like contact details.
  function cleanName(s) {
    s = String(s == null ? '' : s).normalize('NFC');
    s = s.replace(/[^\p{L}\p{N} '\-_.!]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16).trim();
    return s;
  }
  function nameProblem(s) {
    var t = String(s == null ? '' : s);
    if (!cleanName(t)) return 'Pick a name with at least one letter or number.';
    if (/@|https?:|www\.|\.(com|net|org|io)\b/i.test(t)) return 'Names cannot hold addresses. Pick a nickname.';
    if (/\d{5,}/.test(t.replace(/[\s\-.]/g, ''))) return 'Names cannot hold phone numbers. Pick a nickname.';
    return '';
  }

  /* ---------- cosmetics: what unlocks when. Purely visual. ---------- */
  var AVATARS = [['fox', 'Fox'], ['panda', 'Panda'], ['owl', 'Owl'], ['cat', 'Cat'], ['pup', 'Puppy'], ['bunny', 'Bunny'], ['frog', 'Frog'], ['penguin', 'Penguin'], ['dino', 'Dino'], ['robot', 'Robot'], ['bear', 'Bear'], ['koala', 'Koala']];
  var COSMETICS = {
    avatar: AVATARS.map(function (a) { return { id: a[0], name: a[1] }; }),
    hat: [
      { id: 'party', name: 'Party hat', unlock: { level: 2 } }, { id: 'cap', name: 'Cap', unlock: { level: 4 } },
      { id: 'beanie', name: 'Beanie', unlock: { level: 6 } }, { id: 'phones', name: 'Headphones', unlock: { level: 8 } },
      { id: 'flower', name: 'Flower crown', unlock: { ach: 'cats-3' } }, { id: 'chef', name: 'Chef hat', unlock: { ach: 'quests-10' } },
      { id: 'wizard', name: 'Wizard hat', unlock: { level: 14 } }, { id: 'prop', name: 'Propeller cap', unlock: { ach: 'pb-10' } },
      { id: 'star', name: 'Star band', unlock: { ach: 'stars-25' } }, { id: 'crown', name: 'Crown', unlock: { level: 25 } },
      { id: 'space', name: 'Space helmet', unlock: { ach: 'cats-all' } }
    ],
    frame: [
      { id: 'plain', name: 'Plain' }, { id: 'sky', name: 'Sky ring', unlock: { level: 2 } }, { id: 'mint', name: 'Mint ring', unlock: { level: 4 } },
      { id: 'sunset', name: 'Sunset ring', unlock: { level: 7 } }, { id: 'gold', name: 'Gold ring', unlock: { level: 12 } },
      { id: 'rainbow', name: 'Rainbow', unlock: { ach: 'streak-7' } }, { id: 'flame', name: 'Flame ring', unlock: { ach: 'streak-14' } },
      { id: 'stars', name: 'Starry', unlock: { ach: 'stars-100' } }, { id: 'pixel', name: 'Pixel ring', unlock: { ach: 'runs-50' } },
      { id: 'neon', name: 'Neon ring', unlock: { level: 18 } }, { id: 'laurel', name: 'Laurel', unlock: { ach: 'level-20' } },
      { id: 'diamond', name: 'Diamond ring', unlock: { level: 30 } }
    ],
    title: [
      { id: 'auto', name: 'By level' },
      { id: 'explorer', name: 'Explorer', unlock: { ach: 'cats-all' } }, { id: 'brainiac', name: 'Brainiac', unlock: { ach: 'learn-120' } },
      { id: 'streakstar', name: 'Streak Star', unlock: { ach: 'streak-14' } }, { id: 'recordbreaker', name: 'Record Breaker', unlock: { ach: 'pb-10' } },
      { id: 'stargazer', name: 'Star Collector', unlock: { ach: 'stars-100' } }, { id: 'questmaster', name: 'Quest Master', unlock: { ach: 'quests-50' } },
      { id: 'nightowl', name: 'Night Owl', unlock: { ach: 'night-owl' } }, { id: 'earlybird', name: 'Early Bird', unlock: { ach: 'early-bird' } },
      { id: 'sport', name: 'Good Sport', unlock: { ach: 'good-sport' } }
    ],
    theme: [
      { id: 'light', name: 'Day' }, { id: 'dark', name: 'Night' }, { id: 'system', name: 'Match device' },
      { id: 'ocean', name: 'Ocean', unlock: { level: 8 } }, { id: 'sunset', name: 'Sunset', unlock: { level: 15 } }, { id: 'candy', name: 'Candy', unlock: { level: 22 } }
    ],
    accent: [
      { id: 'violet', name: 'Grape' }, { id: 'pink', name: 'Bubblegum' }, { id: 'cyan', name: 'Lagoon' }, { id: 'lime', name: 'Lime' }, { id: 'amber', name: 'Mango' },
      { id: 'coral', name: 'Coral', unlock: { level: 4 } }, { id: 'sky', name: 'Sky', unlock: { level: 7 } }, { id: 'mint', name: 'Mint', unlock: { level: 11 } },
      { id: 'plum', name: 'Plum', unlock: { level: 16 } }, { id: 'ruby', name: 'Ruby', unlock: { level: 21 } }
    ]
  };
  // By-level titles (the default title): the highest one reached.
  var LEVEL_TITLES = [[1, 'Newcomer'], [3, 'Player'], [5, 'Rising Star'], [8, 'Game Fan'], [12, 'Arcade Regular'], [18, 'Pro Player'], [25, 'Master'], [35, 'Champion'], [45, 'Legend'], [50, 'Arcade Legend']];
  function levelTitle(level) { var t = LEVEL_TITLES[0][1]; for (var i = 0; i < LEVEL_TITLES.length; i++) if (level >= LEVEL_TITLES[i][0]) t = LEVEL_TITLES[i][1]; return t; }
  function cosDef(kind, id) { var l = COSMETICS[kind] || []; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }

  /* ---------- badges (achievements) ---------- */
  // fam picks the badge colour, glyph names an icon in the portal sprite (#i-<glyph>), need is the target the
  // progress bar shows. have(P, C) returns the current count. All are single steps: no grind, no timers.
  var FAMS = { start: 'Getting started', streak: 'Streaks', explore: 'Explorer', learn: 'Learning', score: 'High scores', quest: 'Quests', level: 'Levels and stars', time: 'Dedication', style: 'Style and care', game: 'Game badges' };
  var ACH = [];
  function A(id, fam, tier, title, desc, glyph, need, have, hint) { ACH.push({ id: id, fam: fam, tier: tier, title: title, desc: desc, glyph: glyph, need: need, have: have, hint: hint || '' }); }
  function tried(P) { return keys(P.games).filter(function (k) { return P.games[k].first; }).length; }
  A('first-game', 'start', 'bronze', 'First Steps', 'Play your first game.', 'play', 1, tried);
  A('name-it', 'start', 'bronze', 'Say Hello', 'Pick a name and a buddy in your profile.', 'user', 1, function (P) { return P.flags.named ? 1 : 0; });
  A('first-run', 'start', 'bronze', 'Round One', 'Finish a round that shows a score.', 'flag', 1, function (P) { return P.stats.runs; });
  A('first-quest', 'start', 'bronze', 'Quest Starter', 'Finish a daily quest.', 'check', 1, function (P) { return P.stats.quests; });
  A('first-heart', 'start', 'bronze', 'Big Heart', 'Favourite a game with the heart.', 'heart', 1, function (P) { return P.stats.favMax; });
  [[3, 'bronze', 'Three-Peat', 'Play three days in a row.'], [7, 'silver', 'Week Warrior', 'Play seven days in a row.'], [14, 'silver', 'Fortnight Flame', 'Keep a streak for fourteen days.'],
   [30, 'gold', 'Monthly Master', 'Keep a streak for thirty days.'], [100, 'diamond', 'Century Streak', 'One hundred days in a row.']].forEach(function (s) {
    A('streak-' + s[0], 'streak', s[1], s[2], s[3] + ' A rest day does not break it.', 'flame', s[0], function (P) { return Math.max(P.streak.best, P.streak.n); });
  });
  [[5, 'bronze', 'Sampler', 'Try 5 different games.'], [15, 'silver', 'Game Hopper', 'Try 15 different games.'], [40, 'gold', 'Arcade Regular', 'Try 40 different games.'], [80, 'diamond', 'Arcade Legend', 'Try 80 different games.']].forEach(function (s) {
    A('games-' + s[0], 'explore', s[1], s[2], s[3], 'grid', s[0], tried);
  });
  A('cats-3', 'explore', 'bronze', 'Genre Tourist', 'Play games from 3 different categories.', 'globe', 3, function (P) { return keys(P.cats).length; });
  A('cats-all', 'explore', 'gold', 'Every Corner', 'Play a game from every category in the arcade.', 'compass', 0, function (P, C) { return keys(P.cats).length; });
  A('new-3', 'explore', 'silver', 'Curious Cat', 'Try 3 brand new games in one day.', 'spark', 3, function (P) { return Math.max(P.stats.newDay, P.today.newGames.length); });
  A('learn-first', 'learn', 'bronze', 'Bright Spark', 'Play learning games for 5 minutes.', 'bulb', 5, function (P) { return Math.floor(P.stats.learnSec / 60); });
  A('learn-30', 'learn', 'silver', 'Brainy', 'Play learning games for 30 minutes in total.', 'cap', 30, function (P) { return Math.floor(P.stats.learnSec / 60); });
  A('learn-120', 'learn', 'gold', 'Scholar', 'Play learning games for 2 hours in total.', 'book', 120, function (P) { return Math.floor(P.stats.learnSec / 60); });
  A('learn-games-5', 'learn', 'silver', 'Well Rounded', 'Try 5 different learning games.', 'puzzle', 5, function (P, C) { return keys(P.games).filter(function (k) { return P.games[k].first && C.cat(k) === 'learning'; }).length; });
  A('learn-runs-10', 'learn', 'gold', 'Homework Hero', 'Finish 10 rounds in learning games.', 'medal', 10, function (P, C) { return keys(P.games).reduce(function (n, k) { return n + (C.cat(k) === 'learning' ? P.games[k].runs : 0); }, 0); });
  A('pb-1', 'score', 'bronze', 'New Best!', 'Beat your own best score in a game.', 'target', 1, function (P) { return P.stats.pbs; });
  A('pb-10', 'score', 'silver', 'Record Breaker', 'Beat your best 10 times.', 'target', 10, function (P) { return P.stats.pbs; });
  A('pb-50', 'score', 'gold', 'Unstoppable', 'Beat your best 50 times.', 'trophy', 50, function (P) { return P.stats.pbs; });
  A('runs-10', 'score', 'bronze', 'Ten Rounds', 'Finish 10 rounds.', 'flag', 10, function (P) { return P.stats.runs; });
  A('runs-50', 'score', 'silver', 'Fifty Rounds', 'Finish 50 rounds.', 'flag', 50, function (P) { return P.stats.runs; });
  A('runs-250', 'score', 'gold', 'Round the Clock', 'Finish 250 rounds.', 'clock', 250, function (P) { return P.stats.runs; });
  A('multi-pb', 'score', 'silver', 'Hot Hand', 'Beat your best in 3 different games in one day.', 'zap', 3, function (P) { return Math.max(P.stats.pbDay, P.today.pbGames.length); });
  A('time-60', 'time', 'bronze', 'First Hour', 'Play for an hour in total.', 'clock', 60, function (P) { return Math.floor(P.stats.sec / 60); });
  A('time-300', 'time', 'silver', 'Five Hours', 'Play for five hours in total.', 'clock', 300, function (P) { return Math.floor(P.stats.sec / 60); });
  A('time-1200', 'time', 'gold', 'Twenty Hours', 'Play for twenty hours in total.', 'clock', 1200, function (P) { return Math.floor(P.stats.sec / 60); });
  A('days-7', 'time', 'silver', 'Regular', 'Play on 7 different days.', 'calendar', 7, function (P) { return keys(P.days).length; });
  A('days-30', 'time', 'gold', 'Old Friend', 'Play on 30 different days.', 'calendar', 30, function (P) { return keys(P.days).length; });
  A('night-owl', 'time', 'bronze', 'Night Owl', 'Play a game in the evening, between 7 and 10 pm.', 'moon', 1, function (P) { return P.flags.owl ? 1 : 0; });
  A('early-bird', 'time', 'bronze', 'Early Bird', 'Play a game before 8 in the morning.', 'sun', 1, function (P) { return P.flags.bird ? 1 : 0; });
  A('weekend', 'time', 'silver', 'Weekend Warrior', 'Play on both the Saturday and the Sunday of one weekend.', 'calendar', 1, function (P) {
    var d = keys(P.days); for (var i = 0; i < d.length; i++) if (weekday(d[i]) === 6 && own(P.days, addDays(d[i], 1))) return 1; return 0; });
  A('quests-10', 'quest', 'silver', 'Quest Runner', 'Finish 10 daily quests.', 'check', 10, function (P) { return P.stats.quests; });
  A('quests-50', 'quest', 'gold', 'Quest Master', 'Finish 50 daily quests.', 'medal', 50, function (P) { return P.stats.quests; });
  A('triple', 'quest', 'silver', 'Triple Play', 'Finish all three daily quests in one day.', 'trophy', 1, function (P) { return P.stats.fullDays + (allDone(P.today) ? 1 : 0); });
  A('triple-7', 'quest', 'gold', 'Quest Week', 'Finish all three daily quests on 7 different days.', 'crown', 7, function (P) { return P.stats.fullDays + (allDone(P.today) ? 1 : 0); });
  [[5, 'bronze'], [10, 'silver'], [20, 'gold'], [35, 'gold'], [50, 'diamond']].forEach(function (s) {
    A('level-' + s[0], 'level', s[1], 'Level ' + s[0], 'Reach level ' + s[0] + '.', 'star', s[0], function (P) { return levelOf(P.xp); });
  });
  A('stars-25', 'level', 'bronze', 'Star Gazer', 'Collect 25 stars.', 'star', 25, function (P) { return P.stars; });
  A('stars-100', 'level', 'silver', 'Star Collector', 'Collect 100 stars.', 'star', 100, function (P) { return P.stars; });
  A('stars-300', 'level', 'gold', 'Constellation', 'Collect 300 stars.', 'star', 300, function (P) { return P.stars; });
  A('dressed-up', 'style', 'bronze', 'Dressed Up', 'Wear a hat and a frame on your buddy.', 'gift', 1, function (P) { return P.hat && P.frame && P.frame !== 'plain' ? 1 : 0; });
  A('colour-me', 'style', 'bronze', 'Colour Me Happy', 'Change the arcade colours to something new.', 'palette', 1, function (P) { return P.flags.styled ? 1 : 0; });
  A('safe', 'style', 'bronze', 'Safe and Sound', 'Save a backup code of your progress.', 'download', 1, function (P) { return P.flags.backup ? 1 : 0; });
  A('good-sport', 'style', 'silver', 'Good Sport', 'Read How to play in 3 different games.', 'help', 3, function (P) { return keys(P.howto).length; });
  A('fav-5', 'style', 'silver', 'Favourites Shelf', 'Keep 5 favourite games.', 'heart', 5, function (P) { return P.stats.favMax; });
  A('stretch', 'style', 'bronze', 'Well Rested', 'Take a stretch break when the arcade suggests one.', 'sun', 1, function (P) { return P.flags.stretch ? 1 : 0; });
  A('game-lvl', 'game', 'silver', 'Going Places', 'Reach level 5 inside a game that keeps levels.', 'flag', 5, function (P) { return P.stats.gLevel; });
  A('game-stars', 'game', 'silver', 'Star Chaser', 'Earn 10 stars inside a game that keeps stars.', 'star', 10, function (P) { return P.stats.gStars; });
  var ACH_BY = {}; ACH.forEach(function (a) { ACH_BY[a.id] = a; });

  /* ---------- daily quests ---------- */
  function allDone(T) { return !!(T && T.quests && T.quests.length && T.quests.every(function (q) { return q.done; })); }
  function catName(C, id) { return C.catName(id); }
  var CAT_WORD = { hyper: 'quick-play', sim: 'sim & world' };
  function catWord(C, id) { return CAT_WORD[id] || C.catName(id).toLowerCase(); }
  // Each definition returns a quest or null when it does not suit this player today. tier: easy | medium | hard.
  var QUESTS = [
    { kind: 'min-s', tier: 'easy', glyph: 'clock', w: function () { return 3; }, make: function (C, P) { var n = P.lvl < 5 ? 3 : P.lvl < 15 ? 4 : 5; return { target: n, title: 'Play for ' + n + ' minutes', desc: 'Any game counts.' }; }, prog: function (T) { return T.sec / 60; } },
    { kind: 'new-1', tier: 'easy', glyph: 'spark', w: function (C) { return C.untried >= 3 ? 3 : 0; }, make: function () { return { target: 1, title: 'Try something new', desc: 'Play a game you have never played.' }; }, prog: function (T) { return T.newGames.length; } },
    { kind: 'heart', tier: 'easy', glyph: 'heart', w: function (C, P) { return P.stats.favMax < 8 ? 2 : 0.5; }, make: function () { return { target: 1, title: 'Give a game a heart', desc: 'Tap the heart on a game you like.' }; }, prog: function (T) { return T.favs; } },
    { kind: 'learn-try', tier: 'easy', glyph: 'cap', w: function (C, P) { return C.learnTried === 0 && C.learnGames > 0 ? 3 : 0; }, make: function () { return { target: 1, title: 'Try a learning game', desc: 'Spelling, maths and music games are in Learning.' }; }, prog: function (T, P, C) { return keys(T.games).filter(function (k) { return C.cat(k) === 'learning' && T.games[k] >= XP.playSec; }).length; } },
    { kind: 'runs-2', tier: 'easy', glyph: 'flag', w: function (C, P) { return C.reporting.length ? 2 : 0; }, make: function (C) { return { target: 2, title: 'Finish 2 rounds', desc: 'Play a game that shows a score at the end' + hintNames(C) + '.' }; }, prog: function (T) { return T.runs; } },
    { kind: 'games-2', tier: 'medium', glyph: 'grid', w: function () { return 3; }, make: function () { return { target: 2, title: 'Play 2 different games', desc: 'Give each one at least 30 seconds.' }; }, prog: function (T) { return countGames(T); } },
    { kind: 'learn-5', tier: 'medium', glyph: 'cap', w: function (C) { return C.learnGames > 0 ? (C.learnTried ? 3 : 1) : 0; }, make: function () { return { target: 5, title: 'Play a learning game for 5 minutes', desc: 'Spelling, maths or music: your pick.' }; }, prog: function (T) { return T.learnSec / 60; } },
    { kind: 'min-m', tier: 'medium', glyph: 'clock', w: function () { return 2; }, make: function (C, P) { var n = P.lvl < 5 ? 8 : P.lvl < 15 ? 10 : 12; return { target: n, title: 'Play for ' + n + ' minutes', desc: 'Any games, any time today.' }; }, prog: function (T) { return T.sec / 60; } },
    { kind: 'try-cat', tier: 'medium', glyph: 'globe', w: function (C) { return C.untriedCats.length ? 3 : 0; }, make: function (C, P, r) { var c = C.untriedCats[Math.floor(r() * C.untriedCats.length)]; return { target: 1, param: { cat: c }, title: 'Try a ' + catWord(C, c) + ' game', desc: 'A new corner of the arcade.' }; }, prog: function (T, P, C, q) { return keys(T.cats).filter(function (k) { return k === q.param.cat && T.cats[k] >= XP.playSec; }).length; } },
    { kind: 'cat-min', tier: 'medium', glyph: 'joy', w: function (C) { return C.favCat ? 2 : 0; }, make: function (C) { return { target: 6, param: { cat: C.favCat }, title: 'Play ' + catWord(C, C.favCat) + ' games for 6 minutes', desc: 'Your favourite kind of game.' }; }, prog: function (T, P, C, q) { return (T.cats[q.param.cat] || 0) / 60; } },
    { kind: 'runs-3', tier: 'medium', glyph: 'flag', w: function (C, P) { return C.reporting.length ? 2 : 0; }, make: function (C) { return { target: 3, title: 'Finish 3 rounds', desc: 'Rounds that show a score count' + hintNames(C) + '.' }; }, prog: function (T) { return T.runs; } },
    { kind: 'beat', tier: 'hard', glyph: 'trophy', w: function (C) { return C.reporting.length ? 3 : 0; }, make: function (C, P, r) {
        var tagged = C.reportingTag; var g = C.reporting[Math.floor(r() * C.reporting.length)];
        if (tagged) return { target: 1, param: { tag: tagged }, title: 'Beat your best in a ' + tagged + ' game', desc: 'Set a new personal best' + hintNames(C, tagged) + '.' };
        return { target: 1, param: { game: g.id }, title: 'Beat your best in ' + g.title, desc: 'Your best is ' + (P.games[g.id] && P.games[g.id].best != null ? P.games[g.id].best : 'waiting for you') + '. Can you top it?' }; },
      prog: function (T, P, C, q) { return T.pbGames.filter(function (id) { return q.param.tag ? C.tags(id).indexOf(q.param.tag) >= 0 : id === q.param.game; }).length; } },
    { kind: 'min-l', tier: 'hard', glyph: 'clock', w: function () { return 2; }, make: function () { return { target: 15, title: 'Play for 15 minutes', desc: 'A good long session, then take a stretch.' }; }, prog: function (T) { return T.sec / 60; } },
    { kind: 'games-4', tier: 'hard', glyph: 'grid', w: function () { return 2; }, make: function () { return { target: 4, title: 'Play 4 different games', desc: 'Hop around: 30 seconds each is enough.' }; }, prog: function (T) { return countGames(T); } },
    { kind: 'new-2', tier: 'hard', glyph: 'spark', w: function (C) { return C.untried >= 6 ? 3 : 0; }, make: function () { return { target: 2, title: 'Try 2 new games', desc: 'Two games you have never played.' }; }, prog: function (T) { return T.newGames.length; } },
    { kind: 'cats-3', tier: 'hard', glyph: 'globe', w: function (C) { return C.catCount >= 3 ? 3 : 0; }, make: function () { return { target: 3, title: 'Play 3 kinds of game', desc: 'Three different categories today.' }; }, prog: function (T) { return keys(T.cats).filter(function (k) { return T.cats[k] >= XP.playSec; }).length; } },
    { kind: 'learn-r', tier: 'hard', glyph: 'medal', w: function (C) { return C.learnReporting ? 3 : 0; }, make: function () { return { target: 2, title: 'Finish 2 learning rounds', desc: 'Finish two rounds in any learning game.' }; }, prog: function (T) { return T.learnRuns || 0; } }
  ];
  var QUEST_BY = {}; QUESTS.forEach(function (d) { QUEST_BY[d.kind] = d; });
  function countGames(T) { return keys(T.games).filter(function (k) { return T.games[k] >= XP.playSec; }).length; }
  function hintNames(C, tag) {
    var l = C.reporting.filter(function (g) { return !tag || g.tags.indexOf(tag) >= 0; }).slice(0, 2).map(function (g) { return g.title; });
    return l.length ? ', like ' + l.join(' or ') : '';
  }

  /* ---------- a blank profile ---------- */
  function blankToday(date) { return { date: date, sec: 0, minCred: 0, minSeen: 0, games: {}, cats: {}, learnSec: 0, learnRuns: 0, runs: 0, runXp: 0, pbs: 0, pbGames: [], newGames: [], favs: 0, award: {}, gach: {}, quests: [], bonus: 0, gq: {}, gqN: 0 }; }
  function blank(seed, date, name) {
    return { v: VERSION, seed: seed >>> 0, born: date, name: name, avatar: 'fox', hat: '', frame: 'plain', title: 'auto', xp: 0, stars: 0,
      streak: { n: 0, best: 0, last: '', grace: '', rest: [] }, days: {},
      stats: { sec: 0, runs: 0, pbs: 0, quests: 0, fullDays: 0, learnSec: 0, favMax: 0, pbDay: 0, newDay: 0, gLevel: 0, gStars: 0 },
      flags: { named: 0, owl: 0, bird: 0, styled: 0, backup: 0, stretch: 0, legacy: 0, welcomed: 0 },
      games: {}, cats: {}, ach: {}, gach: {}, howto: {}, today: blankToday(date), prevKinds: [], pending: { levelups: [], ach: [] }, log: [] };
  }

  /* ---------- sanitising: everything that comes from storage, an import or a game passes through here ---------- */
  function cleanGame(g) {
    g = isObj(g) ? g : {};
    var o = { n: clamp(g.n, 0, 1e6) | 0, sec: Math.round(clamp(g.sec, 0, 1e8)), runs: clamp(g.runs, 0, 1e6) | 0, pbs: clamp(g.pbs, 0, 1e6) | 0, first: clamp(g.first, 0, 4e12), last: clamp(g.last, 0, 4e12), best: null, low: g.low ? 1 : 0, lvl: clamp(g.lvl, 0, 1e6) | 0, stars: clamp(g.stars, 0, 1e6) | 0 };
    if (g.best != null && isFinite(+g.best)) o.best = clamp(g.best, -1e12, 1e12);
    return o;
  }
  function cleanToday(T, date) {   // a day that is over is kept until rollDay archives it
    if (isObj(T) && goodDay(T.date)) date = T.date;
    var o = blankToday(date); if (!isObj(T) || T.date !== date) return o;
    o.sec = clamp(T.sec, 0, 86400); o.minCred = clamp(T.minCred, 0, 1440) | 0; o.minSeen = clamp(T.minSeen, 0, 1440) | 0; o.learnSec = clamp(T.learnSec, 0, 86400); o.learnRuns = clamp(T.learnRuns, 0, 1000) | 0;
    o.runs = clamp(T.runs, 0, 1e5) | 0; o.runXp = clamp(T.runXp, 0, 1e5) | 0; o.pbs = clamp(T.pbs, 0, 1e5) | 0; o.favs = clamp(T.favs, 0, 1e5) | 0; o.bonus = T.bonus ? 1 : 0; o.gqN = clamp(T.gqN, 0, 100) | 0;
    ['games', 'cats'].forEach(function (f) { keys(T[f]).forEach(function (k) { if (safeKey(k)) o[f][k] = clamp(T[f][k], 0, 86400); }); });
    ['award', 'gach'].forEach(function (f) { keys(T[f]).forEach(function (k) { if (safeKey(k)) o[f][k] = clamp(T[f][k], 0, 1e5); }); });
    o.pbGames = (Array.isArray(T.pbGames) ? T.pbGames : []).filter(safeKey).slice(0, 200);
    o.newGames = (Array.isArray(T.newGames) ? T.newGames : []).filter(safeKey).slice(0, 200);
    o.quests = (Array.isArray(T.quests) ? T.quests : []).slice(0, 3).map(function (q) {
      if (!isObj(q) || !own(QUEST_BY, q.kind)) return null;
      var p = {}; if (isObj(q.param)) { if (typeof q.param.cat === 'string') p.cat = q.param.cat.slice(0, 32); if (typeof q.param.tag === 'string') p.tag = q.param.tag.slice(0, 32); if (typeof q.param.game === 'string') p.game = q.param.game.slice(0, 64); }
      return { kind: q.kind, tier: QUEST_BY[q.kind].tier, param: p, target: clamp(q.target, 1, 100), title: String(q.title || '').slice(0, 80), desc: String(q.desc || '').slice(0, 160), glyph: String(QUEST_BY[q.kind].glyph), prog: clamp(q.prog, 0, 100), done: clamp(q.done, 0, 4e12) };
    }).filter(Boolean);
    keys(T.gq).slice(0, 10).forEach(function (k) { var q = T.gq[k]; if (safeKey(k) && isObj(q)) o.gq[k] = { game: String(q.game || '').slice(0, 64), title: String(q.title || k).slice(0, 60), p: clamp(q.p, 0, 1), done: clamp(q.done, 0, 4e12), xp: clamp(q.xp, 0, 50) | 0, stars: clamp(q.stars, 0, 2) | 0 }; });
    return o;
  }
  function sanitize(raw, C, date) {
    var P = blank(isObj(raw) ? raw.seed : 1, date, ''); if (!isObj(raw)) return null;
    var s = P.stats, rs = isObj(raw.stats) ? raw.stats : {}, f = P.flags, rf = isObj(raw.flags) ? raw.flags : {};
    P.seed = (num(raw.seed, 1) >>> 0) || 1; P.born = goodDay(raw.born) ? raw.born : date;
    P.name = cleanName(raw.name) || 'Player';
    P.avatar = cosDef('avatar', raw.avatar) ? raw.avatar : 'fox'; P.hat = cosDef('hat', raw.hat) ? raw.hat : ''; P.frame = cosDef('frame', raw.frame) ? raw.frame : 'plain'; P.title = cosDef('title', raw.title) ? raw.title : 'auto';
    P.xp = Math.floor(clamp(raw.xp, 0, 1e6)); P.stars = Math.floor(clamp(raw.stars, 0, 1e6));
    var st = isObj(raw.streak) ? raw.streak : {};
    P.streak = { n: clamp(st.n, 0, 5000) | 0, best: clamp(st.best, 0, 5000) | 0, last: goodDay(st.last) ? st.last : '', grace: goodDay(st.grace) ? st.grace : '', rest: (Array.isArray(st.rest) ? st.rest : []).filter(goodDay).slice(-30) };
    if (P.streak.best < P.streak.n) P.streak.best = P.streak.n;
    keys(raw.days).forEach(function (k) { if (goodDay(k)) P.days[k] = clamp(raw.days[k], 0, 1440); });
    var dk = keys(P.days).sort(); while (dk.length > 200) delete P.days[dk.shift()];
    ['sec', 'learnSec'].forEach(function (k) { s[k] = clamp(rs[k], 0, 1e9); });
    ['runs', 'pbs', 'quests', 'fullDays', 'favMax', 'pbDay', 'newDay', 'gLevel', 'gStars'].forEach(function (k) { s[k] = clamp(rs[k], 0, 1e7) | 0; });
    Object.keys(f).forEach(function (k) { f[k] = rf[k] ? 1 : 0; });
    keys(raw.games).forEach(function (k) { if (safeKey(k) && (!C.known || C.known(k))) P.games[k] = cleanGame(raw.games[k]); });
    keys(raw.cats).forEach(function (k) { if (safeKey(k) && (!C.knownCat || C.knownCat(k))) { var c = raw.cats[k]; P.cats[k] = { first: clamp(isObj(c) ? c.first : 0, 0, 4e12), sec: Math.round(clamp(isObj(c) ? c.sec : 0, 0, 1e8)) }; } });
    keys(raw.ach).forEach(function (k) { if (safeKey(k) && (own(ACH_BY, k) || /^g:[^:]+:.+/.test(k))) P.ach[k] = clamp(raw.ach[k], 1, 4e12); });
    keys(raw.gach).slice(0, 200).forEach(function (k) { var a = raw.gach[k]; if (safeKey(k) && isObj(a)) P.gach[k] = { title: String(a.title || k).slice(0, 40), desc: String(a.desc || '').slice(0, 100), tier: own(XP.gameTier, a.tier) ? a.tier : 'bronze', game: String(a.game || '').slice(0, 64) }; });
    keys(raw.howto).forEach(function (k) { if (safeKey(k) && (!C.known || C.known(k))) P.howto[k] = 1; });
    P.today = cleanToday(raw.today, date);
    P.prevKinds = (Array.isArray(raw.prevKinds) ? raw.prevKinds : []).filter(function (k) { return own(QUEST_BY, k); }).slice(0, 4);
    var pd = isObj(raw.pending) ? raw.pending : {};
    P.pending = { levelups: (Array.isArray(pd.levelups) ? pd.levelups : []).map(function (n) { return clamp(n, 2, MAX_LEVEL) | 0; }).slice(-10), ach: (Array.isArray(pd.ach) ? pd.ach : []).filter(function (k) { return own(P.ach, k); }).slice(-60) };
    P.log = (Array.isArray(raw.log) ? raw.log : []).slice(-25).map(function (e) { return isObj(e) ? { t: clamp(e.t, 0, 4e12), xp: clamp(e.xp, 0, 1e5) | 0, why: String(e.why || '').slice(0, 60) } : null; }).filter(Boolean);
    return P;
  }

  /* ---------- the store ---------- */
  function memoryStorage() { var m = {}; return { getItem: function (k) { return own(m, k) ? m[k] : null; }, setItem: function (k, v) { m[k] = String(v); }, removeItem: function (k) { delete m[k]; } }; }

  function create(opts) {
    opts = opts || {};
    var store = opts.storage || memoryStorage(), now = opts.now || Date.now, rand = opts.random || Math.random;
    var catalog = opts.catalog || [], cats = opts.cats || [], legacy = opts.legacy || null;   // legacy(): {plays, bests, favs} from the portal's older keys
    var byId = {}; catalog.forEach(function (g) { byId[g.id] = g; });
    var catIds = cats.map(function (c) { return c.id; });
    var hooks = {}, queue = [], P = null, unsafe = false, quiet = false;
    var C = {
      known: function (id) { return !catalog.length || own(byId, id); }, knownCat: function (id) { return !catIds.length || catIds.indexOf(id) >= 0; },
      cat: function (id) { return own(byId, id) ? byId[id].cat : ''; }, tags: function (id) { return own(byId, id) ? byId[id].tags || [] : []; },
      catName: function (id) { for (var i = 0; i < cats.length; i++) if (cats[i].id === id) return cats[i].name.replace('Hyper-Casual', 'Quick play'); return id; }
    };

    function on(evt, fn) { (hooks[evt] = hooks[evt] || []).push(fn); return function () { hooks[evt] = (hooks[evt] || []).filter(function (f) { return f !== fn; }); }; }
    function fire(evt, data) { (hooks[evt] || []).slice().forEach(function (f) { try { f(data); } catch (e) { if (typeof console !== 'undefined') console.error(e); } }); }
    function emit(evt, data) { queue.push([evt, data]); }
    function flush() { var q = queue; queue = []; q.forEach(function (e) { fire(e[0], e[1]); }); if (q.length) fire('change', null); }

    function read() {
      var raw = null; try { raw = JSON.parse(store.getItem(KEY)); } catch (e) { raw = null; }
      return raw;
    }
    function write(p) { try { store.setItem(KEY, JSON.stringify(p)); unsafe = false; } catch (e) { unsafe = true; } }
    function today() { return dayStr(now()); }
    function newProfile() {
      var t = today(), seed = (Math.floor(rand() * 4294967295) >>> 0) || 1, p = blank(seed, t, randomName(rand));
      p.avatar = AVATARS[seed % AVATARS.length][0];
      if (legacy) { try { migrate(p, legacy()); } catch (e) {} }
      return p;
    }
    // Games played before profiles existed still count: they were tried, and their records are kept.
    function migrate(p, L) {
      if (!L) return; var n = 0, cnt = 0;
      keys(L.plays).forEach(function (id) {
        if (!C.known(id)) return; var e = L.plays[id] || {}, g = cleanGame({ n: e.n, first: e.ts || now(), last: e.ts || now(), sec: 0 });
        if (!g.n) return; p.games[id] = g; cnt++; var c = C.cat(id); if (c && !p.cats[c]) p.cats[c] = { first: g.first, sec: 0 };
      });
      keys(L.bests).forEach(function (id) { if (C.known(id) && L.bests[id] != null && isFinite(+L.bests[id])) { p.games[id] = p.games[id] || cleanGame({ first: now(), last: now() }); p.games[id].best = +L.bests[id]; } });
      p.stats.favMax = clamp(L.favs, 0, 1e4) | 0;
      if (cnt) { var bonus = Math.min(XP.legacyCap, XP.legacyPerGame * cnt); p.xp += bonus; p.log.push({ t: now(), xp: bonus, why: 'Welcome back: ' + cnt + ' games you already played' }); }
      p.flags.legacy = 1;
    }
    function load() {
      var t = today(), raw = read(), p = raw ? sanitize(raw, C, t) : null;
      if (!p && P && unsafe) return P;                     // storage refuses writes (private window): keep going in memory
      if (!p) { p = newProfile(); write(p); }
      return p;
    }
    function ctx(p) {
      var reporting = keys(p.games).filter(function (k) { return p.games[k].runs > 0 && own(byId, k); }).sort(function (a, b) { return (p.games[b].last || 0) - (p.games[a].last || 0); }).map(function (k) { return byId[k]; });
      var tagCount = {}; reporting.forEach(function (g) { (g.tags || []).forEach(function (t) { tagCount[t] = (tagCount[t] || 0) + 1; }); });
      var untriedCats = catIds.filter(function (c) { return !own(p.cats, c); });
      var favCat = '', best = 0; keys(p.cats).forEach(function (c) { if (p.cats[c].sec > best) { best = p.cats[c].sec; favCat = c; } });
      var learn = catalog.filter(function (g) { return g.cat === 'learning'; });
      var learnTried = learn.filter(function (g) { return p.games[g.id] && p.games[g.id].first; }).length;
      var lr = reporting.some(function (g) { return g.cat === 'learning'; });
      var ctxo = { untried: catalog.length - tried(p), untriedCats: untriedCats, catCount: catIds.length, favCat: favCat && p.cats[favCat].sec >= 120 ? favCat : '', learnGames: learn.length, learnTried: learnTried,
        reporting: reporting, reportingTag: tagCount.runner ? 'runner' : '', learnReporting: lr, cat: C.cat, tags: C.tags, catName: C.catName };
      return ctxo;
    }

    /* ----- XP, stars, log ----- */
    function logXp(p, n, why) { p.log.push({ t: now(), xp: n, why: String(why || '').slice(0, 60) }); if (p.log.length > 25) p.log.shift(); }
    function addXp(p, n, why, extra) {
      n = Math.round(num(n)); if (n <= 0) return 0;
      var before = levelOf(p.xp); p.xp = Math.min(1e6, p.xp + n); var after = levelOf(p.xp);
      logXp(p, n, why); if (quiet) return n; emit('xp', { xp: n, why: why, total: p.xp });
      for (var l = before + 1; l <= after; l++) { p.pending.levelups.push(l); if (p.pending.levelups.length > 10) p.pending.levelups.shift(); emit('levelup', { level: l, unlocks: unlocksAt(l) }); }
      return n;
    }
    function addStars(p, n) { n = Math.round(num(n)); if (n > 0) { p.stars = Math.min(1e6, p.stars + n); emit('stars', { stars: n, total: p.stars }); } }

    /* ----- cosmetics ----- */
    function unlockedBy(p, def) {
      var u = def && def.unlock; if (!u) return true;
      if (u.level) return levelOf(p.xp) >= u.level;
      if (u.ach) return own(p.ach, u.ach);
      return false;
    }
    function isUnlocked(kind, id, p) { p = p || P; return !!cosDef(kind, id) && unlockedBy(p, cosDef(kind, id)); }
    function unlockText(kind, id) {
      var d = cosDef(kind, id), u = d && d.unlock; if (!u) return '';
      if (u.level) return 'Reach level ' + u.level;
      if (u.ach) return 'Earn the ' + (ACH_BY[u.ach] ? ACH_BY[u.ach].title : u.ach) + ' badge';
      return '';
    }
    function unlocksAt(level) {
      var out = []; ['hat', 'frame', 'theme', 'accent'].forEach(function (k) { COSMETICS[k].forEach(function (d) { if (d.unlock && d.unlock.level === level) out.push({ kind: k, id: d.id, name: d.name }); }); });
      LEVEL_TITLES.forEach(function (t) { if (t[0] === level) out.push({ kind: 'title', id: 'auto', name: t[1] }); });
      return out;
    }
    function titleOf(p) {
      p = p || P; var l = levelOf(p.xp);
      if (p.title !== 'auto' && isUnlocked('title', p.title, p)) return cosDef('title', p.title).name;
      return levelTitle(l);
    }

    /* ----- achievements ----- */
    function progressOf(a, p) { var need = a.need || catIds.length || 1; var have = a.have(p, C); return { have: Math.min(have, need), need: need, done: own(p.ach, a.id) || have >= need }; }
    function unlock(p, a, silent) {
      if (own(p.ach, a.id)) return false;
      p.ach[a.id] = now(); var r = XP.tier[a.tier]; addXp(p, r[0], 'Badge: ' + a.title); addStars(p, r[1]);
      if (!silent) { p.pending.ach.push(a.id); if (p.pending.ach.length > 60) p.pending.ach.shift(); emit('achievement', { id: a.id, title: a.title, tier: a.tier, glyph: a.glyph, fam: a.fam, desc: a.desc, xp: r[0], stars: r[1] }); }
      return true;
    }
    function checkAch(p, silent) {
      for (var pass = 0; pass < 6; pass++) {
        var any = false;
        for (var i = 0; i < ACH.length; i++) { var a = ACH[i]; if (!own(p.ach, a.id) && progressOf(a, p).done) any = unlock(p, a, silent) || any; }
        if (!any) break;
      }
    }

    /* ----- streak ----- */
    function touchStreak(p, date, noXp) {
      var s = p.streak; if (s.last === date) return;
      if (s.last) {
        var gap = dayNum(date) - dayNum(s.last);
        if (gap <= 0) return;                                     // the clock went back: keep what we have
        if (gap === 1) s.n++;
        else if (gap === 2 && (!s.grace || dayNum(date) - dayNum(s.grace) >= 7)) { s.n++; s.grace = addDays(date, -1); s.rest.push(s.grace); if (s.rest.length > 30) s.rest.shift(); emit('rest', { day: s.grace }); }
        else { var was = s.n; s.n = 1; if (was > 1) emit('streak-reset', { was: was, best: Math.max(s.best, was) }); }
      } else s.n = 1;
      s.last = date; if (s.n > s.best) s.best = s.n;
      if (s.n >= 2 && !noXp) addXp(p, Math.min(XP.streakCap, XP.streakStep * s.n), 'Streak: day ' + s.n);
      emit('streak', { n: s.n, best: s.best });
    }

    /* ----- the day ----- */
    function rollDay(p) {
      var t = today(); if (p.today.date === t) { if (!p.today.quests.length) { p.today.quests = pickQuests(p, t); return true; } return false; }
      var old = p.today;
      if (goodDay(old.date) && dayNum(t) > dayNum(old.date)) {
        if (allDone(old)) p.stats.fullDays++;
        p.prevKinds = old.quests.map(function (q) { return q.kind; });
      }
      p.today = blankToday(t); p.today.quests = pickQuests(p, t);
      return true;
    }
    function pickQuests(p, date) {
      var r = rng(hash(p.seed + '|' + date)), c = ctx(p), out = [], used = {};
      ['easy', 'medium', 'hard'].forEach(function (tier) {
        var cands = [];
        QUESTS.forEach(function (d) { if (d.tier !== tier || used[d.kind]) return; var w = d.w(c, { lvl: levelOf(p.xp), stats: p.stats, games: p.games }); if (w > 0) cands.push([d, w]); });
        var fresh = cands.filter(function (x) { return p.prevKinds.indexOf(x[0].kind) < 0; }); if (fresh.length) cands = fresh;
        if (!cands.length) return;
        var total = cands.reduce(function (n, x) { return n + x[1]; }, 0), roll = r() * total, pick = cands[0][0];
        for (var i = 0; i < cands.length; i++) { roll -= cands[i][1]; if (roll <= 0) { pick = cands[i][0]; break; } }
        var m = pick.make(c, { lvl: levelOf(p.xp), stats: p.stats, games: p.games }, r); if (!m) return;
        used[pick.kind] = 1;
        out.push({ kind: pick.kind, tier: tier, param: m.param || {}, target: m.target, title: m.title, desc: m.desc, glyph: pick.glyph, prog: 0, done: 0 });
      });
      return out;
    }
    function syncQuests(p) {
      var c = null, T = p.today, qualified = T.sec >= XP.streakSec || T.runs > 0;   // the day counts from 20 s of play or a finished round — same rule as the streak
      T.quests.forEach(function (q) {
        var d = QUEST_BY[q.kind]; if (!d) return; c = c || ctx(p);
        // minute-shaped quests read the day's seconds, so they stay at zero until the day qualifies: opening a game and leaving earns no quest credit
        var raw = (qualified || !/^(min|learn-5|cat-min)/.test(q.kind)) ? d.prog(T, p, c, q) : 0;
        q.prog = Math.min(q.target, Math.round(raw * 100) / 100);
        if (!q.done && q.prog >= q.target) {
          q.done = now(); var r = XP.quest[q.tier]; p.stats.quests++; addXp(p, r[0], 'Quest: ' + q.title); addStars(p, r[1]);
          emit('quest', { kind: q.kind, title: q.title, tier: q.tier, xp: r[0], stars: r[1] });
        }
      });
      if (!p.today.bonus && allDone(p.today)) { p.today.bonus = 1; addXp(p, XP.questSet[0], 'All three quests done'); addStars(p, XP.questSet[1]); emit('quest-set', { xp: XP.questSet[0], stars: XP.questSet[1] }); }
    }

    /* ----- one write path: reload, roll the day, change, check, save, then tell the listeners ----- */
    function mutate(fn) {
      P = load(); rollDay(P);
      var res; try { res = fn(P); } catch (e) { if (typeof console !== 'undefined') console.error(e); }
      syncQuests(P); checkAch(P);
      write(P); flush(); return res;
    }
    function get() {
      P = load(); var changed = rollDay(P), n = queue.length; syncQuests(P);
      if (changed || queue.length > n) { checkAch(P); write(P); flush(); }
      return P;
    }

    /* ----- sessions: what the portal knows while a game frame is open ----- */
    function startSession(id, o) {
      o = o || {};
      return { game: id, active: 0, runActive: 0, scene: '', lastOver: -1e9, lastOverScore: null, lastRun: -1e9, cheated: !!o.cheated, runs: 0, saveSeen: {}, lastPb: -1e9, pbsToday: 0, started: now() };
    }
    function gameOf(p, id) { if (!p.games[id]) p.games[id] = cleanGame({}); return p.games[id]; }
    function startPlay(id) {   // the player pressed Play: count a visit
      if (!safeKey(id)) return; mutate(function (p) { var g = gameOf(p, id); g.n++; g.last = now(); });
    }
    function tick(sess, dt, active) {
      dt = clamp(dt, 0, 30); if (!sess || !dt || !active) return;
      var id = sess.game; if (!safeKey(id)) return;
      sess.active += dt; sess.runActive += dt;
      if (sess.cheated) {   // codes on: a fun mode. The day still counts for the streak, but nothing earns XP.
        if (sess.active >= XP.streakSec) mutate(function (p) { touchStreak(p, p.today.date, true); if (!p.days[p.today.date]) p.days[p.today.date] = 0.4; });
        return;
      }
      mutate(function (p) {
        var t = p.today, g = gameOf(p, id), ms = now(), hour = new Date(ms).getHours(), cat = C.cat(id);
        g.sec = Math.round((g.sec + dt) * 10) / 10; g.last = ms;
        t.sec += dt; t.games[id] = (t.games[id] || 0) + dt; p.stats.sec += dt;
        if (cat) { t.cats[cat] = (t.cats[cat] || 0) + dt; if (cat === 'learning') { t.learnSec += dt; p.stats.learnSec += dt; } }
        // the time-of-day flags need a qualified day (the same 20 s that makes a day count), so opening a
        // game and leaving straight away earns nothing at any hour: no XP, no badge, no quest credit
        if (t.sec >= XP.streakSec) { if (hour >= 19 && hour < 22) p.flags.owl = 1; if (hour < 8) p.flags.bird = 1; }
        var whole = Math.floor(t.sec / 60);
        while (t.minSeen < whole) { t.minSeen++; if (t.minCred < XP.minuteCap) { t.minCred++; addXp(p, XP.minute, 'Played a minute'); } }
        if (t.sec >= XP.streakSec) touchStreak(p, t.date);
        if (!g.first && g.sec >= XP.playSec) { g.first = ms; addXp(p, XP.firstPlay, 'First time playing ' + (byId[id] ? byId[id].title : 'a game')); t.newGames.push(id); p.stats.newDay = Math.max(p.stats.newDay, t.newGames.length); }
        if (cat && !own(p.cats, cat) && t.cats[cat] >= XP.playSec) { p.cats[cat] = { first: ms, sec: 0 }; addXp(p, XP.newCategory, 'New category: ' + C.catName(cat)); }
        if (cat && own(p.cats, cat)) p.cats[cat].sec = Math.round((p.cats[cat].sec + dt) * 10) / 10;
        if (t.sec >= XP.streakSec) p.days[t.date] = Math.round(t.sec / 6) / 10;   // a day is "played" once it counts for the streak
        trimDays(p);
      });
    }
    function trimDays(p) { var k = keys(p.days).sort(); while (k.length > 200) delete p.days[k.shift()]; }

    // A finished round. score may be missing. lower: a lower score is better (a time, a rank).
    function run(sess, o) {
      o = o || {}; if (!sess || sess.cheated || !safeKey(sess.game)) return { xp: 0, blocked: sess && sess.cheated ? 'codes' : 'no session' };
      var ms = now(), id = sess.game, res = { xp: 0, pb: false };
      if (ms - sess.lastRun < XP.runGap * 1000) return { xp: 0, blocked: 'too soon' };
      if (sess.runActive < XP.minRunSec) return { xp: 0, blocked: 'too short' };
      sess.lastRun = ms; sess.runActive = 0; sess.runs++;
      var score = o.score != null && isFinite(+o.score) ? +o.score : null, low = !!o.lower;
      mutate(function (p) {
        var t = p.today, g = gameOf(p, id), cat = C.cat(id), first = g.runs === 0;
        g.runs++; p.stats.runs++; t.runs++; g.last = ms; if (cat === 'learning') { t.learnRuns = (t.learnRuns || 0) + 1; }
        touchStreak(p, t.date); if (!p.days[t.date]) p.days[t.date] = 0.4;
        var xp = 0, prev = g.best, isPb = false;
        if (score != null) {
          if (prev == null) { g.best = score; g.low = low ? 1 : 0; }
          else { var better = low ? score < prev : score > prev; if (better) { isPb = true; g.best = score; g.pbs++; p.stats.pbs++; t.pbs++; if (t.pbGames.indexOf(id) < 0) t.pbGames.push(id); p.stats.pbDay = Math.max(p.stats.pbDay, t.pbGames.length); } }
        }
        if (t.runXp < XP.runsPerDay) {
          var ratio = 0.5;
          if (score != null && prev != null && prev !== 0) ratio = clamp(low ? prev / Math.max(score, 1e-9) : score / prev, 0, 1);
          xp = XP.runBase + Math.round(XP.runScale * ratio) + (isPb && prev != null ? XP.runPB : 0) + (first ? XP.runFirst : 0);
          t.runXp++;
          addXp(p, xp, (isPb && prev != null ? 'New best in ' : 'Finished a round of ') + (byId[id] ? byId[id].title : 'a game'));
        }
        res.xp = xp; res.pb = isPb && prev != null; res.score = score;
        if (res.pb) emit('best', { game: id, score: score });
      });
      return res;
    }
    // The game says where it is: title | play | over, and optionally score, level, stars, lower.
    function onState(sess, s) {
      if (!sess || !isObj(s)) return null; var scene = typeof s.scene === 'string' ? s.scene : '', out = null;
      if (typeof s.level === 'number' || typeof s.stars === 'number') mutate(function (p) {
        var g = gameOf(p, sess.game); if (isFinite(s.level)) { g.lvl = Math.max(g.lvl, clamp(s.level, 0, 1e6) | 0); p.stats.gLevel = Math.max(p.stats.gLevel, g.lvl); }
        if (isFinite(s.stars)) { g.stars = Math.max(g.stars, clamp(s.stars, 0, 1e6) | 0); p.stats.gStars = Math.max(p.stats.gStars, g.stars); }
      });
      if (scene === 'play') { if (sess.scene !== 'play') sess.runActive = 0; sess.scene = 'play'; }
      else if (scene === 'over') {
        var sc = s.score != null && isFinite(+s.score) ? +s.score : null, ms = now();
        var dup = sess.scene === 'over' && sc === sess.lastOverScore && ms - sess.lastOver < 3000;   // the same result reported twice
        if (!dup) out = run(sess, { score: sc, lower: s.lower });
        sess.scene = 'over'; sess.lastOverScore = sc; sess.lastOver = ms;
      } else if (scene) sess.scene = scene;
      return out;
    }
    // A save the SDK noticed under a key the game declares as its progress. Only a rising best-like number counts:
    // autosaves that change other things are activity, never XP.
    function onSaved(sess, o) {
      if (!sess || sess.cheated || !o || o.best == null || !isFinite(+o.best)) return null;
      var ms = now(), best = +o.best, res = null;
      mutate(function (p) {
        var g = gameOf(p, sess.game), t = p.today, low = !!o.lower, prev = g.best;
        if (prev == null) { g.best = best; g.low = low ? 1 : 0; return; }
        var better = low ? best < prev : best > prev; if (!better) return;
        g.best = best;
        var n = (t.gach['pb:' + sess.game] || 0);
        if (ms - sess.lastPb < XP.pbGap * 1000 || n >= XP.pbPerGameDay) return;   // limit inferred bests
        sess.lastPb = ms; t.gach['pb:' + sess.game] = n + 1;
        g.pbs++; p.stats.pbs++; t.pbs++; if (t.pbGames.indexOf(sess.game) < 0) t.pbGames.push(sess.game); p.stats.pbDay = Math.max(p.stats.pbDay, t.pbGames.length);
        if (sess.active >= XP.minRunSec && t.runXp < XP.runsPerDay) { t.runXp++; addXp(p, XP.runBase + XP.runPB, 'New best in ' + (byId[sess.game] ? byId[sess.game].title : 'a game')); }
        res = { pb: true }; emit('best', { game: sess.game, score: best });
      });
      return res;
    }

    /* ----- opt-in calls from games (already clamped again here: never trust the frame) ----- */
    function award(sess, o) {
      if (!sess || sess.cheated || !isObj(o) || !safeKey(sess.game)) return 0; var xp = Math.floor(clamp(o.xp, 0, XP.awardMax)); if (xp < 1) return 0;
      var granted = 0;
      mutate(function (p) {
        var t = p.today, used = t.award[sess.game] || 0, room = Math.max(0, XP.awardPerGameDay - used); granted = Math.min(xp, room); if (!granted) return;
        t.award[sess.game] = used + granted; addXp(p, granted, String(o.reason || 'Bonus').slice(0, 50) + ' (' + (byId[sess.game] ? byId[sess.game].title : 'game') + ')');
      });
      return granted;
    }
    function gameAchievement(sess, id, o) {
      if (!sess || sess.cheated || !safeKey(sess.game) || typeof id !== 'string' || !/^[A-Za-z0-9_.-]{1,32}$/.test(id)) return false; o = isObj(o) ? o : {};
      var key = 'g:' + sess.game + ':' + id, done = false;
      mutate(function (p) {
        if (own(p.ach, key)) return; var used = p.today.gach['ga:' + sess.game] || 0; if (used >= XP.gachPerGameDay) return; p.today.gach['ga:' + sess.game] = used + 1;
        var tier = own(XP.gameTier, o.tier) ? o.tier : 'bronze', title = String(o.title || id.replace(/[-_.]+/g, ' ')).slice(0, 40), desc = String(o.desc || '').slice(0, 100);
        p.gach[key] = { title: title, desc: desc, tier: tier, game: sess.game }; p.ach[key] = now(); var r = XP.gameTier[tier]; addXp(p, r[0], 'Badge: ' + title); addStars(p, r[1]);
        p.pending.ach.push(key); emit('achievement', { id: key, title: title, tier: tier, glyph: 'medal', fam: 'game', desc: desc, xp: r[0], stars: r[1], game: sess.game }); done = true;
      });
      return done;
    }
    // progress: 0..1 (or {value, target}); opts {title, xp, stars}. Shown as an extra goal under the daily quests.
    function gameQuest(sess, id, progress, o) {
      if (!sess || sess.cheated || !safeKey(sess.game) || typeof id !== 'string' || !/^[A-Za-z0-9_.-]{1,32}$/.test(id)) return null; o = isObj(o) ? o : {};
      var p01 = isObj(progress) ? num(progress.value) / Math.max(1e-9, num(progress.target, 1)) : num(progress); p01 = clamp(p01, 0, 1);
      var key = sess.game + ':' + id, out = null;
      mutate(function (p) {
        var t = p.today, q = t.gq[key];
        if (!q) { if (t.gqN >= XP.gqPerDay) return; t.gqN++; q = t.gq[key] = { game: sess.game, title: String(o.title || id.replace(/[-_.]+/g, ' ')).slice(0, 60), p: 0, done: 0, xp: clamp(o.xp == null ? 15 : o.xp, 5, 40) | 0, stars: clamp(o.stars == null ? 1 : o.stars, 0, 2) | 0 }; }
        if (p01 > q.p) q.p = p01;
        if (!q.done && q.p >= 1) { q.done = now(); addXp(p, q.xp, 'Goal: ' + q.title); addStars(p, q.stars); emit('quest', { kind: 'game', title: q.title, tier: 'game', xp: q.xp, stars: q.stars }); }
        out = { p: q.p, done: !!q.done };
      });
      return out;
    }

    /* ----- things the portal tells us happened ----- */
    function noteFav(count, added) { mutate(function (p) { p.stats.favMax = Math.max(p.stats.favMax, clamp(count, 0, 1e4) | 0); if (added) p.today.favs++; }); }
    function noteHowTo(id) { if (safeKey(id)) mutate(function (p) { p.howto[id] = 1; }); }
    function noteFlag(name) { if (own(blank(1, '2026-01-01', '').flags, name)) mutate(function (p) { p.flags[name] = 1; }); }
    function markSeen() { mutate(function (p) { p.pending.ach = []; }); }
    function takeLevelUps() { var out = []; mutate(function (p) { out = p.pending.levelups.slice(); p.pending.levelups = []; }); return out; }

    /* ----- the player's own choices ----- */
    function setName(s) { var bad = nameProblem(s); if (bad) return bad; mutate(function (p) { p.name = cleanName(s); p.flags.named = 1; }); return ''; }
    function equip(kind, id) {
      if (kind === 'avatar' && cosDef('avatar', id)) { mutate(function (p) { p.avatar = id; p.flags.named = 1; }); return true; }
      if (kind === 'hat' && (id === '' || isUnlocked('hat', id, load()))) { mutate(function (p) { p.hat = id; }); return true; }
      if (kind === 'frame' && isUnlocked('frame', id, load())) { mutate(function (p) { p.frame = id; }); return true; }
      if (kind === 'title' && isUnlocked('title', id, load())) { mutate(function (p) { p.title = id; }); return true; }
      return false;
    }
    function randomizeName() { return randomName(rand); }

    /* ----- export and import ----- */
    // A lean copy: arrays for the per-game rows, days as counts, no daily counters. It is what leaves the device.
    function pack(p) {
      p = p || get();
      var g = {}; keys(p.games).forEach(function (k) { var x = p.games[k]; if (x.n || x.sec || x.runs || x.first) g[k] = [x.n, Math.round(x.sec), x.runs, x.pbs, x.best, x.first, x.last, x.low, x.lvl, x.stars]; });
      var c = {}; keys(p.cats).forEach(function (k) { c[k] = [p.cats[k].first, Math.round(p.cats[k].sec)]; });
      var d = {}; keys(p.days).sort().slice(-120).forEach(function (k) { d[k] = p.days[k]; });
      return { v: VERSION, seed: p.seed, born: p.born, name: p.name, av: p.avatar, hat: p.hat, fr: p.frame, ti: p.title, xp: p.xp, st: p.stars, sk: [p.streak.n, p.streak.best, p.streak.last, p.streak.grace, p.streak.rest.slice(-10)],
        s: [p.stats.sec, p.stats.runs, p.stats.pbs, p.stats.quests, p.stats.fullDays, p.stats.learnSec, p.stats.favMax, p.stats.pbDay, p.stats.newDay, p.stats.gLevel, p.stats.gStars],
        f: [p.flags.named, p.flags.owl, p.flags.bird, p.flags.styled, p.flags.backup, p.flags.stretch, p.flags.legacy, p.flags.welcomed], g: g, c: c, d: d, a: p.ach, ga: p.gach, h: keys(p.howto) };
    }
    function unpack(o, date) {
      if (!isObj(o) || o.v !== VERSION) return null;
      var raw = blank(o.seed, date, o.name), sk = Array.isArray(o.sk) ? o.sk : [], s = Array.isArray(o.s) ? o.s : [], f = Array.isArray(o.f) ? o.f : [];
      raw.born = o.born; raw.name = o.name; raw.avatar = o.av; raw.hat = o.hat; raw.frame = o.fr; raw.title = o.ti; raw.xp = o.xp; raw.stars = o.st;
      raw.streak = { n: sk[0], best: sk[1], last: sk[2], grace: sk[3], rest: sk[4] };
      ['sec', 'runs', 'pbs', 'quests', 'fullDays', 'learnSec', 'favMax', 'pbDay', 'newDay', 'gLevel', 'gStars'].forEach(function (k, i) { raw.stats[k] = s[i]; });
      ['named', 'owl', 'bird', 'styled', 'backup', 'stretch', 'legacy', 'welcomed'].forEach(function (k, i) { raw.flags[k] = f[i]; });
      raw.games = {}; keys(o.g).forEach(function (k) { var x = o.g[k]; if (Array.isArray(x)) raw.games[k] = { n: x[0], sec: x[1], runs: x[2], pbs: x[3], best: x[4], first: x[5], last: x[6], low: x[7], lvl: x[8], stars: x[9] }; });
      raw.cats = {}; keys(o.c).forEach(function (k) { if (Array.isArray(o.c[k])) raw.cats[k] = { first: o.c[k][0], sec: o.c[k][1] }; });
      raw.days = o.d; raw.ach = o.a; raw.gach = o.ga; raw.howto = {}; (Array.isArray(o.h) ? o.h : []).forEach(function (k) { if (safeKey(k)) raw.howto[k] = 1; });
      return sanitize(raw, C, date);
    }
    function b64u(str) {
      var bytes = typeof Buffer !== 'undefined' ? Buffer.from(str, 'utf8').toString('base64') : btoa(unescape(encodeURIComponent(str)));
      return bytes.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    function unb64u(s) {
      s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
      return typeof Buffer !== 'undefined' ? Buffer.from(s, 'base64').toString('utf8') : decodeURIComponent(escape(atob(s)));
    }
    function check(str) { var h = hash('cap1|' + str).toString(36); return ('0000' + h).slice(-4); }
    function exportCode() { var body = b64u(JSON.stringify(pack())); return 'CAP1-' + body + '-' + check(body); }
    function exportJSON() { return { app: 'calebs-arcade-profile', v: VERSION, at: new Date(now()).toISOString(), profile: pack() }; }
    function parseImport(input) {
      var t = String(input == null ? '' : input).trim(), obj = null;
      if (!t) return { error: 'Paste your code or choose your backup file.' };
      try {
        if (t.charAt(0) === '{') { var j = JSON.parse(t); obj = j && j.app === 'calebs-arcade-profile' ? j.profile : null; if (!obj && j && j.profile && j.profile.v) obj = j.profile; }
        else {
          var m = /^CAP1-([A-Za-z0-9_-]+)-([0-9a-z]{4})$/.exec(t.replace(/\s+/g, ''));
          if (!m) return { error: 'That does not look like a profile code.' };
          if (check(m[1]) !== m[2]) return { error: 'The code has a typo. Check it and try again.' };
          obj = JSON.parse(unb64u(m[1]));
        }
      } catch (e) { return { error: 'That does not look like a profile code.' }; }
      var p = obj && unpack(obj, today()); if (!p) return { error: 'That backup is not from this arcade.' };
      return { profile: p };
    }
    function better(low, a, b) { if (a == null) return b; if (b == null) return a; return low ? Math.min(a, b) : Math.max(a, b); }
    // Combine two profiles into the best of both: never loses anything, never adds anything twice, same result run twice.
    function merge(a, b) {
      var o = clone(a), bx = b.xp > a.xp;
      if (bx) { o.name = b.name; o.avatar = b.avatar; o.hat = b.hat; o.frame = b.frame; o.title = b.title; o.born = goodDay(b.born) && (!goodDay(a.born) || dayNum(b.born) < dayNum(a.born)) ? b.born : a.born; }
      o.xp = Math.max(a.xp, b.xp); o.stars = Math.max(a.stars, b.stars);
      var la = a.streak.last, lb = b.streak.last, later = dayNum(lb) > dayNum(la) || (!la && lb) ? b.streak : a.streak;
      o.streak = { n: later.n, best: Math.max(a.streak.best, b.streak.best), last: later.last, grace: dayNum(b.streak.grace) > dayNum(a.streak.grace) || !a.streak.grace ? b.streak.grace : a.streak.grace, rest: later.rest.slice() };
      keys(b.days).forEach(function (k) { o.days[k] = Math.max(o.days[k] || 0, b.days[k]); });
      Object.keys(o.stats).forEach(function (k) { o.stats[k] = Math.max(a.stats[k], b.stats[k]); });
      Object.keys(o.flags).forEach(function (k) { o.flags[k] = a.flags[k] || b.flags[k] ? 1 : 0; });
      keys(b.games).forEach(function (k) {
        var x = a.games[k], y = b.games[k]; if (!x) { o.games[k] = clone(y); return; }
        var low = x.low || y.low;
        o.games[k] = { n: Math.max(x.n, y.n), sec: Math.max(x.sec, y.sec), runs: Math.max(x.runs, y.runs), pbs: Math.max(x.pbs, y.pbs), first: x.first && y.first ? Math.min(x.first, y.first) : (x.first || y.first), last: Math.max(x.last, y.last),
          best: better(low, x.best, y.best), low: low ? 1 : 0, lvl: Math.max(x.lvl, y.lvl), stars: Math.max(x.stars, y.stars) };
      });
      keys(b.cats).forEach(function (k) { var x = o.cats[k], y = b.cats[k]; o.cats[k] = x ? { first: x.first && y.first ? Math.min(x.first, y.first) : (x.first || y.first), sec: Math.max(x.sec, y.sec) } : clone(y); });
      keys(b.ach).forEach(function (k) { o.ach[k] = own(o.ach, k) ? Math.min(o.ach[k], b.ach[k]) : b.ach[k]; });
      keys(b.gach).forEach(function (k) { if (!o.gach[k]) o.gach[k] = clone(b.gach[k]); });
      keys(b.howto).forEach(function (k) { o.howto[k] = 1; });
      return o;
    }
    function importProfile(input, mode) {
      var r = typeof input === 'string' ? parseImport(input) : { profile: input }; if (r.error) return r;
      var before = load(), res = { ok: true };
      mutate(function (p) {
        var m = mode === 'replace' ? r.profile : merge(p, r.profile);
        m.today = p.today; m.pending = p.pending; m.log = p.log; m.prevKinds = p.prevKinds; if (mode !== 'replace') m.seed = p.seed;
        var lv = levelOf(m.xp);
        keys(P).forEach(function (k) { delete P[k]; }); keys(m).forEach(function (k) { P[k] = m[k]; });
        res.level = lv; res.xp = m.xp; res.gained = m.xp - before.xp;
        quiet = true; try { checkAch(P, true); } finally { quiet = false; }
      });
      return res;
    }
    function reset() { try { store.removeItem(KEY); } catch (e) {} P = null; get(); flush(); }

    // What a game may see: nothing personal, just where the player is.
    function snapshot() {
      var p = get(), li = levelInfo(p.xp); return { level: li.level, xp: p.xp, into: li.into, need: li.need, streak: p.streak.n, stars: p.stars, avatar: p.avatar, title: titleOf(p) };
    }

    return { on: on, get: get, snapshot: snapshot, levelInfo: function () { return levelInfo(get().xp); }, title: function () { return titleOf(get()); },
      startSession: startSession, startPlay: startPlay, tick: tick, run: run, onState: onState, onSaved: onSaved, award: award, achievement: gameAchievement, quest: gameQuest,
      noteFav: noteFav, noteHowTo: noteHowTo, noteFlag: noteFlag, markSeen: markSeen, takeLevelUps: takeLevelUps,
      unlocksAt: unlocksAt, setName: setName, equip: equip, randomName: randomizeName, isUnlocked: function (k, id) { return isUnlocked(k, id, get()); }, unlockText: unlockText,
      achievements: function () { var p = get(); return ACH.map(function (a) { var pr = progressOf(a, p); return { id: a.id, fam: a.fam, tier: a.tier, title: a.title, desc: a.desc, glyph: a.glyph, have: pr.have, need: pr.need, done: own(p.ach, a.id), ts: p.ach[a.id] || 0, isNew: p.pending.ach.indexOf(a.id) >= 0 }; }).concat(keys(p.gach).map(function (k) { var g = p.gach[k]; return { id: k, fam: 'game', tier: g.tier, title: g.title, desc: g.desc, glyph: 'medal', have: 1, need: 1, done: true, ts: p.ach[k] || 0, game: g.game, isNew: p.pending.ach.indexOf(k) >= 0 }; })); },
      quests: function () { var p = get(); return { date: p.today.date, list: p.today.quests.map(function (q) { return Object.assign({}, q, { xp: XP.quest[q.tier][0], stars: XP.quest[q.tier][1] }); }), bonus: !!p.today.bonus, extra: keys(p.today.gq).map(function (k) { return Object.assign({ key: k }, p.today.gq[k]); }), setXp: XP.questSet[0], setStars: XP.questSet[1] }; },
      exportCode: exportCode, exportJSON: exportJSON, parseImport: parseImport, importProfile: importProfile, pack: pack, reset: reset,
      storageOk: function () { return !unsafe; }, _mutate: mutate };
  }

  return { create: create, VERSION: VERSION, KEY: KEY, MAX_LEVEL: MAX_LEVEL, XP: XP, xpNeed: xpNeed, levelOf: levelOf, levelInfo: levelInfo, LEVEL_XP: LEVEL_XP, ACH: ACH, ACH_BY: ACH_BY, FAMS: FAMS, COSMETICS: COSMETICS, LEVEL_TITLES: LEVEL_TITLES, QUESTS: QUESTS, AVATARS: AVATARS,
    dayStr: dayStr, dayNum: dayNum, addDays: addDays, weekday: weekday, cleanName: cleanName, nameProblem: nameProblem, randomName: randomName, sanitize: sanitize, blank: blank, memoryStorage: memoryStorage, levelTitle: levelTitle, cosDef: cosDef, rng: rng, hash: hash };
});

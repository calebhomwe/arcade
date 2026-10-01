/* progression-kit.js: the numbers behind docs/playbook/PROGRESSION.md, dependency-free and pure (no clock, no storage).
 * Tested in Chromium and Playwright WebKit by tests/progression-test.html. Dates are local YYYY-MM-DD strings. */
(function (G) {
  'use strict';

  /* 1. XP curves. poly: base * n^p (gentle, most games). exp: base * g^(n-1) (idle games). step: base + step*(n-1) (Hay Day style late game). */
  const xpFor = (n, { type = 'poly', base = 60, p = 1.6, g = 1.18, step = 40 } = {}) =>
    Math.round(type === 'exp' ? base * Math.pow(g, n - 1) : type === 'step' ? base + step * (n - 1) : base * Math.pow(n, p));
  function levelFromXp(totalXp, curve) {                      // returns { level, into, need } where level starts at 1
    let level = 1, left = totalXp, need = xpFor(1, curve);
    while (left >= need) { left -= need; level++; need = xpFor(level, curve); }
    return { level, into: left, need };
  }
  const totalXpTo = (level, curve) => { let s = 0; for (let n = 1; n < level; n++) s += xpFor(n, curve); return s; };

  /* 2. Upgrade shop costs (Cookie Clicker: cost = base * 1.15^owned) and the closed-form bulk buy. */
  const costOf = (base, owned, growth = 1.15) => Math.ceil(base * Math.pow(growth, owned));
  const costOfMany = (base, owned, k, growth = 1.15) => Math.ceil(base * Math.pow(growth, owned) * (Math.pow(growth, k) - 1) / (growth - 1));
  const maxAffordable = (base, owned, coins, growth = 1.15) => {
    const first = base * Math.pow(growth, owned); if (coins < first) return 0;
    let k = Math.floor(Math.log((coins * (growth - 1)) / first + 1) / Math.log(growth));
    while (k > 0 && costOfMany(base, owned, k, growth) > coins) k--;    // guard against float rounding
    return k;
  };

  /* 3. Offline earnings with a cap and a haircut, so coming back is a treat and never a chore. */
  const offlineEarnings = (perSec, awaySec, { capHours = 8, efficiency = 0.5 } = {}) => Math.floor(perSec * Math.min(awaySec, capHours * 3600) * efficiency);

  /* 4. Stars from a score or a move count (Candy Crush style thresholds). Three stars is "great", one is "you finished". */
  const stars = (value, [one, two, three], { lowerIsBetter = false } = {}) => {
    const ok = lowerIsBetter ? t => value <= t : t => value >= t;
    return ok(three) ? 3 : ok(two) ? 2 : ok(one) ? 1 : 0;
  };

  /* 5. A kid-safe "streak": a week of stamps that resets on Monday without shame, plus a lifetime days-played counter that never resets. */
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function weekStamps(playedDays, today) {                   // Monday-first week containing `today`
    const t = parse(today), dow = (t.getDay() + 6) % 7, days = [];
    for (let i = 0; i < 7; i++) { const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - dow + i); days.push(playedDays.includes(iso(d))); }
    return { stamps: days, count: days.filter(Boolean).length, lifetime: new Set(playedDays).size, chestReady: days.filter(Boolean).length >= 5 };
  }

  /* 6. Daily challenge: everybody gets the same one for a given local date, and it needs no server. */
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const dailySeed = (dateIso, gameId) => hashStr(gameId + '|' + dateIso);
  function dailyChallenge(dateIso, gameId, goals) { const r = mulberry32(dailySeed(dateIso, gameId)); return { seed: dailySeed(dateIso, gameId), goal: goals[Math.floor(r() * goals.length)], bonus: 1 + Math.floor(r() * 3) }; }

  /* 7. Unlock cadence: when does the k-th of n things unlock? Early ones come fast (every 1-2 levels), later ones stretch out. */
  const unlockLevels = (n, maxLevel, ease = 1.6) => Array.from({ length: n }, (_, k) => Math.max(k + 1, Math.round(1 + (maxLevel - 1) * Math.pow(k / Math.max(1, n - 1), ease))));

  /* 8. A soft "New Season" reset (prestige) that only ever adds: a permanent bonus from lifetime coins (Cookie Clicker uses a cube root). */
  const seasonBonus = lifetime => 1 + Math.cbrt(Math.max(0, lifetime) / 1e6) * 0.05;   // +5% per "1 million^(1/3)" step

  G.Progression = { xpFor, levelFromXp, totalXpTo, costOf, costOfMany, maxAffordable, offlineEarnings, stars, weekStamps, dailyChallenge, dailySeed, unlockLevels, seasonBonus, iso, parse };
})(typeof window !== 'undefined' ? window : globalThis);

/* ============================================================
   Chili Firm 2 — Expansion Pack 1: "Chili Dynasty" (post-game)
   Adds 6 endless-mode contracts, 4 events, 8 achievements
   (checked via the CF.addons.achTick hook) and 6 post-game
   missions continuing the campaign after m14.
   No drugs. Just hustle, family and a dynasty to build.
   Loads AFTER js/story/story.js; never touches core files.
   ============================================================ */
(function (global) {
  'use strict';

  // Same guard trick as story.js / logic.js: require in node, globals in browser.
  const Defs = (typeof module !== 'undefined' && module.exports)
    ? require('../core/defs.js')
    : global.CF.defs;
  const Story = (typeof module !== 'undefined' && module.exports)
    ? require('../story/story.js')
    : global.CF.story;
  const Logic = (typeof module !== 'undefined' && module.exports)
    ? require('../core/logic.js')
    : global.CF.logic;

  /* ---------- 6 new market contracts (endless mode) ---------- */
  const NEW_CONTRACTS = [
    { id: 'c_birdseye', name: "Gourmet Bird's Eye Batch", emoji: '🍳', strain: 'birdseye', qty: 40, days: 4, mult: 2.2, desc: 'A fancy bistro needs tiny dynamite for its signature dish.' },
    { id: 'c_cay2', name: 'Cayenne Festival Stock', emoji: '🌶️', strain: 'cayenne', qty: 60, days: 3, mult: 1.8, desc: 'Festival season is coming — stock up the fairgrounds.' },
    { id: 'c_hab2', name: 'Habanero Sauce Run', emoji: '🥫', strain: 'habanero', qty: 50, days: 3, mult: 1.9, desc: 'A growing sauce label needs fruit-and-fire by the case.' },
    { id: 'c_scorpion', name: 'Scorpion Heat Challenge', emoji: '🦂', strain: 'scorpion', qty: 25, days: 5, mult: 2.6, desc: 'A daredevil food truck needs scorpions for its challenge menu.' },
    { id: 'c_reaper2', name: 'Reaper Reserve Export', emoji: '🚢', strain: 'reaper', qty: 30, days: 5, mult: 2.9, desc: 'Overseas thrill-seekers demand the world-record reaper.' },
    { id: 'c_royale', name: 'Royal Reserve Deal', emoji: '👑', strain: 'royal', qty: 20, days: 4, mult: 2.8, desc: 'A royal banquet demands the Chili Royale itself.' },
  ];

  /* ---------- 4 new random events ---------- */
  const NEW_EVENTS = [
    { id: 'dynasty_parade', name: 'Dynasty Parade', emoji: '🎉', days: 2, minDay: 17, msg: 'The town throws a parade for your dynasty! Chili prices surge.', effect: { valueMult: 1.6 } },
    { id: 'royal_visit', name: 'Royal Chili Taster', emoji: '👑', days: 1, minDay: 20, msg: 'A royal taster arrives to sample the dynasty\u2019s finest. Reputation soars!', effect: { repPerDay: 300 } },
    { id: 'recipe_leak', name: 'Secret Recipe Leak', emoji: '📰', days: 2, minDay: 22, msg: 'A tabloid claims it has your secret jerky recipe. Sales explode!', effect: { jerkyMult: 1.8 } },
    { id: 'chili_snow', name: 'First Chili Snow', emoji: '❄️', days: 3, minDay: 25, msg: 'An early snow dusts the valley — peppers ripen slow but rich.', effect: { growthMult: 0.8, valueMult: 1.5 } },
  ];

  /* ---------- 8 new achievements (checked via addon hook) ---------- */
  const NEW_ACHIEVEMENTS = [
    { id: 'xd_workers18', name: 'Full Dynasty Staff', emoji: '👥', desc: 'Own 18 workers', reward: { money: 60000 } },
    { id: 'xd_rep9k', name: 'Valley Royalty', emoji: '👑', desc: 'Reach 9,000 reputation', reward: { money: 50000 } },
    { id: 'xd_earn4m', name: 'Empire Fortune', emoji: '🏦', desc: 'Earn $4,000,000 (lifetime)', reward: { money: 100000 } },
    { id: 'xd_harvest25k', name: 'Harvest Royal', emoji: '🌶️', desc: 'Harvest 25,000 chilis (lifetime)', reward: { money: 75000 } },
    { id: 'xd_contracts8', name: 'Contract King', emoji: '🤝', desc: 'Complete 8 contracts', reward: { money: 50000 } },
    { id: 'xd_jerky8k', name: 'Jerky Baron', emoji: '🥩', desc: 'Make 8,000 jerky', reward: { money: 60000 } },
    { id: 'xd_mining5', name: 'Deep Miner', emoji: '⛏️', desc: 'Reach mining level 5', reward: { money: 50000 } },
    { id: 'xd_legacy', name: 'Legacy Keeper', emoji: '🧬', desc: 'Research Legacy Genetics', reward: { money: 80000 } },
  ];

  /* ---------- 6 post-game missions (continue after m14) ---------- */
  function totalWorkers(s) {
    return s.workers.farmhand.owned + s.workers.buyer.owned + s.workers.foreman.owned +
      s.workers.driver.owned + s.workers.chef.owned + s.workers.brand.owned;
  }

  const NEW_MISSIONS = [
    {
      id: 'mx1', name: 'The Dynasty Council', chapter: 'Dynasty Chapter 1 — The Council',
      desc: 'Hire 18 workers. The empire is too big for one pair of hands.',
      minDay: 17, check: s => s.finished && totalWorkers(s) >= 18,
      reward: { money: 150000, rep: 500 },
      dialogue: {
        title: 'The Dynasty Council',
        portrait: '👵✨', name: 'Abuela Rosa',
        lines: [
          { who: null, text: 'A family council convenes in the big house. Everyone has an opinion. Everyone wants a say.' },
          { who: 'Abuela Rosa', text: 'Mijo, the empire is too big for one pair of hands. We need the whole clan in charge.' },
          { who: 'Cousin Marco', text: 'I ran the numbers, Tía. Eighteen staff minimum. We\u2019re at the threshold of greatness!' },
          { who: 'Abuela Rosa', text: 'Hire the family. The farm is the heart, but the dynasty is the people.' },
        ],
      },
    },
    {
      id: 'mx2', name: 'The Big Score', chapter: 'Dynasty Chapter 2 — The Big Score',
      desc: 'Earn $4,000,000 lifetime. The ledger enters legend territory.',
      minDay: 20, check: s => s.stats.earned >= 4000000,
      reward: { money: 200000, rep: 500 },
      dialogue: {
        title: 'The Big Score',
        portrait: '🚚', name: 'Dana',
        lines: [
          { who: null, text: 'Dana slaps a receipt down on the table. The numbers are enormous.' },
          { who: 'Dana', text: 'Four million dollars, boss. Four. Million. My truck is basically a bank now.' },
          { who: 'Dana', text: 'We outgrew the county fair. Time to think… global.' },
          { who: null, text: 'The empire\u2019s ledger has officially entered legend territory.' },
        ],
      },
    },
    {
      id: 'mx3', name: 'Valley Legend', chapter: 'Dynasty Chapter 3 — Valley Legend',
      desc: 'Reach 9,000 reputation. The whole valley knows your name.',
      minDay: 25, check: s => s.rep >= 9000,
      reward: { money: 250000, rep: 600 },
      dialogue: {
        title: 'Valley Legend',
        portrait: '🎩', name: 'Mayor Hildy',
        lines: [
          { who: null, text: 'A town crier, a brass band, and Mayor Hildy in full regalia march up the hill.' },
          { who: 'Mayor Hildy', text: 'By the power vested in me, I declare today \u201cChili Dynasty Day\u201d for the whole valley!' },
          { who: 'Mayor Hildy', text: 'Nine thousand fans can\u2019t be wrong. You\u2019re not a farmer anymore — you\u2019re a legend.' },
          { who: 'Abuela Rosa', text: 'Listen to the band, mijo. That\u2019s your song now.' },
        ],
      },
    },
    {
      id: 'mx4', name: 'Field of Gold', chapter: 'Dynasty Chapter 4 — Field of Gold',
      desc: 'Harvest 25,000 chilis (lifetime). A mountain of heat.',
      minDay: 30, check: s => s.stats.harvested >= 25000,
      reward: { money: 150000, rep: 400 },
      dialogue: {
        title: 'Field of Gold',
        portrait: '🧔', name: 'Sal',
        lines: [
          { who: null, text: 'Sal leans on his shovel at sunrise, counting bins of peppers across the valley.' },
          { who: 'Sal', text: 'Twenty-five thousand chilis, boss. That\u2019s a mountain of heat.' },
          { who: 'Sal', text: 'When I started, I couldn\u2019t count that high. Now the fields just… grow gold.' },
          { who: 'Sal', text: 'Keep planting. The land remembers who loves it.' },
        ],
      },
    },
    {
      id: 'mx5', name: 'Legacy Genetics', chapter: 'Dynasty Chapter 5 — Legacy Genetics',
      desc: 'Research Legacy Genetics. Put the dynasty in the soil, permanently.',
      minDay: 35, check: s => s.research.indexOf('r_legacy') !== -1,
      reward: { money: 300000, rep: 800 },
      dialogue: {
        title: 'Legacy Genetics',
        portrait: '👔', name: 'Cousin Marco',
        lines: [
          { who: null, text: 'The lab lights up as the Legacy Genetics program goes live.' },
          { who: 'Cousin Marco', text: 'Cousin! We just locked in the family\u2019s genes — the peppers will carry our name forever.' },
          { who: 'Abuela Rosa', text: 'My grandmother\u2019s seeds, my son\u2019s science. The dynasty is in the soil now.' },
          { who: 'Cousin Marco', text: '+15% yield on everything, permanently. That\u2019s the kind of math I like.' },
        ],
      },
    },
    {
      id: 'mx6', name: 'The Dynasty Finale', chapter: 'Dynasty Chapter 6 — The Finale',
      desc: 'Reach mining level 5, media level 2, design all 4 collections, make 8,000 jerky and farm 40 plots.',
      minDay: 40,
      check: s => s.biz.mining.level >= 5 && s.biz.media.level >= 2 &&
        s.biz.fashion.designed >= 4 && s.biz.jerky.made >= 8000 && s.plotCount >= 40,
      reward: { money: 400000, rep: 1500 },
      dialogue: {
        title: 'The Dynasty Finale',
        portrait: '📺', name: 'Crystal',
        lines: [
          { who: null, text: 'The cameras roll as Crystal climbs the hill for the season finale.' },
          { who: 'Crystal', text: 'Ladies and gentlemen… the Chili Dynasty! Mine, media, fashion, jerky — all of it, in one valley.' },
          { who: 'Crystal', text: 'From one seed to forty acres. This is the greatest comeback story we\u2019ve ever aired.' },
          { who: 'Abuela Rosa', text: 'It was never about the money, mijo. It was about what you grew along the way.' },
          { who: null, text: '🏰 THE DYNASTY IS COMPLETE. The empire answers to no one now.' },
        ],
      },
    },
  ];

  /* ---------- register into the live defs/story collections ---------- */
  Defs.CONTRACTS.push(...NEW_CONTRACTS);
  Defs.EVENTS.push(...NEW_EVENTS);
  Defs.ACHIEVEMENTS.push(...NEW_ACHIEVEMENTS);
  Story.MISSIONS.push(...NEW_MISSIONS);

  // The lookup maps are built at defs.js load time; rebuild them so the
  // new entries resolve via Defs.contract/event/achievement everywhere.
  Defs.CONTRACTS.forEach(c => { Defs.CONTRACT_MAP[c.id] = c; });
  Defs.EVENTS.forEach(e => { Defs.EVENT_MAP[e.id] = e; });
  Defs.ACHIEVEMENTS.forEach(a => { Defs.ACH_MAP[a.id] = a; });

  /* ---------- achievement checking hook (called by logic.achTick) ---------- */
  const ACH_CHECKS = [
    ['xd_workers18', s => totalWorkers(s) >= 18],
    ['xd_rep9k', s => s.rep >= 9000],
    ['xd_earn4m', s => s.stats.earned >= 4000000],
    ['xd_harvest25k', s => s.stats.harvested >= 25000],
    ['xd_contracts8', s => s.stats.contracts >= 8],
    ['xd_jerky8k', s => s.biz.jerky.made >= 8000],
    ['xd_mining5', s => s.biz.mining.level >= 5],
    ['xd_legacy', s => s.research.indexOf('r_legacy') !== -1],
  ];

  function achTick(s, silent) {
    for (const [id, cond] of ACH_CHECKS) {
      if (!s.ach[id] && cond(s)) Logic.grantAch(s, id, silent);
    }
  }

  global.CF = global.CF || {};
  global.CF.addons = global.CF.addons || [];
  global.CF.addons.achTick = achTick;

  const expansion1 = {
    contracts: NEW_CONTRACTS,
    events: NEW_EVENTS,
    achievements: NEW_ACHIEVEMENTS,
    missions: NEW_MISSIONS,
    achTick,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = expansion1;
  global.CF = global.CF || {};
  global.CF.expansion1 = expansion1;
})(typeof window !== 'undefined' ? window : globalThis);

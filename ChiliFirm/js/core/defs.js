/* ============================================================
   Chili Firm 2 — Game data definitions (pure data, no DOM)
   Exports via CommonJS in node (for sim tests) and global CF.defs in browser.
   ============================================================ */
(function (global) {
  'use strict';

  const DAY_SECONDS = 20; // one in-game day per 20 real seconds

  // ----- Chili strains (crops) -----
  const STRAINS = [
    { id: 'jalapeno', name: 'Jalapeño', emoji: '🫑', color: '#4caf50', grow: 45, value: 2,  heat: 1, unlock: { type: 'none' }, blurb: 'The reliable classic. Every empire starts somewhere.' },
    { id: 'serrano',  name: 'Serrano', emoji: '🌶️', color: '#8bc34a', grow: 90, value: 5,  heat: 2, unlock: { type: 'money', v: 200 }, blurb: 'A crisp bite. Small but loud.' },
    { id: 'cayenne',  name: 'Cayenne', emoji: '🌶️', color: '#f44336', grow: 150, value: 10, heat: 3, unlock: { type: 'money', v: 800 }, blurb: 'The hot sauce staple. Pizzas fear it.' },
    { id: 'habanero', name: 'Habanero', emoji: '🌶️', color: '#ff9800', grow: 240, value: 22, heat: 4, unlock: { type: 'money', v: 2500 }, blurb: 'Fruity, fierce, famous.' },
    { id: 'birdseye', name: "Bird's Eye", emoji: '🌶️', color: '#e53935', grow: 360, value: 40, heat: 5, unlock: { type: 'money', v: 6000 }, blurb: 'Tiny dynamite. A chef\u2019s secret weapon.' },
    { id: 'ghost',    name: 'Ghost Pepper', emoji: '👻', color: '#b71c1c', grow: 540, value: 70, heat: 6, unlock: { type: 'money', v: 15000 }, blurb: 'It haunts you twice: once going down, once the next morning.' },
    { id: 'scorpion', name: 'Trinidad Scorpion', emoji: '🦂', color: '#d32f2f', grow: 800, value: 120, heat: 7, unlock: { type: 'money', v: 40000 }, blurb: 'Handle with respect. And gloves.' },
    { id: 'reaper',   name: 'Carolina Reaper', emoji: '💀', color: '#8e0000', grow: 1200, value: 210, heat: 8, unlock: { type: 'money', v: 100000 }, blurb: 'The world record holder. Sells itself.' },
    { id: 'royal',    name: 'Chili Royale', emoji: '👑', color: '#ffd700', grow: 1800, value: 380, heat: 9, unlock: { type: 'research', id: 'r_royal' }, blurb: 'Your own lab-grown hybrid. Fit for royalty.' },
  ];
  const STRAIN_MAP = {};
  STRAINS.forEach(s => { STRAIN_MAP[s.id] = s; });
  const strain = id => STRAIN_MAP[id];

  // ----- Farm upgrades (Lab) -----
  const UPGRADES = [
    { id: 'soil', name: 'Premium Soil', emoji: '🪱', desc: '+12% harvest yield per level', max: 6, costBase: 60, costGrow: 1.9 },
    { id: 'irrigation', name: 'Drip Irrigation', emoji: '💧', desc: '-8% grow time per level', max: 6, costBase: 80, costGrow: 1.9 },
    { id: 'greenhouse', name: 'Greenhouse', emoji: '🌡️', desc: '+12% chili sale value per level', max: 5, costBase: 150, costGrow: 2.0 },
    { id: 'fertilizer', name: 'Fertilizer', emoji: '🧪', desc: '+1 chili per harvest per level', max: 5, costBase: 200, costGrow: 2.1 },
    { id: 'storage', name: 'Cold Storage', emoji: '🧊', desc: '+200 inventory capacity per level', max: 8, costBase: 120, costGrow: 1.8 },
    { id: 'marketing', name: 'Marketing', emoji: '📣', desc: '+3 reputation per day per level', max: 6, costBase: 250, costGrow: 2.2 },
  ];
  const UPGRADE_MAP = {};
  UPGRADES.forEach(u => { UPGRADE_MAP[u.id] = u; });
  const upgrade = id => UPGRADE_MAP[id];
  const upgradeCost = (u, level) => Math.round(u.costBase * Math.pow(u.costGrow, level));

  // ----- Land expansion -----
  const LAND = [
    { plots: 12, cost: 0, name: 'Abuela\u2019s original plot' },
    { plots: 16, cost: 200, name: 'West field' },
    { plots: 20, cost: 800, name: 'Riverbank strip' },
    { plots: 24, cost: 2500, name: 'Hill terraces' },
    { plots: 30, cost: 8000, name: 'Old Vega pasture' },
    { plots: 40, cost: 25000, name: 'County fairground lot' },
    { plots: 52, cost: 80000, name: 'Green Valley acres' },
    { plots: 64, cost: 250000, name: 'The whole valley' },
  ];

  // ----- Workers -----
  const WORKERS = [
    { id: 'farmhand', name: 'Farmhand', emoji: '🧑‍🌾', cost: 120, max: 8, desc: 'Automatically plants, waters and harvests your plots.' },
    { id: 'buyer', name: 'Buyer', emoji: '🛒', cost: 500, max: 4, desc: 'Automatically sells your chili stock at market price.' },
    { id: 'foreman', name: 'Foreman', emoji: '👷', cost: 2500, max: 4, desc: '+20% harvest yield per foreman. They yell, but it works.' },
    { id: 'driver', name: 'Truck Driver', emoji: '🚚', cost: 3000, max: 3, desc: 'Offline earnings are multiplied while you\u2019re away.' },
    { id: 'chef', name: 'Master Chef', emoji: '👨‍🍳', cost: 5000, max: 3, desc: 'Boosts jerky recipes, quality and output.' },
    { id: 'brand', name: 'Brand Manager', emoji: '📈', cost: 8000, max: 4, desc: '+5 reputation per day and boosts business income.' },
  ];
  const WORKER_MAP = {};
  WORKERS.forEach(w => { WORKER_MAP[w.id] = w; });
  const worker = id => WORKER_MAP[id];
  const workerCost = w => Math.round(w.cost * Math.pow(1.75, 0)); // hire cost flat
  const trainCost = (w, lvl) => Math.round(w.cost * 1.5 * lvl);

  // ----- Businesses (the empire) -----
  const BUSINESSES = [
    { id: 'jerky', name: 'Dana\u2019s Jerky Co.', emoji: '🥩', short: 'Jerky', desc: 'Chili-marinated beef jerky. Turn cheap chilis into premium protein. Consumes 2 chilis per unit.', unlock: { money: 500 }, baseCost: 400, costGrow: 1.9,
      levels: { id: 'level', name: 'Smokehouse Expansion', emoji: '🔥', desc: '+1.5 units/sec production per level', max: 10 } },
    { id: 'fashion', name: 'Spice & Thread', emoji: '👕', short: 'Fashion', desc: 'Chili-brand streetwear. Design collections, ride the hype, print money. Revenue scales with reputation.', unlock: { money: 10000, rep: 300 }, baseCost: 8000, costGrow: 2.0,
      levels: { id: 'level', name: 'Brand Level', emoji: '🪡', desc: '+80% collection revenue per level', max: 10 } },
    { id: 'mining', name: 'Chilirock Mining', emoji: '⛏️', short: 'Mining', desc: 'Extract chili salt and rare ore from Abuela\u2019s old hillside. Steady passive income, occasional cave-ins.', unlock: { money: 50000, rep: 800 }, baseCost: 40000, costGrow: 2.1,
      levels: { id: 'level', name: 'Mine Level', emoji: '🛢️', desc: '+1.2 $/sec base income per level', max: 12 } },
    { id: 'media', name: 'Chili Empire TV', emoji: '📺', short: 'Media', desc: 'A reality TV network about your empire. Massive passive income that scales with your reputation.', unlock: { money: 150000, rep: 1500 }, baseCost: 100000, costGrow: 2.2,
      levels: { id: 'level', name: 'Network Level', emoji: '🎬', desc: '+20 $/sec base income per level', max: 8 } },
  ];
  const BIZ_MAP = {};
  BUSINESSES.forEach(b => { BIZ_MAP[b.id] = b; });
  const biz = id => BIZ_MAP[id];
  const bizCost = (b, level) => Math.round(b.baseCost * Math.pow(b.costGrow, level));

  // ----- Jerky recipes (jerky business upgrades) -----
  const RECIPES = [
    { id: 'classic', name: 'Classic Chili Jerky', emoji: '🥓', desc: 'Where it all begins.', cost: 0, bonus: 0 },
    { id: 'cracked', name: 'Cracked Pepper Batch', emoji: '🧂', desc: '+20% jerky value.', cost: 1000, bonus: 0.20 },
    { id: 'inferno', name: 'Habanero Inferno', emoji: '🔥', desc: '+45% jerky value. Needs a chef to perfect.', cost: 5000, bonus: 0.45, needsChef: true },
    { id: 'smoked', name: 'Scorpion Smoked', emoji: '💨', desc: '+80% jerky value. Needs a chef.', cost: 20000, bonus: 0.80, needsChef: true },
    { id: 'reaper', name: 'Reaper Reserve', emoji: '💀', desc: '+130% jerky value. Needs 2 chefs.', cost: 80000, bonus: 1.30, needsChef: 2 },
  ];

  // ----- Fashion collections -----
  const COLLECTIONS = [
    { id: 'c_tees', name: 'Hot Tee Collection', emoji: '👕', cost: 2000, base: 250, rep: 5 },
    { id: 'c_caps', name: 'Ember Caps', emoji: '🧢', cost: 6000, base: 700, rep: 12 },
    { id: 'c_hoods', name: 'Reaper Hoodies', emoji: '🧥', cost: 20000, base: 2200, rep: 30 },
    { id: 'c_drip', name: 'Capsaicin Drip Line', emoji: '✨', cost: 80000, base: 9000, rep: 80 },
  ];

  // ----- Research (R&D) -----
  const RESEARCH = [
    { id: 'r_royal', name: 'Chili Royale Hybrid', emoji: '🧬', desc: 'Unlocks the Chili Royale strain \u2014 your own lab-grown hybrid.', cost: 50000 },
    { id: 'r_legacy', name: 'Legacy Genetics', emoji: '🏛️', desc: 'Permanently +15% yield on all strains.', cost: 300000 },
    { id: 'r_brand', name: 'Brand DNA', emoji: '🧠', desc: 'Permanently +15% reputation gains.', cost: 150000 },
  ];

  // ----- Market contracts -----
  const CONTRACTS = [
    { id: 'c_bodega', name: 'Corner Bodega', emoji: '🏪', strain: 'jalapeno', qty: 20, days: 2, mult: 1.6, desc: 'The bodega owner trusts Abuela\u2019s peppers.' },
    { id: 'c_taco', name: 'Taco Truck Dana', emoji: '🚚', strain: 'serrano', qty: 25, days: 2, mult: 1.7, desc: 'Dana\u2019s truck needs fire for taco Tuesday.' },
    { id: 'c_sauce', name: 'Hot Sauce Startup', emoji: '🥫', strain: 'cayenne', qty: 30, days: 3, mult: 1.8, desc: 'A Kickstarter brand with more hype than cash.' },
    { id: 'c_caterer', name: 'Festival Caterer', emoji: '🎪', strain: 'habanero', qty: 30, days: 3, mult: 1.9, desc: 'Needs serious heat for the county fair.' },
    { id: 'c_chain', name: 'Restaurant Chain', emoji: '🍽️', strain: 'ghost', qty: 20, days: 4, mult: 2.2, desc: 'A chain building its \u201csignature inferno\u201d menu.' },
    { id: 'c_export', name: 'Export Co.', emoji: '🚢', strain: 'reaper', qty: 25, days: 4, mult: 2.5, desc: 'Ships reapers to thrill-seekers overseas.' },
    { id: 'c_big', name: 'Big Agri Bulk Deal', emoji: '🏢', strain: 'jalapeno', qty: 60, days: 6, mult: 2.0, desc: 'Vega\u2019s \u201cdeposit\u201d deal. Deliver and show them who\u2019s boss.' },
  ];
  const CONTRACT_MAP = {};
  CONTRACTS.forEach(c => { CONTRACT_MAP[c.id] = c; });
  const contract = id => CONTRACT_MAP[id];

  // ----- Random events -----
  const EVENTS = [
    { id: 'heatwave', name: 'Heatwave', emoji: '🌡️', days: 1, msg: 'A heatwave hits the valley \u2014 chilis are all anyone wants!', effect: { valueMult: 1.4 } },
    { id: 'drought', name: 'Drought', emoji: '🏜️', days: 1, msg: 'Dry spell! Plants grow slower until it breaks.', effect: { growthMult: 0.55 } },
    { id: 'festival', name: 'County Chili Festival', emoji: '🎪', days: 2, minDay: 4, msg: 'The County Chili Festival is ON! Prices surge and the champion title is up for grabs. Sell 50 chilis during the festival to win!', effect: { valueMult: 1.75 } },
    { id: 'pests', name: 'Aphid Infestation', emoji: '🐛', days: 2, msg: 'Aphids in the fields! Growth slowed. Spray insecticide to end it early.', effect: { growthMult: 0.6 }, cure: 'pesticide' },
    { id: 'media', name: 'Food Blog Feature', emoji: '📸', days: 1, msg: 'A viral food blog just featured your farm! Reputation is pouring in.', effect: { repPerDay: 150 } },
    { id: 'critic', name: 'Jerky Critic Visit', emoji: '🍽️', days: 1, minDay: 6, needBiz: 'jerky', msg: 'A famous food critic is in town and wants your jerky! Jerky sells at double value.', effect: { jerkyMult: 2 } },
  ];
  const EVENT_MAP = {};
  EVENTS.forEach(e => { EVENT_MAP[e.id] = e; });
  const event = id => EVENT_MAP[id];

  // ----- Achievements -----
  const ACHIEVEMENTS = [
    { id: 'a_first', name: 'First Seed', emoji: '🌱', desc: 'Plant your first chili', reward: { money: 50 } },
    { id: 'a_harvest', name: 'First Harvest', emoji: '🌶️', desc: 'Harvest your first chili', reward: { money: 100 } },
    { id: 'a_100', name: 'Century Club', emoji: '🧺', desc: 'Harvest 100 chilis (lifetime)', reward: { money: 500 } },
    { id: 'a_1000', name: 'Chili Baron', emoji: '👑', desc: 'Harvest 1,000 chilis (lifetime)', reward: { money: 2000 } },
    { id: 'a_10000', name: 'Pepper Tycoon', emoji: '💎', desc: 'Harvest 10,000 chilis (lifetime)', reward: { money: 10000 } },
    { id: 'a_money1', name: 'First Grand', emoji: '💰', desc: 'Earn $1,000 (lifetime)', reward: { money: 200 } },
    { id: 'a_money10', name: 'Ten Grand', emoji: '💵', desc: 'Earn $10,000 (lifetime)', reward: { money: 1000 } },
    { id: 'a_money100', name: 'Six Figures', emoji: '🤑', desc: 'Earn $100,000 (lifetime)', reward: { money: 5000 } },
    { id: 'a_money1m', name: 'Millionaire Farmer', emoji: '🏦', desc: 'Earn $1,000,000 (lifetime)', reward: { money: 50000 } },
    { id: 'a_worker5', name: 'Boss Energy', emoji: '🧑‍🌾', desc: 'Hire 5 workers', reward: { money: 500 } },
    { id: 'a_worker10', name: 'Full Staff', emoji: '👥', desc: 'Own 10 workers', reward: { money: 3000 } },
    { id: 'a_upgrade5', name: 'Modern Farm', emoji: '🔧', desc: 'Buy 5 lab upgrades', reward: { money: 500 } },
    { id: 'a_strain3', name: 'Variety Show', emoji: '🌈', desc: 'Unlock 3 strains', reward: { money: 1000 } },
    { id: 'a_strainall', name: 'Pepper King', emoji: '👑', desc: 'Unlock all 9 strains', reward: { money: 20000 } },
    { id: 'a_biz1', name: 'Entrepreneur', emoji: '💼', desc: 'Own your first business', reward: { money: 2000 } },
    { id: 'a_biz4', name: 'Conglomerate', emoji: '🏢', desc: 'Own all 4 businesses', reward: { money: 100000 } },
    { id: 'a_contract', name: 'Deal Maker', emoji: '🤝', desc: 'Complete a contract', reward: { money: 1000 } },
    { id: 'a_festival', name: 'Festival Champion', emoji: '🏆', desc: 'Win the County Chili Festival', reward: { money: 5000 } },
    { id: 'a_rep500', name: 'Local Legend', emoji: '⭐', desc: 'Reach 500 reputation', reward: { money: 2500 } },
    { id: 'a_rep2000', name: 'County Famous', emoji: '🌟', desc: 'Reach 2,000 reputation', reward: { money: 15000 } },
    { id: 'a_offline', name: 'Comes Back Stronger', emoji: '⏰', desc: 'Earn $1,000 while away', reward: { money: 1000 } },
    { id: 'a_royal', name: 'Royal Grower', emoji: '👑', desc: 'Grow the Chili Royale', reward: { money: 25000 } },
    { id: 'a_end', name: 'Chili Dynasty', emoji: '🏰', desc: 'Finish the story campaign', reward: { money: 500000 } },
  ];
  const ACH_MAP = {};
  ACHIEVEMENTS.forEach(a => { ACH_MAP[a.id] = a; });
  const achievement = id => ACH_MAP[id];

  const defs = {
    DAY_SECONDS,
    STRAINS, STRAIN_MAP, strain,
    UPGRADES, UPGRADE_MAP, upgrade, upgradeCost,
    LAND,
    WORKERS, WORKER_MAP, worker, workerCost, trainCost,
    BUSINESSES, BIZ_MAP, biz, bizCost,
    RECIPES, COLLECTIONS, RESEARCH,
    CONTRACTS, CONTRACT_MAP, contract,
    EVENTS, EVENT_MAP, event,
    ACHIEVEMENTS, ACH_MAP, achievement,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = defs;
  global.CF = global.CF || {};
  global.CF.defs = defs;
})(typeof window !== 'undefined' ? window : globalThis);

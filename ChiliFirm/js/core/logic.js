/* ============================================================
   Chili Firm 2 — Core game logic (pure simulation, no DOM)
   API: plant/water/harvest/sell, workers, upgrades, businesses,
   contracts, events, achievements, offline processing.
   ============================================================ */
(function (global) {
  'use strict';

  const Defs = (typeof module !== 'undefined' && module.exports)
    ? require('./defs.js')
    : global.CF.defs;
  const StoryMod = (typeof module !== 'undefined' && module.exports)
    ? require('../story/story.js')
    : null;

  function story() {
    return StoryMod || global.CF.story;
  }

  const DAY = () => Defs.DAY_SECONDS;

  /* ---------- state helpers ---------- */
  function invGet(state, id) { return (state.inventory.strains[id] || 0); }
  function invSet(state, id, n) { state.inventory.strains[id] = n; }
  function invAdd(state, id, n, cap) {
    const have = invGet(state, id);
    const room = cap - have;
    const add = Math.min(n, Math.max(0, room));
    invSet(state, id, have + add);
    return { added: add, overflow: n - add };
  }
  function storageCap(state) { return 200 + state.upgrades.storage * 200; }
  function chiliTotal(state) {
    let t = 0;
    for (const k in state.inventory.strains) t += state.inventory.strains[k];
    return t;
  }

  function addMoney(state, n) {
    if (n >= 0) state.stats.earned += n;
    state.money = Math.max(0, state.money + n);
  }
  function spend(state, n) {
    if (state.money < n) return false;
    state.money -= n;
    state.stats.spent += n;
    return true;
  }
  function addRep(state, n) { state.rep = Math.max(0, state.rep + n); }
  function addLog(state, msg, kind) {
    state.log.push({ t: state.day, msg, kind: kind || 'info' });
    if (state.log.length > 60) state.log = state.log.slice(-60);
  }
  function totalWorkers(state) {
    let t = 0;
    for (const k in state.workers) t += state.workers[k].owned;
    return t;
  }
  function fmt(n) {
    n = Math.round(n);
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e4) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n.toLocaleString('en-US');
  }
  function fmtC(n) {
    if (n >= 1e6) return fmt(n);
    return '$' + n.toFixed(2);
  }
  function tfmt(sec) {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  /* ---------- market & crop math ---------- */
  function marketMult(state) {
    let m = 0.8 + 0.4 * Math.sin(state.day * 1.7 + 1.3) + 0.15 * Math.sin(state.day * 0.53 + 4);
    m = Math.max(0.6, Math.min(1.5, m));
    if (state.event && state.event.effect && state.event.effect.valueMult) m *= state.event.effect.valueMult;
    return m;
  }
  function repValueBonus(state) {
    return 1 + Math.min(0.25, state.rep / 5000 * 0.25);
  }
  function chiliPrice(state, id) {
    const st = Defs.strain(id);
    let p = st.value * (1 + 0.12 * state.upgrades.greenhouse) * marketMult(state) * repValueBonus(state);
    if (state.legacy) p *= 1.1;
    return Math.round(p * 100) / 100;
  }
  function growTime(state, id) {
    const st = Defs.strain(id);
    return st.grow * Math.max(0.2, 1 - 0.08 * state.upgrades.irrigation);
  }
  function harvestYield(state) {
    const base = 2 + state.upgrades.fertilizer * 1;
    const foreman = 1 + state.workers.foreman.owned * 0.2;
    const soil = 1 + 0.12 * state.upgrades.soil;
    let y = Math.round(base * foreman * soil);
    if (state.legacy) y = Math.round(y * 1.15);
    return Math.max(1, y);
  }
  function growthEventMult(state) {
    let m = 1;
    if (state.event && state.event.effect && state.event.effect.growthMult) m = state.event.effect.growthMult;
    return m;
  }

  /* ---------- actions: farm ---------- */
  function plant(state, idx, strainId, now) {
    const plot = state.plots[idx];
    if (!plot) return { ok: false, msg: 'No plot there.' };
    if (idx >= state.plotCount) return { ok: false, msg: 'Buy more land first.' };
    if (plot.status !== 'empty') return { ok: false, msg: 'That plot is busy.' };
    if (state.unlocked.indexOf(strainId) === -1) return { ok: false, msg: 'Strain locked.' };
    plot.strain = strainId;
    plot.progress = 0;
    plot.status = 'growing';
    plot.boostUntil = 0;
    plot.readyAt = 0;
    state.stats.planted++;
    return { ok: true, msg: 'Planted ' + Defs.strain(strainId).name + '.' };
  }
  function water(state, idx, now) {
    const plot = state.plots[idx];
    if (!plot || plot.status !== 'growing') return { ok: false, msg: 'Nothing to water.' };
    plot.boostUntil = now + 60;
    return { ok: true, msg: 'Watered! 2x growth for 60s.' };
  }
  function harvest(state, idx, now, silent) {
    const plot = state.plots[idx];
    if (!plot || (plot.status !== 'ready' && plot.status !== 'wilted')) return { ok: false, msg: 'Not ready yet.' };
    const wilted = plot.status === 'wilted';
    let y = harvestYield(state);
    if (wilted) y = Math.max(1, Math.round(y / 2));
    const res = invAdd(state, plot.strain, y, storageCap(state));
    const got = res.added;
    state.stats.harvested += got;
    state.stats.bestHarvest = Math.max(state.stats.bestHarvest, got);
    const strainName = Defs.strain(plot.strain).name;
    plot.strain = null; plot.progress = 0; plot.status = 'empty'; plot.boostUntil = 0; plot.readyAt = 0;
    if (got < y) addLog(state, 'Storage full! Some ' + strainName + ' chilis were left in the field.', 'bad');
    if (!silent) addLog(state, 'Harvested ' + got + 'x ' + strainName + (wilted ? ' (wilted)' : ''), 'good');
    return { ok: true, msg: '+' + got + 'x ' + strainName, got, wilted };
  }
  function sellStrain(state, id, qty) {
    if (!Number.isFinite(qty)) return { ok: false, msg: 'Invalid quantity.' };
    const st = Defs.strain(id);
    if (!st) return { ok: false, msg: 'Unknown strain.' };
    const have = invGet(state, id);
    const n = Math.max(0, Math.min(qty, have));
    if (n <= 0) return { ok: false, msg: 'No ' + st.name + ' in storage.' };
    const price = chiliPrice(state, id);
    const money = n * price;
    invSet(state, id, have - n);
    addMoney(state, money);
    state.stats.sold += n;
    addRep(state, n * 0.5);
    if (state.event && state.event.id === 'festival') state.story.festivalSold += n;
    addLog(state, 'Sold ' + n + 'x ' + st.name + ' for ' + fmt(money), 'money');
    return { ok: true, msg: 'Sold ' + n + 'x for ' + fmt(money), money };
  }
  function sellAll(state) {
    let total = 0, units = 0;
    for (const id in state.inventory.strains) {
      const n = state.inventory.strains[id];
      if (n > 0) {
        const r = sellStrain(state, id, n);
        if (r.ok) { total += r.money; units += n; }
      }
    }
    if (units === 0) return { ok: false, msg: 'Nothing in storage to sell.' };
    addLog(state, 'Sold everything: ' + units + ' chilis for ' + fmt(total), 'money');
    return { ok: true, msg: 'Sold ' + units + ' chilis for ' + fmt(total), money: total };
  }

  /* ---------- actions: workers ---------- */
  function hireWorker(state, id) {
    const w = Defs.worker(id);
    const rec = state.workers[id];
    if (rec.owned >= w.max) return { ok: false, msg: w.name + ' team is full.' };
    if (!spend(state, w.cost)) return { ok: false, msg: 'Need ' + fmt(w.cost) + '.' };
    rec.owned++;
    addLog(state, 'Hired a ' + w.name + '!', 'good');
    return { ok: true, msg: w.emoji + ' ' + w.name + ' hired!' };
  }
  function trainWorker(state, id) {
    const w = Defs.worker(id);
    const rec = state.workers[id];
    if (rec.owned === 0) return { ok: false, msg: 'Hire a ' + w.name + ' first.' };
    if (rec.lvl >= 5) return { ok: false, msg: 'Max training reached.' };
    const cost = Defs.trainCost(w, rec.lvl);
    if (!spend(state, cost)) return { ok: false, msg: 'Need ' + fmt(cost) + '.' };
    rec.lvl++;
    addLog(state, w.name + ' trained to level ' + rec.lvl + '!', 'info');
    return { ok: true, msg: w.name + ' is now level ' + rec.lvl + '.' };
  }

  /* ---------- actions: lab / land ---------- */
  function buyUpgrade(state, id) {
    const u = Defs.upgrade(id);
    const lvl = state.upgrades[id];
    if (lvl >= u.max) return { ok: false, msg: 'Maxed out.' };
    const cost = Defs.upgradeCost(u, lvl);
    if (!spend(state, cost)) return { ok: false, msg: 'Need ' + fmt(cost) + '.' };
    state.upgrades[id]++;
    addLog(state, u.name + ' upgraded to level ' + (lvl + 1), 'info');
    return { ok: true, msg: u.emoji + ' ' + u.name + ' Lv.' + (lvl + 1) };
  }
  function buyLand(state) {
    const idx = Defs.LAND.findIndex(l => l.plots === state.plotCount);
    const next = Defs.LAND[idx + 1];
    if (!next) return { ok: false, msg: 'You own the whole valley!' };
    if (!spend(state, next.cost)) return { ok: false, msg: 'Need ' + fmt(next.cost) + '.' };
    state.plotCount = next.plots;
    while (state.plots.length < state.plotCount) state.plots.push({ strain: null, progress: 0, status: 'empty', boostUntil: 0, readyAt: 0 });
    addLog(state, 'Bought ' + next.name + '! Now ' + next.plots + ' plots.', 'good');
    return { ok: true, msg: 'New land: ' + next.name + ' (' + next.plots + ' plots)' };
  }
  function buyResearch(state, id) {
    const r = Defs.RESEARCH.find(x => x.id === id);
    if (!r) return { ok: false, msg: 'Unknown research.' };
    if (state.research.indexOf(id) !== -1) return { ok: false, msg: 'Already researched.' };
    if (!spend(state, r.cost)) return { ok: false, msg: 'Need ' + fmt(r.cost) + '.' };
    state.research.push(id);
    if (id === 'r_royal' && state.unlocked.indexOf('royal') === -1) state.unlocked.push('royal');
    if (id === 'r_brand') addRep(state, 50);
    addLog(state, 'R&D complete: ' + r.name, 'story');
    return { ok: true, msg: r.emoji + ' Researched: ' + r.name };
  }
  function treatPests(state) {
    const cost = 200;
    if (!state.event || state.event.id !== 'pests') return { ok: false, msg: 'No pests right now.' };
    if (!spend(state, cost)) return { ok: false, msg: 'Need ' + fmt(cost) + ' for insecticide.' };
    state.event = null;
    addLog(state, 'Sprayed insecticide. Aphids are gone.', 'good');
    return { ok: true, msg: 'Pests eliminated!' };
  }

  /* ---------- actions: businesses ---------- */
  function buyBusiness(state, id) {
    const b = Defs.biz(id);
    const rec = state.biz[id];
    if (rec.unlocked) return { ok: false, msg: 'Already owned.' };
    if (!missionUnlocked(state, id)) {
      const reqs = [];
      if (b.unlock.money) reqs.push(fmt(b.unlock.money));
      if (b.unlock.rep) reqs.push(Math.floor(b.unlock.rep).toLocaleString() + ' rep');
      return { ok: false, msg: 'Need ' + reqs.join(' + ') + ' to found this business.' };
    }
    if (!spend(state, b.baseCost)) return { ok: false, msg: 'Need ' + fmt(b.baseCost) + '.' };
    rec.unlocked = true;
    addLog(state, b.name + ' is OPEN FOR BUSINESS!', 'story');
    return { ok: true, msg: b.emoji + ' ' + b.name + ' founded!' };
  }
  function missionUnlocked(state, id) {
    const b = Defs.biz(id);
    const u = b.unlock || {};
    const moneyOk = !u.money || state.money >= u.money;
    const repOk = !u.rep || state.rep >= u.rep;
    return moneyOk && repOk;
  }
  function bizLevelUp(state, id) {
    const b = Defs.biz(id);
    const rec = state.biz[id];
    if (!rec.unlocked) return { ok: false, msg: 'Own ' + b.name + ' first.' };
    if (rec.level >= b.levels.max) return { ok: false, msg: 'Max level.' };
    const cost = Defs.bizCost(b, rec.level);
    if (!spend(state, cost)) return { ok: false, msg: 'Need ' + fmt(cost) + '.' };
    rec.level++;
    addLog(state, b.name + ' expanded to level ' + rec.level, 'info');
    return { ok: true, msg: b.name + ' Lv.' + rec.level };
  }
  function recipeUp(state) {
    const rec = state.biz.jerky;
    if (!rec.unlocked) return { ok: false, msg: 'Own Dana\u2019s Jerky Co. first.' };
    const next = Defs.RECIPES[rec.recipe + 1];
    if (!next) return { ok: false, msg: 'All recipes unlocked!' };
    if (next.needsChef && state.workers.chef.owned < (next.needsChef === true ? 1 : next.needsChef))
      return { ok: false, msg: 'Need ' + next.needsChef + 'x Master Chef for this recipe.' };
    if (!spend(state, next.cost)) return { ok: false, msg: 'Need ' + fmt(next.cost) + '.' };
    rec.recipe++;
    addLog(state, 'New jerky recipe unlocked: ' + next.name, 'story');
    return { ok: true, msg: next.emoji + ' Recipe: ' + next.name };
  }
  function designCollection(state, colId, now) {
    const rec = state.biz.fashion;
    if (!rec.unlocked) return { ok: false, msg: 'Own Spice & Thread first.' };
    if (rec.collection) return { ok: false, msg: 'A collection is already running.' };
    const c = Defs.COLLECTIONS.find(x => x.id === colId);
    if (!c) return { ok: false, msg: 'Unknown collection.' };
    if (!spend(state, c.cost)) return { ok: false, msg: 'Need ' + fmt(c.cost) + '.' };
    rec.collection = { id: c.id, endsAt: now + 3 * DAY(), count: c.base, rep: c.rep };
    addLog(state, 'Collection live: ' + c.name + '!', 'story');
    return { ok: true, msg: c.emoji + ' Dropped: ' + c.name };
  }
  function mineRepair(state, now) {
    const rec = state.biz.mining;
    if (!rec.unlocked) return { ok: false, msg: 'No mine yet.' };
    if (now >= rec.caveUntil) return { ok: false, msg: 'The mine is fine right now.' };
    const cost = 500 * Math.max(1, rec.level);
    if (!spend(state, cost)) return { ok: false, msg: 'Need ' + fmt(cost) + ' for repairs.' };
    rec.caveUntil = 0;
    addLog(state, 'Cave-in cleared! Miners back to work.', 'good');
    return { ok: true, msg: 'Mine repaired!' };
  }

  /* ---------- contracts ---------- */
  function rollOffer(state) {
    const pool = Defs.CONTRACTS.filter(c => c.id !== 'c_big' && state.unlocked.indexOf(c.strain) !== -1);
    const c = pool[Math.floor(Math.random() * pool.length)];
    state.contract.offer = { tpl: c.id, expiresDay: state.day + 1 };
  }
  function acceptContract(state, offerId) {
    const o = state.contract.offer;
    if (!o || o.tpl !== offerId) return { ok: false, msg: 'That offer is gone.' };
    if (state.contract.active) return { ok: false, msg: 'Finish your current contract first.' };
    const c = Defs.contract(o.tpl);
    state.contract.active = { tpl: o.tpl, qty: c.qty, endsDay: state.day + c.days };
    state.contract.offer = null;
    addLog(state, 'Contract accepted: ' + c.name + ' (' + c.qty + 'x ' + Defs.strain(c.strain).name + ')', 'info');
    return { ok: true, msg: 'Contract accepted: ' + c.name };
  }
  function startContract(state, tplId) {
    const c = Defs.contract(tplId);
    state.contract.active = { tpl: tplId, qty: c.qty, endsDay: state.day + c.days };
    addLog(state, 'Contract signed: ' + c.name + ' (' + c.qty + 'x ' + Defs.strain(c.strain).name + ')', 'bad');
  }
  function forceContract(state, tplId) {
    if (state.contract.active) {
      state.contract.forced = tplId;
      const c = Defs.contract(tplId);
      addLog(state, c.name + ' is queued — it starts when your current contract ends.', 'bad');
      return;
    }
    startContract(state, tplId);
  }
  function deliverContract(state) {
    const a = state.contract.active;
    if (!a) return { ok: false, msg: 'No active contract.' };
    const c = Defs.contract(a.tpl);
    const have = invGet(state, c.strain);
    const n = Math.min(a.qty, have);
    if (n <= 0) return { ok: false, msg: 'No ' + Defs.strain(c.strain).name + ' in storage.' };
    const price = chiliPrice(state, c.strain) * c.mult;
    const money = n * price;
    invSet(state, c.strain, have - n);
    addMoney(state, money);
    state.stats.sold += n;
    addRep(state, n * 0.5);
    if (state.event && state.event.id === 'festival') state.story.festivalSold += n;
    a.qty -= n;
    if (a.qty <= 0) {
      state.stats.contracts++;
      addRep(state, 20);
      state.contract.active = null;
      addLog(state, 'Contract COMPLETE: ' + c.name + ' paid ' + fmt(money) + '!', 'good');
      if (state.contract.forced) {
        const fid = state.contract.forced;
        state.contract.forced = null;
        startContract(state, fid);
      }
      return { ok: true, msg: 'Contract complete! +' + fmt(money), money, done: true };
    }
    addLog(state, 'Delivered ' + n + 'x to ' + c.name + ' (+' + fmt(money) + '). ' + a.qty + ' left.', 'money');
    return { ok: true, msg: 'Delivered ' + n + 'x. ' + a.qty + ' to go.', money, done: false };
  }

  /* ---------- events ---------- */
  function rollEvent(state) {
    const pool = Defs.EVENTS.filter(e => {
      if (e.minDay && state.day < e.minDay) return false;
      if (e.needBiz && !state.biz[e.needBiz].unlocked) return false;
      return true;
    });
    const weighted = [];
    pool.forEach(e => {
      let w = 1;
      if (e.id === 'festival') w = 2.5;
      weighted.push({ e, w });
    });
    const total = weighted.reduce((s, x) => s + x.w, 0);
    let roll = Math.random() * total;
    let picked = weighted[0].e;
    for (const x of weighted) { roll -= x.w; if (roll <= 0) { picked = x.e; break; } }
    state.event = { id: picked.id, endsDay: state.day + picked.days, effect: picked.effect };
    if (picked.id === 'festival') state.story.festivalSold = 0;
    addLog(state, picked.emoji + ' ' + picked.name + ': ' + picked.msg, 'story');
  }
  function endEvent(state) {
    const ev = state.event;
    if (!ev) return;
    const d = Defs.event(ev.id);
    if (ev.id === 'festival') {
      if (state.story.festivalSold >= 50) {
        state.stats.festivals++;
        addMoney(state, 2000);
        addRep(state, 200);
        addLog(state, '🏆 FESTIVAL CHAMPION! You sold ' + state.story.festivalSold + ' chilis and won the county fair!', 'good');
      } else {
        addLog(state, 'The festival ended. You sold ' + state.story.festivalSold + '/50 chilis. Next year!', 'bad');
      }
    } else {
      addLog(state, d.emoji + ' ' + d.name + ' has passed.', 'info');
    }
    state.event = null;
  }

  /* ---------- achievements ---------- */
  function grantAch(state, id, silent) {
    if (state.ach[id]) return;
    const a = Defs.achievement(id);
    if (!a) return;
    state.ach[id] = true;
    if (a.reward.money) state.money += a.reward.money; // bonus, not business income (doesn't count toward earned)
    addLog(state, a.emoji + ' Achievement: ' + a.name + (a.reward.money ? ' (+' + fmt(a.reward.money) + ')' : ''), 'good');
    if (!silent) return { id, name: a.name };
    return null;
  }
  function achTick(state, silent) {
    const s = state.stats;
    const checks = [
      ['a_first', s.planted >= 1], ['a_harvest', s.harvested >= 1],
      ['a_100', s.harvested >= 100], ['a_1000', s.harvested >= 1000], ['a_10000', s.harvested >= 10000],
      ['a_money1', s.earned >= 1000], ['a_money10', s.earned >= 10000],
      ['a_money100', s.earned >= 100000], ['a_money1m', s.earned >= 1000000],
      ['a_worker5', totalWorkers(state) >= 5], ['a_worker10', totalWorkers(state) >= 10],
      ['a_upgrade5', Object.values(state.upgrades).reduce((a, b) => a + b, 0) >= 5],
      ['a_strain3', state.unlocked.length >= 3], ['a_strainall', state.unlocked.length >= 9],
      ['a_biz1', Object.values(state.biz).some(b => b.unlocked)], ['a_biz4', Object.values(state.biz).every(b => b.unlocked)],
      ['a_contract', s.contracts >= 1], ['a_festival', s.festivals >= 1],
      ['a_rep500', state.rep >= 500], ['a_rep2000', state.rep >= 2000],
      ['a_offline', s.offlineEarned >= 1000], ['a_royal', state.unlocked.indexOf('royal') !== -1],
      ['a_end', state.finished],
    ];
    const got = [];
    for (const [id, ok] of checks) {
      if (ok && !state.ach[id]) { const r = grantAch(state, id, silent); if (r) got.push(r); }
    }
    if (global.CF.addons && global.CF.addons.achTick) {
      try { global.CF.addons.achTick(state, silent); } catch (e) { /* ignore addon errors */ }
    }
    return got;
  }

  /* ---------- day change ---------- */
  function onDayChange(state, now, silent) {
    // reputation drift
    addRep(state, 2 + state.upgrades.marketing * 3 + state.workers.brand.owned * 5);
    if (state.event && state.event.effect && state.event.effect.repPerDay) addRep(state, state.event.effect.repPerDay);

    // events
    if (state.event && state.day >= state.event.endsDay) endEvent(state);
    if (!state.event && state.day >= 2) {
      if (Math.random() < 0.30) rollEvent(state);
    }

    // contracts
    const c = state.contract;
    if (c.offer && state.day > c.offer.expiresDay) c.offer = null;
    if (c.active && state.day > c.active.endsDay) {
      addLog(state, 'Contract failed: ' + Defs.contract(c.active.tpl).name + '. The buyer went elsewhere.', 'bad');
      addRep(state, -30);
      c.active = null;
    }
    if (!c.active && c.forced) {
      const fid = c.forced;
      c.forced = null;
      startContract(state, fid);
    }
    if (!c.offer && !c.active && state.day >= 2) rollOffer(state);

    // mining: cave-in & lucky strike
    const mine = state.biz.mining;
    if (mine.unlocked) {
      if (now >= mine.caveUntil) {
        const risk = Math.min(0.5, 0.12 + mine.level * 0.02);
        if (Math.random() < risk) {
          mine.caveUntil = now + DAY();
          addLog(state, '⛏️ CAVE-IN at Chilirock Mining! Pay repairs to resume digging.', 'bad');
        } else if (Math.random() < 0.06) {
          const bonus = 200 * Math.max(1, mine.level);
          addMoney(state, bonus);
          mine.strikes++;
          addLog(state, '💎 Lucky strike! A seam of chili salt paid ' + fmt(bonus) + '!', 'money');
        }
      }
    }
    if (!silent) addLog(state, '☀️ Day ' + state.day + ' begins.', 'info');
    if (global.CF.addons && global.CF.addons.onDay) {
      try { global.CF.addons.onDay(state); } catch (e) { /* addons must never break the game */ }
    }
  }

  /* ---------- worker AI ---------- */
  function farmhandAction(state, now, silent) {
    const n = state.plotCount;
    let start = state.wt.fhIdx || 0;
    for (let i = 0; i < n; i++) {
      const idx = (start + i) % n;
      const p = state.plots[idx];
      if (p.status === 'ready' || p.status === 'wilted') { state.wt.fhIdx = idx; harvest(state, idx, now, silent); return; }
    }
    for (let i = 0; i < n; i++) {
      const idx = (start + i) % n;
      const p = state.plots[idx];
      if (p.status === 'empty') { state.wt.fhIdx = idx; plant(state, idx, state.selectedStrain, now); return; }
    }
    for (let i = 0; i < n; i++) {
      const idx = (start + i) % n;
      const p = state.plots[idx];
      if (p.status === 'growing' && p.boostUntil < now) { state.wt.fhIdx = idx; water(state, idx, now); return; }
    }
  }
  function buyerAction(state) {
    const lvl = state.workers.buyer.lvl;
    const batch = 25 + lvl * 25;
    const a = state.contract.active;
    const tpl = a ? Defs.contract(a.tpl) : null;
    for (const id in state.inventory.strains) {
      let have = state.inventory.strains[id];
      if (have <= 0) continue;
      if (tpl && id === tpl.strain) have = Math.max(0, have - a.qty); // reserve for the contract
      if (have > 0) {
        const n = Math.min(batch, have);
        const price = chiliPrice(state, id);
        const money = n * price;
        invSet(state, id, state.inventory.strains[id] - n);
        addMoney(state, money);
        state.stats.sold += n;
        addRep(state, n * 0.5);
        if (state.event && state.event.id === 'festival') state.story.festivalSold += n;
      }
    }
  }

  /* ---------- business ticks ---------- */
  function jerkyTick(state, dt) {
    const j = state.biz.jerky;
    if (!j.unlocked) return;
    const rate = (1 + j.level * 1.5) * (1 + state.workers.chef.owned * 0.35);
    const want = rate * dt;
    let available = Math.floor(chiliTotal(state) / 2);
    let made = Math.min(want, available);
    // consume chilis
    let need = made * 2;
    for (const id in state.inventory.strains) {
      if (need <= 0) break;
      const have = state.inventory.strains[id];
      const take = Math.min(have, need);
      invSet(state, id, have - take);
      need -= take;
    }
    if (made < 0.5) return;
    j.made += made;
    const recipe = Defs.RECIPES[j.recipe];
    let price = (8 + j.level * 3) * (1 + recipe.bonus) * (1 + Math.min(1, state.rep / 2000));
    if (state.event && state.event.effect && state.event.effect.jerkyMult) price *= state.event.effect.jerkyMult;
    if (state.legacy) price *= 1.1;
    const money = made * price;
    addMoney(state, money);
    j.sold += made;
  }
  function fashionTick(state, dt, now) {
    const f = state.biz.fashion;
    if (!f.unlocked || !f.collection) return;
    if (now >= f.collection.endsAt) {
      const col = Defs.COLLECTIONS.find(c => c.id === f.collection.id);
      addRep(state, col ? col.rep : 10);
      f.designed++;
      addLog(state, '👕 Collection sold out: ' + (col ? col.name : 'Limited Drop') + '!', 'good');
      f.collection = null;
      return;
    }
    let rate = f.collection.count / DAY() * (1 + f.level * 0.8) * (1 + state.rep / 1000) * (1 + state.workers.brand.owned * 0.1) * (1 + state.upgrades.marketing * 0.05);
    if (state.legacy) rate *= 1.1;
    addMoney(state, rate * dt);
  }
  function miningTick(state, dt, now) {
    const m = state.biz.mining;
    if (!m.unlocked) return;
    if (now < m.caveUntil) return;
    let rate = 1.2 * m.level * (1 + state.rep / 2000) * (1 + state.workers.brand.owned * 0.1);
    if (state.legacy) rate *= 1.1;
    addMoney(state, rate * dt);
  }
  function mediaTick(state, dt) {
    const md = state.biz.media;
    if (!md.unlocked) return;
    let rate = 20 * md.level * (1 + state.rep / 5000) * (1 + state.workers.brand.owned * 0.1);
    if (state.legacy) rate *= 1.1;
    addMoney(state, rate * dt);
    md.earned += rate * dt;
  }

  /* ---------- main tick ---------- */
  function tick(state, dt, now) {
    if (!dt || dt <= 0) return;
    const DAYS = DAY();
    state.dayClock += dt;
    let rolls = 0;
    while (state.dayClock >= DAYS && rolls < 12) {
      state.dayClock -= DAYS;
      state.day++;
      state.totalDays++;
      onDayChange(state, now, !!state._offline);
      rolls++;
    }
    if (rolls === 0) { /* no day change */ }

    // plots
    const gMult = growthEventMult(state);
    for (let i = 0; i < state.plotCount; i++) {
      const p = state.plots[i];
      if (p.status === 'growing') {
        const boost = now < p.boostUntil ? 2 : 1;
        p.progress += dt * boost * gMult;
        if (p.progress >= growTime(state, p.strain)) {
          p.status = 'ready';
          p.readyAt = now;
          addLog(state, Defs.strain(p.strain).emoji + ' Plot ' + (i + 1) + ': ' + Defs.strain(p.strain).name + ' ready to harvest!', 'good');
        }
      } else if (p.status === 'ready' && p.readyAt && now - p.readyAt > growTime(state, p.strain) * 1.5) {
        p.status = 'wilted';
        addLog(state, '🥀 Plot ' + (i + 1) + ' wilted! Harvest now for half yield.', 'bad');
      }
    }

    // farmhands
    const fh = state.workers.farmhand;
    if (fh.owned > 0) {
      state.wt.farmhand += dt;
      const interval = Math.max(1.2, 7 / (1 + fh.owned * 1.1));
      while (state.wt.farmhand >= interval) {
        state.wt.farmhand -= interval;
        farmhandAction(state, now, !!state._offline);
      }
    }
    // buyer
    const by = state.workers.buyer;
    if (by.owned > 0) {
      state.wt.buyer += dt;
      const interval = Math.max(2, 6 - by.lvl * 0.7) / (1 + 0.5 * (by.owned - 1));
      while (state.wt.buyer >= interval) {
        state.wt.buyer -= interval;
        buyerAction(state);
      }
    }

    // businesses
    jerkyTick(state, dt);
    fashionTick(state, dt, now);
    miningTick(state, dt, now);
    mediaTick(state, dt);

    // strain unlocks by money
    for (const st of Defs.STRAINS) {
      if (st.unlock.type === 'money' && state.money >= st.unlock.v && state.unlocked.indexOf(st.id) === -1) {
        state.unlocked.push(st.id);
        addLog(state, st.emoji + ' New strain unlocked: ' + st.name + '!', 'story');
      }
    }

    // story & achievements
    if (story()) story().tick(state, dt, now, api);
    achTick(state, !!state._offline);

    state.last = now;
    state.timeOfDay = (state.dayClock / DAYS) * 24;
  }

  /* ---------- offline progress ---------- */
  function processOffline(state, elapsed, now) {
    const cap = 8 * 3600;
    elapsed = Math.min(elapsed, cap);
    if (elapsed < 30) return 0;
    const driverMult = 1 + 0.6 * state.workers.driver.owned;
    state._offline = true;
    const steps = Math.min(600, Math.max(10, Math.ceil(elapsed / 60)));
    const chunk = elapsed / steps;
    const earned0 = state.stats.earned;
    let t = state.last;
    for (let i = 0; i < steps; i++) {
      t += chunk;
      tick(state, chunk * driverMult, t);
    }
    state._offline = false;
    const gained = state.stats.earned - earned0;
    if (gained > 0) state.stats.offlineEarned += gained;
    state.last = now;
    if (gained > 0) addLog(state, '⏰ While you were away: +' + fmt(gained) + (driverMult > 1 ? ' (driver bonus x' + driverMult.toFixed(1) + ')' : ''), 'money');
    return gained;
  }

  const api = {
    money: addMoney,
    rep: addRep,
    log: addLog,
    forceContract,
    spend,
    fmt,
  };

  const logic = {
    invGet, invSet, invAdd, storageCap, chiliTotal,
    addMoney, addRep, addLog, spend, totalWorkers,
    fmt, fmtC, tfmt,
    marketMult, chiliPrice, growTime, harvestYield,
    plant, water, harvest, sellStrain, sellAll,
    hireWorker, trainWorker,
    buyUpgrade, buyLand, buyResearch, treatPests,
    buyBusiness, bizLevelUp, recipeUp, designCollection, mineRepair,
    rollOffer, acceptContract, forceContract, deliverContract,
    rollEvent, endEvent,
    grantAch, achTick,
    farmhandAction, buyerAction,
    jerkyTick, fashionTick, miningTick, mediaTick,
    tick, processOffline,
    api,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = logic;
  global.CF = global.CF || {};
  global.CF.logic = logic;
})(typeof window !== 'undefined' ? window : globalThis);

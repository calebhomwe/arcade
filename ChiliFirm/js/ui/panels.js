/* ============================================================
   Chili Firm 2 — Panel content (shop / market / crew / lab /
   empire / trophies / settings). Each renderer returns HTML.
   Buttons carry data-cost so affordability updates live.
   ============================================================ */
(function (global) {
  'use strict';

  const Defs = global.CF.defs;
  const Logic = global.CF.logic;
  const A = global.CF.art;
  const fmt = Logic.fmt, fmtC = Logic.fmtC, tfmt = Logic.tfmt;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const I = (n, s) => A.icon(n, s);
  const money = n => fmt(n).replace('$', '');
  const costBtn = (action, id, cost, label, cls, extra) =>
    `<button class="btn small ${cls || ''}" data-action="${action}" ${id ? `data-id="${id}"` : ''} data-cost="${cost}" ${extra || ''}>${label} ${I('coin', 20)}${money(cost)}</button>`;
  const pips = (n, max) => `<div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
  function heatHtml(n) {
    return `<span class="heat">${Array.from({ length: Math.min(9, n) }, () => I('fire', 16)).join('')}</span>`;
  }

  const TILE = ['linear-gradient(#b8ff8a,#3fbf2a)', 'linear-gradient(#ffe066,#ff9a00)', 'linear-gradient(#ffb03a,#e8231b)', 'linear-gradient(#e0a0ff,#8f5bff)', 'linear-gradient(#9be9ff,#2f7de1)', 'linear-gradient(#ff9ec8,#e8318a)'];

  /* ---------------- SEEDS ---------------- */
  function seeds(state) {
    const cards = Defs.STRAINS.map((st, i) => {
      const un = state.unlocked.indexOf(st.id) !== -1;
      const sel = state.selectedStrain === st.id;
      const req = st.unlock.type === 'money' ? 'Unlocks when you hold ' + fmt(st.unlock.v) : st.unlock.type === 'research' ? 'Unlock with R&D in the Lab' : 'Starter seed';
      const demo = { strain: st.id, status: 'ready' };
      return `<div class="card ${sel ? 'sel' : ''} ${un ? '' : 'locked'}" ${un ? `data-action="sel-strain" data-id="${st.id}"` : ''} style="cursor:${un ? 'pointer' : 'default'}">
        ${sel ? '<span class="ribbon green">PLANTING</span>' : ''}${un ? '' : `<span class="lockico">${I('lock', 34)}</span>`}
        <div class="art" style="--tile:${TILE[i % TILE.length]}">${A.plantSvg(demo, 1, i + 3, state.upgrades.soil, i)}</div>
        <h4>${esc(st.name)}</h4>
        <div class="meta">${heatHtml(st.heat)}</div>
        <div class="meta"><span class="chip">${I('clock', 18)}${tfmt(Logic.growTime(state, st.id))}</span><span class="chip">${I('coin', 18)}${fmtC(Logic.chiliPrice(state, st.id)).replace('$', '')} ea</span></div>
        <p>${un ? esc(st.blurb) : esc(req)}</p>
        ${un ? `<button class="btn small ${sel ? 'gold' : ''} wide" data-action="sel-strain" data-id="${st.id}">${sel ? I('check', 22) + 'Selected' : I('seed', 22) + 'Plant this'}</button>` : ''}
      </div>`;
    }).join('');
    return { title: 'Seed Shop', icon: 'seed', body: `<div class="sect">${I('seed', 30)} Pick what you plant <small>Tap an empty pot to plant it. Hotter peppers pay more but grow slower.</small></div><div class="grid">${cards}</div>` };
  }

  /* ---------------- MARKET ---------------- */
  const CONTRACT_LINES = {
    c_bodega: 'Twenty jalapeños. And don’t be stingy with the heat.',
    c_taco: 'My truck needs fire for taco Tuesday. Abuela never let me down.',
    c_sauce: 'Our backers demand pain. Deliver the pain.',
    c_caterer: 'The fair wants “weaponized salsa.” You’re my only supplier.',
    c_chain: 'Corporate wants a “signature inferno.” I want it legendary.',
    c_export: 'Overseas collectors pay double for the real thing. Ship it.',
    c_big: 'Vega wants his chilis. Show him what this farm is made of.',
  };
  function contractLine(id) {
    if (CONTRACT_LINES[id]) return CONTRACT_LINES[id];
    const pool = ['If it’s half as good as Abuela’s, we’ll buy forever.', 'Make it hot. Then make it hotter.', 'Our regulars ask about your farm by name now.', 'We tell everyone the chilis come from Verde Springs.'];
    let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return pool[h % pool.length];
  }
  function clientCfg(id) {
    let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    if (id === 'c_taco') return A.CAST.dana;
    if (id === 'c_big') return A.CAST.vega;
    return A.randomCustomer(h % 997);
  }
  function market(state) {
    const total = Math.floor(Logic.chiliTotal(state));
    let value = 0;
    for (const id in state.inventory.strains) value += (state.inventory.strains[id] || 0) * Logic.chiliPrice(state, id);
    const mult = Logic.marketMult(state);
    const rows = Defs.STRAINS.filter(st => state.unlocked.indexOf(st.id) !== -1).map(st => {
      const stock = Math.floor(Logic.invGet(state, st.id));
      const price = Logic.chiliPrice(state, st.id);
      return `<div class="mrow">
        <div class="pw">${A.pepper(st.id, 44)}</div>
        <div><div class="nm">${esc(st.name)}</div><div class="sub">${stock} in stock</div></div>
        <div class="price">${I('coin', 18)} ${fmtC(price).replace('$', '')}<small>each</small></div>
        <div class="acts">
          <button class="btn tiny blue" data-action="sell-strain" data-id="${st.id}" data-qty="10" ${stock > 0 ? '' : 'disabled'}>Sell 10</button>
          <button class="btn tiny gold" data-action="sell-strain" data-id="${st.id}" data-qty="999999" ${stock > 0 ? '' : 'disabled'}>Sell all</button>
        </div></div>`;
    }).join('');

    let order = '';
    const c = state.contract;
    if (c.active) {
      const tpl = Defs.contract(c.active.tpl), sd = Defs.strain(tpl.strain);
      const have = Math.floor(Logic.invGet(state, tpl.strain));
      const est = (c.active.qty * Logic.chiliPrice(state, tpl.strain) * tpl.mult);
      const left = Math.max(0, c.active.endsDay - state.day);
      order = `<div class="order ${left <= 1 ? 'critical' : ''}">
        <div class="who">${A.character(clientCfg(tpl.id), { bust: true })}</div>
        <div style="flex:1">
          <h4>${esc(tpl.name)}</h4><q>${esc(contractLine(tpl.id))}</q>
          <div class="row"><span class="chip">${A.pepper(tpl.strain, 18)} ${tpl.qty - c.active.qty}/${tpl.qty} ${esc(sd.name)}</span><span class="chip">${I('clock', 18)}${left} day${left === 1 ? '' : 's'} left</span><span class="chip">${I('coin', 18)}${money(est)}</span></div>
          <div class="bar"><i style="width:${Math.min(100, (tpl.qty - c.active.qty) / tpl.qty * 100)}%"></i></div>
          <button class="btn gold" data-action="deliver-contract" ${have > 0 ? '' : 'disabled'}>${I('truck', 26)} Deliver ${Math.min(have, c.active.qty)}</button>
          ${have > 0 ? '' : `<small style="margin-left:8px;color:#6a4a70;font-weight:600">Grow ${esc(sd.name)} to deliver</small>`}
        </div></div>`;
    } else if (c.offer) {
      const tpl = Defs.contract(c.offer.tpl), sd = Defs.strain(tpl.strain);
      const est = (tpl.qty * Logic.chiliPrice(state, tpl.strain) * tpl.mult);
      order = `<div class="order">
        <div class="who">${A.character(clientCfg(tpl.id), { bust: true })}</div>
        <div style="flex:1">
          <h4>${esc(tpl.name)}</h4><q>${esc(contractLine(tpl.id))}</q>
          <div class="row"><span class="chip">${A.pepper(tpl.strain, 18)} ${tpl.qty} ${esc(sd.name)}</span><span class="chip">${I('clock', 18)}${tpl.days} days</span><span class="chip">${I('fire', 18)}${tpl.mult}x price</span><span class="chip">${I('coin', 18)}${money(est)}</span></div>
          <div style="margin-top:8px"><button class="btn" data-action="accept-contract">${I('handshake', 26)} Sign the deal</button></div>
        </div></div>`;
    } else order = `<div class="empty-note">No deals on the table. New clients show up every morning.</div>`;

    return {
      title: 'Market', icon: 'market',
      body: `<div class="sellall">${I('cash', 64).replace('class="ico ', 'class="ico lg ')}
          <div><div class="lbl">${total} chilis in the stash &middot; market ${Math.round(mult * 100)}%</div><div class="big">${fmt(value)}</div></div>
          <button class="btn gold" data-action="sell-all" ${total > 0 ? '' : 'disabled'}>${I('coin', 34)} SELL ALL</button></div>
        <div class="sect">${I('handshake', 30)} Big deals <small>Contracts pay way over market.</small></div>${order}
        <div class="sect">${I('chili', 30)} Your stash <small>Prices move every day. Festivals pay the most.</small></div>
        <div class="mlist">${rows}</div>`,
    };
  }

  /* ---------------- CREW ---------------- */
  const CREW_LOOK = {
    farmhand: { hat: 'cowboy', outfit: 'vest', top: '#2fbf55', hold: 'can' },
    buyer: { hat: 'cap', hatCol: '#2f7de1', outfit: 'jacket', top: '#2f7de1', stripe: '#fff', hold: 'clip' },
    foreman: { hat: 'hardhat', outfit: 'vest', top: '#ff8a00', tee: '#6b7380' },
    driver: { hat: 'cap', hatCol: '#ffd12a', outfit: 'jacket', top: '#e8231b', stripe: '#ffd12a' },
    chef: { hat: 'chef', outfit: 'apron', top: '#fff', apron: '#fff', beard: 'stache' },
    brand: { hat: 'headset', outfit: 'suit', top: '#8f5bff', tie: '#ffd12a', eyes: 'shades' },
  };
  function crewCfg(id, i) { return Object.assign(A.randomCustomer(40 + i * 11), { beard: null }, CREW_LOOK[id] || {}); }
  function crew(state) {
    const cards = Defs.WORKERS.map((w, i) => {
      const rec = state.workers[w.id];
      const tcost = rec.lvl < 5 ? Defs.trainCost(w, rec.lvl) : 0;
      return `<div class="card">
        ${rec.owned ? `<span class="ribbon green">x${rec.owned}</span>` : ''}
        <div class="art" style="--tile:${TILE[(i + 4) % TILE.length]}">${A.character(crewCfg(w.id, i), { bust: true })}</div>
        <h4>${esc(w.name)}</h4>
        <div class="meta"><span class="chip flat">${rec.owned}/${w.max} hired</span><span class="chip flat">Skill ${rec.lvl}/5</span></div>
        ${pips(rec.lvl, 5)}
        <p>${esc(w.desc)}</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${rec.owned >= w.max ? '<button class="btn small" disabled>Full crew</button>' : costBtn('hire', w.id, w.cost, 'Hire', '')}
          ${rec.owned === 0 || rec.lvl >= 5 ? `<button class="btn small blue" disabled>${rec.lvl >= 5 ? 'Max skill' : 'Train'}</button>` : costBtn('train', w.id, tcost, 'Train', 'blue')}
        </div>
      </div>`;
    }).join('');
    return { title: 'The Crew', icon: 'crew', body: `<div class="sect">${I('crew', 30)} Hire the squad <small>Workers plant, water, harvest and sell while you run the show.</small></div><div class="grid">${cards}</div>` };
  }

  /* ---------------- LAB / UPGRADES ---------------- */
  const UPG_VIS = { soil: 'New pots in the grow room', irrigation: 'Adds the water tank + drip lines', greenhouse: 'Brighter grow lights', fertilizer: 'More sauce bottles on the shelf', storage: 'Unlocks the Cold Stash fridge', marketing: 'Turns on the neon signs' };
  function lab(state, tab) {
    tab = tab || 'upg';
    const tabs = [['upg', 'lamp', 'Upgrades'], ['rnd', 'dna', 'R&D']];
    let body = '';
    if (tab === 'upg') {
      const nextLand = Defs.LAND.find(l => l.plots > state.plotCount);
      const landCard = nextLand ? `<div class="card"><span class="ribbon">MORE POTS</span>
          <div class="art" style="--tile:${TILE[2]}">${I('map', 70)}</div>
          <h4>${esc(nextLand.name)}</h4><div class="meta"><span class="chip flat">${state.plotCount} &rarr; ${nextLand.plots} pots</span></div>
          <p>Expand the operation. New pots show up in the grow rooms.</p>
          ${costBtn('buy-land', '', nextLand.cost, 'Expand', 'gold wide')}</div>` : '';
      body = `<div class="sect">${I('lamp', 30)} Grow room upgrades <small>Every upgrade shows up in the room.</small></div><div class="grid">` + landCard + Defs.UPGRADES.map((u, i) => {
        const lvl = state.upgrades[u.id];
        const cost = lvl < u.max ? Defs.upgradeCost(u, lvl) : 0;
        return `<div class="card">
          <div class="art" style="--tile:${TILE[(i + 1) % TILE.length]}">${A.iconFor(u.id, 70)}</div>
          <h4>${esc(u.name)}</h4>${pips(lvl, u.max)}
          <p>${esc(u.desc)}<br><b style="color:#8f5bff">${esc(UPG_VIS[u.id] || '')}</b></p>
          ${cost ? costBtn('buy-upgrade', u.id, cost, 'Upgrade', 'purple wide') : '<button class="btn small wide" disabled>MAXED</button>'}
        </div>`;
      }).join('') + '</div>';
    } else {
      body = `<div class="sect">${I('dna', 30)} Research &amp; Development <small>Breakthroughs that change the game.</small></div><div class="grid wide">` + Defs.RESEARCH.map((r, i) => {
        const done = state.research.indexOf(r.id) !== -1;
        return `<div class="card">${done ? '<span class="ribbon green">DONE</span>' : ''}
          <div class="art" style="--tile:${TILE[(i + 3) % TILE.length]}">${A.iconFor(r.id, 70)}</div>
          <h4>${esc(r.name)}</h4><p>${esc(r.desc)}</p>
          ${done ? '<button class="btn small wide" disabled>Complete</button>' : costBtn('buy-research', r.id, r.cost, 'Research', 'blue wide')}
        </div>`;
      }).join('') + '</div>';
    }
    return { title: 'Upgrades', icon: 'lab', tabs: tabs.map(t => `<button class="tab ${tab === t[0] ? 'on' : ''}" data-action="ptab" data-id="${t[0]}">${I(t[1], 22)}${t[2]}</button>`).join(''), body };
  }

  /* ---------------- EMPIRE ---------------- */
  function empire(state, tab) {
    const first = Defs.BUSINESSES.find(b => state.biz[b.id].unlocked);
    tab = tab && Defs.biz(tab) ? tab : (first ? first.id : 'jerky');
    const tabs = Defs.BUSINESSES.map(b => `<button class="tab ${tab === b.id ? 'on' : ''} ${state.biz[b.id].unlocked ? '' : 'locked'}" data-action="ptab" data-id="${b.id}">${state.biz[b.id].unlocked ? A.iconFor(b.id, 22) : I('lock', 22)}${esc(b.short)}</button>`).join('');
    const b = Defs.biz(tab), rec = state.biz[tab];
    const artFor = { jerky: A.smoker, fashion: A.merchRack, mining: A.pickaxes, media: A.tvSet }[tab];
    let body = `<div class="bizhero"><div class="bart">${artFor()}</div><div><h3>${esc(b.name)}</h3><p>${esc(b.desc)}</p></div></div>`;
    if (!rec.unlocked) {
      const reqs = [];
      if (b.unlock.money) reqs.push(`<span class="chip">${I('coin', 18)}Hold ${money(b.unlock.money)}</span>`);
      if (b.unlock.rep) reqs.push(`<span class="chip">${I('star', 18)}${b.unlock.rep.toLocaleString()} rep</span>`);
      const ok = (!b.unlock.money || state.money >= b.unlock.money) && (!b.unlock.rep || state.rep >= b.unlock.rep);
      body += `<div class="sect">${I('lock', 30)} Locked <small>Meet the requirements, or keep following the story.</small></div>
        <div class="acts-row">${reqs.join('')}</div>
        <div class="acts-row">${ok ? costBtn('buy-biz', b.id, b.baseCost, 'Launch it', 'gold') : '<button class="btn" disabled>Not yet</button>'}</div>`;
      return { title: 'Empire', icon: 'empire', tabs, body };
    }
    const lvCost = Defs.bizCost(b, rec.level);
    const maxed = rec.level >= b.levels.max;
    const lvBtn = maxed ? '<button class="btn" disabled>MAX LEVEL</button>' : costBtn('biz-level', b.id, lvCost, esc(b.levels.name), 'gold');
    if (tab === 'jerky') {
      const j = rec, recipe = Defs.RECIPES[j.recipe], next = Defs.RECIPES[j.recipe + 1];
      const rate = (1 + j.level * 1.5) * (1 + state.workers.chef.owned * 0.35);
      const price = (8 + j.level * 3) * (1 + recipe.bonus) * (1 + Math.min(1, state.rep / 2000));
      body += `<div class="stats"><div class="stat"><small>Level</small><b>${j.level}</b></div><div class="stat"><small>Output</small><b>${rate.toFixed(1)}/s</b></div><div class="stat"><small>Jerky value</small><b>${fmtC(price)}</b></div><div class="stat"><small>Made</small><b>${Math.floor(j.made).toLocaleString()}</b></div></div>
        <div class="sect">${I('jerky', 28)} Recipe: ${esc(recipe.name)} <small>+${Math.round(recipe.bonus * 100)}% value. Uses 2 chilis per jerky.</small></div>
        <div class="acts-row">${lvBtn}${next ? costBtn('recipe-up', '', next.cost, 'Learn ' + esc(next.name), 'blue') : '<button class="btn blue" disabled>All recipes learned</button>'}</div>`;
    } else if (tab === 'fashion') {
      const f = rec, col = f.collection;
      let live = '';
      if (col) {
        const total = 3 * Defs.DAY_SECONDS, left = Math.max(0, col.endsAt - Date.now() / 1000);
        const cdef = Defs.COLLECTIONS.find(c => c.id === col.id);
        live = `<div class="stat" style="margin-top:8px"><small>Live drop: ${cdef ? esc(cdef.name) : ''} &middot; sells out in ${tfmt(left)}</small><div class="progress"><i style="width:${Math.min(100, (total - left) / total * 100)}%"></i></div></div>`;
      }
      body += `<div class="stats"><div class="stat"><small>Brand level</small><b>${f.level}</b></div><div class="stat"><small>Drops sold out</small><b>${f.designed}</b></div><div class="stat"><small>Hype (rep)</small><b>${Math.floor(state.rep).toLocaleString()}</b></div></div>${live}
        <div class="sect">${I('shirt', 28)} Design a drop <small>Runs for 3 days and earns the whole time.</small></div>
        <div class="acts-row">${Defs.COLLECTIONS.map(cc => costBtn('design', cc.id, cc.cost, esc(cc.name), 'purple', col ? 'disabled' : '')).join('')}</div>
        <div class="acts-row">${lvBtn}</div>`;
    } else if (tab === 'mining') {
      const m = rec, caved = Date.now() / 1000 < m.caveUntil;
      const rate = 1.2 * m.level * (1 + state.rep / 2000) * (1 + state.workers.brand.owned * 0.1);
      body += `<div class="stats"><div class="stat"><small>Mine level</small><b>${m.level}</b></div><div class="stat"><small>Income</small><b>${caved ? 'CAVE-IN' : fmtC(rate) + '/s'}</b></div><div class="stat"><small>Lucky strikes</small><b>${m.strikes}</b></div></div>
        ${caved ? `<div class="acts-row">${costBtn('mine-repair', '', 500 * Math.max(1, m.level), 'Fix the cave-in', 'red')}</div>` : ''}
        <div class="acts-row">${lvBtn}</div>`;
    } else {
      const md = rec;
      const rate = 20 * md.level * (1 + state.rep / 5000) * (1 + state.workers.brand.owned * 0.1);
      body += `<div class="stats"><div class="stat"><small>Network level</small><b>${md.level}</b></div><div class="stat"><small>Income</small><b>${fmtC(rate)}/s</b></div><div class="stat"><small>Ad revenue</small><b>${fmt(md.earned)}</b></div></div>
        <div class="acts-row">${lvBtn}</div>`;
    }
    return { title: 'Empire', icon: 'empire', tabs, body };
  }

  /* ---------------- TROPHIES / STATS ---------------- */
  const ACH_ICON = { a_first: 'seed', a_harvest: 'chili', a_100: 'basket', a_1000: 'crown', a_10000: 'medal', a_money1: 'coin', a_money10: 'cash', a_money100: 'cash', a_money1m: 'building', a_worker5: 'crew', a_worker10: 'crew', a_upgrade5: 'lamp', a_strain3: 'seed', a_strainall: 'crown', a_biz1: 'empire', a_biz4: 'building', a_contract: 'handshake', a_festival: 'trophy', a_rep500: 'star', a_rep2000: 'star', a_offline: 'clock', a_royal: 'crown', a_end: 'trophy' };
  function trophy(state, tab, extra) {
    tab = tab || 'ach';
    const tabs = [['ach', 'trophy', 'Trophies'], ['stats', 'chart', 'Ledger'], ['save', 'save', 'Save']].map(t => `<button class="tab ${tab === t[0] ? 'on' : ''}" data-action="ptab" data-id="${t[0]}">${I(t[1], 22)}${t[2]}</button>`).join('');
    let body = '';
    if (tab === 'ach') {
      const n = Object.keys(state.ach).length;
      body = `<div class="sect">${I('trophy', 30)} ${n} / ${Defs.ACHIEVEMENTS.length} unlocked</div><div class="achs">` + Defs.ACHIEVEMENTS.map(a => {
        const on = !!state.ach[a.id];
        return `<div class="ach ${on ? '' : 'off'}">${I(on ? (ACH_ICON[a.id] || 'medal') : 'lock', 38)}<div><b>${esc(a.name)}</b><small>${esc(a.desc)}${a.reward && a.reward.money ? ' &middot; +' + fmt(a.reward.money) : ''}</small></div></div>`;
      }).join('') + '</div>';
    } else if (tab === 'stats') {
      const s = state.stats;
      const rows = [['Days in business', state.totalDays], ['Lifetime earned', fmt(s.earned)], ['Lifetime spent', fmt(s.spent)], ['Chilis harvested', s.harvested.toLocaleString()], ['Chilis sold', s.sold.toLocaleString()], ['Best harvest', s.bestHarvest], ['Deals closed', s.contracts], ['Festivals won', s.festivals], ['Jerky made', Math.floor(state.biz.jerky.made).toLocaleString()], ['Drops sold out', state.biz.fashion.designed], ['Mine strikes', state.biz.mining.strikes], ['Earned while away', fmt(s.offlineEarned)], ['Reputation', Math.floor(state.rep).toLocaleString()], ['Crew size', Logic.totalWorkers(state)]];
      body = `<div class="sect">${I('chart', 30)} Empire ledger</div><div class="stats">${rows.map(r => `<div class="stat"><small>${r[0]}</small><b>${r[1]}</b></div>`).join('')}</div>`;
      const addons = (global.CF.addons || []).filter(a => a && a.render);
      addons.forEach(a => {
        let inner = '';
        try { inner = a.render(state); } catch (e) { inner = ''; }
        inner = String(inner).replace(/\p{Extended_Pictographic}️?/gu, '');
        body += `<div class="sect">${I('news', 28)} ${esc(String(a.title || 'Extras').replace(/\p{Extended_Pictographic}️?/gu, '').trim())}</div><div class="card" style="font-size:14px">${inner}</div>`;
      });
    } else {
      body = `<div class="sect">${I('save', 30)} Save data <small>Autosaves every 15 seconds.</small></div>
        <div class="acts-row"><button class="btn" data-action="save">${I('save', 24)} Save now</button><button class="btn blue" data-action="export">Export code</button><button class="btn red" data-action="confirm-reset">Wipe save</button></div>
        <textarea id="import-box" class="save" rows="4" placeholder="Paste an exported save code here...">${esc(extra && extra.exportCode || '')}</textarea>
        <div class="acts-row"><button class="btn purple" data-action="import">Import code</button></div>
        <div class="sect">${I('star', 28)} Credits</div>
        <div class="credits"><b>Chili Firm 2: Replanted</b> &mdash; all characters, plants, props and icons are original vector art made for this game.<br>
        Fonts: <b>Lilita One</b> (Juan Montoreano) and <b>Fredoka</b> (The Fredoka Project Authors), SIL Open Font License 1.1.<br>
        Sound and beat: synthesized live in the browser. See LICENSES.md.</div>`;
    }
    return { title: 'Trophies', icon: 'trophy', tabs, body };
  }

  /* ---------------- SETTINGS ---------------- */
  function settings(state) {
    const s = state.settings;
    return {
      title: 'Settings', icon: 'gear',
      body: `<div class="grid">
        <div class="card"><div class="art" style="--tile:${TILE[4]}">${I(s.sound ? 'soundOn' : 'soundOff', 70)}</div><h4>Sound effects</h4><p>Pops, coins and cash registers.</p><button class="btn small wide ${s.sound ? '' : 'ghost'}" data-action="sound">${s.sound ? 'ON' : 'OFF'}</button></div>
        <div class="card"><div class="art" style="--tile:${TILE[3]}">${I('music', 70)}</div><h4>Beat</h4><p>Tito’s lo-fi grow-room beat.</p><button class="btn small wide ${s.music ? '' : 'ghost'}" data-action="music">${s.music ? 'ON' : 'OFF'}</button></div>
        <div class="card"><div class="art" style="--tile:${TILE[1]}">${I('fast', 70)}</div><h4>Game speed</h4><p>Speed up the clock.</p><button class="btn small wide gold" data-action="speed">${s.speed}x</button></div>
        <div class="card"><div class="art" style="--tile:${TILE[0]}">${I('save', 70)}</div><h4>Save</h4><p>Your farm autosaves.</p><button class="btn small wide" data-action="save">Save now</button></div>
      </div>`,
    };
  }

  global.CF.panels = { seeds, market, crew, lab, empire, trophy, settings, contractLine, clientCfg, crewCfg };
})(typeof window !== 'undefined' ? window : globalThis);

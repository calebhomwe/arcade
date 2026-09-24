/* ============================================================
   Chili Firm 2 — UI layer (DOM rendering + input wiring)
   ============================================================ */
(function (global) {
  'use strict';

  const Defs = global.CF.defs;
  const Logic = global.CF.logic;

  const ui = {
    view: 'farm',
    cache: { achCount: 0, eventId: null, multDay: -1, prevMult: 1, lastMoney: 0, moneyFloat: 0 },
    modal: null, // {type:'dialogue'|'choice'|'tutorial'|'confirm', ...}
  };

  const $ = sel => document.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = Logic.fmt, fmtC = Logic.fmtC, tfmt = Logic.tfmt;

  // 3D-rendered strain sprites (Sketchfab CC-BY models; see CREDITS.md)
  const STRAIN_SPRITE = {
    jalapeno: 'chili-green', serrano: 'chili-green', cayenne: 'chili-red',
    habanero: 'chili-orange', birdseye: 'chili-red', ghost: 'chili-red',
    scorpion: 'chili-red', reaper: 'chili-red', royal: 'chili-orange',
  };
  const STRAIN_FILTER_EXTRA = { serrano: ' brightness(1.1)', birdseye: ' scale(0.8)', ghost: ' brightness(0.8)', scorpion: ' saturate(1.4)', reaper: ' brightness(0.65) saturate(1.2)', royal: ' hue-rotate(35deg) saturate(1.3)' };
  function strainSprite(st, px) {
    const base = STRAIN_SPRITE[st.id] || 'chili-red';
    const extra = STRAIN_FILTER_EXTRA[st.id] || '';
    const f = extra + ' drop-shadow(0 3px 3px rgba(42,22,16,.45))';
    return '<img src="img/' + base + '.png" alt="' + esc(st.name) + '" style="width:' + px + 'px;height:' + px + 'px;filter:' + f + ';vertical-align:middle">';
  }

  /* ---------------- toast ---------------- */
  function toast(msg, kind) {
    const box = $('#toasts');
    const d = document.createElement('div');
    d.className = 'toast' + (kind ? ' ' + kind : '');
    d.textContent = msg;
    box.appendChild(d);
    setTimeout(() => d.remove(), 2700);
    while (box.children.length > 4) box.firstChild.remove();
  }

  /* ---------------- contract flavor ---------------- */
  const CONTRACT_LINES = {
    c_bodega: 'Twenty jalapeños. And don\u2019t be stingy with the heat.',
    c_taco: 'My truck needs fire for taco Tuesday. Abuela never let me down.',
    c_sauce: 'Our Kickstarter backers demand pain. Deliver the pain.',
    c_caterer: 'The fair wants \u201cweaponized salsa.\u201d You\u2019re my only supplier.',
    c_chain: 'Corporate wants a \u201csignature inferno.\u201d I want it legendary.',
    c_export: 'Overseas collectors pay double for the real thing. Ship it.',
    c_big: 'Vega wants his chilis. Show him what this farm is made of.',
  };
  const CONTRACT_LINE_POOL = [
    'If it\u2019s half as good as Abuela\u2019s, we\u2019ll buy forever.',
    'The festival crowd gets louder every single year.',
    'Make it hot. Then make it hotter.',
    'Our regulars ask about your farm by name now.',
    'We tell everyone the chilis come from Verde Springs.',
  ];
  function contractLine(id) {
    if (CONTRACT_LINES[id]) return CONTRACT_LINES[id];
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return CONTRACT_LINE_POOL[h % CONTRACT_LINE_POOL.length];
  }

  /* ---------------- harvest juice ---------------- */
  function reducedMotion() {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function harvestBurst(plotEl) {
    if (!plotEl || reducedMotion()) return;
    const r = plotEl.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const emojis = ['🌶️', '✨', '🌶️', '💨', '✨', '🌶️'];
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('span');
      p.className = 'fx-particle';
      p.textContent = emojis[i];
      p.style.left = cx + (Math.random() - 0.5) * 26 + 'px';
      p.style.top = cy + 'px';
      p.style.setProperty('--dx', ((Math.random() - 0.5) * 90) + 'px');
      p.style.setProperty('--dy', (-50 - Math.random() * 60) + 'px');
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 950);
    }
  }
  function plotRecoil(plotEl) {
    if (!plotEl || reducedMotion()) return;
    plotEl.classList.remove('plot-recoil');
    void plotEl.offsetWidth;
    plotEl.classList.add('plot-recoil');
  }
  function floatText(x, y, text, cls) {
    if (reducedMotion()) return;
    const d = document.createElement('div');
    d.className = 'float-text ' + (cls || 'gold');
    d.textContent = text;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1100);
  }

  /* ---------------- body time-of-day ---------------- */
  function setTimeOfDay(state) {
    const DAY = Defs.DAY_SECONDS;
    const h = (state.timeOfDay != null ? state.timeOfDay : (state.dayClock / DAY) * 24) % 24;
    let cls = 'day';
    if (h >= 5 && h < 8) cls = 'dawn';
    else if (h >= 18 && h < 21) cls = 'dusk';
    else if (h >= 21 || h < 5) cls = 'night';
    const body = document.body;
    if (body.className !== cls) body.className = cls;
  }

  /* ---------------- topbar ---------------- */
  function renderTopbar(state) {
    const chili = Logic.chiliTotal(state);
    const owned = Object.values(state.biz).filter(b => b.unlocked).length;
    const h = state.timeOfDay != null ? state.timeOfDay : 8;
    const hh = String(Math.floor(h) % 24).padStart(2, '0');
    const mm = String(Math.floor((h % 1) * 60)).padStart(2, '0');
    const clockIco = h >= 5 && h < 18 ? '☀️' : '🌙';
    const speed = state.settings.speed;
    const milestones = [500, 2000, 5000];
    let next = milestones.find(t => state.rep < t);
    if (!next) next = 5000;
    const repPct = Math.min(100, state.rep / next * 100);
    $('#topbar').innerHTML = `
      <div class="tb-stat"><span class="ico">💰</span><div><small>Cash</small><span class="val money-val">${fmt(state.money)}</span><div class="xp-bar" title="Reputation ${Math.floor(state.rep)} / ${next}"><i style="width:${repPct}%"></i></div></div></div>
      <div class="tb-stat"><span class="ico">🌶️</span><div><small>Chilis</small><span class="val">${chili}/${Logic.storageCap(state)}</span></div></div>
      <div class="tb-stat"><span class="ico">⭐</span><div><small>Reputation</small><span class="val rep-val">${Math.floor(state.rep).toLocaleString()}</span></div></div>
      <div class="tb-stat"><span class="ico">${clockIco}</span><div><small>Day ${state.day}</small><span class="val">${hh}:${mm}</span></div></div>
      <div class="tb-stat"><span class="ico">🏢</span><div><small>Businesses</small><span class="val">${owned}/4</span></div></div>
      <div id="tb-right">
        <button class="tb-btn" data-action="speed" title="Game speed">⏩ ${speed}x</button>
        <button class="tb-btn" data-action="sound" title="Toggle sound">${state.settings.sound ? '🔊' : '🔇'}</button>
        <button class="tb-btn" data-action="save" title="Save now">💾</button>
      </div>`;
  }

  /* ---------------- quest panel ---------------- */
  function renderQuest(state) {
    const m = global.CF.story.current(state);
    const el = $('#quest-panel');
    if (!m) {
      el.innerHTML = `<div class="card-title">📋 Quest</div><div style="color:var(--dim);font-size:.82rem">🏆 Story complete! You are a Chili Dynasty. Endless contracts await in the Market.</div>`;
      return;
    }
    const rw = m.reward ? (m.reward.money ? ' ' + fmt(m.reward.money) : '') + (m.reward.rep ? ' +' + m.reward.rep + ' rep' : '') : '';
    el.innerHTML = `
      <div class="card-title">📋 Quest</div>
      <div id="chapter-tag">${esc(m.chapter)}</div>
      <div class="q-name">${esc(m.name)}</div>
      <div class="q-desc">${esc(m.desc)}</div>
      <div class="q-prog">Day ${state.day}${m.minDay > state.day ? ' · unlocks day ' + m.minDay : ''}</div>
      ${m.reward ? `<div class="q-reward">🎁 Reward:${rw}</div>` : ''}`;
  }

  function renderEvent(state) {
    const el = $('#event-panel');
    if (!state.event) { el.innerHTML = ''; return; }
    const d = Defs.event(state.event.id);
    const left = Math.max(0, state.event.endsDay - state.day + 1);
    const cureBtn = d.cure && d.id === 'pests'
      ? `<button class="btn tiny red" data-action="treat-pests">🧪 Insecticide ${fmt(200)}</button>` : '';
    el.innerHTML = `
      <div id="event-banner" style="display:block">
        <b>${d.emoji} ${esc(d.name)}</b> — ${esc(d.msg)}
        <span style="opacity:.75">(${left}d left)</span> ${cureBtn}
      </div>`;
  }

  function renderLog(state) {
    const last = state.log.length ? state.log[state.log.length - 1] : null;
    const sig = state.log.length + '|' + (last ? last.t + '|' + last.msg + '|' + last.kind : '');
    if (sig === ui.cache.logSig) return;
    ui.cache.logSig = sig;
    const box = $('#log');
    const items = state.log.slice(-26).reverse();
    box.innerHTML = items.map(l => `<div class="${esc(l.kind)}">[D${l.t}] ${esc(l.msg)}</div>`).join('');
  }

  /* ---------------- farm view ---------------- */
  function plotEmoji(state, p, st) {
    return global.CF.art.plot(p, st, Logic.growTime(state, p.strain || 'jalapeno'));
  }

  function renderFarm(state) {
    const strains = Defs.STRAINS.map(st => {
      const unlocked = state.unlocked.indexOf(st.id) !== -1;
      const sel = state.selectedStrain === st.id;
      return `<button class="strain-chip ${sel ? 'selected' : ''} ${unlocked ? '' : 'locked'}"
        data-action="sel-strain" data-id="${st.id}" title="${esc(st.blurb)}"
        ${unlocked ? '' : `data-lock="${st.unlock.type === 'money' ? 'Unlocks at ' + fmt(st.unlock.v) : st.unlock.type === 'research' ? 'Unlocks via R&D: Chili Royale Hybrid' : ''}"`}>
        <span class="em">${global.CF.art.chili(st.id, 22)}</span>${esc(st.name)}${unlocked ? '' : ' 🔒'}</button>`;
    }).join('');

    const plots = [];
    for (let i = 0; i < state.plotCount; i++) {
      const p = state.plots[i];
      const st = p.strain ? Defs.strain(p.strain) : null;
      let statusLabel = 'Empty';
      let pct = 0;
      if (p.status === 'growing') {
        const gMul = (state.event && state.event.effect && state.event.effect.growthMult) || 1;
        const rate = (p.boostUntil > Date.now() / 1000 ? 2 : 1) * (state.settings.speed || 1) * gMul;
        statusLabel = tfmt((Logic.growTime(state, p.strain) - p.progress) / rate);
        pct = Math.min(100, p.progress / Logic.growTime(state, p.strain) * 100);
      } else if (p.status === 'ready') { statusLabel = 'Ready!'; pct = 100; }
      else if (p.status === 'wilted') { statusLabel = 'Wilted'; pct = 100; }
      const boost = p.status === 'growing' && p.boostUntil > Date.now() / 1000 ? '<span class="p-boost">💧</span>' : '';
      plots.push(`
        <div class="plot ${p.status} ${state.selectedPlot === i ? 'selected' : ''}" data-action="plot-select" data-id="${i}">
          ${boost}
          <div class="p-emoji">${plotEmoji(state, p, st)}</div>
          <div class="p-name">${st ? esc(st.name) : 'Plot ' + (i + 1)}</div>
          <div class="bar ${p.status === 'ready' ? 'green' : ''}"><i style="width:${pct}%"></i></div>
          <div class="p-status ${p.status}">${statusLabel}</div>
        </div>`);
    }

    const sp = state.plots[state.selectedPlot];
    const spst = sp && sp.strain ? Defs.strain(sp.strain) : null;
    const landIdx = Defs.LAND.findIndex(l => l.plots === state.plotCount);
    const nextLand = Defs.LAND[landIdx + 1];
    const canPlant = sp && sp.status === 'empty' && state.unlocked.indexOf(state.selectedStrain) !== -1;
    const selStrain = Defs.strain(state.selectedStrain);
    const actions = `
      <div id="plot-actions">
        <button class="btn green" data-action="plant" ${canPlant ? '' : 'disabled'}>🌱 Plant ${esc(selStrain.name)}</button>
        <button class="btn blue" data-action="water" ${sp && sp.status === 'growing' ? '' : 'disabled'}>💧 Water (2x)</button>
        <button class="btn gold" data-action="harvest" ${sp && (sp.status === 'ready' || sp.status === 'wilted') ? '' : 'disabled'}>🧺 Harvest</button>
        <span class="info">Plot ${state.selectedPlot + 1}: ${spst ? esc(spst.name) + ' · ' + (sp.status === 'ready' ? 'ready!' : sp.status) : 'empty'}
        ${sp && sp.status === 'growing' ? ' · ' + Math.floor(sp.progress) + '/' + Math.round(Logic.growTime(state, sp.strain)) + 's' : ''}</span>
      </div>
      <div class="land-row">
        <button class="btn" data-action="buy-land" ${nextLand ? '' : 'disabled'}>
          🚜 ${nextLand ? 'Buy ' + esc(nextLand.name) + ' (' + nextLand.plots + ' plots) · ' + fmt(nextLand.cost) : 'You own the whole valley!'}
        </button>
      </div>`;

    // door & customer queue (the Weed Firm signature)
    const c = state.contract;
    let doorHtml = '';
    if (state.event) {
      const d = Defs.event(state.event.id);
      doorHtml = `
        <div class="room-visitor">
          <div class="bubble"><b>${d.emoji} ${esc(d.name)}</b><small>${state.event.endsDay - state.day + 1}d left</small></div>
          <span class="visitor-art">${d.emoji}</span>
        </div>`;
    } else if (c.active || c.offer) {
      const tpl = Defs.contract((c.active || c.offer).tpl);
      const idx = tpl.id.length + (c.active ? 1 : 0);
      const status = c.active
        ? `${c.active.qty} to go!`
        : `${tpl.qty}x ${esc(Defs.strain(tpl.strain).name)} · tap for Market`;
      doorHtml = `
        <div class="room-visitor" data-action="nav" data-nav="market" title="Open the Market">
          <div class="bubble"><b>${esc(tpl.name)}</b><small>“${esc(contractLine(tpl.id))}”</small><small>${status}</small></div>
          <span class="visitor-art">${global.CF.art.customerChibi(idx)}</span>
        </div>`;
    }

    $('#view-farm').innerHTML = `
      <div class="card">
        <div class="card-title">🌶️ The Farm <span class="right">${state.plotCount} plots · yield ${Logic.harvestYield(state)}/plant · harvest value ~${fmtC(Logic.chiliPrice(state, state.selectedStrain) * Logic.harvestYield(state))}</span></div>
        <div id="strain-bar">${strains}</div>
        <div id="farm-room">
          <div class="room-door"></div>
          ${doorHtml}
          <div class="room-window"></div>
          <div class="room-poster"><span>🌶️</span><i>VERDE<br>SPRINGS</i></div>
          <div class="room-shelf"><i class="jar r"></i><i class="jar g"></i><i class="jar o"></i></div>
          <div class="room-lights"></div>
          <div id="plots">${plots.join('')}</div>
        </div>
        ${actions}
      </div>`;
  }

  /* ---------------- market view ---------------- */
  function renderMarket(state) {
    const mult = Logic.marketMult(state);
    if (ui.cache.multDay !== state.day) { ui.cache.prevMult = ui.cache.mult || mult; ui.cache.mult = mult; ui.cache.multDay = state.day; }
    const trend = mult >= ui.cache.prevMult ? '📈' : '📉';
    const rows = Defs.STRAINS.filter(st => state.unlocked.indexOf(st.id) !== -1).map(st => {
      const stock = Logic.invGet(state, st.id);
      const price = Logic.chiliPrice(state, st.id);
      return `<tr style="--row-accent:${st.color}">
        <td class="prod"><span class="prod-art">${strainSprite(st, 34)}</span><b>${esc(st.name)}</b></td>
        <td>${stock}</td>
        <td>${fmtC(price)}</td>
        <td><button class="btn tiny" data-action="sell-strain" data-id="${st.id}" data-qty="1" ${stock > 0 ? '' : 'disabled'}>1</button>
            <button class="btn tiny gold" data-action="sell-strain" data-id="${st.id}" data-qty="999999" ${stock > 0 ? '' : 'disabled'}>All</button></td>
      </tr>`;
    }).join('');

    // contracts — "orders as characters": avatar, quote, urgency by deadline
    let contractHtml = '';
    const c = state.contract;
    if (c.active) {
      const tpl = Defs.contract(c.active.tpl);
      const sd = Defs.strain(tpl.strain);
      const have = Logic.invGet(state, tpl.strain);
      const est = fmt(c.active.qty * Logic.chiliPrice(state, tpl.strain) * tpl.mult);
      const daysLeft = Math.max(0, c.active.endsDay - state.day);
      const urgency = daysLeft <= 1 ? 'order-critical' : daysLeft <= 2 ? 'order-soon' : 'order-relaxed';
      contractHtml = `
        <div class="card contract-card ${urgency}" style="margin-top:12px;border-color:var(--gold);--order-accent:${sd.color}">
          <div class="order-head"><span class="order-avatar" aria-hidden="true">${tpl.emoji}</span>
            <div class="order-who"><h4>${esc(tpl.name)}</h4><p class="order-dialogue">“${esc(contractLine(tpl.id))}”</p></div>
          </div>
          <div class="order-line">
            <span class="order-qty">${tpl.qty - c.active.qty}/${tpl.qty} × ${esc(sd.name)} delivered · ${have}x in storage</span>
            <span class="order-time ${urgency}">⏳ ${daysLeft}d left (Day ${c.active.endsDay})</span>
          </div>
          <div class="bar green"><i style="width:${Math.min(100, (tpl.qty - c.active.qty) / tpl.qty * 100)}%"></i></div>
          <div class="order-foot">
            <span class="order-payout">~${est}</span>
            <button class="btn gold" data-action="deliver-contract" ${have > 0 ? '' : 'disabled'}>🚚 Deliver</button>
          </div>
        </div>`;
    } else if (c.offer) {
      const tpl = Defs.contract(c.offer.tpl);
      const sd = Defs.strain(tpl.strain);
      const est = fmt(tpl.qty * Logic.chiliPrice(state, tpl.strain) * tpl.mult);
      contractHtml = `
        <div class="card contract-card order-relaxed" style="margin-top:12px;--order-accent:${sd.color}">
          <div class="order-head"><span class="order-avatar" aria-hidden="true">${tpl.emoji}</span>
            <div class="order-who"><h4>${esc(tpl.name)}</h4><p class="order-dialogue">“${esc(contractLine(tpl.id))}”</p></div>
          </div>
          <div class="order-line">
            <span class="order-qty">${tpl.qty} × ${esc(sd.name)} in ${tpl.days} days</span>
            <span class="order-time order-relaxed">Offer expires Day ${c.offer.expiresDay}</span>
          </div>
          <div style="font-size:.82rem;color:var(--dim)">${esc(tpl.desc)} · payout ~<b>${est}</b> (${tpl.mult}x market)</div>
          <div class="order-foot"><span class="order-payout">~${est}</span>
            <button class="btn" data-action="accept-contract">🤝 Sign Contract</button></div>
        </div>`;
    } else {
      contractHtml = `<div class="card" style="margin-top:12px"><div style="font-size:.85rem;color:var(--dim)">📜 No contract offers right now. Check back tomorrow.</div></div>`;
    }

    $('#view-market').innerHTML = `
      <div class="card">
        <div class="card-title">🏪 Chili Market <span class="right">Market index ${(mult * 100).toFixed(0)} ${trend}</span></div>
        <table class="tbl">
          <thead><tr><th>Strain</th><th>Stock</th><th>Price</th><th>Sell</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn gold" data-action="sell-all" ${Logic.chiliTotal(state) > 0 ? '' : 'disabled'}>💰 Sell Everything</button>
        </div>
      </div>
      ${contractHtml}`;
  }

  /* ---------------- workers view ---------------- */
  function renderWorkers(state) {
    const cards = Defs.WORKERS.map(w => {
      const rec = state.workers[w.id];
      const pips = Array.from({ length: 5 }, (_, i) => `<span class="pip ${i < rec.lvl ? 'on' : ''}"></span>`).join('');
      const cost = fmt(w.cost);
      const tcost = rec.lvl < 5 ? fmt(Defs.trainCost(w, rec.lvl)) : null;
      return `
        <div class="card unit-card">
          <div class="u-head"><span class="u-emoji">${w.emoji}</span><div><div class="u-name">${esc(w.name)}</div><div class="lvl-tag">Lv.${rec.lvl} <span style="margin-left:4px">${pips}</span></div></div></div>
          <div class="u-desc">${esc(w.desc)}</div>
          <div style="font-size:.8rem;color:var(--dim)">Owned: <b>${rec.owned}/${w.max}</b></div>
          <div class="u-actions">
            <button class="btn small green" data-action="hire" data-id="${w.id}" ${rec.owned >= w.max ? 'disabled' : ''}>Hire ${cost}</button>
            <button class="btn small blue" data-action="train" data-id="${w.id}" ${rec.owned === 0 || rec.lvl >= 5 ? 'disabled' : ''}>Train ${tcost || '—'}</button>
          </div>
        </div>`;
    }).join('');
    $('#view-workers').innerHTML = `
      <h2 class="section-h">🧑‍🌾 Workers <small>They keep the empire moving while you plan the next move.</small></h2>
      <div class="grid2">${cards}</div>`;
  }

  /* ---------------- lab view ---------------- */
  function renderLab(state) {
    const ups = Defs.UPGRADES.map(u => {
      const lvl = state.upgrades[u.id];
      const pips = Array.from({ length: u.max }, (_, i) => `<span class="pip ${i < lvl ? 'on' : ''}"></span>`).join('');
      const cost = lvl < u.max ? fmt(Defs.upgradeCost(u, lvl)) : null;
      return `
        <div class="card unit-card">
          <div class="u-head"><span class="u-emoji">${u.emoji}</span><div><div class="u-name">${esc(u.name)}</div><div class="lvl-tag">${lvl}/${u.max} <span style="margin-left:4px">${pips}</span></div></div></div>
          <div class="u-desc">${esc(u.desc)}</div>
          <div class="u-actions"><button class="btn small" data-action="buy-upgrade" data-id="${u.id}" ${cost ? '' : 'disabled'}>${cost ? 'Upgrade ' + cost : 'MAXED'}</button></div>
        </div>`;
    }).join('');

    const research = Defs.RESEARCH.map(r => {
      const done = state.research.indexOf(r.id) !== -1;
      return `
        <div class="card unit-card" style="${done ? 'border-color:var(--good)' : ''}">
          <div class="u-head"><span class="u-emoji">${r.emoji}</span><div><div class="u-name">${esc(r.name)}</div><div class="lvl-tag">${done ? '✅ Complete' : '🔬 R&D'}</div></div></div>
          <div class="u-desc">${esc(r.desc)}</div>
          <div class="u-actions"><button class="btn small blue" data-action="buy-research" data-id="${r.id}" ${done ? 'disabled' : ''}>${done ? 'Done' : 'Research ' + fmt(r.cost)}</button></div>
        </div>`;
    }).join('');

    const strains = Defs.STRAINS.map(st => {
      const unlocked = state.unlocked.indexOf(st.id) !== -1;
      const req = st.unlock.type === 'money' ? 'Unlocks at ' + fmt(st.unlock.v) : st.unlock.type === 'research' ? 'Unlocks via R&D' : 'Available from start';
      const heat = '🔥'.repeat(st.heat);
      return `
        <div class="card unit-card" style="${unlocked ? '' : 'opacity:.55'}">
          <div class="u-head"><span class="u-emoji">${strainSprite(st, 44)}</span><div><div class="u-name">${esc(st.name)}</div><div class="lvl-tag">${heat}</div></div></div>
          <div class="u-desc">${esc(st.blurb)}<br>⏱ ${tfmt(st.grow)} · 💰 ${fmtC(st.value)}/unit · ${unlocked ? '✅ ' + esc(req) : '🔒 ' + esc(req)}</div>
        </div>`;
    }).join('');

    $('#view-lab').innerHTML = `
      <h2 class="section-h">🔬 Farm Upgrades <small>Make the same dirt do more.</small></h2>
      <div class="grid2">${ups}</div>
      <h2 class="section-h">🧬 Research &amp; Development <small>Breakthroughs that change the game.</small></h2>
      <div class="grid2">${research}</div>
      <h2 class="section-h">📖 Strain Encyclopedia <small>Every pepper has a personality.</small></h2>
      <div class="grid2">${strains}</div>`;
  }

  /* ---------------- business view ---------------- */
  function bizTab(state, id) {
    const b = Defs.biz(id);
    const rec = state.biz[id];
    const locked = !rec.unlocked;
    return `<button class="biztab ${locked ? 'locked' : ''} ${ui.bizTab === id ? 'active' : ''}" data-action="biz-tab" data-id="${id}">
      ${locked ? '🔒' : b.emoji} ${esc(b.short)}</button>`;
  }

  function bizBodyJerky(state) {
    const j = state.biz.jerky;
    const recipe = Defs.RECIPES[j.recipe];
    const next = Defs.RECIPES[j.recipe + 1];
    const rate = (1 + j.level * 1.5) * (1 + state.workers.chef.owned * 0.35);
    const price = (8 + j.level * 3) * (1 + recipe.bonus) * (1 + Math.min(1, state.rep / 2000));
    const cost = fmt(Defs.bizCost(Defs.biz('jerky'), j.level));
    return `
      <div class="biz-body">
        <div class="biz-stats">
          <div class="biz-stat"><small>Level</small><div class="v">${j.level}</div></div>
          <div class="biz-stat"><small>Production</small><div class="v">${rate.toFixed(1)}/s</div></div>
          <div class="biz-stat"><small>Jerky value</small><div class="v">${fmtC(price)}</div></div>
          <div class="biz-stat"><small>Total produced</small><div class="v">${Math.floor(j.made).toLocaleString()}</div></div>
          <div class="biz-stat"><small>Chili stock needed</small><div class="v">${Logic.chiliTotal(state)} chilis</div></div>
        </div>
        <div style="font-size:.85rem;color:var(--dim)">Current recipe: <b>${recipe.emoji} ${esc(recipe.name)}</b> (+${(recipe.bonus * 100).toFixed(0)}% value)${next ? ' · next: ' + esc(next.name) + (next.needsChef ? ' · needs ' + (next.needsChef === true ? 1 : next.needsChef) + 'x 👨‍🍳' : '') : ''}</div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" data-action="biz-level" data-id="jerky" ${j.level >= Defs.biz('jerky').levels.max ? 'disabled' : ''}>🔥 Expand Smokehouse ${cost}</button>
          <button class="btn blue" data-action="recipe-up" ${!next ? 'disabled' : ''}>📖 ${next ? 'Unlock ' + esc(next.name) + ' ' + fmt(next.cost) : 'All recipes!'}</button>
        </div>
      </div>`;
  }

  function bizBodyFashion(state) {
    const f = state.biz.fashion;
    const col = f.collection;
    let colHtml = '';
    if (col) {
      const total = 3 * Defs.DAY_SECONDS;
      const now = Date.now() / 1000;
      const left = Math.max(0, col.endsAt - now);
      const pct = Math.min(100, (total - left) / total * 100);
      const cdef = Defs.COLLECTIONS.find(c => c.id === col.id);
      colHtml = `
        <div class="biz-stat" style="grid-column:1/-1">
          <small>Live collection: ${cdef ? cdef.emoji + ' ' + esc(cdef.name) : ''}</small>
          <div class="bar" style="margin:8px 0"><i style="width:${pct}%"></i></div>
          <div class="v">${tfmt(left)} until sell-out · ~${fmt(col.count / Defs.DAY_SECONDS * (1 + f.level * 0.8) * (1 + state.rep / 1000) * (1 + state.workers.brand.owned * 0.1) * 60)}/min</div>
        </div>`;
    }
    const collections = Defs.COLLECTIONS.map(c => `
      <button class="btn small" data-action="design" data-id="${c.id}" ${col ? 'disabled' : ''}>${c.emoji} ${esc(c.name)} · ${fmt(c.cost)}</button>`).join('');
    const cost = fmt(Defs.bizCost(Defs.biz('fashion'), f.level));
    return `
      <div class="biz-body">
        <div class="biz-stats">
          <div class="biz-stat"><small>Brand level</small><div class="v">${f.level}</div></div>
          <div class="biz-stat"><small>Collections sold out</small><div class="v">${f.designed}</div></div>
          <div class="biz-stat"><small>Revenue scales with</small><div class="v">⭐ ${Math.floor(state.rep).toLocaleString()} rep</div></div>
        </div>
        ${colHtml}
        <div style="margin-top:10px">
          <div style="font-size:.85rem;color:var(--dim);margin-bottom:8px">Design a collection (runs 3 days, sells out automatically):</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">${collections}</div>
        </div>
        <div style="margin-top:12px"><button class="btn" data-action="biz-level" data-id="fashion" ${f.level >= Defs.biz('fashion').levels.max ? 'disabled' : ''}>🪡 Raise Brand Level ${cost}</button></div>
      </div>`;
  }

  function bizBodyMining(state) {
    const m = state.biz.mining;
    const now = Date.now() / 1000;
    const caved = now < m.caveUntil;
    const rate = 1.2 * m.level * (1 + state.rep / 2000) * (1 + state.workers.brand.owned * 0.1);
    const cost = fmt(Defs.bizCost(Defs.biz('mining'), m.level));
    return `
      <div class="biz-body">
        <div class="biz-stats">
          <div class="biz-stat"><small>Mine level</small><div class="v">${m.level}</div></div>
          <div class="biz-stat"><small>Income</small><div class="v">${caved ? '⛔ CAVE-IN' : fmtC(rate) + '/s'}</div></div>
          <div class="biz-stat"><small>Lucky strikes</small><div class="v">${m.strikes}</div></div>
        </div>
        ${caved ? `<div class="card" style="border-color:var(--bad);margin-top:10px"><b>⛏️ Cave-in!</b> The mine is blocked. <button class="btn small red" data-action="mine-repair">🔧 Pay repairs ${fmt(500 * Math.max(1, m.level))}</button></div>` : ''}
        <div style="margin-top:12px"><button class="btn" data-action="biz-level" data-id="mining" ${m.level >= Defs.biz('mining').levels.max ? 'disabled' : ''}>🛢️ Dig Deeper ${cost}</button></div>
      </div>`;
  }

  function bizBodyMedia(state) {
    const md = state.biz.media;
    const rate = 20 * md.level * (1 + state.rep / 5000) * (1 + state.workers.brand.owned * 0.1);
    const cost = fmt(Defs.bizCost(Defs.biz('media'), md.level));
    return `
      <div class="biz-body">
        <div class="biz-stats">
          <div class="biz-stat"><small>Network level</small><div class="v">${md.level}</div></div>
          <div class="biz-stat"><small>Income</small><div class="v">${fmtC(rate)}/s</div></div>
          <div class="biz-stat"><small>Lifetime ad revenue</small><div class="v">${fmt(md.earned)}</div></div>
        </div>
        <div style="margin-top:12px"><button class="btn" data-action="biz-level" data-id="media" ${md.level >= Defs.biz('media').levels.max ? 'disabled' : ''}>🎬 Add a Channel ${cost}</button></div>
      </div>`;
  }

  function renderBiz(state) {
    ui.bizTab = ui.bizTab || 'jerky';
    if (!state.biz[ui.bizTab] || !state.biz[ui.bizTab].unlocked) {
      const first = Defs.BUSINESSES.find(b => state.biz[b.id].unlocked);
      ui.bizTab = first ? first.id : 'jerky';
    }
    const tabs = Defs.BUSINESSES.map(b => bizTab(state, b.id)).join('');
    const b = Defs.biz(ui.bizTab);
    const rec = state.biz[ui.bizTab];
    let body;
    if (!rec.unlocked) {
      const reqs = [];
      if (b.unlock.money) reqs.push(fmt(b.unlock.money));
      if (b.unlock.rep) reqs.push(Math.floor(b.unlock.rep).toLocaleString() + ' rep');
      const moneyOk = !b.unlock.money || state.money >= b.unlock.money;
      const repOk = !b.unlock.rep || state.rep >= b.unlock.rep;
      body = `
        <div class="biz-body" style="text-align:center;padding:30px 10px">
          <div class="big-emoji">🔒</div>
          <h2 class="section-h" style="justify-content:center">${b.emoji} ${esc(b.name)}</h2>
          <div style="color:var(--dim);max-width:460px;margin:0 auto 14px">${esc(b.desc)}</div>
          <div style="font-size:.9rem">Requires: ${reqs.join(' · ')}</div>
          <div style="margin-top:14px">
            ${moneyOk && repOk
              ? `<button class="btn green" data-action="buy-biz" data-id="${b.id}">🚀 Found ${esc(b.name)} · ${fmt(b.baseCost)}</button>`
              : `<div style="color:var(--dim);font-size:.85rem">The story will unlock it too — keep following the quests.</div>`}
          </div>
        </div>`;
    } else {
      body = { jerky: bizBodyJerky, fashion: bizBodyFashion, mining: bizBodyMining, media: bizBodyMedia }[ui.bizTab](state);
    }
    $('#view-biz').innerHTML = `
      <h2 class="section-h">💼 Businesses <small>From one farm to a conglomerate.</small></h2>
      <div id="biz-tabs">${tabs}</div>
      <div class="card">
        <div class="card-title">${b.emoji} ${esc(b.name)} <span class="right">${rec.unlocked ? 'OPEN' : 'LOCKED'}</span></div>
        ${rec.unlocked ? '' : ''}
        ${body}
      </div>`;
  }

  /* ---------------- stats view ---------------- */
  function renderStats(state) {
    const s = state.stats;
    const rows = [
      ['Days in business', state.totalDays],
      ['Lifetime earned', fmt(s.earned)],
      ['Lifetime spent', fmt(s.spent)],
      ['Chilis harvested', s.harvested.toLocaleString()],
      ['Chilis sold', s.sold.toLocaleString()],
      ['Best single harvest', s.bestHarvest],
      ['Contracts completed', s.contracts],
      ['Festivals won', s.festivals],
      ['Jerky produced', Math.floor(state.biz.jerky.made).toLocaleString()],
      ['Collections sold out', state.biz.fashion.designed],
      ['Mine strikes', state.biz.mining.strikes],
      ['Media revenue', fmt(state.biz.media.earned)],
      ['Earned while away', fmt(s.offlineEarned)],
      ['Reputation', Math.floor(state.rep).toLocaleString()],
      ['Workers', Logic.totalWorkers(state)],
    ].map(([k, v]) => `<div class="biz-stat"><small>${k}</small><div class="v">${v}</div></div>`).join('');

    const achs = Defs.ACHIEVEMENTS.map(a => {
      const done = !!state.ach[a.id];
      return `<div class="ach ${done ? 'unlocked' : 'locked'}">
        <span class="a-emoji">${done ? a.emoji : '🔒'}</span>
        <div><div class="a-name">${esc(a.name)}</div><div class="a-desc">${esc(a.desc)}${a.reward.money ? ' · +' + fmt(a.reward.money) : ''}</div></div>
      </div>`;
    }).join('');

    $('#view-stats').innerHTML = `
      <h2 class="section-h">📊 Empire Ledger</h2>
      <div class="card"><div class="biz-stats" style="margin:0">${rows}</div></div>
      <h2 class="section-h">🏆 Achievements <small>${Object.keys(state.ach).length}/${Defs.ACHIEVEMENTS.length}</small></h2>
      <div class="card"><div id="ach-grid">${achs}</div></div>
      <h2 class="section-h">💾 Save Data</h2>
      <div class="card">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <button class="btn green" data-action="save">💾 Save Now</button>
          <button class="btn blue" data-action="export">📤 Export Save</button>
          <button class="btn red" data-action="confirm-reset">🗑️ Wipe Save</button>
        </div>
        <textarea id="import-box" rows="3" placeholder="Paste an exported save here..." style="width:100%;background:#1c1009;color:var(--txt);border:1px solid var(--line);border-radius:8px;padding:8px;font-family:monospace;font-size:.75rem">${esc(ui.cache.exportCode || '')}</textarea>
        <div style="margin-top:8px"><button class="btn" data-action="import">📥 Import Save</button></div>
      </div>
      ${(global.CF.addons || []).filter(a => a.render).map(a => `<h2 class="section-h">${a.emoji || '📦'} ${esc(a.title || 'Addon')}</h2><div class="card">${a.render(state)}</div>`).join('')}`;
  }

  /* ---------------- render all ---------------- */
  function render(state) {
    setTimeOfDay(state);
    renderTopbar(state);
    renderQuest(state);
    renderEvent(state);
    renderLog(state);
    if (ui.view === 'farm') renderFarm(state);
    else if (ui.view === 'market') renderMarket(state);
    else if (ui.view === 'workers') renderWorkers(state);
    else if (ui.view === 'lab') renderLab(state);
    else if (ui.view === 'biz') renderBiz(state);
    else if (ui.view === 'stats') renderStats(state);

    // reactive toasts (achievements / events)
    const achKeys = Object.keys(state.ach);
    if (achKeys.length > ui.cache.achCount) {
      const prev = ui.cache.achSet || {};
      achKeys.forEach(k => {
        if (!prev[k]) {
          const a = Defs.achievement(k);
          if (a) toast(a.emoji + ' Achievement: ' + a.name + '!', 'gold');
        }
      });
      global.CF.audio.sfx.ach();
      ui.cache.achCount = achKeys.length;
    }
    ui.cache.achSet = Object.assign({}, state.ach);
    if (state.event && state.event.id !== ui.cache.eventId) {
      const d = Defs.event(state.event.id);
      toast(d.emoji + ' ' + d.name + '!', 'good');
      global.CF.audio.sfx.event();
      ui.cache.eventId = state.event.id;
    }
    if (!state.event) ui.cache.eventId = null;
  }

  function setView(v) {
    ui.view = v;
    document.querySelectorAll('.navbtn').forEach(b => b.classList.toggle('active', b.dataset.nav === v));
    document.querySelectorAll('.view').forEach(s => s.classList.toggle('active', s.id === 'view-' + v));
    global.CF.audio.sfx.click();
    render(global.CF.state);
  }

  /* ---------------- modals ---------------- */
  function openModal(html) {
    $('#modal-root').innerHTML = `<div class="modal-overlay"><div class="modal-box">${html}</div></div>`;
  }
  function closeModal() {
    $('#modal-root').innerHTML = '';
    ui.modal = null;
  }

  function showDialogue(dlg) {
    if (ui.modal) return;
    ui.modal = { type: 'dialogue', lines: dlg.lines, idx: 0, pos: 0, timer: null };
    global.CF.audio.sfx.story();
    drawDialogue();
  }
  function drawDialogue() {
    const m = ui.modal;
    if (!m || m.type !== 'dialogue') return;
    const dlg = global.CF.state.pendingDialogue;
    const title = dlg ? dlg.title : '';
    const name = dlg ? dlg.name : '';
    const portrait = dlg ? dlg.portrait : '';
    const line = m.lines[m.idx];
    const chars = Array.from(line.text);
    const shown = chars.slice(0, m.pos).join('');
    const typing = m.pos < chars.length;
    $('#modal-root').innerHTML = `
      <div class="modal-overlay"><div class="modal-box" data-action="dlg-next">
        <div class="modal-title">${global.CF.art.portraitHtml(portrait)}
          <div><div class="mchapter">${esc(title)}</div><div class="mname">${esc(name)}</div></div></div>
        ${m.lines.slice(0, m.idx).map(l => `<div class="dlg-line">${l.who ? '<span class="who">' + esc(l.who) + ':</span> ' : ''}${esc(l.text)}</div>`).join('')}
        <div class="dlg-line ${typing ? 'typed' : ''}">${line.who ? '<span class="who">' + esc(line.who) + ':</span> ' : ''}${esc(shown)}</div>
        <div class="modal-actions"><button class="btn" data-action="dlg-next">${m.idx < m.lines.length - 1 ? 'Next ▶' : 'Close ✕'}</button></div>
      </div></div>`;
    if (typing) {
      m.timer = setTimeout(() => { m.pos += 1; drawDialogue(); }, 24);
    } else if (m.timer) { clearTimeout(m.timer); m.timer = null; }
  }
  function dlgNext() {
    const m = ui.modal;
    if (!m || m.type !== 'dialogue') return;
    const line = m.lines[m.idx];
    const len = Array.from(line.text).length;
    if (m.pos < len) { m.pos = len; drawDialogue(); return; }
    if (m.idx < m.lines.length - 1) { m.idx++; m.pos = 0; drawDialogue(); return; }
    closeModal();
    global.CF.state.pendingDialogue = global.CF.state.dialogueQueue.shift() || null;
    global.CF.state.last = Date.now() / 1000;
  }

  function showChoice(state) {
    if (!state.choice || ui.modal) return;
    ui.modal = { type: 'choice', id: state.choice.id };
    openModal(`
      <div class="modal-title"><span class="portrait">⚖️</span><div><div class="mchapter">A Decision</div><div class="mname">Choose your path</div></div></div>
      <div class="dlg-line">${esc(state.choice.text)}</div>
      <div class="choice-grid">
        ${state.choice.options.map((o, i) => `<button class="choice-btn" data-action="choice" data-idx="${i}">${esc(o.label)}<small>${esc(o.sub || '')}</small></button>`).join('')}
      </div>`);
  }

  function showTutorial() {
    if (ui.modal) return;
    ui.modal = { type: 'tutorial' };
    openModal(`
      <div class="modal-title"><span class="portrait">🌶️</span><div><div class="mchapter">Welcome to Verde Springs</div><div class="mname">How to build a Chili Empire</div></div></div>
      <div class="dlg-line">1️⃣ <b>Farm:</b> tap a plot, then <b>Plant</b>. Water for 2x speed. Harvest when ready — don\u2019t let chilis wilt!</div>
      <div class="dlg-line">2️⃣ <b>Market:</b> sell your chilis. Prices swing daily — festivals pay the most. Sign <b>contracts</b> for big payouts.</div>
      <div class="dlg-line">3️⃣ <b>Workers:</b> farmhands automate the farm. Buyers sell for you while you\u2019re away.</div>
      <div class="dlg-line">4️⃣ <b>Lab:</b> upgrade soil, irrigation, greenhouses. Research new strains like the Chili Royale.</div>
      <div class="dlg-line">5️⃣ <b>Story:</b> follow the quests — Dana\u2019s Jerky Co., Spice &amp; Thread fashion, Chilirock Mining, then Chili Empire TV.</div>
      <div class="dlg-line">6️⃣ You keep earning while the tab is closed. Come back rich. 💰</div>
      <div class="modal-actions"><button class="btn gold" data-action="close-modal">Let\u2019s grow! 🌱</button></div>`);
  }

  /* ---------------- action dispatch ---------------- */
  function act(action, el, state) {
    const now = Date.now() / 1000;
    const id = el.dataset.id;
    const qty = parseInt(el.dataset.qty || '0', 10);
    let r = null;

    switch (action) {
      case 'nav': setView(el.dataset.nav); return;
      case 'speed': {
        const speeds = [1, 2, 4];
        const i = speeds.indexOf(state.settings.speed);
        state.settings.speed = speeds[(i + 1) % speeds.length];
        toast('Game speed: ' + state.settings.speed + 'x');
        global.CF.audio.sfx.click();
        break;
      }
      case 'sound':
        state.settings.sound = !state.settings.sound;
        global.CF.audio.sfx.click();
        toast(state.settings.sound ? 'Sound on 🔊' : 'Sound off 🔇');
        break;
      case 'save': global.CF.save(); toast('Game saved 💾', 'good'); global.CF.audio.sfx.buy(); break;
      case 'export': {
        const code = global.CF.stateMod.exportState(state);
        ui.cache.exportCode = code;
        const box = $('#import-box');
        if (box) box.value = code;
        try { navigator.clipboard.writeText(code); toast('Save code copied to clipboard!', 'good'); } catch (e) { toast('Save code in the box below ⬇', 'info'); }
        global.CF.audio.sfx.buy();
        break;
      }
      case 'import': {
        const box = $('#import-box');
        if (!box || !box.value.trim()) { toast('Paste a save code first.', 'bad'); break; }
        const ns = global.CF.stateMod.importState(box.value, now);
        if (!ns) { toast('That save code is invalid.', 'bad'); global.CF.audio.sfx.error(); break; }
        global.CF.state = ns;
        ui.cache.achCount = Object.keys(ns.ach).length;
        global.CF.save();
        toast('Save imported!', 'good');
        global.CF.audio.sfx.fanfare();
        break;
      }
      case 'confirm-reset':
        if (!ui.modal) {
          ui.modal = { type: 'confirm' };
          openModal(`<div class="modal-title"><span class="portrait">🗑️</span><div><div class="mchapter">Are you sure?</div><div class="mname">Wipe everything</div></div></div>
            <div class="dlg-line">This deletes your entire chili empire. Abuela would cry.</div>
            <div class="modal-actions">
              <button class="btn ghost" data-action="close-modal">Cancel</button>
              <button class="btn red" data-action="reset">Yes, wipe it</button>
            </div>`);
        }
        break;
      case 'reset':
        global.CF.stateMod.wipeSave(localStorage);
        global.CF.state = global.CF.stateMod.createState(now);
        ui.cache.achCount = 0;
        closeModal();
        toast('Fresh start. One seed at a time. 🌱', 'good');
        break;
      case 'plot-select':
        state.selectedPlot = parseInt(id, 10);
        global.CF.audio.sfx.click();
        break;
      case 'sel-strain':
        if (state.unlocked.indexOf(id) !== -1) { state.selectedStrain = id; global.CF.audio.sfx.click(); }
        else toast('🔒 ' + (el.dataset.lock || 'Still locked.'), 'bad');
        break;
      case 'plant': r = Logic.plant(state, state.selectedPlot, state.selectedStrain, now); break;
      case 'water': r = Logic.water(state, state.selectedPlot, now); break;
      case 'harvest': r = Logic.harvest(state, state.selectedPlot, now); break;
      case 'sell-strain': r = Logic.sellStrain(state, id, qty); break;
      case 'sell-all': r = Logic.sellAll(state); break;
      case 'accept-contract': r = Logic.acceptContract(state, state.contract.offer && state.contract.offer.tpl); break;
      case 'deliver-contract': r = Logic.deliverContract(state); break;
      case 'hire': r = Logic.hireWorker(state, id); break;
      case 'train': r = Logic.trainWorker(state, id); break;
      case 'buy-upgrade': r = Logic.buyUpgrade(state, id); break;
      case 'buy-land': r = Logic.buyLand(state); break;
      case 'buy-research': r = Logic.buyResearch(state, id); break;
      case 'treat-pests': r = Logic.treatPests(state); break;
      case 'biz-tab': ui.bizTab = id; global.CF.audio.sfx.click(); break;
      case 'buy-biz': r = Logic.buyBusiness(state, id); break;
      case 'biz-level': r = Logic.bizLevelUp(state, id); break;
      case 'recipe-up': r = Logic.recipeUp(state); break;
      case 'design': r = Logic.designCollection(state, id, now); break;
      case 'mine-repair': r = Logic.mineRepair(state, now); break;
      case 'dlg-next': dlgNext(); return;
      case 'choice': global.CF.story.resolveChoice(state, parseInt(el.dataset.idx, 10), Logic.api, now); closeModal(); global.CF.audio.sfx.buy(); return;
      case 'close-modal': closeModal(); return;
    }

    if (r) {
      if (r.ok) {
        toast(r.msg, 'good');
        if (action === 'plant') global.CF.audio.sfx.plant();
        else if (action === 'water') global.CF.audio.sfx.water();
        else if (action === 'harvest') {
          global.CF.audio.sfx.harvest();
          const pel = document.querySelector('.plot.selected');
          harvestBurst(pel);
          plotRecoil(pel);
          if (pel && r.got) {
            const rr = pel.getBoundingClientRect();
            floatText(rr.left + rr.width / 2, rr.top + 6, '+' + r.got + ' 🌶️', 'green');
          }
        }
        else if (action === 'sell-strain' || action === 'sell-all' || action === 'deliver-contract') {
          global.CF.audio.sfx.cash();
          if (r.money) {
            const mc = document.querySelector('#topbar .money-val');
            if (mc) {
              const rr = mc.getBoundingClientRect();
              floatText(rr.left + rr.width / 2, rr.top - 4, '+$' + Math.round(r.money), 'gold');
            }
          }
        }
        else global.CF.audio.sfx.buy();
      } else {
        toast(r.msg, 'bad');
        global.CF.audio.sfx.error();
      }
    }
  }

  /* ---------------- wiring ---------------- */
  function init() {
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      act(el.dataset.action, el, global.CF.state);
    });
    document.addEventListener('keydown', e => {
      const st = global.CF.state;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key >= '1' && e.key <= '9') {
        const s = Defs.STRAINS[e.key - 1];
        if (s && st.unlocked.indexOf(s.id) !== -1) { st.selectedStrain = s.id; global.CF.audio.sfx.click(); }
      } else if (e.key === ' ' && !ui.modal) {
        e.preventDefault();
        const r = Logic.water(st, st.selectedPlot, Date.now() / 1000);
        if (r && r.ok) global.CF.audio.sfx.water();
      }
    });

    // modal checks (strict exclusivity: one modal at a time, choice has priority)
    setInterval(() => {
      const st = global.CF.state;
      if (!st || ui.modal) return;
      if (st.choice) showChoice(st);
      else if (st.pendingDialogue) showDialogue(st.pendingDialogue);
    }, 500);

    global.CF.audio.ensure();
  }

  ui.toast = toast;
  ui.render = render;
  ui.setView = setView;
  ui.init = init;
  ui.openModal = openModal;
  ui.closeModal = closeModal;
  ui.showTutorial = showTutorial;

  global.CF = global.CF || {};
  global.CF.ui = ui;
})(typeof window !== 'undefined' ? window : globalThis);

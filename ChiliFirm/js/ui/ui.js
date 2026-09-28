/* ============================================================
   Chili Firm 2 — UI orchestrator
   HUD, dock, context button, plot input (tap + swipe), panels,
   dialogue, title screen, celebrations, boss barks, walk-ins.
   Game rules live in js/core; this file only presents them.
   ============================================================ */
(function (global) {
  'use strict';

  const CF = global.CF;
  const Defs = CF.defs, Logic = CF.logic, A = CF.art, FX = CF.fx, SC = CF.scene, P = CF.panels;
  const fmt = Logic.fmt;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = s => String(s || '').replace(/(\d+)\.\d{3,}/g, '$1').replace(/\p{Extended_Pictographic}️?(‍\p{Extended_Pictographic}️?)*/gu, '').replace(/\s{2,}/g, ' ').trim();
  const I = (n, s) => A.icon(n, s);
  const sfx = () => CF.audio.sfx;
  const nowS = () => Date.now() / 1000;
  const money = n => fmt(n).replace('$', '');

  const ui = {
    panel: null, ptab: {}, panelSig: '', exportCode: '',
    dialog: null, started: false, level: null, prev: {}, sweep: null,
    visitor: null, nextVisitorAt: 0, lastBark: 0, bossTimer: 0,
  };

  /* ---------------- levels (presentation of reputation) ---------------- */
  const LV = [0, 20, 50, 100, 170, 260, 380, 520, 700, 950, 1250, 1600, 2000, 2600, 3300, 4200, 5300, 6600, 8200, 10000, 13000, 17000, 22000, 30000];
  const TITLES = ['Seed Rookie', 'Pot Scrubber', 'Pepper Plug', 'Heat Hustler', 'Salsa Slinger', 'Scoville Star', 'Sauce Captain', 'Chili Mogul', 'Pepper Legend', 'Hot Sauce Royalty', 'Chili Dynasty'];
  function level(rep) {
    let l = 0;
    while (l < LV.length - 1 && rep >= LV[l + 1]) l++;
    const a = LV[l], b = LV[l + 1] || a * 1.4;
    return { lvl: l + 1, title: TITLES[Math.min(TITLES.length - 1, Math.floor(l / 2))], pct: Math.min(100, (rep - a) / (b - a) * 100) };
  }

  /* ---------------- toasts ---------------- */
  function toast(msg, kind, icon) {
    const ps = ui.panel && $('#p-status');
    if (ps) {
      ps.className = 'pstatus ' + (kind || '');
      ps.innerHTML = I(icon || (kind === 'bad' ? 'alert' : kind === 'gold' ? 'star' : 'check'), 22) + '<span>' + esc(clean(msg)) + '</span>';
      ps.classList.remove('flash'); void ps.offsetWidth; ps.classList.add('flash');
      return;
    }
    const box = $('#toasts');
    const d = document.createElement('div');
    d.className = 'toast ' + (kind || '');
    const ic = icon || (kind === 'bad' ? 'alert' : kind === 'gold' ? 'star' : 'check');
    d.innerHTML = I(ic, 30) + '<span>' + esc(clean(msg)) + '</span>';
    box.appendChild(d);
    setTimeout(() => d.remove(), 2800);
    while (box.children.length > 3) box.firstChild.remove();
  }

  /* ---------------- boss barks ---------------- */
  const BARKS = ['Hot money, baby!', 'Scoville season!', 'Keep it spicy.', 'Heat don’t sleep.', 'We cookin’ now!', 'Pepper up!', 'That’s a whole mood.', 'Abuela would be proud.', 'Stack it. Plant it. Repeat.', 'This garage is gonna be a palace.'];
  function say(text, opts) {
    opts = opts || {};
    const port = SC.mode === 'port';
    ui.lastBark = performance.now();
    clearTimeout(ui.bossTimer);
    if (port) {
      const bt = $('#boss-talk');
      bt.innerHTML = `<div class="bt-por">${A.character(A.CAST.tito, { bust: true })}</div><div class="speech">${esc(text)}</div>`;
      bt.classList.add('on');
      ui.bossTimer = setTimeout(() => bt.classList.remove('on'), opts.ms || 3800);
    } else {
      const bb = $('#boss-bubble');
      if (!bb) return;
      bb.innerHTML = `<div class="speech" style="left:0;bottom:0;width:max-content;max-width:248px">${esc(text)}</div>`;
      const boss = $('#boss');
      if (boss && opts.pose) {
        boss.innerHTML = A.character(A.CAST.tito, { pose: opts.pose });
        setTimeout(() => { if ($('#boss')) $('#boss').innerHTML = A.character(A.CAST.tito, { pose: 'idle' }); }, 1600);
      }
      ui.bossTimer = setTimeout(() => { const s = bb.querySelector('.speech'); if (s) { s.classList.add('gone'); setTimeout(() => { bb.innerHTML = ''; }, 220); } }, opts.ms || 3800);
    }
  }
  function bark(chance) {
    if (Math.random() < (chance || 0.35) && performance.now() - ui.lastBark > 6000) say(BARKS[Math.floor(Math.random() * BARKS.length)], { pose: 'cheer', ms: 2200 });
  }

  /* ---------------- coach (Tito teaches the loop) ---------------- */
  function coach(state) {
    const c = state.coach || (state.coach = {});
    if (ui.dialog || !ui.started || ui.panel) return;
    const s = state.stats;
    const t = performance.now();
    if (t - ui.lastBark < 5000) return;
    const readyAny = state.plots.some((p, i) => i < state.plotCount && p.status === 'ready');
    if (!c.intro && s.planted === 0) { c.intro = 1; say('Yo! I’m Tito Scorch. Your Abuela’s peppers put me on. Now we put YOU on. Tap a pot to plant!', { pose: 'point', ms: 6500 }); return; }
    if (!c.water && s.planted > 0 && s.harvested === 0 && !readyAny) { c.water = 1; say('Nice! Tap a growing plant to water it. Water = double speed.', { pose: 'point', ms: 5000 }); return; }
    if (!c.ready && readyAny && s.harvested === 0) { c.ready = 1; say('Look at that heat! Tap to harvest, or swipe across the whole row.', { pose: 'cheer', ms: 5500 }); return; }
    if (!c.sell && s.harvested > 0 && s.sold === 0) { c.sell = 1; say('Now hit SELL ALL and get that paper!', { pose: 'point', ms: 5000 }); return; }
    if (!c.shop && s.sold > 0 && state.money >= 120 && state.workers.farmhand.owned === 0) { c.shop = 1; say('You can afford a Farmhand in the Crew. Let the squad grind for you.', { pose: 'point', ms: 5500 }); return; }
  }

  /* ---------------- HUD ---------------- */
  function buildHUD() {
    $('#hud').innerHTML = `
      <div class="lvl" data-action="open" data-id="trophy">
        <div class="badge"><svg viewBox="0 0 48 48">${A.icon('star', 48).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg><b id="lvl-n">1</b></div>
        <div class="meter"><div class="title" id="lvl-t">Seed Rookie</div><div class="xbar"><i id="lvl-bar" style="width:0%"></i></div></div>
      </div>
      <div class="pills">
        <div class="pill cash" id="pill-cash">${I('coin', 38)}<span class="val" id="v-cash">0</span><span class="rate" id="v-rate"></span></div>
        <div class="pill chili" id="pill-chili">${I('chili', 38)}<span id="v-chili">0</span><span class="cap" id="v-cap">/200</span></div>
        <div class="pill day" id="pill-day"><span id="v-dayico">${I('sun', 38)}</span><span id="v-day">Day 1</span></div>
      </div>
      <div class="hbtns">
        <button class="rbtn" data-action="speed" aria-label="Game speed" id="b-speed">1x</button>
        <button class="rbtn" data-action="music" aria-label="Music" id="b-music">${I('music', 30)}</button>
        <button class="rbtn" data-action="open" data-id="settings" aria-label="Settings">${I('gear', 30)}</button>
      </div>`;
  }
  function hudFrame(state) {
    FX.counter($('#v-cash'), state.money, v => money(v));
    FX.counter($('#v-chili'), Math.floor(Logic.chiliTotal(state)), v => String(Math.round(v)));
  }
  function hudRender(state) {
    $('#v-cap').textContent = '/' + Logic.storageCap(state);
    const lv = level(state.rep);
    $('#lvl-n').textContent = lv.lvl;
    $('#lvl-t').textContent = lv.title;
    $('#lvl-bar').style.width = lv.pct + '%';
    const h = state.timeOfDay != null ? state.timeOfDay : 8;
    const dayIco = h >= 6 && h < 19 ? 'sun' : 'moon';
    if (ui.prev.dayIco !== dayIco) { ui.prev.dayIco = dayIco; $('#v-dayico').innerHTML = I(dayIco, 38); }
    $('#v-day').textContent = 'Day ' + state.day;
    $('#b-speed').textContent = state.settings.speed + 'x';
    $('#b-music').style.opacity = state.settings.music ? 1 : 0.45;
    // income rate from businesses (shown under cash)
    const rate = passiveRate(state);
    $('#v-rate').textContent = rate > 0 ? '+' + fmt(rate) + '/s' : '';
    // level up?
    if (ui.level == null) ui.level = lv.lvl;
    else if (lv.lvl > ui.level) { const newTitle = level(LV[ui.level - 1] || 0).title !== lv.title; ui.level = lv.lvl; queueCelebrate('level', { lv, newTitle }); }
    // time of day
    let cls = 'day';
    if (h >= 5 && h < 8) cls = 'dawn'; else if (h >= 18 && h < 21) cls = 'dusk'; else if (h >= 21 || h < 5) cls = 'night';
    if (document.body.className !== cls) document.body.className = cls;
  }
  function passiveRate(state) {
    let r = 0;
    const b = state.biz;
    if (b.mining.unlocked && nowS() >= b.mining.caveUntil) r += 1.2 * b.mining.level * (1 + state.rep / 2000) * (1 + state.workers.brand.owned * 0.1);
    if (b.media.unlocked) r += 20 * b.media.level * (1 + state.rep / 5000) * (1 + state.workers.brand.owned * 0.1);
    return r;
  }

  /* ---------------- quest / event / ticker ---------------- */
  function renderQuest(state) {
    const m = CF.story.current(state);
    const sig = m ? m.id + '|' + state.day : 'done';
    if (ui.prev.quest === sig) return;
    const was = ui.prev.questId;
    ui.prev.quest = sig;
    const q = $('#quest');
    if (!m) { q.innerHTML = `<span class="qi">${I('crown', 36)}</span><div><div class="qt">Story complete</div><div class="qn">You built a Chili Dynasty</div><div class="qd">Keep closing deals and stacking paper.</div></div>`; return; }
    const rw = m.reward ? (m.reward.money ? `${I('coin', 16)}${money(m.reward.money)} ` : '') + (m.reward.rep ? `${I('star', 16)}${m.reward.rep}` : '') : '';
    q.innerHTML = `<span class="qi">${I('map', 36)}</span><div class="qb"><div class="qt">${esc(clean(m.chapter))}</div><div class="qn">${esc(clean(m.name))}</div><div class="qd">${esc(clean(m.desc))}${m.minDay > state.day ? ' (opens day ' + m.minDay + ')' : ''}</div></div>${rw ? `<div class="qr">${rw}</div>` : ''}<span class="qx">${I('right', 16)}</span>`;
    if (was && was !== m.id) { q.classList.remove('done'); void q.offsetWidth; q.classList.add('done'); sfx().fanfare(); FX.burst(q, 'star', 10); }
    ui.prev.questId = m.id;
  }
  function renderEvent(state) {
    const el = $('#event-chip');
    const sig = state.event ? state.event.id + '|' + state.event.endsDay + '|' + state.day : '';
    if (ui.prev.event === sig) return;
    ui.prev.event = sig;
    if (!state.event) { el.hidden = true; document.body.classList.remove('has-event'); return; }
    const d = Defs.event(state.event.id);
    const left = Math.max(1, state.event.endsDay - state.day + 1);
    el.hidden = false;
    el.innerHTML = `<div class="evh">${A.eventIcon(d.id, 30)}<span>${esc(clean(d.name))}</span><em>${left}d</em></div><small>${esc(clean(d.msg))}</small>${d.id === 'pests' ? `<button class="btn tiny red" data-action="treat-pests" data-cost="200">Spray pests ${I('coin', 16)}200</button>` : ''}`;
    document.body.classList.add('has-event');
    placeChips();
  }
  function placeChips() {
    const q = $('#quest'), e = $('#event-chip');
    if (!e.hidden) e.style.top = innerWidth <= 760 ? '' : (q.offsetTop + q.offsetHeight + 8) + 'px';
  }
  function renderTicker(state) {
    const last = state.log.slice(-2);
    const sig = state.log.length + '|' + (last[1] ? last[1].msg : '');
    if (ui.prev.tick === sig) return;
    ui.prev.tick = sig;
    $('#ticker').innerHTML = `<div class="th">${I('news', 22)} Verde Springs News</div>` + last.slice().reverse().map(l => `<div class="ln ${esc(l.kind || '')}">${esc(clean(l.msg))}</div>`).join('');
  }

  /* ---------------- dock ---------------- */
  function buildDock() {
    const b = (cls, id, ic, label) => `<button class="dbtn ${cls}" data-action="open" data-id="${id}" id="d-${id}">${I(ic, 42)}<span>${label}</span></button>`;
    $('#dock').innerHTML = b('seeds', 'seeds', 'seed', 'Seeds') + b('sell', 'market', 'market', 'Market') + b('crew', 'crew', 'crew', 'Crew') + b('lab', 'lab', 'lab', 'Upgrade') + b('empire', 'empire', 'empire', 'Empire') + b('trophy', 'trophy', 'trophy', 'Trophies');
  }
  function dot(id, val) {
    const el = $('#d-' + id);
    let d = el.querySelector('.dot');
    if (!val) { if (d) d.remove(); return; }
    if (!d) { d = document.createElement('i'); d.className = 'dot'; el.appendChild(d); }
    if (d.textContent !== String(val)) d.textContent = val;
  }
  function renderDock(state) {
    const sd = $('#d-seeds');
    const sig = state.selectedStrain;
    if (ui.prev.seedMini !== sig) { ui.prev.seedMini = sig; const m = sd.querySelector('.mini'); if (m) m.remove(); sd.insertAdjacentHTML('beforeend', `<i class="mini">${A.pepper(sig, 28)}</i>`); }
    const c = state.contract;
    dot('market', c.offer ? '!' : 0);
    const affUp = Defs.UPGRADES.some(u => state.upgrades[u.id] < u.max && state.money >= Defs.upgradeCost(u, state.upgrades[u.id]));
    dot('lab', affUp ? '!' : 0);
    const affCrew = Defs.WORKERS.some(w => state.workers[w.id].owned < w.max && state.money >= w.cost);
    dot('crew', affCrew ? '!' : 0);
    const bizReady = Defs.BUSINESSES.some(b => !state.biz[b.id].unlocked && (!b.unlock.money || state.money >= b.unlock.money) && (!b.unlock.rep || state.rep >= b.unlock.rep) && state.money >= b.baseCost);
    dot('empire', bizReady ? '!' : 0);
    const newAch = Object.keys(state.ach).length - (state.coach && state.coach.achSeen || 0);
    dot('trophy', newAch > 0 ? newAch : 0);
  }

  /* ---------------- main context button ---------------- */
  function mainState(state) {
    let ready = 0, empty = 0, dry = 0, soonest = Infinity;
    const t = nowS();
    for (let i = 0; i < state.plotCount; i++) {
      const p = state.plots[i];
      if (p.status === 'ready' || p.status === 'wilted') ready++;
      else if (p.status === 'empty') empty++;
      else if (p.status === 'growing') {
        if (p.boostUntil < t) dry++;
        const rate = (p.boostUntil > t ? 2 : 1) * (state.settings.speed || 1);
        soonest = Math.min(soonest, (Logic.growTime(state, p.strain) - p.progress) / rate);
      }
    }
    const stock = Math.floor(Logic.chiliTotal(state));
    if (ready) return { k: 'harvest', label: 'HARVEST', sub: ready + ' ready', icon: 'basket' };
    if (empty) return { k: 'plant', label: 'PLANT ALL', sub: empty + ' empty pots', icon: 'seed' };
    if (dry) return { k: 'water', label: 'WATER ALL', sub: dry + ' thirsty', icon: 'drop' };
    if (stock) return { k: 'sell', label: 'SELL ALL', sub: stock + ' chilis', icon: 'cash' };
    return { k: 'idle', label: 'GROWING', sub: isFinite(soonest) ? 'next in ' + Logic.tfmt(Math.max(0, soonest)) : '', icon: 'clock' };
  }
  function renderMain(state) {
    const m = mainState(state);
    const b = $('#mainbtn');
    const sig = m.k + '|' + m.sub;
    if (ui.prev.main === sig) return;
    ui.prev.main = sig;
    b.className = m.k;
    b.innerHTML = `${I(m.icon, 54)}<div>${m.label}<small>${esc(m.sub)}</small></div>`;
  }
  function doMain(state) {
    const m = mainState(state);
    const t = nowS();
    if (m.k === 'harvest') {
      let n = 0, got = 0, order = [];
      for (let i = 0; i < state.plotCount; i++) { const s = state.plots[i].status; if (s === 'ready' || s === 'wilted') order.push(i); }
      // visible ones cascade, off-screen ones resolve at once
      const vis = order.filter(i => SC.onScreen(i)), off = order.filter(i => !SC.onScreen(i));
      off.forEach(i => { const r = Logic.harvest(state, i, t, true); if (r.ok) { got += r.got; n++; } });
      if (off.length && got) FX.num($('#pill-chili'), '+' + got, 'green');
      vis.forEach((i, k) => setTimeout(() => plotAction(CF.state, i, 'harvest'), k * 70));
      if (!vis.length && !got) toast('Storage is full! Sell or upgrade Cold Storage.', 'bad');
      bark(0.4);
    } else if (m.k === 'plant') {
      if (state.unlocked.indexOf(state.selectedStrain) === -1) state.selectedStrain = state.unlocked[0];
      const all = [];
      for (let i = 0; i < state.plotCount; i++) if (state.plots[i].status === 'empty') all.push(i);
      all.filter(i => !SC.onScreen(i)).forEach(i => Logic.plant(state, i, state.selectedStrain, t));
      all.filter(i => SC.onScreen(i)).forEach((i, k) => setTimeout(() => plotAction(CF.state, i, 'plant'), k * 60));
    } else if (m.k === 'water') {
      const all = [];
      for (let i = 0; i < state.plotCount; i++) { const p = state.plots[i]; if (p.status === 'growing' && p.boostUntil < t) all.push(i); }
      all.filter(i => !SC.onScreen(i)).forEach(i => Logic.water(state, i, t));
      all.filter(i => SC.onScreen(i)).forEach((i, k) => setTimeout(() => plotAction(CF.state, i, 'water'), k * 50));
    } else if (m.k === 'sell') {
      sellAll(state, $('#mainbtn'));
    } else {
      sfx().click();
      FX.num($('#mainbtn'), 'Patience...', 'blue');
    }
    ui.prev.main = null;
  }

  /* ---------------- plot actions ---------------- */
  function plotAction(state, idx, force) {
    const p = state.plots[idx];
    if (!p || idx >= state.plotCount) return null;
    const el = SC.plotEl(idx);
    const t = nowS();
    let kind = force;
    if (!kind) kind = p.status === 'empty' ? 'plant' : (p.status === 'ready' || p.status === 'wilted') ? 'harvest' : 'water';
    let r;
    if (kind === 'plant') {
      if (p.status !== 'empty') return null;
      if (state.unlocked.indexOf(state.selectedStrain) === -1) state.selectedStrain = state.unlocked[0];
      r = Logic.plant(state, idx, state.selectedStrain, t);
      if (r.ok) { sfx().plant(); pop(el); if (el) { FX.burst(el.querySelector('svg') || el, 'dirt', 7); FX.burst(el, 'leaf', 3); } }
    } else if (kind === 'water') {
      if (p.status !== 'growing') return null;
      if (p.boostUntil > t) { if (el) FX.num(el, '2x', 'blue'); return null; }
      r = Logic.water(state, idx, t);
      if (r.ok) { sfx().water(); pop(el); if (el) { FX.burst(el, 'water', 9); FX.num(el, '2x', 'blue'); } }
    } else if (kind === 'harvest') {
      if (p.status !== 'ready' && p.status !== 'wilted') return null;
      const strain = p.strain;
      r = Logic.harvest(state, idx, t);
      if (r.ok) {
        sfx().harvest();
        pop(el);
        if (el) {
          FX.burst(el, 'spark', 10);
          FX.ring(el, '#fff6c0');
          FX.num(el, '+' + r.got, 'green');
          FX.fly(el, '#pill-chili', A.pepper(strain, 34), Math.min(6, Math.max(2, r.got)), { size: 34, onArrive: last => { if (last) sfx().pop(); } });
        }
      } else if (el) { FX.num(el, 'FULL!', 'red'); sfx().error(); toast(r.msg || 'Storage full!', 'bad'); }
    }
    SC.invalidatePlot(idx);
    SC.updatePlots(state);
    return r;
  }
  function pop(el) { if (!el) return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }

  function sellAll(state, from) {
    let value = 0;
    for (const id in state.inventory.strains) value += (state.inventory.strains[id] || 0) * Logic.chiliPrice(state, id);
    const r = Logic.sellAll(state);
    if (r.ok) cashFx(from, r.money || value);
    else { toast(r.msg, 'bad'); sfx().error(); }
    return r;
  }
  function cashFx(from, amount) {
    sfx().cash();
    const n = Math.max(3, Math.min(12, Math.round(Math.log10(Math.max(10, amount)) * 3)));
    FX.fly(from, '#pill-cash', I('coin', 34), n, { size: 34, tick: () => sfx().coin() });
    FX.num(from, '+' + fmt(amount), '');
    bark(0.3);
  }

  /* ---------------- panels ---------------- */
  function openPanel(id) {
    ui.panel = id;
    ui.panelSig = '';
    const root = $('#panel-root');
    root.classList.add('open');
    // a trophy banner mid-animation must never play over the panel: hide it and re-queue
    const bar = $('#achbar');
    if (bar && bar.classList.contains('on') && ui.achShowing) {
      bar.classList.remove('on');
      (ui.achQueue = ui.achQueue || []).unshift(ui.achShowing);
      ui.achShowing = null; ui.achBusyUntil = 0; clearTimeout(ui.achTimer);
    }
    root.innerHTML = `<div class="shade" data-action="close-panel-backdrop"></div><div class="panel"><div class="ph"><div class="banner" id="p-banner"></div><button class="x" data-action="close-panel" aria-label="Close">${I('close', 26)}</button><div class="tabs" id="p-tabs"></div></div><div class="pstatus" id="p-status"></div><div class="pb" id="p-body"></div></div>`;
    sfx().open();
    if (id === 'trophy') { const st = CF.state; st.coach = st.coach || {}; st.coach.achSeen = Object.keys(st.ach).length; }
    renderPanel(CF.state, true);
  }
  function closePanel() {
    ui.panel = null;
    const root = $('#panel-root');
    root.classList.remove('open');
    root.innerHTML = '';
    sfx().close();
  }
  function renderPanel(state, force) {
    if (!ui.panel) return;
    const id = ui.panel;
    const fn = P[id];
    if (!fn) return;
    const res = fn(state, ui.ptab[id], { exportCode: ui.exportCode });
    const sig = res.body + (res.tabs || '');
    const body = $('#p-body');
    if (force || sig !== ui.panelSig) {
      const typing = document.activeElement && document.activeElement.tagName === 'TEXTAREA';
      if (!typing || force) {
        const st = body.scrollTop;
        $('#p-banner').innerHTML = I(res.icon, 44) + esc(res.title);
        $('#p-tabs').innerHTML = res.tabs || '';
        body.innerHTML = res.body;
        body.scrollTop = st;
        ui.panelSig = sig;
      }
    }
    afford(state);
  }
  function afford(state) {
    document.querySelectorAll('[data-cost]').forEach(b => { b.classList.toggle('cant', state.money < +b.dataset.cost); });
  }

  /* ---------------- dialogue ---------------- */
  function speakerCfg(name) {
    const k = A.castFor(name);
    return k ? A.CAST[k] : null;
  }
  function showDialogue(dlg) {
    ui.dialog = { dlg, idx: 0, pos: 0, timer: null };
    sfx().story();
    drawDialogue();
  }
  function drawDialogue() {
    const m = ui.dialog;
    if (!m) return;
    const dlg = m.dlg;
    const line = dlg.lines[m.idx];
    const who = line.who || null;
    const cfg = speakerCfg(who || dlg.name);
    const text = clean(line.text);
    const chars = Array.from(text);
    const shown = chars.slice(0, m.pos).join('');
    const letter = /letter/i.test(dlg.title || '');
    const por = cfg ? A.character(cfg, { bust: false, pose: 'idle', mood: m.pos % 23 === 0 ? 'blink' : '' }) : `<div class="narr">${I(letter ? 'news' : 'chili', 150)}</div>`;
    const name = who || (cfg ? cfg.name : clean(dlg.name) || 'Verde Springs');
    const root = $('#dlg');
    root.classList.add('open');
    if (!root.querySelector('.dbox') || root.dataset.idx !== String(m.idx)) {
      root.dataset.idx = m.idx;
      root.innerHTML = `<div class="shade"></div><div class="dbox ${letter ? 'letter' : ''}" data-action="dlg-next">
        <div class="por">${por}</div><div class="nm">${esc(name)}</div>
        <div class="ch">${esc(clean(dlg.title || ''))}</div><div class="tx"></div><div class="nx">${m.idx < dlg.lines.length - 1 ? 'TAP' : 'CLOSE'} &#9654;</div></div>`;
    }
    root.querySelector('.tx').textContent = shown;
    if (m.pos < chars.length) {
      if (m.pos % 3 === 0) sfx().blip();
      m.timer = setTimeout(() => { m.pos += 1; drawDialogue(); }, 20);
    }
  }
  function dlgNext() {
    const m = ui.dialog;
    if (!m) return;
    const len = Array.from(clean(m.dlg.lines[m.idx].text)).length;
    clearTimeout(m.timer);
    if (m.pos < len) { m.pos = len; drawDialogue(); return; }
    if (m.idx < m.dlg.lines.length - 1) { m.idx++; m.pos = 0; drawDialogue(); return; }
    closeDialogue();
    const st = CF.state;
    st.pendingDialogue = st.dialogueQueue.shift() || null;
    st.last = nowS();
  }
  function closeDialogue() {
    const root = $('#dlg');
    root.classList.remove('open');
    root.innerHTML = '';
    root.dataset.idx = '';
    ui.dialog = null;
  }
  function showChoice(state) {
    ui.dialog = { choice: true };
    const c = state.choice;
    const root = $('#dlg');
    root.classList.add('open');
    root.innerHTML = `<div class="shade"></div><div class="dbox" style="cursor:default">
      <div class="por">${A.character(A.CAST.vega, { pose: 'idle' })}</div><div class="nm">Your call, boss</div>
      <div class="tx" style="min-height:0">${esc(clean(c.text))}</div>
      <div class="choices">${c.options.map((o, i) => `<button class="btn ${i ? 'gold' : 'purple'}" data-action="choice" data-idx="${i}"><div>${esc(clean(o.label))}<small>${esc(clean(o.sub || ''))}</small></div></button>`).join('')}</div></div>`;
    sfx().story();
  }

  /* ---------------- celebrations ---------------- */
  function celebrate(kind, data) {
    if (!ui.started) return;
    const root = $('#celebrate');
    let inner = '';
    if (kind === 'level') {
      inner = `<div class="ttl">LEVEL ${data.lv.lvl}!</div><div class="sub">${data.newTitle ? 'New title: ' + esc(data.lv.title) : 'Your rep is heating up'}</div>${A.character(A.CAST.tito, { pose: 'cheer' })}<div><button class="btn gold" data-action="celebrate-close">LET’S GO</button></div>`;
      sfx().levelup();
    } else if (kind === 'ach') {
      inner = `<div class="sub">Trophy unlocked</div><svg class="big-ico" viewBox="0 0 48 48">${A.icon('trophy', 48).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg><div class="ttl" style="font-size:48px">${esc(data.name)}</div>${data.money ? `<div class="reward">${I('coin', 44)}+${money(data.money)}</div>` : ''}<div><button class="btn gold" data-action="celebrate-close">NICE</button></div>`;
      sfx().ach();
    } else if (kind === 'away') {
      inner = `<div class="ttl">WELCOME BACK!</div><div class="sub">Your crew kept the farm hot</div><svg class="big-ico" viewBox="0 0 48 48">${A.icon('cash', 48).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg><div><span class="reward">${I('coin', 44)}+${money(data.amount)}</span></div><div><button class="btn gold" data-action="celebrate-close" data-collect="${data.amount}">COLLECT</button></div>`;
      sfx().fanfare();
    } else if (kind === 'biz') {
      inner = `<div class="sub">New business launched</div><svg class="big-ico" viewBox="0 0 48 48">${A.iconFor(data.id, 48).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg><div class="ttl" style="font-size:48px">${esc(data.name)}</div><div><button class="btn gold" data-action="celebrate-close">BIG MOVES</button></div>`;
      sfx().fanfare();
    }
    root.innerHTML = A.sunburst('#ff5a1f', '#ffb03a') + `<div class="cel-card">${inner}</div>`;
    root.classList.add('open');
    setTimeout(() => FX.burst({ x: innerWidth / 2, y: innerHeight / 2 }, 'confetti', 28), 150);
  }
  function closeCelebrate(el) {
    const amt = el && el.dataset.collect;
    $('#celebrate').classList.remove('open');
    $('#celebrate').innerHTML = '';
    if (amt) cashFx({ x: innerWidth / 2, y: innerHeight / 2 }, +amt);
    ui.celebrateQueue = (ui.celebrateQueue || []);
  }
  function queueCelebrate(kind, data) {
    ui.celebrateQueue = ui.celebrateQueue || [];
    if ($('#celebrate').classList.contains('open') || ui.dialog || (ui.panel && kind !== 'biz')) ui.celebrateQueue.push([kind, data]);
    else celebrate(kind, data);
  }

  function achBanner(a) {
    if (ui.panel || ui.dialog || $('#celebrate').classList.contains('open') || (ui.achBusyUntil || 0) > Date.now()) { (ui.achQueue = ui.achQueue || []).push(a); return; }
    let bar = $('#achbar');
    if (!bar) { document.body.insertAdjacentHTML('beforeend', '<div id="achbar"></div>'); bar = $('#achbar'); }
    // re-check right before painting (a panel may have opened since this was queued)
    if (ui.panel || $('#panel-root').classList.contains('open')) { (ui.achQueue = ui.achQueue || []).unshift(a); return; }
    ui.achBusyUntil = Date.now() + 3700;
    ui.achShowing = a;
    clearTimeout(ui.achTimer);
    ui.achTimer = setTimeout(() => { ui.achShowing = null; }, 3700);
    bar.innerHTML = `<div class="ab">${I('trophy', 50)}<div><small>Trophy unlocked</small><b>${esc(a.name)}</b></div>${a.reward && a.reward.money ? `<span class="rw">${I('coin', 26)}+${money(a.reward.money)}</span>` : ''}</div>`;
    bar.classList.remove('on'); void bar.offsetWidth; bar.classList.add('on');
    sfx().ach();
    setTimeout(() => FX.burst(bar.querySelector('.ab') || bar, 'star', 10), 250);
  }

  /* ---------------- walk-in buyers ---------------- */
  function visitorTick(state) {
    const t = nowS();
    const v = ui.visitor;
    if (!ui.started) return;
    if (v && v.kind === 'buyer') {
      const stock = Math.floor(Logic.invGet(state, v.strain));
      if (t > v.until || stock <= 0) { leaveVisitor(stock <= 0 ? 'Aw, sold out? Next time!' : null); return; }
      v.qty = Math.min(v.qty, stock);
    } else if (v && v.kind === 'contract') {
      if (!state.contract.offer || state.contract.offer.tpl !== v.tpl) { ui.visitor = null; }
    }
    if (!ui.visitor && t >= ui.nextVisitorAt) {
      ui.nextVisitorAt = t + 30 + Math.random() * 25;
      const hasStock = Defs.STRAINS.some(s => Logic.invGet(state, s.id) >= 1);
      if (state.contract.offer && ui.seenOffer !== state.contract.offer.tpl + state.contract.offer.expiresDay && !(ui.lastVisitorKind === 'contract' && hasStock)) {
        ui.lastVisitorKind = 'contract';
        const tpl = Defs.contract(state.contract.offer.tpl);
        ui.visitor = { kind: 'contract', key: 'c' + tpl.id + t, tpl: tpl.id, cfg: P.clientCfg(tpl.id) };
      } else {
        const have = Defs.STRAINS.filter(s => Logic.invGet(state, s.id) >= 1);
        if (!have.length) ui.nextVisitorAt = t + 4; // nobody walks in to an empty stash; check again soon
        if (have.length) {
          const s = have[Math.floor(Math.random() * have.length)];
          const stock = Math.floor(Logic.invGet(state, s.id));
          const qty = Math.max(1, Math.min(stock, Math.round(3 + Math.random() * 9 + stock * 0.15)));
          const seed = Math.floor(Math.random() * 1e6);
          ui.lastVisitorKind = 'buyer';
          ui.visitor = { kind: 'buyer', key: 'b' + seed, strain: s.id, qty, mult: +(1.3 + Math.random() * 0.4).toFixed(2), until: t + 28, cfg: A.randomCustomer(seed) };
          sfx().knock();
        }
      }
    }
    const vv = ui.visitor;
    if (vv) {
      vv.bubbleSig = vv.kind === 'buyer' ? vv.qty + '|' + Math.round(Logic.chiliPrice(state, vv.strain) * 100) : vv.tpl;
      vv.bubble = g => {
        if (vv.kind === 'buyer') {
          const st = Defs.strain(vv.strain);
          const pay = vv.qty * Logic.chiliPrice(state, vv.strain) * vv.mult;
          return `<div class="speech right" data-sig="${vv.bubbleSig}" style="left:${g.custBubble[0]}px;top:${g.custBubble[1]}px;max-width:${SC.mode === 'port' ? 200 : 250}px">Got ${vv.qty} ${esc(st.name)}?<small>I’ll pay ${vv.mult}x market!</small><div class="deal"><button class="btn tiny gold" data-action="visitor-deal">${I('coin', 18)}${money(pay)}</button><button class="btn tiny ghost" data-action="visitor-no">Nah</button></div></div>`;
        }
        const tpl = Defs.contract(vv.tpl);
        return `<div class="speech right" data-sig="${vv.bubbleSig}" style="left:${g.custBubble[0]}px;top:${g.custBubble[1]}px;max-width:${SC.mode === 'port' ? 200 : 250}px">${esc(tpl.name)} here!<small>Big order: ${tpl.qty} ${esc(Defs.strain(tpl.strain).name)}</small><div class="deal"><button class="btn tiny" data-action="visitor-open">${I('handshake', 18)}Let’s talk</button></div></div>`;
      };
    }
    SC.showVisitor(ui.visitor);
  }
  function leaveVisitor(line) {
    const v = ui.visitor;
    ui.visitor = null;
    const el = $('#customer');
    if (line && el) {
      const bub = $('#visitor-bubble .speech');
      if (bub) { bub.innerHTML = esc(line); }
    }
    setTimeout(() => SC.showVisitor(ui.visitor), line ? 1200 : 0);
    if (v && v.kind === 'contract') ui.seenOffer = CF.state.contract.offer ? CF.state.contract.offer.tpl + CF.state.contract.offer.expiresDay : '';
  }
  function visitorDeal(state) {
    const v = ui.visitor;
    if (!v || v.kind !== 'buyer') return;
    const st = Defs.strain(v.strain);
    const r = Logic.sellStrain(state, v.strain, v.qty);
    if (!r.ok) { toast(r.msg, 'bad'); leaveVisitor(); return; }
    const bonus = r.money * (v.mult - 1);
    Logic.addMoney(state, bonus);
    Logic.addLog(state, 'A walk-in bought ' + v.qty + 'x ' + st.name + ' for ' + fmt(r.money + bonus) + '!', 'money');
    const el = $('#customer');
    cashFx(el || $('#mainbtn'), r.money + bonus);
    if (el) { el.innerHTML = A.character(v.cfg, { pose: 'cheer' }); FX.burst(el, 'star', 8); }
    leaveVisitor('Pleasure doing business!');
    ui.nextVisitorAt = nowS() + 20 + Math.random() * 20;
  }

  /* ---------------- title ---------------- */
  function showTitle(onPlay) {
    const t = $('#title');
    const peps = ['cayenne', 'habanero', 'reaper', 'jalapeno', 'ghost', 'royal', 'birdseye', 'scorpion'];
    const floaters = Array.from({ length: 12 }, (_, i) => `<div class="floater" style="left:${(i * 53) % 100}%;animation-duration:${7 + (i % 5)}s;animation-delay:-${(i * 1.7) % 9}s;width:${40 + (i % 3) * 16}px;height:${40 + (i % 3) * 16}px">${i % 4 === 3 ? I('coin', 60) : A.pepper(peps[i % peps.length], 60)}</div>`).join('');
    t.innerHTML = A.sunburst('#6a1f8a', '#8a2fb0') + `<div class="vignette"></div><div class="floaters">${floaters}</div>
      <div class="title-inner">
        <div class="title-hero">${A.character(A.CAST.tito, { pose: 'point' })}</div>
        <div class="title-copy">
          <div class="logo"><span class="l1">CHILI FIRM</span><span class="l2">REPLANTED</span><span class="num2">2</span></div>
          <div class="tag">Grow the heat. Build the empire.</div>
          <button class="playbtn" data-action="play">PLAY</button>
        </div>
      </div>
      <div class="title-foot">Tap anywhere to start &middot; Your farm saves automatically</div>`;
    ui.onPlay = onPlay;
  }
  function play() {
    const t = $('#title');
    if (!t || t.classList.contains('hide')) return;
    CF.audio.ensure();
    sfx().fanfare();
    if (CF.state.settings.music) CF.audio.music(true);
    t.classList.add('hide');
    setTimeout(() => { t.remove(); }, 460);
    ui.started = true;
    if (ui.onPlay) ui.onPlay();
  }

  /* ---------------- actions ---------------- */
  function act(action, el, state, ev) {
    const t = nowS();
    const id = el.dataset.id;
    let r = null;
    switch (action) {
      case 'play': play(); return;
      case 'quest-toggle': $('#quest').classList.toggle('open'); sfx().click(); setTimeout(placeChips, 0); return;
      case 'event-toggle': $('#event-chip').classList.toggle('open'); sfx().click(); return;
      case 'main': doMain(state); return;
      case 'room': {
        const rc = SC.roomsCount(state);
        const nr = Math.max(0, Math.min(rc - 1, SC.room + (+el.dataset.dir)));
        if (nr !== SC.room) {
          SC.room = nr; SC.invalidate(); SC.update(state); sfx().whoosh();
          const sc = $('#scene');
          sc.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 250 });
        }
        renderRoomNav(state);
        return;
      }
      case 'boss': say(BARKS[Math.floor(Math.random() * BARKS.length)], { pose: 'cheer', ms: 2400 }); sfx().pop(); FX.burst(el, 'star', 6); return;
      case 'open': if (ui.panel === id) closePanel(); else openPanel(id); return;
      case 'close-panel': closePanel(); return;
      case 'close-panel-backdrop': closePanel(); return;
      case 'ptab': ui.ptab[ui.panel] = id; sfx().click(); renderPanel(state, true); return;
      case 'visitor-deal': visitorDeal(state); return;
      case 'visitor-no': sfx().click(); leaveVisitor('Your loss, chef!'); return;
      case 'visitor-open': leaveVisitor(); openPanel('market'); return;
      case 'dlg-next': dlgNext(); return;
      case 'choice': CF.story.resolveChoice(state, parseInt(el.dataset.idx, 10), Logic.api, t); closeDialogue(); sfx().buy(); return;
      case 'celebrate-close': closeCelebrate(el); return;
      case 'speed': { const sp = [1, 2, 4]; state.settings.speed = sp[(sp.indexOf(state.settings.speed) + 1) % sp.length]; sfx().click(); toast('Game speed ' + state.settings.speed + 'x', '', 'fast'); break; }
      case 'sound': state.settings.sound = !state.settings.sound; sfx().click(); break;
      case 'music': state.settings.music = !state.settings.music; CF.audio.music(state.settings.music); sfx().click(); toast(state.settings.music ? 'Beat on' : 'Beat off', '', 'music'); break;
      case 'save': CF.save(); toast('Game saved', 'good', 'save'); sfx().buy(); break;
      case 'export': {
        ui.exportCode = CF.stateMod.exportState(state);
        const box = $('#import-box'); if (box) box.value = ui.exportCode;
        try { navigator.clipboard.writeText(ui.exportCode).catch(() => {}); } catch (e) { /* no clipboard */ }
        toast('Save code ready below', 'good', 'save'); sfx().buy(); break;
      }
      case 'import': {
        const box = $('#import-box');
        if (!box || !box.value.trim()) { toast('Paste a save code first.', 'bad'); break; }
        const ns = CF.stateMod.importState(box.value, t);
        if (!ns) { toast('That save code is invalid.', 'bad'); sfx().error(); break; }
        CF.state = ns; CF.save(); SC.room = 0; SC.invalidate(); ui.level = null; ui.prev = {};
        toast('Save imported!', 'good'); sfx().fanfare(); closePanel(); break;
      }
      case 'confirm-reset':
        $('#p-body').insertAdjacentHTML('afterbegin', `<div class="order critical" style="margin-bottom:10px"><div style="flex:1"><h4>Wipe everything?</h4><q>This deletes your whole chili empire. Abuela would cry.</q><div class="acts-row"><button class="btn ghost" data-action="ptab" data-id="save">Cancel</button><button class="btn red" data-action="reset">Yes, wipe it</button></div></div></div>`);
        return;
      case 'reset':
        CF.stateMod.wipeSave(localStorage);
        CF.state = CF.stateMod.createState(t);
        ui.level = null; ui.prev = {}; SC.room = 0; SC.invalidate(); ui.visitor = null;
        closePanel(); toast('Fresh start. One seed at a time.', 'good', 'seed');
        return;
      case 'sel-strain':
        if (state.unlocked.indexOf(id) !== -1) { state.selectedStrain = id; sfx().pop(); FX.burst(el, 'leaf', 6); toast('Now planting ' + Defs.strain(id).name, 'good', 'seed'); }
        break;
      case 'sell-strain': {
        const qty = parseInt(el.dataset.qty || '0', 10);
        r = Logic.sellStrain(state, id, qty);
        if (r.ok) { cashFx(el, r.money); r = null; }
        break;
      }
      case 'sell-all': sellAll(state, el); break;
      case 'accept-contract': r = Logic.acceptContract(state, state.contract.offer && state.contract.offer.tpl); if (r.ok) { sfx().fanfare(); FX.burst(el, 'star', 12); toast(r.msg, 'gold', 'handshake'); r = null; } break;
      case 'deliver-contract': {
        const before = state.money;
        r = Logic.deliverContract(state);
        if (r.ok) { cashFx(el, Math.max(0, state.money - before)); toast(r.msg, 'gold', 'truck'); r = null; }
        break;
      }
      case 'hire': r = Logic.hireWorker(state, id); if (r.ok) { say('Welcome to the squad!', { pose: 'cheer', ms: 2200 }); } break;
      case 'train': r = Logic.trainWorker(state, id); break;
      case 'buy-upgrade': r = Logic.buyUpgrade(state, id); if (r.ok) { SC.invalidate(); say('Glow up! Check the room.', { pose: 'cheer', ms: 2400 }); } break;
      case 'buy-land': r = Logic.buyLand(state); if (r.ok) { SC.invalidate(); FX.shake(); say('More pots, more paper!', { pose: 'cheer', ms: 2400 }); } break;
      case 'buy-research': r = Logic.buyResearch(state, id); break;
      case 'treat-pests': r = Logic.treatPests(state); break;
      case 'buy-biz': r = Logic.buyBusiness(state, id); if (r.ok) { queueCelebrate('biz', { id, name: Defs.biz(id).name }); SC.invalidate(); } break;
      case 'biz-level': r = Logic.bizLevelUp(state, id); break;
      case 'recipe-up': r = Logic.recipeUp(state); break;
      case 'design': r = Logic.designCollection(state, id, t); break;
      case 'mine-repair': r = Logic.mineRepair(state, t); break;
      default: return;
    }
    if (r) {
      if (r.ok) {
        sfx().buy();
        FX.burst(el, 'star', 8);
        FX.ring(el, '#b8ff8a');
        toast(r.msg, 'good');
      } else {
        sfx().error();
        el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
        toast(r.msg, 'bad');
      }
    }
    ui.prev.main = null;
    render(state);
  }

  /* ---------------- plot pointer input (tap + swipe) ---------------- */
  function plotFromPoint(x, y) {
    const e = document.elementFromPoint(x, y);
    const p = e && e.closest && e.closest('.plot');
    return p && p.dataset.idx != null ? p : null;
  }
  function onPointerDown(e) {
    const p = e.target.closest && e.target.closest('.plot');
    if (!p || p.dataset.idx == null || e.target.closest('[data-action]')) return;
    const st = CF.state;
    const idx = +p.dataset.idx;
    if (idx >= st.plotCount) return;
    const s = st.plots[idx].status;
    const kind = s === 'empty' ? 'plant' : (s === 'ready' || s === 'wilted') ? 'harvest' : 'water';
    ui.sweep = { kind, done: new Set([idx]) };
    plotAction(st, idx, kind);
    e.preventDefault();
  }
  function onPointerMove(e) {
    if (!ui.sweep) return;
    const p = plotFromPoint(e.clientX, e.clientY);
    if (!p) return;
    const idx = +p.dataset.idx;
    if (ui.sweep.done.has(idx)) return;
    ui.sweep.done.add(idx);
    plotAction(CF.state, idx, ui.sweep.kind);
  }
  function onPointerUp() { ui.sweep = null; }

  /* ---------------- room nav ---------------- */
  function renderRoomNav(state) {
    const rc = SC.roomsCount(state);
    const l = $('.roomnav.l'), r = $('.roomnav.r');
    const sig = rc + '|' + SC.room + '|' + (SC.room > 0 ? SC.readyIn(state, SC.room - 1) : 0) + '|' + (SC.room < rc - 1 ? SC.readyIn(state, SC.room + 1) : 0) + '|' + (state.money >= ((Defs.LAND.find(l => l.plots > state.plotCount) || {}).cost || Infinity));
    if (ui.prev.nav === sig) return;
    ui.prev.nav = sig;
    const show = rc > 1;
    l.style.display = r.style.display = show ? '' : 'none';
    l.disabled = SC.room <= 0; r.disabled = SC.room >= rc - 1;
    const rl = SC.room > 0 ? SC.readyIn(state, SC.room - 1) : 0;
    let rr = SC.room < rc - 1 ? SC.readyIn(state, SC.room + 1) : 0;
    const nl = Defs.LAND.find(l => l.plots > state.plotCount);
    if (!rr && nl && SC.room < rc - 1 && Math.floor(state.plotCount / SC.PER_ROOM) > SC.room && state.money >= nl.cost) rr = '+';
    l.innerHTML = I('left', 32) + (rl ? `<i class="dot">${rl}</i>` : '');
    r.innerHTML = I('right', 32) + (rr ? `<i class="dot">${rr}</i>` : '');
    const rn = $('#roomname');
    rn.innerHTML = esc(SC.ROOM_NAMES[SC.room] || 'Room ' + (SC.room + 1)) + (show ? `<span class="pg">${Array.from({ length: rc }, (_, i) => `<i class="${i === SC.room ? 'on' : ''}"></i>`).join('')}</span>` : '');
    placeRoomName();
  }
  function placeRoomName() {
    const g = SC.G();
    const rn = $('#roomname');
    if (!g || !SC.scale) return;
    const tbl = g.tables[g.tables.length - 1];
    let y = SC.oy + (tbl.y + 44) * SC.scale;
    if (SC.mode === 'port') y = SC.oy + (g.rows[0].bottom - g.cell[1] - 6) * SC.scale - 20;
    else y = 64;
    rn.style.top = y + 'px';
  }

  /* ---------------- render ---------------- */
  function render(state) {
    SC.update(state);
    hudRender(state);
    renderQuest(state);
    renderEvent(state);
    renderTicker(state);
    renderDock(state);
    renderMain(state);
    renderRoomNav(state);
    if (ui.panel) renderPanel(state);
    visitorTick(state);
    reactive(state);
    coach(state);
    // a resolved/cleared choice must never leave its box on screen
    if (ui.dialog && ui.dialog.choice && !state.choice) closeDialogue();
    // modal queue: choice > dialogue
    if (ui.started && !ui.dialog && !$('#celebrate').classList.contains('open')) {
      if (ui.panel) { /* story waits until the panel is closed */ }
      else if (state.choice) showChoice(state);
      else if (state.pendingDialogue) showDialogue(state.pendingDialogue);
      else if (ui.celebrateQueue && ui.celebrateQueue.length) { const nx = ui.celebrateQueue.shift(); celebrate(nx[0], nx[1]); }
    }
  }
  function reactive(state) {
    const keys = Object.keys(state.ach);
    if (ui.prev.ach == null) ui.prev.ach = keys.length;
    if (keys.length > ui.prev.ach) {
      const newest = keys.slice(ui.prev.ach);
      ui.prev.ach = keys.length;
      if (ui.started) newest.forEach(k => { const a = Defs.achievement(k); if (a) (ui.achQueue = ui.achQueue || []).push(a); });
    }
    const ev = state.event ? state.event.id : null;
    if (ui.prev.evId !== ev) {
      if (ev && ui.prev.evId !== undefined) { const d = Defs.event(ev); toast(d.name + '!', 'gold', 'alert'); sfx().event(); FX.shake(); }
      ui.prev.evId = ev;
    }
    // trophy banners wait until no panel / dialogue / celebration is up
    if (ui.achQueue && ui.achQueue.length && !ui.panel && !ui.dialog && !$('#celebrate').classList.contains('open') && (ui.achBusyUntil || 0) <= Date.now()) achBanner(ui.achQueue.shift());
    // chili count flash when storage is full
    const full = Logic.chiliTotal(state) >= Logic.storageCap(state);
    $('#pill-chili').style.color = full ? '#ff9a8a' : '';
  }

  function frame(dt) {
    const st = CF.state;
    if (!st) return;
    hudFrame(st);
    FX.stepCounters(dt);
  }

  /* ---------------- init ---------------- */
  function init() {
    buildHUD();
    buildDock();
    document.body.insertAdjacentHTML('beforeend', '<div id="boss-talk"></div>');
    const sc = $('#scene');
    // boss bubble lives inside the scaled scene
    const ensureBossBubble = () => {
      if (SC.mode === 'land' && !$('#boss-bubble')) {
        const g = SC.G();
        sc.insertAdjacentHTML('beforeend', `<div id="boss-bubble" class="abs" style="left:${g.boss[0] + 10}px;top:${g.boss[1] + 18}px;width:1px;height:1px"></div>`);
      }
    };
    SC.build(CF.state);
    ensureBossBubble();
    new MutationObserver(() => ensureBossBubble()).observe(sc, { childList: true });
    document.addEventListener('click', e => {
      CF.audio.ensure();
      const el = e.target.closest('[data-action]');
      if (!el) { if (!ui.started && e.target.closest('#title')) play(); return; }
      act(el.dataset.action, el, CF.state, e);
    });
    document.addEventListener('pointerdown', e => { CF.audio.ensure(); onPointerDown(e); }, { passive: false });
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    document.addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const st = CF.state;
      if (!ui.started && (e.key === 'Enter' || e.key === ' ')) { play(); return; }
      if (e.key === 'Escape') { if (ui.panel) closePanel(); return; }
      if (ui.dialog && !ui.dialog.choice && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); dlgNext(); return; }
      if (e.key >= '1' && e.key <= '9') { const s = Defs.STRAINS[e.key - 1]; if (s && st.unlocked.indexOf(s.id) !== -1) { st.selectedStrain = s.id; sfx().click(); } }
      else if (e.key === ' ') { e.preventDefault(); doMain(st); }
      else if (e.key === 'ArrowRight') act('room', { dataset: { dir: '1' } }, st);
      else if (e.key === 'ArrowLeft') act('room', { dataset: { dir: '-1' } }, st);
    });
    let rz = 0;
    addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { SC.update(CF.state); SC.fit(); ui.prev.nav = null; renderRoomNav(CF.state); placeChips(); }, 80); });
    ui.nextVisitorAt = nowS() + 14;
    // characters blink every few seconds
    const blink = () => {
      document.querySelectorAll('.actor, .worker-walker, .dbox .por').forEach(e => { if (Math.random() < 0.7) { e.classList.add('blink'); setTimeout(() => e.classList.remove('blink'), 140); } });
      setTimeout(blink, 2200 + Math.random() * 2600);
    };
    setTimeout(blink, 2500);
  }

  ui.init = init;
  ui.render = render;
  ui.frame = frame;
  ui.toast = toast;
  ui.showTitle = showTitle;
  ui.play = play;
  ui.say = say;
  ui.celebrate = queueCelebrate;
  ui.openPanel = openPanel;
  ui.closePanel = closePanel;
  ui.setView = v => { const map = { market: 'market', workers: 'crew', lab: 'lab', biz: 'empire', stats: 'trophy' }; if (map[v]) openPanel(map[v]); };
  CF.ui = ui;
})(typeof window !== 'undefined' ? window : globalThis);

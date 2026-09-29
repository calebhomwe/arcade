// The content of every sheet. Each function returns a definition for UI.openSheet and reads the farm
// state fresh on every render, so the sheet stays right while things change underneath it.
import { icon } from './icons.js';
import { fmt, fmtTime } from '../util.js';
import {
  CROPS, ANIMALS, ITEMS, BUILDINGS, RECIPES, DECOR, COSMETICS, NPCS, CHAPTERS, ACHIEVEMENTS, CRITTERS, ALBUM_SETS, DAILY_REWARDS, EVENTS, BARN_UPGRADES, itemName, xpNeed, UNLOCKS, TIPS,
} from '../data.js';
import { PATCHES, PENS, SITES } from '../layout.js';
import { seasonFor } from '../state.js';

const I = (n, s = 32) => icon(n, s);
const coin = (s = 20) => icon('coin', s);
const chip = (farm, id, need) => { const have = farm.have(id), ok = have >= need; return `<span class="chip ${ok ? 'ok' : 'no'}">${I(ITEMS[id].icon, 28)}${have}/${need}</span>`; };
const rewards = (o) => `<div class="rew">${o.coins ? `<span>${coin(22)}${fmt(o.coins)}</span>` : ''}${o.xp ? `<span>${I('star', 22)}<b style="font-weight:400;color:#2f83c4">${o.xp} XP</b></span>` : ''}${o.stars ? `<span>${I('gem', 22)}${o.stars}</span>` : ''}</div>`;
const lockNote = (lvl) => `<span class="note" style="color:var(--red-d)">${I('lock', 20)} Level ${lvl}</span>`;
const btn = (label, act, data = '', cls = '') => `<button class="btn ${cls}" data-act="${act}" ${data}>${label}</button>`;
const barPct = (frac, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, frac * 100)).toFixed(1)}%"></i></div>`;

export function makePanels(game) {
  const farm = game.farm, ui = game.ui;
  const S = () => farm.S;
  const P = {};

  // ---- barn ---------------------------------------------------------------------------------------------
  P.barn = () => ({
    id: 'barn', title: 'The Barn', icon: 'barn', live: false,
    render: () => {
      const used = farm.barnUsed(), cap = farm.barnCap(), items = Object.entries(S().inv).sort((a, b) => (ITEMS[a[0]].level - ITEMS[b[0]].level));
      const basket = farm.basketCount();
      const up = BARN_UPGRADES[S().barnLvl];
      return `<div class="row" style="margin-bottom:10px"><div class="grow"><h3>${used}/${cap} stored</h3>${barPct(used / cap, used / cap > 0.9 ? 'gold' : '')}${basket ? `<p>${I('gift', 22)} ${basket} more waiting in the basket. Make room and they hop right in.</p>` : ''}</div></div>
      ${items.length ? `<div class="grid">${items.map(([id, q]) => `<button class="tile" data-act="itemInfo" data-id="${id}">${I(ITEMS[id].icon, 52)}<span>${ITEMS[id].name}</span><span class="qty">${q}</span></button>`).join('')}</div>` : `<div class="note" style="padding:26px 6px">The barn is empty. Plant something and harvest it!</div>`}`;
    },
    foot: () => { const u = BARN_UPGRADES[S().barnLvl]; if (!u) return `<span class="note">Your barn is as big as it gets. Wow!</span>`; const ok = S().level >= u.level; return ok ? btn(`Bigger barn: ${u.cap} ${coin(22)} ${fmt(u.cost)}`, 'upgradeBarn', '', 'buy') : `<span class="note">Bigger barn (${u.cap}) unlocks at level ${u.level}</span>`; },
  });

  // ---- market -------------------------------------------------------------------------------------------------
  P.market = () => ({
    id: 'market', title: "Milo's Market", icon: 'market',
    render: () => {
      const sp = farm.special(), items = Object.entries(S().inv);
      const spHave = farm.have(sp);
      return `<div class="banner">${I(ITEMS[sp].icon, 34)} <b>Today's special:</b> ${itemName(sp)} sells for <b>50% more</b>!${spHave ? '' : ' (You have none right now.)'}</div>
      ${items.length ? items.sort((a, b) => ITEMS[b[0]].sell - ITEMS[a[0]].sell).map(([id, q]) => `<div class="row">${I(ITEMS[id].icon, 48)}<div class="grow"><h3>${ITEMS[id].name}</h3><p>${coin(18)} ${fmt(farm.price(id))} each${id === sp ? ' ' + I('sparkles', 18) : ''} &middot; you have ${q}</p></div>
        <div style="display:flex;flex-direction:column;gap:6px">${btn('Sell 1', 'sell', `data-id="${id}" data-n="1"`, 'buy small')}${q > 1 ? btn(`All ${q}`, 'sell', `data-id="${id}" data-n="${q}"`, 'small') : ''}</div></div>`).join('') : `<div class="note" style="padding:26px 6px">Nothing to sell yet. Harvest a few crops first!</div>`}`;
    },
  });

  // ---- orders ---------------------------------------------------------------------------------------------------
  P.orders = () => ({
    id: 'orders', title: 'Order Board', icon: 'orders', live: true,
    render: () => {
      const st = S(); farm.ensureOrders(true);
      if (!farm.orderSlots()) return `<div class="note" style="padding:26px 6px">${I('lock', 26)}<br>The order board opens at level 2, or when you meet Milo's first request.</div>`;
      const cards = st.orders.map((o) => {
        const can = farm.canFill(o);
        return `<div class="row"><div class="grow"><h3>${o.title}</h3><p>${o.customer} would like:</p><div class="chips">${Object.entries(o.need).map(([k, q]) => chip(farm, k, q)).join('')}</div>${rewards(o)}</div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:stretch">${btn(can ? 'Fill' : 'Need more', can ? 'fillOrder' : 'orderMissing', `data-id="${o.id}"`, can ? '' : 'grey')}<button class="btn grey small" data-act="skipOrder" data-id="${o.id}" aria-label="Set this order aside">Not now</button></div></div>`;
      }).join('');
      const waiting = Math.max(0, farm.orderSlots() - st.orders.length);
      return cards + Array.from({ length: waiting }, () => `<div class="row" style="opacity:.75"><div class="grow center"><h3>${I('sparkles', 26)} A new neighbour is on their way&hellip;</h3></div></div>`).join('') + `<div class="note">Orders never run out of time. Fill them whenever you like.</div>`;
    },
  });

  // ---- boat ------------------------------------------------------------------------------------------------------
  P.boat = () => ({
    id: 'boat', title: "Marta's Boat", icon: 'boat', live: true,
    render: () => {
      const b = farm.boatInfo(); if (!b) return `<div class="note" style="padding:26px 6px">Marta's boat arrives at level 3.</div>`;
      if (b.state === 'away') {
        const left = Math.max(0, (b.returnAt - farm.now()) / 1000);
        return `<div class="center" style="padding:14px 6px">${I('boat', 84)}<h3 style="font-weight:400;font-size:22px;margin:6px 0">Marta is on her way to the city!</h3><p class="note">She will be back in ${fmtTime(left)} with new crates to fill. Nothing to worry about, the farm keeps going.</p></div>`;
      }
      const ok = farm.boatFill();
      return `<div class="banner">Marta is at the dock. Fill every crate, then wave her off for a big reward.</div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(104px,1fr))">${b.crates.map((c) => { const have = farm.have(c.item), good = have >= c.qty; return `<div class="tile ${good ? 'sel' : ''}">${I(ITEMS[c.item].icon, 52)}<span>${ITEMS[c.item].name}</span><span class="chip ${good ? 'ok' : 'no'}" style="margin-top:2px">${Math.min(have, 999)}/${c.qty}</span>${good ? `<span class="qty" style="background:var(--leaf-d)">&#10003;</span>` : ''}</div>`; }).join('')}</div>
      <div class="row" style="margin-top:14px"><div class="grow"><h3>Marta pays</h3>${rewards({ coins: b.coins, xp: b.xp, stars: b.stars })}</div>${btn('Send off!', ok ? 'sendBoat' : 'boatMissing', '', ok ? 'buy' : 'grey')}</div>`;
    },
  });

  // ---- shop -------------------------------------------------------------------------------------------------------
  P.shop = (tab) => ({
    id: 'shop', title: 'Build & Buy', icon: 'hammer', tall: true, tab: tab || 'sites',
    tabs: [{ id: 'sites', label: 'Workshops' }, { id: 'pens', label: 'Animals' }, { id: 'land', label: 'Fields' }, { id: 'decor', label: 'Decor' }],
    render: (t) => {
      const L = S().level;
      if (t === 'sites') return SITES.map((s) => { const built = farm.buildingBuilt(s.id), ok = L >= s.level; const recs = BUILDINGS[s.id].recipes.filter((r) => r.level <= 60).slice(0, 4);
        return `<div class="row">${I(ok || built ? 'hammer' : 'lock', 48)}<div class="grow"><h3>${s.name}</h3><p>${BUILDINGS[s.id].blurb}</p><div class="chips">${recs.map((r) => `<span class="chip">${I(ITEMS[Object.keys(r.out)[0]].icon, 26)}</span>`).join('')}</div></div>${built ? `<span class="note">${I('check', 22)} Built</span>` : ok ? btn(`${coin(20)} ${fmt(s.cost)}`, 'buySite', `data-id="${s.id}"`, 'buy small') : lockNote(s.level)}</div>`; }).join('');
      if (t === 'pens') return PENS.map((p) => { const built = farm.penBuilt(p.id), ok = L >= p.level; const a = ANIMALS.find((q) => q.pen === p.id); const info = built ? farm.penInfo(p.id) : null;
        return `<div class="row">${I(ok || built ? a.icon : 'lock', 48)}<div class="grow"><h3>${p.name}</h3><p>${a.name}s make ${itemName(a.product).toLowerCase()}. ${built ? `${info.animals.length}/${p.cap} here.` : `Holds ${p.cap}.`}</p></div>${built ? (info.animals.length < p.cap ? btn(`Buy ${a.name.toLowerCase()} ${coin(20)} ${a.cost}`, 'buyAnimal', `data-id="${p.id}"`, 'buy small') : `<span class="note">Full</span>`) : ok ? btn(`${coin(20)} ${fmt(p.cost)}`, 'buyPen', `data-id="${p.id}"`, 'buy small') : lockNote(p.level)}</div>`; }).join('');
      if (t === 'land') return PATCHES.map((p) => { const own = farm.patchOwned(p.id), ok = L >= p.level; return `<div class="row">${I(own || ok ? 'land' : 'lock', 48)}<div class="grow"><h3>Field ${p.id}</h3><p>Six more beds to plant.</p></div>${own ? `<span class="note">${I('check', 22)} Yours</span>` : ok ? btn(`${coin(20)} ${fmt(p.cost)}`, 'buyPatch', `data-id="${p.id}"`, 'buy small') : lockNote(p.level)}</div>`; }).join('');
      if (!farm.hasFeature('decor')) return `<div class="note" style="padding:26px 6px">${I('lock', 26)}<br>Decorations open at level 3.</div>`;
      const free = S().decorFree || {};
      return `<div class="note">Pick one, slide the farm under the circle, then tap Place. Store it again for free any time.</div><div class="grid" style="margin-top:8px">${DECOR.map((d) => { const ok = L >= d.level, f = free[d.id] > 0; return `<button class="tile ${ok ? '' : 'locked'}" data-act="${ok ? 'placeDecor' : 'decorLocked'}" data-id="${d.id}" data-lv="${d.level}"><span style="font-size:14px;min-height:34px">${d.name}</span>${I(decorIcon(d), 44)}${f ? `<small>${I('gift', 18)} free</small>` : ok ? `<small>${coin(18)} ${fmt(d.cost)}</small>` : `<small>${I('lock', 18)} Lv ${d.level}</small>`}</button>`; }).join('')}</div>`;
    },
  });
  const decorIcon = (d) => ({ garden: 'flower', fence: 'land', farm: 'barn', light: 'candle', tree: 'seedling', house: 'barn' }[d.cat] || 'sparkles');
  P.decorIcon = decorIcon;

  // ---- one workshop -------------------------------------------------------------------------------------------------
  P.building = (id) => {
    const def = BUILDINGS[id], site = SITES.find((s) => s.id === id);
    return {
      id: 'b_' + id, title: def.name, icon: 'hammer', live: true, tall: true,
      render: () => {
        const jobs = farm.jobs(id), L = S().level, slots = def.slots;
        const q = jobs.map((j, i) => { const r = RECIPES[j.recipe], out = Object.keys(r.out)[0]; const frac = j.done ? 1 : 1 - j.left / r.sec; return `<div class="row" style="margin-bottom:8px">${I(ITEMS[out].icon, 44)}<div class="grow"><h3>${itemName(out)}${Object.values(r.out)[0] > 1 ? ' x' + Object.values(r.out)[0] : ''}</h3>${barPct(frac, j.done ? 'gold' : '')}<p>${j.done ? 'Ready!' : fmtTime(j.left) + ' left'}</p></div>${!j.done && S().stars > 0 ? `<button class="btn blue small" data-act="speedUp" data-id="${id}" data-i="${i}" aria-label="Finish now for one gem">${I('gem', 22)}1</button>` : ''}</div>`; }).join('');
        const empties = Array.from({ length: Math.max(0, slots - jobs.length) }, () => `<div class="row" style="opacity:.6;margin-bottom:8px"><div class="grow center"><p>Empty slot: pick something below</p></div></div>`).join('');
        const recs = def.recipes.map((r) => {
          const out = Object.keys(r.out)[0], oq = r.out[out], ok = r.level <= L, can = ok && Object.entries(r.in).every(([k, n]) => farm.have(k) >= n) && jobs.length < slots;
          return `<div class="row ${ok ? '' : 'locked'}">${I(ok ? ITEMS[out].icon : 'lock', 46)}<div class="grow"><h3>${itemName(out)}${oq > 1 ? ' x' + oq : ''}</h3>${ok ? `<div class="chips">${Object.entries(r.in).map(([k, n]) => chip(farm, k, n)).join('')}</div><p>${I('clock', 18)} ${fmtTime(r.sec)} &middot; ${r.xp} XP &middot; sells ${coin(16)}${fmt(ITEMS[out].sell)}</p>` : `<p>${lockNote(r.level)}</p>`}</div>${ok ? btn('Make', can ? 'startJob' : 'jobMissing', `data-b="${id}" data-r="${r.id}"`, can ? 'small' : 'grey small') : ''}</div>`;
        }).join('');
        return `${q}${empties}<div class="sub">Recipes</div>${recs}`;
      },
      foot: () => farm.readyJobs(id) ? btn(`Collect ${farm.readyJobs(id)} ${I('gift', 22)}`, 'collectJobs', `data-b="${id}"`, 'buy') : '',
    };
  };

  // ---- one pen ---------------------------------------------------------------------------------------------------------
  P.pen = (id) => {
    const pen = PENS.find((p) => p.id === id);
    return {
      id: 'pen_' + id, title: pen.name, icon: pen.animal === 'bee' ? 'bee' : pen.animal, live: true,
      render: () => {
        const info = farm.penInfo(id); if (!info) return '<div class="note">Build this pen first.</div>';
        const a = info.animal, feed = Object.entries(a.feed);
        const list = info.animals.map((an) => `<div class="tile ${an.state === 'ready' ? 'sel' : ''}" style="min-height:104px">${I(a.icon, 48)}<span>${an.state === 'ready' ? 'Ready!' : an.state === 'growing' ? fmtTime(an.left) : 'Hungry'}</span>${an.state === 'ready' ? `<span class="qty" style="background:var(--leaf-d)">${I(ITEMS[a.product].icon, 20)}</span>` : ''}</div>`).join('');
        const slots = Array.from({ length: Math.max(0, info.cap - info.animals.length) }, () => `<button class="tile locked" data-act="buyAnimal" data-id="${id}" style="min-height:104px"><span>Add one</span>${coin(30)}<small>${a.cost}</small></button>`).join('');
        return `<div class="banner">${a.name}s eat ${feed.map(([k, q]) => `${q} ${itemName(k).toLowerCase()}`).join(' + ')} each, then make ${itemName(a.product).toLowerCase()}.</div><div class="grid">${list}${slots}</div>`;
      },
      foot: () => { const info = farm.penInfo(id); if (!info) return ''; return (info.hungry ? btn(`Feed ${info.hungry} ${I(ITEMS[Object.keys(info.animal.feed)[0]].icon, 24)}`, 'feedPen', `data-id="${id}"`) : '') + (info.ready ? btn(`Collect ${info.ready} ${I(ITEMS[info.animal.product].icon, 24)}`, 'collectPen', `data-id="${id}"`, 'buy') : ''); },
    };
  };

  // ---- goals: story + today ----------------------------------------------------------------------------------------------
  P.goals = (tab) => ({
    id: 'goals', title: 'Goals', icon: 'tasks', live: true, tall: true, tab: tab || 'story',
    tabs: [{ id: 'story', label: 'The Fair', dot: farm.chapter().ready ? '!' : '' }, { id: 'today', label: 'Today', dot: (farm.dailyClaimable() || S().quests.list.some((q) => !q.claimed && farm.questProgress(q) >= q.n)) ? '!' : '' }],
    render: (t) => {
      if (t === 'story') {
        const c = farm.chapter();
        const now = c.done ? `<div class="banner center">${I('lantern', 44)}<br><b>The Lantern Fair is lit!</b><br>Every chapter is done. Keep growing, cooking and decorating: the farm is yours.</div>` :
          `<div class="row" style="flex-direction:column;align-items:stretch;gap:6px"><div style="display:flex;gap:10px;align-items:center"><div class="grow"><p style="margin:0">Chapter ${c.index + 1} of ${CHAPTERS.length}</p><h3 style="font-size:22px">${c.ch.title}</h3></div>${I('lantern', 44)}</div><p style="font-size:16px">${c.ch.text}</p><h3>${c.ch.goal}</h3>${barPct(c.have / c.target)}<p>${c.have}/${c.target}</p>${c.ready ? btn('Claim reward!', 'claimChapter') : ''}</div>`;
        return now + `<div class="sub">The story so far</div>` + CHAPTERS.map((ch, i) => `<div class="row" style="padding:5px 10px;opacity:${i > S().story.i ? 0.55 : 1};margin-bottom:8px">${I(i < S().story.i ? 'check' : i === S().story.i ? 'sparkles' : 'lock', 30)}<div class="grow"><h3 style="font-size:16px">${i + 1}. ${ch.title}</h3></div></div>`).join('');
      }
      // today
      const d = S().daily, day = (d.streak - 1) % 7;
      const cal = DAILY_REWARDS.map((r, i) => `<div class="tile ${i === day ? 'sel' : ''}" style="min-height:84px;padding:4px 2px;${i < day || (i === day && !farm.dailyClaimable()) ? 'opacity:.55' : ''}"><small>Day ${i + 1}</small>${r.coins ? coin(30) : r.stars ? I('gem', 30) : I(ITEMS[r.item].icon, 30)}<small>${r.coins ? '+' + r.coins : r.stars ? '+' + r.stars : 'x' + r.qty}${r.coins && r.stars ? ' +' + r.stars + '★' : ''}</small></div>`).join('');
      const streakLine = d.reset ? 'Welcome back! A fresh start today.' : d.rested ? 'Your streak took a little nap and is still safe.' : `Day ${d.streak} in a row. Best: ${d.best}.`;
      const quests = S().quests.list.map((q, i) => { const p = farm.questProgress(q), done = p >= q.n; return `<div class="row"><div class="grow"><h3>${questText(q)}</h3>${barPct(p / q.n)}<p>${p}/${q.n} &middot; ${coin(16)} ${q.coins} &middot; ${q.xp} XP</p></div>${q.claimed ? `<span class="note">${I('check', 26)}</span>` : done ? btn('Claim', 'claimQuest', `data-i="${i}"`, 'small') : ''}</div>`; }).join('');
      const allDone = S().quests.list.length && S().quests.list.every((q) => q.claimed);
      return `<div class="banner center"><b>${streakLine}</b></div><div class="grid" style="grid-template-columns:repeat(7,1fr);gap:5px">${cal}</div>${farm.dailyClaimable() ? `<div class="center" style="margin:12px 0">${btn('Open today\'s gift ' + I('gift', 26), 'claimDaily', '', 'buy')}</div>` : `<div class="note">Today's gift is opened. See you tomorrow!</div>`}
        <div class="sub">Today's tasks</div>${S().level >= 4 ? quests : `<div class="note">Daily tasks start at level 4.</div>`}${allDone ? `<div class="center">${S().quests.chest ? '<div class="note">Bonus chest opened. Lovely work!</div>' : btn('Open the bonus chest', 'claimQuestChest', '', 'buy')}</div>` : ''}`;
    },
  });
  const questText = (q) => ({ harvest: `Harvest ${q.n} crops`, orders: `Fill ${q.n} orders`, collect: `Collect ${q.n} animal goods`, batch: `Finish ${q.n} batches`, sell: `Sell ${q.n} items`, plant: `Plant ${q.n} seeds` }[q.kind]);

  // ---- more: album, awards, wardrobe, event ---------------------------------------------------------------------------------
  P.more = (tab) => {
    const ach = farm.achReady();
    return {
      id: 'more', title: 'My Farm Book', icon: 'album', live: false, tall: true, tab: tab || 'album',
      tabs: [{ id: 'album', label: 'Album' }, { id: 'awards', label: 'Awards', dot: ach ? ach : '' }, { id: 'wear', label: 'Wardrobe' }, { id: 'event', label: 'Event' }],
      render: (t) => {
        const L = S().level;
        if (t === 'album') {
          if (L < 10) return `<div class="note" style="padding:26px 6px">${I('lock', 26)}<br>The album opens at level 10. Stickers are collected as you play.</div>`;
          const cr = CRITTERS.map((c) => `<div class="tile ${S().album['crit_' + c.id] ? '' : 'locked'}" style="min-height:90px">${I(S().album['crit_' + c.id] ? c.id : 'lock', 44)}<span>${S().album['crit_' + c.id] ? c.name : '???'}</span><small>${S().album['crit_' + c.id] ? '' : c.hint}</small></div>`).join('');
          const cropsSet = CROPS.map((c) => `<div class="tile ${S().album[c.id] ? '' : 'locked'}" style="min-height:84px">${I(S().album[c.id] ? c.icon : 'lock', 40)}<span>${S().album[c.id] ? c.name : '???'}</span></div>`).join('');
          const goods = Object.values(ITEMS).filter((i) => i.kind !== 'crop').map((i) => `<div class="tile ${S().album[i.id] ? '' : 'locked'}" style="min-height:84px">${I(S().album[i.id] ? i.icon : 'lock', 40)}<span>${S().album[i.id] ? i.name : '???'}</span></div>`).join('');
          return `<div class="sub">Critters ${CRITTERS.filter((c) => S().album['crit_' + c.id]).length}/${CRITTERS.length}</div><div class="grid">${cr}</div><div class="sub">Crops</div><div class="grid">${cropsSet}</div><div class="sub">Goods</div><div class="grid">${goods}</div><div class="note">Each finished page pays a prize: ${ALBUM_SETS.map((s) => s.name + (S().albumDone[s.id] ? ' ✓' : '')).join(', ')}.</div>`;
        }
        if (t === 'awards') return farm.achStatus().map((a) => { const n = a.next; return `<div class="row"><div class="grow"><h3>${a.def.name}</h3><p>${a.done ? 'All done!' : a.def.desc(n.n)}</p>${a.done ? '' : barPct(Math.min(1, a.value / n.n))}<p>${a.done ? '' : Math.min(a.value, n.n) + '/' + n.n} ${a.done ? '' : '&middot; '}${n ? `${coin(16)} ${n.coins || 0}${n.stars ? ' ' + I('gem', 18) + n.stars : ''}` : ''}</p><div class="chips">${a.def.tiers.map((t2, i) => `<span class="chip ${i < a.claimed ? 'ok' : ''}" style="padding:0 6px">${i < a.claimed ? '✓ ' : ''}${fmt(t2.n)}</span>`).join('')}</div></div>${a.ready ? btn('Claim', 'claimAch', `data-id="${a.def.id}"`, 'small') : ''}</div>`; }).join('');
        if (t === 'wear') {
          const slots = [['hat', 'Claire hats'], ['pip', "Pip's style"], ['barn', 'Barn colour'], ['flag', 'Bunting']];
          return slots.map(([slot, label]) => `<div class="sub">${label}</div><div class="grid">${COSMETICS.filter((c) => c.slot === slot).map((c) => { const own = farm.cosOwned(c.id) || c.free, worn = S().cos.wear[slot] === c.id; const lv = c.level || 1; const cost = c.coins ? `${coin(18)} ${c.cost}` : c.cost ? `${I('gem', 18)} ${c.cost}` : (c.story ? 'Story' : c.ach ? 'Award' : ''); return `<button class="tile ${worn ? 'sel' : ''} ${own ? '' : 'locked'}" data-act="${own ? 'wear' : 'buyCos'}" data-id="${c.id}"><span style="min-height:34px">${c.name}</span>${I(slot === 'hat' ? 'crown' : slot === 'pip' ? 'pip' : slot === 'barn' ? 'barn' : 'bell', 40)}<small>${worn ? 'Wearing' : own ? 'Wear' : L < lv ? I('lock', 18) + ' Lv ' + lv : cost}</small></button>`; }).join('')}</div>`).join('');
        }
        // event
        const ev = farm.event(), d = ev.def;
        return `<div class="banner"><b>${d.name}</b><br>${d.blurb}<br>${I('sparkles', 20)} This event stays open as long as you like. No rush!</div>` + d.baskets.map((b, i) => { const done = ev.done[i], locked = i > 0 && !ev.done[i - 1], can = farm.eventCanFill(i); return `<div class="row" style="opacity:${locked ? 0.55 : 1}"><div class="grow"><h3>Basket ${i + 1}</h3><div class="chips">${Object.entries(b.need).map(([k, q]) => chip(farm, k, q)).join('')}</div>${rewards(b.reward)}${b.reward.decor ? `<p>${I('gift', 20)} Free ${DECOR.find((x) => x.id === b.reward.decor).name}</p>` : ''}</div>${done ? `<span class="note">${I('check', 28)}</span>` : locked ? I('lock', 30) : btn('Give', can ? 'eventFill' : 'orderMissing', `data-i="${i}"`, can ? 'small' : 'grey small')}</div>`; }).join('');
      },
    };
  };

  // ---- settings -------------------------------------------------------------------------------------------------------------
  P.settings = () => ({
    id: 'settings', title: 'Settings', icon: 'settings', tall: true,
    render: () => {
      const s = S().settings;
      const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(s[key]) === String(v) ? 'on' : ''}" data-act="setting" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
      return `<div class="slider"><label for="s_music">Music</label><input id="s_music" type="range" min="0" max="100" value="${Math.round(s.music * 100)}" data-slide="music"></div>
      <div class="slider"><label for="s_sfx">Sounds</label><input id="s_sfx" type="range" min="0" max="100" value="${Math.round(s.sfx * 100)}" data-slide="sfx"></div>
      <div class="slider"><label for="s_voice">Claire's voice</label><input id="s_voice" type="range" min="0" max="100" value="${Math.round(s.voice * 100)}" data-slide="voice"></div>
      <div class="sub">Graphics</div>${seg('quality', [['auto', 'Auto'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']])}
      <div class="note">${game.engine.quality} now &middot; ${game.engine.stats.fps} fps &middot; auto lowers itself if the picture gets slow.</div>
      <div class="sub">Season</div>${seg('season', [['auto', 'Auto'], ['spring', 'Spring'], ['summer', 'Summer'], ['autumn', 'Autumn'], ['winter', 'Winter']])}
      <div class="sub">Where do you live?</div>${seg('hemi', [['south', 'Southern half'], ['north', 'Northern half']])}
      <div class="sub">Time of day</div>${seg('tod', [['cycle', 'Moves'], ['day', 'Sunny'], ['gold', 'Golden'], ['night', 'Night']])}
      <div class="sub">Weather</div>${seg('weather', [['auto', 'Sometimes'], ['clear', 'Always clear']])}
      <div class="sub">Comfort</div>${seg('reduceMotion', [['false', 'Full motion'], ['true', 'Calm']])}${seg('textSize', [['1', 'Normal text'], ['1.15', 'Bigger text']])}
      <div class="sub">Help</div><div style="display:flex;gap:8px;flex-wrap:wrap">${btn('How to play', 'howto', '', 'blue small')}${btn('Replay tutorial', 'tutorial', '', 'blue small')}${btn('Codes', 'codes', '', 'grey small')}${btn('Credits', 'credits', '', 'grey small')}</div>
      <div class="sub">Farm</div><div style="display:flex;gap:8px;flex-wrap:wrap">${btn('Title screen', 'toTitle', '', 'grey small')}${btn('Start a new farm', 'newFarm', '', 'red small')}</div>
      <div class="note" style="margin-top:12px">Your farm saves itself. It keeps growing while you are away.</div>`;
    },
  });

  return P;
}

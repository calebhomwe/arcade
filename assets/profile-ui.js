/* Caleb's Arcade: the profile on screen. Loaded after profile-core.js and profile-art.js, before site.js.
 *
 * Draws the header chip, the profile sheet, the Daily quests card, the Trophy room, toasts and the level-up
 * celebration, and watches a game frame (track) so play time, rounds and the opt-in ArcadeSDK.profile calls
 * reach the profile. The profile itself lives in profile-core.js; docs/PROGRESSION.md has the rules.
 */
(function () {
  'use strict';
  var Core = window.ArcadeProfileCore, Art = window.ArcadeArt;
  if (!Core || !Art || typeof CATALOG === 'undefined' || typeof CATS === 'undefined') return;
  var doc = document, XP = Core.XP;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ico(n, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function dur(sec) { sec = Math.round(sec); if (sec < 60) return sec + ' s'; var m = Math.round(sec / 60); if (m < 60) return m + ' min'; var h = Math.floor(m / 60); return h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : ''); }
  var byId = {}; CATALOG.forEach(function (g) { byId[g.id] = g; });
  var catName = function (id) { for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i].name.replace('Hyper-Casual', 'Quick play'); return id; };
  function jget(k, d) { try { var v = window.localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function jset(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var reduce = function () { var m = doc.documentElement.dataset.motion; return m === 'off' || (m !== 'on' && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); };

  /* ---------- the store: this device's profile ---------- */
  var storage = {
    getItem: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    setItem: function (k, v) { window.localStorage.setItem(k, v); },
    removeItem: function (k) { try { window.localStorage.removeItem(k); } catch (e) {} }
  };
  function legacy() {   // what the portal kept before profiles existed
    var bests = {};
    CATALOG.forEach(function (g) { if (g.rec) { var r = jget(g.rec, null), v = typeof r === 'number' ? r : (r && r.best); if (typeof v === 'number' && v > 0) bests[g.id] = v; } });
    return { plays: jget('ca_plays', {}), bests: bests, favs: (jget('ca_favs', []) || []).length };
  }
  var Store = Core.create({ storage: storage, catalog: CATALOG, cats: CATS, legacy: legacy });
  Art.mountDefs();
  var today = function () { return Core.dayStr(Date.now()); };

  /* ---------- small builders ---------- */
  function av(size, o) { var p = Store.get(); o = o || {}; return Art.avatar({ avatar: o.avatar || p.avatar, hat: o.hat != null ? o.hat : p.hat, frame: o.frame || p.frame, size: size, label: p.name + ', your buddy' }); }
  function bar(pct, cls) { return '<span class="pf-bar' + (cls ? ' ' + cls : '') + '" role="presentation"><i style="width:' + Math.max(pct > 0 ? 4 : 0, Math.min(100, pct * 100)).toFixed(1) + '%"></i></span>'; }
  function tierWord(t) { return { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond' }[t] || t; }
  function starsHtml(n) { var s = ''; for (var i = 0; i < n; i++) s += Art.star(14); return '<span class="pf-stars" aria-label="' + plural(n, 'star') + '">' + s + '</span>'; }
  function streakLit(p) { return p.streak.last === today() && p.streak.n > 0; }
  function levelLine(li, p) {
    if (li.max) return 'Top level! Keep collecting badges and stars.';
    return fmt(li.need - li.into) + ' XP to level ' + (li.level + 1);
  }
  function nextReward(level) {
    var best = null;
    var word = { accent: ' colour', theme: ' theme' };
    ['hat', 'frame', 'theme', 'accent'].forEach(function (k) { Core.COSMETICS[k].forEach(function (d) { if (d.unlock && d.unlock.level > level && (!best || d.unlock.level < best.level)) best = { level: d.unlock.level, kind: k, name: d.name + (word[k] || '') }; }); });
    return best;
  }

  /* ---------- toasts: inside the player when there is one, so they show in fullscreen too ---------- */
  var toastQueue = [], badgeBatch = [], badgeTimer = 0;
  function toastBox() {
    // A modal dialog sits above everything on the page, so a toast made while one is open goes inside it.
    var open = $$('dialog[open]'), host = open.length ? open[open.length - 1] : null;
    if (host) {
      var hb = $(':scope > .pf-toasts', host);
      if (!hb) { hb = doc.createElement('div'); hb.className = 'pf-toasts floating'; hb.setAttribute('aria-live', 'polite'); host.appendChild(hb); }
      return hb;
    }
    var b = $('#pf-toasts');
    if (!b) { b = doc.createElement('div'); b.id = 'pf-toasts'; b.className = 'pf-toasts floating'; b.setAttribute('aria-live', 'polite'); doc.body.appendChild(b); }
    return b;
  }
  function toast(o) {
    var b = toastBox(), t = doc.createElement('div');
    t.className = 'pf-toast ' + (o.kind || '') + (o.actions ? ' has-actions' : '');
    t.innerHTML = (o.art ? '<span class="pt-art">' + o.art + '</span>' : '') + '<span class="pt-tx"><b>' + esc(o.title) + '</b>' + (o.sub ? '<span>' + esc(o.sub) + '</span>' : '') + '</span>' +
      (o.actions ? '<span class="pt-acts">' + o.actions.map(function (a, i) { return '<button type="button" class="pf-btn sm ' + (a.cls || '') + '" data-i="' + i + '">' + esc(a.label) + '</button>'; }).join('') + '</span>' : '');
    var kill = function () { t.classList.remove('in'); setTimeout(function () { t.remove(); }, 300); };
    if (o.actions) t.addEventListener('click', function (e) { var bt = e.target.closest('button[data-i]'); if (bt) { try { o.actions[+bt.dataset.i].run(); } catch (x) {} kill(); } });
    b.appendChild(t); while (b.children.length > (b.id === 'pf-toasts' && !b.classList.contains('floating') ? 2 : 3)) b.firstChild.remove();
    void t.offsetWidth; t.classList.add('in');   // a reflow first, so the slide-in plays even where animation frames are throttled
    setTimeout(kill, o.ms || 4200);
    return t;
  }
  function flushBadges() {
    var list = badgeBatch; badgeBatch = []; badgeTimer = 0; if (!list.length) return;
    if (list.length > 2) toast({ kind: 'badge', art: Art.badge({ fam: 'level', tier: 'gold', glyph: 'trophy', title: 'Badges' }, { size: 44 }), title: list.length + ' new badges!', sub: 'Open the Trophy room to see them.', ms: 5200 });
    else list.forEach(function (d) { toast({ kind: 'badge', art: Art.badge(d, { size: 44 }), title: 'Badge: ' + d.title, sub: '+' + d.xp + ' XP' + (d.stars ? ' and ' + plural(d.stars, 'star') : ''), ms: 5200 }); });
  }

  /* ---------- store events -> what the player sees ---------- */
  var tracker = null, chipEl = null;
  Store.on('achievement', function (d) { badgeBatch.push(d); clearTimeout(badgeTimer); badgeTimer = setTimeout(flushBadges, 700); });
  Store.on('quest', function (d) { toast({ kind: 'quest', art: '<span class="pt-ico">' + ico(d.kind === 'game' ? 'medal' : 'check') + '</span>', title: 'Quest done: ' + d.title, sub: '+' + d.xp + ' XP' + (d.stars ? ' and ' + plural(d.stars, 'star') : '') }); });
  Store.on('quest-set', function (d) { toast({ kind: 'quest', art: '<span class="pt-ico gold">' + ico('trophy') + '</span>', title: 'All three quests done!', sub: 'Bonus: +' + d.xp + ' XP and ' + plural(d.stars, 'star') }); });
  Store.on('best', function (d) { toast({ kind: 'best', art: '<span class="pt-ico">' + ico('target') + '</span>', title: 'New best in ' + (byId[d.game] ? byId[d.game].title : 'this game') + '!', ms: 3000 }); });
  Store.on('rest', function () { toast({ kind: 'calm', art: Art.flame(true, 26), title: 'Rest day used', sub: 'Your streak is safe. One rest day per week.' }); });
  Store.on('streak-reset', function (d) { toast({ kind: 'calm', art: Art.flame(true, 26), title: 'A fresh streak starts today', sub: 'Your best is ' + plural(d.best, 'day') + '. Welcome back!', ms: 5200 }); });
  Store.on('xp', function (d) {
    if (/^(First time playing|New category)/.test(d.why)) toast({ kind: 'xp', art: '<span class="pt-ico">' + ico('spark') + '</span>', title: '+' + d.xp + ' XP', sub: d.why, ms: 3200 });
    else if (/^Streak: day/.test(d.why)) toast({ kind: 'xp', art: Art.flame(true, 26), title: '+' + d.xp + ' XP', sub: d.why.replace('Streak: day', 'Streak day'), ms: 3200 });
    if (chipEl) { chipEl.classList.remove('bump'); void chipEl.offsetWidth; chipEl.classList.add('bump'); }
  });
  Store.on('levelup', function (d) {
    if (tracker && tracker.busy()) toast({ kind: 'level', art: Art.levelBadge(d.level, 40), title: 'Level ' + d.level + '!', sub: d.unlocks.length ? 'New: ' + d.unlocks.map(function (u) { return u.name; }).join(', ') : 'Keep going!', ms: 5200 });
    else setTimeout(showLevelUp, 500);
  });
  Store.on('change', function () { paintChip(); refreshViews(); if (tracker) tracker.push(); });
  function freshen() { paintChip(); refreshViews(); if (!tracker) setTimeout(showLevelUp, 350); }
  window.addEventListener('storage', function (e) { if (e.key === Core.KEY) freshen(); });                // another tab earned something
  window.addEventListener('pageshow', function (e) { if (e.persisted) freshen(); });                       // coming back with the Back button (the page was kept as it was)
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden) freshen(); });

  /* ---------- the header chip ---------- */
  function paintChip() {
    chipEl = chipEl || $('#profile-btn'); if (!chipEl) return;
    var p = Store.get(), li = Core.levelInfo(p.xp), lit = streakLit(p);
    chipEl.innerHTML = '<span class="pc-av">' + Art.ring(li.pct, 46, 7) + '<span class="pc-face">' + av(38) + '</span></span><span class="pc-tx"><b>Lv ' + li.level + '</b><span class="pc-fl' + (lit ? ' lit' : '') + '">' + Art.flame(lit, 14) + '<span>' + p.streak.n + '</span></span></span>' +
      (p.pending.ach.length ? '<span class="pc-dot" aria-hidden="true"></span>' : '');
    chipEl.classList.add('ready');
    chipEl.setAttribute('aria-label', 'Your profile: ' + p.name + ', level ' + li.level + ', ' + plural(p.streak.n, 'day') + ' streak' + (p.pending.ach.length ? ', new badges' : ''));
  }

  /* ---------- daily quests card (home) ---------- */
  var live = [];   // views that redraw when the profile changes
  function refreshViews() { live = live.filter(function (v) { return v.el.isConnected; }); live.forEach(function (v) { try { v.draw(); } catch (e) {} }); if (sheet && sheet.open) drawSheet(); }
  function questUnit(q) { return /^(min|learn-5|cat-min)/.test(q.kind) ? ' min' : ''; }
  function questRow(q) {
    var pct = q.target ? q.prog / q.target : 0, done = !!q.done;
    return '<li class="qrow ' + (q.tier || 'game') + (done ? ' done' : '') + '"><span class="qico">' + (done ? ico('check') : ico(q.glyph || 'star')) + '</span>' +
      '<span class="qtx"><b>' + esc(q.title) + '</b><span class="qsub">' + (done ? 'Done! Nice one.' : esc(q.desc || '')) + '</span><span class="qbar">' + bar(done ? 1 : pct) + '<span class="qprog">' + (done ? '' : (Math.floor(q.prog) + '/' + q.target + questUnit(q))) + '</span></span></span>' +
      '<span class="qrw"><span class="qxp">+' + q.xp + ' XP</span>' + (q.stars ? starsHtml(q.stars) : '') + '</span></li>';
  }
  function homeCard() {
    var el = doc.createElement('section'); el.className = 'qcard'; el.setAttribute('aria-labelledby', 'qc-h');
    function draw() {
      var p = Store.get(), li = Core.levelInfo(p.xp), Q = Store.quests(), n = Q.list.filter(function (q) { return q.done; }).length, lit = streakLit(p), ach = Store.achievements(), got = ach.filter(function (a) { return a.done; }).length;
      var nr = nextReward(li.level);
      el.innerHTML =
        '<div class="qc-l"><button type="button" class="qc-me" data-open-profile aria-label="Open your profile"><span class="qc-av"><span class="qc-ring">' + Art.ring(li.pct, 76, 5) + '</span><span class="qc-face">' + av(64) + '</span></span>' +
        '<span class="qc-who"><span class="qc-name"><b>' + esc(p.name) + '</b><small>' + (p.flags.named ? esc(Store.title()) : 'Tap to pick your buddy') + '</small></span><span class="qc-lv">' + Art.levelBadge(li.level, 30) + '<span class="qc-xp">' + bar(li.pct, 'xp') + '<em>' + (li.max ? 'Max level' : fmt(li.into) + ' / ' + fmt(li.need) + ' XP') + '</em></span></span></span></button>' +
        '<div class="qc-stats"><span class="qc-st ' + (lit ? 'lit' : '') + '" title="Days in a row. One rest day a week is free.">' + Art.flame(lit, 18) + '<b>' + p.streak.n + '</b><small>' + (p.streak.n === 1 ? 'day' : 'days') + '</small></span><span class="qc-st">' + Art.star(18) + '<b>' + fmt(p.stars) + '</b><small>stars</small></span>' +
        '<a class="qc-st link" href="./?view=trophies">' + ico('trophy') + '<b>' + got + '</b><small>badges</small></a></div></div>' +
        '<div class="qc-q"><div class="qc-head"><h2 id="qc-h">Daily quests</h2><span class="qc-count" aria-label="' + n + ' of 3 done">' + [0, 1, 2].map(function (i) { return '<i class="' + (i < n ? 'on' : '') + '"></i>'; }).join('') + '</span></div>' +
        '<ul class="qlist">' + Q.list.map(questRow).join('') + Q.extra.map(function (g) { return questRow({ title: g.title, desc: byId[g.game] ? 'From ' + byId[g.game].title : 'From a game', prog: g.p, target: 1, done: g.done, xp: g.xp, stars: g.stars, glyph: 'medal', kind: 'game' }); }).join('') + '</ul>' +
        '<p class="qc-foot">' + (n === 3 ? 'All done for today! New quests tomorrow.' : n ? 'Nice! ' + (3 - n) + ' to go. Finish all three for +' + Q.setXp + ' XP and a star.' : 'Three new quests every day. No rush: they refresh tomorrow.') + (nr && !li.max ? '<span class="qc-next">Next reward: ' + esc(nr.name) + ' at level ' + nr.level + '</span>' : '') + '</p></div>';
    }
    draw(); live.push({ el: el, draw: draw });
    return el;
  }

  /* ---------- badges ---------- */
  function badgeTile(a) {
    var pct = a.need ? a.have / a.need : 0;
    return '<button type="button" class="pf-bd' + (a.done ? '' : ' locked') + '" data-badge="' + esc(a.id) + '" aria-label="' + esc(a.title) + (a.done ? ', earned' : ', locked, ' + Math.floor(a.have) + ' of ' + a.need) + '">' +
      (a.isNew ? '<span class="pf-new">NEW</span>' : '') + Art.badge(a, { size: 88 }) + '<b>' + esc(a.title) + '</b>' +
      (a.done ? '<small>' + tierWord(a.tier) + '</small>' : (a.need > 1 ? bar(pct) + '<small>' + Math.floor(a.have) + ' / ' + a.need + '</small>' : '<small>Locked</small>')) + '</button>';
  }
  var detail = null;
  function badgeDetail(id) {
    var a = Store.achievements().filter(function (x) { return x.id === id; })[0]; if (!a) return;
    if (!detail) { detail = doc.createElement('dialog'); detail.className = 'sheet pf-detail'; detail.setAttribute('aria-labelledby', 'bd-h'); doc.body.appendChild(detail); detail.addEventListener('click', function (e) { if (e.target === detail || e.target.closest('[data-close]')) detail.close(); }); }
    var r = XP.tier[a.tier] || XP.gameTier[a.tier] || [0, 0];
    detail.innerHTML = '<div class="bd-body"><button type="button" class="pf-x" data-close aria-label="Close">' + ico('x') + '</button><div class="bd-art">' + Art.badge(a, { size: 150 }) + '</div><h2 id="bd-h">' + esc(a.title) + '</h2><p class="bd-tier ' + a.tier + '">' + tierWord(a.tier) + ' badge' + (a.game && byId[a.game] ? ' from ' + esc(byId[a.game].title) : '') + '</p><p class="bd-desc">' + esc(a.desc || '') + '</p>' +
      (a.done ? '<p class="bd-when">' + ico('check') + ' Earned ' + new Date(a.ts).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) + '</p>' : (a.need > 1 ? '<div class="bd-prog">' + bar(a.have / a.need) + '<span>' + Math.floor(a.have) + ' of ' + a.need + '</span></div>' : '<p class="bd-when soft">' + ico('lock') + ' Not earned yet</p>')) +
      '<p class="bd-rw">Reward: <b>+' + r[0] + ' XP</b> ' + starsHtml(r[1]) + '</p></div>';
    if (!detail.open) detail.showModal();
  }
  function trophyRoom() {
    var el = doc.createElement('div'), filter = 'all';
    el.className = 'trophies';
    function draw() {
      var list = Store.achievements(), done = list.filter(function (a) { return a.done; }), p = Store.get();
      var fams = Object.keys(Core.FAMS).filter(function (f) { return list.some(function (a) { return a.fam === f; }); });
      var next = list.filter(function (a) { return !a.done && a.need > 1 && a.have > 0; }).sort(function (a, b) { return b.have / b.need - a.have / a.need; }).slice(0, 3);
      if (next.length < 3) list.filter(function (a) { return !a.done && a.have === 0 && a.need <= 5 && next.indexOf(a) < 0; }).slice(0, 3 - next.length).forEach(function (a) { next.push(a); });
      var shown = list.filter(function (a) { return filter === 'all' || a.fam === filter; });
      el.innerHTML =
        '<div class="phead trophy-head"><span class="big-ico">' + ico('trophy') + '</span><div class="t"><h1>Trophy room</h1><p>' + done.length + ' of ' + list.length + ' badges · ' + fmt(p.stars) + ' stars. Earned by playing: no timers, nothing to buy.</p></div>' +
        '<div class="side"><span class="th-ring">' + Art.ring(done.length / list.length, 64, 8) + '<b>' + Math.round(done.length / list.length * 100) + '%</b></span></div></div>' +
        (next.length ? '<section class="sec" aria-label="Next up"><div class="sechead"><h2>Next up</h2></div><div class="th-next">' + next.map(function (a) { return '<button type="button" class="pf-next" data-badge="' + esc(a.id) + '">' + Art.badge(a, { size: 52 }) + '<span><b>' + esc(a.title) + '</b><small>' + esc(a.desc) + '</small>' + (a.need > 1 ? bar(a.have / a.need) + '<em>' + Math.floor(a.have) + ' / ' + a.need + '</em>' : '') + '</span></button>'; }).join('') + '</div></section>' : '') +
        '<div class="th-filters" role="tablist" aria-label="Badge groups"><button type="button" role="tab" class="chip' + (filter === 'all' ? ' on' : '') + '" data-f="all" aria-selected="' + (filter === 'all') + '">All</button>' + fams.map(function (f) { return '<button type="button" role="tab" class="chip' + (filter === f ? ' on' : '') + '" data-f="' + f + '" aria-selected="' + (filter === f) + '">' + esc(Core.FAMS[f]) + '</button>'; }).join('') + '</div>' +
        '<div class="th-grid">' + shown.map(badgeTile).join('') + '</div>';
    }
    el.addEventListener('click', function (e) {
      var f = e.target.closest('[data-f]'); if (f) { filter = f.dataset.f; draw(); var c = $('.th-filters .on', el); if (c) c.scrollIntoView({ block: 'nearest', inline: 'center' }); return; }
      var b = e.target.closest('[data-badge]'); if (b) badgeDetail(b.dataset.badge);
    });
    draw(); live.push({ el: el, draw: draw });
    setTimeout(function () { if (el.isConnected) Store.markSeen(); }, 4500);   // the NEW ribbons stay for a moment, then rest
    return el;
  }

  /* ---------- the profile sheet ---------- */
  var sheet = null, tab = 'me', editing = false, styleTab = 'buddy';
  function calendar(p) {
    var t = today(), wd = (Core.weekday(t) + 6) % 7, start = Core.addDays(t, -wd - 28), cells = '', rest = {}, played = 0;
    p.streak.rest.forEach(function (d) { rest[d] = 1; });
    for (var i = 0; i < 35; i++) {
      var d = Core.addDays(start, i), fut = Core.dayNum(d) > Core.dayNum(t), mins = p.days[d] || 0, isRest = !!rest[d], pre = Core.dayNum(d) < Core.dayNum(p.born) && !mins;
      var cls = 'cd' + (fut ? ' fut' : '') + (mins > 0 ? ' on' : '') + (isRest ? ' rest' : '') + (d === t ? ' today' : '') + (pre ? ' pre' : '');
      var label = new Date(Core.dayNum(d) * 86400000).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) + (mins > 0 ? ': played ' + Math.max(1, Math.round(mins)) + ' min' : isRest ? ': rest day' : fut ? '' : ': no play');
      cells += '<span class="' + cls + '" role="img" aria-label="' + esc(label) + '">' + (mins > 0 ? Art.flame(true, 16) : isRest ? ico('moon') : '') + '</span>';
    }
    for (var j = 0; j < 7; j++) { var dd = Core.addDays(t, -j); if ((p.days[dd] || 0) > 0) played++; }
    return '<div class="cal" role="group" aria-label="Your last five weeks"><div class="cal-h" aria-hidden="true">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div><div class="cal-g">' + cells + '</div></div>' +
      '<p class="cal-note">Played on ' + played + ' of the last 7 days. ' + (p.streak.best > p.streak.n ? 'Best streak: ' + plural(p.streak.best, 'day') + '.' : 'A rest day never breaks your streak (one a week).') + '</p>';
  }
  function favGames(p) {
    var list = Object.keys(p.games).filter(function (k) { return byId[k] && p.games[k].sec > 0; }).sort(function (a, b) { return p.games[b].sec - p.games[a].sec; }).slice(0, 3);
    if (!list.length) return '<p class="pf-empty">Play a game and it shows up here.</p>';
    return '<ul class="fav3">' + list.map(function (k) { var g = byId[k], s = p.games[k]; return '<li><a href="play.html?g=' + encodeURIComponent(k) + '"><img src="' + esc(g.thumb) + '" alt="" width="96" height="60" loading="lazy"><span><b>' + esc(g.title) + '</b><small>' + dur(s.sec) + (s.best != null ? ' · ' + esc(g.label || 'best') + ' ' + fmt(s.best) : '') + '</small></span></a></li>'; }).join('') + '</ul>';
  }
  function hero(p, li) {
    return '<div class="ph-hero"><div class="ph-av">' + av(104) + '</div><div class="ph-id">' +
      (editing ? '<form class="ph-edit" data-form="name"><label class="sr" for="pf-name">Your nickname</label><input id="pf-name" maxlength="16" value="' + esc(p.name) + '" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done"><button type="button" class="pf-btn sm icon" data-act="dice" aria-label="Give me a random name">' + ico('dice') + '</button><button type="submit" class="pf-btn sm green">Save</button></form><p class="ph-hint" id="pf-name-msg">Use a nickname, not your real name.</p>'
        : '<div class="ph-name"><h2 id="pf-h">' + esc(p.name) + '</h2><button type="button" class="pf-btn sm icon" data-act="edit" aria-label="Change your name">' + ico('pencil') + '</button></div><p class="ph-title">' + esc(Store.title()) + '</p>') +
      '<div class="ph-lv">' + Art.levelBadge(li.level, 40) + '<div class="ph-xp">' + bar(li.pct, 'xp') + '<small>' + (li.max ? 'Max level' : fmt(li.into) + ' / ' + fmt(li.need) + ' XP') + ' · ' + esc(levelLine(li, p)) + '</small></div></div></div></div>';
  }
  function tilesMe(p) {
    var got = Store.achievements().filter(function (a) { return a.done; }).length, lit = streakLit(p);
    return '<div class="ph-tiles"><div class="pt ' + (lit ? 'lit' : '') + '">' + Art.flame(lit, 26) + '<b>' + p.streak.n + '</b><small>day streak</small></div><div class="pt">' + Art.star(26) + '<b>' + fmt(p.stars) + '</b><small>stars</small></div><a class="pt" href="./?view=trophies" data-close-sheet>' + ico('trophy') + '<b>' + got + '</b><small>badges</small></a><div class="pt">' + ico('clock') + '<b>' + Math.round(p.stats.sec / 60) + '</b><small>minutes played</small></div></div>';
  }
  function meTab(p) {
    var Q = Store.quests();
    return tilesMe(p) + '<h3>Daily quests</h3><ul class="qlist compact">' + Q.list.map(questRow).join('') + '</ul><h3>Your streak</h3>' + calendar(p) + '<h3>Favourite games</h3>' + favGames(p);
  }
  function lockNote(kind, id) { var h = Store.isUnlocked(kind, id) ? '' : Store.unlockText(kind, id); return h; }
  function pickBtn(kind, id, name, cur, inner, extra) {
    var lock = lockNote(kind, id), on = cur === id;
    return '<button type="button" class="pk' + (on ? ' on' : '') + (lock ? ' locked' : '') + '" data-pick="' + kind + ':' + id + '" aria-pressed="' + on + '" aria-label="' + esc(name) + (lock ? ', locked: ' + lock : '') + '">' + inner + (lock ? '<span class="pk-lock">' + ico('lock') + '</span>' : '') + '<span class="pk-n">' + esc(name) + '</span></button>';
  }
  function styleTab_(p) {
    var subs = [['buddy', 'Buddy'], ['hat', 'Hats'], ['frame', 'Frames'], ['title', 'Titles'], ['look', 'Colours']], S = readSettings(), h = '';
    h += '<div class="seg pk-tabs" role="tablist">' + subs.map(function (s) { return '<button type="button" role="tab" data-sub="' + s[0] + '" aria-selected="' + (styleTab === s[0]) + '"' + (styleTab === s[0] ? ' class="on"' : '') + '>' + s[1] + '</button>'; }).join('') + '</div>';
    if (styleTab === 'buddy') h += '<div class="pk-grid">' + Core.COSMETICS.avatar.map(function (d) { return pickBtn('avatar', d.id, d.name, p.avatar, '<span class="pk-art">' + Art.avatarBare(d.id) + '</span>'); }).join('') + '</div>';
    if (styleTab === 'hat') h += '<div class="pk-grid">' + pickBtn('hat', '', 'No hat', p.hat, '<span class="pk-art none">' + ico('x') + '</span>') + Core.COSMETICS.hat.map(function (d) { return pickBtn('hat', d.id, d.name, p.hat, '<span class="pk-art hat">' + Art.hatPreview(d.id) + '</span>'); }).join('') + '</div>';
    if (styleTab === 'frame') h += '<div class="pk-grid">' + Core.COSMETICS.frame.map(function (d) { return pickBtn('frame', d.id, d.name, p.frame, '<span class="pk-art">' + Art.framePreview(d.id) + '</span>'); }).join('') + '</div>';
    if (styleTab === 'title') h += '<div class="pk-list">' + Core.COSMETICS.title.map(function (d) { var lock = lockNote('title', d.id), on = p.title === d.id; return '<button type="button" class="pk-t' + (on ? ' on' : '') + (lock ? ' locked' : '') + '" data-pick="title:' + d.id + '" aria-pressed="' + on + '"><b>' + esc(d.id === 'auto' ? 'By level: ' + Core.levelTitle(Core.levelOf(p.xp)) : d.name) + '</b><small>' + (lock ? esc(lock) : on ? 'Wearing' : 'Tap to wear') + '</small>' + (lock ? ico('lock') : on ? ico('check') : '') + '</button>'; }).join('') + '</div>';
    if (styleTab === 'look') {
      h += '<h3>Arcade colour</h3><div class="pk-grid sw">' + Core.COSMETICS.accent.map(function (d) { return pickBtn('accent', d.id, d.name, S.accent, '<span class="pk-art dot" style="background:var(--' + d.id + ')"></span>'); }).join('') + '</div>' +
        '<h3>Arcade theme</h3><div class="pk-grid sw">' + Core.COSMETICS.theme.map(function (d) { return pickBtn('theme', d.id, d.name, S.theme, '<span class="pk-art theme t-' + d.id + '"></span>'); }).join('') + '</div>' +
        '<p class="pf-note">Colours and themes only change how the arcade looks. They never change how a game plays.</p>';
    }
    return h + '<p class="pf-note">' + Core.COSMETICS.hat.filter(function (d) { return d.unlock; }).length + ' hats, ' + (Core.COSMETICS.frame.length - 1) + ' frames, ' + (Core.COSMETICS.theme.length - 3) + ' themes and ' + (Core.COSMETICS.accent.length - 5) + ' colours unlock as you level up and earn badges.</p>';
  }
  function statsTab(p) {
    var li = Core.levelInfo(p.xp), tried = Object.keys(p.games).filter(function (k) { return p.games[k].first; }).length, cats = Object.keys(p.cats).length, ach = Store.achievements();
    var rows = [['Total XP', fmt(p.xp)], ['Time played', dur(p.stats.sec)], ['Days played', Object.keys(p.days).length], ['Games tried', tried + ' of ' + CATALOG.length], ['Categories tried', cats + ' of ' + CATS.length], ['Rounds finished', fmt(p.stats.runs)], ['Personal bests', fmt(p.stats.pbs)], ['Quests done', fmt(p.stats.quests)], ['Best streak', plural(Math.max(p.streak.best, p.streak.n), 'day')], ['Badges', ach.filter(function (a) { return a.done; }).length + ' of ' + ach.length], ['Playing since', new Date(Core.dayNum(p.born) * 86400000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })]];
    var ahead = ''; for (var l = li.level; l < Math.min(Core.MAX_LEVEL, li.level + 4); l++) ahead += '<li><span>Level ' + l + ' to ' + (l + 1) + '</span><b>' + fmt(Core.xpNeed(l)) + ' XP</b></li>';
    return '<dl class="pf-facts">' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>' +
      '<h3>Where your XP came from</h3>' + (p.log.length ? '<ul class="pf-log">' + p.log.slice(-8).reverse().map(function (e) { return '<li><span>' + esc(e.why) + '</span><b>+' + e.xp + '</b></li>'; }).join('') + '</ul>' : '<p class="pf-empty">Play a game to start earning.</p>') +
      '<h3>How XP works</h3><ul class="pf-how"><li>2 XP for each minute you play, for the first 15 minutes a day.</li><li>15 XP the first time you play a game, 20 for a new category.</li><li>About 8 to 26 XP for finishing a round, more for a new best.</li><li>Quests, badges and streak days add more. Codes and cheats earn nothing.</li></ul>' +
      (li.max ? '' : '<h3>Levels ahead</h3><ul class="pf-log">' + ahead + '</ul>');
  }
  function backupTab(p) {
    return '<p class="pf-lead">Your profile lives on this device only: no account, no email, nothing sent anywhere. To carry it to another device, save a code or a file, then paste or choose it there.</p>' +
      '<div class="bk-row"><button type="button" class="pf-btn blue" data-act="copy-code">' + ico('copy') + 'Copy my code</button><button type="button" class="pf-btn" data-act="save-file">' + ico('download') + 'Save a file</button></div>' +
      '<h3>Use a code or file from another device</h3><label class="sr" for="pf-code">Profile code</label><textarea id="pf-code" rows="3" placeholder="Paste a code that starts with CAP1-" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>' +
      '<div class="bk-row"><button type="button" class="pf-btn green" data-act="use-code">' + ico('upload') + 'Use this code</button><label class="pf-btn" for="pf-file">' + ico('upload') + 'Choose a file<input id="pf-file" type="file" accept="application/json,.json,.txt" hidden data-act="use-file"></label></div>' +
      '<p class="pf-msg" id="pf-bk-msg" role="status"></p><p class="pf-note">Using a code merges it with this device. You keep the best of both, and nothing is counted twice.</p>' +
      '<h3>Good to know</h3><ul class="pf-how"><li>Safari can clear a website\'s saved data after a week away. Add the arcade to your Home Screen, or keep a code somewhere safe.</li><li>Names are only shown on this device. Please use a nickname.</li></ul>' +
      '<div class="bk-row"><button type="button" class="pf-btn danger sm" data-act="reset">Start a new profile</button></div>';
  }
  function drawSheet() {
    if (!sheet) return;
    var p = Store.get(), li = Core.levelInfo(p.xp), body = tab === 'style' ? styleTab_(p) : tab === 'stats' ? statsTab(p) : tab === 'backup' ? backupTab(p) : meTab(p);
    var keep = { name: editing && $('#pf-name', sheet) ? $('#pf-name', sheet).value : null, code: $('#pf-code', sheet) ? $('#pf-code', sheet).value : '', msg: $('#pf-bk-msg', sheet) ? $('#pf-bk-msg', sheet).textContent : '' };
    var scroller = $('.pf-scroll', sheet), top = scroller ? scroller.scrollTop : 0;
    sheet.innerHTML = '<div class="pf-shell"><div class="pf-top"><span class="pf-grab" aria-hidden="true"></span><strong>My profile</strong><button type="button" class="pf-x" data-close aria-label="Close your profile">' + ico('x') + '</button></div><div class="pf-scroll">' + hero(p, li) +
      '<div class="pf-tabs" role="tablist" aria-label="Profile sections">' + [['me', 'Me', 'user'], ['style', 'Style', 'palette'], ['stats', 'Stats', 'star'], ['backup', 'Backup', 'download']].map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '"' + (tab === t[0] ? ' class="on"' : '') + '>' + ico(t[2]) + '<span>' + t[1] + '</span></button>'; }).join('') + '</div><div class="pf-body" role="tabpanel">' + body + '</div><p class="pf-priv">' + ico('shield') + ' Stays on this device. No account. No personal info.</p></div></div>';
    var n = $('#pf-name', sheet); if (n) { if (keep.name != null) n.value = keep.name; n.focus(); }
    var c = $('#pf-code', sheet); if (c) c.value = keep.code; var m = $('#pf-bk-msg', sheet); if (m) m.textContent = keep.msg;
    $('.pf-scroll', sheet).scrollTop = top;
  }
  function say(msg, bad) { var m = $('#pf-bk-msg', sheet); if (m) { m.textContent = msg; m.className = 'pf-msg' + (bad ? ' bad' : ' good'); } }
  function download(name, text, type) { var a = doc.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'application/json' })); a.download = name; doc.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); }
  function afterImport(r) {
    if (r.error) { say(r.error, true); return; }
    var p = Store.get(); drawSheet(); say('Welcome back, ' + p.name + '! You are level ' + Core.levelOf(p.xp) + '.', false); toast({ kind: 'calm', art: av(40), title: 'Profile loaded', sub: 'Level ' + Core.levelOf(p.xp) + ' · ' + plural(p.streak.n, 'day') + ' streak' });
  }
  function onSheet(e) {
    var t = e.target;
    if (t === sheet || t.closest('[data-close]')) { sheet.close(); return; }
    var tb = t.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; drawSheet(); return; }
    var sb = t.closest('[data-sub]'); if (sb) { styleTab = sb.dataset.sub; drawSheet(); return; }
    var link = t.closest('a[data-close-sheet]'); if (link) { sheet.close(); return; }
    var pk = t.closest('[data-pick]');
    if (pk) {
      var kv = pk.dataset.pick.split(':'), kind = kv[0], id = kv.slice(1).join(':');
      var lock = lockNote(kind, id); if (lock) { toast({ kind: 'calm', art: '<span class="pt-ico">' + ico('lock') + '</span>', title: 'Locked', sub: lock, ms: 2600 }); return; }
      if (kind === 'accent' || kind === 'theme') { if (window.ArcadePortal && window.ArcadePortal.setLook(kind, id)) Store.noteFlag('styled'); }
      else Store.equip(kind, id);
      drawSheet(); return;
    }
    var a = t.closest('[data-act]'); if (!a) return;
    switch (a.dataset.act) {
      case 'edit': editing = true; drawSheet(); break;
      case 'dice': { var n = $('#pf-name', sheet); if (n) n.value = Store.randomName(); break; }
      case 'copy-code': {
        var code = Store.exportCode(); Store.noteFlag('backup');
        (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(function () { say('Code copied! Paste it on the other device.', false); }, function () { var c = $('#pf-code', sheet); if (c) { c.value = code; c.select(); } say('Copy the code from the box below.', false); });
        break;
      }
      case 'save-file': download('calebs-arcade-profile-' + today() + '.json', JSON.stringify(Store.exportJSON(), null, 1)); Store.noteFlag('backup'); say('Saved a backup file.', false); break;
      case 'use-code': afterImport(Store.importProfile(($('#pf-code', sheet).value || '').trim())); break;
      case 'reset': if (window.confirm('Start a new profile? This device forgets your level, badges and streak. Save a code first if you want to keep them.')) { Store.reset(); editing = false; tab = 'me'; drawSheet(); toast({ kind: 'calm', title: 'New profile', sub: 'Pick a name and a buddy.' }); } break;
    }
  }
  function openProfile(which) {
    if (!sheet) {
      sheet = doc.createElement('dialog'); sheet.id = 'profile'; sheet.className = 'sheet psheet'; sheet.setAttribute('aria-label', 'Your profile'); doc.body.appendChild(sheet);
      sheet.addEventListener('click', onSheet);
      sheet.addEventListener('submit', function (e) {
        e.preventDefault(); var n = $('#pf-name', sheet), r = Store.setName(n ? n.value : '');
        if (r) { var m = $('#pf-name-msg', sheet); if (m) { m.textContent = r; m.classList.add('bad'); } return; }
        editing = false; drawSheet();
      });
      sheet.addEventListener('change', function (e) {
        var f = e.target; if (f.dataset && f.dataset.act === 'use-file' && f.files[0]) { var rd = new FileReader(); rd.onload = function () { afterImport(Store.importProfile(String(rd.result))); }; rd.readAsText(f.files[0]); f.value = ''; }
      });
      sheet.addEventListener('close', function () { editing = false; });
    }
    tab = which && ['me', 'style', 'stats', 'backup'].indexOf(which) >= 0 ? which : 'me'; editing = false; drawSheet();
    if (!sheet.open) sheet.showModal();
  }

  /* ---------- level-up celebration ---------- */
  var luDlg = null;
  function showLevelUp() {
    if (tracker && tracker.busy()) return;
    if (luDlg && luDlg.open) return;
    var ups = Store.takeLevelUps(); if (!ups.length) return;
    var top = Math.max.apply(null, ups), unlocks = [], seen = {};
    ups.forEach(function (l) { Store.unlocksAt(l).forEach(function (u) { if (!seen[u.kind + u.id]) { seen[u.kind + u.id] = 1; unlocks.push(u); } }); });
    var p = Store.get(), calm = reduce();
    if (!luDlg) { luDlg = doc.createElement('dialog'); luDlg.className = 'pf-lvlup'; luDlg.setAttribute('aria-labelledby', 'lu-h'); doc.body.appendChild(luDlg); }
    var conf = ''; if (!calm) for (var i = 0; i < 44; i++) conf += '<i style="--x:' + Math.round(Math.random() * 100) + '%;--d:' + (Math.random() * 1.6).toFixed(2) + 's;--s:' + (0.8 + Math.random() * 0.9).toFixed(2) + ';--r:' + Math.round(Math.random() * 360) + 'deg;--c:' + ['#ffc21a', '#ff5c8a', '#3ba6ff', '#3ed15f', '#8b5cf6', '#ff8a3d'][i % 6] + '"></i>';
    function pv(u) { return u.kind === 'hat' ? Art.hatPreview(u.id) : u.kind === 'frame' ? Art.framePreview(u.id) : u.kind === 'accent' ? '<span class="dotp" style="background:var(--' + u.id + ')"></span>' : u.kind === 'theme' ? '<span class="dotp theme t-' + u.id + '"></span>' : '<span class="tt">' + ico('star') + '</span>'; }
    var kindWord = { hat: 'Hat', frame: 'Frame', theme: 'Theme', accent: 'Colour', title: 'Title' };
    luDlg.innerHTML = '<div class="lu-rays" aria-hidden="true"></div><div class="lu-conf" aria-hidden="true">' + conf + '</div><div class="lu-card"><div class="lu-badge">' + Art.levelBadge(top, 132) + '</div><h2 id="lu-h">Level ' + top + '!</h2><p class="lu-sub">' + (ups.length > 1 ? 'Wow, ' + ups.length + ' levels at once! ' : '') + 'You are now a <b>' + esc(Store.title()) + '</b>.</p>' +
      (unlocks.length ? '<div class="lu-new"><h3>New to try</h3><ul>' + unlocks.slice(0, 6).map(function (u) { return '<li><span class="lu-pv">' + pv(u) + '</span><b>' + esc(u.name) + '</b><small>' + (kindWord[u.kind] || '') + '</small></li>'; }).join('') + '</ul></div>' : '<p class="lu-sub soft">' + (nextReward(top) ? 'Next reward: ' + esc(nextReward(top).name) + ' at level ' + nextReward(top).level + '.' : 'Keep collecting badges and stars.') + '</p>') +
      '<div class="lu-btns">' + (unlocks.some(function (u) { return u.kind !== 'title'; }) ? '<button type="button" class="pf-btn gold" data-a="try">Try it on</button>' : '') + '<button type="button" class="pf-btn green" data-a="close">Keep playing</button></div></div>';
    luDlg.onclick = function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      luDlg.close(); if (b.dataset.a === 'try') { var k = unlocks.filter(function (u) { return u.kind !== 'title'; })[0]; styleTab = k && (k.kind === 'hat' ? 'hat' : k.kind === 'frame' ? 'frame' : 'look') || 'buddy'; openProfile('style'); }
    };
    luDlg.onclose = function () { setTimeout(showLevelUp, 300); };
    luDlg.showModal();
    var card = $('.lu-card', luDlg); if (card) { card.tabIndex = -1; card.focus({ preventScroll: true }); }
  }

  /* ---------- watching a game frame ---------- */
  var BREAKS = [1800, 3600];
  function track(g, o) {
    var sess = Store.startSession(g.id), started = false, ready = false, beats = false, lastInput = 0, lastTick = 0, timer = 0, sid = '', lastPush = '';   // beats: this SDK sends input heartbeats (older copies of the SDK do not)
    function begin() { sess = Store.startSession(g.id); }
    function tick() {
      var n = Date.now(), dt = Math.min(8, (n - lastTick) / 1000); lastTick = n;
      var active = started && !doc.hidden && !(o.isPaused && o.isPaused()) && (!ready || !beats || n - lastInput < 45000);
      Store.tick(sess, dt, active); breakCheck();
    }
    function breakCheck() {
      var t = Store.get().today.sec, mark = jget('ca_break', { day: '', n: 0 }); if (mark.day !== today()) mark = { day: today(), n: 0 };
      if (mark.n < BREAKS.length && t >= BREAKS[mark.n]) {
        mark.n++; jset('ca_break', mark);
        toast({ kind: 'calm', art: '<span class="pt-ico">' + ico('sun') + '</span>', title: mark.n === 1 ? 'Great session! Time for a stretch?' : 'That was a long one. Rest your eyes?', sub: 'A drink of water and a stretch feel good. Your game will wait.', ms: 12000,
          actions: [{ label: "I'll take a break", cls: 'green', run: function () { Store.noteFlag('stretch'); if (o.pause) o.pause(); } }, { label: 'Keep playing', run: function () {} }] });
      }
    }
    var api = {
      start: function () { if (started) return; started = true; lastInput = lastTick = Date.now(); Store.startPlay(g.id); timer = setInterval(tick, 5000); },
      reset: function () { ready = false; beats = false; sid = ''; begin(); },
      busy: function () { return started && !doc.hidden; },
      howto: function () { Store.noteHowTo(g.id); },
      push: function () { if (!ready || !o.send) return; var s = JSON.stringify(Store.snapshot()); if (s !== lastPush) { lastPush = s; o.send('profile-state', { p: Store.snapshot() }); } },
      message: function (m) {
        if (!m || m.arcade !== 1) return;
        if (m.type === 'ready') { ready = true; beats = !!(m.caps && m.caps.profile); if (m.sid && m.sid !== sid) { if (sid) begin(); sid = m.sid; } lastInput = Date.now(); }
        else if (m.type === 'state') { if (m.cheated) sess.cheated = true; if (m.scene === 'over' || m.scene === 'play') tick(); if (typeof m.scene === 'string' || typeof m.level === 'number' || typeof m.stars === 'number') { var r = Store.onState(sess, m); if (r && r.xp) toast({ kind: 'xp', art: '<span class="pt-ico">' + ico('flag') + '</span>', title: 'Round finished  +' + r.xp + ' XP', sub: r.pb ? 'A new best!' : '', ms: 2600 }); } }
        else if (m.type === 'event') { if (m.name === 'cheat') sess.cheated = true; }
        else if (m.type === 'profile') {
          if (m.op === 'active') lastInput = Date.now();
          else if (m.op === 'saved') Store.onSaved(sess, { best: m.best, lower: m.lower });
          else if (m.op === 'award') Store.award(sess, { xp: m.xp, reason: m.reason });
          else if (m.op === 'achievement') Store.achievement(sess, m.id, m);
          else if (m.op === 'quest') Store.quest(sess, m.id, m.progress, m);
          else if (m.op === 'get' && o.send) o.send('profile-state', { p: Store.snapshot() });
        }
      },
      session: function () { return sess; }, stop: function () { clearInterval(timer); }
    };
    tracker = api;
    doc.addEventListener('visibilitychange', function () { if (doc.hidden && started) tick(); lastTick = Date.now(); });
    window.addEventListener('pagehide', function () { if (started) tick(); });
    return api;
  }

  /* ---------- pieces the portal calls ---------- */
  function readSettings() { var s = jget('ca_settings', {}); return { theme: s.theme || 'dark', accent: s.accent || 'lime' }; }
  function init() {
    paintChip();
    doc.addEventListener('click', function (e) { var b = e.target.closest('[data-open-profile]'); if (b) { e.preventDefault(); openProfile(b.dataset.openProfile || 'me'); } });
    // once: say hello, and thank a returning player for the games they already played
    var p = Store.get();
    if (!p.flags.welcomed) {
      Store.noteFlag('welcomed');
      setTimeout(function () {
        toast(p.flags.legacy && p.xp > 0 ? { kind: 'calm', art: av(40), title: 'Welcome back, ' + p.name + '!', sub: 'Your arcade now has a profile. The games you already played earned you a head start.', ms: 7000 }
          : { kind: 'calm', art: av(40), title: 'Hi ' + p.name + '!', sub: 'Play to earn XP, badges and hats. Tap your picture to change your buddy.', ms: 7000 });
      }, 900);
    }
    if (!tracker) setTimeout(showLevelUp, 600);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();

  window.ArcadeProfileUI = {
    store: Store, core: Core, art: Art, homeCard: homeCard, trophyRoom: trophyRoom, openProfile: openProfile, track: track, toast: toast, showLevelUp: showLevelUp,
    snapshot: function () { return Store.snapshot(); }, locked: function (kind, id) { return Store.isUnlocked(kind, id) ? '' : Store.unlockText(kind, id); },
    noteFav: function (count, added) { Store.noteFav(count, added); }, noteStyle: function () { Store.noteFlag('styled'); }, noteBackup: function () { Store.noteFlag('backup'); },
    pack: function () { return Store.pack(); }, importPack: function (o) { return Store.importProfile(JSON.stringify({ app: 'calebs-arcade-profile', v: 1, profile: o })); }, paintChip: paintChip,
    prefsRow: function () { var p = Store.get(), li = Core.levelInfo(p.xp); return '<button type="button" class="prefs-me" data-open-profile="me">' + av(44) + '<span><b>' + esc(p.name) + '</b><small>Level ' + li.level + ' · ' + esc(Store.title()) + ' · tap to open your profile</small></span></button>'; }
  };
})();

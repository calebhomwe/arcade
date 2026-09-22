/* Caleb's Arcade — portal logic. Reads CATALOG/CATS from catalog.js.
   Everything the visitor customises lives in localStorage under ca_*:
     ca_settings  theme / accent / size / motion / labels / sort / stage / extnew
     ca_favs      favourite ids          ca_plays  id -> {n, ts}
     ca_stage     per-game stage mode    <game>_rec the cabinets' own records (read only)
*/
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
const byId = Object.fromEntries(CATALOG.map(g => [g.id, g]));
const catName = id => (CATS.find(c => c.id === id) || {}).name || id;
const favs = () => new Set(store.get('ca_favs', []));
const plays = () => store.get('ca_plays', {});
const isFav = id => favs().has(id);
function toggleFav(id) { const f = favs(); f.has(id) ? f.delete(id) : f.add(id); store.set('ca_favs', [...f]); document.dispatchEvent(new CustomEvent('favchange', { detail: id })); return f.has(id); }
const notes = () => store.get('ca_notes', {});          // id -> {r, note, ts}
const RATE = { fun: '😍', ok: '🙂', broken: '😕' };
function setNote(id, patch) { const n = notes(); n[id] = Object.assign(n[id] || {}, patch, { ts: Date.now() }); if (!n[id].r && !n[id].note) delete n[id]; store.set('ca_notes', n); }
function testerReport() {
  const n = notes(), p = plays(); const ids = Object.keys(n).filter(id => byId[id]).sort((a, b) => (n[b].ts || 0) - (n[a].ts || 0));
  const line = id => { const e = n[id], g = byId[id]; return '- ' + g.title + ' [' + (g.from || '') + '] ' + (e.r ? RATE[e.r] + ' ' + e.r : '(no rating)') + ((p[id] || {}).n ? ', played ' + p[id].n + 'x' : '') + (e.note ? '\n    "' + e.note.replace(/\s+/g, ' ').trim() + '"' : ''); };
  const counts = ['fun', 'ok', 'broken'].map(r => ids.filter(id => n[id].r === r).length);
  return "Caleb's Arcade tester report — " + new Date().toLocaleString() + '\n' + ids.length + ' games rated: ' + counts[0] + ' fun, ' + counts[1] + ' ok, ' + counts[2] + ' broken. ' + Object.keys(p).length + ' games played in total.\n\n' + (ids.length ? ids.map(line).join('\n') : '(nothing rated yet — open a game and use "How was it?")') + '\n';
}
function recordPlay(id) { const p = plays(); const e = p[id] || { n: 0 }; e.n++; e.ts = Date.now(); p[id] = e; store.set('ca_plays', p); }
/* Bests: each local cabinet writes its own record to localStorage; we only read it. */
function bestOf(g) { if (!g.rec) return null; const r = store.get(g.rec, null); if (!r) return null; const v = typeof r === 'number' ? r : r.best; return (typeof v === 'number' && v > 0) ? v : null; }
const playHref = g => 'play.html?g=' + encodeURIComponent(g.id);
const randomGame = not => { const pool = CATALOG.filter(g => g.id !== not); return pool[Math.floor(Math.random() * pool.length)]; };

/* ---------- settings ---------- */
const DEF = { theme: 'dark', accent: 'amber', size: 'comfy', motion: 'auto', labels: true, sort: 'featured', stage: 'fit', extnew: false };
const OPTS = {
  theme: [['dark', 'Dark'], ['light', 'Light'], ['system', 'System']],
  accent: [['amber', 'Amber'], ['cyan', 'Cyan'], ['pink', 'Pink'], ['lime', 'Lime'], ['violet', 'Violet']],
  size: [['compact', 'Compact'], ['comfy', 'Comfortable'], ['large', 'Large']],
  motion: [['auto', 'Follow device'], ['on', 'On'], ['off', 'Off']],
  stage: [['fit', 'Fit'], ['wide', '16:9'], ['classic', '4:3'], ['tall', 'Tall'], ['fill', 'Fill']],
};
const S = Object.assign({}, DEF, store.get('ca_settings', {}));
for (const k of ['theme', 'accent', 'size', 'motion', 'stage']) if (!OPTS[k].some(([v]) => v === S[k])) S[k] = DEF[k];
function saveSettings() { store.set('ca_settings', S); applySettings(); document.dispatchEvent(new CustomEvent('settings')); }
function applySettings() {
  const h = document.documentElement;
  h.dataset.theme = S.theme; h.dataset.accent = S.accent; h.dataset.size = S.size; h.dataset.motion = S.motion; h.dataset.labels = S.labels ? '1' : '0';
  const light = S.theme === 'light' || (S.theme === 'system' && matchMedia('(prefers-color-scheme: light)').matches);
  const m = $('meta[name=theme-color]'); if (m) m.content = light ? '#f3f5fa' : '#0a0e18';
}
applySettings();
matchMedia('(prefers-color-scheme: light)').addEventListener('change', applySettings);
const reduce = () => S.motion === 'off' || (S.motion !== 'on' && matchMedia('(prefers-reduced-motion: reduce)').matches);
const scrollOpts = extra => Object.assign({ behavior: reduce() ? 'auto' : 'smooth' }, extra);

/* ---------- bits ---------- */
const heart = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.2-4.6-9.6-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.6 12c-2.4 4.4-9.6 9-9.6 9z"/></svg>';
const chev = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="' + (d < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7') + '"/></svg>';
const playIco = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
let toastT; function toast(msg) { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1600); }
function arrows(sec) {
  const r = $('.rail', sec), prev = $('.arrow.prev', sec), next = $('.arrow.next', sec);
  const paint = () => { prev.disabled = r.scrollLeft < 8; next.disabled = r.scrollLeft + r.clientWidth > r.scrollWidth - 8; };
  prev.addEventListener('click', () => r.scrollBy(scrollOpts({ left: -r.clientWidth * .9 })));
  next.addEventListener('click', () => r.scrollBy(scrollOpts({ left: r.clientWidth * .9 })));
  r.addEventListener('scroll', paint, { passive: true }); window.addEventListener('resize', paint); setTimeout(paint, 50);
}
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } }), { rootMargin: '300px' }) : null;
function load(img) { img.src = img.dataset.src; img.onload = () => img.classList.add('in'); img.onerror = () => { img.parentElement.style.background = 'linear-gradient(135deg,#1b2439,#0f1523)'; }; }
function lazy(img) { io ? io.observe(img) : load(img); }

/* ---------- card ---------- */
function card(g) {
  const a = document.createElement('a');
  a.className = 'card'; a.href = playHref(g); a.dataset.id = g.id; a.setAttribute('aria-label', 'Play ' + g.title);
  const best = bestOf(g);
  a.innerHTML =
    '<div class="art"><img alt="" data-src="' + g.thumb + '" width="480" height="300"><div class="play"><b>' + playIco + '</b></div></div>' +
    (g.new ? '<span class="badge">New</span>' : '') +
    ((notes()[g.id] || {}).r ? '<span class="rate" title="Your rating">' + RATE[notes()[g.id].r] + '</span>' : '') +
    '<button class="fav' + (isFav(g.id) ? ' on' : '') + '" type="button" aria-label="Favourite ' + esc(g.title) + '" aria-pressed="' + isFav(g.id) + '">' + heart + '</button>' +
    '<div class="body"><h3>' + esc(g.title) + '</h3><div class="meta"><span class="cat">' + esc(catName(g.cat)) + '</span>' +
    (g.from ? '<span class="from">' + esc(g.from) + '</span>' : '') +
    (g.players > 1 ? '<span>' + g.players + 'P</span>' : '') +
    (best != null ? '<span class="best" title="Your best on this machine">' + esc(g.label || 'best') + ' ' + best + '</span>' : '') + '</div></div>';
  lazy($('img', a));
  $('.fav', a).addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); const on = toggleFav(g.id); e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-pressed', on); toast(on ? 'Added to favourites' : 'Removed from favourites'); });
  return a;
}

/* ---------- settings sheet (both pages) ---------- */
function seg(key, opts, cur, swatch) {
  return '<div class="seg" role="radiogroup" data-key="' + key + '">' + opts.map(([v, n]) => '<button type="button" role="radio" data-v="' + v + '" aria-checked="' + (v === cur) + '" class="' + (v === cur ? 'on' : '') + '">' + (swatch ? '<i class="sw" style="background:var(--' + v + ')"></i>' : '') + n + '</button>').join('') + '</div>';
}
function sw(key, on, label, sub) {
  return '<div class="row"><div class="lbl">' + label + (sub ? '<small>' + sub + '</small>' : '') + '</div><button type="button" class="switch" role="switch" data-key="' + key + '" aria-checked="' + on + '" aria-label="' + label + '"></button></div>';
}
function exportData() {
  const data = { app: 'calebs-arcade', v: 1, at: new Date().toISOString(), settings: S, favs: [...favs()], plays: plays(), stage: store.get('ca_stage', {}), notes: notes(), report: testerReport(), records: {} };
  for (const g of CATALOG) if (g.rec) { const r = store.get(g.rec, null); if (r != null) data.records[g.rec] = r; }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'calebs-arcade-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Saved your arcade data');
}
function importData(file, done) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const d = JSON.parse(rd.result); if (!d || d.app !== 'calebs-arcade') throw 0;
      if (d.favs) store.set('ca_favs', [...new Set([...favs(), ...d.favs.filter(id => byId[id])])]);
      if (d.plays) { const p = plays(); for (const [id, e] of Object.entries(d.plays)) if (byId[id]) { const c = p[id] || { n: 0, ts: 0 }; p[id] = { n: Math.max(c.n, e.n | 0), ts: Math.max(c.ts, e.ts | 0) }; } store.set('ca_plays', p); }
      if (d.stage) store.set('ca_stage', Object.assign(store.get('ca_stage', {}), d.stage));
      if (d.notes) { const n = notes(); for (const [id, e] of Object.entries(d.notes)) if (byId[id] && (!n[id] || (e.ts || 0) > (n[id].ts || 0))) n[id] = e; store.set('ca_notes', n); }
      if (d.records) for (const g of CATALOG) if (g.rec && d.records[g.rec] != null) { const cur = store.get(g.rec, null), inc = d.records[g.rec]; const cv = typeof cur === 'number' ? cur : (cur && cur.best) || 0, iv = typeof inc === 'number' ? inc : (inc && inc.best) || 0; if (iv > cv) store.set(g.rec, inc); }
      if (d.settings) { Object.assign(S, DEF, d.settings); saveSettings(); }
      toast('Imported — favourites, history and bests merged'); done && done(true);
    } catch (e) { toast('That file is not an arcade backup'); done && done(false); }
  };
  rd.readAsText(file);
}
function openPrefs() {
  let d = $('#prefs');
  if (!d) {
    d = document.createElement('dialog'); d.id = 'prefs'; d.className = 'sheet'; d.setAttribute('aria-label', 'Settings'); document.body.appendChild(d);
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
  }
  const p = plays(), played = Object.keys(p).length, total = Object.values(p).reduce((a, e) => a + e.n, 0), rated = Object.keys(notes()).length;
  const onPlay = !!$('#play');
  d.innerHTML = '<form method="dialog"><header><h2>Settings</h2><button class="ico" type="submit" aria-label="Close">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header><div class="body">' +
    '<h3>Look</h3>' +
    '<div class="row"><div class="lbl">Theme</div>' + seg('theme', OPTS.theme, S.theme) + '</div>' +
    '<div class="row"><div class="lbl">Accent</div>' + seg('accent', OPTS.accent, S.accent, true) + '</div>' +
    '<div class="row"><div class="lbl">Card size</div>' + seg('size', OPTS.size, S.size) + '</div>' +
    '<div class="row"><div class="lbl">Motion<small>Hover lifts, fades and smooth scrolling</small></div>' + seg('motion', OPTS.motion, S.motion) + '</div>' +
    sw('labels', S.labels, 'Show where each game lives', 'The Cabinet / Pocket Arcade / Skywalker label on cards') +
    '<h3>Playing</h3>' +
    '<div class="row"><div class="lbl">Default stage<small>How big the game is on the play page. Each game remembers its own choice too.</small></div>' + seg('stage', OPTS.stage, S.stage) + '</div>' +
    sw('extnew', S.extnew, 'Open other-site games in a new tab', 'The 73 games hosted on Caleb\'s other sites get a launch button instead of loading inside the page') +
    '<h3>Your data</h3><small style="color:var(--ink-3)">Everything stays in this browser. Nothing is sent anywhere.</small>' +
    '<div class="stats"><div><b>' + played + '</b><span>games played</span></div><div><b>' + total + '</b><span>total plays</span></div><div><b>' + favs().size + '</b><span>favourites</span></div><div><b>' + rated + '</b><span>games rated</span></div></div>' +
    '<div class="btns"><button type="button" class="btn sm prime" data-act="report">Copy tester report</button><button type="button" class="btn sm" data-act="export">Export backup</button><label class="btn sm">Import backup<input type="file" accept="application/json,.json" hidden data-act="import"></label>' +
    '<button type="button" class="btn sm" data-act="clear-hist">Clear history</button><button type="button" class="btn sm" data-act="clear-favs">Clear favourites</button>' +
    '<button type="button" class="btn sm" data-act="install" hidden>Install app</button><button type="button" class="btn sm" data-act="reset">Reset settings</button></div>' +
    '<h3>Keyboard</h3><div class="keys">' +
    (onPlay ? '<kbd>F</kbd><span>Fullscreen</span><kbd>R</kbd><span>Restart the game</span><kbd>N</kbd><span>Next game like this one</span>' : '<kbd>/</kbd><span>Search</span><kbd>Esc</kbd><span>Clear the search</span>') +
    '<kbd>S</kbd><span>Surprise me: a random game</span><kbd>,</kbd><span>Open settings</span></div></div></form>';
  d.addEventListener('click', onSheetClick);
  d.addEventListener('change', e => { const i = e.target; if (i.dataset.act === 'import' && i.files[0]) importData(i.files[0], ok => { if (ok) { d.close(); location.reload(); } }); });
  if (installEvt) $('[data-act=install]', d).hidden = false;
  d.showModal();
}
function onSheetClick(e) {
  const d = e.currentTarget;
  const r = e.target.closest('.seg button[data-v]');
  if (r) { const k = r.parentElement.dataset.key; S[k] = r.dataset.v; saveSettings(); $$('button', r.parentElement).forEach(b => { const on = b === r; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); return; }
  const s = e.target.closest('.switch');
  if (s) { S[s.dataset.key] = !S[s.dataset.key]; saveSettings(); s.setAttribute('aria-checked', S[s.dataset.key]); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  switch (b.dataset.act) {
    case 'export': exportData(); break;
    case 'report': { const txt = testerReport(); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Report copied — paste it to Caleb'), () => { const blob = new Blob([txt], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'arcade-tester-report.txt'; a.click(); }); break; }
    case 'clear-hist': if (confirm('Forget which games you have played here?')) { store.del('ca_plays'); toast('History cleared'); d.close(); location.reload(); } break;
    case 'clear-favs': if (confirm('Remove all favourites?')) { store.del('ca_favs'); toast('Favourites cleared'); d.close(); location.reload(); } break;
    case 'reset': Object.assign(S, DEF); saveSettings(); d.close(); openPrefs(); toast('Settings reset'); break;
    case 'install': if (installEvt) { installEvt.prompt(); installEvt = null; b.hidden = true; } break;
  }
}
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; const b = $('#prefs [data-act=install]'); if (b) b.hidden = false; });
function topTools() {
  const t = $('.tools'); if (!t) return;
  $('#rnd', t).addEventListener('click', () => { location.href = playHref(randomGame(new URLSearchParams(location.search).get('g'))); });
  $('#prefs-btn', t).addEventListener('click', openPrefs);
  $$('[data-open-prefs]').forEach(b => b.addEventListener('click', openPrefs));
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    if ($('#prefs') && $('#prefs').open) return;
    if (e.key === 's' || e.key === 'S') { e.preventDefault(); $('#rnd').click(); }
    if (e.key === ',') { e.preventDefault(); openPrefs(); }
  });
}

/* ---------- home ---------- */
function home() {
  const root = $('#home'); if (!root) return;
  const feat = CATALOG.filter(g => g.featured).slice(0, 5);
  const hero = $('#hero');
  feat.forEach((g, i) => {
    const a = document.createElement('a'); a.className = 'feat' + (i === 0 ? ' big' : ''); a.href = playHref(g);
    a.innerHTML = '<img alt="" data-src="' + g.thumb + '"><div class="veil"></div><span class="tag' + (i === 0 ? ' hot' : '') + '">' + (i === 0 ? 'Featured' : esc(catName(g.cat))) + '</span>' +
      '<div class="txt"><div><h3>' + esc(g.title) + '</h3><p>' + esc(g.blurb) + '</p></div></div>';
    lazy($('img', a)); hero.appendChild(a);
  });
  const rails = $('#rails');
  function rail(title, items, sub, id) {
    if (!items.length) return null;
    const s = document.createElement('section'); s.className = 'sec'; if (id) s.id = id;
    s.innerHTML = '<div class="sechead"><h2>' + esc(title) + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</h2></div><div class="railwrap"><button class="arrow prev" type="button" aria-label="Scroll back">' + chev(-1) + '</button><div class="rail"></div><button class="arrow next" type="button" aria-label="Scroll forward">' + chev(1) + '</button></div>';
    const r = $('.rail', s); items.forEach(g => r.appendChild(card(g))); arrows(s); return s;
  }
  function personal() {
    $$('[data-personal]', rails).forEach(n => n.remove());
    const p = plays(); const recent = Object.entries(p).sort((a, b) => b[1].ts - a[1].ts).map(([id]) => byId[id]).filter(Boolean).slice(0, 12);
    const fv = [...favs()].map(id => byId[id]).filter(Boolean);
    const popular = Object.entries(p).sort((a, b) => b[1].n - a[1].n).map(([id]) => byId[id]).filter(Boolean).slice(0, 12);
    const first = rails.firstChild;
    for (const s of [rail('Your favourites', fv, fv.length + (fv.length === 1 ? ' game' : ' games'), 'favourites'), rail('Continue playing', recent, null, 'recent'), rail('Most played on this machine', popular)].reverse()) {
      if (s) { s.dataset.personal = '1'; rails.insertBefore(s, first); }
    }
  }
  personal(); document.addEventListener('favchange', personal);
  for (const c of CATS) {
    const items = CATALOG.filter(g => g.cat === c.id);
    const s = rail(c.name, items, items.length + ' games', 'cat-' + c.id);
    if (!s) continue;
    $('.sechead', s).insertAdjacentHTML('beforeend', '<a href="#all" data-cat="' + c.id + '">See all</a>');
    rails.appendChild(s);
  }
  // all games: chips + favourites-only + sort + search, mirrored into the URL so a filtered view can be shared
  const grid = $('#grid'), chips = $('#chips'), q = $('#q'), count = $('#count'), empty = $('#empty'), sortSel = $('#sort'), favOnly = $('#favonly');
  chips.innerHTML = '<button class="chip on" data-cat="all" type="button">All</button>' + CATS.map(c => '<button class="chip" data-cat="' + c.id + '" type="button">' + esc(c.name) + '</button>').join('');
  const params = new URLSearchParams(location.search);
  let cat = CATS.some(c => c.id === params.get('cat')) ? params.get('cat') : 'all';
  let onlyFav = params.get('fav') === '1';
  if (params.get('q')) q.value = params.get('q');
  const SORTS = { featured: 'Featured', az: 'A to Z', played: 'Most played', recent: 'Recently played', cat: 'Category' };
  sortSel.innerHTML = Object.entries(SORTS).map(([v, n]) => '<option value="' + v + '">' + n + '</option>').join('');
  sortSel.value = SORTS[params.get('sort')] ? params.get('sort') : (SORTS[S.sort] ? S.sort : 'featured');
  const order = CATALOG.map((g, i) => [g.id, i]); const idx = Object.fromEntries(order);
  const cards = CATALOG.map(g => { const c = card(g); grid.appendChild(c); return [g, c]; });
  function sorted() {
    const p = plays(), s = sortSel.value, catIdx = Object.fromEntries(CATS.map((c, i) => [c.id, i]));
    const key = {
      featured: g => [g.featured ? 0 : 1, idx[g.id]],
      az: g => [g.title.toLowerCase()],
      played: g => [-((p[g.id] || {}).n || 0), idx[g.id]],
      recent: g => [-((p[g.id] || {}).ts || 0), idx[g.id]],
      cat: g => [catIdx[g.cat], idx[g.id]],
    }[s] || (g => [idx[g.id]]);
    return cards.slice().sort((a, b) => { const x = key(a[0]), y = key(b[0]); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1; return 0; });
  }
  function apply(push) {
    const s = q.value.trim().toLowerCase(), f = favs(); let n = 0;
    const list = sorted(); for (const [, c] of list) grid.appendChild(c);
    for (const [g, c] of list) {
      const ok = (cat === 'all' || g.cat === cat) && (!onlyFav || f.has(g.id)) && (!s || (g.title + ' ' + g.blurb + ' ' + g.tags.join(' ') + ' ' + catName(g.cat) + ' ' + (g.from || '')).toLowerCase().includes(s));
      c.hidden = !ok; if (ok) n++;
    }
    count.textContent = n + ' of ' + CATALOG.length; empty.hidden = n > 0;
    $$('.chip[data-cat]', chips).forEach(b => b.classList.toggle('on', b.dataset.cat === cat));
    favOnly.classList.toggle('on', onlyFav); favOnly.setAttribute('aria-pressed', onlyFav);
    $$('.nav a, .cats a').forEach(a => a.classList.toggle('on', a.dataset.cat === cat));
    const u = new URLSearchParams(); if (cat !== 'all') u.set('cat', cat); if (s) u.set('q', q.value.trim()); if (onlyFav) u.set('fav', '1'); if (sortSel.value !== 'featured') u.set('sort', sortSel.value);
    const qs = u.toString(); history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + (push ? '#all' : location.hash));
  }
  const goAll = () => $('#all').scrollIntoView(scrollOpts({ block: 'start' }));
  chips.addEventListener('click', e => { const b = e.target.closest('.chip[data-cat]'); if (!b) return; cat = b.dataset.cat; apply(); });
  favOnly.addEventListener('click', () => { onlyFav = !onlyFav; apply(); });
  sortSel.addEventListener('change', () => { S.sort = sortSel.value; saveSettings(); apply(); });
  q.addEventListener('input', () => { apply(); if (q.value) goAll(); });
  q.addEventListener('keydown', e => { if (e.key === 'Escape') { q.value = ''; apply(); q.blur(); } });
  document.addEventListener('click', e => { const a = e.target.closest('[data-cat]'); if (!a || a.classList.contains('chip')) return; e.preventDefault(); cat = a.dataset.cat; apply(true); goAll(); });
  document.addEventListener('keydown', e => { if (e.key === '/' && document.activeElement !== q && !($('#prefs') && $('#prefs').open)) { e.preventDefault(); q.focus(); } });
  document.addEventListener('favchange', () => { if (onlyFav) apply(); });
  document.addEventListener('settings', () => { if (sortSel.value !== S.sort && SORTS[S.sort]) { sortSel.value = S.sort; apply(); } });
  apply();
  if (cat !== 'all' || q.value || onlyFav) setTimeout(goAll, 50);
  $('#n-games').textContent = CATALOG.length;
  document.addEventListener('favchange', e => { $$('.card[data-id="' + e.detail + '"] .fav').forEach(b => { const on = isFav(e.detail); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); });
}

/* ---------- play page ---------- */
function play() {
  const root = $('#play'); if (!root) return;
  const id = new URLSearchParams(location.search).get('g');
  if (id === 'random') { location.replace(playHref(randomGame())); return; }
  const g = byId[id];
  if (!g) { location.replace('index.html'); return; }
  document.title = g.title + ' — Caleb\'s Arcade';
  $('meta[name=description]').content = g.blurb;
  $('#title').textContent = g.title; $('#cat').textContent = catName(g.cat);
  $('#blurb').textContent = g.blurb;
  $('#tags').innerHTML = (g.from ? '<span>from <b>' + esc(g.from) + '</b></span>' : '') + g.tags.map(t => '<span>' + esc(t) + '</span>').join('') + (g.players > 1 ? '<span><b>' + g.players + '</b> players</span>' : '');
  if (g.note) $('#ext').insertAdjacentHTML('beforebegin', '<p class="tip">' + esc(g.note) + '</p>');
  const best = bestOf(g); if (best != null) $('#tags').insertAdjacentHTML('beforeend', '<span>your ' + esc(g.label || 'best') + ' <b>' + best + '</b></span>');
  const p = plays()[g.id]; if (p && p.n) $('#tags').insertAdjacentHTML('beforeend', '<span>played <b>' + p.n + '</b> time' + (p.n === 1 ? '' : 's') + '</span>');
  $('#ext').hidden = !g.ext;
  const frame = $('#frame'), stage = $('#stage'), loadEl = $('#load');
  let started = false;
  function start() {
    if (started) return; started = true;
    const l = $('.launch', stage); if (l) l.remove();
    frame.src = g.src; frame.title = g.title;
    frame.addEventListener('load', () => loadEl.classList.add('off'));
    setTimeout(() => loadEl.classList.add('off'), 6000);
    recordPlay(g.id);
  }
  // Other-site games can be gated behind a launch button (settings → "open in a new tab")
  if (g.ext && S.extnew) {
    loadEl.classList.add('off');
    stage.insertAdjacentHTML('beforeend', '<div class="launch"><img alt="" src="' + g.thumb + '"><div><p>' + esc(g.blurb) + '</p><a class="btn prime" href="' + esc(g.src) + '" target="_blank" rel="noopener">Launch in a new tab</a><button class="btn sm" type="button" data-inline>Play here instead</button></div></div>');
    $('.launch a', stage).addEventListener('click', () => recordPlay(g.id));
    $('[data-inline]', stage).addEventListener('click', () => { loadEl.classList.remove('off'); start(); });
  } else start();
  $('#open').href = g.src;
  // stage size: per-game memory, falling back to the settings default
  const modes = store.get('ca_stage', {});
  // per-game memory > the visitor's chosen default > the game's own preferred shape > Fit
  const startMode = modes[g.id] || (S.stage !== DEF.stage ? S.stage : (g.stage || S.stage));
  const modeSeg = $('#modes'); modeSeg.innerHTML = seg('mode', OPTS.stage, startMode); $('.seg', modeSeg).setAttribute('aria-label', 'Stage size');
  const setMode = m => { stage.dataset.mode = m; $$('#modes button').forEach(b => { const on = b.dataset.v === m; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); };
  setMode(startMode);
  modeSeg.addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (!b) return; setMode(b.dataset.v); const m = store.get('ca_stage', {}); m[g.id] = b.dataset.v; store.set('ca_stage', m); });
  document.addEventListener('settings', () => { if (!store.get('ca_stage', {})[g.id]) setMode(S.stage !== DEF.stage ? S.stage : (g.stage || S.stage)); });
  // fullscreen, with a theatre-mode fallback for browsers that have no fullscreen API (iPhone Safari)
  const fs = $('#fs'), exit = $('#exit');
  const canFs = !!(stage.requestFullscreen || stage.webkitRequestFullscreen);
  const theatre = on => { document.body.classList.toggle('theatre', on); if (!on) stage.scrollIntoView(scrollOpts({ block: 'center' })); };
  fs.addEventListener('click', () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    if (document.body.classList.contains('theatre')) { theatre(false); return; }
    if (canFs) { const r = (stage.requestFullscreen || stage.webkitRequestFullscreen).call(stage); if (r && r.catch) r.catch(() => theatre(true)); }
    else theatre(true);
  });
  exit.addEventListener('click', () => theatre(false));
  if (!canFs) { $('span', fs).textContent = 'Theatre'; }
  const favb = $('#favb'); const paint = () => { const on = isFav(g.id); favb.classList.toggle('on', on); favb.setAttribute('aria-pressed', on); $('span', favb).textContent = on ? 'Favourited' : 'Favourite'; };
  favb.addEventListener('click', () => { toggleFav(g.id); paint(); }); paint();
  $('#share').addEventListener('click', async () => { const url = location.origin + location.pathname + '?g=' + encodeURIComponent(g.id); try { if (navigator.share) await navigator.share({ title: g.title + ' — Caleb\'s Arcade', text: g.blurb, url }); else { await navigator.clipboard.writeText(url); toast('Link copied'); } } catch (e) {} });
  const restart = () => { if (!started) { loadEl.classList.remove('off'); start(); return; } loadEl.classList.remove('off'); frame.src = 'about:blank'; setTimeout(() => { frame.src = g.src; }, 30); };
  $('#reload').addEventListener('click', restart);
  // tester feedback
  const rate = $('#rate'), note = $('#note'), saved = $('#notesaved');
  const paintRate = () => { const r = (notes()[g.id] || {}).r; $$('button', rate).forEach(b => { const on = b.dataset.v === r; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); };
  note.value = (notes()[g.id] || {}).note || ''; paintRate();
  rate.addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (!b) return; const cur = (notes()[g.id] || {}).r; setNote(g.id, { r: cur === b.dataset.v ? '' : b.dataset.v }); paintRate(); saved.textContent = cur === b.dataset.v ? '' : 'Saved — ' + RATE[b.dataset.v] + ' ' + g.title; });
  let noteT; note.addEventListener('input', () => { clearTimeout(noteT); noteT = setTimeout(() => { setNote(g.id, { note: note.value.trim() }); saved.textContent = note.value.trim() ? 'Note saved' : ''; }, 400); });
  const rel = CATALOG.filter(x => x.id !== g.id).map(x => [x, (x.cat === g.cat ? 2 : 0) + x.tags.filter(t => g.tags.includes(t)).length]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([x]) => x);
  const r = $('#related'); rel.forEach(x => r.appendChild(card(x))); arrows($('#relsec'));
  if (!rel.length) $('#relsec').hidden = true;
  const next = $('#next'); if (rel.length) { next.href = playHref(rel[0]); next.title = 'Next: ' + rel[0].title; } else next.hidden = true;
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if ($('#prefs') && $('#prefs').open) return;
    if (e.key === 'f' || e.key === 'F') { e.preventDefault(); fs.click(); }
    if (e.key === 'r' || e.key === 'R') { e.preventDefault(); restart(); }
    if ((e.key === 'n' || e.key === 'N') && !next.hidden) { e.preventDefault(); location.href = next.href; }
    if (e.key === 'Escape' && document.body.classList.contains('theatre')) theatre(false);
  });
}

topTools(); home(); play();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();

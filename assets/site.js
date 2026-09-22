/* Caleb's Arcade — portal logic. Reads CATALOG/CATS from catalog.js. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const byId = Object.fromEntries(CATALOG.map(g => [g.id, g]));
const catName = id => (CATS.find(c => c.id === id) || {}).name || id;
const favs = () => new Set(store.get('ca_favs', []));
const plays = () => store.get('ca_plays', {});          // id -> {n, ts}
const isFav = id => favs().has(id);
function toggleFav(id) { const f = favs(); f.has(id) ? f.delete(id) : f.add(id); store.set('ca_favs', [...f]); document.dispatchEvent(new CustomEvent('favchange', { detail: id })); return f.has(id); }
function recordPlay(id) { const p = plays(); const e = p[id] || { n: 0 }; e.n++; e.ts = Date.now(); p[id] = e; store.set('ca_plays', p); }
/* Bests: each local cabinet writes its own record to localStorage; we only read it. */
function bestOf(g) { if (!g.rec) return null; const r = store.get(g.rec, null); if (!r) return null; const v = typeof r === 'number' ? r : r.best; return (typeof v === 'number' && v > 0) ? v : null; }
const playHref = g => 'play.html?g=' + encodeURIComponent(g.id);
const heart = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.2-4.6-9.6-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.6 12c-2.4 4.4-9.6 9-9.6 9z"/></svg>';
const chev = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="' + (d < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7') + '"/></svg>';
function arrows(sec) {
  const r = $('.rail', sec), prev = $('.arrow.prev', sec), next = $('.arrow.next', sec);
  const paint = () => { prev.disabled = r.scrollLeft < 8; next.disabled = r.scrollLeft + r.clientWidth > r.scrollWidth - 8; };
  prev.addEventListener('click', () => r.scrollBy({ left: -r.clientWidth * .9, behavior: 'smooth' }));
  next.addEventListener('click', () => r.scrollBy({ left: r.clientWidth * .9, behavior: 'smooth' }));
  r.addEventListener('scroll', paint, { passive: true }); window.addEventListener('resize', paint); setTimeout(paint, 50);
}
const playIco = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

/* ---------- lazy images ---------- */
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
    '<button class="fav' + (isFav(g.id) ? ' on' : '') + '" type="button" aria-label="Favourite ' + g.title + '" aria-pressed="' + isFav(g.id) + '">' + heart + '</button>' +
    '<div class="body"><h3>' + esc(g.title) + '</h3><div class="meta"><span class="cat">' + esc(catName(g.cat)) + '</span>' +
    (g.from ? '<span class="from">' + esc(g.from) + '</span>' : '') +
    (g.players > 1 ? '<span>' + g.players + 'P</span>' : '') +
    (best != null ? '<span class="best" title="Your best on this machine">' + esc(g.label || 'best') + ' ' + best + '</span>' : '') + '</div></div>';
  lazy($('img', a));
  $('.fav', a).addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); const on = toggleFav(g.id); e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-pressed', on); toast(on ? 'Added to favourites' : 'Removed from favourites'); });
  return a;
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
let toastT; function toast(msg) { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); } t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1600); }

/* ---------- home ---------- */
function home() {
  const root = $('#home'); if (!root) return;
  // hero: featured, top game biggest
  const feat = CATALOG.filter(g => g.featured).slice(0, 5);
  const hero = $('#hero');
  feat.forEach((g, i) => {
    const a = document.createElement('a'); a.className = 'feat' + (i === 0 ? ' big' : ''); a.href = playHref(g);
    a.innerHTML = '<img alt="" data-src="' + g.thumb + '"><div class="veil"></div><span class="tag' + (i === 0 ? ' hot' : '') + '">' + (i === 0 ? 'Featured' : esc(catName(g.cat))) + '</span>' +
      '<div class="txt"><div><h3>' + esc(g.title) + '</h3><p>' + esc(g.blurb) + '</p></div></div>';
    lazy($('img', a)); hero.appendChild(a);
  });
  // recently played + favourites rails (only if any)
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
  // category rails
  for (const c of CATS) {
    const items = CATALOG.filter(g => g.cat === c.id);
    const s = rail(c.name, items, items.length + ' games', 'cat-' + c.id);
    if (!s) continue;
    $('.sechead', s).insertAdjacentHTML('beforeend', '<a href="#all" data-cat="' + c.id + '">See all</a>');
    rails.appendChild(s);
  }
  // all games grid + filters + search
  const grid = $('#grid'), chips = $('#chips'), q = $('#q'), count = $('#count'), empty = $('#empty');
  chips.innerHTML = '<button class="chip on" data-cat="all">All</button>' + CATS.map(c => '<button class="chip" data-cat="' + c.id + '">' + esc(c.name) + '</button>').join('');
  let cat = 'all';
  const cards = CATALOG.map(g => { const c = card(g); grid.appendChild(c); return [g, c]; });
  function apply() {
    const s = q.value.trim().toLowerCase(); let n = 0;
    for (const [g, c] of cards) {
      const ok = (cat === 'all' || g.cat === cat) && (!s || (g.title + ' ' + g.blurb + ' ' + g.tags.join(' ') + ' ' + catName(g.cat)).toLowerCase().includes(s));
      c.hidden = !ok; if (ok) n++;
    }
    count.textContent = n + ' of ' + CATALOG.length; empty.hidden = n > 0;
    $$('.chip', chips).forEach(b => b.classList.toggle('on', b.dataset.cat === cat));
    $$('.nav a, .cats a').forEach(a => a.classList.toggle('on', a.dataset.cat === cat));
  }
  chips.addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; cat = b.dataset.cat; apply(); });
  q.addEventListener('input', () => { apply(); if (q.value) { $('#all').scrollIntoView({ block: 'start' }); } });
  document.addEventListener('click', e => { const a = e.target.closest('[data-cat]'); if (!a || a.classList.contains('chip')) return; e.preventDefault(); cat = a.dataset.cat; apply(); $('#all').scrollIntoView({ block: 'start' }); });
  document.addEventListener('keydown', e => { if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); q.focus(); } });
  apply();
  $('#n-games').textContent = CATALOG.length;
  document.addEventListener('favchange', e => { $$('.card[data-id="' + e.detail + '"] .fav').forEach(b => { const on = isFav(e.detail); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); });
}

/* ---------- play page ---------- */
function play() {
  const root = $('#play'); if (!root) return;
  const id = new URLSearchParams(location.search).get('g');
  const g = byId[id];
  if (!g) { location.replace('index.html'); return; }
  document.title = g.title + ' — Caleb\'s Arcade';
  $('meta[name=description]').content = g.blurb;
  $('#title').textContent = g.title; $('#cat').textContent = catName(g.cat);
  $('#blurb').textContent = g.blurb;
  $('#tags').innerHTML = (g.from ? '<span>from <b>' + esc(g.from) + '</b></span>' : '') + g.tags.map(t => '<span>' + esc(t) + '</span>').join('') + (g.players > 1 ? '<span><b>' + g.players + '</b> players</span>' : '');
  if (g.note) $('#ext').insertAdjacentHTML('beforebegin', '<p class="tip">' + esc(g.note) + '</p>');
  const best = bestOf(g); if (best != null) $('#tags').insertAdjacentHTML('beforeend', '<span>your ' + esc(g.label || 'best') + ' <b>' + best + '</b></span>');
  $('#ext').hidden = !g.ext;
  const frame = $('#frame'), stage = $('#stage'), loadEl = $('#load');
  frame.src = g.src; frame.title = g.title;
  frame.addEventListener('load', () => loadEl.classList.add('off'));
  setTimeout(() => loadEl.classList.add('off'), 6000);
  recordPlay(g.id);
  $('#open').href = g.src;
  const fs = $('#fs');
  fs.addEventListener('click', () => { const el = stage; if (document.fullscreenElement) document.exitFullscreen(); else (el.requestFullscreen || el.webkitRequestFullscreen).call(el).catch(() => frame.contentWindow && frame.contentWindow.focus()); });
  if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) fs.hidden = true;
  const favb = $('#favb'); const paint = () => { const on = isFav(g.id); favb.classList.toggle('on', on); favb.setAttribute('aria-pressed', on); $('span', favb).textContent = on ? 'Favourited' : 'Favourite'; };
  favb.addEventListener('click', () => { toggleFav(g.id); paint(); }); paint();
  $('#share').addEventListener('click', async () => { const url = location.href; try { if (navigator.share) await navigator.share({ title: g.title, url }); else { await navigator.clipboard.writeText(url); toast('Link copied'); } } catch (e) {} });
  $('#reload').addEventListener('click', () => { loadEl.classList.remove('off'); frame.src = g.src; });
  // related: same category, then same tags
  const rel = CATALOG.filter(x => x.id !== g.id).map(x => [x, (x.cat === g.cat ? 2 : 0) + x.tags.filter(t => g.tags.includes(t)).length]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([x]) => x);
  const r = $('#related'); rel.forEach(x => r.appendChild(card(x))); arrows($('#relsec'));
  if (!rel.length) $('#relsec').hidden = true;
  document.addEventListener('keydown', e => { if (e.key === 'f' && !e.metaKey && !e.ctrlKey && document.activeElement === document.body) fs.click(); });
}

home(); play();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();

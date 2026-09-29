// The interface shell: HUD, toasts, bottom sheets, dialogs, the crop dock and the title screen frame.
// Panel contents live in panels.js; game.js decides what the buttons do.
import { icon } from './icons.js';
import { fmt, el, clamp } from '../util.js';
import { xpNeed, MAX_LEVEL } from '../data.js';

const SVG = {
  rotL: '<svg viewBox="0 0 24 24" fill="none" stroke="#5f3c1c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a8 8 0 1 1 2.2 6.6"/><path d="M4 4v6h6"/></svg>',
  rotR: '<svg viewBox="0 0 24 24" fill="none" stroke="#5f3c1c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10a8 8 0 1 0-2.2 6.6"/><path d="M20 4v6h-6"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="#5f3c1c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15l7-7 7 7"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="#5f3c1c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l7 7 7-7"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="#5f3c1c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M6 10v10h12V10"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="#5f3c1c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
  zoomIn: '<svg viewBox="0 0 24 24" fill="none" stroke="#5f3c1c" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  zoomOut: '<svg viewBox="0 0 24 24" fill="none" stroke="#5f3c1c" stroke-width="3" stroke-linecap="round"><path d="M5 12h14"/></svg>',
};
export { SVG };

export class UI {
  constructor(game) {
    this.game = game; this.farm = game.farm; this.sheetState = null; this.dlgState = null; this.toastList = [];
    this.root = document.getElementById('ui');
    this.icon = icon;
    this.build();
  }

  build() {
    const r = this.root; r.innerHTML = '';
    this.labelsRoot = el('div', 'labels'); this.labelsRoot.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    this.floatRoot = el('div', 'floats'); this.floatRoot.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    this.hud = el('div', 'hud'); this.hud.hidden = true;
    this.hud.innerHTML = `
      <div class="top">
        <div class="lvl" id="lvlbox" role="img" aria-label="Level"><div class="badge" id="lvlnum">1</div><div class="xpbar"><i id="xpfill"></i><span id="xptext">0/30</span></div></div>
        <div class="spacer"></div>
        <button class="pill" id="coinpill" data-act="market" aria-label="Coins. Open the market">${icon('coin', 30)}<b id="coinnum">0</b><span class="plus">+</span></button>
        <button class="pill" id="starpill" data-act="stars" aria-label="Stars">${icon('star', 30)}<b id="starnum">0</b></button>
        <button class="hudbtn gear" data-act="settings" aria-label="Settings">${SVG.gear}</button>
      </div>
      <div class="codes-tag" id="codestag">Codes on</div>
      <div class="rail" id="rail">
        <button class="hudbtn" data-act="goals" aria-label="Goals and story">${icon('tasks', 36)}<em class="lbl">Goals</em><span class="dot" id="dotGoals" hidden></span></button>
        <button class="hudbtn" data-act="orders" aria-label="Orders">${icon('orders', 36)}<em class="lbl">Orders</em><span class="dot" id="dotOrders" hidden></span></button>
        <button class="hudbtn" data-act="shop" aria-label="Build and buy">${icon('hammer', 36)}<em class="lbl">Build</em><span class="dot" id="dotShop" hidden></span></button>
        <button class="hudbtn" data-act="barn" aria-label="Barn">${icon('barn', 36)}<em class="lbl">Barn</em><span class="dot" id="dotBarn" hidden></span></button>
        <button class="hudbtn" data-act="daily" aria-label="Daily gift and tasks">${icon('gift', 36)}<em class="lbl">Daily</em><span class="dot" id="dotDaily" hidden></span></button>
        <button class="hudbtn" data-act="more" aria-label="Album, awards and wardrobe">${icon('album', 36)}<em class="lbl">More</em><span class="dot" id="dotMore" hidden></span></button>
      </div>
      <div class="camctl" id="camctl">
        <button class="hudbtn" data-act="camHome" aria-label="Back to the farm">${SVG.home}</button>
        <button class="hudbtn" data-act="camRotL" aria-label="Rotate left">${SVG.rotL}</button>
        <button class="hudbtn" data-act="camRotR" aria-label="Rotate right">${SVG.rotR}</button>
        <button class="hudbtn" data-act="camTiltUp" aria-label="Tilt up">${SVG.up}</button>
        <button class="hudbtn" data-act="camTiltDown" aria-label="Tilt down">${SVG.down}</button>
      </div>
      <button class="goal" id="goalbar" data-act="goals" aria-label="Current goal"><div class="face" id="goalface"></div><div class="txt"><div class="small" id="goalsmall">Goal</div><div class="big" id="goaltext">Harvest 6 crops</div><div class="bar"><i id="goalfill"></i></div></div><span class="claim" data-act="claimChapter">Claim!</span></button>
      <div class="brush" id="brush"><span id="brushtxt"></span><button class="done" data-act="brushDone">Done</button></div>
      <div class="ghostbar" id="ghostbar"><button class="btn grey" data-act="ghostRot" aria-label="Turn">${SVG.rotR}</button><button class="btn" data-act="ghostOk">Place</button><button class="btn red" data-act="ghostNo">Cancel</button></div>
      <div class="reticle" id="reticle"></div>
      <div class="tip" id="tiptxt"></div>`;
    this.toasts = el('div', 'toasts'); this.toasts.setAttribute('aria-live', 'polite');
    this.veil = el('div', 'veil'); this.veil.hidden = true;
    this.sheet = el('div', 'sheet'); this.sheet.setAttribute('role', 'dialog'); this.sheet.setAttribute('aria-modal', 'true'); this.sheet.hidden = true;
    this.dlgRoot = el('div', 'dlgroot');
    this.dock = el('div', 'dock');
    this.title = el('div', 'title');
    this.pointer = el('div', 'pointer'); this.pointer.innerHTML = '<i></i>';
    this.dark = el('div', 'overlay-dark');
    this.confetti = el('div', 'confetti');
    r.append(this.dark, this.labelsRoot, this.floatRoot, this.hud, this.dock, this.toasts, this.veil, this.sheet, this.dlgRoot, this.confetti, this.pointer, this.title);
    // one delegated click handler for everything with data-act
    r.addEventListener('click', (e) => {
      const t = e.target.closest ? e.target.closest('[data-act]') : null;
      if (t && r.contains(t)) { e.stopPropagation(); this.game.act(t.dataset.act, t.dataset, t, e); }
    });
    r.addEventListener('pointerdown', (e) => { if (e.target.closest && e.target.closest('button,.sheet,.dlg,.dock')) e.stopPropagation(); }, true);
    this.veil.addEventListener('click', () => this.closeSheet());
    addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (this.dlgState) this.closeDialog(); else if (this.sheetState) this.closeSheet(); } });
    this.refs = {};
    for (const id of ['lvlnum', 'xpfill', 'xptext', 'coinnum', 'starnum', 'coinpill', 'starpill', 'goalbar', 'goalface', 'goalsmall', 'goaltext', 'goalfill', 'brush', 'brushtxt', 'ghostbar', 'reticle', 'tiptxt', 'codestag', 'dotGoals', 'dotOrders', 'dotShop', 'dotBarn', 'dotDaily', 'dotMore']) this.refs[id] = r.querySelector('#' + id);
  }

  show(on) { this.hud.hidden = !on; }

  // ---- HUD ----------------------------------------------------------------------------------------
  updateHud() {
    const S = this.farm.S, R = this.refs;
    if (!S) return;
    R.lvlnum.textContent = S.level;
    const need = xpNeed(S.level);
    R.xpfill.style.width = (S.level >= MAX_LEVEL ? 100 : clamp(S.xp / need * 100, 0, 100)) + '%';
    R.xptext.textContent = S.level >= MAX_LEVEL ? 'MAX' : `${S.xp}/${need}`;
    this.setNum('coinnum', S.coins, R.coinpill); this.setNum('starnum', S.stars, R.starpill);
    R.codestag.classList.toggle('on', !!this.farm.cheated);
  }
  setNum(id, v, pill) {
    const e = this.refs[id]; const prev = +e.dataset.v || 0;
    if (prev === v) return;
    e.dataset.v = v; e.textContent = fmt(v);
    if (v > prev && pill) { pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }
  }
  dot(id, n) { const d = this.refs[id]; if (!d) return; d.hidden = !n; d.textContent = n > 9 ? '9+' : String(n || ''); }
  goal(info) {
    const R = this.refs;
    if (!info) { R.goalbar.hidden = true; return; }
    R.goalbar.hidden = false; R.goalbar.classList.toggle('ready', !!info.ready);
    R.goalsmall.textContent = info.small; R.goaltext.textContent = info.text; R.goalfill.style.width = clamp(info.frac * 100, 0, 100) + '%';
    if (info.face && R.goalface.dataset.f !== info.face) { R.goalface.dataset.f = info.face; R.goalface.style.backgroundImage = `url(${info.face})`; }
  }
  toast(text, kind = '', ms = 2600) {
    if (this.toastList.length >= 3) { const old = this.toastList.shift(); old.remove(); }
    const t = el('div', 'toast ' + kind, text); this.toasts.appendChild(t); this.toastList.push(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => { t.remove(); this.toastList = this.toastList.filter((x) => x !== t); }, 400); }, ms);
  }
  tip(text) { const t = this.refs.tiptxt; if (!text) { t.classList.remove('on'); return; } t.textContent = text; t.classList.add('on'); }
  brush(text) { const b = this.refs.brush; b.classList.toggle('on', !!text); if (text) this.refs.brushtxt.innerHTML = text; }
  ghost(on) { this.refs.ghostbar.classList.toggle('on', !!on); this.refs.reticle.classList.toggle('on', !!on); this.refs.reticle.classList.remove('bad'); }
  reticleBad(bad) { this.refs.reticle.classList.toggle('bad', !!bad); }
  setCamVisible(on) { const c = this.hud.querySelector('#camctl'); if (c) c.style.display = on ? '' : 'none'; }

  // ---- sheets -------------------------------------------------------------------------------------------
  // def: { id, title, icon, tabs:[{id,label,dot}], tab, render(tab) -> html, foot(tab) -> html, live: bool, tall, onClose }
  openSheet(def) {
    if (this.dlgState) this.closeDialog();
    this.closeSheet(true);
    this.sheetState = Object.assign({ tab: def.tabs && def.tabs[0] ? def.tabs[0].id : null }, def);
    this.veil.hidden = false; this.sheet.hidden = false;
    this.paintSheet(true);
    requestAnimationFrame(() => { this.veil.classList.add('on'); this.sheet.classList.add('on'); });
    this.game.sheetOpened && this.game.sheetOpened(def.id);
    const first = this.sheet.querySelector('.x'); if (first) first.focus({ preventScroll: true });
    return this.sheetState;
  }
  paintSheet(first) {
    const s = this.sheetState; if (!s) return;
    const body = this.sheet.querySelector('.body'), sc = body ? body.scrollTop : 0, tabsEl = this.sheet.querySelector('.tabs'), tsc = tabsEl ? tabsEl.scrollLeft : 0;
    const tabs = s.tabs ? `<div class="tabs" role="tablist">${s.tabs.map((t) => `<button class="${t.id === s.tab ? 'on' : ''}" role="tab" aria-selected="${t.id === s.tab}" data-act="tab" data-id="${t.id}">${t.label}${t.dot ? `<span class="dot">${t.dot}</span>` : ''}</button>`).join('')}</div>` : '';
    const foot = s.foot ? s.foot(s.tab) : '';
    this.sheet.className = 'sheet' + (s.tall ? ' tall' : '') + (this.sheet.classList.contains('on') ? ' on' : '');
    this.sheet.innerHTML = `<div class="head">${s.icon ? icon(s.icon, 38) : ''}<h2>${s.title}</h2><button class="x" data-act="closeSheet" aria-label="Close">&times;</button></div>${tabs}<div class="body">${s.render(s.tab)}</div>${foot ? `<div class="foot">${foot}</div>` : ''}`;
    if (!first) { const nb = this.sheet.querySelector('.body'); if (nb) nb.scrollTop = sc; const nt = this.sheet.querySelector('.tabs'); if (nt) nt.scrollLeft = tsc; }
  }
  setTab(id) { if (this.sheetState) { this.sheetState.tab = id; this.paintSheet(true); } }
  refreshSheet() { if (this.sheetState) this.paintSheet(false); }
  closeSheet(silent) {
    const s = this.sheetState; if (!s) return;
    this.sheetState = null; this.veil.classList.remove('on'); this.sheet.classList.remove('on');
    const done = () => { if (!this.sheetState) { this.sheet.hidden = true; this.veil.hidden = true; this.sheet.innerHTML = ''; } };
    if (silent) done(); else setTimeout(done, 340);
    if (s.onClose) s.onClose();
    this.game.sheetClosed && this.game.sheetClosed(s.id);
  }
  sheetOpen(id) { return this.sheetState && (!id || this.sheetState.id === id); }

  // ---- dialogs ---------------------------------------------------------------------------------------------
  dialog(html, opts = {}) {
    this.closeDialog(true);
    this.dlgState = opts;
    this.dlgRoot.innerHTML = `<div class="dlg" role="dialog" aria-modal="true">${opts.close ? '<button class="close" data-act="closeDialog" aria-label="Close">&times;</button>' : ''}${html}</div>`;
    this.dlgRoot.classList.add('on'); this.veil.hidden = false; requestAnimationFrame(() => this.veil.classList.add('on'));
    this.dlgRoot.style.pointerEvents = 'auto';
    const f = this.dlgRoot.querySelector('button.btn,button'); if (f) f.focus({ preventScroll: true });
    return this.dlgRoot.firstChild;
  }
  closeDialog(silent) {
    if (!this.dlgState) return;
    const s = this.dlgState; this.dlgState = null;
    this.dlgRoot.classList.remove('on'); this.dlgRoot.innerHTML = ''; this.dlgRoot.style.pointerEvents = 'none';
    if (!this.sheetState) { this.veil.classList.remove('on'); setTimeout(() => { if (!this.sheetState && !this.dlgState) this.veil.hidden = true; }, 260); }
    if (s.onClose && !silent) s.onClose();
    this.game.dialogClosed && this.game.dialogClosed();
  }
  get busy() { return !!(this.sheetState || this.dlgState); }

  // ---- docks -----------------------------------------------------------------------------------------------------
  seedDock(html) { this.dock.innerHTML = html; this.dock.classList.add('on'); }
  hideDock() { this.dock.classList.remove('on'); this.dock.innerHTML = ''; }

  confettiBurst(n = 90) {
    const cols = ['#ffc93c', '#ff6b6b', '#57b6ee', '#5cc04a', '#c48bff', '#ff9b2f'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i'); p.style.left = Math.random() * 100 + '%'; p.style.background = cols[i % cols.length];
      p.style.animationDuration = 2.2 + Math.random() * 2.2 + 's'; p.style.animationDelay = Math.random() * 0.6 + 's'; p.style.width = 6 + Math.random() * 8 + 'px';
      this.confetti.appendChild(p); setTimeout(() => p.remove(), 5500);
    }
  }
  // fly an icon from one screen point to another (rewards travelling to the HUD)
  fly(html, from, to, ms = 700, done) {
    const e = el('div', 'fly', html); document.body.appendChild(e);
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms), ease = k * k * (3 - 2 * k);
      const x = from[0] + (to[0] - from[0]) * ease, y = from[1] + (to[1] - from[1]) * ease - Math.sin(k * Math.PI) * 60;
      e.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${1 - 0.25 * k})`;
      if (k < 1) requestAnimationFrame(step); else { e.remove(); done && done(); }
    };
    requestAnimationFrame(step);
  }
  hudPoint(which) { const b = (which === 'stars' ? this.refs.starpill : which === 'xp' ? this.refs.lvlnum : this.refs.coinpill).getBoundingClientRect(); return [b.left + 24, b.top + b.height / 2]; }
}

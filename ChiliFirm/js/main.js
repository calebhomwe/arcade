/* ============================================================
   Chili Firm 2 — Boot & main loop
   ============================================================ */
(function () {
  'use strict';

  const CF = window.CF;
  let lastTick = 0;
  let lastRender = 0;
  let saveTimer = 0;

  // diagnostic trap: surfaces boot errors in headless DOM dumps
  window.addEventListener('error', e => {
    try { document.documentElement.setAttribute('data-err', String(e.message || 'unknown').slice(0, 300)); } catch (_) {}
  });

  async function boot() {
    const now = Date.now() / 1000;
    let state = CF.stateMod.loadState(localStorage, now);
    let isNew = false;
    if (!state) { state = CF.stateMod.createState(now); isNew = true; }
    // optional: boot straight into a shared save (?import=<base64>)
    const q0 = new URLSearchParams(window.location.search);
    const imp = q0.get('import');
    if (imp) {
      // URL query decoding turns '+' into spaces; restore them for base64
      const ns = CF.stateMod.importState(imp.replace(/ /g, '+'), now);
      if (ns) { state = ns; isNew = false; }
    }
    // optional: boot into the lived-in demo save (?demo=1)
    if (q0.get('demo') === '1') {
      try {
        const raw = await fetch('tools/demo-save.txt');
        const ns = CF.stateMod.importState((await raw.text()).trim(), now);
        if (ns) { state = ns; isNew = false; CF.stateMod.saveState(ns, localStorage); }
      } catch (e) { /* demo file absent — play fresh */ }
    }
    CF.state = state;

    // offline earnings
    if (!isNew) {
      const elapsed = now - (state.last || now);
      if (elapsed > 30) {
        const gained = CF.logic.processOffline(state, elapsed, now);
        if (gained > 0) CF.ui.toast('⏰ While you were away: +' + CF.logic.fmt(gained), 'gold');
      }
    }

    CF.save = () => { try { CF.stateMod.saveState(CF.state, localStorage); } catch (e) {} };

    CF.ui.init();
    CF.ui.render(state);
    const q = new URLSearchParams(window.location.search);
    if (isNew && q.get('skip-tut') !== '1') CF.ui.showTutorial();
    const v = q.get('view');
    if (v && ['farm', 'market', 'workers', 'lab', 'biz', 'stats'].indexOf(v) !== -1) CF.ui.setView(v);

    lastTick = now;
    document.documentElement.setAttribute('data-boot', state.day + '|' + Math.round(state.money) + '|' + state.missionIdx);
    loop();
  }

  function loop() {
    const now = Date.now() / 1000;
    let dt = Math.min(5, Math.max(0, now - lastTick));
    lastTick = now;
    const st = CF.state;
    if (st && dt > 0) {
      CF.logic.tick(st, dt * st.settings.speed, now);
      if (now - lastRender > 0.25) {
        lastRender = now;
        const ae = document.activeElement;
        const typing = ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT');
        if (!typing) CF.ui.render(st);
      }
      saveTimer += dt;
      if (saveTimer >= 15) { saveTimer = 0; CF.save(); }
    }
    requestAnimationFrame(loop);
  }

  window.addEventListener('beforeunload', () => { if (CF.save) CF.save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && CF.save) CF.save(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { boot(); });
  else boot();
})();

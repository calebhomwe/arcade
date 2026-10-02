/* ============================================================
   Chili Firm 2 — Boot & main loop
   URL params: ?skip-title=1  ?demo=1  ?import=<code>  ?view=<panel>
   ============================================================ */
(function () {
  'use strict';

  const CF = window.CF;
  let lastTick = 0, lastRender = 0, lastFrame = 0, saveTimer = 0;

  window.addEventListener('error', e => {
    try { document.documentElement.setAttribute('data-err', String(e.message || 'unknown').slice(0, 300)); } catch (_) { /* ignore */ }
  });

  async function boot() {
    const now = Date.now() / 1000;
    const q = new URLSearchParams(window.location.search);
    let state = CF.stateMod.loadState(localStorage, now);
    let isNew = false;
    if (!state) { state = CF.stateMod.createState(now); isNew = true; }
    const imp = q.get('import');
    if (imp) {
      const ns = CF.stateMod.importState(imp.replace(/ /g, '+'), now);
      if (ns) { state = ns; isNew = false; }
    }
    if (q.get('demo') === '1') {
      try {
        const raw = await fetch('tools/demo-save.txt');
        if (raw.ok) {
          const ns = CF.stateMod.importState((await raw.text()).trim(), now);
          if (ns) { state = ns; isNew = false; CF.stateMod.saveState(ns, localStorage); }
        }
      } catch (e) { /* demo file absent: play fresh */ }
    }
    CF.state = state;

    let away = 0;
    if (!isNew) {
      const elapsed = now - (state.last || now);
      if (elapsed > 30) away = CF.logic.processOffline(state, elapsed, now);
    }

    CF.save = () => { try { CF.stateMod.saveState(CF.state, localStorage); } catch (e) { /* quota */ } };
    /* Compact career mirror of the real save (which is too big for progress tools to read):
       level from day+rep, coins, stars from rep milestones, unlocks, upgrades, a daily goal. */
    CF.careerKey = 'chili_career_v1';
    CF.career = function () {
      try {
        var s = CF.state; if (!s) return;
        var up = s.upgrades || {}, upN = 0; for (var k in up) upN += (up[k] | 0);
        var sold = 0; var biz = s.biz || {}; for (var b in biz) sold += ((biz[b] && biz[b].sold) | 0);
        var day = new Date(), dk = day.getFullYear() + '-' + (day.getMonth() + 1) + '-' + day.getDate();
        var stars = Math.floor((s.rep || 0) / 10) + ((s.day || 1) >= 3 ? 1 : 0);
        var dailyOK = sold >= 5;
        localStorage.setItem(CF.careerKey, JSON.stringify({
          level: s.day || 1, xp: (s.rep || 0) + sold, coins: Math.floor(s.money || 0), stars: stars,
          unlocks: (s.unlocked || []).length, upgrades: upN, goals: sold, daily: dk, dailyOK: dailyOK,
          sold: sold, lastAt: Date.now()
        }));
      } catch (e) { /* private mode */ }
    };
    var _cfSave0 = CF.save;
    CF.save = function () { _cfSave0(); CF.career(); };
    CF.career();
    if (!window.__cfHb) window.__cfHb = setInterval(function () { try { CF.career(); } catch (e) {} }, 20000);

    CF.ui.init();
    CF.ui.render(state);
    const start = () => {
      if (away > 0) CF.ui.celebrate('away', { amount: away });
      const v = q.get('view');
      if (v) CF.ui.setView(v);
    };
    if (q.get('skip-title') === '1') { CF.ui.showTitle(start); CF.ui.play(); }
    else CF.ui.showTitle(start);

    lastTick = now;
    document.documentElement.setAttribute('data-boot', state.day + '|' + Math.round(state.money) + '|' + state.missionIdx);
    requestAnimationFrame(loop);
  }

  function loop(ts) {
    const now = Date.now() / 1000;
    const dt = Math.min(5, Math.max(0, now - lastTick));
    lastTick = now;
    const st = CF.state;
    if (st && dt > 0) {
      CF.logic.tick(st, dt * st.settings.speed, now);
      const fdt = lastFrame ? Math.min(0.1, (ts - lastFrame) / 1000) : 0.016;
      lastFrame = ts;
      CF.ui.frame(fdt);
      if (now - lastRender > 0.25) {
        lastRender = now;
        CF.ui.render(st);
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

/* ============================================================
   Chili Firm 2 — Caleb's Arcade hooks
   Only does anything when the arcade SDK (arcade-sdk.js) is on
   the page. Adds: Exit to title, Restart (asks before wiping),
   a replayable Tito walkthrough, situation-aware hints, codes
   (a codes-on session is a sandbox that never saves) and the
   scene reports. The game's rules and art are untouched.
   ============================================================ */
(function (global) {
  'use strict';

  const SDK = global.ArcadeSDK;
  const CF = global.CF;
  if (!SDK || !CF) return;
  const Logic = CF.logic, Defs = CF.defs;
  const $ = s => document.querySelector(s);
  const nowS = () => Date.now() / 1000;
  const cheated = () => !!SDK.cheated;
  const plain = s => String(s || '').replace(/\p{Extended_Pictographic}️?/gu, '').replace(/\s{2,}/g, ' ').trim();
  document.documentElement.classList.add('cf-arcade');

  /* ---------- codes on = sandbox: the real save is never overwritten ---------- */
  const rawSave = CF.stateMod.saveState;
  CF.stateMod.saveState = function (state, storage) {
    return rawSave.call(this, state, cheated() ? null : storage);   // still returns the data for Export
  };
  function paintCodes() {
    let tag = $('#codes-on');
    if (!tag) { tag = document.createElement('div'); tag.id = 'codes-on'; tag.textContent = 'Codes on · not saved'; document.body.appendChild(tag); }
    tag.hidden = !cheated();
  }

  /* ---------- scenes, title and exit ---------- */
  function watchPlay() {
    const orig = CF.ui.onPlay;
    CF.ui.onPlay = function () { if (orig) orig.apply(this, arguments); SDK.state({ scene: 'play' }); };
  }
  function toTitle() {
    walkStop();
    try { if (CF.ui.panel) CF.ui.closePanel(); } catch (e) { /* no panel */ }
    if (CF.save) CF.save();
    try { CF.audio.music(false); } catch (e) { /* no audio yet */ }
    let t = $('#title');
    if (!t) { t = document.createElement('div'); t.id = 'title'; document.body.appendChild(t); }
    t.classList.remove('hide');
    CF.ui.started = false;
    CF.ui.showTitle(null);
    watchPlay();
    SDK.state({ scene: 'title' });
  }
  /* An idle farm is one long run, so Restart never wipes it silently: it opens the game's own
     "Wipe everything?" check in Trophies > Save, where Cancel keeps the farm. */
  function restart() {
    if (!CF.ui.started) { CF.ui.play(); return; }
    CF.ui.ptab.trophy = 'save';
    CF.ui.openPanel('trophy');
    const b = $('[data-action="confirm-reset"]');
    if (b) b.click();
  }

  /* ---------- walkthrough: Tito teaches the loop again, waiting for each action ---------- */
  let walk = null;
  const STEPS = [
    { say: 'Walkthrough time! Tap an empty pot to plant a chili, or swipe across a row.',
      skip: s => !s.plots.some((p, i) => i < s.plotCount && p.status === 'empty'), done: (s, b) => s.stats.planted > b.planted },
    { say: 'Tap a growing plant to water it. Water means double speed.',
      skip: s => !s.plots.some((p, i) => i < s.plotCount && p.status === 'growing'),
      done: s => s.plots.some((p, i) => i < s.plotCount && p.status === 'growing' && p.boostUntil > nowS()) },
    { say: 'When a pepper is ripe, tap it to harvest, or swipe the whole row.',
      skip: s => !s.plots.some((p, i) => i < s.plotCount && p.status !== 'empty'), done: (s, b) => s.stats.harvested > b.harvested },
    { say: 'Now hit SELL ALL and get that paper!', skip: s => Logic.chiliTotal(s) < 1, done: (s, b) => s.stats.sold > b.sold },
    { say: 'Spend it: Crew hires hands who farm for you, Upgrades grow the room. That is the whole loop, boss!', last: true },
  ];
  function walkStop() { if (walk) { clearInterval(walk.iv); walk = null; } }
  function walkSay() {
    const st = STEPS[walk.i];
    walk.at = nowS();
    CF.ui.say(st.say, { pose: st.last ? 'cheer' : 'point', ms: st.last ? 6000 : 7000 });
  }
  function walkNext() {
    const s = CF.state;
    walk.i++;
    while (walk.i < STEPS.length - 1 && STEPS[walk.i].skip && STEPS[walk.i].skip(s)) walk.i++;
    walk.base = Object.assign({}, s.stats);
    walkSay();
    if (STEPS[walk.i].last) { SDK.event('tutorial-done'); const w = walk; setTimeout(() => { if (walk === w) walkStop(); }, 6000); }
  }
  function walkthrough() {
    walkStop();
    if (!CF.ui.started) CF.ui.play();
    try { if (CF.ui.panel) CF.ui.closePanel(); } catch (e) { /* no panel */ }
    walk = { i: -1, base: {}, at: 0 };
    walkNext();
    walk.iv = setInterval(() => {
      if (!walk || STEPS[walk.i].last) return;
      const s = CF.state, st = STEPS[walk.i];
      if (st.done(s, walk.base) || (st.skip && st.skip(s))) walkNext();   // done, or no longer possible (the crew did it)
      else if (nowS() - walk.at > 14) walkSay();          // a reminder, then keep waiting
    }, 600);
  }

  /* ---------- hint: the most useful thing to do right now ---------- */
  function hint() {
    const s = CF.state;
    if (!s) return '';
    if (!CF.ui.started) return 'Press PLAY. Your crew keeps the farm growing while you are away.';
    let ready = 0, empty = 0, dry = 0;
    const t = nowS();
    for (let i = 0; i < s.plotCount; i++) {
      const p = s.plots[i];
      if (p.status === 'ready' || p.status === 'wilted') ready++;
      else if (p.status === 'empty') empty++;
      else if (p.status === 'growing' && p.boostUntil < t) dry++;
    }
    const stock = Math.floor(Logic.chiliTotal(s)), cap = Logic.storageCap(s);
    const n = (k, one, many) => k + ' ' + (k === 1 ? one : many);
    if (ready) return n(ready, 'plant is', 'plants are') + ' ripe: tap HARVEST (or swipe the row) before they wilt.';
    if (stock >= cap) return 'Storage is full (' + stock + '/' + cap + '): SELL ALL, or buy more storage in Upgrades.';
    if (empty) return n(empty, 'pot is', 'pots are') + ' empty: PLANT ALL fills them with ' + plain(Defs.strain(s.selectedStrain).name) + '.';
    if (dry) return n(dry, 'plant is', 'plants are') + ' thirsty: WATER ALL doubles their speed.';
    if (stock) return 'You are holding ' + stock + ' chilis: SELL ALL, or wait for a walk-in buyer who pays 1.3 to 1.7x market.';
    const m = CF.story && CF.story.current(s);
    if (m) return 'Next goal: ' + plain(m.name) + '. ' + plain(m.desc);
    return 'Everything is growing. Look in Crew and Upgrades for something you can afford.';
  }

  /* ---------- codes (the arcade's Codes box) ---------- */
  const CODES = {
    HOTMONEY: '+$1,000,000 (this session only)',
    GREENTHUMB: 'Every growing plant ripens right now',
    SEEDVAULT: 'Every chili strain unlocked (this session only)',
  };
  function code(c) {
    c = String(c || '').toUpperCase();
    if (!CODES[c] || !CF.state) return { ok: false };
    const s = CF.state;
    if (c === 'HOTMONEY') s.money += 1e6;
    if (c === 'GREENTHUMB') for (let i = 0; i < s.plotCount; i++) { const p = s.plots[i]; if (p.status === 'growing') p.progress = Logic.growTime(s, p.strain); }
    if (c === 'SEEDVAULT') Defs.STRAINS.forEach(x => { if (s.unlocked.indexOf(x.id) === -1) s.unlocked.push(x.id); });
    setTimeout(paintCodes, 0);   // the SDK marks the session as cheated once this returns
    return { ok: true, message: CODES[c] };
  }

  /* ---------- pause: the SDK freezes frames, timers, the clock and CSS animations; the flying
     coins and number pops are Web Animations, so hold those too and let them finish on resume ---------- */
  let held = [];
  function holdAnimations() {
    if (!document.getAnimations) return;
    held = document.getAnimations().filter(a => {
      if (a.playState !== 'running') return false;
      // CSS animations and transitions are frozen by the SDK's own stylesheet; only script-made ones need holding
      if ((global.CSSAnimation && a instanceof global.CSSAnimation) || (global.CSSTransition && a instanceof global.CSSTransition)) return false;
      try { const t = a.effect && a.effect.target; const el = t && (t.element || t); return !(el && el.closest && el.closest('#arcade-sdk')); } catch (e) { return true; }
    });
    held.forEach(a => { try { a.pause(); } catch (e) { /* finished meanwhile */ } });
  }
  function releaseAnimations() { held.forEach(a => { try { a.play(); } catch (e) { /* gone */ } }); held = []; }

  /* ---------- boot: after main.js has built the farm ---------- */
  function ready() {
    if (!CF.ui || !CF.state || CF.ui.started === undefined) { setTimeout(ready, 50); return; }
    paintCodes();
    ArcadeSDK.init({
      pauseKeys: 'p',          // Esc already closes the game's panels
      onRestart: restart,
      onExit: toTitle,
      onTutorial: walkthrough,
      onHint: hint,
      onCheat: code,
      onPause: holdAnimations,
      onResume: releaseAnimations,
    });
    if (CF.ui.started) SDK.state({ scene: 'play' });
    else { watchPlay(); SDK.state({ scene: 'title' }); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})(typeof window !== 'undefined' ? window : globalThis);

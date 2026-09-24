/* ============================================================
   Chili Firm 2 — Juice / effects module (self-contained)
   ------------------------------------------------------------
   Adds game-feel juice on top of the existing UI with ZERO
   changes to core files. Everything hooks the DOM through
   MutationObserver, all CSS is injected at load (prefixed
   .juice-), every animation animates transform/opacity only,
   and a single prefers-reduced-motion check gates the module.

   Features:
     1. Coin shower  — a toast whose text starts with "+" spawns
        8 gold coins at the #topbar .money-val chip.
     2. Door knock   — #event-banner becoming visible shakes
        #farm-room and flashes a red vignette once.
     3. View slide   — a .view gaining .active plays a slide-up.
     4. Level flash  — the topbar .xp-bar i crossing 100% pops a
        "LEVEL UP! ⭐" badge near the rep tb-stat.

   Exposes: CF.juice = { version: 1 }
   ============================================================ */
(function (global) {
  'use strict';

  /* One gate for all motion. If the user prefers reduced motion
     the module does nothing: no style tag, no observers, no fx. */
  var REDUCED = typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $ = function (s) { return document.querySelector(s); };

  /* ---------------- injected styles ---------------- */
  var CSS = [
    /* --- coin particles --- */
    '.juice-coin{',
    '  position:fixed; z-index:400; pointer-events:none;',
    '  width:11px; height:11px; margin:-5px 0 0 -5px;',
    '  border-radius:50%;',
    '  background:radial-gradient(circle at 35% 30%, #ffe58a, #f5b301 55%, #b97e00);',
    '  border:1.5px solid #8a5a00;',
    '  box-shadow:0 1px 2px rgba(60,35,0,.45), inset 0 -2px 3px rgba(120,75,0,.55);',
    '  will-change:transform;',
    '  animation:juice-coin 1s cubic-bezier(.2,.6,.3,1) both;',
    '}',
    '@keyframes juice-coin{',
    '  0%{transform:translate(0,0) scale(.4); opacity:0;}',
    '  10%{opacity:1;}',
    '  28%{transform:translate(calc(var(--dx)*.55), -16px) scale(1.05);}',
    '  100%{transform:translate(var(--dx), var(--fall)) scale(.5); opacity:0;}',
    '}',
    /* --- door knock shake (applied to #farm-room) --- */
    '.juice-shake{animation:juice-shake .6s cubic-bezier(.36,.07,.19,.97) both;}',
    '@keyframes juice-shake{',
    '  0%,100%{transform:translateX(0);}',
    '  15%{transform:translateX(-6px);}',
    '  30%{transform:translateX(5px);}',
    '  45%{transform:translateX(-4px);}',
    '  60%{transform:translateX(3px);}',
    '  75%{transform:translateX(-2px);}',
    '  90%{transform:translateX(1px);}',
    '}',
    /* --- red alert vignette --- */
    '.juice-vignette{',
    '  position:fixed; inset:0; z-index:260; pointer-events:none;',
    '  background:radial-gradient(ellipse at center, rgba(200,20,10,0) 52%, rgba(200,20,10,.55) 100%);',
    '  animation:juice-vignette .7s ease-out forwards;',
    '}',
    '@keyframes juice-vignette{',
    '  0%{opacity:1;}',
    '  100%{opacity:0;}',
    '}',
    /* --- view transition (overrides core fadeUp while present) --- */
    '.view.juice-viewin{animation:juice-viewin .35s ease both;}',
    '@keyframes juice-viewin{',
    '  from{opacity:0; transform:translateY(14px);}',
    '  to{opacity:1; transform:none;}',
    '}',
    /* --- level-up badge --- */
    '.juice-lvlbadge{',
    '  position:fixed; z-index:120; pointer-events:none;',
    '  padding:5px 10px; white-space:nowrap;',
    '  background:linear-gradient(180deg, #ffe27a, #f5b301 70%, #d99a00);',
    '  border:2.5px solid #5d3b00; border-radius:999px;',
    '  color:#3d2600; font-weight:800; font-size:.8rem; letter-spacing:.02em;',
    '  box-shadow:0 3px 0 rgba(60,35,0,.5), 0 8px 18px rgba(255,190,0,.4);',
    '  text-shadow:0 1px 0 rgba(255,245,200,.6);',
    '  will-change:transform;',
    '  animation:juice-lvlpop 1.5s ease both;',
    '}',
    '@keyframes juice-lvlpop{',
    '  0%{opacity:0; transform:scale(.3) translateY(6px);}',
    '  12%{opacity:1; transform:scale(1.15) translateY(0);}',
    '  22%{transform:scale(1);}',
    '  78%{opacity:1; transform:scale(1) translateY(0);}',
    '  100%{opacity:0; transform:scale(.9) translateY(-8px);}',
    '}',
    ''
  ].join('\n');

  function injectStyle() {
    if ($('#juice-css')) return;
    var st = document.createElement('style');
    st.id = 'juice-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---------------- 1. coin shower ---------------- */
  function coinShower() {
    var chip = $('#topbar .money-val');
    if (!chip) return;
    var r = chip.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var coins = [];
    for (var i = 0; i < 8; i++) {
      var c = document.createElement('i');
      c.className = 'juice-coin';
      var dx = (Math.random() - 0.5) * 130;
      var fall = 80 + Math.random() * 70;
      var dur = (0.85 + Math.random() * 0.25).toFixed(2);
      var delay = (Math.random() * 0.1).toFixed(2);
      c.style.left = cx + 'px';
      c.style.top = cy + 'px';
      c.style.setProperty('--dx', dx.toFixed(1) + 'px');
      c.style.setProperty('--fall', fall.toFixed(1) + 'px');
      c.style.animationDuration = dur + 's';
      c.style.animationDelay = delay + 's';
      document.body.appendChild(c);
      coins.push(c);
    }
    setTimeout(function () {
      coins.forEach(function (x) { x.remove(); });
    }, 1200);
  }

  /* ---------------- 2. door knock ---------------- */
  function doorKnock() {
    var room = $('#farm-room');
    if (room) {
      room.classList.remove('juice-shake');
      void room.offsetWidth; /* restart animation */
      room.classList.add('juice-shake');
      setTimeout(function () { room.classList.remove('juice-shake'); }, 620);
    }
    var v = document.createElement('div');
    v.className = 'juice-vignette';
    document.body.appendChild(v);
    setTimeout(function () { v.remove(); }, 750);
  }

  /* ---------------- 3. view transition ---------------- */
  var lastViewIn = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function viewIn(el) {
    var now = Date.now();
    if (lastViewIn && now - (lastViewIn.get(el) || 0) < 400) return;
    if (lastViewIn) lastViewIn.set(el, now);
    el.classList.add('juice-viewin');
    setTimeout(function () { el.classList.remove('juice-viewin'); }, 360);
  }

  /* ---------------- 4. level-up flash ---------------- */
  function levelFlash() {
    document.querySelectorAll('.juice-lvlbadge').forEach(function (b) { b.remove(); });
    var repVal = $('.tb-stat .rep-val');
    if (!repVal) return;
    var stat = repVal.closest('.tb-stat');
    if (!stat) return;
    var r = stat.getBoundingClientRect();
    var b = document.createElement('div');
    b.className = 'juice-lvlbadge';
    b.textContent = 'LEVEL UP! ⭐';
    b.style.left = Math.max(8, r.right - 96) + 'px';
    b.style.top = Math.max(6, r.top - 42) + 'px';
    document.body.appendChild(b);
    setTimeout(function () { b.remove(); }, 1500);
  }

  /* ---------------- observers ---------------- */
  function watchToasts() {
    var box = $('#toasts');
    if (!box) return;
    var mo = new MutationObserver(function (muts) {
      for (var m = 0; m < muts.length; m++) {
        var added = muts[m].addedNodes;
        for (var n = 0; n < added.length; n++) {
          var node = added[n];
          if (node.nodeType !== 1) continue;
          var txt = node.textContent || '';
          if (txt.trim().charAt(0) === '+') coinShower();
        }
      }
    });
    mo.observe(box, { childList: true });
  }

  function watchEventBanner() {
    var panel = $('#event-panel');
    if (!panel) return;
    var bannerShown = false;
    var attrMo = null;
    function bannerVisible() {
      var b = $('#event-banner');
      if (!b) return false;
      try { return getComputedStyle(b).display !== 'none'; }
      catch (e) { return false; }
    }
    function maybeKnock() {
      var vis = bannerVisible();
      if (vis && !bannerShown) {
        bannerShown = true;
        doorKnock();
      } else if (!vis) {
        bannerShown = false;
      }
    }
    function attachAttr(b) {
      if (attrMo) attrMo.disconnect();
      attrMo = new MutationObserver(maybeKnock);
      attrMo.observe(b, { attributes: true, attributeFilter: ['style'] });
    }
    var mo = new MutationObserver(function () {
      var b = $('#event-banner');
      if (b) attachAttr(b);
      maybeKnock();
    });
    mo.observe(panel, { childList: true, subtree: true });
    var b0 = $('#event-banner');
    if (b0) attachAttr(b0);
    maybeKnock(); /* banner already visible at load counts as "becomes" */
  }

  function watchViews() {
    var seen = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
    function attach(v) {
      if (!seen || seen.has(v)) return;
      seen.add(v);
      var mo = new MutationObserver(function () {
        if (v.classList.contains('active')) viewIn(v);
      });
      mo.observe(v, { attributes: true, attributeFilter: ['class'] });
    }
    document.querySelectorAll('.view').forEach(attach);
    /* future-proof: catch views injected after load */
    var docMo = new MutationObserver(function (muts) {
      for (var m = 0; m < muts.length; m++) {
        var added = muts[m].addedNodes;
        for (var n = 0; n < added.length; n++) {
          var node = added[n];
          if (node.nodeType !== 1) continue;
          if (node.classList && node.classList.contains('view')) attach(node);
          if (node.querySelectorAll) node.querySelectorAll('.view').forEach(attach);
        }
      }
    });
    docMo.observe(document.body, { childList: true, subtree: true });
  }

  function watchXpBar() {
    var topbar = $('#topbar');
    if (!topbar) return;
    var prevPct = null;
    function curPct() {
      var i = topbar.querySelector('.xp-bar i');
      if (!i) return null;
      var w = i.getAttribute('style') || '';
      var m = /width\s*:\s*([\d.]+)%/.exec(w);
      if (m) return parseFloat(m[1]);
      var cs = getComputedStyle(i).width;
      var pm = /([\d.]+)px/.exec(cs);
      return pm ? parseFloat(pm[1]) : null;
    }
    function check() {
      var pct = curPct();
      if (pct == null) return;
      if (prevPct == null) { prevPct = pct; return; }
      if (pct >= 100 && prevPct < 100) levelFlash();
      prevPct = pct;
    }
    var mo = new MutationObserver(check);
    mo.observe(topbar, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    check(); /* seed prevPct without flashing on load */
  }

  /* ---------------- init ---------------- */
  function init() {
    if (REDUCED) return; /* single reduced-motion gate: skip entirely */
    if (global.CF.juice && global.CF.juice._attached) return; /* re-eval is a no-op */
    injectStyle();
    watchToasts();
    watchEventBanner();
    watchViews();
    watchXpBar();
    /* non-enumerable guard so re-evaluating the module (tests) is a no-op */
    try {
      Object.defineProperty(global.CF.juice, '_attached', { value: true, enumerable: false });
    } catch (e) { /* legacy */ }
  }

  /* ---------------- expose API ---------------- */
  global.CF = global.CF || {};
  global.CF.juice = global.CF.juice || { version: 1 };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : this);

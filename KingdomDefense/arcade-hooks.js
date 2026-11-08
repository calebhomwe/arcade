/* Kingdom Defense <-> Caleb's Arcade SDK (assets/arcade-sdk.js).
 *
 * Everything the arcade standard asks for that the game does not do on its own, built only on what
 * index.html already offers: window.KD, its top-level functions (reset, finish, saveBest, awardXP,
 * rankLocked, toast, updateUI, flash...) and its DOM. The game's own files stay untouched, so this
 * file merges cleanly with work on index.html. It is loaded by one <script> line at the end of <body>.
 *
 * What it adds:
 * - ArcadeSDK.init: restart, exit to title, replay the guided first mission, a situation-aware hint
 *   and four codes; scene reports (title / play / over with waves, stars and outcome).
 * - Pause: in a mission the game keeps its own pause button and panel (ownPauseUI + gamePaused; its gameplay
 *   test uses them), now with a tip; the arcade's Pause and P open it. On the title, map and end screens,
 *   where that button does nothing, the arcade's button and menu stand in. One pause button either way.
 * - A run with codes on never writes a best wave, XP, mastery or achievement, and shows CODES ON.
 * - Campaign records, wave intel, and pointer and resize handling extend the original missions.
 * - Reduced motion: screen shake starts off (unless the player turned it on) and edge flashes are skipped.
 * - Sound from audio/: menu and battle music with crossfades, and the announcer's wave calls; Music and
 *   Effects sliders in the arcade's How to play panel drive the game's own saved volumes (kd-audio).
 */
(function () {
  'use strict';
  var SDK = window.ArcadeSDK, KD = window.KD, W = window, doc = document;
  if (!SDK || !KD || !KD.state) return;
  var S = KD.state;
  var $ = function (s) { return doc.querySelector(s); };
  var fn = function (name) { return typeof W[name] === 'function' ? W[name] : null; };
  var on = {};                          // codes entered this session
  var cheated = function () { return !!SDK.cheated; };

  /* ---------- wrap the game's own top-level functions (its internal calls go through window) ---------- */
  function wrap(name, make) {
    var orig = fn(name);
    if (!orig) return;
    W[name] = make(orig);
    if (KD[name] === orig) KD[name] = W[name];
  }
  var resetting = false;
  var clearedWave = 0;
  wrap('reset', function (orig) {
    return function () {
      clearedWave = 0;
      resetting = true;
      try { var r = orig.apply(this, arguments); } finally { resetting = false; }
      battlefield = readBattlefield();
      $('#rankUp').classList.remove('show');
      call('updateBossBar');
      onRunStart();
      syncMode();
      if (softPaused()) SDK.gamePaused(false);             // Restart Mission closes the game's panel without setPause
      if (!SDK.paused) { var cs = [A.ctx]; try { cs.push(audioCtx); } catch (e) {} cs.forEach(function (c) { if (c && c.state === 'suspended') try { c.resume(); } catch (e) {} }); }   // eslint-disable-line no-undef
      if (on.KINGSGOLD) { S.money += 5000; call('updateUI'); }
      SDK.state({ scene: 'play', map: KD.MAPS[KD.selectedMap] && KD.MAPS[KD.selectedMap].name, difficulty: currentDiff() });
      return r;
    };
  });
  wrap('finish', function (orig) {
    return function (win) {
      // Several pods can reach the gate within the same simulation step.
      if (!KD.playing) return;
      if (win) clearedWave = KD.waves.length;
      var r = orig.apply(this, arguments);
      var d = KD.DIFFS[currentDiff()] || {}, frac = d.lives ? S.lives / d.lives : 1;
      var stars = win ? (frac >= 0.75 ? 3 : frac >= 0.4 ? 2 : 1) : 0;
      if (win && !cheated()) recordClear(KD.selectedMap, stars);
      $('#rankUp').classList.remove('show');
      $('#bossBar').style.display = 'none';
      doc.body.classList.remove('breach-warning');
      call('closeTowerPanel');
      nextMission.hidden = !win || KD.selectedMap === KD.MAPS.length - 1;
      if (!win) {
        $('#endProgressLabel').textContent = clearedWave + ' OF ' + KD.waves.length + ' WAVES CLEARED';
        $('#endProgressFill').style.width = (clearedWave / KD.waves.length * 100) + '%';
      }
      onRunEnd(win);
      SDK.state({ scene: 'over', score: clearedWave, outcome: win ? 'win' : 'lose', stars: stars, waves: KD.waves.length, codes: cheated() });
      return r;
    };
  });
  // Cheated runs never touch the saved records.
  ['saveBest', 'awardXP', 'gainMastery', 'unlockAchievement'].forEach(function (name) {
    wrap(name, function (orig) { return function () { if (cheated()) return; return orig.apply(this, arguments); }; });
  });
  function call(name) { var f = fn(name); if (f) try { return f.apply(null, [].slice.call(arguments, 1)); } catch (e) {} }
  function currentDiff() { var b = $('#diffRow .diff.on'); if (b && b.dataset.diff) return b.dataset.diff; try { return localStorage.getItem('kd-diff') || 'medium'; } catch (e) { return 'medium'; } }

  /* ---------- campaign results and the wave HUD ---------- */
  function missionKey(map) { return map + ':' + currentDiff(); }
  function mapStars(map) {
    var stars = KD.career.mapStars?.[missionKey(map)];
    return Number.isInteger(stars) && stars >= 1 && stars <= 3 ? stars : 0;
  }
  function recordClear(map, stars) {
    if (stars <= mapStars(map)) return;
    var key = missionKey(map);
    KD.career.mapStars = { ...KD.career.mapStars, [key]: stars };
    call('saveCareer');
  }
  var nextMission = doc.createElement('button');
  nextMission.className = 'btn primary';
  nextMission.id = 'kd-next-mission';
  nextMission.textContent = 'NEXT MISSION';
  nextMission.hidden = true;
  nextMission.addEventListener('click', function () { W.reset(KD.selectedMap + 1); });
  $('#end .endRow').before(nextMission);
  wrap('bestLabel', function (orig) {
    return function (map) {
      var stars = mapStars(map);
      if (stars) return ' ' + '★'.repeat(stars) + ' CLEARED';
      // Old saves only know the highest wave reached, even if the gate fell on wave 40.
      var label = orig(map);
      return label.includes('CLEARED') ? ' · BEST W' + KD.waves.length : label;
    };
  });
  call('refreshBest');

  var stepping = false;
  var afterStep = new Set();
  wrap('update', function (orig) {
    return function (dt) {
      var wasActive = KD.waveActive;
      stepping = true;
      try { orig(dt); } finally {
        stepping = false;
        for (var refresh of afterStep) refresh();
        afterStep.clear();
      }
      if (wasActive && !KD.waveActive && KD.playing) {
        clearedWave = S.wave;
        call('saveBest', KD.selectedMap, clearedWave);
      }
    };
  });
  // Stop the rest of a losing frame from applying more leaks or paying out queued hits.
  ['update', 'hurt'].forEach(function (name) {
    var orig = Enemy.prototype[name];
    Enemy.prototype[name] = function () { if (KD.playing) return orig.apply(this, arguments); };
  });

  var canSeePod = Tower.prototype.canSee;
  Tower.prototype.canSee = function (pod) {
    return !pod.immune?.includes(this.damageType) && canSeePod.call(this, pod);
  };
  var updateShot = Shot.prototype.update;
  Shot.prototype.update = function (dt) {
    if (!KD.playing) return;
    if (this.e.dead) {
      // The rest of a volley can hit exposed layers near the original target.
      var target = this.e, distance = 65;
      for (var pod of S.enemies) {
        if (pod.dead || pod.routeIndex !== target.routeIndex || !this.t.canSee(pod)) continue;
        var gap = Math.hypot(pod.x - target.x, pod.y - target.y);
        if (gap < distance) { this.e = pod; distance = gap; }
      }
    }
    updateShot.call(this, dt);
  };

  wrap('tickHud', function () {
    var counters = Object.values(hudRoll).map(function (counter) { return [counter, $(counter.selector)]; });
    return function (dt) {
      var blend = 1 - Math.pow(0.001, dt * 14);
      for (var [counter, node] of counters) {
        var remaining = counter.target - counter.value;
        // Keep fractions until display so a one-credit or one-HP change always settles.
        counter.value = Math.abs(remaining) < 0.45 ? counter.target : counter.value + remaining * blend;
        var value = counter.fmt(counter.value);
        if (node.textContent !== value) node.textContent = value;
      }
    };
  });
  wrap('nextWaveLabel', function () {
    return function () {
      var active = KD.waveActive || waveCountdown > 0;
      var index = active ? S.wave - 1 : S.wave;
      var wave = KD.waves[index];
      if (!wave) return 'FINAL WAVE COMPLETE';
      var groups = wave.map(function ([type, count]) { return count + '× ' + KD.ENEMIES[type].name; });
      return (active ? 'WAVE ' : 'NEXT WAVE ') + (index + 1) + ' · ' + groups.join(' · ');
    };
  });
  wrap('updateUI', function (orig) {
    var preview = $('#wavePreview');
    return function () {
      orig();
      preview.title = preview.textContent;
    };
  });
  // A carrier can split into many layers in one frame. Paint and persist their combined rewards once.
  ['saveCareer', 'syncXP', 'updateUI'].forEach(function (name) {
    wrap(name, function (refresh) {
      return function () {
        if (stepping) afterStep.add(refresh);
        else refresh();
      };
    });
  });
  wrap('setReadyButtonState', function () {
    var button = $('#startWave');
    return function () {
      var ready = KD.playing && !KD.paused && !KD.waveActive && !waveCountdown && S.wave < KD.waves.length;
      if (button.disabled === ready) button.disabled = !ready;
      button.classList.toggle('ready', ready);
      var label = 'START WAVE';
      if (waveCountdown > 0) label = 'START IN ' + Math.ceil(waveCountdown);
      else if (KD.waveActive) label = 'WAVE IN PROGRESS';
      else if (ready && S.wave === 0 && !S.towers.some(function (tower) { return tower.damage > 0; })) label = 'PLACE DEFENDER';
      if (button.textContent !== label) button.textContent = label;
    };
  });
  wrap('updateBossBar', function (orig) {
    return function () { if (KD.playing) orig(); };
  });

  /* ---------- battlefield layout and input ---------- */
  // Road centre lines in the same normalized space as the tactical map artwork.
  var tacticalRoutes = {
    'Riverside Switchback': [
      [0,.72],[.06,.653],[.11,.585],[.16,.515],[.196,.476],[.225,.465],[.248,.479],[.268,.513],
      [.274,.565],[.279,.612],[.295,.637],[.317,.638],[.334,.607],[.340,.556],[.335,.494],[.335,.449],
      [.350,.402],[.375,.377],[.405,.365],[.445,.365],[.474,.385],[.494,.426],[.499,.467],[.491,.523],
      [.482,.580],[.485,.628],[.501,.670],[.533,.705],[.573,.721],[.616,.715],[.646,.690],[.662,.648],
      [.661,.590],[.650,.531],[.635,.472],[.638,.425],[.656,.389],[.682,.369],[.709,.365],[.739,.380],
      [.767,.411],[.783,.454],[.797,.501],[.815,.536],[.839,.552],[.865,.550],[.895,.526],[.926,.492],
      [.955,.462],[.982,.451],[1.02,.430]
    ],
    'Iron Harbour': [
      [.161,.826],[.190,.733],[.219,.642],[.244,.571],[.276,.544],[.305,.556],[.336,.592],
      [.374,.639],[.405,.665],[.440,.670],[.480,.644],[.523,.592],[.552,.548],[.557,.512],
      [.536,.471],[.491,.432],[.449,.389],[.438,.351],[.453,.319],[.488,.279],[.534,.238],
      [.571,.215],[.623,.209],[.657,.193],[.679,.161],[.689,.120]
    ],
    'Red Ridge Convoy': [
      [.130,.093],[.134,.151],[.120,.199],[.103,.233],[.114,.269],[.153,.284],[.198,.272],
      [.244,.245],[.289,.213],[.333,.203],[.372,.210],[.393,.239],[.400,.287],[.420,.324],
      [.457,.357],[.481,.397],[.498,.454],[.500,.498],[.482,.549],[.465,.597],[.468,.632],
      [.492,.671],[.530,.694],[.585,.712],[.642,.731],[.687,.767],[.724,.818],[.749,.870],
      [.771,.927],[.790,.980],[.809,1.025]
    ],
    'Alpine Relay': [
      [.204,.124],[.214,.190],[.201,.222],[.193,.259],[.220,.289],[.269,.302],[.320,.322],
      [.349,.355],[.371,.396],[.402,.438],[.443,.465],[.484,.466],[.530,.489],[.579,.521],
      [.631,.547],[.681,.570],[.709,.601],[.723,.643],[.704,.679],[.666,.707],[.639,.735],
      [.628,.769],[.639,.807],[.672,.847],[.720,.868],[.773,.884],[.808,.912],[.839,.946],[.875,.997]
    ],
    'Metro Blackout': [
      [.430,1.018],[.483,.963],[.530,.909],[.579,.844],[.627,.774],[.677,.700],[.722,.626],
      [.744,.573],[.744,.533],[.724,.494],[.690,.453],[.644,.417],[.599,.404],[.563,.417],
      [.525,.435],[.492,.431],[.468,.407],[.463,.369],[.479,.331],[.489,.290],[.478,.250],
      [.448,.214],[.415,.192],[.379,.185],[.344,.201],[.316,.225],[.299,.254]
    ],
    'Farmland Floodway': [
      [.426,.641],[.386,.620],[.356,.590],[.341,.550],[.340,.503],[.354,.452],[.379,.413],
      [.416,.379],[.460,.377],[.505,.389],[.547,.405],[.590,.413],[.638,.402],[.679,.381],
      [.716,.368],[.752,.381],[.793,.404],[.833,.446],[.872,.492],[.915,.532],[.963,.560],[1.017,.584]
    ],
    'Desert Solar Array': [
      [.460,1.027],[.441,.968],[.423,.908],[.421,.858],[.438,.809],[.471,.757],[.503,.705],
      [.530,.650],[.543,.600],[.542,.556],[.525,.516],[.507,.476],[.505,.437],[.524,.398],
      [.551,.365],[.574,.337],[.570,.316],[.547,.295],[.510,.273],[.467,.253],[.424,.237],
      [.403,.221],[.411,.201],[.449,.183],[.495,.170],[.539,.149],[.565,.123],[.558,.103],
      [.528,.080],[.486,.062],[.444,.042]
    ],
    'Storm Coast': [
      [.091,.327],[.112,.352],[.126,.388],[.127,.426],[.114,.459],[.116,.502],[.140,.550],
      [.176,.579],[.214,.584],[.244,.561],[.260,.523],[.262,.473],[.273,.423],[.295,.391],
      [.304,.351],[.311,.313],[.333,.296],[.355,.313],[.374,.350],[.401,.379],[.446,.396],
      [.490,.389],[.529,.368],[.546,.337],[.557,.298],[.582,.264],[.612,.254],[.630,.273],
      [.636,.311],[.637,.356],[.647,.399],[.675,.435],[.713,.468],[.747,.507],[.777,.552],
      [.793,.599],[.796,.651],[.796,.702],[.811,.744],[.846,.772],[.889,.795],[.931,.809]
    ],
  };
  for (var map of KD.MAPS) {
    if (tacticalRoutes[map.name]) map.path = tacticalRoutes[map.name];
  }
  W.buildRoutesForMap(KD.selectedMap);
  W.buildRouteGeometry();

  function readBattlefield() { return { width: KD.W, board: boardRect(), segments: routesSeg }; }
  var battlefield = readBattlefield();
  W.addEventListener('resize', function () {
    // The game's resize handler runs first and repositions towers. Pods keep their position on
    // the same road segment even when the new aspect ratio changes that segment's length.
    var previous = battlefield;
    battlefield = readBattlefield();
    if (!KD.playing) return;
    for (var pod of S.enemies) {
      var before = previous.segments[pod.routeIndex];
      var after = battlefield.segments[pod.routeIndex];
      if (!before?.length || !after?.length || pod.d < 0) continue;
      var remaining = pod.d, distance = 0;
      for (var i = 0; i < before.length; i++) {
        if (remaining <= before[i] || i === before.length - 1) {
          distance += after[i] * Math.min(1, remaining / (before[i] || 1));
          break;
        }
        remaining -= before[i];
        distance += after[i];
      }
      pod.d = distance;
      Object.assign(pod, W.pointAt(distance, pod.routeIndex));
    }
    var scaleX = battlefield.width / previous.width;
    var scaleY = battlefield.board.h / previous.board.h;
    for (var shot of S.shots) {
      shot.x *= scaleX;
      shot.px *= scaleX;
      shot.y = battlefield.board.y + (shot.y - previous.board.y) * scaleY;
      shot.py = battlefield.board.y + (shot.py - previous.board.y) * scaleY;
    }
  });

  var canvas = $('#game');
  canvas.addEventListener('pointerdown', function (event) {
    var x = event.clientX, y = event.clientY;
    if (!KD.playing || KD.paused || !KD.selectedType || !KD.canBuild(x, y)) return;
    // A valid build can be inside the larger touch radius used to inspect a nearby tower.
    if (!S.towers.some(function (tower) { return Math.hypot(tower.x - x, tower.y - y) < 30; })) return;
    event.stopImmediatePropagation();
    KD.tryBuild(x, y);
  }, true);
  W.addEventListener('pointerup', function (event) {
    // Touch implicitly captures the pointer on the shop card, even after it leaves the shop.
    if (!KD.playing || KD.paused || event.pointerType !== 'touch' || KD.dragState?.on !== true) return;
    if (event.target.closest?.('#shop') && doc.elementFromPoint(event.clientX, event.clientY) === canvas) {
      KD.tryBuild(event.clientX, event.clientY);
    }
  }, true);
  W.addEventListener('pointercancel', function () {
    if (!drag) return;
    if (drag.on === true) {
      selectedType = null;
      call('syncCards');
    }
    drag = null;
  });

  /* ---------- reduced motion ---------- */
  var rm = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reducedMotion() { return !!(rm && rm.matches); }
  function applyReducedMotion() {
    if (!reducedMotion()) return;
    var chosen = null; try { chosen = localStorage.getItem('kd-shake'); } catch (e) {}
    // shakeFx is the game's own Screen Shake setting; start it off unless the player chose it.
    if (chosen === null) { try { shakeFx = false; } catch (e) {} }   // eslint-disable-line no-undef
  }
  applyReducedMotion();
  if (rm && rm.addEventListener) rm.addEventListener('change', applyReducedMotion);
  wrap('flash', function (orig) { return function () { if (reducedMotion()) return; return orig.apply(this, arguments); }; });

  /* ---------- the game's own pause, reported to the arcade ---------- */
  var css = doc.createElement('style');
  css.textContent =
    '#pauseMenu .kd-tip{margin:14px 0 0;font-size:13px;color:var(--secondary);line-height:1.45}#pauseMenu .kd-tip b{color:var(--gold)}' +
    // In a mission the game's own pause button is the one on screen; on the title and map screens (where it
    // does nothing) the arcade's button stands in, top right.
    'body.kd-playing #arcade-sdk-btn{display:none!important}body:not(.kd-playing) #controls>#pause{display:none!important}' +
    '#wavePreview{display:none}body.kd-playing #wavePreview{display:block}' +
    '#kd-next-mission{width:100%;margin:2px 0 8px}#kd-next-mission[hidden]{display:none}' +
    '@media(max-width:1199px){' +
      '#shop .card{touch-action:pan-x}' +
      'body.kd-playing #wavePreview{top:calc(var(--safe-top) + 114px);left:calc(var(--safe-left) + 12px);right:calc(var(--safe-right) + 12px);max-width:none;padding:6px 10px;text-align:center;font-size:11px}' +
      '#message,#combo,#bossBar{top:calc(var(--safe-top) + 146px)}' +
      '#orientationTip{display:none}' +
    '}' +
    '@media(max-width:560px) and (orientation:portrait){' +
      '#controls{display:grid;grid-template-columns:44px minmax(85px,1.4fr) minmax(46px,.8fr) minmax(54px,1fr) 44px;gap:5px;padding:0}' +
      '#controls>.btn,#controls>.segmented{min-height:44px;min-width:0}' +
      '#controls>#pause,#controls>#soundBtn{width:44px}' +
      '#controls .segmented .btn{flex:1;padding:0}' +
      '#controls>#startWave{grid-column:1/-1;font-size:12px}' +
      '#shopFilters .filter{min-height:44px}' +
      'body.kd-playing #wavePreview{top:calc(var(--safe-top) + 162px)}' +
      '#message,#combo,#bossBar{top:calc(var(--safe-top) + 194px)}' +
    '}' +
    '@media(min-width:650px) and (max-height:500px) and (orientation:landscape){' +
      '#stats{right:auto;width:224px}' +
      '#controls{top:calc(var(--safe-top) + 7px);left:calc(var(--safe-left) + 240px);justify-content:flex-end}' +
      'body.kd-playing #wavePreview{top:calc(var(--safe-top) + 63px)}' +
      '#message,#combo,#bossBar{top:calc(var(--safe-top) + 93px)}' +
      '#shop{padding:5px}.card{height:72px}.card .icon{height:34px}.card .icon img{width:42px;height:36px}' +
      '#shopFilters{bottom:calc(var(--safe-bottom) + 90px)}' +
    '}' +
    '.kd-codes-on{position:absolute;left:calc(var(--safe-left,0px) + 12px);top:calc(var(--safe-top,0px) + 74px);z-index:140;pointer-events:none;' +
      'font:800 12px/1 "Baloo 2","Nunito",system-ui,sans-serif;letter-spacing:1px;color:#07150d;background:var(--gold,#ffd60a);border-radius:99px;padding:6px 11px;box-shadow:0 8px 20px rgba(0,0,0,.3)}' +
    '@media(max-width:1199px){.kd-codes-on{top:calc(var(--safe-top,0px) + 112px);left:calc(var(--safe-left,0px) + 8px)}}';
  (doc.head || doc.body).appendChild(css);
  var TIPS = [
    'Camo pods are invisible to most defenders. The Eagle Lookout, Otter River Patrol, Owl and Raccoon see them.',
    'Lead pods ignore sharp damage. Bring explosive, cold, energy or normal damage.',
    'The Honey Badger Orchard earns credits after every cleared wave.',
    'Royal Rush charges as you pop pods: press R at 100% to overdrive every defender for 9 seconds.',
    'Once your defence holds, switch to 2× or 3× speed, or turn on AUTO.',
  ], tipIx = 0;
  function showTip() {
    var box = $('#pauseMenu .modal'); if (!box) return;
    var t = box.querySelector('.kd-tip'); if (!t) { t = doc.createElement('p'); t.className = 'kd-tip'; box.appendChild(t); }
    t.innerHTML = '<b>TIP</b> ' + TIPS[tipIx++ % TIPS.length].replace(/[<&]/g, '');
  }
  // Every open and close of the game's pause panel goes through setPause (its button, Resume, Map Select).
  wrap('setPause', function (orig) {
    return function (v) {
      var r = orig.apply(this, arguments);
      if (v) showTip();
      // Music, announcer and the game's own ambience drone wait with it.
      var ctxs = [A.ctx]; try { ctxs.push(audioCtx); } catch (e) {}   // eslint-disable-line no-undef
      ctxs.forEach(function (c) { if (c) try { if (v) c.suspend(); else if (!SDK.paused || SDK.debug().soft) c.resume(); } catch (e) {} });
      SDK.gamePaused(!!v);
      return r;
    };
  });
  function softPaused() { try { return SDK.paused && SDK.debug().soft; } catch (e) { return false; } }
  function onPause(reason) {
    if (reason === 'hidden' || !ownPause) return;          // hidden tab, title, map: the SDK freezes everything
    if (KD.playing && !KD.paused) W.setPause(true);         // in a mission: the game's own panel
  }
  function onResume() { if (ownPause && KD.paused) W.setPause(false); }
  // Mode: during a mission the game's own pause panel (ownPauseUI); on the title, map and end screens the
  // arcade's menu, which freezes the whole page. Switched only while nothing is paused.
  var ownPause = null;
  function syncMode() {
    var want = !!KD.playing;
    doc.body.classList.toggle('kd-playing', want);
    if (want === ownPause || SDK.paused) return;
    ownPause = want; SDK.init({ ownPauseUI: want });
  }
  // The game draws its route animations from the clock; hold the picture while its own panel is open.
  wrap('draw', function (orig) { return function () { if (KD.paused && KD.playing) return; return orig.apply(this, arguments); }; });

  /* ---------- title / exit ---------- */
  function hide(sel) { var e = $(sel); if (e) e.style.display = 'none'; }
  function toTitle() {
    // The game's own Map Select button (in its pause panel) stops the run: playing = false, panel closed.
    if (KD.playing) { var ms = $('#mapSelect'); if (ms) ms.click(); }
    ['#mapMenu', '#end', '#settingsMenu', '#heroesMenu', '#pauseMenu'].forEach(hide);
    call('closeTowerPanel');
    doc.body.classList.remove('low-gate');
    var screen = $('#screen'); if (screen) screen.classList.remove('gone');
    SDK.state({ scene: 'title' });
  }
  function restart() {
    ['#settingsMenu', '#heroesMenu'].forEach(hide);
    W.reset(KD.selectedMap);
  }
  function tutorial() {
    // Replays the game's own guided first mission on its tutorial map (Riverside Switchback):
    // pick a defender, build on a green spot, start the wave.
    try { tutorialSeen = false; } catch (e) {}   // eslint-disable-line no-undef
    try { localStorage.removeItem('kd-tutorial-seen'); } catch (e) {}
    ['#settingsMenu', '#heroesMenu'].forEach(hide);
    W.reset(0);
  }

  /* ---------- hint: reads the battlefield ---------- */
  function unlocked(k) { var f = fn('rankLocked'); return !(f && f(k)); }
  function names(list) { return list.length > 1 ? list.slice(0, -1).join(', ') + ' or ' + list[list.length - 1] : list[0] || ''; }
  function hint() {
    var T = KD.TYPES, E = KD.ENEMIES, waves = KD.waves, towers = S.towers || [];
    if (!KD.playing) {
      var menu = $('#mapMenu');
      return menu && getComputedStyle(menu).display !== 'none'
        ? 'New here? Choose EASY (40 gate HP, 800 credits), then Riverside Switchback: it is the tutorial map.'
        : 'Press PLAY NOW, pick Riverside Switchback (the tutorial map) and start on Easy.';
    }
    var keys = Object.keys(T).filter(unlocked);
    var afford = keys.filter(function (k) { return T[k].cost <= S.money; }).sort(function (a, b) { return T[a].cost - T[b].cost; });
    var attackers = towers.filter(function (t) { return t.damage > 0; });
    if (!attackers.length) {
      var first = afford.filter(function (k) { return T[k].category === 'Primary' && T[k].damage > 0; })[0] || afford[0];
      return first ? 'Pick the ' + T[first].name + ' (' + T[first].cost + ' credits) and tap a glowing green spot beside a bend in the road, then press START WAVE.'
                   : 'Save up for a first defender, then build it beside a bend in the road.';
    }
    var busy = KD.waveActive || (S.enemies || []).some(function (e) { return !e.dead; });
    var wave = (busy ? waves[S.wave - 1] : waves[S.wave]) || [];
    var types = wave.map(function (g) { return g[0]; });
    // Camo pods that nobody can see.
    if (types.some(function (k) { return E[k] && E[k].camo; }) && !towers.some(function (t) { return t.camo || t.revealAura; })) {
      var seers = keys.filter(function (k) { return T[k].camo || T[k].revealAura; }).map(function (k) { return T[k].name; });
      return 'Camo pods are in ' + (busy ? 'this' : 'the next') + ' wave and none of your defenders can see them. Build ' + names(seers.slice(0, 3)) + ': they spot camo.';
    }
    // Pods immune to every kind of damage you deal.
    var dealt = {}; attackers.forEach(function (t) { dealt[t.damageType] = 1; });
    for (var i = 0; i < types.length; i++) {
      var im = (E[types[i]] && E[types[i]].immune) || [];
      if (im.length && Object.keys(dealt).every(function (d) { return im.indexOf(d) >= 0; })) {
        var fix = keys.filter(function (k) { return T[k].damage > 0 && im.indexOf(T[k].damageType) < 0; }).sort(function (a, b) { return T[a].cost - T[b].cost; })[0];
        return E[types[i]].name + 's ignore ' + im.join(' and ') + ' damage, which is all you deal. ' + (fix ? 'Add a ' + T[fix].name + ' (' + T[fix].damageType + ').' : 'Mix in another damage type.');
      }
    }
    // The cheapest upgrade you can buy right now.
    var best = null, can = fn('canUpgrade');
    towers.forEach(function (t) {
      var d = T[t.type]; if (!d || !d.paths) return;
      d.paths.forEach(function (p, j) {
        var lv = t.pathLevels ? t.pathLevels[j] : 3; if (lv >= 3 || (can && !can(t, j))) return;
        var tier = p.tiers[lv]; if (tier.cost <= S.money && (!best || tier.cost < best.cost)) best = { cost: tier.cost, name: tier.name, path: p.label, tower: d.name };
      });
    });
    var boss = types.filter(function (k) { return E[k] && (E[k].boss || E[k].siege); })[0];
    if (boss && best) return 'A ' + E[boss].name + ' is ' + (busy ? 'on the road' : 'next') + '. Spend now: ' + best.name + ' (' + best.path + ') on your ' + best.tower + ' costs ' + best.cost + '.';
    if (S.rushCharge >= 100 && S.rush <= 0 && busy) return 'Royal Rush is charged: press R (or RUSH) while the pods are bunched up.';
    if (best) return 'You can afford ' + best.name + ' (' + best.path + ') on your ' + best.tower + ' for ' + best.cost + ' credits: tap the defender to upgrade it.';
    if (afford.length) return 'You have ' + S.money + ' credits: a ' + T[afford[afford.length - 1]].name + ' would cover more of the road.';
    if (!busy) return 'Ready? Press START WAVE (Space). ' + (call('nextWaveLabel') || '');
    return 'Hold on: pods pay out as they pop, and every cleared wave pays a bonus.';
  }

  /* ---------- codes ---------- */
  var label = null;
  function showLabel() {
    if (label) return;
    label = doc.createElement('div'); label.className = 'kd-codes-on'; label.textContent = 'CODES ON';
    ($('#ui') || doc.body).appendChild(label);
  }
  var slowed = false;
  var CODES = {
    KINGSGOLD: { effect: '+5,000 credits now and at the start of every mission', run: function () { if (KD.playing) { S.money += 5000; call('updateUI'); } } },
    IRONGATE: { effect: 'The gate never loses HP', run: function () {
      // Leaks still hit the gate (shake, sound) but its HP no longer drops, so it cannot be breached.
      var d = Object.getOwnPropertyDescriptor(S, 'lives'); if (d && d.get) return;
      var v = S.lives;
      Object.defineProperty(S, 'lives', { configurable: true, enumerable: true, get: function () { return v; }, set: function (n) { if (on.IRONGATE && !resetting && n < v) return; v = n; } });
    } },
    ALLHEROES: { effect: 'Every defender unlocked, whatever your rank', run: function () {
      W.rankLocked = function () { return false; };
      call('syncCards');
      doc.querySelectorAll('#roster .rosterCard.locked').forEach(function (c) {
        c.classList.remove('locked');
        var nm = c.querySelector('.rName'), cat = c.querySelector('.rCat'), k = Object.keys(KD.TYPES).filter(function (x) { return nm && KD.TYPES[x].name === nm.textContent; })[0];
        if (cat && k) cat.textContent = KD.TYPES[k].category.toUpperCase();
      });
    } },
    SLOWPODS: { effect: 'Every air-pod and carrier moves at half speed', run: function () {
      if (slowed) return; slowed = true;
      Object.keys(KD.ENEMIES).forEach(function (k) { KD.ENEMIES[k].speed *= 0.5; });
      (S.enemies || []).forEach(function (e) { e.speed *= 0.5; });
    } },
  };
  function cheat(code) {
    var key = String(code || '').trim().toUpperCase(), c = CODES[key];
    if (!c) return { ok: false };
    on[key] = true; c.run(); showLabel();
    if (KD.playing) call('toast', 'CODE ON — ' + c.effect.toUpperCase(), 'clear');
    return { ok: true, message: c.effect };
  }

  /* ---------- sound: music and announcer from audio/ (audio.json lists each file's gain) ----------
   * Music: menu.mp3 on the title, map screen and between waves; battle.mp3 while a wave runs; 1 s crossfades.
   * Announcer: wave / here at a wave start, boss on a siege or boss wave, final on the last wave, air when the
   * first pods of a mission appear, cleared, victory, defeat, and upgrade after a bought upgrade.
   * The game already synthesises shots, pops, build, sell and gate hits, so audio/sfx/ is not layered on top.
   * Volumes follow the game's own Settings (MASTER, SFX for the announcer, AMBIENCE for music) and its sound
   * button; the arcade's mute and pause cover this context like any other. Nothing loads before the first input. */
  var A = { ctx: null, man: null, bufs: {}, loading: {}, music: null, want: '', vo: null, next: null, mBus: null, vBus: null, lv: {} };
  function prefs() { try { return audioPrefs; } catch (e) { return { master: 0.7, sfx: 0.8, music: 0.35 }; } }   // eslint-disable-line no-undef
  function gameSound() { try { return soundOn !== false; } catch (e) { return true; } }                          // eslint-disable-line no-undef
  function rel(v, d) { return Math.max(0, Math.min(2.5, (+v || 0) / d)); }
  function fileGain(p) { return (A.man && A.man[p] && +A.man[p].gain) || 1; }
  function startAudio() {
    if (A.ctx) { if (A.ctx.state === 'suspended' && !SDK.paused) try { A.ctx.resume(); } catch (e) {} return; }
    var AC = W.AudioContext || W.webkitAudioContext; if (!AC || !W.fetch) return;
    try { A.ctx = new AC(); } catch (e) { A.ctx = null; return; }
    A.mBus = A.ctx.createGain(); A.vBus = A.ctx.createGain(); A.mBus.gain.value = 0; A.vBus.gain.value = 0;
    A.mBus.connect(A.ctx.destination); A.vBus.connect(A.ctx.destination);
    W.fetch('audio/audio.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }).then(function (m) {
      A.man = (m && m.files) || {};
      Object.keys(A.man).filter(function (p) { return /^(music|vo)\//.test(p); }).forEach(load);
      tickAudio();
    });
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (t) { W.addEventListener(t, startAudio, { capture: true, passive: true }); });
  function load(p) {
    if (A.bufs[p] !== undefined) return Promise.resolve(A.bufs[p]);
    if (!A.loading[p]) A.loading[p] = W.fetch('audio/' + p).then(function (r) { if (!r.ok) throw new Error(p); return r.arrayBuffer(); })
      .then(function (b) { return new Promise(function (res, rej) { A.ctx.decodeAudioData(b, res, rej); }); })
      .then(function (buf) { A.bufs[p] = buf; return buf; }, function () { A.bufs[p] = null; return null; });   // a missing file stays silent
    return A.loading[p];
  }
  function setLevel(bus, key, v) { if (bus && A.lv[key] !== v) { A.lv[key] = v; try { bus.gain.setTargetAtTime(v, A.ctx.currentTime, 0.08); } catch (e) {} } }
  function syncMusic() {
    if (!A.ctx || !A.man) return;
    var p = A.want, cur = A.music;
    if (cur && cur.p === p) return;
    var buf = p ? A.bufs[p] : null;
    if (p && buf === undefined) { load(p).then(syncMusic); return; }   // keep the old track until the new one is ready
    var t = A.ctx.currentTime;
    if (cur) { try { cur.g.gain.cancelScheduledValues(t); cur.g.gain.setValueAtTime(cur.g.gain.value, t); cur.g.gain.linearRampToValueAtTime(0, t + 1); cur.s.stop(t + 1.05); } catch (e) {} A.music = null; }
    if (!buf) return;
    var s = A.ctx.createBufferSource(), g = A.ctx.createGain();
    s.buffer = buf; s.loop = true; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.4 * fileGain(p), t + 1);
    s.connect(g); g.connect(A.mBus); s.start(t);
    A.music = { p: p, s: s, g: g };
  }
  function playVo(p) {
    var buf = A.bufs[p]; if (!buf) return;
    var s = A.ctx.createBufferSource(), g = A.ctx.createGain();
    s.buffer = buf; g.gain.value = 0.7 * fileGain(p); s.connect(g); g.connect(A.vBus);
    A.vo = s; s.onended = function () { if (A.vo === s) A.vo = null; var n = A.next; A.next = null; if (n) playVo(n); };
    s.start();
  }
  function say(name) {     // one line at a time; at most one waits its turn (the newest)
    var p = 'vo/' + name + '.mp3';
    if (!A.ctx || !A.bufs[p]) return;
    if (A.vo) A.next = p; else playVo(p);
  }
  var lastStart = -1e9, calmSince = 0, prevActive = false, airSaid = false;
  function tickAudio() {
    if (!A.ctx) return;
    var p = prefs(), on = gameSound() ? 1 : 0, now = performance.now();
    setLevel(A.mBus, 'm', on * rel(p.master, 0.7) * rel(p.music, 0.35));
    setLevel(A.vBus, 'v', on * rel(p.master, 0.7) * rel(p.sfx, 0.8));
    var live = (S.enemies || []).some(function (e) { return !e.dead; });
    if (KD.playing && live && !airSaid) { airSaid = true; say('air'); }
    if (prevActive && !KD.waveActive && KD.playing && S.lives > 0 && S.wave < KD.waves.length) say('cleared');
    prevActive = KD.waveActive;
    var busy = KD.playing && (KD.waveActive || live || now - lastStart < 3500);
    if (busy) { calmSince = 0; A.want = 'music/battle.mp3'; }
    else { if (!calmSince) calmSince = now; if (!KD.playing || now - calmSince > 4000) A.want = 'music/menu.mp3'; }   // AUTO chains waves: no ping-pong
    syncMusic();
  }
  W.setInterval(function () { syncMode(); tickAudio(); }, 150);
  wrap('startWave', function (orig) {
    return function () {
      var before = S.wave, r = orig.apply(this, arguments);
      if (S.wave > before) {
        call('updateUI');
        lastStart = performance.now(); A.want = 'music/battle.mp3'; syncMusic();
        var g = KD.waves[S.wave - 1] || [], E = KD.ENEMIES;
        var boss = g.some(function (x) { var e = E[x[0]] || {}; return e.boss || e.siege; });
        if (S.wave === KD.waves.length) say('final');
        else if (boss) say('boss');
        else if (S.wave > 1) say(S.wave % 2 ? 'here' : 'wave');   // wave 1 opens with "Air units incoming!" as the pods appear
      }
      return r;
    };
  });
  wrap('upgrade', function (orig) {
    return function () { var m = S.money, r = orig.apply(this, arguments); if (S.money < m) say('upgrade'); return r; };
  });
  function onRunStart() { airSaid = false; prevActive = false; calmSince = 0; }
  function onRunEnd(win) { say(win ? 'victory' : 'defeat'); }

  /* ---------- Music and Effects sliders in the arcade's How to play panel (the game's own volumes) ---------- */
  var volCss = doc.createElement('style');
  volCss.textContent = '#arcade-sdk .arc-vol{margin:6px 0 10px;text-align:left}#arcade-sdk .arc-vol label{display:flex;align-items:center;gap:12px;font-weight:800;font-size:14px;margin:2px 0}' +
    '#arcade-sdk .arc-vol label span{width:64px}#arcade-sdk .arc-vol input{flex:1;min-height:40px;border:0;padding:0;accent-color:#23b04b;background:none}';
  (doc.head || doc.body).appendChild(volCss);
  function setVolume(k, v) {
    var p = prefs(); p[k] = v; call('saveAudio');
    try { if (k === 'music' && musicBus) musicBus.gain.value = v; if (k === 'sfx' && sfxBus) sfxBus.gain.value = v; } catch (e) {}   // eslint-disable-line no-undef
    tickAudio();
  }
  function addSliders() {
    var c = $('#arcade-sdk.on .c'), h = c && c.querySelector('h2');
    if (!h || h.textContent !== 'How to play' || c.querySelector('.arc-vol')) return;
    var box = doc.createElement('div'); box.className = 'arc-vol';
    [['music', 'Music'], ['sfx', 'Effects']].forEach(function (k) {
      var lab = doc.createElement('label'), sp = doc.createElement('span'), inp = doc.createElement('input');
      sp.textContent = k[1]; inp.type = 'range'; inp.min = '0'; inp.max = '100'; inp.value = String(Math.round((+prefs()[k[0]] || 0) * 100));
      inp.setAttribute('aria-label', k[1] + ' volume');
      inp.addEventListener('input', function () { setVolume(k[0], +inp.value / 100); });
      lab.appendChild(sp); lab.appendChild(inp); box.appendChild(lab);
    });
    c.insertBefore(box, c.querySelector('[data-a="tutorial"]') || c.querySelector('[data-a="back"]'));
  }
  if (W.MutationObserver) {   // the arcade menu is built on first use; watch it (not the whole page) once it exists
    var menuWatch = new MutationObserver(addSliders), bodyWatch = new MutationObserver(function () {
      var m = doc.getElementById('arcade-sdk'); if (m) { bodyWatch.disconnect(); menuWatch.observe(m, { childList: true }); addSliders(); }
    });
    bodyWatch.observe(doc.body, { childList: true });
  }

  /* ---------- init ---------- */
  SDK.init({
    ownPauseUI: !!KD.playing,       // switched by syncMode (see above)
    onPause: onPause,
    onResume: onResume,
    pauseKeys: 'p',                 // the game does not use P; Esc stays "deselect"
    onRestart: restart,
    onExit: toTitle,
    onTutorial: tutorial,
    onHint: hint,
    onCheat: cheat,
  });
  syncMode();
  SDK.state({ scene: KD.playing ? 'play' : 'title' });
})();

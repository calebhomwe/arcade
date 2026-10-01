// A tiny arcade-style game used to test the harnesses. Behaviour is chosen by window.FIX.mode:
//   pass        works: title -> play -> game over -> play again, cheap frames, saves a best score
//   freeze      blocks the main thread for 8 s, 6 s into a run (busy loop on the wall clock)
//   hang        blocks the main thread forever, 6 s into a run
//   raf-dies    throws inside the animation loop 6 s in, so the loop is never re-scheduled (page still responds)
//   never-starts  the Play button does nothing and the game never reports `play`
//   key-only    starts only from the keyboard (no button)
//   jank        80 ms of JS work every frame (wall clock)
//   leak        keeps every frame's data forever and adds DOM nodes
//   reload      reloads the page by itself 8 s into a run
//   no-restart  game over screen whose Play again button does nothing (dead end)
// window.FIX.persist: 'none' | 'best' | 'rich' (best score + coins + unlocks + levels + daily streak, with the UI to show them)
(function () {
  var FIX = window.FIX || { mode: 'pass' }, mode = FIX.mode, persist = FIX.persist || 'best';
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('c'), g = cv.getContext('2d');
  function size() { cv.width = innerWidth; cv.height = innerHeight; } size(); addEventListener('resize', size);
  var scene = 'title', score = 0, t0 = 0, best = 0, coins = 0, level = 1, streak = 0, owned = ['red'], theme = 'red', junk = [];
  function LS(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} }
  if (persist !== 'none') best = +(LS('fix.best') || 0);
  if (persist === 'rich') {
    coins = +(LS('fix.coins') || 0); level = +(LS('fix.level') || 1); owned = JSON.parse(LS('fix.owned') || '["red"]'); theme = LS('fix.theme') || 'red';
    var today = new Date().toDateString(), last = LS('fix.lastDay'); streak = +(LS('fix.streak') || 0);
    if (last !== today) { streak = (last && (new Date(today) - new Date(last)) / 864e5 <= 1.5) ? streak + 1 : 1; LS('fix.lastDay', today); LS('fix.streak', String(streak)); coins += 10 * streak; LS('fix.coins', String(coins)); }
  }
  function hud() {
    $('hud').textContent = scene === 'play' ? 'Score ' + score + (persist !== 'none' ? '  Best ' + best : '') : '';
    var t = 'Fixture game';
    if (persist !== 'none') t += ' | Best: ' + best;
    if (persist === 'rich') t += ' | Level ' + level + ' | Coins ' + coins + ' | Daily streak: ' + streak + ' days';
    $('sub').textContent = t;
    if (persist === 'rich') $('shop').style.display = scene === 'title' ? 'block' : 'none';
  }
  function state(s) { try { window.ArcadeSDK && ArcadeSDK.state(s); } catch (e) {} }
  window.ArcadeSDK && ArcadeSDK.init({ onRestart: function () { start(); } });
  function show(id, on) { $(id).style.display = on ? 'flex' : 'none'; }
  function start() {
    scene = 'play'; score = 0; t0 = performance.now(); hooked = false; show('title', false); show('over', false); state({ scene: 'play', score: 0 }); hud();
  }
  function over() {
    scene = 'over'; show('over', true);
    if (persist !== 'none' && score > best) { best = score; LS('fix.best', String(best)); }
    if (persist === 'rich') { coins += score * 2; level += score >= 6 ? 1 : 0; LS('fix.coins', String(coins)); LS('fix.level', String(level)); }
    state({ scene: 'over', score: score }); hud();
  }
  $('play').onclick = function () { if (mode === 'never-starts') return; start(); };
  $('again').onclick = function () { if (mode === 'no-restart') return; start(); };
  if (mode === 'key-only') { $('play').style.display = 'none'; $('hint').textContent = 'Press Enter to start'; addEventListener('keydown', function (e) { if (scene === 'title' && (e.key === 'Enter' || e.key === ' ')) start(); }); }
  if ($('shop')) $('shop').onclick = function () { if (coins >= 20 && owned.indexOf('gold') < 0) { coins -= 20; owned.push('gold'); theme = 'gold'; LS('fix.coins', String(coins)); LS('fix.owned', JSON.stringify(owned)); LS('fix.theme', theme); hud(); } };
  cv.addEventListener('pointerdown', function () { if (scene === 'play') { score++; state({ scene: 'play', score: score }); hud(); } });
  var hooked = false, angle = 0;
  function frame() {
    if (mode === 'raf-dies' && scene === 'play' && performance.now() - t0 > 6000) throw new Error('fixture: the game loop threw and was never rescheduled');
    requestAnimationFrame(frame);
    angle += 0.05;
    g.fillStyle = theme === 'gold' ? '#3a2e00' : '#12203a'; g.fillRect(0, 0, cv.width, cv.height);
    for (var i = 0; i < 12; i++) { g.fillStyle = 'hsl(' + ((i * 30 + angle * 40) % 360) + ',80%,60%)'; g.beginPath(); g.arc(cv.width / 2 + Math.cos(angle + i) * 90, cv.height / 2 + Math.sin(angle * 1.3 + i) * 120, 14, 0, 6.3); g.fill(); }
    if (scene === 'play') {
      var el = performance.now() - t0;
      if (mode === 'jank') { var e0 = performance.now(); while (performance.now() - e0 < 80) {} }
      if (mode === 'leak') { junk.push(new Array(4000).fill(el)); for (var k = 0; k < 8; k++) { var d = document.createElement('div'); d.textContent = 'x'; $('junk').appendChild(d); } }
      if (!hooked && el > 6000) {
        hooked = true;
        if (mode === 'freeze') { var s = performance.now(); while (performance.now() - s < 8000) {} }
        if (mode === 'hang') { while (true) {} }
      }
      if (mode === 'reload' && el > 8000) location.reload();
      if (el > 12000 || score >= 12) over();
    }
  }
  show('title', true); show('over', false); state({ scene: 'title' }); hud();
  requestAnimationFrame(frame);
})();

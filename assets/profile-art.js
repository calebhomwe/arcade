/* Caleb's Arcade: the art for the player profile, drawn as SVG strings. No images to download.
 *
 * Twelve friendly buddies, eleven hats, twelve frames, and a badge template: one scalloped medal with two
 * ribbon tails, a metal rim for the tier (bronze, silver, gold, diamond), a coloured face for the family, and a
 * white glyph from the portal's icon sprite. Locked badges are the same medal in grey with a padlock.
 * Everything is flat shapes, so it stays sharp at any size and costs almost nothing to draw.
 */
(function (root) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- shared gradients, mounted once per page ---------- */
  var GRADS = {
    'pf-bronze': ['#f6c08a', '#b9692f'], 'pf-silver': ['#fbfcff', '#a3aec4'], 'pf-gold': ['#ffe78a', '#dd9c00'], 'pf-diamond': ['#d4f6ff', '#6fb8ff', '#b494ff'],
    'pf-locked': ['#d3d8e6', '#b3bad0'], 'pf-lockface': ['#e3e7f2', '#ced4e6'],
    'pf-start': ['#6bd0ff', '#2b86e4'], 'pf-streak': ['#ffb93f', '#ee5c17'], 'pf-explore': ['#45e3c4', '#0f9c88'], 'pf-learn': ['#86e04e', '#2f9a2a'], 'pf-score': ['#bd94ff', '#7446dc'],
    'pf-quest': ['#74b6ff', '#3566dc'], 'pf-level': ['#ffd24a', '#ee9a06'], 'pf-time': ['#97a3ff', '#5060d4'], 'pf-style': ['#ff93bf', '#dd4a86'], 'pf-game': ['#9aa9c0', '#586a86'],
    'pf-sunset': ['#ffb347', '#ff5f8a', '#8d5bff'], 'pf-goldring': ['#fff0a0', '#f2b500', '#c98700'], 'pf-lvl': ['#a78bfa', '#6d3fe0'], 'pf-xp': ['#ffd84a', '#7ee04a'], 'pf-flame': ['#ffd54a', '#ff5a1f']
  };
  function defs() {
    var s = '';
    for (var id in GRADS) { var c = GRADS[id]; s += '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' + c.map(function (col, i) { return '<stop offset="' + (c.length === 1 ? 0 : i / (c.length - 1)) + '" stop-color="' + col + '"/>'; }).join('') + '</linearGradient>'; }
    return s;
  }
  function mountDefs() {
    if (typeof document === 'undefined' || document.getElementById('pf-defs')) return;
    var d = document.createElement('div'); d.id = 'pf-defs'; d.setAttribute('aria-hidden', 'true'); d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    d.innerHTML = '<svg width="0" height="0" focusable="false"><defs>' + defs() + '</defs></svg>';
    (document.body || document.documentElement).insertBefore(d, (document.body || document.documentElement).firstChild);
  }

  /* ---------- buddies: 64x64 head-and-shoulders on a soft disc ---------- */
  function eye(x, y, r, col) { r = r || 3.1; return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + (col || '#23263a') + '"/><circle cx="' + (x + r * .32) + '" cy="' + (y - r * .36) + '" r="' + (r * .34).toFixed(2) + '" fill="#fff"/>'; }
  function blush(x, y) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="3.6" ry="2.4" fill="#ff7d9a" opacity=".45"/>'; }
  var smile = function (cx, y, w, col) { return '<path d="M' + (cx - w) + ' ' + y + ' Q' + cx + ' ' + (y + w * .95) + ' ' + (cx + w) + ' ' + y + '" fill="none" stroke="' + (col || '#23263a') + '" stroke-width="1.9" stroke-linecap="round"/>'; };
  var BUDDIES = {
    fox: { bg: '#ffe3c9', top: 17, art: function () {
      return '<path d="M13 30 L15 6 L29 18Z" fill="#f08a2b"/><path d="M51 30 L49 6 L35 18Z" fill="#f08a2b"/><path d="M18 24 L18.6 12.5 L25.5 18.5Z" fill="#7b3b14"/><path d="M46 24 L45.4 12.5 L38.5 18.5Z" fill="#7b3b14"/>' +
        '<path d="M11 36 C11 23 21 17 32 17 C43 17 53 23 53 36 C53 47 43 55 32 55 C21 55 11 47 11 36Z" fill="#f08a2b"/>' +
        '<path d="M32 55 C21 55 12.5 47.5 11.5 39 C18 43 25 42.5 32 47 C39 42.5 46 43 52.5 39 C51.5 47.5 43 55 32 55Z" fill="#fff8ef"/>' +
        '<path d="M32 22 C28.5 24.5 27 28 27 31 L37 31 C37 28 35.5 24.5 32 22Z" fill="#ffc98a" opacity=".55"/>' +
        eye(23.5, 35) + eye(40.5, 35) + '<ellipse cx="32" cy="44" rx="3.3" ry="2.4" fill="#2b1b13"/>' + '<path d="M32 46.5 V49 M28.6 49.4 Q32 52 35.4 49.4" fill="none" stroke="#2b1b13" stroke-width="1.7" stroke-linecap="round"/>' + blush(19, 42) + blush(45, 42); } },
    panda: { bg: '#dcf3e6', top: 18, art: function () {
      return '<circle cx="15.5" cy="21" r="7.4" fill="#2a2d3a"/><circle cx="48.5" cy="21" r="7.4" fill="#2a2d3a"/><ellipse cx="32" cy="36" rx="20.5" ry="18.5" fill="#fff"/>' +
        '<ellipse cx="23" cy="34.5" rx="5.6" ry="7.2" fill="#2a2d3a" transform="rotate(-18 23 34.5)"/><ellipse cx="41" cy="34.5" rx="5.6" ry="7.2" fill="#2a2d3a" transform="rotate(18 41 34.5)"/>' +
        '<circle cx="23.6" cy="34" r="2.6" fill="#fff"/><circle cx="40.4" cy="34" r="2.6" fill="#fff"/><circle cx="24" cy="34.4" r="1.5" fill="#23263a"/><circle cx="40" cy="34.4" r="1.5" fill="#23263a"/>' +
        '<path d="M28.6 41 Q32 38.6 35.4 41 Q35.4 44.6 32 45.2 Q28.6 44.6 28.6 41Z" fill="#2a2d3a"/>' + smile(32, 47.4, 3.4) + blush(17.5, 44) + blush(46.5, 44); } },
    owl: { bg: '#f1e4d2', top: 16, art: function () {
      return '<path d="M13 24 L12 8 L26 17Z" fill="#8f6238"/><path d="M51 24 L52 8 L38 17Z" fill="#8f6238"/><ellipse cx="32" cy="36" rx="21" ry="19.5" fill="#a5733f"/>' +
        '<path d="M32 26 C26 20 16 24 17 34 C18 44 26 50 32 50 C38 50 46 44 47 34 C48 24 38 20 32 26Z" fill="#f0d3a8"/>' +
        '<circle cx="24" cy="34" r="8.6" fill="#fff"/><circle cx="40" cy="34" r="8.6" fill="#fff"/><circle cx="24.6" cy="34.4" r="4.6" fill="#23263a"/><circle cx="39.4" cy="34.4" r="4.6" fill="#23263a"/><circle cx="26" cy="32.6" r="1.6" fill="#fff"/><circle cx="40.8" cy="32.6" r="1.6" fill="#fff"/>' +
        '<path d="M28.4 40.6 Q32 38.6 35.6 40.6 L32 47Z" fill="#ffae1f"/><path d="M22 52 q3 3 6 0 M30 53.4 q3 3 6 0 M38 52 q3 3 6 0" fill="none" stroke="#c99a63" stroke-width="1.6" stroke-linecap="round"/>' + blush(15.5, 42) + blush(48.5, 42); } },
    cat: { bg: '#e5e0ff', top: 19, art: function () {
      return '<path d="M13 32 L15 8 L30 19Z" fill="#8d97ac"/><path d="M51 32 L49 8 L34 19Z" fill="#8d97ac"/><path d="M18 26 L18.6 14 L26 19.6Z" fill="#ffb3c8"/><path d="M46 26 L45.4 14 L38 19.6Z" fill="#ffb3c8"/>' +
        '<ellipse cx="32" cy="37" rx="20.5" ry="18" fill="#9ba5ba"/><path d="M32 20 v6 M26.5 21.4 l1.4 5 M37.5 21.4 l-1.4 5" stroke="#6d788f" stroke-width="2" stroke-linecap="round"/>' +
        '<ellipse cx="32" cy="45.5" rx="9.5" ry="7" fill="#f6f7fb"/>' + eye(23.5, 35.5, 3.3) + eye(40.5, 35.5, 3.3) + '<path d="M29.6 42 h4.8 l-2.4 3z" fill="#ff7d9a"/>' +
        '<path d="M32 45 V47.4 M28.4 47.6 Q32 50 35.6 47.6" fill="none" stroke="#23263a" stroke-width="1.6" stroke-linecap="round"/><path d="M10 40 L20 42 M10 46 L20 45 M54 40 L44 42 M54 46 L44 45" stroke="#eef0f7" stroke-width="1.5" stroke-linecap="round" opacity=".9"/>' + blush(18, 43) + blush(46, 43); } },
    pup: { bg: '#ffebcf', top: 19, art: function () {
      return '<path d="M15 24 C6 26 4 42 10 50 C17 50 21 40 20 27Z" fill="#7b4a29"/><path d="M49 24 C58 26 60 42 54 50 C47 50 43 40 44 27Z" fill="#7b4a29"/><ellipse cx="32" cy="37" rx="19" ry="18.5" fill="#dea467"/>' +
        '<path d="M21 26 C25 22 29 22 30 28 C30 33 24 36 21 33 C18 31 18 28 21 26Z" fill="#a8703d" opacity=".75"/><ellipse cx="32" cy="45" rx="11" ry="8.5" fill="#f4d7ae"/>' +
        eye(24, 35, 3.2) + eye(40, 35, 3.2) + '<ellipse cx="32" cy="41" rx="4.6" ry="3.2" fill="#2a1d17"/><ellipse cx="30.6" cy="40" rx="1.3" ry=".8" fill="#fff" opacity=".7"/>' +
        '<path d="M32 44 V46.4 M27.6 46.4 Q32 50 36.4 46.4" fill="none" stroke="#2a1d17" stroke-width="1.6" stroke-linecap="round"/><path d="M29 48.4 h6 v2.6 a3 3 0 0 1 -6 0Z" fill="#ff7a93"/>' + blush(17.5, 43) + blush(46.5, 43); } },
    bunny: { bg: '#ffdfee', top: 21, art: function () {
      return '<ellipse cx="23.5" cy="13" rx="6.2" ry="15" fill="#fff" transform="rotate(-6 23.5 13)"/><ellipse cx="40.5" cy="13" rx="6.2" ry="15" fill="#fff" transform="rotate(6 40.5 13)"/>' +
        '<ellipse cx="23.5" cy="14" rx="3" ry="10" fill="#ffb8cf" transform="rotate(-6 23.5 14)"/><ellipse cx="40.5" cy="14" rx="3" ry="10" fill="#ffb8cf" transform="rotate(6 40.5 14)"/>' +
        '<ellipse cx="32" cy="39" rx="19" ry="17.5" fill="#fff"/>' + eye(24.5, 37, 3.2) + eye(39.5, 37, 3.2) + '<path d="M29.8 42.4 h4.4 l-2.2 2.8z" fill="#ff7d9a"/>' +
        '<path d="M32 45 V47 M28.6 47.4 Q32 50 35.4 47.4" fill="none" stroke="#23263a" stroke-width="1.6" stroke-linecap="round"/><rect x="29.6" y="48.6" width="2.3" height="3.6" rx="1" fill="#fff" stroke="#c9ccd9" stroke-width=".8"/><rect x="32.1" y="48.6" width="2.3" height="3.6" rx="1" fill="#fff" stroke="#c9ccd9" stroke-width=".8"/>' + blush(18, 44.5) + blush(46, 44.5); } },
    frog: { bg: '#dcf5d0', top: 24, art: function () {
      return '<ellipse cx="32" cy="40" rx="21.5" ry="16.5" fill="#5dbf47"/><circle cx="22" cy="24" r="8.4" fill="#5dbf47"/><circle cx="42" cy="24" r="8.4" fill="#5dbf47"/><circle cx="22" cy="24" r="6" fill="#fff"/><circle cx="42" cy="24" r="6" fill="#fff"/>' +
        '<circle cx="22.8" cy="24.6" r="3.2" fill="#23263a"/><circle cx="41.2" cy="24.6" r="3.2" fill="#23263a"/><circle cx="24" cy="23.2" r="1.1" fill="#fff"/><circle cx="42.4" cy="23.2" r="1.1" fill="#fff"/>' +
        '<ellipse cx="32" cy="46" rx="14" ry="7" fill="#a6e37a" opacity=".55"/><path d="M19.5 41.5 Q32 53 44.5 41.5" fill="none" stroke="#23263a" stroke-width="2" stroke-linecap="round"/><circle cx="29" cy="35" r="1" fill="#2f7d2c"/><circle cx="35" cy="35" r="1" fill="#2f7d2c"/>' + blush(16.5, 42.5) + blush(47.5, 42.5); } },
    penguin: { bg: '#d9ecff', top: 16, art: function () {
      return '<ellipse cx="32" cy="36" rx="19.5" ry="20" fill="#2a3552"/><path d="M32 30 C26 23 16.5 27 17.5 37 C18.5 46 26 52 32 52 C38 52 45.5 46 46.5 37 C47.5 27 38 23 32 30Z" fill="#fff"/>' +
        eye(25, 37, 3) + eye(39, 37, 3) + '<path d="M27.6 41.6 Q32 38 36.4 41.6 L32 47.2Z" fill="#ff9d1f"/>' + blush(20.5, 44) + blush(43.5, 44) + '<path d="M26 20 q6 -4 12 0" fill="none" stroke="#3b4972" stroke-width="2" stroke-linecap="round"/>'; } },
    dino: { bg: '#e0f7ec', top: 19, art: function () {
      return '<path d="M20 22 L23 9 L28 19Z" fill="#ffb640"/><path d="M28.5 19 L32 6 L35.5 19Z" fill="#ffb640"/><path d="M36 19 L41 9 L44 22Z" fill="#ffb640"/><ellipse cx="32" cy="38" rx="20.5" ry="18" fill="#4fcaa0"/>' +
        '<ellipse cx="32" cy="46" rx="14.5" ry="8.5" fill="#8ee6c6" opacity=".6"/><circle cx="23.5" cy="34" r="5.6" fill="#fff"/><circle cx="40.5" cy="34" r="5.6" fill="#fff"/><circle cx="24.4" cy="34.6" r="3" fill="#23263a"/><circle cx="39.6" cy="34.6" r="3" fill="#23263a"/><circle cx="25.5" cy="33.4" r="1" fill="#fff"/><circle cx="40.7" cy="33.4" r="1" fill="#fff"/>' +
        '<circle cx="28.6" cy="42" r="1.1" fill="#2a8e6c"/><circle cx="35.4" cy="42" r="1.1" fill="#2a8e6c"/><path d="M22.5 46.4 Q32 53.4 41.5 46.4" fill="#fff" stroke="#23263a" stroke-width="1.9" stroke-linejoin="round"/><path d="M27 48.6 l1.8 2.4 l1.8 -2 M33.2 49.4 l1.8 -2 l1.8 2.2" fill="none" stroke="#23263a" stroke-width="0" />' + blush(16.5, 42) + blush(47.5, 42); } },
    robot: { bg: '#e1e7f6', top: 19, art: function () {
      return '<rect x="30.4" y="9" width="3.2" height="11" rx="1.6" fill="#7f8fb0"/><circle cx="32" cy="8.4" r="3.6" fill="#ff6b57"/><circle cx="30.9" cy="7.3" r="1.1" fill="#fff" opacity=".8"/>' +
        '<rect x="7.5" y="30" width="5" height="12" rx="2.5" fill="#6f80a4"/><rect x="51.5" y="30" width="5" height="12" rx="2.5" fill="#6f80a4"/><rect x="11.5" y="19" width="41" height="34" rx="10" fill="#a9bbd8"/><rect x="11.5" y="19" width="41" height="12" rx="8" fill="#c3d1e8" opacity=".8"/>' +
        '<rect x="16.5" y="25" width="31" height="21" rx="7" fill="#232a44"/><rect x="21.6" y="30" width="7" height="9" rx="3.5" fill="#5ee6ff"/><rect x="35.4" y="30" width="7" height="9" rx="3.5" fill="#5ee6ff"/><rect x="23" y="31.2" width="2.2" height="2.6" rx="1.1" fill="#fff" opacity=".85"/><rect x="36.8" y="31.2" width="2.2" height="2.6" rx="1.1" fill="#fff" opacity=".85"/>' +
        '<path d="M27 42.4 Q32 45.8 37 42.4" fill="none" stroke="#5ee6ff" stroke-width="1.9" stroke-linecap="round"/><circle cx="16.5" cy="49" r="1.5" fill="#7f8fb0"/><circle cx="47.5" cy="49" r="1.5" fill="#7f8fb0"/>'; } },
    bear: { bg: '#f2e1cd', top: 17, art: function () {
      return '<circle cx="16.5" cy="21.5" r="7.6" fill="#9c6236"/><circle cx="47.5" cy="21.5" r="7.6" fill="#9c6236"/><circle cx="16.5" cy="21.5" r="3.6" fill="#e9bf94"/><circle cx="47.5" cy="21.5" r="3.6" fill="#e9bf94"/>' +
        '<ellipse cx="32" cy="37" rx="19.5" ry="18.5" fill="#ac6c3d"/><ellipse cx="32" cy="44.5" rx="9.6" ry="7.8" fill="#ecc79f"/>' + eye(23.5, 34.5) + eye(40.5, 34.5) + '<ellipse cx="32" cy="41" rx="3.8" ry="2.7" fill="#33200f"/>' +
        '<path d="M32 43.6 V46 M28.6 46.4 Q32 49.6 35.4 46.4" fill="none" stroke="#33200f" stroke-width="1.7" stroke-linecap="round"/>' + blush(17.5, 42) + blush(46.5, 42); } },
    koala: { bg: '#e6e8f2', top: 20, art: function () {
      return '<circle cx="13.5" cy="26" r="10.5" fill="#b3bac9"/><circle cx="50.5" cy="26" r="10.5" fill="#b3bac9"/><circle cx="13.5" cy="26" r="6" fill="#f4f5fa"/><circle cx="50.5" cy="26" r="6" fill="#f4f5fa"/>' +
        '<ellipse cx="32" cy="38" rx="18.5" ry="17.5" fill="#bfc6d4"/><ellipse cx="32" cy="47" rx="10" ry="6.4" fill="#e8ebf3"/>' + eye(23.5, 33.5, 2.9) + eye(40.5, 33.5, 2.9) + '<ellipse cx="32" cy="38.6" rx="5.2" ry="7.4" fill="#343949"/><ellipse cx="30.2" cy="35.4" rx="1.5" ry="2.3" fill="#fff" opacity=".45"/>' +
        smile(32, 48.4, 3) + blush(18, 43) + blush(46, 43); } }
  };

  /* ---------- hats: drawn with the crown of the head at (0,0), sitting on top ---------- */
  var HATS = {
    party: '<path d="M-10 3 L0 -24 L10 3Z" fill="#ff5c8a"/><path d="M-7 -6 L7 -6 M-9 -0.5 L9 -0.5" stroke="#ffe066" stroke-width="2.4"/><circle cx="0" cy="-25" r="3.6" fill="#ffe066"/><ellipse cx="0" cy="3" rx="11" ry="2.6" fill="#e04574"/><circle cx="-4" cy="-13" r="1.4" fill="#fff"/><circle cx="3.5" cy="-16.5" r="1.4" fill="#fff"/>',
    cap: '<path d="M-15 3 C-15 -15 15 -15 15 3Z" fill="#3ba6ff"/><path d="M-15 3 C-15 -15 0 -16 0 -15 C-6 -12 -8 -6 -8 3Z" fill="#69bcff" opacity=".6"/><path d="M-17 4 Q0 12 17 4 Q15 -1 0 -1.6 Q-15 -1 -17 4Z" fill="#1f7fd6"/><circle cx="0" cy="-14.6" r="2" fill="#1f7fd6"/><path d="M-3 -9 h6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
    beanie: '<path d="M-15.5 3 C-15.5 -14 15.5 -14 15.5 3Z" fill="#8b5cf6"/><path d="M-6 -11 V2 M0 -12.6 V2 M6 -11 V2" stroke="#7345e0" stroke-width="1.6"/><rect x="-16.5" y="-3" width="33" height="8.6" rx="4.3" fill="#6d3fe0"/><path d="M-11 -1 v4.6 M-5 -1 v4.6 M1 -1 v4.6 M7 -1 v4.6 M13 -1 v4.6" stroke="#5a2fcb" stroke-width="1.3" stroke-linecap="round"/><circle cx="0" cy="-15" r="4.6" fill="#fff"/><circle cx="-1.4" cy="-16.4" r="1.4" fill="#e8ecf8"/>',
    phones: '<path d="M-19.5 8 C-21 -17 21 -17 19.5 8" fill="none" stroke="#39405a" stroke-width="4" stroke-linecap="round"/><rect x="-24" y="2" width="9" height="15" rx="4.5" fill="#ff5c8a"/><rect x="15" y="2" width="9" height="15" rx="4.5" fill="#ff5c8a"/><rect x="-22" y="5" width="4" height="9" rx="2" fill="#ff8fb0"/><rect x="18" y="5" width="4" height="9" rx="2" fill="#ff8fb0"/>',
    flower: '<path d="M-19 5 C-13 -6 13 -6 19 5" fill="none" stroke="#4dbb54" stroke-width="3" stroke-linecap="round"/>' +
      [[-16.5, 1.6, '#ff7ab0'], [-8.5, -3.4, '#ffe066'], [0, -5, '#fff'], [8.5, -3.4, '#ff9ecb'], [16.5, 1.6, '#ffe066']].map(function (f) { return '<g transform="translate(' + f[0] + ' ' + f[1] + ')"><circle cx="0" cy="-3" r="2.6" fill="' + f[2] + '"/><circle cx="2.9" cy="-.9" r="2.6" fill="' + f[2] + '"/><circle cx="1.8" cy="2.4" r="2.6" fill="' + f[2] + '"/><circle cx="-1.8" cy="2.4" r="2.6" fill="' + f[2] + '"/><circle cx="-2.9" cy="-.9" r="2.6" fill="' + f[2] + '"/><circle cx="0" cy="0" r="2" fill="#ff9f1c"/></g>'; }).join(''),
    chef: '<rect x="-13.5" y="-4" width="27" height="9" rx="2.4" fill="#fff" stroke="#c3cbdd" stroke-width="1.5"/><circle cx="-8.5" cy="-11" r="7.2" fill="#fff" stroke="#c3cbdd" stroke-width="1.5"/><circle cx="8.5" cy="-11" r="7.2" fill="#fff" stroke="#c3cbdd" stroke-width="1.5"/><circle cx="0" cy="-15" r="8.4" fill="#fff" stroke="#c3cbdd" stroke-width="1.5"/><rect x="-13" y="-4.6" width="26" height="9" rx="2.4" fill="#fff"/><path d="M-9 0.4 h18" stroke="#e6eaf4" stroke-width="1.4"/>',
    wizard: '<path d="M-17 4 C-8 2 -3 -12 0 -33 C3 -12 8 2 17 4Z" fill="#5b3fd0"/><ellipse cx="0" cy="4" rx="23" ry="4.8" fill="#4a30b0"/><path d="M-11 -1.4 Q0 2.4 11 -1.4" fill="none" stroke="#ffc21a" stroke-width="3.2"/><path d="M-3 -14 l1.2 2.4 2.6 .4 -1.9 1.8 .5 2.6 -2.4 -1.3 -2.4 1.3 .5 -2.6 -1.9 -1.8 2.6 -.4z" fill="#ffe066" transform="translate(1.5 -4) scale(.9)"/><circle cx="6" cy="-6" r="1.3" fill="#ffe066"/>',
    prop: '<path d="M-14 3 C-14 -13 14 -13 14 3Z" fill="#ff5a4f"/><path d="M-14 3 C-14 -13 -1 -14 -1 -13.6 C-6 -10.5 -7 -5 -7 3Z" fill="#ff8378" opacity=".7"/><path d="M-16 4 Q0 11 16 4 Q14 -0.4 0 -1 Q-14 -0.4 -16 4Z" fill="#d43a30"/><rect x="-1.4" y="-19" width="2.8" height="7" rx="1.2" fill="#8090b0"/><ellipse cx="-8" cy="-19.5" rx="8" ry="2.6" fill="#ffd23f" transform="rotate(-8 -8 -19.5)"/><ellipse cx="8" cy="-19.5" rx="8" ry="2.6" fill="#3ba6ff" transform="rotate(8 8 -19.5)"/><circle cx="0" cy="-19.5" r="2.2" fill="#ff5a4f"/>',
    star: '<path d="M-19 7 C-14 -8 14 -8 19 7" fill="none" stroke="#7b4cf0" stroke-width="3.6" stroke-linecap="round"/><path d="M0 -17 l3.3 6.8 7.4 1 -5.4 5.2 1.3 7.4 -6.6 -3.6 -6.6 3.6 1.3 -7.4 -5.4 -5.2 7.4 -1z" fill="#ffd23f" stroke="#e0a800" stroke-width="1.2" stroke-linejoin="round" transform="translate(0 6) scale(.62)"/>',
    crown: '<path d="M-16 4 L-17 -11 L-8.5 -3.4 L0 -15 L8.5 -3.4 L17 -11 L16 4Z" fill="#ffc21a" stroke="#dd9a00" stroke-width="1.6" stroke-linejoin="round"/><rect x="-16" y="0" width="32" height="5.4" rx="2" fill="#f5a900"/><circle cx="-17" cy="-12" r="2.4" fill="#ff5c8a"/><circle cx="0" cy="-16.4" r="2.6" fill="#5ee6ff"/><circle cx="17" cy="-12" r="2.4" fill="#ff5c8a"/><circle cx="-8" cy="2.7" r="1.4" fill="#fff"/><circle cx="0" cy="2.7" r="1.4" fill="#fff"/><circle cx="8" cy="2.7" r="1.4" fill="#fff"/>',
    space: '<path d="M-27 38 C-32 -32 32 -32 27 38Z" fill="#9fdcff" fill-opacity=".26" stroke="#e6efff" stroke-width="3.4" stroke-linejoin="round"/><path d="M-18 -6 C-14 -17 -4 -22 6 -21" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" opacity=".9"/><path d="M14 -14 l3 -1" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".7"/><rect x="-29" y="36" width="58" height="8" rx="4" fill="#e6efff" stroke="#b9c8e6" stroke-width="1.2"/><circle cx="-18" cy="40" r="1.5" fill="#8fa2c9"/><circle cx="18" cy="40" r="1.5" fill="#8fa2c9"/><rect x="-3" y="37.6" width="6" height="4.8" rx="1.6" fill="#ff6b57"/>'
  };

  /* ---------- frames: rings around the disc (r = 32). Drawn over the picture, inside the -6..70 viewBox. ---------- */
  function ringArc(cols, r, w) { return cols.map(function (c, i) { return '<circle cx="32" cy="32" r="' + r + '" fill="none" stroke="' + c + '" stroke-width="' + w + '" pathLength="' + cols.length + '" stroke-dasharray="1 ' + (cols.length - 1) + '" stroke-dashoffset="' + (-i) + '" transform="rotate(-90 32 32)"/>'; }).join(''); }
  function around(n, r, fn) { var s = ''; for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2 - Math.PI / 2; s += fn(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, a * 180 / Math.PI + 90, i); } return s; }
  function spark(x, y, s, col) { x = +x; y = +y; var k = s * .3; return '<path d="M' + x + ' ' + (y - s) + ' L' + (x + k) + ' ' + (y - k) + ' L' + (x + s) + ' ' + y + ' L' + (x + k) + ' ' + (y + k) + ' L' + x + ' ' + (y + s) + ' L' + (x - k) + ' ' + (y + k) + ' L' + (x - s) + ' ' + y + ' L' + (x - k) + ' ' + (y - k) + 'Z" fill="' + col + '" stroke="#4b3fc8" stroke-width="1" stroke-linejoin="round"/>'; }
  var FRAMES = {
    plain: function () { return '<circle cx="32" cy="32" r="32" fill="none" stroke="#fff" stroke-width="2.4" opacity=".9"/><circle cx="32" cy="32" r="33.4" fill="none" stroke="#000" stroke-width="1" opacity=".08"/>'; },
    sky: function () { return '<circle cx="32" cy="32" r="33" fill="none" stroke="#3fa9ff" stroke-width="5"/><circle cx="32" cy="32" r="30.2" fill="none" stroke="#fff" stroke-width="1.4" opacity=".7"/>'; },
    mint: function () { return '<circle cx="32" cy="32" r="33" fill="none" stroke="#27d3a0" stroke-width="5"/><circle cx="32" cy="32" r="30.2" fill="none" stroke="#fff" stroke-width="1.4" opacity=".7"/>'; },
    sunset: function () { return '<circle cx="32" cy="32" r="33" fill="none" stroke="url(#pf-sunset)" stroke-width="5.4"/><circle cx="32" cy="32" r="30" fill="none" stroke="#fff" stroke-width="1.2" opacity=".6"/>'; },
    gold: function () { return '<circle cx="32" cy="32" r="33.2" fill="none" stroke="#c98700" stroke-width="6.4"/><circle cx="32" cy="32" r="33.2" fill="none" stroke="url(#pf-goldring)" stroke-width="4.6"/><circle cx="32" cy="32" r="31" fill="none" stroke="#fff6c2" stroke-width="1.2" opacity=".8"/>'; },
    rainbow: function () { return ringArc(['#ff4d6d', '#ff9f1c', '#ffd23f', '#3ddc84', '#3fa9ff', '#8b5cf6'], 33.2, 5.4) + '<circle cx="32" cy="32" r="30" fill="none" stroke="#fff" stroke-width="1.2" opacity=".6"/>'; },
    flame: function () { return around(16, 30.5, function (x, y, a, i) { return '<path d="M-4.2 1 Q-1 ' + (i % 2 ? -6 : -9.5) + ' 0 ' + (i % 2 ? -8 : -12) + ' Q1 ' + (i % 2 ? -6 : -9.5) + ' 4.2 1Z" transform="translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') rotate(' + a.toFixed(1) + ')" fill="' + (i % 2 ? '#ffb02e' : '#ff5a1f') + '"/>'; }) + '<circle cx="32" cy="32" r="32.6" fill="none" stroke="#ff7a1a" stroke-width="4.6"/><circle cx="32" cy="32" r="30" fill="none" stroke="#ffe08a" stroke-width="1.4" opacity=".8"/>'; },
    stars: function () { return '<circle cx="32" cy="32" r="33" fill="none" stroke="#4b3fc8" stroke-width="5.4"/><circle cx="32" cy="32" r="30.2" fill="none" stroke="#9a8cff" stroke-width="1.2" opacity=".8"/>' + around(8, 32.6, function (x, y, a, i) { return spark(x.toFixed(1), y.toFixed(1), i % 2 ? 4 : 6, i % 2 ? '#fff' : '#ffd23f'); }); },
    pixel: function () { return around(16, 33, function (x, y, a, i) { return '<rect x="' + (x - 3).toFixed(1) + '" y="' + (y - 3).toFixed(1) + '" width="6" height="6" fill="' + ['#22e0ff', '#ff4fb8', '#ffd23f', '#7cff6b'][i % 4] + '" stroke="#1d2038" stroke-width="1.1" transform="rotate(' + a.toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>'; }); },
    neon: function () { return '<circle cx="32" cy="32" r="33" fill="none" stroke="#ff2bd6" stroke-width="7" opacity=".28"/><circle cx="32" cy="32" r="33" fill="none" stroke="#ff2bd6" stroke-width="3.4"/><circle cx="32" cy="32" r="30.2" fill="none" stroke="#22e6ff" stroke-width="3"/><circle cx="32" cy="32" r="30.2" fill="none" stroke="#fff" stroke-width="1" opacity=".8"/>'; },
    laurel: function () {
      function branch(sign) {
        var s = '';
        for (var i = 0; i < 9; i++) {
          var th = (18 + i * 13) * Math.PI / 180, x = 32 + sign * Math.sin(th) * 33.4, y = 32 + Math.cos(th) * 33.4, tang = Math.atan2(-Math.sin(th) * 1, sign * Math.cos(th)) * 180 / Math.PI;
          s += '<ellipse cx="0" cy="0" rx="3.1" ry="6.2" fill="' + (i % 2 ? '#3fae57' : '#78cf5a') + '" stroke="#2c8a45" stroke-width=".8" transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (tang + 90 + (i % 2 ? 24 : -24) * sign).toFixed(1) + ')"/>';
        }
        return s;
      }
      return '<circle cx="32" cy="32" r="32.6" fill="none" stroke="#e0a400" stroke-width="2.6"/>' + branch(-1) + branch(1) + '<circle cx="32" cy="66.4" r="3" fill="#e0a400"/>'; },
    diamond: function () { return '<circle cx="32" cy="32" r="33" fill="none" stroke="#7fdcff" stroke-width="5"/><circle cx="32" cy="32" r="30.4" fill="none" stroke="#fff" stroke-width="1.4" opacity=".9"/>' + [[32, -2], [66, 32], [32, 66], [-2, 32]].map(function (p) { return '<path d="M' + p[0] + ' ' + (p[1] - 6) + ' L' + (p[0] + 5) + ' ' + p[1] + ' L' + p[0] + ' ' + (p[1] + 6) + ' L' + (p[0] - 5) + ' ' + p[1] + 'Z" fill="#dff8ff" stroke="#3fb4ff" stroke-width="1.6" stroke-linejoin="round"/>'; }).join(''); }
  };

  /* ---------- put a buddy together ---------- */
  var FIT = 'translate(4.6 7.4) scale(.855)';   // the buddy sits a little smaller so tall hats stay inside the picture
  function avatar(o) {
    o = o || {}; var b = BUDDIES[o.avatar] || BUDDIES.fox, size = o.size || 64, fr = FRAMES[o.frame] || FRAMES.plain, hat = HATS[o.hat] || '';
    return '<svg class="pf-av" viewBox="-6 -6 76 76" width="' + size + '" height="' + size + '" role="img" aria-label="' + (o.label || 'Profile picture') + '"><circle cx="32" cy="32" r="32" fill="' + b.bg + '"/><g transform="' + FIT + '">' + b.art() + '</g>' + fr() +
      (hat ? '<g transform="' + FIT + '"><g transform="translate(32 ' + b.top + ')">' + hat + '</g></g>' : '') + '</svg>';
  }
  function avatarBare(id) { var b = BUDDIES[id] || BUDDIES.fox; return '<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="' + b.bg + '"/>' + b.art() + '</svg>'; }
  var HAT_BOX = { party: [-14, -30, 28, 36], cap: [-19, -19, 38, 30], beanie: [-19, -21, 38, 30], phones: [-27, -22, 54, 42], flower: [-23, -16, 46, 28], chef: [-17, -26, 34, 36], wizard: [-25, -36, 50, 46], prop: [-19, -25, 38, 36], star: [-23, -18, 46, 34], crown: [-21, -22, 42, 32], space: [-31, -26, 62, 74] };
  function hatPreview(id) { var b = HAT_BOX[id] || [-28, -38, 56, 58]; return '<svg viewBox="' + b.join(' ') + '" width="100%" height="100%" aria-hidden="true" preserveAspectRatio="xMidYMid meet">' + (HATS[id] || '') + '</svg>'; }
  function framePreview(id) { return '<svg viewBox="-6 -6 76 76" width="100%" height="100%" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#e9edf8"/>' + (FRAMES[id] || FRAMES.plain)() + '</svg>'; }

  /* ---------- the badge medal ---------- */
  var scallop = (function () { var pts = [], n = 96; for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2, r = 33.5 + 2.1 * Math.cos(a * 14); pts.push((48 + Math.cos(a) * r).toFixed(1) + ' ' + (44 + Math.sin(a) * r).toFixed(1)); } return 'M' + pts.join('L') + 'Z'; })();
  var LABEL = { time: function (n) { return n >= 60 ? (n / 60) + 'h' : n + 'm'; } };
  function badgeLabel(id) {
    var m = /^(streak|level|games|stars|runs|pb|quests|time|learn|days|fav|triple)-(\d+)$/.exec(id); if (!m) return '';
    var n = +m[2]; if (m[1] === 'time') return n >= 60 ? (n / 60) + 'h' : n + 'm'; if (m[1] === 'learn' && n >= 30) return n >= 60 ? (n / 60) + 'h' : n + 'm'; if (m[1] === 'learn') return '';
    if (m[1] === 'level') return 'Lv' + n; if (m[1] === 'streak') return n + 'd'; return n > 999 ? '' : String(n);
  }
  function badge(a, o) {
    o = o || {}; var done = o.done !== false && (a.done !== false), fam = a.fam || 'start', tier = a.tier || 'bronze', size = o.size || 96, label = a.label != null ? a.label : badgeLabel(a.id || ''), s = '';
    var rim = done ? 'url(#pf-' + tier + ')' : 'url(#pf-locked)', face = done ? 'url(#pf-' + fam + ')' : 'url(#pf-lockface)', ink = done ? '#fff' : '#9aa3bd';
    s += '<svg class="pf-badge' + (done ? '' : ' locked') + '" viewBox="0 0 96 100" width="' + size + '" height="' + Math.round(size * 100 / 96) + '" role="img" aria-label="' + (a.title || 'Badge') + (done ? '' : ', locked') + '">';
    s += '<path d="M31 66 L22 94 L35 88.5 L42 97.5 L48 68Z" fill="' + (done ? '#3a4a8a' : '#aeb6cc') + '"/><path d="M65 66 L74 94 L61 88.5 L54 97.5 L48 68Z" fill="' + (done ? '#4c5fb0' : '#bec5d9') + '"/>';
    s += '<path d="' + scallop + '" fill="' + rim + '"/><path d="' + scallop + '" fill="none" stroke="#000" stroke-opacity=".14" stroke-width="1.4"/>';
    s += '<circle cx="48" cy="44" r="27.4" fill="#000" opacity=".18" transform="translate(0 1.6)"/><circle cx="48" cy="44" r="27.4" fill="' + face + '"/>';
    if (done) s += '<path d="M25 38 A24 24 0 0 1 60 22" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" opacity=".38"/>';
    s += '<circle cx="48" cy="44" r="24.6" fill="none" stroke="' + (done ? '#fff' : '#f3f5fb') + '" stroke-opacity="' + (done ? '.55' : '.7') + '" stroke-width="1.4" stroke-dasharray="2.2 3.2"/>';
    var gy = label ? 22 : 26, gs = label ? 32 : 38, gx = 48 - gs / 2;
    s += '<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.1">' + (done ? '<use href="#i-' + (a.glyph || 'star') + '" x="' + gx + '" y="' + (gy + 1.6) + '" width="' + gs + '" height="' + gs + '" stroke="#000" stroke-opacity=".26"/>' : '') +
      '<use href="#i-' + (a.glyph || 'star') + '" x="' + gx + '" y="' + gy + '" width="' + gs + '" height="' + gs + '" stroke="' + ink + '"/></g>';
    if (label && done) s += '<rect x="' + (48 - Math.max(11, label.length * 4.4 + 5)) + '" y="55.5" width="' + Math.max(22, label.length * 8.8 + 10) + '" height="13.5" rx="6.75" fill="#fff"/><text x="48" y="65.6" text-anchor="middle" font-size="10.5" font-weight="900" fill="#39406a" font-family="Nunito,system-ui,sans-serif">' + label + '</text>';
    if (!done) s += '<circle cx="70" cy="66" r="10.5" fill="#6f7897" stroke="#fff" stroke-width="2"/><g fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><use href="#i-lock" x="63.4" y="59.4" width="13.2" height="13.2" stroke="#fff"/></g>';
    return s + '</svg>';
  }

  /* ---------- level badge, level ring, flame ---------- */
  function levelBadge(n, size) {
    size = size || 34; var t = String(n), fs = t.length > 2 ? 15 : t.length > 1 ? 17 : 19;
    return '<svg class="pf-lvl" viewBox="0 0 40 44" width="' + size + '" height="' + Math.round(size * 1.1) + '" role="img" aria-label="Level ' + n + '"><path d="M20 2.6 L35.6 11.2 V29.4 L20 41.4 L4.4 29.4 V11.2Z" fill="#4a2bb0" transform="translate(0 2)" stroke-linejoin="round" stroke="#4a2bb0" stroke-width="4"/><path d="M20 2.6 L35.6 11.2 V29.4 L20 41.4 L4.4 29.4 V11.2Z" fill="url(#pf-lvl)" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><text x="20" y="' + (fs > 17 ? 28 : 27.4) + '" text-anchor="middle" font-size="' + fs + '" font-weight="900" fill="#fff" font-family="Fredoka,Nunito,system-ui,sans-serif" style="paint-order:stroke" stroke="#4a2bb0" stroke-width="2.2" stroke-linejoin="round">' + t + '</text></svg>';
  }
  function ring(pct, size, w) {
    w = w || 4; var r = 50 - w / 2;
    return '<svg class="pf-ring" viewBox="0 0 100 100" width="' + size + '" height="' + size + '" aria-hidden="true"><circle cx="50" cy="50" r="' + r + '" fill="none" stroke="currentColor" stroke-opacity=".18" stroke-width="' + w + '"/><circle cx="50" cy="50" r="' + r + '" fill="none" stroke="url(#pf-xp)" stroke-width="' + w + '" stroke-linecap="round" pathLength="100" stroke-dasharray="' + Math.max(0.01, Math.min(100, pct * 100)).toFixed(2) + ' 100" transform="rotate(-90 50 50)"/></svg>';
  }
  function flame(lit, size) {
    size = size || 20;
    return '<svg class="pf-flame' + (lit ? ' lit' : '') + '" viewBox="0 0 24 26" width="' + size + '" height="' + Math.round(size * 26 / 24) + '" aria-hidden="true"><path d="M12 1.5c.9 4-2.2 6-4 8.6C6.4 12.4 5.2 14.6 5.2 17.2c0 4.3 3 7.3 6.8 7.3s6.8-3 6.8-7.3c0-2.6-1.2-4.6-2.6-6.4-.5 1.8-1.4 2.9-2.6 3.3.6-4-.3-8.4-2.6-12.6z" fill="' + (lit ? 'url(#pf-flame)' : '#b9bfd3') + '" stroke="' + (lit ? '#e0500f' : '#98a0b8') + '" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 24.5c-2.1 0-3.6-1.5-3.6-3.6 0-1.9 1.6-3 2.6-4.6.5 1.2 1.5 1.7 2.3 1.9.6 1 .9 1.9.9 2.7 0 2-.9 3.6-2.2 3.6z" fill="' + (lit ? '#fff2b0' : '#dde1ec') + '"/></svg>';
  }
  function star(size) { size = size || 16; return '<svg class="pf-star" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true"><path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.2 1.2-6.5L2.5 9.5l6.6-.9z" fill="#ffc21a" stroke="#e59a00" stroke-width="1.6" stroke-linejoin="round"/></svg>'; }

  root.ArcadeArt = { avatar: avatar, avatarBare: avatarBare, hatPreview: hatPreview, framePreview: framePreview, badge: badge, badgeLabel: badgeLabel, levelBadge: levelBadge, ring: ring, flame: flame, star: star, mountDefs: mountDefs, BUDDIES: Object.keys(BUDDIES), HATS: Object.keys(HATS), FRAMES: Object.keys(FRAMES), GRADS: GRADS };
})(typeof self !== 'undefined' ? self : this);

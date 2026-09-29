// The monkey bot: realistic phone input, plus the start logic of iphone.mjs.
//   taps weighted towards visible buttons and the middle of the canvas, thumb-zone taps, swipes in four directions,
//   press-and-hold with a drag, keyboard keys for keyboard games, and it presses continue / play again / next
//   buttons so it gets through game-over and level-complete screens. It never presses Exit / Quit / Reset / Delete.
// Chromium: real touches through CDP Input.dispatchTouchEvent. WebKit: Playwright only offers tap(), so swipes and holds are
// synthetic TouchEvent + PointerEvent dispatches (tap() itself is a real touch in both engines).
import { wait, ENGINE } from './common.mjs';

export const CONTINUE = /^\s*(?:[▶►⏵▷]\s*)?(?:play again|play on|play now|play|start(?: game| playing| run| level| shift| day| round| race| wave| cooking| mining)?|tap to .{0,24}|tap anywhere.*|continue|next(?: level| day| round| wave| stage| question| word)?|try again|retry|restart|again|ok(?:ay)?|got it|let'?s (?:go|play|cook|race)|go!?|begin|done|claim.*|collect.*|skip|resume|awesome|great|yes|confirm|new (?:game|run|day)|race again|keep (?:going|playing)|close|dismiss|open|select|choose|easy|normal|pick|let me in|i'?m ready|ready)\b/i;
export const AVOID = /\b(exit|quit|arcade home|all games|leave|reset (?:progress|save|game|data|all)|erase|delete|wipe|clear (?:data|save|progress)|log ?in|sign ?in|share|feedback|donate|purchase|download|install|privacy|terms|fullscreen|cheats?|codes?)\b/i;
const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Digit1', 'Digit2', 'KeyE', 'KeyZ', 'KeyX'];

// Runs in the page: what is on screen that a finger could press?
const PROBE = () => {
  const vw = innerWidth, vh = innerHeight, items = [], seen = new Set();
  const txtOf = el => ((el.innerText || el.value || el.getAttribute('aria-label') || el.title || el.alt || '') + '').replace(/\s+/g, ' ').trim().slice(0, 48);
  const add = (el, kind) => {
    if (seen.has(el)) return; seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8 || r.width > vw * 0.98 && r.height > vh * 0.9) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > vw || cy > vh) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.06 || cs.pointerEvents === 'none') return;
    const top = document.elementFromPoint(cx, cy);
    if (!top || !(top === el || el.contains(top) || top.contains(el))) return;
    let href = el.tagName === 'A' ? (el.getAttribute('href') || '') : '';
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    items.push({ x: cx, y: cy, w: r.width, h: r.height, txt: txtOf(el), tag: el.tagName, id: el.id || '', cls: (el.className && el.className.baseVal === undefined ? String(el.className) : '').slice(0, 40), sdk: !!(el.closest && el.closest('[id^="arcade-sdk"]')), href, kind });
  };
  document.querySelectorAll('button,[role=button],a[href],input[type=button],input[type=submit],summary,.btn,[onclick],label').forEach(e => add(e, 'ctl'));
  // things that only look like buttons: cursor:pointer (bounded scan)
  let n = 0;
  for (const el of document.querySelectorAll('div,span,li,img,svg,td,p,h1,h2,h3,canvas')) {
    if (++n > 700) break;
    if (seen.has(el)) continue;
    const r = el.getBoundingClientRect(); if (r.width < 14 || r.height < 14 || r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh) continue;
    if (el.tagName === 'CANVAS') continue;
    if (getComputedStyle(el).cursor === 'pointer') add(el, 'ptr');
  }
  let canvas = null, best = 0;
  document.querySelectorAll('canvas').forEach(c => { const r = c.getBoundingClientRect(), a = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)); if (a > best) { best = a; canvas = { x: r.left, y: r.top, w: r.width, h: r.height, cover: a / (vw * vh) }; } });
  const sdk = window.ArcadeSDK, menu = document.querySelector('#arcade-sdk-root.on');
  return { vw, vh, items: items.slice(0, 80), canvas, paused: !!(sdk && sdk.paused), menuOpen: !!menu, text: (document.body && document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1500), url: location.href };
};

const TOUCH = ([type, x, y]) => {   // WebKit only: synthetic touch + pointer events on the element under the finger
  const H = window.__Hbot = window.__Hbot || {};
  if (type === 'start') H.target = document.elementFromPoint(x, y) || document.body;
  const target = H.target || document.body, id = 71;
  // iOS-style WebKit has no Touch constructor: build the touch with document.createTouch, and lists with createTouchList
  const mk = () => { try { if (document.createTouch) return document.createTouch(window, target, id, x + scrollX, y + scrollY, x, y); return new Touch({ identifier: id, target, clientX: x, clientY: y, pageX: x + scrollX, pageY: y + scrollY, screenX: x, screenY: y, radiusX: 11, radiusY: 11, force: 0.5 }); } catch (e) { return null; } };
  const t = mk(), ends = type === 'end';
  const pe = { pointerId: id, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true, width: 22, height: 22, pressure: ends ? 0 : 0.5, button: 0, buttons: ends ? 0 : 1 };
  const te = name => {
    if (!t) return false;
    try {
      const list = document.createTouchList ? document.createTouchList(t) : [t], none = document.createTouchList ? document.createTouchList() : [];
      target.dispatchEvent(new TouchEvent(name, { touches: name === 'touchend' ? none : list, targetTouches: name === 'touchend' ? none : list, changedTouches: list, bubbles: true, cancelable: true, composed: true }));
      return true;
    } catch (e) { return false; }
  };
  let ok = false;
  if (type === 'start') { target.dispatchEvent(new PointerEvent('pointerdown', pe)); ok = te('touchstart'); }
  else if (type === 'move') { target.dispatchEvent(new PointerEvent('pointermove', pe)); ok = te('touchmove'); }
  else { target.dispatchEvent(new PointerEvent('pointerup', pe)); ok = te('touchend'); H.target = null; }
  return ok;
};

// A finger taps where the button is; Playwright's tap() also waits for the element to hold still, which a pulsing Play button
// never does. So: try the normal tap, and if that times out, tap the centre of the button, but only when that spot really hits it.
// (Same approach as fingerTap in iphone.mjs; without it a pulsing Play button reads as "cannot start".)
export async function fingerTap(page, loc, timeout = 3000) {
  if (await loc.tap({ timeout }).then(() => true).catch(() => false)) return true;
  const box = await loc.boundingBox().catch(() => null);
  if (!box || box.width < 4 || box.height < 4) return false;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const el = await loc.elementHandle().catch(() => null);
  if (!el) return false;
  const hits = await el.evaluate((n, [px, py]) => { const t = document.elementFromPoint(px, py); return !!t && (n === t || n.contains(t) || t.contains(n)); }, [x, y]).catch(() => false);
  if (!hits) return false;
  await page.touchscreen.tap(x, y).catch(() => {});
  return true;
}

export function makeBot(page, ctx, { rand, hasPlay, keyboard = false, startKey = null, seedText = '' }) {
  const stats = { taps: 0, swipes: 0, holds: 0, keys: 0, buttons: 0, resumes: 0, timeouts: 0, navAway: 0, lat: [], touchApi: null };
  let cdp = null;
  const vp = page.viewportSize() || { width: 390, height: 664 };
  const R = (a, b) => a + rand() * (b - a);
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += rand(); return (u - 2) / 0.58; };   // ~N(0,1)
  const clampX = x => Math.max(4, Math.min(vp.width - 4, x)), clampY = y => Math.max(4, Math.min(vp.height - 4, y));

  const timed = async fn => {   // a frozen page does not answer input: measure how long it takes and give up after 4 s
    const t0 = Date.now();
    const r = await Promise.race([Promise.resolve().then(fn).then(() => 'ok', () => 'err'), wait(4000).then(() => 'timeout')]);
    const ms = Date.now() - t0; stats.lat.push(ms); if (r === 'timeout') stats.timeouts++;
    return r;
  };
  const cdpTouch = async (type, pts) => { if (!cdp) cdp = await ctx.newCDPSession(page); return cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i + 1, radiusX: 11, radiusY: 11, force: 0.5 })) }); };
  const wk = async (type, x, y) => { const ok = await page.evaluate(TOUCH, [type, x, y]); if (stats.touchApi === null) stats.touchApi = ok; };

  const api = {
    stats, onAction: null,
    async probe() { return page.evaluate(PROBE).catch(() => null); },
    tap(x, y) { stats.taps++; return timed(() => page.touchscreen.tap(clampX(x), clampY(y))); },
    swipe(x1, y1, x2, y2, ms = 180) {
      stats.swipes++;
      return timed(async () => {
        const n = 6;
        if (ENGINE === 'webkit') {
          await wk('start', x1, y1);
          for (let i = 1; i <= n; i++) { await wk('move', x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n); await wait(ms / n); }
          await wk('end', x2, y2);
        } else {
          await cdpTouch('touchStart', [[x1, y1]]);
          for (let i = 1; i <= n; i++) { await cdpTouch('touchMove', [[x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]]); await wait(ms / n); }
          await cdpTouch('touchEnd', []);
        }
      });
    },
    hold(x, y, ms = 700, drift = 0) {
      stats.holds++;
      return timed(async () => {
        const dx = drift * (rand() < 0.5 ? -1 : 1) * R(0.4, 1), dy = drift * (rand() < 0.5 ? -1 : 1) * R(0.4, 1), n = 4;
        if (ENGINE === 'webkit') { await wk('start', x, y); for (let i = 1; i <= n; i++) { await wait(ms / n); await wk('move', x + dx * i / n, y + dy * i / n); } await wk('end', x + dx, y + dy); }
        else { await cdpTouch('touchStart', [[x, y]]); for (let i = 1; i <= n; i++) { await wait(ms / n); await cdpTouch('touchMove', [[x + dx * i / n, y + dy * i / n]]); } await cdpTouch('touchEnd', []); }
      });
    },
    key(k, ms = 90) { stats.keys++; return timed(async () => { await page.keyboard.down(k); await wait(ms); await page.keyboard.up(k); }); },

    // One thing a player might do next. Returns a short label.
    async step() {
      const c = await api.probe();
      if (!c) { await wait(200); return 'no-probe'; }
      // A pause the SDK's pause button (or a stray tap) opened: press Resume, like a child would.
      if (c.paused || c.menuOpen) {
        const res = c.items.find(i => i.sdk && /^resume/i.test(i.txt)) || c.items.find(i => i.sdk && /resume|continue/i.test(i.txt));
        if (res) { stats.resumes++; api.onAction && api.onAction('button', 'resume'); await api.tap(res.x, res.y); await wait(250); return 'resume'; }
        if (c.paused) { await page.evaluate(() => window.ArcadeSDK && window.ArcadeSDK.resume && window.ArcadeSDK.resume()).catch(() => {}); stats.resumes++; return 'resume-api'; }
      }
      const items = c.items.filter(i => !i.sdk && !AVOID.test(i.txt) && !(i.tag === 'A' && /^(https?:|\.\.|\/)/.test(i.href) && !/^#/.test(i.href)));
      const primary = items.filter(i => CONTINUE.test(i.txt));
      const focus = c.canvas && c.canvas.cover > 0.25 ? { x: c.canvas.x + c.canvas.w / 2, y: c.canvas.y + c.canvas.h / 2, w: Math.min(c.canvas.w, vp.width), h: Math.min(c.canvas.h, vp.height) } : { x: vp.width / 2, y: vp.height / 2, w: vp.width, h: vp.height };
      if (primary.length && rand() < 0.7) {
        const p = pick(primary); stats.buttons++; api.onAction && api.onAction('button', p.txt);
        await api.tap(p.x + R(-p.w / 5, p.w / 5), p.y + R(-p.h / 5, p.h / 5)); return 'button:' + p.txt.slice(0, 14);
      }
      const r = rand();
      if (r < 0.28 && items.length) {   // any visible button or clickable thing
        const p = pick(items); stats.buttons++; api.onAction && api.onAction('item', p.txt);
        await api.tap(p.x + R(-p.w / 5, p.w / 5), p.y + R(-p.h / 5, p.h / 5)); return 'item:' + p.txt.slice(0, 14);
      }
      api.onAction && api.onAction('canvas', '');
      if (r < 0.52) { await api.tap(focus.x + gauss() * focus.w * 0.2, focus.y + gauss() * focus.h * 0.2); return 'tap-centre'; }
      if (r < 0.64) { await api.tap(R(10, vp.width - 10), R(vp.height * 0.6, vp.height - 12)); return 'tap-thumb'; }
      if (r < 0.72) { await api.tap(R(10, vp.width - 10), R(10, vp.height - 10)); return 'tap-anywhere'; }
      if (r < 0.86) {   // swipe in one of four directions, starting near the middle or the thumb zone
        const dir = pick([[0, -1], [0, 1], [-1, 0], [1, 0]]), len = R(90, 220), sx = clampX(focus.x + gauss() * focus.w * 0.18), sy = clampY(rand() < 0.5 ? focus.y + gauss() * focus.h * 0.18 : R(vp.height * 0.55, vp.height * 0.85));
        await api.swipe(sx, sy, clampX(sx + dir[0] * len), clampY(sy + dir[1] * len), R(120, 260)); return 'swipe';
      }
      if (r < 0.93 || !keyboard) { await api.hold(clampX(focus.x + gauss() * focus.w * 0.2), clampY(R(vp.height * 0.45, vp.height * 0.9)), R(350, 1200), rand() < 0.5 ? R(20, 80) : 0); return 'hold'; }
      const k = pick(KEYS); await api.key(k, R(60, 500)); return 'key:' + k;
    },

    // The start logic of iphone.mjs, then a keyboard fallback so a game that only starts by key is reported as such.
    async startGame(meta, sceneReached) {
      const out = { how: '', viaKey: false };
      const start = meta.start || '';
      const ts = /^tap:([\d.]+)%,([\d.]+)%$/.exec(meta.touchStart || '');
      const waitPlay = async (n) => { for (let i = 0; i < n; i++) { await wait(1000); if (await sceneReached('play')) return true; } return !!(await sceneReached('play')); };
      if (ts) { await api.tap(vp.width * ts[1] / 100, vp.height * ts[2] / 100); out.how = meta.touchStart; }
      else if (start && !/^key:/.test(start) && start !== 'auto') {
        const ok = await fingerTap(page, page.locator(start).first(), 5000);
        out.how = ok ? start : 'declared start button not tappable';
        if (!ok) {   // the declared selector may be stale: look for any visible Play / Start button before tapping the middle
          const btn = page.locator('button, [role=button], a, .btn').filter({ hasText: /^\s*(▶\s*)?(play|start|tap to (play|start)|let'?s go|begin|go)\b/i }).first();
          const ok2 = await btn.isVisible().catch(() => false) && await fingerTap(page, btn, 4000);
          if (ok2) out.how += ' -> Play/Start button'; else { await api.tap(vp.width / 2, vp.height / 2); out.how += ' -> tap centre'; }
        }
      } else {
        const btn = page.locator('button, [role=button], a, .btn').filter({ hasText: /^\s*(▶\s*)?(play|start|tap to (play|start)|let'?s go|begin|go)\b/i }).first();
        const ok = await btn.isVisible().catch(() => false) && await fingerTap(page, btn, 5000);
        if (ok) out.how = 'Play/Start button'; else { await api.tap(vp.width / 2, vp.height / 2); out.how = 'tap centre'; }
      }
      if (await waitPlay(5)) return out;
      // a how-to / coach card first: press up to three continue buttons
      for (let extra = 0; extra < 3 && !(await sceneReached('play')); extra++) {
        const c = await api.probe(); if (!c) break;
        const p = c.items.filter(i => !i.sdk && CONTINUE.test(i.txt) && !AVOID.test(i.txt));
        if (!p.length) break;
        await api.tap(p[0].x, p[0].y); out.how += ' + ' + p[0].txt.slice(0, 12);
        if (await waitPlay(4)) return out;
      }
      await api.tap(vp.width / 2, vp.height * 0.62); out.how += ' + tap on game';
      if (await waitPlay(4)) return out;
      // last resort, and a finding in itself: a phone player has no keyboard
      const key = startKey || (/^key:(.+)$/.exec(start) || [])[1] || 'Enter';
      for (const k of [key, 'Space']) { await api.key(k, 120); if (await waitPlay(3)) { out.how += ' + KEY ' + k; out.viaKey = true; return out; } }
      return out;
    },
  };
  return api;
}

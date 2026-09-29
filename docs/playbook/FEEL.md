# FEEL: juice recipes that survive an iPhone

All code is in [`feel-kit.js`](feel-kit.js) (one dependency-free file, dt in seconds, no hidden clock). Blocks below are verbatim from it and are checked by `tests/check-snippets.py`.
Tests: [`tests/feel-test.html`](tests/feel-test.html), 12 checks, **12 of 12 pass in Chromium 141 and in Playwright WebKit 26.0** (`tests/results/feel.json`).
Live: tap Harvest in [`look-demo.html`](look-demo.html) (squash, coins fly to the counter, number pop, haptic call).

## Do this first (15 rules)

1. **One tap, six answers inside 120 ms:** button squash, world reaction, number pop, sound, coins/particles, counter bump. If a tap has fewer than three, it feels dead ([Game Feel Practices](https://hilamghost.itch.io/game-feel-practices): "flat and lifeless" with mechanics-only feedback).
2. **Shake with trauma, not random offsets.** `shake = trauma^2`, trauma decays linearly, smooth noise not `Math.random()` ([Eiserloh, GDC 2016](https://archive.org/stream/GDC2016Eiserloh/GDC2016-Eiserloh_djvu.txt)). Same look at 30 and 60 fps (tested).
3. **Small hits add 0.1 to 0.3 trauma, big ones 0.5+.** Shake lasts 0.1 to 0.3 s, tapers with easing ([itch write-up](https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects)).
4. **Hit-stop is dt = 0 for the simulation only:** 50 to 100 ms on a strong hit, then optional 0.2 s slow-motion on a critical ([same write-up](https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects)). Never freeze particles, shake or UI with it. My numbers, tune by feel.
5. **Squash and stretch by spring, volume preserved** (`sx*sy = 1`). A few pixels of scale is enough (same write-up).
6. **Anticipation, action, follow-through** in three keyframes: dip 15%, pop 25%, wobble to rest. About 460 ms total.
7. **Every reward flies to the thing that counts it.** Coins fly to the coin counter, ease-in so they accelerate into it, and the counter bumps once **per coin landing**, not when the flight starts. Round 5 critic: "counters jump before you press Collect" (`claire_r5_critic/REPORT.md`).
8. **Number pops are white or yellow with a dark outline, fully opaque for 0.6 s.** Grey or pink low-opacity pops "hard to read against the water" (`surf_critic/REPORT.md`).
9. **Layer sound: body + a fifth above + a noise sparkle,** and vary pitch +-6% without repeating the last value ([itch write-up](https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects): layer and vary pitch and volume).
10. **Combos climb a musical scale** (major scale steps, octave at 7), then flatten. Intensity 0..1 drives shake, label size, particle count.
11. **Mix the music where it can be heard.** The surf game's music sat at about -43 dBFS under an ocean bed at -26 dBFS (17 dB): "effectively inaudible" (`surf_critic/REPORT.md`).
12. **`navigator.vibrate` does not exist on iOS Safari** (measured: `undefined` in WebKit 26.0). Use the switch-checkbox trick on iOS 17.4 to 26.4, best effort only, and never make haptics the only feedback (see Haptics).
13. **Respect reduced motion:** `Shake({reduced:true})` returns zeros (tested); arcade standard U16 requires it.
14. **Cancel, don't stack:** new pop replaces stale toast; reward overlays must swallow taps (critic p09: "a tap during the reward overlay went through to the world").
15. **Do not overdo it.** Restraint is the consistent advice: "subtle", "sparingly" ([write-up](https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects)); imbalanced layering and inconsistent timing are the named pitfalls ([Practices](https://hilamghost.itch.io/game-feel-practices)).

## 1. Easing library

<!-- from feel-kit.js -->
```js
    outBack: t => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
    outElastic: t => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1),
```
The full set (`linear, outQuad, inCubic, outCubic, inOutCubic, inBack, outBack, outElastic, outBounce`) is in the file; the formulas are the standard ones from [easings.net](https://easings.net/) (source: [`easingsFunctions.ts`](https://raw.githubusercontent.com/ai/easings.net/master/src/easings/easingsFunctions.ts)). Tested: all hit 0 at t=0 and 1 at t=1; `outBack` peaks at 1.100, `outElastic` at 1.371. Use `outBack` for pops, `inCubic` for things flying into a HUD, `outElastic` for settle, `outCubic` for everything else.

## 2. Screen shake with trauma

<!-- from feel-kit.js -->
```js
  class Shake {
    constructor(o = {}) {
      this.trauma = 0; this.t = 0;
      this.decay = o.decay ?? 1.4;          // trauma lost per second
      this.power = o.power ?? 2;            // 2 = squared (Eiserloh), 3 = cubed (softer small hits)
      this.maxOffset = o.maxOffset ?? 18;   // px at full shake (scale it with canvas size)
      this.maxAngle = o.maxAngle ?? 0.05;   // radians at full shake
      this.freq = o.freq ?? 22;             // noise samples per second
      this.reduced = !!o.reduced;           // prefers-reduced-motion: no shake at all
    }
    add(amount) { this.trauma = clamp(this.trauma + amount, 0, 1); }
    update(dt) {
      this.t += dt; this.trauma = Math.max(0, this.trauma - this.decay * dt);
      const s = this.reduced ? 0 : Math.pow(this.trauma, this.power), f = this.t * this.freq;
      return { x: this.maxOffset * s * noise1(f), y: this.maxOffset * s * noise1(f + 100), angle: this.maxAngle * s * noise1(f + 200), shake: s };
    }
  }
```
`add(0.3)`, `add(0.6)`, `add(0.9)` give shake 0.09, 0.36, 0.81 (squared) or 0.027, 0.216, 0.729 (cubed), which matches Eiserloh's slide "3%, 22%, 73%" for the cubed case (tested). Apply `x`, `y` as a translate and `angle` as a rotate on the canvas wrapper or camera; scale `maxOffset` with canvas size. Decay 1.4 per second means a 0.5 hit is gone in 0.36 s. In three.js prefer rotation only in 3D, as the talk does.

## 3. Hit-stop and slow-motion

<!-- from feel-kit.js -->
```js
  class TimeScale {
    constructor() { this.freezeLeft = 0; this.slowLeft = 0; this.slowScale = 0.3; }
    hit(ms, o = {}) { this.freezeLeft = Math.max(this.freezeLeft, ms / 1000); this.slowLeft = (o.slowMs || 0) / 1000; this.slowScale = o.slowScale ?? 0.3; }
    step(realDt) {
      if (this.freezeLeft > 0) { this.freezeLeft -= realDt; return 0; }
      if (this.slowLeft > 0) { this.slowLeft -= realDt; return realDt * this.slowScale; }
      return realDt;
    }
  }
```
Tested: `hit(80)` froze 5 of 12 frames at 60 fps and the lost sim time was 80 ms +-20; a 200 ms slow-mo ran 13 frames. Feed the *scaled* dt to the simulation and the *real* dt to `Shake`, particles and UI. The [SDK](../../assets/arcade-sdk.js) freezes `requestAnimationFrame` and `performance.now` on pause, so this stays paused with the game.

## 4. Squash and stretch (spring)

<!-- from feel-kit.js -->
```js
  class Spring {
    constructor(k = 260, damping = 14) { this.k = k; this.d = damping; this.x = 0; this.v = 0; }
    punch(x) { this.x = x; }                 // set a displacement
    impulse(v) { this.v += v; }              // or kick the velocity (camera kicks)
    update(dt) {
      dt = Math.min(dt, 1 / 30); const n = 4, h = dt / n;   // sub-steps keep it stable on a slow frame
      for (let i = 0; i < n; i++) { this.v += (-this.k * this.x - this.d * this.v) * h; this.x += this.v * h; }
      return this.x;
    }
  }
  const squashScale = x => { const sy = Math.max(0.2, 1 + x); return { sx: 1 / sy, sy }; };
```
Use: on tap `spring.punch(-0.18)`; each frame `const {sx, sy} = squashScale(spring.update(dt))`. Tested: overshoot to +0.064, settles below 0.002, stable even with 500 ms frames (sub-stepped). The same class kicks a camera: `spring.impulse(6)` then `camera.fov = base + spring.update(dt) * 4`.

## 5. Anticipation and follow-through

<!-- from feel-kit.js -->
```js
  const popTrack = (rest = 1) => new Track(rest, [
    { to: rest * 0.85, ms: 90, ease: Ease.outQuad },      // anticipation: dip before the pop
    { to: rest * 1.25, ms: 110, ease: Ease.outBack },     // the action
    { to: rest, ms: 260, ease: Ease.outElastic },         // follow-through: wobble to rest
  ]);
```
Tested: 0.85 at 90 ms, 1.25 at 200 ms, 1.0 by 460 ms. `new Track(v0, frames)` with `update(dt)` is the general keyframe player (in the file). Same shape works for a chest opening or a tower firing.

## 6. Coins that fly to the counter

<!-- from feel-kit.js -->
```js
  const bez = (a, c, b, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;
  function coinPos(p0, p1, t, arc = 80) {
    const e = Ease.inCubic(t), cx = (p0.x + p1.x) / 2, cy = Math.min(p0.y, p1.y) - arc;
    return { x: bez(p0.x, cx, p1.x, e), y: bez(p0.y, cy, p1.y, e) };
  }
```
`flyCoins(root, {x,y}, counterEl, n, {onLand})` staggers coins 45 ms apart, 600 ms each, and calls `onLand(k, n)` per coin: bump the counter *there*. Tested with real `requestAnimationFrame`: 8 coins in 716 ms (WebKit) and 731 ms (Chromium), all removed, 8 callbacks. Keep coins under the label layer (critic: "flying coins over '+30 Coins'").

## 7. Number pops

<!-- from feel-kit.js -->
```js
  function popNumber(root, x, y, text, o = {}) {
    const el = document.createElement('div'); el.textContent = text;
    el.style.cssText = `position:fixed;left:${x}px;top:${y}px;transform:translate(-50%,-50%);pointer-events:none;font:900 ${o.size || 28}px/1 Fredoka,system-ui,sans-serif;color:${o.color || '#fff'};-webkit-text-stroke:5px ${o.stroke || '#5a2d0c'};paint-order:stroke fill;text-shadow:0 3px 0 ${o.stroke || '#5a2d0c'}`;
    root.appendChild(el);
    const a = el.animate([
      { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
      { transform: 'translate(-50%,-90%) scale(1.25)', opacity: 1, offset: 0.25 },
      { transform: 'translate(-50%,-260%) scale(1)', opacity: 0 },
    ], { duration: o.ms || 750, easing: 'cubic-bezier(.2,.9,.3,1)' });
    a.onfinish = () => el.remove();
    return a;
  }
```
Web Animations run on the compositor and the SDK holds them on pause. Outline uses `-webkit-text-stroke` plus a text-shadow. Cap the count on screen (pool 8) or old pops pile up.

## 8. Combo escalation

<!-- from feel-kit.js -->
```js
  const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12];
  const comboPitch = n => Math.pow(2, MAJOR[Math.min(Math.max(n, 0), MAJOR.length - 1)] / 12);   // playbackRate multiplier
  class Combo {
    constructor(windowMs = 1500) { this.n = 0; this.window = windowMs; this.left = 0; }
    hit() { this.n++; this.left = this.window; return this.n; }
    update(dt) { if (this.n && (this.left -= dt * 1000) <= 0) this.n = 0; }
    get intensity() { return Math.min(1, this.n / 10); }   // drive shake trauma, label size, particle count from this
  }
```
`comboPitch(4)` = 1.498 (a fifth), `comboPitch(7)` = 2.0 (an octave), capped after that (tested). Combo window 1.5 s.

## 9. Sound layering and pitch variation

<!-- from feel-kit.js -->
```js
  function coinSfx(ctx, dest, t = ctx.currentTime, combo = 0) {
    const f = varied(880) * comboPitch(combo);
    blip(ctx, dest, t, { f, dur: 0.12, gain: 0.28 });                 // body
    blip(ctx, dest, t + 0.05, { f: f * 1.5, dur: 0.16, gain: 0.22 }); // a fifth above, a hair late
    tick(ctx, dest, t);                                               // sparkle
  }
```
Tested on an `OfflineAudioContext` (works without an audio device): peak 0.30 to 0.32, RMS 0.029, not clipped; 880 to 1760 Hz `blip` zero-crossing ratio 1.99; two renders differ; `varied(880, 0.06)` stayed within 827 to 933 Hz over 3000 draws with no back-to-back repeat. In a real page create the `AudioContext` inside a tap (see `IPHONE.md`). The arcade's shared kit (`ArcadeSDK.sfx('coin')`) is the zero-effort path; this recipe is for when a game needs combo pitch.

## 10. Haptics (iOS has no `navigator.vibrate`)

<!-- from feel-kit.js -->
```js
      tap(pattern = 10) {                          // call ONLY from a tap/click handler
        try {
          if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 'skipped';
          if (typeof navigator.vibrate === 'function') { navigator.vibrate(pattern); return 'vibrate'; }
          if (ios()) { ensure().click(); return 'switch'; }
        } catch (e) {}
        return 'none';
      },
```
`ios()` (UA or touch-Mac check) and `ensure()` (a hidden `label > input[type=checkbox][switch]`) are in the file. What is verified: in Playwright WebKit `navigator.vibrate` is `undefined`, `mode()` returned `switch`, the hidden `<input type=checkbox switch>` was toggled by the label click (`checked: true`), nothing threw; in Chromium it used `vibrate`. **What is not verified: any actual buzz**, which needs a real iPhone. Facts from sources: Safari 17.4+ shipped `<input switch>`; libraries fire it by clicking a hidden switch's label from a user gesture ([web-haptics](https://tonyseets.com/colophon/2026-03-02-haptic-feedback/), [ios-haptics](https://github.com/tijnjh/ios-haptics)); reports say it works on iOS 17.4 to 26.4 and Apple changed it in 26.5, with one sandbox claiming a "disguised native control" still works ([project-fathom](https://github.com/m1ckc3s/project-fathom), all from search snippets, not fetched). Treat as best effort: call only inside a tap handler, skip under reduced motion, and always pair with a visual and a sound.

## 11. Event wiring cheat sheet (one place, one order)

| Event | Shake (trauma) | Hit-stop | Squash | Pop | Sound | Extra |
|---|---|---|---|---|---|---|
| UI button tap | none | none | -0.18 punch | none | tap 60 ms | haptic 10 |
| Harvest / collect | 0.10 | none | -0.12 | "+N" yellow | coin, combo pitch | coins fly, counter bump per coin |
| Enemy hit | 0.25 | 60 ms | -0.2 on enemy | damage number | hit + body layer | flash 1 frame |
| Big hit / crit | 0.5 | 90 ms + 200 ms slow 0.3x | -0.3 | big number | hit + boom | camera kick 6 |
| Level up | 0.35 | none | +0.25 | "LEVEL n" | fanfare | confetti, stars pop in sequence |
| Fail / miss | 0.15 | none | none | none | soft low blip | never a harsh buzzer for kids |

(Starting values from this page's tests and the sources above; tune by playing.)

## 12. Mistakes that make a game feel cheap (all seen in this project)

Static reward card, nothing flies to the counter; harvested bed looks like unplanted (Claire r3). Counters jump before Collect; coin covers a label; confetti over "+10 XP" (Claire r5). Pause menu closes itself when the tab returns (surf critic; see `IPHONE.md` lifecycle). Trick pops low contrast; score sits at 0 while the real number grows in small type; music inaudible; beeps clash with a realistic look (surf). Music 17 dB under ambience. Flash washes 60% of the frame white (surf wipeout). Also: identical sound every time, screen shake with `Math.random` (jitter at 144 Hz differs from 30 Hz), hit-stop that also freezes the HUD, tap-through overlays.

## Tested, and what was not

| Recipe | Chromium 141 | WebKit 26.0 |
|---|---|---|
| easing, shake, hit-stop, spring, track, coin path, combo, varied | pass | pass |
| flyCoins and popNumber (real rAF and WAAPI) | pass | pass |
| coinSfx render (OfflineAudioContext) | pass | pass |
| Haptics path selection | `vibrate` | `switch` (toggled) |
| Audible sound on a device, real buzz, touch feel, 60 fps on an iPhone | not verified | not verified |

## Sources

[Eiserloh GDC 2016](https://archive.org/stream/GDC2016Eiserloh/GDC2016-Eiserloh_djvu.txt) ([talk on YouTube](https://www.youtube.com/watch?v=tu-Qe66AvtY)), [Vlambeer, The Art of Screenshake](https://archive.org/details/the-art-of-screenshake) (page has no transcript; only cited as further viewing), [itch: juicy effects](https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects), [Game Feel Practices](https://hilamghost.itch.io/game-feel-practices), [easings.net](https://easings.net/), [web-haptics colophon](https://tonyseets.com/colophon/2026-03-02-haptic-feedback/), project critic reports under `scratchpad/*_critic*/REPORT.md`.

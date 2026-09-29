# IPHONE: what breaks on iOS Safari, and the pre-flight every game must pass

Helpers: [`iphone-kit.js`](iphone-kit.js) (blocks below are verbatim, checked by `tests/check-snippets.py`). Tests: [`tests/iphone-test.html`](tests/iphone-test.html) and [`tests/iphone-interact.mjs`](tests/iphone-interact.mjs), run in **Chromium 141 and Playwright WebKit 26.0** (`tests/results/`). **Playwright WebKit is not an iPhone**: read the last section before trusting any "pass".

## Do this first (15 rules)

1. **Test in WebKit, not only Chromium.** Chromium emulation passed 99 of 107 games on the iPhone check (`qa/iphone-results/iphone.json`) and still cannot show a Safari-only crash. Use [Playwright WebKit](#playwright-webkit-and-what-it-cannot-tell-you), then one real iPhone.
2. **Godot 4 on the web: single-threaded, Compatibility renderer, version 4.5 or newer.** 4.4.1 and 4.5-dev builds reloaded iOS tabs after 1 to 3 minutes when audio played; the fix (Godot PR #107948) shipped in 4.5 ([#107390](https://github.com/godotengine/godot/issues/107390), [PR](https://github.com/godotengine/godot/pull/107948)). The arcade's engine is v4.7.stable (checked in the console log).
3. **Cap the drawing buffer.** Godot and three.js both render at the phone's DPR 3 by default. Capping to 2 cut the Godot canvas from 1170x1992 (2.33 MP) to 780x1328 (1.04 MP) in WebKit (test below).
4. **Keep total memory under about 300 MB on older phones.** iOS gives no error: the tab just reloads ("This webpage was reloaded because it was using significant memory", [pooled#207](https://github.com/Nehanth/pooled/issues/207)). A Godot thread puts the safe line near 300 MB ([forum](https://forum.godotengine.org/t/web-export-to-ios-suddenly-crashing-after-working-for-ages/120627)).
5. **Detect the reload and drop a quality tier** with a session breadcrumb (`crashBreadcrumb`).
6. **Unlock audio in `touchend`/`pointerup`/`click`, call `resume()` synchronously, and treat `interrupted` like `suspended`.** Re-arm on every return from the background.
7. **Never rely on `touchstart`/`pointerdown` for audio,** never `await` before `resume()`.
8. **Cache and downloads:** GitHub Pages gzips `godot.wasm` to 10.2 MB (39.5 MB raw). CrazyGames wants 20 MB or less for the mobile homepage ([docs](https://docs.crazygames.com/requirements/technical/)). Claire's pack is 64.9 MB gz, LA City's 75.0 MB.
9. **Root layout:** `position:fixed; inset:0`, `height:100dvh` with a `100vh` fallback, `viewport-fit=cover`, `env(safe-area-inset-*)` padding, `overscroll-behavior:none`.
10. **Zoom and gestures:** iOS ignores `user-scalable=no`. Use `touch-action:manipulation`, block `gesturestart`, guard the double-tap.
11. **Use Pointer Events only.** WebKit fires `mousedown/mouseup` after `touchend` (measured); listening to both double-fires.
12. **You cannot lock orientation on iPhone Safari** (`screen.orientation.lock` is `undefined` in WebKit). Show a "turn your phone" card.
13. **Pause on `visibilitychange` and `pagehide`, and stay paused on return.** Never auto-resume (a critic caught the surf game doing exactly that).
14. **Wrap all storage in try/catch;** private windows and blocked data throw.
15. **Haptics:** `navigator.vibrate` is missing on iOS; see `FEEL.md`.

## Godot 4 web exports on iOS

| Symptom | Cause found | What to do | Source |
|---|---|---|---|
| Context loss / crash on load, iOS 18 vs 17 | Memory pressure; iOS 18 stricter | Smaller textures, DPR cap, fewer nodes | [forum 81024](https://forum.godotengine.org/t/webgl-context-loss-and-app-crash-in-godot-4-3-exported-web-on-ios-browsers/81024) |
| Reload after 1-3 min with audio (4.4.1, 4.5-dev5; not 4.3-stable) | WebKit never frees AudioWorklet processors that return `false`; memory explodes | Use 4.5+; fix pools `GodotPositionReportingProcessor`; tester: 30 min OK on iOS Safari | [#107390](https://github.com/godotengine/godot/issues/107390), [PR #107948](https://github.com/godotengine/godot/pull/107948) |
| Same, still after 4.5-beta2 for one user | Unclear | Convert samples to stream playback; keep runtime under ~300 MB; one user fixed it with 4.5-beta3 | [forum 114247](https://forum.godotengine.org/t/godot-4-4-1-html-exports-resets-crashes-when-playing-on-mobile-browsers/114247), [120627](https://forum.godotengine.org/t/web-export-to-ios-suddenly-crashing-after-working-for-ages/120627) |
| iPadOS 17.2, looping audio, 4.3 to 4.5b7 | Possibly the OS; reporter saw no crash on 18.6.2 | Tell users to update iOS | [#110187](https://github.com/godotengine/godot/issues/110187) |
| No-threads build crashes in seconds (4.3 dev3) | Unknown; closed "not planned" | Do not use dev builds | [#88321](https://github.com/godotengine/godot/issues/88321) |

Official guidance: single-threaded is the default since 4.3 and "works very well on macOS and iOS"; web audio defaults to sample playback (no effects, reverb, doppler); only the Compatibility renderer (WebGL 2) exists on web; "Safari has several issues with WebGL 2.0" ([docs](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)). Threads need the COOP/COEP headers ([Bugnet](https://bugnet.io/blog/fix-godot-html5-web-export-white-black-screen)); GitHub Pages lets you set no custom headers (the live `godot.wasm` response has none, and the export sets `ensureCrossOriginIsolationHeaders:false`), so single-threaded is the only option there.
**Tested here:** `city-builder` and `heat-firm` (Godot v4.7.stable, Emscripten 4.0.20, single-threaded) boot to their title screens in Playwright WebKit 26.0 within about 30 s on this loaded box (`results/godot-webkit.json`). The DPR shim below is verified on `heat-firm`. **Not verified:** any iPhone hardware, memory over time, or audio (no sound card).
Put this in the export's HTML shell before `godot.js`:

<!-- from tests/godot-dpr.mjs -->
```js
const CAP = `(() => { const d = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio'); if (!d || !d.get) return; Object.defineProperty(window, 'devicePixelRatio', { get: () => Math.min(2, d.get.call(window)), configurable: true }); })();`;
```
Result: native `dpr 3, canvas 1170x1992`; capped `dpr 2, canvas 780x1328` (`results/godot-dpr.json`). Read the real value lazily: capturing `window.devicePixelRatio` at document start once returned 1.19 in WebKit and shrank the canvas to 465x792. Texture compression: iOS supports ASTC (`WEBGL_compressed_texture_astc` present in WebKit 26); an ASTC 4x4 2048 texture is 5.3 MiB vs 21.3 MiB as RGBA8 with mips (arithmetic below). I did not test Godot's VRAM-compression import settings.

## three.js on iOS

<!-- from iphone-kit.js -->
```js
  function pickDpr(cssW, cssH, { maxDpr = 2, maxPixels = 2.6e6, dpr = G.devicePixelRatio || 1 } = {}) {
    let d = Math.min(dpr, maxDpr);
    while (d > 1 && cssW * cssH * d * d > maxPixels) d = Math.max(1, d - 0.25);
    return d;
  }
```
Tested: 390x844 at 3x gives 2; a 1 MP budget gives 1.5; 1440x900 at 2x gives 1.25. `AdaptiveDpr` steps 2, 1.75, 1.5, 1.25, 1 on slow frames and climbs back after four calm windows. Cap DPR at 2 ([Utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips)); disable MSAA, avoid 32-bit float targets, 16-bit normal maps, 3D textures and integer samplers on iOS ([Bugnet](https://bugnet.io/blog/how-to-fix-unity-webgl-build-crashing-on-safari-ios)); probe `EXT_color_buffer_half_float` at runtime and fall back. Playwright WebKit reports all float extensions present, which a phone may not; that is a real-device question.
<!-- from iphone-kit.js -->
```js
  function guardContext(canvas, { onLost = () => {}, onRestored = () => {} } = {}) {
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); onLost(); });
    canvas.addEventListener('webglcontextrestored', () => onRestored());
  }
```
Tested on a plain WebGL2 canvas and on `look-demo.html` with `WEBGL_lose_context`: lost then restored in both engines, overlay shown and hidden, frame re-rendered (`results/look-interact.json`). `preventDefault()` on the lost event is what allows the restore. three.js re-uploads its own resources; raw WebGL must rebuild. On iOS 17, backgrounding Safari can lose the context ([forum](https://discourse.threejs.org/t/three-js-broken-on-ios-17-with-context-lost/58025), search result, not fetched); avoid the new `WebGPURenderer` WebGL backend for now: [three.js#34682](https://github.com/mrdoob/three.js/issues/34682) says it never recovers after restore (search result, not fetched).

## Memory and download budgets

<!-- from iphone-kit.js -->
```js
  const texMB = (w, h, { bytesPerPx = 4, mips = true } = {}) => (w * h * bytesPerPx * (mips ? 4 / 3 : 1)) / MB;
  const astcMB = (w, h, blk = 4, mips = true) => (Math.ceil(w / blk) * Math.ceil(h / blk) * 16 * (mips ? 4 / 3 : 1)) / MB;
  const canvasMB = (cssW, cssH, dpr, { samples = 1 } = {}) => (cssW * dpr * cssH * dpr * (4 * 2 + 4) * Math.max(1, samples)) / MB;  // 2 colour buffers + depth/stencil, times MSAA samples
```
Arithmetic (tested): 2048x2048 RGBA8 is 16 MiB, 21.3 MiB with mips (a popular tips list says 64 MiB; that figure is for 4096x4096 without mips, so do your own sums); 4096x4096 with mips is 85.3 MiB; ASTC is 16 bytes per block: 4x4 = 5.3 MiB, 6x6 = 2.4 MiB. Canvas 390x844: 33.9 MiB at 3x, 15.1 at 2x, 60.3 at 2x with 4x MSAA (assumes 2 colour buffers + depth).
Measured limits are fuzzy: there is no fixed per-tab limit; the lower of WebKit's and jetsam's limit applies ([Catch Metrics](https://www.catchmetrics.io/blog/deep-dive-ram-internals-webkit) gives heap figures of about 200-450 MB for iPhone 6s to 14 and 1 GB+ for 15). Field reports: iPhone 15 Pro about 3 GB, iPhone 12 Pro about 1.5 GB (3 GB right after a restart), low-RAM devices on iOS 26.2 dying at 100-200 MB of JS memory ([pooled#207](https://github.com/Nehanth/pooled/issues/207)). Aim for 300 MB total, 384 MB hard ([Bugnet](https://bugnet.io/blog/how-to-fix-unity-webgl-build-crashing-on-safari-ios)).
<!-- from iphone-kit.js -->
```js
  function crashBreadcrumb(key = 'arcade_alive') {
    const set = () => { try { sessionStorage.setItem(key, '1'); } catch (e) {} };
    let died = false; try { died = sessionStorage.getItem(key) === '1'; } catch (e) {}
    set(); addEventListener('pageshow', set);
    addEventListener('pagehide', () => { try { sessionStorage.removeItem(key); } catch (e) {} });
    return died;                       // true: last load ended without a pagehide (killed for memory, or crashed). Start on the low-quality tier.
  }
```
Tested (unit): first load false, unclean reload true, clean `pagehide` false, `pageshow` re-arms. **Not verified** that `sessionStorage` survives a real jetsam reload on iOS; treat as a heuristic.
Downloads (gz, from the live site's headers): `godot.wasm` 10.2 MB; Heat Firm 0.7 MB pck; Swellrider 35.9 MB; Claire 64.9 MB; LA City 75.0 MB; Heaven's Grace 41.9 MB. At a real 10 Mbit/s a 20 MB page needs 16 s and an 85 MB one needs 68 s. Poki: players leave after 10 s of loading ([Poki](https://developers.poki.com/guide/requirements-quality)); CrazyGames: 20 s to gameplay, 20 MB mobile homepage, 50 MB basic, 250 MB total.

## Audio on iOS

<!-- from iphone-kit.js -->
```js
    function poke() {                                   // call synchronously from a gesture handler: no await before resume()
      try {
        if (!gate.ctx) { gate.ctx = create(); gate.ctx.addEventListener && gate.ctx.addEventListener('statechange', () => set(gate.ctx.state === 'running')); }
        const c = gate.ctx;
        if (c.state !== 'running' && c.state !== 'closed') c.resume();      // covers 'suspended' AND Safari's 'interrupted'
        if (c.createBuffer && c.createBufferSource) { const b = c.createBufferSource(); b.buffer = c.createBuffer(1, 1, 22050); b.connect(c.destination); b.start(0); }   // one silent frame opens the route
        if (G.navigator && navigator.audioSession) navigator.audioSession.type = 'playback';   // iOS 17+: play through the silent switch
        set(c.state === 'running');
      } catch (e) {}
    }
```
Rules: WebKit needs a gesture it counts; sources list `touchend`, `click`, `keydown` and disagree on `pointerdown` (one PR lists it, another says `pointerdown`/`touchstart` do not count), so use `pointerup`/`touchend`/`click` ([PR 128](https://github.com/AriSweedler-at/hyperagent-web-apps/pull/128), [CrazyGames](https://docs.crazygames.com/requirements/technical/)). A suspended context needs a buffer started *inside* the gesture ([ski-game PR](https://github.com/tucktuck22/ski-game/pull/13)). Safari adds the non-standard `interrupted` state (backgrounding, calls); resume it too. The silent switch mutes Web Audio unless `navigator.audioSession.type = 'playback'` (iOS 17+, feature-detected) ([PR 128](https://github.com/AriSweedler-at/hyperagent-web-apps/pull/128)). After the page returns from the background, wait for the next tap ([Babylon forum](https://forum.babylonjs.com/t/audio-is-not-resuming-to-play-after-visibilitychange-in-iphone-browsers-works-on-android-and-desktop/54164)). Screen lock or backgrounding suspends audio with no web-API workaround ([pooled#207](https://github.com/Nehanth/pooled/issues/207)).
**Measured:** fake-context unit test: `suspended` and `interrupted` each resumed once, `closed` not at all. Real `AudioContext` in WebKit here: `interrupted` after an untrusted click and `suspended` after a trusted tap (no sound card). In Chromium a trusted tap gave `running`. So the sandbox cannot show iOS unlock working: **audio on a real iPhone is unverified.**

## Layout, input, lifecycle

<!-- from iphone-kit.js -->
```js
  function touchGuards(root = document) {
    const stops = [];
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => root.addEventListener(t, e => e.preventDefault(), { passive: false }));
    let last = 0;
    root.addEventListener('touchend', e => {
      const dt = e.timeStamp - last; last = e.timeStamp;
      if (dt < 350 && e.cancelable) { e.preventDefault(); const b = e.target.closest && e.target.closest('button,[role=button],label'); if (b) b.click(); stops.push(dt); }   // the cancelled touchend also cancels the click, so click for it
    }, { passive: false });
    root.addEventListener('touchmove', e => { if (e.touches.length > 1 && e.cancelable) e.preventDefault(); }, { passive: false });
    return stops;
  }
```
- **100vh / dvh:** `100vh` includes the browser bars on mobile; `dvh` tracks them ([summary](https://csstoolkit.net/blog/css-dvh-svh-lvh-guide/), search result). `CSS.supports` for `dvh`, `svh`, `lvh`, `env()`, `touch-action:manipulation`, `overscroll-behavior:none` is true in both engines. Emulation has no toolbar animation, so `dvh` = `innerHeight` = 664 here; the toolbar bug is **not reproducible in Playwright**. Fallback: `IPhone.fitViewport()` sets `--app-h` from `visualViewport` (tested).
- **Safe areas:** `viewport-fit=cover` plus `padding: max(12px, env(safe-area-inset-left))` ([WebKit](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)). Playwright returns `0px` (no notch): layout with real insets is unverified.
- **Zoom:** iOS Safari ignores `user-scalable=no`; `touch-action:manipulation` removes double-tap zoom; block `gesturestart` for pinch; the double-tap guard cancels the second `touchend` inside 350 ms and clicks the button itself ([examples](https://github.com/kevpeng/random-mobile-game/pull/3), search result). Tested logic only; real iOS zoom cannot be triggered in Playwright, and `ongesturestart` is `false` in Playwright WebKit (iOS-only event).
- **Pointer vs touch:** measured tap order. WebKit: `pointerdown, touchstart, pointerup, touchend, mousedown, mouseup, click`. Chromium: `pointerdown, touchstart, pointerup, touchend, click`. Use Pointer Events only.
- **Rubber-banding:** `html,body{position:fixed;inset:0;overflow:hidden;overscroll-behavior:none}` plus `touchmove` `preventDefault({passive:false})` on the canvas. `overscroll-behavior` was Chrome-only in 2017 ([Chrome](https://developer.chrome.com/blog/overscroll-behavior)); supported (`CSS.supports`) in WebKit 26.0. The bounce itself is unverified.
- **Orientation:** `orientationGate('portrait', wrong => card.hidden = !wrong)` (tested in both orientations: `matchMedia` flips at 390x664 vs 664x390). The arcade SDK already draws the card (`orientation:'landscape'`).
- **Wake lock:** Safari 16.4+, but broken in Home Screen apps until iOS 18.4 ([WebKit bug 254545](https://bugs.webkit.org/show_bug.cgi?id=254545)); re-request on every `visibilitychange` (`keepAwake()`, safe when unsupported).
<!-- from iphone-kit.js -->
```js
  function lifecycle({ onHide, onShow }) {
    let hidden = false;
    const hide = why => { if (!hidden) { hidden = true; onHide(why); } };
    const show = why => { if (hidden) { hidden = false; onShow(why); } };
    document.addEventListener('visibilitychange', () => (document.hidden ? hide('visibilitychange') : show('visibilitychange')));
    addEventListener('pagehide', () => hide('pagehide'));
    addEventListener('pageshow', e => { if (e.persisted) show('bfcache'); });
    return { get hidden() { return hidden; } };
  }
```
Tested: hide once, show once, `pagehide` counts as hide, `pageshow{persisted}` (bfcache) as show. On `onShow`, keep the game paused and show "Tap to continue" (that tap also re-unlocks audio).

## PWA / Add to Home Screen

Manual install only (Share, Add to Home Screen); iOS 26 turns any site into a web app ([WebKit 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)). Home-screen apps do not share storage with Safari; script-written data can be evicted after 7 days without use; cache about 50 MB; no real fullscreen, status bar stays ([MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide); some claims are from search snippets and are contested, check on a device). Do not depend on `apple-mobile-web-app-capable` on iOS 26: the user's "Open as Web App" switch decides (search snippet). The arcade already ships the manifest, icons and a service worker.

## Pre-flight: 25 items every game must pass

Size and load: (1) initial gz download 20 MB or less, hard cap 50 MB. (2) Playable or "Tap to start" within 10 s on 4G. (3) Progress bar if load is over 2 s. (4) No requests to other hosts. (5) All storage in try/catch, game plays with storage blocked.
Layout and input: (6) `viewport-fit=cover`. (7) Fixed root, `dvh` with `vh` fallback, no page scroll, `overscroll-behavior:none`. (8) HUD in safe-area padding. (9) `touch-action:manipulation`, pinch and double-tap guards, no long-press callout. (10) Works portrait and landscape, or shows a rotate card. (11) Tap targets 44 px or more, text 12 px or more. (12) Pointer Events only.
Rendering and memory: (13) DPR capped at 2 or a pixel budget of 2.6 MP or less. (14) No MSAA at DPR 2+, no float targets without a probe. (15) Context-loss handlers. (16) Texture memory summed with `texMB`; nothing 4096 uncompressed. (17) Under 300 MB total; `crashBreadcrumb` drops to a low tier. (18) About 100 draw calls or fewer.
Audio and lifecycle: (19) `AudioContext` created and resumed synchronously in `touchend`/`pointerup`/`click`; `interrupted` handled. (20) Sound off until the first tap, mute toggle visible. (21) Hidden tab pauses audio and needs a tap on return. (22) `visibilitychange` and `pagehide` pause; return stays paused. (23) Wake lock while playing, re-acquired. (24) Progress saved at safe points, "Continue" after an iOS reload.
Proof: (25) Passes the WebKit run (0 console errors, non-blank canvas, tap starts play, no horizontal overflow, context-loss drill) **and** was opened for 5 minutes on one real iPhone, in Safari and from the home screen. The second half is not covered by anything in this repo yet.

## Playwright WebKit, and what it cannot tell you

<!-- from tests/run.mjs -->
```js
// Run a test page in Chromium AND WebKit (iPhone 13 profile) and print window.__results.
//   PLAYWRIGHT_BROWSERS_PATH=<webkit dir> node run.mjs <url> [--shot out.png] [--wait 8000] [--engines chromium,webkit]
// A test page sets window.__done = true and window.__results = { name: {ok, note} ... }.
import { chromium, webkit, devices } from '/home/user/arcade/qa/harness/node_modules/playwright/index.mjs';
```
Tested recipe: `ENGINE=webkit node qa/harness/iphone.mjs` (the lead's harness) or `tests/run-all.sh`. What it is: a desktop WebKit build (version 26.0 here) with an iPhone user agent, a 390x664 viewport at DPR 3, and touch. It is "very close to Mobile Safari but not identical" ([BrowserStack](https://www.browserstack.com/guide/playwright-safari), [TestDino](https://testdino.com/blog/playwright-mobile-testing), search snippets).
**It can:** run WebKit's JS/CSS/WebGL2 and its event model (tap order above), lose and restore a context, boot Godot 4.7 single-threaded, show `vibrate` and `orientation.lock` missing, `interrupted` audio states, layout at iPhone sizes, screenshots.
**It cannot:** Apple GPU or Metal (its `RENDERER` string says "WebKit WebGL"/"Apple GPU", point size max 256, max texture 16384, which a phone may not match), jetsam memory kills, thermal throttling, the Safari toolbar and `dvh` changes, safe-area insets (all 0), rubber-banding, double-tap zoom, pinch, the silent switch, real audio output, Taptic haptics, ProMotion, cellular, and the home-screen web-app mode. **A pass in Playwright WebKit is necessary, not sufficient.**

## Tested table

| Item | Chromium 141 | WebKit 26.0 |
|---|---|---|
| 14 unit checks in `iphone-test.html` (dpr, adaptive, memory maths, audio gate, context guard, lifecycle, orientation, wake lock, touch guards, viewport, storage, breadcrumb, capability report) | pass | pass |
| Tap event order | no mouse events | mouse events follow |
| Trusted tap unlocks AudioContext | `running` | `suspended` (no sound card) |
| Godot 4.7 boots | yes (slow, software GL) | yes |
| Godot DPR cap 3 to 2 | not run | 1170x1992 to 780x1328 |

## Sources

Godot: [docs](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html), issues [#107390](https://github.com/godotengine/godot/issues/107390) [#88321](https://github.com/godotengine/godot/issues/88321) [#110187](https://github.com/godotengine/godot/issues/110187), [PR #107948](https://github.com/godotengine/godot/pull/107948), forum [81024](https://forum.godotengine.org/t/webgl-context-loss-and-app-crash-in-godot-4-3-exported-web-on-ios-browsers/81024) [114247](https://forum.godotengine.org/t/godot-4-4-1-html-exports-resets-crashes-when-playing-on-mobile-browsers/114247) [120627](https://forum.godotengine.org/t/web-export-to-ios-suddenly-crashing-after-working-for-ages/120627), [Bugnet Godot](https://bugnet.io/blog/fix-godot-html5-web-export-white-black-screen). iOS: [pooled#207](https://github.com/Nehanth/pooled/issues/207), [Catch Metrics](https://www.catchmetrics.io/blog/deep-dive-ram-internals-webkit), [Bugnet iOS](https://bugnet.io/blog/how-to-fix-unity-webgl-build-crashing-on-safari-ios), [three.js forum](https://discourse.threejs.org/t/how-to-fix-context-lost-android-iphone-ios/56829), [WebKit iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/), [WebKit bug 254545](https://bugs.webkit.org/show_bug.cgi?id=254545), [WebKit 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/), [Chrome overscroll](https://developer.chrome.com/blog/overscroll-behavior), [MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide), [PR 128](https://github.com/AriSweedler-at/hyperagent-web-apps/pull/128), [ski-game](https://github.com/tucktuck22/ski-game/pull/13), [Babylon](https://forum.babylonjs.com/t/audio-is-not-resuming-to-play-after-visibilitychange-in-iphone-browsers-works-on-android-and-desktop/54164), [Poki](https://developers.poki.com/guide/requirements-quality), [CrazyGames](https://docs.crazygames.com/requirements/technical/).

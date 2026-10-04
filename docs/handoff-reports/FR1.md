# FR1: does Summit Line really freeze? (diagnosis; no game file edited)

## Verdict
The 28 s "main thread blocked" is NOT JavaScript. It is the Chromium renderer thread waiting inside two synchronous WebGL
calls, `getProgramInfoLog` and `getShaderInfoLog`, on the first frame of the countdown (right after "Drop in"). The wait is
the GPU process (SwiftShader software GL on a load-18 4-core box) draining a queue of frames that each take 10-25 s to render
at 1500x684, plus compiling 2 programs. The harness does not subtract those two calls (lib/inject.js BLOCKING lacks them; COMPILE
counts only compileShader/linkProgram/getProgramParameter/getShaderParameter), so the wait reads as JS. Not the SDK, no
unbounded loop, no time-scaling catch-up found in the frame path.
On a real iPhone expect a short hitch at "GO", not 28 s (that is an estimate; I cannot measure Apple GPU compile here).

## Evidence (Chromium, iPhone 13 landscape 750x342 @dpr3 => canvas 1500x684, unthrottled unless noted; probe: scratchpad/fr1/probe.mjs, via slot.sh)
- First countdown-frame rAF callback (performance.now delta): 39.9 s (a1), 27.8 s (a2), 26.3 s (a3), 21.8 s (e0). CPU profile (a2): of 27.8 s,
  getShaderInfoLog 17.7 s + getProgramInfoLog 9.95 s; all other JS < 0.5 s. GL-call timer: same two calls, stack
  three.module.min.js getUniforms -> onFirstUse (checkShaderErrors).
- Programs: 22 linked in renderer.compile() at load; 19-20 are first-used (info log read) during boot, exactly 2 (id 9, 10:
  USE_MAP+USE_ENVMAP+USE_ALPHATEST standard material, almost certainly the safety-net material props.js:186) are first drawn on
  the first countdown frame, because the title camera never sees them. three r180 waits for a link only on first draw.
- Queue-drain proof: title frames at full res arrive every 9.5-28 s with 5-11 ms of JS each (rAF gaps in a1/a2/a3). At 200x100
  (Enter key to start) frames are ~0.6 s apart and the same first-frame stall is 2.3 s (e2) instead of 21-39 s. So ~90 % of the
  stall is waiting behind rendered frames; ~2 s is the compile of 2 big programs (19 K vertex + 75 K fragment chars each) under load.
- SDK ruled out: game with an empty arcade-sdk.js (s1): same stall, 35.3 s, same programs. SDK rAF/timer wrapper is a plain
  pass-through; game dt is clamped to 0.1 s and sim steps to 6/frame, so no physics/clock catch-up.
- WebKit (Playwright Linux, in-process software GL): loads to title in 7 s, starts, plays; first-use info-log 0 ms; frames ~1 s
  (software draws, not JS); no block over 1.2 s after load (w1). Only error: "Unhandled Promise Rejection: EncodingError: Decoding
  failed" = arcade-hooks.js aload(): decodeAudioData(b,res,rej) also returns a rejecting promise; mp3 cannot be decoded in Linux WebKit
  (codec artefact, iOS decodes mp3). Harmless; fix if wanted: `var p=ctx.decodeAudioData(b,res,rej); if(p&&p.catch)p.catch(function(){})`.
- Load: main.js boot continuation blocks 4.3 s at 200x100 unthrottled (of which ~2.6 s GL waits, ~1.7 s JS); the loading bar
  sits at 58-62 % during it because world.build is synchronous (no await between steps, so no paint). 5.9 s raw in the health run.

## Tried fix 1 (arcade-hooks.js, NOT applied): read info logs at linkProgram time
Copy: fr1/arcade-hooks.link.js. Result h1: stall did NOT go away (first countdown frame 1.8 s vs 2.3 s; prog 9 still 370 ms +
~1.4 s in getShaderInfoLog). It cannot be fixed by timing the log reads; the cost is the first draw/pipeline build. Not applied.
Also a hooks-only `WebGLRenderer.prototype.compile` wrapper is impossible: in r180 compile/render are instance properties set in
the constructor, which runs before the hook's dynamic import resolves.

## Proposed game patch (Caleb's js/main.js, for the lead to decide; UNTESTED, run j1 was still queued)
Draw everything once, unculled, behind the loading screen so the 2 programs are first-used at load:
```
   renderer.compile(world.scene, camera);
+  const culled = []; world.scene.traverse((o) => { if (o.frustumCulled) { culled.push(o); o.frustumCulled = false; } });
+  renderer.render(world.scene, camera);
+  culled.forEach((o) => { o.frustumCulled = true; });
      renderer.render(world.scene, camera);
```
(existing line is `renderer.render(world.scene, camera);`). Effect: moves the ~2 s (SwiftShader) / est. few hundred ms (iPhone) hitch from
"GO" to load; costs one extra frame at load. Full copy: fr1/main.patched.js. Gameplay untouched.

## Harness/box conclusions
- Add getProgramInfoLog and getShaderInfoLog to BLOCKING in qa/harness/lib/inject.js (they wait on the GPU process). Then Summit Line's
  play-phase FREEZE disappears; load-phase block remains (real ~1.7 s JS + GL waits).
- "Start button not tappable" is also GPU starvation: Playwright tap() waits for two rAF ticks, which take 10-25 s here.
- Box: load 13-19 on 4 cores; GPU process (SwiftShader) and Chromium compete. Numbers are pessimistic; ranking holds.

## Other "looks frozen" risks on iPhone
1. Portrait or rotation-locked: SDK rotate card is a full-screen opaque page with no way past it, and it pauses the game.
2. Stuck loading bar at ~58 % for the synchronous world build (1-3 s on a recent phone, more on old ones).
3. Tap on "Drop in" shows no change until the first countdown frame renders, so any hitch there reads as "tap did not register".
4. Latent: audio.js Music.tick `while (next < currentTime+0.25)` has no catch-up cap; after any long main-thread stall it schedules
   ~7 steps per second stalled at once (about 200 for 28 s: burst of notes and CPU). Only matters after a stall; a cap
   (`if (next < currentTime-1) next = currentTime`) would fix it. Not measured to hurt (next-frame cost 36-58 ms here).
5. Quality 'Low' (default on touch) uses pixel ratio 1.0*2 vs Medium 0.85: canvas 2x native on Low; heavy 75 K-char PBR fragment shader. Not measured on device.

## Not verified
Real iPhone timings; the main.js patch (j1/j3/j4 never ran, slot queue 40 deep); SDK pause/resume test; JS-per-frame under CPU x4 (j2).

## Files touched
None in /home/user/arcade. Scratch only: scratchpad/fr1/ (probe.mjs, patched copies, results json, cpuprofile a2).

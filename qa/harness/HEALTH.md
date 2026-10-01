# Health and progression harnesses

`iphone.mjs` loads a game and taps once. These two go further: they **play** each game on an iPhone 13 profile with a monkey bot and report whether it freezes, stalls, janks, leaks, throws, and whether it has real progression.

## Quick start for a builder (one game, about 1.5 minutes)

The box is shared and loaded. Every browser job goes through the slot lock, and one game at a time is plenty:

```sh
cd /home/user/arcade
SLOT=/tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/slot.sh
$SLOT env GAME_IDS=my-game DURATION=30 REPORT_DIR=/tmp/my-health node qa/harness/health.mjs        # Chromium, CPU x4
cat /tmp/my-health/health.md                                                                     # worst first, with evidence and screenshot paths
$SLOT env GAME_IDS=my-game REPORT_DIR=/tmp/my-prog node qa/harness/progression.mjs                # P0..P3
PLAYWRIGHT_BROWSERS_PATH=/tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/pw-webkit \
  $SLOT env ENGINE=webkit GAME_IDS=my-game REPORT_DIR=/tmp/my-health-wk node qa/harness/health.mjs   # Safari engine
```

Read `games/<id>.json` for every number. A clean run means: no FREEZE, no STALL, no JANK, no LEAK, no ERRORS, and `scenes.restartsAfterOver` above 0 for a game that has a game over. Use `REPORT_DIR` outside `qa/health-results/` so you do not mix your runs with the portfolio results.

## Commands

```sh
cd /home/user/arcade
# the static server is built in; nothing else to start. External games are served from the clones next to this repo.

# 1. Health, Chromium, CPU throttled x4 (default), 45 s of monkey input per game, 2 browsers
WORKERS=2 node qa/harness/health.mjs                     # -> qa/health-results/health.md, health.json, games/<id>.json, shots/
GAME_IDS=snake-clash,claire-pip node qa/harness/health.mjs
CHUNK=1/4 SKIP_DONE=1 node qa/harness/health.mjs         # in pieces; SKIP_DONE resumes

# 2. Health in WebKit (the Safari engine): no CPU throttle exists, numbers are unthrottled
PLAYWRIGHT_BROWSERS_PATH=/tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/pw-webkit \
  ENGINE=webkit REPORT_DIR=qa/health-results/webkit GAME_IDS=claire-pip,hub-snake,balloon-bust node qa/harness/health.mjs

# 3. Progression: play, diff what was saved, second session on the same profile, score P0..P3
WORKERS=2 node qa/harness/progression.mjs                # -> qa/health-results/progression/progression.md

# 3b. The whole portfolio in slot-locked batches (resumable): bash qa/harness/run-batches.sh health 2 2 ; bash qa/harness/run-batches.sh progression 2 2

# 4. Does the harness detect what it claims? 10 fixtures that pass, freeze, hang, lose their loop, never start, ...
node qa/harness/selftest.mjs
```

Environment: `GAME_IDS`, `WORKERS` (default 2), `ENGINE=chromium|webkit`, `THROTTLE` (default 4, Chromium only), `DURATION` (seconds, default 45; progression 40 + `DURATION2` 12), `REPORT_DIR`, `CHUNK=i/n`, `SKIP_DONE=1`, `RECHECK=0` (do not re-run a FREEZE), `FIXTURES=1` (use `qa/harness/fixtures`), `SEED` is fixed per game so the same monkey plays each time.

## What is measured

Injected before any page script (`lib/inject.js`): a `longtask` observer (Chromium only) and a 100 ms timer heartbeat (all engines: a late timer means a blocked main thread), long-animation-frame attribution (Chromium: which script blocked), a wrapper on `requestAnimationFrame` (JS cost of each frame, minus time spent inside GPU-blocking WebGL calls, and the gap between frames), `visibilitychange`, `pagehide`, `webglcontextlost`, uncaught errors, `ArcadeSDK.state()` (scene and score trajectory), counts of AudioContexts, Audio elements, WebGL contexts, canvases with their memory, DOM nodes, and (Chromium) the JS heap after a forced GC and `Performance.getMetrics` (event listeners, main-thread busy time).

Verdicts:

| Verdict | Fires when |
|---|---|
| FREEZE | main thread blocked over 1.5 s (long task or heartbeat), or no animation frame for 3 s while visible and not paused (unless the game said it was on the title or game over screen), or the page crashed / reloaded on its own / lost its WebGL context, or the page stopped answering the harness |
| STALL | the SDK never reports `play` after the start attempts; or the game starts only with a keyboard key (a phone has none); or nothing on screen changed for 20 s under input; or a game over screen was reached and the game never got back to play |
| JANK | p95 JS frame cost over 16 ms (CPU throttled x4) or 33 ms (unthrottled), at least 30 frames |
| LEAK | JS heap grows over 60% (and over 8 MB) between the start and end of play after a forced GC; or DOM nodes / event listeners explode |
| ERRORS | uncaught page errors |

A FREEZE is re-run once; the report says whether it reproduced. Memory risks that are not verdicts on their own (canvas memory over 224 MB, a canvas over 16.7 Mpx, many AudioContexts, many WebGL contexts) are listed as `risks`.


## What is plainly an artefact of the loaded box (do not chase these)

The box runs at load 15 to 20 on 4 cores while this is measured, and Chromium here renders WebGL in software. Rules of thumb, in the order to apply them:

1. **A FREEZE or JANK row marked "NOT reproduced on re-run" is the box, not the game.** Every FREEZE is re-run once. Only rows marked "reproduced" are findings.
2. **"N touch inputs not acknowledged within 4 s"** on a game whose main thread was otherwise fine is Playwright's input round trip queueing behind other agents' browsers. It is only counted when the game's own main thread was also blocked over 0.5 s while playing.
3. **Frame gaps, fps, and "frames per second" numbers** in `games/<id>.json` (`gapMedian`, `gapP95`) mean nothing: they measure how long this machine took to get round to the browser. Judge `frames.jsP95` (JS cost per frame, divided by the machine slowdown measured at that time) and the long-task numbers.
4. **Absolute milliseconds of a load-phase block on 3D and engine games** (Godot, Unity, three.js) are inflated by software WebGL and by CPU throttle x4 on a busy core. The ordering (which game blocks longer) and the reproduced flag are real; "11 s" does not mean 11 s on an iPhone. The WebKit run (unthrottled) is the fairer number for those.
5. **`Unable to decode audio data`** in Chromium here: the Playwright Chromium build has no AAC/proprietary codecs, so `.m4a`/AAC files fail to decode. Check the file format before calling it a bug; iOS Safari decodes AAC.
6. **`Failed to start the audio device`** (WebKit): the sandbox has no sound card. Ignored by the harness.
7. **`start button not tappable`** used to be a false STALL: Playwright's `tap()` waits for the element to stop moving, and a pulsing Play button never does. The harness now taps the button's centre when `tap()` times out (same `fingerTap` idea as `iphone.mjs`); rows from before that change were re-run.
8. **The bot's own look at the screen** (one `page.evaluate` per action) and the calibration benchmark are tagged inside the page and excluded from long-task and freeze numbers.
9. WebKit here is Playwright's Linux build (WPE), not iOS Safari: same JavaScript engine and layout engine, different graphics, memory limits and audio unlock. A game that freezes in it deserves a look; a game that passes in it can still die on a phone through memory.

## Honest limits

- Software WebGL (SwiftShader) makes the GPU part meaningless. Verdicts are on JS cost, long tasks and stalls, never fps. GPU-blocking GL call time is subtracted from the frame cost.
- The machine is shared and loaded. CPU throttle x4 multiplies an already busy core. The report gives the load average and a measured benchmark slowdown; FREEZE is re-run for that reason. Absolute milliseconds are pessimistic; the ranking and the repeat rate are what to trust.
- WebKit has no CPU throttle and no long-task API. There the heartbeat and the harness's own poll latency stand in for it; JS heap is not readable.
- Taps are real touches in both engines. Swipes and holds are real touches in Chromium (CDP) and synthetic `TouchEvent` + `PointerEvent` dispatches in WebKit (Playwright only has `tap()` there).
- A monkey is not a player. It finds crashes and dead ends; it does not judge fun. Progression is what the bot could reach in about a minute; menus behind buttons it does not press are seen only as labels.
- iOS Safari kills tabs on memory, which this machine cannot reproduce; canvas memory, AudioContext count and heap growth are proxies.

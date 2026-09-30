# Health report: freezes, stalls, jank, leaks and progression (iPhone 13 profile)

Measured with `qa/harness/health.mjs` and `progression.mjs` (see `qa/harness/HEALTH.md`; rerun with `bash qa/harness/run-batches.sh health 2 2`). Full tables: `qa/health-results/health.md`, `qa/health-results/webkit/health.md`, `qa/health-results/progression/progression.md`; every number in `games/<id>.json`.

## Headline

- **Chromium, iPhone 13 profile, CPU x4, 45 s monkey per game, 107 games:** FREEZE 31 (24 reproduced on a second run), JANK 29, STALL 16, ERRORS 3, clean 60. Games are in several classes at once.
- **WebKit (Safari engine, Linux build, unthrottled), 54 games** (every FREEZE/STALL non-Godot game, every learning game, Claire & Pip, Snake, Balloon Bust): only 7 clean. 22 games **crash the WebKit renderer** (page crashed on load or while playing), reproduced on a serial re-run for the ones re-run; 18 show `EncodingError: Decoding failed` (audio decode, see artefacts). Clean in WebKit: Quiz Tower, Living World, Fishing for Words, Balloon Bust, Word Scramble, Critter Rush 3D, Rap Academy.
- **Progression (Chromium, 40 s bot + 12 s second session):** P0 8, P1 53, P2 27, P3 19. Half the portfolio saves only a best score.
- **Harness self-test:** `node qa/harness/selftest.mjs` runs 14 fixtures (pass, main-thread freeze, hang forever, loop throws, never starts, keyboard-only start, jank, leak, self-reload, dead end at game over, P0/P1/P2+): all 14 detected as expected on Chromium (last run before the final small edits; rerun before relying on it).

## Findings that are artefacts of this loaded box (load 15 to 20 on 4 cores, software WebGL) - do not chase

1. FREEZE/JANK rows marked "not reproduced on re-run" (7 of 31 FREEZE).
2. "N touch inputs not acknowledged within 4 s": Playwright input queueing (Playwright `tap()` waits two animation frames, 10 to 25 s under this GPU starvation).
3. Blocks inside synchronous WebGL calls (`getProgramInfoLog`, `getShaderInfoLog`, `readPixels`, draws): software GL draining its queue. They are subtracted from the numbers and flagged "software-GL artefact"; Summit Line's 28 s is this (reports/FR1.md).
4. Absolute load-phase milliseconds on 3D/Godot games; only ordering and "reproduced" mean something.
5. `EncodingError: Decoding failed` (WebKit) and `Unable to decode audio data` (Chromium): the Playwright builds lack the codecs iOS Safari has. Check the audio file format.
6. Frame gaps / fps: meaningless here.
7. WebKit "Page crashed" is Playwright's Linux WebKit (WPE) dying; it reproduced serially for the hub games re-run, so it deserves a look, but it is not proof of an iPhone crash: iPhone memory limits, GPU and codecs differ. Not verified on a real iPhone.

## What I did not verify

Real iPhone Safari memory kills; GPU cost; audio unlock; whether a monkey reaches the deep content of each game; menus behind buttons the bot did not press (progression only sees what the bot reached). Suggested causes below are static-source hints, not proven.

## Ranked worst-first list (Chromium), with WebKit result and P level

### Worst 25 in Chromium (iPhone 13 profile, CPU x4, 45 s monkey)

1. **Clean House** (`clean-house`, sim, three): **FREEZE + JANK**
   - FREEZE: main thread blocked 16398 ms (during load), 1301 ms of it inside WebGL calls (software GL), machine slowdown x1.5 -> about 10064 ms of JS; long-task API + timer heartbeat; longest frame 16418 ms: CleanHouse/index.html http://127.0.0.1:36525/CleanHouse/index.html 8228 /  FrameRequestCallback 8140
   - JANK: p95 JS frame cost 120.73 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.5; raw p95 181.1, median 4, p99 2133.87, max 2133.9; time inside WebGL calls excluded, p95 of it 6.4)
   - re-run: FREEZE reproduced (blocked 14428 ms at load, 196 ms in play)
   - WebKit: FREEZE+STALL (main thread blocked 3485 ms (during load), 547 ms of it inside WebGL calls (software GL), machine slowdown x1.2 -> about 2389 ms of JS; timer heartbeat (no long-task API in this engine) | page crashed (renderer process d)
   - progression: P2 (progress persists (currency) with unlocks, upgrades, stars, goals, daily)
   - screenshots: qa/health-results/shots/clean-house-1-title.jpg, qa/health-results/shots/clean-house-2-mid.jpg, qa/health-results/shots/clean-house-3-end.jpg
2. **Crowd Clash** (`crowd-clash`, hyper, three): **FREEZE + JANK**
   - FREEZE: main thread blocked 17968 ms (during load), 5660 ms of it inside WebGL calls (software GL), machine slowdown x1.5 -> about 8316 ms of JS; long-task API + timer heartbeat; longest frame 17914.1 ms: CrowdClash/index.html https://calebhomwe.github.io/playables/CrowdClash/index.html 13062 /  FrameRequestCallback 4840
   - JANK: p95 JS frame cost 26.08 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.5; raw p95 38.6, median 9.93, p99 84.66, max 84.7; time inside WebGL calls excluded, p95 of it 13.4)
   - re-run: FREEZE reproduced (blocked 3535 ms at load, 90 ms in play)
   - WebKit: FREEZE (main thread blocked 5528 ms (during load), 1398 ms of it inside WebGL calls (software GL), machine slowdown x1.1 -> about 3755 ms of JS; timer heartbeat (no long-task API in this engine) | page crashed (renderer process )
   - progression: P1 (saves some state but shows no unlock, upgrade, goal or level system)
   - screenshots: qa/health-results/shots/crowd-clash-1-title.jpg, qa/health-results/shots/crowd-clash-2-mid.jpg, qa/health-results/shots/crowd-clash-3-end.jpg
3. **Dominion** (`dominion`, sim, canvas): **FREEZE + JANK**
   - FREEZE: main thread blocked 11352 ms (during load), 0 ms of it inside WebGL calls (software GL), machine slowdown x1.6 -> about 7095 ms of JS; long-task API + timer heartbeat; longest frame 26336.7 ms:  TimerHandler:setTimeout 6 /  TimerHandler:setTimeout 8 /  TimerHandler:setTimeout 49 | 3 touch inputs not acknowledged within 4 s while the main thread was blocked
   - JANK: p95 JS frame cost 50.19 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.6; raw p95 80.3, median 12.25, p99 62.75, max 62.8; time inside WebGL calls excluded, p95 of it 0)
   - re-run: FREEZE reproduced (blocked 7417 ms at load, 186 ms in play)
   - WebKit: FREEZE+JANK (main thread blocked 4163 ms (during load), 0 ms of it inside WebGL calls (software GL), machine slowdown x1.3 -> about 3330 ms of JS; timer heartbeat (no long-task API in this engine) | p95 JS frame cost 48.8 ms over 33 )
   - suspects in the source: 1 setInterval call(s) and no clearInterval anywhere in the source
   - progression: P2 (progress persists (levels) with levels, stars)
   - screenshots: qa/health-results/shots/dominion-2-mid.jpg, qa/health-results/shots/dominion-3-end.jpg
4. **Critter Rush 3D** (`critter-rush`, arcade, three): **FREEZE + JANK**
   - FREEZE: main thread blocked 19592 ms (during load), 7734 ms of it inside WebGL calls (software GL), machine slowdown x1.9 -> about 6144 ms of JS; long-task API + timer heartbeat; longest frame 19555.6 ms: CritterRush/index.html http://127.0.0.1:33351/CritterRush/index.html 19463 /  FrameRequestCallback 80
   - JANK: p95 JS frame cost 70.78 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.9; raw p95 136.6, median 19.17, p99 111.24, max 111.2; time inside WebGL calls excluded, p95 of it 6.4)
   - re-run: FREEZE reproduced (blocked 6854 ms at load, 229 ms in play)
   - WebKit: clean
   - suspects in the source: 1 setInterval call(s) and no clearInterval anywhere in the source
   - progression: P1 (saves some state but shows no unlock, upgrade, goal or level system)
   - screenshots: qa/health-results/shots/critter-rush-1-title.jpg, qa/health-results/shots/critter-rush-2-mid.jpg, qa/health-results/shots/critter-rush-3-end.jpg
5. **TIDEBREAK** (`godot-tidebreak`, arcade, godot): **FREEZE + JANK + STALL**
   - FREEZE: main thread blocked 7691 ms (during load), 1874 ms of it inside WebGL calls (software GL), machine slowdown x1.5 -> about 3957 ms of JS; long-task API + timer heartbeat; longest frame 6532.8 ms: _engine/godot.js IDBRequest.onsuccess 6473 /  FrameRequestCallback 30
   - JANK: p95 JS frame cost 18.37 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.5; raw p95 27, median 6.33, p99 28.37, max 106.6; time inside WebGL calls excluded, p95 of it 538.1)
   - STALL: game never reported play after the start attempts (start: tap centre + tap on game); scenes seen: title | nothing on screen changed for 42 s while the bot kept tapping
   - re-run: FREEZE reproduced (blocked 3375 ms at load, 485 ms in play)
   - suspects in the source: Godot web export: the wasm + pck load and compile on the main thread and use 200 to 500 MB; iOS Safari kills or reloads the tab above its memory limit
   - progression: P0 (nothing that counts as progress was saved (no localStorage, IndexedDB or cookie change))
   - screenshots: qa/health-results/shots/godot-tidebreak-1-title.jpg, qa/health-results/shots/godot-tidebreak-2-mid.jpg, qa/health-results/shots/godot-tidebreak-3-end.jpg
6. **TIDEBREAK World Tour** (`godot-tidebreak-world-tour`, sim, godot): **FREEZE + JANK + STALL**
   - FREEZE: main thread blocked 6817 ms (during load), 1769 ms of it inside WebGL calls (software GL), machine slowdown x1.3 -> about 3853 ms of JS; long-task API + timer heartbeat; longest frame 5764.7 ms: _engine/godot.js IDBRequest.onsuccess 5622 /  FrameRequestCallback 130
   - JANK: p95 JS frame cost 19.39 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.3; raw p95 25.4, median 5.95, p99 31.91, max 173.7; time inside WebGL calls excluded, p95 of it 494.8)
   - STALL: game never reported play after the start attempts (start: tap centre + tap on game); scenes seen: title | nothing on screen changed for 27 s while the bot kept tapping
   - re-run: FREEZE reproduced (blocked 3840 ms at load, 185 ms in play)
   - suspects in the source: Godot web export: the wasm + pck load and compile on the main thread and use 200 to 500 MB; iOS Safari kills or reloads the tab above its memory limit
   - progression: P0 (nothing that counts as progress was saved (no localStorage, IndexedDB or cookie change))
   - screenshots: qa/health-results/shots/godot-tidebreak-world-tour-1-title.jpg, qa/health-results/shots/godot-tidebreak-world-tour-2-mid.jpg, qa/health-results/shots/godot-tidebreak-world-tour-3-end.jpg
7. **Helix Smash** (`hub-helix-smash`, hyper, three): **FREEZE + JANK**
   - FREEZE: main thread blocked 13425 ms (during load), 4517 ms of it inside WebGL calls (software GL), machine slowdown x1.6 -> about 5567 ms of JS; long-task API + timer heartbeat; longest frame 13786.3 ms: games/helix-smash.html https://calebhomwe.github.io/arcade-hub/games/helix-smash.html 9524 /  FrameRequestCallback 3829
   - JANK: p95 JS frame cost 17.81 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.6; raw p95 28.5, median 3.19, p99 236.31, max 362.1; time inside WebGL calls excluded, p95 of it 3.4)
   - re-run: FREEZE reproduced (blocked 4702 ms at load, 669 ms in play)
   - WebKit: STALL+FREEZE (did not load: page.goto: Page crashed
Call log:
[2m  - navigating to "https://calebhomwe.github.io/arcade-hub/games/helix-smash.html", waiting until "load"[22m
 | page crashed (renderer process died))
   - suspects in the source: 23 `new Audio()` calls (an element per sound); calls location.reload(); uses alert/confirm/prompt (blocks the page); inline script over 400 KB (parsed synchronously on load); 2 THREE.WebGLRenderer constructions (each is a WebGL context; iOS loses the oldest above about 8)
   - progression: P3 (progress persists (levels, stars, currency, unlocks, goals, daily, cosmetics); systems seen: levels, unlocks, stars, goals, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/daily/currency)
   - screenshots: qa/health-results/shots/hub-helix-smash-1-title.jpg, qa/health-results/shots/hub-helix-smash-2-mid.jpg, qa/health-results/shots/hub-helix-smash-3-end.jpg
8. **Heat Firm** (`godot-heat-firm`, sim, godot): **FREEZE + JANK + STALL**
   - FREEZE: main thread blocked 9126 ms (during load), 2359 ms of it inside WebGL calls (software GL), machine slowdown x2.1 -> about 3285 ms of JS; long-task API + timer heartbeat; longest frame 7094.5 ms: _engine/godot.js IDBOpenDBRequest.onupgradeneeded 5 / _engine/godot.js IDBOpenDBRequest.onsuccess 7 / _engine/godot.js IDBRequest.onsuccess 7029
   - JANK: p95 JS frame cost 24.81 ms over 16 ms (CPU throttled x4, divided by machine slowdown x2.1; raw p95 51.1, median 5.19, p99 57.18, max 143; time inside WebGL calls excluded, p95 of it 924.2)
   - STALL: started only with a keyboard key (tap centre + tap on game + KEY Enter); a phone has no keyboard | nothing on screen changed for 29 s while the bot kept tapping
   - re-run: FREEZE reproduced (blocked 3363 ms at load, 264 ms in play)
   - suspects in the source: Godot web export: the wasm + pck load and compile on the main thread and use 200 to 500 MB; iOS Safari kills or reloads the tab above its memory limit
   - progression: P0 (nothing that counts as progress was saved (no localStorage, IndexedDB or cookie change))
   - screenshots: qa/health-results/shots/godot-heat-firm-1-title.jpg, qa/health-results/shots/godot-heat-firm-2-mid.jpg, qa/health-results/shots/godot-heat-firm-3-end.jpg
9. **Hole Grind** (`hole-grind`, hyper, three): **FREEZE + JANK**
   - FREEZE: main thread blocked 8009 ms (during load), 914 ms of it inside WebGL calls (software GL), machine slowdown x1.4 -> about 5217 ms of JS; long-task API + timer heartbeat; longest frame 9565.5 ms: three/three.core.min.js Response.blob.then 7 / three/three.core.min.js Promise.resolve 24 / three/three.core.min.js Promise.resolve 12
   - JANK: p95 JS frame cost 30.15 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.4; raw p95 41, median 6.18, p99 274.63, max 615.4; time inside WebGL calls excluded, p95 of it 4.1)
   - re-run: FREEZE reproduced (blocked 4314 ms at load, 286 ms in play)
   - WebKit: FREEZE+JANK+ERRORS (main thread blocked 4133 ms (while playing), 109 ms of it inside WebGL calls (software GL), machine slowdown x1.1 -> about 3530 ms of JS; timer heartbeat (no long-task API in this engine) | p95 JS frame cost 116.67 ms ov)
   - suspects in the source: uses alert/confirm/prompt (blocks the page)
   - progression: P3 (progress persists (levels, stars, currency, unlocks); systems seen: levels, unlocks, upgrades, stars, goals, daily, cosmetics; sinks unlocks/upgrades/cosmetics fed by levels/stars/goals/daily/currency)
   - screenshots: qa/health-results/shots/hole-grind-1-title.jpg, qa/health-results/shots/hole-grind-2-mid.jpg, qa/health-results/shots/hole-grind-3-end.jpg
10. **Chess** (`hub-chess`, classic, canvas): **FREEZE + JANK**
   - FREEZE: main thread blocked 6230 ms (during load), 0 ms of it inside WebGL calls (software GL), machine slowdown x1.2 -> about 5149 ms of JS; long-task API + timer heartbeat; longest frame 2724 ms: games/chess.html IMG[src=assets/pieces/w_king.png].onload 2383
   - JANK: 3 long tasks of 100 ms or more while playing (no rAF loop to measure)
   - re-run: FREEZE reproduced (blocked 5422 ms at load, 126 ms in play)
   - WebKit: STALL+FREEZE (did not load: page.goto: Page crashed
Call log:
[2m  - navigating to "https://calebhomwe.github.io/arcade-hub/games/chess.html", waiting until "load"[22m
 | page crashed (renderer process died))
   - suspects in the source: 23 `new Audio()` calls (an element per sound); calls location.reload(); uses alert/confirm/prompt (blocks the page); inline script over 400 KB (parsed synchronously on load); 2 THREE.WebGLRenderer constructions (each is a WebGL context; iOS loses the oldest above about 8)
   - progression: P2 (progress persists (save-blob) with cosmetics)
   - screenshots: qa/health-results/shots/hub-chess-1-title.jpg, qa/health-results/shots/hub-chess-2-mid.jpg, qa/health-results/shots/hub-chess-3-end.jpg
11. **Idle Empire** (`hub-idle-empire`, idle, canvas): **FREEZE + JANK**
   - FREEZE: main thread blocked 6202 ms (during load), 0 ms of it inside WebGL calls (software GL), machine slowdown x1.3 -> about 4845 ms of JS; long-task API + timer heartbeat; longest frame 8135.2 ms:  TimerHandler:setTimeout 8 /  FrameRequestCallback 6189
   - JANK: p95 JS frame cost 769.3 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.3; raw p95 984.7, median 450.94, p99 974.92, max 974.9; time inside WebGL calls excluded, p95 of it 0)
   - re-run: FREEZE reproduced (blocked 1596 ms at load, 1508 ms in play)
   - WebKit: ERRORS (1 uncaught page error(s): EncodingError: Decoding failed)
   - suspects in the source: 23 `new Audio()` calls (an element per sound); calls location.reload(); uses alert/confirm/prompt (blocks the page); inline script over 400 KB (parsed synchronously on load); 2 THREE.WebGLRenderer constructions (each is a WebGL context; iOS loses the oldest above about 8)
   - progression: P1 (saves some state but shows no unlock, upgrade, goal or level system)
   - screenshots: qa/health-results/shots/hub-idle-empire-1-title.jpg, qa/health-results/shots/hub-idle-empire-2-mid.jpg, qa/health-results/shots/hub-idle-empire-3-end.jpg
12. **Stack Ball** (`hub-stack-ball`, hyper, three): **FREEZE + JANK**
   - FREEZE: main thread blocked 11264 ms (during load), 4985 ms of it inside WebGL calls (software GL), machine slowdown x1.3 -> about 4721 ms of JS; long-task API + timer heartbeat; longest frame 11005.4 ms: games/stack-ball.html https://calebhomwe.github.io/arcade-hub/games/stack-ball.html 7001 /  FrameRequestCallback 3955
   - JANK: p95 JS frame cost 25.94 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.3; raw p95 34.5, median 3.68, p99 400.23, max 441.7; time inside WebGL calls excluded, p95 of it 3.3)
   - re-run: FREEZE reproduced (blocked 4295 ms at load, 652 ms in play)
   - WebKit: STALL+FREEZE (did not load: page.goto: Page crashed
Call log:
[2m  - navigating to "https://calebhomwe.github.io/arcade-hub/games/stack-ball.html", waiting until "load"[22m
 | page crashed (renderer process died))
   - suspects in the source: 23 `new Audio()` calls (an element per sound); calls location.reload(); uses alert/confirm/prompt (blocks the page); inline script over 400 KB (parsed synchronously on load); 2 THREE.WebGLRenderer constructions (each is a WebGL context; iOS loses the oldest above about 8)
   - progression: P3 (progress persists (levels, stars, currency, unlocks, goals, daily, cosmetics); systems seen: levels, unlocks, stars, goals, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/daily/currency)
   - screenshots: qa/health-results/shots/hub-stack-ball-1-title.jpg, qa/health-results/shots/hub-stack-ball-2-mid.jpg, qa/health-results/shots/hub-stack-ball-3-end.jpg
13. **Bridge Rush** (`bridge-rush`, hyper, three): **FREEZE + JANK**
   - FREEZE: main thread blocked 10337 ms (during load), 4664 ms of it inside WebGL calls (software GL), machine slowdown x1.3 -> about 4331 ms of JS; long-task API + timer heartbeat; longest frame 10793.2 ms: BridgeRush/index.html https://calebhomwe.github.io/playables/BridgeRush/index.html 6754 /  FrameRequestCallback 3610
   - JANK: p95 JS frame cost 34.58 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.3; raw p95 45.3, median 11.6, p99 88.63, max 88.6; time inside WebGL calls excluded, p95 of it 4)
   - re-run: FREEZE reproduced (blocked 5796 ms at load, 221 ms in play)
   - WebKit: FREEZE (main thread blocked 5584 ms (during load), 1542 ms of it inside WebGL calls (software GL), machine slowdown x1.1 -> about 3675 ms of JS; timer heartbeat (no long-task API in this engine) | page crashed (renderer process )
   - progression: P1 (saves some state but shows no unlock, upgrade, goal or level system)
   - screenshots: qa/health-results/shots/bridge-rush-1-title.jpg, qa/health-results/shots/bridge-rush-2-mid.jpg, qa/health-results/shots/bridge-rush-3-end.jpg
14. **Rung Runner** (`rung-runner`, hyper, three): **FREEZE + JANK**
   - FREEZE: main thread blocked 10169 ms (during load), 3973 ms of it inside WebGL calls (software GL), machine slowdown x1.5 -> about 4158 ms of JS; long-task API + timer heartbeat; longest frame 10231.7 ms: RungRunner/index.html https://calebhomwe.github.io/playables/RungRunner/index.html 6253 /  FrameRequestCallback 3966
   - JANK: p95 JS frame cost 43.69 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.5; raw p95 65.1, median 10.13, p99 62.55, max 62.6; time inside WebGL calls excluded, p95 of it 7.1)
   - re-run: FREEZE reproduced (blocked 3649 ms at load, 122 ms in play)
   - WebKit: FREEZE (page crashed (renderer process died))
   - progression: P1 (saves a best score but shows no unlock, upgrade, goal or level system)
   - screenshots: qa/health-results/shots/rung-runner-1-title.jpg, qa/health-results/shots/rung-runner-2-mid.jpg, qa/health-results/shots/rung-runner-3-end.jpg
15. **Bloxburg Town** (`bloxburg-town`, sim, unity): **FREEZE + JANK + ERRORS**
   - FREEZE: main thread blocked 3339 ms (during load), 46 ms of it inside WebGL calls (software GL), machine slowdown x1.9 -> about 1724 ms of JS; long-task API + timer heartbeat; longest frame 13868.2 ms:  TimerHandler:setTimeout 7 / assets/arcade-sdk.js TimerHandler:setTimeout 7 / assets/arcade-sdk.js TimerHandler:setTimeout 7
   - JANK: 6 long tasks of 100 ms or more while playing (no rAF loop to measure)
   - ERRORS: 2 uncaught page error(s): Unable to decode audio data
   - re-run: FREEZE reproduced (blocked 372 ms at load, 1717 ms in play)
   - WebKit: FREEZE+JANK+ERRORS+STALL (main thread blocked 2801 ms (while playing), 13 ms of it inside WebGL calls (software GL), machine slowdown x1.4 -> about 2065 ms of JS; timer heartbeat (no long-task API in this engine) | p95 JS frame cost 34.07 ms over)
   - suspects in the source: Unity WebGL build: wasm compile and heap over the iOS limit
   - progression: P1 (saves some state but shows no unlock, upgrade, goal or level system)
   - screenshots: qa/health-results/shots/bloxburg-town-1-title.jpg
16. **Hole Eater** (`sky-hole-eater`, hyper, three): **FREEZE + JANK**
   - FREEZE: main thread blocked 4403 ms (during load), 359 ms of it inside WebGL calls (software GL), machine slowdown x1.4 -> about 2952 ms of JS; long-task API + timer heartbeat; longest frame 4403.8 ms: skywalker-playables/hole-eater.html https://calebhomwe.github.io/neon-game-arcade/games/skywalker-playables/hole-eater.html 4388
   - JANK: p95 JS frame cost 18.03 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.4; raw p95 24.7, median 4.09, p99 41.9, max 222.3; time inside WebGL calls excluded, p95 of it 4.4)
   - re-run: FREEZE reproduced (blocked 4057 ms at load, 496 ms in play)
   - WebKit: JANK+ERRORS (p95 JS frame cost 72.03 ms over 33 ms (unthrottled, divided by machine slowdown x1.2; raw p95 85, median 9.32, p99 103.39, max 135.6; time inside WebGL calls excluded, p95 of it 229) | 3 uncaught page error(s): EncodingE)
   - suspects in the source: 55 requestAnimationFrame calls, no cancelAnimationFrame (possible duplicate loops after restart)
   - progression: P1 (saves some state but shows no unlock, upgrade, goal or level system)
   - screenshots: qa/health-results/shots/sky-hole-eater-1-title.jpg, qa/health-results/shots/sky-hole-eater-2-mid.jpg, qa/health-results/shots/sky-hole-eater-3-end.jpg
17. **Helix Drop** (`helix-drop`, hyper, three): **FREEZE + JANK**
   - FREEZE: main thread blocked 9583 ms (during load), 5948 ms of it inside WebGL calls (software GL), machine slowdown x1.3 -> about 2713 ms of JS; long-task API + timer heartbeat; longest frame 9634.6 ms: HelixDrop/index.html https://calebhomwe.github.io/playables/HelixDrop/index.html 4093 /  FrameRequestCallback 5534
   - JANK: p95 JS frame cost 27.46 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.3; raw p95 36.8, median 5.97, p99 38.73, max 38.7; time inside WebGL calls excluded, p95 of it 5.4)
   - re-run: FREEZE reproduced (blocked 2599 ms at load, 342 ms in play)
   - WebKit: FREEZE+STALL (page crashed (renderer process died) | game never reported play after the start attempts (start: #play + tap on game); scenes seen: title)
   - progression: P1 (saves some state but shows no unlock, upgrade, goal or level system)
   - screenshots: qa/health-results/shots/helix-drop-1-title.jpg, qa/health-results/shots/helix-drop-2-mid.jpg, qa/health-results/shots/helix-drop-3-end.jpg
18. **Critter Rush 2D** (`critter-rush-2d`, arcade, canvas): **FREEZE + STALL**
   - FREEZE: main thread blocked 3907 ms (while playing), 0 ms of it inside WebGL calls (software GL), machine slowdown x1.5 -> about 2537 ms of JS; long-task API + timer heartbeat; longest frame 4445.6 ms:  TimerHandler:setTimeout 5 /  TimerHandler:setTimeout 8 | 3 touch inputs not acknowledged within 4 s while the main thread was blocked
   - STALL: started only with a keyboard key (tap centre + EASY + EASY + EASY + tap on game + KEY Enter); a phone has no keyboard
   - re-run: did NOT reproduce (STALL, machine load 17.11)
   - WebKit: STALL (started only with a keyboard key (tap centre + EASY + EASY + EASY + tap on game + KEY Enter); a phone has no keyboard)
   - progression: P1 (saves some state but shows no unlock, upgrade, goal or level system)
   - screenshots: qa/health-results/shots/critter-rush-2d-1-title.jpg, qa/health-results/shots/critter-rush-2d-2-mid.jpg, qa/health-results/shots/critter-rush-2d-3-end.jpg
19. **Dominion: Living World** (`living-world`, sim, canvas): **FREEZE + JANK**
   - FREEZE: main thread blocked 4523 ms (during load), 0 ms of it inside WebGL calls (software GL), machine slowdown x1.9 -> about 2406 ms of JS; long-task API + timer heartbeat; longest frame 6016.8 ms: unattributed
   - JANK: p95 JS frame cost 18.19 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.9; raw p95 34.2, median 2.07, p99 18.72, max 18.7; time inside WebGL calls excluded, p95 of it 0)
   - re-run: FREEZE reproduced (blocked 3249 ms at load, 245 ms in play)
   - WebKit: clean
   - suspects in the source: 1 setInterval call(s) and no clearInterval anywhere in the source
   - progression: P2 (progress persists (levels, currency) with levels)
   - screenshots: qa/health-results/shots/living-world-1-title.jpg, qa/health-results/shots/living-world-2-mid.jpg, qa/health-results/shots/living-world-3-end.jpg
20. **Claire's Farm** (`claire-farm`, sim, three): **FREEZE + JANK**
   - FREEZE: main thread blocked 2824 ms (during load), 0 ms of it inside WebGL calls (software GL), machine slowdown x1.4 -> about 2046 ms of JS; long-task API + timer heartbeat; longest frame 7245.6 ms:  TimerHandler:setTimeout 6 /  TimerHandler:setTimeout 7 /  FrameRequestCallback 73
   - JANK: p95 JS frame cost 59.06 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.4; raw p95 81.5, median 13.04, p99 315.58, max 315.6; time inside WebGL calls excluded, p95 of it 3.9)
   - re-run: did NOT reproduce (clean, machine load 15.89)
   - WebKit: FREEZE+STALL (main thread blocked 9096 ms (while playing), 1498 ms of it inside WebGL calls (software GL), machine slowdown x1.1 -> about 7168 ms of JS; timer heartbeat (no long-task API in this engine) | page did not answer the harne)
   - suspects in the source: 7 requestAnimationFrame calls, no cancelAnimationFrame (possible duplicate loops after restart); calls location.reload()
   - progression: P0 (nothing that counts as progress was saved (no localStorage, IndexedDB or cookie change))
   - screenshots: qa/health-results/shots/claire-farm-1-title.jpg, qa/health-results/shots/claire-farm-2-mid.jpg, qa/health-results/shots/claire-farm-3-end.jpg
21. **SneakerDrop — Hype Market Tycoon** (`sneaker-drop`, sim, canvas): **FREEZE + JANK**
   - FREEZE: main thread blocked 2796 ms (while playing), 0 ms of it inside WebGL calls (software GL), machine slowdown x1.4 -> about 2026 ms of JS; long-task API + timer heartbeat; longest frame 6055.9 ms:  FrameRequestCallback 70 | 2 touch inputs not acknowledged within 4 s while the main thread was blocked
   - JANK: p95 JS frame cost 108.48 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.4; raw p95 149.7, median 3.12, p99 116.3, max 116.3; time inside WebGL calls excluded, p95 of it 0)
   - re-run: did NOT reproduce (clean, machine load 15.7)
   - WebKit: FREEZE+STALL (page crashed (renderer process died) | game never reported play after the start attempts (start: #startBtn + tap on game); scenes seen: title)
   - progression: P1 (saves some state and save-blob but shows no unlock, upgrade, goal or level system)
   - screenshots: qa/health-results/shots/sneaker-drop-1-title.jpg, qa/health-results/shots/sneaker-drop-2-mid.jpg, qa/health-results/shots/sneaker-drop-3-end.jpg
22. **Bridge Race** (`bridge-race-classic`, hyper, three): **FREEZE + JANK**
   - FREEZE: main thread blocked 3206 ms (during load), 146 ms of it inside WebGL calls (software GL), machine slowdown x1.6 -> about 1949 ms of JS; long-task API + timer heartbeat; longest frame 3829.3 ms: games/bridge-race-classic.html https://calebhomwe.github.io/neon-game-arcade/games/bridge-race-classic.html 3204 | 2 touch inputs not acknowledged within 4 s while the main thread was blocked
   - JANK: p95 JS frame cost 27.52 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.6; raw p95 43.2, median 4.2, p99 159.3, max 290.8; time inside WebGL calls excluded, p95 of it 4.4)
   - re-run: FREEZE reproduced (blocked 1928 ms at load, 654 ms in play)
   - WebKit: JANK+ERRORS (p95 JS frame cost 34.56 ms over 33 ms (unthrottled, divided by machine slowdown x1.4; raw p95 47, median 5.88, p99 310.29, max 310.3; time inside WebGL calls excluded, p95 of it 131) | 3 uncaught page error(s): EncodingE)
   - suspects in the source: 5 THREE.WebGLRenderer constructions (each is a WebGL context; iOS loses the oldest above about 8)
   - progression: P1 (saves some state but shows no unlock, upgrade, goal or level system)
   - screenshots: qa/health-results/shots/bridge-race-classic-1-title.jpg, qa/health-results/shots/bridge-race-classic-2-mid.jpg, qa/health-results/shots/bridge-race-classic-3-end.jpg
23. **Cook Rush** (`cook-rush`, arcade, canvas): **FREEZE + JANK**
   - FREEZE: main thread blocked 2360 ms (while playing), 0 ms of it inside WebGL calls (software GL), machine slowdown x1.3 -> about 1873 ms of JS; long-task API + timer heartbeat; longest frame 5823.4 ms:  FrameRequestCallback 16 | 2 touch inputs not acknowledged within 4 s while the main thread was blocked
   - JANK: p95 JS frame cost 22.06 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.3; raw p95 27.8, median 3.25, p99 26.51, max 26.5; time inside WebGL calls excluded, p95 of it 0)
   - re-run: did NOT reproduce (clean, machine load 18.65)
   - WebKit: FREEZE+STALL (page crashed (renderer process died) | game never reported play after the start attempts (start: tap centre + TAP TO COOK + tap on game); scenes seen: title)
   - suspects in the source: 1 setInterval call(s) and no clearInterval anywhere in the source
   - progression: P2 (progress persists (levels, stars, currency, daily) with levels, stars, goals, daily)
   - screenshots: qa/health-results/shots/cook-rush-1-title.jpg, qa/health-results/shots/cook-rush-2-mid.jpg, qa/health-results/shots/cook-rush-3-end.jpg
24. **Hole Swallow** (`hub-hole-swallow`, hyper, three): **FREEZE**
   - FREEZE: main thread blocked 7182 ms (during load), 731 ms of it inside WebGL calls (software GL), machine slowdown x1.6 -> about 3910 ms of JS; long-task API + timer heartbeat; longest frame 7335.3 ms: games/hole-swallow.html https://calebhomwe.github.io/arcade-hub/games/hole-swallow.html 9 / games/hole-swallow.html https://calebhomwe.github.io/arcade-hub/games/hole-swallow.html 6970 /  FrameRequestCallback 31
   - re-run: FREEZE reproduced (blocked 2451 ms at load, 290 ms in play)
   - WebKit: STALL+FREEZE (did not load: page.goto: Page crashed
Call log:
[2m  - navigating to "https://calebhomwe.github.io/arcade-hub/games/hole-swallow.html", waiting until "load"[22m
 | page crashed (renderer process died))
   - suspects in the source: 23 `new Audio()` calls (an element per sound); calls location.reload(); uses alert/confirm/prompt (blocks the page); inline script over 400 KB (parsed synchronously on load); 2 THREE.WebGLRenderer constructions (each is a WebGL context; iOS loses the oldest above about 8)
   - progression: P1 (saves a best score but shows no unlock, upgrade, goal or level system)
   - screenshots: qa/health-results/shots/hub-hole-swallow-1-title.jpg, qa/health-results/shots/hub-hole-swallow-2-mid.jpg, qa/health-results/shots/hub-hole-swallow-3-end.jpg
25. **City Builder 2000** (`godot-city-builder`, sim, godot): **FREEZE**
   - FREEZE: main thread blocked 18138 ms (during load), 12926 ms of it inside WebGL calls (software GL), machine slowdown x1.6 -> about 3278 ms of JS; long-task API + timer heartbeat; longest frame 10236.7 ms:  FrameRequestCallback 10053
   - re-run: FREEZE reproduced (blocked 2936 ms at load, 650 ms in play)
   - suspects in the source: Godot web export: the wasm + pck load and compile on the main thread and use 200 to 500 MB; iOS Safari kills or reloads the tab above its memory limit
   - progression: P0 (nothing that counts as progress was saved (no localStorage, IndexedDB or cookie change))
   - screenshots: qa/health-results/shots/godot-city-builder-1-title.jpg, qa/health-results/shots/godot-city-builder-3-end.jpg

### P0 and P1 games

**P0 (8)**

- City Builder 2000 (`godot-city-builder`, life-sim): nothing that counts as progress was saved (no localStorage, IndexedDB or cookie change). Lacks: goals, unlocks, cosmetics, achievements, daily. Claimed but not seen: levels, goals.
- Heat Firm (`godot-heat-firm`, idle): nothing that counts as progress was saved (no localStorage, IndexedDB or cookie change). Lacks: upgrades, unlocks, achievements, daily, goals. Claimed but not seen: levels, unlocks, upgrades, goals, cosmetics.
- LA City (`godot-la-city`, racing) (?): nothing that counts as progress was saved (no localStorage, IndexedDB or cookie change). Lacks: levels, unlocks, stars, cosmetics, achievements. Claimed but not seen: upgrades, goals.
- SwellRider (`godot-swellrider`, board-sports) (?): nothing that counts as progress was saved (no localStorage, IndexedDB or cookie change). Lacks: levels, unlocks, stars, cosmetics, achievements. Claimed but not seen: unlocks, stars, goals.
- TIDEBREAK (`godot-tidebreak`, board-sports) (?): nothing that counts as progress was saved (no localStorage, IndexedDB or cookie change). Lacks: levels, unlocks, stars, cosmetics, achievements. Claimed but not seen: levels, unlocks, stars, goals.
- Tic Tac Toe — Beat the Bot (`tic-tac-toe`, board): nothing that counts as progress was saved (settings only). Lacks: levels, stars, achievements, unlocks.
- TIDEBREAK World Tour (`godot-tidebreak-world-tour`, board-sports) (?): nothing that counts as progress was saved (no localStorage, IndexedDB or cookie change). Lacks: unlocks, stars, cosmetics, achievements. Claimed but not seen: unlocks, stars, goals.
- Claire's Farm (`claire-farm`, life-sim): nothing that counts as progress was saved (no localStorage, IndexedDB or cookie change). Lacks: -. Claimed but not seen: upgrades, stars.

**P1 (53)**

- Bridge Race (`bridge-race-classic`, hyper-casual): saves some state but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals.
- Critter Rush 3D (`critter-rush`, racing): saves some state but shows no unlock, upgrade, goal or level system. Lacks: levels, unlocks, stars, cosmetics, achievements. Claimed but not seen: levels.
- Critter Rush 2D (`critter-rush-2d`, racing): saves some state but shows no unlock, upgrade, goal or level system. Lacks: levels, unlocks, stars, cosmetics, achievements. Claimed but not seen: levels, achievements.
- Color Switch (`hub-color-switch`, hyper-casual): saves a best score but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals. Claimed but not seen: daily.
- Tower Stack (`hub-tower-stack`, hyper-casual): saves a best score but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals.
- Balance Tile (`sky-balance-tile`, hyper-casual): saves a best score and currency but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals. Claimed but not seen: levels.
- Brick Breaker (`sky-breakout`, hyper-casual): saves some state but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals. Claimed but not seen: upgrades.
- Color Match (`sky-color-match`, hyper-casual): saves a best score but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals.
- Flap & Fly (`sky-flappy-bird`, hyper-casual): saves a best score but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals. Claimed but not seen: goals.
- Grow or Shrink (`sky-grow-shrink`, hyper-casual): saves some state but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals.
- Hole Eater (`sky-hole-eater`, hyper-casual): saves some state but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals.
- Lane Switcher (`sky-lane-switcher`, hyper-casual): saves some state but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals.
- Match Swipe (`sky-match-swipe`, hyper-casual): saves some state but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals.
- Parking Puzzle (`sky-parking-puzzle`, puzzle): saves some state but shows no unlock, upgrade, goal or level system. Lacks: levels, stars, daily, goals, unlocks. Claimed but not seen: levels, stars.
- Rope Swing (`sky-rope-swing`, hyper-casual): saves a best score but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals.
- Slide Runner (`sky-slide-runner`, hyper-casual): saves a best score but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals.
- Slingshot (`sky-slingshot`, hyper-casual): saves some state but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals. Claimed but not seen: goals.
- Snake (`sky-snake`, hyper-casual): saves some state but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals.
- Sniper Shot (`sky-sniper-shot`, hyper-casual): saves some state but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals. Claimed but not seen: goals.
- Spike Jump (`sky-spike-jump`, hyper-casual): saves a best score but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals.
- Stack Tower (`sky-stack-tower`, hyper-casual): saves a best score but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals. Claimed but not seen: stars, daily.
- Swim Dodge (`sky-swim-dodge`, hyper-casual): saves a best score but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals.
- Traffic Run (`sky-traffic-run`, hyper-casual): saves a best score but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals.
- Turret Defense (`sky-turret-defense`, hyper-casual): saves some state but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals.
- SneakerDrop — Hype Market Tycoon (`sneaker-drop`, management): saves some state and save-blob but shows no unlock, upgrade, goal or level system. Lacks: goals, upgrades, unlocks, stars, levels. Claimed but not seen: levels, upgrades, stars, goals, daily.
- Summit Line (`summit-line`, board-sports): saves some state but shows no unlock, upgrade, goal or level system. Lacks: levels, unlocks, stars, cosmetics, achievements. Claimed but not seen: stars, goals.
- Bloxburg Town (`bloxburg-town`, life-sim): saves some state but shows no unlock, upgrade, goal or level system. Lacks: goals, unlocks, cosmetics, achievements, daily. Claimed but not seen: levels, unlocks, daily.
- Game Arcade — Bridge Race & Fashion Princess (`game-arcade-7`, arcade): saves some state but shows no unlock, upgrade, goal or level system. Lacks: levels, upgrades, unlocks, achievements, daily. Claimed but not seen: levels.
- Helix Drop (`helix-drop`, hyper-casual): saves some state but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals. Claimed but not seen: unlocks.
- High Nest (`high-nest`, hyper-casual): saves a best score but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals.
- Isle of Bells (`hub-isle-of-bells`, life-sim): saves some state but shows no unlock, upgrade, goal or level system. Lacks: goals, unlocks, cosmetics, achievements, daily. Claimed but not seen: upgrades, stars, goals.
- Merge Blocks (`hub-merge-blocks`, puzzle): saves a best score but shows no unlock, upgrade, goal or level system. Lacks: levels, stars, goals, unlocks. Claimed but not seen: stars.
- Sudoku (`hub-sudoku`, puzzle): saves some state but shows no unlock, upgrade, goal or level system. Lacks: levels, stars, goals, unlocks. Claimed but not seen: achievements.
- Neon Dash (`neon-dash`, arcade): saves some state but shows no unlock, upgrade, goal or level system. Lacks: upgrades, unlocks, achievements, daily.
- Volt Dash (`volt-dash`, hyper-casual): saves some state but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals.
- Field Station (`field-station`, learning): saves some state but shows no unlock, upgrade, goal or level system. Lacks: stars, achievements, goals. Claimed but not seen: goals.
- Farm Idle Tycoon (`hub-farm-idle`, idle): saves some state but shows no unlock, upgrade, goal or level system. Lacks: upgrades, achievements, daily, goals. Claimed but not seen: upgrades, goals, achievements, daily.
- Market Merge (`market-merge`, puzzle): saves some state but shows no unlock, upgrade, goal or level system. Lacks: levels, stars, unlocks.
- Rung Runner (`rung-runner`, hyper-casual): saves a best score but shows no unlock, upgrade, goal or level system. Lacks: unlocks, cosmetics, daily, achievements, goals.
- Idle Empire (`hub-idle-empire`, idle): saves some state but shows no unlock, upgrade, goal or level system. Lacks: achievements, daily, goals. Claimed but not seen: goals, achievements, daily.
- Tap Monsters (`hub-tap-monsters`, idle): saves some state but shows no unlock, upgrade, goal or level system. Lacks: upgrades, achievements, daily. Claimed but not seen: upgrades, achievements, daily.
- Mini Life Sim (`mini-life-sim`, life-sim): saves some state but shows no unlock, upgrade, goal or level system. Lacks: cosmetics, daily. Claimed but not seen: upgrades, daily.
- Rap Academy (`rap-academy`, learning): saves some state but shows no unlock, upgrade, goal or level system. Lacks: stars.
- Chili Firm 2: Replanted (`chili-firm`, idle): saves some state but shows no unlock, upgrade, goal or level system. Lacks: daily. Claimed but not seen: cosmetics.
- Brick Breaker (`hub-brick-breaker`, arcade): saves some state but shows no unlock, upgrade, goal or level system. Lacks: upgrades, achievements, daily. Claimed but not seen: daily.
- Dino Dash (`hub-dino-dash`, hyper-casual): saves some state but shows no unlock, upgrade, goal or level system. Lacks: daily, achievements. Claimed but not seen: upgrades, daily.
- Farm Harvest (`hub-farm-harvest`, life-sim): saves some state but shows no unlock, upgrade, goal or level system. Lacks: cosmetics, achievements.
- Kingdom Defense (`kingdom-defense`, tower-defense): saves some state but shows no unlock, upgrade, goal or level system. Lacks: achievements.
- Surviv Royale (`surviv-royale`, arcade): saves a best score but shows no unlock, upgrade, goal or level system. Lacks: upgrades, achievements, daily. Claimed but not seen: upgrades, daily.
- Bridge Rush (`bridge-rush`, hyper-casual): saves some state but shows no unlock, upgrade, goal or level system. Lacks: achievements. Claimed but not seen: upgrades.
- Crowd Clash (`crowd-clash`, hyper-casual): saves some state but shows no unlock, upgrade, goal or level system. Lacks: achievements. Claimed but not seen: upgrades.
- Hole Swallow (`hub-hole-swallow`, hyper-casual): saves a best score but shows no unlock, upgrade, goal or level system. Lacks: achievements. Claimed but not seen: upgrades.
- Claire's Big Life (`claire-pip`, life-sim): saves some state but shows no unlock, upgrade, goal or level system. Lacks: goals. Claimed but not seen: goals.


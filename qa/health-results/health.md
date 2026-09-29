# Health check: chromium, CPU throttled x4

Generated 2026-09-29T12:45:02.510Z. 22 games, 45 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 8, STALL 3, JANK 7, LEAK 0, ERRORS 1, clean 9.**

Machine: 4 cores, 1-minute load average at the end of each game ranged 15.92 to 23.45 (median 17.41). Measured CPU contention while running (wall/CPU of a spin): median x1.74, range x1.31 to x3.94. Measured slowdown of the throttled page against an unthrottled page (a fixed JS benchmark): median x3.7, range x1 to x5.1. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Summit Line (`summit-line`) | FREEZE+STALL | FREEZE: main thread blocked 28578 ms (while playing), 17 ms of it inside WebGL calls (software GL), machine slowdown x1.5 -> about 18546 ms of JS; long-task API + timer heartbeat; longest frame 45719.3 ms:  TimerHandler:setTimeout 5 / js/main.js DOMWindow.onkeydown 194 /  FrameRequestCallback 28335 \| page did not answer the harness for 6 s (1 poll timeout(s)) \| 2 touch inputs not acknowledged within 4 s while the main thread was blocked \|\| STALL: started only with a keyboard key (centre (start button not tappable) + tap on game + KEY Enter); a phone has no keyboard **[reproduced on re-run]** | centre (start button not tappable) + tap on game + KEY Enter | play, over 0, restarts 0 |  |
| 2 | Survivor Wave (`survivor-wave`) | FREEZE+JANK | FREEZE: main thread blocked 8762 ms (during load), 0 ms of it inside WebGL calls (software GL), machine slowdown x1.9 -> about 4736 ms of JS; long-task API + timer heartbeat; longest frame 8525.2 ms: SurvivorWave/index.html http://127.0.0.1:33091/SurvivorWave/index.html 8265 /  FrameRequestCallback 124 \|\| JANK: p95 JS frame cost 22.27 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.9; raw p95 41.2, median 2.7, p99 176.59, max 176.6; time inside WebGL calls excluded, p95 of it 0) **[reproduced on re-run]** | tap centre + ▶ PLAY | play, over 0, restarts 0 | `shots/survivor-wave-1-title.jpg` `shots/survivor-wave-2-mid.jpg` `shots/survivor-wave-3-end.jpg` |
| 3 | Helix Drop (`helix-drop`) | FREEZE | FREEZE: main thread blocked 11204 ms (during load), 509 ms of it inside WebGL calls (software GL), machine slowdown x1.7 -> about 6218 ms of JS; long-task API + timer heartbeat; longest frame 11281.2 ms: HelixDrop/index.html https://calebhomwe.github.io/playables/HelixDrop/index.html 5171 /  FrameRequestCallback 6088 \| 2 touch inputs not acknowledged within 4 s while the main thread was blocked **[reproduced on re-run]** | #play | play, over 0, restarts 0 | `shots/helix-drop-1-title.jpg` `shots/helix-drop-2-mid.jpg` `shots/helix-drop-3-end.jpg` |
| 4 | Rung Runner (`rung-runner`) | FREEZE+JANK | FREEZE: main thread blocked 5667 ms (during load), 418 ms of it inside WebGL calls (software GL), machine slowdown x1.5 -> about 3408 ms of JS; long-task API + timer heartbeat; longest frame 5754.2 ms: RungRunner/index.html https://calebhomwe.github.io/playables/RungRunner/index.html 2771 /  FrameRequestCallback 2967 \| 2 touch inputs not acknowledged within 4 s while the main thread was blocked \|\| JANK: p95 JS frame cost 35.78 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.5; raw p95 55.1, median 5.52, p99 106.82, max 612.3; time inside WebGL calls excluded, p95 of it 4.2) **[reproduced on re-run]** | #play | play, over 1, restarts 1 | `shots/rung-runner-1-title.jpg` `shots/rung-runner-2-mid.jpg` `shots/rung-runner-3-end.jpg` |
| 5 | Crowd Clash (`crowd-clash`) | FREEZE+JANK | FREEZE: main thread blocked 3723 ms (during load), 31 ms of it inside WebGL calls (software GL), machine slowdown x1.7 -> about 2147 ms of JS; long-task API + timer heartbeat; longest frame 3810.6 ms: CrowdClash/index.html https://calebhomwe.github.io/playables/CrowdClash/index.html 761 /  FrameRequestCallback 3038 \|\| JANK: p95 JS frame cost 61.51 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.7; raw p95 105.8, median 5.99, p99 1454.88, max 1454.9; time inside WebGL calls excluded, p95 of it 7.1) [not reproduced on re-run] | #play | play, over 0, restarts 0 | `shots/crowd-clash-1-title.jpg` `shots/crowd-clash-2-mid.jpg` `shots/crowd-clash-3-end.jpg` |
| 6 | The Long Way Home (`long-way-home`) | FREEZE+JANK | FREEZE: 3 touch inputs not acknowledged within 4 s while the main thread was blocked \|\| JANK: p95 JS frame cost 43.45 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.7; raw p95 75.6, median 7.82, p99 655.8, max 655.8; time inside WebGL calls excluded, p95 of it 4.9) [not reproduced on re-run] | [data-play="quick"] | play, over 0, restarts 0 | `shots/long-way-home-1-title.jpg` `shots/long-way-home-2-mid.jpg` `shots/long-way-home-3-end.jpg` |
| 7 | Fishing for Words (`fishing-for-words`) | FREEZE+JANK | FREEZE: 4 touch inputs not acknowledged within 4 s while the main thread was blocked \|\| JANK: p95 JS frame cost 22.98 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.3; raw p95 30.1, median 2.67, p99 33.59, max 48.2; time inside WebGL calls excluded, p95 of it 0) [not reproduced on re-run] | #btn-spell | play, over 0, restarts 0 | `shots/fishing-for-words-1-title.jpg` `shots/fishing-for-words-2-mid.jpg` `shots/fishing-for-words-3-end.jpg` |
| 8 | QuickStop Mini Mart (`mini-mart`) | FREEZE | FREEZE: page reloaded 1x without a button press (MiniMart/index.html#; last input was canvas 230 ms earlier) [not reproduced on re-run] | #titlePlay | play, over 0, restarts 0 | `shots/mini-mart-1-title.jpg` `shots/mini-mart-2-mid.jpg` `shots/mini-mart-3-end.jpg` |
| 9 | Math Miner (`math-miner`) | STALL | STALL: game over screen reached 1x and the game never got back to play (bot pressed buttons for 38 s) | #btnMath | play, over 1, restarts 0 | `shots/math-miner-1-title.jpg` `shots/math-miner-2-mid.jpg` `shots/math-miner-3-end.jpg` |
| 10 | Bridge Rush (`bridge-rush`) | STALL | STALL: harness crashed: browser.newContext: Target page, context or browser has been closed |  |  |  |
| 11 | Hole Grind (`hole-grind`) | JANK | JANK: p95 JS frame cost 20.73 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.4; raw p95 28.4, median 5.55, p99 113.58, max 289.4; time inside WebGL calls excluded, p95 of it 4) | #btnPlay | play, over 0, restarts 0 | `shots/hole-grind-1-title.jpg` `shots/hole-grind-2-mid.jpg` `shots/hole-grind-3-end.jpg` |
| 12 | Maths Kart GP (`maths-kart`) | JANK | JANK: p95 JS frame cost 20.74 ms over 16 ms (CPU throttled x4, divided by machine slowdown x3.9; raw p95 81.7, median 1.85, p99 213.3, max 398.8; time inside WebGL calls excluded, p95 of it 4.2) | #bPlay | play, over 0, restarts 0 | `shots/maths-kart-1-title.jpg` `shots/maths-kart-2-mid.jpg` `shots/maths-kart-3-end.jpg` |
| 13 | Bloxburg Town (`bloxburg-town`) | ERRORS | ERRORS: 2 uncaught page error(s): Unable to decode audio data | centre (start button not tappable) + Play | play, over 0, restarts 0 | `shots/bloxburg-town-1-title.jpg` |
| 14 | Snake Clash (`snake-clash`) | OK | none | #play | play, over 0, restarts 0 | `shots/snake-clash-1-title.jpg` `shots/snake-clash-2-mid.jpg` `shots/snake-clash-3-end.jpg` |
| 15 | Field Station (`field-station`) | OK | none | #playNext | play, over 0, restarts 0 | `shots/field-station-1-title.jpg` `shots/field-station-2-mid.jpg` `shots/field-station-3-end.jpg` |
| 16 | Balloon Bust (`balloon-bust`) | OK | none | #c | play, over 0, restarts 0 | `shots/balloon-bust-1-title.jpg` `shots/balloon-bust-2-mid.jpg` `shots/balloon-bust-3-end.jpg` |
| 17 | Market Merge (`market-merge`) | OK | none | #play | play, over 0, restarts 0 | `shots/market-merge-1-title.jpg` `shots/market-merge-2-mid.jpg` `shots/market-merge-3-end.jpg` |
| 18 | Quiz Tower Defense (`quiz-tower`) | OK | none | tap:50%,76% | play, over 0, restarts 0 | `shots/quiz-tower-1-title.jpg` |
| 19 | Volt Dash (`volt-dash`) | OK | none | #play | play, over 0, restarts 0 | `shots/volt-dash-1-title.jpg` `shots/volt-dash-2-mid.jpg` `shots/volt-dash-3-end.jpg` |
| 20 | Word Dungeon (`word-dungeon`) | OK | none | tap:36%,56% | play, over 0, restarts 0 | `shots/word-dungeon-1-title.jpg` `shots/word-dungeon-2-mid.jpg` `shots/word-dungeon-3-end.jpg` |
| 21 | High Nest (`high-nest`) | OK | none | #play | play, over 3, restarts 1 | `shots/high-nest-1-title.jpg` `shots/high-nest-2-mid.jpg` `shots/high-nest-3-end.jpg` |
| 22 | Surviv Royale (`surviv-royale`) | OK | none | #btn-play | play, over 0, restarts 0 | `shots/surviv-royale-1-title.jpg` `shots/surviv-royale-2-mid.jpg` `shots/surviv-royale-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| summit-line | 2539 / 18546 | 2 | 5, 62.21 / 62.21 | 8.7 > 9.2 | 327 > 338 | 1 | 13.2 | 60 | 4002 | - |
| survivor-wave | 4736 / 247 | 1 | 64, 22.27 / 176.59 | 3.1 > 4 | 262 > 323 | 1 | 22.3 | 8 | 4001 | - |
| helix-drop | 6218 / 705 | 2 | 88, 10.99 / 702.56 | 4.6 > 5 | 93 > 95 | 1 | 5 | 6 | 4030 | 0 > 0 |
| rung-runner | 3408 / 620 | 2 | 115, 35.78 / 106.82 | 5.2 > 5.6 | 80 > 102 | 1 | 6.1 | 7 | 4001 | 0 > 0 |
| crowd-clash | 2147 / 1457 | 4 | 86, 61.51 / 1454.88 | 5.7 > 6.1 | 93 > 96 | 1 | 10.6 | 14 | 3894 | 0 > 0 |
| long-way-home | 1275 / 1001 | 3 | 92, 43.45 / 655.8 | 7.8 > 8 | 156 > 157 | 1 | 5.5 | 7 | 4000 | - |
| fishing-for-words | 503 / 577 | 0 | 130, 22.98 / 33.59 | 1.9 > 2.2 | 79 > 81 | 1 | 4 | 5 | 4001 | - |
| mini-mart | 369 / 169 | 1 | 5, 0.52 / 0.52 | 1.9 > 2.1 | 402 > 424 | 1 | 0 | 18 | 752 | - |
| math-miner | 291 / 153 | 3 | 253, 5.9 / 12.6 | 1.9 > 2.1 | 99 > 145 | 1 | 4 | 9 | 3999 | 1 > 1 |
| bridge-rush | did not run |
| hole-grind | 1144 / 292 | 5 | 398, 20.73 / 113.58 | 5.8 > 5.8 | 142 > 143 | 1 | 2.2 | 16 | 2266 | - |
| maths-kart | 952 / 566 | 5 | 312, 20.74 / 213.3 | 5.7 > 6.5 | 141 > 148 | 2 | 4.6 | 24 | 2562 | - |
| bloxburg-town | 1438 / 251 | 1 | 9, 15.13 / 15.13 | 9.3 > 9.4 | 49 > 52 | 1 | 4 | 5 | 4037 | - |
| snake-clash | 700 / 97 | 0 | 63, 14.94 / 58.67 | 2 > 2.2 | 77 > 79 | 1 | 4.5 | 4 | 4000 | 0 > 0 |
| field-station | 648 / 156 | 2 | 792, 4.97 / 14.52 | 1.9 > 2.2 | 207 > 152 | 1 | 15.5 | 16 | 1441 | - |
| balloon-bust | 404 / 228 | 0 | 167, 6.2 / 15.63 | 1.9 > 2.1 | 15 > 15 | 1 | 4 | 4 | 4000 | - |
| market-merge | 447 / 272 | 2 | 166, 7.28 / 21.43 | 1.9 > 2.1 | 92 > 92 | 1 | 4 | 7 | 4001 | - |
| quiz-tower | 358 / 59 | 0 | 5, 45.27 / 45.27 | n/a | 39 > 40 | 0 | - | - | 477 | - |
| volt-dash | 334 / 390 | 0 | 67, 5.21 / 10 | 2.1 > 2.3 | 84 > 86 | 1 | 4 | 3 | 4009 | 0 > 0 |
| word-dungeon | 357 / 83 | 0 | 186, 5.78 / 23.07 | 1.5 > 1.7 | 46 > 40 | 1 | 3.2 | 6 | 3075 | 1 > 1 |
| high-nest | 333 / 222 | 0 | 156, 2.92 / 6.65 | 1.9 > 2 | 74 > 89 | 1 | 4 | 3 | 4000 | 0 > 0 |
| surviv-royale | 280 / 220 | 4 | 192, 7.28 / 110.89 | 2 > 2.2 | 143 > 146 | 0 | 4 | 8 | 1934 | - |

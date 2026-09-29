# Health check: chromium, CPU throttled x4

Generated 2026-09-29T12:33:30.887Z. 6 games, 45 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 1, STALL 2, JANK 1, LEAK 0, ERRORS 0, clean 3.**

Machine: 4 cores, 1-minute load average at the end of each game ranged 15.92 to 23.45 (median 19.2). Measured CPU contention while running (wall/CPU of a spin): median x1.88, range x1.54 to x3.94. Measured slowdown of the throttled page against an unthrottled page (a fixed JS benchmark): median x3.6, range x1.5 to x4.3. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Summit Line (`summit-line`) | FREEZE+STALL | FREEZE: main thread blocked 28578 ms (while playing), 17 ms of it inside WebGL calls (software GL), machine slowdown x1.5 -> about 18546 ms of JS; long-task API + timer heartbeat; longest frame 45719.3 ms:  TimerHandler:setTimeout 5 / js/main.js DOMWindow.onkeydown 194 /  FrameRequestCallback 28335 \| page did not answer the harness for 6 s (1 poll timeout(s)) \| 2 touch inputs not acknowledged within 4 s while the main thread was blocked \|\| STALL: started only with a keyboard key (centre (start button not tappable) + tap on game + KEY Enter); a phone has no keyboard **[reproduced on re-run]** | centre (start button not tappable) + tap on game + KEY Enter | play, over 0, restarts 0 |  |
| 2 | Bridge Rush (`bridge-rush`) | STALL | STALL: harness crashed: browser.newContext: Target page, context or browser has been closed |  |  |  |
| 3 | Maths Kart GP (`maths-kart`) | JANK | JANK: p95 JS frame cost 20.74 ms over 16 ms (CPU throttled x4, divided by machine slowdown x3.9; raw p95 81.7, median 1.85, p99 213.3, max 398.8; time inside WebGL calls excluded, p95 of it 4.2) | #bPlay | play, over 0, restarts 0 | `shots/maths-kart-1-title.jpg` `shots/maths-kart-2-mid.jpg` `shots/maths-kart-3-end.jpg` |
| 4 | Quiz Tower Defense (`quiz-tower`) | OK | none | tap:50%,76% | play, over 0, restarts 0 | `shots/quiz-tower-1-title.jpg` |
| 5 | High Nest (`high-nest`) | OK | none | #play | play, over 3, restarts 1 | `shots/high-nest-1-title.jpg` `shots/high-nest-2-mid.jpg` `shots/high-nest-3-end.jpg` |
| 6 | Surviv Royale (`surviv-royale`) | OK | none | #btn-play | play, over 0, restarts 0 | `shots/surviv-royale-1-title.jpg` `shots/surviv-royale-2-mid.jpg` `shots/surviv-royale-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| summit-line | 2539 / 18546 | 2 | 5, 62.21 / 62.21 | 8.7 > 9.2 | 327 > 338 | 1 | 13.2 | 60 | 4002 | - |
| bridge-rush | did not run |
| maths-kart | 952 / 566 | 5 | 312, 20.74 / 213.3 | 5.7 > 6.5 | 141 > 148 | 2 | 4.6 | 24 | 2562 | - |
| quiz-tower | 358 / 59 | 0 | 5, 45.27 / 45.27 | n/a | 39 > 40 | 0 | - | - | 477 | - |
| high-nest | 333 / 222 | 0 | 156, 2.92 / 6.65 | 1.9 > 2 | 74 > 89 | 1 | 4 | 3 | 4000 | 0 > 0 |
| surviv-royale | 280 / 220 | 4 | 192, 7.28 / 110.89 | 2 > 2.2 | 143 > 146 | 0 | 4 | 8 | 1934 | - |

# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-02T17:45:35.560Z. 4 games, 25 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 0, STALL 0, JANK 0, LEAK 0, ERRORS 0, clean 4.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1.94, range x1 to x7.96. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Flappy Flight (`hub-flappy-flight`) | OK | none | #playBtn | play, over 3, restarts 2 | `shots\hub-flappy-flight-1-title.jpg` `shots\hub-flappy-flight-2-mid.jpg` `shots\hub-flappy-flight-3-end.jpg` |
| 2 | Brick Breaker (`hub-brick-breaker`) | OK | none | #playBtn | play, over 1, restarts 0 | `shots\hub-brick-breaker-1-title.jpg` `shots\hub-brick-breaker-2-mid.jpg` `shots\hub-brick-breaker-3-end.jpg` |
| 3 | 2048 (`hub-game-2048`) | OK | none | #mClassic | play, over 0, restarts 0 | `shots\hub-game-2048-1-title.jpg` `shots\hub-game-2048-2-mid.jpg` `shots\hub-game-2048-3-end.jpg` |
| 4 | Dino Dash (`hub-dino-dash`) | OK | none | #playBtn | play, over 2, restarts 1 | `shots\hub-dino-dash-1-title.jpg` `shots\hub-dino-dash-2-mid.jpg` `shots\hub-dino-dash-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| hub-flappy-flight | 73 / 554 | 1 | 813, 0.21 / 0.41 | 2.2 > 2.4 | 65 > 128 | 1 | 17.7 | 7 | 1990 | 0 > 0 |
| hub-brick-breaker | 66 / 338 | 1 | 1407, 4.8 / 17.5 | 2 > 2.3 | 59 > 61 | 1 | 9.4 | 18 | 1406 | 790 > 790 |
| hub-game-2048 | 45 / 190 | 4 | 1414, 0.18 / 1.82 | 2 > 2.2 | 157 > 170 | 1 | 7.9 | 13 | 670 | 0 > 20 |
| hub-dino-dash | 47 / 32 | 0 | 575, 0.13 / 0.82 | 2.2 > 2.4 | 56 > 71 | 1 | 19.9 | 6 | 2160 | 18 > 13 |

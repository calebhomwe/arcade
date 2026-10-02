# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-02T07:18:11.857Z. 5 games, 30 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 1, STALL 0, JANK 1, LEAK 0, ERRORS 0, clean 3.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1.29, range x1.09 to x1.91. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Swim Dodge (`sky-swim-dodge`) | FREEZE | FREEZE: page did not answer the harness for 6 s (2 poll timeout(s)) [not reproduced on re-run] | tap centre | play, over 3, restarts 0 | `shots\sky-swim-dodge-1-title.jpg` `shots\sky-swim-dodge-2-mid.jpg` `shots\sky-swim-dodge-3-end.jpg` |
| 2 | Parking Puzzle (`sky-parking-puzzle`) | JANK | JANK: p95 JS frame cost 36.67 ms over 33 ms (unthrottled, divided by machine slowdown x1.3; raw p95 47.3, median 0.23, p99 91.16, max 202.1; time inside WebGL calls excluded, p95 of it 0) | tap centre | play, over 0, restarts 0 | `shots\sky-parking-puzzle-1-title.jpg` `shots\sky-parking-puzzle-2-mid.jpg` `shots\sky-parking-puzzle-3-end.jpg` |
| 3 | Maze Runner (`sky-maze-runner`) | OK | none | tap centre | play, over 0, restarts 0 | `shots\sky-maze-runner-1-title.jpg` `shots\sky-maze-runner-2-mid.jpg` `shots\sky-maze-runner-3-end.jpg` |
| 4 | Snake (`sky-snake`) | OK | none | tap centre | play, over 9, restarts 0 | `shots\sky-snake-1-title.jpg` `shots\sky-snake-2-mid.jpg` `shots\sky-snake-3-end.jpg` |
| 5 | Slide Runner (`sky-slide-runner`) | OK | none | tap centre | play, over 3, restarts 0 | `shots\sky-slide-runner-1-title.jpg` `shots\sky-slide-runner-2-mid.jpg` `shots\sky-slide-runner-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| sky-swim-dodge | 0 / 330 | 3 | 2033, 9.16 / 24.5 | 2 > 2.1 | 31 > 32 | 1 | 4.5 | 36 | 3576 | 19 > 13 |
| sky-parking-puzzle | 0 / 424 | 41 | 960, 36.67 / 91.16 | 1.9 > 2 | 34 > 34 | 1 | 3.8 | 59 | 3462 | - |
| sky-maze-runner | 0 / 399 | 15 | 1338, 0.19 / 7.47 | 1.9 > 2 | 24 > 24 | 1 | 3.7 | 24 | 953 | - |
| sky-snake | 0 / 401 | 16 | 1448, 10.82 / 43.91 | 1.9 > 2.1 | 32 > 32 | 1 | 5.4 | 36 | 733 | 0 > 0 |
| sky-slide-runner | 0 / 284 | 4 | 1682, 8.99 / 23.76 | 1.8 > 2.1 | 31 > 32 | 1 | 4.1 | 25 | 1073 | 0 > 0 |

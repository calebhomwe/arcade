# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-01T19:38:14.773Z. 10 games, 25 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 1, STALL 0, JANK 3, LEAK 0, ERRORS 0, clean 7.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1.29, range x1 to x4.31. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Match Swipe (`sky-match-swipe`) | FREEZE+JANK | FREEZE: main thread blocked 3650 ms (while playing), 0 ms of it inside WebGL calls (software GL), machine slowdown x1 -> about 3650 ms of JS; long-task API + timer heartbeat; longest frame 3641.4 ms:  FrameRequestCallback 3625 \|\| JANK: p95 JS frame cost 100.7 ms over 33 ms (unthrottled, divided by machine slowdown x1; raw p95 100.7, median 0.4, p99 197.6, max 3626; time inside WebGL calls excluded, p95 of it 0) [not reproduced on re-run] | tap centre | play, over 0, restarts 0 | `shots\sky-match-swipe-1-title.jpg` `shots\sky-match-swipe-2-mid.jpg` `shots\sky-match-swipe-3-end.jpg` |
| 2 | Parking Puzzle (`sky-parking-puzzle`) | JANK | JANK: p95 JS frame cost 43.09 ms over 33 ms (unthrottled, divided by machine slowdown x1.1; raw p95 47.4, median 0.27, p99 92.91, max 155.2; time inside WebGL calls excluded, p95 of it 0) | tap centre | play, over 0, restarts 0 | `shots\sky-parking-puzzle-1-title.jpg` `shots\sky-parking-puzzle-2-mid.jpg` `shots\sky-parking-puzzle-3-end.jpg` |
| 3 | Hole Eater (`sky-hole-eater`) | JANK | JANK: p95 JS frame cost 45.3 ms over 33 ms (unthrottled, divided by machine slowdown x1; raw p95 45.3, median 2.4, p99 55.4, max 98.3; time inside WebGL calls excluded, p95 of it 0.5) | tap centre | play, over 0, restarts 0 | `shots\sky-hole-eater-1-title.jpg` `shots\sky-hole-eater-2-mid.jpg` `shots\sky-hole-eater-3-end.jpg` |
| 4 | Grow or Shrink (`sky-grow-shrink`) | OK | none | tap centre | play, over 2, restarts 2 | `shots\sky-grow-shrink-1-title.jpg` `shots\sky-grow-shrink-2-mid.jpg` `shots\sky-grow-shrink-3-end.jpg` |
| 5 | Lane Switcher (`sky-lane-switcher`) | OK | none | tap centre | play, over 2, restarts 2 | `shots\sky-lane-switcher-1-title.jpg` `shots\sky-lane-switcher-2-mid.jpg` `shots\sky-lane-switcher-3-end.jpg` |
| 6 | Color Match (`sky-color-match`) | OK | none | tap centre | play, over 2, restarts 2 | `shots\sky-color-match-1-title.jpg` `shots\sky-color-match-2-mid.jpg` `shots\sky-color-match-3-end.jpg` |
| 7 | Balance Tile (`sky-balance-tile`) | OK | none | tap centre | play, over 9, restarts 8 | `shots\sky-balance-tile-1-title.jpg` `shots\sky-balance-tile-2-mid.jpg` `shots\sky-balance-tile-3-end.jpg` |
| 8 | Brick Breaker (`sky-breakout`) | OK | none | tap centre | play, over 1, restarts 1 | `shots\sky-breakout-1-title.jpg` `shots\sky-breakout-2-mid.jpg` `shots\sky-breakout-3-end.jpg` |
| 9 | Rope Swing (`sky-rope-swing`) | OK | none | tap centre | play, over 12, restarts 11 | `shots\sky-rope-swing-1-title.jpg` `shots\sky-rope-swing-2-mid.jpg` `shots\sky-rope-swing-3-end.jpg` |
| 10 | Flap & Fly (`sky-flappy-bird`) | OK | none | tap centre | play, over 7, restarts 6 | `shots\sky-flappy-bird-1-title.jpg` `shots\sky-flappy-bird-2-mid.jpg` `shots\sky-flappy-bird-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| sky-match-swipe | 977 / 3650 | 63 | 605, 100.7 / 197.6 | 1.9 > 2 | 33 > 34 | 1 | 3.7 | 71 | 2062 | - |
| sky-parking-puzzle | 0 / 451 | 34 | 814, 43.09 / 92.91 | 1.9 > 2 | 33 > 33 | 1 | 3.8 | 64 | 3026 | - |
| sky-hole-eater | 72 / 188 | 0 | 1221, 45.3 / 55.4 | 5.2 > 6 | 35 > 35 | 1 | 6.2 | 59 | 1593 | - |
| sky-grow-shrink | 150 / 858 | 18 | 899, 11.27 / 40.09 | 1.8 > 2 | 30 > 31 | 1 | 3.7 | 52 | 847 | 0 > 0 |
| sky-lane-switcher | 898 / 737 | 32 | 828, 18.4 / 161.8 | 1.9 > 2.1 | 30 > 31 | 1 | 3.7 | 48 | 1843 | 10 > 10 |
| sky-color-match | 50 / 319 | 13 | 1280, 9.84 / 41.32 | 1.8 > 2 | 30 > 31 | 1 | 3.7 | 36 | 1186 | 0 > 2 |
| sky-balance-tile | 0 / 228 | 7 | 1087, 1.8 / 56.21 | 1.9 > 2.1 | 31 > 31 | 1 | 3.7 | 39 | 1380 | 10 > 30 |
| sky-breakout | 19 / 232 | 2 | 1222, 6.38 / 13.28 | 2 > 2 | 30 > 31 | 1 | 3.8 | 32 | 349 | 80 > 80 |
| sky-rope-swing | 34 / 236 | 0 | 1618, 0.5 / 2.25 | 1.9 > 2.1 | 30 > 31 | 1 | 3.7 | 8 | 516 | 0 > 0 |
| sky-flappy-bird | 0 / 131 | 2 | 1719, 0.2 / 3.2 | 2 > 2.2 | 30 > 31 | 1 | 4.7 | 22 | 574 | 0 > 0 |

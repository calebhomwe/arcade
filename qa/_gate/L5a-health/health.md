# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-02T19:57:58.071Z. 4 games, 25 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 1, STALL 0, JANK 1, LEAK 0, ERRORS 0, clean 3.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1.13, range x1 to x8.56. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Brick Breaker (`sky-breakout`) | FREEZE+JANK | FREEZE: main thread blocked 1576 ms (while playing), 0 ms of it inside WebGL calls (software GL), machine slowdown x1 -> about 1576 ms of JS; long-task API + timer heartbeat; longest frame 5041 ms: unattributed \|\| JANK: p95 JS frame cost 45.9 ms over 33 ms (unthrottled, divided by machine slowdown x1; raw p95 45.9, median 0.3, p99 200.2, max 321.4; time inside WebGL calls excluded, p95 of it 0) [not reproduced on re-run] | tap centre | play, over 1, restarts 0 | `shots\sky-breakout-1-title.jpg` `shots\sky-breakout-2-mid.jpg` `shots\sky-breakout-3-end.jpg` |
| 2 | Cut the Rope (`sky-cut-rope`) | OK | none | tap centre | play, over 0, restarts 0 | `shots\sky-cut-rope-1-title.jpg` `shots\sky-cut-rope-2-mid.jpg` `shots\sky-cut-rope-3-end.jpg` |
| 3 | Color Match (`sky-color-match`) | OK | none | tap centre | play, over 0, restarts 0 | `shots\sky-color-match-1-title.jpg` `shots\sky-color-match-2-mid.jpg` `shots\sky-color-match-3-end.jpg` |
| 4 | Balance Tile (`sky-balance-tile`) | OK | none | tap centre | play, over 8, restarts 7 | `shots\sky-balance-tile-1-title.jpg` `shots\sky-balance-tile-2-mid.jpg` `shots\sky-balance-tile-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| sky-breakout | 552 / 1576 | 44 | 814, 45.9 / 200.2 | 2 > 2.1 | 31 > 32 | 1 | 3.8 | 47 | 2084 | 80 > 80 |
| sky-cut-rope | 723 / 1115 | 32 | 601, 10.5 / 126.8 | 1.9 > 2 | 30 > 30 | 1 | 3.7 | 30 | 1869 | - |
| sky-color-match | 737 / 655 | 35 | 746, 16.19 / 110.44 | 1.8 > 2 | 31 > 31 | 1 | 3.7 | 32 | 3365 | - |
| sky-balance-tile | 85 / 249 | 4 | 971, 2.98 / 30.65 | 1.9 > 2.1 | 31 > 32 | 1 | 3.7 | 40 | 1855 | 10 > 23 |

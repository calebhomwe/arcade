# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-01T19:29:55.096Z. 2 games, 25 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 0, STALL 0, JANK 0, LEAK 0, ERRORS 0, clean 2.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1.45, range x1 to x1.45. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Chess (`hub-chess`) | OK | none | #ssPlay | play, over 0, restarts 0 | `shots\hub-chess-1-title.jpg` `shots\hub-chess-2-mid.jpg` `shots\hub-chess-3-end.jpg` |
| 2 | Whack-a-Mole (`hub-whack-a-mole`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots\hub-whack-a-mole-1-title.jpg` `shots\hub-whack-a-mole-2-mid.jpg` `shots\hub-whack-a-mole-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| hub-chess | 540 / 51 | 0 | 0, - / - | 2.4 > 2.7 | 866 > 866 | 1 | 13 | 9 | 79 | - |
| hub-whack-a-mole | 213 / 266 | 24 | 1030, 0.2 / 24.2 | 1.9 > 2 | 187 > 220 | 1 | 4 | 26 | 1726 | 0 > 0 |

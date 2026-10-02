# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-01T18:47:36.082Z. 2 games, 25 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 2, STALL 0, JANK 2, LEAK 0, ERRORS 0, clean 0.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1.64, range x1 to x1.64. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Idle Empire (`hub-idle-empire`) | FREEZE+JANK | FREEZE: main thread blocked 3952 ms (while playing), 0 ms of it inside WebGL calls (software GL), machine slowdown x1 -> about 3952 ms of JS; long-task API + timer heartbeat; longest frame 2339 ms:  FrameRequestCallback 1997 \|\| JANK: p95 JS frame cost 166.6 ms over 33 ms (unthrottled, divided by machine slowdown x1; raw p95 166.6, median 57.3, p99 286.5, max 311.3; time inside WebGL calls excluded, p95 of it 0) **[reproduced on re-run]** | #btnPlay | play, over 0, restarts 0 | `shots\hub-idle-empire-1-title.jpg` `shots\hub-idle-empire-2-mid.jpg` `shots\hub-idle-empire-3-end.jpg` |
| 2 | Farm Idle Tycoon (`hub-farm-idle`) | FREEZE+JANK | FREEZE: page reloaded 1x without a button press (https://calebhomwe.github.io/arcade-hub/games/farm-idle.html; last input was canvas 658 ms earlier) \|\| JANK: p95 JS frame cost 240.91 ms over 33 ms (unthrottled, divided by machine slowdown x1.6; raw p95 395.1, median 32.32, p99 314.27, max 527.7; time inside WebGL calls excluded, p95 of it 0) [not reproduced on re-run] | declared start button not tappable -> tap centre | play, over 0, restarts 0 | `shots\hub-farm-idle-1-title.jpg` `shots\hub-farm-idle-2-mid.jpg` `shots\hub-farm-idle-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| hub-idle-empire | 2623 / 3952 | 64 | 137, 166.6 / 286.5 | 2.2 > 2.4 | 298 > 298 | 1 | 12 | 100 | 1832 | 0 > 0 |
| hub-farm-idle | 566 / 720 | 29 | 103, 240.91 / 314.27 | 2.8 > 1.9 | 296 > 297 | 1 | 9.8 | 97 | 647 | 0 > 0 |

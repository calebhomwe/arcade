# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-01T19:31:36.820Z. 5 games, 25 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 1, STALL 0, JANK 0, LEAK 0, ERRORS 0, clean 4.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x2.06, range x1 to x3.92. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Farm Idle Tycoon (`hub-farm-idle`) | FREEZE | FREEZE: page reloaded 1x without a button press (https://calebhomwe.github.io/arcade-hub/games/farm-idle.html; last input was canvas 321 ms earlier) [not reproduced on re-run] | #btnPlay | play, over 0, restarts 0 | `shots\hub-farm-idle-1-title.jpg` `shots\hub-farm-idle-2-mid.jpg` `shots\hub-farm-idle-3-end.jpg` |
| 2 | Farm Harvest (`hub-farm-harvest`) | OK | none | #btnPlay | play, over 0, restarts 0 | `shots\hub-farm-harvest-1-title.jpg` `shots\hub-farm-harvest-2-mid.jpg` `shots\hub-farm-harvest-3-end.jpg` |
| 3 | Idle Miner (`hub-idle-miner`) | OK | none | #btnPlay | play, over 0, restarts 0 | `shots\hub-idle-miner-1-title.jpg` `shots\hub-idle-miner-2-mid.jpg` `shots\hub-idle-miner-3-end.jpg` |
| 4 | Tap Monsters (`hub-tap-monsters`) | OK | none | #btnPlay | play, over 0, restarts 0 | `shots\hub-tap-monsters-1-title.jpg` `shots\hub-tap-monsters-2-mid.jpg` `shots\hub-tap-monsters-3-end.jpg` |
| 5 | Idle Empire (`hub-idle-empire`) | OK | none | #btnPlay | play, over 0, restarts 0 | `shots\hub-idle-empire-1-title.jpg` `shots\hub-idle-empire-2-mid.jpg` `shots\hub-idle-empire-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| hub-farm-idle | 127 / 0 | 0 | 454, 0.23 / 1.89 | 2.2 > 1.9 | 304 > 297 | 1 | 11.5 | 18 | 302 | 0 > 0 |
| hub-farm-harvest | 0 / 1471 | 36 | 881, 25.2 / 160.6 | 2.2 > 2.4 | 228 > 236 | 1 | 9.1 | 57 | 850 | 0 > 0 |
| hub-idle-miner | 159 / 82 | 0 | 514, 0.29 / 0.44 | 2.2 > 1.8 | 322 > 324 | 1 | 5.7 | 98 | 1003 | 0 > 18 |
| hub-tap-monsters | 28 / 189 | 0 | 1574, 10 / 13.04 | 2.2 > 2.5 | 270 > 271 | 1 | 9.3 | 30 | 2023 | 0 > 0 |
| hub-idle-empire | 0 / 56 | 0 | 749, 0.54 / 4.07 | 2.2 > 2.4 | 298 > 298 | 1 | 13.8 | 6 | 63 | 0 > 0 |

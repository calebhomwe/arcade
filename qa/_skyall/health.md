# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-02T07:03:02.360Z. 9 games, 30 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 0, STALL 2, JANK 0, LEAK 0, ERRORS 0, clean 7.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1, range x1 to x2.56. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Swim Dodge (`sky-swim-dodge`) | STALL | STALL: game over screen reached 1x and the game never got back to play (bot pressed buttons for 21 s) | tap centre | play, over 1, restarts 0 | `shots\sky-swim-dodge-1-title.jpg` `shots\sky-swim-dodge-2-mid.jpg` `shots\sky-swim-dodge-3-end.jpg` |
| 2 | Slide Runner (`sky-slide-runner`) | STALL | STALL: game over screen reached 1x and the game never got back to play (bot pressed buttons for 16 s) | tap centre | play, over 1, restarts 0 | `shots\sky-slide-runner-1-title.jpg` `shots\sky-slide-runner-2-mid.jpg` `shots\sky-slide-runner-3-end.jpg` |
| 3 | Traffic Run (`sky-traffic-run`) | OK | none | tap centre | play, over 3, restarts 0 | `shots\sky-traffic-run-1-title.jpg` `shots\sky-traffic-run-2-mid.jpg` `shots\sky-traffic-run-3-end.jpg` |
| 4 | Sniper Shot (`sky-sniper-shot`) | OK | none | tap centre | play, over 1, restarts 0 | `shots\sky-sniper-shot-1-title.jpg` `shots\sky-sniper-shot-2-mid.jpg` `shots\sky-sniper-shot-3-end.jpg` |
| 5 | Stack Tower (`sky-stack-tower`) | OK | none | tap centre | play, over 2, restarts 0 | `shots\sky-stack-tower-1-title.jpg` `shots\sky-stack-tower-2-mid.jpg` `shots\sky-stack-tower-3-end.jpg` |
| 6 | Spike Jump (`sky-spike-jump`) | OK | none | tap centre | play, over 3, restarts 0 | `shots\sky-spike-jump-1-title.jpg` `shots\sky-spike-jump-2-mid.jpg` `shots\sky-spike-jump-3-end.jpg` |
| 7 | Snake (`sky-snake`) | OK | none | tap centre | play, over 5, restarts 0 | `shots\sky-snake-1-title.jpg` `shots\sky-snake-2-mid.jpg` `shots\sky-snake-3-end.jpg` |
| 8 | Slingshot (`sky-slingshot`) | OK | none | tap centre | play, over 2, restarts 0 | `shots\sky-slingshot-1-title.jpg` `shots\sky-slingshot-2-mid.jpg` `shots\sky-slingshot-3-end.jpg` |
| 9 | Turret Defense (`sky-turret-defense`) | OK | none | tap centre | play, over 2, restarts 0 | `shots\sky-turret-defense-1-title.jpg` `shots\sky-turret-defense-2-mid.jpg` `shots\sky-turret-defense-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| sky-swim-dodge | 458 / 1184 | 45 | 1052, 19.2 / 164 | 2 > 2 | 30 > 31 | 1 | 3.9 | 54 | 1303 | 16 > 16 |
| sky-slide-runner | 0 / 428 | 15 | 1238, 6.04 / 34.09 | 1.8 > 2 | 30 > 31 | 1 | 3.9 | 37 | 1259 | 11 > 11 |
| sky-traffic-run | 838 / 1266 | 44 | 1118, 10.1 / 181.8 | 1.9 > 2.1 | 30 > 31 | 1 | 3.7 | 48 | 1992 | 98 > 106 |
| sky-sniper-shot | 874 / 546 | 19 | 1027, 28.83 / 101.56 | 2 > 2.1 | 30 > 31 | 1 | 4 | 48 | 1576 | 0 > 0 |
| sky-stack-tower | 0 / 789 | 20 | 1482, 7.5 / 27.9 | 1.9 > 1.9 | 30 > 31 | 1 | 3.7 | 32 | 1042 | 2 > 4 |
| sky-spike-jump | 0 / 735 | 22 | 1410, 5.1 / 35.3 | 2 > 2 | 30 > 31 | 1 | 3.7 | 35 | 533 | 0 > 0 |
| sky-snake | 419 / 230 | 6 | 1109, 6.05 / 30.43 | 1.9 > 2 | 30 > 31 | 1 | 5.1 | 45 | 857 | 0 > 0 |
| sky-slingshot | 0 / 292 | 4 | 1270, 3.82 / 16.26 | 1.8 > 2 | 30 > 31 | 1 | 3.7 | 30 | 406 | 0 > 0 |
| sky-turret-defense | 0 / 270 | 1 | 1856, 9.3 / 19.2 | 2.6 > 2.2 | 30 > 31 | 1 | 3.7 | 28 | 831 | 0 > 2 |

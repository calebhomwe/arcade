# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-02T06:59:12.274Z. 4 games, 30 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 0, STALL 2, JANK 0, LEAK 0, ERRORS 0, clean 2.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1, range x1 to x1.09. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Swim Dodge (`sky-swim-dodge`) | STALL | STALL: game over screen reached 1x and the game never got back to play (bot pressed buttons for 18 s) | tap centre | play, over 1, restarts 0 | `shots\sky-swim-dodge-1-title.jpg` `shots\sky-swim-dodge-2-mid.jpg` `shots\sky-swim-dodge-3-end.jpg` |
| 2 | Turret Defense (`sky-turret-defense`) | STALL | STALL: game over screen reached 1x and the game never got back to play (bot pressed buttons for 20 s) | tap centre | play, over 1, restarts 0 | `shots\sky-turret-defense-1-title.jpg` `shots\sky-turret-defense-2-mid.jpg` `shots\sky-turret-defense-3-end.jpg` |
| 3 | Snake (`sky-snake`) | OK | none | tap centre | play, over 8, restarts 0 | `shots\sky-snake-1-title.jpg` `shots\sky-snake-2-mid.jpg` `shots\sky-snake-3-end.jpg` |
| 4 | Slide Runner (`sky-slide-runner`) | OK | none | tap centre | play, over 4, restarts 0 | `shots\sky-slide-runner-1-title.jpg` `shots\sky-slide-runner-2-mid.jpg` `shots\sky-slide-runner-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| sky-swim-dodge | 0 / 777 | 4 | 1929, 11.1 / 32.7 | 2 > 2.3 | 30 > 31 | 1 | 4.4 | 29 | 523 | 33 > 33 |
| sky-turret-defense | 0 / 288 | 2 | 1886, 14.9 / 22.1 | 2.1 > 2 | 30 > 31 | 1 | 3.7 | 35 | 1715 | 3 > 3 |
| sky-snake | 0 / 482 | 16 | 1420, 12.4 / 48.5 | 1.9 > 2.1 | 31 > 31 | 1 | 5.3 | 35 | 749 | 0 > 0 |
| sky-slide-runner | 0 / 194 | 3 | 1704, 7.52 / 32.75 | 1.8 > 2.1 | 30 > 31 | 1 | 4.1 | 24 | 962 | 0 > 0 |

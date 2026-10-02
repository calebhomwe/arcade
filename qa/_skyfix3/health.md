# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-02T07:13:14.668Z. 3 games, 30 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 0, STALL 1, JANK 0, LEAK 0, ERRORS 0, clean 2.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1, range x1 to x1. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Swim Dodge (`sky-swim-dodge`) | STALL | STALL: game over screen reached 1x and the game never got back to play (bot pressed buttons for 40 s) | tap centre | play, over 1, restarts 0 | `shots\sky-swim-dodge-1-title.jpg` `shots\sky-swim-dodge-2-mid.jpg` |
| 2 | Turret Defense (`sky-turret-defense`) | OK | none | tap centre | play, over 2, restarts 0 | `shots\sky-turret-defense-1-title.jpg` `shots\sky-turret-defense-2-mid.jpg` `shots\sky-turret-defense-3-end.jpg` |
| 3 | Slide Runner (`sky-slide-runner`) | OK | none | tap centre | play, over 4, restarts 0 | `shots\sky-slide-runner-1-title.jpg` `shots\sky-slide-runner-2-mid.jpg` `shots\sky-slide-runner-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| sky-swim-dodge | 0 / 486 | 2 | 2496, 9.8 / 21.9 | 1.9 > 2.2 | 30 > 31 | 1 | 3.8 | 23 | 436 | 9 > 9 |
| sky-turret-defense | 0 / 321 | 1 | 1838, 15.7 / 29.8 | 1.9 > 2.3 | 30 > 31 | 1 | 3.7 | 36 | 1993 | 0 > 1 |
| sky-slide-runner | 101 / 249 | 2 | 1748, 10.2 / 23.4 | 1.8 > 2 | 30 > 31 | 1 | 4.1 | 22 | 1291 | 1 > 0 |

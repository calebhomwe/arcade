# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-02T06:55:15.707Z. 3 games, 25 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 3, STALL 3, JANK 0, LEAK 0, ERRORS 3, clean 0.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1.09, range x1 to x1.1. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Snake (`sky-snake`) | FREEZE+ERRORS+STALL | FREEZE: game loop (requestAnimationFrame) stopped for 25.6 s while visible in scene play, never recovered; an uncaught error was thrown at that moment: Uncaught TypeError: Cannot read properties of undefined (reading '0') @assets/arcade-sdk.js:75 \|\| ERRORS: 2 uncaught page error(s): Cannot read properties of undefined (reading '0') \|\| STALL: nothing on screen changed for 22 s while the bot kept tapping \| game over screen reached 1x and the game never got back to play (bot pressed buttons for 26 s) **[reproduced on re-run]** | tap centre | play, over 1, restarts 0 | `shots\sky-snake-1-title.jpg` `shots\sky-snake-2-mid.jpg` `shots\sky-snake-3-end.jpg` |
| 2 | Swim Dodge (`sky-swim-dodge`) | FREEZE+ERRORS+STALL | FREEZE: game loop (requestAnimationFrame) stopped for 17.9 s while visible in scene play, never recovered; an uncaught error was thrown at that moment: Uncaught TypeError: Cannot read properties of undefined (reading '0') @assets/arcade-sdk.js:75 \|\| ERRORS: 2 uncaught page error(s): Cannot read properties of undefined (reading '0') \|\| STALL: game over screen reached 1x and the game never got back to play (bot pressed buttons for 18 s) **[reproduced on re-run]** | tap centre | play, over 1, restarts 0 | `shots\sky-swim-dodge-1-title.jpg` `shots\sky-swim-dodge-2-mid.jpg` `shots\sky-swim-dodge-3-end.jpg` |
| 3 | Turret Defense (`sky-turret-defense`) | FREEZE+ERRORS+STALL | FREEZE: game loop (requestAnimationFrame) stopped for 18.5 s while visible in scene play, never recovered; an uncaught error was thrown at that moment: Uncaught TypeError: Cannot read properties of undefined (reading '0') @assets/arcade-sdk.js:75 \|\| ERRORS: 2 uncaught page error(s): Cannot read properties of undefined (reading '0') \|\| STALL: game over screen reached 1x and the game never got back to play (bot pressed buttons for 18 s) **[reproduced on re-run]** | tap centre | play, over 1, restarts 0 | `shots\sky-turret-defense-1-title.jpg` `shots\sky-turret-defense-2-mid.jpg` `shots\sky-turret-defense-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| sky-snake | 0 / 73 | 0 | 59, 0.4 / 57.1 | 1.9 > 2 | 31 > 32 | 1 | 4.6 | 1 | 370 | 0 > 0 |
| sky-swim-dodge | 0 / 60 | 0 | 494, 0.55 / 0.92 | 1.9 > 2 | 31 > 32 | 1 | 3.9 | 2 | 782 | 16 > 16 |
| sky-turret-defense | 0 / 99 | 0 | 538, 0.64 / 1.36 | 1.9 > 2 | 31 > 32 | 1 | 3.7 | 2 | 489 | 2 > 2 |

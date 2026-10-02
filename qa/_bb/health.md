# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-02T06:15:43.227Z. 1 games, 40 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 0, STALL 0, JANK 0, LEAK 0, ERRORS 0, clean 1.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1, range x1 to x1. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Bloxburg Town (`bloxburg-town`) | OK | none | declared start button not tappable -> tap centre | play, over 0, restarts 0 | `shots\bloxburg-town-1-title.jpg` `shots\bloxburg-town-2-mid.jpg` `shots\bloxburg-town-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| bloxburg-town | 420 / 165 | 0 | 167, 18.9 / 22.1 | 9.4 > 9.5 | 29 > 29 | 1 | 8.9 | 4 | 4008 | - |

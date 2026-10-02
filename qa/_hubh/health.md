# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-02T07:48:30.581Z. 2 games, 25 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 1, STALL 1, JANK 1, LEAK 0, ERRORS 0, clean 1.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1, range x1 to x1. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Isle of Bells (`hub-isle-of-bells`) | FREEZE+JANK+STALL | FREEZE: main thread blocked 4849 ms (while playing), 0 ms of it inside WebGL calls (software GL), machine slowdown x1 -> about 4849 ms of JS; long-task API + timer heartbeat; longest frame 3065.9 ms:  FrameRequestCallback 3063 \| 2 touch inputs not acknowledged within 4 s while the main thread was blocked \|\| JANK: p95 JS frame cost 350.8 ms over 33 ms (unthrottled, divided by machine slowdown x1; raw p95 350.8, median 25, p99 811.6, max 3064; time inside WebGL calls excluded, p95 of it 0) \|\| STALL: game never reported play after the start attempts (start: declared start button not tappable -> tap centre + tap on game); scenes seen: title **[reproduced on re-run]** | declared start button not tappable -> tap centre + tap on game | NO play, over 0, restarts 0 | `shots\hub-isle-of-bells-1-title.jpg` `shots\hub-isle-of-bells-2-mid.jpg` `shots\hub-isle-of-bells-3-end.jpg` |
| 2 | Hole Swallow (`hub-hole-swallow`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots\hub-hole-swallow-1-title.jpg` `shots\hub-hole-swallow-2-mid.jpg` `shots\hub-hole-swallow-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| hub-isle-of-bells | 3382 / 4849 | 153 | 346, 350.8 / 811.6 | 2.8 > 2.9 | 159 > 159 | 1 | 10.6 | 95 | 4823 | - |
| hub-hole-swallow | 1449 / 322 | 3 | 1744, 25.2 / 34.4 | 6 > 6.3 | 200 > 219 | 1 | 2 | 54 | 1336 | - |

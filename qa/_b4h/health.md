# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-02T19:21:21.379Z. 4 games, 25 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 3, STALL 1, JANK 2, LEAK 0, ERRORS 0, clean 1.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1, range x1 to x3.95. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Critter Rush 2D (`critter-rush-2d`) | FREEZE+STALL | FREEZE: main thread blocked 4643 ms (while playing), 0 ms of it inside WebGL calls (software GL), machine slowdown x1 -> about 4643 ms of JS; long-task API + timer heartbeat; longest frame 1985.7 ms: CritterRush2D/index.html DOMWindow.onkeydown 1869 /  FrameRequestCallback 45 \|\| STALL: started only with a keyboard key (tap centre + EASY + EASY + EASY + tap on game + KEY Enter); a phone has no keyboard [not reproduced on re-run] | tap centre + EASY + EASY + EASY + tap on game + KEY Enter | play, over 0, restarts 0 | `shots\critter-rush-2d-1-title.jpg` |
| 2 | Neon Dash (`neon-dash`) | FREEZE+JANK | FREEZE: main thread blocked 4667 ms (during load), 275 ms of it inside WebGL calls (software GL), machine slowdown x1 -> about 4392 ms of JS; long-task API + timer heartbeat; longest frame 6893.5 ms: vendor/three.classic.js http://127.0.0.1:57844/NeonDash/vendor/three.classic.js 552 \| page did not answer the harness for 6 s (3 poll timeout(s)) \|\| JANK: p95 JS frame cost 233.6 ms over 33 ms (unthrottled, divided by machine slowdown x1; raw p95 233.6, median 37.1, p99 354.9, max 449.1; time inside WebGL calls excluded, p95 of it 51.8) [not reproduced on re-run] | declared start button not tappable -> Play/Start button | play, over 0, restarts 0 | `shots\neon-dash-1-title.jpg` `shots\neon-dash-3-end.jpg` |
| 3 | Surviv Royale (`surviv-royale`) | FREEZE+JANK | FREEZE: main thread blocked 2235 ms (while playing), 0 ms of it inside WebGL calls (software GL), machine slowdown x1 -> about 2235 ms of JS; long-task API + timer heartbeat \| page did not answer the harness for 6 s (1 poll timeout(s)) \|\| JANK: p95 JS frame cost 248.1 ms over 33 ms (unthrottled, divided by machine slowdown x1; raw p95 248.1, median 1.2, p99 444.3, max 948.7; time inside WebGL calls excluded, p95 of it 0) **[reproduced on re-run]** | #btn-play | play, over 0, restarts 0 | `shots\surviv-royale-1-title.jpg` `shots\surviv-royale-2-mid.jpg` `shots\surviv-royale-3-end.jpg` |
| 4 | Chili Firm 2: Replanted (`chili-firm`) | OK | none | .playbtn | play, over 0, restarts 0 | `shots\chili-firm-1-title.jpg` `shots\chili-firm-2-mid.jpg` `shots\chili-firm-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| critter-rush-2d | 507 / 4643 | 32 | 1256, 2.5 / 30.4 | 2.1 > 2.2 | 74 > 79 | 1 | 4 | 11 | 3241 | - |
| neon-dash | 4392 / 3198 | 113 | 272, 233.6 / 354.9 | 6 > 6.4 | 8 > 85 | 1 | 4.1 | 91 | - | - |
| surviv-royale | 303 / 2235 | 176 | 579, 248.1 / 444.3 | 3.4 > 3 | 157 > 158 | 0 | 6.4 | 90 | 6429 | - |
| chili-firm | 100 / 282 | 5 | 963, 0.28 / 15.9 | 3 > 3.1 | 1150 > 1153 | 1 | 0 | 54 | 1953 | - |

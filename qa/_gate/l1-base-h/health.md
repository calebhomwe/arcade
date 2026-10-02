# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-02T18:43:10.836Z. 10 games, 25 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 2, STALL 1, JANK 2, LEAK 0, ERRORS 0, clean 7.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1.09, range x1 to x2.28. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Surviv Royale (`surviv-royale`) | FREEZE+JANK | FREEZE: main thread blocked 3443 ms (while playing), 0 ms of it inside WebGL calls (software GL), machine slowdown x1 -> about 3443 ms of JS; long-task API + timer heartbeat; longest frame 2425.7 ms:  PerformanceObserverCallback 36 /  FrameRequestCallback 2361 \|\| JANK: p95 JS frame cost 117 ms over 33 ms (unthrottled, divided by machine slowdown x1; raw p95 117, median 1.3, p99 227.2, max 3443; time inside WebGL calls excluded, p95 of it 0) [not reproduced on re-run] | #btn-play | play, over 0, restarts 0 | `shots\surviv-royale-1-title.jpg` `shots\surviv-royale-3-end.jpg` |
| 2 | Summit Line (`summit-line`) | FREEZE+JANK | FREEZE: main thread blocked 3016 ms (while playing), 0 ms of it inside WebGL calls (software GL), machine slowdown x1.1 -> about 2742 ms of JS; long-task API + timer heartbeat; longest frame 11433.6 ms: js/main.js BUTTON#btnPlay.onclick 2008 /  FrameRequestCallback 8059 \| page did not answer the harness for 6 s (3 poll timeout(s)) \|\| JANK: 15 long tasks of 100 ms or more while playing (no rAF loop to measure) **[reproduced on re-run]** | #btnPlay | play, over 0, restarts 0 | `shots\summit-line-1-title.jpg` |
| 3 | High Nest (`high-nest`) | STALL | STALL: game over screen reached 1x and the game never got back to play (bot pressed buttons for 19 s) | #play | play, over 1, restarts 0 | `shots\high-nest-1-title.jpg` `shots\high-nest-2-mid.jpg` |
| 4 | Survivor Wave (`survivor-wave`) | OK | risk: 25 Audio elements created | tap centre + ▶ PLAY | play, over 0, restarts 0 | `shots\survivor-wave-1-title.jpg` `shots\survivor-wave-3-end.jpg` |
| 5 | Hole Grind (`hole-grind`) | OK | none | #btnPlay | play, over 0, restarts 0 | `shots\hole-grind-1-title.jpg` `shots\hole-grind-2-mid.jpg` `shots\hole-grind-3-end.jpg` |
| 6 | Balloon Bust (`balloon-bust`) | OK | none | #c | play, over 0, restarts 0 | `shots\balloon-bust-1-title.jpg` |
| 7 | Kingdom Defense (`kingdom-defense`) | OK | none | #play + EASY 40 gate + EASY 40 gate + EASY 40 gate + tap on game | play, over 0, restarts 0 | `shots\kingdom-defense-1-title.jpg` `shots\kingdom-defense-2-mid.jpg` `shots\kingdom-defense-3-end.jpg` |
| 8 | Market Merge (`market-merge`) | OK | none | #play | play, over 0, restarts 0 | `shots\market-merge-1-title.jpg` `shots\market-merge-2-mid.jpg` `shots\market-merge-3-end.jpg` |
| 9 | Snap Jigsaw — Daily Puzzle Challenge (`snap-jigsaw`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots\snap-jigsaw-1-title.jpg` `shots\snap-jigsaw-2-mid.jpg` `shots\snap-jigsaw-3-end.jpg` |
| 10 | Tic Tac Toe — Beat the Bot (`tic-tac-toe`) | OK | none | tap centre + Play | play, over 0, restarts 0 | `shots\tic-tac-toe-1-title.jpg` `shots\tic-tac-toe-2-mid.jpg` `shots\tic-tac-toe-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| surviv-royale | 0 / 3443 | 92 | 776, 117 / 227.2 | 2.3 > 2.8 | 154 > 155 | 0 | 6.4 | 79 | 641 | - |
| summit-line | 475 / 2742 | 15 | 15, 966.82 / 966.82 | 9.6 > 9.7 | 343 > 355 | 1 | 13.2 | 38 | - | - |
| high-nest | 184 / 214 | 2 | 1561, 2.4 / 8.4 | 1.8 > 2 | 97 > 112 | 1 | 4 | 12 | 899 | 1 > 1 |
| survivor-wave | 129 / 1089 | 5 | 844, 21.4 / 34.2 | 3.8 > 4.3 | 361 > 353 | 1 | 22.4 | 33 | 791 | - |
| hole-grind | 1058 / 139 | 0 | 1228, 28.1 / 35.1 | 6.1 > 6.7 | 217 > 236 | 1 | 2.6 | 82 | 1421 | - |
| balloon-bust | 61 / 56 | 0 | 1835, 3.33 / 6.93 | 2.5 > 2.7 | 18 > 18 | 2 | 15.5 | 19 | 45 | - |
| kingdom-defense | 93 / 70 | 0 | 781, 0.46 / 1.39 | 2.3 > 2.4 | 353 > 353 | 2 | 40.5 | 4 | 1403 | - |
| market-merge | 0 / 109 | 0 | 1525, 8 / 11 | 1.8 > 2 | 111 > 111 | 1 | 4 | 34 | 1500 | - |
| snap-jigsaw | 0 / 48 | 0 | 902, 0.25 / 0.36 | 1.9 > 2 | 71 > 71 | 1 | 5.2 | 2 | 1686 | - |
| tic-tac-toe | 0 / 0 | 0 | 0, - / - | 1.7 > 1.8 | 96 > 96 | 0 | 0 | 1 | 281 | - |

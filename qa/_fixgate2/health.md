# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-02T05:46:30.340Z. 5 games, 25 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 0, STALL 0, JANK 0, LEAK 0, ERRORS 0, clean 5.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1.91, range x1 to x3.87. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Clean House (`clean-house`) | OK | none | #btnPlay | play, over 0, restarts 0 | `shots\clean-house-1-title.jpg` `shots\clean-house-2-mid.jpg` `shots\clean-house-3-end.jpg` |
| 2 | High Nest (`high-nest`) | OK | none | #play | play, over 2, restarts 1 | `shots\high-nest-1-title.jpg` `shots\high-nest-2-mid.jpg` `shots\high-nest-3-end.jpg` |
| 3 | Quiz Tower Defense (`quiz-tower`) | OK | none | tap:50%,76% | play, over 0, restarts 0 | `shots\quiz-tower-1-title.jpg` |
| 4 | Tic Tac Toe — Beat the Bot (`tic-tac-toe`) | OK | none | tap centre + Play | play, over 0, restarts 0 | `shots\tic-tac-toe-1-title.jpg` `shots\tic-tac-toe-2-mid.jpg` `shots\tic-tac-toe-3-end.jpg` |
| 5 | Word Dungeon (`word-dungeon`) | OK | none | tap:36%,56% | play, over 0, restarts 0 | `shots\word-dungeon-1-title.jpg` `shots\word-dungeon-2-mid.jpg` `shots\word-dungeon-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| clean-house | 1238 / 750 | 2 | 587, 1.1 / 25.3 | 4.1 > 4.6 | 316 > 319 | 0 | 28 | 11 | 4009 | - |
| high-nest | 30 / 50 | 0 | 1681, 0.16 / 0.31 | 1.8 > 2 | 97 > 112 | 1 | 4 | 3 | 528 | 1 > 1 |
| quiz-tower | 0 / 135 | 0 | 1095, 4.42 / 6.43 | 2 > 2.2 | 41 > 41 | 2 | 18.7 | 18 | 368 | - |
| tic-tac-toe | 26 / 0 | 0 | 0, - / - | 1.7 > 1.8 | 96 > 96 | 0 | 0 | 2 | 308 | - |
| word-dungeon | 39 / 0 | 0 | 1577, 0.65 / 1.04 | 1.8 > 2.1 | 45 > 47 | 2 | 13.7 | 7 | 586 | 1 > 1 |

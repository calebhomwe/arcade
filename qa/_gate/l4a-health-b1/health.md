# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-01T19:26:51.628Z. 4 games, 25 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 1, STALL 0, JANK 0, LEAK 0, ERRORS 0, clean 3.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1.09, range x1 to x1.09. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Sudoku (`hub-sudoku`) | FREEZE | FREEZE: page did not answer the harness for 6 s (1 poll timeout(s)) [not reproduced on re-run] | #playBtn | play, over 0, restarts 0 | `shots\hub-sudoku-1-title.jpg` `shots\hub-sudoku-2-mid.jpg` `shots\hub-sudoku-3-end.jpg` |
| 2 | Color Switch (`hub-color-switch`) | OK | none | #playBtn + tap on game | play, over 2, restarts 2 | `shots\hub-color-switch-1-title.jpg` `shots\hub-color-switch-2-mid.jpg` `shots\hub-color-switch-3-end.jpg` |
| 3 | Tower Stack (`hub-tower-stack`) | OK | none | #playBtn | play, over 1, restarts 1 | `shots\hub-tower-stack-1-title.jpg` `shots\hub-tower-stack-2-mid.jpg` |
| 4 | Merge Blocks (`hub-merge-blocks`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots\hub-merge-blocks-1-title.jpg` `shots\hub-merge-blocks-2-mid.jpg` `shots\hub-merge-blocks-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| hub-sudoku | 73 / 56 | 0 | 6, 0.09 / 0.09 | 1.8 > 1.9 | 188 > 189 | 1 | 8.9 | 2 | 1192 | - |
| hub-color-switch | 54 / 487 | 26 | 2105, 9.1 / 32 | 1.9 > 2.1 | 87 > 87 | 2 | 3.8 | 41 | 3232 | 0 > 2 |
| hub-tower-stack | 80 / 486 | 3 | 1648, 0.5 / 10.3 | 1.8 > 2 | 80 > 80 | 1 | 10.4 | 13 | 1520 | 2 > 2 |
| hub-merge-blocks | 55 / 78 | 0 | 0, - / - | 1.7 > 2 | 128 > 128 | 1 | 0 | 4 | 507 | - |

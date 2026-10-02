# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-02T20:04:15.972Z. 5 games, 25 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 0, STALL 0, JANK 0, LEAK 0, ERRORS 0, clean 5.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1.94, range x1.1 to x2.56. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Math Blast (`hub-math-blast`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots\hub-math-blast-1-title.jpg` `shots\hub-math-blast-2-mid.jpg` `shots\hub-math-blast-3-end.jpg` |
| 2 | Rhyme Time (`hub-rhyme-time`) | OK | none | #btnStart | play, over 0, restarts 0 | `shots\hub-rhyme-time-1-title.jpg` `shots\hub-rhyme-time-2-mid.jpg` `shots\hub-rhyme-time-3-end.jpg` |
| 3 | Math Run (`hub-math-run`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots\hub-math-run-1-title.jpg` `shots\hub-math-run-2-mid.jpg` `shots\hub-math-run-3-end.jpg` |
| 4 | Hangman (`hub-hangman`) | OK | none | .cat-btn[data-cat=animals] | play, over 0, restarts 0 | `shots\hub-hangman-1-title.jpg` `shots\hub-hangman-2-mid.jpg` `shots\hub-hangman-3-end.jpg` |
| 5 | Spell & Say (`hub-spell-and-say`) | OK | none | #btnPlay | play, over 0, restarts 0 | `shots\hub-spell-and-say-1-title.jpg` `shots\hub-spell-and-say-2-mid.jpg` `shots\hub-spell-and-say-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| hub-math-blast | 75 / 408 | 3 | 1399, 0.4 / 11.17 | 1.8 > 2 | 92 > 93 | 1 | 11.9 | 28 | 1543 | - |
| hub-rhyme-time | 26 / 448 | 9 | 1118, 0.04 / 0.31 | 1.8 > 2 | 96 > 90 | 1 | 0 | 34 | 907 | - |
| hub-math-run | 84 / 253 | 2 | 1663, 3.45 / 12.27 | 1.9 > 2.1 | 87 > 88 | 1 | 11 | 18 | 1225 | - |
| hub-hangman | 87 / 64 | 0 | 0, - / - | 1.7 > 1.8 | 132 > 129 | 0 | 4.8 | 2 | 509 | - |
| hub-spell-and-say | 63 / 76 | 0 | 0, - / - | 1.7 > 1.8 | 138 > 133 | 1 | 0 | 3 | 681 | - |

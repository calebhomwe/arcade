# Health check: chromium, NO CPU throttle (unthrottled numbers)

Generated 2026-10-02T07:52:43.631Z. 1 games, 30 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 0, STALL 0, JANK 1, LEAK 0, ERRORS 0, clean 0.**

Machine: 24 cores, 1-minute load average at the end of each game ranged 0 to 0 (median 0). Measured CPU contention while running (wall/CPU of a spin): median x1.58, range x1.58 to x1.58. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Isle of Bells (`hub-isle-of-bells`) | JANK | JANK: p95 JS frame cost 116.65 ms over 33 ms (unthrottled, divided by machine slowdown x1.6; raw p95 184.3, median 0.89, p99 245.51, max 880.3; time inside WebGL calls excluded, p95 of it 0) | #playBtn | play, over 0, restarts 0 | `shots\hub-isle-of-bells-1-title.jpg` `shots\hub-isle-of-bells-2-mid.jpg` `shots\hub-isle-of-bells-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| hub-isle-of-bells | 1023 / 1063 | 63 | 630, 116.65 / 245.51 | 2.3 > 2.4 | 159 > 159 | 1 | 10.6 | 75 | 1941 | - |

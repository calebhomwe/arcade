# Health check: chromium, CPU throttled x4

Generated 2026-09-30T07:15:14.447Z. 79 games, 45 s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).

**FREEZE 12, STALL 14, JANK 10, LEAK 0, ERRORS 2, clean 54.**

Machine: 4 cores, 1-minute load average at the end of each game ranged 13.2 to 24.68 (median 17.32). Measured CPU contention while running (wall/CPU of a spin): median x1.68, range x1.16 to x5.42. Measured slowdown of the throttled page against an unthrottled page (a fixed JS benchmark): median x3.3, range x0.8 to x8.6. The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.

Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.

| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |
|--:|---|---|---|---|---|---|
| 1 | Clean House (`clean-house`) | FREEZE+JANK | FREEZE: main thread blocked 16398 ms (during load), 1301 ms of it inside WebGL calls (software GL), machine slowdown x1.5 -> about 10064 ms of JS; long-task API + timer heartbeat; longest frame 16418 ms: CleanHouse/index.html http://127.0.0.1:36525/CleanHouse/index.html 8228 /  FrameRequestCallback 8140 \|\| JANK: p95 JS frame cost 120.73 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.5; raw p95 181.1, median 4, p99 2133.87, max 2133.9; time inside WebGL calls excluded, p95 of it 6.4) **[reproduced on re-run]** | #btnPlay | play, over 0, restarts 0 | `shots/clean-house-1-title.jpg` `shots/clean-house-2-mid.jpg` `shots/clean-house-3-end.jpg` |
| 2 | TIDEBREAK (`godot-tidebreak`) | FREEZE+JANK+STALL | FREEZE: main thread blocked 7691 ms (during load), 1874 ms of it inside WebGL calls (software GL), machine slowdown x1.5 -> about 3957 ms of JS; long-task API + timer heartbeat; longest frame 6532.8 ms: _engine/godot.js IDBRequest.onsuccess 6473 /  FrameRequestCallback 30 \|\| JANK: p95 JS frame cost 18.37 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.5; raw p95 27, median 6.33, p99 28.37, max 106.6; time inside WebGL calls excluded, p95 of it 538.1) \|\| STALL: game never reported play after the start attempts (start: tap centre + tap on game); scenes seen: title \| nothing on screen changed for 42 s while the bot kept tapping **[reproduced on re-run]** | tap centre + tap on game | NO play, over 0, restarts 0 | `shots/godot-tidebreak-1-title.jpg` `shots/godot-tidebreak-2-mid.jpg` `shots/godot-tidebreak-3-end.jpg` |
| 3 | TIDEBREAK World Tour (`godot-tidebreak-world-tour`) | FREEZE+JANK+STALL | FREEZE: main thread blocked 6817 ms (during load), 1769 ms of it inside WebGL calls (software GL), machine slowdown x1.3 -> about 3853 ms of JS; long-task API + timer heartbeat; longest frame 5764.7 ms: _engine/godot.js IDBRequest.onsuccess 5622 /  FrameRequestCallback 130 \|\| JANK: p95 JS frame cost 19.39 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.3; raw p95 25.4, median 5.95, p99 31.91, max 173.7; time inside WebGL calls excluded, p95 of it 494.8) \|\| STALL: game never reported play after the start attempts (start: tap centre + tap on game); scenes seen: title \| nothing on screen changed for 27 s while the bot kept tapping **[reproduced on re-run]** | tap centre + tap on game | NO play, over 0, restarts 0 | `shots/godot-tidebreak-world-tour-1-title.jpg` `shots/godot-tidebreak-world-tour-2-mid.jpg` `shots/godot-tidebreak-world-tour-3-end.jpg` |
| 4 | Heat Firm (`godot-heat-firm`) | FREEZE+JANK+STALL | FREEZE: main thread blocked 9126 ms (during load), 2359 ms of it inside WebGL calls (software GL), machine slowdown x2.1 -> about 3285 ms of JS; long-task API + timer heartbeat; longest frame 7094.5 ms: _engine/godot.js IDBOpenDBRequest.onupgradeneeded 5 / _engine/godot.js IDBOpenDBRequest.onsuccess 7 / _engine/godot.js IDBRequest.onsuccess 7029 \|\| JANK: p95 JS frame cost 24.81 ms over 16 ms (CPU throttled x4, divided by machine slowdown x2.1; raw p95 51.1, median 5.19, p99 57.18, max 143; time inside WebGL calls excluded, p95 of it 924.2) \|\| STALL: started only with a keyboard key (tap centre + tap on game + KEY Enter); a phone has no keyboard \| nothing on screen changed for 29 s while the bot kept tapping **[reproduced on re-run]** | tap centre + tap on game + KEY Enter | play, over 0, restarts 0 | `shots/godot-heat-firm-1-title.jpg` `shots/godot-heat-firm-2-mid.jpg` `shots/godot-heat-firm-3-end.jpg` |
| 5 | Hole Grind (`hole-grind`) | FREEZE+JANK | FREEZE: main thread blocked 8009 ms (during load), 914 ms of it inside WebGL calls (software GL), machine slowdown x1.4 -> about 5217 ms of JS; long-task API + timer heartbeat; longest frame 9565.5 ms: three/three.core.min.js Response.blob.then 7 / three/three.core.min.js Promise.resolve 24 / three/three.core.min.js Promise.resolve 12 \|\| JANK: p95 JS frame cost 30.15 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.4; raw p95 41, median 6.18, p99 274.63, max 615.4; time inside WebGL calls excluded, p95 of it 4.1) **[reproduced on re-run]** | #btnPlay | play, over 0, restarts 0 | `shots/hole-grind-1-title.jpg` `shots/hole-grind-2-mid.jpg` `shots/hole-grind-3-end.jpg` |
| 6 | Hole Eater (`sky-hole-eater`) | FREEZE+JANK | FREEZE: main thread blocked 4403 ms (during load), 359 ms of it inside WebGL calls (software GL), machine slowdown x1.4 -> about 2952 ms of JS; long-task API + timer heartbeat; longest frame 4403.8 ms: skywalker-playables/hole-eater.html https://calebhomwe.github.io/neon-game-arcade/games/skywalker-playables/hole-eater.html 4388 \|\| JANK: p95 JS frame cost 18.03 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.4; raw p95 24.7, median 4.09, p99 41.9, max 222.3; time inside WebGL calls excluded, p95 of it 4.4) **[reproduced on re-run]** | tap centre | play, over 0, restarts 0 | `shots/sky-hole-eater-1-title.jpg` `shots/sky-hole-eater-2-mid.jpg` `shots/sky-hole-eater-3-end.jpg` |
| 7 | Cook Rush (`cook-rush`) | FREEZE+JANK | FREEZE: main thread blocked 2360 ms (while playing), 0 ms of it inside WebGL calls (software GL), machine slowdown x1.3 -> about 1873 ms of JS; long-task API + timer heartbeat; longest frame 5823.4 ms:  FrameRequestCallback 16 \| 2 touch inputs not acknowledged within 4 s while the main thread was blocked \|\| JANK: p95 JS frame cost 22.06 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.3; raw p95 27.8, median 3.25, p99 26.51, max 26.5; time inside WebGL calls excluded, p95 of it 0) [not reproduced on re-run] | tap centre | play, over 0, restarts 0 | `shots/cook-rush-1-title.jpg` `shots/cook-rush-2-mid.jpg` `shots/cook-rush-3-end.jpg` |
| 8 | City Builder 2000 (`godot-city-builder`) | FREEZE | FREEZE: main thread blocked 18138 ms (during load), 12926 ms of it inside WebGL calls (software GL), machine slowdown x1.6 -> about 3278 ms of JS; long-task API + timer heartbeat; longest frame 10236.7 ms:  FrameRequestCallback 10053 **[reproduced on re-run]** | tap centre | play, over 0, restarts 0 | `shots/godot-city-builder-1-title.jpg` `shots/godot-city-builder-3-end.jpg` |
| 9 | Summit Line (`summit-line`) | FREEZE+STALL | FREEZE: page did not answer the harness for 6 s (72 poll timeout(s)) \|\| STALL: game never reported play after the start attempts (start: #btnPlay + SKIP + tap on game); scenes seen: title **[reproduced on re-run]** | #btnPlay + SKIP + tap on game | NO play, over 0, restarts 0 |  |
| 10 | The Long Way Home (`long-way-home`) | FREEZE+JANK | FREEZE: 3 touch inputs not acknowledged within 4 s while the main thread was blocked \|\| JANK: p95 JS frame cost 46.84 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.9; raw p95 87.6, median 12.57, p99 70.11, max 70.1; time inside WebGL calls excluded, p95 of it 14.7) [not reproduced on re-run] | [data-play="quick"] | play, over 0, restarts 0 | `shots/long-way-home-1-title.jpg` `shots/long-way-home-2-mid.jpg` `shots/long-way-home-3-end.jpg` |
| 11 | LA City (`godot-la-city`) | FREEZE+STALL | FREEZE: page did not answer the harness for 6 s (47 poll timeout(s)) \|\| STALL: game never reported play after the start attempts (start: tap centre + tap on game); scenes seen: none **[reproduced on re-run]** | tap centre + tap on game | NO play, over 0, restarts 0 |  |
| 12 | Chili Firm 2: Replanted (`chili-firm`) | FREEZE | FREEZE: 2 touch inputs not acknowledged within 4 s while the main thread was blocked [not reproduced on re-run] | .playbtn | play, over 0, restarts 0 | `shots/chili-firm-1-title.jpg` `shots/chili-firm-2-mid.jpg` `shots/chili-firm-3-end.jpg` |
| 13 | Parking Puzzle (`sky-parking-puzzle`) | STALL | STALL: nothing on screen changed for 24 s while the bot kept tapping | tap centre | play, over 0, restarts 0 | `shots/sky-parking-puzzle-1-title.jpg` `shots/sky-parking-puzzle-2-mid.jpg` `shots/sky-parking-puzzle-3-end.jpg` |
| 14 | Cut the Rope (`sky-cut-rope`) | STALL | STALL: nothing on screen changed for 27 s while the bot kept tapping | tap centre | play, over 0, restarts 0 | `shots/sky-cut-rope-1-title.jpg` `shots/sky-cut-rope-2-mid.jpg` `shots/sky-cut-rope-3-end.jpg` |
| 15 | Traffic Run (`sky-traffic-run`) | STALL | STALL: game over screen reached 1x and the game never got back to play (bot pressed buttons for 22 s) | tap centre | play, over 1, restarts 0 | `shots/sky-traffic-run-1-title.jpg` `shots/sky-traffic-run-2-mid.jpg` `shots/sky-traffic-run-3-end.jpg` |
| 16 | Color Match (`sky-color-match`) | STALL | STALL: game over screen reached 1x and the game never got back to play (bot pressed buttons for 23 s) | tap centre | play, over 1, restarts 0 | `shots/sky-color-match-1-title.jpg` `shots/sky-color-match-2-mid.jpg` `shots/sky-color-match-3-end.jpg` |
| 17 | Slingshot (`sky-slingshot`) | STALL | STALL: game over screen reached 1x and the game never got back to play (bot pressed buttons for 37 s) | tap centre | play, over 1, restarts 0 | `shots/sky-slingshot-1-title.jpg` `shots/sky-slingshot-2-mid.jpg` `shots/sky-slingshot-3-end.jpg` |
| 18 | Spike Jump (`sky-spike-jump`) | STALL | STALL: game over screen reached 1x and the game never got back to play (bot pressed buttons for 47 s) | tap centre | play, over 1, restarts 0 | `shots/sky-spike-jump-1-title.jpg` `shots/sky-spike-jump-2-mid.jpg` `shots/sky-spike-jump-3-end.jpg` |
| 19 | Stack Tower (`sky-stack-tower`) | STALL | STALL: game over screen reached 2x and the game never got back to play (bot pressed buttons for 28 s) | tap centre | play, over 2, restarts 0 | `shots/sky-stack-tower-1-title.jpg` `shots/sky-stack-tower-2-mid.jpg` `shots/sky-stack-tower-3-end.jpg` |
| 20 | Slide Runner (`sky-slide-runner`) | STALL | STALL: game over screen reached 1x and the game never got back to play (bot pressed buttons for 29 s) | tap centre | play, over 1, restarts 0 | `shots/sky-slide-runner-1-title.jpg` `shots/sky-slide-runner-2-mid.jpg` `shots/sky-slide-runner-3-end.jpg` |
| 21 | Tic Tac Toe — Beat the Bot (`tic-tac-toe`) | STALL | STALL: nothing on screen changed for 21 s while the bot kept tapping | Play/Start button | play, over 0, restarts 0 | `shots/tic-tac-toe-1-title.jpg` `shots/tic-tac-toe-2-mid.jpg` `shots/tic-tac-toe-3-end.jpg` |
| 22 | Survivor Wave (`survivor-wave`) | JANK | JANK: p95 JS frame cost 53.73 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.5; raw p95 82.2, median 5.75, p99 97.52, max 97.5; time inside WebGL calls excluded, p95 of it 0) | tap centre + ▶ PLAY | play, over 0, restarts 0 | `shots/survivor-wave-1-title.jpg` `shots/survivor-wave-2-mid.jpg` `shots/survivor-wave-3-end.jpg` |
| 23 | Maths Kart GP (`maths-kart`) | JANK | JANK: p95 JS frame cost 44.76 ms over 16 ms (CPU throttled x4, divided by machine slowdown x1.7; raw p95 76.1, median 8.12, p99 228.12, max 539.8; time inside WebGL calls excluded, p95 of it 5.3) | #bPlay | play, over 0, restarts 0 | `shots/maths-kart-1-title.jpg` `shots/maths-kart-2-mid.jpg` `shots/maths-kart-3-end.jpg` |
| 24 | Game Arcade — Bridge Race & Fashion Princess (`game-arcade-7`) | ERRORS | ERRORS: 2 uncaught page error(s): Cannot set properties of undefined (setting 'right') | .game-card .card-btn + Let's play | play, over 0, restarts 0 | `shots/game-arcade-7-1-title.jpg` `shots/game-arcade-7-2-mid.jpg` `shots/game-arcade-7-3-end.jpg` |
| 25 | Whack-a-Mole (`hub-whack-a-mole`) | ERRORS | ERRORS: 1 uncaught page error(s): KKs.banner is not a function | #playBtn | play, over 0, restarts 0 | `shots/hub-whack-a-mole-1-title.jpg` `shots/hub-whack-a-mole-2-mid.jpg` `shots/hub-whack-a-mole-3-end.jpg` |
| 26 | Kingdom Defense (`kingdom-defense`) | OK | none | declared start button not tappable -> tap centre | play, over 0, restarts 0 | `shots/kingdom-defense-2-mid.jpg` `shots/kingdom-defense-3-end.jpg` |
| 27 | Isle of Bells (`hub-isle-of-bells`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots/hub-isle-of-bells-1-title.jpg` `shots/hub-isle-of-bells-2-mid.jpg` `shots/hub-isle-of-bells-3-end.jpg` |
| 28 | Snake Clash (`snake-clash`) | OK | none | #play | play, over 0, restarts 0 | `shots/snake-clash-1-title.jpg` `shots/snake-clash-2-mid.jpg` `shots/snake-clash-3-end.jpg` |
| 29 | Field Station (`field-station`) | OK | none | #playNext | play, over 0, restarts 0 | `shots/field-station-1-title.jpg` `shots/field-station-2-mid.jpg` `shots/field-station-3-end.jpg` |
| 30 | Knife Hit (`hub-knife-hit`) | OK | none | #playBtn | play, over 1, restarts 1 | `shots/hub-knife-hit-1-title.jpg` `shots/hub-knife-hit-2-mid.jpg` `shots/hub-knife-hit-3-end.jpg` |
| 31 | Tower Stack (`hub-tower-stack`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots/hub-tower-stack-1-title.jpg` `shots/hub-tower-stack-2-mid.jpg` `shots/hub-tower-stack-3-end.jpg` |
| 32 | Block Blast (`hub-block-blast`) | OK | none | centre (start button not tappable) + tap on game | play, over 0, restarts 0 | `shots/hub-block-blast-1-title.jpg` `shots/hub-block-blast-2-mid.jpg` `shots/hub-block-blast-3-end.jpg` |
| 33 | Flappy Flight (`hub-flappy-flight`) | OK | none | #playBtn + tap on game | play, over 3, restarts 2 | `shots/hub-flappy-flight-1-title.jpg` `shots/hub-flappy-flight-2-mid.jpg` `shots/hub-flappy-flight-3-end.jpg` |
| 34 | Sudoku (`hub-sudoku`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots/hub-sudoku-1-title.jpg` `shots/hub-sudoku-2-mid.jpg` `shots/hub-sudoku-3-end.jpg` |
| 35 | Word Scramble (`hub-word-scramble`) | OK | none | .diff-btn.sel | play, over 0, restarts 0 | `shots/hub-word-scramble-1-title.jpg` `shots/hub-word-scramble-2-mid.jpg` `shots/hub-word-scramble-3-end.jpg` |
| 36 | Balloon Bust (`balloon-bust`) | OK | none | #c | play, over 0, restarts 0 | `shots/balloon-bust-1-title.jpg` `shots/balloon-bust-2-mid.jpg` `shots/balloon-bust-3-end.jpg` |
| 37 | DEEPCUT (`deepcut-mine`) | OK | none | Play/Start button | play, over 0, restarts 0 | `shots/deepcut-mine-1-title.jpg` `shots/deepcut-mine-2-mid.jpg` `shots/deepcut-mine-3-end.jpg` |
| 38 | Bubble Pop (`hub-bubble-pop`) | OK | none | #playBtn | play, over 1, restarts 0 | `shots/hub-bubble-pop-1-title.jpg` `shots/hub-bubble-pop-2-mid.jpg` `shots/hub-bubble-pop-3-end.jpg` |
| 39 | Connect Four (`hub-connect-four`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots/hub-connect-four-1-title.jpg` `shots/hub-connect-four-2-mid.jpg` `shots/hub-connect-four-3-end.jpg` |
| 40 | Dino Dash (`hub-dino-dash`) | OK | none | #playBtn + tap on game | play, over 5, restarts 4 | `shots/hub-dino-dash-1-title.jpg` `shots/hub-dino-dash-2-mid.jpg` `shots/hub-dino-dash-3-end.jpg` |
| 41 | Memory Match (`hub-memory-match`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots/hub-memory-match-1-title.jpg` `shots/hub-memory-match-2-mid.jpg` `shots/hub-memory-match-3-end.jpg` |
| 42 | Tic Tac Toe (`hub-tic-tac-toe`) | OK | none | #playBtn | play, over 3, restarts 3 | `shots/hub-tic-tac-toe-1-title.jpg` `shots/hub-tic-tac-toe-2-mid.jpg` `shots/hub-tic-tac-toe-3-end.jpg` |
| 43 | Market Merge (`market-merge`) | OK | none | #play | play, over 0, restarts 0 | `shots/market-merge-1-title.jpg` `shots/market-merge-2-mid.jpg` `shots/market-merge-3-end.jpg` |
| 44 | Quiz Tower Defense (`quiz-tower`) | OK | none | tap:50%,76% | play, over 0, restarts 0 | `shots/quiz-tower-1-title.jpg` |
| 45 | Volt Dash (`volt-dash`) | OK | none | #play | play, over 0, restarts 0 | `shots/volt-dash-1-title.jpg` `shots/volt-dash-2-mid.jpg` `shots/volt-dash-3-end.jpg` |
| 46 | Word Dungeon (`word-dungeon`) | OK | none | tap:36%,56% | play, over 0, restarts 0 | `shots/word-dungeon-1-title.jpg` `shots/word-dungeon-2-mid.jpg` `shots/word-dungeon-3-end.jpg` |
| 47 | High Nest (`high-nest`) | OK | none | #play | play, over 3, restarts 1 | `shots/high-nest-1-title.jpg` `shots/high-nest-2-mid.jpg` `shots/high-nest-3-end.jpg` |
| 48 | Farm Harvest (`hub-farm-harvest`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots/hub-farm-harvest-1-title.jpg` `shots/hub-farm-harvest-2-mid.jpg` `shots/hub-farm-harvest-3-end.jpg` |
| 49 | Math Blast (`hub-math-blast`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots/hub-math-blast-1-title.jpg` `shots/hub-math-blast-2-mid.jpg` `shots/hub-math-blast-3-end.jpg` |
| 50 | Math Snake (`hub-math-snake`) | OK | none | #playBtn | play, over 1, restarts 1 | `shots/hub-math-snake-1-title.jpg` `shots/hub-math-snake-2-mid.jpg` `shots/hub-math-snake-3-end.jpg` |
| 51 | Merge Blocks (`hub-merge-blocks`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots/hub-merge-blocks-1-title.jpg` `shots/hub-merge-blocks-2-mid.jpg` `shots/hub-merge-blocks-3-end.jpg` |
| 52 | Rap Academy (`rap-academy`) | OK | none | .hero-cta .btn-primary | play, over 0, restarts 0 | `shots/rap-academy-1-title.jpg` `shots/rap-academy-2-mid.jpg` `shots/rap-academy-3-end.jpg` |
| 53 | Balance Tile (`sky-balance-tile`) | OK | none | tap centre | play, over 4, restarts 0 | `shots/sky-balance-tile-1-title.jpg` `shots/sky-balance-tile-2-mid.jpg` `shots/sky-balance-tile-3-end.jpg` |
| 54 | Brick Breaker (`sky-breakout`) | OK | none | tap centre | play, over 0, restarts 0 | `shots/sky-breakout-1-title.jpg` `shots/sky-breakout-2-mid.jpg` `shots/sky-breakout-3-end.jpg` |
| 55 | Sniper Shot (`sky-sniper-shot`) | OK | none | tap centre | play, over 1, restarts 0 | `shots/sky-sniper-shot-1-title.jpg` `shots/sky-sniper-shot-2-mid.jpg` `shots/sky-sniper-shot-3-end.jpg` |
| 56 | Turret Defense (`sky-turret-defense`) | OK | none | tap centre | play, over 0, restarts 0 | `shots/sky-turret-defense-1-title.jpg` `shots/sky-turret-defense-2-mid.jpg` `shots/sky-turret-defense-3-end.jpg` |
| 57 | Surviv Royale (`surviv-royale`) | OK | none | #btn-play | play, over 0, restarts 0 | `shots/surviv-royale-1-title.jpg` `shots/surviv-royale-2-mid.jpg` `shots/surviv-royale-3-end.jpg` |
| 58 | 2048 (`hub-game-2048`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots/hub-game-2048-1-title.jpg` `shots/hub-game-2048-2-mid.jpg` `shots/hub-game-2048-3-end.jpg` |
| 59 | Math Battle (`hub-math-battle`) | OK | none | #playBtn | play, over 1, restarts 0 | `shots/hub-math-battle-1-title.jpg` `shots/hub-math-battle-2-mid.jpg` `shots/hub-math-battle-3-end.jpg` |
| 60 | Minesweeper (`hub-minesweeper`) | OK | none | #playBtn | play, over 4, restarts 4 | `shots/hub-minesweeper-1-title.jpg` `shots/hub-minesweeper-2-mid.jpg` `shots/hub-minesweeper-3-end.jpg` |
| 61 | Spell & Say (`hub-spell-and-say`) | OK | none | #btnPlay | play, over 0, restarts 0 | `shots/hub-spell-and-say-1-title.jpg` `shots/hub-spell-and-say-2-mid.jpg` `shots/hub-spell-and-say-3-end.jpg` |
| 62 | Grow or Shrink (`sky-grow-shrink`) | OK | none | tap centre | play, over 0, restarts 0 | `shots/sky-grow-shrink-1-title.jpg` `shots/sky-grow-shrink-2-mid.jpg` `shots/sky-grow-shrink-3-end.jpg` |
| 63 | Pull the Pin (`sky-key-unlock`) | OK | none | tap centre | play, over 0, restarts 0 | `shots/sky-key-unlock-1-title.jpg` `shots/sky-key-unlock-2-mid.jpg` `shots/sky-key-unlock-3-end.jpg` |
| 64 | Match Swipe (`sky-match-swipe`) | OK | none | tap centre | play, over 0, restarts 0 | `shots/sky-match-swipe-1-title.jpg` `shots/sky-match-swipe-2-mid.jpg` `shots/sky-match-swipe-3-end.jpg` |
| 65 | Rope Swing (`sky-rope-swing`) | OK | none | tap centre | play, over 2, restarts 0 | `shots/sky-rope-swing-1-title.jpg` `shots/sky-rope-swing-2-mid.jpg` `shots/sky-rope-swing-3-end.jpg` |
| 66 | Snake (`sky-snake`) | OK | none | tap centre | play, over 6, restarts 0 | `shots/sky-snake-1-title.jpg` `shots/sky-snake-2-mid.jpg` `shots/sky-snake-3-end.jpg` |
| 67 | Snap Jigsaw — Daily Puzzle Challenge (`snap-jigsaw`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots/snap-jigsaw-1-title.jpg` `shots/snap-jigsaw-2-mid.jpg` `shots/snap-jigsaw-3-end.jpg` |
| 68 | Claire's Big Life (`claire-pip`) | OK | none | #ageBands .ageband + ▶ Start play | play, over 0, restarts 0 | `shots/claire-pip-1-title.jpg` `shots/claire-pip-2-mid.jpg` `shots/claire-pip-3-end.jpg` |
| 69 | Farm Idle Tycoon (`hub-farm-idle`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots/hub-farm-idle-1-title.jpg` `shots/hub-farm-idle-2-mid.jpg` `shots/hub-farm-idle-3-end.jpg` |
| 70 | Hangman (`hub-hangman`) | OK | none | .cat-btn[data-cat=animals] | play, over 0, restarts 0 | `shots/hub-hangman-1-title.jpg` `shots/hub-hangman-2-mid.jpg` `shots/hub-hangman-3-end.jpg` |
| 71 | Idle Miner (`hub-idle-miner`) | OK | none | #btnPlay | play, over 0, restarts 0 | `shots/hub-idle-miner-1-title.jpg` `shots/hub-idle-miner-2-mid.jpg` `shots/hub-idle-miner-3-end.jpg` |
| 72 | Math Run (`hub-math-run`) | OK | none | #playBtn | play, over 0, restarts 0 | `shots/hub-math-run-1-title.jpg` `shots/hub-math-run-2-mid.jpg` `shots/hub-math-run-3-end.jpg` |
| 73 | Missing Letter (`hub-missing-letter`) | OK | none | #btnPlay | play, over 0, restarts 0 | `shots/hub-missing-letter-1-title.jpg` `shots/hub-missing-letter-2-mid.jpg` `shots/hub-missing-letter-3-end.jpg` |
| 74 | Rhyme Time (`hub-rhyme-time`) | OK | none | #btnStart | play, over 0, restarts 0 | `shots/hub-rhyme-time-1-title.jpg` `shots/hub-rhyme-time-2-mid.jpg` `shots/hub-rhyme-time-3-end.jpg` |
| 75 | Snake (`hub-snake`) | OK | none | #playBtn | play, over 2, restarts 2 | `shots/hub-snake-1-title.jpg` `shots/hub-snake-2-mid.jpg` `shots/hub-snake-3-end.jpg` |
| 76 | Flap & Fly (`sky-flappy-bird`) | OK | none | tap centre | play, over 2, restarts 0 | `shots/sky-flappy-bird-1-title.jpg` `shots/sky-flappy-bird-2-mid.jpg` `shots/sky-flappy-bird-3-end.jpg` |
| 77 | Lane Switcher (`sky-lane-switcher`) | OK | none | tap centre | play, over 1, restarts 0 | `shots/sky-lane-switcher-1-title.jpg` `shots/sky-lane-switcher-2-mid.jpg` `shots/sky-lane-switcher-3-end.jpg` |
| 78 | Maze Runner (`sky-maze-runner`) | OK | none | tap centre | play, over 0, restarts 0 | `shots/sky-maze-runner-1-title.jpg` `shots/sky-maze-runner-2-mid.jpg` `shots/sky-maze-runner-3-end.jpg` |
| 79 | Swim Dodge (`sky-swim-dodge`) | OK | none | tap centre | play, over 0, restarts 0 | `shots/sky-swim-dodge-1-title.jpg` `shots/sky-swim-dodge-2-mid.jpg` `shots/sky-swim-dodge-3-end.jpg` |

## Numbers per game

| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |
|---|--:|--:|---|---|---|--:|--:|--:|--:|---|
| clean-house | 10064 / 2192 | 5 | 60, 120.73 / 2133.87 | 3.8 > 4.2 | 281 > 284 | 0 | 28 | 12 | 4001 | - |
| godot-tidebreak | 3957 / 210 | 0 | 224, 18.37 / 28.37 | 8.9 > 8.9 | 33 > 23 | 1 | 3.6 | 97 | 4034 | - |
| godot-tidebreak-world-tour | 3853 / 269 | 0 | 233, 19.39 / 31.91 | 8.9 > 8.9 | 33 > 23 | 1 | 3.6 | 97 | 4000 | - |
| godot-heat-firm | 3285 / 240 | 2 | 130, 24.81 / 57.18 | 8.8 > 8.9 | 33 > 23 | 2 | 3.6 | 92 | 4000 | - |
| hole-grind | 5217 / 621 | 8 | 217, 30.15 / 274.63 | 6 > 6.4 | 221 > 232 | 1 | 2.2 | 17 | 3381 | - |
| sky-hole-eater | 2952 / 228 | 4 | 402, 18.03 / 41.9 | 5.1 > 5.5 | 26 > 26 | 1 | 6.2 | 17 | 2466 | - |
| cook-rush | 285 / 1873 | 0 | 42, 22.06 / 26.51 | 2.1 > 2.2 | 110 > 111 | 0 | 3.8 | 3 | 4001 | - |
| godot-city-builder | 3278 / 485 | 1 | 28, 157.86 / 293.71 | 9.7 > 9.7 | 33 > 23 | 2 | 3.6 | 95 | 4001 | - |
| summit-line | 312 / 1024 | 2 | 6, 65.88 / 65.88 | 9.6 > 9.6 | 328 > 339 | 1 | 13.2 | 3 | 4000 | - |
| long-way-home | 846 / 664 | 1 | 57, 46.84 / 70.11 | 7.9 > 8.2 | 156 > 157 | 1 | 5.5 | 6 | 4431 | - |
| godot-la-city | 0 / 0 | 0 | 0, - / - | n/a | - | 1 | 3.6 | 100 | 4005 | - |
| chili-firm | 467 / 733 | 1 | 294, 12.84 / 37.24 | 3 > 3.4 | 1190 > 940 | 1 | 0 | 16 | 4000 | - |
| sky-parking-puzzle | 288 / 1357 | 5 | 81, 8.96 / 325.52 | 1.9 > 2.1 | 24 > 24 | 1 | 3.8 | 12 | 4000 | - |
| sky-cut-rope | 164 / 336 | 1 | 145, 9.74 / 21.87 | 1.9 > 2.1 | 20 > 20 | 1 | 3.7 | 5 | 4000 | - |
| sky-traffic-run | 93 / 299 | 1 | 167, 7.82 / 33.06 | 1.9 > 2 | 21 > 21 | 1 | 3.7 | 6 | 4001 | 85 > 85 |
| sky-color-match | 168 / 168 | 1 | 198, 7.22 / 24.84 | 1.9 > 2 | 21 > 21 | 1 | 3.7 | 5 | 4013 | 0 > 0 |
| sky-slingshot | 110 / 238 | 1 | 221, 3.86 / 7.65 | 1.9 > 2 | 21 > 21 | 1 | 3.7 | 5 | 4001 | 0 > 0 |
| sky-spike-jump | 173 / 129 | 0 | 206, 3.77 / 15.43 | 1.9 > 2.1 | 21 > 21 | 1 | 3.7 | 5 | 4002 | 0 > 0 |
| sky-stack-tower | 113 / 187 | 1 | 218, 5.95 / 19.05 | 1.9 > 2 | 21 > 21 | 1 | 3.7 | 5 | 4000 | 3 > 3 |
| sky-slide-runner | 85 / 147 | 1 | 216, 2.96 / 8.48 | 1.9 > 2 | 21 > 21 | 1 | 3.8 | 7 | 4015 | 0 > 0 |
| tic-tac-toe | 107 / 122 | 0 | 0, - / - | 1.8 > 1.9 | 70 > 70 | 0 | 0 | 10 | 474 | - |
| survivor-wave | 678 / 240 | 5 | 40, 53.73 / 97.52 | 3.2 > 4 | 355 > 323 | 1 | 22.3 | 11 | 4001 | - |
| maths-kart | 1343 / 581 | 7 | 261, 44.76 / 228.12 | 5.9 > 6.4 | 141 > 148 | 2 | 4.9 | 28 | 3041 | - |
| game-arcade-7 | 75 / 227 | 6 | 259, 8.37 / 47.21 | 2.1 > 2.3 | 304 > 307 | 1 | 8.8 | 10 | 3325 | 0 > 0 |
| hub-whack-a-mole | 249 / 68 | 0 | 17, 11.25 / 11.25 | 1.9 > 2.1 | 181 > 152 | 1 | 4 | 10 | 898 | 0 > 0 |
| kingdom-defense | 959 / 337 | 2 | 55, 11.9 / 22.44 | 2.8 > 2.9 | 353 > 353 | 2 | 40.5 | 4 | 4000 | - |
| hub-isle-of-bells | 656 / 161 | 0 | 145, 15.7 / 34.88 | 2.2 > 2.3 | 158 > 158 | 1 | 10.6 | 7 | 4001 | - |
| snake-clash | 700 / 97 | 0 | 63, 14.94 / 58.67 | 2 > 2.2 | 77 > 79 | 1 | 4.5 | 4 | 4000 | 0 > 0 |
| field-station | 648 / 156 | 2 | 792, 4.97 / 14.52 | 1.9 > 2.2 | 207 > 152 | 1 | 15.5 | 16 | 1441 | - |
| hub-knife-hit | 585 / 208 | 1 | 107, 5.78 / 12.65 | 2.1 > 2.3 | 57 > 57 | 1 | 11 | 4 | 4015 | 2 > 2 |
| hub-tower-stack | 575 / 416 | 0 | 105, 1.19 / 4.52 | 1.9 > 2 | 57 > 57 | 1 | 10.2 | 3 | 4002 | - |
| hub-block-blast | 469 / 200 | 1 | 118, 2.66 / 6.17 | 2.1 > 2.4 | 154 > 177 | 1 | 2.1 | 7 | 1777 | 0 > 5 |
| hub-flappy-flight | 478 / 174 | 0 | 121, 4.78 / 8.9 | 1.9 > 2 | 61 > 61 | 1 | 4.5 | 3 | 3999 | 0 > 0 |
| hub-sudoku | 507 / 68 | 0 | 0, - / - | 1.8 > 2 | 162 > 162 | 1 | 8.9 | 10 | 1138 | - |
| hub-word-scramble | 465 / 176 | 1 | 0, - / - | 1.8 > 2 | 84 > 93 | 1 | 0 | 7 | 4040 | - |
| balloon-bust | 404 / 228 | 0 | 167, 6.2 / 15.63 | 1.9 > 2.1 | 15 > 15 | 1 | 4 | 4 | 4000 | - |
| deepcut-mine | 223 / 369 | 1 | 130, 5.86 / 21.99 | 1.9 > 2.1 | 110 > 111 | 0 | 4 | 8 | 4005 | - |
| hub-bubble-pop | 390 / 212 | 0 | 214, 1.9 / 12.21 | 1.8 > 2 | 60 > 124 | 2 | 3.4 | 5 | 4001 | 1 > 1 |
| hub-connect-four | 420 / 137 | 3 | 59, 0.84 / 1.1 | 1.8 > 2.1 | 99 > 103 | 2 | 0 | 11 | 1145 | - |
| hub-dino-dash | 378 / 201 | 1 | 552, 3.67 / 11.93 | 2 > 2.2 | 57 > 57 | 2 | 1.3 | 9 | 3017 | 13 > 13 |
| hub-memory-match | 382 / 111 | 0 | 0, - / - | 1.8 > 1.9 | 117 > 117 | 1 | 0 | 14 | 1111 | - |
| hub-tic-tac-toe | 414 / 165 | 0 | 2, 0.14 / 0.14 | 1.7 > 1.5 | 62 > 62 | 1 | 0 | 11 | 667 | 0 > 0 |
| market-merge | 447 / 272 | 2 | 166, 7.28 / 21.43 | 1.9 > 2.1 | 92 > 92 | 1 | 4 | 7 | 4001 | - |
| quiz-tower | 358 / 59 | 0 | 5, 45.27 / 45.27 | n/a | 39 > 40 | 0 | - | - | 477 | - |
| volt-dash | 334 / 390 | 0 | 67, 5.21 / 10 | 2.1 > 2.3 | 84 > 86 | 1 | 4 | 3 | 4009 | 0 > 0 |
| word-dungeon | 357 / 83 | 0 | 186, 5.78 / 23.07 | 1.5 > 1.7 | 46 > 40 | 1 | 3.2 | 6 | 3075 | 1 > 1 |
| high-nest | 333 / 222 | 0 | 156, 2.92 / 6.65 | 1.9 > 2 | 74 > 89 | 1 | 4 | 3 | 4000 | 0 > 0 |
| hub-farm-harvest | 182 / 286 | 2 | 810, 0.82 / 5.55 | 1.8 > 2.1 | 174 > 212 | 1 | 0 | 16 | 1229 | - |
| hub-math-blast | 101 / 333 | 10 | 227, 2.46 / 9.25 | 1.9 > 2 | 91 > 91 | 1 | 12.3 | 13 | 4001 | - |
| hub-math-snake | 188 / 270 | 1 | 150, 5.73 / 20.38 | 1.9 > 2.1 | 90 > 91 | 1 | 13.7 | 6 | 4001 | 0 > 0 |
| hub-merge-blocks | 338 / 150 | 0 | 0, - / - | 1.8 > 2 | 104 > 105 | 1 | 0 | 11 | 1101 | - |
| rap-academy | 266 / 228 | 3 | 740, 4.72 / 13.44 | 2.7 > 3.2 | 285 > 59 | 0 | 5.7 | 21 | 1706 | - |
| sky-balance-tile | 289 / 127 | 0 | 191, 5.89 / 30.31 | 1.9 > 2 | 21 > 21 | 1 | 3.7 | 5 | 4002 | 55 > 3 |
| sky-breakout | 132 / 343 | 0 | 141, 7.87 / 12.68 | 1.9 > 2.1 | 21 > 21 | 1 | 3.8 | 4 | 4000 | - |
| sky-sniper-shot | 90 / 338 | 0 | 174, 9.24 / 32.52 | 1.9 > 2 | 21 > 21 | 1 | 4 | 6 | 4001 | 0 > 0 |
| sky-turret-defense | 211 / 324 | 1 | 166, 12.68 / 55.07 | 2 > 2.1 | 21 > 21 | 1 | 3.8 | 6 | 4000 | - |
| surviv-royale | 280 / 220 | 4 | 192, 7.28 / 110.89 | 2 > 2.2 | 143 > 146 | 0 | 4 | 8 | 1934 | - |
| hub-game-2048 | 240 / 44 | 0 | 18, 0.37 / 0.37 | 1.8 > 2 | 85 > 93 | 1 | 0 | 9 | 779 | - |
| hub-math-battle | 168 / 170 | 0 | 0, - / - | 1.8 > 1.9 | 134 > 135 | 1 | 0 | 9 | 3124 | 0 > 0 |
| hub-minesweeper | 231 / 86 | 0 | 0, - / - | 1.8 > 2 | 145 > 146 | 1 | 0 | 12 | 1170 | 0 > 0 |
| hub-spell-and-say | 76 / 200 | 0 | 0, - / - | 1.8 > 1.9 | 127 > 131 | 1 | 0 | 4 | 3754 | - |
| sky-grow-shrink | 140 / 235 | 0 | 180, 4.77 / 42.95 | 1.9 > 2 | 21 > 21 | 1 | 3.7 | 6 | 4000 | - |
| sky-key-unlock | 73 / 201 | 1 | 97, 7.49 / 127.25 | 1.9 > 2 | 20 > 20 | 1 | 3.7 | 5 | 4040 | - |
| sky-match-swipe | 65 / 181 | 1 | 88, 4.14 / 177.15 | 1.9 > 2 | 21 > 21 | 1 | 3.7 | 4 | 4002 | - |
| sky-rope-swing | 87 / 225 | 1 | 158, 5.07 / 66.21 | 1.9 > 2 | 21 > 21 | 1 | 3.7 | 6 | 1580 | 0 > 0 |
| sky-snake | 135 / 223 | 2 | 331, 4.25 / 15.22 | 1.9 > 2.1 | 21 > 21 | 1 | 5.2 | 8 | 3077 | 0 > 0 |
| snap-jigsaw | 100 / 182 | 3 | 34, 13.44 / 142.54 | 2 > 2.1 | 71 > 71 | 1 | 5.2 | 4 | 4000 | - |
| claire-pip | 119 / 134 | 0 | 109, 3.64 / 4.97 | 2 > 2.2 | 493 > 575 | 1 | 0 | 11 | 2553 | - |
| hub-farm-idle | 110 / 134 | 0 | 1375, 0.94 / 4.91 | 1.8 > 2 | 164 > 226 | 0 | 0 | 11 | 975 | - |
| hub-hangman | 149 / 74 | 0 | 0, - / - | 1.8 > 1.9 | 119 > 125 | 0 | 4.8 | 10 | 924 | - |
| hub-idle-miner | 113 / 111 | 0 | 1895, 1.36 / 3.86 | 1.8 > 2 | 86 > 130 | 0 | 0 | 22 | 844 | - |
| hub-math-run | 92 / 132 | 2 | 188, 12.13 / 62.26 | 1.9 > 2 | 86 > 87 | 1 | 11.3 | 7 | 3189 | - |
| hub-missing-letter | 91 / 78 | 0 | 0, - / - | 1.8 > 2 | 101 > 112 | 0 | 0 | 15 | 1244 | - |
| hub-rhyme-time | 105 / 93 | 0 | 1108, 0.78 / 3.05 | 1.9 > 2.1 | 94 > 88 | 1 | 0 | 15 | 1219 | - |
| hub-snake | 130 / 95 | 0 | 318, 1.47 / 2.45 | 1.9 > 2 | 69 > 69 | 1 | 4 | 5 | 2520 | 0 > 0 |
| sky-flappy-bird | 113 / 115 | 0 | 117, 11.72 / 23.38 | 1.9 > 2.2 | 21 > 21 | 1 | 4.6 | 6 | 2096 | 0 > 0 |
| sky-lane-switcher | 43 / 74 | 0 | 127, 3.14 / 12.62 | 1.9 > 2.1 | 21 > 21 | 1 | 3.7 | 5 | 4000 | 0 > 0 |
| sky-maze-runner | 95 / 92 | 0 | 184, 3.61 / 10.33 | 1.9 > 2 | 24 > 24 | 1 | 3.7 | 6 | 4005 | - |
| sky-swim-dodge | 94 / 142 | 1 | 118, 7.74 / 19.76 | 1.9 > 2 | 21 > 21 | 1 | 3.8 | 4 | 4001 | - |

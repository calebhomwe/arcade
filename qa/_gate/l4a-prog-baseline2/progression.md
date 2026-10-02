# Progression check

Generated 2026-10-02T19:59:27.945Z. 15 games. **P0 0, P1 0, P2 1, P3 14.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Chess (`hub-chess`) | **P2** | save data | starts from saved state (title shows it) | cosmetics(S) | goals | levels, stars, achievements, unlocks |
| 2 | Block Blast (`hub-block-blast`) | **P3** | levels, cosmetics | starts from saved state | levels(SD), stars(D), goals(D), daily(D), cosmetics(S) | unlocks, achievements | unlocks |
| 3 | Connect Four (`hub-connect-four`) | **P3** | best score, levels, stars, currency, unlocks, cosmetics | starts from saved state | levels(S), unlocks(SD), stars(SD), goals(D), cosmetics(SD) | daily | achievements |
| 4 | Flappy Flight (`hub-flappy-flight`) | **P3** | best score, levels, stars, currency, unlocks, cosmetics | starts from saved state (title shows it) | levels(S), unlocks(S), stars(S), goals(D), cosmetics(SD) | upgrades, daily | daily, achievements |
| 5 | Snake (`hub-snake`) | **P3** | best score, levels, stars, currency, unlocks, cosmetics | starts from saved state (title shows it) | levels(S), unlocks(S), stars(SD), goals(D), cosmetics(SD) | upgrades, daily | upgrades, achievements, daily |
| 6 | Tic Tac Toe (`hub-tic-tac-toe`) | **P3** | levels, cosmetics | starts from saved state | levels(SD), unlocks(D), stars(D), goals(D), cosmetics(S) | daily | achievements |
| 7 | 2048 (`hub-game-2048`) | **P3** | best score, levels, cosmetics | starts from saved state | levels(SD), unlocks(D), stars(D), goals(D), daily(D), cosmetics(S) | - | - |
| 8 | Minesweeper (`hub-minesweeper`) | **P3** | levels, cosmetics | starts from saved state | levels(SD), unlocks(D), stars(D), goals(D), daily(D), cosmetics(S) | - | - |
| 9 | Brick Breaker (`hub-brick-breaker`) | **P3** | best score, levels, stars, currency, unlocks, goals, achievements, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(S), stars(SD), goals(SD), achievements(S), daily(S), cosmetics(SD) | - | upgrades |
| 10 | Bubble Pop (`hub-bubble-pop`) | **P3** | best score, levels, stars, unlocks, goals, achievements, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(S), stars(S), goals(S), achievements(S), daily(S), cosmetics(S) | - | - |
| 11 | Dino Dash (`hub-dino-dash`) | **P3** | best score, levels, stars, currency, unlocks, goals, achievements, daily, cosmetics | starts from saved state (title shows it) | levels(S), unlocks(S), stars(SD), goals(SD), achievements(S), daily(S), cosmetics(SD) | upgrades | - |
| 12 | Memory Match (`hub-memory-match`) | **P3** | best score, levels, stars, unlocks, goals, achievements, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(S), stars(S), goals(S), achievements(SD), daily(S), cosmetics(S) | - | - |
| 13 | Simon Says (`hub-simon-says`) | **P3** | best score, levels, stars, unlocks, goals, achievements, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(S), stars(S), goals(S), achievements(SD), daily(S), cosmetics(S) | - | - |
| 14 | Whack-a-Mole (`hub-whack-a-mole`) | **P3** | best score, levels, stars, unlocks, goals, achievements, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(S), stars(S), goals(S), achievements(S), daily(S), cosmetics(S) | - | - |
| 15 | Word Scramble (`hub-word-scramble`) | **P3** | best score, levels, stars, unlocks, goals, achievements, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(S), stars(S), goals(S), achievements(S), daily(S), cosmetics(S) | - | - |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Chess (`hub-chess`): P2

- Why: progress persists (save-blob) with cosmetics
- localStorage keys: 6; written this session: chessStart; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): chessj__stats, chessMetaW
- Session 1: start #ssPlay; reached play: true; game overs 0; no score reported
- Title, session 1: "♟ CHESS 3 min · Medium bot OPPONENT 🙂 Easy 🤖 Medium 😈 Hard 👥 2 players TIME CONTROL ∞ Unlimited 1 min 3 min 5 min 10 min BOARD 🎨 Classi" | session 2: "♟ CHESS 3 min · Easy bot OPPONENT 🙂 Easy 🤖 Medium 😈 Hard 👥 2 players TIME CONTROL ∞ Unlimited 1 min 3 min 5 min 10 min BOARD 🎨 Classic "

### Block Blast (`hub-block-blast`): P3

- Why: progress persists (levels, cosmetics); systems seen: levels, stars, goals, daily, cosmetics; sinks cosmetics fed by levels/stars/goals/daily
- localStorage keys: 2; written this session: blockblast_tut, pz_blockblast; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): blockblast_best, blockblast_clears, blockblast_adv, pz_blockblast
- Session 1: start #mCls; reached play: true; game overs 0; score 0 to 0 (max 9)
- Title, session 1: "‹ Hub Block Blast Goals SCORE 0 Best 0 Undo 3 Swap 2 Hint Menu B L O C K B L A S T Drag blocks onto the board. Fill a row or a column to bla" | session 2: "‹ Hub Block Blast Goals SCORE 0 Best 0 Undo 3 Swap 2 Hint Menu B L O C K B L A S T Drag blocks onto the board. Fill a row or a column to bla"

### Connect Four (`hub-connect-four`): P3

- Why: progress persists (levels, stars, currency, unlocks, cosmetics); systems seen: levels, unlocks, stars, goals, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/currency
- localStorage keys: 6; written this session: flappyFeathers, hm-flappy, flappyTut, flappyMute, c4Tut, pz_c4; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): c4Best, c4Wins, c4_ladder, pz_c4
- Session 1: start #mPlay; reached play: true; game overs 4; score 0 to 0 (max 0)
- Title, session 1: "‹ Hub Connect Four Goals You Your move! Mousey Undo Hint 2 Menu CONNECT FOUR Line up four discs. Beat six critters, earn stars, unlock new s" | session 2: "‹ Hub Connect Four Goals You Your move! Mousey Undo Hint 2 Menu CONNECT FOUR Line up four discs. Beat six critters, earn stars, unlock new s"

### Flappy Flight (`hub-flappy-flight`): P3

- Why: progress persists (levels, stars, currency, unlocks, cosmetics); systems seen: levels, unlocks, stars, goals, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/currency
- localStorage keys: 4; written this session: flappyFeathers, flappyTut, flappyMute, hm-flappy; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): flappyBest, flappyPipes, flappyFeathers, hm-flappy, flappyGale
- Session 1: start #playBtn; reached play: true; game overs 8; score 0 to 0 (max 0)
- Title, session 1: "🔊 Flappy Flight FLY THE GOLDEN VALLEY Best 0 · Chick · 0 pipes flown 🪶 0 🎨 Skins 📋 Goals 4 🔥 0/5 Classic endless Sprint 20 pipes Gale m" | session 2: "🔇 Flappy Flight FLY THE GOLDEN VALLEY Best 0 · Chick · 0 pipes flown 🪶 14 🎨 Skins 📋 Goals 4 🔥 1/5 Classic endless Sprint 20 pipes Gale "

### Snake (`hub-snake`): P3

- Why: progress persists (levels, stars, currency, unlocks, cosmetics); systems seen: levels, unlocks, stars, goals, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/currency
- localStorage keys: 3; written this session: snakeTut, gamesMuted, hm-snake; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): snakeBest, snakeTotal, hm-snake
- Session 1: start #playBtn; reached play: true; game overs 6; score 0 to 0 (max 0)
- Title, session 1: "🔊 Snake THE GARDEN GAME Best 0 · 0 fruits eaten in total 🍎 0 🎨 Skins 📋 Goals 4 🔥 0/5 Garden hedge is deadly Portals wrap around Rocks g" | session 2: "🔊 Snake THE GARDEN GAME Best 0 · 0 fruits eaten in total 🍎 11 🎨 Skins 📋 Goals 4 🔥 1/5 Garden hedge is deadly Portals wrap around Rocks "

### Tic Tac Toe (`hub-tic-tac-toe`): P3

- Why: progress persists (levels, cosmetics); systems seen: levels, unlocks, stars, goals, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/currency
- localStorage keys: 2; written this session: tttTut, pz_ttt; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): tttBest, tttRecW, ttt_ladder, pz_ttt
- Session 1: start #mPlay; reached play: true; game overs 2; score 0 to 0 (max 0)
- Title, session 1: "‹ Hub Tic Tac Toe Goals You Your move! Mousey Undo Hint Menu TIC TAC TOE Beat six critters on the ladder. Win rounds, earn stars, unlock new" | session 2: "‹ Hub Tic Tac Toe Goals You Your move! Mousey Undo Hint Menu TIC TAC TOE Beat six critters on the ladder. Win rounds, earn stars, unlock new"

### 2048 (`hub-game-2048`): P3

- Why: progress persists (levels, cosmetics); systems seen: levels, unlocks, stars, goals, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/daily/currency
- localStorage keys: 4; written this session: tut2048, bestTile2048, mode2048, pz_g2048; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): best2048, bestTile2048, g2048_trials, pz_g2048
- Session 1: start #mClassic; reached play: true; game overs 0; score 0 to 28 (max 28)
- Title, session 1: "‹ Hub 2048 Goals SCORE 0 BEST 0 Undo 5 Hint Hammer 0 Menu Swipe anywhere to slide the tiles 2 0 4 8 Slide the tiles. Match the numbers. Make" | session 2: "‹ Hub 2048 Goals SCORE 0 BEST 0 Undo 5 Hint Hammer 0 Menu Swipe anywhere to slide the tiles 2 0 4 8 Slide the tiles. Match the numbers. Make"

### Minesweeper (`hub-minesweeper`): P3

- Why: progress persists (levels, cosmetics); systems seen: levels, unlocks, stars, goals, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/daily
- localStorage keys: 2; written this session: minesTut, pz_mines; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): minesBest, minesWins, mines_exp, pz_mines
- Session 1: start #mClassic; reached play: true; game overs 2; score 0 to 0 (max 0)
- Title, session 1: "‹ Hub Minesweeper Goals 10 0:00 Undo 3 Hint 3 Dig Menu MINESWEEPER Dig safe. Numbers count the bombs next to them. Expeditions 18 boards · 3" | session 2: "‹ Hub Minesweeper Goals 10 0:00 Undo 3 Hint 3 Dig Menu MINESWEEPER Dig safe. Numbers count the bombs next to them. Expeditions 18 boards · 3"

### Brick Breaker (`hub-brick-breaker`): P3

- Why: progress persists (levels, stars, currency, unlocks, goals, achievements, daily, cosmetics); systems seen: levels, unlocks, stars, goals, achievements, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/achievements/daily/currency
- localStorage keys: 5; written this session: brick-tut, brickMute, brickBest, hm-brick-prog, hm-brick; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): brickBest, brick-stars, hm-brick
- Session 1: start #playBtn; reached play: true; game overs 1; score 30 to 30 (max 30)
- Title, session 1: "🔊 Brick Breaker 20 LEVELS · 4 WORLDS · 3 STARS EACH ★ 0 / 60 stars · Best level 0 💎 0 🎨 Skins 📋 Goals 4 🔥 0/5 PLAY Choose level ← Hub" | session 2: "🔊 Brick Breaker 20 LEVELS · 4 WORLDS · 3 STARS EACH ★ 0 / 60 stars · Best level 0 💎 7 🎨 Skins 📋 Goals 4 🔥 1/5 PLAY Choose level ← Hub"

### Bubble Pop (`hub-bubble-pop`): P3

- Why: progress persists (levels, stars, unlocks, goals, achievements, daily, cosmetics); systems seen: levels, unlocks, stars, goals, achievements, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/achievements/daily
- localStorage keys: 2; written this session: bubble_kk, bubble_kk_prog; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): bubbleBest, bubblePops, bubble_kk
- Session 1: start declared start button not tappable -> tap centre; reached play: true; game overs 0; score 0 to 89 (max 89)
- Title, session 1: "← Bubble Pop Set the animals free! ▶ Play Levels Aquarium ! Help 0 M T W T F S S Today: win 3 levels 0/3" | session 2: "← Bubble Pop Set the animals free! ▶ Play Levels Aquarium ! Help 1 M T W T F S Today: win 3 levels 0/3"

### Dino Dash (`hub-dino-dash`): P3

- Why: progress persists (levels, stars, currency, unlocks, goals, achievements, daily, cosmetics); systems seen: levels, unlocks, stars, goals, achievements, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/achievements/daily/currency
- localStorage keys: 8; written this session: dinoMute, dinoTut, dinoBest, dinoYards, dinoRuns, dinoBones, hm-dino, hm-dino-prog; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): dinoBest, dinoYards, dinoBones, hm-dino, dinoRuns, dinoMedals
- Session 1: start #playBtn; reached play: true; game overs 6; score 13 to 13 (max 20)
- Title, session 1: "🔊 Dino Dash RUN THE GOLDEN CANYON Best 0 m · 0 m run in total · 0 runs 🦴 0 🎨 Skins 📋 Goals 4 🔥 0/5 PLAY ← Hub" | session 2: "🔊 Dino Dash RUN THE GOLDEN CANYON Best 20 m · 98 m run in total · 7 runs 🦴 12 🎨 Skins 📋 Goals 4 🔥 1/5 PLAY ← Hub"

### Memory Match (`hub-memory-match`): P3

- Why: progress persists (levels, stars, unlocks, goals, achievements, daily, cosmetics); systems seen: levels, unlocks, stars, goals, achievements, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/achievements/daily
- localStorage keys: 4; written this session: memBest, memStars, memory_kk, memory_kk_prog; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): memBest, memStars, memory_kk
- Session 1: start #playBtn; reached play: true; game overs 2; score 0 to 0 (max 230)
- Title, session 1: "← Memory Match Find the twins! ▶ Play Levels Album ! Help 0 M T W T F S S Today: win 3 levels 0/3" | session 2: "← Memory Match Farm - level 3 ▶ Level 3 Levels Album ! Help 1 M T W T F S Today: win 3 levels 2/3"

### Simon Says (`hub-simon-says`): P3

- Why: progress persists (levels, stars, unlocks, goals, achievements, daily, cosmetics); systems seen: levels, unlocks, stars, goals, achievements, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/achievements/daily
- localStorage keys: 2; written this session: simon_kk, simon_kk_prog; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): simonBest, simonScore, simon_kk
- Session 1: start #playBtn; reached play: true; game overs 1; score 0 to 10 (max 10)
- Title, session 1: "← Simon Says Copy the band! ▶ Play Levels Stickers 1 Jam Help 0 M T W T F S S Today: win 3 levels 0/3" | session 2: "← Simon Says Copy the band! ▶ Play Levels Stickers 1 Jam Help 1 M T W T F S Today: win 3 levels 0/3"

### Whack-a-Mole (`hub-whack-a-mole`): P3

- Why: progress persists (levels, stars, unlocks, goals, achievements, daily, cosmetics); systems seen: levels, unlocks, stars, goals, achievements, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/achievements/daily
- localStorage keys: 2; written this session: whack_kk, whack_kk_prog; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): whackBest, whack_kk
- Session 1: start #playBtn; reached play: true; game overs 0; score 0 to 81 (max 81)
- Title, session 1: "← Whack-a-Mole Tap the moles! ▶ Play Levels Prizes 1 Help 0 M T W T F S S Today: win 3 levels 0/3" | session 2: "← Whack-a-Mole Tap the moles! ▶ Play Levels Prizes 1 Help 1 M T W T F S Today: win 3 levels 0/3"

### Word Scramble (`hub-word-scramble`): P3

- Why: progress persists (levels, stars, unlocks, goals, achievements, daily, cosmetics); systems seen: levels, unlocks, stars, goals, achievements, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/achievements/daily
- localStorage keys: 3; written this session: ws_progress, ws_kk, ws_kk_prog; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): ws_best, ws_kk, ws_progress
- Session 1: start declared start button not tappable -> Play/Start button; reached play: true; game overs 0; score 0 to 10 (max 10)
- Title, session 1: "← Word Scramble Spell the picture! C A T ▶ Play Levels My words ! Grown-ups Help 0 M T W T F S S Today: win 3 levels 0/3" | session 2: "← Word Scramble Spell the picture! C A T ▶ Play Levels My words ! Grown-ups Help 1 M T W T F S Today: win 3 levels 0/3"

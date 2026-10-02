# Progression check

Generated 2026-10-02T19:38:46.590Z. 4 games. **P0 0, P1 0, P2 0, P3 4.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Color Switch (`hub-color-switch`) | **P3** | best score, levels, stars, currency, unlocks, achievements, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(S), stars(SD), goals(D), achievements(S), daily(SD), cosmetics(SD) | - | - |
| 2 | Merge Blocks (`hub-merge-blocks`) | **P3** | best score, levels, stars, currency, unlocks, achievements, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(S), stars(SD), goals(D), achievements(S), daily(SD), cosmetics(SD) | - | - |
| 3 | Sudoku (`hub-sudoku`) | **P3** | best score, levels, stars, currency, unlocks, achievements, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(S), stars(SD), goals(D), achievements(S), daily(SD), cosmetics(SD) | - | - |
| 4 | Tower Stack (`hub-tower-stack`) | **P3** | best score, levels, stars, currency, unlocks, achievements, daily, cosmetics, save data | starts from saved state (title shows it) | levels(SD), unlocks(S), stars(SD), goals(D), achievements(S), daily(SD), cosmetics(SD) | - | - |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Color Switch (`hub-color-switch`): P3

- Why: progress persists (levels, stars, currency, unlocks, achievements, daily, cosmetics); systems seen: levels, unlocks, stars, goals, achievements, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/achievements/daily/currency
- localStorage keys: 7; written this session: csPass, csTut, csRuns, csNear, cs_prog_v1, colorBest, gamesMuted; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): colorBest
- Session 1: start #playBtn + tap on game; reached play: true; game overs 5; score 1 to 3 (max 3)
- Title, session 1: "← Hub 🔊 0 BEST 0 Level 1 · 🪙 0 coins · ★ 0 Color Switch Tap or Space to spin. Pass through the color that matches your ball — it changes a" | session 2: "← Hub 🔇 0 BEST 3 Level 1 · 🪙 44 coins · ★ 2 Color Switch Tap or Space to spin. Pass through the color that matches your ball — it changes "

### Merge Blocks (`hub-merge-blocks`): P3

- Why: progress persists (levels, stars, currency, unlocks, achievements, daily, cosmetics); systems seen: levels, unlocks, stars, goals, achievements, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/achievements/daily/currency
- localStorage keys: 5; written this session: merge_prog_v1, mergeXp, mergeTut, mergeBest, gamesMuted; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): mergeBest, mergeXp
- Session 1: start #playBtn; reached play: true; game overs 0; no score reported
- Title, session 1: "← Hub 🧩 Merge Blocks Score: 0 Best: 0 🏅 0 💎 0/3 🎖 Lv 1 🪙 0 coins 🔥 0 Next: 4 ↩ 💡 🔊 🧩 Merge Blocks Tap a column to drop a block. Equ" | session 2: "← Hub 🧩 Merge Blocks Score: 0 Best: 284 🏅 0 💎 0/3 🎖 Lv 1 🪙 26 coins 🔥 0 Next: 4 ↩ 💡 🔇 🧩 Merge Blocks Tap a column to drop a block. "

### Sudoku (`hub-sudoku`): P3

- Why: progress persists (levels, stars, currency, unlocks, achievements, daily, cosmetics); systems seen: levels, unlocks, stars, goals, achievements, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/achievements/daily/currency
- localStorage keys: 4; written this session: sudoPick, sudoTut, sudokuMuted, sudo_prog_v1; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sudoBest_easy, sudoBest_medium, sudoBest_hard, sudo_solved
- Session 1: start #playBtn; reached play: true; game overs 0; no score reported
- Title, session 1: "← Hub 🔊 Sudoku ❌ 0 ⏱ 0:00 Easy LV 1 🪙 0 1 2 3 4 5 6 7 8 9 ⌫ ✎ ↶ 💡 New Sudoku Fill the grid so every row, column and 3×3 box holds 1 to 9 " | session 2: "← Hub 🔇 Sudoku ❌ 0 ⏱ 0:00 Easy LV 1 🪙 0 1 2 3 4 5 6 7 8 9 ⌫ ✎ ↶ 💡 New Sudoku Fill the grid so every row, column and 3×3 box holds 1 to 9 "

### Tower Stack (`hub-tower-stack`): P3

- Why: progress persists (levels, stars, currency, unlocks, achievements, daily, cosmetics, save-blob); systems seen: levels, unlocks, stars, goals, achievements, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/achievements/daily/currency
- localStorage keys: 6; written this session: towerGhost, tower_prog_v1, towerTut, towerGhostLen, towerMuted, towerBest; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): towerBest, towerGhost
- Session 1: start #playBtn; reached play: true; game overs 11; score 3 to 2 (max 4)
- Title, session 1: "← Hub 🔊 0 BEST 0 Level 1 · 🪙 0 coins · ★ 0 Tower Stack Tap to drop the block. Stack as high as you can! Land it dead-center for a PERFECT " | session 2: "← Hub 🔇 0 BEST 4 Level 2 · 🪙 46 coins · ★ 3 Tower Stack Tap to drop the block. Stack as high as you can! Land it dead-center for a PERFECT"

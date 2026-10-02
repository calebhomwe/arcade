# Progression check

Generated 2026-10-01T19:39:42.749Z. 1 games. **P0 0, P1 0, P2 0, P3 1.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Sudoku (`hub-sudoku`) | **P3** | best score, levels, stars, currency, unlocks, achievements, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(S), stars(SD), goals(D), achievements(S), daily(SD), cosmetics(SD) | - | - |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Sudoku (`hub-sudoku`): P3

- Why: progress persists (levels, stars, currency, unlocks, achievements, daily, cosmetics); systems seen: levels, unlocks, stars, goals, achievements, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/achievements/daily/currency
- localStorage keys: 3; written this session: sudoTut, sudokuMuted, sudo_prog_v1; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sudoBest_easy, sudoBest_medium, sudoBest_hard, sudo_solved
- Session 1: start #playBtn; reached play: true; game overs 0; no score reported
- Title, session 1: "← Hub 🔊 Sudoku ❌ 0 ⏱ 0:00 Easy LV 1 🪙 0 1 2 3 4 5 6 7 8 9 ⌫ ✎ ↶ 💡 New Sudoku Fill the grid so every row, column and 3×3 box holds 1 to 9 " | session 2: "← Hub 🔇 Sudoku ❌ 0 ⏱ 0:00 Easy LV 1 🪙 0 1 2 3 4 5 6 7 8 9 ⌫ ✎ ↶ 💡 New Sudoku Fill the grid so every row, column and 3×3 box holds 1 to 9 "

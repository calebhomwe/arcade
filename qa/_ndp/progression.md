# Progression check

Generated 2026-10-02T18:57:09.788Z. 1 games. **P0 0, P1 0, P2 0, P3 1.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Neon Dash (`neon-dash`) | **P3** | best score, levels, stars, currency, unlocks, goals, daily, cosmetics, save data | starts from saved state (title shows it) | levels(SD), unlocks(S), stars(SD), goals(SD), daily(S), cosmetics(S) | - | upgrades, achievements |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Neon Dash (`neon-dash`): P3

- Why: progress persists (levels, stars, currency, unlocks, goals, daily, cosmetics, save-blob); systems seen: levels, unlocks, stars, goals, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/daily/currency
- localStorage keys: 4; written this session: neonDashTut, neonDashBest, neonDashTop, neonDashProg; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): neonDashBest, neonDashBestEasy, neonDashBestHard, neonDashTop
- Session 1: start #play-btn; reached play: true; game overs 1; score 668 to 668 (max 668)
- Title, session 1: "SCORE 0 COINS 0 COMBO x1 DIST 0m LVL 1 🔊 NEON DASH Dodge · Slide · Collect ▶ START EASY NORMAL HARD MAGNET pulls coins SHIELD blocks a hit " | session 2: "SCORE 0 COINS 0 COMBO x1 DIST 0m LVL 1 🔇 NEON DASH Dodge · Slide · Collect ▶ START EASY NORMAL HARD MAGNET pulls coins SHIELD blocks a hit "

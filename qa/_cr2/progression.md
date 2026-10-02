# Progression check

Generated 2026-10-02T19:09:47.723Z. 1 games. **P0 0, P1 0, P2 0, P3 1.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Critter Rush 2D (`critter-rush-2d`) | **P3** | levels, stars, currency, unlocks, daily | starts from saved state | levels(SD), unlocks(S), stars(SD), goals(D), daily(S) | achievements | cosmetics, achievements |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Critter Rush 2D (`critter-rush-2d`): P3

- Why: progress persists (levels, stars, currency, unlocks, daily); systems seen: levels, unlocks, stars, goals, daily; sinks unlocks fed by levels/stars/goals/daily/currency
- localStorage keys: 4; written this session: critterRush2dMuted, critterRush2dDiff, critterRush2dTut, critterRush2dProg; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): critterRush2dBest, critterRush2dProg
- Session 1: start tap centre + EASY + EASY + EASY + tap on game + KEY Enter; reached play: true; game overs 0; no score reported
- Title, session 1: "CRITTER RUSH CLASSIC FUN RUN RACING ACTION LVL 1 ★ 0 · 0 COINS TODAY'S GOAL: finish a race in the top 2 for a ★ + 50 coins Fox All-rounder —" | session 2: "CRITTER RUSH CLASSIC FUN RUN RACING ACTION LVL 1 ★ 0 · 0 COINS TODAY'S GOAL: finish a race in the top 2 for a ★ + 50 coins Fox All-rounder —"

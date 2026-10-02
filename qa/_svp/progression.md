# Progression check

Generated 2026-10-02T18:59:16.727Z. 1 games. **P0 0, P1 0, P2 0, P3 1.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Surviv Royale (`surviv-royale`) | **P3** | best score, levels, stars, goals, daily | starts from saved state (title shows it) | levels(SD), unlocks(S), stars(SD), goals(SD), daily(SD), cosmetics(SD) | upgrades | upgrades, achievements |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Surviv Royale (`surviv-royale`): P3

- Why: progress persists (levels, stars, goals, daily); systems seen: levels, unlocks, stars, goals, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/daily/currency
- localStorage keys: 4; written this session: surviv_meta_v1, surviv_tut, surviv_career_v1; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): surviv_meta_v1, hm-surviv
- Session 1: start #btn-play; reached play: true; game overs 0; no score reported
- Title, session 1: "SURVIV ROYALE 16 drop in. 1 walks out. Left thumb moves, right thumb aims and fires. 0 WINS 0 KILLS 0 MATCHES - BEST PLACE RANK 1 0 XP · 0★ " | session 2: "SURVIV ROYALE 16 drop in. 1 walks out. Left thumb moves, right thumb aims and fires. 0 WINS 0 KILLS 1 MATCHES - BEST PLACE RANK 1 0 XP · 0★ "

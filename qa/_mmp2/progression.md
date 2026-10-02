# Progression check

Generated 2026-10-02T08:25:01.537Z. 1 games. **P0 0, P1 0, P2 0, P3 1.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Market Merge (`market-merge`) | **P3** | levels, stars, currency, unlocks, goals, daily, cosmetics | starts from saved state | levels(SD), unlocks(S), stars(SD), goals(SD), daily(SD), cosmetics(SD) | - | - |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Market Merge (`market-merge`): P3

- Why: progress persists (levels, stars, currency, unlocks, goals, daily, cosmetics); systems seen: levels, unlocks, stars, goals, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/daily/currency
- localStorage keys: 2; written this session: mm_tut, mm_car; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): mm_rec, mm_daily
- Session 1: start #play; reached play: true; game overs 0; no score reported
- Title, session 1: "HOLLOW & SONS · WHOLESALE MARKET MERGE Sort the delivery into one wooden crate. Two of a kind squash together into the next size up — chain " | session 2: "HOLLOW & SONS · WHOLESALE MARKET MERGE Sort the delivery into one wooden crate. Two of a kind squash together into the next size up — chain "

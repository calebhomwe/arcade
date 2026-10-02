# Progression check

Generated 2026-10-02T08:01:40.225Z. 2 games. **P0 0, P1 0, P2 0, P3 2.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Bridge Rush (`bridge-rush`) | **P3** | best score, levels, stars, currency, unlocks, goals, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(S), stars(S), goals(SD), daily(SD), cosmetics(S) | upgrades | achievements |
| 2 | Crowd Clash (`crowd-clash`) | **P3** | best score, levels, stars, currency, unlocks, goals, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(S), stars(S), goals(SD), daily(SD), cosmetics(S) | upgrades | achievements |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Bridge Rush (`bridge-rush`): P3

- Why: progress persists (levels, stars, currency, unlocks, goals, daily, cosmetics); systems seen: levels, unlocks, stars, goals, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/daily/currency
- localStorage keys: 4; written this session: br_rec, br_hint, br_snd, bridge-rush-prog-v1; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): bridge-rush-prog-v1, br_rec
- Session 1: start #play; reached play: true; game overs 1; score 0 to 141 (max 141)
- Title, session 1: "0 Bridge Rush RACES CLASSIC RACE 1 BEST 0 RACE 1 WORLD 1 · HARBOUR WORKS Reach the flag (220 m) Finish ahead of the rival Win by 14 m or mor" | session 2: "3 Bridge Rush RACES CLASSIC RACE 1 BEST 0 RACE 1 WORLD 1 · HARBOUR WORKS Reach the flag (220 m) Finish ahead of the rival Win by 14 m or mor"

### Crowd Clash (`crowd-clash`): P3

- Why: progress persists (levels, stars, currency, unlocks, goals, daily, cosmetics); systems seen: levels, unlocks, stars, goals, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/daily/currency
- localStorage keys: 4; written this session: cc_hint, cc_snd, cc_rec, crowd-clash-prog-v1; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): crowd-clash-prog-v1, cc_rec
- Session 1: start #play; reached play: true; game overs 2; score 0 to 630 (max 630)
- Title, session 1: "0 Crowd Clash LEVELS MARATHON LEVEL 1 BEST 0 LEVEL 1 WORLD 1 · GOLDEN MEADOW Burst the gate (22) Crowd 38 or more Crowd 58 or more PLAY LEVE" | session 2: "31 Crowd Clash LEVELS MARATHON LEVEL 1 BEST 630 LEVEL 1 WORLD 1 · GOLDEN MEADOW Burst the gate (22) Crowd 38 or more Crowd 58 or more PLAY L"

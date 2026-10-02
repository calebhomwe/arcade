# Progression check

Generated 2026-10-02T17:56:02.194Z. 4 games. **P0 0, P1 0, P2 0, P3 4.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Brick Breaker (`sky-breakout`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), daily(SD), cosmetics(S) | unlocks, upgrades, goals, achievements | unlocks, achievements, goals |
| 2 | Color Match (`sky-color-match`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), daily(SD), cosmetics(S) | unlocks, upgrades, goals, achievements | unlocks, achievements, goals |
| 3 | Flap & Fly (`sky-flappy-bird`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), daily(SD), cosmetics(S) | unlocks, upgrades, goals, achievements | unlocks, achievements, goals |
| 4 | Balance Tile (`sky-balance-tile`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), goals(D), daily(SD), cosmetics(S) | unlocks, upgrades, achievements | unlocks, achievements |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Brick Breaker (`sky-breakout`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 3; written this session: sky-breakout-tut, sky-PK-breakout, sky-breakout-best; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-breakout-best, sky-PK-breakout
- Session 1: start tap centre; reached play: true; game overs 3; score 80 to 30 (max 80)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 180 pts · +10 coins Best 0 pts · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 180 pt" | session 2: "Easy Normal Hard LVL 4 █████ · coins 134 · ★ 4 stars Daily: reach 180 pts · +10 coins Best 80 pts · LVL 4 · ★ 4 · coins 134 ☀ Daily: reach 1"

### Color Match (`sky-color-match`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 3; written this session: sky-PK-color-match, sky-color-match-tut, sky-color-match-best; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-color-match-best, sky-PK-color-match
- Session 1: start tap centre; reached play: true; game overs 2; score 1 to 4 (max 4)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 12 catches · +10 coins Best 0 catches · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach" | session 2: "Easy Normal Hard LVL 1 ██░░░ · coins 7 · ★ 1 stars Daily: reach 12 catches · +10 coins Best 4 catches · LVL 1 · ★ 1 · coins 7 ☀ Daily: reach"

### Flap & Fly (`sky-flappy-bird`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 2; written this session: sky-flappy-bird-tut, sky-PK-flappy-bird; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-flappy-bird-best, sky-PK-flappy-bird
- Session 1: start tap centre; reached play: true; game overs 16; score 0 to 0 (max 0)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 6 pipes · +10 coins Best 0 pipes · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 6 pi" | session 2: "Easy Normal Hard LVL 2 █░░░░ · coins 26 · ★ 1 stars Daily: reach 6 pipes · +10 coins Best 0 pipes · LVL 2 · ★ 1 · coins 26 ☀ Daily: reach 6 "

### Balance Tile (`sky-balance-tile`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, goals, daily, cosmetics; sinks cosmetics fed by levels/stars/goals/daily/currency
- localStorage keys: 3; written this session: sky-PK-balance-tile, sky-balance-tile-tut, sky-balance-tile-best; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-balance-tile-best, sky-PK-balance-tile
- Session 1: start tap centre; reached play: true; game overs 21; score 10 to 12 (max 100)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 50% · +10 coins Best 0% · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 50% → +10 coi" | session 2: "Easy Normal Hard LVL 8 ███░░ · coins 432 · ★ 7 stars Daily: done today ✓ Best 100% · LVL 8 · ★ 7 · coins 432 Daily challenge ✓ done today Cl"

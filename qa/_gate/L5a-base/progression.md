# Progression check

Generated 2026-10-02T18:21:57.751Z. 13 games. **P0 0, P1 2, P2 3, P3 8.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Hole Eater (`sky-hole-eater`) | **P1** | settings/other | starts from saved state (title shows it) | levels(D), stars(D), daily(D) | unlocks, upgrades, goals, achievements, cosmetics | unlocks, cosmetics, achievements, goals |
| 2 | Match Swipe (`sky-match-swipe`) | **P1** | settings/other | starts from saved state | levels(D), stars(D), goals(D), daily(D) | unlocks, upgrades, achievements, cosmetics | unlocks, cosmetics, achievements |
| 3 | Cut the Rope (`sky-cut-rope`) | **P2** | stars | starts from saved state | stars(S) | levels, unlocks, goals | levels, daily, goals, unlocks |
| 4 | Maze Runner (`sky-maze-runner`) | **P2** | stars | starts from saved state | stars(S) | levels, unlocks | levels, daily, goals, unlocks |
| 5 | Pull the Pin (`sky-key-unlock`) | **P2** | stars, unlocks | starts from saved state | unlocks(S), stars(S) | levels, goals | levels, daily, goals |
| 6 | Brick Breaker (`sky-breakout`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), daily(SD), cosmetics(S) | unlocks, upgrades, goals, achievements | unlocks, achievements, goals |
| 7 | Color Match (`sky-color-match`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), daily(SD), cosmetics(S) | unlocks, upgrades, goals, achievements | unlocks, achievements, goals |
| 8 | Flap & Fly (`sky-flappy-bird`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), daily(SD), cosmetics(S) | unlocks, upgrades, goals, achievements | unlocks, achievements, goals |
| 9 | Grow or Shrink (`sky-grow-shrink`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), daily(SD), cosmetics(S) | unlocks, upgrades, goals, achievements | unlocks, achievements, goals |
| 10 | Lane Switcher (`sky-lane-switcher`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), daily(SD), cosmetics(S) | unlocks, upgrades, goals, achievements | unlocks, achievements, goals |
| 11 | Parking Puzzle (`sky-parking-puzzle`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state | levels(SD), stars(SD), daily(SD), cosmetics(S) | unlocks, upgrades, goals, achievements | goals, unlocks |
| 12 | Rope Swing (`sky-rope-swing`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), daily(SD), cosmetics(S) | unlocks, upgrades, goals, achievements | unlocks, achievements, goals |
| 13 | Balance Tile (`sky-balance-tile`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), goals(D), daily(SD), cosmetics(S) | unlocks, upgrades, achievements | unlocks, achievements |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Hole Eater (`sky-hole-eater`): P1

- Why: saves some state but shows no unlock, upgrade, goal or level system
- localStorage keys: 1; written this session: sky-hole-eater-tut; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-hole-eater-best, sky-PK-hole-eater
- Session 1: start tap centre; reached play: true; game overs 0; no score reported
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 8 eaten · +10 coins Best 0 eaten · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 8 ea" | session 2: "LOADING CITY… LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 8 eaten · +10 coins Best 0 eaten · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 8 eaten"

### Match Swipe (`sky-match-swipe`): P1

- Why: saves some state but shows no unlock, upgrade, goal or level system
- localStorage keys: 1; written this session: sky-match-swipe-tut; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-match-swipe-best, sky-PK-match-swipe
- Session 1: start tap centre; reached play: true; game overs 0; no score reported
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 60 pts · +10 coins Best 0 pts · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 60 pts " | session 2: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 60 pts · +10 coins Best 0 pts · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 60 pts "

### Cut the Rope (`sky-cut-rope`): P2

- Why: progress persists (stars) with stars
- localStorage keys: 2; written this session: sky-cut-rope-tut, sky-cut-rope-stars; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-cut-rope-stars
- Session 1: start tap centre; reached play: true; game overs 1; score 1 to 1 (max 1)
- Title, session 1: "" | session 2: ""

### Maze Runner (`sky-maze-runner`): P2

- Why: progress persists (stars) with stars
- localStorage keys: 2; written this session: sky-maze-runner-tut, sky-maze-runner-stars; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-maze-runner-stars
- Session 1: start tap centre; reached play: true; game overs 2; score 1 to 2 (max 2)
- Title, session 1: "Easy Normal Hard" | session 2: "Easy Normal Hard"

### Pull the Pin (`sky-key-unlock`): P2

- Why: progress persists (stars, unlocks) with unlocks, stars
- localStorage keys: 2; written this session: sky-key-unlock-stars, sky-key-unlock-tut; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-key-unlock-stars
- Session 1: start tap centre; reached play: true; game overs 1; score 1 to 1 (max 1)
- Title, session 1: "" | session 2: ""

### Brick Breaker (`sky-breakout`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 3; written this session: sky-breakout-tut, sky-PK-breakout, sky-breakout-best; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-breakout-best, sky-PK-breakout
- Session 1: start tap centre; reached play: true; game overs 2; score 80 to 40 (max 80)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 180 pts · +10 coins Best 0 pts · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 180 pt" | session 2: "Easy Normal Hard LVL 5 █░░░░ · coins 149 · ★ 4 stars Daily: reach 180 pts · +10 coins Best 90 pts · LVL 5 · ★ 4 · coins 149 ☀ Daily: reach 1"

### Color Match (`sky-color-match`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 2; written this session: sky-PK-color-match, sky-color-match-tut; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-color-match-best, sky-PK-color-match
- Session 1: start tap centre; reached play: true; game overs 4; score 0 to 0 (max 0)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 12 catches · +10 coins Best 0 catches · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach" | session 2: "Easy Normal Hard LVL 1 ██░░░ · coins 8 · ★ 1 stars Daily: reach 12 catches · +10 coins Best 0 catches · LVL 1 · ★ 1 · coins 8 ☀ Daily: reach"

### Flap & Fly (`sky-flappy-bird`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 2; written this session: sky-flappy-bird-tut, sky-PK-flappy-bird; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-flappy-bird-best, sky-PK-flappy-bird
- Session 1: start tap centre; reached play: true; game overs 20; score 0 to 0 (max 0)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 6 pipes · +10 coins Best 0 pipes · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 6 pi" | session 2: "Easy Normal Hard LVL 2 █░░░░ · coins 30 · ★ 1 stars Daily: reach 6 pipes · +10 coins Best 0 pipes · LVL 2 · ★ 1 · coins 30 ☀ Daily: reach 6 "

### Grow or Shrink (`sky-grow-shrink`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 2; written this session: sky-PK-grow-shrink, sky-grow-shrink-tut; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-grow-shrink-best, sky-PK-grow-shrink
- Session 1: start tap centre; reached play: true; game overs 6; score 0 to 0 (max 0)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 6 doors · +10 coins Best 0 doors · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 6 do" | session 2: "Easy Normal Hard LVL 1 ███░░ · coins 11 · ★ 1 stars Daily: reach 6 doors · +10 coins Best 0 doors · LVL 1 · ★ 1 · coins 11 ☀ Daily: reach 6 "

### Lane Switcher (`sky-lane-switcher`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 3; written this session: sky-lane-switcher-tut, sky-PK-lane-switcher, sky-lane-switcher-best; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-lane-switcher-best, sky-PK-lane-switcher
- Session 1: start tap centre; reached play: true; game overs 6; score 5 to 15 (max 15)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 70 pts · +10 coins Best 0 pts · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 70 pts " | session 2: "Easy Normal Hard LVL 2 ███░░ · coins 28 · ★ 1 stars Daily: reach 70 pts · +10 coins Best 15 pts · LVL 2 · ★ 1 · coins 28 ☀ Daily: reach 70 p"

### Parking Puzzle (`sky-parking-puzzle`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 2; written this session: sky-PK-parking-puzzle, sky-parking-puzzle-tut; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-parking-puzzle-stars, sky-PK-parking-puzzle
- Session 1: start tap centre; reached play: true; game overs 0; no score reported
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 10 moves · +10 coins Best 0 moves · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 10 " | session 2: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 10 moves · +10 coins Best 0 moves · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 10 "

### Rope Swing (`sky-rope-swing`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 2; written this session: sky-PK-rope-swing, sky-rope-swing-tut; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-rope-swing-best, sky-PK-rope-swing
- Session 1: start tap centre; reached play: true; game overs 20; score 0 to 0 (max 0)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 7 vines · +10 coins Best 0 vines · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 7 vi" | session 2: "Easy Normal Hard LVL 2 █░░░░ · coins 29 · ★ 1 stars Daily: reach 7 vines · +10 coins Best 0 vines · LVL 2 · ★ 1 · coins 29 ☀ Daily: reach 7 "

### Balance Tile (`sky-balance-tile`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, goals, daily, cosmetics; sinks cosmetics fed by levels/stars/goals/daily/currency
- localStorage keys: 3; written this session: sky-PK-balance-tile, sky-balance-tile-tut, sky-balance-tile-best; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-balance-tile-best, sky-PK-balance-tile
- Session 1: start tap centre; reached play: true; game overs 19; score 10 to 85 (max 100)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 50% · +10 coins Best 0% · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 50% → +10 coi" | session 2: "Easy Normal Hard LVL 8 ████░ · coins 458 · ★ 7 stars Daily: done today ✓ Best 100% · LVL 8 · ★ 7 · coins 458 Daily challenge ✓ done today Cl"

# Progression check

Generated 2026-10-02T06:50:05.334Z. 3 games. **P0 0, P1 2, P2 0, P3 1.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Isle of Bells (`hub-isle-of-bells`) | **P1** | settings/other | starts from saved state (title shows it) | levels(D) | upgrades, stars, goals | goals, unlocks, cosmetics, achievements, daily |
| 2 | Hole Swallow (`hub-hole-swallow`) | **P1** | best score | starts from saved state | levels(SD), unlocks(S), stars(S), goals(SD), daily(SD), cosmetics(S) | upgrades | achievements |
| 3 | Brick Breaker (`hub-brick-breaker`) | **P3** | best score, levels, stars, currency, unlocks, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(S), stars(SD), goals(D), cosmetics(SD) | daily | upgrades, achievements, daily |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Isle of Bells (`hub-isle-of-bells`): P1

- Why: saves some state but shows no unlock, upgrade, goal or level system
- localStorage keys: 2; written this session: isleOfBells_v1, isleTut; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): isleOfBells_v1
- Session 1: start #playBtn; reached play: true; game overs 0; no score reported
- Title, session 1: "← Hub 🕐 00:01 Day 1 · 🌙 💰 500 🏡 0 🎒 0 🪓 🪡 🎣 ⛏️ 🚿 🪃 🎒 🏪 🏛️ 📔 🔊 ❔ 🏝️ Isle of Bells A cozy island where fish bite, bugs buzz, t" | session 2: "← Hub 🕐 02:22 Day 1 · 🌙 💰 500 🏡 0 🎒 1 🪓 🪡 🎣 ⛏️ 🚿 🪃 🎒 🏪 🏛️ 📔 🔇 ❔"

### Hole Swallow (`hub-hole-swallow`): P1

- Why: saves a best score but shows no unlock, upgrade, goal or level system
- localStorage keys: 5; written this session: hole-swallow-rank, hole-swallow-best-mute, hole-swallow-gild, hole-swallow-tut; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): hole-swallow-prog-v1, hole-swallow-best, hole-swallow-rank, hole-swallow-gild
- Session 1: start #playBtn; reached play: true; game overs 0; no score reported
- Title, session 1: "0 Hole Swallow MISSIONS CLASSIC MISSION 1 WORLD 1 · TOWN PARK Score 75 Score 115 Score 165 PLAY MISSION 1 HOLES Daily goal Clear 3 missions " | session 2: "0 Hole Swallow MISSIONS CLASSIC MISSION 1 WORLD 1 · TOWN PARK Score 75 Score 115 Score 165 PLAY MISSION 1 HOLES Daily goal Clear 3 missions "

### Brick Breaker (`hub-brick-breaker`): P3

- Why: progress persists (levels, stars, currency, unlocks, cosmetics); systems seen: levels, unlocks, stars, goals, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/currency
- localStorage keys: 4; written this session: brick-tut, brickMute, brickBest, hm-brick; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): brickBest, brick-stars, hm-brick
- Session 1: start #playBtn; reached play: true; game overs 2; score 30 to 50 (max 50)
- Title, session 1: "🔊 Brick Breaker 20 LEVELS · 4 WORLDS · 3 STARS EACH ★ 0 / 60 stars · Best level 0 💎 0 🎨 Skins 📋 Goals 4 🔥 0/5 PLAY Choose level ← Hub" | session 2: "🔇 Brick Breaker 20 LEVELS · 4 WORLDS · 3 STARS EACH ★ 0 / 60 stars · Best level 0 💎 9 🎨 Skins 📋 Goals 4 🔥 1/5 PLAY Choose level ← Hub"

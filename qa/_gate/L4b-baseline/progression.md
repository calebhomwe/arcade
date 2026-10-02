# Progression check

Generated 2026-10-02T18:23:49.906Z. 7 games. **P0 0, P1 5, P2 0, P3 2.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Farm Harvest (`hub-farm-harvest`) | **P1** | settings/other | starts from saved state (title shows it) | levels(D), unlocks(D), upgrades(D), goals(D), achievements(D), daily(D) | - | cosmetics |
| 2 | Farm Idle Tycoon (`hub-farm-idle`) | **P1** | settings/other | starts from saved state (title shows it) | levels(D), unlocks(D), upgrades(D), goals(D), achievements(D), daily(D) | - | - |
| 3 | Idle Empire (`hub-idle-empire`) | **P1** | settings/other | starts from saved state (title shows it) | levels(D), unlocks(D), upgrades(D), goals(D), achievements(D), daily(D) | - | - |
| 4 | Idle Miner (`hub-idle-miner`) | **P1** | settings/other | starts from saved state (title shows it) | levels(D), unlocks(D), upgrades(D), goals(D), achievements(D), daily(D) | - | - |
| 5 | Tap Monsters (`hub-tap-monsters`) | **P1** | settings/other | starts from saved state (title shows it) | levels(D), unlocks(D), upgrades(D), goals(D), achievements(D), daily(D) | - | - |
| 6 | Hole Swallow (`hub-hole-swallow`) | **P3** | best score, levels, stars, currency, unlocks, goals, daily, cosmetics | starts from saved state | levels(SD), unlocks(S), stars(SD), goals(SD), daily(SD), cosmetics(S) | upgrades | achievements |
| 7 | Isle of Bells (`hub-isle-of-bells`) | **P3** | levels, stars, currency, unlocks, goals, daily | starts from saved state (title shows it) | levels(SD), unlocks(SD), upgrades(D), stars(SD), goals(SD), achievements(D), daily(SD) | - | cosmetics |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Farm Harvest (`hub-farm-harvest`): P1

- Why: saves some state but shows no unlock, upgrade, goal or level system
- localStorage keys: 3; written this session: ik_coach_farm-harvest, farmHarvestSave_v2, fh_muted; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): farmHarvestSave_v2
- Session 1: start #btnPlay; reached play: true; game overs 0; score 0 to 0 (max 0)
- Title, session 1: "1 Level 0/10 XP 30 Level 1 farmer 0/24 Your daily gift is waiting Free coins, every day Badges 0/16 Harvest 0 ready Plant all 4 · 8 Water al" | session 2: "1 Level 0/10 XP 22 Level 1 farmer 0/24 Your daily gift is waiting Free coins, every day Goals today 0/3 · Streak 1 · Badges 0/16 Harvest 4 r"

### Farm Idle Tycoon (`hub-farm-idle`): P1

- Why: saves some state but shows no unlock, upgrade, goal or level system
- localStorage keys: 3; written this session: farmIdleSave_v2, fi_muted, ik_coach_farm-idle; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): farmIdleSave_v2
- Session 1: start #btnPlay; reached play: true; game overs 0; score 0 to 0 (max 0)
- Title, session 1: "1 Level 0/8 XP 0 0/s Build your first Wheat Field 15 coins · tap the cow to earn Badges 0/20 · Upgrades at level 2 +XP ×1 ×10 ×25 MAX Wheat " | session 2: "1 Level 0/8 XP 0 0/s Build your first Wheat Field 15 coins · tap the cow to earn Goals today 0/3 · Streak 0 · Goals tab at level 3 · Badges "

### Idle Empire (`hub-idle-empire`): P1

- Why: saves some state but shows no unlock, upgrade, goal or level system
- localStorage keys: 3; written this session: ie_muted, ik_coach_idle-empire, ie_state; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): ie_state
- Session 1: start #btnPlay; reached play: true; game overs 0; score 0 to 9 (max 9)
- Title, session 1: "1 Level 0/8 XP 0 0/s Build your first Market Stall 15 coins · tap the fountain to earn Badges 0/20 · Upgrades at level 2 +XP ×1 ×10 ×25 MAX " | session 2: "1 Level 0/8 XP 9 0/s Build your first Market Stall 15 coins · tap the fountain to earn Goals today 0/3 · Streak 1 · Goals tab at level 3 · B"

### Idle Miner (`hub-idle-miner`): P1

- Why: saves some state but shows no unlock, upgrade, goal or level system
- localStorage keys: 2; written this session: ik_coach_idle-miner, im_state; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): im_state
- Session 1: start #btnPlay; reached play: true; game overs 0; score 0 to 3 (max 3)
- Title, session 1: "1 Level 0/8 XP 0 0/s Build your first Copper Seam 15 coins · tap the rock to earn Badges 0/19 · Upgrades at level 2 +XP ×1 ×10 ×25 MAX Coppe" | session 2: "1 Level 0/8 XP 3 0/s Build your first Copper Seam 15 coins · tap the rock to earn Goals today 0/3 · Streak 1 · Goals tab at level 3 · Badges"

### Tap Monsters (`hub-tap-monsters`): P1

- Why: saves some state but shows no unlock, upgrade, goal or level system
- localStorage keys: 2; written this session: ik_coach_tap-monsters, tm_state; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): tm_state
- Session 1: start #btnPlay; reached play: true; game overs 0; score 0 to 0 (max 0)
- Title, session 1: "1 Level 0/8 XP 0 0 dmg/s Build your first Kitty 15 gold · tap the monster to earn Badges 0/20 · Upgrades at level 2 +XP ×1 ×10 ×25 MAX Kitty" | session 2: "1 Level 0/8 XP 0 0 dmg/s Build your first Kitty 15 gold · tap the monster to earn Goals today 0/3 · Streak 1 · Goals tab at level 3 · Badges"

### Hole Swallow (`hub-hole-swallow`): P3

- Why: progress persists (levels, stars, currency, unlocks, goals, daily, cosmetics); systems seen: levels, unlocks, stars, goals, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/daily/currency
- localStorage keys: 5; written this session: hole-swallow-rank, hole-swallow-best-mute, hole-swallow-gild, hole-swallow-tut, hole-swallow-prog-v1; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): hole-swallow-prog-v1, hole-swallow-best, hole-swallow-rank, hole-swallow-gild
- Session 1: start #playBtn; reached play: true; game overs 0; no score reported
- Title, session 1: "0 Hole Swallow MISSIONS CLASSIC MISSION 1 WORLD 1 · TOWN PARK Score 75 Score 115 Score 165 PLAY MISSION 1 HOLES Daily goal Grab 4 time stars" | session 2: "0 Hole Swallow MISSIONS CLASSIC MISSION 1 WORLD 1 · TOWN PARK Score 75 Score 115 Score 165 PLAY MISSION 1 HOLES Daily goal Grab 4 time stars"

### Isle of Bells (`hub-isle-of-bells`): P3

- Why: progress persists (levels, stars, currency, unlocks, goals, daily); systems seen: levels, unlocks, upgrades, stars, goals, achievements, daily; sinks unlocks/upgrades fed by levels/stars/goals/achievements/daily/currency
- localStorage keys: 3; written this session: isleOfBells_v1, isleTut, isleProg_v1; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): isleOfBells_v1
- Session 1: start declared start button not tappable -> tap centre; reached play: true; game overs 0; no score reported
- Title, session 1: "← Hub 🕐 00:18 Day 1 · 🌙 💰 500 🏡 0 🎒 0 🏅 0/8 awards · Next: 🦋 Catch 15 bugs 🪓 🪡 🎣 ⛏️ 🚿 🪃 🎒 🏪 🏛️ 📔 🔊 ❔ 🏝️ Isle of Bells A co" | session 2: "← Hub 🕐 03:22 Day 1 · 🌙 💰 500 🏡 0 🎒 1 🏅 0/8 awards · Next: 🦋 Catch 15 bugs 🪓 🪡 🎣 ⛏️ 🚿 🪃 🎒 🏪 🏛️ 📔 🔇 ❔"

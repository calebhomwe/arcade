# Progression check

Generated 2026-10-02T19:06:19.823Z. 4 games. **P0 0, P1 2, P2 0, P3 2.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Critter Rush 2D (`critter-rush-2d`) | **P1** (?) | settings/other | starts from saved state | levels(D), stars(D), goals(D) | achievements | unlocks, cosmetics, achievements |
| 2 | Chili Firm 2: Replanted (`chili-firm`) | **P1** | settings/other | starts from saved state (title shows it) | levels(D), upgrades(D), goals(D), achievements(D) | unlocks, cosmetics | unlocks, daily |
| 3 | SneakerDrop — Hype Market Tycoon (`sneaker-drop`) | **P3** | levels, daily | starts from saved state | levels(S), upgrades(S), stars(S), achievements(S), daily(S) | goals | goals, unlocks |
| 4 | Claire's Big Life (`claire-pip`) | **P3** | levels, stars, unlocks, goals, achievements, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(SD), upgrades(D), stars(SD), goals(S), achievements(S), daily(S), cosmetics(SD) | - | - |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Critter Rush 2D (`critter-rush-2d`): P1

- Why: saves some state but shows no unlock, upgrade, goal or level system
- localStorage keys: 2; written this session: critterRush2dDiff, critterRush2dTut; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): critterRush2dBest, critterRush2dProg
- Session 1: start tap centre + EASY + EASY + EASY + tap on game; reached play: false; game overs 0; no score reported
- Title, session 1: "CRITTER RUSH CLASSIC FUN RUN RACING ACTION LVL 1 ★ 0 · 0 COINS TODAY'S GOAL: finish a race in the top 2 for a ★ + 50 coins Fox All-rounder —" | session 2: "CRITTER RUSH CLASSIC FUN RUN RACING ACTION LVL 1 ★ 0 · 0 COINS TODAY'S GOAL: finish a race in the top 2 for a ★ + 50 coins Fox All-rounder —"
- Notes: the bot never reached play: what persists after real play was not measured

### Chili Firm 2: Replanted (`chili-firm`): P1

- Why: saves some state but shows no unlock, upgrade, goal or level system
- localStorage keys: 1; written this session: chili_firm2_save; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): chili_firm2_save
- Session 1: start .playbtn; reached play: true; game overs 0; no score reported
- Title, session 1: "SCORCH FARMS · EST. ABUELA HOT & FRESH 1 Seed Rookie 50 0 /200 Day 1 1x Plant Your First Chili 20 Abuela’s Garage Seeds Market Crew Upgrade " | session 2: "SCORCH FARMS · EST. ABUELA HOT & FRESH 1 Seed Rookie 50 0 /200 Day 3 1x Plant Your First Chili 20 Abuela’s Garage Seeds Market ! Crew Upgrad"

### SneakerDrop — Hype Market Tycoon (`sneaker-drop`): P3

- Why: progress persists (levels, daily); systems seen: levels, upgrades, stars, achievements, daily; sinks upgrades fed by levels/stars/achievements/daily/currency
- localStorage keys: 2; written this session: sneakerdrop_save; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sneakerdrop_save
- Session 1: start #startBtn; reached play: true; game overs 0; no score reported
- Title, session 1: "TAP TO START EASY NORMAL HARD SOUND: ON HOW TO PLAY" | session 2: "TAP TO START EASY NORMAL HARD SOUND: ON HOW TO PLAY"

### Claire's Big Life (`claire-pip`): P3

- Why: progress persists (levels, stars, unlocks, goals, achievements, daily, cosmetics); systems seen: levels, unlocks, upgrades, stars, goals, achievements, daily, cosmetics; sinks unlocks/upgrades/cosmetics fed by levels/stars/goals/achievements/daily
- localStorage keys: 2; written this session: claire_pip_save_v2, clairePipProg; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): claire_pip_save_v2
- Session 1: start #ageBands .ageband + ▶ Start play; reached play: true; game overs 0; no score reported
- Title, session 1: "🌳 🌷 🌼 🌷 🌸 🌼 🌸 🌷 🌼 ✨ 🌸 💮 🌷 ✿ ⭐ 0 🐾 Lv 1 💖 🍓 ⚡ z Pip 💖 🗺️ Explore 🍓 Feed 🎾 Fetch 💤 Nap ✨ Tricks 🎮 Games 🌱 Garden 👗 Shop" | session 2: "🌳 🌷 🌼 🌷 🌸 🌼 ⭐ 0 🐾 Lv 1 💖 🍓 ⚡ z Pip 💖 🗺️ Explore 🍓 Feed 🎾 Fetch 💤 Nap ✨ Tricks 🎮 Games 🌱 Garden 👗 Shop 🎁 📋 📔 🌙 🏆 ⚙️ ⏸️"

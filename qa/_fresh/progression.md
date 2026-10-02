# Progression check

Generated 2026-10-02T08:14:51.127Z. 11 games. **P0 0, P1 10, P2 0, P3 1.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Critter Rush 2D (`critter-rush-2d`) | **P1** (?) | settings/other | starts from saved state | none | levels, achievements | levels, unlocks, stars, cosmetics, achievements |
| 2 | SneakerDrop — Hype Market Tycoon (`sneaker-drop`) | **P1** | save data | starts from saved state | none | levels, upgrades, stars, goals, daily | goals, upgrades, unlocks, stars, levels |
| 3 | Helix Drop (`helix-drop`) | **P1** | settings/other | starts from saved state | levels(D) | unlocks | unlocks, cosmetics, daily, achievements, goals |
| 4 | Neon Dash (`neon-dash`) | **P1** | settings/other | starts from saved state (title shows it) | levels(D) | - | upgrades, unlocks, achievements, daily |
| 5 | Volt Dash (`volt-dash`) | **P1** | best score | starts from saved state (title shows it) | stars(D) | - | unlocks, cosmetics, daily, achievements, goals |
| 6 | Market Merge (`market-merge`) | **P1** | settings/other | saved, but not visibly used | goals(D), daily(D) | - | levels, stars, unlocks |
| 7 | Rung Runner (`rung-runner`) | **P1** | best score | starts from saved state (title shows it) | levels(D), stars(D) | - | unlocks, cosmetics, daily, achievements, goals |
| 8 | Chili Firm 2: Replanted (`chili-firm`) | **P1** | settings/other | starts from saved state (title shows it) | levels(D), upgrades(D), goals(D), achievements(D) | unlocks, cosmetics | unlocks, daily |
| 9 | Surviv Royale (`surviv-royale`) | **P1** | best score | starts from saved state (title shows it) | levels(S), unlocks(S), stars(S), goals(D), cosmetics(SD) | upgrades, daily | upgrades, achievements, daily |
| 10 | Claire's Big Life (`claire-pip`) | **P1** | settings/other | starts from saved state (title shows it) | levels(D), unlocks(D), upgrades(D), stars(D), achievements(D), cosmetics(D) | goals, daily | goals, daily |
| 11 | Snake Clash (`snake-clash`) | **P3** | levels, cosmetics | starts from saved state | levels(S), goals(D), cosmetics(S) | unlocks, stars, achievements, daily | unlocks, daily, achievements |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Critter Rush 2D (`critter-rush-2d`): P1

- Why: saves some state but shows no unlock, upgrade, goal or level system
- localStorage keys: 2; written this session: critterRush2dDiff, critterRush2dTut; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): critterRush2dBest
- Session 1: start tap centre + EASY + EASY + EASY + tap on game; reached play: false; game overs 0; no score reported
- Title, session 1: "CRITTER RUSH CLASSIC FUN RUN RACING ACTION Fox All-rounder — balanced baseline. Rabbit Glass cannon — fast but fragile. Cat Acrobat — higher" | session 2: "CRITTER RUSH CLASSIC FUN RUN RACING ACTION Fox All-rounder — balanced baseline. Rabbit Glass cannon — fast but fragile. Cat Acrobat — higher"
- Notes: the bot never reached play: what persists after real play was not measured

### SneakerDrop — Hype Market Tycoon (`sneaker-drop`): P1

- Why: saves some state and save-blob but shows no unlock, upgrade, goal or level system
- localStorage keys: 1; written this session: sneakerdrop_save; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sneakerdrop_save
- Session 1: start #startBtn; reached play: true; game overs 0; no score reported
- Title, session 1: "TAP TO START EASY NORMAL HARD SOUND: ON HOW TO PLAY" | session 2: "TAP TO START EASY NORMAL HARD SOUND: ON HOW TO PLAY"

### Helix Drop (`helix-drop`): P1

- Why: saves some state but shows no unlock, upgrade, goal or level system
- localStorage keys: 2; written this session: hx_hint, hx_snd; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): hx_rec
- Session 1: start #play; reached play: true; game overs 0; score 0 to 0 (max 0)
- Title, session 1: "TOWER ROTATOR CO. HELIX DROP Rotate the tower so the gap in each ring slides under the ball — drop deeper for more. BALL SAFE BOUNCER BONUS " | session 2: "TOWER ROTATOR CO. HELIX DROP Rotate the tower so the gap in each ring slides under the ball — drop deeper for more. BALL SAFE BOUNCER BONUS "

### Neon Dash (`neon-dash`): P1

- Why: saves some state but shows no unlock, upgrade, goal or level system
- localStorage keys: 1; written this session: neonDashTut; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): neonDashBest, neonDashBestEasy, neonDashBestHard, neonDashTop
- Session 1: start #play-btn; reached play: true; game overs 0; no score reported
- Title, session 1: "SCORE 0 COINS 0 COMBO x1 DIST 0m LVL 1 🔊 NEON DASH Dodge · Slide · Collect ▶ START EASY NORMAL HARD MAGNET pulls coins SHIELD blocks a hit " | session 2: "SCORE 0 COINS 0 COMBO x1 DIST 0m LVL 1 🔇 NEON DASH Dodge · Slide · Collect ▶ START EASY NORMAL HARD MAGNET pulls coins SHIELD blocks a hit "

### Volt Dash (`volt-dash`): P1

- Why: saves a best score but shows no unlock, upgrade, goal or level system
- localStorage keys: 3; written this session: vd_snd, vd_hint, vd_rec; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): vd_rec
- Session 1: start declared start button not tappable -> tap centre; reached play: true; game overs 1; score 0 to 0 (max 139)
- Title, session 1: "VOLTWORKS POWER CO. VOLT DASH Auto-run the live grid: hop spikes, slide under conduits, grab every cell. At zero energy the lights go out. B" | session 2: "VOLTWORKS POWER CO. VOLT DASH Auto-run the live grid: hop spikes, slide under conduits, grab every cell. At zero energy the lights go out. B"

### Market Merge (`market-merge`): P1

- Why: saves some state but shows no unlock, upgrade, goal or level system
- localStorage keys: 1; written this session: mm_tut; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): mm_rec, mm_daily
- Session 1: start #play; reached play: true; game overs 0; no score reported
- Title, session 1: "HOLLOW & SONS · WHOLESALE MARKET MERGE Sort the delivery into one wooden crate. Two of a kind squash together into the next size up — chain " | session 2: "HOLLOW & SONS · WHOLESALE MARKET MERGE Sort the delivery into one wooden crate. Two of a kind squash together into the next size up — chain "

### Rung Runner (`rung-runner`): P1

- Why: saves a best score but shows no unlock, upgrade, goal or level system
- localStorage keys: 2; written this session: rr_rec, rr_hint; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): rr_rec
- Session 1: start #play; reached play: true; game overs 1; score 0 to 0 (max 56)
- Title, session 1: "MOONLIGHT LADDER CO. RUNG RUNNER Auto-run up the road and snatch every floating rung — your stack must match each wall's number to clear it." | session 2: "MOONLIGHT LADDER CO. RUNG RUNNER Auto-run up the road and snatch every floating rung — your stack must match each wall's number to clear it."

### Chili Firm 2: Replanted (`chili-firm`): P1

- Why: saves some state but shows no unlock, upgrade, goal or level system
- localStorage keys: 1; written this session: chili_firm2_save; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): chili_firm2_save
- Session 1: start .playbtn; reached play: true; game overs 0; no score reported
- Title, session 1: "SCORCH FARMS · EST. ABUELA HOT & FRESH 1 Seed Rookie 50 0 /200 Day 1 1x Plant Your First Chili 20 Abuela’s Garage Seeds Market Crew Upgrade " | session 2: "SCORCH FARMS · EST. ABUELA HOT & FRESH 1 Seed Rookie 50 0 /200 Day 3 1x Plant Your First Chili 20 Abuela’s Garage Seeds Market ! Crew Upgrad"

### Surviv Royale (`surviv-royale`): P1

- Why: saves a best score but shows no unlock, upgrade, goal or level system
- localStorage keys: 3; written this session: surviv_tut, surviv_meta_v1; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): surviv_meta_v1, hm-surviv
- Session 1: start #btn-play; reached play: true; game overs 0; no score reported
- Title, session 1: "SURVIV ROYALE 16 drop in. 1 walks out. Left thumb moves, right thumb aims and fires. 0 WINS 0 KILLS 0 MATCHES - BEST PLACE 🪙 0 🎨 Skins 📋 " | session 2: "SURVIV ROYALE 16 drop in. 1 walks out. Left thumb moves, right thumb aims and fires. 0 WINS 0 KILLS 1 MATCHES - BEST PLACE 🪙 0 🎨 Skins 📋 "

### Claire's Big Life (`claire-pip`): P1

- Why: saves some state but shows no unlock, upgrade, goal or level system
- localStorage keys: 1; written this session: claire_pip_save_v2; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): claire_pip_save_v2
- Session 1: start #ageBands .ageband + ▶ Start play; reached play: true; game overs 0; no score reported
- Title, session 1: "🌳 🌷 🌼 🌷 🌸 🌼 🌸 🌷 🌼 ✨ 🌸 💮 🌷 ✿ ⭐ 0 🐾 Lv 1 💖 🍓 ⚡ z Pip 💖 🗺️ Explore 🍓 Feed 🎾 Fetch 💤 Nap ✨ Tricks 🎮 Games 🌱 Garden 👗 Shop" | session 2: "🌳 🌷 🌼 🌷 🌸 🌼 ⭐ 0 🐾 Lv 1 💖 🍓 ⚡ z Pip 💖 🗺️ Explore 🍓 Feed 🎾 Fetch 💤 Nap ✨ Tricks 🎮 Games 🌱 Garden 👗 Shop 🎁 📋 📔 🌧️ 🏆 ⚙️ ⏸️"

### Snake Clash (`snake-clash`): P3

- Why: progress persists (levels, cosmetics); systems seen: levels, goals, cosmetics; sinks cosmetics fed by levels/goals
- localStorage keys: 3; written this session: sc_hint, sc_snd, pz_snakeclash; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sc_rec, pz_snakeclash
- Session 1: start #play; reached play: true; game overs 0; score 0 to 0 (max 0)
- Title, session 1: "SNAKE CLASH Eat juicy fruit to grow. Cut a rival off so it bursts into fruit. Touch a rival's body or the wall and you burst instead. TOUCH " | session 2: "SNAKE CLASH Eat juicy fruit to grow. Cut a rival off so it bursts into fruit. Touch a rival's body or the wall and you burst instead. TOUCH "

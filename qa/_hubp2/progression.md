# Progression check

Generated 2026-10-02T07:29:53.689Z. 2 games. **P0 0, P1 2, P2 0, P3 0.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Isle of Bells (`hub-isle-of-bells`) | **P1** (?) | settings/other | starts from saved state (title shows it) | levels(D), unlocks(D), goals(D), achievements(D), daily(D) | upgrades, stars | cosmetics |
| 2 | Hole Swallow (`hub-hole-swallow`) | **P1** | best score | starts from saved state | levels(SD), unlocks(S), stars(S), goals(SD), daily(SD), cosmetics(S) | upgrades | achievements |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Isle of Bells (`hub-isle-of-bells`): P1

- Why: saves some state but shows no unlock, upgrade, goal or level system
- localStorage keys: 1; written this session: isleOfBells_v1; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): isleOfBells_v1
- Session 1: start declared start button not tappable -> tap centre + tap on game; reached play: false; game overs 0; no score reported
- Title, session 1: "← Hub 🕐 00:01 Day 1 · 🌙· 🌧 💰 500 🏡 0 🎒 0 🏅 0/8 awards · Next: 🦋 Catch 15 bugs 🪓 🪡 🎣 ⛏️ 🚿 🪃 🎒 🏪 🏛️ 📔 🔊 ❔ 🏝️ Isle of Bells " | session 2: "← Hub 🕐 04:51 Day 1 · 🌙· 🌧 💰 500 🏡 0 🎒 0 🏅 0/8 awards · Next: 🦋 Catch 15 bugs 🪓 🪡 🎣 ⛏️ 🚿 🪃 🎒 🏪 🏛️ 📔 🔊 ❔ 🏝️ Isle of Bells "
- Notes: the bot never reached play: what persists after real play was not measured

### Hole Swallow (`hub-hole-swallow`): P1

- Why: saves a best score but shows no unlock, upgrade, goal or level system
- localStorage keys: 5; written this session: hole-swallow-rank, hole-swallow-best-mute, hole-swallow-gild, hole-swallow-tut; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): hole-swallow-prog-v1, hole-swallow-best, hole-swallow-rank, hole-swallow-gild
- Session 1: start #playBtn; reached play: true; game overs 0; no score reported
- Title, session 1: "0 Hole Swallow MISSIONS CLASSIC MISSION 1 WORLD 1 · TOWN PARK Score 75 Score 115 Score 165 PLAY MISSION 1 HOLES Daily goal Clear 3 missions " | session 2: "0 Hole Swallow MISSIONS CLASSIC MISSION 1 WORLD 1 · TOWN PARK Score 75 Score 115 Score 165 PLAY MISSION 1 HOLES Daily goal Clear 3 missions "

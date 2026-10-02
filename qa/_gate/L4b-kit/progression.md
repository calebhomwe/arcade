# Progression check

Generated 2026-10-02T18:47:51.788Z. 2 games. **P0 0, P1 0, P2 0, P3 2.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Idle Empire (`hub-idle-empire`) | **P3** | levels, stars, currency, unlocks, upgrades, goals, achievements, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(SD), upgrades(SD), stars(S), goals(SD), achievements(SD), daily(SD), cosmetics(S) | - | - |
| 2 | Idle Miner (`hub-idle-miner`) | **P3** | levels, stars, currency, unlocks, upgrades, goals, achievements, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(SD), upgrades(SD), stars(S), goals(SD), achievements(SD), daily(SD), cosmetics(S) | - | - |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Idle Empire (`hub-idle-empire`): P3

- Why: progress persists (levels, stars, currency, unlocks, upgrades, goals, achievements, daily, cosmetics); systems seen: levels, unlocks, upgrades, stars, goals, achievements, daily, cosmetics; sinks unlocks/upgrades/cosmetics fed by levels/stars/goals/achievements/daily/currency
- localStorage keys: 4; written this session: ie_muted, ik_coach_idle-empire, ie_state, idle-empire_prog; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): ie_state
- Session 1: start #btnPlay; reached play: true; game overs 0; score 0 to 18 (max 18)
- Title, session 1: "1 Level 0/8 XP 0 0/s Build your first Market Stall 15 coins · tap the fountain to earn Badges 0/20 · Upgrades at level 2 +XP ×1 ×10 ×25 MAX " | session 2: "1 Level 0/8 XP 21 0/s Build your first Market Stall 15 coins · tap the fountain to earn Goals today 0/3 · Streak 1 · Goals tab at level 3 · "

### Idle Miner (`hub-idle-miner`): P3

- Why: progress persists (levels, stars, currency, unlocks, upgrades, goals, achievements, daily, cosmetics); systems seen: levels, unlocks, upgrades, stars, goals, achievements, daily, cosmetics; sinks unlocks/upgrades/cosmetics fed by levels/stars/goals/achievements/daily/currency
- localStorage keys: 4; written this session: ik_coach_idle-miner, im_state, im_muted, idle-miner_prog; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): im_state
- Session 1: start #btnPlay; reached play: true; game overs 0; score 0 to 12 (max 12)
- Title, session 1: "1 Level 0/8 XP 0 0/s Build your first Copper Seam 15 coins · tap the rock to earn Badges 0/19 · Upgrades at level 2 +XP ×1 ×10 ×25 MAX Coppe" | session 2: "1 Level 0/8 XP 12 0/s Build your first Copper Seam 15 coins · tap the rock to earn Goals today 0/3 · Streak 1 · Goals tab at level 3 · Badge"

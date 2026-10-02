# Progression check

Generated 2026-10-02T19:12:32.224Z. 1 games. **P0 0, P1 0, P2 0, P3 1.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Chili Firm 2: Replanted (`chili-firm`) | **P3** | levels, stars, currency, unlocks, upgrades, goals, daily | starts from saved state (title shows it) | levels(SD), unlocks(S), upgrades(SD), stars(S), goals(SD), achievements(D), daily(S) | cosmetics | - |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Chili Firm 2: Replanted (`chili-firm`): P3

- Why: progress persists (levels, stars, currency, unlocks, upgrades, goals, daily); systems seen: levels, unlocks, upgrades, stars, goals, achievements, daily; sinks unlocks/upgrades fed by levels/stars/goals/achievements/daily/currency
- localStorage keys: 2; written this session: chili_firm2_save, chili_career_v1; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): chili_firm2_save
- Session 1: start .playbtn; reached play: true; game overs 0; no score reported
- Title, session 1: "SCORCH FARMS · EST. ABUELA HOT & FRESH 1 Seed Rookie 50 0 /200 Day 1 1x Plant Your First Chili 20 Abuela’s Garage Seeds Market Crew Upgrade " | session 2: "SCORCH FARMS · EST. ABUELA HOT & FRESH 1 Seed Rookie 50 0 /200 Day 3 1x Plant Your First Chili 20 Abuela’s Garage Seeds Market ! Crew Upgrad"

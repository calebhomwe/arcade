# Progression check

Generated 2026-10-02T06:45:03.698Z. 9 games. **P0 0, P1 0, P2 0, P3 9.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Slide Runner (`sky-slide-runner`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), daily(SD), cosmetics(S) | - | unlocks, achievements, goals |
| 2 | Slingshot (`sky-slingshot`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), daily(SD), cosmetics(S) | goals | unlocks, achievements, goals |
| 3 | Snake (`sky-snake`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), daily(SD), cosmetics(S) | - | unlocks, achievements, goals |
| 4 | Sniper Shot (`sky-sniper-shot`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), daily(SD), cosmetics(S) | goals | unlocks, achievements, goals |
| 5 | Spike Jump (`sky-spike-jump`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), daily(SD), cosmetics(S) | - | unlocks, achievements, goals |
| 6 | Stack Tower (`sky-stack-tower`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), daily(SD), cosmetics(S) | - | unlocks, achievements, goals |
| 7 | Swim Dodge (`sky-swim-dodge`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), daily(SD), cosmetics(S) | - | unlocks, achievements, goals |
| 8 | Turret Defense (`sky-turret-defense`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), stars(SD), daily(SD), cosmetics(S) | - | unlocks, achievements, goals |
| 9 | Traffic Run (`sky-traffic-run`) | **P3** | best score, levels, stars, currency, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(D), stars(SD), goals(D), daily(SD), cosmetics(SD) | - | achievements |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Slide Runner (`sky-slide-runner`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 4; written this session: sky-PK-slide-runner, sky-slide-runner-best, sky-slide-runner-diff, sky-slide-runner-tut; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-slide-runner-best
- Session 1: start tap centre; reached play: true; game overs 2; score 5 to 6 (max 6)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 35 dodged · +10 coins Best 0 dodged · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 3" | session 2: "Easy Normal Hard LVL 2 █░░░░ · coins 16 · ★ 1 stars Daily: reach 35 dodged · +10 coins Best 6 dodged · LVL 2 · ★ 1 · coins 16 ☀ Daily: reach"

### Slingshot (`sky-slingshot`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 3; written this session: sky-slingshot-tut, sky-PK-slingshot, sky-slingshot-diff; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-slingshot-best
- Session 1: start tap centre; reached play: true; game overs 4; score 0 to 0 (max 0)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 10 hits · +10 coins Best 0 hits · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 10 hi" | session 2: "Easy Normal Hard LVL 1 ██░░░ · coins 8 · ★ 1 stars Daily: reach 10 hits · +10 coins Best 0 hits · LVL 1 · ★ 1 · coins 8 ☀ Daily: reach 10 hi"

### Snake (`sky-snake`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 3; written this session: sky-snake-diff, sky-snake-tut, sky-PK-snake; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-snake-best
- Session 1: start tap centre; reached play: true; game overs 7; score 0 to 0 (max 0)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 35 pts · +10 coins Best 0 pts · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 35 pts " | session 2: "Easy Normal Hard LVL 1 ███░░ · coins 11 · ★ 1 stars Daily: reach 35 pts · +10 coins Best 0 pts · LVL 1 · ★ 1 · coins 11 ☀ Daily: reach 35 pt"

### Sniper Shot (`sky-sniper-shot`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 3; written this session: sky-sniper-shot-tut, sky-PK-sniper-shot, sky-sniper-shot-diff; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-sniper-shot-best
- Session 1: start tap centre; reached play: true; game overs 3; score 0 to 0 (max 0)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 900 pts · +10 coins Best 0 pts · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 900 pt" | session 2: "Easy Normal Hard LVL 1 █░░░░ · coins 7 · ★ 1 stars Daily: reach 900 pts · +10 coins Best 0 pts · LVL 1 · ★ 1 · coins 7 ☀ Daily: reach 900 pt"

### Spike Jump (`sky-spike-jump`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 4; written this session: sky-spike-jump-tut, sky-spike-jump-best, sky-spike-jump-diff, sky-PK-spike-jump; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-spike-jump-best
- Session 1: start tap centre; reached play: true; game overs 5; score 2 to 2 (max 4)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 30 jumped · +10 coins Best 0 jumped · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 3" | session 2: "Easy Normal Hard LVL 1 █████ · coins 10 · ★ 1 stars Daily: reach 30 jumped · +10 coins Best 4 jumped · LVL 1 · ★ 1 · coins 10 ☀ Daily: reach"

### Stack Tower (`sky-stack-tower`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 4; written this session: sky-stack-tower-diff, sky-PK-stack-tower, sky-stack-tower-best, sky-stack-tower-tut; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-stack-tower-best
- Session 1: start tap centre; reached play: true; game overs 3; score 4 to 2 (max 4)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 22 blocks · +10 coins Best 0 blocks · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 2" | session 2: "Easy Normal Hard LVL 1 ████░ · coins 9 · ★ 1 stars Daily: reach 22 blocks · +10 coins Best 4 blocks · LVL 1 · ★ 1 · coins 9 ☀ Daily: reach 2"

### Swim Dodge (`sky-swim-dodge`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 4; written this session: sky-swim-dodge-tut, sky-swim-dodge-diff, sky-PK-swim-dodge, sky-swim-dodge-best; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-swim-dodge-best
- Session 1: start tap centre; reached play: true; game overs 2; score 10 to 22 (max 22)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 100 m · +10 coins Best 0 m · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 100 m → +1" | session 2: "Easy Normal Hard LVL 2 ███░░ · coins 0 · ★ 1 stars Daily: reach 100 m · +10 coins Best 22 m · LVL 2 · ★ 1 · coins 0 ☀ Daily: reach 100 m → +"

### Turret Defense (`sky-turret-defense`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, stars, daily, cosmetics; sinks cosmetics fed by levels/stars/daily/currency
- localStorage keys: 4; written this session: sky-PK-turret-defense, sky-turret-defense-best, sky-turret-defense-diff, sky-turret-defense-tut; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-turret-defense-best
- Session 1: start tap centre; reached play: true; game overs 1; score 2 to 2 (max 2)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 100 kills · +10 coins Best 0 kills · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 10" | session 2: "Easy Normal Hard LVL 2 █░░░░ · coins 16 · ★ 1 stars Daily: reach 100 kills · +10 coins Best 12 kills · LVL 2 · ★ 1 · coins 16 ☀ Daily: reach"

### Traffic Run (`sky-traffic-run`): P3

- Why: progress persists (levels, stars, currency, daily, cosmetics); systems seen: levels, unlocks, stars, goals, daily, cosmetics; sinks unlocks/cosmetics fed by levels/stars/goals/daily/currency
- localStorage keys: 4; written this session: sky-PK-traffic-run, sky-traffic-run-best, sky-traffic-run-tut, sky-traffic-run-diff; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): sky-traffic-run-best
- Session 1: start tap centre; reached play: true; game overs 3; score 95 to 115 (max 115)
- Title, session 1: "Easy Normal Hard LVL 1 █░░░░ · coins 0 · ★ 0 stars Daily: reach 50 cars · +10 coins Best 0 cars · LVL 1 · ★ 0 · coins 0 ☀ Daily: reach 50 ca" | session 2: "Easy Normal Hard LVL 6 █░░░░ · coins 225 · ★ 7 stars Daily: done today ✓ Best 115 cars · LVL 6 · ★ 7 · coins 225 Daily challenge ✓ done toda"

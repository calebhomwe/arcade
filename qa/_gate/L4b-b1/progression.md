# Progression check

Generated 2026-10-02T19:59:18.870Z. 8 games. **P0 0, P1 0, P2 3, P3 5.**

P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.

"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game's own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.

| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |
|--:|---|---|---|---|---|---|---|
| 1 | Rhyme Time (`hub-rhyme-time`) | **P2** | levels | starts from saved state (title shows it) | levels(SD), stars(SD), goals(S), daily(SD) | - | achievements |
| 2 | Hangman (`hub-hangman`) | **P2** | levels, currency | starts from saved state | levels(S), stars(SD), goals(D), achievements(SD), daily(SD) | - | - |
| 3 | Spell & Say (`hub-spell-and-say`) | **P2** | levels | starts from saved state (title shows it) | levels(SD), unlocks(SD), stars(SD), goals(S), achievements(SD), daily(SD) | - | - |
| 4 | Math Blast (`hub-math-blast`) | **P3** | levels, stars, currency, goals, daily, save data | starts from saved state (title shows it) | levels(S), unlocks(D), stars(SD), goals(S), daily(SD) | - | achievements |
| 5 | Math Run (`hub-math-run`) | **P3** | levels, stars, currency, goals, daily | starts from saved state (title shows it) | levels(S), unlocks(D), stars(SD), goals(S), daily(SD) | upgrades | achievements |
| 6 | Farm Harvest (`hub-farm-harvest`) | **P3** | levels, stars, currency, unlocks, upgrades, goals, achievements, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(SD), upgrades(SD), stars(S), goals(SD), achievements(SD), daily(SD), cosmetics(S) | - | - |
| 7 | Farm Idle Tycoon (`hub-farm-idle`) | **P3** | levels, stars, currency, unlocks, upgrades, goals, achievements, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(SD), upgrades(SD), stars(S), goals(SD), achievements(SD), daily(SD), cosmetics(S) | - | - |
| 8 | Tap Monsters (`hub-tap-monsters`) | **P3** | levels, stars, currency, unlocks, upgrades, goals, achievements, daily, cosmetics | starts from saved state (title shows it) | levels(SD), unlocks(SD), upgrades(SD), stars(S), goals(SD), achievements(SD), daily(SD), cosmetics(S) | - | - |

(?) = the bot did not reach play, so persistence after real play was not measured.

## Evidence per game

### Rhyme Time (`hub-rhyme-time`): P2

- Why: progress persists (levels) with levels, stars, goals, daily
- localStorage keys: 5; written this session: rt_muted, rt_tut, rt_progress; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): rt_best, rt_beststreak, rt_progress
- Session 1: start #btnStart; reached play: true; game overs 0; no score reported
- Title, session 1: "← Hub 🔊 🎤 RHYME TIME A word appears — type a word that RHYMES with it before the bar empties. Keep the chain alive on the beat. 🎧 THE BEA" | session 2: "← Hub 🔇 🎤 RHYME TIME A word appears — type a word that RHYMES with it before the bar empties. Keep the chain alive on the beat. 🎧 THE BEA"

### Hangman (`hub-hangman`): P2

- Why: progress persists (levels, currency) with levels, stars, goals, achievements, daily
- localStorage keys: 5; written this session: hg_progress, hg_tut, hg_stats_v1; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): hg_best, hg_stats_v1, hg_progress
- Session 1: start .cat-btn[data-cat=animals]; reached play: true; game overs 0; no score reported
- Title, session 1: "← Hub 🔊 🪢 HANGMAN Guess the hidden word letter by letter. 7 wrong guesses and the hangman is complete! Fewer mistakes = more points. CHOOS" | session 2: "← Hub 🔊 🪢 HANGMAN Guess the hidden word letter by letter. 7 wrong guesses and the hangman is complete! Fewer mistakes = more points. CHOOS"

### Spell & Say (`hub-spell-and-say`): P2

- Why: progress persists (levels) with levels, unlocks, stars, goals, achievements, daily
- localStorage keys: 5; written this session: ss_tut, ss_muted, ss_progress; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): ss_best, ss_words, ss_xp, ss_progress
- Session 1: start #btnPlay; reached play: true; game overs 0; no score reported
- Title, session 1: "🍎 ⭐ 🌙 ← Hub 🔊 🗣️ SPELL & SAY Listen to the spoken word, then spell it with the on-screen keyboard. 3 mistakes and it's game over! 🏆 Bes" | session 2: "🍎 ⭐ 🌙 ← Hub 🔇 🗣️ SPELL & SAY Listen to the spoken word, then spell it with the on-screen keyboard. 3 mistakes and it's game over! 🏆 Bes"

### Math Blast (`hub-math-blast`): P3

- Why: progress persists (levels, stars, currency, goals, daily, save-blob); systems seen: levels, unlocks, stars, goals, daily; sinks unlocks fed by levels/stars/goals/daily/currency
- localStorage keys: 8; written this session: mathBlastGoldAll, mb_tut, mathBlastMuted, mathBlastPerfect, mathBlastOp, mathBlastReport, mathBlastProg, mathBlastDaily; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): mathBlastBest, mathBlastProg, mathBlastReport
- Session 1: start #playBtn; reached play: true; game overs 0; no score reported
- Title, session 1: "← Hub 🔊 🫧 MATH BLAST 10 ÷ 2 = ? Score 0 Combo ×1 🔥 ×0 ⏱ 60 🫧 Math Blast Pop the bubble with the correct answer before it floats away! St" | session 2: "← Hub 🔇 🫧 MATH BLAST 7 − 1 = ? Score 0 Combo ×1 🔥 ×0 ⏱ 60 🫧 Math Blast Pop the bubble with the correct answer before it floats away! Str"

### Math Run (`hub-math-run`): P3

- Why: progress persists (levels, stars, currency, goals, daily); systems seen: levels, unlocks, stars, goals, daily; sinks unlocks fed by levels/stars/goals/daily/currency
- localStorage keys: 5; written this session: mathRunMuted, mr_tut, mathRunReport, mathRunDaily, mathRunProg; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): mathRunBest, mathRunProg, mathRunReport
- Session 1: start #playBtn; reached play: true; game overs 0; no score reported
- Title, session 1: "← Hub 🔊 🏃 MATH RUN 3 × 4 = ? Score 0 Streak ×1 ❤️❤️❤️ – 💎 0 Speed 1.0 🏃 Math Run Swipe or tap a lane to run through the correct answer g" | session 2: "← Hub 🔊 🏃 MATH RUN 3 × 4 = ? Score 0 Streak ×1 ❤️❤️❤️ – 💎 0 Speed 1.0 🏃 Math Run Swipe or tap a lane to run through the correct answer g"

### Farm Harvest (`hub-farm-harvest`): P3

- Why: progress persists (levels, stars, currency, unlocks, upgrades, goals, achievements, daily, cosmetics); systems seen: levels, unlocks, upgrades, stars, goals, achievements, daily, cosmetics; sinks unlocks/upgrades/cosmetics fed by levels/stars/goals/achievements/daily/currency
- localStorage keys: 4; written this session: farmHarvestSave_v2, fh_muted, ik_coach_farm-harvest, farm-harvest_prog; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): farmHarvestSave_v2
- Session 1: start #btnPlay; reached play: true; game overs 0; score 0 to 0 (max 0)
- Title, session 1: "1 Level 0/10 XP 30 Level 1 farmer 0/24 Your daily gift is waiting Free coins, every day Badges 0/16 Harvest 0 ready Plant all 4 · 8 Water al" | session 2: "1 Level 0/10 XP 22 Level 1 farmer 0/24 Your daily gift is waiting Free coins, every day Goals today 0/3 · Streak 1 · Badges 0/16 Harvest 4 r"

### Farm Idle Tycoon (`hub-farm-idle`): P3

- Why: progress persists (levels, stars, currency, unlocks, upgrades, goals, achievements, daily, cosmetics); systems seen: levels, unlocks, upgrades, stars, goals, achievements, daily, cosmetics; sinks unlocks/upgrades/cosmetics fed by levels/stars/goals/achievements/daily/currency
- localStorage keys: 4; written this session: ik_coach_farm-idle, fi_muted, farmIdleSave_v2, farm-idle_prog; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): farmIdleSave_v2
- Session 1: start #btnPlay; reached play: true; game overs 0; score 0 to 9 (max 9)
- Title, session 1: "1 Level 0/8 XP 0 0/s Build your first Wheat Field 15 coins · tap the cow to earn Badges 0/20 · Upgrades at level 2 +XP ×1 ×10 ×25 MAX Wheat " | session 2: "1 Level 0/8 XP 9 0/s Build your first Wheat Field 15 coins · tap the cow to earn Goals today 0/3 · Streak 1 · Goals tab at level 3 · Badges "

### Tap Monsters (`hub-tap-monsters`): P3

- Why: progress persists (levels, stars, currency, unlocks, upgrades, goals, achievements, daily, cosmetics); systems seen: levels, unlocks, upgrades, stars, goals, achievements, daily, cosmetics; sinks unlocks/upgrades/cosmetics fed by levels/stars/goals/achievements/daily/currency
- localStorage keys: 3; written this session: ik_coach_tap-monsters, tm_state, tap-monsters_prog; IndexedDB: none; cookies: 0
- Declared save keys (qa meta): tm_state
- Session 1: start #btnPlay; reached play: true; game overs 0; score 0 to 0 (max 0)
- Title, session 1: "1 Level 0/8 XP 0 0 dmg/s Build your first Kitty 15 gold · tap the monster to earn Badges 0/20 · Upgrades at level 2 +XP ×1 ×10 ×25 MAX Kitty" | session 2: "1 Level 0/8 XP 0 0 dmg/s Build your first Kitty 15 gold · tap the monster to earn Goals today 0/3 · Streak 1 · Goals tab at level 3 · Badges"

# Survivor Wave - game wiki

> "Pick a hero card, then press FIGHT. Your weapons fire on their own." A 2D canvas horde survivor: move,
> dodge, collect XP gems, pick a card at every level-up, and last 10 minutes (`runGoal=600`) to clear the stage.

| | |
| --- | --- |
| Status | playable through the portal (`play.html?g=survivor-wave`); local cabinet `SurvivorWave/index.html` (one 18,200-line HTML file, 19 inline scripts) |
| Play | https://calebhomwe.github.io/arcade/play.html?g=survivor-wave, or `python3 -m http.server 8800` then `http://localhost:8800/play.html?g=survivor-wave` |
| Platforms | desktop keyboard: verified by the harness (`default`, `storm`); touch: virtual joystick verified by the harness `mobile` run (390x844, touch drags through CDP); gamepad: code present (`gamepad: true` in `assets/game-meta.json`), not verified |
| Engine | vanilla canvas 2D, inline JS, `assets/arcade-sdk.js` for pause / mute / scenes |
| Save | about 20 `localStorage` keys, all prefixed `survivor` (`survivorBest2`, `survivorGold`, `survivorMeta`, `survivorHero`, `survivorAchievements`, `survivorPerks`, `survivorChapters`, `survivorDaily`, `survivorMissions`, ...) plus `siop`; a version key `survivorSaveVer` and a JSON validator that drops corrupt keys (`SAVE_VER` / `SAVE_JSON_KEYS`, index.html:1247-1290). Blocked storage: crashed at boot before this programme's fix (below); now plays unsaved |
| Harness | `node qa/harness/play.mjs --game survivor-wave [--mode ...]`; CI job `harness` in `.github/workflows/playtest.yml` (matrix entry `survivor-wave`: default, mobile, storage-blocked) |

## How to play
Read from the input code, not from the how-to text.

| Action | Desktop | Touch | Evidence |
| --- | --- | --- | --- |
| Start from the title | `FIGHT` button, or Space / Enter | tap `FIGHT` | index.html:476, 2443 |
| Move | WASD or arrow keys | drag anywhere: a virtual joystick from the touch-down point | 3891-3901, `tStart`/`tMove` 2455-2490 |
| Dash | Space (while playing) | lightning button | `tryDash()` 1616, key 2431 |
| Ultimate | R | ULT button | `tryUlt()` 1634 |
| Turrets | T place, G cycle type, F upgrade | build bar | 2435-2439, `placeTurret()` 2716 |
| Mortar strike | Q | - | `mortarStrike()` 2790 |
| Pause | P (Esc opens the arcade SDK menu in the portal); window blur pauses | pause button | `togglePause()` 3020, blur 2451 |
| Level-up pick | click a card in `#lvlChoices` | tap a card | 552, `state='levelup'` 5522 |

Weapons fire on their own; the player only positions. Time from Play to first control: the harness's portal
load of this cabinet (`load1`) is quoted in the Stability table.

## Core loop
Every ~10 seconds: zombies close in from the edges, the auto-weapons kill them, each kill drops an XP gem
(`gems`) and adds `10+min(combo,50)` to `score` (index.html:3687); walking over gems fills the XP bar; a full
bar sets `state='levelup'` and freezes the run on three cards (new weapon, upgrade or passive); chests
(`state='chest'`) give a free pick. Per run: minute 0-2 is a trickle of slow walkers; the director raises
`difficulty=1+gameTime/26` every frame (3215) so by minute 5 elites and the dusk swarm arrive (`gameTime>=300`,
3221); a boss gauntlet runs on a timetable ("Spud 2:30 · Burrito 3:30 · Peel 5:00 ..." 17898); at 10:00
`victory()` fires (3219). Dying shows the death screen with time, kills, level, score, best and gold.

## Structure (screens and states)
`state` (top-level `let`, index.html:1712) is the phase owner: `ready` (title `#start`) -> `play` -> `levelup` /
`chest` (modal picks) -> `play` -> `paused` (`#pause`) -> `play` | `ready` (HUB button `pQuit`, 13849) ->
`over` (`#over`, `gameOver()` 2876) or `win` (`#win`, `victory()` 2926) -> `play` via `Try Again` / `Run It
Back` / `∞ ENDLESS MODE` (13839). Title has hero cards, difficulty (Casual / Normal / Nightmare), PERIL mode,
daily challenge, Armory (gold upgrades), achievements and missions. Nothing unreachable was found by the
harness; the harness drives `ready -> play -> levelup/chest -> play` and restarts by reload when an episode
times out before death (a 10-minute run cannot finish inside a 45 s episode).

## Progression
- Within a run: `difficulty=(1+gameTime/26)` (3215) scales spawns; elites, bosses on a timetable, the dusk
  swarm at 5:00, and XP levels (`player.level`, `xpForLevel()` 5406-5412) with a card each.
- Across runs: gold (`goldEarned()` 1353) is banked at death or win and spent in the Armory (`metaLv`:
  vitality, agility, ...; read at 1081 and in `startGame()` 2519-2530); heroes, perks, chapters, missions,
  achievements, a lifetime record and a daily challenge all persist (keys above). This is a full meta loop.
- Harness evidence: see Stability; the progression signals are `score`, `kills` and `time` (`gameTime`).

## Win / lose / fail
- Lose: HP reaches 0 -> `gameOver()` (2876): `sfx('lose')`, music stops, death screen with `finTime`,
  `finKills`, `finLevel`, `finScore`, `finBest`, `finGold`, `NEW BEST` badge, optional `REVIVE — 150` gold.
  Back in: `Try Again` (514) or the pause menu's HUB.
- Win: survive `runGoal` seconds (600; 150 in the "steamroll" variant, 2694) -> `victory()`: +2000 score,
  `Run It Back` or `∞ ENDLESS MODE`.

## Scoring and economy
- In-run HUD score: `score+=10+Math.min(player.combo,50)` per kill (3687).
- Final score (death screen and best): `kills*12 + level*50 + gameTime*8 + elites*200 + bosses*1000`
  (`finalScore()` 3012); +2000 on a win.
- Gold: `floor((kills*0.40 + elites*26 + bosses*130 + level*7 + gameTime*0.55) * goldMul)` (1353).
- Sinks: Armory levels, revive (150 gold), rerolls. A run with cheat codes on never replaces the best
  (`!swCheated()`, 2887).
- Nothing in these formulas can go negative; NaN is checked by the harness every tick (no NaN seen; see
  Stability). The fault `nan-score` proves that check fires.

## Juice inventory
| Event | Visual FX | SFX | Music | Camera / shake | UI / text pop | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| hit / damage taken | red flash (`redFlash`) | ✔ `buzz` | - | ✔ shake | HP bar | 1718, 2068 |
| kill / score | particles, corpses, decals | ✔ (`pop`, `boom`) | - | ✔ shake on elites, 40 ms hit-stop (`hitStopT`) | floaters, kills pulse | 3657, 3693, 13818 |
| pickup / coin | gem pull | ✔ `coin` | - | - | XP bar | `sfx('coin')` x8 |
| level up / unlock | card modal | ✔ `levelup`, `evofanfare` | - | - | cards, EVO label | `sfx('levelup')` x10 |
| boss down | white flash | ✔ `bossdeath` | boss theme (Music) | ✔ shake 14, hit-stop 0.12 | `BOSS DOWN!` floater | 3693-3699, 6717 |
| death / run end | overlay | ✔ `lose` / `win` | music stops | - | NEW BEST badge | 2876-2905 |
| menu / button press | - | ✔ `tap`, `tick` | title music | - | - | `sfx('tap')` x16 |
| phone | - | - | - | haptics `navigator.vibrate` (setting) | - | `buzz()` 1798 |
Reduced motion turns shake and flash off (1794).

## Stability (harness results)
| Mode | Result | Episodes: end phase, start presses, seconds | Progression (first -> max) | Page errors | Stuck | Restart | fps samples | Heap MB (first -> last) | Load (1/5/15 min) | Commit, finished (UTC) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | PASS | ep0 playing p1 33s; ep1 playing p1 30s (reload+start); ep2 playing p2 33s (reload+start) | score 0->11, kills 0->1, time 0->6; score 0->0, kills 0->0, time 0->2; score 0->0, kills 0->0, time 0->3 | 0 | no | ok, ok | 2,16,0,13,1,0,0,1 | 7 -> 7 | 14.02 14.59 16.30 | ec9b637, 03:13:21 |
| mobile | PASS | ep0 playing p1 36s | score 0->23, kills 0->2, time 0->4 | 0 | no | - | 1,4,17 | 8 -> 8 | 12.78 16.32 15.07 | 62ea79f, 02:31:31 |
| storm | PASS | ep0 playing p1 34s | score 0->11, kills 0->1, time 0->3 | 0 | no | - | - | 8 -> 8 | 13.37 15.61 14.89 | 62ea79f, 02:32:37 |
| resize | PASS | ep0 playing p1 30s | score 0->23, kills 0->2, time 0->3 | 0 | no | - | 4,1 | 8 -> 8 | 15.48 15.87 15.04 | 62ea79f, 02:33:40 |
| blur | PASS | ep0 playing p1 34s | score 0->11, kills 0->1, time 0->3 | 0 | no | - | - | 7 -> 7 | 15.66 14.87 16.27 | ec9b637, 03:14:29 |
| storage-blocked | PASS | ep0 playing p1 33s | score 0->11, kills 0->1, time 0->2 | 0 | no | - | 1,1,2 | 8 -> 8 | 16.91 15.76 15.06 | 62ea79f, 02:35:49 |
| long | PASS | ep0 playing p1 180s | score 0->138, kills 0->10, time 0->22 | 0 | no | - | 10,1,17,9,0,11,1,17,1,1,1,0,1,1,1,1,1 | 8 -> 8 | 12.43 14.61 14.81 | b827933, 02:39:22 |

How to read this: every run went through the portal on SwiftShader, one at a time, on a 4-CPU box shared with
other agents (load column). With its full effects the game rendered 0-1 fps there (first `default` run, 02:29
UTC, load 17: the game clock advanced 1-4 s per 30 s episode and the third episode tripped the 15 s stuck
check because nothing moved at all). That is a load artefact, not evidence either way, so from the `storm` run
on the profile turns on the game's own Low effects setting (`settings.lowFx`, index.html:1784, 13855) and
`default` was re-run; `mobile` (full effects) and `storage-blocked` (storage cannot hold the setting, so full
effects) are kept as run. The first `blur` run failed only because the harness checked for "playing" at tick
15 while the game sat in the pause its own blur handler opens (index.html:2451); the check was fixed in
`b827933` and the mode re-run. The game also caps its time step at 0.05 s (index.html:13806), so a 10-minute
run cannot reach `gameOver()` or `victory()` inside these episodes: death, win, `Try Again` and `Run It Back`
are verified from code only. Storage-blocked: before the fix this mode failed with 339 page errors and no start
(probe in the fix commit `1b51705`).

## Scorecard
| Axis | Score (0-5) | Evidence |
| --- | --- | --- |
| Sense | 4 | Weapons fire on their own, so the only decision (move) is clear at once; the HUD shows the run clock (index.html:12655), XP bar (12585) and an HP bar over the hero once hurt (12262-12268), the level-up modal explains every card, floaters name events ("BOSS DOWN!", 3699), and the SDK hint says "Survive m:ss more ..." (18118-18123). The harness, moving only, got kills in every mode. Not 5: the two different scores (HUD vs death screen) muddle "what I earned". |
| Structure | 3 | Title (hero, difficulty, PERIL, Armory) -> FIGHT -> play -> level-up / chest modals -> pause (own overlay, P, window blur) -> death or win screen -> Try Again / Run It Back / Endless (index.html:450-708, 2876-2935, 13839-13849). The harness started on the first press in every mode, resumed the blur pause and storm pauses (4 resumes in `storm`) and restarted by reload; death and win screens were not reached (10-minute runs, time-step cap), so end -> restart is code-verified only. |
| Progression | 5 | In-run curve observed: `level` 1 -> 2 with a card picked and `kills` 0 -> 10 in the 180 s run; `difficulty=1+gameTime/26` (3215) and a boss timetable (17898) ramp the run; gold from `goldEarned()` (1353) buys Armory levels that change the next run's HP and speed (`metaHp=25*vitality`, `baseSpd=210*(1+0.05*agility)`, 2523-2525), plus heroes, missions, achievements and a daily challenge that persist. |
| Juice | 4 | Hits: shake, red flash, `buzz`; kills: particles, floaters, 40 ms hit-stop (13818); bosses: white flash, shake 14, `bossdeath`; level-ups: `levelup` / `evofanfare`; music per phase; phone haptics (1798). 16 distinct SFX names in the file. Not 5: not verified that the layers never obscure play (no visual review beyond end-of-episode screenshots). |
| Stability | 4 | All seven modes PASS after the documented harness fixes: 0 page errors, no stuck run, heap 7-8 MB flat; blocked storage crashed the game before `1b51705` (339 page errors, no start). Not 5: 0-17 fps at load 12-17, and the game clock moved only 2-22 s per run, so only the first minute of play was exercised. |

**Verdict: SHIP** (rule: every axis >= 3 and Stability >= 4), with the caveat that on this box the game ran at
0-17 fps and its clock advanced only 2-22 s per run, so the harness exercised the first minute of a 10-minute run;
death, win and restart from the end screens are code-verified only.

## Gaps and next steps
1. **Keep the cabinet in step with its source repo** (M). The blocked-storage crash fixed here had already been
   fixed in `survivor-wave` (8732c53) but never copied to `SurvivorWave/`; a check that diffs each cabinet
   against its source build would have caught it. A player with site data blocked got a game that never started.
2. **Very low frame rate on software rendering** (M to profile). Every harness run measured 0-10 fps on
   SwiftShader under box load 9-20; that number is not evidence by itself (shared 4-CPU box), but the 2D canvas
   with particles, decals and corpses is heavy enough that a weak phone may suffer. Measure on a real phone.
3. **The harness never reaches the end screen** (S). A 10-minute run cannot die or win inside a 30-180 s episode
   with a dodging policy, so `gameOver()` -> `Try Again` is verified from code only. A test-only "end run"
   hook (the game already has cheat codes such as `GODMODE`) would let the harness observe the full loop.
4. **Two different scores** (S, design decision). The HUD `score` (+10 per kill plus combo) and the death
   screen's `finalScore()` (kills x12 + level x50 + time x8 + elites + bosses) are different numbers for the
   same run; a player cannot tell which one is "the score".
5. **One 18,200-line HTML file with 19 inline scripts and many patch layers** (`B0xx`, `KSC-*`,
   `FUN-PATCH-*`) (L, owner decision). Every fix is a needle in a haystack; splitting into modules is a
   refactor this programme did not attempt.

## Changelog of this programme's commits
- `1b51705` Survivor Wave cabinet: boot and finish a run when localStorage is blocked (port of survivor-wave 8732c53; probe below).
- `9e8610c` Chili Firm cabinet: boot when localStorage access throws (port of chili-firm2 a9bfc51).
- `2b107b7` Add `qa/harness/play.mjs` (sweep + four profiles, readiness-aware start, portal Play retry, faults); `lib/common.mjs` Chromium fallback; `harness-out/` ignored.
- `0d8af5e` CI: `harness` job in `.github/workflows/playtest.yml` (four-game matrix: default, mobile, storage-blocked).
- `62ea79f` Harness follow-up: bounded fps sample under the SDK pause, SDK-pause-aware state and resume, re-start after storm exits, long mode keeps playing across runs, tighter sweep timeouts (its message also lists the portal Play retry, which actually landed in `2b107b7`).
- `b827933` Harness follow-up: blur-aware start check, explicit fail when three presses never start a run, Survivor Wave played on its own Low effects setting, Chili Firm mission index recorded.
- `9c4e18f` Harness: The Long Way Home's phone policy steers with touch drags (the ship follows `touchmove`).
- `8ae0280` Harness: Chili Firm's policy taps story dialogues on; the SDK pause is a legal phase for it. Its message says the letter hid every pot on a phone; the re-run disproved that (the letter was read and still nothing planted) and the 03:30 probe found the real cause, a 390x150 game frame.
- `300050e` Harness: the Chili Firm policy no longer closes the Market before pressing Sell all (no run had sold anything).
- `effc193` Harness: the Chili Firm policy closes celebration cards. Its message blames a card for the stuck 180 s run; that is not confirmed: the page also ran at 0 fps for about 70 s at load 24.6 in that run.
- `ec9b637` Harness: faults match the served path; the `hub-no-play` fault had never been applied (its first run passed, exit 0) because `play.html` is always requested with `?g=<id>`.
- `0b69626` Harness: the third start press is a DOM click (an intermittent lost restart in the exact-text CI rehearsal).
- `7842da7` CI: `chili-firm` left out of the `harness` matrix (its phone run cannot plant a pot; frame 390x150 at 390x844).
- this wiki and the README link: the commit that adds `docs/GAME_WIKI.md` and `docs/wiki/`.

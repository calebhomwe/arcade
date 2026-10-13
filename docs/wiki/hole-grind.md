# Hole Grind - game wiki

> "Pick a district and press DROP IN. Drag anywhere to steer the hole; it swallows things smaller than itself."
> A 3D (three.js, toon-shaded Kenney city) hole-swallowing game: 90-second runs, grow from coins and cones up
> to towers, fill the district quota, bank coins for upgrades and new districts.

| | |
| --- | --- |
| Status | playable through the portal (`play.html?g=hole-grind`); local cabinet `HoleGrind/index.html` (module script, `hole3d.js`, `gk.js`, vendored three.js, `models/`, `tex/`) |
| Play | https://calebhomwe.github.io/arcade/play.html?g=hole-grind, or `python3 -m http.server 8800` then `http://localhost:8800/play.html?g=hole-grind` |
| Platforms | desktop keyboard: verified by the harness (`default`); mouse-hold steering: code read only (index.html:296, 615); touch: verified by the harness `mobile` run (taps at four points around the centre of a 390x844 frame, `touchMap` in the harness; the hole rolls toward a held or tapped finger); gamepad: none in code |
| Engine | three.js 3D (WebGL), SwiftShader in every harness run |
| Save | `localStorage["holegrind.save.v2"]`: coins, xp, best, runs, totalScore, upgrade levels, unlocked districts, cleared, stars (index.html:200-236); a corrupt JSON falls back to a fresh save (`catch(e){ save = FRESH(); }`, 233); writes are wrapped and skipped while cheat codes are on (`persist()`, 235-238). Also `holegrind.gfx`, `holegrind.tut`. Blocked storage: plays unsaved (harness `storage-blocked`) |
| Harness | `node qa/harness/play.mjs --game hole-grind [--mode ...]`; reads the game's own `window.__DEBUG.state` (index.html:1143-1170); CI job `harness` in `.github/workflows/playtest.yml` |

## How to play
| Action | Desktop | Touch | Evidence |
| --- | --- | --- | --- |
| Start | `DROP IN` on the district hub | tap `DROP IN` | index.html:108, `beginRun()` 416 |
| Steer | WASD or arrow keys (a target 400 px ahead) | hold a finger; the hole rolls toward it | `playerInput()` 604-616, touch 300-301 |
| Steer (mouse) | hold the button; the hole rolls toward the pointer | - | 296, 615 |
| Pause | Esc without the portal; inside the portal P / Esc open the arcade SDK menu | pause button top right | 290-292, `togglePause()` 972 |
| Hub | `◀ ▶` district picker, UPGRADES, HOLES (skins), DROP IN | same | `renderHub()`, 989 |

The first run shows a coach card ("steer"); the run clock does not tick until the player has steered
(`if(tut!==1 && !R.demo) R.timeLeft -= dt;`, 654).

## Core loop
Every ~10 seconds: steer toward clusters of props smaller than the hole (`obj.r < hole.r`, `EAT_RATIO=1.00`,
152), swallow them for mass (radius grows area-linearly, `r = sqrt(BASE^2 + mass*GROW)`), and dodge rival
holes that are bigger than you. Growing past a tier shows "NOW YOU CAN SWALLOW TREES/CARS/..." (674). Per run:
start the size of a cone, eat benches and trees by mid-run as a wave of bigger props lands every 12 s
("WAVE n — BIGGER PREY", 680-685), swallow a smaller rival for a big bonus ("RIVAL SWALLOWED", 594-595), and
the run ends when the 90 s clock (+6 s per OVERTIME level) hits zero or a bigger rival swallows you.

## Structure (screens and states)
`R` owns the run: `R.on`, `R.demo`, `R.paused`, `R.over` (309, 432). Screens are `.layer` divs: `#hub`
(district hub with a live autopilot demo run behind it, `startDemo()`), play (no layer), `#pause` (RESUME /
ABANDON RUN, 127-132), `#over` (summary, `btnAgain`, `btnHub`, 114-123). Flow: hub -> `beginRun()` -> play ->
pause -> play | over (`endRun("time")` or `endRun("swallowed")`, 459) -> again (new run) | hub. Five districts
(SUBURB, DOWNTOWN, HARBOUR, SKYLINE, THE VOID, 169-180), an upgrades panel, a skins panel, a graphics toggle
and a save wipe (1137-1140). No dead end found by the harness.

## Progression
- Within a run: tiers of prey (coin 5 px ... tower 80 px, `TIERS` 157-166) open up as the hole grows; waves
  every 12 s drop props up to `1+floor(wave*0.7)` tiers higher (680-684); rivals are sized from your mass so
  they keep pace (`rivalScale()`); the quota is `25000*2.8^district` (482).
- Across runs: coins (`floor(score*0.075*mult*(1+greed*0.18))`, 466) buy six upgrades (WIDE MOUTH, SLIPSTREAM,
  OVERTIME, GRAVITY WELL, GREED, DIGESTION; costs `120*1.55^i` and up, 183-196) and unlock districts (900,
  4,500, 18,000, 60,000 coins); stars at 0.5x / 1x / 1.8x the quota per district (`STAR_AT`, 181); player level
  `1+floor(sqrt(xp/900))` (239); skins through `PROG`. Each purchase changes the next run (start radius, speed,
  run time, pull, coin rate, mass gain).
- Harness evidence: signals `score` and `holeMass`; see Stability.

## Win / lose / fail
- Time up: `endRun("time")` -> `#over` with coins, XP, NEW BEST, quota cleared or not, stars; `sfx("win")`
  when cleared or a best, else `sfx("reward")` (475).
- Swallowed by a bigger rival: `endRun("swallowed")` (592) -> same screen, `sfx("lose")`.
- Back in: `btnAgain` (another run in the same district) or `btnHub`.

## Scoring and economy
- Swallow: `R.score += round(p.m * 4 * DISTRICTS[d].mult)` (523); district multipliers 1.00 / 1.35 / 1.75 /
  2.30 / 3.20.
- Rival swallowed: `R.score += round(small.mass * 6 * mult)` (594).
- Run end: coins `floor(score*0.075*mult*(1+greed*0.18))`, xp `floor(score*0.25*mult)` (466-467).
- Sinks: upgrades (geometric cost), districts (fixed cost), skins. Coins cannot go negative (`buyUpgrade`
  refuses when `save.coins<cost`, 1025). The harness checks `score` and `holeMass` for NaN every tick; the
  fault `nan-score` rewrites line 523 to prove that check fails the run.

## Juice inventory
| Event | Visual FX | SFX | Music | Camera / shake | UI / text pop | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| swallow a prop | particle burst sized by tier (`W3.burst`) | ✔ (throttled by `sfxT`) | - | ✔ `R.shake` up to 9 | hole squash | 488, 525 |
| grow a tier | blue burst, `R.pulse` | ✔ `levelup` | - | - | "NOW YOU CAN SWALLOW ..." toast | 674-675 |
| wave | props drop in (`p.drop`) | ✔ `whoosh` | - | - | "WAVE n — BIGGER PREY" | 685 |
| rival swallowed | white burst | ✔ `explode` | - | ✔ shake 10 | "RIVAL SWALLOWED" | 591-595 |
| run end | summary, confetti on stars / best | ✔ `win` / `reward` / `lose` | - | - | NEW BEST, stars | 475, 1054 |
| buy / unlock | confetti on unlock | ✔ `powerup`, `unlock`, `error` | - | - | toasts | 1025-1026, 1062-1063 |
| menu | - | ✔ `tap` | - | - | - | 989, 1079 |
Sound goes through `ArcadeSDK.sfx` (`sfx=n=>SDK.sfx(n)`, 213); with no SDK there is no sound. No music.
Reduced motion turns the shake off (525, 595).

## Stability (harness results)
| Mode | Result | Episodes: end phase, start presses, seconds | Progression (first -> max) | Page errors | Stuck | Restart | fps samples | Heap MB (first -> last) | Load (1/5/15 min) | Commit, finished (UTC) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | PASS | ep0 playing p1 30s; ep1 playing p1 31s (reload+start); ep2 playing p1 31s (reload+start) | score 0->128, holeMass 0->32; score 8->144, holeMass 2->36; score 0->136, holeMass 0->34 | 0 | no | ok, ok | 4,4,9,9,8,12,10,8 | 16 -> 16 | 9.77 15.50 16.90 | ec9b637, 03:10:52 |
| mobile | PASS | ep0 playing p1 30s | score 0->224, holeMass 0->56 | 0 | no | - | 9,11 | 16 -> 16 | 11.30 10.89 12.02 | 9e8610c, 02:16:15 |
| storm | PASS | ep0 playing p1 32s | score 0->32, holeMass 0->8 | 0 | no | - | 6,3 | 16 -> 16 | 20.99 19.28 18.11 | effc193, 03:07:54 |
| resize | PASS | ep0 playing p1 32s | score 0->128, holeMass 0->32 | 0 | no | - | 14,9,11 | 16 -> 16 | 13.31 13.39 12.75 | 0d8af5e, 02:21:34 |
| blur | PASS | ep0 playing p1 30s | score 0->112, holeMass 0->28 | 0 | no | - | 3,9 | 17 -> 17 | 19.19 15.17 13.42 | 0d8af5e, 02:22:44 |
| storage-blocked | PASS | ep0 playing p1 31s | score 0->128, holeMass 0->32 | 0 | no | - | 5,9,8 | 16 -> 16 | 18.78 15.78 13.75 | 0d8af5e, 02:23:52 |
| long | PASS | ep0 playing p1 180s | score 0->2584, holeMass 0->646 | 0 | no | - | 4,7,3,9,4,8,7,5,9,2,5,7,8,9,9,9,7 | 17 -> 13 | 19.71 17.20 14.71 | 0d8af5e, 02:27:29 |

How to read this: every run went through the portal (`play.html?g=hole-grind`) on SwiftShader, one at a time,
on a 4-CPU box shared with other agents (load column). fps samples are frames per second inside the game frame
and say more about the box than the game. Harness revisions: the first `default` run (02:15 UTC) lost its third
episode to a harness bug (the portal's pulsing Play under a profile toast; fixed in `2b107b7`, then re-run), and
the first `storm` run hung inside an fps sample while storm input had the game on the arcade SDK's pause sheet
(fixed in `62ea79f`, then re-run); neither was a game fault. Both first reports are kept out of the table.
The run never reached its end screen in any mode, the 180 s `long` run included: the game caps its time step at
0.05 s (`const dt=Math.min(0.05,...)`, index.html:958), so at 2-9 fps the 90 s run clock advanced several
times slower than the wall clock. End screen and `Again` are therefore verified from code only.

**Fault proof** (the harness must be able to fail):


| Command | Result | Exit | Load | Commit, finished (UTC) |
| --- | --- | --- | --- | --- |
| `node qa/harness/play.mjs --game hole-grind --episodes 1 --secs 40 --fault nan-score` (line 523 becomes `R.score += undefined + ...` as it is served) | FAIL: non-finite value (`score is NaN`), NaN on screen (HUD text "... 84 1 NaN x1.00 ...") | 1 | 17.26 | 300050e, 03:03:49 |
| the same command without `--fault` | PASS: `score` 0 -> 152, `holeMass` 0 -> 38 | 0 | 15.91 | effc193, 03:05:14 |
| `node qa/harness/play.mjs --game hole-grind --episodes 1 --secs 20 --fault hub-no-play` (`play.html` served without `id="playbtn"`) | FAIL: page error `Cannot read properties of null (reading 'addEventListener')` from the portal script, Play never visible | 1 | 11.70 | ec9b637, 03:20:55 |

The first `hub-no-play` run (03:06, before `ec9b637`) passed with exit 0: its route pattern never matched `play.html?g=...`, so the fault was not applied. That is the harness bug the second run proves fixed; it is why every fault is run, not assumed.

## Scorecard
| Axis | Score (0-5) | Evidence |
| --- | --- | --- |
| Sense | 4 | The run HUD names every number that matters: clock chip (red at 10 s), score with a bump, quota bar with the three star marks, hole size and "Next: car at 26" with a progress bar (`updateHud()`, index.html:895-915); the hub shows the district's three goals (992); the harness raised `score` within 30 s on its first press in every mode. Not 5: the rival danger is only learned by being swallowed. |
| Structure | 3 | Hub -> DROP IN -> run -> pause (RESUME / ABANDON RUN) -> end screen (`btnAgain` / `btnHub`) is all in code (index.html:103-132, 459-476, 1059-1066), the harness started on the first press in all seven modes and restarted by reload + start, but it never reached the end screen (time-step cap, see Stability), so end -> again is code-verified only; 4 would need that path and the district / upgrade panels exercised. |
| Progression | 4 | Designed in-run curve the harness watched advance: `holeMass` 0 -> 646 and `score` 0 -> 2,584 in the 180 s run while prey tiers (157-166) and 12 s waves (680-685) open up; persistent coins, six upgrades that change the next run (start radius `startMass()` 318-320, run time `RUN_TIME + 6 s per OVERTIME` 431), five districts and stars (183-200, 466). Not 5: no run ended, so the harness never saw coins banked or a purchase carried into a run. |
| Juice | 4 | Swallow: tier-sized particle burst + throttled SFX + shake (488, 525); tier-up toast + `levelup` + burst (674-675); rival: white burst + `explode` + shake 10 (591-595); score bump; confetti on unlock / best (1054, 1062). Not 5: no music, and every sound depends on the arcade SDK (213). |
| Stability | 4 | All seven modes PASS (table above): 0 page errors, no stuck run, `score` and `holeMass` rose in every episode, heap flat (17 -> 13 MB over 180 s), and the `nan-score` fault turns the same run red (exit 1). Not 5: 2-14 fps on SwiftShader at load 9-21, under 30. |

**Verdict: SHIP** (rule: every axis >= 3 and Stability >= 4). The weakest axis is Structure: the end screen and
restart are proven only by reading the code, because no run on this box got through its 90 s clock.

## Gaps and next steps
1. **No music, and no sound at all outside the portal** (S-M). Every SFX goes through `ArcadeSDK.sfx`; opened
   standalone the game is silent, and inside the portal there is no music bed.
2. **Loading cover blocks the first press** (S). DROP IN is visible under "LOADING THE CITY…" while
   `models/city.glb` loads; a press in that window is lost silently (the harness had to wait for `ready`).
   Disabling the button, or showing progress on it, until `ready` would make the first press always count.
3. **Rivals can swallow a careless player in seconds in later districts** (not verified: the harness only
   played SUBURB, the one unlocked district on a fresh save). Worth a playtest of DOWNTOWN and up.
4. **Upgrades are invisible in the run** (S). The run HUD does not say which upgrades are active, so a bought
   OVERTIME or GREED is only felt, not shown.

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

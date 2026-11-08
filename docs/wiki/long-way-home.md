# The Long Way Home - game wiki

> "Eleven thousand light years out, with a cracked hull and no navigator. Every ring you pass asks you
> something. You answer with your flight path." A three.js learning flyer for ages 5-11: each ring carries an
> answer to the question on the paper card; fly through the right one. A leg is 12 questions (6 words in the
> spelling legs) and lasts about two to four minutes.

| | |
| --- | --- |
| Status | playable through the portal (`play.html?g=long-way-home`, category Learning); local cabinet `SpellMathsGalaxy/index.html` (one module script, vendored three.js + post-processing) copied from the `spellmathsgalaxy` repo |
| Play | https://calebhomwe.github.io/arcade/play.html?g=long-way-home, or `python3 -m http.server 8800` then `http://localhost:8800/play.html?g=long-way-home` |
| Platforms | desktop mouse aiming: verified by the harness (`default`, pointer moved to where the ship crosses the correct ring); touch: the harness `mobile` run (390x844) steers with short touch drags that end on the aim point, because the ship follows `touchmove` (index.html:5165-5166); arrows / WASD: code read only (index.html:5255-5258); gamepad: none |
| Engine | three.js 3D with an EffectComposer grain pass; SwiftShader in every harness run |
| Save | through a guarded wrapper `store.get/set` (try/catch, index.html:4232-4233): `tlwh_rec` (runs, best, marks, best by leg), `tlwh_pk` (level, xp, coins, stars, unlocks, daily), `tlwh_learn` (progress report), `tlwh_gfx`, `tlwh_snd`, `tlwh_tut`. Blocked storage: plays unsaved (harness `storage-blocked`) |
| Harness | `node qa/harness/play.mjs --game long-way-home [--mode ...]`; reads the game's own test hook `window.__tlwh_debug.state()` (index.html:5411, written for its `tools/playtest.py`); CI job `harness` in `.github/workflows/playtest.yml` |

## How to play
| Action | Desktop | Touch | Evidence |
| --- | --- | --- | --- |
| Pick age band | Cadet (5-7) / Pilot (7-9, default) / Master (9-11) | tap | index.html:219-221 |
| Pick a leg | Arithmetic Run, Ballast Trim, Instrument Check, Signal Repair, Scrambled Beacon, The Long Haul | tap | `data-play` 225-235 |
| Steer | mouse position, or arrows / WASD | drag | `aim()` 5163-5166, keys 5255-5258 |
| Kit | 1 Drift, 2 Clear (removes wrong rings), 3 Patch (+1 hull) | DRIFT / CLEAR / PATCH buttons | `useKit()` 5066-5084, keys 5168 |
| Spell a whole word | type the letters, Enter | TYPE WORD opens the keyboard | `typer` 5180-5204, letters 5205-5220 |
| Pause | Esc, or Space between rings | - | `hold()` 5220-5222 |
| Sound | M | Sound button | `toggleSnd()` 5155 |

## Core loop
Every ~10 seconds: read the card (`#ask`, e.g. a sum, a "load to 10" bond, a true/false reading, or a clue
sentence with a missing letter), see two to four rings drift in from `spawnZ=-320`, and steer through the one
with the right answer. Right: `+100 x (1+floor(run/3))` to the Flight Log, a streak counter ("RUN x2"), a
salvage kit item every 5 in a row, and the ship speeds up (`state.target+4`). Wrong: hull -1, the correct
answer is shown ("= 12") with a one-line teaching hint, the miss is banked for the end-of-leg review card, and
the ship slows (`resolve()` 5003-5056). Per leg: questions step up a tier every four answers inside the chosen
age band (`ramp=floor(q/4)`, 4968-4969); the leg ends after 12 questions (6 words), or when the hull reaches 0.

## Structure (screens and states)
Screens are `.screen.on` divs: `#s-menu` (hangar: age band, six legs, Flight Log, For Grown-ups report, How
to Fly, graphics, sound) -> run (no screen; HUD) -> `#s-pause` (`hold()`) -> run | menu -> `#s-end`
(`endRun()` 5100-5135: title "Not a Scratch" / "Made It" / "Adrift", marks, stats, the missed-answer review, the
learning report) -> `Fly it again` (`#again`, 288) | `Return to hangar` (`#menu2`, 289). `state.running` and `state.paused` (4921) are the
phase owners. The Long Haul is endless (`total=9999`) and ends only on hull 0. No dead end found.

## Progression
- Within a leg: question tier ramps every 4 answers (`LK.tier`, 4968); ship speed target rises 4 with every
  right answer and falls 14 on a miss (5018, 5045); streak multiplier `1+floor(run/3)`.
- Across legs: marks (0-3 per leg: 3 = made it with the hull intact) become stars and XP (`PK.xp+=marks*15`,
  `PK.level=1+floor(xp/120)`, 5106-5107); hull colours unlock from coins (`HULLS` costs 0 / 60 / 150 / 300,
  4237); best per leg, stamps (`STAMPS`, 5138) and a daily goal; the learning report (`LK`) tracks accuracy
  per skill for a grown-up.
- Harness evidence: signals `score`, `q`, `dist`; see Stability.

## Win / lose / fail
- Made it: `q >= total` -> `endRun(true)`: "Made It", or "Not a Scratch" with 3 marks if the hull is 3;
  `AU.arrive()` chord.
- Adrift: hull 0 -> `endRun(false)`: "Adrift", `AU.bad()`.
- Both show the missed answers with their hints before "Fly it again".

## Scoring and economy
- Right answer: `gain=100*m`, `m=1+floor(run/3)` (5015-5016). Wrong: no points, hull -1 (5028).
- Marks: 3 if made it with hull 3, 2 if made it, 1 if at least half right, else 0 (5104).
- XP `marks*15`; level `1+floor(xp/120)`; coins and stars via `PK`. Nothing can go negative; the harness
  checks NaN every tick, and the fault `nan-score` rewrites line 5012 to prove the check fails the run.

## Juice inventory
| Event | Visual FX | SFX | Music | Camera / shake | UI / text pop | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| right answer | particle scatter in cream / ochre | ✔ `AU.good(run)` (rises with the streak) | ambience | - | "+200", "RUN x2" cries | 5017-5021 |
| wrong answer | rust scatter, red screen jolt, colour drains (`strain`) | ✔ `AU.bad()` | - | ✔ `state.shake` | "= answer" + hint | 5030-5045 |
| word restored | big scatter | ✔ `AU.arrive()` | - | - | "WORD — RESTORED" | 5051-5054 |
| ring spawn | - | ✔ `AU.pass()` | - | - | - | 4999 |
| kit use | - | ✔ notes | - | - | "DRIFT", "LANES CLEARED", "HULL PATCHED" | 5066-5084 |
| leg end | end card | ✔ arrive / bad | - | - | marks stars, review card | 5100-5135 |
Reduced motion turns the jolt and shake off (`RM.matches`).

## Benchmark: the zone standard
Checked against `progress-dashboard/docs/LEARNING_ZONE_BENCHMARK.md` for the arcade cabinet.

| # | Standard | Fit | Evidence |
| --- | --- | --- | --- |
| Z1 | Plays within 3 s, no login, keyboard + mouse + touch | ~ | no login; first ring needs a leg pick; harness `load1` is quoted in Stability (well over 3 s on SwiftShader) |
| Z2 | Controls box and How to play before play | ✔ | hangar line "Steer · mouse, drag or arrows · 1 2 3 · kit · H · hint · M · sound" (index.html:244-246) and a How to Fly panel |
| Z3 | Goal line on the first screen | ✔ | "Every ring you pass asks you something. You answer with your flight path." (index.html:215-216) and one line per leg (225-235) |
| Z4 | Play Again in one tap + back to menu | ✔ | `#again` "Fly it again" (288) and `#menu2` "Return to hangar" (289) on `#s-end` |
| Z5 | Persistent best on the menu, safe when storage is blocked | ✔ | `LVL · XP · stars · coins · Daily` line and Flight Log best by leg; `store` wrapper is try/catch (4232) |
| Z6 | Levels or a visible difficulty ladder | ~ | age bands and tiers exist, but the tier step inside a leg is not shown to the player |
| Z7 | Correct answer shown after a miss, with sound and motion | ✔ | `cry('= '+answer)`, hint in `#note`, `AU.bad()`, jolt (5030-5045) |
| Z8 | Curriculum-shaped content selectable by level | ~ | three age bands and six legs; no times-table or year-group picker |
| Z9 | Skills tags on the page and the hub tile | ✘ | none in `catalog.js` / `game-meta.json` |
| Z10 | Fullscreen button | ✔ | the portal's play page has fullscreen (F) for every game; the game itself has none |
| Z11 | Kid-safe: no outbound links, ads, chat | ✔ | none found in the file |
| Z12 | Pause, and blur pauses | ✔ | `hold()` (5220); tab-away holds through the arcade SDK (5158-5161) |
| Z13 | 2-5 minute run with a reason to replay | ✔ | 12 questions per leg; marks, stars, best by leg |
| Z14 | Hub tile with tagline, skills tags, "you might also like" | ~ | tile and tagline yes, "Up next" rail yes, skills tags no |

**Benchmark fit: 9/14 met, 4 partly** (Z9 missing). Changes belong in the `spellmathsgalaxy` source repo and are
then copied here; this pass did not change the cabinet.

## Stability (harness results)
| Mode | Result | Episodes: end phase, start presses, seconds | Progression (first -> max) | Page errors | Stuck | Restart | fps samples | Heap MB (first -> last) | Load (1/5/15 min) | Commit, finished (UTC) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | PASS | ep0 playing p1 32s; ep1 playing p1 30s (reload+start); ep2 playing p1 32s (reload+start) | score 0->0, q 0->0, dist 0.3->6.3; score 0->0, q 0->0, dist 0.2->5.6; score 0->0, q 0->0, dist 0.2->5.2 | 0 | no | ok, ok | 5,6,4,4,5,4,6,4 | 13 -> 13 | 15.16 14.40 14.64 | b827933, 02:42:21 |
| mobile | PASS | ep0 playing p1 34s | score 0->0, q 0->0, dist 0.3->6 | 0 | no | - | 7,2,6 | 12 -> 12 | 17.43 15.03 14.83 | b827933, 02:43:30 |
| storm | PASS | ep0 playing p1 30s | score 0->0, q 0->0, dist 0.2->3.5 | 0 | no | - | 1,2 | 12 -> 12 | 17.35 15.59 15.04 | b827933, 02:44:38 |
| resize | PASS | ep0 playing p1 33s | score 0->0, q 0->0, dist 0.1->5.1 | 0 | no | - | 7,16,4 | 12 -> 12 | 15.71 15.50 15.05 | b827933, 02:45:47 |
| blur | PASS | ep0 playing p1 32s | score 0->0, q 0->0, dist 0.2->6.2 | 0 | no | - | 5,6,1 | 15 -> 15 | 15.18 15.32 15.02 | b827933, 02:46:53 |
| storage-blocked | PASS | ep0 playing p1 32s | score 0->0, q 0->0, dist 0.4->5.6 | 0 | no | - | 6,6,5 | 15 -> 15 | 18.05 16.05 15.29 | b827933, 02:48:00 |
| long | PASS | ep0 playing p1 181s | score 0->400, q 0->3, dist 0.1->21.5 | 0 | no | - | 2,3,5,2,2,3,3,3,4,3,1,1,2,1,5,3,2,3 | 15 -> 11 | 21.01 18.99 16.63 | b827933, 02:51:35 |

How to read this: every run went through the portal on SwiftShader, one at a time, under box load 15-21. At
1-7 fps, with the 0.05 s step cap (index.html:5245), the ship met a ring about once a minute of wall time (3 in the
180 s run), so the six 30 s runs passed on `dist` alone (the ship flew, nothing errored, nothing stuck) without answering a question; only the 180 s
`long` run reached rings: 3 questions, 3 right, score 0 -> 400, hull 3 of 3, heap 15 -> 11 MB. The phone run
steered with touch drags (`touchmove`, index.html:5165-5166). The end card was never reached in any run.

## Scorecard
| Axis | Score (0-5) | Evidence |
| --- | --- | --- |
| Sense | 4 | The card states the question (`#ask`), each ring carries one answer, a wrong ring shows "= answer" and a one-line hint and banks the miss for the end card (index.html:4960-5045); the hangar states the goal (215-216) and the controls (244-246). In the 180 s run the harness, aiming at the right ring, answered 3 of 3 with the hull intact. Not 5: the tier step inside a leg is never shown. |
| Structure | 3 | Hangar (age band, six legs, report, sound, graphics) -> leg -> pause `#s-pause` (Resume transit / Abandon leg) -> end card `#s-end` (Fly it again / Return to hangar), all in code (209-290, `hold()` 5220, `endRun()` 5100). The harness started on the first press in all seven modes, but the end card was never reached: at 1-7 fps with the 0.05 s step cap (5245) a 12-question leg takes many minutes of wall time, so end -> again is code-verified only. |
| Progression | 3 | In-leg ramp: one tier step every four answers inside the age band (`ramp=floor(q/4)`, 4968-4969) and a streak multiplier; persistent marks, stars, XP and level, best per leg, stamps and hull colours (4234-4246, 5100-5135). Not 4: the tiers are invisible to the player and the harness's 3 answers never reached a tier step; nothing earned changes the next leg (hull colours are cosmetic, the kit resets every leg, 5092-5094). |
| Juice | 4 | Right: cream/ochre scatter, `AU.good(run)` rising with the streak, "+100" and "RUN x2" cries (5017-5021); wrong: red jolt, colour drain, shake, `AU.bad()`, "= answer" (5030-5045); word restored: big scatter and the `arrive` chord (5051-5054); ambience during a leg. Not 5: not reviewed visually beyond end-of-episode screenshots. |
| Stability | 4 | All seven modes PASS: 0 page errors, no stuck run, heap 15 -> 11 MB over 180 s. The six 30 s runs reached no ring (only `dist` moved); the 180 s run answered 3 of 3. Not 5: 1-16 fps at load 15-21. |

**Verdict: SHIP** (rule: every axis >= 3 and Stability >= 4), narrowly: Structure and Progression sit at 3, the end
card was never reached by the harness, and only one run answered questions (3 of 3). Benchmark fit: 9/14 met, 4 partly.

## Gaps and next steps
1. **Zone standard gaps** (Z6, Z8, Z9): show the tier step inside a leg (M), a times-table / year-group picker
   (M), skills tags in the catalogue and on the tile (S). Change them in the `spellmathsgalaxy` source repo
   and copy the build here.
2. **Touch steering is drag-only** (S). Only `pointermove` and `touchmove` call `aim()` (index.html:5164-5166);
   no tap handler aims the ship. The harness steers with drags; a young child who taps a ring gets no response
   (code reading, not tried on a phone). A tap-to-steer
   target would suit small children better.
3. **Load time** (M). The hangar is hidden behind `#boot` until three.js compiles the scene; on SwiftShader
   the harness waited several seconds (Z1 asks for 3 s). Not measured on a phone.
4. **Cabinet drift** (S). `SpellMathsGalaxy/` is a copy of the source repo; there is no check that it is the
   latest build.

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

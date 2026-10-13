# Chili Firm 2: Replanted - game wiki

> "Grow the heat. Build the empire." A DOM idle / tycoon farm: tap pots to plant, water and harvest chilli
> strains, sell at a market price that swings by the day, hire a crew, buy upgrades, land and side businesses,
> and follow Tito Scorch and Abuela Rosa's letter through 15 story missions. There is no end screen.

| | |
| --- | --- |
| Status | playable through the portal (`play.html?g=chili-firm`, category Idle); local cabinet `ChiliFirm/` (index.html + 14 IIFE modules under `js/`, audio under `audio/`) |
| Play | https://calebhomwe.github.io/arcade/play.html?g=chili-firm, or `python3 -m http.server 8800` then `http://localhost:8800/play.html?g=chili-firm` |
| Platforms | desktop mouse clicks: verified by the harness (`default`, `long`); touch: **fails** at 390x844 through the portal (the game frame is 390x150 and taps on the 16x21 px pots plant nothing; probe in Gaps); keyboard shortcuts (1-9 strains, Space main button): code read only (`js/ui/ui.js:859-865`); gamepad: none |
| Engine | DOM + CSS + inline SVG art (`js/ui/art.js`), Web Animations for juice, Web Audio + MP3 files |
| Save | `localStorage["chili_firm2_save"]` (version 3, `js/core/state.js:7-8`), written every 15 s, on tab hide and on unload (`js/main.js:49, 103, 108-109`); a compact mirror `chili_career_v1` for the portal; volume in `audio.js`. Load is wrapped (`loadState` returns null on a missing store or a bad read, `js/core/state.js:111-115`). Blocked storage: crashed at boot before this programme's fix (below); now plays unsaved |
| Harness | `node qa/harness/play.mjs --game chili-firm [--mode ...]`; reads `window.CF.state` and `CF.ui.started` (the game's own globals, `js/main.js:41`, `js/ui/ui.js:889`); not in the CI `harness` matrix until the phone run passes |

## How to play
| Action | Desktop | Touch | Evidence |
| --- | --- | --- | --- |
| Start | `PLAY` on the title, a click anywhere on it, or Enter / Space | tap | `js/ui/ui.js:593, 607, 846-849, 859` |
| Plant / water / harvest | click a pot: empty -> plant the selected strain; growing -> water (2x growth for 60 s); ripe -> harvest | tap, or swipe across a row | `onPointerDown`, `Logic.plant/water/harvest` (`js/core/logic.js:111-146`) |
| Main button | Space | big button at the bottom: HARVEST / PLANT ALL / WATER ALL / SELL ALL | `#mainbtn`, `js/ui/ui.js:237, 274` |
| Sell | Market dock button -> Sell 10 / Sell all | same | `js/ui/panels.js:80-81, 117` |
| Spend | Seeds, Crew, Upgrade, Empire dock buttons | same | `js/ui/ui.js:193-194` |
| Game speed | 1x / 2x / 4x button | same | `js/ui/ui.js:643` |
| Pause | none of its own; the arcade SDK pause (P, or the round button) freezes timers | same | `scan.ownPause: false` in `assets/game-meta.json` |

## Core loop
Every ~10 seconds: tap empty pots to plant Jalapeños (45 s to grow, `js/core/defs.js:12`), tap growing ones
to water them, harvest ripe ones (2+ chillies each), and press SELL ALL when the coach says so; money buys
the next strain (Serrano at $200, Cayenne at $800, ... Carolina Reaper at $100,000), a Farmhand ($120,
automates the pots), upgrades and land. A day passes every 20 real seconds (`DAY_SECONDS=20`, `defs.js:8`):
reputation drifts up, the market multiplier swings (`marketMult()` `logic.js:77-82`, 0.6x to 1.5x), events
(festival, pests) and contracts roll. Per session the story missions (Read the Letter -> Plant Your First
Chili -> First Harvest -> Market Day -> Hiring Help -> ... -> The Empire, `js/story/story.js:13-250`) set the
next goal; the farm keeps earning offline (`processOffline()`, `logic.js:674`).

## Structure (screens and states)
`#title` (z-index 90) -> farm (`CF.ui.started=true`, `ui.js:607`) with the dock, panels (`#panel-root`:
Seeds, Market, Crew, Upgrade, Empire, settings with save export / import / wipe), dialogue (`#dlg`), story
celebrations (`#celebrate`) and rooms (left / right arrows). The simulation ticks from boot, even behind the
title (`loop()` in `js/main.js:88-104`). There is no run end, no game over and no restart; the "restart" is the
wipe-save action (`confirm-reset` -> `reset`, `ui.js:661-672`). The harness therefore restarts an episode by
reloading the page and pressing PLAY again.

## Progression
- Within a session: costs and prices climb per strain (value 2 -> 380, grow 45 s -> 1,800 s), the market
  swings daily, story missions gate businesses (Jerky, Fashion, Mining, Media), the crew automates the loop.
- Across sessions: everything persists in `chili_firm2_save` (money, rep, day, plots, inventory, workers,
  upgrades, businesses, research, missions, achievements) plus offline earnings. This is a full idle meta loop.
- Harness evidence: signals `planted`, `harvested`, `sold` (`CF.state.stats`); see Stability.

## Win / lose / fail
None. There is no failure state: plots wilt to half yield if left ripe for 1.5x their grow time
(`logic.js:624-627`), a failed contract costs 30 reputation (`logic.js:462-466`), and pests block growth until
treated. The story ends at mission 15 ("The Empire"); play continues after it.

## Scoring and economy
- Sale: `money = n * price`, `price = value * (1 + 0.12*greenhouse) * marketMult(day) * repValueBonus`
  (`logic.js:86-91, 147-163`); reputation `+0.5` per chilli sold.
- Harvest yield: `round((2 + fertilizer) * (1 + 0.2*foremen) * (1 + 0.12*soil))`, minimum 1, halved when
  wilted (`logic.js:96-103, 131-136`).
- Sinks: strains, workers (Farmhand $120 ... Brand Manager $8,000), six upgrades (`costBase * costGrow^level`),
  land, research, businesses. `spend()` refuses when money is short (`logic.js:43-48`), so money cannot go
  negative; `sellStrain` rejects a non-finite quantity (`logic.js:148`). The fault `nan-money` rewrites the
  sale line to prove the harness catches a NaN.

## Juice inventory
| Event | Visual FX | SFX | Music | Camera / shake | UI / text pop | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| plant / water | leaf burst | ✔ `plant`, `water` | theme | - | toast | `FX.burst` (12 uses in `ui.js`), `sfx().plant/water` |
| harvest | burst + number pop (`FX.burst`, `FX.num`) | ✔ `harvest` (pluck.mp3) | - | - | "+n x strain" | `js/ui/juice.js:32-104`, `audio.js:197` |
| sell / cash | coins fly to the cash pill (`FX.fly`), counter tween | ✔ `cash` (register.mp3) + a `coin` tick per coin | - | - | "+$n" pop (`FX.num`) | `cashFx()` `ui.js:330-336`, `audio.js:197` |
| event / new land | - | ✔ `event` | - | ✔ `FX.shake` | toast | `ui.js:693, 813` |
| unlock / level | ring burst, celebration card | ✔ `fanfare`, `levelup`, `ach` | rush track | - | achievement bar | `sfx().fanfare` x6 |
| story beat | dialogue portrait | ✔ voice lines (`tito_01..09.mp3`) | - | - | typed dialogue | `audio/vo/`, `ui.js:394-442` |
| error / can't afford | - | ✔ `error` | - | - | toast | `sfx().error` x4 |
| menu / button press | - | ✔ `click` | - | - | - | `sfx().click` x9 |
`juice.js` caps live particles at 90 and honours reduced motion (`juice.js:10-12`).

## Stability (harness results)
| Mode | Result | Episodes: end phase, start presses, seconds | Progression (first -> max) | Page errors | Stuck | Restart | fps samples | Heap MB (first -> last) | Load (1/5/15 min) | Commit, finished (UTC) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | PASS | ep0 playing p1 30s; ep1 playing p1 32s (reload+start); ep2 playing p1 30s (reload+start) | planted 0->12, harvested 0->0, sold 0->0; planted 12->13, harvested 0->2, sold 0->0; planted 13->22, harvested 2->26, sold 0->0 | 0 | no | ok, ok | 35,0,0,0,1,1,5 | 7 -> 7 | 16.23 17.77 16.50 | b827933, 02:53:55 |
| mobile | FAIL: no progression (no progression signal moved: planted,harvested,sold) | ep0 playing p1 30s | planted 0->0, harvested 0->0, sold 0->0 | 0 | no | - | 1,0 | 6 -> 6 | 16.81 15.30 16.32 | ec9b637, 03:15:33 |
| storm | PASS | ep0 playing p1 36s | planted 0->1, harvested 0->0, sold 0->0 | 0 | no | - | 34,0,0 | 7 -> 7 | 19.86 16.46 16.64 | ec9b637, 03:16:47 |
| resize | PASS | ep0 playing p1 32s | planted 0->8, harvested 0->0, sold 0->0 | 0 | no | - | 3,1,1 | 7 -> 7 | 22.26 20.09 17.63 | 9c4e18f, 02:57:15 |
| blur | PASS | ep0 playing p1 30s | planted 0->12, harvested 0->0, sold 0->0 | 0 | no | - | 1,3 | 7 -> 7 | 15.99 18.62 17.27 | 8ae0280, 02:58:15 |
| storage-blocked | PASS | ep0 playing p1 30s | planted 0->12, harvested 0->0, sold 0->0 | 0 | no | - | 27,0 | 6 -> 6 | 16.71 18.31 17.25 | 8ae0280, 02:59:16 |
| long | PASS | ep0 playing p1 180s | planted 0->61, harvested 0->98, sold 0->96 | 0 | no | - | 14,0,1,1,0,1,1,1,10,12,2,0,4,3,2,2,15 | 7 -> 8 | 12.53 15.66 16.41 | ec9b637, 03:20:20 |

How to read this: every run went through the portal on SwiftShader, one at a time, under box load 15-23. The game
has no end screen, so every episode after the first restarts by reload + PLAY; the save carried over each reload
in `default` (episode 2 started with 12 pots planted; money 120 -> 220 -> 270 and story mission 2 -> 3 across the
three episodes). **The 390x844 touch run planted nothing in all three attempts**: the first one before the
harness learned to read the first-run letter (`#dlg`) on, the re-run after it (`8ae0280`; the letter was read, mission
0 -> 1, then 12 empty pots for the rest of the run), and the CI rehearsal. A probe then found why: through the portal the
game frame is 390x150 px at that screen size, the pots shrink to about 16x21 px under an SVG that is not part of the
pot, and neither a touch tap nor a click plants (Gaps, item 1). The first
`storm` run tripped the harness's own phase table (the SDK pause sheet was not yet a legal phase for this
idle game). Both were harness gaps, both modes were re-run, and the first reports are kept out of the table.
`sold` stayed 0 in the runs before `300050e`: the policy opened the Market and then its own "close any open panel"
rule shut it on the next tick, before the Sell all press (a harness bug, fixed in `300050e`); runs after it are
marked in the table by their finish time. Storage-blocked: before the fix this mode failed with a page error and no PLAY button
(probe in the fix commit `9e8610c`).
The CI rehearsal (exact step text, the full Chrome binary instead of the headless shell, 03:22 UTC, load 14.6) also
lost the second `default` episode: after the reload, three presses on PLAY did not start the farm. The same thing
happened to Hole Grind's rehearsal (03:27), so it is the harness, not the game; the likely cause (not confirmed) is a portal toast that can
sit over the frame on a repeat visit and swallow coordinate clicks. The third press is now a DOM click (`GAME.startSel`, see Changelog).

## Scorecard
| Axis | Score (0-5) | Evidence |
| --- | --- | --- |
| Sense | 4 | Tito's coach says the next step in the game's own words ("Tap a pot to plant!", "Tap a growing plant to water it", "Now hit SELL ALL", `js/ui/ui.js:84-97`), the big button always names the next useful action (HARVEST / PLANT ALL / WATER ALL / SELL ALL, 237), and logs, tickers and number pops say what was earned. The harness planted all 12 pots within its first 30 s episode. Not 5: the economy (market swings, strain values) is learned from text, not play. |
| Structure | 1 | A loop exists (title -> farm, panels, rooms) but end and restart are unreachable: there is no run end, no game over and no session summary, and the only "restart" is wiping the save (`confirm-reset` -> `reset`, `ui.js:661-672`); pause exists only through the arcade SDK. The harness can only restart an episode by reloading the page. |
| Progression | 5 | Designed curve the harness watched advance: story mission 0 -> 3 ("Read the Letter", "Plant Your First Chili", "First Harvest", `js/story/story.js:13-250`) and day 1 -> 5 across three reloads, with money (120 -> 220 -> 270) and stats carried over each reload; persistent upgrades and crew change every later session (yield `round((2+fertilizer)*(1+0.2*foremen)*(1+0.12*soil))`, `js/core/logic.js:96-103`; Farmhands automate the pots, 629-636; offline earnings, 674). |
| Juice | 4 | Plant / water: leaf burst + `plant` / `water`; harvest: burst, number pop + `harvest` (pluck.mp3); sell: coins fly to the cash pill with a `coin` tick each + `cash` (register.mp3) + "+$n" (`cashFx()`, `ui.js:330-336`); events and new land: `FX.shake` (693, 813); story beats: voiced Tito lines (`audio/vo/`); theme and rush music. Not 5: not reviewed visually beyond end-of-episode screenshots. |
| Stability | 2 | Six modes PASS with 0 page errors (default, storm, resize, blur, storage-blocked, and long on re-run: planted 0 -> 61, harvested 0 -> 98, sold 0 -> 96), but `mobile` failed in all three runs: at 390x844 the portal frame is 390x150 and no pot can be planted. Mobile not clean is below the rubric's 3. Blocked storage crashed the game before `9e8610c`. |

**Verdict: RETHINK** (rule: Structure <= 1). The farm loop, the feedback and the progression are strong; what is
missing is design, not a bug: a session never ends, nothing summarises it, and the only restart is wiping the
save. A day or chapter report screen with "next goal" and "keep going" would lift Structure without changing the
idle loop.

## Gaps and next steps
1. **Unplayable in the portal on a phone-sized screen** (M, overlaps open PR #7 "mobile framing"). A probe at
   390x844 touch (03:30 UTC) found the play page gives the game frame only 390x150 px; the farm scales to fit, the
   pots become about 16x21 px, `document.elementFromPoint` over every pot centre returns an SVG that is not part of
   the pot, and neither a touchscreen tap nor an element click planted anything (planted 0 -> 0). The harness's
   phone run failed the same way three times. Survivor Wave, Hole Grind and The Long Way Home still played in that
   strip; this farm does not. Fixing the frame height (PR #7) is the first step; then re-run `--mode mobile`.
2. **No end, no fail, no restart** (design decision, owner). Structure scores low by the rubric because the run
   never ends; the only restart is wiping the save. An idle game can still have a "day report" or chapter end
   screen that closes a session with a summary and a reason to come back.
3. **No pause of its own** (S). It relies on the arcade SDK; opened standalone it never pauses, and the farm
   keeps ageing on a hidden tab until the save fires.
4. **The farm runs behind the title screen** (S). `loop()` ticks from boot, so days pass before PLAY (the
   harness saw day 2 on the title in a blocked-storage run).
5. **Cabinet drift** (M). This cabinet is a different code line from the `chili-firm2` repo (it has the
   expansions and the career mirror); the blocked-storage fix had to be ported by hand. Decide which one is
   the source.

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

# Handoff: Caleb's Arcade (state as of 2026-10-01)

For the next agent (or person) picking this up. Everything here was checked against the repos and live site on 2026-10-01 unless marked **not verified**. `main` has had commits from other sessions since (look at `git log`): check whether an item below is already done before redoing it.

## The goal
Caleb's little sister plays the arcade on an iPhone. Her verdict on the old version: some games work; Claire's Big Life "stays fixed on one angle and doesn't look appealing"; others "don't work, freeze, look super lame and poor". Caleb wants to review the result in a YouTube video, so it must be genuinely good and honestly described. Caleb's target look is the rich, warm-lit, textured look of his key art (`calebs_farm/ref_01..04.png` in the `claires-big-life-adventure` repo), **not** flat cartoon with thick outlines. Games also need real progression (levels, unlocks, daily goals, a reason to come back), not just a loop.

## Where things live
Live site: <https://calebhomwe.github.io/arcade/> (iPhone list: `?view=iphone`, profile Trophy Room: `?view=trophies`). GitHub Pages deploys from `main`; a deploy takes a few minutes (the arcade one is slowest), so check a file such as `assets/profile-core.js` returns 200 before testing the live site.

| Repo (calebhomwe/) | What it holds | Games in catalog |
|---|---|---|
| `arcade` | portal (`index.html`, `play.html`, `assets/site.js`, `assets/arcade-sdk.js`, `assets/profile-*.js`), local games (one folder each), Godot builds, all harnesses and QA | 41 local |
| `arcade-hub` | "Pocket Arcade": single-file games in `games/*.html` plus shared kits in `games/kit/` and assets in `games/assets/` | 37 |
| `neon-game-arcade` (default branch `master`) | neon games, `games/skywalker-playables/*` (sky-* games), `games/kit3d/` | 25 |
| `playables` | Crowd Clash, Bridge Rush, Helix Drop, Rung Runner, Snake Clash, Volt Dash (three.js, `lib3d/`) | 6 |
| `bloxburg-town` | one game | 1 |
| `html-games` | older copies of some hub games; only mirror there if the copies were byte-identical | n/a |

The portal never hosts external games: `catalog.js` points `src` at `https://calebhomwe.github.io/<repo>/...` and the play page embeds it in an iframe. So **a game change goes live when its own repo's `main` deploys**, not when `arcade` does.

`catalog.js`, `assets/game-meta.json`, `sitemap.xml` and the game counts in `index.html`/`play.html`/`manifest.webmanifest`/`README.txt` are **generated**. After adding, removing or retitling a game, or editing `qa/standard/meta/<id>.json`, run:

```
python3 tools/game_meta.py && python3 tools/build_catalog.py
```

The harnesses read `assets/game-meta.json` (not the per-game meta file directly), so forgetting this makes tests tap the wrong place. `tools/inject_sdk.py` puts the arcade SDK (and the Godot pixel-density shim) into local games; run it after re-exporting a Godot build.

## How to run and test
Clone `arcade` and the sibling repos **next to each other** (the harness maps `https://calebhomwe.github.io/<repo>/` to `../<repo>/`). Serve the parent folder: `cd <parent> && python3 -m http.server 8765`; games open at `http://localhost:8765/arcade/<Folder>/index.html`.

Harnesses (all in `qa/harness/`, Playwright, `npm i` there first; read `qa/harness/README.md` and `HEALTH.md`):
- `standard.mjs` the 25-check game standard (`GAME_IDS=a,b REPORT_DIR=...`).
- `iphone.mjs` does it load, fit a 390x844 touch screen, and start on a tap. `ENGINE=webkit` for the Safari engine.
- `sdk-test.mjs` the SDK and rotate-card tests. `profile-test.mjs` the profile layer.
- `health.mjs` and `progression.mjs` freeze/stall/jank/leak and progression grades. Results in `qa/health-results/`; ranked list in `docs/HEALTH_REPORT.md`.
- CI on a PR runs `playtest (0-3)`, `check (0-7)`, `sdk`, `diagnostic`; it takes about 25 minutes and a shard has a 25-minute timeout.

Playbooks for look, feel, progression and iPhone reliability, with tested snippets and demos: `docs/playbook/` (`LOOK.md`, `LOOK_REALISTIC.md`, `FEEL.md`, `PROGRESSION.md`, `IPHONE.md`, `VIDEO_NOTES.md`). Progression design: `docs/PROGRESSION.md`.

## What was done in this round
- **Portal profile layer** (no game changes needed): 50 levels, daily streak with a rest day, 3 daily quests, 57 badges, cosmetics, Trophy Room, export/import code, all on-device (no accounts, leaderboards or purchases; break nudges). SDK additions: `ArcadeSDK.profile.*`, input heartbeats, a "Play anyway" button on the turn-sideways card, 44 px pause button and a theme API for the pause sheet.
- **Rebuilt games** with progression and a warmer look: kids/learning (Balloon Bust, Word Fishing, Math Miner, Word Dungeon, Quiz Tower; hub Whack-a-Mole, Memory Match, Bubble Pop, Simon Says, Word Scramble), 3D (Hole Grind, Helix Smash, Stack Ball, Hole Swallow, Crowd Clash, Bridge Rush), action (Flappy Flight, Dino Dash, Knife Hit, Brick Breaker, Snake, SurvivIO, Survivor Wave load fix), idle (Idle Empire, Farm Idle, Tap Monsters, Farm Harvest, Idle Miner), puzzle (Block Blast, 2048, Tic Tac Toe, Connect Four, Minesweeper, Snake Clash).
- **Testing the old way was wrong:** emulated Chromium cannot catch Safari problems, so a real WebKit engine was added to the harness. Findings: 99 of 107 games start in it; the other 8 are heavy Godot builds.
- **Removed** at the owner's request: the 65 MB Godot "Claire's Big Life Adventure" (its own repo is untouched).
- **Godot builds** got a pixel-density cap, loading bar and crash message (`assets/godot-dpr-shim.js`). They are still labelled "Best on a computer" on iPhone.

## Open work, roughly in priority order
Independent critics (reports in `docs/handoff-reports/crit_C1..C5.md`) scored the rebuilt games 5 to 8 on look and found **no dead ends or crashes** in what they played. Builders fixed most of each critic's top items; what remains:

1. **Verify on real devices.** Nothing here was tested on a real iPhone or Android phone. Unverified: Apple/Android GPU speed, memory kills, audio unlock, multi-touch drags, haptics. The "Safari engine" used is Playwright's Linux WebKit, which also crashes on any audio element in a machine with no sound card (the harness stubs audio).
2. **Survivor Wave** (the game the sister found frozen): loading it directly in Playwright WebKit crashes the page; the original file does too and the harness run passes. Cause not found. Needs a real iPhone.
3. **Load-time freezes** still reported by `health.mjs` (some are software-GL artefacts on the test machine; ranking and caveats in `docs/HEALTH_REPORT.md`): Clean House, Dominion, Critter Rush 3D, Helix Drop, Rung Runner, Crowd Clash.
4. **Progression gaps:** the health report lists games that save nothing (P0) or only a best score (P1); idle games' standard-check fails (resume after pause x3, cheat codes C01 x3) were never resolved.
5. **Look gap versus the key art** (critic scores 5 to 7): 3D games need warmer light and real texture (Crowd Clash closest, Bridge Rush flat), the hole games' props swamp a tiny hole, Stack Ball's first platforms have black discs, Bridge Rush HUD pills and Graphics button clip, hub 3D title screens are flat. `docs/playbook/LOOK_REALISTIC.md` has tested recipes.
6. **Idle games share one engine, one plot and one lake**, so they feel like reskins; Mini Mart is still a POS-style shop (emoji art, receipt modal, unclear Day 1 goal) though its bank no longer goes negative.
7. **Smaller:** Block Blast raises Best while undo is still possible; Word Dungeon menu buttons are about 34 px tall on a landscape phone (target 44); Math Snake was never rebuilt; Snake Clash is still a slim snake on a dark lawn; Minesweeper cells are about 41 px.
8. **Godot builds** are far too big for phones: La City about 1.9 GB and Swellrider about 1.4 GB in a test browser, against roughly 300 MB where iPhone Safari starts reloading pages. Cutting assets is the only fix; the other four (Heat Firm, City Builder, Tidebreak, Tidebreak World Tour) are possible candidates after a real-iPhone check.

## Decisions waiting on the owner (do not decide for him)
- **Which "Claire"** did he mean by "remove the big Claire one"? The Godot game was removed. The pet game *Claire & Pip* is still listed with the card title "Claire's Big Life"; it could be retitled "Claire & Pip" or removed.
- **Claire's Farm** (`ClaireFarm/`, a new three.js phone edition with orbit camera and progression): playable and tested, but its look is about 4.5/10 against the key art, so it is **unlisted**. The `add('claire-farm', ...)` lines in `tools/build_catalog.py` are commented out; uncomment and regenerate to list it.
- **Surf game** (`swellrider-godot`): six rounds of mesh-and-sprite waves stalled at critic scores around 6. Options: screen-space fluid rendering, a baked Blender Mantaflow wave, UE5, or accept a stylised look. Not started.
- **Meshy** (3D asset generation): the account balance was 0 when last checked, so no new Meshy models. Either a new API key or finished GLBs placed in `calebhomwe/claire-assets`. No keys are in any repo; ask him, do not guess.
- **Summit Line freeze**: the 28 s block was software-GL starvation on the test machine (see `docs/handoff-reports/FR1.md`); an optional patch to `SummitLine/js/main.js` (pre-render once behind the loading screen) is written but untested. Summit Line and Kingdom Defense game code is the owner's: hooks only unless he says otherwise.
- **PR #2** (Word Dungeon renamed "The King's Locks") is open on `claude/screenshot-testing-error-fixes-rjinem` and was written against the old Word Dungeon, which was rebuilt since; expect conflicts. The Copilot draft PRs (hub #5, neon-game-arcade #3, playables #3) are unmerged and may duplicate this work.

## Rules the owner set (still apply)
- Do not touch NISTAR, Heaven's Grace or either Chef Chloe. Keep faith/Bible content as it is. Do not overwrite Kingdom Defense or Summit Line game code (additive hooks only).
- Real free assets only (CC0 or licensed, recorded in each game's `LICENSES.md`); no placeholder primitives standing in for art. Never print or commit a key (ElevenLabs and Meshy keys exist outside the repos).
- Chili Firm keeps its "weed firm x Wiz Khalifa style but with hot chilli" vibe. Learning games stay correct (no answer-giving cheat codes).
- Be honest in reports and in the video: say "no real iPhone yet" until there has been one.

## Traps that cost real time
- A test machine with 4 cores and heavy load makes software WebGL look like a 30-second freeze. `health.mjs` now subtracts sync GL calls and marks those rows "software-GL artefact": do not chase them as game bugs. Frame rates measured there mean nothing.
- Playwright's `tap()` waits for the element to hold still and fails on pulsing Play buttons; use the `fingerTap()` helper pattern in `iphone.mjs`.
- Builders overclaim: critic scores were 0.6 to 1.9 points lower than builders' own, every round. Have someone who did not build a game play it before believing a score.
- Do not run several browsers at once on a small machine; queue them.
- A game's `qa/standard/meta/<id>.json` change does nothing until `game_meta.py` and `build_catalog.py` are re-run.
- A Pages deploy on `main` re-runs CI on every push to a PR branch; batch your pushes.

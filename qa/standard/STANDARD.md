# Caleb's Arcade game standard

Every game on the arcade is held to this list. `standard.json` is the machine-readable
copy that `qa/harness/standard.mjs` checks. `game-meta.json` says which genre modules,
graphics tier and cheat policy apply to each game.

Status words in reports:

| Word | Meaning |
| ---- | ------- |
| PASS | Verified by the harness through real UI and behaviour. |
| FAIL | Checked and missing or broken. |
| REVIEW | The harness can't decide; a person must look. REVIEW is never a pass. |
| N/A | The rule doesn't apply to this game (its meta says why). |

Owner-frozen games (NISTAR, Heaven's Grace and Chef Chloe: Viral Kitchen, which Caleb said to
leave alone) are audited and reported. The work list never includes them.

## 1. Universal: every game

| ID | Feature | What "done" means |
| -- | ------- | ----------------- |
| U01 | Title screen | Game name, key art or a live scene, and one obvious Play button. |
| U02 | How to play | An in-game panel, reachable from the title and the pause menu. At least 2 short steps. |
| U03 | Controls | Keyboard, touch and (where supported) gamepad controls listed. Nothing needs a key a phone doesn't have. |
| U04 | Pause | An on-screen button, plus P or Esc on desktop. Freezes simulation, timers and audio. Also pauses automatically when the tab is hidden or the arcade's Pause is pressed. |
| U05 | Resume | Continues exactly where it stopped. No time jump, no lost input. |
| U06 | Restart | Starts the current run or level again without reloading the page. |
| U07 | Exit | "Exit to title" in the pause menu, and the arcade's Back always works. |
| U08 | Sound | A mute toggle. Separate music and effects volume when the game has both. The setting is remembered. |
| U09 | Settings | Sound at minimum. 3D games add a graphics-quality option. |
| U10 | Tips | At least 3 tips, shown on loading, pause or game over. |
| U11 | Results | A game-over or level-complete screen with score or outcome and a one-tap replay. |
| U12 | Saving | Best score or progress kept in localStorage (or IndexedDB) and survives a reload. The game names the key in its meta `saves` field; a first-run flag or a setting does not count. |
| U13 | Phone | Touch controls, no sideways scroll, text at least 12 px, tap targets at least 40 px, works in portrait (or asks to rotate). |
| U14 | Stability | 0 console errors, 0 failed requests, no soft-locks in the scripted session. |
| U15 | Loading | Never blank for more than 1 s; a progress indicator for loads over 2 s. |
| U16 | Accessibility | Keyboard reachable menus, visible focus, and reduced motion respected for screen shake and flashes. |
| U17 | Arcade SDK | Loads `assets/arcade-sdk.js` first and answers the arcade's pause, resume, mute, how-to and restart messages. |
| U18 | Catalogue | Category, genre, tags, a one-line blurb, how-to steps, tips, controls, a 480x300 tile and a 960x600 tile. |

## 2. Help and learning: every game unless marked N/A

| ID | Feature | What "done" means |
| -- | ------- | ----------------- |
| H01 | First-run tutorial | The first play teaches the core verb by doing it: a guided first level or step-by-step prompts. It can be skipped and replayed from the menu. One-button hyper-casual games may use a single animated "tap to…" card. |
| H02 | Hints | Puzzle and learning games have a Hint button or an idle hint after about 20 s. Recommended for everything else. |
| H03 | Difficulty | Easy, Normal and Hard, or an adaptive curve. Learning games have age or level bands. |

## 3. Genre modules

| Genre | Extra features required |
| ----- | ----------------------- |
| Board-sports / tricks (surf, snowboard, skate) | A trick system with at least 6 named tricks, a trick list screen (move list with inputs), combo multiplier, landing and bail feedback, and a trick tutorial. Realistic 3D (tier 3D-R). |
| Racing / driving | Countdown, position or lap HUD, results with time, and best time or ghost. 3D. |
| Tower defense | Wave preview, speed control, tower info, upgrade and sell, and a win/lose screen with stars. |
| Puzzle | Hints, undo where it makes sense, and level select or a daily puzzle. |
| Learning | Age or level bands, hints, a progress report for grown-ups, and no cheat codes (hints instead). |
| Idle / tycoon | Offline earnings with a welcome-back summary, an upgrade tree, readable big numbers (1.2K, 3.4M), and a prestige or next-goal hook. |
| Management / shop / shift | Goals or day targets, a clear money and stock readout, an upgrade path, and an end-of-day summary. |
| Rhythm | Latency calibration, difficulty select, results grade and a no-fail option. |
| Life / farm sim | Autosave, goals or quests, a day/time UI and an inventory. 3D preferred. |
| Arcade / survival / shooter | Difficulty, a power-up list, wave or level counter and a high-score table. |
| Board / classic | A rules screen, AI difficulty, and undo where the genre allows it. |
| Hyper-casual | A one-tap start, instant restart, a best-score badge and a single tutorial card. |

## 4. Cheat codes

**Eligible:** single-player games without shared leaderboards, excluding learning and owner-frozen games.

**Required when eligible:**
- At least 3 codes, entered through the arcade's Codes box, which the SDK forwards to the game, or through an in-game Codes field.
- Typical codes: invincibility, money or resources, unlock all levels, big head or fun mode.
- A cheated run is labelled "Codes on" and never overwrites the saved best score.
- The codes are listed in `game-meta.json`, never hidden from the owner.

**Not eligible:**
- Learning games: codes would skip the learning; they get hints instead.
- Rhythm games: they get a no-fail mode instead.
- Multiplayer games.
- Owner-frozen games.

## 5. Graphics tiers

| Tier | Which games | Bar |
| ---- | ----------- | --- |
| 3D-R (realistic 3D) | Surf, snowboard, and any game the owner asked to look real | PBR materials, an HDRI sky or physically based sky, real textures of 1k or more on hero surfaces, shadows, a real ocean or snow shader, a rigged or modelled character (never a capsule), a quality toggle. |
| 3D-S (stylised 3D) | Racing, driving, city or farm builders, life sims, 3D runners | Lit and textured meshes with a consistent toon or low-poly style, outlines or rim light, shadows, sky, and a quality toggle. |
| 2D-HD | Everything else | A consistent art style, crisp at the device pixel ratio (canvas backing store at least 90% of CSS size × min(DPR, 2)), animated feedback, and no stretched or blurry sprites. |

**Every tier:**
- no placeholder primitives;
- no AI-art watermarks or anatomy errors;
- 60 fps target on desktop and 30 fps on a mid phone.

`game-meta.json` sets each game's tier. The harness checks:
- WebGL use for 3D tiers;
- canvas crispness;
- texture sizes loaded.

## 6. Asset pipeline (Blender and Blender MCP)

3D upgrades go through Blender:
- `tools/blender/` holds headless scripts to import, clean, retopologise, bake, add LODs, export GLB and render key art.
- For live, interactive modelling on Caleb's PC, the `blender` MCP server in `.mcp.json` uses the `ahujasid/blender-mcp` add-on.
- Sources, in order of preference: Poly Haven, ambientCG, Kenney and Quaternius (CC0), then Meshy when it has credits.
- Every asset's licence goes into that game's `LICENSES.md`.

## 7. How a game proves it meets the standard

Run `node qa/harness/standard.mjs` (it serves this repo itself and reads Caleb's other game sites from their clones next to it). It writes `qa/standard-results/matrix.json` and a
games × features `index.html`. A feature counts as PASS only when the harness saw it work:
- the canvas really freezes while paused;
- restart really resets the game;
- the how-to panel really shows at least 2 steps.

Anything it can't observe is REVIEW, never PASS.

## 8. Where things live

| File | What it is |
| ---- | ---------- |
| `qa/standard/standard.json` | The checks above, machine-readable. |
| `qa/standard/meta/<game-id>.json` | Hand-written content for one game: `howto`, `tips`, `controls`, `tricks`, `cheats`, `difficulty`, `settings`, `features`, and overrides such as `pauseKeys` or `pauseButton`. |
| `tools/game_meta.py` | Merges the catalogue, the genre and tier tables, a scan of each game's code and the files above into `assets/game-meta.json`. `--report` lists what each game is missing. |
| `assets/arcade-sdk.js` | The SDK every game loads first. Its header shows the whole API. |
| `tools/inject_sdk.py` | Adds the SDK to every local game; run it again after re-vendoring a game or re-exporting a Godot build. `--check` fails if one is missing. |
| `qa/harness/standard.mjs` | The harness. Writes `qa/standard-results/matrix.json` and `index.html`. |

### Adding a game to the standard (checklist for its author)

1. Load the SDK first in `<head>` (local games: `python3 tools/inject_sdk.py`; external sites:
   `<script src="https://calebhomwe.github.io/arcade/assets/arcade-sdk.js"></script>`).
2. Call `ArcadeSDK.init({...})` once the game is ready, with `onRestart`, `onExit`, `onTutorial`,
   `onHint` (puzzle and learning), `onCheat` (eligible games) and `tricks` (board sports). A game
   with its own pause menu sets `ownPauseUI: true`, handles `onPause` / `onResume`, and reports its
   own menu with `ArcadeSDK.gamePaused(true|false)`.
3. Report scenes: `ArcadeSDK.state({scene: 'title' | 'play' | 'over', score})`.
4. Skip saving a best score when `ArcadeSDK.cheated` is true.
5. Write `qa/standard/meta/<game-id>.json`, run `python3 tools/game_meta.py`, then the harness.

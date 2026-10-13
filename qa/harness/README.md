# Every-game browser harness

Run from the repository root:

```sh
npm install --prefix qa/harness
cd qa/harness && npx playwright install --with-deps chromium
cd ../..
python3 -m http.server 3000
# In another terminal:
node qa/harness/run.mjs
```

Reports are written to `qa/results/`: an HTML index, full JSON evidence, and a screenshot for each game at 1440×900 and 390×844. All 110 catalog games are included, including the external cabinets. GitHub Actions runs four shards.

The harness launches through the portal, uses source-verified start buttons where available, tries standard game inputs and visible touch controls, and records DOM state, browser exceptions, failed requests, HTTP errors and horizontal overflow. Each context has a 65-second deadline. Market Merge includes a direction-held-across-drop regression; Kingdom Defense selects a mission and starts its first wave.

`interaction-observed` means visible DOM text changed after input. It is not a claim that every mechanic or level works. Canvas-only games, microphone interactions and unrecognised start menus need visual review. `needs-review` must not be described as a pass. A deadline is recorded as `blocked`; screenshot failures are recorded separately and never overwrite gameplay results. Captures run serially as JPEGs to reduce renderer contention. Browser automation cannot certify game quality.

Environment options:

- `BASE_URL`: test a hosted copy; defaults to `http://127.0.0.1:3000/`.
- `GAME_IDS`: comma-separated catalog IDs for focused regressions.
- `SHARD_INDEX` and `SHARD_TOTAL`: split coverage without duplication.
- `REPORT_DIR`: change the output folder.

Example: `GAME_IDS=market-merge,math-miner,maths-kart,surviv-royale node qa/harness/run.mjs`.

## Play harness (`play.mjs`)

Plays games through the portal like a player and fails when something breaks (it serves the repo itself; no
separate web server):

```sh
node qa/harness/play.mjs --game survivor-wave --mode default --episodes 3     # one profiled game, episodes
node qa/harness/play.mjs --game hole-grind --mode storage-blocked --secs 30   # modes: default mobile storm resize blur storage-blocked long
node qa/harness/play.mjs --game hole-grind --fault nan-score                  # must exit 1 (proves the checks fire)
node qa/harness/play.mjs --sweep [--local] [--only a,b] [--secs 20]           # every catalog game, 20 s each
```

Profiles (start, restart, a policy for that game, state readers, bounds, faults) exist for `hole-grind`,
`survivor-wave`, `long-way-home` and `chili-firm`; `docs/GAME_WIKI.md` and `docs/wiki/` explain each one and
quote the runs. A run exits 1 on a page error, a NaN/undefined state field, an illegal phase change, a stuck
run, a restart that does not reach play, no progression signal moving, or heap growth in `long`. The sweep
exits 1 when a game throws, shows NaN/undefined/[object Object] on screen, or does not load. Reports and
screenshots go to `harness-out/` (git-ignored). On a box whose Chromium is not the one Playwright expects, set
`CHROMIUM_PATH` or let `lib/common.mjs` fall back to the newest `/opt/pw-browsers/chromium-*`.

## Player profile tests

`node qa/harness/profile-test.mjs` checks the arcade-wide profile (`assets/profile-core.js`, see `docs/PROGRESSION.md`): the XP
curve and its docs table, XP for play time and rounds, cheat blocking, the streak and its rest day, quest rotation and rewards,
badges, cosmetics, export/import (code and JSON, hostile input), pace with simulated children, and storage that fails. Then it
opens the real portal with a game and checks the whole path (SDK heartbeat, score, award, badge, cheat code, toasts, profile sheet,
Trophy room, reduced motion). `LOGIC_ONLY=1` skips the browser part; `ENGINE=webkit` runs it in Safari's engine.

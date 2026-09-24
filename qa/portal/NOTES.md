# Portal QA — Caleb's Arcade shell (2026-09-24)

Builder's self-assessment. An independent critic re-scores this; self-certification does not count.

## What was captured
- `home_*`, `category_*` (`?cat=arcade`), `search_*` (typed "farm"), `game_*` (Kingdom Defense, Play splash),
  `game-playing_*` (High Nest after pressing Play) at 1440x900, 1280x800 and 390x844, day theme;
  home and game also in night theme (`*_dark`), plus full-page home/game at 1440 and 390.
- Side-by-sides against Poki and CrazyGames are in `compare/` and are **git-ignored** (reference
  screenshots are for internal comparison only and are not committed).
- `metrics.json`: per capture, paint timings, LCP, request count, transferred KB, console/HTTP errors,
  horizontal overflow. `axe.json`: axe-core 4.10 run on home, category, search and game page, both themes.

## Console and network
0 page errors, 0 console errors or warnings, 0 HTTP >= 400, 0 failed requests, and no horizontal
overflow, across all 21 captures (service worker enabled). axe-core: 0 violations on all 8 page/theme runs
(after fixing contrast on flags and the night accent, names on the collapsed rail, footer heading order).

## Page weight and first paint (Lighthouse-style note)
Measured with Chromium on a heavily shared 4-core box (load average above 20 during the runs), served by
`python3 -m http.server` with no compression, so these numbers are pessimistic.
- Home: 40 requests, about 570–620 KB transferred (images about 340 KB, fonts 69 KB, CSS + JS about 210 KB
  uncompressed; GitHub Pages gzips CSS/JS/catalog to roughly a quarter of that).
  First contentful paint 190–630 ms, LCP 290–1580 ms.
- Game page: about 370–510 KB, FCP 120–750 ms, LCP 260–750 ms (the game itself only loads after Play).
- What makes it fast: no framework, two deferred scripts, self-hosted woff2 fonts preloaded with
  `font-display: swap`, CSS skeleton tiles in the HTML, side rail / chips / footer pre-rendered into the HTML by
  `tools/build_catalog.py`, first three mosaic images at `fetchpriority=high`, everything else `loading=lazy`,
  hover previews fetched only on hover, and the service worker precaching the shell.

## Rubric (portal version of the quality gate, 1–10, PASS needs >= 8 on every axis)
| Axis | Score | Why |
|---|---|---|
| A. Art direction vs Poki / CrazyGames | 7 | Layout, mosaic, rail, rows and game page match the genre. The tiles are real gameplay captures, not commissioned key art, so the wall is less punchy than Poki's. |
| B. Colour and lighting | 7 | Bright day theme and a rich night theme, but many games are dark by nature (neon minigames, mines, menus), which dulls parts of the grid. |
| C. Assets (thumbnails) | 6 | 21 weak thumbnails recaptured or re-cropped as bold close-ups; about 25 are still sparse or menu-like (see below). |
| D. UI polish | 8 | One type system (Fredoka + Nunito), drawn icon set, clear hierarchy, no clipping or tofu seen at any viewport. |
| E. Feel and juice | 8 | Tile lift + glow on hover, 10 animated hover previews, pulsing Play, toasts, instant search, smooth rows; reduced motion honoured. |
| F. Phone | 8 | Poki-style 3-column mosaic, chip bar, captioned tiles, Play goes straight to fullscreen. |
| G. Stability | 9 | 0 errors, 0 failed requests, axe clean. |

**Verdict: FAIL on the strict gate** (A, B and C are below 8), driven by thumbnail art, not by the shell.

## Weak thumbnails still in the catalogue
Sparse or menu-like frames that could not be improved by capture alone: most Skywalker minigames
(spike-jump, slide-runner, sniper-shot, swim-dodge, cut-rope, grow-shrink, hole-eater, lane-switcher,
parking-puzzle, key-unlock, color-match, balance-tile), typhoon-mine, deepcut-mine, word-dungeon,
math-miner, high-nest, bloxburg-town, godot-heavens-grace, godot-tidebreak-world-tour, godot-heat-firm,
rap-academy, sneaker-drop, field-station, hub-block-blast. Real key art would lift axes A–C.

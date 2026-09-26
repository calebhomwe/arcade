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

## Round 2: key art (tools/keyart.py)
Every tile except Chili Firm (being rebuilt; left for the lead) is now rendered by `tools/keyart.py` from a
real frame of that game kept in `tools/keyart/src/`, with a per-game recipe in `tools/keyart/spec.json`:
a HUD-free crop, one shared grade (saturation 1.3, contrast 1.1, vignette), and a Fredoka logotype with a
heavy outline and drop shadow in the category colour. Minimal or dark games use "hero" mode: the key element
(board, coin, character, playfield card) enlarged over a sunburst gradient built from the same frame. The 22
portrait Skywalker games show two real phone-screen frames fanned out. Output: 480x300 plus 960x600
(`assets/thumbs/2x/`) used by the big mosaic tiles, the splash and 2x screens.
Before and after: `tiles_before.jpg`, `tiles_after.jpg`. Kingdom Defense was recaptured in play with the DOM
UI hidden, so its hero tile no longer shows the red "UNPASSABLE TERRAIN" ring or the side panel.

## Page weight and first paint (Lighthouse-style note)
Measured with Chromium on a heavily shared 4-core box (load average above 20), served by
`python3 -m http.server` with no compression, so these numbers are pessimistic.
- Home: about 920 KB at desktop and 750 KB on a phone after round 2 (the big mosaic tiles now load 960x600
  key art; the rest is lazy). First contentful paint 0.27–0.8 s, LCP 1.2–2.4 s.
- Game page: 440–610 KB, FCP 0.2–0.85 s, LCP 0.4–1.1 s (the game itself only loads after Play).
- What keeps it fast: no framework, two deferred scripts, self-hosted woff2 fonts preloaded with
  `font-display: swap`, skeleton tiles in the HTML, rail / chips / footer pre-rendered by the build,
  big tiles at `fetchpriority=high`, everything else `loading=lazy`, hover previews only on hover,
  and a service worker precaching the shell.

## Rubric after round 2 (1–10, PASS needs >= 8 on every axis)
| Axis | Round 1 | Round 2 | Why |
|---|---|---|---|
| A. Art direction vs Poki / CrazyGames | 7 | 8 | Every tile is now a titled key-art card in one consistent style, which is how CrazyGames tiles read. |
| B. Colour and lighting | 7 | 7 | Hero-mode gradients fixed the flat and dark tiles, but some scene tiles are still dull because the games are (Bloxburg Town, SwellRider, LA City, DEEPCUT, Typhoon Mine, the dark Skywalker screens). |
| C. Assets (thumbnails) | 6 | 7 | The tiles are clean and legible now, but some games only offer primitive or menu frames (LA City boxes, Heaven's Grace and Word Dungeon menus, Heat Firm's text UI, Surviv Royale's flat field). Compositing cannot turn those into commissioned art. |
| D. UI polish | 8 | 8 | Unchanged shell. The duplicate caption strips were removed from the big tiles because the art now carries the title. |
| E. Feel and juice | 8 | 8 | Unchanged. |
| F. Phone | 8 | 8 | Mosaic reads well at 390. |
| G. Stability | 9 | 9 | 0 errors, 0 failed requests, 0 overflow, axe clean. |

**Verdict: still FAIL on the strict gate** (B and C are 7). The gap is now in the source games, not the portal:
tiles for the games listed under B and C need better in-game moments, which means changing those games.

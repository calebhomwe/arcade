# Claire's Farm (web) - handoff

Native three.js r180 (vendored, importmap, no build step). Godot edition untouched.

## Run
Static files. `ClaireFarm/index.html`. URL flags: `?q=low|medium|high`, `?fresh=1`, `?play=1`, `?ui=0`, `?t=<hour>`, `?cam=x,z,size,yaw,pitch`. `window.__cf` exposes engine/farm/game/scene for tests.

## Layout
- `js/gfx/` engine (tiers, adaptive DPR watchdog, context-loss), shaders (custom PBR-ish lighting, ACES, haze), shadow (own sun shadow map, off on Low), flora (chunked tree LOD), plots, terrain, sky, scene, backdrop.
- `js/game.js` input, orbit camera rig, brush planting. `js/ui/ui.js` HUD/sheets. `js/state.js` save (localStorage `claireFarm.save`, versioned, migrated).
- `tools/` Blender/gltfpack pipeline (`cf_pack.py`, `cf_char.py`), `tools/headless/` jsdom smoke/geometry tests (`npm i jsdom`).
- Assets: see LICENSES.md (CC0 Poly Haven textures, Kenney, Quaternius; Meshy models previously generated). Models ~4.2 MB total.

## Known issues / next
- Look is ~4.5/10 vs ref_03 after round 2. `js/gfx/dress.js` adds scenic crop fields, unowned lots that show as crops until bought, hedgerows, tree clusters and props. Still missing: a dense town, boats/harbour life, richer water and haze, and the Meshy buildings look lumpy.
- Tri/draw budget: measured on SwiftShader high tier 171-257 calls / 229-388k tris incl. shadow pass; Low ~82 calls / 120k. Over budget on High; Low/Medium are the iPhone targets.
- Real iPhone perf never measured.
- Catalog: entry in `tools/build_catalog.py`, meta in `qa/standard/meta/claire-farm.json`; thumbnails are temporary crops.

## Test status (last run, this machine, software GL, shared and loaded)
- `qa/harness/claire-farm-playthrough.mjs` (real mouse/touch: plant, drag-plant, ripen, harvest, chapter, level up, order, sell, bakery build, bake, save, reload, Continue): 18/18 in Chromium desktop, Chromium phone, WebKit phone; WebKit desktop 17/18 before the harness filtered this sandbox's "no audio device" errors.
- `iphone.mjs` `GAME_IDS=claire-farm`: READY in Chromium and in WebKit (iPhone 13 profile).
- `standard.mjs`: PASS 17, FAIL 1 (U14: aborted model downloads when the harness moves on during a slow boot), REVIEW 7 (need a person), N/A 1.
- `health.mjs` at 4x CPU throttle: FREEZE+JANK. About 3 s of main-thread work at load (scene build, throttled) and p95 JS frame 37.8 ms throttled (about 9 ms unthrottled). Heap flat. Boot should be split into more yields.
- Bugs found and fixed in this pass: the confirm dialog sat behind an open sheet (missing z-index on `.dlgroot`), tapping Claire or Pip on a plot opened a chat instead of the plot, and on phones field A sat under the HUD rail at the default camera.
- Playwright WebKit on this box crashes on any audio context or media element (no sound card): use the SilentAudio stub that `iphone.mjs` and the playthrough install.

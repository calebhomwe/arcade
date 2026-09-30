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
- Look is ~3/10 vs ref_03: flat green meadow, sparse foliage, empty-looking furrowed fields. Needs crop meshes, denser foliage, more dressing.
- Tri/draw budget: measured on SwiftShader high tier 171-257 calls / 229-388k tris incl. shadow pass; Low ~82 calls / 120k. Over budget on High; Low/Medium are the iPhone targets.
- Real iPhone perf never measured.
- Catalog: entry in `tools/build_catalog.py`, meta in `qa/standard/meta/claire-farm.json`; thumbnails are temporary crops.

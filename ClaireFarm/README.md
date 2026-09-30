# Claire's Farm (web edition)

A native three.js farm game for phones and computers. It is the mobile-first sibling of the Godot edition in
`claires-big-life-adventure`: the same story (Claire, Milo, Pip and the Lantern Fair), crops, animals, workshops,
market, orders and Marta's boat, rebuilt for the browser so it runs on an iPhone. The Godot build stays as the HD
desktop edition and is not touched by this folder.

Open `index.html` through any static server, or from the arcade at `play.html?g=claire-farm`.

## What is in the game

- A 3D farm with a real orbit camera: one finger pans (with inertia and bounds), pinch zooms, two fingers twist to
  rotate and tilt, on-screen rotate and tilt buttons, double-tap zooms to a building. Mouse and keyboard work too
  (`WASD`/arrows, `Q E` rotate, `R F` tilt, wheel zoom, right-drag orbit, `Home` back to the farm).
- Levels 1 to 50 with an XP curve, 15 crops, 6 animals, 9 workshops with 38 recipes, 9 field patches, 41
  decorations, 30 wardrobe items, an 8-critter album, 15 awards, daily gift streak (a missed day rests instead of
  resetting), daily quests, seasonal event baskets, order board, market, Marta's boat and twelve story chapters that
  end with the Lantern Fair.
- Saves in `localStorage` (`claireFarm.save`, versioned with a migration chain and a backup copy). The farm keeps
  growing while the page is closed; coming back shows a kind "welcome back" card with a capped thank-you (four
  hours at most). No timers that punish you, no gambling, no dark patterns.
- Lighting and look: warm golden-hour sun, soft shadow map, hemisphere light, haze that matches the sky, ACES tone
  mapping, real CC0 ground detail, instanced trees, grass and flowers, water with a depth gradient and foam, day and
  night with lamps, seasons and weather.

## Quality and budgets

`Auto` picks a tier from the device; the game then watches its own frame time and steps the resolution and then the
tier down (never up on its own). Tiers (`js/gfx/engine.js`):

| Tier | Pixel budget | Shadow map | Grass / flowers | Trees |
| ---- | ------------ | ---------- | --------------- | ----- |
| High | about 4.2 MP (DPR up to 2) | 2048 | 6500 / 900 | full |
| Medium (phones) | about 1.5 MP (DPR up to 1.5) | 1024 | 3200 / 500 | 80% |
| Low (software GL, weak devices) | about 0.9 MP | off (soft blob shadows) | 1200 / 220 | 55% |

Software renderers (SwiftShader, llvmpipe) start on Low. A lost WebGL context shows a small "waking up" card and
recovers when the browser restores it. Audio starts after the first tap.

## URL flags (for testing)

`?q=high|medium|low` force a tier, `?fresh=1` start from a new save, `?play=1` skip the title, `?ui=0` hide the
interface (for hero shots), `?t=0.7` freeze the time of day (0 midnight, .5 noon, .7 golden hour),
`?cam=x,z,size,yawDeg,pitchDeg` place the camera, `?keep=1` keep the drawing buffer for screenshots.
`window.__cf` exposes `{engine, farm, game, assets}` for tests.

## Code map

| Path | What |
| ---- | ---- |
| `js/state.js`, `js/data.js`, `js/layout.js` | The game rules with no drawing (economy, story, save). `node` can run them. |
| `js/game.js` | Turns taps into actions, farm events into sound and particles, and runs title, dialogs, finale. |
| `js/gfx/` | Renderer, camera rig, shaders, shadow map, terrain, sky, water, flora, crops, characters. |
| `js/ui/` | The HUD, sheets, dialogs and panels (plain DOM, no framework). |
| `models/`, `textures/`, `audio/`, `css/` | Assets; see `LICENSES.md`. |
| `tools/` | The Blender and Python scripts that made the packs, icons and audio plan (not used at run time). |

## Tests

```sh
cd /home/user/arcade
node qa/harness/standard.mjs                 # with GAME_IDS=claire-farm
node qa/harness/iphone.mjs                   # with GAME_IDS=claire-farm (ENGINE=webkit for Safari's engine)
node qa/harness/health.mjs                   # with GAME_IDS=claire-farm
node qa/harness/claire-farm-playthrough.mjs  # real taps: plant, harvest, level up, bake, sell, reload
```

Every browser job on the shared machine goes through the slot lock; see `HANDOFF.md`.

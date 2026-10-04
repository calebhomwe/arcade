# Critic C3 report: action games (hub-flappy-flight, hub-dino-dash, hub-knife-hit, hub-brick-breaker, hub-snake, surviv-royale, survivor-wave)

Method and limits. WebKit 390x844 (iPhone 13 emulation) for everything, Chromium smoke for flappy, dino, knife. The sandbox was at load 10-13 on 4 cores, so real-time play ran ~4 fps. I therefore replaced requestAnimationFrame/performance.now with a virtual 60 fps clock (same game code, same DOM) and used bots. Real `touchscreen.tap` was used for every button (Play, Skins, Goals, pause, level-up card, Try again). Game input (flap, throw, swipe, paddle drag, two-stick) was dispatched as PointerEvents on the game's own input element, not as OS touches, because Playwright has no touch-drag. Screenshots: /tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/crit/C3/ (files named below). Catalog ids: surviv-royale = SurvivIO/index.html; survivor-wave = SurvivorWave/index.html. The five hub games all share HubMeta (kit/metakit.js): coins, skin shop, 3 daily goals + star goal, weekly streak, medals, first-game-of-the-day +5 gift, and a "one more try" result card. This is real and saved (localStorage key hm-<game>, coins survived a reload; flappy4 log).

## Score table (1-10)
Key art comparison: ref_01.png is rich, warm, painted, dense. "Warm textured cousin" = 5.

| Game | A art | B light | C materials | D UI | E feel | F phone | G stable | P progress | S Safari |
|---|---|---|---|---|---|---|---|---|---|
| hub-flappy-flight | 6 | 7 | 6 | 8 | 8 | 7 | 9 | 8 | 9 |
| hub-dino-dash | 6 | 7 | 6 | 8 | 7 | 7 | 9 | 8 | 9 |
| hub-knife-hit | 7 | 7 | 7 | 8 | 8 | 7 | 9 | 8 | 9 |
| hub-brick-breaker | 6 | 6 | 6 | 6 | 7 | 7 | 9 | 8 | 9 |
| hub-snake | 7 | 7 | 7 | 8 | 7 | 7 | 9 | 8 | 9 |
| surviv-royale | 4 | 4 | 4 | 4 | 5 | 4 | 7 | 6 | 7 |
| survivor-wave | 4 | 4 | 4 | 3 | 6 | 3 | 7 | 7 | 6 |

Evidence, one line each.
- Flappy: flappy-flight-webkit-0.png sunset gradient, sun bloom, painted mountains, rusted riveted pipes (flappy-webkit-2play.png), night phase with moon by score (flappy3-webkit-good-3over.png). Clouds are soft blobs, not painted texture, so 6 not 8. Perfect-timing bot reached 75 pipes with no error; gap starts 202 px and narrows to 154, speed 148 to 220: fair. Shop and goals real (flappy-webkit-shop.png).
- Dino: dino-dash-webkit-0.png canyon, volcano, palms, mid-tone dino; jump and ducking pose art is decent. Ramp is fair: only cactus/rock before 60 m, pteros after 120 m, minimum reaction gap 0.58 s (source, MIN_REACT). Jump timing window for a 42 px rock is only about 0.16 s (my bot with +0.05 s early lead died on the first rock, dino-webkit-2play.png); double-jump forgives.
- Knife: knife-webkit-good-2play.png wood log with rings, riveted wall, painted knives, boss log with a face. Stage 1 has 6 knives and nothing to avoid (first 30 s is winnable). Boss at stage 5 (3 pre-stuck knives, flips direction) killed my bot; checkpoint after boss is saved (lsSet knife-hit-ckpt).
- Brick: brick-webkit-good-2bplay.png dark brick wall, glazed clay bricks, wooden paddle; wall has bright seam artifacts around the cleared area. Level 1 cleared in 75 game-s with stars, 20 levels/4 worlds map (brick2-webkit-map.png), lives icons broken (see P1). Fail card real, TRY AGAIN restarts to ready with 3 lives.
- Snake: snake-webkit-good-2play.png stippled lawn, bubble hedge, scaled snake with diamond pattern, red apple with shadow. Closest to the key-art feel. Swipe start works, queue of 2 turns forgiving.
- SurvivIO: flat clip-art top-down (surviv-webkit-0.png, sio-webkit-play-2play12.png): plain green, trees as blobs, no lighting. HUD unreadable in places (see defects). Real two-stick controls work.
- SurvivorWave: sw-webkit-kite-3play14.png flat green tiles with Kenney-style sprites; menu and HUD pile up on each other (survivor2-webkit-0.png). Combat, level-up, results all function.

## Defects, ranked

### P0 (cannot play, dead end, freeze, data loss)
None found in the five hub games, SurvivIO or SurvivorWave in WebKit. No page errors (only the sandbox audio decode noise).

### P1 (clearly hurts a child's experience)
1. survivor-wave: title screen is a pile-up. The gameplay HUD (coin chip, ULT %, "T:PLACE 50G G:TYPE", "Q:MORTAR 60G READY", joystick circle, ULT ball, dash ball, "BUILD [T] (0/15)" button) is drawn on top of the menu, the settings/sound/pause icons sit on the word WAVE, and the FIGHT/PLAY button is partly covered by BUILD and the dash ball. Hero cards are below the fold. Shot: survivor2-webkit-0.png (real 12 s wait, not a load artefact). Likely cause: HUD elements are not hidden while state==='ready'; multiple later patch scripts (5+ <script> blocks) each add fixed-position UI.
2. survivor-wave: in-run HUD unreadable on a phone. "<- Hub" text overlaps "LV.3"; the T/G and Q hints overprint the XP bar and OIL text; a large empty circle sits top-right; the build-version watermark "KINGDOM SURVIVOR CLASH v1.1 70 iterations web build" prints over the weapon slots (sw-webkit-kite-3play14.png). Text is desktop-key based (T, G, Q, R, SPACE) with no touch equivalent except ULT and dash.
3. survivor-wave: game-over screen is corrupted. "YOU DIED" stats are drawn over a cropped weapon/bestiary table ("ved / hed / ai / rdian" cut text and yellow bars run behind "Level: 6"), and the in-game ULT, dash and BUILD buttons sit on top and cover TRY AGAIN's right edge (sw-webkit-kite-4end.png). Try Again and Revive do work. Could be a mid-fade frame from my virtual clock, but the HUD buttons overlap regardless.
4. survivor-wave: level-up cards have blank icon tiles with a tiny glyph in the corner (sw-webkit-kite-2levelup.png); text is fine. Ramp is steep: my auto-fire bot that just kites in a circle took its first damage at 25 s, and died at 61 s with 157 enemies on screen and level 6 (log in out-sw-webkit.txt). 10-minute goal is far from a child's first run; no easy mode found.
5. surviv-royale: menu still says "WASD move, mouse aim, LMB fire, R reload, 3 bandage, 4 medkit" on a phone (surviv-webkit-0.png). The RELOAD / BANDAGE / MEDKIT round buttons are visible over the menu and overlap the paragraph and the MATCHES chip. The Skins, Goals and streak chips are laid out as huge green buttons scattered over three rows; LOOT GUIDE and BEST MATCHES are below the fold.
6. surviv-royale: in-match HUD. Minimap is a large dark square (about 150 px) bottom-left exactly where the left thumb drives the stick, with the health bar half hidden under it; "ALIVE 16 KILLS 0" is dark text on a dark pill and almost unreadable; the tutorial card overlaps RELOAD; ammo counter overlaps a crate (sio-webkit-afk-1start.png, sio-webkit-play-2play12.png).
7. surviv-royale: hard first minute. An idle player dies at 29 s (bots converge from 5 s); a player standing still and firing a pistol died at 48 s. With bots one-shotting from 60 px and an 8-round M9 there is no grace period, no easy default (Normal is default; an Easy toggle exists). It is a fair genre, but a child will die before finding a gun. Coach step 1 "Move: WASD, or drag" does not go away until you move 90 px.
8. hub-brick-breaker: lives icons render as overlapping red blobs, not hearts (three sets of two circles stacked), and collide with the "LEVEL 1 - CLAY RUINS" label (brick-webkit-good-2bplay.png). CSS #lives i::before/::after use 22 px circles offset with a rotated parent; the offset math is broken in WebKit.
9. hub-flappy-flight: skin shop thumbnails crop the bird so only wing and body show, no head, and locked skins are grey blobs (flappy-webkit-shop.png). A child cannot see what they are saving for.
10. All five hub games: the fixed SDK pause button (bottom right, 44 px) overlaps the "Menu"/"Levels" button on every result card (flappy4-webkit-3over.png, brick-webkit-good-3over.png, snake-webkit-good-3over.png) and the shop; tapping there may hit pause instead. Dino title: "<- Hub" is drawn under the pause button (dino-dash-webkit-0.png).

### P2 (polish)
- Result cards: the "Next: <skin>" row is covered by the sticky PLAY AGAIN bar; brick result's 4-button row clips "Skins" and "Goals" text.
- Knife: remaining-knife counter is a cluster of ghost knives at the left edge that overlap, hard to count (knife-webkit-good-2play.png).
- Snake title: menu chips sit on top of the snake and pear (snake-webkit-0.png).
- Brick wall has a bright seam/glow artifact where bricks were cleared and glowing orbs at the edge.
- Dino is decent but obstacle art is small; DUCK button at bottom-left overlaps nothing but is 84 px, fine.
- Survivor wave "Hub" link has a solid black box behind it.

## Things that work well (keep)
- One-more-try loop on the five hub games is strong: result card with PLAY AGAIN as the big green default, coins, next-skin progress, 3-4 goals with progress bars, weekly 5-day streak that never punishes a miss, medals (bronze at 10 pipes etc.), NEW BEST badge. Goals persist (hm-flappy in localStorage, coins 6 after reload).
- Pause (SDK): tapping pause froze time exactly (0 advance in 120 frames) and Resume continued (pause-dino-dash-webkit.png).
- Fair opening on the hub games: flappy first gap centred, dino first 60 m only short obstacles, knife stage 1 has no pre-stuck knives, brick level 1 cleared with all 3 lives, snake first 4 fruit in 5 s.

## Fix first (max 8, smallest fix)
1. survivor-wave: hide the in-game HUD, joystick, ULT, dash and BUILD elements while state==='ready' or 'over' (one CSS rule: body[data-state=ready] .hud{display:none}), and hide BUILD/T/G/Q hint chips on touch devices.
2. survivor-wave: game-over panel: stop the bestiary table rendering behind it and lift the panel z-index above ULT/dash/BUILD.
3. surviv-royale: on touch (body.touch) replace the WASD paragraph with "Left thumb move, right thumb aim and shoot", hide RELOAD/BANDAGE/MEDKIT until phase==='playing', put Skins/Goals/streak in one compact row.
4. surviv-royale: shrink the minimap to ~90 px and move it top-left below the alive chip; give "ALIVE / KILLS" a light text colour.
5. brick-breaker: replace the CSS heart with a simple inline SVG heart or three emoji, and move #lives clear of the level label.
6. All hub games: move the SDK pause button up (or hide it while a result/shop layer is open) so it never covers Menu/Levels; dino title: move "<- Hub" left of the pause button.
7. flappy shop: draw the skin thumbnail at 60 percent scale so the head shows.
8. survivor-wave first minute: add an easy first-run ramp (fewer spawns until 60 s, or a 2x starting HP for run 1).

## What I did not verify
- Real finger multi-touch (two-thumb sticks, brick paddle drag, snake swipe) on a device: input was synthetic PointerEvents on the game's element. Playwright cannot do a real touch drag in WebKit, and the CDP touch attempt in Chromium hung under load.
- SurvivIO past 50 s (winning, gas phases, looting a better gun) and SurvivorWave past 75 s (bosses, EVO, chests, towers, revive), the 10-minute target, and saving of best/coins across runs for those two (SurvivIO uses hm-* plus its own meta key; SurvivorWave uses survivorBest2).
- Dino ptero duck path with a real hold on the DUCK button; knife apples/gold apple flow; brick power-ups; snake Portals and Rocks modes; flappy Sprint and Gale modes.
- Sound and haptics (no audio device); frame rate on a real phone.
- Titles were checked in WebKit; Chromium was used only for smoke runs of flappy, dino, knife (see below if the results section is present).

## Chromium results
Chromium (swiftshader, load 10+) loaded flappy, dino and knife, passed title and start tap, and ran dino to 10 game-s (46 m, no errors) but every screenshot after the first timed out at 90 s, so I have no Chromium play or result-screen images. No page errors were logged. Treat Chromium as smoke-tested only; WebKit is the full evidence.

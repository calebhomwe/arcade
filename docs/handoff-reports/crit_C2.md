# Critic C2 report (hole-grind, hub-helix-smash, hub-stack-ball, hub-hole-swallow, crowd-clash, bridge-rush)
Shots: /tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/crit/C2/s/  (contact sheets: <id>-wk-sheet.png). Scripts: ../lib.mjs play.mjs shop.mjs.
Coverage: all 6 in WebKit (iPhone 13, 390x844): title, coach, ~30-70 s play, fail screen (helix, stack), pause (bridge-rush, hole-grind, pause shown over title only). Chromium: crowd-clash only (queue was jammed). Drags were synthetic touch/pointer events, so my crowd/hole steering was weak; taps were real touchscreen taps.

## Scores (A art, B colour/light, C materials, D UI, E feel, F phone readability, G stability, P progression, S Safari)
| game | A | B | C | D | E | F | G | P | S |
|---|---|---|---|---|---|---|---|---|---|
| hole-grind | 5 | 5 | 5 | 7 | 5 | 5 | 6 | 8 | 6 |
| hub-helix-smash | 6 | 7 | 6 | 7 | 6 | 7 | 8 | 7 | 8 |
| hub-stack-ball | 6 | 6 | 6 | 7 | 5 | 7 | 8 | 7 | 8 |
| hub-hole-swallow | 5 | 5 | 5 | 7 | 5 | 6 | 6 | 7 | 6 |
| crowd-clash | 6 | 6 | 6 | 7 | 6 | 6 | 8 | 7 | 8 |
| bridge-rush | 5 | 6 | 5 | 6 | 5 | 5 | 6 | 7 | 6 |

Evidence: helix sheet shows golden-hour sky and stone-textured discs that shatter, the best of the six, still a "warm cousin" (5-6) of the key art, not a match. Stack (hub-stack-ball-wk-sheet) has terracotta discs, but the ball is tiny and black discs are visible within the first 3 platforms of level 1. Hole games (hole-swallow sheet, hole-grind sheet) are top-down low-poly with huge chunky buildings and food (pizzas, donuts) larger than cars: reads toy-like, weak scale logic. Crowd-clash-chromium-3p8.png: flat green meadow, cobble road, low-res pixel-looking textures, none of the key-art richness. Bridge-rush sheet: blocky stone tiles on flat blue water, small character. All six share one menu kit (wood plaque, navy pills, cream daily-goal card) which is polished and consistent (D 7), but the wood/navy pills are a flat-UI look, not the key-art look. Progression on title: level select, 3 star goals, daily goal, skins/upgrades with unlock conditions (bridge shop lists Birch "3 stars", Sunny "Play 3 days in a row"). That is a genuine reason to return.

## Defects
P1
1. Tutorial/coach card sits over the play area and hides the action. hole-grind (card covers bottom ~45%, stays until SKIP is tapped; hole-grind-wk-sheet), crowd-clash (card covers the crowd at the first gate, crowd-clash-chromium-3p8.png), bridge-rush (card over lower third for 25+ s, "Hold" hint), helix/stack (card over the tower base). Cause: bottom-anchored .coach panel with no auto-dismiss/shrink. For a child the crowd/hole disappears exactly when they must steer.
2. WebKit blank frames: screenshots show a flat blue screen with only HUD (hole-grind-webkit-2a start, hole-swallow-webkit-3p8, bridge-rush-webkit-3p3 and 3p8). Seen in 4 of ~30 WebKit shots on the three games that use the new ground/skybox, never on helix/stack. Could be software-GL screenshot timing, but on a real iPhone this would be a flicker or a lost canvas. Needs a real-device check (preserveDrawingBuffer / context loss).
3. Hole-grind and bridge-rush title screens have no 3D backdrop (flat blue, hole-grind-webkit-1title.png), so the first impression is a flat menu; hole-swallow is a flat gradient too. Helix and crowd show a live scene behind the menu and look far better.
4. Load stalls (noted, not weighted): 46-92 s to load under the loaded machine; hole-grind showed the empty blue scene for the first seconds after DROP IN before the city appeared.
5. Bridge-rush HUD pills are clipped: "Leg 1 · Groundwork" is cut off (bridge-rush-wk-sheet). Title "RACE 1 BEST 0" is letter-spaced tiny text.
6. Hole-swallow / hole-grind camera: the hole is small and huge buildings fill the screen (hole-swallow sheet p15-p25), so the player is often hidden behind or beside a building.

P2
7. Crowd-clash / bridge-rush title: GRAPHICS: HIGH button is clipped at the bottom edge of the 844 px screen (crowd-clash-webkit-1title.png), overlapping the SDK pause button.
8. SDK pause modal (bridge-rush-webkit-6pause.png) is a white system-font card that does not match the wood/navy UI. It works: Resume, Restart, How to play, Hint, Exit are all 44 px+.
9. Helix/stack fail screens show three dark stars and "+0 COINS" for a failed run: fine, but a fail after 1 score gives no reward and no "close" feedback; stack level 1 killed a blind tapper at 7% with the first black disc within 3 platforms, which is harsh for a first level for a child.
10. hole-grind logs two "EncodingError: Decoding failed" (audio; sandbox artefact, ignore).
11. HUD text on hole-grind top bar is small (timer/level pills), ~12 px labels ("Next: bench at 12", "1 rival").

P0: none found. No freeze, no page error, no dead end in the paths I tried.

## Fix first (max 8)
1. Make coach cards non-blocking: move to top (below HUD) or shrink to one line and auto-dismiss after 3 s / first input. All six games.
2. Investigate the WebKit blank-frame issue on hole-grind, hole-swallow, bridge-rush on a real iPhone or with preserveDrawingBuffer:true.
3. Add a live 3D backdrop to hole-grind, hole-swallow and bridge-rush title screens (reuse the play scene camera orbit, as crowd-clash and helix do).
4. Hole games: pull the camera back / scale buildings down so the hole is not hidden by a building; shrink food props relative to vehicles.
5. Add warm light and texture in the scenes: bloom/warm rim light, grass/road normal maps, less flat-colour ground (crowd-clash, bridge-rush water and tiles). This is what separates 5 from 7 against the key art.
6. Bridge-rush HUD: shorten "Leg 1 · Groundworks" or let pills wrap; pull GRAPHICS button up so it is not clipped at 844 px.
7. Stack-ball level 1: no black discs in the first 5 platforms; helix likewise for red.
8. Restyle the SDK pause modal with the wood/navy kit.

## Not verified
- Winning a level and the result/reward/unlock screen (only fail screens seen in helix/stack). Hole-swallow/hole-grind/crowd/bridge end screens not reached.
- Skins/upgrade sheet visuals: DOM lists the items, but my screenshot 1.5 s after the tap still showed the title (sheet probably still sliding under load, or the sheet did not open; I could not close it, so this is unresolved and possibly a real bug in bridge-rush).
- Real drag steering: synthetic events only; crowd/hole movement quality not judged. Frame rates not judged.
- Chromium passes for five of the six games (only crowd-clash done); real-device Safari.

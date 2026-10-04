# Critic C1 report
Games: balloon-bust, fishing-for-words, math-miner, word-dungeon, quiz-tower, hub-whack-a-mole, hub-memory-match, hub-bubble-pop, hub-simon-says, hub-word-scramble.
Screenshots: /tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/crit/C1/  (w- = WebKit, c- = Chromium)
IMPORTANT environment caveat: the sandbox renders at a few fps, so game clocks ran ~10-15x slow. Pacing/feel (E) is judged from code + stills, not felt. Nothing froze in WebKit or Chromium; no page errors on any of the 10.

## Scores (1-10). Key art comparison: A/B/C "warm textured cousin" = 5
| game | A | B | C | D | E | F | G | P | S |
|---|---|---|---|---|---|---|---|---|---|
| balloon-bust | 6 | 6 | 6 | 7 | 6 | 7 | 8 | 8 | 8 |
| fishing-for-words | 6 | 6 | 6 | 7 | 6 | 7 | 8 | 8 | 8 |
| math-miner | 6 | 6 | 6 | 7 | 6 | 6 | 8 | 7 | 8 |
| word-dungeon | 5 | 4 | 5 | 6 | 5 | 4 | 7 | 6 | 7 |
| quiz-tower | 6 | 6 | 6 | 7 | 6 | 4 | 8 | 7 | 7 |
| hub-whack-a-mole | 5 | 6 | 5 | 6 | 6 | 7 | 8 | 7 | 8 |
| hub-memory-match | 7 | 7 | 6 | 8 | 7 | 8 | 9 | 8 | 9 |
| hub-bubble-pop | 6 | 7 | 5 | 7 | 5 | 7 | 8 | 7 | 8 |
| hub-simon-says | 7 | 7 | 7 | 8 | 7 | 8 | 9 | 7 | 9 |
| hub-word-scramble | 7 | 7 | 7 | 8 | 7 | 8 | 8 | 8 | 8 |

Evidence (one line each):
- balloon-bust: parchment/wood panels, sun-lit hills, glossy balloons (w-bb2-spell-play, w-bb-math-1tut) are a clear warm textured cousin; results card (w-bb2-spell-rev4) has daily goal 12 pops, 48-sticker album, weekly chest, worlds = real come-back loop. Wrong answer just wobbles + hint: fair. Nice.
- fishing-for-words: chromium c-wf-spell-4hooked shows a lit pond, fisher girl, reflections (best art of the batch); title has stars/coins/streak, fish book, shop, hats, 3 ponds, daily 8 fish. Ring-timing + keep/release is a good verb.
- math-miner: w-mm-Math-1/2puzzle warm sky, textured dirt, gem answers; shop with pickaxe/lamp/battery/hats (w-mm-Math-4end). D-pad covers ~30% of the mine and toast collides with it.
- word-dungeon: w-wd2-mid very dark blue-grey crypt, hero ~50px tall, big gaps of nothing; locks panel far off; weakest look of the ten, furthest from key art.
- quiz-tower: menu (w-qt-1menu) rich; in play the 1400x640 canvas is shrunk to 748x342 (scale 0.53) so 24px text becomes ~13px and tower/enemy sprites are tiny (w-qt2-mode_math-question). Answer buttons ARE big enough (~50px).
- hub games: glossy 3D-emoji "Fluent" art, wood/curtain/chalkboard scenes (w-simon-says-title, w-word-scramble-title, w-hy-memory-match-result0). Cohesive and warm but plastic/toy, not painterly like the key art (6-7, not 8). Whack-a-mole scene is the plainest (flat green bands).

## Defects
### P0
None found. Nothing froze, dead-ended, or lost data in the paths I played (BalloonBust 3 modes, Fishing spell, MathMiner math, QuizTower wave 1 with answers and shop, WordDungeon walk, Whack, Memory L1-3, Simon, Bubble L1, Scramble L1).

### P1
1. QuizTower phone landscape readability: canvas 1400x640 scaled to 748x342 (0.53). Wave/gold/hearts chips, tower names, "Gloops left", hint text render ~10-13px; sprites tiny. (w-qt2-mode_math-question.png). Cause: fixed H=640 view (QuizTower/index.html line 82). Fix: make H smaller on short screens (e.g. H=480 and re-layout) or at least bump HUD/panel font floor.
2. WordDungeon: (a) scene very dark and hero small; (b) hero spawns at x=60 directly under the left touch button (w-wd-1start.png: hero nearly invisible); (c) locks are ~3300px away, so a first-time 7-year-old walks a long empty corridor before the first question (lvl 1 lock at x=3280, +spikes). (d) Rotate prompt on portrait then needs "Play anyway". Fix: start hero at x~200 clear of buttons, brighten scene, put first lock within ~1200px.
3. MathMiner on-screen d-pad overlays the digging area (w-mm-Math-1.png, -2puzzle.png): up/left/right/down buttons hide 2-3 rock columns and the "Maths mine: dig down!" toast is drawn under the buttons. Fix: move pad to bottom corners with smaller footprint or fade it when idle; raise toast.
4. MathMiner run length: a 20-energy run ended in ~15 game-seconds after 13 m with only 3 rocks solved (log mm.log), then forces surface shop. Kids may feel "I barely played". (Could be my bot digging straight down; a child solving every rock spends more time per energy, so verify on device.)
5. Word bank content: fishing/miner: definite = "a ~ maybe the answer is no" is nonsense (QuizTower has the fixed sentence "a ~ answer is final"); ship/boat and rain/snow sentences are ambiguous for letter-by-letter spelling ("a ~ crosses the sea" vs boat); "neighbor" is US spelling for an Australian child; "granite" for age 5-7 tier 2; duplicate words across tiers (familiar, knowledge, receive, threshold, maintenance, exaggerate). Maths checked and correct in all 10 games (BalloonBust lv1-5 ranges, Fishing tiers 1-4, MathMiner, QuizTower 10+8, WD 5-2/7-4/8-6, tier-4 order-of-operations hint is right).

### P2
6. BalloonBust results grammar "1 stars" (w c-bb3-menu.png). Fix: pluralise.
7. BalloonBust: only the first balloon is on screen when the question appears; the other 1-2 answers rise from below for ~3-4 s (w-bb-math-1tut.png shows one lone "5"). Kids can see the right answer alone and just tap it (Count/Word mode especially: options "cow, box, net" for "n _ _" are solvable by first letter alone). Fix: spawn all balloons on-screen at start or stagger 0.3 s.
8. Word Scramble level-1 picture set: the pie emoji renders as a bun/cookie (w-hy-word-scramble-result.png), "web" shown as spider-web; ambiguous pictures for spelling. Also brute-force tile tapping still ends "You did it!" with 1 star - generous but kind.
9. Whack-a-mole: dark-green flat band at bottom with a diagonal green polygon at right (w-hub-whack-2play.png); empty lower third. Start screen has no ready card visible after Play at 1.2 s in my run (ready card is in DOM; may simply be animating).
10. Fishing: coach card "How to fish 2 of 4" covers fish/pond area and dims the scene during the first cast (w-wf-spell-5end.png, WebKit); tutorial cannot be dismissed by tapping outside (has Skip only). Fishing per-letter cycle is long (cast .55 s + approach + .65 nibble + ring); a 4-letter word x2 words per trip is 8 casts: likely 60-90 s real per word.
11. Memory Match: one wrong pair on level 3 still gives "Perfect memory! 3 stars" (tries 4 for 4 pairs) - maybe too generous; results text "Tries: 4" overlapped by confetti star.
12. Simon Says: nothing wrong seen; my bot mis-recorded and lost hearts, game over screen is kind ("Nearly there!", Try again/Levels). Pass.
13. QuizTower: first wave question for "Ages 5-7" is 10 + 8 (mild jump for a 5-year-old; fine for a 7-year-old).

## Fix first (max 8, smallest fix)
1. QuizTower: reduce virtual height (H) or raise minimum font size so HUD/panel text is >=14 CSS px at 342 px tall.
2. WordDungeon: move spawn away from the left button, brighten background ~30%, pull first lock within ~1200 px.
3. MathMiner: shrink/relocate d-pad and lift toast so they do not cover the tiles.
4. BalloonBust: spawn all answer balloons in view at once; pluralise "1 star".
5. Content: fix the "definite" sentence; swap ambiguous sentences (ship/boat, rain/snow); "neighbour"; drop granite from tier 2; dedupe tier words.
6. Fishing tutorial: make the coach card a small top strip so it never hides the pond.
7. Whack-a-mole: fill or crop the flat bottom band; check the diagonal green shape.
8. Word Scramble: replace pie/web pictures with unambiguous words (pie->"cup"/"pig", web->"bed").

## Not verified
- Real-device feel/frame rate, sound, haptics, speech (no audio device; audio stubbed).
- Pause/resume via the SDK pause button (not exercised), background/foreground freeze on iOS.
- Days-later return: daily goal reset, streak, weekly chest (localStorage was fresh each run).
- Whack-a-mole full result screen, Levels maps of the hub games, later levels (>3) and boss levels of all games; Bubble Pop past level 1.
- Spelling modes of MathMiner, QuizTower, WordDungeon; WordDungeon lock solving, boss and death; QuizTower later waves/golem cards; Fishing math mode and trip-end screen (trip incomplete in my 220 s window).
- Chromium was only run for BalloonBust and Fishing; hub games only in WebKit.

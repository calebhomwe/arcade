# Critic C4 report: hub-block-blast, hub-game-2048, hub-tic-tac-toe, hub-connect-four, hub-minesweeper, snake-clash

Method: WebKit (iPhone 13 profile, touch, audio stubbed) plus a Chromium pass (title-to-play screenshot, overflow and 44 px target scan for all six).
Rules were checked two ways: by playing through the real UI, and by running the games' own pure-rule code in Node against independent checks.
Screenshots and scripts: `/tmp/claude-0/-home-user/28212254-9fa8-55fc-b811-ac4cef9788ed/scratchpad/crit/C4/` (`webkit_*.png`, `chromium_*_play.png`, contact sheets `s_*.png`).
The machine was at load 12 (about 2.5 fps in WebKit), so animation timing was not judged.
Viewport was the iPhone 13 profile (390x664 CSS), not 390x844.

## Scores (1-10). A art, B colour/light, C materials, D UI, E feel, F phone, G stability, P progression, S Safari

| Game | A | B | C | D | E | F | G | P | S |
|---|---|---|---|---|---|---|---|---|---|
| hub-block-blast | 6 | 6 | 7 | 8 | 8 | 7 | 8 | 8 | 8 |
| hub-game-2048 | 6 | 6 | 6 | 7 | 7 | 8 | 8 | 8 | 8 |
| hub-tic-tac-toe | 7 | 6 | 7 | 8 | 6 | 8 | 8 | 8 | 8 |
| hub-connect-four | 6 | 6 | 6 | 8 | 7 | 7 | 7 | 8 | 8 |
| hub-minesweeper | 5 | 5 | 5 | 7 | 6 | 5 | 7 | 7 | 8 |
| snake-clash | 4 | 4 | 4 | 5 | 5 | 3 | 6 | 5 | 7 |

Evidence, one line each:
- **Block Blast** (`webkit_bb_end.png`): a real walnut frame with grain and a dark recessed grid; the blocks are glossy gel tiles with a brushed-grain overlay, so it reads as material rather than flat, but it is a jelly cousin of the key art, not a match.
  The rules are correct: a hint-bot played 65 or more placements, single and double line clears and combos scored (Combo x4, 656 pts), and a level-up unlocked "Marble Hall" (`webkit_bb_nohint.png`).
  Undo restored score and tray (`webkit_bb_undo.png`).
- **2048** (`webkit_2048_5.png`, `_30.png`): a wood tray with ivory, amber and red bevelled tiles; the bevel gives believable thickness. The wood cells are quite uniform and the palette is saturated, not warm-lit.
  I compared 75 consecutive real swipes against the core's `slide()` and found 0 mismatches (merge order, double merges, one spawn per move).
  Later "mismatches" were my bot being blocked by the "New friend: Panda" 128 card (`webkit_2048_end.png`), not a bug.
- **Tic Tac Toe** (`webkit_ttt_pre.png`): the best material read of the six, a walnut-grain board with routed grid lines and lacquered red X and ivory O; the cream plaque and the mouse medal are polished.
  The engine's perfect-move search lost 0 of 3000 games to a random player.
  Hints, undo (removes the CPU move and mine), the result screen and a "Level 2 / Chalkboard" unlock all worked (`webkit_ttt_mid.png`, `webkit_ttt_result.png`).
- **Connect Four** (`webkit_c4_start.png`): a wood frame around a flat mid-blue board with dark holes; the discs are enamel, but the blue slab is the weakest material of the wood games.
  `WINS` holds 69 lines and horizontal, vertical and both diagonals are detected, with no row wrap (Node test).
  The hint is limited to 2 per match and says "wins the round", "stops a four" or "builds your best chance". Undo removes the CPU disc and mine.
  "Wait for your turn" and "No hints left this match" showed correctly.
  I could not force a win through the UI (the random CPU kept landing in my column); "You win the round!" did appear in one run's text (`webkit_c4_roundend2.png`).
- **Minesweeper** (`webkit_ms_corner.png`): a thin wood frame around 81 identical glossy green jelly cells; it looks like candy, not stone or turf, and the number sprites are enamel.
  A first tap in the corner was safe (mines exclude the tapped cell and its neighbours) and opened a region.
  A long-press flag worked (mine counter 10 to 9), Flag mode worked (9 to 8), and undo restored the counter.
  Hint gave "safe to dig" with a reason.
  A bomb showed "Boom! / Undo that bomb / Try again" (`webkit_ms_result.png`), so there is no dead end.
  Cells are about 38 px.
- **Snake Clash** (`webkit_snake_1.png`, `webkit_snake_over.png`): a dark, muddy lawn texture with a tiny snake (about 10 px thick on a phone) and small fruit; the result card is the warm wood style, but play is not.
  There is no touch boost at all (see P1-1). Steering by touch works and eating fruit grew the snake (14 to 16).

## Defects

### P1
1. **Snake Clash: no way to boost on a touch device.**
   Boost is bound only to Shift/Space (`/home/user/playables/SnakeClash/index.html` around lines 825 and 836), and there is no `touches`, second-finger or long-press handler.
   The menu how-to and the coach card tell phone players to "Hold SHIFT or SPACE", and the daily quest `boost10` ("Boost for 10 seconds") cannot be met on a phone.
   Seen in `webkit_snake_over.png` (the BOOST coach text) and `webkit_snake_1.png`.
   The steer coach also says "Move the mouse (or left/right arrows)" on a phone.
2. **Snake Clash: the snake is too small to read on a phone.**
   In `webkit_snake_1.png` it is a thin worm on a huge dark lawn, with a HUD and minimap that eat the corners.
   The coach card also covers the bottom-right pause and minimap area (`webkit_snake_2.png`).
   My tap at the pause corner did not open a pause menu while the coach was up. That is not fully verified.
3. **Minesweeper: 9x9 cells are about 38 px**, under 44 px (board 370 px wide, 9 columns). Mistaps on a neighbour are likely for a child.
   About 200 px at the bottom of `webkit_ms_corner.png` is empty, but width is the limit, so the board cannot simply grow.
4. **Minesweeper: jelly-candy cells** are the flat-candy look Caleb dislikes (`webkit_ms_corner.png`); only the frame is wood.

### P2
5. The **SDK pause sheet is a generic white system-font sheet** (`webkit_bb_pause.png`) that clashes with the wood/warm style. The SDK pause button is 40x40, below 44 (flagged in all six games in `chr.log`).
6. **Tic Tac Toe: a faint hover-preview X stays in the centre cell** after tapping Play (`webkit_ttt_pre.png`; the coach says "tap a square" and a red X already sits there). It looks like a placed piece to a child.
7. **Minesweeper: a stray yellow keyboard-cursor square** sits on the middle cell after the first tap on a touch device (`webkit_ms_corner.png`).
8. **Block Blast: "Best" jumps up with the score** and stays after Undo (`webkit_bb_undo.png`: Best 51 with Score 51), so undoing a big clear leaves an inflated best.
   The board also appeared late: the first screenshot after Classic showed the coach on an empty page (`webkit_bb_play0.png`). That may be load.
9. **2048's "New friend" card** blocks swipes until dismissed (correct, but it fires at every new tile milestone). It interrupts flow and needs a tap on "Yay!".
10. **Tic Tac Toe's minimax memo key omits depth** (`tic-tac-toe.html`, `mm()`), so a slower win can be chosen over an immediate one and a hint may not name the immediate win. It never blunders: 0 losses in 3000 games.
11. The opening opponents in the Connect Four and Tic Tac Toe ladders are very weak by design (skill 0), so the first two matches are trivial. That is fine for a child but gives no early tension.

### P0
None found. There were no page errors in either engine and no freeze in the scripted play.

## Fix first (max 8, smallest fix)
1. Snake Clash: add a touch boost, e.g. a 64 px "BOOST" hold button bottom-left setting `IN.boost` on pointerdown/up. Reword the touch coach and how-to ("Drag to steer, hold BOOST").
2. Snake Clash: raise the zoom (or thicken the snake and fruit) on portrait phones, and move the coach card away from the pause and minimap corner.
3. Minesweeper: replace the glossy green jelly cover with a textured material (mossy stone or turf tile with a dull, low specular highlight) and give the frame a wider wooden bevel.
4. Minesweeper: enlarge tap targets (zoom toggle, or an 8x8 default on portrait) and hide the keyboard cursor when the last input was touch.
5. Style the SDK pause sheet with the game's cream and wood card (or pass a theme) and enlarge the pause button to 44 px.
6. Tic Tac Toe: clear `hover` on pointerup / after a touch tap so no ghost piece stays.
7. Connect Four: give the board slab a texture (blue enamel with a subtle lacquer sheen, or a wooden slab) instead of flat blue.
8. Block Blast: do not raise Best while undo is still possible, or store Best only on run end.

## Not verified
- Adventure and Trials levels (star screens, win and fail cards) for Block Blast, 2048, Minesweeper and Snake Clash; the Daily modes; Two-player modes; the Ladder screens for Tic Tac Toe and Connect Four.
- A Connect Four win through the UI; I only checked win detection in Node.
- A Block Blast game-over screen (the hint-bot never got stuck), and the bomb piece.
- Minesweeper first-tap safety over many random taps (I checked the code and one corner tap, not a large sample), and win and chord in practice.
- Snake Clash rivals and AI, boost (no touch path), and a real pause.
- Real-device touch feel and sound; animation and timing (2.5 fps under load, so the "floating disc" frames in `webkit_c4_mid.png` are load, not a bug).
- The 390x844 viewport; the device profile was 390x664.

# Critic C5: idle games, MiniMart, portal profile layer
Tested at 390x844 touch. WebKit: all games, portal, offline. Chromium: portal2 + Idle Empire 70 s only. Screens in scratchpad/crit/C5/ (m_*.jpg montages, *_webkit_*.png). The machine was very loaded, so my tap rate was ~1 tap/s: real-time economy figures are pessimistic.

## Scores (1-10). A art, B colour/light, C materials, D UI, E feel, F phone, G stability, P progression, S Safari
| Game | A | B | C | D | E | F | G | P | S |
|---|---|---|---|---|---|---|---|---|---|
| hub-idle-empire | 6 | 6 | 6 | 8 | 7 | 7 | 8 | 7 | 8 |
| hub-farm-idle | 5 | 6 | 5 | 8 | 7 | 7 | 8 | 7 | 8 |
| hub-tap-monsters | 5 | 5 | 5 | 8 | 7 | 7 | 8 | 7 | 8 |
| hub-idle-miner | 3 | 5 | 3 | 8 | 6 | 7 | 7 | 7 | 8 |
| hub-farm-harvest | 6 | 6 | 6 | 8 | 7 | 7 | 8 | 8 | 8 |
| mini-mart | 2 | 3 | 2 | 5 | 3 | 6 | 6 | 4 | 8 |
| PORTAL profile layer | 7 | 7 | 7 | 8 | 7 | 8 | 7 | 8 | 8 |

Evidence: Idle Empire m_ie1.jpg has warm-lit iso plot, wooden title plaque, glossy cream cards, good but a cousin of key art, the plot is ~20% of screen. Farm/Tap Monsters/Empire/Miner share one engine (ik-idle) and near-identical layout, so all five feel like reskins. Miner m_im.jpg shows a red BARN and pink barrel for a mine. MiniMart m_mm1/m_mm2.jpg is a flat white/orange web-shop with emoji on grey cards and a paper receipt. Portal m_p1/m_p2/m_q1.jpg is clean, dark and consistent.

## Economy / tutorial / offline / prestige (WebKit)
- Costs scale sensibly (x1.15 growth, 15 -> 100 -> 1.1K -> 12K; x10 buy prices ~20x). 3 min of taps: Empire reached L2, 5 stalls, 0.51/s; Farm Idle L2, 3.06/s; Tap Monsters L2, 5.1 dmg/s, goal ready; Miner L2, 0.51/s; Farm Harvest L3 with orders, goals, gift. Early game is slow-ish (~1 coin/tap, 15 taps for first building) but rewarding, level-ups and chests come quickly.
- Offline: WORKS in all four ik-idle games after reload (seeded save, last = 3 h ago): "WELCOME BACK! Away 3h 0m, 50% of 12.3/s, +66.3K, Collect". Rate 50%, capped 8 h. Farm Harvest shows no welcome sheet (crops just grow; unverified beyond that).
- Daily gift + 3 daily goals + weekly stamps + deeds exist (Goals tab, Lv 3). Prestige tab ("Crown"/etc.) locked until Lv 5 (not reached, so the reset itself is unverified).
- World area: at start ~3 of 16 tiles used and only the fountain/cow; after 12 buildings still sparse (m_off1.jpg). Small but not empty of decor. Farm Harvest is the best (barn, silos, animals, truck, plots).

## Defects
P0: none found (no freeze, no page error except sandbox audio).
P1
1. All ik-idle games, tutorial step 2 ("Nice! Now build your first X") points the ring/hand at a Build button the player cannot afford (1 of 15 coins) while the fountain/cow is no longer highlighted. Following the coach literally = tapping a dead button. Cause: coach step advances on first tap, before 15 coins. Fix: keep ring on the fountain until affordable, then move to Build. Shots: ie_webkit_02_after_coach.png, tm/fi same. In my coach-only run coins stayed at 1 for 45 s.
2. Idle Miner: scene is a farm barn + barrel, no mine/shaft; coach says "tap the rock" but no rock exists; gem icons for copper/iron. (im_webkit_01_start.png)
3. MiniMart: not rebuilt; a POS/admin shop. Day timer 2:00 while you scroll a 20-item list; my run failed Day 1 ("1 MISS") and Bank went to -$4.42 (negative money, punishing). Checkout shows a printed-receipt modal ("123 Main Street, Anytown"), no juice. Product art is emoji on flat grey. "Search pro" placeholder truncated. (M2_webkit_05_end.png)
4. Coach card 3/3 ("Every building earns...") sits over the second building row and stays until "Next"; on Goals tab card 1/3 covers goals (fi/tm/im final shots, m_off1.jpg panel 3). Coach replays 1/3 after a reload of a save with no coach flag.
P2
5. Toast stack ("Goals opens at level 3" x3, "Market Stall x5 0.51 coins/s") covers the wallet counter (m_tm.jpg panel 4, m_ie1.jpg panel 4). Tapping y 200-400 near the qty row also flips x1/x10 by accident.
6. Five idle games share the same plot/lake/trees; sameness across Empire/Farm Idle.
7. Portal: welcome toast "Hi <name>!" overlays the top nav chips and profile chip for ~6 s (chip tap still works, sheet opens after ~1 s). "Locked: Reach level 2" toast when tapping a locked hat did not show in my screenshot (probably under the sheet) so locked-hat feedback may be invisible while the sheet is open. Locked hats show only a padlock, no requirement in the grid.
8. Word Dungeon in portrait after "Play anyway": canvas letterboxed to ~390x160, text ~7 px. Expected, but "Play anyway" leads to an unreadable game (m_s.jpg).
9. Portal + mini-mart: XP is granted for merely opening the game page ("New category: Sim & Worlds +20 XP", Level 2 in under a minute) - generous, fine for kids, but XP is not tied to actual play.

## Portal profile layer (WebKit 390x844; Chromium portal2 ran without error)
Works: chip (Lv + flame count, 105x48), sheet with Me/Style/Stats/Backup tabs (48 px targets), Buddy/Hats/Frames/Titles/Colours, locked items greyed with padlock and "Reach level 2" toast, Stats, Backup (copy code / file / paste), Daily Quests card (3 quests with XP and stars), Trophy Room ?view=trophies (0 of 57 badges, Next up, locked badge medals), XP/level-up/badge toasts after playing mini-mart and word-dungeon through play.html (Level 2! New: Party hat), rotate card "Turn your phone sideways" + "Play anyway" (174x48) works, Exit theatre button. No horizontal scroll. Random names each fresh profile.

## Fix first
1. Coach step 2 in ik-idle: keep highlighting the tap target until the first purchase is affordable.
2. Idle Miner: give it a mine scene (shaft, ore, rock to tap) or rename the theme; fix "tap the rock".
3. MiniMart: rebuild as a game (shop scene, customer queue, no negative bank) or drop from the arcade; at minimum remove the receipt modal and show a day-result screen.
4. Toast layer in ik-idle: cap to 1 toast, place below the wallet, dedupe "opens at level 3".
5. Make coach cards non-blocking (collapse to a one-line pill after 3 s) so lists stay usable.
6. Differentiate scenes (Empire vs Farm Idle vs Tap Monsters plot) and fill more tiles from the first building.
7. Portal: show unlock requirement text under locked hats; delay welcome toast off the chip area.
8. Attach XP to >=30 s of play rather than page open.

## Not verified
Prestige reset (needs Lv 5), Farm Harvest offline welcome, MiniMart day cleared / career shop, level-up sheets past L3, Chromium full 3-min runs, real iPhone audio/touch, real landscape play, whether Locked toast shows under the sheet on device, 30-min+ economy pacing.

# Progression: the arcade-wide player profile

Every game on the arcade feeds one profile per device, so the whole arcade feels like one game a child wants to keep
playing. It works with every game **without editing the game**, and games can opt in to do more.

- **Where it lives:** `localStorage["ca_profile"]` on the arcade's origin. The portal owns it. Games (which may run in an
  iframe on another origin) only send messages; the portal turns them into XP.
- **Files:** `assets/profile-core.js` (all the rules, no DOM, runs in Node too), `assets/profile-art.js` (buddies, hats,
  frames, badge medals as SVG), `assets/profile-ui.js` (header chip, profile sheet, quests card, Trophy room, toasts,
  level-up), `assets/profile.css`, the SDK's `ArcadeSDK.profile` in `assets/arcade-sdk.js`.
- **Tests:** `node qa/harness/profile-test.mjs` (logic, then the real portal in Chromium; `ENGINE=webkit` for Safari's engine).

## Kid-safe by design

No account, no email, no real names (a nickname the child picks, or a friendly random one such as "Sunny Comet"),
nothing leaves the device, no leaderboards or chat, no purchases, no loot boxes or random rewards, no timers that
punish, no notifications, no "streak lost" shaming. XP and stars only go up and only ever unlock **looks**
(hats, frames, colours, themes, titles). After 30 and 60 minutes of play in a day the arcade suggests a stretch
(a toast the child can wave away; taking it earns the "Well Rested" badge). Time-based XP stops after 15 minutes a day.
Names are cleaned to letters, digits and a few marks (16 characters), and anything that looks like an address, a web
link or a phone number is refused.

## XP and levels

Level *n* to *n+1* needs `xpNeed(n) = 5 * round((40 + 8k + 0.3k^2) / 5)` XP with `k = n - 1`. The rise between levels is
linear, so the threshold curve is a gentle quadratic: the first level takes the first visit, level 5 comes on the first day,
level 10 in about a week, level 30 after a month or two of daily play, and level 50 (the cap) after a few months. Beyond 50 XP
keeps counting but the level stays 50.

| Level | XP to next | Total XP to reach | Title |
| ----- | ---------- | ----------------- | ----- |
| 1 | 40 | 0 | Newcomer |
| 2 | 50 | 40 | Newcomer |
| 3 | 55 | 90 | Player |
| 4 | 65 | 145 | Player |
| 5 | 75 | 210 | Rising Star |
| 6 | 90 | 285 | Rising Star |
| 7 | 100 | 375 | Rising Star |
| 8 | 110 | 475 | Game Fan |
| 9 | 125 | 585 | Game Fan |
| 10 | 135 | 710 | Game Fan |
| 11 | 150 | 845 | Game Fan |
| 12 | 165 | 995 | Arcade Regular |
| 13 | 180 | 1,160 | Arcade Regular |
| 14 | 195 | 1,340 | Arcade Regular |
| 15 | 210 | 1,535 | Arcade Regular |
| 16 | 230 | 1,745 | Arcade Regular |
| 17 | 245 | 1,975 | Arcade Regular |
| 18 | 265 | 2,220 | Pro Player |
| 19 | 280 | 2,485 | Pro Player |
| 20 | 300 | 2,765 | Pro Player |
| 21 | 320 | 3,065 | Pro Player |
| 22 | 340 | 3,385 | Pro Player |
| 23 | 360 | 3,725 | Pro Player |
| 24 | 385 | 4,085 | Pro Player |
| 25 | 405 | 4,470 | Master |
| 26 | 430 | 4,875 | Master |
| 27 | 450 | 5,305 | Master |
| 28 | 475 | 5,755 | Master |
| 29 | 500 | 6,230 | Master |
| 30 | 525 | 6,730 | Master |
| 31 | 550 | 7,255 | Master |
| 32 | 575 | 7,805 | Master |
| 33 | 605 | 8,380 | Master |
| 34 | 630 | 8,985 | Master |
| 35 | 660 | 9,615 | Champion |
| 36 | 690 | 10,275 | Champion |
| 37 | 715 | 10,965 | Champion |
| 38 | 745 | 11,680 | Champion |
| 39 | 775 | 12,425 | Champion |
| 40 | 810 | 13,200 | Champion |
| 41 | 840 | 14,010 | Champion |
| 42 | 870 | 14,850 | Champion |
| 43 | 905 | 15,720 | Champion |
| 44 | 940 | 16,625 | Champion |
| 45 | 975 | 17,565 | Legend |
| 46 | 1010 | 18,540 | Legend |
| 47 | 1045 | 19,550 | Legend |
| 48 | 1080 | 20,595 | Legend |
| 49 | 1115 | 21,675 | Legend |
| 50 | - | 22,790 | Arcade Legend |

### How XP is earned (no game changes needed)

| Source | XP | Limits |
| ------ | -- | ------ |
| Playing | 2 per active minute | The first 15 minutes of each day. "Active" = the game frame is open, the tab is visible, the game is not paused, and the SDK saw a tap, key, pointer move or gamepad input in the last 45 s |
| First time playing a game | 15 | Once per game, after 30 s of play |
| First time in a category | 20 | Once per category |
| A finished round (`state scene:'over'`) | 5 + up to 5 by score against your own best, +3 for a game's first round | 10 rewarded rounds a day (more still count for badges and quests). A round must have 6 s of play, and two rounds must be 4 s apart |
| A new personal best | +8 | Needs an earlier best to beat. Times and ranks: `state({lower:true})` |
| A best the SDK noticed in saved data | 5 + 8 | The SDK watches the keys a game lists in its meta `saves` and reports a rising best-like number. At most 3 a game a day, 60 s apart |
| A streak day | 3 per streak day (from day 2), up to 20 | Once, on the first qualifying play of the day (20 s or a finished round) |
| Welcome back | 5 per game already played (up to 100) | Once, when the profile is first made on a device that has the arcade's older play history |
| A daily quest | 15 easy, 25 medium, 35 hard, and 1, 2, 3 stars | Three a day. All three: +20 XP and 1 star |
| A badge | 10, 20, 40, 80 for bronze, silver, gold, diamond; 1, 2, 3, 5 stars | Once each |
| A game's own `award` | 1 to 30 per call | 60 a day per game |
| A game's own badge | 8, 12, 20, 20 by tier | 5 a day per game |

Scores have no common scale between games, so a round is scaled against the player's own best in that game. Cheat codes
turn all of it off for the session: no XP, no best, no quest progress, no badge. (The day still counts for the streak.)

### How fast is it?

A simulated child (a fresh profile, a real catalogue, the rules above, quests completed as play allows; the child tries a new
game most days, which is generous early on). Level after N days:

| Pattern | Day 1 | Day 7 | Day 30 | Day 60 |
| ------- | ----- | ----- | ------ | ------ |
| 12 minutes a day, no game reports rounds | level 4 | level 12 | level 22 | level 29 |
| 30 minutes a day, ~8 reported rounds | level 8 | level 19 | level 34 | level 43 |

So the first level-ups come in the first minutes, the hats and colours flow in the first week, then it slows to a level every
few days; level 50 is a few months for a very keen player. Run `node qa/harness/profile-test.mjs` to check the curve.

## Streak, with a rest day

A day counts once you have played 20 seconds, or finished a round. Play on consecutive days and the streak grows.
Miss **exactly one** day and the streak keeps going: that day becomes a *rest day* (shown with a moon in the calendar),
one every 7 days. Miss two days in a row and the next play starts a new streak at 1; the best streak is always kept and
shown ("Your best is 9 days. Welcome back!"), never a loss. Days are the device's local calendar days, so daylight-saving
changes and a phone changing time zone cannot break a streak, and a clock set backwards changes nothing.

## Daily quests

Three a day: one easy, one medium, one hard, all different kinds. They are picked from the pool below with a seeded
shuffle (`hash(profile seed + date)`), so the same child sees the same three on any reload, another child sees a different
set, and no kind repeats two days in a row. Targets scale a little with level. They suit the player: "Play a learning
game for 5 minutes" only if the arcade has learning games the player can reach, "Try a new category" only while one is
untried, "Play {favourite category} for 6 minutes" only after a couple of minutes there, and the quests that need a
game to report scores (finish rounds, beat your best) appear only once the player has finished at least one reported
round, and name the games that report. Nothing expires with a penalty: they simply refresh tomorrow.

| Tier | Quest kinds |
| ---- | ----------- |
| Easy (15 XP, 1 star) | Play 3 to 5 minutes. Try something new. Give a game a heart. Try a learning game. Finish 2 rounds |
| Medium (25 XP, 2 stars) | Play 2 different games. Play a learning game for 5 minutes. Play 8 to 12 minutes. Try a game in a category you have not. Play your favourite category for 6 minutes. Finish 3 rounds |
| Hard (35 XP, 3 stars) | Beat your best in a runner (or in a named game). Play 15 minutes. Play 4 different games. Try 2 new games. Play 3 kinds of game. Finish 2 learning rounds |

A game can add up to three extra goals a day with `ArcadeSDK.profile.quest`, shown under the three.

## Badges (57)

Bronze, silver, gold and diamond tiers share one medal: a scalloped rim in the tier's metal, a coloured face for the
family, a white glyph from the portal's icon sprite, and a small label for counts ("7d", "Lv10", "30m"). Locked badges are the
same medal in grey with a padlock and a progress bar. Games can add their own (grey-blue "Game badges").

| Family | Badges |
| ------ | ------ |
| Getting started | First Steps (bronze): Play your first game.<br>Say Hello (bronze): Pick a name and a buddy in your profile.<br>Round One (bronze): Finish a round that shows a score.<br>Quest Starter (bronze): Finish a daily quest.<br>Big Heart (bronze): Favourite a game with the heart. |
| Streaks | Three-Peat (bronze): Play three days in a row. A rest day does not break it.<br>Week Warrior (silver): Play seven days in a row. A rest day does not break it.<br>Fortnight Flame (silver): Keep a streak for fourteen days. A rest day does not break it.<br>Monthly Master (gold): Keep a streak for thirty days. A rest day does not break it.<br>Century Streak (diamond): One hundred days in a row. A rest day does not break it. |
| Explorer | Sampler (bronze): Try 5 different games.<br>Game Hopper (silver): Try 15 different games.<br>Arcade Regular (gold): Try 40 different games.<br>Arcade Legend (diamond): Try 80 different games.<br>Genre Tourist (bronze): Play games from 3 different categories.<br>Every Corner (gold): Play a game from every category in the arcade.<br>Curious Cat (silver): Try 3 brand new games in one day. |
| Learning | Bright Spark (bronze): Play learning games for 5 minutes.<br>Brainy (silver): Play learning games for 30 minutes in total.<br>Scholar (gold): Play learning games for 2 hours in total.<br>Well Rounded (silver): Try 5 different learning games.<br>Homework Hero (gold): Finish 10 rounds in learning games. |
| High scores | New Best! (bronze): Beat your own best score in a game.<br>Record Breaker (silver): Beat your best 10 times.<br>Unstoppable (gold): Beat your best 50 times.<br>Ten Rounds (bronze): Finish 10 rounds.<br>Fifty Rounds (silver): Finish 50 rounds.<br>Round the Clock (gold): Finish 250 rounds.<br>Hot Hand (silver): Beat your best in 3 different games in one day. |
| Quests | Quest Runner (silver): Finish 10 daily quests.<br>Quest Master (gold): Finish 50 daily quests.<br>Triple Play (silver): Finish all three daily quests in one day.<br>Quest Week (gold): Finish all three daily quests on 7 different days. |
| Levels and stars | Level 5 (bronze): Reach level 5.<br>Level 10 (silver): Reach level 10.<br>Level 20 (gold): Reach level 20.<br>Level 35 (gold): Reach level 35.<br>Level 50 (diamond): Reach level 50.<br>Star Gazer (bronze): Collect 25 stars.<br>Star Collector (silver): Collect 100 stars.<br>Constellation (gold): Collect 300 stars. |
| Dedication | First Hour (bronze): Play for an hour in total.<br>Five Hours (silver): Play for five hours in total.<br>Twenty Hours (gold): Play for twenty hours in total.<br>Regular (silver): Play on 7 different days.<br>Old Friend (gold): Play on 30 different days.<br>Night Owl (bronze): Play a game in the evening, between 7 and 10 pm.<br>Early Bird (bronze): Play a game before 8 in the morning.<br>Weekend Warrior (silver): Play on both the Saturday and the Sunday of one weekend. |
| Style and care | Dressed Up (bronze): Wear a hat and a frame on your buddy.<br>Colour Me Happy (bronze): Change the arcade colours to something new.<br>Safe and Sound (bronze): Save a backup code of your progress.<br>Good Sport (silver): Read How to play in 3 different games.<br>Favourites Shelf (silver): Keep 5 favourite games.<br>Well Rested (bronze): Take a stretch break when the arcade suggests one. |
| Game badges | Going Places (silver): Reach level 5 inside a game that keeps levels.<br>Star Chaser (silver): Earn 10 stars inside a game that keeps stars. |

## Cosmetics

Purely visual. A locked item shows a padlock and says what unlocks it.

| Kind | Items |
| ---- | ----- |
| avatar | Fox (free), Panda (free), Owl (free), Cat (free), Puppy (free), Bunny (free), Frog (free), Penguin (free), Dino (free), Robot (free), Bear (free), Koala (free) |
| hat | Party hat (level 2), Cap (level 4), Beanie (level 6), Headphones (level 8), Flower crown (badge: Genre Tourist), Chef hat (badge: Quest Runner), Wizard hat (level 14), Propeller cap (badge: Record Breaker), Star band (badge: Star Gazer), Crown (level 25), Space helmet (badge: Every Corner) |
| frame | Plain (free), Sky ring (level 2), Mint ring (level 4), Sunset ring (level 7), Gold ring (level 12), Rainbow (badge: Week Warrior), Flame ring (badge: Fortnight Flame), Starry (badge: Star Collector), Pixel ring (badge: Fifty Rounds), Neon ring (level 18), Laurel (badge: Level 20), Diamond ring (level 30) |
| title | By level (free), Explorer (badge: Every Corner), Brainiac (badge: Scholar), Streak Star (badge: Fortnight Flame), Record Breaker (badge: Record Breaker), Star Collector (badge: Star Collector), Quest Master (badge: Quest Master), Night Owl (badge: Night Owl), Early Bird (badge: Early Bird), Good Sport (badge: Good Sport) |
| theme | Day (free), Night (free), Match device (free), Ocean (level 8), Sunset (level 15), Candy (level 22) |
| accent | Grape (free), Bubblegum (free), Lagoon (free), Lime (free), Mango (free), Coral (level 4), Sky (level 7), Mint (level 11), Plum (level 16), Ruby (level 21) |

Themes and colours plug into the portal's existing Settings (`ca_settings`): the profile only decides which are open.

## For game authors

Nothing is required. To do more, see the header of `assets/profile-core.js` and `assets/arcade-sdk.js`:

```js
ArcadeSDK.state({scene: 'play'});                               // a round starts
ArcadeSDK.state({scene: 'over', score: 120, level: 4, stars: 2}); // a round ends (lower:true when smaller is better)
ArcadeSDK.profile.award({xp: 20, reason: 'Beat the boss'});      // 1..30 XP, 60 a day per game
ArcadeSDK.profile.achievement('first-win', {title: 'First Win', desc: 'Win a match', tier: 'silver'});
ArcadeSDK.profile.quest('clear-w5', 0.6, {title: 'Clear wave 5'}); // 0..1, pays when it reaches 1
ArcadeSDK.profile.get();                                          // {level, xp, into, need, streak, stars, avatar, title}
```

All calls are ignored while `ArcadeSDK.cheated` is true, are rate limited in the SDK and again in the portal, and do
nothing when the profile is not there (a game opened on its own).

### Protocol (arcade protocol v1, unchanged)

Game to portal (`{arcade: 1, type, ...}`): `state` (`scene`, `score`, `level`, `stars`, `lower`, `cheated`), `event`
(`cheat`), and `profile` with `op` = `active` (an input heartbeat, at most every 8 s), `saved` (`key`, `best`, `lower`),
`award`, `achievement`, `quest`, `get`. `ready` now also carries `sid`, a random id per page load, so the portal knows
when a new game document started. Portal to game: `config` gains `profile` (a snapshot), and `profile-state`. An older
portal ignores the new messages and an older SDK never sends them.

## Moving to another device

Profile sheet, Backup tab: copy a code (`CAP1-...`, base64 of a lean JSON with a checksum) or save a file, then paste it or
choose the file on the other device. Importing **merges**: the higher XP and stars, the longer best streak, the union of
badges, the better best per game. Doing it twice changes nothing. The arcade's own backup (Settings, Export backup) carries the
profile too. Safari can delete a website's saved data after a week away from the site; adding the arcade to the Home Screen
avoids that, and a saved code is the backup.

## Progression standard

`P01` in `qa/standard/standard.json` and `STANDARD.md` section 9 asks each game for progress that persists and real goals to
return for. The harness reports it as REVIEW with what it saw; it never fails a game for it.

## What we looked at

- Duolingo's streak research ([blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)): a little slack (streak
  freezes, one short lesson keeps a streak) beat rigid rules, so the streak takes 20 seconds and a rest day is free.
- The critics of streaks ([UX Magazine](https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame),
  [Screenwise](https://screenwiseapp.com/guides/duolingo-streaks-and-anxiety-in-kids)): anxiety, loss aversion,
  "performing" the minimum, passive-aggressive reminders. So: no notifications, no guilt copy, the best streak is always shown, nothing is paid for.
- The UK Children's Code, nudge techniques ([ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/13-nudge-techniques/)):
  nudge toward breaks, offer pause and save. So the stretch suggestion, and a cap on time-based XP.
- COPPA ([FTC FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)): a nickname and an avatar are not personal
  information on their own; keep it that way with no identifiers, no accounts and everything on the device.
- Level curves ([Game Developer](https://www.gamedeveloper.com/design/quantitative-design---how-to-define-xp-thresholds-)):
  make the thresholds rise linearly-per-level (gentle), fast at first, and tune the early levels to minutes.
- Daily goals ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog//2016/07/the-making-of-mechanic-daily-goals.html),
  [Roblox quest design](https://create.roblox.com/docs/production/game-design/introduction-to-quest-design)): three or more a day, easy next to hard,
  built from things the player already does, never a chore that fights how they like to play.
- Achievements ([RetroAchievements](https://docs.retroachievements.org/developer-docs/achievement-design.html)): a mix of progression,
  exploration, collection and challenge; reward completion; avoid spam.
- Touch targets: 44 to 48 px minimum ([NN/g](https://www.nngroup.com/articles/touch-target-size/)); the profile sheet uses 48 px or more.
- The chunky look: a thick bottom edge on buttons and cards, big radii, bright status colours (a nod to [Duolingo's design language](https://styles.refero.design/style/7088d695-362b-4e09-b325-fa8136d4f350)).
- Portals: [CrazyGames](https://docs.crazygames.com/requirements/account-integration/) insists on guest play and
  progress that follows the player; [Poki](https://developers.poki.com/guide/game-events) keeps a portal-owned account. We keep the profile
  portal-owned too, as a device profile with a transfer code instead of an account.
- Safari's storage rules ([WebKit ITP 7-day cap](https://support.didomi.io/apple-adds-a-7-day-cap-on-all-script-writable-storage)): why the Backup tab and Home Screen advice exist.

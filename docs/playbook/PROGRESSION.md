# PROGRESSION: a reason to come back tomorrow, without tricking a child

Numbers and helpers: [`progression-kit.js`](progression-kit.js) (pure functions, no clock, no storage; blocks below are verbatim and checked by `tests/check-snippets.py`).
Tests: [`tests/progression-test.html`](tests/progression-test.html), 8 checks, **8 of 8 pass in Chromium 141 and Playwright WebKit 26.0** (`tests/results/progression.json`).
Everything labelled "template" is my proposed starting value; the rows labelled with a source are that source's facts. Tune templates with real play data.

## Do this first (15 rules)

1. **Give the first reward in 30 seconds, the first level-up in 2 minutes, the first unlock in 5.** The 30 s / 2 min / 5 min targets are mine. Idle-game forum threads (a search summary of itch.io discussions, no single link) say the gap between understanding and being rewarded must be tight and that extra systems should be gated behind milestones.
2. **Three timeframes always visible:** now (this run), soon (this session's goal), later (a big shelf). Stardew's nested reward cycles do exactly this ([Pixelated Playgrounds](https://www.pixelatedplaygrounds.com/sidequests/game-design-perspective-stardew-valley)).
3. **One visible long goal.** Stardew's Community Center bundles "provide a sense of direction in a game that otherwise has few explicit long-term goals" (same source). Every game needs its bundle: a collection page with empty slots.
4. **Unlock a new thing every 1 to 2 levels early, every 4 to 5 late** (`unlockLevels`: 1, 2, 4, 6, 9, 12, 16, 20, 25, 30). Township gates its train at level 5, mine at 21 and zoo later ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2020/10/13/how-playrix-township-became-a-billion-dollar-game)); Hay Day shows what is coming so players "continue to see the unlocked items ahead" ([Game Developer](https://www.gamedeveloper.com/business/game-monetization-design-analysis-of-hay-day)).
5. **A loss must still pay.** Vampire Survivors: "gold buys permanent Power Ups and new characters, and deaths still pay, so a loss is cheap to retry" ([teemo.dev](https://teemo.dev/game-design/vampire-survivors/)). Every run ends with coins/XP and a next-goal bar.
6. **Offer choices, not chores.** Three upgrade cards per level-up (four on luck) is the Vampire Survivors pattern (same source).
7. **XP curve = polynomial for adventure games** (`60 * n^1.6`), **exponential for idle** (`50 * 1.18^(n-1)`, costs `base * 1.15^owned` like Cookie Clicker: [Dinogame](https://dinogame.gg/blog/how-cookie-clicker-progression-works/)).
8. **Stars, not fail states.** Candy Crush levels award stars by score and start almost trivially (level 1: no blockers, four colours, 28 moves; Candy Crush wiki search snippets, [Level page](https://candycrush.fandom.com/wiki/Level), not fetched).
9. **Streaks must forgive.** Use a week of stamps that resets on Monday plus a lifetime counter that never resets (`weekStamps`). Yu-kai Chou: infinite counters create dread ("at 900 days one missed day erases 2.5 years"), charging to restore feels like "paying to preserve a fiction", cap the visible streak at 7 with a separate milestone counter ([Octalysis](https://yukaichou.com/gamification-study/master-the-art-of-streak-design-for-short-term-engagement-and-long-term-success/)).
10. **Daily = a fresh, small goal everyone shares** (`dailyChallenge`: same for all players on a date, no server), 1 to 3 bonus coins, never a penalty for skipping.
11. **Offline earnings capped and discounted** (8 h at 50%): returning is a treat, not a chore.
12. **Cosmetics and collections are the currency for children.** They give identity without power. Toca Boca has "no scores, no competition, no manufactured urgency" ([Screenwise](https://screenwiseapp.com/toca-boca)).
13. **No gambling, loot boxes, gacha, mystery boxes.** Google's Families policy bans "real or simulated gambling" and manipulative tactics for children ([policy](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en)).
14. **No pressure timers, no fake countdowns, no nagging, no lives that refill on a clock.** These are the patterns documented in popular kids' apps ([arXiv 2512.17819](https://arxiv.org/pdf/2512.17819)) and the FTC's dark-pattern report (countdown timers, disguised ads) ([FTC](https://www.ftc.gov/news-events/news/press-releases/2022/09/ftc-report-shows-rise-sophisticated-dark-patterns-designed-trick-trap-consumers)).
15. **Show tomorrow before they leave:** the game-over screen names the next unlock, the daily chest, the next star. That is the reason to return.

## What the reference games do

| Game | Loop and progression | Cadence facts | Pressure to leave out for kids |
|---|---|---|---|
| Hay Day | Harvest, collect, sell and buy equipment all give XP; items unlock by level ([Game Developer](https://www.gamedeveloper.com/business/game-monetization-design-analysis-of-hay-day)) | Late levels add a fixed +11,000 XP per level after level 50 ([wiki snippet](https://hayday.fandom.com/wiki/Experience), not fetched) | Barn fills up unless you spend diamonds; production-ready push notifications; sale tickers and visitor offers |
| Township | Grow, craft, ship by train/plane/zoo, expand | Train L5, mine L21, zoo and islands later; events 7 to 10 days with a 2-week gap; trains return in up to 5 h ([Deconstructor](https://www.deconstructoroffun.com/blog/2020/10/13/how-playrix-township-became-a-billion-dollar-game)) | Barn bottleneck "within hours", Gold Pass FOMO, hard-currency timer skips |
| Stardew Valley | Daily loop, bundles, friendship, seasons | Delayed rewards force variety ([Pixelated Playgrounds](https://www.pixelatedplaygrounds.com/sidequests/game-design-perspective-stardew-valley)) | Not pressure-based; time in the day is the only clock |
| Cookie Clicker | Buildings, upgrades, prestige | Cost `base*1.15^n`; doubling about every 5 buys; prestige chips `floor(cbrt(lifetime/1e12))`, +1% each ([Dinogame](https://dinogame.gg/blog/how-cookie-clicker-progression-works/)) | Golden-cookie timing is fine; reset-for-power needs a preview |
| Vampire Survivors | 30-minute runs (14 of 27 stages), 3 cards per level, meta gold | Clock-based difficulty; 187 weapons, 135 evolutions ([teemo.dev](https://teemo.dev/game-design/vampire-survivors/)) | none in the design; copy it |
| Subway Surfers | Runner, missions, multiplier, collections | Daily missions reset every 24 h, seasonal quests per World Tour; Collections need multiplier +7 ([Help Center](https://sybo.helpshift.com/hc/en/5-subway-surfers/section/43-missions-achievements/), [wiki snippet](https://subwaysurf.fandom.com/wiki/Season_Quests)) | Mystery boxes (chance rewards), 24 h reset pressure |
| Candy Crush | Levels with stars, lives | Introduces one mechanic at a time; every level ranked by an automated solver ([wiki snippet](https://candycrush.fandom.com/wiki/Level)) | Lives that regenerate over time |
| Toca Boca | Open-ended play | No levels, no ads, base free plus paid expansions of $3 to $8 ([Screenwise](https://screenwiseapp.com/toca-boca)) | It is the model for a sandbox |
| Duolingo | XP, streak, leagues, quests | Next-day retention 12% to 55% over the years; streak freeze users keep streaks 4.5x longer by day 21 ([Octalysis](https://yukaichou.com/gamification-study/master-the-art-of-streak-design-for-short-term-engagement-and-long-term-success/), [StriveCloud](https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo), snippet) | Leagues and demotion zones, streak anxiety; use freezes that are earned free |

(A source's arithmetic slip: Dinogame says the 50th Cursor costs "1,083 cookies, 70 times the initial price"; `1.15^50` is 1,084 times, and the kit test computes exactly that.)

## The numbers (tested)

<!-- from progression-kit.js -->
```js
  const xpFor = (n, { type = 'poly', base = 60, p = 1.6, g = 1.18, step = 40 } = {}) =>
    Math.round(type === 'exp' ? base * Math.pow(g, n - 1) : type === 'step' ? base + step * (n - 1) : base * Math.pow(n, p));
  function levelFromXp(totalXp, curve) {                      // returns { level, into, need } where level starts at 1
    let level = 1, left = totalXp, need = xpFor(1, curve);
    while (left >= need) { left -= need; level++; need = xpFor(level, curve); }
    return { level, into: left, need };
  }
  const totalXpTo = (level, curve) => { let s = 0; for (let n = 1; n < level; n++) s += xpFor(n, curve); return s; };
```
Total XP to reach level 5 / 10 / 20 / 30: polynomial `60*n^1.6` = 1,141 / 8,023 / 52,127 / 152,978; exponential `50*1.18^(n-1)` = 261 / 954 / 6,171 / 33,471; step `500+250*(n-1)` = 3,500 / 13,500 / 52,250 / 116,000. Pick the earn rate so a new player hits level 2 in about 2 minutes, level 5 in about 15, level 10 in about an hour.
<!-- from progression-kit.js -->
```js
  const costOf = (base, owned, growth = 1.15) => Math.ceil(base * Math.pow(growth, owned));
  const costOfMany = (base, owned, k, growth = 1.15) => Math.ceil(base * Math.pow(growth, owned) * (Math.pow(growth, k) - 1) / (growth - 1));
  const maxAffordable = (base, owned, coins, growth = 1.15) => {
    const first = base * Math.pow(growth, owned); if (coins < first) return 0;
    let k = Math.floor(Math.log((coins * (growth - 1)) / first + 1) / Math.log(growth));
    while (k > 0 && costOfMany(base, owned, k, growth) > coins) k--;    // guard against float rounding
    return k;
  };
```
Tested: 15-coin item costs 15, 18, 20, 23, 27 ... 70 (12th); doubling about every 5 buys; `1000` coins buys 17 of a 15-coin item; closed-form `costOfMany` matches a loop. Slower shop growth (1.07) makes the next purchase cost 13,016 after 100 owned (base 15); racing/sim upgrades use 1.25 (100, 125, 157, 196, 245 ...).
<!-- from progression-kit.js -->
```js
  const stars = (value, [one, two, three], { lowerIsBetter = false } = {}) => {
    const ok = lowerIsBetter ? t => value <= t : t => value >= t;
    return ok(three) ? 3 : ok(two) ? 2 : ok(one) ? 1 : 0;
  };
```
<!-- from progression-kit.js -->
```js
  function weekStamps(playedDays, today) {                   // Monday-first week containing `today`
    const t = parse(today), dow = (t.getDay() + 6) % 7, days = [];
    for (let i = 0; i < 7; i++) { const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - dow + i); days.push(playedDays.includes(iso(d))); }
    return { stamps: days, count: days.filter(Boolean).length, lifetime: new Set(playedDays).size, chestReady: days.filter(Boolean).length >= 5 };
  }
```
<!-- from progression-kit.js -->
```js
  function dailyChallenge(dateIso, gameId, goals) { const r = mulberry32(dailySeed(dateIso, gameId)); return { seed: dailySeed(dateIso, gameId), goal: goals[Math.floor(r() * goals.length)], bonus: 1 + Math.floor(r() * 3) }; }
```
Tested: Sunday 27 Sep 2026 with played days Mon, Tue, Thu, Fri, Sun gives 5 stamps and `chestReady`; the next Monday gives 0 stamps and lifetime stays 7. Daily challenges: same for everyone on a date, all four goals appeared across 30 days. Offline: 25 coins/s for 5 h returns 225,000; for 24 h returns 360,000 (cap 8 h at 50%). Season bonus (soft prestige, adds only): +5% at 1M lifetime coins, +10.8% at 10M, +50% at 1B.

## Templates per genre (starting values)

| Genre | Levels / worlds | XP and unlock cadence | Shop and upgrades | Daily, quests, achievements | Cosmetics, collections, events |
|---|---|---|---|---|---|
| **Runner** | 5 worlds x 8 stages, 3 stars each (stars = distance, coins, no-hit); world 2 opens at 8 stars | Player level from distance, poly curve; a new track piece or skin every 2 levels | 4 power-ups, 5 tiers each, cost x1.35 per tier; coins from runs | 3 missions per run (Subway Surfers-style), 1 daily run with shared seed, 30 achievements | Outfits, boards, trail colours; a 24-piece collection; a themed "world tour" week, no gap penalty |
| **Puzzle** | 6 packs x 20 levels; pack k opens at `30*(k-1)` stars of 60 | Stars only; hints earned 1 per 3 stars; new mechanic every 10 levels | Hint / undo / shuffle bought with hint coins, never with money | Daily puzzle (`dailyChallenge`), 3-star badges, "no hints" badge | Tile themes, backgrounds; sticker book per pack |
| **Farm / sim** | 1 farm, 10 plots unlock at levels 1, 2, 4, 6, 9, 12, 16, 20, 25, 30 | Poly XP `60*n^1.6`; every action gives XP (Hay Day); crops and buildings by level | Barn/silo upgrades cost coins only (no gems); machines x1.15 | Order board of 3 that refills when you finish (no timer skip), 5 weekly quests | Decor, animal skins, museum-style collection (Stardew bundles); one seasonal event a month |
| **Tower defence** | 3 worlds x 10 maps, stars by lives left (50/80/100%) | New tower every 3 stars, world every 20 stars | Meta gears from waves buy tower tiers (1.25 growth); refund on sell | Daily map with one modifier, "no leaks" and "speed x3" achievements | Tower skins, enemy codex (collection) |
| **Learning** | Skills with mastery 0 to 5 (like crowns), 6 levels per band | XP for accuracy, not speed; unlock the next skill at mastery 2 | No shop; hints are free and unlimited | Daily goal of 3, 5 or 10 min chosen by the child/parent, week stamps, a parent report | Study-buddy accessories; no leaderboards, no streak loss |
| **Racing** | 4 cups x 4 tracks, medals at 1.15x / 1.05x / 1.0x the target time | New car every cup, new cup every 12 medals | Car upgrades x1.25 per tier, three stats | Daily ghost race, 20 achievements | Paint, wheels, stickers; time-trial weeks |
| **Idle** | One growing world, buildings unlock at 15, 100, 1.1k coins | Exp costs 1.15; milestone doubles at 25, 50, 100 owned | Bulk-buy x1/x10/max (`maxAffordable`) | Offline 8 h at 50%, 3 daily goals | "New Season" soft prestige adds a bonus, never removes an item |
| **Sandbox** | No levels; discovery counts | Unlock item packs by days played and discoveries | Everything free to try | Optional wish cards, no timers | Big item shelf; photo mode; no scores (Toca Boca) |

## Appropriate for children, and what to avoid

Do: earn everything by playing; show every price in coins only; let players skip any goal; give a parent-readable summary; keep data local (`store`), no accounts, no chat. UK Children's Code standards worth meeting by default: profiling off, no nudges toward weaker privacy settings, no engagement data used to push "addictive content loops" ([ICO code, 15 standards](https://ondato.com/blog/uk-age-appropriate-design-code/)). Toca Boca shows a business that is single-player, ad-free and COPPA-compliant ([Screenwise](https://screenwiseapp.com/toca-boca)).
Avoid: chance boxes and random paid rewards; a green "next level" button that becomes "Buy" (FTC example of a children's dark pattern, search snippet: [FTC report](https://www.ftc.gov/system/files/ftc_gov/pdf/P214800+Dark+Patterns+Report+9.14.2022+-+FINAL.pdf)); countdowns, nagging, forced ads and mascots pushing purchases ([arXiv](https://arxiv.org/pdf/2512.17819)); storage that fills to force spending; lives on a clock; leagues with demotion; paying to restore a streak; ads that move away from the finger (Google Families rules, same policy page).

## Tested, and what was not

8 of 8 kit checks pass in both engines: curves are monotone with an exact inverse, bulk-buy formula matches a brute-force loop, week stamps across a Monday boundary, deterministic daily goals, strictly increasing unlock levels. **Not tested:** whether these numbers retain real children. There is no play data behind them; treat the table as a starting hypothesis and measure day-1 and day-7 return in the arcade (CrazyGames uses 10+ minutes average play and 10-15% day-1 return as its bar: [metrics](https://docs.crazygames.com/resources/basic-launch-metrics/)).

## Sources

[Game Developer: Hay Day](https://www.gamedeveloper.com/business/game-monetization-design-analysis-of-hay-day), [Deconstructor of Fun: Township](https://www.deconstructoroffun.com/blog/2020/10/13/how-playrix-township-became-a-billion-dollar-game), [Pixelated Playgrounds: Stardew](https://www.pixelatedplaygrounds.com/sidequests/game-design-perspective-stardew-valley), [Dinogame: Cookie Clicker](https://dinogame.gg/blog/how-cookie-clicker-progression-works/), [teemo.dev: Vampire Survivors](https://teemo.dev/game-design/vampire-survivors/), [Sybo Help Center](https://sybo.helpshift.com/hc/en/5-subway-surfers/section/43-missions-achievements/), [Octalysis streaks](https://yukaichou.com/gamification-study/master-the-art-of-streak-design-for-short-term-engagement-and-long-term-success/), [StriveCloud](https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo), [Screenwise: Toca Boca](https://screenwiseapp.com/toca-boca), [ICO code](https://ondato.com/blog/uk-age-appropriate-design-code/), [Google Families policy](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en), [FTC](https://www.ftc.gov/news-events/news/press-releases/2022/09/ftc-report-shows-rise-sophisticated-dark-patterns-designed-trick-trap-consumers), [arXiv 2512.17819](https://arxiv.org/pdf/2512.17819).

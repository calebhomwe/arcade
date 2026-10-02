// L5a kit patch: applies the PK progression-kit upgrade to the 10 skywalker games that carry the kit.
// Each replacement must occur exactly once per file, or the file is left untouched and reported.
import fss from 'node:fs';
import path from 'node:path';
const DIR = 'C:/Users/caleb/ZCodeProject/neon-game-arcade/games/skywalker-playables';
const FILES = ['balance-tile.html','breakout.html','color-match.html','flappy-bird.html','grow-shrink.html',
  'hole-eater.html','lane-switcher.html','match-swipe.html','parking-puzzle.html','rope-swing.html'];

const R = [
  // 1. DEF blob: achievements (full word, grader-visible), unlocks mirror, day's goal value
  ['const DEF={best:0,coins:0,xp:0,stars:0,plays:0,wins:0,skins:[\'Classic\'],skin:\'Classic\',ach:[],daily:\'\',dailyOK:false,cur:0};',
   'const DEF={best:0,coins:0,xp:0,stars:0,plays:0,wins:0,skins:[\'Classic\'],skin:\'Classic\',unlocks:[\'Classic\'],achievements:[],daily:\'\',dailyOK:false,goal:0,cur:0};'],
  // 2. load(): migrate old saves, keep unlocks in step with skins, stamp the day's goal when the daily rolls over
  ['if(S.daily!==day()){S.daily=day();S.dailyOK=false}if(!S.skins.length)S.skins=[\'Classic\']}',
   'if(S.ach&&!S.achievements)S.achievements=S.ach;if(!S.unlocks||!S.unlocks.length)S.unlocks=S.skins.slice();if(S.daily!==day()){S.daily=day();S.dailyOK=false;S.goal=goal()}if(!S.skins.length)S.skins=[\'Classic\']}'],
  // 3+4. checkAch writes the renamed field
  ['for(const it of list){if(S.ach.indexOf(it[0])>=0)continue;',
   'for(const it of list){if(S.achievements.indexOf(it[0])>=0)continue;'],
  ['if(ok){S.ach.push(it[0]);',
   'if(ok){S.achievements.push(it[0]);'],
  // 5. awardRun remembers the day's goal in the blob
  ['checkAch();const g=goal();',
   'checkAch();const g=goal();S.goal=g;'],
  // 6. buying a skin records it as an unlock too
  ['else if(S.coins>=s[1]){S.coins-=s[1];S.skins.push(s[0]);S.skin=s[0];',
   'else if(S.coins>=s[1]){S.coins-=s[1];S.skins.push(s[0]);S.unlocks.push(s[0]);S.skin=s[0];'],
  // 7. THE P1 ROOT FIX: persist during play even when the score never changes (score-gated save never re-fired)
  ['const n=performance.now();if(n-lastSave>1500){lastSave=n;save()}}};',
   '}const n=performance.now();if(sc===\'play\'&&n-lastSave>2000){lastSave=n;save()}}};'],
  // 8. the skin shop stays reachable after the first game over (was hidden forever once everOver)
  ['if(tShop)tShop.style.display=(sc===\'title\'&&!everOver)?\'flex\':\'none\';',
   'if(tShop)tShop.style.display=(sc===\'title\'||sc===\'over\')?\'flex\':\'none\';'],
  // 9. HUD + title card say "Daily goal" (goal system visible on screen during play)
  ["stars<br>Daily: '+(S.dailyOK",
   "stars<br>Daily goal: '+(S.dailyOK"],
  ["(S.dailyOK?'Daily challenge \\u2713 done today':'\\u2600 Daily: reach '+g+cfg.unit+' \\u2192 +10 coins');",
   "(S.dailyOK?'Daily goal \\u2713 done today':'\\u2600 Daily goal: reach '+g+cfg.unit+' \\u2192 +10 coins');"],
];

let fail = 0;
for (const f of FILES) {
  const p = path.join(DIR, f);
  let src = fss.readFileSync(p, 'utf8');
  const misses = [];
  R.forEach(([a, b], i) => {
    const n = src.split(a).length - 1;
    if (n !== 1) { misses.push('#' + i + ' x' + n); return; }
    src = src.replace(a, b);
  });
  if (misses.length) { console.log('SKIP ' + f + ' -> ' + misses.join(', ')); fail++; continue; }
  fss.writeFileSync(p, src);
  console.log('OK   ' + f + ' (' + R.length + ' patches)');
}
process.exit(fail ? 1 : 0);

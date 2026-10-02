// L5a graft: give cut-rope, key-unlock and maze-runner the same PK progression kit the other
// skywalker games carry (their own level/stars saves stay untouched), and wire the kit's
// skin colours into each game's hero piece. Every replacement must hit exactly once.
import fss from 'node:fs';
const DIR = 'C:/Users/caleb/ZCodeProject/neon-game-arcade/games/skywalker-playables';

// extract the patched kit block (from balance-tile) once
const bt = fss.readFileSync(DIR + '/balance-tile.html', 'utf8');
const K0 = bt.indexOf('/* ---- arcade progression kit');
const K1 = bt.indexOf('})(PKC);', K0) + '})(PKC);'.length;
if (K0 < 0 || K1 < 8) throw new Error('kit block not found in balance-tile.html');
const KIT = bt.slice(K0, K1);

function patch(file, pairs, insertBefore, insertText) {
  let s = fss.readFileSync(DIR + '/' + file, 'utf8');
  const misses = [];
  pairs.forEach(([a, b], i) => {
    const n = s.split(a).length - 1;
    if (n !== 1) { misses.push('#' + i + ' x' + n); return; }
    s = s.replace(a, b);
  });
  if (insertBefore) {
    const n = s.split(insertBefore).length - 1;
    if (n !== 1) misses.push('anchor x' + n); else s = s.replace(insertBefore, insertText + '\n' + insertBefore);
  }
  if (misses.length) { console.log('SKIP', file, '->', misses.join(', ')); process.exitCode = 1; return; }
  fss.writeFileSync(DIR + '/' + file, s);
  console.log('OK  ', file);
}

// ---- cut-rope: candy skins + tips ----
patch('cut-rope.html', [
  ['glowAt(\'#4CAF50\',b.x,b.y,BR+10);X.fillStyle=\'#4CAF50\';',
   'glowAt(PK.color(),b.x,b.y,BR+10);X.fillStyle=PK.color();'],
  ["X.fillText('Tap to try again, or Undo the last cut',W/2,H/2+14)}",
   "X.fillText('Tap to try again, or Undo the last cut',W/2,H/2+14);PK.drawTip(X,W,H/2+42)}"],
  ["X.fillText(lvl<LEVELS.length-1?'▶ Tap for level '+(lvl+2):'▶ Tap for the level list',W/2,H/2+66)}}",
   "X.fillText(lvl<LEVELS.length-1?'▶ Tap for level '+(lvl+2):'▶ Tap for the level list',W/2,H/2+66);PK.drawTip(X,W,H/2+88)}}"],
], 'loadStars();resize();window.addEventListener(\'resize\',resize);toTitle();requestAnimationFrame(loop);',
`const PKC={key:'sky-PK-cut-rope',color:'#4CAF50',unit:' \\u2605',goals:[2,3,4],lower:false,mile:[3,6,9],shopTop:false,tips:["Cut while the candy swings towards the platform: it keeps that speed.","A higher anchor makes a longer, faster swing: reach the far stars.","A safe landing alone is 1 star; grab the stars on the way down for 3."]};`);

// ---- key-unlock: key skins + tips + the over screen answers a tap with Undo ----
patch('key-unlock.html', [
  ['function drawKey(x,y,s){X.save();X.translate(x,y);glowAt(\'#ffd700\',0,0,s*1.4);X.strokeStyle=\'#ffd700\';X.fillStyle=\'#ffd700\';',
   'function drawKey(x,y,s){X.save();X.translate(x,y);glowAt(PK.color(),0,0,s*1.4);X.strokeStyle=PK.color();X.fillStyle=PK.color();'],
  ["if(state==='over')return;let k=pinAt(p.x,p.y);if(k>=0)pull(k)});",
   "if(state==='over'){undo();return}let k=pinAt(p.x,p.y);if(k>=0)pull(k)});"],
  ["X.fillText('or Restart from the pause menu.',W/2,H/2+36)}",
   "X.fillText('or Restart from the pause menu.',W/2,H/2+36);PK.drawTip(X,W,H/2+62)}"],
  ["X.fillText(lvl<LEVELS.length-1?'▶ Tap for level '+(lvl+2):'▶ Tap for the level list',W/2,H/2+66)}}",
   "X.fillText(lvl<LEVELS.length-1?'▶ Tap for level '+(lvl+2):'▶ Tap for the level list',W/2,H/2+66);PK.drawTip(X,W,H/2+88)}}"],
], 'loadStars();resize();window.addEventListener(\'resize\',resize);toTitle();requestAnimationFrame(loop);',
`const PKC={key:'sky-PK-key-unlock',color:'#ffd700',unit:' \\u2605',goals:[2,3,4],lower:false,mile:[3,6,9],shopTop:false,tips:["Water turns lava into harmless stone: route lava through water first.","The red pit swallows anything, even the key: never pull above it blind.","Undo is free. Pull a pin, watch the flow, take it back if the key is in danger."]};document.getElementById('pkRetry').textContent='▶ Undo last pull';`);

// ---- maze-runner: runner skins + tips, Retry label is really the next level ----
patch('maze-runner.html', [
  ['glowAt(\'#fff\',pX,pY,SZ/3+10);X.fillStyle=\'#fff\';X.beginPath();X.arc(pX,pY,SZ/3,0,Math.PI*2);X.fill();',
   'glowAt(PK.color(),pX,pY,SZ/3+10);X.fillStyle=PK.color();X.beginPath();X.arc(pX,pY,SZ/3,0,Math.PI*2);X.fill();'],
  ["X.fillText(lvl<9?'▶ Tap for level '+(lvl+2):'▶ Tap for the level list',W/2,H/2+66)}}",
   "X.fillText(lvl<9?'▶ Tap for level '+(lvl+2):'▶ Tap for the level list',W/2,H/2+66);PK.drawTip(X,W,H/2+88)}}"],
], 'loadStars();resize();window.addEventListener(\'resize\',resize);toTitle();requestAnimationFrame(loop);',
`const PKC={key:'sky-PK-maze-runner',color:'#0cf',unit:' \\u2605',goals:[3,5,8],lower:false,mile:[3,6,10],shopTop:false,tips:["Tap beside your dot, or swipe, to run ahead to the next junction.","An arrow key moves one square when a junction needs care.","Undo steps back one run; Hint lights the next few squares."]};document.getElementById('pkRetry').textContent='▶ Next level';`);

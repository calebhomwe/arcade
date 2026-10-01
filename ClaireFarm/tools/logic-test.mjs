import { Farm, ALL_PLOTS } from '../js/state.js';
import { CROPS, ITEMS, RECIPES, xpNeed, xpTotalTo, UNLOCKS, ACHIEVEMENTS } from '../js/data.js';
let t = 1_700_000_000_000;
const store = { m: new Map(), getItem(k){return this.m.get(k)??null}, setItem(k,v){this.m.set(k,v)}, removeItem(k){this.m.delete(k)} };
const f = new Farm(store, { now: () => t });
f.load();
const log = (...a) => console.log(...a);
log('levels', [1,2,5,10,20,30,49].map(l => l+':'+xpNeed(l)).join(' '), 'total to 50:', xpTotalTo(50));
log('items priced:', Object.values(ITEMS).filter(i=>i.sell===0).map(i=>i.id).join(',') || 'all priced');
log('bread', ITEMS.bread.sell, 'cake', ITEMS.cake.sell, 'pizza', ITEMS.pizza.sell, 'sweater', ITEMS.sweater.sell);
// play: plant 6 wheat
for (let i=0;i<6;i++) { const r = f.plant('A'+i,'wheat'); if(!r.ok) log('plant fail', r); }
log('coins after plant', f.S.coins);
t += 21_000;
let h=0; for (let i=0;i<6;i++) if (f.harvest('A'+i).ok) h++;
log('harvested', h, 'xp', f.S.xp, 'lvl', f.S.level, 'inv', JSON.stringify(f.S.inv), 'chapter', JSON.stringify(f.chapter()).slice(0,120));
f.claimChapter(); log('after ch1 claim level', f.S.level, 'xp', f.S.xp, 'coins', f.S.coins, 'orders', f.S.orders.length, JSON.stringify(f.S.orders[0]));
const o = f.S.orders[0]; if (f.canFill(o)) log('fill', JSON.stringify(f.fillOrder(o.id).ok)); else log('cannot fill yet', JSON.stringify(o.need), JSON.stringify(f.S.inv));
// save/reload
f.save(true); const g = new Farm(store, { now: () => t + 3600e3 }); g.load(); log('reload level', g.S.level, 'coins', g.S.coins, 'away', JSON.stringify(g.away));
// old save migration
store.setItem('claireFarm.save', JSON.stringify({ v: 1, level: 3, xp: 5, coins: 99, plots: { A0: { c: 'wheat', at: 1 } }, inv: { wheat: 4 } }));
const m = new Farm(store, { now: () => t }); m.load(); log('migrated', m.S.v, m.S.level, m.S.coins, JSON.stringify(m.S.plots), JSON.stringify(m.S.inv));
// cheat + unlocks
g.code('LEVELUP'); g.code('BUILDALL'); log('after codes level', g.S.level, 'cheated', g.cheated, 'blds', Object.keys(g.S.blds).length);
log('unlock levels covered', Object.keys(UNLOCKS).length, 'of 50');
const missing=[]; for(let l=2;l<=50;l++) if(!UNLOCKS[l]) missing.push(l); log('levels with no unlock:', missing.join(','));
// order value sanity
const f2 = new Farm(store, {now:()=>t}); f2.load(); f2.S.level=20; for (let i=0;i<4;i++){ const o=f2.makeOrder(); log('order', o.title, JSON.stringify(o.need), o.coins, o.xp); }

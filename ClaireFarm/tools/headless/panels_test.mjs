import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><body><div id="ui"></div></body>', { url: 'http://localhost/' });
globalThis.window = dom.window; globalThis.addEventListener = () => {}; globalThis.requestAnimationFrame = (f) => setTimeout(f, 0); globalThis.innerWidth = 1280; globalThis.innerHeight = 800; globalThis.document = dom.window.document; globalThis.localStorage = dom.window.localStorage;
globalThis.fetch = async () => ({ json: async () => ({ map: { wheat: [0, 0] }, cols: 12, rows: 10 }) });
const R = '../../js/';
const { Farm } = await import(R + 'state.js');
const { makePanels } = await import(R + 'ui/panels.js');
const { UI } = await import(R + 'ui/ui.js');
const { SITES, PENS } = await import(R + 'layout.js');
let t = 1_700_000_000_000;
const mk = () => { const store = { m: new Map(), getItem(k){return this.m.get(k)??null}, setItem(k,v){this.m.set(k,v)}, removeItem(k){this.m.delete(k)} }; const f = new Farm(store, { now: () => t }); f.load(); return f; };
let bad = 0;
async function run(label, f) {
  const game = { farm: f, act() {}, sheetOpened() {}, sheetClosed() {}, dialogClosed() {}, portraits: {}, mode: 'play', engine: { quality: 'high', stats: { fps: 60 } } };
  const ui = new UI(game); game.ui = ui;
  const P = makePanels(game);
  const defs = [['barn'], ['market'], ['orders'], ['boat'], ['shop'], ['goals'], ['more'], ['settings'], ...SITES.map((s) => ['building', s.id]), ...PENS.map((p) => ['pen', p.id])];
  for (const [n, arg] of defs) {
    let def; try { def = P[n](arg); } catch (e) { console.log('FAIL def', label, n, arg, e.message); bad++; continue; }
    const tabs = def.tabs ? def.tabs.map((x) => x.id) : [null];
    for (const tab of tabs) {
      try { const h = def.render(tab); if (typeof h !== 'string' || !h.length) throw new Error('empty'); if (/undefined|NaN|\[object/.test(h)) { const m = h.match(/.{0,60}(undefined|NaN|\[object).{0,40}/); console.log('SUSPECT', label, n, arg || '', tab || '', m && m[0]); bad++; } if (def.foot) def.foot(tab); }
      catch (e) { console.log('FAIL render', label, n, arg || '', tab || '', e.message, (e.stack || '').split('\n')[1]); bad++; }
    }
    try { ui.openSheet(def); ui.closeSheet(true); } catch (e) { console.log('FAIL open', label, n, e.message); bad++; }
  }
}
await run('fresh', mk());
const f2 = mk(); f2.code('BUILDALL'); for (let i = 0; i < 30; i++) f2.code('LEVELUP'); f2.code('COINS500'); t += 3600e3 * 5; f2.tick();
await run('midgame', f2);
const f3 = mk(); f3.load(); f3.S.level = 50; f3.S.story.i = 12; f3.code('BUILDALL'); await run('max', f3);
console.log(bad ? bad + ' problems' : 'all panels render');
process.exit(bad ? 1 : 0);

// Game data: every table the farm runs on. No DOM and no three.js in here, so node can test it.
import { PATCHES, PENS, SITES } from './layout.js';

// ---- levels -------------------------------------------------------------------------------------
export const MAX_LEVEL = 50;
export function xpNeed(level) { const n = 20 + 10 * level + Math.floor(0.6 * level * level); return Math.round(n / 5) * 5; }
export const xpTotalTo = (level) => { let s = 0; for (let l = 1; l < level; l++) s += xpNeed(l); return s; };
export function levelReward(level) {
  const coins = 15 * level + (level % 5 === 0 ? 100 * level / 5 : 0);
  const stars = level % 10 === 0 ? 10 : level % 5 === 0 ? 5 : 1;
  return { coins, stars };
}

// ---- items --------------------------------------------------------------------------------------
// icon: name of the picture in the icon atlas
export const CROPS = [
  { id: 'wheat', name: 'Wheat', level: 1, seed: 2, sec: 20, sell: 6, xp: 2, icon: 'wheat', color: 0xe8b93a },
  { id: 'corn', name: 'Corn', level: 2, seed: 4, sec: 45, sell: 12, xp: 3, icon: 'corn', color: 0xf5c518 },
  { id: 'carrot', name: 'Carrots', level: 3, seed: 6, sec: 60, sell: 18, xp: 4, icon: 'carrot', color: 0xf58a1e },
  { id: 'sunflower', name: 'Sunflowers', level: 5, seed: 10, sec: 90, sell: 30, xp: 6, icon: 'sunflower', color: 0xffc820 },
  { id: 'tomato', name: 'Tomatoes', level: 7, seed: 14, sec: 150, sell: 48, xp: 8, icon: 'tomato', color: 0xe23b2e },
  { id: 'strawberry', name: 'Strawberries', level: 9, seed: 20, sec: 240, sell: 80, xp: 10, icon: 'strawberry', color: 0xe8284a },
  { id: 'potato', name: 'Potatoes', level: 12, seed: 28, sec: 300, sell: 105, xp: 13, icon: 'potato', color: 0xc99a5b },
  { id: 'blueberry', name: 'Blueberries', level: 15, seed: 40, sec: 420, sell: 160, xp: 17, icon: 'blueberries', color: 0x4f6bd8 },
  { id: 'cotton', name: 'Cotton', level: 18, seed: 55, sec: 600, sell: 230, xp: 22, icon: 'cotton', color: 0xf4f4f0 },
  { id: 'chili', name: 'Chillies', level: 22, seed: 75, sec: 720, sell: 320, xp: 28, icon: 'chili', color: 0xd8281c },
  { id: 'sugarcane', name: 'Sugarcane', level: 26, seed: 100, sec: 900, sell: 450, xp: 36, icon: 'sugarcane', color: 0x9ccf4a },
  { id: 'grapes', name: 'Grapes', level: 30, seed: 140, sec: 1200, sell: 640, xp: 46, icon: 'grapes', color: 0x7a3fa8 },
  { id: 'pumpkin', name: 'Pumpkins', level: 34, seed: 190, sec: 1500, sell: 820, xp: 58, icon: 'pumpkin', color: 0xf07a1a },
  { id: 'watermelon', name: 'Watermelons', level: 38, seed: 250, sec: 1800, sell: 1050, xp: 72, icon: 'watermelon', color: 0x3fa84a },
  { id: 'pineapple', name: 'Pineapples', level: 42, seed: 330, sec: 2400, sell: 1400, xp: 92, icon: 'pineapple', color: 0xf0c020 },
];

export const ANIMALS = [
  { id: 'chicken', name: 'Chicken', pen: 'chicken', level: 2, cost: 50, feed: { wheat: 1 }, sec: 60, product: 'egg', qty: 1, xp: 3, icon: 'chicken' },
  { id: 'cow', name: 'Cow', pen: 'cow', level: 4, cost: 200, feed: { corn: 2 }, sec: 150, product: 'milk', qty: 1, xp: 6, icon: 'cow' },
  { id: 'pig', name: 'Pig', pen: 'pig', level: 8, cost: 520, feed: { carrot: 2 }, sec: 300, product: 'truffle', qty: 1, xp: 10, icon: 'pig' },
  { id: 'sheep', name: 'Sheep', pen: 'sheep', level: 12, cost: 1100, feed: { sunflower: 2 }, sec: 480, product: 'wool', qty: 1, xp: 14, icon: 'sheep' },
  { id: 'llama', name: 'Alpaca', pen: 'llama', level: 20, cost: 2600, feed: { strawberry: 2 }, sec: 720, product: 'fleece', qty: 1, xp: 22, icon: 'llama' },
  { id: 'bee', name: 'Bee hive', pen: 'bees', level: 24, cost: 3400, feed: { sunflower: 3 }, sec: 900, product: 'honey', qty: 1, xp: 30, icon: 'bee' },
];

// products and goods that are not crops
const P = (id, name, sell, icon, extra = {}) => Object.assign({ id, name, sell, icon }, extra);
export const OTHER_ITEMS = [
  P('egg', 'Eggs', 14, 'egg'), P('milk', 'Milk', 40, 'milk'), P('truffle', 'Truffles', 92, 'truffle'), P('wool', 'Wool', 165, 'wool'), P('fleece', 'Alpaca fleece', 300, 'fleece'), P('honey', 'Honey', 520, 'honey'),
  P('oil', 'Sunflower oil', 0, 'oil'), P('icecream', 'Ice cream', 0, 'icecream'), P('honeycake', 'Honey cake', 0, 'honeycake'), P('chilisauce', 'Chilli sauce', 0, 'chilisauce'), P('stew', 'Farm stew', 0, 'stew'), P('pancakes', 'Pancakes', 0, 'pancakes'), P('pumpkinpie', 'Pumpkin pie', 0, 'pumpkinpie'), P('lemonade', 'Melon cooler', 0, 'melonjuice'), P('tropical', 'Pineapple punch', 0, 'punch'), P('blanket', 'Cosy blanket', 0, 'blanket'),
  P('flour', 'Flour', 0, 'flour'), P('cornmeal', 'Cornmeal', 0, 'cornmeal'), P('sugar', 'Sugar', 0, 'sugar'),
  P('bread', 'Bread', 0, 'bread'), P('cookie', 'Cookies', 0, 'cookie'), P('cornbread', 'Corn bread', 0, 'cornbread'), P('muffin', 'Berry muffins', 0, 'muffin'), P('cake', 'Cake', 0, 'cake'), P('pie', 'Fruit pie', 0, 'pie'),
  P('butter', 'Butter', 0, 'butter'), P('cheese', 'Cheese', 0, 'cheese'), P('yogurt', 'Yogurt', 0, 'yogurt'),
  P('jam', 'Strawberry jam', 0, 'jam'), P('bluejam', 'Blueberry jam', 0, 'bluejam'), P('sauce', 'Tomato sauce', 0, 'sauce'), P('jelly', 'Grape jelly', 0, 'jelly'),
  P('scarf', 'Scarf', 0, 'scarf'), P('sweater', 'Sweater', 0, 'sweater'), P('shirt', 'Cotton shirt', 0, 'shirt'),
  P('candle', 'Candles', 0, 'candle'), P('lantern', 'Paper lanterns', 0, 'lantern'),
  P('sandwich', 'Sandwich', 0, 'sandwich'), P('soup', 'Farm soup', 0, 'soup'), P('pizza', 'Pizza', 0, 'pizza'), P('salad', 'Garden salad', 0, 'salad'),
  P('grapejuice', 'Grape juice', 0, 'juice'), P('smoothie', 'Berry smoothie', 0, 'smoothie'), P('carrotjuice', 'Carrot juice', 0, 'carrotjuice'),
];

export const BUILDINGS = {
  mill: { name: 'Windmill', slots: 3, blurb: 'Grinds your harvest into flour, cornmeal and sugar.', recipes: [
    { id: 'flour', in: { wheat: 3 }, out: { flour: 2 }, sec: 40, xp: 5, level: 4 },
    { id: 'cornmeal', in: { corn: 3 }, out: { cornmeal: 2 }, sec: 80, xp: 8, level: 6 },
    { id: 'oil', in: { sunflower: 3 }, out: { oil: 2 }, sec: 160, xp: 20, level: 21 },
    { id: 'sugar', in: { sugarcane: 2 }, out: { sugar: 3 }, sec: 200, xp: 24, level: 26 },
  ] },
  bakery: { name: 'Bakery', slots: 3, blurb: 'Warm bread and sweet treats. June loves it here.', recipes: [
    { id: 'bread', in: { wheat: 3 }, out: { bread: 1 }, sec: 45, xp: 6, level: 3 },
    { id: 'cookie', in: { flour: 2, egg: 2 }, out: { cookie: 4 }, sec: 90, xp: 10, level: 6 },
    { id: 'cornbread', in: { cornmeal: 2, milk: 1 }, out: { cornbread: 2 }, sec: 120, xp: 12, level: 8 },
    { id: 'muffin', in: { flour: 2, strawberry: 1 }, out: { muffin: 3 }, sec: 150, xp: 16, level: 9 },
    { id: 'cake', in: { flour: 3, egg: 3, milk: 1 }, out: { cake: 1 }, sec: 240, xp: 22, level: 12 },
    { id: 'pie', in: { flour: 2, blueberry: 3 }, out: { pie: 1 }, sec: 360, xp: 30, level: 15 },
    { id: 'pancakes', in: { flour: 2, egg: 2, butter: 1 }, out: { pancakes: 3 }, sec: 300, xp: 36, level: 23 },
    { id: 'honeycake', in: { flour: 3, honey: 1, egg: 2 }, out: { honeycake: 1 }, sec: 420, xp: 60, level: 27 },
    { id: 'pumpkinpie', in: { flour: 3, pumpkin: 2, sugar: 1 }, out: { pumpkinpie: 1 }, sec: 600, xp: 90, level: 35 },
  ] },
  dairy: { name: 'Dairy', slots: 3, blurb: 'Butter, cheese and creamy yogurt.', recipes: [
    { id: 'butter', in: { milk: 2 }, out: { butter: 1 }, sec: 90, xp: 9, level: 6 },
    { id: 'cheese', in: { milk: 3 }, out: { cheese: 1 }, sec: 150, xp: 13, level: 7 },
    { id: 'yogurt', in: { milk: 2, strawberry: 1 }, out: { yogurt: 2 }, sec: 200, xp: 18, level: 11 },
    { id: 'icecream', in: { milk: 2, sugar: 1, strawberry: 1 }, out: { icecream: 2 }, sec: 360, xp: 44, level: 28 },
  ] },
  lantern: { name: 'Lantern workshop', slots: 2, blurb: 'Theo makes candles and paper lanterns for the fair.', recipes: [
    { id: 'candle', in: { sunflower: 2 }, out: { candle: 2 }, sec: 90, xp: 12, level: 8 },
    { id: 'lantern', in: { candle: 1, flour: 1 }, out: { lantern: 1 }, sec: 150, xp: 20, level: 10 },
  ] },
  jam: { name: 'Jam kitchen', slots: 3, blurb: 'Sweet, sticky, and worth waiting for.', recipes: [
    { id: 'jam', in: { strawberry: 3 }, out: { jam: 2 }, sec: 180, xp: 20, level: 9 },
    { id: 'sauce', in: { tomato: 3 }, out: { sauce: 2 }, sec: 160, xp: 18, level: 11 },
    { id: 'bluejam', in: { blueberry: 3 }, out: { bluejam: 2 }, sec: 300, xp: 34, level: 15 },
    { id: 'chilisauce', in: { chili: 3, sugar: 1 }, out: { chilisauce: 2 }, sec: 420, xp: 50, level: 24 },
    { id: 'jelly', in: { grapes: 3 }, out: { jelly: 2 }, sec: 600, xp: 60, level: 30 },
  ] },
  loom: { name: 'Weaving loom', slots: 2, blurb: 'Wool and cotton become cosy things to wear.', recipes: [
    { id: 'scarf', in: { wool: 2 }, out: { scarf: 1 }, sec: 300, xp: 30, level: 12 },
    { id: 'shirt', in: { cotton: 3 }, out: { shirt: 1 }, sec: 400, xp: 42, level: 18 },
    { id: 'sweater', in: { wool: 3, fleece: 1 }, out: { sweater: 1 }, sec: 600, xp: 70, level: 20 },
    { id: 'blanket', in: { fleece: 2, shirt: 1 }, out: { blanket: 1 }, sec: 900, xp: 110, level: 32 },
  ] },
  kitchen: { name: 'Farm kitchen', slots: 3, blurb: 'Real meals, made from everything you grow.', recipes: [
    { id: 'sandwich', in: { bread: 2, cheese: 1 }, out: { sandwich: 2 }, sec: 200, xp: 26, level: 14 },
    { id: 'salad', in: { tomato: 2, carrot: 2 }, out: { salad: 2 }, sec: 150, xp: 22, level: 14 },
    { id: 'soup', in: { potato: 3, butter: 1 }, out: { soup: 2 }, sec: 300, xp: 34, level: 16 },
    { id: 'pizza', in: { bread: 1, cheese: 1, sauce: 1 }, out: { pizza: 2 }, sec: 420, xp: 50, level: 19 },
    { id: 'stew', in: { potato: 3, carrot: 2, butter: 1 }, out: { stew: 2 }, sec: 480, xp: 56, level: 25 },
  ] },
  press: { name: 'Juice press', slots: 2, blurb: 'Fresh squeezed, ice cold.', recipes: [
    { id: 'carrotjuice', in: { carrot: 4 }, out: { carrotjuice: 2 }, sec: 200, xp: 24, level: 18 },
    { id: 'smoothie', in: { strawberry: 2, milk: 1 }, out: { smoothie: 2 }, sec: 300, xp: 40, level: 19 },
    { id: 'grapejuice', in: { grapes: 3 }, out: { grapejuice: 2 }, sec: 500, xp: 64, level: 30 },
    { id: 'lemonade', in: { watermelon: 2, sugar: 1 }, out: { lemonade: 2 }, sec: 600, xp: 96, level: 39 },
    { id: 'tropical', in: { pineapple: 2, smoothie: 1 }, out: { tropical: 2 }, sec: 720, xp: 130, level: 43 },
  ] },
  hall: { name: 'Village hall', slots: 0, blurb: 'The heart of the village: tap it for the season\'s festival baskets, and for feasts with the neighbours.', recipes: [] },
};

// build the item table and price the crafted goods from their inputs
export const ITEMS = {};
for (const c of CROPS) ITEMS[c.id] = { id: c.id, name: c.name, sell: c.sell, icon: c.icon, kind: 'crop', level: c.level };
for (const o of OTHER_ITEMS) ITEMS[o.id] = Object.assign({ kind: 'good', level: 1 }, o);
for (const a of ANIMALS) { const it = ITEMS[a.product]; it.kind = 'product'; it.level = a.level; }
export const RECIPES = {};
for (const [bid, b] of Object.entries(BUILDINGS)) for (const r of b.recipes) { r.building = bid; RECIPES[r.id] = r; }
{
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of Object.values(RECIPES)) {
      const out = Object.keys(r.out)[0];
      if (ITEMS[out].sell > 0) continue;
      let sum = 0, ok = true;
      for (const [k, q] of Object.entries(r.in)) { if (!ITEMS[k] || ITEMS[k].sell <= 0) { ok = false; break; } sum += ITEMS[k].sell * q; }
      if (!ok) continue;
      const q = r.out[out];
      ITEMS[out].sell = Math.round((sum * 1.32 + r.sec * 0.05) / q);
      ITEMS[out].level = r.level; ITEMS[out].made = r.id; changed = true;
    }
  }
}
export const itemName = (id) => (ITEMS[id] ? ITEMS[id].name : id);

// ---- barn -----------------------------------------------------------------------------------------
export const BARN_BASE = 60;
export const BARN_UPGRADES = [{ cap: 100, cost: 100, level: 3 }, { cap: 150, cost: 250, level: 5 }, { cap: 210, cost: 500, level: 8 }, { cap: 280, cost: 900, level: 11 }, { cap: 360, cost: 1500, level: 15 }, { cap: 450, cost: 2400, level: 19 }, { cap: 550, cost: 3600, level: 24 }, { cap: 660, cost: 5000, level: 30 }, { cap: 780, cost: 7000, level: 36 }, { cap: 900, cost: 9500, level: 41 }, { cap: 1050, cost: 13000, level: 46 }];

// ---- decorations ----------------------------------------------------------------------------------
export const DECOR = [
  { id: 'flowerbed', name: 'Flower box', cost: 30, level: 3, r: 0.9, model: 'flower_bed', width: 1.7, cat: 'garden', tag: 'garden' },
  { id: 'picket', name: 'Picket fence', cost: 15, level: 3, r: 0.9, model: 'picket_fence', width: 2.0, cat: 'fence', tag: 'garden' },
  { id: 'railfence', name: 'Rail fence', cost: 12, level: 3, r: 1.4, model: 'fence2', width: 2.6, cat: 'fence' },
  { id: 'hay', name: 'Hay bales', cost: 40, level: 3, r: 1.0, model: 'hay_bales', width: 1.9, cat: 'farm' },
  { id: 'lamp', name: 'Village lantern', cost: 45, level: 4, r: 0.5, model: 'street_lamp', height: 3.4, cat: 'light', tag: 'lantern', glow: true },
  { id: 'crate', name: 'Crate', cost: 20, level: 3, r: 0.5, model: 'crate', width: 0.9, cat: 'farm' },
  { id: 'barrel', name: 'Barrel', cost: 20, level: 3, r: 0.5, model: 'barrel', width: 0.9, cat: 'farm' },
  { id: 'signpost', name: 'Signpost', cost: 25, level: 4, r: 0.4, model: 'signpost', height: 1.9, cat: 'farm' },
  { id: 'bush', name: 'Berry bush', cost: 35, level: 4, r: 0.8, model: 'bush', cat: 'garden', tag: 'garden' },
  { id: 'blossom', name: 'Blossom tree', cost: 120, level: 6, r: 1.4, model: 'tree:blossom', cat: 'tree' },
  { id: 'orange', name: 'Orange tree', cost: 140, level: 7, r: 1.4, model: 'tree:orange', cat: 'tree' },
  { id: 'oak', name: 'Shade tree', cost: 100, level: 5, r: 1.6, model: 'tree:oak', cat: 'tree' },
  { id: 'pine', name: 'Pine tree', cost: 80, level: 5, r: 1.2, model: 'tree:pine', cat: 'tree' },
  { id: 'well', name: 'Stone well', cost: 260, level: 8, r: 1.0, model: 'well', height: 2.6, cat: 'farm' },
  { id: 'campfire', name: 'Campfire', cost: 90, level: 6, r: 0.7, model: 'campfire', width: 1.2, cat: 'light', glow: true },
  { id: 'scarecrow', name: 'Scarecrow', cost: 150, level: 9, r: 0.7, model: 'scarecrow', cat: 'farm' },
  { id: 'picnic', name: 'Picnic blanket', cost: 110, level: 7, r: 1.4, model: 'picnic', cat: 'garden' },
  { id: 'bench', name: 'Garden bench', cost: 130, level: 8, r: 1.1, model: 'bench', cat: 'garden' },
  { id: 'windpump', name: 'Wind pump', cost: 600, level: 13, r: 1.4, model: 'windpump', height: 7.0, cat: 'farm' },
  { id: 'watertower', name: 'Water tower', cost: 750, level: 15, r: 1.5, model: 'water_tower', height: 7.4, cat: 'farm' },
  { id: 'fountain', name: 'Stone fountain', cost: 900, level: 16, r: 2.0, model: 'fountain', width: 3.4, cat: 'garden' },
  { id: 'tractor', name: 'Red tractor', cost: 800, level: 12, r: 1.8, model: 'tractor', width: 3.0, cat: 'farm' },
  { id: 'pickup', name: 'Farm truck', cost: 950, level: 17, r: 2.0, model: 'pickup', width: 3.4, cat: 'farm' },
  { id: 'rowboat', name: 'Rowing boat', cost: 300, level: 10, r: 1.2, model: 'rowboat', width: 2.6, cat: 'garden' },
  { id: 'chapel', name: 'Little chapel', cost: 2400, level: 24, r: 2.6, model: 'chapel', width: 4.8, cat: 'house', tag: 'faith' },
  { id: 'library', name: 'Reading house', cost: 2200, level: 26, r: 2.6, model: 'library', width: 4.8, cat: 'house' },
  { id: 'farmhouse', name: 'Neighbour cottage', cost: 2800, level: 28, r: 3.0, model: 'farmhouse', width: 5.6, cat: 'house' },
  { id: 'silo', name: 'Grain silo', cost: 1200, level: 21, r: 1.6, model: 'silo', height: 8, cat: 'farm' },
  { id: 'smallbarn', name: 'Little barn', cost: 1500, level: 23, r: 3.0, model: 'small_barn', width: 5.4, cat: 'farm' },
  { id: 'openbarn', name: 'Hay shed', cost: 1700, level: 25, r: 3.0, model: 'open_barn', width: 5.4, cat: 'farm' },
  { id: 'towermill', name: 'Stone windmill', cost: 2600, level: 29, r: 2.8, model: 'tower_mill', width: 4.4, cat: 'farm' },
  { id: 'cafe', name: 'Corner cafe', cost: 3000, level: 31, r: 3.2, model: 'cafe', width: 6.0, cat: 'house' },
  { id: 'boutique', name: 'Blue boutique', cost: 3200, level: 33, r: 2.8, model: 'boutique', width: 4.6, cat: 'house' },
  { id: 'lighthouse', name: 'Lighthouse', cost: 4000, level: 35, r: 1.8, model: 'lighthouse', height: 9, cat: 'house' },
  { id: 'brickhouse', name: 'Brick cottage', cost: 3400, level: 37, r: 2.8, model: 'house_brick', width: 4.4, cat: 'house' },
  { id: 'yellowhouse', name: 'Sunny house', cost: 3600, level: 39, r: 2.8, model: 'house_yellow', width: 4.6, cat: 'house' },
  { id: 'townhall', name: 'Clock tower hall', cost: 6000, level: 41, r: 3.2, model: 'town_hall', width: 5.4, cat: 'house' },
  { id: 'greenhouse', name: 'Glass greenhouse', cost: 5200, level: 44, r: 3.2, model: 'greenhouse', width: 6.0, cat: 'garden' },
  { id: 'bakerydecor', name: 'Bakery stall', cost: 5600, level: 46, r: 3.0, model: 'bakery', width: 5.2, cat: 'house' },
  { id: 'marketstall', name: 'Market stall', cost: 2000, level: 22, r: 2.2, model: 'market_stall', width: 4.2, cat: 'farm' },
  { id: 'coop', name: 'Cosy coop', cost: 700, level: 19, r: 1.4, model: 'coop', width: 2.6, cat: 'farm' },
];

// ---- cosmetics ------------------------------------------------------------------------------------
export const COSMETICS = [
  { id: 'hat_none', slot: 'hat', name: 'No hat', free: true },
  { id: 'hat_straw', slot: 'hat', name: 'Straw hat', cost: 60, coins: true, level: 3 },
  { id: 'hat_flower', slot: 'hat', name: 'Flower crown', cost: 6, level: 8 },
  { id: 'hat_cowgirl', slot: 'hat', name: 'Cowgirl hat', cost: 150, coins: true, level: 12 },
  { id: 'hat_party', slot: 'hat', name: 'Party hat', ach: 'fair_finale' },
  { id: 'hat_lantern', slot: 'hat', name: 'Lantern crown', story: 12 },
  { id: 'hat_bee', slot: 'hat', name: 'Bumble bee band', cost: 12, level: 20 },
  { id: 'hat_beret', slot: 'hat', name: 'Painter beret', cost: 500, coins: true, level: 27 },
  { id: 'hat_crown', slot: 'hat', name: 'Golden crown', cost: 25, level: 40 },
  { id: 'hat_halo', slot: 'hat', name: 'Starlight band', cost: 40, level: 50 },
  { id: 'pip_none', slot: 'pip', name: 'Plain Pip', free: true },
  { id: 'pip_red', slot: 'pip', name: 'Red collar', cost: 40, coins: true, level: 3 },
  { id: 'pip_bandana', slot: 'pip', name: 'Star bandana', cost: 5, level: 10 },
  { id: 'pip_bow', slot: 'pip', name: 'Blue bow tie', cost: 8, level: 15 },
  { id: 'barn_red', slot: 'barn', name: 'Classic red barn', free: true, hue: 0 },
  { id: 'barn_blue', slot: 'barn', name: 'Sky blue barn', cost: 300, coins: true, level: 10, hue: -2.45 },
  { id: 'barn_green', slot: 'barn', name: 'Meadow green barn', cost: 300, coins: true, level: 10, hue: 2.1 },
  { id: 'barn_yellow', slot: 'barn', name: 'Sunny yellow barn', cost: 10, level: 18, hue: 0.9 },
  { id: 'barn_purple', slot: 'barn', name: 'Plum purple barn', cost: 10, level: 25, hue: -1.2 },
  { id: 'barn_orange', slot: 'barn', name: 'Pumpkin orange barn', cost: 15, level: 32, hue: 0.45 },
  { id: 'barn_teal', slot: 'barn', name: 'Lagoon teal barn', cost: 20, level: 45, hue: 3.0 },
  { id: 'pip_cape', slot: 'pip', name: 'Hero cape', cost: 12, level: 30 },
  { id: 'pip_crown', slot: 'pip', name: 'Tiny crown', cost: 30, level: 44 },
  { id: 'pip_shades', slot: 'pip', name: 'Cool sunglasses', cost: 35, level: 47 },
  { id: 'flag_gold', slot: 'flag', name: 'Golden bunting', cost: 40, level: 48 },
  { id: 'barn_gold', slot: 'barn', name: 'Harvest gold barn', cost: 50, level: 49, hue: 0.62 },
  { id: 'flag_none', slot: 'flag', name: 'No bunting', free: true },
  { id: 'flag_stars', slot: 'flag', name: 'Star bunting', cost: 18, level: 36 },
  { id: 'flag_bunting', slot: 'flag', name: 'Party bunting', cost: 8, level: 6 },
  { id: 'flag_lanterns', slot: 'flag', name: 'Lantern string', story: 11 },
];

// ---- neighbours -----------------------------------------------------------------------------------
export const NPCS = {
  milo: { name: 'Milo', role: 'Farmer', gift: 'wheat', color: '#7a5a2a', pos: [-3.2, 0.6], bio: 'Keeps a seed tin for every neighbour, even the ones he has not met yet.', lines: ['I saved a corner of the field for the fair. Now we just need something to share.', 'Your harvest is helping fill our pantry.', 'A tidy row saves a muddy dash later.', 'Sunflowers always turn to face the day. I try to as well.'], favour: ['wheat', 'corn', 'carrot'] },
  june: { name: 'June', role: 'Baker', gift: 'strawberry', color: '#c0503a', pos: [16, 5.5], bio: "Restoring her grandmother's fair-day recipe, one flour-dusted page at a time.", lines: ["Gran wrote 'a generous handful'. Whose hand, Gran? Whose hand?", 'A little tartness makes the old recipe taste like home.', 'Bake until it smells like Sunday. That is the whole secret.', 'Come by the bakery any time. The kettle is always on.'], favour: ['bread', 'egg', 'flour', 'muffin'] },
  hazel: { name: 'Hazel', role: 'Gardener', gift: 'sunflower', color: '#3f9a4a', pos: [9.5, -1.2], bio: 'Growing flowers along the path so the town has a reason to take the long way home.', lines: ['This border used to glow at fair time. I think it can again.', 'Look at those new buds. The square is beginning to feel like somebody cares.', 'Flowers only open when someone is there to notice.', 'A path can have a rhythm, just like a song.'], favour: ['sunflower', 'tomato', 'carrot'] },
  theo: { name: 'Theo', role: 'Maker', gift: 'candle', color: '#4a6ea8', pos: [13, -8.8], bio: 'Mending the plaza clock, and insisting the spare screws are entirely intentional.', lines: ['The clock has been right twice a day for years. I am aiming a little higher.', 'Your sketches gave me an idea. Listen: the pendulum finally has a steady swing.', 'Try the quiet answer first.', 'A lantern is just a wish with a handle.'], favour: ['candle', 'butter', 'cheese', 'wool'] },
};

// ---- story: the twelve chapters of the Lantern Fair ---------------------------------------------
export const CHAPTERS = [
  { id: 'welcome', title: 'A place to begin', text: 'Claire arrives with a seed bag and a cottage key. The quiet square once hosted the Lantern Fair; perhaps it can again.', goal: 'Harvest 6 crops', stat: 'harvests', target: 6, coins: 35, voice: 'claire_01' },
  { id: 'pantry', title: 'Fill the fair pantry', text: 'Milo has offered the first table. Send baskets from the order board to help stock it.', goal: 'Fill 4 orders', stat: 'orders', target: 4, coins: 60, voice: 'claire_05' },
  { id: 'harbour', title: 'A boat for the city', text: "The pantry is full and Marta's boat is at the dock. Fill her crates and send her off with the farm's harvest.", goal: 'Send the boat once', stat: 'boat', target: 1, coins: 90, voice: 'claire_08' },
  { id: 'recipe', title: 'A recipe worth keeping', text: "June needs a practice batch for her grandmother's notebook. Baking turns the farm's harvest into something to share.", goal: 'Bake 3 batches at the bakery', stat: 'bakery', target: 3, coins: 60, voice: 'claire_06' },
  { id: 'hello', title: 'Names become neighbours', text: 'Find Milo, June, Hazel and Theo. Everyone has a small piece of the fair to bring back.', goal: 'Say hello to 4 neighbours', stat: 'met', target: 4, coins: 45, voice: 'claire_04' },
  { id: 'garden', title: 'The long way home', text: 'Hazel imagines a flower-lined walk. Three garden decorations are a lovely start.', goal: 'Place 3 decorations', stat: 'decor', target: 3, coins: 80, voice: 'claire_07' },
  { id: 'helping', title: 'Little promises kept', text: 'Bring neighbours the things they have asked for. A community grows through small, useful kindnesses.', goal: 'Do 4 favours for neighbours', stat: 'favours', target: 4, coins: 90, voice: 'claire_10' },
  { id: 'friendship', title: 'A familiar face', text: 'Build a friendship to thirty points. The square is becoming a place to belong.', goal: 'Reach friendship 30 with a neighbour', stat: 'bestFriend', target: 30, coins: 75, voice: 'claire_13' },
  { id: 'maker', title: 'Ideas for tomorrow', text: 'Make room for another workshop in the village. There is more than one way to contribute.', goal: 'Have 3 buildings', stat: 'buildings', target: 3, coins: 100, voice: 'claire_02' },
  { id: 'cook', title: 'The fair-day kitchen', text: 'Reach cooking rank three. June is saving a spot for Claire beside the oven.', goal: 'Bake 12 batches at the bakery', stat: 'bakery', target: 12, coins: 100, voice: 'claire_06' },
  { id: 'lanterns', title: 'Light the lane', text: 'The fair needs light. Place three village lanterns along your lanes so people can find their way at dusk.', goal: 'Place 3 village lanterns', stat: 'lanterns', target: 3, coins: 120, voice: 'claire_15' },
  { id: 'fair', title: 'The first Lantern Fair', text: 'Everything is ready. Visit Milo, June, Hazel and Theo and invite each of them to the Lantern Fair in person. This is the beginning of life here, not the end.', goal: 'Invite all 4 neighbours', stat: 'invites', target: 4, coins: 150, voice: 'claire_11' },
];
export const CHAPTER_XP = 150;

// ---- order flavour --------------------------------------------------------------------------------
export const ORDER_TITLES = ["Bunny's Breakfast", 'Flower Crown', 'Berry Pie Order', 'Garden Lantern', 'Muffin Delivery', "Farmers' Lunch", 'Sunset Ideas', 'Harvest Feast', 'Garden Party', 'Creative Corner', 'Sunshine Treats', 'Muffin Mountain', 'Brilliant Ideas', "Farmers' Market", 'Glowing Garden', 'Berry Bonanza', 'Harvest Heroes', 'Sunset Symphony', 'Picnic Basket', 'Cosy Knits', 'Dairy Run', 'Farm Fresh Breakfast'];
export const CUSTOMERS = ['Milo', 'June', 'Hazel', 'Theo', 'Maple', 'Petal', 'Mr. Finch', 'Ivy', 'Captain Bo', 'Nana Rose', 'Tilly', 'Old Sam'];

// ---- boat -----------------------------------------------------------------------------------------
export const BOAT_AWAY_SEC = 20 * 60;

// ---- achievements ---------------------------------------------------------------------------------
const T = (list, mk) => list.map((n, i) => mk(n, i));
export const ACHIEVEMENTS = [
  { id: 'harvest', name: 'Green Thumb', desc: (n) => `Harvest ${n} crops`, stat: 'harvests', tiers: T([10, 50, 250, 1000, 4000], (n, i) => ({ n, coins: 30 * (i + 1) * (i + 1), stars: i + 1 })) },
  { id: 'eggs', name: 'Egg Hunter', desc: (n) => `Collect ${n} animal goods`, stat: 'collects', tiers: T([10, 50, 200, 800], (n, i) => ({ n, coins: 40 * (i + 1) * (i + 1), stars: i + 1 })) },
  { id: 'bake', name: 'Little Chef', desc: (n) => `Finish ${n} batches in the workshops`, stat: 'batches', tiers: T([5, 25, 100, 400], (n, i) => ({ n, coins: 50 * (i + 1) * (i + 1), stars: i + 1 })) },
  { id: 'orders', name: 'Good Neighbour', desc: (n) => `Fill ${n} orders`, stat: 'orders', tiers: T([5, 25, 100, 300], (n, i) => ({ n, coins: 60 * (i + 1) * (i + 1), stars: 2 * (i + 1) })) },
  { id: 'sold', name: 'Market Day', desc: (n) => `Sell ${n} items at the market`, stat: 'sold', tiers: T([25, 150, 600], (n, i) => ({ n, coins: 50 * (i + 1) * (i + 1), stars: i + 1 })) },
  { id: 'earn', name: 'Coin Collector', desc: (n) => `Earn ${n} coins in total`, stat: 'earned', tiers: T([1000, 10000, 100000], (n, i) => ({ n, coins: 100 * (i + 1), stars: 3 * (i + 1) })) },
  { id: 'level', name: 'Growing Up', desc: (n) => `Reach level ${n}`, stat: 'level', tiers: T([5, 10, 20, 30, 40, 50], (n, i) => ({ n, coins: 100 * (i + 1), stars: 3 + i * 2, cos: n === 20 ? 'hat_bee' : null })) },
  { id: 'build', name: 'Builder', desc: (n) => `Build ${n} buildings`, stat: 'buildings', tiers: T([1, 3, 6, 9], (n, i) => ({ n, coins: 80 * (i + 1), stars: i + 1 })) },
  { id: 'decor', name: 'Decorator', desc: (n) => `Place ${n} decorations`, stat: 'decor', tiers: T([5, 20, 50], (n, i) => ({ n, coins: 60 * (i + 1) * (i + 1), stars: i + 1 })) },
  { id: 'boat', name: 'Ship Shape', desc: (n) => `Send the boat ${n} times`, stat: 'boat', tiers: T([1, 5, 20], (n, i) => ({ n, coins: 120 * (i + 1), stars: 2 * (i + 1) })) },
  { id: 'streak', name: 'Every Day Is a Good Day', desc: (n) => `Visit the farm ${n} days in a row`, stat: 'bestStreak', tiers: T([3, 7, 14, 30], (n, i) => ({ n, coins: 100 * (i + 1), stars: 2 * (i + 1) })) },
  { id: 'friends', name: 'Best Friends', desc: (n) => `Reach friendship ${n}`, stat: 'bestFriend', tiers: T([30, 100, 250], (n, i) => ({ n, coins: 100 * (i + 1), stars: 2 * (i + 1) })) },
  { id: 'critters', name: 'Critter Spotter', desc: (n) => `Find ${n} wild critters`, stat: 'critters', tiers: T([3, 8], (n, i) => ({ n, coins: 90 * (i + 1), stars: 3 * (i + 1) })) },
  { id: 'album', name: 'Album Keeper', desc: (n) => `Fill ${n} stickers in the album`, stat: 'album', tiers: T([10, 30, 60], (n, i) => ({ n, coins: 100 * (i + 1), stars: 3 * (i + 1) })) },
  { id: 'fair_finale', name: 'The First Lantern Fair', desc: () => 'Finish the story and light the fair', stat: 'fair', tiers: [{ n: 1, coins: 500, stars: 10, cos: 'hat_party' }] },
];

// ---- album ----------------------------------------------------------------------------------------
export const CRITTERS = [
  { id: 'butterfly', name: 'Butterfly', hint: 'Flutters over the flowers' },
  { id: 'ladybird', name: 'Ladybird', hint: 'Hides in the long grass' },
  { id: 'bunny', name: 'Bunny', hint: 'Hops near the trees' },
  { id: 'bird', name: 'Songbird', hint: 'Sings from the tree tops' },
  { id: 'frog', name: 'Frog', hint: 'Sits by the stream' },
  { id: 'fish', name: 'Silver fish', hint: 'Leaps in the stream' },
  { id: 'firefly', name: 'Firefly', hint: 'Only out at dusk' },
  { id: 'deer', name: 'Little deer', hint: 'At the forest edge' },
];
export const ALBUM_SETS = [
  { id: 'crops', name: 'Harvest album', items: CROPS.map((c) => c.id), reward: { coins: 500, stars: 6 } },
  { id: 'critters', name: 'Critter album', items: CRITTERS.map((c) => 'crit_' + c.id), reward: { coins: 400, stars: 5 } },
  { id: 'friends', name: 'Neighbour album', items: Object.keys(NPCS).map((n) => 'npc_' + n), reward: { coins: 300, stars: 4 } },
  { id: 'animals', name: 'Barnyard album', items: ANIMALS.map((a) => 'animal_' + a.id), reward: { coins: 600, stars: 6 } },
];

// ---- daily reward: seven days, kind and steady --------------------------------------------------
export const DAILY_REWARDS = [
  { coins: 40 }, { stars: 2 }, { item: 'wheat', qty: 5 }, { coins: 120 }, { stars: 4 }, { item: 'egg', qty: 3 }, { coins: 300, stars: 8 },
];

// ---- seasonal events (no expiry pressure: an old event stays open in the Memory book) -----------
export const EVENTS = {
  spring: { id: 'blossom', name: 'Blossom Picnic', blurb: 'Spring is here. Gather things for the big picnic under the blossom trees.', baskets: [
    { need: { wheat: 6, egg: 2 }, reward: { coins: 150, stars: 2 } }, { need: { carrot: 4, milk: 2 }, reward: { coins: 220, stars: 2 } },
    { need: { sunflower: 4, flour: 2 }, reward: { coins: 320, stars: 3 } }, { need: { bread: 3, cheese: 1 }, reward: { coins: 420, stars: 3 } }, { need: { cake: 1, strawberry: 4 }, reward: { coins: 600, stars: 6, decor: 'blossom' } },
  ] },
  summer: { id: 'fest', name: 'Summer Fest', blurb: 'Sun, sand and sweet treats down at the dock.', baskets: [
    { need: { corn: 6, milk: 2 }, reward: { coins: 150, stars: 2 } }, { need: { tomato: 4, egg: 3 }, reward: { coins: 240, stars: 2 } },
    { need: { strawberry: 4, sugar: 1 }, reward: { coins: 340, stars: 3 } }, { need: { yogurt: 2, muffin: 2 }, reward: { coins: 460, stars: 3 } }, { need: { pie: 1, smoothie: 1 }, reward: { coins: 700, stars: 6, decor: 'picnic' } },
  ] },
  autumn: { id: 'harvest', name: 'Harvest Festival', blurb: 'Fill the long tables with the best of the year.', baskets: [
    { need: { potato: 4, butter: 1 }, reward: { coins: 160, stars: 2 } }, { need: { corn: 8, flour: 2 }, reward: { coins: 240, stars: 2 } },
    { need: { sunflower: 6, wool: 1 }, reward: { coins: 350, stars: 3 } }, { need: { cornbread: 2, jam: 1 }, reward: { coins: 480, stars: 3 } }, { need: { soup: 1, pie: 1 }, reward: { coins: 750, stars: 6, decor: 'scarecrow' } },
  ] },
  winter: { id: 'lights', name: 'Winter Lights', blurb: 'Long nights, warm lanterns. Bring things to keep the village cosy.', baskets: [
    { need: { candle: 2, wheat: 6 }, reward: { coins: 170, stars: 2 } }, { need: { wool: 1, milk: 2 }, reward: { coins: 260, stars: 2 } },
    { need: { lantern: 2 }, reward: { coins: 380, stars: 3 } }, { need: { bread: 3, jam: 1, butter: 1 }, reward: { coins: 500, stars: 3 } }, { need: { scarf: 1, lantern: 2 }, reward: { coins: 800, stars: 6, decor: 'campfire' } },
  ] },
};

// ---- daily quest templates ------------------------------------------------------------------------
export const QUEST_KINDS = [
  { kind: 'harvest', text: (n) => `Harvest ${n} crops`, stat: 'harvests', min: 1, base: 6, per: 0.35 },
  { kind: 'orders', text: (n) => `Fill ${n} orders`, stat: 'orders', min: 2, base: 2, per: 0.05 },
  { kind: 'collect', text: (n) => `Collect ${n} animal goods`, stat: 'collects', min: 3, base: 4, per: 0.2, need: 'pen' },
  { kind: 'batch', text: (n) => `Finish ${n} batches`, stat: 'batches', min: 3, base: 2, per: 0.08, need: 'building' },
  { kind: 'sell', text: (n) => `Sell ${n} items at the market`, stat: 'sold', min: 1, base: 6, per: 0.3 },
  { kind: 'plant', text: (n) => `Plant ${n} seeds`, stat: 'planted', min: 1, base: 8, per: 0.4 },
];

// ---- tips (shown on loading and in the pause menu) ------------------------------------------------
export const TIPS = [
  'Drag with one finger to look around. Pinch to zoom, twist with two fingers to turn the farm.',
  'Tap a field, pick a seed, then drag across the other fields to plant them all at once.',
  'Ripe crops glow gold. Tap one, then swipe over the rest to harvest a whole row.',
  'Double-tap a building to fly the camera over to it.',
  'The barn holds your goods. Upgrade it when it gets full.',
  'Orders never run out of time, so fill them whenever you are ready.',
  'Animals need a meal before they make anything. Tap the pen to feed them.',
  'Your farm keeps growing while you are away. Come back to a happy surprise.',
  'Find shy critters around the farm by tapping them. They go in the album.',
  'Pip loves a pat. Tap the puppy for a little joy.',
];

// derived tables the UI needs
export const UNLOCKS = (() => {
  const list = {};
  const add = (lv, o) => { (list[lv] || (list[lv] = [])).push(o); };
  for (const c of CROPS) add(c.level, { kind: 'crop', id: c.id, name: c.name, icon: c.icon });
  for (const a of ANIMALS) add(a.level, { kind: 'animal', id: a.id, name: a.name + ' pen', icon: a.icon });
  for (const s of SITES) add(s.level, { kind: 'building', id: s.id, name: s.name, icon: 'hammer' });
  for (const p of PATCHES) if (p.level > 1) add(p.level, { kind: 'land', id: p.id, name: 'Field ' + p.id, icon: 'land' });
  for (const d of DECOR) add(d.level, { kind: 'decor', id: d.id, name: d.name, icon: 'decor' });
  for (const [bid, b] of Object.entries(BUILDINGS)) for (const r of b.recipes) if (r.level > 1 && r.level !== (SITES.find((s) => s.id === bid) || {}).level) add(r.level, { kind: 'recipe', id: r.id, name: ITEMS[Object.keys(r.out)[0]].name, icon: ITEMS[Object.keys(r.out)[0]].icon });
  for (const u of BARN_UPGRADES) add(u.level, { kind: 'barn', id: 'barn', name: 'Barn upgrade', icon: 'barn' });
  for (const c of COSMETICS) if (c.level && c.level > 1) add(c.level, { kind: 'cosmetic', id: c.id, name: c.name, icon: 'wardrobe' });
  add(2, { kind: 'feature', id: 'orders', name: 'Order board', icon: 'orders' }); add(3, { kind: 'feature', id: 'boat', name: "Marta's boat", icon: 'boat' });
  add(5, { kind: 'feature', id: 'daily', name: 'Daily tasks', icon: 'tasks' }); add(10, { kind: 'feature', id: 'album', name: 'Album and achievements', icon: 'album' });
  return list;
})();

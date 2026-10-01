// Where everything stands. x is east (right), z is south (towards the default camera).
// Field patches, pens and building sites are fixed: the farm grows by unlocking them.
export const GROUND = 0;

// six field patches, three plots wide and two deep; every plot is 2 x 2
export const PATCHES = [
  { id: 'A', x: -8, z: 9, cost: 0, level: 1 },
  { id: 'B', x: 0, z: 9, cost: 120, level: 2 },
  { id: 'C', x: 8, z: 9, cost: 400, level: 5 },
  { id: 'D', x: -8, z: 17, cost: 1100, level: 9 },
  { id: 'E', x: 0, z: 17, cost: 2600, level: 14 },
  { id: 'F', x: 8, z: 17, cost: 5200, level: 20 },
  { id: 'G', x: -8, z: 25, cost: 9000, level: 27 },
  { id: 'H', x: 0, z: 25, cost: 14000, level: 33 },
  { id: 'I', x: 8, z: 25, cost: 21000, level: 40 },
];
export const PLOT = 2.0;
export const PATCH_COLS = 3, PATCH_ROWS = 2;
export function plotPositions(patch) {
  const out = [];
  for (let r = 0; r < PATCH_ROWS; r++) for (let c = 0; c < PATCH_COLS; c++) {
    out.push({ id: patch.id + (r * PATCH_COLS + c), patch: patch.id, x: patch.x + (c - (PATCH_COLS - 1) / 2) * PLOT * 1.08, z: patch.z + (r - (PATCH_ROWS - 1) / 2) * PLOT * 1.08 });
  }
  return out;
}

// animal pens (fenced yards)
export const PENS = [
  { id: 'chicken', name: 'Chicken coop', x: -21, z: -1, w: 7, d: 6, level: 2, cost: 100, animal: 'chicken', cap: 4, model: 'coop' },
  { id: 'cow', name: 'Cow paddock', x: -22, z: 8, w: 9, d: 8, level: 4, cost: 350, animal: 'cow', cap: 4, model: 'open_barn' },
  { id: 'pig', name: 'Pig pen', x: -22, z: 18, w: 8, d: 6, level: 8, cost: 900, animal: 'pig', cap: 3, model: null },
  { id: 'sheep', name: 'Sheep meadow', x: -23, z: 28, w: 10, d: 6, level: 12, cost: 1800, animal: 'sheep', cap: 4, model: null },
  { id: 'llama', name: 'Alpaca yard', x: -25, z: -16, w: 8, d: 6, level: 20, cost: 4200, animal: 'llama', cap: 3, model: null },
  { id: 'bees', name: 'Bee garden', x: 16, z: -20, w: 6, d: 5, level: 24, cost: 5200, animal: 'bee', cap: 4, model: null },
];

// production buildings: a lot each, unlocked and bought with coins
export const SITES = [
  { id: 'bakery', name: 'Bakery', model: 'bakery', x: 18, z: 3, yaw: -0.5, level: 3, cost: 150, width: 5.2 },
  { id: 'mill', name: 'Windmill', model: 'tower_mill', x: 12, z: -14, yaw: 0, level: 4, cost: 300, width: 4.6 },
  { id: 'dairy', name: 'Dairy', model: 'house_yellow', x: 19, z: 11, yaw: -0.5, level: 6, cost: 600, width: 4.6 },
  { id: 'lantern', name: 'Lantern workshop', model: 'workshop', x: 21, z: -6, yaw: -0.4, level: 8, cost: 900, width: 4.6 },
  { id: 'jam', name: 'Jam kitchen', model: 'house_brick', x: 19, z: 19, yaw: -0.5, level: 9, cost: 1300, width: 4.4 },
  { id: 'loom', name: 'Weaving loom', model: 'boutique', x: 25, z: 5, yaw: -0.6, level: 12, cost: 2600, width: 4.6 },
  { id: 'kitchen', name: 'Farm kitchen', model: 'cafe', x: 4, z: -19, yaw: 0, level: 14, cost: 4200, width: 6.0 },
  { id: 'press', name: 'Juice press', model: 'greenhouse', x: -6, z: -20, yaw: 0, level: 18, cost: 6500, width: 6.0 },
  { id: 'hall', name: 'Village hall', model: 'town_hall', x: 14, z: 24, yaw: -0.6, level: 22, cost: 9000, width: 5.4 },
];

// things that are always there
export const FIXED = {
  cottage: { x: 0, z: -10, yaw: 0, width: 6.4 },
  barn: { x: -10, z: -10, yaw: 0.25, width: 6.6 },
  silo1: { x: -15.5, z: -8.5, yaw: 0, height: 8.2 },
  silo2: { x: -15.5, z: -12.2, yaw: 0, height: 8.2 },
  tractor: { x: -6, z: -4, yaw: 2.2, width: 3.2 },
  market: { x: -4, z: -1, yaw: 0.2, width: 4.2 },
  fountain: { x: 8, z: -3.5, yaw: 0, width: 3.4 },
  board: { x: -8.5, z: -3.4, yaw: 0.2 },
  dock: { x: 30, z: 5 },
  well: { x: 5, z: 1.5 },
  windpump: { x: 24, z: -14 },
};

// paths (Catmull-Rom control points) that the dirt ribbons follow
export const PATHS = [
  [[-14, -4], [-8, -3], [-2, -2], [3, -2], [9, -1], [15, 0], [22, 3], [29, 5]],   // main road to the dock
  [[0, -2], [0, -6], [0, -8.5]],                                                  // to the cottage door
  [[-10, -3], [-10, -6.5]],                                                       // to the barn
  [[-4, -1], [-3, 4], [-4, 7]],                                                   // down to the fields
  [[-3, 5.5], [4, 5.5], [11, 5.5]],                                               // along the top of the fields
  [[-14, 4], [-8, 5], [-3, 5.5]],                                                 // to the pens
  [[15, 0], [17, 6], [18, 12], [18, 19]],                                         // east side lots
];

// keep-out shapes for scatter (grass, trees, flowers): circles [x, z, r]
export const KEEP = [];
function keep(x, z, r) { KEEP.push([x, z, r]); }
PATCHES.forEach((p) => keep(p.x, p.z, 6.4));
PENS.forEach((p) => keep(p.x, p.z, Math.max(p.w, p.d) * 0.72));
SITES.forEach((s) => keep(s.x, s.z, 4.2));
keep(FIXED.cottage.x, FIXED.cottage.z, 5.5); keep(FIXED.barn.x, FIXED.barn.z, 5.2); keep(FIXED.silo1.x, FIXED.silo1.z, 2.4); keep(FIXED.silo2.x, FIXED.silo2.z, 2.4);
keep(FIXED.tractor.x, FIXED.tractor.z, 2.2); keep(FIXED.market.x, FIXED.market.z, 3); keep(FIXED.fountain.x, FIXED.fountain.z, 2.6); keep(FIXED.board.x, FIXED.board.z, 1.6);
keep(FIXED.windpump.x, FIXED.windpump.z, 2.2); keep(FIXED.dock.x - 2, FIXED.dock.z, 5);

// decorative crop fields around the farm: not playable, just a working landscape. [x0, z0, x1, z1, blocks...]
export const SCENIC = [
  { x0: -41, z0: -15, x1: -31, z1: -3, kinds: ['wheat', 'greenwheat'] },
  { x0: -41, z0: 2, x1: -31, z1: 15, kinds: ['sunflower', 'corn'] },
  { x0: -40, z0: 20, x1: -31, z1: 32, kinds: ['lettuce', 'tomato', 'lavender'] },
  { x0: -30, z0: -29, x1: -17, z1: -19, kinds: ['wheat', 'corn'] },
  { x0: -14, z0: 35, x1: -1, z1: 44, kinds: ['pumpkin', 'lettuce', 'greenwheat'] },
  { x0: 3, z0: 34, x1: 15, z1: 43, kinds: ['sunflower', 'wheat'] },
  { x0: 20, z0: 27, x1: 29, z1: 38, kinds: ['lavender', 'tomato'] },
];
SCENIC.forEach((f) => { const cx = (f.x0 + f.x1) / 2, cz = (f.z0 + f.z1) / 2, hw = (f.x1 - f.x0) / 2, hd = (f.z1 - f.z0) / 2; const n = Math.ceil(Math.max(hw, hd) / 3.2); for (let i = 0; i < n; i++) { const t = n === 1 ? 0 : i / (n - 1) * 2 - 1; if (hw >= hd) keep(cx + t * (hw - hd), cz, hd + 1.5); else keep(cx, cz + t * (hd - hw), hw + 1.5); } });

export function blocked(x, z, pad = 0) {
  for (const [kx, kz, kr] of KEEP) { const dx = x - kx, dz = z - kz; if (dx * dx + dz * dz < (kr + pad) * (kr + pad)) return true; }
  return false;
}

// how far the camera target may roam
export const CAMERA_BOUNDS = { minX: -26, maxX: 34, minZ: -26, maxZ: 32 };

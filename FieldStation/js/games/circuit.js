/* CIRCUIT BAY — Y7–9 electricity.
 *
 * The whole point: there is no answer key. A modified-nodal-analysis solver
 * computes node voltages and branch currents for whatever the student builds,
 * and bulb brightness is literally P = I²R. Series dims bulbs because the
 * maths says so, not because a lookup table said so.
 */
import { el, fitCanvas, taskCard, why, INK, clamp } from '../core.js';

/* ── topology: 4 columns × 2 rows of nodes ───────────────────
     n0 ──a── n1 ──b── n2 ──c── n3
     |        |        |        |
    BAT      r1       r2       r3
     |        |        |        |
     n4 ──d── n5 ──e── n6 ──f── n7
   The battery sits on the left rung permanently. Nine slots remain. */
const COLS = 4, ROWS = 2;
const NI = (c, r) => r * COLS + c;

export const EDGES = [];
for (let c = 0; c < COLS - 1; c++) { EDGES.push({ a: NI(c,0), b: NI(c+1,0), kind:'h', c, r:0 }); }
for (let c = 0; c < COLS - 1; c++) { EDGES.push({ a: NI(c,1), b: NI(c+1,1), kind:'h', c, r:1 }); }
for (let c = 0; c < COLS;     c++) { EDGES.push({ a: NI(c,0), b: NI(c,1),   kind:'v', c }); }
const BATTERY_EDGE = EDGES.findIndex(e => e.kind === 'v' && e.c === 0);

const PARTS = {
  empty:    { label:'Empty',    R:null,  color:INK.dust  },
  wire:     { label:'Wire',     R:1e-3,  color:INK.ink   },
  bulb:     { label:'Bulb',     R:6,     color:INK.ochre },
  resistor: { label:'Resistor', R:20,    color:INK.slate },
  switch:   { label:'Switch',   R:1e-3,  color:INK.plum  }   // R when closed
};
const BATTERY_V = 6;
const BULB_FULL_P = BATTERY_V * BATTERY_V / PARTS.bulb.R;   // one bulb straight across the cell

/* ── linear solve: Gaussian elimination, partial pivoting ── */
function solveLinear(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[p][i])) p = k;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    if (Math.abs(A[i][i]) < 1e-14) continue;                // leave as 0; the leak term keeps us sane
    for (let k = i + 1; k < n; k++) {
      const f = A[k][i] / A[i][i];
      if (!f) continue;
      for (let j = i; j < n; j++) A[k][j] -= f * A[i][j];
      b[k] -= f * b[i];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
    x[i] = Math.abs(A[i][i]) < 1e-14 ? 0 : s / A[i][i];
  }
  return x;
}

/**
 * Modified nodal analysis.
 * @param slots  array of part-name per edge index
 * @param open   Set of edge indices whose switch is forced open
 */
export function solve(slots, open = new Set()) {
  const N = COLS * ROWS, M = 1;                     // one voltage source
  const size = N + M;
  const A = Array.from({ length: size }, () => new Array(size).fill(0));
  const b = new Array(size).fill(0);

  // Every node leaks a hair of conductance to ground. Without this a floating
  // node makes the matrix singular and the whole board reads NaN.
  for (let i = 0; i < N; i++) A[i][i] += 1e-9;

  const branches = [];
  EDGES.forEach((e, i) => {
    if (i === BATTERY_EDGE) return;
    const part = slots[i];
    if (part === 'empty') return;
    if (part === 'switch' && open.has(i)) return;    // an open switch is simply not there
    const R = Math.max(PARTS[part].R, 1e-4);
    const g = 1 / R;
    A[e.a][e.a] += g; A[e.b][e.b] += g;
    A[e.a][e.b] -= g; A[e.b][e.a] -= g;
    branches.push({ i, e, R, part });
  });

  // battery: node(0,0) is +, node(0,1) is − and is our ground reference
  const bp = EDGES[BATTERY_EDGE].a, bn = EDGES[BATTERY_EDGE].b;
  const vs = N;
  A[vs][bp] = 1; A[vs][bn] = -1; A[bp][vs] = 1; A[bn][vs] = -1;
  b[vs] = BATTERY_V;

  // ground the battery's negative terminal
  for (let j = 0; j < size; j++) A[bn][j] = 0;
  A[bn][bn] = 1; b[bn] = 0;

  const x = solveLinear(A, b);
  const V = x.slice(0, N).map(v => Number.isFinite(v) ? v : 0);
  const supply = Number.isFinite(x[vs]) ? -x[vs] : 0;   // current delivered by the cell

  const bulbs = [], parts = [];
  branches.forEach(br => {
    const dv = V[br.e.a] - V[br.e.b];
    const I = dv / br.R;
    const P = I * I * br.R;
    const rec = { ...br, I, dv, P, brightness: clamp(P / BULB_FULL_P, 0, 1.4) };
    parts.push(rec);
    if (br.part === 'bulb') bulbs.push(rec);
  });

  return { V, supply: Math.abs(supply), bulbs, parts };
}

/* ── the brief ─────────────────────────────────────────────── */
const TASKS = [
  { id:'one-bulb', skill:'complete-circuit',
    title:'Light one bulb.',
    detail:'A bulb only lights if current has an unbroken path out of the cell and back into it. Use wires to close the loop.',
    check: s => s.bulbs.length === 1 && s.bulbs[0].brightness > 0.6,
    teach: s => `One loop, one bulb. The cell pushes ${BATTERY_V} V across ${PARTS.bulb.R} Ω, so I = V ÷ R = ${(BATTERY_V/PARTS.bulb.R).toFixed(2)} A. That is full brightness — the benchmark every other circuit is judged against.` },

  { id:'series', skill:'series',
    title:'Two bulbs in series — both alight, both dimmer.',
    detail:'Series means one single path: the same current must pass through both bulbs, one after the other.',
    check: s => s.bulbs.length === 2
      && s.bulbs.every(b => b.brightness > 0.05 && b.brightness < 0.45)
      && Math.abs(s.bulbs[0].I - s.bulbs[1].I) < 0.02,
    teach: s => `Both bulbs carry the identical current — ${Math.abs(s.bulbs[0].I).toFixed(2)} A — because there is nowhere else for charge to go. But the resistance the cell sees has doubled to ${(PARTS.bulb.R*2)} Ω, so that shared current is halved. Half the current through the same resistance gives a quarter of the power: P = I²R. That is why series bulbs are so much dimmer, not just a bit.` },

  { id:'parallel', skill:'parallel',
    title:'Two bulbs in parallel — both at full brightness.',
    detail:'Parallel means the current splits, then rejoins. Each bulb needs its own branch across the cell.',
    check: s => s.bulbs.length === 2 && s.bulbs.every(b => b.brightness > 0.85),
    teach: s => `Each branch has the full ${BATTERY_V} V across it, so each bulb draws its own ${(BATTERY_V/PARTS.bulb.R).toFixed(2)} A and burns just as brightly as it would alone. The cell is now supplying ${s.supply.toFixed(2)} A — double the work. Real batteries flatten twice as fast in this circuit.` },

  { id:'independent', skill:'parallel-switching',
    title:'One switch that kills one bulb and leaves the other lit.',
    detail:'This is how the lights in a house are wired. Put both bulbs in parallel and place the switch in only one of the two branches.',
    check: (s, slots) => {
      if (s.bulbs.length !== 2 || !s.bulbs.every(b => b.brightness > 0.6)) return false;
      const sw = slots.findIndex(p => p === 'switch');
      if (sw < 0) return false;
      const off = solve(slots, new Set([sw]));
      return off.bulbs.filter(b => b.brightness > 0.6).length === 1;
    },
    teach: () => `Open the switch and its branch is gone, but the other branch still has an unbroken path to the cell, so it stays fully lit. In series this is impossible — breaking the loop anywhere stops every bulb. This is precisely why household lighting is wired in parallel.` },

  { id:'limit', skill:'resistance',
    title:'Keep a bulb lit while the cell supplies under 0.35 A.',
    detail:'Add resistance in series with the bulb. More total resistance, less current — for the same voltage.',
    check: s => s.bulbs.length >= 1 && s.bulbs.some(b => b.brightness > 0.02) && s.supply < 0.35,
    teach: s => `Total resistance in the loop is now roughly ${(BATTERY_V / Math.max(s.supply, 1e-6)).toFixed(0)} Ω, so I = V ÷ R = ${s.supply.toFixed(2)} A. The bulb is dim because it is only getting a share of the ${BATTERY_V} V — the resistor takes the rest. Resistors in series split the voltage between them.` }
];

/* ── module ───────────────────────────────────────────────── */
export function start(root, api) {
  let slots = EDGES.map(() => 'empty');
  let tool = 'wire';
  let taskIx = 0;
  let solved = new Set();
  let sim = solve(slots);
  let lastFail = null;
  let switchOpen = false;

  const cv = el('canvas', { class:'board' });
  const taskHost = el('div');
  const notes = el('div', { class:'panel' });
  const stage = el('div', { class:'stage', style:'grid-template-columns:minmax(0,1fr)' });

  const palette = el('div', { class:'panel' },
    el('h3', {}, 'Components'),
    el('div', { class:'row' },
      Object.keys(PARTS).map(k =>
        el('button', {
          class:'chip' + (k === tool ? ' on' : ''),
          'data-tool':k,
          onclick: () => { tool = k; api.Sound.click(); paintPalette(); }
        }, PARTS[k].label + (PARTS[k].R && k !== 'wire' && k !== 'switch' ? ` · ${PARTS[k].R} Ω` : '')))),
    el('p', { class:'note', style:'margin-top:10px' },
      'Tap a gap in the board to drop the selected component. Tap it again with “Empty” to lift it out. The cell is fixed at 6 V.'),
    el('div', { class:'row', style:'margin-top:12px' },
      el('button', { class:'btn ghost', onclick: () => { slots = EDGES.map(() => 'empty'); refresh(); } }, 'Clear board'),
      el('button', { class:'btn ghost', id:'swbtn', onclick: () => { switchOpen = !switchOpen; refresh(); } }, 'Toggle switch')));

  function paintPalette() {
    palette.querySelectorAll('[data-tool]').forEach(b =>
      b.classList.toggle('on', b.dataset.tool === tool));
  }

  stage.append(taskHost, cv, palette, notes);
  root.append(stage);

  /* ── hit testing ── */
  let geom = null;
  function layout() {
    const { g, w, h } = fitCanvas(cv, Math.min(400, Math.max(280, cv.clientWidth * 0.52)));
    const padX = w * 0.11, padY = h * 0.2;
    const dx = (w - padX * 2) / (COLS - 1), dy = h - padY * 2;
    const pos = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
      pos[NI(c, r)] = { x: padX + c * dx, y: padY + r * dy };
    geom = { g, w, h, pos, dx, dy };
    return geom;
  }

  cv.addEventListener('pointerdown', e => {
    if (!geom) return;
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best = -1, bd = 1e9;
    EDGES.forEach((ed, i) => {
      if (i === BATTERY_EDGE) return;
      const a = geom.pos[ed.a], b = geom.pos[ed.b];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const d = Math.hypot(mx - x, my - y);
      if (d < bd) { bd = d; best = i; }
    });
    if (best >= 0 && bd < Math.min(geom.dx, geom.dy) * 0.44) {
      slots[best] = tool;
      api.Sound.click();
      refresh();
    }
  });

  /* ── drawing ── */
  function symbol(g, part, x, y, ang, live) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.lineWidth = 3; g.strokeStyle = INK.ink; g.lineCap = 'round';
    const P = PARTS[part];
    if (part === 'wire') { g.beginPath(); g.moveTo(-18, 0); g.lineTo(18, 0); g.stroke(); }
    if (part === 'resistor') {
      g.beginPath(); g.moveTo(-20, 0); g.lineTo(-12, 0);
      for (let i = 0; i < 6; i++) g.lineTo(-12 + i * 4 + 2, i % 2 ? 6 : -6);
      g.lineTo(12, 0); g.lineTo(20, 0); g.strokeStyle = INK.slate; g.stroke();
    }
    if (part === 'switch') {
      g.beginPath(); g.moveTo(-20, 0); g.lineTo(-8, 0); g.stroke();
      g.beginPath(); g.moveTo(8, 0); g.lineTo(20, 0); g.stroke();
      g.strokeStyle = INK.plum; g.beginPath(); g.moveTo(-8, 0);
      switchOpen ? g.lineTo(7, -12) : g.lineTo(8, 0);
      g.stroke();
      g.fillStyle = INK.plum;
      g.beginPath(); g.arc(-8, 0, 3.2, 0, 7); g.fill();
      g.beginPath(); g.arc(8, 0, 3.2, 0, 7); g.fill();
    }
    if (part === 'bulb') {
      g.beginPath(); g.moveTo(-22, 0); g.lineTo(-13, 0); g.stroke();
      g.beginPath(); g.moveTo(13, 0); g.lineTo(22, 0); g.stroke();
      if (live > 0.02) {                                   // filament glow, drawn as flat rings
        g.fillStyle = INK.ochre; g.globalAlpha = clamp(live, 0, 1) * 0.5;
        g.beginPath(); g.arc(0, 0, 13 + live * 9, 0, 7); g.fill();
        g.globalAlpha = 1;
      }
      g.fillStyle = live > 0.02 ? INK.ochre : INK.paper2;
      g.globalAlpha = live > 0.02 ? clamp(0.25 + live, 0, 1) : 1;
      g.beginPath(); g.arc(0, 0, 12, 0, 7); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = INK.ink; g.lineWidth = 2.6;
      g.beginPath(); g.arc(0, 0, 12, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(-8.5, -8.5); g.lineTo(8.5, 8.5);
      g.moveTo(8.5, -8.5); g.lineTo(-8.5, 8.5); g.lineWidth = 2; g.stroke();
    }
    g.restore();
  }

  let t0 = performance.now();
  function draw() {
    const { g, w, h, pos } = geom || layout();
    g.clearRect(0, 0, w, h);
    const now = performance.now(), dt = (now - t0) / 1000;

    // edges
    EDGES.forEach((ed, i) => {
      const a = pos[ed.a], b = pos[ed.b];
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const part = i === BATTERY_EDGE ? 'battery' : slots[i];
      const rec = sim.parts.find(p => p.i === i);
      const cur = rec ? Math.abs(rec.I) : (i === BATTERY_EDGE ? sim.supply : 0);

      // conductor
      g.strokeStyle = (part === 'empty') ? 'rgba(36,31,40,.16)' : INK.ink;
      g.lineWidth = (part === 'empty') ? 2 : 3;
      g.setLineDash(part === 'empty' ? [5, 6] : []);
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      g.setLineDash([]);

      // current: marching dashes, speed and density from the real current
      if (cur > 1e-3) {
        g.strokeStyle = INK.rust; g.lineWidth = 2.4;
        const off = (dt * cur * 120) % 16;
        g.setLineDash([4, 12]); g.lineDashOffset = -off;
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
        g.setLineDash([]); g.lineDashOffset = 0;
      }

      // clear the slot then stamp the symbol
      if (part !== 'empty') {
        g.save(); g.translate(mx, my); g.rotate(ang);
        g.fillStyle = INK.paper2; g.fillRect(-24, -15, 48, 30); g.restore();
      }
      if (i === BATTERY_EDGE) {
        g.save(); g.translate(mx, my); g.rotate(ang);
        g.strokeStyle = INK.ink; g.lineWidth = 3;
        g.beginPath(); g.moveTo(-20, 0); g.lineTo(-6, 0); g.moveTo(6, 0); g.lineTo(20, 0); g.stroke();
        g.lineWidth = 4; g.beginPath(); g.moveTo(-6, -13); g.lineTo(-6, 13); g.stroke();
        g.lineWidth = 3; g.beginPath(); g.moveTo(6, -7); g.lineTo(6, 7); g.stroke();
        g.restore();
        g.fillStyle = INK.ink; g.font = '700 12px Archivo, sans-serif';
        g.textAlign = 'center'; g.fillText(BATTERY_V + ' V', mx - 34, my + 4);
      } else if (part !== 'empty') {
        symbol(g, part, mx, my, ang, rec ? rec.brightness : 0);
        if (cur > 1e-3) {
          g.fillStyle = INK.rust; g.font = '700 10px Archivo, sans-serif'; g.textAlign = 'center';
          g.fillText(cur.toFixed(2) + ' A', mx + (ed.kind === 'v' ? 38 : 0), my + (ed.kind === 'v' ? 4 : -22));
        }
      }
    });

    // nodes + potentials
    pos.forEach((p, i) => {
      g.fillStyle = INK.ink;
      g.beginPath(); g.arc(p.x, p.y, 5, 0, 7); g.fill();
      g.fillStyle = INK.ink2; g.font = '700 10px Archivo, sans-serif'; g.textAlign = 'center';
      g.fillText(sim.V[i].toFixed(1) + ' V', p.x, p.y + (i < COLS ? -13 : 22));
    });

    requestAnimationFrame(draw);
  }

  /* ── task flow ── */
  function refresh() {
    sim = solve(slots, switchOpen ? new Set(slots.map((p, i) => p === 'switch' ? i : -1).filter(i => i >= 0)) : new Set());
    const task = TASKS[taskIx];
    const passed = task.check(sim, slots);

    taskHost.replaceChildren(
      taskCard(`Brief ${taskIx + 1} of ${TASKS.length}`, task.title, task.detail),
      el('div', { class:'readout', style:'margin-top:12px' },
        el('div', { class:'c' }, el('div', { class:'l' }, 'Cell current'),
          el('div', { class:'v' }, sim.supply.toFixed(2) + ' A')),
        el('div', { class:'c' }, el('div', { class:'l' }, 'Bulbs lit'),
          el('div', { class:'v' }, String(sim.bulbs.filter(b => b.brightness > .05).length))),
        el('div', { class:'c' }, el('div', { class:'l' }, 'Total R'),
          el('div', { class:'v' }, sim.supply > 1e-4 ? (BATTERY_V / sim.supply).toFixed(1) + ' Ω' : '∞')),
        el('div', { class:'c' }, el('div', { class:'l' }, 'Certified'),
          el('div', { class:'v' }, `${solved.size}/${TASKS.length}`))));

    $swbtn();
    notes.replaceChildren(el('h3', {}, 'Bench notes'));

    if (passed && !solved.has(task.id)) {
      solved.add(task.id);
      api.record(task.skill, true);
      api.Sound.win();
      api.toast('Brief ' + (taskIx + 1) + ' certified', 'win');
      api.complete(Math.round(solved.size / TASKS.length * 100));
      notes.append(why('Why that works', task.teach(sim)));
      if (taskIx < TASKS.length - 1) {
        notes.append(el('div', { style:'margin-top:12px' },
          el('button', { class:'btn go', onclick: () => { taskIx++; lastFail = null; refresh(); } },
            'Next brief →')));
      } else {
        notes.append(el('p', { class:'note', style:'margin-top:12px' },
          'All five briefs certified. You have built, measured and explained every circuit on the Y7–9 electricity syllabus.'));
      }
    } else if (passed) {
      notes.append(why('Why that works', task.teach(sim)));
      if (taskIx < TASKS.length - 1)
        notes.append(el('div', { style:'margin-top:12px' },
          el('button', { class:'btn go', onclick: () => { taskIx++; refresh(); } }, 'Next brief →')));
    } else {
      notes.append(el('p', { class:'note' }, diagnose(sim, task)));
    }
  }

  /* Diagnosis reads the actual solved circuit — it is not a canned hint. */
  function diagnose(s, task) {
    const placed = slots.filter(p => p !== 'empty').length;
    if (!placed) return 'The board is empty. Current needs a continuous conducting path from the + terminal of the cell, through your components, back to the − terminal.';
    if (s.supply < 1e-3) return 'No current is flowing anywhere, so the loop is broken. Trace from the + terminal with your finger: can you get back to the − terminal without lifting it?';
    const nb = s.bulbs.length;
    if (task.id === 'series' && nb === 2) {
      const equal = Math.abs(s.bulbs[0].I - s.bulbs[1].I) < 0.02;
      if (!equal) return `Your two bulbs carry different currents (${Math.abs(s.bulbs[0].I).toFixed(2)} A and ${Math.abs(s.bulbs[1].I).toFixed(2)} A), so they are on separate branches — that is parallel, not series. In series the same charge must pass through both.`;
      if (s.bulbs[0].brightness > 0.45) return 'Both bulbs share a current, but they are still too bright — check there is only one path and nothing is short-circuiting a bulb with a plain wire beside it.';
    }
    if (task.id === 'parallel' && nb === 2 && s.bulbs[0].brightness < 0.85)
      return `Both bulbs are lit but dim (${(s.bulbs[0].brightness * 100).toFixed(0)}%), which means they are sharing one path. For full brightness each bulb needs its own separate route across the cell.`;
    if (nb === 0) return 'No bulb on the board yet — you need something that turns current into light before anything can be judged.';
    return `Current is flowing (${s.supply.toFixed(2)} A from the cell) but the brief is not met yet. Read the numbers on the board: the arrows show where charge is actually going.`;
  }

  function $swbtn() {
    const b = palette.querySelector('#swbtn');
    if (b) { b.textContent = switchOpen ? 'Switch: OPEN' : 'Switch: CLOSED'; }
  }

  // Build the UI synchronously. Deferring this to rAF means the instrument
  // never initialises if the tab is not compositing when it opens.
  layout(); refresh();
  requestAnimationFrame(draw);
  addEventListener('resize', () => { geom = null; layout(); });
}

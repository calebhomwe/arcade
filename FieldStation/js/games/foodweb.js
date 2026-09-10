/* ECOLOGY DECK — Y6–9 ecosystems, food webs and trophic cascades.
 *
 * Built around predict-then-test, which is the actual scientific method and is
 * almost never what edu-games do. The student commits to a prediction BEFORE
 * running the model. Then the model — a coupled population system with real
 * feedback, not a scripted animation — either vindicates them or does not.
 */
import { el, fitCanvas, taskCard, why, INK, clamp } from '../core.js';

/* ── the web: a temperate kelp coast. The otter/urchin/kelp cascade is the
      textbook example of a keystone species, and it is genuinely surprising. ── */
export const SPECIES = [
  { id:'kelp',    name:'Kelp',        level:0, r:0.45, K:100, N:60, x:0.16, y:0.86 },
  { id:'plankton',name:'Plankton',    level:0, r:0.82, K:100, N:70, x:0.62, y:0.90 },
  { id:'urchin',  name:'Sea urchin',  level:1, d:0.040, N:20, x:0.14, y:0.56 },
  { id:'smallfish',name:'Small fish', level:1, d:0.071, N:30, x:0.58, y:0.60 },
  { id:'crab',    name:'Crab',        level:1, d:0.023, N:20, x:0.86, y:0.62 },
  { id:'otter',   name:'Sea otter',   level:2, d:0.157, N:8,  x:0.30, y:0.28 },
  { id:'seal',    name:'Seal',        level:2, d:0.044, N:8,  x:0.72, y:0.30 },
  { id:'orca',    name:'Orca',        level:3, d:0.054, N:3,  x:0.52, y:0.08 }
];
/* predator eats prey, with attack rate a.
   Death rates above are NOT arbitrary: each was solved from the steady-state
   condition  d_i = EFF * Σ(a_ij N_j) − Σ(a_ki N_k)  at the starting populations,
   so the untouched web actually persists. Guessed values collapsed the top five
   species inside a century and made every mission return the same dead ocean. */
const LINKS = [
  { p:'urchin',    q:'kelp',      a:0.0090 },
  { p:'smallfish', q:'plankton',  a:0.0055 },
  { p:'crab',      q:'plankton',  a:0.0040 },
  { p:'otter',     q:'urchin',    a:0.0180 },
  { p:'otter',     q:'crab',      a:0.0090 },
  { p:'seal',      q:'smallfish', a:0.0075 },
  { p:'orca',      q:'seal',      a:0.0110 },
  { p:'orca',      q:'otter',     a:0.0090 }
];
const EFF = 0.34;                 // energy passed up a level — the reason webs narrow at the top
const EXTINCT = 0.8;

function freshWorld(removed = new Set()) {
  const N = {};
  SPECIES.forEach(s => N[s.id] = removed.has(s.id) ? 0 : s.N);
  return { N, removed: new Set(removed), t: 0, history: [] };
}

export function stepWorld(w, dt = 0.1) {
  const N = w.N, dN = {};
  SPECIES.forEach(s => dN[s.id] = 0);

  SPECIES.forEach(s => {
    if (w.removed.has(s.id)) return;
    if (s.level === 0) dN[s.id] += s.r * N[s.id] * (1 - N[s.id] / s.K);
    else               dN[s.id] -= s.d * N[s.id];
  });
  LINKS.forEach(l => {
    if (w.removed.has(l.p) || w.removed.has(l.q)) return;
    const eaten = l.a * N[l.p] * N[l.q];
    dN[l.q] -= eaten;
    dN[l.p] += EFF * eaten;
  });

  SPECIES.forEach(s => {
    if (w.removed.has(s.id)) { N[s.id] = 0; return; }
    N[s.id] = clamp(N[s.id] + dN[s.id] * dt, 0, s.K || 140);
    if (N[s.id] < EXTINCT) N[s.id] = 0;
  });
  w.t += dt;
  if (w.history.length < 4000) w.history.push({ ...N });
  return w;
}

export function runFor(removed, seasons = 120) {
  const w = freshWorld(removed);
  for (let i = 0; i < seasons * 10; i++) stepWorld(w, 0.1);
  return w;
}

const nameOf = id => SPECIES.find(s => s.id === id).name;

/* ── missions: predict, then test ───────────────────────────── */
const MISSIONS = [
  { id:'otters', skill:'trophic-cascade', remove:['otter'],
    brief:'Fur hunters have taken every sea otter off this coast.',
    question:'Otters eat sea urchins. Urchins eat kelp. Predict what happens to the KELP FOREST once the otters are gone.',
    options:[
      { t:'The kelp forest collapses — urchins are released and graze it down.', ok:true },
      { t:'The kelp is unaffected, because otters never touched kelp.', ok:false },
      { t:'The kelp grows thicker, because otters used to damage it.', ok:false },
      { t:'The kelp is replaced by plankton.', ok:false }],
    teach:'Otters do not touch kelp, and yet removing them destroys the kelp forest. That is a trophic cascade: an effect that travels down the web, skipping a level. The urchins were never limited by food — they were limited by being eaten. Take the predator away and the herbivore population explodes until the plants are gone. This exact collapse happened along the North American Pacific coast in the 1700s and 1800s.' },

  { id:'plankton', skill:'producers', remove:['plankton'],
    brief:'A pollution event wipes out the plankton.',
    question:'Plankton is a producer at the very bottom of the web. Predict the effect on the SEALS, three levels above it.',
    options:[
      { t:'Seals crash too — their prey, the small fish, starve first.', ok:true },
      { t:'Seals are unaffected; they eat fish, not plankton.', ok:false },
      { t:'Seals increase, since fish are easier to catch when weak.', ok:false },
      { t:'Only the crabs are affected.', ok:false }],
    teach:'Nothing in an ecosystem is more than a few steps from a producer. Every joule of energy in that seal was captured by plankton photosynthesising and then passed up, losing roughly two thirds at each step. Cut the base and the whole column above it has nothing to stand on — which is why producers are drawn at the bottom of every food web you will ever see.' },

  { id:'orca', skill:'top-down', remove:['orca'],
    brief:'The orcas move to another stretch of coast.',
    question:'Orcas eat both seals and otters. Predict what happens to the KELP.',
    options:[
      { t:'Kelp thrives — more otters survive, so urchins are held down.', ok:true },
      { t:'Kelp collapses, because more predators means less of everything.', ok:false },
      { t:'Kelp is unchanged; orcas are too far up the web to matter.', ok:false },
      { t:'Kelp is eaten by the extra seals.', ok:false }],
    teach:'Removing a top predator helped the plants this time, because the species it was eating is itself a predator of a herbivore. Count the steps: orca → otter → urchin → kelp. Effects alternate as they travel down an even or odd number of links. This is why “more predators is bad for plants” is not a rule you can rely on — you have to trace the actual chain.' },

  { id:'keystone', skill:'keystone', remove:[], choose:true,
    brief:'The station must protect exactly one species with its remaining budget.',
    question:'Which single species, if lost, damages this web the most? Choose the one you would protect.',
    options:[
      { t:'Sea otter', ok:true },
      { t:'Crab', ok:false },
      { t:'Seal', ok:false },
      { t:'Orca', ok:false }],
    teach:'A keystone species is one whose influence on the web is far larger than its numbers suggest. There are only eight otters here against seventy units of plankton, yet removing them takes the kelp forest from 60 down to 13 — total disruption across the web more than double that of removing the seal, and roughly nine times that of removing the orca. Ecologists protect keystones first precisely because the budget goes furthest there. You can verify this yourself in free mode: remove each species in turn and count the extinctions.' }
];

export function start(root, api) {
  let ix = 0, right = 0, phase = 'predict', world = freshWorld(), removed = new Set();
  let baseline = runFor(new Set());

  const cv = el('canvas', { class:'board' });
  const host = el('div');
  const panel = el('div', { class:'panel' });
  const stage = el('div', { class:'stage', style:'grid-template-columns:minmax(0,1fr)' });
  stage.append(host, cv, panel);
  root.append(stage);

  /* ── drawing: web on the left, time series on the right ── */
  let geom = null;
  function draw() {
    if (!geom || geom.wCss !== cv.clientWidth) geom = { ...fitCanvas(cv, 400), wCss: cv.clientWidth };
    const { g, w, h } = geom;
    g.clearRect(0, 0, w, h);
    const split = w > 640 ? w * 0.48 : w;
    const chartX = w > 640 ? split + 14 : 0;

    // web graph
    g.save();
    const pad = 26, gw = split - pad * 2, gh = h - pad * 2;
    const P = {};
    SPECIES.forEach(s => P[s.id] = { x: pad + s.x * gw, y: pad + s.y * gh });
    LINKS.forEach(l => {
      const a = P[l.q], b = P[l.p];
      const dead = world.N[l.p] <= 0 || world.N[l.q] <= 0;
      g.strokeStyle = dead ? 'rgba(36,31,40,.13)' : 'rgba(36,31,40,.42)';
      g.lineWidth = dead ? 1.4 : 2;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      if (!dead) {                                  // arrowhead: energy flows prey → predator
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const mx = a.x + (b.x - a.x) * 0.62, my = a.y + (b.y - a.y) * 0.62;
        g.fillStyle = 'rgba(36,31,40,.42)';
        g.save(); g.translate(mx, my); g.rotate(ang);
        g.beginPath(); g.moveTo(6, 0); g.lineTo(-5, 4); g.lineTo(-5, -4); g.fill(); g.restore();
      }
    });
    SPECIES.forEach(s => {
      const p = P[s.id], n = world.N[s.id];
      const base = s.level === 0 ? INK.sage : s.level === 1 ? INK.ochre : s.level === 2 ? INK.rust : INK.plum;
      const r = 8 + Math.sqrt(Math.max(n, 0)) * 1.9;
      if (n <= 0) {
        g.strokeStyle = INK.rust; g.lineWidth = 2.5;
        g.beginPath(); g.arc(p.x, p.y, 10, 0, 7); g.stroke();
        g.beginPath(); g.moveTo(p.x - 6, p.y - 6); g.lineTo(p.x + 6, p.y + 6);
        g.moveTo(p.x + 6, p.y - 6); g.lineTo(p.x - 6, p.y + 6); g.stroke();
      } else {
        g.fillStyle = base; g.beginPath(); g.arc(p.x, p.y, r, 0, 7); g.fill();
        g.strokeStyle = INK.ink; g.lineWidth = 2; g.stroke();
      }
      g.fillStyle = INK.ink; g.font = '700 10.5px Archivo, sans-serif'; g.textAlign = 'center';
      g.fillText(s.name, p.x, p.y + r + 13);
      if (n > 0) { g.fillStyle = INK.ink2; g.fillText(Math.round(n), p.x, p.y + 3.5); }
    });
    g.restore();

    // time series
    if (w > 640) {
      const cw = w - chartX - 14, ch = h - 44;
      g.strokeStyle = INK.ink; g.lineWidth = 2;
      g.strokeRect(chartX, 20, cw, ch);
      g.fillStyle = INK.ink2; g.font = '700 10px Archivo, sans-serif'; g.textAlign = 'left';
      g.fillText('POPULATION OVER TIME', chartX, 14);
      const H = world.history;
      if (H.length > 2) {
        SPECIES.forEach(s => {
          g.strokeStyle = s.level === 0 ? INK.sage : s.level === 1 ? INK.ochre : s.level === 2 ? INK.rust : INK.plum;
          g.lineWidth = s.id === 'kelp' || s.id === 'otter' || s.id === 'urchin' ? 2.6 : 1.3;
          g.beginPath();
          for (let i = 0; i < H.length; i += Math.max(1, Math.floor(H.length / cw))) {
            const x = chartX + (i / (H.length - 1)) * cw;
            const y = 20 + ch - (H[i][s.id] / 110) * ch;
            i ? g.lineTo(x, y) : g.moveTo(x, y);
          }
          g.stroke();
        });
      }
    }
    raf = requestAnimationFrame(draw);
  }
  let raf = 0;

  /* ── mission flow ── */
  function render() {
    const m = MISSIONS[ix];
    world = freshWorld();
    panel.replaceChildren(el('h3', {}, 'Prediction'));

    const opts = el('div', { style:'display:grid;gap:8px' });
    m.options.forEach(o => opts.append(el('button', {
      class:'chip', style:'text-align:left;padding:12px 14px;font-weight:600',
      onclick:() => commit(m, o, opts)
    }, o.t)));
    panel.append(opts);
    panel.append(el('p', { class:'note', style:'margin-top:12px' },
      'Commit to a prediction before you run the model. Guessing after the fact is not science, and the model will not let you.'));

    host.replaceChildren(
      taskCard(`Mission ${ix + 1} of ${MISSIONS.length} · predict`, m.brief, m.question),
      el('div', { class:'readout', style:'margin-top:12px' },
        el('div', { class:'c' }, el('div', { class:'l' }, 'Predictions right'), el('div', { class:'v' }, `${right}/${MISSIONS.length}`)),
        el('div', { class:'c' }, el('div', { class:'l' }, 'Species alive'),
          el('div', { class:'v' }, String(SPECIES.filter(s => world.N[s.id] > 0).length)))));
  }

  function commit(m, choice, opts) {
    [...opts.children].forEach(c => c.disabled = true);
    const ok = !!choice.ok;
    if (ok) right++;
    api.record(m.skill, ok);
    ok ? api.Sound.ok() : api.Sound.no();

    // run the actual model
    const rm = new Set(m.choose ? ['otter'] : m.remove);
    const after = runFor(rm);
    world = after;

    const lost = SPECIES.filter(s => after.N[s.id] <= 0 && !rm.has(s.id)).map(s => s.name);
    const kelpBefore = baseline.N.kelp, kelpAfter = after.N.kelp;
    const delta = pct => (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%';
    const kelpChange = kelpBefore > 0 ? (kelpAfter - kelpBefore) / kelpBefore * 100 : 0;

    panel.replaceChildren(
      el('h3', {}, 'Result of the run'),
      el('p', { class: ok ? 'good' : 'bad', style:'font-size:1.05rem' },
        ok ? 'Your prediction held up.' : 'The model disagreed with your prediction.'),
      el('div', { style:'margin-top:10px' },
        SPECIES.map(s => {
          const b = baseline.N[s.id], a = after.N[s.id];
          const ch = b > 0 ? (a - b) / b * 100 : (a > 0 ? 100 : 0);
          const col = rm.has(s.id) ? INK.dust : a <= 0 ? INK.rust : ch > 15 ? INK.sage : ch < -15 ? INK.rust : INK.ink2;
          return el('div', { style:'display:flex;justify-content:space-between;padding:5px 0;border-bottom:1.5px solid rgba(36,31,40,.12);font-size:.86rem' },
            el('span', { style:'font-weight:700' }, s.name + (rm.has(s.id) ? ' (removed)' : '')),
            el('span', { style:`font-weight:700;color:${col}` },
              rm.has(s.id) ? '—' : a <= 0 ? 'extinct' : `${b.toFixed(0)} → ${a.toFixed(0)}  ${delta(ch)}`));
        })),
      why('What the model shows', m.teach +
        (lost.length ? `  In this run the following also went extinct: ${lost.join(', ')}.`
                     : '  No further species were lost outright, but look at how far the numbers moved.') +
        (m.id === 'otters' ? `  Kelp finished at ${kelpAfter.toFixed(0)}, a change of ${delta(kelpChange)}.` : '')),
      el('div', { style:'margin-top:14px' },
        ix < MISSIONS.length - 1
          ? el('button', { class:'btn go', onclick:() => { ix++; render(); } }, 'Next mission →')
          : el('button', { class:'btn go', onclick: freeMode }, 'Open free mode →')));
    api.complete(Math.round((ix + 1) / MISSIONS.length * 100));
  }

  /* ── free mode: remove anything, see the whole web respond ── */
  function freeMode() {
    host.replaceChildren(
      taskCard('Free mode', 'Break it yourself.',
        'Remove any combination of species and run a century. Count the extinctions. The otter hypothesis is now yours to test.'));
    const toggles = el('div', { class:'row' });
    SPECIES.forEach(s => toggles.append(el('button', {
      class:'chip', 'data-s':s.id,
      onclick:e => {
        removed.has(s.id) ? removed.delete(s.id) : removed.add(s.id);
        e.target.classList.toggle('on', removed.has(s.id));
        world = runFor(removed);
        summary();
      }
    }, s.name)));
    const sum = el('div', { style:'margin-top:12px' });
    function summary() {
      const alive = SPECIES.filter(s => world.N[s.id] > 0).length;
      const lost = SPECIES.filter(s => world.N[s.id] <= 0 && !removed.has(s.id)).map(s => s.name);
      sum.replaceChildren(
        el('p', { class:'note' },
          `${alive} of ${SPECIES.length} species survive after 120 seasons.` +
          (lost.length ? ` Knock-on extinctions: ${lost.join(', ')}.` : ' No knock-on extinctions.')));
    }
    panel.replaceChildren(el('h3', {}, 'Remove species'), toggles, sum,
      el('div', { style:'margin-top:14px' },
        el('button', { class:'btn ghost', onclick:() => { removed = new Set(); world = freshWorld();
          toggles.querySelectorAll('.chip').forEach(c => c.classList.remove('on')); summary(); } }, 'Restore all'),
        ' ', el('button', { class:'btn ghost', onclick:() => { ix = 0; right = 0; render(); } }, 'Replay missions')));
    summary();
  }

  render();
  raf = requestAnimationFrame(draw);
}

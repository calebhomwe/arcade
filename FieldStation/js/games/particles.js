/* PARTICLE CHAMBER — Y7–8 states of matter and kinetic theory.
 *
 * This is a real (if simplified) molecular-dynamics simulation: pairwise forces,
 * a velocity-rescaling thermostat, and wall-impulse pressure. Nothing about the
 * three states is scripted. Solids form because attraction beats kinetic energy;
 * they melt because it stops beating it. The student causes the phase change and
 * then reads the numbers that explain it.
 */
import { el, fitCanvas, taskCard, why, INK, clamp, rnd } from '../core.js';

const R0   = 13;      // equilibrium separation
const RC   = 25;      // interaction cut-off
const KREP = 1.05;    // repulsion stiffness
const KATT = 0.085;   // cohesion strength — sets where melting and boiling happen
const RM   = 18;      // radius of deepest attraction

/* ── simulation (exported so it can be stepped and inspected in isolation) ── */
export function makeSim(n = 190, w = 520, h = 300) {
  const p = [];
  const cols = Math.ceil(Math.sqrt(n));
  const x0 = w / 2 - cols * R0 / 2, y0 = h / 2 - cols * R0 / 2;
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    p.push({
      x: x0 + c * R0 + rnd(-.6, .6), y: y0 + r * R0 + rnd(-.6, .6),
      vx: 0, vy: 0, fx: 0, fy: 0,
      dye: c < cols / 2                       // left half tagged, so diffusion is visible
    });
  }
  return { p, w, h, T: 4, wallImpulse: 0, pressure: 0, coord: 0, speed: 0, t: 0 };
}

export function step(s, dt = 1) {
  const { p, w, h } = s;
  for (const a of p) { a.fx = 0; a.fy = 0; }

  let coordSum = 0;
  for (let i = 0; i < p.length; i++) {
    for (let j = i + 1; j < p.length; j++) {
      const a = p[i], b = p[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > RC * RC || d2 < 1e-6) continue;
      const d = Math.sqrt(d2);
      const ux = dx / d, uy = dy / d;
      // Triangular potential well. The force must pass smoothly through ZERO at
      // r = R0, or the discontinuity injects energy every frame and no solid can
      // ever form — the lattice boils itself from the inside.
      let f;
      if (d < R0)      f = -KREP * (R0 - d);              // repel, hard
      else if (d < RM) f =  KATT * (d - R0);              // attraction building
      else             f =  KATT * (RM - R0) * (RC - d) / (RC - RM);  // fading to zero at cut-off
      a.fx += f * ux; a.fy += f * uy;
      b.fx -= f * ux; b.fy -= f * uy;
      if (d < R0 * 1.45) coordSum += 2;
    }
  }
  s.coord = coordSum / p.length;

  let ke = 0;
  s.wallImpulse = 0;
  for (const a of p) {
    a.vx += a.fx * dt; a.vy += a.fy * dt;
    a.x  += a.vx * dt; a.y  += a.vy * dt;
    // walls: reflect, and bank the momentum change — that IS the pressure
    if (a.x < 6)      { a.x = 6;      s.wallImpulse += Math.abs(a.vx); a.vx = -a.vx; }
    if (a.x > w - 6)  { a.x = w - 6;  s.wallImpulse += Math.abs(a.vx); a.vx = -a.vx; }
    if (a.y < 6)      { a.y = 6;      s.wallImpulse += Math.abs(a.vy); a.vy = -a.vy; }
    if (a.y > h - 6)  { a.y = h - 6;  s.wallImpulse += Math.abs(a.vy); a.vy = -a.vy; }
    ke += a.vx * a.vx + a.vy * a.vy;
  }

  // Berendsen-style thermostat: nudge kinetic energy toward the dial setting.
  const cur = ke / p.length;
  const want = s.T * 0.6 + 0.02;
  const lambda = clamp(Math.sqrt(want / Math.max(cur, 1e-6)), 0.80, 1.20);
  for (const a of p) { a.vx *= lambda; a.vy *= lambda; }

  s.speed = Math.sqrt(cur);
  s.pressure = s.pressure * 0.94 + (s.wallImpulse / (2 * (w + h))) * 0.06 * 900;
  s.t += dt;
  return s;
}

/** Classify by structure, not by the dial — this is what the student is judged on. */
export function phase(s) {
  // Thresholds derived by scanning the simulation, not guessed: at this density
  // a solid holds ~5.4 touching neighbours, a liquid 2.0-4.0, a gas under 1.6.
  // Speed is needed as a second test because a hot gas in a squeezed box gets
  // crowded enough to fake a liquid's neighbour count.
  if (s.coord >= 4.5) return 'solid';
  if (s.coord >= 1.9 && s.speed < 2.2) return 'liquid';
  return 'gas';
}

/* ── tasks ─────────────────────────────────────────────────── */
const TASKS = [
  { id:'melt', skill:'melting', want:'liquid',
    title:'Melt the solid.',
    detail:'The particles are locked in a regular lattice. Add energy until they can slide past one another but still touch.',
    teach:s => `At ${Math.round(s.T)} units the particles finally have enough kinetic energy to break out of fixed positions, but not enough to escape each other’s pull. Notice the count of touching neighbours fell from about 4 to ${s.coord.toFixed(1)} — they are still in contact, just no longer in rows. That is exactly what melting is: the arrangement is destroyed, the attraction is not.` },

  { id:'boil', skill:'boiling', want:'gas',
    title:'Boil it into a gas.',
    detail:'Keep heating. At some point the particles will have enough energy to escape the attraction completely.',
    teach:s => `Neighbour count has collapsed to ${s.coord.toFixed(1)} — most particles now touch nothing at all. They travel in straight lines until they hit something. Pressure has climbed to ${s.pressure.toFixed(1)} because gas pressure is nothing more than particles drumming on the walls. That is why a sealed can bursts when heated.` },

  { id:'condense', skill:'condensing', want:'liquid',
    title:'Cool it back to a liquid.',
    detail:'Take energy out. Watch the particles find each other again.',
    teach:() => `Condensation is not a different process running backwards by magic — remove kinetic energy and the same attraction that was always there wins again. Every phase change on this chamber is reversible, and the particle count has not altered once.` },

  { id:'freeze', skill:'freezing', want:'solid',
    title:'Freeze it solid again.',
    detail:'Cool further, until the particles settle into a regular repeating pattern.',
    teach:s => `They have snapped back to about ${s.coord.toFixed(1)} touching neighbours in an ordered lattice. Mean particle speed is down to ${s.speed.toFixed(2)}. In a solid the particles still vibrate — they have simply lost the energy to swap places.` },

  { id:'squeeze', skill:'pressure', want:'gas', extra:s => s.w < 380 && s.pressure > 9,
    title:'As a gas, squeeze the chamber and drive the pressure up.',
    detail:'Heat it to a gas, then shrink the container with the volume dial.',
    teach:s => `Same number of particles, same speed, smaller box — so each particle hits a wall more often, and the pressure reads ${s.pressure.toFixed(1)}. Halve the volume and you roughly double the pressure. That relationship has a name: Boyle’s law.` }
];

export function start(root, api) {
  const cv = el('canvas', { class:'board' });
  const taskHost = el('div');
  const notes = el('div', { class:'panel' });
  let sim = makeSim(190, 520, 300);
  let ix = 0, done = new Set(), showDye = true;

  const tSlider = el('input', { type:'range', min:'0', max:'60', value:'4', step:'.5', class:'slider',
    oninput: e => { sim.T = +e.target.value; } });
  const vSlider = el('input', { type:'range', min:'300', max:'520', value:'520', step:'10', class:'slider',
    oninput: e => { sim.w = +e.target.value; } });

  const controls = el('div', { class:'panel' },
    el('h3', {}, 'Chamber controls'),
    el('div', { style:'display:grid;gap:14px;grid-template-columns:1fr 1fr' },
      el('div', {},
        el('div', { style:'display:flex;justify-content:space-between;font-size:.8rem;font-weight:700' },
          el('span', {}, 'Thermal energy in'), el('span', { id:'tval' }, '4')),
        tSlider,
        el('p', { class:'note', style:'font-size:.76rem;margin-top:4px' }, 'Heating raises the average kinetic energy of every particle.')),
      el('div', {},
        el('div', { style:'display:flex;justify-content:space-between;font-size:.8rem;font-weight:700' },
          el('span', {}, 'Container volume'), el('span', { id:'vval' }, '520')),
        vSlider,
        el('p', { class:'note', style:'font-size:.76rem;margin-top:4px' }, 'Shrinking the box does not change how fast particles move — only how often they hit a wall.'))),
    el('div', { class:'row', style:'margin-top:14px' },
      el('button', { class:'btn ghost', onclick:() => { sim = makeSim(190, sim.w, 300); tSlider.value = 4; sim.T = 4; } }, 'Reset chamber'),
      el('button', { class:'btn ghost', onclick:e => { showDye = !showDye; e.target.textContent = showDye ? 'Dye: ON' : 'Dye: OFF'; } }, 'Dye: ON')),
    el('p', { class:'note', style:'margin-top:10px' },
      'Half the particles are dyed so you can watch diffusion. In a solid the dye never mixes. In a gas it mixes almost at once — same particles, different energy.'));

  const stage = el('div', { class:'stage', style:'grid-template-columns:minmax(0,1fr)' });
  stage.append(taskHost, cv, controls, notes);
  root.append(stage);

  function renderTask() {
    const task = TASKS[ix];
    taskHost.replaceChildren(
      taskCard(`Procedure ${ix + 1} of ${TASKS.length}`, task.title, task.detail),
      el('div', { class:'readout', style:'margin-top:12px' },
        el('div', { class:'c' }, el('div', { class:'l' }, 'State'), el('div', { class:'v', id:'ro-state' }, '—')),
        el('div', { class:'c' }, el('div', { class:'l' }, 'Mean speed'), el('div', { class:'v', id:'ro-speed' }, '—')),
        el('div', { class:'c' }, el('div', { class:'l' }, 'Touching neighbours'), el('div', { class:'v', id:'ro-coord' }, '—')),
        el('div', { class:'c' }, el('div', { class:'l' }, 'Pressure'), el('div', { class:'v', id:'ro-press' }, '—')),
        el('div', { class:'c' }, el('div', { class:'l' }, 'Particles'), el('div', { class:'v' }, String(sim.p.length)))));
    notes.replaceChildren(el('h3', {}, 'Laboratory notes'),
      el('p', { class:'note' }, 'The particle count never changes, whatever you do to this chamber. Mass is conserved through every phase change — that is the single most examined idea in this topic.'));
  }

  let hold = 0;
  function check() {
    const task = TASKS[ix];
    if (done.has(task.id)) return;
    const ok = phase(sim) === task.want && (!task.extra || task.extra(sim));
    hold = ok ? hold + 1 : 0;
    if (hold < 45) return;                       // must be sustained ~0.75 s, not a flicker
    done.add(task.id); hold = 0;
    api.record(task.skill, true);
    api.Sound.win();
    api.toast('Procedure ' + (ix + 1) + ' logged', 'win');
    api.complete(Math.round(done.size / TASKS.length * 100));
    notes.replaceChildren(el('h3', {}, 'Laboratory notes'), why('What just happened', task.teach(sim)));
    if (ix < TASKS.length - 1)
      notes.append(el('div', { style:'margin-top:12px' },
        el('button', { class:'btn go', onclick:() => { ix++; renderTask(); } }, 'Next procedure →')));
    else
      notes.append(el('p', { class:'note', style:'margin-top:12px' },
        'All five procedures logged. You have driven this substance through every state of matter in both directions and read the mechanism each time.'));
  }

  let geom = null;
  function draw() {
    if (!geom || geom.wCss !== cv.clientWidth) {
      const f = fitCanvas(cv, 300);
      geom = { ...f, wCss: cv.clientWidth };
    }
    const { g, w, h } = geom;
    const sc = w / 520;

    step(sim, 1);
    const ph = phase(sim);

    g.fillStyle = INK.paper2; g.fillRect(0, 0, w, h);
    g.save(); g.scale(sc, 1);

    // chamber walls — the movable one is drawn heavier, it is a piston
    g.strokeStyle = INK.ink; g.lineWidth = 3 / sc;
    g.strokeRect(2, 2, sim.w - 4, 296);
    g.fillStyle = 'rgba(36,31,40,.07)';
    g.fillRect(sim.w, 0, 520 - sim.w, 300);
    g.lineWidth = 6 / sc; g.strokeStyle = INK.rust;
    g.beginPath(); g.moveTo(sim.w, 6); g.lineTo(sim.w, 294); g.stroke();

    for (const a of sim.p) {
      g.fillStyle = showDye ? (a.dye ? INK.slate : INK.rust) : INK.slate;
      g.beginPath(); g.arc(a.x, a.y, 5.4, 0, 7); g.fill();
    }
    g.restore();

    // legend
    g.fillStyle = INK.ink; g.font = '700 12px Archivo, sans-serif'; g.textAlign = 'left';
    g.fillText(ph.toUpperCase(), 12, 24);

    const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
    set('ro-state', ph); set('ro-speed', sim.speed.toFixed(2));
    set('ro-coord', sim.coord.toFixed(1)); set('ro-press', sim.pressure.toFixed(1));
    const tv = document.getElementById('tval'), vv = document.getElementById('vval');
    if (tv) tv.textContent = String(sim.T);
    if (vv) vv.textContent = String(sim.w);

    check();
    raf = requestAnimationFrame(draw);
  }

  let raf = 0;
  renderTask();
  raf = requestAnimationFrame(draw);
}

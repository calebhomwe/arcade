/* REACTION BENCH — Y8–9 chemical equations and conservation of mass.
 *
 * The atom-count bars on both sides update live as coefficients change. A
 * student who cannot yet balance algebraically can still balance by watching
 * two bars converge — and in doing so they discover conservation of mass
 * rather than reciting it.
 */
import { el, shuf, taskCard, why, INK } from '../core.js';

/* ── formula parser: handles subscripts and one level of brackets ── */
export function parseFormula(f) {
  const out = {};
  let i = 0;
  const readCount = () => { let n = ''; while (i < f.length && /\d/.test(f[i])) n += f[i++]; return n ? +n : 1; };
  const add = (map, mult) => { for (const [k, v] of Object.entries(map)) out[k] = (out[k] || 0) + v * mult; };
  while (i < f.length) {
    if (f[i] === '(') {
      let depth = 1, j = ++i;
      while (j < f.length && depth) { if (f[j] === '(') depth++; if (f[j] === ')') depth--; j++; }
      const inner = f.slice(i, j - 1);
      i = j;
      add(parseFormula(inner), readCount());
    } else if (/[A-Z]/.test(f[i])) {
      let sym = f[i++];
      while (i < f.length && /[a-z]/.test(f[i])) sym += f[i++];
      out[sym] = (out[sym] || 0) + readCount();
    } else i++;
  }
  return out;
}

const sub = s => s.replace(/(\d+)/g, d => '₀₁₂₃₄₅₆₇₈₉'.split('')[+d[0]] ?? d);

const EQUATIONS = [
  { skill:'balancing', left:['H2','O2'], right:['H2O'], sol:[2,1,2],
    name:'Hydrogen burning in oxygen',
    context:'The reaction that lifted the Space Shuttle. Two gases in, pure water out.' },

  { skill:'balancing', left:['CH4','O2'], right:['CO2','H2O'], sol:[1,2,1,2],
    name:'Complete combustion of methane',
    context:'Natural gas burning on a hob. Every carbon and hydrogen atom in the fuel has to end up somewhere.' },

  { skill:'balancing', left:['N2','H2'], right:['NH3'], sol:[1,3,2],
    name:'The Haber process',
    context:'Ammonia for fertiliser. Roughly half the nitrogen atoms in your body arrived through this reaction.' },

  { skill:'balancing', left:['Mg','HCl'], right:['MgCl2','H2'], sol:[1,2,1,1],
    name:'Magnesium with hydrochloric acid',
    context:'A classic school practical — the fizzing is hydrogen gas escaping.' },

  { skill:'balancing', left:['Fe','O2'], right:['Fe2O3'], sol:[4,3,2],
    name:'Iron rusting',
    context:'Slow, but the same chemistry as burning. Rusted iron weighs MORE than the iron did — the oxygen has joined it.' },

  { skill:'balancing', left:['CaCO3'], right:['CaO','CO2'], sol:[1,1,1],
    name:'Thermal decomposition of limestone',
    context:'How cement starts. Careful — some equations arrive already balanced.' },

  { skill:'balancing', left:['NaOH','H2SO4'], right:['Na2SO4','H2O'], sol:[2,1,1,2],
    name:'Neutralisation',
    context:'An alkali and an acid producing a salt and water — the definition of neutralisation.' },

  { skill:'balancing', left:['C6H12O6','O2'], right:['CO2','H2O'], sol:[1,6,6,6],
    name:'Aerobic respiration',
    context:'What every cell in your body is doing right now. Glucose plus oxygen, releasing energy.' },

  { skill:'balancing', left:['CO2','H2O'], right:['C6H12O6','O2'], sol:[6,6,1,6],
    name:'Photosynthesis',
    context:'Respiration run backwards, powered by light. Compare it with the previous equation.' },

  { skill:'balancing', left:['Al','O2'], right:['Al2O3'], sol:[4,3,2],
    name:'Aluminium oxidising',
    context:'It happens in seconds in air. The oxide layer is what stops aluminium corroding away entirely.' }
];

export function start(root, api) {
  const seq = shuf(EQUATIONS).slice(0, 7);
  let ix = 0, right = 0, wrong = 0;
  const host = el('div', { class:'stage', style:'grid-template-columns:minmax(0,1fr)' });
  root.append(host);

  function next() { ix++; ix >= seq.length ? finish() : render(); }

  function finish() {
    api.complete(Math.round(right / seq.length * 100)); api.Sound.win();
    host.replaceChildren(
      taskCard('Reaction bench', 'Bench closed.', `${right} of ${seq.length} equations balanced.`),
      el('div', { class:'panel', style:'margin-top:16px' },
        el('h3', {}, 'The law underneath all of it'),
        el('p', { class:'note' },
          'Atoms are never created or destroyed in a chemical reaction — they are only rearranged. ' +
          'That is why both sides must always match, and it is why a balanced equation is not a puzzle ' +
          'for its own sake: it is a statement that matter was conserved.'),
        el('div', { style:'margin-top:14px' },
          el('button', { class:'btn go', onclick:() => { ix = 0; right = 0; wrong = 0; render(); } }, 'Another set'),
          ' ', el('button', { class:'btn ghost', onclick: api.home }, 'Back to station'))));
  }

  function render() {
    const eq = seq[ix];
    const n = eq.left.length + eq.right.length;
    const coef = new Array(n).fill(1);
    let checked = false;

    const elems = [...new Set([...eq.left, ...eq.right]
      .flatMap(f => Object.keys(parseFormula(f))))];

    const eqLine = el('div', {
      style:'display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-family:var(--display);' +
            'font-size:clamp(1.1rem,3.4vw,1.5rem);justify-content:center;padding:6px 0'
    });
    const bars = el('div', { style:'display:grid;gap:10px;margin-top:6px' });
    const out = el('div');

    function counts(side) {
      const off = side === 'l' ? 0 : eq.left.length;
      const list = side === 'l' ? eq.left : eq.right;
      const tot = {};
      list.forEach((f, i) => {
        const m = parseFormula(f);
        for (const [k, v] of Object.entries(m)) tot[k] = (tot[k] || 0) + v * coef[off + i];
      });
      return tot;
    }

    function paintBars() {
      const L = counts('l'), R = counts('r');
      const max = Math.max(2, ...elems.map(e => Math.max(L[e] || 0, R[e] || 0)));
      bars.replaceChildren(elems.map(e => {
        const l = L[e] || 0, r = R[e] || 0, ok = l === r;
        const bar = (v, align) => el('div', {
          style:`flex:1;display:flex;justify-content:${align};align-items:center;gap:6px`
        },
          align === 'flex-end' ? el('span', { style:'font-weight:700;font-size:.85rem' }, String(v)) : '',
          el('div', { style:`height:14px;width:${(v / max) * 100}%;background:${ok ? INK.sage : INK.rust};
                             border:1.5px solid ${INK.ink}` }),
          align === 'flex-start' ? el('span', { style:'font-weight:700;font-size:.85rem' }, String(v)) : '');
        return el('div', { style:'display:flex;align-items:center;gap:10px' },
          bar(l, 'flex-end'),
          el('div', { style:`min-width:42px;text-align:center;font-family:var(--display);font-size:.95rem;
                             color:${ok ? INK.sage : INK.rust}` }, e),
          bar(r, 'flex-start'));
      }));
    }

    function paintEq() {
      eqLine.replaceChildren();
      const put = (f, i) => {
        eqLine.append(el('div', { style:'display:flex;flex-direction:column;align-items:center;gap:3px' },
          el('div', { style:'display:flex;gap:3px' },
            el('button', { class:'chip', style:'padding:2px 8px;font-size:.9rem',
              onclick:() => { coef[i] = Math.max(1, coef[i] - 1); api.Sound.click(); paintEq(); paintBars(); } }, '−'),
            el('button', { class:'chip', style:'padding:2px 8px;font-size:.9rem',
              onclick:() => { coef[i] = Math.min(12, coef[i] + 1); api.Sound.click(); paintEq(); paintBars(); } }, '+')),
          el('div', {},
            el('span', { style:`color:${coef[i] > 1 ? INK.rust : INK.dust};font-size:1.15em` },
              coef[i] > 1 ? String(coef[i]) : '1'),
            el('span', {}, sub(f)))));
      };
      eq.left.forEach((f, i) => { if (i) eqLine.append(el('span', {}, '+')); put(f, i); });
      eqLine.append(el('span', { style:`color:${INK.rust};font-size:1.3em;padding:0 6px` }, '→'));
      eq.right.forEach((f, i) => { if (i) eqLine.append(el('span', {}, '+')); put(f, eq.left.length + i); });
    }

    function judge() {
      const L = counts('l'), R = counts('r');
      const balanced = elems.every(e => (L[e] || 0) === (R[e] || 0));
      // lowest terms: the student's coefficients must not be a multiple of a smaller valid set
      const g = coef.reduce((a, b) => { while (b) { [a, b] = [b, a % b]; } return a; });
      const ok = balanced && g === 1;
      if (checked) return;
      checked = true;
      ok ? right++ : wrong++;
      api.record(eq.skill, ok);
      ok ? api.Sound.ok() : api.Sound.no();

      const msg = ok ? 'Balanced, and in its simplest whole numbers.'
        : balanced ? `Both sides match, but every coefficient shares a factor of ${g}. Divide through — chemists always use the smallest whole numbers.`
        : 'Not balanced yet — the red bars show which element is still uneven.';

      const model = eq.sol.map((c, i) =>
        (c > 1 ? c : '') + sub([...eq.left, ...eq.right][i])).slice();
      const modelStr = model.slice(0, eq.left.length).join(' + ') + '  →  ' + model.slice(eq.left.length).join(' + ');

      out.replaceChildren(
        el('p', { class: ok ? 'good' : 'bad', style:'margin-top:14px;font-size:1.05rem' }, msg),
        el('p', { style:'font-family:var(--display);font-size:1.15rem;margin-top:8px;text-align:center' }, modelStr),
        why('What the numbers mean', explain(eq)),
        el('div', { style:'margin-top:14px' },
          ok ? el('button', { class:'btn go', onclick: next }, 'Next equation →')
             : el('button', { class:'btn go', onclick:() => { checked = false; out.replaceChildren(); } }, 'Try again'),
          ' ',
          el('button', { class:'btn ghost', onclick: next }, 'Skip')));
      out.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }

    function explain(e) {
      const L = {}, R = {};
      e.left.forEach((f, i) => { const m = parseFormula(f);
        for (const [k, v] of Object.entries(m)) L[k] = (L[k] || 0) + v * e.sol[i]; });
      e.right.forEach((f, i) => { const m = parseFormula(f);
        for (const [k, v] of Object.entries(m)) R[k] = (R[k] || 0) + v * e.sol[e.left.length + i]; });
      const tally = Object.keys(L).map(k => `${L[k]} ${k}`).join(', ');
      return `${e.context} Balanced, both sides hold exactly ${tally}. ` +
        `Remember the one rule that makes this solvable: you may change the big numbers in front, ` +
        `never the small ones inside a formula — altering H₂O to H₃O would make it a different substance entirely.`;
    }

    host.replaceChildren(
      taskCard(`Equation ${ix + 1} of ${seq.length}`, eq.name,
        'Adjust the big coefficients until every element bar matches on both sides. You may not change the subscripts.'),
      el('div', { class:'readout', style:'margin-top:12px' },
        el('div', { class:'c' }, el('div', { class:'l' }, 'Balanced'), el('div', { class:'v' }, String(right))),
        el('div', { class:'c' }, el('div', { class:'l' }, 'Missed'), el('div', { class:'v' }, String(wrong)))),
      el('div', { class:'panel', style:'margin-top:16px' },
        el('h3', {}, 'Equation'), eqLine,
        el('h3', { style:'margin-top:16px' }, 'Atom count · reactants vs products'), bars,
        el('div', { style:'margin-top:16px;text-align:center' },
          el('button', { class:'btn go', onclick: judge }, 'Check the balance')),
        out));
    paintEq(); paintBars();
  }

  render();
}

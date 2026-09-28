/* DRAFTING ROOM — Y5–9 grammar: clauses and sentence structure.
 *
 * Grammar is taught here as construction rather than labelling. The student is
 * given a structural brief ("a fronted adverbial, then a main clause") and a set
 * of real clause blocks, and has to build a sentence that satisfies it. The
 * punctuation is applied automatically by the rule being practised, so the
 * comma after a fronted adverbial is something they watch appear.
 */
import { el, shuf, taskCard, why } from '../core.js';

const TYPE = {
  MAIN: { label:'Main clause',        c:'#241f28' },
  SUB:  { label:'Subordinate clause', c:'#6b4258' },
  REL:  { label:'Relative clause',    c:'#3f5c6b' },
  ADV:  { label:'Adverbial',          c:'#b8543a' },
  SUBJ: { label:'Subject',            c:'#5f7d5a' },
  PRED: { label:'Predicate',          c:'#c98b32' },
  CONJ: { label:'Coordinating conj.', c:'#9a8570' }
};

/* Each brief carries its own bank, so every legal arrangement reads naturally. */
const BRIEFS = [
  {
    skill:'complex-sentence',
    title:'Build a complex sentence.',
    detail:'A complex sentence is one main clause plus at least one subordinate clause. The subordinate clause cannot stand on its own.',
    bank:[
      { t:'the generator finally started', k:'MAIN' },
      { t:'because the engineer replaced the fuse', k:'SUB' },
      { t:'although the fuel was almost gone', k:'SUB' },
      { t:'the radio mast collapsed', k:'MAIN' }
    ],
    patterns:[['MAIN','SUB'], ['SUB','MAIN']],
    teach:'A subordinate clause is dependent — read “because the engineer replaced the fuse” on its own and you are left waiting for the rest. It needs a main clause to lean on. Notice what happens to the comma: when the subordinate clause comes SECOND you usually need no comma, but when it is fronted, a comma marks where the main clause begins.'
  },
  {
    skill:'fronted-adverbial',
    title:'Open with a fronted adverbial.',
    detail:'An adverbial tells you when, where or how. Put it at the front of the sentence, before the main clause.',
    bank:[
      { t:'At first light', k:'ADV' },
      { t:'Without a sound', k:'ADV' },
      { t:'the survey team crossed the ice', k:'MAIN' },
      { t:'the dogs refused to move', k:'MAIN' }
    ],
    patterns:[['ADV','MAIN']],
    teach:'A fronted adverbial is simply an adverbial moved to the start for effect, and it takes a comma after it. Compare “The team crossed the ice at first light” with “At first light, the team crossed the ice.” Same information, different emphasis — the second makes the reader feel the hour before they meet the team. That comma is not optional in formal writing.'
  },
  {
    skill:'relative-clause',
    title:'Embed a relative clause inside the sentence.',
    detail:'A relative clause begins with who, which or that, and adds information about a noun. Drop it in straight after the subject.',
    bank:[
      { t:'The old lighthouse', k:'SUBJ' },
      { t:'The station cook', k:'SUBJ' },
      { t:'which had stood for ninety years', k:'REL' },
      { t:'who had never seen snow before', k:'REL' },
      { t:'finally gave way', k:'PRED' },
      { t:'laughed at the storm', k:'PRED' }
    ],
    patterns:[['SUBJ','REL','PRED']],
    teach:'A relative clause is an interruption: it sits between the subject and its verb, wrapped in a pair of commas. The test is to lift it out — “The old lighthouse finally gave way” still works perfectly. If removing it breaks the sentence, or changes WHICH thing you mean, then it is essential and takes no commas at all.'
  },
  {
    skill:'compound-sentence',
    title:'Build a compound sentence.',
    detail:'Two main clauses of equal weight, joined by a coordinating conjunction: and, but, or, so, yet.',
    bank:[
      { t:'The ice sheet groaned all night', k:'MAIN' },
      { t:'nobody slept', k:'MAIN' },
      { t:'the sledges were ready by dawn', k:'MAIN' },
      { t:'but', k:'CONJ' },
      { t:'so', k:'CONJ' },
      { t:'and', k:'CONJ' }
    ],
    patterns:[['MAIN','CONJ','MAIN']],
    teach:'In a compound sentence neither half is subordinate to the other — both could stand alone as sentences. That is the difference from a complex sentence, where one half depends on the other. Choosing the conjunction is a meaning decision: “and” adds, “but” contrasts, “so” shows consequence.'
  },
  {
    skill:'complex-sentence',
    title:'Front the subordinate clause instead.',
    detail:'Take the same idea and lead with the dependent half. Watch the comma appear.',
    bank:[
      { t:'Before the sun rose over the ridge', k:'SUB' },
      { t:'Since the radio had failed', k:'SUB' },
      { t:'the team packed the camp in silence', k:'MAIN' },
      { t:'they set out on foot', k:'MAIN' }
    ],
    patterns:[['SUB','MAIN']],
    teach:'Writers front a subordinate clause to build suspense — the reader has to hold the incomplete idea until the main clause lands. Do it too often and the writing feels breathless; never do it and every sentence starts the same way. Varying the opening is one of the fastest ways to lift a piece of writing.'
  },
  {
    skill:'multi-clause',
    title:'Now combine three: adverbial, main clause, subordinate clause.',
    detail:'A multi-clause sentence with an adverbial opening and a subordinate clause trailing behind.',
    bank:[
      { t:'By the third week', k:'ADV' },
      { t:'On the far shore', k:'ADV' },
      { t:'the supplies were running low', k:'MAIN' },
      { t:'the lights of the station appeared', k:'MAIN' },
      { t:'because the resupply ship had turned back', k:'SUB' },
      { t:'although nobody dared say so', k:'SUB' }
    ],
    patterns:[['ADV','MAIN','SUB']],
    teach:'Three parts, three jobs: the adverbial sets the scene, the main clause carries the fact, the subordinate clause supplies the reason. This is the shape most good non-fiction sentences take. Read it aloud — you should hear the sentence step down through those three levels.'
  }
];

/* Assemble the visible sentence, applying the punctuation rule under practice. */
function compose(parts) {
  if (!parts.length) return '';
  let s = '';
  parts.forEach((p, i) => {
    const prev = parts[i - 1];
    let sep = ' ';
    if (i === 0) sep = '';
    else if (prev.k === 'ADV') sep = ', ';
    else if (prev.k === 'SUB' && i === 1) sep = ', ';         // fronted subordinate takes a comma
    else if (p.k === 'REL') sep = ', ';
    else if (prev.k === 'REL') sep = ', ';
    else if (p.k === 'CONJ') sep = ' ';
    s += sep + p.t;
  });
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return s + '.';
}

export function start(root, api) {
  const seq = shuf(BRIEFS);
  let ix = 0, right = 0, wrong = 0;
  const host = el('div', { class:'stage', style:'grid-template-columns:minmax(0,1fr)' });
  root.append(host);

  function next() { ix++; ix >= seq.length ? finish() : render(); }

  function finish() {
    api.complete(Math.round(right / seq.length * 100)); api.Sound.win();
    host.replaceChildren(
      taskCard('Drafting room', 'Drafts filed.', `${right} of ${seq.length} briefs met.`),
      el('div', { class:'panel', style:'margin-top:16px' },
        el('h3', {}, 'Why this matters more than naming the parts'),
        el('p', { class:'note' },
          'Examiners do not really want you to label a subordinate clause — they want you to write one on purpose, ' +
          'and to vary your sentence structure so a paragraph does not thud along in the same shape. ' +
          'You now have four structures to reach for: simple, compound, complex, and multi-clause with a fronted opener.'),
        el('div', { style:'margin-top:14px' },
          el('button', { class:'btn go', onclick:() => { ix = 0; right = 0; wrong = 0; render(); } }, 'New briefs'),
          ' ', el('button', { class:'btn ghost', onclick: api.home }, 'Back to station'))));
  }

  function render() {
    const b = seq[ix];
    const chosen = [];
    const bank = shuf(b.bank);
    const strip = el('div', {
      style:'min-height:64px;padding:12px;border:2px dashed rgba(36,31,40,.35);background:var(--paper2);' +
            'display:flex;flex-wrap:wrap;gap:6px;align-items:center'
    });
    const preview = el('p', {
      style:'font-family:var(--serif);font-size:clamp(1.1rem,3.4vw,1.5rem);line-height:1.65;margin-top:12px;min-height:2em'
    });
    const tiles = el('div', { style:'display:grid;gap:8px' });
    const out = el('div');
    const check = el('button', { class:'btn go', onclick: judge }, 'Submit draft');

    const tile = (p, inStrip, i) => el('button', {
      class:'chip',
      style:`text-align:left;border-left:7px solid ${TYPE[p.k].c};font-weight:600;` +
            (inStrip ? 'background:var(--ink);color:var(--paper)' : ''),
      onclick:() => {
        if (inStrip) chosen.splice(i, 1);
        else { if (chosen.includes(p)) return; chosen.push(p); }
        api.Sound.click(); paint();
      }
    },
      el('span', { style:`display:block;font-size:.56rem;letter-spacing:.14em;text-transform:uppercase;
                          font-weight:700;opacity:.75;margin-bottom:2px` }, TYPE[p.k].label),
      p.t);

    function paint() {
      strip.replaceChildren();
      if (!chosen.length) strip.append(el('span', { class:'note' }, 'Tap blocks below to build your sentence…'));
      chosen.forEach((p, i) => strip.append(tile(p, true, i)));
      tiles.replaceChildren(...bank.map(p =>
        el('div', { style: chosen.includes(p) ? 'opacity:.28;pointer-events:none' : '' }, tile(p, false))));
      preview.textContent = compose(chosen) || '—';
      check.disabled = !chosen.length;
    }

    function judge() {
      const shape = chosen.map(p => p.k);
      const ok = b.patterns.some(pat => pat.length === shape.length && pat.every((k, i) => k === shape[i]));
      ok ? right++ : wrong++;
      api.record(b.skill, ok);
      ok ? api.Sound.ok() : api.Sound.no();
      check.disabled = true;

      const model = b.patterns[0].map(k => b.bank.find(p => p.k === k));
      out.replaceChildren(
        el('p', { class: ok ? 'good' : 'bad', style:'margin-top:14px;font-size:1.05rem' },
          ok ? `Brief met — ${shape.map(k => TYPE[k].label.toLowerCase()).join(' + ')}.`
             : `You built ${shape.map(k => TYPE[k].label.toLowerCase()).join(' + ')}. The brief asked for ${b.patterns[0].map(k => TYPE[k].label.toLowerCase()).join(' + ')}.`),
        ok ? '' : el('p', { style:'font-family:var(--serif);font-size:1.15rem;margin-top:8px' },
          'For example: ' + compose(model)),
        why('The grammar', b.teach),
        el('div', { style:'margin-top:14px' },
          el('button', { class:'btn ghost', onclick:() => {
            try { speechSynthesis.cancel();
              const u = new SpeechSynthesisUtterance(compose(chosen.length ? chosen : model));
              u.rate = .92; speechSynthesis.speak(u); } catch {}
          }}, '🔊 Hear it'),
          ' ', el('button', { class:'btn go', onclick: next }, 'Next brief →')));
      out.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }

    host.replaceChildren(
      taskCard(`Brief ${ix + 1} of ${seq.length}`, b.title, b.detail),
      el('div', { class:'readout', style:'margin-top:12px' },
        el('div', { class:'c' }, el('div', { class:'l' }, 'Briefs met'), el('div', { class:'v' }, String(right))),
        el('div', { class:'c' }, el('div', { class:'l' }, 'Missed'), el('div', { class:'v' }, String(wrong)))),
      el('div', { class:'panel', style:'margin-top:16px' },
        el('h3', {}, 'Your sentence'), strip, preview,
        el('h3', { style:'margin-top:16px' }, 'Clause blocks'), tiles,
        el('div', { style:'margin-top:14px' }, check),
        out));
    paint();
  }

  render();
}

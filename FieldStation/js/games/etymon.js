/* SIGNAL ROOM — Y5–9 vocabulary through Greek and Latin morphemes.
 *
 * Building words from parts is the warm-up. The real assessment is the DECODE
 * round: a word the student has never been taught, which is readable only if
 * the morphemes actually went in. That transfer step is the whole justification
 * for teaching roots at all.
 */
import { el, shuf, pick, taskCard, why, toast } from '../core.js';

/* ── morpheme bank ───────────────────────────────────────── */
const M = {
  // prefixes
  pre:   { t:'pre',   m:'before',            k:'prefix', o:'Latin'  },
  re:    { t:'re',    m:'again, back',       k:'prefix', o:'Latin'  },
  sub:   { t:'sub',   m:'under',             k:'prefix', o:'Latin'  },
  trans: { t:'trans', m:'across',            k:'prefix', o:'Latin'  },
  anti:  { t:'anti',  m:'against',           k:'prefix', o:'Greek'  },
  micro: { t:'micro', m:'very small',        k:'prefix', o:'Greek'  },
  tele:  { t:'tele',  m:'far off',           k:'prefix', o:'Greek'  },
  auto:  { t:'auto',  m:'self',              k:'prefix', o:'Greek'  },
  inter: { t:'inter', m:'between',           k:'prefix', o:'Latin'  },
  mono:  { t:'mono',  m:'one, single',       k:'prefix', o:'Greek'  },
  poly:  { t:'poly',  m:'many',              k:'prefix', o:'Greek'  },
  ex:    { t:'ex',    m:'out of',            k:'prefix', o:'Latin'  },
  con:   { t:'con',   m:'together, with',    k:'prefix', o:'Latin'  },
  de:    { t:'de',    m:'down, away',        k:'prefix', o:'Latin'  },
  in:    { t:'in',    m:'into — or “not”',   k:'prefix', o:'Latin'  },
  // roots
  spect: { t:'spect', m:'look',              k:'root', o:'Latin' },
  port:  { t:'port',  m:'carry',             k:'root', o:'Latin' },
  dict:  { t:'dict',  m:'say, speak',        k:'root', o:'Latin' },
  scribe:{ t:'scribe',m:'write',             k:'root', o:'Latin' },
  therm: { t:'therm', m:'heat',              k:'root', o:'Greek' },
  bio:   { t:'bio',   m:'life',              k:'root', o:'Greek' },
  geo:   { t:'geo',   m:'earth',             k:'root', o:'Greek' },
  photo: { t:'photo', m:'light',             k:'root', o:'Greek' },
  aud:   { t:'aud',   m:'hear',              k:'root', o:'Latin' },
  struct:{ t:'struct',m:'build',             k:'root', o:'Latin' },
  rupt:  { t:'rupt',  m:'break',             k:'root', o:'Latin' },
  vis:   { t:'vis',   m:'see',               k:'root', o:'Latin' },
  phone: { t:'phone', m:'sound, voice',      k:'root', o:'Greek' },
  chron: { t:'chron', m:'time',              k:'root', o:'Greek' },
  graph: { t:'graph', m:'write, draw',       k:'root', o:'Greek' },
  meter: { t:'meter', m:'measure',           k:'root', o:'Greek' },
  aqua:  { t:'aqua',  m:'water',             k:'root', o:'Latin' },
  astro: { t:'astro', m:'star',              k:'root', o:'Greek' },
  cardi: { t:'cardi', m:'heart',             k:'root', o:'Greek' },
  scope: { t:'scope', m:'look at, examine',  k:'root', o:'Greek' },
  marine:{ t:'marine',m:'of the sea',        k:'root', o:'Latin' },
  morph: { t:'morph', m:'shape, form',       k:'root', o:'Greek' },
  naut:  { t:'naut',  m:'sailor',            k:'root', o:'Greek' },
  logue: { t:'logue', m:'speech, words',     k:'root', o:'Greek' },
  // suffixes and the connecting vowel
  o:      { t:'o',      m:'a connecting vowel — Greek glue between two roots', k:'joiner', o:'Greek' },
  ology:  { t:'ology',  m:'the study of',        k:'suffix', o:'Greek' },
  ologist:{ t:'ologist',m:'a person who studies',k:'suffix', o:'Greek' },
  ist:    { t:'ist',    m:'a person who',        k:'suffix', o:'Greek' },
  ible:   { t:'ible',   m:'able to be',          k:'suffix', o:'Latin' },
  ic:     { t:'ic',     m:'relating to',         k:'suffix', o:'Greek' },
  ium:    { t:'ium',    m:'a place for',         k:'suffix', o:'Latin' },
};

/* ── build challenges: definition → assemble the word ────── */
const BUILD = [
  { w:'biology',    p:['bio','ology'],        d:'the study of living things' },
  { w:'telescope',  p:['tele','scope'],       d:'an instrument for examining things far off' },
  { w:'transport',  p:['trans','port'],       d:'to carry something across a distance' },
  { w:'thermometer',p:['therm','o','meter'],  d:'an instrument that measures heat' },
  { w:'predict',    p:['pre','dict'],         d:'to say what will happen before it does' },
  { w:'microphone', p:['micro','phone'],      d:'a device that picks up small sounds' },
  { w:'interrupt',  p:['inter','rupt'],       d:'to break in between' },
  { w:'autograph',  p:['auto','graph'],       d:'writing done by the person themselves' },
  { w:'submarine',  p:['sub','marine'],       d:'a vessel that travels under the sea' },
  { w:'visible',    p:['vis','ible'],         d:'able to be seen' },
  { w:'aquarium',   p:['aqua','ium'],         d:'a place for water creatures' },
  { w:'astronaut',  p:['astro','naut'],       d:'a sailor among the stars' },
  { w:'cardiologist',p:['cardi','ologist'],   d:'a person who studies the heart' },
  { w:'antibiotic', p:['anti','bio','ic'],    d:'a medicine that works against living microbes' },
  { w:'monologue',  p:['mono','logue'],       d:'a speech given by one person alone' },
  { w:'construct',  p:['con','struct'],       d:'to build by putting parts together' },
  { w:'photograph', p:['photo','graph'],      d:'a picture drawn by light' },
  { w:'inspect',    p:['in','spect'],         d:'to look into something closely' },
  { w:'export',     p:['ex','port'],          d:'to carry goods out of a country' },
  { w:'polymorph',  p:['poly','morph'],       d:'something that takes many shapes' },
];

/* ── decode challenges: a word they were never taught ────── */
const DECODE = [
  { w:'chronometer', p:['chron','o','meter'],
    right:'an instrument for measuring time very precisely',
    wrong:['a map of the night sky','a device for weighing metals','a chart of ocean depths'] },
  { w:'autobiography', p:['auto','bio','graph'],
    right:'the story of a life, written by the person who lived it',
    wrong:['a life story written by a stranger','a book about famous cars','a list of every book someone owns'] },
  { w:'telegraph', p:['tele','graph'],
    right:'a machine for sending writing over a long distance',
    wrong:['a very large photograph','an instrument for drawing circles','a record of the weather'] },
  { w:'inaudible', p:['in','aud','ible'],
    right:'not able to be heard',
    wrong:['too loud to bear','able to be seen clearly','spoken in a foreign language'],
    twist:'Careful — here “in-” is the other one. It means “not”, as in invisible and incomplete, rather than “into”.' },
  { w:'microbiology', p:['micro','bio','ology'],
    right:'the study of living things too small to see',
    wrong:['the study of very small rocks','a short book about nature','the study of tiny machines'] },
  { w:'geothermal', p:['geo','therm'],
    right:'to do with heat coming from inside the earth',
    wrong:['to do with the temperature of the sea','a map showing rainfall','heat produced by burning coal'] },
  { w:'aquanaut', p:['aqua','naut'],
    right:'someone who travels and works underwater',
    wrong:['a boat with two hulls','a scientist who studies rain','a bird that dives for fish'] },
  { w:'polymorphic', p:['poly','morph','ic'],
    right:'having, or able to take, many different forms',
    wrong:['made of many colours','relating to many countries','repeated many times over'] },
];

const ALL_KEYS = Object.keys(M);

export function start(root, api) {
  /* Interleave: three builds, then a decode. Transfer is tested early and often. */
  const builds = shuf(BUILD).slice(0, 12);
  const decodes = shuf(DECODE).slice(0, 4);
  const seq = [];
  builds.forEach((b, i) => {
    seq.push({ type:'build', data:b });
    if (i % 3 === 2 && decodes.length) seq.push({ type:'decode', data:decodes.shift() });
  });

  let ix = 0, right = 0, wrong = 0;
  const host = el('div', { class:'stage', style:'grid-template-columns:minmax(0,1fr)' });
  root.append(host);

  const scoreLine = () => el('div', { class:'readout', style:'margin-top:12px' },
    el('div', { class:'c' }, el('div', { class:'l' }, 'Item'),
      el('div', { class:'v' }, `${ix + 1}/${seq.length}`)),
    el('div', { class:'c' }, el('div', { class:'l' }, 'Correct'),
      el('div', { class:'v' }, String(right))),
    el('div', { class:'c' }, el('div', { class:'l' }, 'Missed'),
      el('div', { class:'v' }, String(wrong))));

  /* Breakdown table — the actual teaching artefact. */
  function breakdown(parts, word) {
    return el('div', { class:'panel', style:'margin-top:14px' },
      el('h3', {}, 'How the word is put together'),
      el('div', { style:'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px' },
        parts.map(k => el('span', {
          class:'chip',
          style:`background:${M[k].k === 'prefix' ? '#6b4258' : M[k].k === 'suffix' ? '#b8543a' : M[k].k === 'joiner' ? '#9a8570' : '#241f28'};color:#f2e9d8`
        }, M[k].t))),
      el('div', {}, parts.map(k => el('div', {
          style:'display:flex;gap:10px;padding:7px 0;border-bottom:1.5px solid rgba(36,31,40,.14);font-size:.88rem'
        },
        el('b', { style:'min-width:96px;font-family:var(--display)' }, M[k].t),
        el('span', { style:'color:var(--ink2)' }, `${M[k].m}`),
        el('span', { style:'margin-left:auto;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--dust);font-weight:700' },
          `${M[k].o} ${M[k].k}`)))),
      el('p', { class:'note', style:'margin-top:12px' },
        `So ${word} is literally “${parts.map(k => M[k].m.split(' — ')[0]).join(' + ')}”.`));
  }

  function next() {
    ix++;
    if (ix >= seq.length) return finish();
    render();
  }

  function finish() {
    const pct = Math.round(right / seq.length * 100);
    api.complete(pct);
    api.Sound.win();
    host.replaceChildren(
      taskCard('Signal room', 'Transmission decoded.',
        `${right} of ${seq.length} correct.`),
      el('div', { class:'panel', style:'margin-top:16px' },
        el('h3', {}, 'What you can now do'),
        el('p', { class:'note' },
          'You did not memorise twenty words — you learned about thirty morphemes, and those recombine into ' +
          'thousands. Any time you meet an unfamiliar word, break it at the seams and read the pieces. ' +
          'That is how a reader gets from a 10,000-word vocabulary to a 40,000-word one without a dictionary.'),
        el('div', { style:'margin-top:14px' },
          el('button', { class:'btn go', onclick: () => { ix = 0; right = 0; wrong = 0; render(); } }, 'Run it again'),
          ' ',
          el('button', { class:'btn ghost', onclick: api.home }, 'Back to station'))));
  }

  /* ── build item ── */
  function renderBuild(item) {
    const answer = [];
    const bankKeys = shuf([...item.p, ...shuf(ALL_KEYS.filter(k => !item.p.includes(k))).slice(0, 5)]);

    const strip = el('div', {
      style:'display:flex;gap:6px;flex-wrap:wrap;min-height:56px;padding:10px;border:2px dashed rgba(36,31,40,.35);background:var(--paper2)'
    });
    const bank = el('div', { class:'row' });
    const out  = el('div');
    const check = el('button', { class:'btn go', onclick: judge }, 'Check the word');

    function paint() {
      strip.replaceChildren();
      if (!answer.length)
        strip.append(el('span', { class:'note', style:'align-self:center' }, 'Tap parts below to build the word…'));
      answer.forEach((k, i) => strip.append(el('button', {
        class:'chip', style:'background:var(--ink);color:var(--paper)',
        onclick: () => { answer.splice(i, 1); paint(); }
      }, M[k].t)));
      if (answer.length) strip.append(el('span', {
        style:'align-self:center;font-family:var(--display);font-size:1.15rem;margin-left:8px'
      }, '→ ' + answer.map(k => M[k].t).join('')));
      bank.replaceChildren(...bankKeys.map((k, i) => el('button', {
        class:'chip' + (answer.includes(k) ? ' used' : ''),
        onclick: () => { if (!answer.includes(k)) { answer.push(k); api.Sound.click(); paint(); } }
      }, M[k].t)));
      check.disabled = !answer.length;
    }

    function judge() {
      const built = answer.map(k => M[k].t).join('');
      const ok = built === item.w;
      ok ? right++ : wrong++;
      api.record('build', ok);
      ok ? api.Sound.ok() : api.Sound.no();
      check.disabled = true;
      out.replaceChildren(
        el('p', { class: ok ? 'good' : 'bad', style:'margin-top:12px;font-size:1.05rem' },
          ok ? `Correct — ${item.w}.` : `You built “${built}”. The word is ${item.w}.`),
        breakdown(item.p, item.w),
        el('div', { style:'margin-top:14px' },
          el('button', { class:'btn go', onclick: next }, 'Next signal →')));
      out.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }

    host.replaceChildren(
      taskCard(`Signal ${ix + 1} of ${seq.length} · build`, item.d,
        `${item.p.length} parts. Order matters — English builds meaning left to right.`),
      scoreLine(),
      el('div', { class:'panel', style:'margin-top:16px' },
        el('h3', {}, 'Assembly'), strip,
        el('h3', { style:'margin-top:16px' }, 'Available parts'), bank,
        el('div', { style:'margin-top:14px' }, check),
        out));
    paint();
  }

  /* ── decode item ── */
  function renderDecode(item) {
    const options = shuf([{ t:item.right, ok:true }, ...item.wrong.map(t => ({ t, ok:false }))]);
    const out = el('div');
    const opts = el('div', { style:'display:grid;gap:8px;margin-top:4px' });

    options.forEach(o => opts.append(el('button', {
      class:'chip', style:'text-align:left;padding:12px 14px;font-weight:600',
      onclick: () => {
        [...opts.children].forEach(c => c.disabled = true);
        o.ok ? right++ : wrong++;
        api.record('decode', o.ok);
        o.ok ? api.Sound.ok() : api.Sound.no();
        out.replaceChildren(
          el('p', { class: o.ok ? 'good' : 'bad', style:'margin-top:12px;font-size:1.05rem' },
            o.ok ? 'Correct — and you had never been taught that word.'
                 : `Not quite. ${item.w} means: ${item.right}.`),
          item.twist ? why('A trap worth knowing', item.twist) : '',
          breakdown(item.p, item.w),
          el('div', { style:'margin-top:14px' },
            el('button', { class:'btn go', onclick: next }, 'Next signal →')));
        out.scrollIntoView({ behavior:'smooth', block:'nearest' });
      }
    }, o.t)));

    host.replaceChildren(
      taskCard(`Signal ${ix + 1} of ${seq.length} · decode`,
        item.w,
        'This word was never taught to you. Break it at the seams and read the parts — what must it mean?'),
      scoreLine(),
      el('div', { class:'panel', style:'margin-top:16px' },
        el('h3', {}, 'Your reading'), opts, out));
  }

  function render() {
    const s = seq[ix];
    s.type === 'build' ? renderBuild(s.data) : renderDecode(s.data);
  }

  render();
}

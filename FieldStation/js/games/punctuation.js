/* LOG OFFICE — Y5–8 punctuation.
 *
 * Punctuation is taught here as a meaning-changing device rather than a set of
 * decorative rules. Half the items are ambiguity pairs: the same words, two
 * commas apart, saying two different things. Once a student has seen that, the
 * comma stops being arbitrary.
 */
import { el, shuf, taskCard, why } from '../core.js';

const MARKS = [
  { m:',',  name:'Comma' },
  { m:';',  name:'Semicolon' },
  { m:':',  name:'Colon' },
  { m:'.',  name:'Full stop' },
  { m:'',   name:'Nothing' }
];

/* answer: { gapIndex: [acceptable marks] }  — gap i sits AFTER token i */
const ITEMS = [
  { type:'place', skill:'lists',
    brief:'Punctuate this list correctly.',
    tokens:['I','packed','a','torch','a','compass','a','whistle','and','a','map'],
    answer:{ 3:[','], 5:[','] },
    rule:'Commas separate the items in a list. In British usage the final “and” does the job of the last comma, so you do not put one before it.' },

  { type:'place', skill:'comma-splice',
    brief:'Two complete sentences have been joined with nothing. Repair the join.',
    tokens:['The','storm','knocked','out','the','power','we','worked','by','lamplight'],
    answer:{ 5:[';','.'] },
    rule:'“The storm knocked out the power” and “we worked by lamplight” can each stand alone, so a comma is too weak to hold them — that error is called a comma splice. A full stop separates them; a semicolon joins them while keeping the link.' },

  { type:'place', skill:'colon',
    brief:'Introduce the list properly.',
    tokens:['The','kit','contains','three','items','rope','a','flare','and','matches'],
    answer:{ 4:[':'], 5:[','], 7:[','] },
    rule:'A colon introduces a list after a complete statement — it says “here it comes”. The commas then separate the items themselves.' },

  { type:'place', skill:'speech',
    brief:'Punctuate the reporting clause before the speech.',
    tokens:['The','radio','operator','said','“Bring','everyone','inside.”'],
    answer:{ 3:[','] },
    rule:'When the reporting clause comes first, a comma separates it from the spoken words, and the speech itself keeps its own end punctuation inside the closing quotation mark.' },

  { type:'place', skill:'parenthetical',
    brief:'Mark off the extra information.',
    tokens:['The','generator','which','had','not','been','serviced','failed','at','dawn'],
    answer:{ 1:[','], 6:[','] },
    rule:'A pair of commas works like a pair of brackets. Lift out everything between them and the sentence still stands: “The generator failed at dawn.” That is the test for a non-essential clause.' },

  /* ── ambiguity pairs: same words, different meaning ── */
  { type:'place', skill:'ambiguity', meaning:true,
    brief:'Punctuate so it means: the panda ATE some shoots and leaves. (A description of its diet.)',
    tokens:['The','panda','eats','shoots','and','leaves'],
    answer:{},
    alt:'Put a comma after “eats” — “The panda eats, shoots and leaves” — and it becomes three actions in sequence: it eats, then fires a gun, then departs.',
    rule:'With no comma, “shoots and leaves” are the things being eaten. Add one comma and they become verbs. Nothing else in the sentence changed.' },

  { type:'place', skill:'ambiguity', meaning:true,
    brief:'Punctuate so it means: you are speaking TO Grandma, inviting her to eat.',
    tokens:['Let’s','eat','Grandma'],
    answer:{ 1:[','] },
    alt:'Without the comma — “Let’s eat Grandma” — Grandma is no longer being spoken to. She is the meal.',
    rule:'A comma before a name marks direct address: it separates the person you are talking TO from what you are saying. Leave it out and the name slides into the sentence as an object.' },

  { type:'place', skill:'restrictive', meaning:true,
    brief:'Punctuate so it means: I have only ONE sister, and by the way she lives in Leeds.',
    tokens:['My','sister','who','lives','in','Leeds','is','a','vet'],
    answer:{ 1:[','], 5:[','] },
    alt:'Without the commas, “who lives in Leeds” is doing essential work — it tells you which sister out of several. So no commas implies you have more than one sister.',
    rule:'Commas make a clause non-essential (extra detail). No commas make it essential (it identifies which one). This single distinction is worth marks in every SATs and GCSE paper.' },

  { type:'place', skill:'parenthetical', meaning:true,
    brief:'Punctuate so it means: the STUDENT is the one doing the saying, and the teacher is the clever one.',
    tokens:['The','teacher','said','the','student','was','clever'],
    answer:{ 2:[','], 4:[','] },
    alt:'Unpunctuated, “The teacher said the student was clever” means the teacher spoke and the student was clever — the exact opposite of who is who.',
    rule:'Wrapping “said the student” in commas turns it into an interruption, so the main sentence underneath reads “The teacher was clever.” Two commas completely swap the roles.' },

  /* ── apostrophes ── */
  { type:'choose', skill:'apostrophes',
    brief:'Several dogs live at the station. Their bowls were empty.',
    before:['The'], after:['bowls','were','empty'],
    options:['dogs','dog’s','dogs’'], correct:'dogs’',
    rule:'More than one dog, and the bowls belong to them, so the apostrophe goes AFTER the plural s: dogs’. “dog’s” would mean a single dog; “dogs” with no apostrophe is just a plural and owns nothing.' },

  { type:'choose', skill:'apostrophes',
    brief:'Complete the sentence about the weather.',
    before:['I','think'], after:['going','to','freeze','tonight'],
    options:['its','it’s','its’'], correct:'it’s',
    rule:'“It’s” is short for “it is” — the apostrophe stands in for the missing i. “Its” means belonging to it, and never takes an apostrophe. “its’” is not a word in English at all.' },

  { type:'choose', skill:'apostrophes',
    brief:'The tent belongs to one of the children. Whose tent is it?',
    before:['We','repaired','the'], after:['tent'],
    options:['childrens', 'children’s', 'childrens’'], correct:'children’s',
    rule:'“Children” is already plural without an s, so it takes ’s exactly like a singular noun: children’s. The same goes for men’s, women’s and people’s.' }
];

export function start(root, api) {
  const seq = shuf(ITEMS);
  let ix = 0, right = 0, wrong = 0;
  const host = el('div', { class:'stage', style:'grid-template-columns:minmax(0,1fr)' });
  root.append(host);

  const score = () => el('div', { class:'readout', style:'margin-top:12px' },
    el('div', { class:'c' }, el('div', { class:'l' }, 'Log entry'), el('div', { class:'v' }, `${ix + 1}/${seq.length}`)),
    el('div', { class:'c' }, el('div', { class:'l' }, 'Correct'), el('div', { class:'v' }, String(right))),
    el('div', { class:'c' }, el('div', { class:'l' }, 'Missed'), el('div', { class:'v' }, String(wrong))));

  function next() { ix++; ix >= seq.length ? finish() : render(); }

  function finish() {
    const pct = Math.round(right / seq.length * 100);
    api.complete(pct); api.Sound.win();
    host.replaceChildren(
      taskCard('Log office', 'Logbook filed.', `${right} of ${seq.length} entries punctuated correctly.`),
      el('div', { class:'panel', style:'margin-top:16px' },
        el('h3', {}, 'The thing to remember'),
        el('p', { class:'note' },
          'Punctuation is not decoration and it is not a set of arbitrary rules to be memorised. ' +
          'Every mark you placed changed who was doing what to whom. If you are ever unsure where a comma goes, ' +
          'read the sentence both ways aloud and pick the one that says what you actually mean.'),
        el('div', { style:'margin-top:14px' },
          el('button', { class:'btn go', onclick:() => { ix = 0; right = 0; wrong = 0; render(); } }, 'File another shift'),
          ' ', el('button', { class:'btn ghost', onclick: api.home }, 'Back to station'))));
  }

  /* ── gap-filling item ── */
  function renderPlace(item) {
    const placed = {};                 // gapIndex -> mark
    let tool = ',';
    const line = el('div', {
      style:'font-family:var(--serif);font-size:clamp(1.15rem,3.6vw,1.6rem);line-height:2.2;' +
            'display:flex;flex-wrap:wrap;align-items:baseline;gap:2px'
    });
    const out = el('div');
    const checkBtn = el('button', { class:'btn go', onclick: judge }, 'Check punctuation');

    function paint() {
      line.replaceChildren();
      item.tokens.forEach((tk, i) => {
        line.append(el('span', {}, tk));
        if (i < item.tokens.length - 1 || placed[i]) {
          const has = placed[i];
          line.append(el('button', {
            style:`font-family:var(--serif);font-size:1em;min-width:22px;padding:0 3px;
                   border:none;border-bottom:2px solid ${has ? 'var(--rust)' : 'rgba(36,31,40,.28)'};
                   color:${has ? 'var(--rust)' : 'rgba(36,31,40,.3)'};font-weight:700;cursor:pointer`,
            onclick:() => {
              placed[i] === tool ? delete placed[i] : (tool === '' ? delete placed[i] : placed[i] = tool);
              api.Sound.click(); paint();
            }
          }, has || '·'));
        }
      });
      line.append(el('span', {}, '.'));
    }

    function sentence(withMarks) {
      let s = '';
      item.tokens.forEach((tk, i) => {
        s += (i ? ' ' : '') + tk;
        if (withMarks[i]) s += withMarks[i];
      });
      return s + '.';
    }

    function judge() {
      const want = item.answer;
      const wantKeys = Object.keys(want);
      const gotKeys = Object.keys(placed).filter(k => placed[k]);
      const ok = wantKeys.length === gotKeys.length &&
                 wantKeys.every(k => placed[k] && want[k].includes(placed[k]));
      ok ? right++ : wrong++;
      api.record(item.skill, ok);
      ok ? api.Sound.ok() : api.Sound.no();
      checkBtn.disabled = true;

      const model = {}; wantKeys.forEach(k => model[k] = want[k][0]);
      out.replaceChildren(
        el('p', { class: ok ? 'good' : 'bad', style:'margin-top:14px;font-size:1.05rem' },
          ok ? 'Correct.' : 'Not quite.'),
        el('p', { style:'font-family:var(--serif);font-size:1.2rem;margin-top:6px' }, sentence(model)),
        why('The rule', item.rule),
        item.alt ? why('Move one mark and it means this instead', item.alt) : '',
        el('div', { style:'margin-top:14px' },
          el('button', { class:'btn go', onclick: next }, 'Next entry →')));
      out.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }

    const tools = el('div', { class:'row' },
      MARKS.map(mk => el('button', {
        class:'chip' + (mk.m === tool ? ' on' : ''), 'data-m':mk.m,
        onclick:() => { tool = mk.m; api.Sound.click();
          tools.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === tool)); }
      }, (mk.m || '—') + '  ' + mk.name)));

    host.replaceChildren(
      taskCard(`Entry ${ix + 1} of ${seq.length}${item.meaning ? ' · ambiguity' : ''}`, item.brief,
        'Pick a mark, then tap the gap where it belongs. Tap a placed mark again to remove it.'),
      score(),
      el('div', { class:'panel', style:'margin-top:16px' },
        el('h3', {}, 'Marks'), tools,
        el('h3', { style:'margin-top:16px' }, 'Log text'), line,
        el('div', { style:'margin-top:14px' }, checkBtn),
        out));
    paint();
  }

  /* ── multiple-form item (apostrophes) ── */
  function renderChoose(item) {
    const out = el('div');
    const opts = el('div', { class:'row' });
    item.options.forEach(o => opts.append(el('button', {
      class:'chip', style:'font-family:var(--serif);font-size:1.1rem;padding:10px 16px',
      onclick:() => {
        [...opts.children].forEach(c => c.disabled = true);
        const ok = o === item.correct;
        ok ? right++ : wrong++;
        api.record(item.skill, ok);
        ok ? api.Sound.ok() : api.Sound.no();
        out.replaceChildren(
          el('p', { class: ok ? 'good' : 'bad', style:'margin-top:14px;font-size:1.05rem' },
            ok ? 'Correct.' : `You chose “${o}”. The correct form is “${item.correct}”.`),
          el('p', { style:'font-family:var(--serif);font-size:1.2rem;margin-top:6px' },
            [...item.before, item.correct, ...item.after].join(' ') + '.'),
          why('The rule', item.rule),
          el('div', { style:'margin-top:14px' },
            el('button', { class:'btn go', onclick: next }, 'Next entry →')));
        out.scrollIntoView({ behavior:'smooth', block:'nearest' });
      }
    }, o)));

    host.replaceChildren(
      taskCard(`Entry ${ix + 1} of ${seq.length} · apostrophes`, item.brief,
        'Choose the form that fits the meaning described above.'),
      score(),
      el('div', { class:'panel', style:'margin-top:16px' },
        el('h3', {}, 'Log text'),
        el('p', { style:'font-family:var(--serif);font-size:clamp(1.15rem,3.6vw,1.55rem);line-height:1.9' },
          item.before.join(' ') + ' ',
          el('span', { style:'border-bottom:3px solid var(--rust);padding:0 26px' }, ' '),
          ' ' + item.after.join(' ') + '.'),
        el('h3', { style:'margin-top:16px' }, 'Options'), opts, out));
  }

  function render() {
    const it = seq[ix];
    it.type === 'place' ? renderPlace(it) : renderChoose(it);
  }
  render();
}

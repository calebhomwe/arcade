/* ============================================================
   Chili Firm 2 — Story campaign: missions, chapters, dialogue
   No drugs. Just hustle: seed → farm → jerky → fashion → mining
   → media → dynasty.
   ============================================================ */
(function (global) {
  'use strict';

  const Defs = (typeof module !== 'undefined' && module.exports)
    ? require('../core/defs.js')
    : global.CF.defs;

  const MISSIONS = [
    {
      id: 'm0', name: 'Read the Letter', chapter: 'Chapter 0 — The Letter',
      desc: 'Abuela Rosa left you something. Read it.',
      minDay: 1, check: () => true,
      dialogue: {
        title: 'The Letter',
        portrait: '👵', name: 'Abuela Rosa',
        lines: [
          { who: 'Abuela Rosa', text: 'Mijo, if you\u2019re reading this, I\u2019ve gone to tend the big garden in the sky.' },
          { who: 'Abuela Rosa', text: 'You get the farm. Twelve plots of dirt, a rusty hose, and the best chili soil in the county.' },
          { who: 'Abuela Rosa', text: 'I know you\u2019ve got big-city dreams. That\u2019s exactly why this farm is yours. Everything big starts as something small.' },
          { who: 'Abuela Rosa', text: 'Big Agri has been circling like a vulture. Don\u2019t sell. Grow something.' },
          { who: 'Abuela Rosa', text: 'Start with one seed. \u2014 Abuela Rosa' },
          { who: null, text: 'You look out over twelve empty plots. One seed. That\u2019s the whole plan.' },
        ],
      },
    },
    {
      id: 'm1', name: 'Plant Your First Chili', chapter: 'Chapter 1 — The First Seed',
      desc: 'Tap a plot on the farm and plant a Jalapeño seed.',
      minDay: 1, check: s => s.stats.planted >= 1,
      reward: { money: 20 },
      dialogue: {
        title: 'The First Seed',
        portrait: '🌱', name: 'Day 1',
        lines: [
          { who: null, text: 'You press a Jalapeño seed into Abuela\u2019s soil. Somewhere up there, she\u2019s smiling.' },
          { who: null, text: 'Keep it watered. Keep it growing. The market won\u2019t wait forever.' },
        ],
      },
    },
    {
      id: 'm2', name: 'First Harvest', chapter: 'Chapter 2 — Green Thumbs',
      desc: 'Harvest 5 chilis from your plots.',
      minDay: 1, check: s => s.stats.harvested >= 5,
      reward: { money: 50, rep: 10 },
      dialogue: {
        title: 'Green Thumbs',
        portrait: '🚚', name: 'Dana',
        lines: [
          { who: 'Dana', text: 'Yo! You\u2019re the chili heir?! I heard Abuela\u2019s farm got a new boss.' },
          { who: 'Dana', text: 'I run the taco truck by the gas station. My salsa has been SAD ever since Abuela retired. Your chilis \u2014 I want \u2019em.' },
          { who: 'Dana', text: 'Here\u2019s the deal, farm boss: you grow, I buy, we both eat good. Deal?' },
          { who: null, text: 'You shake on it. Your first customer.' },
        ],
      },
    },
    {
      id: 'm3', name: 'Market Day', chapter: 'Chapter 3 — Market Day',
      desc: 'Sell 10 chilis at the Market.',
      minDay: 1, check: s => s.stats.sold >= 10,
      reward: { money: 80, rep: 20 },
      dialogue: {
        title: 'Market Day',
        portrait: '🚚', name: 'Dana',
        lines: [
          { who: 'Dana', text: 'See?! Your chilis fire up my salsa like a dragon. People are LINING UP for the truck now.' },
          { who: 'Dana', text: 'Word\u2019s getting around town. Keep the market stocked \u2014 a buyer would change your life.' },
          { who: null, text: 'You\u2019ve got your first real cash flow. The farm feels different now. It feels like a business.' },
        ],
      },
    },
    {
      id: 'm4', name: 'Hiring Help', chapter: 'Chapter 4 — The Crew',
      desc: 'Hire your first Farmhand from the Workers tab.',
      minDay: 1, check: s => s.workers.farmhand.owned >= 1,
      reward: { money: 100, rep: 10 },
      dialogue: {
        title: 'The Crew',
        portrait: '🧢', name: 'Boots',
        lines: [
          { who: null, text: 'You can\u2019t water twelve plots forever. You post a HELP WANTED sign on the county board.' },
          { who: null, text: 'By sunrise, a farmhand is already at the gate, holding a hat and a thermos.' },
          { who: 'Boots', text: 'Heard you\u2019re the new Abuela. I\u2019m Boots. I plant, I water, I harvest. Point me at dirt.' },
          { who: null, text: 'Boots is hired on the spot. The farm starts working even when you\u2019re asleep.' },
        ],
      },
    },
    {
      id: 'm5', name: 'Big Agri Knocks', chapter: 'Chapter 5 — Big Agri Knocks',
      desc: 'Marcus Vega from Big Agri wants a word. (Reach $300)',
      minDay: 3, check: s => s.money >= 300,
      choice: {
        text: 'What do you do?',
        options: [
          { label: 'Refuse. The farm isn\u2019t for sale.', sub: '+60 reputation. Abuela would be proud.', effect: (s, api) => { api.rep(s, 60); s.story.vega = 'refuse'; api.log(s, 'You told Big Agri to kick rocks. The town hears about it.', 'story'); } },
          { label: 'Take his $1,000 \u201cdeposit\u201d and stall.', sub: 'Get $1,000 now \u2014 but you owe Big Agri 60 Jalapeños in 6 days.', effect: (s, api) => { api.money(s, 1000); s.story.vega = 'stall'; api.forceContract(s, 'c_big'); api.log(s, 'You took Vega\u2019s deposit. Now deliver 60 Jalapeños in 6 days...', 'bad'); } },
        ],
      },
      dialogue: {
        title: 'Big Agri Knocks',
        portrait: '🕴️', name: 'Marcus Vega',
        lines: [
          { who: 'Marcus Vega', text: 'Nice little operation, kid. Sentimental. Charming.' },
          { who: 'Marcus Vega', text: 'Big Agri buys farms like this every day. Sign here, walk away with five grand. No dirt under your nails, ever.' },
          { who: null, text: 'He slides a contract across the table. The pen glints in the porch light.' },
        ],
      },
    },
    {
      id: 'm6', name: 'The Jerky Dream', chapter: 'Chapter 6 — The Jerky Dream',
      desc: 'Grow your cash to $500 so you and Dana can start a jerky company.',
      minDay: 5, check: s => s.money >= 500,
      onComplete: s => { s.biz.jerky.unlocked = true; },
      dialogue: {
        title: 'The Jerky Dream',
        portrait: '🥩', name: 'Dana',
        lines: [
          { who: 'Dana', text: 'Okay okay okay. Listen. My uncle has a smoker. My cousin has a beef hookup. Your chilis are fire.' },
          { who: 'Dana', text: 'We turn cheap chilis into premium jerky and sell it for, like, ten times the price.' },
          { who: 'Dana', text: 'I\u2019m calling it: Dana\u2019s Jerky Co.' },
          { who: null, text: '🆕 DANA\u2019S JERKY CO. UNLOCKED! Build it from the Businesses tab. It eats 2 chilis per unit and sells itself.' },
        ],
      },
    },
    {
      id: 'm7', name: 'Batches & Bangers', chapter: 'Chapter 7 — Batches & Bangers',
      desc: 'Produce 20 jerky units at Dana\u2019s Jerky Co.',
      minDay: 5, check: s => s.biz.jerky.made >= 20,
      reward: { money: 600 },
      onComplete: s => { s.biz.jerky.recipe = Math.max(s.biz.jerky.recipe, 1); },
      dialogue: {
        title: 'Batches & Bangers',
        portrait: '🥩', name: 'Dana',
        lines: [
          { who: 'Dana', text: 'First batches SOLD OUT. The gas station guy wants a standing order. The gym bros want the Inferno.' },
          { who: 'Dana', text: 'My uncle\u2019s smoker is now OUR smoker. Cracked Pepper recipe unlocked!' },
          { who: 'Dana', text: 'Next stop: the county festival. Everyone who matters will be there.' },
        ],
      },
    },
    {
      id: 'm8', name: 'Festival Champion', chapter: 'Chapter 8 — Festival Champion',
      desc: 'Win the County Chili Festival: sell 50 chilis while the festival event is active.',
      minDay: 6, check: s => s.stats.festivals >= 1,
      reward: { money: 1500, rep: 100 },
      dialogue: {
        title: 'Festival Champion',
        portrait: '🎩', name: 'Mayor Hildy',
        lines: [
          { who: 'Mayor Hildy', text: 'On behalf of the county: the best chili stand at the fair belongs to the kid from Abuela\u2019s plot!' },
          { who: 'Mayor Hildy', text: 'You didn\u2019t just win the festival, hon. You put this town back on the map.' },
          { who: null, text: 'The trophy is a brass pepper. It weighs more than it looks.' },
        ],
      },
    },
    {
      id: 'm9', name: 'The City Calls', chapter: 'Chapter 9 — The City Calls',
      desc: 'Reach $10,000 cash and 300 reputation — the city has noticed you.',
      minDay: 8, check: s => s.money >= 10000 && s.rep >= 300,
      onComplete: s => { s.biz.fashion.unlocked = true; },
      dialogue: {
        title: 'The City Calls',
        portrait: '👔', name: 'Cousin Marco',
        lines: [
          { who: 'Cousin Marco', text: 'Cousin! Your peppers are all over my feed. Kids in the city are wearing shirts that say \u201cI\u2019M 80% CAPSAICIN.\u201d' },
          { who: 'Cousin Marco', text: 'That\u2019s YOUR brand, cousin. Nobody\u2019s collected it yet. We make the shirts. We own the hype.' },
          { who: null, text: '🆕 SPICE & THREAD UNLOCKED! Clothing is a whole new crop. Design collections from the Businesses tab.' },
        ],
      },
    },
    {
      id: 'm10', name: 'Spice & Thread', chapter: 'Chapter 10 — Spice & Thread',
      desc: 'Sell out 2 fashion collections.',
      minDay: 8, check: s => s.biz.fashion.designed >= 2,
      reward: { money: 5000, rep: 150 },
      dialogue: {
        title: 'Spice & Thread',
        portrait: '👔', name: 'Cousin Marco',
        lines: [
          { who: 'Cousin Marco', text: 'Two collections dropped, two collections sold out. The Ember Caps are on RAPPERS. Actual rappers.' },
          { who: 'Cousin Marco', text: 'Every farm is a brand and every brand is a factory. This is just the beginning, cousin.' },
        ],
      },
    },
    {
      id: 'm11', name: 'Old Hills, New Gold', chapter: 'Chapter 11 — Old Hills, New Gold',
      desc: 'Reach $50,000 cash and 800 reputation — old Sal has a proposal.',
      minDay: 10, check: s => s.money >= 50000 && s.rep >= 800,
      onComplete: s => { s.biz.mining.unlocked = true; },
      dialogue: {
        title: 'Old Hills, New Gold',
        portrait: '🧔', name: 'Sal the Prospector',
        lines: [
          { who: 'Sal', text: 'Sixty years I\u2019ve prospected these hills. And now I\u2019ll tell you what I told Abuela forty years ago:' },
          { who: 'Sal', text: 'Under your farm is a seam of chili salt and ore thick as a cow. Let\u2019s dig, partner. Fifty-fifty, expenses first.' },
          { who: null, text: '🆕 CHILIROCK MINING UNLOCKED! Passive income \u2014 and the hills keep their secrets. Watch for cave-ins.' },
        ],
      },
    },
    {
      id: 'm12', name: 'Chilirock', chapter: 'Chapter 12 — Chilirock',
      desc: 'Expand Chilirock Mining to level 3.',
      minDay: 10, check: s => s.biz.mining.level >= 3,
      reward: { money: 20000, rep: 300 },
      dialogue: {
        title: 'Chilirock',
        portrait: '🧔', name: 'Sal',
        lines: [
          { who: 'Sal', text: 'Three levels down and the rock\u2019s still paying! We hit a pocket the color of sunset, kid.' },
          { who: 'Sal', text: 'The boys call it \u201cAbuela\u2019s Gold.\u201d You can\u2019t mine that anywhere else on Earth.' },
        ],
      },
    },
    {
      id: 'm13', name: 'Lights, Camera, Chili', chapter: 'Chapter 13 — Lights, Camera, Chili',
      desc: 'Reach $150,000 cash and 1,500 reputation — TV is calling.',
      minDay: 14, check: s => s.money >= 150000 && s.rep >= 1500,
      onComplete: s => { s.biz.media.unlocked = true; },
      dialogue: {
        title: 'Lights, Camera, Chili',
        portrait: '📺', name: 'Crystal — Producer',
        lines: [
          { who: 'Crystal', text: 'A chili empire with a farm, a smokehouse, a clothing line AND a mine? Sweetheart, that\u2019s not a business. That\u2019s a TV show.' },
          { who: 'Crystal', text: 'Chili Empire TV. Thirteen episodes. You\u2019re the star. The network pays for everything.' },
          { who: null, text: '🆕 CHILI EMPIRE TV UNLOCKED! Your empire is now content. Content is now money.' },
        ],
      },
    },
    {
      id: 'm14', name: 'The Empire', chapter: 'Chapter 14 — The Empire',
      desc: 'Own all 4 businesses, 5,000 reputation and $100,000 in cash. Finish the story.',
      minDay: 16, check: s => s.biz.jerky.unlocked && s.biz.fashion.unlocked && s.biz.mining.unlocked && s.biz.media.unlocked && s.rep >= 5000 && s.money >= 100000,
      reward: { money: 250000, rep: 1000 },
      onComplete: s => { s.finished = true; s.legacy = true; },
      dialogue: {
        title: 'The Empire',
        portrait: '👵✨', name: 'Abuela Rosa',
        lines: [
          { who: null, text: 'You stand on the hill above the farm. Below: the greenhouses, the smokehouse, the merch warehouse, the mine lights, the TV crew.' },
          { who: 'Abuela Rosa', text: 'Mijo. You started with one seed. Remember?' },
          { who: 'Abuela Rosa', text: 'You didn\u2019t sell. You grew. That\u2019s the whole secret. Everything big starts as something small.' },
          { who: null, text: '🏆 STORY COMPLETE — you are now a Chili Dynasty! +10% income on everything, forever. Endless contracts and achievements await.' },
          { who: null, text: 'Thanks for playing Chili Firm 2: Replanted. 🌶️' },
        ],
      },
    },
  ];

  function current(state) {
    return MISSIONS[state.missionIdx] || null;
  }

  function tick(state, dt, now, api) {
    const m = current(state);
    if (!m) return;
    if (state.choice) return;
    if (state.day < m.minDay) return;
    if (m.check(state)) {
      if (m.choice && !state.story['chose_' + m.id]) {
        state.choice = { id: m.id, text: m.choice.text, options: m.choice.options.map(o => ({ label: o.label, sub: o.sub })) };
        return;
      }
      complete(state, m, api, now);
    }
  }

  function complete(state, m, api, now) {
    if (m.onComplete) m.onComplete(state, api);
    if (m.reward) {
      if (m.reward.money) api.money(state, m.reward.money);
      if (m.reward.rep) api.rep(state, m.reward.rep);
    }
    state.missionIdx++;
    if (m.dialogue) {
      // queue even during offline — the player reads it on return
      if (!state.pendingDialogue) state.pendingDialogue = m.dialogue;
      else state.dialogueQueue.push(m.dialogue);
    }
    api.log(state, '⭐ Mission complete: ' + m.name +
      (m.reward && m.reward.money ? ' (+' + api.fmt(m.reward.money) + ')' : ''), 'story');
  }

  function resolveChoice(state, idx, api, now) {
    if (!state.choice) return;
    const m = current(state);
    if (!m || !m.choice) return;
    const opt = m.choice.options[idx];
    if (!opt) return;
    if (opt.effect) opt.effect(state, api);
    state.story['chose_' + state.choice.id] = true;
    state.choice = null;
    complete(state, m, api, now);
  }

  const storyMod = { MISSIONS, current, tick, complete, resolveChoice };
  if (typeof module !== 'undefined' && module.exports) module.exports = storyMod;
  global.CF = global.CF || {};
  global.CF.story = storyMod;
})(typeof window !== 'undefined' ? window : globalThis);

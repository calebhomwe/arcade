/* ============================================================
   Chili Firm 2 — Expansion 2: flavor & lore pack
   Ambient town news, real pepper facts (Chili-pedia), endgame
   fashion collections and jerky recipes. Pure content, no DOM.
   Loads AFTER js/core/logic.js. Exports via CommonJS in node
   (for sim tests) and registers on global CF in the browser.
   ============================================================ */
(function (global) {
  'use strict';

  const Defs = (typeof module !== 'undefined' && module.exports)
    ? require('../core/defs.js')
    : global.CF.defs;
  const Logic = (typeof module !== 'undefined' && module.exports)
    ? require('../core/logic.js')
    : global.CF.logic;

  const pick = a => a[Math.floor(Math.random() * a.length)];
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ============================================================
  // 1) TOWN_NEWS — ambient local news, injected once in a while
  // ============================================================
  const TOWN_NEWS = [
    'Mayor Hildy declared Tuesday \u201cChili Appreciation Day\u201d and immediately scheduled it for every day.',
    'Abuela Rosa\u2019s ghost was seen watering the west field at dawn. The tomatoes have never looked better.',
    'Dana\u2019s taco truck sold out by 9 a.m. Boots blames \u201ca sudden surge in culture.\u201d',
    'Sal claims he found a vein of chili salt shaped like a fortune cookie. It is not a cookie, Sal.',
    'Cousin Marco wore his own merch to the county fair and signed two autographs. Zero were requested.',
    'Crystal is scouting locations for \u201cChili Empire TV: The Wedding Special.\u201d No wedding exists yet.',
    'Marcus Vega of Big Agri was seen buying a \u201cStay Local\u201d bumper sticker. He says it\u2019s for a friend.',
    'The mine\u2019s canary unionized. Sal agreed to better lunch breaks and a shorter commute.',
    'Spice & Thread\u2019s new line is so hot the mannequins have requested hazard pay.',
    'A stray goat ate three rows of jalape\u00f1os at the fair and now has a devoted following.',
    'Boots tried to teach the scarecrow a high-five. The scarecrow is a natural, says Boots.',
    'Mayor Hildy\u2019s official festival tasting badge is now laminated after an incident with a ghost pepper.',
    'A raccoon almost leaked Dana\u2019s secret salsa recipe. It has been retained as a consultant.',
    'The festival heat-eating contest ended in a three-way tie with a fire hydrant.',
    'Sal says the mine is 60% rock, 30% chili salt, and 10% \u201cabuela magic.\u201d Math checks out.',
    'Abuela Rosa\u2019s old recipe book surfaced in the smokehouse. Page one reads: \u201cLove, then heat.\u201d',
    'Crystal demanded \u201cgolden hour\u201d chili close-ups for the show. It has rained for three days.',
    'Big Agri offered to buy the whole valley again. Mayor Hildy\u2019s counter: \u201cNo, thank you, kindly.\u201d',
    'Boots won the festival water-balloon fight. Rivals cite \u201cunfair wrist flick experience.\u201d',
    'Cousin Marco renamed the parking lot \u201cThe Drop Zone\u201d and installed a velvet rope.',
    'Dana\u2019s taco truck now accepts payment in compliments. Business is booming, confusingly.',
    'The scarecrow has been promoted to night watchman. Pay is one spider per shift.',
    'Sal\u2019s mule Nugget ate a crate of habaneros and now demands to be sung to at work.',
    'Verde Springs is voting on a new motto: \u201cSmall Town, Big Heat.\u201d Boots wrote the runner-up.',
  ];

  // ============================================================
  // 2) CHILI-PEDIA — real pepper facts (Stats panel addon)
  // ============================================================
  const CHILI_PEDIA = [
    { emoji: '\u{1F321}', name: 'The Scoville Scale', text: 'The Scoville scale, invented by pharmacist Wilbur Scoville in 1912, rates chili heat in Scoville Heat Units (SHU). One SHU equals one part capsaicin per million parts liquid.' },
    { emoji: '\u{1F525}', name: 'Capsaicin', text: 'Capsaicin is the colorless, odorless chemical that makes chilis hot. It binds to pain receptors in your mouth, which is why heat feels like burning even though nothing is actually on fire.' },
    { emoji: '\u{1F426}', name: 'Birds Don\u2019t Feel the Heat', text: 'Birds lack the TRPV1 receptor, so they eat chilis with zero burn. That\u2019s the plant\u2019s plan: birds swallow the seeds and carry them far away, giving the chili a free delivery service.' },
    { emoji: '\u{1F9EA}', name: 'Capsaicinoids', text: 'Capsaicin is only the most famous of a family of compounds called capsaicinoids. Dihydrocapsaicin, the runner-up, is nearly as hot, and together they shape each chili\u2019s unique burn.' },
    { emoji: '\u{1F480}', name: 'The Carolina Reaper', text: 'The Carolina Reaper averaged about 1.64 million SHU with peaks near 2.2 million. Guinness World Records certified it as the hottest chili in 2013 and again in 2017.' },
    { emoji: '\u{1F351}', name: 'Jalape\u00f1o Heat', text: 'A typical jalape\u00f1o scores a modest 2,500 to 8,000 SHU. Because heat varies with soil and sun, one jalape\u00f1o can be mild while its neighbor clears your sinuses.' },
    { emoji: '\u{1F34A}', name: 'Habanero', text: 'Habaneros pack roughly 100,000 to 350,000 SHU \u2014 dozens of times hotter than a jalape\u00f1o. Their fruity, floral aroma hides a serious punch.' },
    { emoji: '\u{1F47B}', name: 'Ghost Pepper', text: 'The ghost pepper, or Bhut Jolokia, hits around 1,000,000 SHU. It held the world record from 2007 until the Trinidad Scorpion and Carolina Reaper took the crown.' },
    { emoji: '\u{1F95B}', name: 'Milk Beats Water', text: 'Capsaicin is oil-soluble, so water just spreads the burn around. The fat and casein in milk actually dissolve it away \u2014 that\u2019s why dairy beats water for putting out chili fire.' },
    { emoji: '\u{1F36B}', name: 'Chili & Chocolate', text: 'Mole, the famous Mexican sauce, has paired chilis with chocolate for centuries. The cacao\u2019s bitterness and the chili\u2019s fruity heat balance each other into something sweet, smoky, and spicy.' },
    { emoji: '\u{1F336}', name: 'New Mexico Hatch Chiles', text: 'The Hatch Valley in New Mexico grows the famous Hatch chiles, harvested every autumn. Their heat ranges from mild to hot, and fans roast them over open flames for that signature smoky sweetness.' },
    { emoji: '\u{1F4D6}', name: 'Where \u201cChili\u201d Comes From', text: 'The word chili comes from \u201cch\u012blli,\u201d the Nahuatl name used by the Aztecs. Columbus called the plants \u201cpepper\u201d because their heat reminded him of black pepper, and the name stuck.' },
    { emoji: '\u{1F48A}', name: 'Capsaicin Cream', text: 'Capsaicin cream is real medicine for nerve and joint pain. The sting desensitizes pain fibers over time, which is why pharmacists sell it for arthritis and neuropathy \u2014 burn on purpose, for relief.' },
    { emoji: '\u{1F3C6}', name: 'Record Chili-Eating', text: 'The Guinness record for most Carolina Reapers eaten in one minute stands at 120, set by Gregory Foster in 2020. Competitive eaters train for years; please do not try this at home.' },
    { emoji: '\u{1F33A}', name: 'Peppers Are Berries', text: 'Botanically, every chili pepper is a berry \u2014 a fruit that grows from a flower. The word \u201cvegetable\u201d is just kitchen shorthand, so yes, the world\u2019s spiciest fruit is real.' },
  ];

  // ============================================================
  // 3) Endgame fashion collections (show up in the fashion UI)
  // ============================================================
  Defs.COLLECTIONS.push(
    { id: 'c_legacy', name: 'Abuela Legacy Line', emoji: '\u{1F475}', cost: 250000, base: 25000, rep: 150 },
    { id: 'c_dynasty', name: 'Dynasty Drop', emoji: '\u{1F451}', cost: 600000, base: 60000, rep: 300 }
  );

  // ============================================================
  // 4) Endgame jerky recipes (unlock after Reaper Reserve)
  // ============================================================
  Defs.RECIPES.push(
    { id: 'r2_ghost', name: 'Ghost Gold Reserve', emoji: '\u2728', desc: '+170% jerky value. Needs 2 chefs.', cost: 200000, bonus: 1.7, needsChef: 2 },
    { id: 'r2_royal', name: 'Royal Dynasty Cut', emoji: '\u{1F451}', desc: '+250% jerky value. Needs 3 chefs.', cost: 500000, bonus: 2.5, needsChef: 3 }
  );

  // ============================================================
  // 5) Addons: daily town news + Chili-pedia Stats panel
  // ============================================================
  global.CF.addons = global.CF.addons || [];
  global.CF.addons.onDay = s => {
    if (Math.random() < 0.25) Logic.addLog(s, pick(TOWN_NEWS), 'info');
  };
  global.CF.addons.push({
    id: 'facts',
    emoji: '\u{1F4D6}',
    title: 'Chili-pedia \u2014 Real Pepper Facts',
    render: () => '<div class="grid2">' + CHILI_PEDIA.map(f =>
      '<div class="card unit-card">' +
        '<div class="u-head"><span class="u-emoji">' + esc(f.emoji) + '</span><span class="u-name">' + esc(f.name) + '</span></div>' +
        '<div class="u-desc">' + esc(f.text) + '</div>' +
      '</div>'
    ).join('') + '</div>',
  });

  const expansion2 = { TOWN_NEWS, CHILI_PEDIA };
  if (typeof module !== 'undefined' && module.exports) module.exports = expansion2;
  global.CF = global.CF || {};
  global.CF.expansion2 = expansion2;
})(typeof window !== 'undefined' ? window : globalThis);

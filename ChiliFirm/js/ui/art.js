/* ============================================================
   Chili Firm 2 — Procedural cartoon SVG art (comic outlines)
   CF.art.chili(id, px)   — pepper render per strain
   CF.art.plot(plot, strain, growSec) — potted plant + growth stages
   CF.art.portraitHtml(emoji) — character portrait (SVG or emoji)
   ============================================================ */
(function (global) {
  'use strict';

  const INK = '#2a1610';

  const PEPPER_BODY = 'M30 12 C24 12 20 17 18 24 C16 31 15 37 17 43 C19 49 24 53 31 53 C38 53 43 49 45 43 C47 37 46 31 44 24 C42 17 38 12 30 12 Z';
  const PEPPER_STEM = '<path d="M30 12 C30 8 34 8 34 12 L32 15 Z" fill="#2e7d32" stroke="' + INK + '" stroke-width="1.6"/>';
  const PEPPER_TAIL = '<path d="M31 53 C31 59 27 63 21 61 C24 60 28 58 29 53 Z" fill="currentFill" stroke="' + INK + '" stroke-width="1.8"/>';

  const PEPPER_STYLE = {
    jalapeno: { c: '#4caf50', tail: false },
    serrano: { c: '#7cb342', tail: false },
    cayenne: { c: '#e53935', tail: false },
    habanero: { c: '#ff9800', tail: false },
    birdseye: { c: '#ff3d2e', tail: false, scale: 0.72 },
    ghost: { c: '#b71c1c', tail: false },
    scorpion: { c: '#d32f2f', tail: true },
    reaper: { c: '#8e0000', tail: true },
    royal: { c: '#ffd700', tail: false, crown: true },
  };

  function chili(id, px) {
    const s = PEPPER_STYLE[id] || PEPPER_STYLE.jalapeno;
    const size = px || 34;
    const scale = s.scale || 1;
    const off = (1 - scale) * 32;
    const body = `<g transform="translate(${off} ${off}) scale(${scale})"><path d="${PEPPER_BODY}" fill="${s.c}" stroke="${INK}" stroke-width="2.2"/>${s.tail ? PEPPER_TAIL.replace('currentFill', s.c) : ''}${PEPPER_STEM}</g>`;
    const sheen = `<path d="M18 24 C22 20 30 17 36 18 C34 24 32 30 26 32 Z" fill="#ffffff" opacity="0.25"/>`;
    const crown = s.crown
      ? `<path d="M17 10 L21 16 L26 8 L32 16 L38 8 L44 16 L47 10 L47 17 L17 17 Z" fill="#ffb300" stroke="${INK}" stroke-width="1.8"/>`
      : '';
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${crown}${body}${sheen}</svg>`;
  }

  /* ---------- cartoon pot ---------- */
  function potG() {
    return `<path d="M18 40 L20 58 L44 58 L46 40 Z" fill="#c96f3b" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M23 47 L24 56 M32 47 L32 56 M41 47 L40 56" stroke="#a3551f" stroke-width="1.8" opacity=".55"/>
      <rect x="14" y="31" width="36" height="11" rx="5.5" fill="#d98246" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="32" cy="38" rx="15" ry="3.4" fill="#3a2414" stroke="${INK}" stroke-width="2"/>
      <circle cx="26" cy="38.5" r="1.1" fill="#24150c"/>
      <circle cx="37" cy="37.8" r="1.1" fill="#24150c"/>`;
  }
  function soilBed() {
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${potG()}</svg>`;
  }

  /* ---------- plant parts ---------- */
  function stem(d, color) {
    return `<path d="${d}" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${color}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  }
  function leaf(cx, cy, rot, fill, k) {
    const s = k || 1;
    return `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${s})">
      <path d="M0 0 C-10 -4 -14 -12 -12 -21 C-4 -23 3 -15 0 0 Z" fill="${fill}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M-1 -2 L-9 -16" stroke="#2e6b2e" stroke-width="1.2" opacity=".55"/>
    </g>`;
  }
  function miniPepper(cx, cy, k, fill, tail) {
    const s = k || 1;
    return `<g transform="translate(${cx - 32 * s} ${cy - 32 * s}) scale(${s})"><path d="${PEPPER_BODY}" fill="${fill}" stroke="${INK}" stroke-width="2.4"/>${tail ? PEPPER_TAIL.replace('currentFill', fill) : ''}${PEPPER_STEM}</g>`;
  }

  function sprout() {
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      ${potG()}
      ${stem('M32 36 C31.5 31 32 26 32 22', '#3e7d32')}
      ${leaf(32, 28, -32, '#6fae3e')}
      ${leaf(32, 23, 152, '#5c9c33')}
    </svg>`;
  }
  function youngPlant() {
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      ${potG()}
      ${stem('M32 36 C31 29 31 23 32 17', '#3e7d32')}
      ${leaf(32, 29, -30, '#6fae3e')}
      ${leaf(32, 24, 150, '#5c9c33')}
      ${leaf(28, 21, -55, '#79b94a', 0.92)}
      ${leaf(36, 19, 115, '#6fae3e', 0.92)}
      ${leaf(32, 15, 20, '#8ec94f', 0.8)}
    </svg>`;
  }
  function fruitingPlant(color, ripe) {
    const peppers = [];
    if (ripe) {
      peppers.push(miniPepper(23, 21, 0.21, color, false));
      peppers.push(miniPepper(39, 19, 0.22, color, false));
      peppers.push(miniPepper(32, 9, 0.21, color, false));
      peppers.push(miniPepper(29, 27, 0.17, color, false));
    } else {
      peppers.push(miniPepper(23, 22, 0.19, '#9ccc4e', false));
      peppers.push(miniPepper(39, 20, 0.19, '#9ccc4e', false));
      peppers.push(miniPepper(32, 12, 0.18, '#8bbf4a', false));
    }
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      ${potG()}
      ${stem('M32 36 C31 29 31 23 32 16', '#3e7d32')}
      ${leaf(32, 30, -30, '#6fae3e')}
      ${leaf(32, 25, 150, '#5c9c33')}
      ${leaf(28, 21, -58, '#79b94a', 0.92)}
      ${leaf(36, 18, 118, '#6fae3e', 0.92)}
      ${leaf(25, 27, -90, '#8ec94f', 0.85)}
      ${leaf(39, 25, 90, '#79b94a', 0.85)}
      ${peppers.join('')}
    </svg>`;
  }
  function wiltedPlant() {
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      ${potG()}
      ${stem('M32 36 C33 30 37 26 41 23 C43 21 44 19 44 17', '#6e5730')}
      ${leaf(33, 29, -58, '#8a6d3b')}
      ${leaf(38, 25, -95, '#7a5f31', 0.9)}
      ${leaf(30, 24, -42, '#8a6d3b', 0.9)}
      ${miniPepper(35, 20, 0.16, '#7a4a2f', false)}
      ${miniPepper(42, 16, 0.14, '#6e4528', false)}
      ${miniPepper(29, 20, 0.15, '#5d3a22', false)}
    </svg>`;
  }

  function plot(p, st, growSec) {
    if (!p || p.status === 'empty') return soilBed();
    const color = st ? st.color : '#4caf50';
    if (p.status === 'growing') {
      const f = Math.min(1, (p.progress || 0) / Math.max(1, growSec || 45));
      if (f < 0.3) return sprout();
      if (f < 0.65) return youngPlant();
      return fruitingPlant(color, false);
    }
    if (p.status === 'ready') return fruitingPlant(color, true);
    return wiltedPlant();
  }

  /* ---------- character portraits ---------- */
  function face(skin) {
    return `<circle cx="32" cy="33" r="19" fill="${skin}"/>
      <circle cx="25.5" cy="31" r="2.1" fill="#3a2518"/>
      <circle cx="38.5" cy="31" r="2.1" fill="#3a2518"/>
      <path d="M26 40 Q32 45 38 40" stroke="#7a4a2f" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }

  const PORTRAITS = {
    abuela: () => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 64 C10 50 20 45 32 45 C44 45 54 50 56 64 Z" fill="#6a4a8f"/>
      <path d="M13 52 C20 47 44 47 51 52" stroke="#5a3a7d" stroke-width="3" fill="none"/>
      ${face('#e8b98a')}
      <circle cx="32" cy="15" r="10" fill="#e8e2da"/>
      <circle cx="24" cy="13" r="6" fill="#f2ede6"/>
      <circle cx="32" cy="12" r="6.5" fill="#e8e2da"/>
      <circle cx="40" cy="13" r="6" fill="#f2ede6"/>
      <circle cx="26" cy="31" r="4.6" stroke="#7a5a3a" stroke-width="1.6" fill="none"/>
      <circle cx="38" cy="31" r="4.6" stroke="#7a5a3a" stroke-width="1.6" fill="none"/>
      <path d="M22 30.5 L30 30.5" stroke="#7a5a3a" stroke-width="1.6"/>
      <path d="M34 30.5 L42 30.5" stroke="#7a5a3a" stroke-width="1.6"/>
      <circle cx="23" cy="41" r="1.6" fill="#ffd700"/>
      <circle cx="41" cy="41" r="1.6" fill="#ffd700"/>
    </svg>`,
    abuela2: () => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#ffd166" opacity="0.25"/>
      <circle cx="32" cy="32" r="27" fill="none" stroke="#ffd166" stroke-width="1.4" opacity="0.6"/>
      ${PORTRAITS.abuela().replace(/^<svg[^>]*>/, '').replace('</svg>', '')}
    </svg>`,
    dana: () => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 64 C10 50 20 45 32 45 C44 45 54 50 56 64 Z" fill="#c0392b"/>
      ${face('#8d5524')}
      <path d="M27 40 Q32 45.5 37 40 Q32 43 27 40" fill="#ffffff"/>
      <circle cx="32" cy="18" r="9" fill="#2c1a10"/>
      <circle cx="25" cy="15" r="6" fill="#2c1a10"/>
      <circle cx="39" cy="15" r="6" fill="#2c1a10"/>
      <circle cx="24" cy="20" r="5" fill="#2c1a10"/>
      <circle cx="40" cy="20" r="5" fill="#2c1a10"/>
      <path d="M21 20 L43 16 L40 24 L24 26 Z" fill="#d32f2f"/>
      <circle cx="21" cy="20" r="2.2" fill="#d32f2f"/>
    </svg>`,
    vega: () => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 64 C10 50 20 45 32 45 C44 45 54 50 56 64 Z" fill="#263238"/>
      <path d="M20 47 L32 54 L44 47 L46 58 L18 58 Z" fill="#c62828"/>
      ${face('#f0c8a0')}
      <path d="M16 26 C16 13 24 10 32 10 C40 10 48 13 48 26 L46 20 C46 13 40 12 32 12 C24 12 18 13 18 20 Z" fill="#17181a"/>
      <rect x="19" y="26" width="12" height="9" rx="2" fill="#111214"/>
      <rect x="33" y="26" width="12" height="9" rx="2" fill="#111214"/>
      <path d="M24 41 Q32 44 40 41 Q40 45 32 45 Q24 45 24 41" fill="#2e2016"/>
    </svg>`,
    boots: () => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 64 C10 50 20 45 32 45 C44 45 54 50 56 64 Z" fill="#5d4037"/>
      <path d="M14 52 C22 48 42 48 50 52 L52 58 L12 58 Z" fill="#4e342e"/>
      ${face('#e8b98a')}
      <circle cx="26" cy="36" r="0.9" fill="#a9703f"/>
      <circle cx="30" cy="38" r="0.9" fill="#a9703f"/>
      <circle cx="35" cy="37" r="0.9" fill="#a9703f"/>
      <circle cx="39" cy="35" r="0.9" fill="#a9703f"/>
      <ellipse cx="32" cy="16" rx="21" ry="5.5" fill="#d9a441"/>
      <path d="M17 16 C17 8 24 5 32 5 C40 5 47 8 47 16 Z" fill="#e0b04e"/>
      <rect x="16" y="14.5" width="32" height="3.4" rx="1.7" fill="#8a5a00"/>
      <path d="M37 42 L45 46" stroke="#b8860b" stroke-width="2.4" stroke-linecap="round"/>
    </svg>`,
    mayor: () => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 64 C10 50 20 45 32 45 C44 45 54 50 56 64 Z" fill="#7b1fa2"/>
      ${face('#f5cba7')}
      <path d="M27 40.5 Q32 45.5 37 40.5" stroke="#d81b60" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M16 25 C14 12 20 8 32 8 C44 8 50 12 48 25 C42 17 22 17 16 25 Z" fill="#f4efe8"/>
      <circle cx="32" cy="10" r="6.5" fill="#faf6f0"/>
      <circle cx="26" cy="42" r="1.5" fill="#f5f5f5"/>
      <circle cx="32" cy="44.5" r="1.5" fill="#f5f5f5"/>
      <circle cx="38" cy="42" r="1.5" fill="#f5f5f5"/>
      <circle cx="25" cy="27" r="2.4" fill="#d81b60" opacity="0.35"/>
      <circle cx="39" cy="27" r="2.4" fill="#d81b60" opacity="0.35"/>
    </svg>`,
    marco: () => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 64 C10 50 20 45 32 45 C44 45 54 50 56 64 Z" fill="#00838f"/>
      <path d="M18 45 L32 50 L46 45 L47 55 L17 55 Z" fill="#006064"/>
      ${face('#c68642')}
      <path d="M17 24 C17 12 25 10 32 10 C40 10 47 12 47 24 L42 20 C38 24 26 24 22 20 Z" fill="#191919"/>
      <circle cx="42.5" cy="27" r="2.2" fill="none" stroke="#ffd700" stroke-width="1.8"/>
      <path d="M26 41 Q32 44 38 41 Q38 45 32 45.5 Q26 45 26 41" fill="#191919" opacity="0.85"/>
    </svg>`,
    sal: () => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 64 C10 50 20 45 32 45 C44 45 54 50 56 64 Z" fill="#37474f"/>
      ${face('#d9a066')}
      <path d="M16 24 C16 13 25 10 32 10 C39 10 48 13 48 24 L43 18 C40 24 24 24 21 18 Z" fill="#cfcfcf"/>
      <path d="M16 26 C14 38 18 48 24 52 L40 52 C46 48 50 38 48 26 C42 32 22 32 16 26 Z" fill="#e0e0e0"/>
      <path d="M23 40 Q28 45 33 40" stroke="#9e9e9e" stroke-width="1.4" fill="none"/>
      <path d="M33 40 Q38 45 42 40" stroke="#9e9e9e" stroke-width="1.4" fill="none"/>
      <path d="M14 20 L50 20 L50 26 L14 26 Z" fill="#fbc02d"/>
      <circle cx="32" cy="23" r="3.2" fill="#fff59d"/>
      <rect x="13" y="25" width="38" height="3.4" rx="1.7" fill="#8a5a00"/>
    </svg>`,
    crystal: () => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 64 C10 50 20 45 32 45 C44 45 54 50 56 64 Z" fill="#e53935"/>
      ${face('#f1c27d')}
      <path d="M15 26 C15 12 21 9 32 9 C43 9 49 12 49 26 L49 30 C44 22 20 22 15 30 Z" fill="#f2c94c"/>
      <circle cx="26" cy="30" r="4.4" stroke="#d32f2f" stroke-width="1.8" fill="none"/>
      <circle cx="38" cy="30" r="4.4" stroke="#d32f2f" stroke-width="1.8" fill="none"/>
      <path d="M22 30 L30 30 M34 30 L42 30" stroke="#d32f2f" stroke-width="1.8"/>
      <path d="M27 40.5 Q32 45.5 37 40.5" stroke="#c2185b" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <circle cx="48" cy="22" r="2.6" fill="#bdbdbd"/>
    </svg>`,
  };

  const PORTRAIT_FOR_EMOJI = {
    '👵': 'abuela',
    '👵✨': 'abuela2',
    '🚚': 'dana',
    '🥩': 'dana',
    '🕴️': 'vega',
    '🧢': 'boots',
    '🎩': 'mayor',
    '👔': 'marco',
    '🧔': 'sal',
    '📺': 'crystal',
  };

  function portrait(id) {
    const fn = PORTRAITS[id];
    return fn ? fn() : '';
  }

  function portraitHtml(emoji) {
    const id = PORTRAIT_FOR_EMOJI[emoji];
    if (id && PORTRAITS[id]) return `<span class="portrait portrait-art">${PORTRAITS[id]()}</span>`;
    return `<span class="portrait">${emoji}</span>`;
  }

  /* ---------- door customers (chibi, 3 variants) ---------- */
  const CUSTOMER_PALETTES = [
    ['#e8b98a', '#c0392b', '#17181a'],
    ['#c68642', '#1e88e5', '#3a2518'],
    ['#f1c27d', '#7b1fa2', '#ffd54f'],
  ];
  function customerChibi(i) {
    const pal = CUSTOMER_PALETTES[Math.abs(i) % CUSTOMER_PALETTES.length];
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="24" r="14" fill="${pal[0]}" stroke="${INK}" stroke-width="2"/>
      <path d="M22 26 C22 17 27 14 32 14 C37 14 42 17 42 26 L38 22 C38 17 26 17 26 22 Z" fill="${pal[2]}"/>
      <circle cx="27" cy="24" r="2.6" fill="#3a2518"/>
      <circle cx="37" cy="24" r="2.6" fill="#3a2518"/>
      <path d="M28 31 Q32 34 36 31" stroke="#7a4a2f" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M12 64 C14 48 22 44 32 44 C42 44 50 48 52 64 Z" fill="${pal[1]}" stroke="${INK}" stroke-width="2"/>
    </svg>`;
  }

  const art = { chili, plot, portrait, portraitHtml, customerChibi, soilBed };
  if (typeof module !== 'undefined' && module.exports) module.exports = art;
  global.CF = global.CF || {};
  global.CF.art = art;
})(typeof window !== 'undefined' ? window : globalThis);

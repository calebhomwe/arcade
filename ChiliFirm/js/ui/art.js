/* ============================================================
   Chili Firm 2 — Art library (all original vector art)
   Chunky cartoon style: thick ink outlines, saturated fills,
   one shade + one highlight per shape. Everything returns SVG
   markup strings so the UI can stamp them anywhere.
   ============================================================ */
(function (global) {
  'use strict';

  const INK = '#1e0b22';
  let uid = 0;
  const nid = p => (p || 'g') + (++uid);

  /* ---------- small helpers ---------- */
  function shade(hex, amt) {
    // amt < 0 darkens, > 0 lightens (−1..1)
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    const h = v => ('0' + Math.round(Math.max(0, Math.min(255, v))).toString(16)).slice(-2);
    return '#' + h(r) + h(g) + h(b);
  }
  function rng(seed) {
    let s = (seed * 9301 + 49297) % 233280;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  /* ============================================================
     ICONS — 48x48 viewBox, chunky with ink outline
     ============================================================ */
  const IC = {
    coin: `<circle cx="24" cy="25" r="18" fill="#c98a0b" stroke="${INK}" stroke-width="3.5"/><circle cx="24" cy="23" r="16" fill="#ffc933"/><circle cx="24" cy="23" r="11" fill="#ffdd57" stroke="#d99a10" stroke-width="2.5"/><path d="M24 15v16M28.5 18.5c-1.5-1.6-7.5-2.2-7.5 1.3 0 3.6 8 2 8 5.8 0 3.3-6 3.3-8.2 1.3" fill="none" stroke="#b77508" stroke-width="2.6" stroke-linecap="round"/><path d="M12 17a14 14 0 0 1 9-7" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8" fill="none"/><circle cx="24" cy="25" r="18" fill="none" stroke="${INK}" stroke-width="3.5"/>`,
    cash: `<g transform="rotate(-8 24 24)"><rect x="5" y="15" width="38" height="22" rx="3" fill="#2f8f3d" stroke="${INK}" stroke-width="3.2"/><rect x="5" y="11" width="38" height="22" rx="3" fill="#5fd068" stroke="${INK}" stroke-width="3.2"/><rect x="10" y="15" width="28" height="14" rx="2" fill="none" stroke="#2f8f3d" stroke-width="2"/><circle cx="24" cy="22" r="5" fill="#3aa84a"/><path d="M24 18.5v7" stroke="#e8ffe9" stroke-width="2" stroke-linecap="round"/></g>`,
    chili: `<path d="M30 9c-2-3-6-3-7 0l1 3" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M24 12c7 0 11 6 9 14-2 9-11 16-22 17 5-5 7-11 7-18 0-8 1-13 6-13z" fill="#ef2b24" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M19 18c0 6-1 11-4 16" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55" fill="none"/><path d="M20 12c3-3 9-3 12 0-3 2-9 2-12 0z" fill="#3fbf3f" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`,
    star: `<path d="M24 5l5.6 11.6 12.8 1.8-9.3 9 2.3 12.7L24 34l-11.4 6.1 2.3-12.7-9.3-9 12.8-1.8z" fill="#ffd12a" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M18 18l4-7" stroke="#fff7c2" stroke-width="3" stroke-linecap="round"/>`,
    sun: `<g stroke="${INK}" stroke-width="3" stroke-linecap="round"><path d="M24 3v6M24 39v6M3 24h6M39 24h6M9 9l4 4M35 35l4 4M9 39l4-4M35 13l4-4"/></g><circle cx="24" cy="24" r="11" fill="#ffc21a" stroke="${INK}" stroke-width="3.2"/><path d="M19 21a6 6 0 0 1 4-4" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
    moon: `<path d="M31 6a17 17 0 1 0 12 24A14 14 0 0 1 31 6z" fill="#ffe27a" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><circle cx="20" cy="30" r="3" fill="#e8c24f"/><circle cx="26" cy="37" r="2" fill="#e8c24f"/>`,
    seed: `<path d="M12 16l24 0 4 24c0 3-2 5-5 5H13c-3 0-5-2-5-5z" fill="#d9a066" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M12 16c2-4 22-4 24 0" fill="#b57b45" stroke="${INK}" stroke-width="3"/><path d="M24 36c-5-2-6-8-2-11 4 2 5 8 2 11z" fill="#ef2b24" stroke="${INK}" stroke-width="2.4"/><path d="M24 25c1-2 3-3 5-3" stroke="#3fbf3f" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
    drop: `<path d="M24 5C17 16 11 23 11 30a13 13 0 0 0 26 0c0-7-6-14-13-25z" fill="#3fb6ff" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M17 30c0 4 2 6 5 7" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>`,
    basket: `<path d="M8 20h32l-4 20H12z" fill="#c9843c" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M13 26h22M14 33h20" stroke="#8a5220" stroke-width="2.4"/><path d="M14 20c0-9 20-9 20 0" fill="none" stroke="${INK}" stroke-width="3.2"/><path d="M17 20c-1-5 3-8 6-6M27 20c1-4 5-6 7-3" fill="#ef2b24" stroke="${INK}" stroke-width="2.4"/>`,
    market: `<path d="M7 18l4-10h26l4 10z" fill="#ff4d3a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M15 8l-2 10M24 8v10M33 8l2 10" stroke="#fff" stroke-width="3"/><rect x="10" y="18" width="28" height="22" rx="2" fill="#ffe0a8" stroke="${INK}" stroke-width="3"/><rect x="15" y="24" width="10" height="16" fill="#8a5220" stroke="${INK}" stroke-width="2.6"/><rect x="28" y="24" width="7" height="7" fill="#7fd3ff" stroke="${INK}" stroke-width="2.4"/>`,
    crew: `<circle cx="24" cy="30" r="12" fill="#f0b27a" stroke="${INK}" stroke-width="3.2"/><path d="M9 24c0-10 30-10 30 0z" fill="#ff4d3a" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M26 24h16c0 3-3 4-6 4H26z" fill="#d12f22" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="20" cy="31" r="2" fill="${INK}"/><circle cx="28" cy="31" r="2" fill="${INK}"/><path d="M20 36c2 2 6 2 8 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    lab: `<path d="M18 6h12M20 6v12L9 38c-2 3 0 6 3 6h24c3 0 5-3 3-6L28 18V6" fill="#e9f7ff" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M13 32h22l4 6c1 3 0 5-3 5H12c-3 0-4-2-3-5z" fill="#b24dff"/><circle cx="21" cy="36" r="2.5" fill="#fff"/><circle cx="28" cy="31" r="1.8" fill="#fff"/><path d="M18 6h12M20 6v12L9 38c-2 3 0 6 3 6h24c3 0 5-3 3-6L28 18V6" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>`,
    empire: `<rect x="7" y="18" width="14" height="24" fill="#8f5bff" stroke="${INK}" stroke-width="3"/><rect x="21" y="8" width="20" height="34" fill="#b690ff" stroke="${INK}" stroke-width="3"/><path d="M11 23h6M11 29h6M11 35h6M25 14h4M33 14h4M25 21h4M33 21h4M25 28h4M33 28h4" stroke="#ffe066" stroke-width="3"/><rect x="28" y="34" width="6" height="8" fill="${INK}"/>`,
    trophy: `<path d="M14 7h20v10c0 8-4 13-10 13S14 25 14 17z" fill="#ffc21a" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M14 11H7c0 8 4 11 8 11M34 11h7c0 8-4 11-8 11" fill="none" stroke="${INK}" stroke-width="3"/><path d="M20 30h8v6h-8z" fill="#e0a000" stroke="${INK}" stroke-width="3"/><rect x="13" y="36" width="22" height="7" rx="2" fill="#8a5220" stroke="${INK}" stroke-width="3"/><path d="M19 11v8" stroke="#fff6c0" stroke-width="3" stroke-linecap="round"/>`,
    gear: `<path d="M21 4h6l1 5 4 2 4-3 4 4-3 4 2 4 5 1v6l-5 1-2 4 3 4-4 4-4-3-4 2-1 5h-6l-1-5-4-2-4 3-4-4 3-4-2-4-5-1v-6l5-1 2-4-3-4 4-4 4 3 4-2z" fill="#9aa7c7" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="24" r="7" fill="#4b5575" stroke="${INK}" stroke-width="3"/>`,
    soundOn: `<path d="M8 18h8l10-8v28l-10-8H8z" fill="#ffd12a" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M31 17c3 3 3 11 0 14M36 12c6 6 6 18 0 24" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`,
    soundOff: `<path d="M8 18h8l10-8v28l-10-8H8z" fill="#bbb" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M31 18l10 12M41 18L31 30" stroke="#ef2b24" stroke-width="4" stroke-linecap="round"/>`,
    music: `<path d="M18 34V10l20-4v24" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/><ellipse cx="13" cy="35" rx="6" ry="5" fill="#ff4fd8" stroke="${INK}" stroke-width="3"/><ellipse cx="33" cy="31" rx="6" ry="5" fill="#ff4fd8" stroke="${INK}" stroke-width="3"/><path d="M18 14l20-4" stroke="${INK}" stroke-width="5"/>`,
    fast: `<path d="M6 12l16 12L6 36zM24 12l16 12-16 12z" fill="#7cff5b" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>`,
    save: `<rect x="7" y="7" width="34" height="34" rx="4" fill="#3fa0ff" stroke="${INK}" stroke-width="3.2"/><rect x="14" y="7" width="18" height="11" fill="#e9f7ff" stroke="${INK}" stroke-width="3"/><rect x="13" y="26" width="22" height="15" fill="#fff" stroke="${INK}" stroke-width="3"/>`,
    lock: `<path d="M15 22v-6a9 9 0 0 1 18 0v6" fill="none" stroke="${INK}" stroke-width="4"/><rect x="10" y="21" width="28" height="22" rx="4" fill="#ffc21a" stroke="${INK}" stroke-width="3.2"/><circle cx="24" cy="30" r="3" fill="${INK}"/><path d="M24 31v6" stroke="${INK}" stroke-width="3"/>`,
    left: `<path d="M30 8L12 24l18 16" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 8L12 24l18 16" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
    right: `<path d="M18 8l18 16-18 16" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 8l18 16-18 16" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
    close: `<path d="M13 13l22 22M35 13L13 35" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M13 13l22 22M35 13L13 35" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>`,
    check: `<path d="M9 25l10 10 20-22" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 25l10 10 20-22" fill="none" stroke="#7cff5b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
    fire: `<path d="M24 4c3 8 13 12 13 25a13 13 0 0 1-26 0c0-6 3-10 6-13 0 4 2 7 4 7-2-7 0-14 3-19z" fill="#ff6a1a" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M24 22c3 4 7 7 7 12a7 7 0 0 1-14 0c0-4 3-6 4-9 1 3 2 4 3 4 0-3 0-5 0-7z" fill="#ffd12a"/>`,
    clock: `<circle cx="24" cy="24" r="18" fill="#fff" stroke="${INK}" stroke-width="3.4"/><path d="M24 13v12l8 5" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`,
    handshake: `<path d="M4 20l9-6 9 4 8-4 14 6-4 12-10 6-12-8-10-2z" fill="#f0b27a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M22 18l-6 6c2 2 5 2 7 0l4-3 9 8" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
    truck: `<rect x="3" y="14" width="26" height="18" rx="2" fill="#ff4d3a" stroke="${INK}" stroke-width="3"/><path d="M29 19h8l7 7v6H29z" fill="#ffd12a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="12" cy="35" r="5" fill="#333" stroke="${INK}" stroke-width="3"/><circle cx="36" cy="35" r="5" fill="#333" stroke="${INK}" stroke-width="3"/><path d="M8 20h14" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
    alert: `<path d="M24 5L44 41H4z" fill="#ffd12a" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M24 17v12" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/><circle cx="24" cy="35" r="2.6" fill="${INK}"/>`,
    bug: `<ellipse cx="24" cy="28" rx="11" ry="13" fill="#7cd23a" stroke="${INK}" stroke-width="3.2"/><circle cx="24" cy="14" r="6" fill="#3a7a1e" stroke="${INK}" stroke-width="3"/><path d="M13 24l-7-3M13 31l-7 2M35 24l7-3M35 31l7 2M21 9l-3-5M27 9l3-5" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M24 16v24" stroke="${INK}" stroke-width="2.4"/>`,
    tv: `<rect x="5" y="11" width="38" height="26" rx="4" fill="#4b3a8f" stroke="${INK}" stroke-width="3.2"/><rect x="9" y="15" width="30" height="18" rx="2" fill="#56e0ff"/><path d="M17 5l7 6 7-6" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M14 43h20" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M13 19h8" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
    shirt: `<path d="M16 7l-11 7 5 9 5-3v21h18V20l5 3 5-9-11-7c-1 4-4 6-8 6s-7-2-8-6z" fill="#ff4fd8" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M19 24c2-4 8-4 10 0-2 5-8 5-10 0z" fill="#ffd12a" stroke="${INK}" stroke-width="2"/>`,
    pick: `<path d="M8 16C16 6 32 6 40 16" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M8 16C16 6 32 6 40 16" fill="none" stroke="#b9c3d6" stroke-width="4.5" stroke-linecap="round"/><path d="M24 11l-2 33" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M24 11l-2 33" stroke="#b5733a" stroke-width="3.5" stroke-linecap="round"/>`,
    jerky: `<path d="M9 14c8-6 20-6 30 2 3 3 2 8-2 10-4 2-4 7-8 10-6 4-17 3-21-3-4-6-4-15 1-19z" fill="#9a3a22" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M14 20c6-3 14-3 20 1M13 28c6 0 10 1 14 4" stroke="#d6653f" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
    dna: `<path d="M15 5c0 12 18 14 18 24S15 33 15 43M33 5c0 12-18 14-18 24s18 4 18 14" fill="none" stroke="${INK}" stroke-width="5"/><path d="M15 5c0 12 18 14 18 24S15 33 15 43" fill="none" stroke="#ff4fd8" stroke-width="2.4"/><path d="M33 5c0 12-18 14-18 24s18 4 18 14" fill="none" stroke="#56e0ff" stroke-width="2.4"/><path d="M18 12h12M18 36h12M20 20h8" stroke="${INK}" stroke-width="2.6"/>`,
    bulb: `<path d="M24 5a13 13 0 0 0-8 23c2 2 3 4 3 7h10c0-3 1-5 3-7a13 13 0 0 0-8-23z" fill="#ffe66b" stroke="${INK}" stroke-width="3.2"/><rect x="18" y="35" width="12" height="8" rx="2" fill="#9aa7c7" stroke="${INK}" stroke-width="3"/><path d="M19 14a7 7 0 0 1 5-3" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>`,
    columns: `<path d="M5 16L24 5l19 11z" fill="#ffd9a0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M10 19v17M19 19v17M29 19v17M38 19v17" stroke="${INK}" stroke-width="5"/><path d="M10 19v17M19 19v17M29 19v17M38 19v17" stroke="#fff1d6" stroke-width="2"/><rect x="5" y="36" width="38" height="7" fill="#ffd9a0" stroke="${INK}" stroke-width="3"/>`,
    soil: `<path d="M10 14h28l3 27H7z" fill="#8a5a36" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M10 14l3-6h22l3 6" fill="#b87a47" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M16 30c3-4 5 4 8 0s5 4 8 0" stroke="#e3b27a" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M22 22c0-4 3-6 6-6 0 4-3 6-6 6z" fill="#5fd068" stroke="${INK}" stroke-width="2"/>`,
    lamp: `<path d="M8 10h32" stroke="${INK}" stroke-width="3"/><rect x="6" y="14" width="36" height="9" rx="3" fill="#6a4bd8" stroke="${INK}" stroke-width="3"/><path d="M10 23l-4 18h36l-4-18z" fill="#ff79f0" opacity=".45"/><path d="M11 18h26" stroke="#ffb8f7" stroke-width="3" stroke-linecap="round"/>`,
    bottle: `<rect x="20" y="4" width="8" height="8" fill="#ffd12a" stroke="${INK}" stroke-width="3"/><path d="M20 12h8l5 8v20c0 2-2 4-4 4H19c-2 0-4-2-4-4V20z" fill="#9b5bff" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><rect x="15" y="24" width="18" height="11" fill="#fff" stroke="${INK}" stroke-width="2.4"/><path d="M21 29c2-3 5-3 7 0" stroke="#ef2b24" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
    fridge: `<rect x="10" y="4" width="28" height="40" rx="4" fill="#dff4ff" stroke="${INK}" stroke-width="3.2"/><path d="M10 18h28" stroke="${INK}" stroke-width="3"/><path d="M15 9v5M15 22v9" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M20 28c3-2 7 2 11-1" stroke="#3fb6ff" stroke-width="2.4" fill="none"/>`,
    megaphone: `<path d="M8 20h7l20-11v30L15 28H8z" fill="#ff4d3a" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M15 28l3 12h6l-3-11" fill="#ffd12a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M39 17c3 3 3 11 0 14" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    hat: `<ellipse cx="24" cy="32" rx="21" ry="6" fill="#e8c16a" stroke="${INK}" stroke-width="3"/><path d="M13 31c0-14 22-14 22 0" fill="#f5d98a" stroke="${INK}" stroke-width="3"/><path d="M14 27h20" stroke="#ef2b24" stroke-width="4"/>`,
    hardhat: `<path d="M7 33c0-13 34-13 34 0z" fill="#ffc21a" stroke="${INK}" stroke-width="3.2"/><rect x="4" y="32" width="40" height="6" rx="3" fill="#ffc21a" stroke="${INK}" stroke-width="3"/><path d="M24 14v12" stroke="${INK}" stroke-width="3"/>`,
    chef: `<path d="M13 26c-6 0-8-10-1-12 1-6 9-8 12-3 3-5 11-3 12 3 7 2 5 12-1 12z" fill="#fff" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><rect x="13" y="26" width="22" height="13" rx="2" fill="#fff" stroke="${INK}" stroke-width="3.2"/><path d="M19 31v5M24 31v5M29 31v5" stroke="#c9c9c9" stroke-width="2.4"/>`,
    chart: `<rect x="6" y="6" width="36" height="36" rx="5" fill="#fff" stroke="${INK}" stroke-width="3.2"/><path d="M12 33l8-8 6 5 11-13" fill="none" stroke="#2fbf55" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M31 17h6v6" fill="none" stroke="#2fbf55" stroke-width="4" stroke-linecap="round"/>`,
    medal: `<path d="M14 4h8l4 14h-8zM34 4h-8l-4 14h8z" fill="#ff4d3a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="30" r="13" fill="#ffc21a" stroke="${INK}" stroke-width="3.2"/><path d="M24 22l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z" fill="#fff3b0" stroke="#c98a0b" stroke-width="1.6"/>`,
    news: `<rect x="6" y="9" width="32" height="32" rx="3" fill="#fff" stroke="${INK}" stroke-width="3.2"/><path d="M38 17h5v20a4 4 0 0 1-8 0" fill="#e6e6e6" stroke="${INK}" stroke-width="3"/><rect x="11" y="14" width="12" height="10" fill="#ff4d3a"/><path d="M26 15h8M26 20h8M11 29h22M11 34h22" stroke="${INK}" stroke-width="2.6"/>`,
    map: `<path d="M5 11l12-4 14 4 12-4v30l-12 4-14-4-12 4z" fill="#b8f08c" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M17 7v30M31 11v30" stroke="${INK}" stroke-width="2.6"/><circle cx="24" cy="21" r="3.5" fill="#ef2b24" stroke="${INK}" stroke-width="2"/>`,
    snow: `<g stroke="${INK}" stroke-width="5" stroke-linecap="round"><path d="M24 5v38M8 14l32 20M8 34l32-20"/></g><g stroke="#bfe9ff" stroke-width="2.4" stroke-linecap="round"><path d="M24 5v38M8 14l32 20M8 34l32-20"/></g>`,
    camera: `<rect x="5" y="14" width="38" height="26" rx="4" fill="#4b5575" stroke="${INK}" stroke-width="3.2"/><path d="M16 14l3-6h10l3 6" fill="#9aa7c7" stroke="${INK}" stroke-width="3"/><circle cx="24" cy="27" r="8" fill="#56e0ff" stroke="${INK}" stroke-width="3"/><circle cx="21" cy="24" r="2.4" fill="#fff"/>`,
    party: `<path d="M8 42l8-26 18 18z" fill="#ffd12a" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M12 30l6 6M14 23l10 10" stroke="#ff4fd8" stroke-width="3"/><circle cx="32" cy="10" r="3" fill="#56e0ff"/><circle cx="40" cy="20" r="2.6" fill="#ff4d3a"/><path d="M26 12c2-4 6-4 8-8M36 28c4-1 6 1 8-2" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
    crown: `<path d="M6 16l9 8 9-14 9 14 9-8-4 24H10z" fill="#ffc21a" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><circle cx="24" cy="30" r="3.4" fill="#ff4d3a" stroke="${INK}" stroke-width="2"/><path d="M11 36h26" stroke="#c98a0b" stroke-width="3"/>`,
    ship: `<path d="M5 28h38l-6 12H11z" fill="#ff4d3a" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><rect x="14" y="16" width="20" height="12" fill="#fff" stroke="${INK}" stroke-width="3"/><rect x="21" y="8" width="7" height="8" fill="#ffd12a" stroke="${INK}" stroke-width="3"/>`,
    building: `<rect x="10" y="6" width="28" height="36" fill="#9aa7c7" stroke="${INK}" stroke-width="3.2"/><path d="M15 12h5M28 12h5M15 19h5M28 19h5M15 26h5M28 26h5" stroke="#ffe066" stroke-width="3.4"/><rect x="20" y="32" width="8" height="10" fill="${INK}"/>`,
    tent: `<path d="M4 40L24 8l20 32z" fill="#ff4d3a" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M14 24L24 8l10 16" fill="#fff" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M19 40l5-10 5 10z" fill="#5a1d10" stroke="${INK}" stroke-width="2.6"/>`,
    thermo: `<path d="M20 30V9a4 4 0 0 1 8 0v21a8 8 0 1 1-8 0z" fill="#fff" stroke="${INK}" stroke-width="3.2"/><circle cx="24" cy="36" r="5" fill="#ef2b24"/><path d="M24 16v19" stroke="#ef2b24" stroke-width="4" stroke-linecap="round"/>`,
    cactus: `<path d="M20 44V12a4 4 0 0 1 8 0v32M20 28h-6a3 3 0 0 1-3-3v-6M28 24h6a3 3 0 0 0 3-3v-7" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M20 44V12a4 4 0 0 1 8 0v32M20 28h-6a3 3 0 0 1-3-3v-6M28 24h6a3 3 0 0 0 3-3v-7" fill="none" stroke="#5fd068" stroke-width="4" stroke-linecap="round"/>`,
    plate: `<ellipse cx="24" cy="30" rx="20" ry="9" fill="#fff" stroke="${INK}" stroke-width="3.2"/><ellipse cx="24" cy="29" rx="12" ry="5" fill="#e8e8e8"/><path d="M18 26c3-6 9-6 12 0" fill="#9a3a22" stroke="${INK}" stroke-width="2.4"/>`,
    whistle: `<path d="M8 22h22a10 10 0 1 1-10 12H8z" fill="#9aa7c7" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><circle cx="30" cy="31" r="4" fill="${INK}"/>`,
  };

  function icon(name, size, cls) {
    const body = IC[name] || IC.star;
    const s = size || 24;
    return `<svg class="ico ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;
  }

  // map game-data ids (which use emoji) to our own icons
  const ICON_FOR = {
    // upgrades
    soil: 'soil', irrigation: 'drop', greenhouse: 'lamp', fertilizer: 'bottle', storage: 'fridge', marketing: 'megaphone',
    // workers
    farmhand: 'hat', buyer: 'market', foreman: 'hardhat', driver: 'truck', chef: 'chef', brand: 'chart',
    // businesses
    jerky: 'jerky', fashion: 'shirt', mining: 'pick', media: 'tv',
    // research
    r_royal: 'dna', r_legacy: 'columns', r_brand: 'bulb',
    // events
    heatwave: 'thermo', drought: 'cactus', festival: 'tent', pests: 'bug', critic: 'plate',
    dynasty_parade: 'party', royal_visit: 'crown', recipe_leak: 'news', chili_snow: 'snow',
    // recipes
    classic: 'jerky', cracked: 'jerky', inferno: 'fire', smoked: 'fire', reaper: 'fire',
    // collections
    c_tees: 'shirt', c_caps: 'shirt', c_hoods: 'shirt', c_drip: 'shirt',
  };
  function iconFor(id, size) {
    if (id === 'media' && size === 'event') return icon('camera', 24);
    return icon(ICON_FOR[id] || 'star', size || 24);
  }
  function eventIcon(id, size) { return icon(id === 'media' ? 'camera' : (ICON_FOR[id] || 'alert'), size || 28); }

  /* ============================================================
     PEPPERS — drawn hanging, stem at (0,0), body toward +y
     ============================================================ */
  const PEPPER_SHAPE = {
    jalapeno: { d: 'M0 0C7 0 9.5 8 9 17 8.5 26 4.5 32 0 33-4.5 32-8.5 26-9 17-9.5 8-7 0 0 0Z', hl: 'M-4 6C-5.5 12-5.5 20-3.5 26', len: 33 },
    serrano: { d: 'M0 0C4.5 0 6 9 5.5 18 5 26 2 31 0 32-2 31-5 26-5.5 18-6 9-4.5 0 0 0Z', hl: 'M-2.5 6C-3.2 12-3.2 19-2 24', len: 32 },
    cayenne: { d: 'M0 0C4.5 1 5.5 12 4 24 2.5 34-1 41-6 44-4 37-4.5 28-4.5 18-4.5 8-3.5 0 0 0Z', hl: 'M-2 6C-2.5 14-2.6 22-3 30', len: 44 },
    habanero: { d: 'M0 0C8 0 12 7 11.5 14 11 20 7 24 3 26 1.5 24 -1.5 24-3 26-7 24-11.5 20-11.5 14-12 7-8 0 0 0Z', hl: 'M-6 6C-8 10-8 15-6 19', len: 26 },
    birdseye: { d: 'M0 0C3.5 0 4.5 6 4 12 3.5 18 1.5 22 0 23-1.5 22-3.5 18-4 12-4.5 6-3.5 0 0 0Z', hl: 'M-1.8 4C-2.3 9-2.3 14-1.6 18', len: 23 },
    ghost: { d: 'M0 0C6 0 8 5 7 10 9 14 6 18 7 23 7 29 3 34 0 36-3 34-7 29-6.5 23-8 18-6 14-7.5 10-8 5-6 0 0 0Z', hl: 'M-3.5 5C-4.5 11-3 17-4 24', len: 36 },
    scorpion: { d: 'M0 0C8 0 11 7 10.5 14 10 20 6 24 3 25 2 28 3 31 1 33 0 30-1 27-2 25-7 23-10.5 19-10.5 13-11 6-8 0 0 0Z', hl: 'M-5.5 5C-7 10-7 14-5.5 18', len: 33 },
    reaper: { d: 'M0 0C9 0 12 6 11.5 13 11 19 8 23 5 25 6 29 9 31 8 34 4 33 2 29 1 26-5 25-11 21-11 13-11.5 6-9 0 0 0Z', hl: 'M-5.5 5C-7 10-7 15-5 19', len: 34 },
    royal: { d: 'M0 0C8 0 12 7 11.5 14 11 20 7 24 3 26 1.5 24 -1.5 24-3 26-7 24-11.5 20-11.5 14-12 7-8 0 0 0Z', hl: 'M-6 6C-8 10-8 15-6 19', len: 26 },
  };
  const PEPPER_COLOR = {
    jalapeno: '#0b6a2c', serrano: '#157a22', cayenne: '#f0261b', habanero: '#ff8a00', birdseye: '#ff2d3f',
    ghost: '#d8141c', scorpion: '#f23a12', reaper: '#b3001b', royal: '#ffc21a',
  };
  function pepperG(kind, x, y, rot, scale, ripe, sw) {
    const sh = PEPPER_SHAPE[kind] || PEPPER_SHAPE.cayenne;
    const col = ripe ? (PEPPER_COLOR[kind] || '#f0261b') : '#56b83a';
    const dark = shade(col, -0.35);
    const w = sw || 2.4;
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})">
      <path d="${sh.d}" fill="${col}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>
      <path d="${sh.d}" fill="${dark}" opacity=".35" transform="translate(2.5 1) scale(.82)" />
      <path d="${sh.hl}" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".75"/>
      <path d="M-5 1C-3-2 3-2 5 1 3 3-3 3-5 1Z" fill="#3a9a2a" stroke="${INK}" stroke-width="${w * 0.8}" stroke-linejoin="round"/>
      <path d="M0 0C0-4 1-7 3-9" stroke="#3a9a2a" stroke-width="3" fill="none" stroke-linecap="round"/>
      ${kind === 'royal' ? '<path d="M-5-2l2-5 3 3 3-3 2 5z" fill="#fff3a0" stroke="' + INK + '" stroke-width="1.4"/>' : ''}
    </g>`;
  }
  // standalone pepper badge (for market rows etc.)
  function pepper(kind, size) {
    const sh = PEPPER_SHAPE[kind] || PEPPER_SHAPE.cayenne;
    const L = sh.len + 12;
    const sc = 40 / L;
    return `<svg class="pep" width="${size || 32}" height="${size || 32}" viewBox="0 0 48 48" aria-hidden="true">
      ${pepperG(kind, 24, 6 + (40 - sh.len * sc) / 2, -18, sc * 1.05, true, 2.6)}</svg>`;
  }

  /* ============================================================
     POTS — style by Premium Soil level
     ============================================================ */
  function potStyle(lvl) {
    if (lvl >= 6) return { body: '#ffc21a', rim: '#ffe066', dark: '#c98a0b', deco: 'gold' };
    if (lvl >= 4) return { body: '#6a3bd1', rim: '#9b6bff', dark: '#43218f', deco: 'neon' };
    if (lvl >= 2) return { body: '#e8312a', rim: '#ff5a4a', dark: '#9e1a14', deco: 'flame' };
    return { body: '#d9733a', rim: '#ef8c4c', dark: '#a3501f', deco: 'clay' };
  }
  function potSvg(lvl) {
    const p = potStyle(lvl);
    let deco = '';
    if (p.deco === 'flame') deco = `<path d="M50 132c-3-5 1-8 3-12 1 4 4 5 4 9 0 3-3 5-7 3zM66 134c-2-4 1-6 2-9 1 3 3 4 3 7 0 2-2 3-5 2z" fill="#ffd12a" stroke="${INK}" stroke-width="1.6"/>`;
    else if (p.deco === 'neon') deco = `<path d="M34 128h52" stroke="#56e0ff" stroke-width="3" stroke-linecap="round"/><path d="M34 128h52" stroke="#bff6ff" stroke-width="1.2" stroke-linecap="round"/>`;
    else if (p.deco === 'gold') deco = `<path d="M42 124l4 6 4-6M70 124l4 6 4-6" stroke="#fff6c0" stroke-width="2.4" fill="none"/><circle cx="60" cy="131" r="4" fill="#ff4d3a" stroke="${INK}" stroke-width="1.6"/>`;
    else deco = `<path d="M40 128h40" stroke="${p.dark}" stroke-width="2" opacity=".6"/>`;
    return `
      <ellipse cx="60" cy="147" rx="30" ry="4.5" fill="#000" opacity=".28"/>
      <path d="M31 114h58l-7 32c-1 2-2 3-4 3H42c-2 0-3-1-4-3z" fill="${p.body}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>
      <path d="M69 114h20l-7 32c-1 2-2 3-4 3h-7z" fill="${p.dark}" opacity=".45"/>
      <path d="M38 120l5 24" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>
      ${deco}
      <rect x="27" y="106" width="66" height="12" rx="4" fill="${p.rim}" stroke="${INK}" stroke-width="3.4"/>
      <path d="M31 109h40" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".45"/>
      <ellipse cx="60" cy="107.5" rx="29" ry="3.5" fill="#4a2a17"/>`;
  }

  /* ============================================================
     PLANTS — stage from progress, per-strain pepper shape
     ============================================================ */
  function leaf(x, y, ang, len, col, flip) {
    const w = len * 0.42;
    const s = flip ? -1 : 1;
    const d = `M0 0C${w * 0.9} ${-w * 0.5 * s} ${len * 0.75} ${-w * 0.55 * s} ${len} 0C${len * 0.7} ${w * 0.45 * s} ${w * 0.6} ${w * 0.55 * s} 0 0Z`;
    return `<g transform="translate(${x} ${y}) rotate(${ang})">
      <path d="${d}" fill="${col}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M1 0L${len - 1} 0C${len * 0.7} ${w * 0.45 * s} ${w * 0.6} ${w * 0.55 * s} 1 0Z" fill="${shade(col, -0.24)}"/>
      <path d="M${len * 0.12} 0C${len * 0.4} ${-w * 0.08 * s} ${len * 0.65} ${-w * 0.08 * s} ${len * 0.85} 0" stroke="${shade(col, -0.35)}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M${len * 0.2} ${-w * 0.22 * s}C${len * 0.4} ${-w * 0.36 * s} ${len * 0.6} ${-w * 0.34 * s} ${len * 0.72} ${-w * 0.22 * s}" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".45"/>
    </g>`;
  }
  function flower(x, y) {
    return `<g transform="translate(${x} ${y})"><circle r="4.6" fill="#fff" stroke="${INK}" stroke-width="1.8"/><circle r="1.8" fill="#ffd12a"/></g>`;
  }

  // stage: 0 empty,1 sprout,2 young,3 flowering,4 fruiting,5 ready,6 wilted
  function stageOf(p, grow) {
    if (!p || p.status === 'empty') return 0;
    if (p.status === 'ready') return 5;
    if (p.status === 'wilted') return 6;
    const f = Math.min(1, p.progress / grow);
    if (f < 0.18) return 1;
    if (f < 0.42) return 2;
    if (f < 0.66) return 3;
    return 4;
  }

  const LEAF_COL = { jalapeno: '#a6e64e', serrano: '#b0e84e', cayenne: '#39b84a', habanero: '#5ccf3c', birdseye: '#2fb87a', ghost: '#3fa6a0', scorpion: '#8fc23a', reaper: '#8a62c8', royal: '#d2dc3a' };

  function cloud(circles, fill, hi, ink) {
    // outlined union of circles: ink pass (fat), fill pass, highlight pass
    let a = '', b = '', m = '', c = '';
    const dark = shade(fill, -0.3);
    circles.forEach(q => {
      a += `<circle cx="${q[0]}" cy="${q[1]}" r="${q[2] + 2.8}" fill="${ink}"/>`;
      b += `<circle cx="${q[0]}" cy="${q[1]}" r="${q[2]}" fill="${dark}"/>`;
      m += `<circle cx="${q[0] - q[2] * 0.14}" cy="${q[1] - q[2] * 0.16}" r="${q[2] * 0.84}" fill="${fill}"/>`;
      c += `<circle cx="${q[0] - q[2] * 0.3}" cy="${q[1] - q[2] * 0.36}" r="${q[2] * 0.42}" fill="${hi}"/>`;
    });
    return a + b + m + c;
  }

  function plantSvg(p, grow, seed, potLvl, idx) {
    const st = stageOf(p, grow);
    const kind = p && p.strain ? p.strain : 'jalapeno';
    const r = rng((seed || 1) * 7 + 3);
    const wilt = st === 6;
    const base = wilt ? '#a8943a' : (LEAF_COL[kind] || '#3cc24a');
    const dark = shade(base, -0.32);
    const light = shade(base, 0.22);
    let g = '';
    const f = p && p.status === 'growing' ? Math.min(1, p.progress / grow) : 1;
    if (st === 1) {
      g += `<path d="M60 108C60 100 59 96 60 88" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
      g += `<path d="M60 108C60 100 59 96 60 88" stroke="#3f9a2c" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
      g += leaf(60, 90, -160, 18, base, true) + leaf(60, 90, -20, 18, base, false);
    } else if (st >= 2) {
      // bush geometry per stage
      const S = { 2: [60, 82, 26, 18], 3: [60, 68, 38, 31], 4: [60, 58, 47, 38], 5: [60, 55, 49, 41], 6: [60, 80, 46, 23] }[st];
      const cx = S[0], cy = S[1], rx = S[2], ry = S[3];
      // stem
      g += `<path d="M60 108C59 ${cy + 30} 61 ${cy + 10} 60 ${cy}" stroke="${INK}" stroke-width="8" fill="none" stroke-linecap="round"/>`;
      g += `<path d="M60 108C59 ${cy + 30} 61 ${cy + 10} 60 ${cy}" stroke="${wilt ? '#8a7a30' : '#3f9a2c'}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      // spiky leaf ring behind the bush
      const nL = st === 2 ? 6 : 11;
      for (let i = 0; i < nL; i++) {
        const t = i / (nL - 1);
        const ang = wilt ? (10 + t * 160) : (-200 + t * 220);
        const rad = ang * Math.PI / 180;
        const lx = cx + Math.cos(rad) * rx * 0.55, ly = cy + Math.sin(rad) * ry * 0.55;
        g += leaf(lx, ly, ang + (r() - 0.5) * 14, (st === 2 ? 17 : 24) + r() * 6, i % 2 ? dark : base, i % 2 === 0);
      }
      // bush mass
      const circ = [];
      const n = st === 2 ? 4 : 8;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r() * 0.4;
        circ.push([cx + Math.cos(a) * rx * 0.55, cy + Math.sin(a) * ry * 0.5, (st === 2 ? 9 : 14) + r() * 5]);
      }
      circ.push([cx, cy, st === 2 ? 11 : 18]);
      if (st >= 3 && !wilt) circ.push([cx, cy - ry * 0.7, 13 + r() * 3]);
      g += cloud(circ, base, light, INK);
      // texture leaves on top
      const nT = st === 2 ? 2 : 5;
      for (let i = 0; i < nT; i++) {
        const a = -Math.PI / 2 + (i - (nT - 1) / 2) * 0.9;
        g += leaf(cx + Math.cos(a) * rx * 0.25, cy + Math.sin(a) * ry * 0.2, (a * 180 / Math.PI) + (wilt ? 150 : 0), 16 + r() * 5, i % 2 ? light : base, i % 2 === 0);
      }
      if (st === 3) {
        for (let i = 0; i < 5; i++) g += flower(cx - rx * 0.7 + r() * rx * 1.4, cy - ry * 0.6 + r() * ry * 1.1);
      }
      if (st >= 4) {
        const ripe = st >= 5;
        const small = st === 4 ? 0.5 + 0.45 * ((f - 0.66) / 0.34) : 1;
        const sc = (kind === 'birdseye' ? 1.15 : kind === 'cayenne' ? 0.8 : kind === 'ghost' ? 0.88 : 1.0) * small * (wilt ? 0.75 : 1);
        const slots = [[cx - rx * 0.62, cy - ry * 0.1, 16], [cx + rx * 0.6, cy - ry * 0.2, -14], [cx - rx * 0.2, cy + ry * 0.25, 8], [cx + rx * 0.25, cy + ry * 0.3, -6], [cx, cy - ry * 0.55, 3], [cx - rx * 0.85, cy + ry * 0.45, 22]];
        const nP = ripe ? (kind === 'birdseye' ? 6 : 5) : 4;
        for (let i = 0; i < nP; i++) {
          const q = slots[i];
          g += pepperG(kind, q[0], q[1] + (wilt ? 8 : 0), q[2] + (wilt ? 40 : 0), sc, ripe, 2.6);
        }
      }
    }
    const delay = `style="animation-delay:-${((idx || 0) * 0.37) % 3}s"`;
    return `<div class="plantwrap st${st}"><svg class="pot-svg" viewBox="0 0 120 152" aria-hidden="true">${potSvg(potLvl || 0)}</svg><svg class="leaf-svg" viewBox="0 0 120 152" ${delay} aria-hidden="true">${g}${st === 0 ? `<g class="seed-hint"><circle cx="60" cy="96" r="12" fill="#fff" stroke="${INK}" stroke-width="3.4"/><path d="M60 89v14M53 96h14" stroke="#2fbf55" stroke-width="4" stroke-linecap="round"/></g>` : ''}</svg></div>`;
  }

  /* ============================================================
     CHARACTERS — parametric chunky chibi rig
     viewBox 0 0 200 300 (full body), bust crops to 0 0 200 190
     ============================================================ */
  const SKIN = { light: '#f6c9a0', tan: '#e2a574', brown: '#b8733f', deep: '#7a4524' };

  function arm(side, cfg, ang, holding) {
    // arm hangs down from shoulder origin; rotated by ang (deg, + = outward)
    const s = side === 'L' ? -1 : 1;
    const sx = 100 + s * 44, sy = 158;
    const sleeve = cfg.top;
    const skin = SKIN[cfg.skin] || SKIN.tan;
    const rot = s * ang;
    let item = '';
    if (holding === 'sauce') {
      item = `<g transform="translate(${s * 2} 60) rotate(${-rot})">
        <rect x="-5" y="-30" width="10" height="9" rx="2" fill="#ffd12a" stroke="${INK}" stroke-width="3"/>
        <path d="M-5 -21h10l5 9v22c0 3-2 5-5 5h-10c-3 0-5-2-5-5V-12z" fill="#e8231b" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>
        <rect x="-10" y="-8" width="20" height="12" rx="2" fill="#fff4d6" stroke="${INK}" stroke-width="2.4"/>
        <path d="M-6 -2c3-5 9-5 12 0" stroke="#e8231b" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <path d="M-7 -16v10" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".6"/>
      </g>`;
    } else if (holding === 'can') {
      item = `<g transform="translate(${s * 6} 62) rotate(${-rot})">
        <path d="M-12-10h22v20c0 3-2 5-5 5H-7c-3 0-5-2-5-5z" fill="#3fa0ff" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M10-4l14-10" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M10-4l14-10" stroke="#3fa0ff" stroke-width="3" stroke-linecap="round"/>
        <path d="M-10-10c0-9 18-9 18 0" fill="none" stroke="${INK}" stroke-width="3.2"/></g>`;
    } else if (holding === 'mic') {
      item = `<g transform="translate(${s * 2} 60) rotate(${-rot - s * 20})">
        <rect x="-3.5" y="-6" width="7" height="22" rx="3" fill="#333" stroke="${INK}" stroke-width="3"/>
        <circle cx="0" cy="-12" r="8" fill="#c9d2e6" stroke="${INK}" stroke-width="3.2"/><path d="M-4-15l8 6M-4-9l8-6" stroke="#8791aa" stroke-width="1.6"/></g>`;
    } else if (holding === 'clip') {
      item = `<g transform="translate(${s * 4} 60) rotate(${-rot})"><rect x="-11" y="-14" width="22" height="28" rx="2" fill="#c9843c" stroke="${INK}" stroke-width="3"/><rect x="-8" y="-9" width="16" height="20" fill="#fff"/><rect x="-5" y="-17" width="10" height="6" rx="1" fill="#9aa7c7" stroke="${INK}" stroke-width="2.2"/></g>`;
    }
    return `<g transform="rotate(${rot} ${sx} ${sy})">
      <path d="M${sx - 12} ${sy - 4}C${sx - 15} ${sy + 20} ${sx - 12} ${sy + 38} ${sx - 9} ${sy + 50}L${sx + 10} ${sy + 50}C${sx + 13} ${sy + 36} ${sx + 14} ${sy + 18} ${sx + 12} ${sy - 4}Z" fill="${sleeve}" stroke="${INK}" stroke-width="6.2" stroke-linejoin="round"/>
      <path d="M${sx + (s > 0 ? 3 : -8)} ${sy + 4}C${sx + (s > 0 ? 7 : -10)} ${sy + 20} ${sx + (s > 0 ? 7 : -9)} ${sy + 36} ${sx + (s > 0 ? 5 : -7)} ${sy + 48}" stroke="${shade(sleeve, -0.3)}" stroke-width="6" fill="none" opacity=".55" stroke-linecap="round"/>
      <rect x="${sx - 11}" y="${sy + 45}" width="22" height="8" rx="3" fill="${shade(sleeve, -0.2)}" stroke="${INK}" stroke-width="3.6"/>
      <g transform="translate(${sx} ${sy})">
        <path d="M-10 56C-13 62 -12 72 -4 74 2 76 10 73 11 66 12 60 9 55 4 54 -1 53 -7 53 -10 56Z" fill="${skin}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M${s > 0 ? -9 : 9} 60C${s > 0 ? -16 : 16} 60 ${s > 0 ? -16 : 16} 67 ${s > 0 ? -10 : 10} 68" fill="${skin}" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
        <path d="M-3 64h9M-2 69h8" stroke="${shade(skin, -0.3)}" stroke-width="2" stroke-linecap="round"/>
        ${item}
      </g>
    </g>`;
  }

  function hairBack(cfg) {
    const h = cfg.hairCol || '#2a1a12';
    switch (cfg.hair) {
      case 'long': return `<path d="M44 80C32 120 34 156 50 176L72 170C62 146 60 118 62 92Z" fill="${h}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M156 80C168 120 166 156 150 176L128 170C138 146 140 118 138 92Z" fill="${h}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`;
      case 'bun': return `<circle cx="100" cy="30" r="22" fill="${h}" stroke="${INK}" stroke-width="7"/><path d="M88 24c6-6 18-6 24 0" stroke="#fff" stroke-width="3" opacity=".4" fill="none" stroke-linecap="round"/>`;
      case 'puffs': return `<circle cx="46" cy="52" r="24" fill="${h}" stroke="${INK}" stroke-width="7"/><circle cx="154" cy="52" r="24" fill="${h}" stroke="${INK}" stroke-width="7"/>`;
      case 'locs': return `<path d="M44 80c-6 30-4 60 4 82M56 90c-4 26 0 56 6 76M144 90c4 26 0 56-6 76M156 80c6 30 4 60-4 82" stroke="${INK}" stroke-width="15" stroke-linecap="round" fill="none"/><path d="M44 80c-6 30-4 60 4 82M56 90c-4 26 0 56 6 76M144 90c4 26 0 56-6 76M156 80c6 30 4 60-4 82" stroke="${h}" stroke-width="8" stroke-linecap="round" fill="none"/>`;
      default: return '';
    }
  }
  function hairFront(cfg) {
    const h = cfg.hairCol || '#2a1a12';
    const hl = shade(h, 0.35);
    switch (cfg.hair) {
      case 'short': return `<path d="M44 84C40 50 64 26 100 26S162 50 156 84C150 70 140 62 128 60 118 66 96 68 72 60 60 64 50 72 44 84Z" fill="${h}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M70 40c10-6 26-8 38-6" stroke="${hl}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>`;
      case 'slick': return `<path d="M42 86C38 46 66 24 104 26 138 28 162 52 158 86 152 64 136 50 110 48 88 46 60 56 42 86Z" fill="${h}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M70 42c18-8 40-8 60 2M76 50c16-5 32-5 48 0" stroke="${hl}" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".7"/>`;
      case 'bun': case 'long': return `<path d="M42 90C38 46 66 26 100 26S162 46 158 90C150 66 130 54 100 54S50 66 42 90Z" fill="${h}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M100 30v22" stroke="${shade(h, -0.3)}" stroke-width="3"/><path d="M66 42c8-6 18-9 28-10" stroke="${hl}" stroke-width="3.6" fill="none" stroke-linecap="round" opacity=".6"/>`;
      case 'puffs': return `<path d="M44 84C42 50 66 30 100 30S158 50 156 84C146 66 128 58 100 58S54 66 44 84Z" fill="${h}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`;
      case 'locs': return `<path d="M44 84C40 48 66 26 100 26S160 48 156 84C148 64 128 56 100 56S52 64 44 84Z" fill="${h}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M62 44l6 12M80 36l4 14M100 34v14M120 36l-4 14M138 44l-6 12" stroke="${shade(h, -0.35)}" stroke-width="3" stroke-linecap="round"/>`;
      case 'bald': return `<path d="M60 40c10-8 26-10 40-9" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".35"/>`;
      default: return '';
    }
  }
  function hat(cfg) {
    const c = cfg.hatCol || '#e8231b';
    const c2 = shade(c, -0.3);
    switch (cfg.hat) {
      case 'cap': // flat-brim snapback, brim slightly angled
        return `<path d="M40 76C38 38 64 18 100 18S162 38 160 76C140 66 60 66 40 76Z" fill="${c}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
          <path d="M112 26C136 34 152 50 156 72" stroke="${c2}" stroke-width="9" fill="none" opacity=".5" stroke-linecap="round"/>
          <path d="M30 80C60 62 140 62 170 80L172 90C140 76 60 76 28 90Z" fill="${c2}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
          <path d="M100 18v8" stroke="${INK}" stroke-width="4"/>
          <g transform="translate(100 46)">${cfg.capLogo === 'flame'
            ? `<path d="M0-16c3 8 12 10 12 20a12 12 0 0 1-24 0c0-5 3-8 5-10 0 4 2 6 4 6-2-6 0-12 3-16z" fill="#ffd12a" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>`
            : `<circle r="9" fill="#fff" stroke="${INK}" stroke-width="3"/>`}</g>
          <path d="M58 44c8-12 22-18 36-19" stroke="#fff" stroke-width="4" opacity=".35" fill="none" stroke-linecap="round"/>`;
      case 'bandana':
        return `<path d="M40 80C36 40 64 20 100 20S164 40 160 80C140 66 60 66 40 80Z" fill="${c}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
          <path d="M156 70l16 8-6 14-12-6" fill="${c}" stroke="${INK}" stroke-width="6.2" stroke-linejoin="round"/>
          <g fill="#fff" opacity=".85"><circle cx="72" cy="46" r="3.4"/><circle cx="96" cy="36" r="3.4"/><circle cx="122" cy="44" r="3.4"/><circle cx="84" cy="58" r="2.6"/><circle cx="112" cy="58" r="2.6"/><circle cx="140" cy="60" r="2.6"/></g>`;
      case 'top':
        return `<rect x="62" y="-8" width="76" height="62" rx="6" fill="#2b2240" stroke="${INK}" stroke-width="7"/><rect x="62" y="36" width="76" height="12" fill="#e8231b" stroke="${INK}" stroke-width="4"/><path d="M34 62C60 50 140 50 166 62L164 70C140 60 60 60 36 70Z" fill="#2b2240" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M72 0v30" stroke="#fff" stroke-width="4" opacity=".3" stroke-linecap="round"/>`;
      case 'hardhat':
        return `<path d="M42 72C40 32 68 16 100 16S160 32 158 72Z" fill="#ffc21a" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M100 16v54" stroke="${INK}" stroke-width="4"/><rect x="30" y="66" width="140" height="13" rx="6" fill="#ffc21a" stroke="${INK}" stroke-width="7"/><circle cx="100" cy="44" r="10" fill="#fff6c0" stroke="${INK}" stroke-width="3.4"/><path d="M60 36c8-10 18-14 28-15" stroke="#fff" stroke-width="4" opacity=".45" fill="none" stroke-linecap="round"/>`;
      case 'cowboy':
        return `<path d="M58 60C56 26 76 10 100 10S144 26 142 60Z" fill="#b5733a" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M100 14c-6 8-6 18 0 24 6-6 6-16 0-24z" fill="${shade('#b5733a', -0.25)}"/><path d="M20 62C50 76 150 76 180 62 176 76 150 86 100 86S24 76 20 62Z" fill="#c9843c" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><rect x="58" y="50" width="84" height="9" fill="#e8231b" stroke="${INK}" stroke-width="3.4"/>`;
      case 'chef':
        return `<path d="M52 70C36 70 30 44 50 38 50 14 80 6 94 22 104 4 138 8 142 32 166 34 168 66 148 70Z" fill="#fff" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><rect x="52" y="60" width="96" height="20" rx="4" fill="#fff" stroke="${INK}" stroke-width="7"/><path d="M76 40c4-8 10-12 18-12" stroke="#d6dbe6" stroke-width="7" fill="none" stroke-linecap="round"/>`;
      case 'headset':
        return `<path d="M44 92C38 40 64 22 100 22S162 40 156 92" fill="none" stroke="${INK}" stroke-width="10"/><path d="M44 92C38 40 64 22 100 22S162 40 156 92" fill="none" stroke="#4b5575" stroke-width="7"/><rect x="146" y="84" width="18" height="28" rx="7" fill="#4b5575" stroke="${INK}" stroke-width="4"/><path d="M152 110c-4 14-18 22-34 22" stroke="${INK}" stroke-width="4" fill="none"/><circle cx="116" cy="132" r="5" fill="#333" stroke="${INK}" stroke-width="3"/>`;
      default: return '';
    }
  }
  function face(cfg, mood) {
    const skin = SKIN[cfg.skin] || SKIN.tan;
    const sk2 = shade(skin, -0.2);
    let eyes;
    if (cfg.eyes === 'shades') {
      eyes = `<path d="M52 88h96c0 0 0 4-2 6l-6 16c-2 5-6 7-12 7h-14c-6 0-9-3-10-7l-3-10h-2l-3 10c-1 4-4 7-10 7H72c-6 0-10-2-12-7l-6-16c-2-2-2-6-2-6z" fill="#1a1030" stroke="${INK}" stroke-width="6.2" stroke-linejoin="round"/>
        <path d="M66 94l8 14M112 94l8 14" stroke="#7b5cff" stroke-width="7" stroke-linecap="round" opacity=".8"/>
        <path d="M60 93h28M108 93h30" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".45"/>
        <path d="M52 90l-8-2M148 90l8-2" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
    } else {
      const glasses = cfg.eyes === 'glasses';
      const blink = mood === 'blink';
      const e = (x) => blink
        ? `<path d="M${x - 9} 100c4 4 14 4 18 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`
        : `<ellipse cx="${x}" cy="99" rx="9.5" ry="12" fill="#fff" stroke="${INK}" stroke-width="3.6"/>
           <ellipse cx="${x + 1.5}" cy="101" rx="6" ry="7.5" fill="${cfg.eyeCol || '#4a2a17'}"/>
           <circle cx="${x + 1.5}" cy="101" r="3.2" fill="${INK}"/>
           <circle cx="${x + 4}" cy="97" r="2.6" fill="#fff"/>`;
      eyes = e(78) + e(122);
      if (!blink) eyes += `<g class="lids"><path d="M67 99a11 12 0 0 1 22 0z" fill="${skin}" stroke="${INK}" stroke-width="3.6"/><path d="M111 99a11 12 0 0 1 22 0z" fill="${skin}" stroke="${INK}" stroke-width="3.6"/><path d="M68 100c5 4 15 4 20 0M112 100c5 4 15 4 20 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/></g>`;
      if (glasses) eyes += `<circle cx="78" cy="99" r="16" fill="#bfe9ff" fill-opacity=".25" stroke="${INK}" stroke-width="4"/><circle cx="122" cy="99" r="16" fill="#bfe9ff" fill-opacity=".25" stroke="${INK}" stroke-width="4"/><path d="M94 97h12" stroke="${INK}" stroke-width="4"/>`;
    }
    const brow = cfg.brow || shade(cfg.hairCol || '#2a1a12', 0.05);
    const brows = cfg.eyes === 'shades' ? '' : (cfg.browMood === 'sly'
      ? `<path d="M66 82l24 4M134 82l-24 4" stroke="${brow}" stroke-width="6" stroke-linecap="round"/>`
      : `<path d="M66 80c6-5 16-6 24-2M134 80c-6-5-16-6-24-2" stroke="${brow}" stroke-width="6" stroke-linecap="round" fill="none"/>`);
    let mouth;
    switch (cfg.mouth) {
      case 'smirk': mouth = `<path d="M86 132c8 4 20 3 30-6" stroke="${INK}" stroke-width="6.2" fill="none" stroke-linecap="round"/><path d="M114 126l4-2" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`; break;
      case 'smile': mouth = `<path d="M84 128c8 10 24 10 32 0" stroke="${INK}" stroke-width="6.2" fill="none" stroke-linecap="round"/>`; break;
      case 'grin':
      default: mouth = `<path d="M80 124c10 18 30 18 40 0z" fill="#7a1420" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round"/><path d="M83 125h34l-3 5H86z" fill="#fff"/>${cfg.goldTooth ? '<rect x="104" y="125" width="7" height="5" fill="#ffc21a" stroke="' + INK + '" stroke-width="1.2"/>' : ''}<path d="M92 136c5 3 11 3 16 0" stroke="#ff7a8a" stroke-width="4" stroke-linecap="round"/>`;
    }
    let facial = '';
    if (cfg.beard === 'full') facial = `<path d="M50 104C52 150 76 166 100 166S148 150 150 104C144 124 136 138 100 138S56 124 50 104Z" fill="${cfg.hairCol}" stroke="${INK}" stroke-width="6.2" stroke-linejoin="round"/><path d="M84 124c8-5 24-5 32 0" stroke="${cfg.hairCol}" stroke-width="9" stroke-linecap="round"/>`;
    else if (cfg.beard === 'goatee') facial = `<path d="M88 142c4 8 20 8 24 0-6 12-18 12-24 0z" fill="${cfg.hairCol}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>`;
    else if (cfg.beard === 'stache') facial = `<path d="M76 124c10-10 18-8 24-3 6-5 14-7 24 3-8 2-16 0-24-2-8 2-16 4-24 2z" fill="${cfg.hairCol}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>`;
    return `
      <path d="M100 118c-2 6-2 9 3 10" stroke="${sk2}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <ellipse cx="66" cy="120" rx="9" ry="5" fill="#ff7a6a" opacity=".45"/><ellipse cx="134" cy="120" rx="9" ry="5" fill="#ff7a6a" opacity=".45"/>
      ${brows}${eyes}${facial}${mouth}`;
  }

  function character(cfg, opts) {
    opts = opts || {};
    const skin = SKIN[cfg.skin] || SKIN.tan;
    const sk2 = shade(skin, -0.22);
    const top = cfg.top || '#e8231b';
    const top2 = shade(top, -0.28);
    const pants = cfg.pants || '#3b4f8f';
    const shoes = cfg.shoes || '#ffffff';
    const pose = opts.pose || 'idle';
    const angL = pose === 'cheer' ? 150 : pose === 'point' ? 18 : 14;
    const angR = pose === 'cheer' ? 150 : pose === 'point' ? 118 : pose === 'wave' ? 140 : 12;
    const holdR = cfg.hold || null;
    const bust = opts.bust;
    // torso variants
    let torso = `<path d="M58 150C62 144 80 140 100 140S138 144 142 150L150 222C150 230 144 234 136 234H64C56 234 50 230 50 222Z" fill="${top}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M120 150L136 150 146 222C146 228 142 232 136 232H124Z" fill="${top2}" opacity=".6"/>`;
    if (cfg.outfit === 'jacket') {
      torso += `<path d="M88 144l12 26 12-26" fill="${cfg.tee || '#fff'}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M100 170v62" stroke="${INK}" stroke-width="4"/>
        <path d="M60 180l-6 20M140 180l6 20" stroke="${cfg.stripe || '#ffd12a'}" stroke-width="7" stroke-linecap="round"/>
        <path d="M70 144c-6 10-8 22-6 30M130 144c6 10 8 22 6 30" stroke="${cfg.stripe || '#ffd12a'}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    } else if (cfg.outfit === 'suit') {
      torso += `<path d="M84 142l16 34 16-34" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M100 150l-6 6 6 32 6-32z" fill="${cfg.tie || '#e8231b'}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>
        <path d="M84 142l-8 26 18 8M116 142l8 26-18 8" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
        <circle cx="100" cy="206" r="3.4" fill="${INK}"/>`;
    } else if (cfg.outfit === 'apron') {
      torso += `<path d="M72 170h56v58c0 3-2 5-5 5H77c-3 0-5-2-5-5z" fill="${cfg.apron || '#fff'}" stroke="${INK}" stroke-width="6.2" stroke-linejoin="round"/>
        <path d="M76 170l-12-24M124 170l12-24" stroke="${INK}" stroke-width="4"/><rect x="86" y="190" width="28" height="18" rx="3" fill="none" stroke="${INK}" stroke-width="3.4"/>`;
    } else if (cfg.outfit === 'shawl') {
      torso += `<path d="M54 150C70 180 130 180 146 150L150 190C130 206 70 206 50 190Z" fill="${cfg.shawl || '#8f5bff'}" stroke="${INK}" stroke-width="6.2" stroke-linejoin="round"/>
        <g fill="#ffd12a" stroke="${INK}" stroke-width="1.6"><circle cx="68" cy="184" r="4"/><circle cx="100" cy="194" r="4"/><circle cx="132" cy="184" r="4"/></g>`;
    } else if (cfg.outfit === 'hoodie') {
      torso += `<path d="M76 146c4 16 44 16 48 0" fill="none" stroke="${INK}" stroke-width="4"/><path d="M90 160v24M110 160v24" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>
        <path d="M74 200h52v16c0 3-2 5-5 5H79c-3 0-5-2-5-5z" fill="${top2}" stroke="${INK}" stroke-width="3.6"/>`;
    } else if (cfg.outfit === 'vest') {
      torso += `<path d="M80 144l20 30 20-30v88H80z" fill="${cfg.tee || '#fff'}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M100 176v56" stroke="${INK}" stroke-width="3"/>`;
    }
    torso += `<path d="M60 156C57 180 55 204 55 222" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".32"/>`;
    if (cfg.sash) torso += `<path d="M62 150l80 76-10 8-80-72z" fill="${cfg.sash}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    if (cfg.chain) torso += `<path d="M80 146c4 26 36 26 40 0" fill="none" stroke="${INK}" stroke-width="8"/><path d="M80 146c4 26 36 26 40 0" fill="none" stroke="#ffc21a" stroke-width="6.2" stroke-dasharray="4 2"/>
      <g transform="translate(100 172)"><path d="M0 0c6 0 8 6 7 12-1 7-5 11-7 12-2-1-6-5-7-12-1-6 1-12 7-12z" fill="#ffc21a" stroke="${INK}" stroke-width="3.4"/><path d="M-3 4v10" stroke="#fff6c0" stroke-width="2.4" stroke-linecap="round"/></g>`;

    const legs = bust ? '' : `
      <path d="M62 226h36l-3 52H66z" fill="${pants}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M102 226h36l-4 52h-29z" fill="${pants}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M118 232l-2 40" stroke="${shade(pants, -0.3)}" stroke-width="7" opacity=".6"/>
      <path d="M52 276c0-8 8-10 16-10h28c4 0 6 3 6 7v8c0 4-3 6-7 6H56c-3 0-4-2-4-5z" fill="${shoes}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M98 276c0-8 8-10 16-10h24c6 0 12 3 12 9v6c0 3-2 6-6 6h-40c-4 0-6-2-6-6z" fill="${shoes}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M54 282h46M100 282h48" stroke="${cfg.sole || '#e8231b'}" stroke-width="4"/>
      <path d="M86 230l-2 44" stroke="${shade(pants, -0.3)}" stroke-width="6" opacity=".5"/>
      <path d="M62 272c6-3 14-4 22-3M108 272c8-3 16-4 26-2" stroke="#fff" stroke-width="3" opacity=".55" fill="none" stroke-linecap="round"/>`;

    const head = `
      <g class="head">
        ${hairBack(cfg)}
        <path d="M100 166c-10 0-14-6-14-14v-14h28v14c0 8-4 14-14 14z" fill="${sk2}" stroke="${INK}" stroke-width="6.2"/>
        <ellipse cx="44" cy="104" rx="11" ry="14" fill="${skin}" stroke="${INK}" stroke-width="6.2"/><ellipse cx="156" cy="104" rx="11" ry="14" fill="${skin}" stroke="${INK}" stroke-width="6.2"/>
        <path d="M44 96c0-44 26-66 56-66s56 22 56 66c0 36-22 58-56 58S44 132 44 96Z" fill="${skin}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
        <path d="M130 50c16 12 22 32 20 54-4 22-16 38-36 44 24-14 30-58 16-98z" fill="${sk2}" opacity=".5"/>
        ${cfg.earring ? `<circle cx="44" cy="120" r="4.5" fill="#ffc21a" stroke="${INK}" stroke-width="2.4"/>` : ''}
        ${face(cfg, opts.mood)}
        ${hairFront(cfg)}
        ${hat(cfg)}
      </g>`;

    const body = `
      ${legs}
      <g class="armL">${arm('L', cfg, angL, null)}</g>
      ${torso}
      <g class="armR">${arm('R', cfg, angR, holdR)}</g>`;

    const vb = bust ? '10 0 180 200' : '0 -12 200 312';
    return `<svg class="char ${opts.cls || ''}" viewBox="${vb}" aria-hidden="true">
      ${bust ? '' : '<ellipse cx="100" cy="290" rx="62" ry="9" fill="#000" opacity=".3"/>'}
      <g class="body">${body}</g>
      ${head}
    </svg>`;
  }

  /* ---------- cast ---------- */
  const CAST = {
    tito: { name: 'Tito Scorch', skin: 'brown', hair: 'short', hairCol: '#1a0f0a', hat: 'cap', hatCol: '#e8231b', capLogo: 'flame', eyes: 'shades', mouth: 'grin', goldTooth: true, beard: 'goatee', outfit: 'jacket', top: '#ff5a1f', tee: '#fff', stripe: '#ffd12a', pants: '#2c2a4a', shoes: '#fff', sole: '#e8231b', chain: true, earring: true, hold: 'sauce' },
    rosa: { name: 'Abuela Rosa', skin: 'tan', hair: 'bun', hairCol: '#d9d4d6', eyes: 'glasses', mouth: 'smile', outfit: 'shawl', top: '#3fa06a', shawl: '#c2185b', pants: '#5a3a6a', shoes: '#7a4524', sole: '#4a2a17' },
    dana: { name: 'Dana', skin: 'light', hair: 'long', hairCol: '#b8431c', hat: 'bandana', hatCol: '#2f7de1', eyes: 'normal', eyeCol: '#2f6a3a', mouth: 'grin', outfit: 'apron', top: '#ffd12a', apron: '#fff', pants: '#3b4f8f', shoes: '#e8231b', sole: '#fff' },
    boots: { name: 'Boots', skin: 'tan', hair: 'short', hairCol: '#5a3a1a', hat: 'cowboy', eyes: 'normal', mouth: 'smile', beard: 'stache', outfit: 'vest', top: '#8a5a36', tee: '#e8231b', pants: '#3b4f8f', shoes: '#7a4524', sole: '#4a2a17' },
    vega: { name: 'Marcus Vega', skin: 'light', hair: 'slick', hairCol: '#222', eyes: 'normal', browMood: 'sly', eyeCol: '#555', mouth: 'smirk', outfit: 'suit', top: '#3a3f55', tie: '#7bff5b', pants: '#2b2f40', shoes: '#111', sole: '#444' },
    hildy: { name: 'Mayor Hildy', skin: 'light', hair: 'short', hairCol: '#e6e0d6', hat: 'top', eyes: 'glasses', mouth: 'smile', outfit: 'suit', top: '#6a3bd1', tie: '#ffd12a', sash: '#e8231b', pants: '#2b2240', shoes: '#111', sole: '#444' },
    marco: { name: 'Cousin Marco', skin: 'tan', hair: 'slick', hairCol: '#2a1a12', eyes: 'normal', mouth: 'grin', outfit: 'suit', top: '#2f7de1', tie: '#ff4fd8', pants: '#1f2f5a', shoes: '#fff', sole: '#ff4fd8' },
    sal: { name: 'Sal', skin: 'tan', hair: 'bald', hairCol: '#8a8580', hat: 'hardhat', eyes: 'normal', mouth: 'smile', beard: 'full', outfit: 'vest', top: '#ff8a00', tee: '#6b7380', pants: '#3b4f8f', shoes: '#7a4524', sole: '#4a2a17' },
    crystal: { name: 'Crystal', skin: 'deep', hair: 'puffs', hairCol: '#ff4fd8', hat: 'headset', eyes: 'normal', mouth: 'grin', outfit: 'jacket', top: '#8f5bff', tee: '#111', stripe: '#56e0ff', pants: '#111', shoes: '#fff', sole: '#56e0ff', earring: true },
  };
  const SPEAKER_KEY = { 'abuela rosa': 'rosa', 'dana': 'dana', 'boots': 'boots', 'marcus vega': 'vega', 'mayor hildy': 'hildy', 'cousin marco': 'marco', 'sal': 'sal', 'sal the prospector': 'sal', 'crystal': 'crystal', 'crystal — producer': 'crystal', 'tito scorch': 'tito', 'tito': 'tito' };
  function castFor(name) {
    if (!name) return null;
    const k = SPEAKER_KEY[String(name).toLowerCase().trim()] || SPEAKER_KEY[String(name).toLowerCase().split(/[—-]/)[0].trim()];
    return k ? k : null;
  }
  // random walk-in customers
  const TOPS = ['#2f7de1', '#ff4fd8', '#2fbf55', '#ffd12a', '#8f5bff', '#ff8a00', '#56e0ff', '#e8231b'];
  const HAIRS = ['short', 'long', 'puffs', 'locs', 'slick', 'bun', 'bald'];
  const HAIRCOL = ['#1a0f0a', '#5a3a1a', '#b8431c', '#e0b050', '#2a1a12', '#ff4fd8', '#56e0ff'];
  const SKINS = ['light', 'tan', 'brown', 'deep'];
  const HATS = [null, null, 'cap', 'bandana', null, 'cap'];
  const OUTFITS = ['hoodie', 'jacket', 'vest', 'hoodie'];
  function randomCustomer(seed) {
    const r = rng(seed * 13 + 5);
    const pick = a => a[Math.floor(r() * a.length) % a.length];
    const hair = pick(HAIRS);
    return {
      skin: pick(SKINS), hair, hairCol: pick(HAIRCOL), hat: hair === 'bun' || hair === 'puffs' ? null : pick(HATS), hatCol: pick(TOPS),
      eyes: r() < 0.25 ? 'shades' : r() < 0.2 ? 'glasses' : 'normal', eyeCol: pick(['#4a2a17', '#2f6a3a', '#2f5a9a']),
      mouth: pick(['grin', 'smile', 'smirk']), beard: r() < 0.2 ? pick(['goatee', 'stache', 'full']) : null,
      outfit: pick(OUTFITS), top: pick(TOPS), tee: '#fff', stripe: pick(['#fff', '#ffd12a', '#111']),
      pants: pick(['#3b4f8f', '#2c2a4a', '#5a3a1a', '#1f2f5a']), shoes: pick(['#fff', '#e8231b', '#111', '#ffd12a']), sole: pick(['#e8231b', '#56e0ff', '#fff']),
      chain: r() < 0.25, earring: r() < 0.3,
    };
  }

  /* ============================================================
     ROOM PROPS
     ============================================================ */
  function sauceBottle(col, label, h) {
    return `<svg class="prop-bottle" viewBox="0 0 30 64" style="height:${h || 44}px" aria-hidden="true">
      <rect x="11" y="2" width="8" height="8" rx="1.5" fill="#ffd12a" stroke="${INK}" stroke-width="2.6"/>
      <path d="M11 10h8l6 10v36c0 3-2 5-5 5H10c-3 0-5-2-5-5V20z" fill="${col}" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/>
      <rect x="5" y="28" width="20" height="16" fill="#fff4d6" stroke="${INK}" stroke-width="2.2"/>
      <path d="M9 38c3-6 9-6 12 0" stroke="${label || '#e8231b'}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <path d="M8 22v26" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>
    </svg>`;
  }
  function boombox() {
    return `<svg class="prop-boombox" viewBox="0 0 160 96" aria-hidden="true">
      <path d="M40 20c0-14 80-14 80 0" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M40 20c0-14 80-14 80 0" fill="none" stroke="#9aa7c7" stroke-width="3.6" stroke-linecap="round"/>
      <rect x="6" y="20" width="148" height="72" rx="12" fill="#2b2f40" stroke="${INK}" stroke-width="5"/>
      <rect x="12" y="24" width="136" height="10" rx="4" fill="#ff4fd8" opacity=".8"/>
      <g class="spk"><circle cx="40" cy="62" r="22" fill="#12131c" stroke="#9aa7c7" stroke-width="4"/><circle cx="40" cy="62" r="9" fill="#4b5575" stroke="#9aa7c7" stroke-width="3"/></g>
      <g class="spk"><circle cx="120" cy="62" r="22" fill="#12131c" stroke="#9aa7c7" stroke-width="4"/><circle cx="120" cy="62" r="9" fill="#4b5575" stroke="#9aa7c7" stroke-width="3"/></g>
      <rect x="66" y="46" width="28" height="18" rx="3" fill="#56e0ff" stroke="${INK}" stroke-width="3"/>
      <g fill="#ffd12a"><circle cx="70" cy="76" r="3.4"/><circle cx="80" cy="76" r="3.4"/><circle cx="90" cy="76" r="3.4"/></g>
    </svg>`;
  }
  function neonChili() {
    return `<svg class="neon-chili" viewBox="0 0 180 120" aria-hidden="true">
      <g class="neon-glow" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M112 22c-6-10-18-10-22 0" stroke="#7cff5b" stroke-width="7"/>
        <path d="M92 24c22-2 36 14 30 38-6 26-40 48-86 48 22-12 34-30 36-58 2-18 8-28 20-28z" stroke="#ff2d55" stroke-width="7"/>
        <path d="M86 22c8-8 26-8 34 0-8 6-26 6-34 0z" stroke="#7cff5b" stroke-width="6"/>
      </g>
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M112 22c-6-10-18-10-22 0" stroke="#eaffdf" stroke-width="2.4"/>
        <path d="M92 24c22-2 36 14 30 38-6 26-40 48-86 48 22-12 34-30 36-58 2-18 8-28 20-28z" stroke="#ffe0e8" stroke-width="2.6"/>
        <path d="M86 22c8-8 26-8 34 0-8 6-26 6-34 0z" stroke="#eaffdf" stroke-width="2.2"/>
      </g>
    </svg>`;
  }
  function fridge(count, cap) {
    return `<svg class="prop-fridge" viewBox="0 0 110 180" aria-hidden="true">
      <rect x="6" y="6" width="98" height="170" rx="10" fill="#dff4ff" stroke="${INK}" stroke-width="5"/>
      <rect x="6" y="6" width="98" height="170" rx="10" fill="url(#fridgeShade)" opacity="0"/>
      <path d="M78 10v162" stroke="#b7d8ea" stroke-width="10" opacity=".7"/>
      <rect x="16" y="18" width="78" height="26" rx="5" fill="#12131c" stroke="${INK}" stroke-width="3.4"/>
      <text x="55" y="37" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="16" fill="#56e0ff" class="fridge-count">${count}/${cap}</text>
      <rect x="16" y="54" width="78" height="112" rx="6" fill="#b7e6ff" stroke="${INK}" stroke-width="3.4"/>
      <path d="M16 90h78M16 128h78" stroke="${INK}" stroke-width="3"/>
      <g class="fridge-stock"></g>
      <path d="M24 60v100" stroke="#fff" stroke-width="4" opacity=".6" stroke-linecap="round"/>
      <rect x="90" y="70" width="7" height="36" rx="3" fill="#9aa7c7" stroke="${INK}" stroke-width="3"/>
      <text x="55" y="160" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="11" fill="#2f5a9a">COLD STASH</text>
    </svg>`;
  }
  function waterTank() {
    return `<svg class="prop-tank" viewBox="0 0 90 150" aria-hidden="true">
      <rect x="10" y="14" width="70" height="120" rx="14" fill="#3fa0ff" fill-opacity=".85" stroke="${INK}" stroke-width="5"/>
      <rect class="tank-water" x="15" y="50" width="60" height="80" rx="10" fill="#1f6fd1"/>
      <path d="M22 26v96" stroke="#bfe9ff" stroke-width="5" stroke-linecap="round" opacity=".7"/>
      <rect x="26" y="4" width="38" height="14" rx="4" fill="#9aa7c7" stroke="${INK}" stroke-width="4"/>
      <path d="M80 110h10" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M80 110h10" stroke="#9aa7c7" stroke-width="4" stroke-linecap="round"/>
      <text x="45" y="92" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="13" fill="#fff" stroke="${INK}" stroke-width="3" paint-order="stroke">H2O</text>
    </svg>`;
  }
  function tvSet() {
    return `<svg class="prop-tv" viewBox="0 0 160 110" aria-hidden="true">
      <rect x="6" y="6" width="148" height="92" rx="8" fill="#2b2f40" stroke="${INK}" stroke-width="5"/>
      <rect x="14" y="14" width="132" height="76" rx="4" fill="#12131c"/>
      <g class="tv-screen"><rect x="14" y="14" width="132" height="76" rx="4" fill="#ff5a1f"/>
        <text x="80" y="50" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="18" fill="#fff" stroke="${INK}" stroke-width="4" paint-order="stroke">CHILI TV</text>
        <text x="80" y="72" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="11" fill="#ffd12a" stroke="${INK}" stroke-width="3" paint-order="stroke">LIVE</text>
        <circle cx="130" cy="26" r="5" fill="#ff2d55" class="tv-rec"/></g>
      <path d="M60 98l-10 10M100 98l10 10" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    </svg>`;
  }
  function merchRack() {
    const tee = (x, c) => `<g transform="translate(${x} 22)"><path d="M-8 0l-10 6 4 8 5-3v22h18V11l5 3 4-8-10-6c-1 3-4 5-8 5s-7-2-8-5z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M-3 12c2-3 5-3 7 0-2 4-5 4-7 0z" fill="#ffd12a"/></g>`;
    return `<svg class="prop-merch" viewBox="0 0 150 90" aria-hidden="true">
      <path d="M10 14h130" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M10 14h130" stroke="#9aa7c7" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M16 14v72M134 14v72" stroke="${INK}" stroke-width="6"/>
      ${tee(38, '#ff4fd8')}${tee(75, '#e8231b')}${tee(112, '#2f7de1')}
    </svg>`;
  }
  function smoker() {
    return `<svg class="prop-smoker" viewBox="0 0 110 120" aria-hidden="true">
      <g class="smoke" fill="#fff" opacity=".6"><circle cx="72" cy="14" r="8"/><circle cx="80" cy="4" r="6"/></g>
      <rect x="64" y="18" width="14" height="26" fill="#4b5575" stroke="${INK}" stroke-width="4"/>
      <rect x="10" y="40" width="90" height="56" rx="10" fill="#2b2f40" stroke="${INK}" stroke-width="5"/>
      <rect x="20" y="52" width="70" height="30" rx="4" fill="#ff5a1f" stroke="${INK}" stroke-width="3.4"/>
      <text x="55" y="73" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="14" fill="#fff" stroke="${INK}" stroke-width="3" paint-order="stroke">JERKY</text>
      <path d="M22 96v18M88 96v18" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    </svg>`;
  }
  function pickaxes() {
    return `<svg class="prop-picks" viewBox="0 0 90 90" aria-hidden="true">
      <g transform="rotate(35 45 45)">${IC.pick.replace(/<path/g, '<path transform="scale(1.8) translate(1 1)"')}</g>
    </svg>`;
  }
  function doorSvg() {
    return `<svg class="door-svg" viewBox="0 0 120 220" preserveAspectRatio="none" aria-hidden="true">
      <rect x="4" y="4" width="112" height="216" rx="6" fill="#5a2a18" stroke="${INK}" stroke-width="6"/>
      <rect x="14" y="14" width="92" height="206" fill="#1a0c12"/>
      <g class="door-leaf"><rect x="14" y="14" width="92" height="206" fill="#a0522d" stroke="${INK}" stroke-width="4"/>
        <rect x="26" y="28" width="68" height="70" rx="4" fill="#8a4424" stroke="${INK}" stroke-width="3.4"/>
        <rect x="26" y="112" width="68" height="90" rx="4" fill="#8a4424" stroke="${INK}" stroke-width="3.4"/>
        <circle cx="92" cy="118" r="6" fill="#ffc21a" stroke="${INK}" stroke-width="3"/>
        <path d="M34 36v54" stroke="#fff" stroke-width="3" opacity=".25"/></g>
    </svg>`;
  }
  function growLight(level) {
    // level 0: warm shop bulbs; 1-2 purple LED; 3+ full-spectrum pink
    if (level <= 0) {
      return `<svg class="glight bulb" viewBox="0 0 80 90" aria-hidden="true"><path d="M40 0v30" stroke="${INK}" stroke-width="3"/><path d="M22 44c0-14 36-14 36 0z" fill="#4b5575" stroke="${INK}" stroke-width="4"/><circle cx="40" cy="50" r="9" fill="#fff3b0" stroke="${INK}" stroke-width="3"/></svg>`;
    }
    const col = level >= 3 ? '#ff79f0' : '#9b6bff';
    const col2 = level >= 3 ? '#fff0fb' : '#dccbff';
    return `<svg class="glight bar" viewBox="0 0 220 40" preserveAspectRatio="none" aria-hidden="true">
      <path d="M30 0v14M190 0v14" stroke="${INK}" stroke-width="3"/>
      <rect x="4" y="12" width="212" height="20" rx="6" fill="#2b2f40" stroke="${INK}" stroke-width="4"/>
      <rect x="12" y="24" width="196" height="7" rx="3" fill="${col}"/>
      <rect x="12" y="25" width="196" height="3" rx="1.5" fill="${col2}"/>
    </svg>`;
  }


  /* ---------- decor ---------- */
  function ristra(n, h) {
    // braided string of dried chillies hanging from a nail
    let g = `<path d="M30 4C28 40 32 80 30 ${h - 10}" stroke="#c9a060" stroke-width="3" fill="none"/><circle cx="30" cy="5" r="4" fill="#9aa7c7" stroke="${INK}" stroke-width="2"/>`;
    for (let i = 0; i < n; i++) {
      const y = 14 + i * ((h - 30) / n);
      g += pepperG(i % 3 === 1 ? 'cayenne' : 'serrano', 30 + (i % 2 ? 7 : -7), y, i % 2 ? -40 : 40, 0.62, true, 2.4).replace(/#157a22/g, '#c8321c');
    }
    return `<svg class="prop-ristra" viewBox="0 0 60 ${h}" aria-hidden="true">${g}</svg>`;
  }
  function stringLights(w, n) {
    let g = `<path d="M0 6Q${w / 4} 34 ${w / 2} 10T${w} 6" stroke="${INK}" stroke-width="2.4" fill="none"/>`;
    const cols = ['#ff4fd8', '#ffd12a', '#7cff5b', '#56e0ff', '#ff5a1f'];
    for (let i = 1; i < n; i++) {
      const t = i / n, x = t * w;
      // point on the two quadratic halves
      let y;
      if (t <= 0.5) { const u = t * 2; y = (1 - u) * (1 - u) * 6 + 2 * (1 - u) * u * 34 + u * u * 10; }
      else { const u = (t - 0.5) * 2; y = (1 - u) * (1 - u) * 10 + 2 * (1 - u) * u * -14 + u * u * 6; }
      const c = cols[i % cols.length];
      g += `<g class="bulb b${i % 2}"><rect x="${x - 2.5}" y="${y - 1}" width="5" height="5" fill="#4b5575" stroke="${INK}" stroke-width="1.4"/><ellipse cx="${x}" cy="${y + 9}" rx="4.6" ry="6.5" fill="${c}" stroke="${INK}" stroke-width="1.8"/><ellipse cx="${x - 1.4}" cy="${y + 7}" rx="1.4" ry="2.2" fill="#fff" opacity=".8"/></g>`;
    }
    return `<svg class="prop-string" viewBox="0 -4 ${w} 52" preserveAspectRatio="none" aria-hidden="true">${g}</svg>`;
  }
  function mixtapePoster() {
    return `<div class="poster"><div class="pbg">${character(CAST.tito, { bust: true })}</div><b>TITO SCORCH</b><i>HOT PAPER</i></div>`;
  }
  function sauceCrate() {
    const b = (x, c) => `<g transform="translate(${x} 0)"><rect x="-5" y="2" width="10" height="8" fill="#ffd12a" stroke="${INK}" stroke-width="2.4"/><path d="M-5 10h10l5 8v22H-10V18z" fill="${c}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/></g>`;
    return `<svg class="prop-crate" viewBox="0 0 120 90" aria-hidden="true">${b(24, '#e8231b')}${b(48, '#ff8a00')}${b(72, '#e8231b')}${b(96, '#9b5bff')}
      <rect x="4" y="36" width="112" height="50" rx="4" fill="#c9843c" stroke="${INK}" stroke-width="4"/>
      <rect x="10" y="42" width="100" height="38" rx="2" fill="none" stroke="#a3662a" stroke-width="3"/>
      <text x="60" y="68" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="17" fill="#fff4d6" stroke="${INK}" stroke-width="3.4" paint-order="stroke">SCORCH SAUCE</text></svg>`;
  }


  function soilBags(n) {
    const bag = (x, y, r, c) => `<g transform="translate(${x} ${y}) rotate(${r})">
      <path d="M-40 -34C-44 -10-44 20-38 34H38C44 20 44-10 40-34C20-40-20-40-40-34Z" fill="${c}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M8 -36C28 -10 30 16 36 32H38C44 20 44-10 40-34Z" fill="${shade(c, -0.28)}"/>
      <path d="M-40 -34C-30-44-18-38-12-44-4-38 6-44 14-38 24-44 32-38 40-34" fill="${shade(c, 0.15)}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <rect x="-28" y="-12" width="48" height="28" rx="4" fill="#fff4d6" stroke="${INK}" stroke-width="3"/>
      <text x="-4" y="8" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="13" fill="#6a3419">SOIL</text>
      <path d="M-32 -26C-34 -4-34 16-30 28" stroke="#fff" stroke-width="4" opacity=".3" fill="none" stroke-linecap="round"/></g>`;
    let g = `<ellipse cx="96" cy="128" rx="96" ry="12" fill="#12040f" opacity=".45"/>`;
    if (n >= 3) g += bag(134, 84, 8, '#b5733a');
    if (n >= 2) g += bag(40, 88, -6, '#9a5a2e');
    g += bag(92, 96, 3, '#c9843c');
    return `<svg class="prop-fg" viewBox="0 0 190 140" aria-hidden="true">${g}</svg>`;
  }
  function pallet(n, cash) {
    const crate = (x, y, lab) => `<g transform="translate(${x} ${y})"><rect x="0" y="0" width="110" height="52" rx="4" fill="#c9843c" stroke="${INK}" stroke-width="4.5"/>
      <rect x="6" y="6" width="98" height="40" rx="2" fill="none" stroke="#a3662a" stroke-width="3"/><rect x="60" y="4" width="46" height="44" fill="#a3662a" opacity=".45"/>
      <path d="M8 8H100" stroke="#fff" stroke-width="3" opacity=".3"/>
      <text x="55" y="33" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="15" fill="#fff4d6" stroke="${INK}" stroke-width="3.2" paint-order="stroke">${lab}</text></g>`;
    let g = `<ellipse cx="96" cy="160" rx="100" ry="12" fill="#12040f" opacity=".45"/>
      <rect x="4" y="134" width="176" height="18" rx="3" fill="#a0612e" stroke="${INK}" stroke-width="4"/><path d="M24 152v10M92 152v10M160 152v10" stroke="${INK}" stroke-width="10"/>`;
    g += crate(8, 82, 'SCORCH SAUCE');
    if (n >= 2) g += crate(64, 30, 'EXTRA HOT');
    if (n >= 3) g += crate(20, -22, 'REAPER');
    const bt = (x, y, c) => `<g transform="translate(${x} ${y})"><rect x="-5" y="-26" width="10" height="8" fill="#ffd12a" stroke="${INK}" stroke-width="2.4"/><path d="M-5 -18h10l5 8v20H-10V-10z" fill="${c}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M-6 -8v14" stroke="#fff" stroke-width="2" opacity=".5"/></g>`;
    const topY = n >= 3 ? -22 : n >= 2 ? 30 : 82;
    g += bt(n >= 2 ? 84 : 30, topY, '#e8231b') + bt(n >= 2 ? 104 : 50, topY, '#ff8a00');
    if (cash) g += `<g transform="translate(${n >= 2 ? 128 : 74} ${topY - 22})">${[0, 1, 2].map(i => `<rect x="0" y="${12 - i * 7}" width="40" height="12" rx="2" fill="#5fd068" stroke="${INK}" stroke-width="3"/><rect x="14" y="${14 - i * 7}" width="12" height="8" fill="#2f8f3d"/>`).join('')}</g>`;
    return `<svg class="prop-fg" viewBox="0 -40 190 212" aria-hidden="true">${g}</svg>`;
  }
  function goldRecord() {
    return `<svg class="prop-record" viewBox="0 0 64 64" aria-hidden="true"><rect x="3" y="3" width="58" height="58" rx="4" fill="#2b2240" stroke="${INK}" stroke-width="4"/><rect x="7" y="7" width="50" height="50" fill="#3a2f58"/>
      <circle cx="32" cy="30" r="19" fill="#ffc21a" stroke="${INK}" stroke-width="3"/><circle cx="32" cy="30" r="13" fill="none" stroke="#c98a0b" stroke-width="2"/><circle cx="32" cy="30" r="5" fill="#e8231b" stroke="${INK}" stroke-width="2"/>
      <path d="M20 22a14 14 0 0 1 8-6" stroke="#fff6c0" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="14" y="51" width="36" height="6" rx="1" fill="#ffc21a"/></svg>`;
  }
  function jar(i, h) {
    const c = ['#e8231b', '#ff8a00', '#2fbf55'][i % 3];
    return `<svg class="prop-bottle" viewBox="0 0 34 40" style="height:${h}px" aria-hidden="true"><rect x="7" y="2" width="20" height="7" rx="2" fill="#9aa7c7" stroke="${INK}" stroke-width="2.4"/>
      <rect x="3" y="8" width="28" height="30" rx="6" fill="#dff4ff" fill-opacity=".85" stroke="${INK}" stroke-width="2.6"/>
      ${[0, 1, 2, 3].map(k => `<ellipse cx="${10 + (k % 2) * 13}" cy="${18 + Math.floor(k / 2) * 10}" rx="6" ry="4" fill="${c}" stroke="${INK}" stroke-width="1.4" transform="rotate(${k * 30} ${10 + (k % 2) * 13} ${18 + Math.floor(k / 2) * 10})"/>`).join('')}
      <path d="M8 12v20" stroke="#fff" stroke-width="2.4" opacity=".7" stroke-linecap="round"/></svg>`;
  }

  /* ---------- sunburst (title / reward) ---------- */
  function sunburst(c1, c2) {
    let p = '';
    for (let i = 0; i < 16; i++) {
      const a0 = (i / 16) * Math.PI * 2, a1 = a0 + Math.PI / 16;
      p += `<path d="M0 0L${Math.cos(a0) * 1000} ${Math.sin(a0) * 1000}L${Math.cos(a1) * 1000} ${Math.sin(a1) * 1000}Z"/>`;
    }
    return `<svg class="sunburst" viewBox="-500 -500 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect x="-500" y="-500" width="1000" height="1000" fill="${c1}"/><g fill="${c2}" class="rays">${p}</g></svg>`;
  }

  global.CF = global.CF || {};
  global.CF.art = {
    INK, shade, icon, iconFor, eventIcon, pepper, pepperG, plantSvg, stageOf, potSvg, character, CAST, castFor, randomCustomer,
    sauceBottle, boombox, neonChili, soilBags, pallet, goldRecord, jar, ristra, stringLights, mixtapePoster, sauceCrate, fridge, waterTank, tvSet, merchRack, smoker, pickaxes, doorSvg, growLight, sunburst,
    PEPPER_COLOR,
  };
})(typeof window !== 'undefined' ? window : globalThis);

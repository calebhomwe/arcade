// Icon helper: 117 glossy pictures live in one sprite sheet; the coin and star are drawn as SVG.
let ATLAS = null;
export async function loadIcons(url = 'textures/icons.json') {
  try { ATLAS = await (await fetch(url)).json(); } catch (e) { ATLAS = { map: {}, cols: 12, rows: 10 }; }
  return ATLAS;
}
const COIN = (s) => `<svg class="coin" width="${s}" height="${s}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#d98a0c"/><circle cx="32" cy="32" r="26.5" fill="#ffd34a"/><circle cx="32" cy="32" r="20" fill="none" stroke="#f2a10e" stroke-width="3.5"/><path d="M32 17l4.6 9.6 10.4 1.4-7.6 7.2 1.9 10.3L32 40.4l-9.3 5.1 1.9-10.3-7.6-7.2 10.4-1.4z" fill="#f7b51d"/><path d="M14 27a19 19 0 0 1 14-13" fill="none" stroke="#fff6c0" stroke-width="4" stroke-linecap="round" opacity=".85"/></svg>`;
export function icon(name, size = 32, cls = '') {
  if (name === 'coin') return COIN(size);
  const e = ATLAS && ATLAS.map[name];
  if (!e) return `<i class="ic ${cls}" style="--s:${size}px;--c:0;--r:9;opacity:.0"></i>`;
  return `<i class="ic ${cls}" style="--s:${size}px;--c:${e[0]};--r:${e[1]}" aria-hidden="true"></i>`;
}
export const hasIcon = (n) => n === 'coin' || !!(ATLAS && ATLAS.map[n]);
export function iconUrlStyle(name) { const e = ATLAS && ATLAS.map[name]; return e ? e : null; }

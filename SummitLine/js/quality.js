// Quality presets. The choice is remembered per browser and applied on reload.
export const PRESETS = {
  low: { name: 'Low', pixelRatio: 1.0, ds: 2.0, dv: 1.7, massifAng: 240, massifRings: 60, treesNear: 1600, treesFar: 1800, shadows: 0, sparkle: false, particles: 350, boulders: 25, trailLen: 220 },
  medium: { name: 'Medium', pixelRatio: 0.85, ds: 1.25, dv: 1.1, massifAng: 720, massifRings: 170, treesNear: 11000, treesFar: 12000, shadows: 2048, sparkle: true, particles: 1400, boulders: 45, trailLen: 360 },
  high: { name: 'High', pixelRatio: 1.25, ds: 0.85, dv: 0.75, massifAng: 960, massifRings: 230, treesNear: 18000, treesFar: 22000, shadows: 2048, sparkle: true, particles: 2400, boulders: 70, trailLen: 520 },
};
const ORDER = ['low', 'medium', 'high'];

export function currentQualityKey() {
  const url = new URLSearchParams(location.search).get('q');
  if (url && PRESETS[url]) return url;
  try { const v = localStorage.getItem('summitline.quality'); if (v && PRESETS[v]) return v; } catch (e) { /* storage blocked */ }
  const coarse = matchMedia('(pointer: coarse)').matches;
  return coarse ? 'low' : 'medium';
}
export function nextQualityKey(k) { return ORDER[(ORDER.indexOf(k) + 1) % ORDER.length]; }
export function saveQualityKey(k) { try { localStorage.setItem('summitline.quality', k); } catch (e) { /* ignore */ } }


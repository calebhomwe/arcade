// Read games/<id>.json and write progression.json + progression.md (lowest first).
import fs from 'node:fs/promises';
import path from 'node:path';
import { SYSTEMS } from './progress-core.mjs';

const esc = s => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
export async function loadProgress(dir) {
  const files = (await fs.readdir(path.join(dir, 'games')).catch(() => [])).filter(f => f.endsWith('.json')), rs = [];
  for (const f of files) { try { rs.push(JSON.parse(await fs.readFile(path.join(dir, 'games', f), 'utf8'))); } catch {} }
  return rs.sort((a, b) => a.level - b.level || (a.observedSystems || []).length - (b.observedSystems || []).length || a.id.localeCompare(b.id));
}
export async function writeProgressReport(dir) {
  const rs = await loadProgress(dir);
  await fs.writeFile(path.join(dir, 'progression.json'), JSON.stringify({ generated: new Date().toISOString(), count: rs.length, results: rs }, null, 1));
  const n = l => rs.filter(r => r.level === l).length;
  const L = [];
  L.push('# Progression check', '');
  L.push(`Generated ${new Date().toISOString()}. ${rs.length} games. **P0 ${n(0)}, P1 ${n(1)}, P2 ${n(2)}, P3 ${n(3)}.**`, '');
  L.push('P0 = nothing that counts as progress persists (no save, or only settings). P1 = a best score (or unclassified state) persists but no unlock / upgrade / goal / level system was seen. P2 = progress persists and at least one progression system was seen. P3 = a sink (upgrade, unlock, cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), persisted.', '');
  L.push('"Seen" = on screen or in storage during a 40 s bot session plus 12 s on a second session; the bot does not open menus, so a shop behind a button it never pressed shows only as a button label. Systems that only the game\'s own feature text mentions are listed as *claimed* and do not count. Systems marked S are in storage, D on screen.', '');
  L.push('| # | Game | Level | Persists after a bot session | Second session | Systems seen | Claimed only | Lacks (against its genre) |', '|--:|---|---|---|---|---|---|---|');
  rs.forEach((r, i) => {
    const p = r.persists || {}, s = r.storage || {}, s2 = r.session2 || {};
    const persists = p.anything ? [p.bestScore ? 'best score' : '', ...(p.progress || []).filter(x => x !== 'save-blob'), p.progress && p.progress.includes('save-blob') ? 'save data' : '', (s.indexedDB || []).length ? 'IndexedDB' : ''].filter(Boolean).join(', ') || 'settings/other' : 'nothing';
    const seen = (r.observedSystems || []).map(k => `${k}(${r.systems[k].storage ? 'S' : ''}${r.systems[k].dom ? 'D' : ''})`).join(', ') || 'none';
    const second = s2.startsFromSaved ? 'starts from saved state' + (s2.titleTextChanged ? ' (title shows it)' : '') : (p.anything ? 'saved, but not visibly used' : '-');
    L.push(`| ${i + 1} | ${esc(r.title || r.id)} (\`${r.id}\`) | **${r.label}**${r.lowConfidence ? ' (?)' : ''} | ${esc(persists)} | ${esc(second)} | ${esc(seen)} | ${esc((r.claimedOnly || []).join(', ') || '-')} | ${esc((r.lacks || []).join(', ') || '-')} |`);
  });
  L.push('', '(?) = the bot did not reach play, so persistence after real play was not measured.', '', '## Evidence per game', '');
  for (const r of rs) {
    L.push(`### ${r.title || r.id} (\`${r.id}\`): ${r.label}`, '', `- Why: ${r.why || ''}`);
    const s = r.storage || {};
    if (s.added) L.push(`- localStorage keys: ${s.localStorageKeys}; written this session: ${[...(s.added || []), ...(s.changed || [])].join(', ') || 'none'}; IndexedDB: ${(s.indexedDB || []).join('; ') || 'none'}; cookies: ${s.cookies}`);
    if (r.declaredSaves && r.declaredSaves.length) L.push(`- Declared save keys (qa meta): ${r.declaredSaves.join(', ')}`);
    if (r.session1) L.push(`- Session 1: start ${r.session1.start || '?'}; reached play: ${r.session1.reachedPlay}; game overs ${r.session1.gameOvers}; ${r.session1.score ? 'score ' + r.session1.score.first + ' to ' + r.session1.score.last + ' (max ' + r.session1.score.max + ')' : 'no score reported'}`);
    if (r.session2 && r.session2.title1 != null) L.push(`- Title, session 1: "${r.session2.title1}" | session 2: "${r.session2.title2}"`);
    if ((r.notes || []).length) L.push(`- Notes: ${r.notes.join('; ')}`);
    L.push('');
  }
  await fs.writeFile(path.join(dir, 'progression.md'), L.join('\n'));
}

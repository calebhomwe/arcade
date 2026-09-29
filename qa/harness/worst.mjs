// Build the data sections of docs/HEALTH_REPORT.md from the health and progression results.
//   node qa/harness/worst.mjs [N=25]  ->  prints Markdown: worst N games with exact evidence, static suspects, WebKit result, P level; the P0/P1 list
// Inputs: qa/health-results/health.json (Chromium), qa/health-results/webkit/health.json (optional), qa/health-results/progression/progression.json
import fs from 'node:fs';
import path from 'node:path';
import { root, META } from './lib/common.mjs';
import { suspectsFor } from './lib/suspects.mjs';

const N = +(process.argv[2] || 25), dir = path.join(root, 'qa/health-results');
const load = f => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return null; } };
const H = load('health.json'), W = load('webkit/health.json'), P = load('progression/progression.json');
const wk = Object.fromEntries(((W && W.results) || []).map(r => [r.id, r])), pr = Object.fromEntries(((P && P.results) || []).map(r => [r.id, r]));
const esc = s => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const rs = ((H && H.results) || []).slice().sort((a, b) => (b.severity || 0) - (a.severity || 0));
const L = [];
const bad = rs.filter(r => r.verdicts.length);
L.push(`### Worst ${Math.min(N, bad.length)} in Chromium (iPhone 13 profile, CPU x${rs[0] && rs[0].throttle}, ${rs[0] && rs[0].durationS} s monkey)`, '');
bad.slice(0, N).forEach((r, i) => {
  L.push(`${i + 1}. **${r.title}** (\`${r.id}\`, ${r.cat}${META.games[r.id] && META.games[r.id].scan ? ', ' + META.games[r.id].scan.engine : ''}): **${r.verdicts.join(' + ')}**`);
  for (const v of r.verdicts) L.push(`   - ${v}: ${r.evidence[v]}`);
  if (r.recheck) L.push(`   - re-run: ${r.recheck.reproduced ? 'FREEZE reproduced' + (r.recheck.blockPlayMs != null ? ` (blocked ${r.recheck.blockLoadMs} ms at load, ${r.recheck.blockPlayMs} ms in play)` : '') : 'did NOT reproduce (' + (r.recheck.verdicts.join('+') || 'clean') + ', machine load ' + r.recheck.load1 + ')'}`);
  const w = wk[r.id]; if (w) L.push(`   - WebKit: ${w.verdicts.join('+') || 'clean'}${w.verdicts.length ? ' (' + w.verdicts.map(v => w.evidence[v]).join(' | ').slice(0, 220) + ')' : ''}`);
  if (r.risks && r.risks.length) L.push(`   - memory risks: ${r.risks.join('; ')}`);
  const sus = suspectsFor(META.games[r.id] || r); if (sus.length) L.push(`   - suspects in the source: ${sus.join('; ')}`);
  if (pr[r.id]) L.push(`   - progression: ${pr[r.id].label} (${pr[r.id].why})`);
  if (r.shots) L.push(`   - screenshots: ${Object.values(r.shots).filter(Boolean).map(s => 'qa/health-results/' + s).join(', ')}`);
});
L.push('', '### P0 and P1 games', '');
if (P) {
  for (const lvl of [0, 1]) {
    const g = P.results.filter(r => r.level === lvl);
    L.push(`**P${lvl} (${g.length})**`, '');
    for (const r of g) L.push(`- ${r.title} (\`${r.id}\`, ${r.genre || r.cat})${r.lowConfidence ? ' (?)' : ''}: ${r.why}. Lacks: ${(r.lacks || []).join(', ') || '-'}.${(r.claimedOnly || []).length ? ' Claimed but not seen: ' + r.claimedOnly.join(', ') + '.' : ''}`);
    L.push('');
  }
}
console.log(L.join('\n'));

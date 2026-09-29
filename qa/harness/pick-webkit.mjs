// Pick the 30 games that most need a WebKit (Safari engine) run: every kid / learning game, Claire & Pip, Claire's Big Life,
// Snake and Balloon Bust first, then the worst Chromium results, up to 30. Writes qa/health-results/webkit-ids.txt.
import fs from 'node:fs';
import path from 'node:path';
import { root, META } from './lib/common.mjs';

const N = +(process.argv[2] || 30), dir = path.join(root, 'qa/health-results');
const H = JSON.parse(fs.readFileSync(path.join(dir, 'health.json'), 'utf8')).results;
const sev = Object.fromEntries(H.map(r => [r.id, r.severity || 0]));
const must = Object.entries(META.games).filter(([id, g]) => !g.frozen && (g.cat === 'learning' || /^(claire-pip|godot-claire-big-life|balloon-bust|hub-snake|sky-snake|snake-clash|hub-math-snake)$/.test(id))).map(([id]) => id);
const worst = H.filter(r => r.verdicts.length).sort((a, b) => b.severity - a.severity).map(r => r.id);
const pick = [...new Set([...must, ...worst])].slice(0, Math.max(N, must.length));
fs.writeFileSync(path.join(dir, 'webkit-ids.txt'), pick.join('\n') + '\n');
console.log(`${pick.length} games (${must.length} must-have, rest worst Chromium first):\n` + pick.join(','));

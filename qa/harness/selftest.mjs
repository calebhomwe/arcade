// Does the harness detect what it claims? Runs health.mjs (and progression.mjs) on the fixtures in qa/harness/fixtures:
// one that passes, ones that freeze / hang / lose the game loop / never start / start only by keyboard / jank / leak / reload / dead-end,
// and three that save nothing / a best score / a whole progression. Exit code 1 if any expectation fails.
//   node qa/harness/selftest.mjs            (Chromium; ENGINE=webkit for the Safari engine)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const here = import.meta.dirname, fx = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/fixtures.json'), 'utf8'));
const out = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'health-selftest-'));
const env = { ...process.env, FIXTURES: '1', REPORT_DIR: out, DURATION: process.env.DURATION || '24', WORKERS: process.env.WORKERS || '2', RECHECK: '0' };
const healthIds = Object.keys(fx).filter(k => !k.startsWith('prog-')).concat('prog-none');
console.log('health.mjs on the fixtures ...');
spawnSync('node', [path.join(here, 'health.mjs')], { env: { ...env, GAME_IDS: healthIds.join(',') }, stdio: 'inherit' });
let bad = 0;
const rows = [];
for (const id of healthIds) {
  const f = path.join(out, 'games', id + '.json');
  if (!fs.existsSync(f)) { rows.push([id, fx[id].expect, '(no result)', 'FAIL']); bad++; continue; }
  const r = JSON.parse(fs.readFileSync(f, 'utf8')), got = r.verdicts.join('+') || 'OK';
  const want = fx[id].expect.startsWith('P') ? 'OK' : fx[id].expect;
  const ok = want === 'OK' ? !r.verdicts.length : want.split('+').every(v => r.verdicts.includes(v));
  rows.push([id, want, got, ok ? 'pass' : 'FAIL']); if (!ok) bad++;
}
if (fs.existsSync(path.join(here, 'progression.mjs'))) {
  console.log('progression.mjs on the fixtures ...');
  const pids = ['prog-none', 'prog-best', 'prog-rich'];
  const penv = { ...env, REPORT_DIR: path.join(out, 'prog'), GAME_IDS: pids.join(','), DURATION: process.env.PDURATION || '20' };
  spawnSync('node', [path.join(here, 'progression.mjs')], { env: penv, stdio: 'inherit' });
  for (const id of pids) {
    const f = path.join(out, 'prog', 'games', id + '.json'), want = fx[id].expect;
    if (!fs.existsSync(f)) { rows.push([id, want, '(no result)', 'FAIL']); bad++; continue; }
    const r = JSON.parse(fs.readFileSync(f, 'utf8')), got = 'P' + r.level;
    const ok = want === 'P0' ? r.level === 0 : want === 'P1' ? r.level === 1 : r.level >= 2;
    rows.push([id, want, got, ok ? 'pass' : 'FAIL']); if (!ok) bad++;
  }
}
console.log('\n' + 'fixture'.padEnd(14) + 'expected'.padEnd(16) + 'got'.padEnd(22) + 'result');
for (const r of rows) console.log(r[0].padEnd(14) + r[1].padEnd(16) + r[2].padEnd(22) + r[3]);
console.log(bad ? `\n${bad} expectation(s) FAILED (results in ${out})` : `\nall ${rows.length} fixtures detected as expected (results in ${out})`);
process.exit(bad ? 1 : 0);

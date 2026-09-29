// Progression check: does a game have REAL progression (a reason to come back tomorrow)?
//   node qa/harness/progression.mjs
//   GAME_IDS=a,b   WORKERS=2   ENGINE=chromium|webkit   REPORT_DIR (default qa/health-results/progression)   CHUNK=1/4   SKIP_DONE=1
//   DURATION=40 (seconds of monkey play in session 1)   DURATION2=12 (session 2 on the same profile)
// It reads qa/standard/meta/<id>.json (saves, features) and assets/game-meta.json, plays a bot session in a clean profile,
// diffs localStorage / IndexedDB / cookies, starts a second session on the same profile, and scores P0 to P3:
//   P0 nothing that counts as progress persists
//   P1 a best score (or some state) persists, but no unlock / upgrade / goal / level system is seen
//   P2 progress persists and at least one progression system is seen (levels, unlocks, upgrades, stars, goals, achievements, daily, cosmetics)
//   P3 several systems that feed each other: a sink (upgrade / unlock / cosmetic) fed by two or more sources (levels, stars, goals, achievements, daily, currency), all persisted
// "Seen" means on screen or in storage during the bot's session; what only the game's own feature text claims is listed as claimed, not counted.
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import { root, ENGINE, startServer, launch, gameList, os } from './lib/common.mjs';
import { checkProgression, SYSTEMS } from './lib/progress-core.mjs';
import { writeProgressReport } from './lib/progress-report.mjs';

const out = path.resolve(process.env.REPORT_DIR || path.join(root, 'qa/health-results/progression'));
const DURATION = +(process.env.DURATION || 40), DURATION2 = +(process.env.DURATION2 || 12), WORKERS = +(process.env.WORKERS || 2);
await fs.mkdir(path.join(out, 'games'), { recursive: true });
const { server, BASE } = await startServer();
let games = gameList(BASE);
if (process.env.CHUNK) { const [i, n] = process.env.CHUNK.split('/').map(Number); games = games.filter((_, k) => k % n === i - 1); }
if (process.env.SKIP_DONE === '1') games = games.filter(g => !fss.existsSync(path.join(out, 'games', g.id + '.json')));
console.log(`${games.length} games, ${ENGINE}, ${DURATION}+${DURATION2} s each, ${WORKERS} worker(s), load ${os.loadavg()[0].toFixed(1)}`);
let next = 0, done = 0;
const worker = async () => {
  let browser = await launch();
  while (next < games.length) {
    const g = games[next++];
    let r;
    try { r = await checkProgression(g, browser, { BASE, out, DURATION, DURATION2 }); }
    catch (e) { await browser.close().catch(() => {}); browser = await launch(); r = { id: g.id, title: g.title, cat: g.cat, genre: g.genre, level: 0, label: 'P0', why: 'check crashed: ' + e.message.slice(0, 100), notes: ['harness crashed'], lowConfidence: true, observedSystems: [], claimedOnly: [], lacks: [], persists: {}, storage: {}, session2: {}, session1: {} }; }
    await fs.writeFile(path.join(out, 'games', g.id + '.json'), JSON.stringify(r, null, 1));
    console.log(`${String(++done).padStart(3)}/${games.length} ${r.label} ${g.id.padEnd(28)} ${(r.why || '').slice(0, 100)}${r.lowConfidence ? '  [low confidence]' : ''}`);
  }
  await browser.close().catch(() => {});
};
await Promise.all(Array.from({ length: WORKERS }, worker));
server.close();
await writeProgressReport(out);
console.log('-> ' + path.relative(process.cwd(), path.join(out, 'progression.md')));
process.exit(0);

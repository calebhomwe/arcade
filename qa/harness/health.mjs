// Health check: does the game FREEZE, STALL, JANK, LEAK or throw on an iPhone-sized touch screen?
//   node qa/harness/health.mjs
//   GAME_IDS=a,b   pick games            WORKERS=2   browsers at once (default 2; the machine has 4 loaded cores)
//   ENGINE=chromium|webkit               (default chromium; WebKit needs PLAYWRIGHT_BROWSERS_PATH, see qa/harness/HEALTH.md)
//   THROTTLE=4     Chromium CPU slowdown via CDP Emulation.setCPUThrottlingRate (a mid phone is ~4x slower than one core here).
//                  WebKit has no throttle: its numbers are unthrottled and the report says so.
//   DURATION=45    seconds of monkey input after the game starts
//   REPORT_DIR     output folder (default qa/health-results): games/<id>.json, health.json, health.md, shots/
//   CHUNK=1/4      run only the 1st of 4 slices of the list (so a long run can be done in pieces)
//   SKIP_DONE=1    skip games that already have a result in REPORT_DIR (resume)
//   RECHECK=0      do not re-run a game that came out FREEZE (default: re-run once to see whether it reproduces)
//   FIXTURES=1     test the harness itself on qa/harness/fixtures (see selftest.mjs)
// A game is judged on JS cost, long tasks and stalls, not on frame rate: software WebGL on this machine makes the GPU part meaningless.
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import { root, ENGINE, startServer, launch, gameList, wait, os } from './lib/common.mjs';
import { checkHealth } from './lib/health-core.mjs';
import { writeHealthReport } from './lib/health-report.mjs';

const out = path.resolve(process.env.REPORT_DIR || path.join(root, 'qa/health-results'));
const DURATION = +(process.env.DURATION || 45), THROTTLE = +(process.env.THROTTLE || 4), WORKERS = +(process.env.WORKERS || 2);
await fs.mkdir(path.join(out, 'games'), { recursive: true });
const { server, BASE } = await startServer();
let games = gameList(BASE);
if (process.env.CHUNK) { const [i, n] = process.env.CHUNK.split('/').map(Number); games = games.filter((_, k) => k % n === i - 1); }
if (process.env.SKIP_DONE === '1') games = games.filter(g => !fss.existsSync(path.join(out, 'games', g.id + '.json')));
console.log(`${games.length} games, ${ENGINE}${ENGINE === 'chromium' ? ' x' + THROTTLE + ' CPU throttle' : ' (no throttle available)'}, ${DURATION} s each, ${WORKERS} worker(s), load ${os.loadavg()[0].toFixed(1)} on ${os.cpus().length} cores`);

let next = 0, done = 0;
const worker = async () => {
  let browser = await launch();
  while (next < games.length) {
    const g = games[next++];
    let r;
    const run = async (opts) => {
      // A browser can be killed under us (memory, someone else's pkill on a shared box): relaunch and retry before calling it a game problem.
      let last;
      for (let attempt = 0; attempt < 3; attempt++) {
        try { return await checkHealth(g, browser, { BASE, out, DURATION, THROTTLE, ...opts }); }
        catch (e) { last = e; await browser.close().catch(() => {}); browser = await launch(); await wait(1500); }
      }
      return { id: g.id, title: g.title, cat: g.cat, genre: g.genre, engine: ENGINE, verdicts: ['STALL'], evidence: { STALL: 'harness crashed 3 times: ' + last.message.slice(0, 120) }, notes: ['the check itself failed; re-run this game alone'], shots: {}, throttle: THROTTLE, throttled: ENGINE === 'chromium' && THROTTLE > 1, severity: 80, harnessFailed: true };
    };
    r = await run({});
    if (r.verdicts.includes('FREEZE') && process.env.RECHECK !== '0') {
      // A freeze on a loaded machine may be the machine. Run it again; only a repeat is a finding.
      if (r.block && r.block.slowestPollMs > 5000 || (r.evidence.FREEZE || '').includes('did not answer')) { await browser.close().catch(() => {}); browser = await launch(); }
      const r2 = await run({ seed: '-recheck', DURATION: Math.min(DURATION, 30) });
      r.recheck = { reproduced: r2.verdicts.includes('FREEZE'), verdicts: r2.verdicts, evidence: r2.evidence.FREEZE || null, blockPlayMs: r2.block && r2.block.playMs, blockLoadMs: r2.block && r2.block.loadMs, load1: r2.machine && r2.machine.load1End };
    }
    await fs.writeFile(path.join(out, 'games', g.id + '.json'), JSON.stringify(r, null, 1));
    done++;
    const rc = r.recheck ? (r.recheck.reproduced ? ' [reproduced]' : ' [NOT reproduced on re-run]') : '';
    console.log(`${String(done).padStart(3)}/${games.length} ${(r.verdicts.join('+') || 'OK').padEnd(14)} ${g.id.padEnd(28)} ${(r.verdicts.length ? (r.evidence[r.verdicts[0]] || '') : (r.start ? r.start.how : '')).slice(0, 110)}${rc}`);
    if (r.block && (r.block.slowestPollMs > 5000)) { await browser.close().catch(() => {}); browser = await launch(); }
  }
  await browser.close().catch(() => {});
};
await Promise.all(Array.from({ length: WORKERS }, worker));
server.close();
await writeHealthReport(out);
console.log('-> ' + path.relative(process.cwd(), path.join(out, 'health.md')));
process.exit(0);

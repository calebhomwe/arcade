// Read every games/<id>.json in a results folder and write health.json + health.md (worst first).
import fs from 'node:fs/promises';
import path from 'node:path';

export async function loadResults(dir) {
  const files = (await fs.readdir(path.join(dir, 'games')).catch(() => [])).filter(f => f.endsWith('.json'));
  const rs = [];
  for (const f of files) { try { rs.push(JSON.parse(await fs.readFile(path.join(dir, 'games', f), 'utf8'))); } catch {} }
  return rs.sort((a, b) => (b.severity || 0) - (a.severity || 0) || a.id.localeCompare(b.id));
}

const esc = s => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
export async function writeHealthReport(dir) {
  const rs = await loadResults(dir);
  await fs.writeFile(path.join(dir, 'health.json'), JSON.stringify({ generated: new Date().toISOString(), engine: rs[0] && rs[0].engine, count: rs.length, results: rs }, null, 1));
  const n = v => rs.filter(r => r.verdicts.includes(v)).length, ok = rs.filter(r => !r.verdicts.length).length;
  const eng = (rs[0] && rs[0].engine) || 'chromium', thr = rs[0] && rs[0].throttled ? 'CPU throttled x' + rs[0].throttle : 'NO CPU throttle (unthrottled numbers)';
  const loads = rs.map(r => r.machine && r.machine.load1End).filter(x => x != null);
  const con = rs.map(r => r.machine && r.machine.contention).filter(x => x != null).sort((a, b) => a - b);
  const cal = rs.map(r => r.calibration && r.calibration.effectiveSlowdown).filter(x => x != null).sort((a, b) => a - b);
  const L = [];
  L.push(`# Health check: ${eng}, ${thr}`, '');
  L.push(`Generated ${new Date().toISOString()}. ${rs.length} games, ${rs[0] ? rs[0].durationS : '?'} s of monkey input each, iPhone 13 profile (390x844 touch, mobile user agent).`, '');
  L.push(`**FREEZE ${n('FREEZE')}, STALL ${n('STALL')}, JANK ${n('JANK')}, LEAK ${n('LEAK')}, ERRORS ${n('ERRORS')}, clean ${ok}.**`, '');
  L.push(`Machine: ${rs[0] && rs[0].machine ? rs[0].machine.cores : '?'} cores, 1-minute load average at the end of each game ranged ${loads.length ? Math.min(...loads) + ' to ' + Math.max(...loads) : 'n/a'} (median ${loads.length ? loads.sort((a, b) => a - b)[Math.floor(loads.length / 2)] : 'n/a'}). ` + (con.length ? `Measured CPU contention while running (wall/CPU of a spin): median x${con[Math.floor(con.length / 2)]}, range x${con[0]} to x${con[con.length - 1]}. ` : '') + (cal.length ? `Measured slowdown of the throttled page against an unthrottled page (a fixed JS benchmark): median x${cal[Math.floor(cal.length / 2)]}, range x${cal[0]} to x${cal[cal.length - 1]}. ` : '') + `The machine is shared and loaded, so every duration is divided by the machine slowdown measured at the time (wall time over CPU time of a spin in the harness, contention in games/<id>.json, capped at 4) and time inside GPU-blocking WebGL calls is taken out; raw numbers are kept in games/<id>.json. A FREEZE is re-run once and marked reproduced or not.`, '');
  L.push('Legend: FREEZE = main thread blocked over 1.5 s, or no animation frame for 3 s while visible, or crash / reload / WebGL context lost. STALL = never leaves the title (SDK never reports `play`), starts only by keyboard, screen static 20 s under input, or dead end after game over. JANK = p95 JS frame cost over 16 ms (throttled) or 33 ms (unthrottled), GL-call time excluded. LEAK = JS heap over +60% after forced GC, or DOM nodes / listeners exploding. ERRORS = uncaught page errors. Judged on JS cost, long tasks and stalls, not fps: software WebGL makes the GPU part meaningless.', '');
  L.push('| # | Game | Verdict | Failing signal | Start | Scenes (play, over, restarts) | Shots |', '|--:|---|---|---|---|---|---|');
  rs.forEach((r, i) => {
    const sig = r.verdicts.length ? r.verdicts.map(v => `${v}: ${r.evidence[v]}`).join(' || ') : (r.risks && r.risks.length ? 'risk: ' + r.risks.join('; ') : 'none');
    const rc = r.recheck ? (r.recheck.reproduced ? ' **[reproduced on re-run]**' : ' [not reproduced on re-run]') : '';
    const sc = r.scenes ? `${r.scenes.reachedPlay ? 'play' : 'NO play'}, over ${r.scenes.gameOvers}, restarts ${r.scenes.restartsAfterOver}` : (r.sdkDeclared === false ? 'no SDK scenes' : '');
    const shots = Object.values(r.shots || {}).filter(Boolean).map(p => '`' + p + '`').join(' ');
    L.push(`| ${i + 1} | ${esc(r.title || r.id)} (\`${r.id}\`) | ${r.verdicts.join('+') || 'OK'} | ${esc(sig)}${rc} | ${esc(r.start ? r.start.how : '')} | ${esc(sc)} | ${shots} |`);
  });
  L.push('', '## Numbers per game', '', '| Game | JS block load / play ms, normalised | long tasks (>=100 ms) | frames, JS p95 / p99 ms | heap MB start > end | DOM nodes | audio ctx | canvas MB | main thread busy % | input latency p95 ms | score |', '|---|--:|--:|---|---|---|--:|--:|--:|--:|---|');
  for (const r of rs) {
    if (!r.block) { L.push(`| ${r.id} | did not run |`); continue; }
    const rs2 = r.resources || {}, f = r.frames || {}, b = r.bot || {};
    L.push(`| ${r.id} | ${r.block.loadMs} / ${r.block.playMs} | ${r.block.longTasks100Play} | ${f.n}, ${f.jsP95 == null ? '-' : f.jsP95} / ${f.jsP99 == null ? '-' : f.jsP99} | ${rs2.heapMeasured ? rs2.heap0MB + ' > ' + rs2.heap1MB : 'n/a'} | ${rs2.nodesStart == null ? '-' : rs2.nodesStart + ' > ' + rs2.nodesEnd} | ${rs2.audioContexts == null ? '-' : rs2.audioContexts} | ${rs2.canvases ? rs2.canvases.totalMB : '-'} | ${r.cpu ? r.cpu.mainThreadBusyPct : '-'} | ${b.inputLatencyP95Ms == null ? '-' : b.inputLatencyP95Ms} | ${r.gameScore && r.gameScore.last != null ? r.gameScore.first + ' > ' + r.gameScore.last : '-'} |`);
  }
  await fs.writeFile(path.join(dir, 'health.md'), L.join('\n') + '\n');
}

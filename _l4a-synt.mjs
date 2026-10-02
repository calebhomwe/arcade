// quick syntax check of inline <script> blocks in hub games (not a game change)
import fs from 'node:fs';
const vm = await import('node:vm');
for (const f of process.argv.slice(2)) {
  const html = fs.readFileSync(f, 'utf8');
  const blocks = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)];
  let bad = 0;
  blocks.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: f + '#' + i }); } catch (e) { bad++; console.log('SYNTAX FAIL', f, 'block', i, e.message); }
  });
  if (!bad) console.log('OK', f, blocks.length + ' inline block(s)');
}

// Syntax-check inline <script> blocks of an HTML file with node --check semantics.
import fs from 'node:fs';
import vm from 'node:vm';
const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, i = 0, bad = 0;
while ((m = re.exec(html))) {
  i++;
  try { new vm.Script(m[1], { filename: file + '#inline' + i }); }
  catch (e) { bad++; console.log(`BLOCK ${i}: ${e.message}`); }
}
console.log(`${file}: ${i} inline block(s), ${bad} with syntax errors`);
process.exit(bad ? 1 : 0);

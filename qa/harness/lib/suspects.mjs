// Static hints for "why might this game freeze on an iPhone": patterns in the game's own source. These are suspects, not proof;
// the runtime numbers in health.json are the evidence.
import fss from 'node:fs';
import path from 'node:path';
import { root, extRoot } from './common.mjs';

export function sourceDir(g) {
  const m = /^https:\/\/calebhomwe\.github\.io\/([^/]+)\/(.*)$/.exec(g.src || '');
  if (m) return { dir: path.dirname(path.join(m[1] === 'arcade' ? root : path.join(extRoot, m[1]), m[2].split('?')[0] || 'index.html')), file: path.basename(m[2].split('?')[0]) || 'index.html' };
  return { dir: path.dirname(path.join(root, g.src)), file: path.basename(g.src) };
}
const walk = (dir, depth = 0, acc = []) => {
  let ents = []; try { ents = fss.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) {
    if (e.name.startsWith('.') || /^(node_modules|assets|models|audio|sounds|img|images|textures|fonts)$/i.test(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (depth < 2) walk(p, depth + 1, acc); }
    else if (/\.(html|js|mjs)$/i.test(e.name) && !/(^|[-._])(three|min)\b|three\.module|\.min\.js$|gltf|draco|orbit|phaser|howler|pixi|cannon|ammo|rapier|godot|\.wasm/i.test(e.name)) {
      const sz = fss.statSync(p).size; if (sz < 1.5e6) acc.push(p);
    }
  }
  return acc;
};
const count = (s, rx) => (s.match(rx) || []).length;

export function suspectsFor(g) {
  const { dir } = sourceDir(g), out = [], files = walk(dir);
  if (/Godot\//.test(g.src || '') || g.scan?.engine === 'godot') return ['Godot web export: the wasm + pck load and compile on the main thread and use 200 to 500 MB; iOS Safari kills or reloads the tab above its memory limit'];
  if (g.scan?.engine === 'unity') return ['Unity WebGL build: wasm compile and heap over the iOS limit'];
  let src = '', big = [];
  for (const f of files) { let t = ''; try { t = fss.readFileSync(f, 'utf8'); } catch { continue; } src += '\n' + t; const inline = Math.max(0, ...[...t.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1].length)); if (t.length > 700e3) big.push(path.basename(f) + ' ' + Math.round(t.length / 1024) + ' KB'); }
  const si = count(src, /\bsetInterval\s*\(/g), ci = count(src, /\bclearInterval\s*\(/g);
  if (si >= 1 && ci === 0) out.push(`${si} setInterval call(s) and no clearInterval anywhere in the source`);
  else if (si >= 4 && ci < si / 2) out.push(`${si} setInterval vs ${ci} clearInterval`);
  const ac = count(src, /new\s+(?:window\.)?(?:AudioContext|webkitAudioContext)\b/g);
  if (ac >= 2) out.push(`${ac} places create an AudioContext (Safari allows only a handful; make one and reuse it)`);
  const au = count(src, /new\s+Audio\s*\(/g);
  if (au >= 3) out.push(`${au} \`new Audio()\` calls (an element per sound)`);
  if (/setPixelRatio\s*\(\s*(?:window\.)?devicePixelRatio\s*\)/.test(src)) out.push('three.js setPixelRatio(devicePixelRatio) uncapped: 3x on iPhone means 9x the pixels');
  if (/\.(?:width|height)\s*=\s*[^;\n]*devicePixelRatio/.test(src) && !/Math\.min\s*\([^)]*devicePixelRatio/.test(src)) out.push('canvas sized by devicePixelRatio with no cap (3 on iPhone: 9x the pixels)');
  const shadow = [...src.matchAll(/mapSize\.(?:width|height|set)\s*[=(]\s*(\d+)/g)].map(m => +m[1]).filter(n => n >= 4096);
  if (shadow.length) out.push('shadow map ' + shadow[0] + ' px');
  const rafs = count(src, /requestAnimationFrame\s*\(/g), caf = count(src, /cancelAnimationFrame\s*\(/g);
  if (rafs >= 6 && caf === 0) out.push(`${rafs} requestAnimationFrame calls, no cancelAnimationFrame (possible duplicate loops after restart)`);
  if (/\blocation\.reload\s*\(/.test(src)) out.push('calls location.reload()');
  if (/\b(?:alert|confirm|prompt)\s*\(/.test(src)) out.push('uses alert/confirm/prompt (blocks the page)');
  const gt = count(src, /getImageData\s*\(/g); if (gt >= 3) out.push(`${gt} getImageData calls (synchronous readback)`);
  const bigInline = files.map(f => { try { const t = fss.readFileSync(f, 'utf8'); return [...t.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].reduce((m, x) => Math.max(m, x[1].length), 0); } catch { return 0; } });
  if (Math.max(0, ...bigInline) > 400e3) out.push('inline script over 400 KB (parsed synchronously on load)');
  if (big.length) out.push('large source file: ' + big.join(', '));
  if (/new\s+(?:THREE\.)?(?:WebGLRenderer)/.test(src) && !/powerPreference/.test(src)) { /* not informative */ }
  const gl = count(src, /new\s+THREE\.WebGLRenderer\b/g); if (gl >= 2) out.push(`${gl} THREE.WebGLRenderer constructions (each is a WebGL context; iOS loses the oldest above about 8)`);
  return out;
}

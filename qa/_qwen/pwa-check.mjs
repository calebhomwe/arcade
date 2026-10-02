#!/usr/bin/env node
/* PWA plumbing gate for Caleb's Arcade (portal scope only).
   Parses sw.js + manifest.webmanifest + sitemap.xml + robots.txt + 404.html,
   derives game ids from catalog.js, and checks all of it against the real
   file list on disk. Prints every mismatch. Exit 0 = no FAILs.

   Run from repo root:  node qa/_qwen/pwa-check.mjs
   Read-only: touches no file outside qa/_qwen. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const R = p => path.join(ROOT, p);
const exists = p => { try { return fs.statSync(R(p)).isFile(); } catch { return false; } }
const read = p => fs.readFileSync(R(p), 'utf8');

let fails = 0, warns = 0;
const pass = m => console.log('  PASS  ' + m);
const fail = m => { fails++; console.log('  FAIL  ' + m); };
const warn = m => { warns++; console.log('  WARN  ' + m); };
const head = m => console.log('\n== ' + m + ' ==');

/* ---------- image sniffing (no decode, header only) ---------- */
function imgInfo(rel) {
  let b;
  try { b = fs.readFileSync(R(rel)); } catch { return { error: 'unreadable' }; }
  if (b.length === 0) return { error: 'zero bytes' };
  const magic = b.subarray(0, 12).toString('hex');
  let kind = 'unknown', dims = null;
  if (b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
    kind = 'png'; dims = b.readUInt32BE(16) + 'x' + b.readUInt32BE(20);
  } else if (magic.startsWith('52494646') && magic.slice(16, 24) === '57454250') {
    kind = 'webp';
  } else if (magic.startsWith('ffd8')) {
    kind = 'jpg';
  } else {
    return { error: 'not a png/webp/jpg (magic ' + magic.slice(0, 24) + ')', size: b.length };
  }
  return { kind, dims, size: b.length };
}

/* ---------- catalog ---------- */
head('catalog.js');
const catSrc = read('catalog.js');
const CATALOG = JSON.parse(catSrc.match(/const CATALOG = (\[[\s\S]*?\]);\s*\n/)[1]);
const CATS = JSON.parse(catSrc.match(/const CATS = (\[[\s\S]*?\]);\s*\n/)[1]);
const ids = CATALOG.map(g => g.id);
const idSet = new Set(ids);
if (ids.length !== idSet.size) fail('duplicate ids in catalog');
else pass(`${ids.length} unique game ids, ${CATS.length} categories`);

/* ---------- sw.js SHELL vs disk & real page requests ---------- */
head('sw.js');
const sw = read('sw.js');
const VERSION = sw.match(/const VERSION = '([^']+)'/)[1];
const SHELL = [...sw.match(/const SHELL = \[([^\]]*)\]/)[1].matchAll(/'([^']*)'/g)].map(m => m[1]);
if (!/^arcade-/.test(VERSION)) fail(`VERSION "${VERSION}" lacks arcade- prefix (activate cleanup won't evict it)`);
else pass(`cache name ${VERSION} matches the activate cleanup prefix filter`);

let shellMissing = [];
for (const url of SHELL) {
  if (url === './') { if (!exists('index.html')) shellMissing.push(url + ' (index.html)'); continue; }
  const file = url.split('?')[0];
  if (!exists(file)) shellMissing.push(url);
}
if (shellMissing.length) fail(`SHELL entries not on disk: ${shellMissing.join(', ')}`);
else pass(`all ${SHELL.length} SHELL entries exist on disk (query strings ignored)`);

/* every versioned asset the hub pages actually request must be in SHELL verbatim */
const pages = read('index.html') + read('play.html') + read('404.html');
const pageVersioned = [...new Set([...pages.matchAll(/assets\/[a-z-]+\.css\?v=[a-z0-9-]+/gi)].map(m => m[0]))]
  .map(u => u.replace(/^\/arcade\//, ''));
const shellSet = new Set(SHELL);
const drifted = pageVersioned.filter(u => !shellSet.has(u));
if (drifted.length) fail(`pages request ${drifted.join(', ')} which SHELL does not precache (stale-offline risk)`);
else pass(`all versioned CSS requests in index/play/404 (${pageVersioned.length} unique) match SHELL keys`);

/* shell assets that hub JS fetches or renders unconditionally must be precached.
   site.js builds two feature URLs by string concat (assets/feature- + 'neon'/'claire'),
   so a literal-string scan is not enough — use every feature image on disk instead. */
const siteJs = read('assets/site.js');
const neededRuntime = [
  ...fs.readdirSync(R('assets')).filter(f => /^feature-[a-z0-9-]+\.webp$/.test(f)).map(f => 'assets/' + f),
  ...(siteJs.includes("fetch('assets/game-meta.json')") ? ['assets/game-meta.json'] : []),
];
const notPrecached = neededRuntime.filter(u => !shellSet.has(u));
if (notPrecached.length) fail(`hub shell needs ${notPrecached.join(', ')} but it is not in SHELL (broken offline visuals)`);
else pass(`feature images + game-meta.json all precached (${neededRuntime.length} checked)`);

/* no stray duplicate query-variants of the same file in SHELL */
const byBase = {};
for (const u of SHELL) { const b = u.split('?')[0]; (byBase[b] ||= []).push(u); }
const dupVariants = Object.entries(byBase).filter(([, v]) => v.length > 1);
if (dupVariants.length) warn('same base cached under multiple keys: ' + dupVariants.map(([k, v]) => `${k} (${v.join(' vs ')})`).join('; '));
else pass('no duplicate query-variants of one file in SHELL');

/* ---------- manifest ---------- */
head('manifest.webmanifest');
const man = JSON.parse(read('manifest.webmanifest'));
for (const ic of man.icons) {
  if (!exists(ic.src)) { fail(`icon missing: ${ic.src}`); continue; }
  if (ic.sizes === 'any') { pass(`${ic.src} exists (${ic.type})`); continue; }
  const info = imgInfo(ic.src);
  const want = ic.sizes.toLowerCase();
  if (info.error) fail(`icon ${ic.src}: ${info.error}`);
  else if (info.dims !== want) fail(`icon ${ic.src} is ${info.dims}, manifest declares ${ic.sizes}`);
  else pass(`icon ${ic.src} is ${want} as declared (${info.kind}, ${info.size} B)`);
}
for (const sc of man.shortcuts || []) {
  const file = sc.url.replace(/^\.\//, '').split('?')[0] || 'index.html';
  if (!exists(file)) fail(`shortcut "${sc.name}" -> ${sc.url} file ${file} missing`);
  else pass(`shortcut "${sc.name}" -> ${sc.url} resolves to ${file}`);
}
if (!man.start_url) fail('no start_url');
const cnt = (man.description || '').match(/(\d+)\s+free/);
if (cnt && +cnt[1] !== ids.length) warn(`description says ${cnt[1]} games, catalog has ${ids.length}`);
else if (cnt) pass(`description game count (${cnt[1]}) matches catalog length`);

/* ---------- sitemap + robots vs catalog ---------- */
head('sitemap.xml / robots.txt');
const sm = read('sitemap.xml');
const BASE = 'https://calebhomwe.github.io/arcade/';
const playIds = [...sm.matchAll(/play\.html\?g=([a-z0-9-]+)/g)].map(m => m[1]);
const playSet = new Set(playIds);
const missing = ids.filter(i => !playSet.has(i));
const ghost = playIds.filter(i => !idSet.has(i));
const dup = playIds.filter((x, i) => playIds.indexOf(x) !== i);
if (missing.length) fail(`catalog games missing from sitemap: ${missing.join(', ')}`);
else pass(`all ${ids.length} catalog ids present in sitemap`);
if (ghost.length) fail(`sitemap lists unknown game ids: ${ghost.join(', ')}`);
else pass('sitemap has no ghost game ids');
if (dup.length) fail(`duplicate sitemap urls for: ${dup.join(', ')}`);
const catUrls = CATS.map(c => `${BASE}?cat=${c.id}`);
const catMissing = catUrls.filter(u => !sm.includes('<loc>' + u + '</loc>'));
if (catMissing.length) fail(`category urls missing: ${catMissing.join(', ')}`);
else pass(`all ${CATS.length} category URLs present`);
if (!sm.includes('<loc>' + BASE + '</loc>')) fail('root URL missing from sitemap');
else pass('root URL present');

const robots = read('robots.txt');
if (!robots.includes('Sitemap: ' + BASE + 'sitemap.xml')) fail(`robots.txt does not point at ${BASE}sitemap.xml`);
else pass('robots.txt sitemap line matches deployed sitemap URL');
if (!/User-agent: \*/.test(robots)) warn('robots.txt has no wildcard user-agent');

/* ---------- thumbs audit (report only — never regenerate here) ---------- */
head('assets/thumbs audit (report-only)');
const broken = [], missingT = [], tiny = [];
let checked = 0;
for (const g of CATALOG) {
  for (const t of [g.thumb, g.thumb2x]) {
    if (!t) continue;
    checked++;
    if (!exists(t)) { missingT.push(`${g.id}: ${t}`); continue; }
    const info = imgInfo(t);
    if (info.error) broken.push(`${g.id}: ${t} — ${info.error}`);
    else if (info.size < 1024) tiny.push(`${g.id}: ${t} — ${info.size} B`);
  }
}
for (const p of CATALOG.map(g => g.preview).filter(Boolean)) {
  checked++;
  if (!exists(p)) missingT.push(`preview: ${p}`);
  else { const i = imgInfo(p); if (i.error) broken.push(`preview ${p} — ${i.error}`); }
}
if (missingT.length) { console.log('  MISSING (' + missingT.length + '):'); missingT.forEach(x => console.log('    ' + x)); }
if (broken.length) { console.log('  BROKEN (' + broken.length + '):'); broken.forEach(x => console.log('    ' + x)); }
if (tiny.length) { console.log('  SUSPICIOUSLY SMALL <1KB (' + tiny.length + '):'); tiny.forEach(x => console.log('    ' + x)); }
if (!missingT.length && !broken.length) pass(`all ${checked} thumb/preview refs exist with valid image magic`);
else fails += missingT.length ? 1 : 0, fails += broken.length ? 1 : 0;

/* extras on disk not referenced by the catalog (stale art, informational) */
const refs = new Set();
for (const g of CATALOG) { if (g.thumb) refs.add(g.thumb); if (g.thumb2x) refs.add(g.thumb2x); if (g.preview) refs.add(g.preview); }
const onDisk = [];
for (const dir of ['assets/thumbs', 'assets/thumbs/2x', 'assets/previews']) {
  try { for (const f of fs.readdirSync(R(dir))) if (f !== '2x') onDisk.push(dir + '/' + f); } catch { }
}
const extras = onDisk.filter(f => !refs.has(f));
if (extras.length) warn(`${extras.length} image file(s) on disk not referenced by catalog (stale, left in place): ${extras.join(', ')}`);
else pass('every image on disk is referenced by the catalog');

/* ---------- verdict ---------- */
console.log(`\n${fails === 0 ? 'OK' : 'NOT OK'} — ${fails} fail(s), ${warns} warning(s)`);
process.exit(fails === 0 ? 0 : 1);

// Shared plumbing for health.mjs and progression.mjs: static server + external-site routing, browser launch, game list, PNG signatures.
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import os from 'node:os';

export { devices, os };
export const root = path.resolve(import.meta.dirname, '../../..');
export const extRoot = path.resolve(process.env.EXT_ROOT || path.join(root, '..'));
export const ENGINE = process.env.ENGINE === 'webkit' ? 'webkit' : 'chromium';
export const wait = ms => new Promise(r => setTimeout(r, ms));
export const META = JSON.parse(fss.readFileSync(path.join(root, 'assets/game-meta.json'), 'utf8'));
export const STDMETA = id => { try { return JSON.parse(fss.readFileSync(path.join(root, 'qa/standard/meta', id + '.json'), 'utf8')); } catch { return {}; } };

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.pck': 'application/octet-stream', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4', '.webm': 'video/webm' };
export const typeOf = p => TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream';
export const fileFor = (dir, url) => {
  let p = decodeURIComponent(url.split('?')[0].split('#')[0]);
  p = path.join(dir, p);
  if (!p.startsWith(dir)) return null;
  if (fss.existsSync(p) && fss.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  return fss.existsSync(p) ? p : null;
};

export async function startServer() {
  const server = http.createServer((req, res) => {
    const p = fileFor(root, req.url);
    if (!p) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': typeOf(p), 'cache-control': 'no-store' });
    fss.createReadStream(p).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { server, BASE: `http://127.0.0.1:${server.address().port}/` };
}

// https://calebhomwe.github.io/<repo>/... is served from the local clone next to this repo (and /arcade/ from this repo).
export async function routeExternal(ctx) {
  await ctx.route(/^https:\/\/calebhomwe\.github\.io\/([^/]+)\/(.*)$/, async route => {
    const m = route.request().url().match(/^https:\/\/calebhomwe\.github\.io\/([^/]+)\/(.*)$/);
    const dir = m[1] === 'arcade' ? root : path.join(extRoot, m[1]);
    const p = fss.existsSync(dir) ? fileFor(dir, '/' + m[2]) : null;
    if (!p) return route.fulfill({ status: 404, body: 'not found' });
    route.fulfill({ status: 200, body: await fs.readFile(p), headers: { 'content-type': typeOf(p) } });
  });
}

const preinstalled = (() => { try { const d = '/opt/pw-browsers'; const c = fss.readdirSync(d).filter(x => /^chromium-\d+$/.test(x)).sort().pop(); return c && path.join(d, c, 'chrome-linux/chrome'); } catch { return null; } })();
const launchArgs = ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info', '--js-flags=--expose-gc'];
export const launch = async () => {
  if (ENGINE === 'webkit') return webkit.launch();
  if (process.env.CHROMIUM_PATH) return chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: launchArgs });
  try { return await chromium.launch({ args: launchArgs }); }
  catch (e) { if (!preinstalled) throw e; return chromium.launch({ executablePath: preinstalled, args: launchArgs }); }
};

export const heavy = g => (g.src || '').includes('Godot/') || g.id === 'bloxburg-town' || g.scan?.engine === 'godot' || g.scan?.engine === 'unity';

// Game list: every non-frozen game in assets/game-meta.json, or the fixtures when FIXTURES=1.
export function gameList(BASE) {
  if (process.env.FIXTURES === '1') {
    const fx = JSON.parse(fss.readFileSync(path.join(import.meta.dirname, '../fixtures/fixtures.json'), 'utf8'));
    const want = process.env.GAME_IDS ? process.env.GAME_IDS.split(',') : null;
    return Object.entries(fx).filter(([id]) => !want || want.includes(id)).map(([id, v]) => ({ id, ...v, src: 'qa/harness/fixtures/' + v.file, fixture: true }));
  }
  const ids = process.env.GAME_IDS ? process.env.GAME_IDS.split(',') : null;
  return Object.entries(META.games).map(([id, v]) => ({ id, ...v })).filter(g => !g.frozen && (!ids || ids.includes(g.id)));
}
export const urlFor = (g, BASE) => /^https?:/.test(g.src) ? g.src : BASE + g.src;

// ---- deterministic randomness: the same game gets the same monkey every run ----
export function rng(seedStr) {
  let h = 1779033703 ^ String(seedStr).length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  let a = (h = Math.imul(h ^ h >>> 16, 2246822507) ^ Math.imul(h ^ h >>> 13, 3266489909)) ^ h >>> 16;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const pct = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };
export const median = a => pct(a, 50);

// ---- a screen signature: luminance on a coarse grid, decoded from a PNG screenshot without any image library ----
export function decodePng(buf) {
  let p = 8, w = 0, h = 0, ct = 0, depth = 8; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8);
    if (type === 'IHDR') { w = buf.readUInt32BE(p + 8); h = buf.readUInt32BE(p + 12); depth = buf[p + 16]; ct = buf[p + 17]; }
    else if (type === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + len));
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8 || ![2, 6].includes(ct)) throw new Error('png format ' + depth + '/' + ct);
  const bpp = ct === 6 ? 4 : 3, stride = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const v = raw[src + x], a = x >= bpp ? px[dst + x - bpp] : 0, b = y ? px[dst - stride + x] : 0, c = x >= bpp && y ? px[dst - stride + x - bpp] : 0;
      let r;
      switch (f) { case 0: r = v; break; case 1: r = v + a; break; case 2: r = v + b; break; case 3: r = v + ((a + b) >> 1); break;
        default: { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); } }
      px[dst + x] = r & 255;
    }
  }
  return { w, h, bpp, px };
}
export function signature(png, cell = 8) {
  const { w, h, bpp, px } = decodePng(png), cols = Math.floor(w / cell), rows = Math.floor(h / cell), sig = new Uint8Array(cols * rows);
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    const i = ((cy * cell + (cell >> 1)) * w + cx * cell + (cell >> 1)) * bpp;
    sig[cy * cols + cx] = (px[i] * 3 + px[i + 1] * 6 + px[i + 2]) / 10;
  }
  return sig;
}
export function sigDiff(a, b) {
  if (!a || !b || a.length !== b.length) return 1;
  let n = 0; for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 14) n++;
  return n / a.length;
}

// How much of a core does a busy process actually get right now? (wall time / CPU time of a short spin; 1 = an idle machine)
export function contention(ms = 150) {
  const c0 = process.cpuUsage(), t0 = process.hrtime.bigint();
  let x = 1;
  while (Number(process.hrtime.bigint() - t0) / 1e6 < ms) for (let i = 0; i < 20000; i++) x = (x * 1.0000001 + i) % 1000003;
  const c = process.cpuUsage(c0), cpu = (c.user + c.system) / 1000, wall = Number(process.hrtime.bigint() - t0) / 1e6;
  return cpu > 1 ? Math.max(1, wall / cpu) : 1;
}

// The ground: a heightfield with a flat meadow in the middle, a bay to the east, a stream behind the
// farm, and hills at the edge. The same function bakes the water-depth texture, so shore foam and
// colour line up with the real banks.
import * as THREE from 'three';
import { SU, TERRAIN_VERT, TERRAIN_FRAG, WATER_VERT, WATER_FRAG } from './shaders.js';
import { fbm, vnoise, smooth, clamp, lerp } from '../util.js';

export const WATER_Y = -0.55;
export const EXTENT = 160;                    // terrain covers +-EXTENT
const STREAM = [[-58, -78], [-40, -58], [-26, -42], [-10, -33], [6, -30], [20, -27], [31, -21], [40, -16]];

function catmull(pts, n) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
export const STREAM_PTS = catmull(STREAM, 10);

function distToPolyline(x, z, pts) {
  let best = 1e9, bi = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1);
    const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
    if (d < best) { best = d; bi = i + t; }
  }
  return [best, bi];
}

// shoreline of the bay: x position where the ground meets the water, wobbling with z
export function shoreX(z) { return 31 + 3.2 * Math.sin(z * 0.11 + 1.3) + 2.0 * vnoise(z * 0.06, 4.1) + Math.max(0, (z - 8) * 0.28) - Math.max(0, (-z - 12) * 0.05); }

export function heightAt(x, z) {
  // meadow: nearly flat with a tiny roll so light catches it
  let h = (fbm(x * 0.05, z * 0.05, 2) - 0.5) * 0.22;
  const r = Math.max(Math.abs(x + 2), Math.abs(z - 2));
  // hills rise away from the meadow, most strongly to the west, north and south
  const away = smooth(clamp((r - 40) / 55, 0, 1));
  const west = smooth(clamp((-x - 26) / 40, 0, 1)), north = smooth(clamp((-z - 34) / 40, 0, 1)), south = smooth(clamp((z - 30) / 40, 0, 1));
  h += (away * 10 + west * 9 + north * 12 + south * 7) * (0.6 + 0.8 * fbm(x * 0.045 + 7, z * 0.045 + 3, 3));
  // bay to the east
  const sx = shoreX(z);
  if (x > sx - 4) { const d = x - sx; h = lerp(h, -0.05 - d * 0.16, smooth(clamp((x - (sx - 4)) / 6, 0, 1))); if (d > 0) h = Math.min(h, -0.05 - d * 0.16); }
  // stream behind the farm
  const [sd, si] = distToPolyline(x, z, STREAM_PTS);
  const sw = 2.4 + 0.5 * Math.sin(si * 0.3);
  if (sd < sw + 5) { const carve = 1 - smooth(clamp((sd - sw * 0.55) / (sw * 0.9 + 3), 0, 1)); h = lerp(h, WATER_Y - 0.7, carve * carve); }
  // the bay swallows everything far to the east
  if (x > 80) h = Math.min(h, -2.5);
  return h;
}

export function slopeAt(x, z) { const e = 0.6; return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e); }

export function buildTerrain(paintTex) {
  const N = 68;
  const pos = [], col = [], idx = [];
  const a = 0.2;
  const map = (u) => EXTENT * Math.sign(u) * (a * Math.abs(u) + (1 - a) * Math.pow(Math.abs(u), 3));
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const x = map((i / N) * 2 - 1), z = map((j / N) * 2 - 1);
    const h = heightAt(x, z);
    pos.push(x, h, z);
    const grass = clamp(fbm(x * 0.06 + 3, z * 0.06 - 5, 3) * 1.25 - 0.1, 0, 1);
    const sl = slopeAt(x, z);
    const rock = clamp((sl - 0.42) * 2.4 + (h - 9) * 0.06, 0, 1);
    const sx = (h - WATER_Y) / 0.5, sand = h < 0.6 ? clamp(1 - (sx - 0.15) / 0.85, 0, 1) : 0;
    col.push(grass, 0, rock, sand);
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a0 = j * (N + 1) + i, b = a0 + 1, c = a0 + N + 1, d = c + 1; idx.push(a0, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx); g.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    vertexShader: TERRAIN_VERT, fragmentShader: TERRAIN_FRAG, vertexColors: true,
    uniforms: Object.assign({}, SU, { uPaint: { value: paintTex } }),
  });
  const mesh = new THREE.Mesh(g, mat); mesh.name = 'terrain'; mesh.frustumCulled = false; mesh.renderOrder = -5;
  return mesh;
}

export function buildDepthTexture(res = 384) {
  const R = 4;   // height range the texture can hold (+-4)
  const data = new Uint8Array(res * res);
  for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
    const x = ((i + 0.5) / res * 2 - 1) * EXTENT, z = ((j + 0.5) / res * 2 - 1) * EXTENT;
    const h = clamp(heightAt(x, z), -R, R);
    data[j * res + i] = Math.round((h / R * 0.5 + 0.5) * 255);
  }
  const t = new THREE.DataTexture(data, res, res, THREE.RedFormat, THREE.UnsignedByteType);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; t.generateMipmaps = false;
  return { tex: t, range: R };
}

export function buildWater(depth, paintTex) {
  const geo = new THREE.PlaneGeometry(1400, 1400); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, transparent: true, depthWrite: false,
    uniforms: Object.assign({}, SU, { uDepth: { value: depth.tex }, uPaint: { value: paintTex }, uDepthRect: { value: new THREE.Vector4(-EXTENT, -EXTENT, EXTENT * 2, EXTENT * 2) }, uHRange: { value: depth.range }, uWaterY: { value: WATER_Y } }),
  });
  const m = new THREE.Mesh(geo, mat); m.name = 'water'; m.position.y = WATER_Y; m.frustumCulled = false; m.renderOrder = 2;
  // the shader compares WATER_Y with the ground; the mesh sits at WATER_Y but positions are world-space in the shader
  return m;
}

// A painted-looking noise texture used by terrain, water and clouds. R,G,B are different scales of noise.
export function makePaintTexture(size = 256) {
  const d = new Uint8Array(size * size * 4);
  const tile = (x, y, f, oct, seed) => {
    // tileable value noise via wrapping lattice
    let s = 0, amp = 0.5, fr = f, tot = 0;
    for (let o = 0; o < oct; o++) {
      const fx = x * fr, fy = y * fr, xi = Math.floor(fx), yi = Math.floor(fy), xf = fx - xi, yf = fy - yi;
      const w = fr | 0;
      const h = (ix, iy) => { ix = ((ix % w) + w) % w; iy = ((iy % w) + w) % w; let n = Math.imul(ix + seed * 17, 374761393) + Math.imul(iy + o * 131, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
      const u = smooth(xf), v = smooth(yf);
      s += amp * lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v); tot += amp;
      amp *= 0.5; fr *= 2;
    }
    return s / tot;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size, i = (y * size + x) * 4;
    d[i] = tile(u, v, 4, 4, 1) * 255;
    // G: fine strokes: elongated noise
    d[i + 1] = clamp(tile(u * 1.0, v * 1.0, 16, 2, 2) * 1.2 - 0.1, 0, 1) * 255;
    d[i + 2] = tile(u, v, 8, 3, 3) * 255;
    d[i + 3] = 255;
  }
  const t = new THREE.DataTexture(d, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}

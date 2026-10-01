import * as THREE from 'three';
globalThis.document = { createElement: () => ({ getContext: () => ({ createRadialGradient: () => ({ addColorStop() {} }), fillRect() {}, beginPath() {}, arc() {}, fill() {}, ellipse() {}, moveTo() {}, quadraticCurveTo() {}, closePath() {}, createLinearGradient: () => ({ addColorStop() {} }) }), width: 0, height: 0 }) };
const R = '../../js/';
const F = await import(R + 'gfx/flora.js');
const P = await import(R + 'gfx/plots.js');
const Pr = await import(R + 'gfx/props.js');
const T = await import(R + 'gfx/terrain.js');
const count = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
for (const k of ['round', 'oak', 'pine', 'blossom', 'orange', 'autumn']) for (const d of [1, 0]) { const g = F.makeTreeGeometry(k, 3, d); console.log('tree', k, d, count(g), Object.keys(g.attributes).join(',')); }
console.log('bush', count(F.makeBushGeometry(3)), 'rock', count(F.makeRockGeometry(2)));
let tot = 0; for (const c of ['wheat', 'corn', 'carrot', 'sunflower', 'tomato', 'strawberry', 'potato', 'blueberry', 'cotton', 'chili', 'sugarcane', 'grapes', 'pumpkin', 'watermelon', 'pineapple']) { const g = P.makeCropGeometry(c); tot += count(g); console.log('crop', c, count(g), Object.keys(g.attributes).join(',')); }
console.log('bed', count(P.makeBedGeometry()));
for (const n of ['fenceGeometry', 'postGeometry', 'signGeometry', 'boardGeometry', 'troughGeometry', 'scarecrowGeometry', 'benchGeometry', 'picnicGeometry', 'hiveGeometry', 'dockGeometry']) console.log(n, count(Pr[n]()));
console.log('lot', count(Pr.lotGeometry(7, 5)));
console.log('height', T.heightAt(0, 0), T.heightAt(40, 0), T.heightAt(-60, -60));

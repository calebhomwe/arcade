import assert from 'node:assert/strict';
import {Racer} from '../../SummitLine/js/physics.js';
import {AIDriver} from '../../SummitLine/js/ai.js';
const n={steer:0,tuck:false,brake:false,jump:false,grab:false,grabType:0,boost:false};
const a=new Racer(),b=new Racer();a.step(1/60,{...n,boost:true});b.step(1/60,n);assert.ok(a.speed>b.speed&&a.boost<.25,'Boost responds on its first physics tick');
for(const bad of [false,true]){const r=new Racer({s:30});r.vel.set(0,-1,-10);r.yaw=bad?Math.PI/2:0;r.pendingRail={name:'Rail',pts:500};r.landing();assert.equal(r.score,bad?0:500);assert.equal(r.pendingRail,null);assert.equal(r.crashT>0,bad);}
const fast=new Racer(),slow=new Racer();fast.reset(40,0,14);slow.reset(40,0,14);for(let i=0;i<30;i++){fast.step(1/60,n);slow.step(1/60,{...n,brake:true});}assert.ok(slow.speed<fast.speed,'Braking reduces speed');
const traces=[];
// Deterministic whole-course physics test without scenery colliders; browser fixtures also test with colliders.
for(const seed of [1,4,7]){const r=new Racer({s:3});const ai=new AIDriver(r,{seed,aggression:.6,style:.5});let crashes=0;for(let i=0;i<60*360&&!r.finished;i++){r.step(1/60,ai.input(1/60,r.s,true));crashes+=r.events.filter(e=>e.type==='crash').length;}assert.ok(r.finished&&r.s>=2000,'AI completes the 2 km course');assert.ok(r.score>0,'Landable tricks score during descent');traces.push({seed,time:r.time,score:r.score,crashes});}
console.log(JSON.stringify({status:'passed',checks:['immediate boost','clean rail landing scores','failed rail landing loses points','braking','three complete descents'],traces},null,2));

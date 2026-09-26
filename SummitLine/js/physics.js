// Board physics shared by the player and the rivals: slope-following carving,
// ollies, airtime with spins/flips/grabs, rail grinds, landings and crashes.
import * as THREE from 'three';
import { heightAt, normalAt, centerX, halfWidth, LENGTH, RUNOUT, RAILS, KICKERS } from './course.js';
import { clamp, lerp } from './noise.js';

const G = 9.81;
const _n = new THREE.Vector3(), _f = new THREE.Vector3(), _t = new THREE.Vector3(), _g = new THREE.Vector3();

const GRAB_NAMES = ['Indy', 'Melon', 'Method'];

function wrapPi(a) { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; }

export class Racer {
  constructor(opts = {}) {
    this.name = opts.name || 'YOU';
    this.isPlayer = !!opts.isPlayer;
    this.colliders = opts.colliders || null;
    this.rails = opts.rails || [];
    this.dragMul = opts.dragMul ?? 1;
    this.events = [];            // pushed {type, ...} for fx/ui/audio
    this.reset(opts.s ?? 2, opts.v ?? 0);
  }

  reset(s, v, speed = 0) {
    const x = centerX(s) + v, z = -s;
    this.pos = new THREE.Vector3(x, heightAt(x, z), z);
    this.yaw = Math.atan2(centerX(s + 3) - centerX(s), 3);
    this.vel = new THREE.Vector3(Math.sin(this.yaw), 0, -Math.cos(this.yaw)).multiplyScalar(speed);
    this.up = new THREE.Vector3(0, 1, 0);
    this.grounded = true;
    this.airTime = 0; this.spin = 0; this.spinVel = 0; this.flip = 0; this.flipVel = 0;
    this.grab = 0; this.grabType = 0; this.grabTime = 0; this.grabbed = new Set();
    this.lean = 0; this.edge = 0; this.charge = 0; this.jumpHeld = false;
    this.crashT = 0; this.invuln = 0; this.grind = null; this.grindTime = 0;
    this.boost = 0.25; this.boosting = false;
    this.score = 0; this.combo = 0; this.comboT = 0; this.lastTrick = null; this.pendingRail = null; this.bestTrick = null; this.bestTrickPts = 0;
    this.totalAir = 0; this.topSpeed = 0; this.finished = false; this.finishTime = 0; this.time = 0;
    this.s = s; this.v = v; this.land = 0; this.impact = 0;
    this.visualYaw = this.yaw; this.visualFlip = 0;
    this.brakeAmt = 0; this.tuck = 0;
    this.lastPos = this.pos.clone();
  }

  get speed() { return this.vel.length(); }

  // input: {steer, tuck, brake, jump, grab, grabType, boost}
  step(dt, inp) {
    this.events.length = 0;
    this.time += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    this.lastPos.copy(this.pos);
    this.boosting = !!(inp.boost && this.boost > 0.02 && !this.finished && this.crashT <= 0);
    if (this.boosting) this.boost = Math.max(0, this.boost - dt * 0.28);
    if (this.crashT > 0) return this.stepCrash(dt);
    if (this.grind) return this.stepGrind(dt, inp);
    if (this.grounded) this.stepGround(dt, inp); else this.stepAir(dt, inp);
    this.s = -this.pos.z; this.v = this.pos.x - centerX(this.s);
    const sp = this.speed; if (sp > this.topSpeed) this.topSpeed = sp;
    this.checkColliders();
    if (!this.finished && this.s >= LENGTH) { this.finished = true; this.finishTime = this.time; this.events.push({ type: 'finish' }); }
  }

  noseDir(out = _f) { return out.set(Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }

  stepGround(dt, inp) {
    const n = normalAt(this.pos.x, this.pos.z, _n, 0.5);
    this.up.lerp(n, 1 - Math.exp(-dt * 14)).normalize();
    const sp = this.speed;
    const steer = clamp(inp.steer, -1, 1);
    this.tuck = lerp(this.tuck, inp.tuck ? 1 : 0, 1 - Math.exp(-dt * 6));
    this.brakeAmt = lerp(this.brakeAmt, inp.brake ? 1 : 0, 1 - Math.exp(-dt * 8));
    // carving: turn rate falls off with speed (bigger radius when fast)
    const turn = steer * lerp(2.3, 1.05, clamp(sp / 32, 0, 1)) * (1 - this.tuck * 0.35) * (1 + this.brakeAmt * 0.6);
    this.yaw += turn * dt;
    this.edge = lerp(this.edge, steer, 1 - Math.exp(-dt * 7));
    // tangent frame
    const nose = this.noseDir(_f);
    nose.addScaledVector(n, -nose.dot(n)).normalize();
    // gravity along the slope
    _g.set(0, -G, 0);
    _g.addScaledVector(n, -_g.dot(n));
    this.vel.addScaledVector(n, -this.vel.dot(n));
    this.vel.addScaledVector(_g, dt);
    // edge grip: kill lateral slip (skidding when braking)
    const vf = this.vel.dot(nose);
    _t.copy(this.vel).addScaledVector(nose, -vf);
    const grip = this.brakeAmt > 0.3 ? 2.2 : 7.5;
    _t.multiplyScalar(Math.exp(-grip * dt));
    // riding switch is fine: keep the sign of vf
    this.vel.copy(nose).multiplyScalar(vf).add(_t);
    // friction and drag
    const k = lerp(0.0046, 0.0031, this.tuck) * this.dragMul + this.brakeAmt * 0.02;
    const drag = k * sp * sp + 0.035 * G * n.y + this.brakeAmt * 4.5 + Math.abs(steer) * 0.4;
    if (sp > 0.01) this.vel.multiplyScalar(Math.max(0, sp - drag * dt) / sp);
    if (this.boosting) this.vel.addScaledVector(nose, (vf >= 0 ? 1 : -1) * 8.5 * dt);
    // push off at the start / after a crash so the rider never stalls
    if (sp < 3 && !this.finished) this.vel.addScaledVector(nose, 3.2 * dt);
    // ollie: hold to load, release to pop
    if (inp.jump) { this.charge = Math.min(1, this.charge + dt * 2.2); this.jumpHeld = true; }
    else if (this.jumpHeld) {
      this.jumpHeld = false;
      this.vel.addScaledVector(n, 3.4 + this.charge * 3.2);
      this.pos.addScaledVector(n, 0.05);
      this.takeoff();
      this.events.push({ type: 'ollie', power: this.charge });
      this.charge = 0;
      return;
    }
    if (!inp.jump) this.charge = Math.max(0, this.charge - dt * 3);
    // integrate + stick to the ground unless the terrain falls away (kicker lips)
    this.pos.addScaledVector(this.vel, dt);
    // kicker lips: launch along the lip angle (the lip is too sharp for the
    // ground sampler to catch reliably at speed)
    const s0 = -this.lastPos.z, s1 = -this.pos.z;
    for (const k of KICKERS) {
      if (s0 < k.s - 0.2 && s1 >= k.s - 0.2 && Math.abs(this.pos.x - centerX(s1) - k.v) < k.w - 0.8 && sp > 6) {
        const hv = _t.set(this.vel.x, 0, this.vel.z).normalize();
        const ang = (12 + k.h * 1.2) * Math.PI / 180;
        const out = Math.min(sp, 34) * 0.94;
        this.vel.set(hv.x * Math.cos(ang) * out, Math.sin(ang) * out, hv.z * Math.cos(ang) * out);
        this.pos.y = heightAt(this.pos.x, this.pos.z) + 0.05;
        this.takeoff();
        this.events.push({ type: 'launch', kicker: true });
        return;
      }
    }
    const h = heightAt(this.pos.x, this.pos.z);
    const gap = this.pos.y - h;
    const thresh = 0.25 + sp * 0.01;
    if (gap > thresh && this.vel.y > -sp * 0.35) {
      this.takeoff();
      this.events.push({ type: 'launch' });
    } else {
      this.pos.y = h;
    }
    // soft boundary far off-piste
    const v = this.pos.x - centerX(-this.pos.z), W = halfWidth(-this.pos.z);
    if (Math.abs(v) > W + 110) this.vel.x -= Math.sign(v) * 6 * dt;
    this.land = Math.max(0, this.land - dt * 3);
    this.tryRail(false);
    this.lean = lerp(this.lean, this.edge * clamp(sp / 18, 0.25, 1), 1 - Math.exp(-dt * 8));
  }

  takeoff() {
    this.grounded = false; this.airTime = 0; this.spin = 0; this.flip = 0; this.spinVel = 0; this.flipVel = 0;
    this.grab = 0; this.grabTime = 0; this.grabbed = new Set();
    this.takeoffYaw = this.yaw;
  }

  stepAir(dt, inp) {
    this.airTime += dt; this.totalAir += dt;
    this.vel.y -= G * dt;
    // Limited air steering adjusts the landing line without teleporting the rider.
    this.vel.x += clamp(inp.steer, -1, 1) * 2.2 * dt;
    const sp = this.speed;
    this.vel.multiplyScalar(1 - 0.0016 * sp * dt);
    const h = heightAt(this.pos.x, this.pos.z);
    const height = this.pos.y - h;
    const steer = clamp(inp.steer, -1, 1);
    // spin and flip input (auto-settles near the ground to help landings)
    const targetSpin = steer * 6.6;
    this.spinVel = lerp(this.spinVel, targetSpin, 1 - Math.exp(-dt * 7));
    let flipIn = (inp.tuck ? 1 : 0) - (inp.brake ? 1 : 0);
    if (this.airTime < 0.12) flipIn = 0;
    this.flipVel = lerp(this.flipVel, flipIn * 5.8, 1 - Math.exp(-dt * 5));
    const lowAndFalling = this.vel.y < 0 && height < Math.max(2, -this.vel.y * 0.75);
    if (lowAndFalling && Math.abs(steer) < 0.5) {
      // settle to the nearest landable orientation
      const vy = Math.atan2(this.vel.x, -this.vel.z);
      const d0 = wrapPi(this.yaw - vy), d1 = wrapPi(this.yaw - vy - Math.PI);
      const d = Math.abs(d0) < Math.abs(d1) ? d0 : d1;
      this.spinVel = lerp(this.spinVel, -d * 9, 1 - Math.exp(-dt * 14));
    }
    if (lowAndFalling && flipIn === 0) {
      const fr = wrapPi(this.flip);
      this.flipVel = lerp(this.flipVel, -fr * 6, 1 - Math.exp(-dt * 10));
    }
    this.yaw += this.spinVel * dt; this.spin += this.spinVel * dt;
    this.flip += this.flipVel * dt;
    // grabs
    if (inp.grab && this.airTime > 0.1) {
      if (this.grab < 0.05) { this.grabType = inp.grabType ?? this.grabType; }
      this.grab = Math.min(1, this.grab + dt * 6);
      if (this.grab > 0.7) { this.grabTime += dt; this.grabbed.add(this.grabType); }
    } else this.grab = Math.max(0, this.grab - dt * 7);
    this.up.lerp(_t.set(0, 1, 0), 1 - Math.exp(-dt * 3)).normalize();
    this.pos.addScaledVector(this.vel, dt);
    this.lean = lerp(this.lean, 0, 1 - Math.exp(-dt * 4));
    if (this.tryRail(true)) return;
    const h2 = heightAt(this.pos.x, this.pos.z);
    if (this.pos.y <= h2) { this.pos.y = h2; this.landing(); }
  }

  landing() {
    const n = normalAt(this.pos.x, this.pos.z, _n, 0.5);
    const vn = -this.vel.dot(n);
    const vyaw = Math.atan2(this.vel.x, -this.vel.z);
    const d0 = Math.abs(wrapPi(this.yaw - vyaw)), d1 = Math.abs(wrapPi(this.yaw - vyaw - Math.PI));
    const misalign = Math.min(d0, d1);
    const flipErr = Math.abs(wrapPi(this.flip));
    this.grounded = true;
    this.up.copy(n);
    this.impact = clamp(vn / 10, 0, 1.5);
    this.land = 1;
    const wasGrabbing = this.grab > 0.55;
    if (misalign > 0.62 || flipErr > 0.75 || vn > 21) {
      this.crash(misalign > 0.62 ? 'Caught an edge' : flipErr > 0.75 ? 'Over-rotated' : 'Flat landing');
      return;
    }
    // snap the nose to travel (or switch) direction
    if (d1 < d0) this.yaw = vyaw + Math.PI; else this.yaw = vyaw;
    this.vel.addScaledVector(n, -this.vel.dot(n));
    if (this.airTime > 0.35) this.vel.multiplyScalar(wasGrabbing ? 0.85 : 0.97);
    this.scoreAir(wasGrabbing, misalign);
    if(this.pendingRail){this.awardTrick(this.pendingRail.name,this.pendingRail.pts,wasGrabbing?"Sketchy":"Stomped");this.pendingRail=null;}
    this.events.push({ type: 'land', impact: this.impact, air: this.airTime });
    this.flip = 0; this.spin = 0;
  }

  scoreAir(sketchy, misalign) {
    const air = this.airTime;
    const spinDeg = Math.round(Math.abs(this.spin) / Math.PI) * 180;
    const flips = Math.round(Math.abs(this.flip) / (Math.PI * 2));
    const parts = []; let pts = 0;
    if (spinDeg >= 180) {
      const dir = (this.spin > 0) ? 'FS' : 'BS';
      parts.push(`${dir} ${spinDeg}`);
      pts += { 180: 120, 360: 280, 540: 480, 720: 750, 900: 1050, 1080: 1450, 1260: 1900, 1440: 2400 }[Math.min(spinDeg, 1440)] || 2400;
    }
    if (flips > 0) {
      const back = this.flip < 0;
      parts.push((flips > 1 ? (flips === 2 ? 'Double ' : 'Triple ') : '') + (back ? 'Backflip' : 'Frontflip'));
      pts += 650 * flips * (flips > 1 ? 1.4 : 1);
    }
    if (this.grabbed.size) {
      const names = [...this.grabbed].map(i => GRAB_NAMES[i]);
      parts.push((this.grabTime > 0.7 ? 'Tweaked ' : '') + names.join(' to '));
      pts += 180 * names.length + 420 * Math.min(this.grabTime, 2);
    }
    if (air > 1.25 && parts.length === 0) { parts.push('Big Air'); pts += Math.round(air * 90); }
    else if (air > 0.9) pts += Math.round(air * 70);
    if (!parts.length) return;
    if (sketchy) pts *= 0.5;
    this.awardTrick(parts.join(' '), pts, sketchy ? 'Sketchy' : (misalign < 0.12 ? 'Stomped' : null));
  }

  awardTrick(name, pts, tag) {
    this.combo = this.comboT > 0 ? this.combo + 1 : 1;
    this.comboT = 3.5;
    const mult = Math.min(5, this.combo);
    pts = Math.round(pts * mult / 10) * 10;
    this.score += pts;
    this.boost = Math.min(1, this.boost + pts / 2600);
    if (pts > this.bestTrickPts) { this.bestTrickPts = pts; this.bestTrick = name; }
    this.lastTrick = name;
    this.events.push({ type: 'trick', name, pts, mult, tag });
  }

  crash(reason) {
    this.crashT = 2.3; this.grind = null;
    this.events.push({ type: 'crash', reason });
    this.combo = 0; this.comboT = 0; this.pendingRail=null;
    this.grab = 0; this.charge = 0;
    this.crashVel = this.vel.clone().multiplyScalar(0.55);
  }

  stepCrash(dt) {
    this.crashT -= dt;
    this.crashVel.multiplyScalar(Math.exp(-dt * 1.6));
    this.pos.addScaledVector(this.crashVel, dt);
    this.pos.y = heightAt(this.pos.x, this.pos.z);
    this.vel.copy(this.crashVel);
    this.visualFlip += dt * 9 * Math.max(0, this.crashT - 1.2);
    if (this.crashT <= 0) {
      // respawn on the piste, a little further down, pointing down the fall line
      const s = Math.min(LENGTH - 5, -this.pos.z + 4);
      const v = clamp(this.pos.x - centerX(s), -halfWidth(s) + 6, halfWidth(s) - 6);
      const keep = { score: this.score, boost: this.boost, time: this.time, totalAir: this.totalAir, topSpeed: this.topSpeed, bestTrick: this.bestTrick, bestTrickPts: this.bestTrickPts, finished: this.finished, finishTime: this.finishTime };
      this.reset(s, v, 9);
      Object.assign(this, keep);
      this.invuln = 1.6;
      this.events.push({ type: 'respawn' });
    }
  }

  // --- rails ---------------------------------------------------------------
  tryRail(airborne) {
    for (const r of this.rails) {
      const ab = _t.subVectors(r.b, r.a);
      const L2 = ab.lengthSq();
      const ap = _g.subVectors(this.pos, r.a);
      let t = ap.dot(ab) / L2;
      if (t < 0.02 || t > 0.9) continue;
      const cx = r.a.x + ab.x * t, cy = r.a.y + ab.y * t, cz = r.a.z + ab.z * t;
      const dh = Math.hypot(this.pos.x - cx, this.pos.z - cz);
      if (dh > 0.85) continue;
      const dy = this.pos.y - cy;
      if (dy < -0.95 || dy > 1.2) continue;
      if (airborne && this.vel.y > 2) continue;
      const dir = ab.clone().normalize();
      const along = this.vel.dot(dir);
      if (along < 4) continue;
      this.grind = { rail: r, t, dir, speed: along };
      this.grounded = false; this.grindTime = 0;
      this.pos.set(cx, cy, cz);
      this.spin = 0; this.flip = 0; this.grab = 0;
      // board sideways on the rail (boardslide)
      this.grindYaw = Math.atan2(dir.x, -dir.z) + Math.PI / 2;
      this.events.push({ type: 'grindStart' });
      return true;
    }
    return false;
  }

  stepGrind(dt, inp) {
    const g = this.grind;
    g.speed = Math.max(5, g.speed - 1.2 * dt + g.dir.y * -G * dt);
    g.t += g.speed * dt / g.rail.len;
    this.grindTime += dt;
    this.pos.copy(g.rail.a).lerp(g.rail.b, Math.min(1, g.t));
    this.vel.copy(g.dir).multiplyScalar(g.speed);
    this.yaw = lerp(this.yaw, this.grindYaw, 1 - Math.exp(-dt * 16));
    this.up.set(0, 1, 0);
    this.s = -this.pos.z; this.v = this.pos.x - centerX(this.s);
    this.lean = Math.sin(this.time * 7) * 0.15 + clamp(inp.steer, -1, 1) * 0.2;
    if (g.t >= 1 || (inp.jump === false && this.jumpHeld)) {
      // pop off the end
      this.grind = null; this.jumpHeld = false;
      this.vel.y += 3.2;
      this.yaw = Math.atan2(this.vel.x, -this.vel.z);
      this.takeoff();
      const pts = Math.round(260 + this.grindTime * 520);
      this.pendingRail={name:this.grindTime > 1.4 ? '50-50 to Boardslide' : 'Boardslide',pts}; // Bank only after landing.
      this.events.push({ type: 'grindEnd' });
    }
    if (inp.jump) this.jumpHeld = true;
    this.checkColliders();
  }

  checkColliders() {
    if (this.invuln > 0 || !this.colliders || this.crashT > 0) return;
    const hit = this.colliders.query(this.pos.x, this.pos.z, this.pos.y);
    if (hit) {
      this.vel.multiplyScalar(0.2);
      this.crash(hit === 'rock' ? 'Hit a rock' : 'Hit a tree');
    }
  }
}

// Spatial hash for trunks and boulders near the run.
export class Colliders {
  constructor(trees, boulders) {
    this.cell = 8; this.map = new Map();
    for (const t of trees) this.add(t.x, t.z, t.r, 'tree', 99);
    for (const b of boulders) this.add(b.x, b.z, b.r * 0.9, 'rock', b.y + b.sc * 1.1);
  }
  add(x, z, r, kind, top) {
    const k = Math.floor(x / this.cell) + ',' + Math.floor(z / this.cell);
    if (!this.map.has(k)) this.map.set(k, []);
    this.map.get(k).push({ x, z, r, kind, top });
  }
  query(x, z, y) {
    const cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const l = this.map.get((cx + i) + ',' + (cz + j)); if (!l) continue;
      for (const o of l) {
        const d = Math.hypot(o.x - x, o.z - z);
        if (d < o.r + 0.25 && y < o.top) return o.kind;
      }
    }
    return null;
  }
}


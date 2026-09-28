// Rival riders: follow a racing line with a steering controller, tuck on the
// straights, rubber-band gently against the player and throw tricks off kickers.
import { centerX, halfWidth, KICKERS, RAILS, heightAt } from './course.js';
import { clamp, makeRng } from './noise.js';

export class AIDriver {
  constructor(racer, { seed = 1, aggression = 0.5, style = 0.5 } = {}) {
    this.r = racer; this.rng = makeRng(seed); this.seed = seed;
    this.aggr = aggression; this.style = style;
    this.air = null; this.boostT = 0;
  }
  line(s) {
    for (const k of KICKERS) if (s > k.s - 70 && s < k.s + 8) return k.v;
    const W = halfWidth(s);
    let v = Math.sin(s / 95 + this.seed * 1.7) * (W - 9) * 0.55 + Math.sin(s / 37 + this.seed) * 3;
    for (const r of RAILS) if (s > r.s0 - 25 && s < r.s1 + 5 && Math.abs(v - r.v) < 3) v = r.v + (v > r.v ? 3 : -3);
    return clamp(v, -W + 6, W - 6);
  }
  input(dt, playerS, started) {
    const r = this.r;
    const inp = { steer: 0, tuck: false, brake: false, jump: false, grab: false, grabType: 0, boost: false };
    if (!started || r.finished) { if (r.finished) inp.brake = r.speed > 6; return inp; }
    if (r.grounded || r.grind) {
      this.air = null;
      const ahead = 10 + r.speed * 0.55;
      const s = r.s + ahead, v = this.line(s);
      const tx = centerX(s) + v, tz = -s;
      const want = Math.atan2(tx - r.pos.x, -(tz - r.pos.z));
      const head = r.speed > 2 ? Math.atan2(r.vel.x, -r.vel.z) : r.yaw;
      let d = want - head; d = Math.atan2(Math.sin(d), Math.cos(d));
      inp.steer = clamp(d * 2.6, -1, 1);
      inp.tuck = Math.abs(inp.steer) < 0.35;
      const gap = r.s - playerS;
      if (gap > 45 + 40 * this.aggr) inp.tuck = false;
      if (gap > 90) inp.brake = this.rng() < 0.3;
      this.boostT -= dt;
      if ((gap < -25 || this.rng() < 0.004 * this.aggr) && r.boost > 0.3) this.boostT = 1.2;
      inp.boost = this.boostT > 0;
    } else {
      if (!this.air) {
        const big = r.vel.y > 3;
        const roll = this.rng();
        this.air = { spin: big && roll < 0.35 + this.style * 0.4 ? (this.rng() < 0.5 ? -1 : 1) : 0, spinT: 0.55 + this.rng() * 0.45 * this.style, grab: this.rng() < 0.6, gt: Math.floor(this.rng() * 3), t: 0 };
      }
      this.air.t += dt;
      const height = r.pos.y - heightAt(r.pos.x, r.pos.z);
      const settle = r.vel.y < 0 && height < Math.max(2.5, -r.vel.y * 0.9);
      if (this.air.spin && this.air.t < this.air.spinT && !settle) inp.steer = this.air.spin;
      if (this.air.grab && this.air.t > 0.12 && !settle) { inp.grab = true; inp.grabType = this.air.gt; }
    }
    return inp;
  }
}


// Procedural audio (Web Audio): wind, edge carve hiss, skid, landings, rail
// grind, trick stingers, UI blips and a light electronic music bed.
export class Audio {
  constructor() {
    this.ctx = null; this.enabled = true; this.started = false;
    try { const v = localStorage.getItem('summitline.sound'); if (v === '0') this.enabled = false; } catch (e) { /* ignore */ }
  }
  start() {
    if (this.started) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.started = true;
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.enabled ? 0.9 : 0; this.master.connect(c.destination);
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.connect(this.master);
    // noise buffer
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
    this.noise = buf;
    const loop = (filterType, freq, q) => {
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true; src.loopStart = Math.random();
      const f = c.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.comp); src.start();
      return { f, g };
    };
    this.wind = loop('bandpass', 500, 0.6);
    this.carve = loop('highpass', 2200, 0.7);
    this.skid = loop('bandpass', 900, 1.2);
    this.grind = loop('bandpass', 2600, 12);
    this.grind2 = loop('bandpass', 3700, 16);
    this.boostN = loop('lowpass', 400, 1.0);
    this.music = new Music(c, this.comp);
  }
  setEnabled(on) {
    this.enabled = on;
    try { localStorage.setItem('summitline.sound', on ? '1' : '0'); } catch (e) { /* ignore */ }
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05);
  }
  // continuous layers driven every frame
  update(st) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, k = 0.06;
    const sp = st.speed || 0;
    this.wind.g.gain.setTargetAtTime(Math.min(0.5, 0.04 + sp * sp * 0.00045) * (st.air ? 1.2 : 1), t, k);
    this.wind.f.frequency.setTargetAtTime(300 + sp * 22, t, k);
    const carving = st.grounded && !st.grind ? Math.min(1, Math.abs(st.edge) * 0.8 + 0.25) * Math.min(1, sp / 12) : 0;
    this.carve.g.gain.setTargetAtTime(carving * 0.32, t, 0.04);
    this.carve.f.frequency.setTargetAtTime(1600 + Math.abs(st.edge) * 2600, t, k);
    this.skid.g.gain.setTargetAtTime(st.grounded ? st.brake * Math.min(1, sp / 8) * 0.5 : 0, t, 0.05);
    const gr = st.grind ? 0.22 : 0;
    this.grind.g.gain.setTargetAtTime(gr, t, 0.02); this.grind2.g.gain.setTargetAtTime(gr * 0.7, t, 0.02);
    this.boostN.g.gain.setTargetAtTime(st.boosting ? 0.35 : 0, t, 0.08);
    this.boostN.f.frequency.setTargetAtTime(st.boosting ? 1400 : 300, t, 0.2);
    if (this.music) this.music.tick(st.musicOn);
  }
  env(type, freq, dur, vol, slide) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.comp); o.start(t); o.stop(t + dur + 0.05);
  }
  burst(freq, q, dur, vol, type = 'lowpass') {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.comp); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  land(impact) { this.env('sine', 90, 0.25, 0.5 * Math.min(1, impact + 0.3), 40); this.burst(700, 0.8, 0.35, 0.5 * Math.min(1, impact + 0.4)); }
  ollie() { this.burst(1800, 1, 0.12, 0.25, 'bandpass'); this.env('sine', 160, 0.08, 0.15, 90); }
  crash() { this.burst(400, 0.7, 0.9, 0.8); this.env('sine', 70, 0.5, 0.6, 35); }
  trick(pts) {
    const notes = pts > 1200 ? [659, 784, 988, 1319] : pts > 500 ? [587, 740, 880] : [523, 659];
    notes.forEach((n, i) => setTimeout(() => { this.env('triangle', n, 0.35, 0.18); this.env('sine', n * 2, 0.25, 0.05); }, i * 70));
  }
  bad() { this.env('sawtooth', 220, 0.3, 0.12, 110); }
  beep(high) { this.env('square', high ? 1046 : 523, high ? 0.5 : 0.18, 0.12); }
  click() { this.env('triangle', 880, 0.06, 0.12, 1200); }
  whoosh() { this.burst(1200, 0.5, 0.5, 0.3, 'bandpass'); }
}

// Minimal 4-bar electronic loop (kick, hats, bass, pad) scheduled ahead of time.
class Music {
  constructor(ctx, out) {
    this.c = ctx; this.out = ctx.createGain(); this.out.gain.value = 0; this.out.connect(out);
    this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 5000; this.lp.connect(this.out);
    this.bpm = 112; this.next = 0; this.step = 0; this.on = false;
    this.chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 60], [55, 59, 62, 67]];
  }
  mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  tick(on) {
    const c = this.c;
    if (on !== this.on) { this.on = on; this.out.gain.setTargetAtTime(on ? 0.3 : 0, c.currentTime, 0.8); if (on && this.next < c.currentTime) this.next = c.currentTime + 0.05; }
    if (!on) return;
    const spb = 60 / this.bpm / 4;
    while (this.next < c.currentTime + 0.25) { this.play(this.step, this.next, spb); this.next += spb; this.step = (this.step + 1) % 64; }
  }
  play(step, t, spb) {
    const c = this.c, bar = Math.floor(step / 16), s = step % 16;
    const chord = this.chords[bar];
    if (s % 4 === 0) { // kick
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); g.connect(this.lp); o.start(t); o.stop(t + 0.32);
    }
    if (s % 2 === 1 || s % 4 === 2) { // hats
      const src = c.createBufferSource(); src.buffer = this.hatBuf || (this.hatBuf = this.mkNoise());
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = c.createGain(); const v = s % 4 === 2 ? 0.16 : 0.07;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      src.connect(f); f.connect(g); g.connect(this.lp); src.start(t); src.stop(t + 0.06);
    }
    if ([0, 3, 6, 10, 12, 14].includes(s)) { // bass
      const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = this.mtof(chord[0] - 24 + (s === 14 ? 7 : 0));
      f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + spb * 1.8);
      g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.001, t + spb * 1.9);
      o.connect(f); f.connect(g); g.connect(this.lp); o.start(t); o.stop(t + spb * 2);
    }
    if (s === 0) { // pad
      for (const m of chord) for (const det of [-6, 6]) {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle'; o.frequency.value = this.mtof(m); o.detune.value = det;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + 0.4); g.gain.linearRampToValueAtTime(0.0001, t + spb * 16);
        o.connect(g); g.connect(this.lp); o.start(t); o.stop(t + spb * 16 + 0.1);
      }
    }
  }
  mkNoise() { const c = this.c, b = c.createBuffer(1, c.sampleRate * 0.1, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
}


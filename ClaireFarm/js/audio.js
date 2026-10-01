// Sound: music through media elements with Web Audio gains (iPhone ignores element.volume), short
// effects and Claire's voice as decoded buffers. Nothing starts until the first tap.
const KIT = new Set(['tap', 'button', 'coin', 'collect', 'powerup', 'levelup', 'win', 'lose', 'hit', 'hurt', 'explode', 'jump', 'land', 'whoosh', 'pop', 'error', 'correct', 'tick', 'countdown', 'go', 'unlock', 'cheer', 'splash', 'place', 'swap', 'match', 'combo', 'reward', 'shoot', 'card']);
const OWN = new Set(['moo', 'cluck', 'oink', 'baa', 'bark', 'plant', 'harvest', 'ding', 'horn', 'bell', 'lantern', 'fireworks']);
const GAIN = { moo: 0.9, cluck: 0.8, oink: 0.8, baa: 0.8, bark: 0.8, plant: 0.9, harvest: 0.9, ding: 0.8, horn: 0.6, bell: 0.7, lantern: 0.8, fireworks: 0.6 };
const VOICE_GAIN = { claire_01: 1.38, claire_02: 1.799, claire_03: 1.531, claire_04: 1.047, claire_05: 1.334, claire_06: 1.365, claire_07: 1.66, claire_08: 1.259, claire_09: 1.148, claire_10: 1.549, claire_11: 1.531, claire_12: 1.318, claire_13: 1.778, claire_14: 1.514, claire_15: 1.096 };
const MUSIC = { theme: ['audio/music/claire_theme.mp3', 0.442], day: ['audio/music/golden_hour.mp3', 0.5], night: ['audio/music/lantern_night.mp3', 0.5] };

export class GameAudio {
  constructor(settings) {
    this.set = settings; this.ctx = null; this.buf = new Map(); this.loading = new Map(); this.started = false;
    this.music = {}; this.cur = null; this.lastVoice = -1e9; this.master = null; this.ambience = null;
    this.musicGain = null; this.sfxGain = null; this.voiceGain = null;
  }
  unlock() {
    if (this.started) { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    this.started = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC();
      this.musicGain = this.ctx.createGain(); this.sfxGain = this.ctx.createGain(); this.voiceGain = this.ctx.createGain(); this.ambGain = this.ctx.createGain();
      for (const g of [this.musicGain, this.sfxGain, this.voiceGain, this.ambGain]) g.connect(this.ctx.destination);
      this.applyVolumes();
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch (e) { this.ctx = null; }
    if (this.pending) { const p = this.pending; this.pending = null; this.playMusic(p); }
  }
  applyVolumes() {
    if (!this.ctx) return;
    const s = this.set;
    this.musicGain.gain.value = s.music; this.sfxGain.gain.value = s.sfx; this.voiceGain.gain.value = s.voice; this.ambGain.gain.value = Math.min(1, s.sfx * 0.7);
  }
  async load(url) {
    if (this.buf.has(url)) return this.buf.get(url);
    if (this.loading.has(url)) return this.loading.get(url);
    const p = fetch(url).then((r) => { if (!r.ok) throw new Error(url); return r.arrayBuffer(); }).then((b) => new Promise((res, rej) => this.ctx.decodeAudioData(b, res, rej))).then((b) => { this.buf.set(url, b); return b; }).catch(() => { this.buf.set(url, null); return null; });
    this.loading.set(url, p); return p;
  }
  play(url, gainNode, gain = 1, rate = 1) {
    if (!this.ctx) return;
    this.load(url).then((b) => {
      if (!b || !this.ctx) return;
      const src = this.ctx.createBufferSource(), g = this.ctx.createGain(); src.buffer = b; src.playbackRate.value = rate; g.gain.value = gain;
      src.connect(g); g.connect(gainNode); src.start();
    });
  }
  sfx(name, o = {}) {
    if (!this.started) return;
    const rate = o.rate || (0.96 + Math.random() * 0.08);
    if (OWN.has(name)) this.play('audio/sfx/' + name + '.mp3', this.sfxGain, (GAIN[name] || 0.8) * (o.gain || 1), rate);
    else if (KIT.has(name) && window.ArcadeSDK) { try { window.ArcadeSDK.sfx(name, { volume: 0.7 * this.set.sfx * (o.gain || 1), rate }); } catch (e) {} }
  }
  voice(id, force) {
    if (!this.started || !this.ctx) return false;
    const now = performance.now();
    if (!force && now - this.lastVoice < 22000) return false;
    if (this.set.voice <= 0.01) return false;
    this.lastVoice = now; this.play('audio/voice/' + id + '.mp3', this.voiceGain, VOICE_GAIN[id] || 1); return true;
  }
  // music: three tracks, cross-faded
  playMusic(name) {
    if (!this.started || !this.ctx) { this.pending = name; return; }
    if (this.cur === name) return;
    const [url, base] = MUSIC[name];
    let m = this.music[name];
    if (!m) {
      const el = new Audio(url); el.loop = true; el.preload = 'auto'; el.crossOrigin = 'anonymous';
      let node = null, g = null;
      try { node = this.ctx.createMediaElementSource(el); g = this.ctx.createGain(); g.gain.value = 0; node.connect(g); g.connect(this.musicGain); } catch (e) { el.volume = 0; }
      m = this.music[name] = { el, g, base, level: 0 };
    }
    const prev = this.cur && this.music[this.cur]; this.cur = name;
    const p = m.el.play(); if (p && p.catch) p.catch(() => {});
    this.fade(m, base, 2.2); if (prev) { this.fade(prev, 0, 1.8, true); }
  }
  fade(m, to, secs, stop) {
    const t0 = performance.now(), from = m.level;
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / (secs * 1000)); m.level = from + (to - from) * k;
      if (m.g) m.g.gain.value = m.level; else m.el.volume = Math.max(0, Math.min(1, m.level));
      if (k < 1) requestAnimationFrame(step); else if (stop && m.level <= 0.001) m.el.pause();
    };
    step();
  }
  setAmbience(name) {
    if (!this.started || !this.ctx || this.ambName === name) return;
    this.ambName = name;
    if (this.ambSrc) { try { this.ambSrc.stop(); } catch (e) {} this.ambSrc = null; }
    if (!name) return;
    this.load('audio/sfx/' + name + '.mp3').then((b) => {
      if (!b || this.ambName !== name || !this.ctx) return;
      const src = this.ctx.createBufferSource(), g = this.ctx.createGain(); src.buffer = b; src.loop = true; g.gain.value = name === 'rain' ? 0.7 : 0.35; src.connect(g); g.connect(this.ambGain); src.start(); this.ambSrc = src;
    });
  }
}

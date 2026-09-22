export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
        this.initialized = true;
      }
    } catch (e) {
      console.warn('AudioContext initialization deferred:', e);
    }
  }

  resume() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.muted;
  }

  // Attack swing whoosh
  playSwing(pitch = 300) {
    if (this.muted || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.15);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Heavy martial arts hit impact
  playHit(isHeavy = false) {
    if (this.muted || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    // Sub-bass thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isHeavy ? 110 : 150, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + (isHeavy ? 0.25 : 0.14));

    gain.gain.setValueAtTime(isHeavy ? 0.8 : 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isHeavy ? 0.25 : 0.14));

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + (isHeavy ? 0.26 : 0.15));

    // Transient slap noise
    this.playNoiseSnap(t, isHeavy ? 0.08 : 0.04);
  }

  // Metallic sword clash
  playBladeClash() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const freqs = [1200, 1850, 2600, 3400];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f + (Math.random() * 80 - 40), t);

      const duration = 0.3 + i * 0.05;
      gain.gain.setValueAtTime(0.2 / (i + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + duration);
    });
  }

  // Shadow Mode activation boom & ethereal chime
  playShadowActivate() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    
    // Sub bass drop
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, t);
    sub.frequency.exponentialRampToValueAtTime(35, t + 0.8);
    subGain.gain.setValueAtTime(0.9, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(t);
    sub.stop(t + 0.9);

    // Ethereal cyan chord chime
    [440, 554.37, 659.25, 880].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + 0.1 + idx * 0.04);
      gain.gain.setValueAtTime(0.25, t + 0.1 + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + 0.1 + idx * 0.04);
      osc.stop(t + 1.25);
    });
  }

  // Match gong
  playGong() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    [130, 260, 390].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.4 / (idx + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 1.9);
    });
  }

  playNoiseSnap(startTime, duration) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(gain);
    gain.connect(this.masterGain);
    noise.start(startTime);
    noise.stop(startTime + duration);
  }
}

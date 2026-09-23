/**
 * MusicEngine
 * ===========
 * Procedural, adaptive background score synthesized live with WebAudio.
 * No audio assets — infinite, seamless, and it adapts to the fight.
 *
 * Themes (one per arena):
 *  - 'neon'  : dark synthwave for Neon Rain Alley (A minor, 104 BPM)
 *              detuned saw pads, sub bass, driving kick + hats, echoing arps
 *  - 'cliff' : taiko + pentatonic koto for Sunrise Cliff Dojo (92 BPM)
 *              don/ka taiko drums, plucked koto phrases, airy shakuhachi
 *              tones, temple bell
 *
 * Adaptive state (fed from SoundEngine.syncMusic every frame):
 *  - intensity 0..1 : layer density scales with the fight phase
 *                     (low during ROUND intro, full during FIGHT)
 *  - urgent         : final 10 seconds — denser drums, brighter filters
 *  - shadow         : Shadow Mode — low drones, noise swells, darker pads
 *
 * Sequencer: classic WebAudio look-ahead scheduler (40 ms tick, 180 ms
 * scheduling horizon) so timing is sample-accurate and immune to frame jitter.
 */

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

const THEMES = {
  neon: {
    bpm: 104,
    // 4-bar progression in A minor: Am — F — C — G
    bars: [
      { root: midi(45), pad: [57, 60, 64].map(midi), arp: [57, 60, 64, 69].map(midi) },
      { root: midi(41), pad: [53, 57, 60].map(midi), arp: [53, 57, 60, 65].map(midi) },
      { root: midi(48), pad: [60, 64, 67].map(midi), arp: [60, 64, 67, 72].map(midi) },
      { root: midi(43), pad: [55, 59, 62].map(midi), arp: [55, 59, 62, 67].map(midi) },
    ],
  },
  cliff: {
    bpm: 92,
    // A minor pentatonic koto phrases per bar: [16th-step, midi note]
    phrases: [
      [[0, 64], [3, 67], [6, 69], [8, 67], [11, 64]],
      [[0, 62], [3, 64], [6, 67], [8, 64], [11, 62], [14, 60]],
      [[0, 69], [3, 72], [6, 74], [8, 72], [11, 69], [14, 67]],
      [[0, 67], [3, 64], [6, 62], [8, 60], [14, 57]],
    ],
    shakuRoots: [57, 55, 57, 52].map(midi),
  },
};

export class MusicEngine {
  constructor(soundEngine) {
    this.se = soundEngine;
    this.ctx = null;
    this.bus = null;
    this.running = false;
    this.pending = false;
    this.theme = 'neon';
    this.step = 0;
    this.nextNoteTime = 0;
    this.intensity = 0;
    this.targetIntensity = 1;
    this.urgent = false;
    this.shadow = false;
    this.timer = null;
    this._nb = null;
  }

  /** Called once the AudioContext exists (first user gesture). */
  bind(ctx, musicBus) {
    this.ctx = ctx;
    this.bus = musicBus;

    // Echo send for synth arps (delay time re-synced to theme BPM on start)
    this.arpDelay = ctx.createDelay(1);
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.28;
    this.arpDelay.connect(fb);
    fb.connect(this.arpDelay);
    this.arpDelay.connect(wet);
    wet.connect(this.bus);

    this.timer = setInterval(() => this.tick(), 40);
    if (this.pending) {
      this.pending = false;
      this.start(this.theme);
    }
  }

  start(theme) {
    if (!THEMES[theme]) theme = 'neon';
    this.theme = theme;
    this.pending = true;
    if (!this.ctx) return;
    if (this.arpDelay) {
      this.arpDelay.delayTime.value = (60 / THEMES[theme].bpm / 4) * 3; // dotted-8th echo
    }
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.08;
    this.running = true;
    this.pending = false;
  }

  stop() {
    this.running = false;
  }

  tick() {
    if (!this.ctx || !this.running) return;
    if (this.se.muted) {
      this.nextNoteTime = this.ctx.currentTime + 0.05;
      return;
    }
    this.intensity += (this.targetIntensity - this.intensity) * 0.12;
    const stepDur = 60 / THEMES[this.theme].bpm / 4;
    while (this.nextNoteTime < this.ctx.currentTime + 0.18) {
      this.scheduleStep(this.step, this.nextNoteTime);
      this.step = (this.step + 1) % 64; // 4 bars of 16ths
      this.nextNoteTime += stepDur;
    }
  }

  scheduleStep(step, t) {
    const stepDur = 60 / THEMES[this.theme].bpm / 4;
    const bar = Math.floor(step / 16) % 4;
    if (this.theme === 'neon') this.scheduleNeon(step, bar, t, stepDur);
    else this.scheduleCliff(step, bar, t, stepDur);

    // Shadow Mode overlay: dark drone + rising swells, both themes
    if (this.shadow) {
      if (step % 16 === 0) this.drone(t, stepDur * 16);
      if (step % 16 === 0 && (bar === 1 || bar === 3)) this.swell(t, stepDur * 14);
    }
  }

  // ---------------------------------------------------------------- themes

  scheduleNeon(step, bar, t, stepDur) {
    const B = THEMES.neon;
    const s = step % 16;
    const I = this.intensity;
    const U = this.urgent;
    const chord = B.bars[bar];

    // Pads carry the harmony even at low intensity (intro mood)
    if (s === 0) {
      const cutoff = this.shadow ? 700 : U ? 2300 : 900 + 900 * I;
      this.pad(t, chord.pad, stepDur * 16 * 1.05, cutoff, 0.05);
    }

    // Sub bass, 8ths with octave bounce
    if (s % 2 === 0) {
      const up = s % 4 === 2;
      this.bassPluck(t, up ? chord.root * 2 : chord.root, stepDur * 1.8, 0.13 * Math.max(0.5, I));
    }

    if (I > 0.45) {
      // Four-on-the-floor kick, urgent adds a drive hit
      if (s === 0 || s === 4 || s === 8 || s === 12 || (U && s === 10)) {
        this.kick(t, s === 0 ? 1 : 0.8);
      }
      // Hats: 8ths, denser when hot
      if (s % 2 === 0) this.hat(t, false, s % 4 === 2 ? 0.45 : 0.25);
      else if (I > 0.8 || U) this.hat(t, false, 0.18);
      // Backbeat claps at high energy
      if (I > 0.8 && (s === 4 || s === 12)) this.clap(t, 0.7);
    }

    // Echoing 16th arps (the synthwave signature)
    if (I > 0.62) {
      const oct = U && Math.floor(s / 4) % 2 === 1 ? 2 : 1;
      this.arpNote(t, chord.arp[s % 4] * oct, 0.085);
    }
  }

  scheduleCliff(step, bar, t, stepDur) {
    const B = THEMES.cliff;
    const s = step % 16;
    const I = this.intensity;
    const U = this.urgent;

    // Shakuhachi breath tone floats through every bar
    if (s === 0) {
      this.shaku(t, B.shakuRoots[bar], stepDur * 16 * 1.1, 0.075 * Math.min(1, 0.55 + I));
    }

    // Koto phrase — always present, breathes harder with intensity
    for (const [st, m] of B.phrases[bar]) {
      if (st === s) this.koto(t, midi(m), 0.1 + 0.07 * I);
    }

    // Temple bell marks the long moves of the form
    if (I > 0.45 && s === 0 && (bar === 0 || bar === 2)) {
      this.bell(t, midi(76), 0.09);
    }

    // Taiko: "don" body + "ka" rim accents; urgent fills the bar
    if (I > 0.45) {
      const don = U ? [0, 4, 8, 12] : bar === 3 ? [0, 6, 8, 14] : [0, 8];
      if (don.includes(s)) this.taikoDon(t, s === 0 ? 1 : 0.85);
      const ka = U ? [2, 6, 10, 14] : [4, 12];
      if (ka.includes(s)) this.taikoKa(t, 0.55);
    }
  }

  // ------------------------------------------------------------- synthesis

  _noiseBuffer() {
    if (!this._nb) {
      const len = this.ctx.sampleRate;
      this._nb = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this._nb.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    return this._nb;
  }

  _adsrVol(g, t, vol, attack, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  kick(t, v = 1) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    this._adsrVol(g, t, 0.5 * v, 0.004, 0.26);
    osc.connect(g);
    g.connect(this.bus);
    osc.start(t);
    osc.stop(t + 0.28);
    // Beater click
    this.burst(t, 'bandpass', 1800, 1.2, 0.018, 0.12 * v);
  }

  clap(t, v = 1) {
    for (let i = 0; i < 3; i++) {
      this.burst(t + i * 0.011, 'bandpass', 1300, 0.9, 0.01, 0.2 * v);
    }
    this.burst(t + 0.033, 'bandpass', 1300, 0.9, 0.16, 0.22 * v);
  }

  hat(t, open, v) {
    this.burst(t, 'highpass', 8200, 0.7, open ? 0.18 : 0.035, 0.14 * v);
  }

  bassPluck(t, freq, dur, v) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    this._adsrVol(g, t, v, 0.006, dur);
    osc.connect(g);
    g.connect(this.bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  pad(t, freqs, dur, cutoff, volPerOsc) {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    // Slow filter bloom over the bar
    filter.frequency.linearRampToValueAtTime(cutoff * 1.25, t + dur * 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    filter.connect(g);
    g.connect(this.bus);
    for (const fq of freqs) {
      for (const det of [-7, 7]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(fq, t);
        osc.detune.setValueAtTime(det, t);
        const og = ctx.createGain();
        og.gain.value = volPerOsc;
        osc.connect(og);
        og.connect(filter);
        osc.start(t);
        osc.stop(t + dur + 0.05);
      }
    }
  }

  arpNote(t, freq, vol) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    this._adsrVol(g, t, vol, 0.005, 0.11);
    osc.connect(g);
    g.connect(this.bus);
    g.connect(this.arpDelay); // echo send
    osc.start(t);
    osc.stop(t + 0.13);
  }

  taikoDon(t, v = 1) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.22);
    this._adsrVol(g, t, 0.55 * v, 0.005, 0.35);
    osc.connect(g);
    g.connect(this.bus);
    osc.start(t);
    osc.stop(t + 0.38);
    this.burst(t, 'lowpass', 480, 0.8, 0.04, 0.16 * v); // skin thud
  }

  taikoKa(t, v = 1) {
    const ctx = this.ctx;
    this.burst(t, 'bandpass', 900, 1.4, 0.07, 0.2 * v);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(230, t);
    osc.frequency.exponentialRampToValueAtTime(95, t + 0.05);
    this._adsrVol(g, t, 0.14 * v, 0.003, 0.06);
    osc.connect(g);
    g.connect(this.bus);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  koto(t, freq, vol) {
    const ctx = this.ctx;
    // Body string: triangle with slight upward bend, quick pluck decay
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 1.03, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.02);
    this._adsrVol(g, t, vol, 0.004, 0.3);
    osc.connect(g);
    g.connect(this.bus);
    osc.start(t);
    osc.stop(t + 0.32);
    // Octave harmonic
    const h = ctx.createOscillator();
    const hg = ctx.createGain();
    h.type = 'sine';
    h.frequency.setValueAtTime(freq * 2, t);
    this._adsrVol(hg, t, vol * 0.35, 0.003, 0.18);
    h.connect(hg);
    hg.connect(this.bus);
    h.start(t);
    h.stop(t + 0.2);
    this.burst(t, 'bandpass', 2600, 2, 0.012, vol * 0.25); // pick snap
  }

  bell(t, freq, vol) {
    const ctx = this.ctx;
    const partials = [[1, 1], [2.76, 0.4], [5.4, 0.16]];
    for (const [ratio, amp] of partials) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * ratio, t);
      this._adsrVol(g, t, vol * amp, 0.004, 2.4);
      osc.connect(g);
      g.connect(this.bus);
      osc.start(t);
      osc.stop(t + 2.5);
    }
  }

  shaku(t, freq, dur, vol) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(5.2, t);
    lfoG.gain.setValueAtTime(9, t); // ~9 cents vibrato depth
    lfo.connect(lfoG);
    lfoG.connect(osc.detune);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.bus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }

  drone(t, dur) {
    const ctx = this.ctx;
    for (const fq of [55, 55.6, 110.3]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(fq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(this.bus);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
  }

  swell(t, dur) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(240, t);
    filter.frequency.exponentialRampToValueAtTime(2400, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.bus);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  /** Generic filtered noise burst used by percussion. */
  burst(t, type, freq, q, dur, vol) {
    if (vol <= 0.001) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer();
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = ctx.createGain();
    this._adsrVol(g, t, vol, 0.003, dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.bus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}

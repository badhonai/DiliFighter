import { MusicEngine } from './MusicEngine.js';

/**
 * SoundEngine
 * ===========
 * All game audio is synthesized live with WebAudio (zero asset downloads):
 *   - Combat/UI sound effects (this class's play* methods)
 *   - Adaptive procedural music (MusicEngine, polled via syncMusic)
 *
 * Signal chain:  SFX bus ─┐
 *                Music bus ┴→ master → compressor → destination
 * The compressor glues the mix and protects against clipping during
 * heavy moments (KO boom + music + impacts at once).
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterGain = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.compressor = null;
    this.initialized = false;
    this.music = new MusicEngine(this);

    // Music-only toggle (SFX stay on). Persisted across sessions.
    try {
      this.musicEnabled = localStorage.getItem('dilifighter_music') !== 'off';
    } catch (e) {
      this.musicEnabled = true;
    }

    // Register autoplay-unlock gestures IMMEDIATELY. They were previously
    // added inside init() — which is only reachable via resume(), which no
    // play* call could reach while ctx was still null => audio deadlocked
    // forever with zero sound. These listeners break the cycle: the first
    // tap/key anywhere initializes and resumes the AudioContext.
    const unlock = () => this.resume();
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
      window.addEventListener('keydown', unlock);
    }
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -18;
        this.compressor.knee.value = 12;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        this.compressor.connect(this.ctx.destination);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        this.masterGain.connect(this.compressor);

        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = 1.0;
        this.sfxBus.connect(this.masterGain);

        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = this.musicEnabled ? SoundEngine.MUSIC_LEVEL : 0;
        this.musicBus.connect(this.masterGain);

        this.initialized = true;
        this.music.bind(this.ctx, this.musicBus);
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
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime);
    }
    return this.muted;
  }

  /** Duck music while the pause menu is open (34% -> 4%). */
  setPaused(paused) {
    if (!this.musicBus || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
    const rest = this.musicEnabled ? SoundEngine.MUSIC_LEVEL : 0;
    this.musicBus.gain.linearRampToValueAtTime(paused ? 0.04 : rest, t + 0.25);
  }

  /** Music on/off (SFX unaffected). Returns the new state. */
  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    try {
      localStorage.setItem('dilifighter_music', this.musicEnabled ? 'on' : 'off');
    } catch (e) { /* private mode etc. — stay session-local */ }
    if (this.musicBus && this.ctx) {
      const t = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(t);
      this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
      this.musicBus.gain.linearRampToValueAtTime(
        this.musicEnabled ? SoundEngine.MUSIC_LEVEL : 0, t + 0.2
      );
    }
    return this.musicEnabled;
  }

  static MUSIC_LEVEL = 0.34;

  /** Polled from the game loop: drives the adaptive score. */
  syncMusic({ theme, intensity, urgent, shadow }) {
    if (!this.initialized) {
      this.music.pending = true;
      this.music.theme = theme;
      return;
    }
    this.music.targetIntensity = intensity;
    this.music.urgent = urgent;
    this.music.shadow = shadow;
    if (theme !== this.music.theme || !this.music.running) {
      this.music.start(theme);
    }
  }

  // ============================================================== COMBAT

  // Attack swing whoosh
  playSwing(pitch = 300) {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

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
    gain.connect(this.sfxBus);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Heavy martial arts hit impact
  playHit(isHeavy = false) {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

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
    gain.connect(this.sfxBus);

    osc.start(t);
    osc.stop(t + (isHeavy ? 0.26 : 0.15));

    // Transient slap noise
    this.playNoiseSnap(t, isHeavy ? 0.08 : 0.04);
  }

  // Metallic sword clash (blocks & blade-on-blade)
  playBladeClash() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

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
      gain.connect(this.sfxBus);

      osc.start(t);
      osc.stop(t + duration);
    });
  }

  // Shadow Mode activation boom & ethereal chime
  playShadowActivate() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

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
    subGain.connect(this.sfxBus);
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
      gain.connect(this.sfxBus);
      osc.start(t + 0.1 + idx * 0.04);
      osc.stop(t + 1.25);
    });
  }

  // Match gong (round start)
  playGong() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [130, 260, 390].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.4 / (idx + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(t);
      osc.stop(t + 1.9);
    });
  }

  // Cinematic K.O. impact: giant sub boom + crash + dark gong tail
  playKO() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Boom body
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(85, t);
    sub.frequency.exponentialRampToValueAtTime(22, t + 1.0);
    subGain.gain.setValueAtTime(1.0, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    sub.connect(subGain);
    subGain.connect(this.sfxBus);
    sub.start(t);
    sub.stop(t + 1.15);

    // Crash noise
    this.playSweptNoise(t, 'lowpass', 900, 0.5, 0.5, 300);

    // Dark gong tail
    [98, 196, 294].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + 0.06);
      gain.gain.setValueAtTime(0.3 / (idx + 1), t + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(t + 0.06);
      osc.stop(t + 2.3);
    });
  }

  // ====================================================== MOVEMENT / SFX

  // Jump: airy upward whoosh
  playJump() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.playSweptNoise(t, 'bandpass', 380, 0.16, 0.14, 1500, 1.2);
  }

  // Landing: soft ground thud
  playLand() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(82, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.11);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  // Ranged projectile launch: energy zap
  playRangedLaunch() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(820, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.14);
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.16);

    this.playSweptNoise(t, 'highpass', 2200, 0.1, 0.12, 4200, 0.8);
  }

  // Ranged projectile impact: burst + body
  playRangedImpact() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.16);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.18);

    this.playNoiseSnap(t, 0.12);
  }

  // Final 5 seconds countdown blip (higher on the very last second)
  playCountdownTick(isLast = false) {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(isLast ? 1400 : 980, t);
    gain.gain.setValueAtTime(isLast ? 0.2 : 0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // Shadow bar just filled: quick pentatonic shimmer
  playShadowReady() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [659.25, 783.99, 880].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);
      gain.gain.setValueAtTime(0.13, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.5);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.55);
    });
  }

  /**
   * Match victory: heroic fanfare. Timpani-driven brass stabs
   * (A — A — C#m turn) resolve into a sustained A-major chord with an
   * ascending sparkle and a gong tail. ~3s.
   */
  playVictory() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

    // Brass voice: 2 detuned saws through a lowpass, quick brass-y attack
    const brass = (freq, tt, dur, vol) => {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2100, tt);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(vol, tt + 0.03);
      g.gain.exponentialRampToValueAtTime(vol * 0.7, tt + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + dur);
      filter.connect(g);
      g.connect(this.sfxBus);
      for (const det of [-6, 6]) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, tt);
        osc.detune.setValueAtTime(det, tt);
        osc.connect(filter);
        osc.start(tt);
        osc.stop(tt + dur + 0.05);
      }
    };

    // Timpani accent: deep sine drop + skin thud
    const timp = (tt, vol) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(92, tt);
      osc.frequency.exponentialRampToValueAtTime(36, tt + 0.2);
      g.gain.setValueAtTime(vol, tt);
      g.gain.exponentialRampToValueAtTime(0.001, tt + 0.28);
      osc.connect(g);
      g.connect(this.sfxBus);
      osc.start(tt);
      osc.stop(tt + 0.3);
      this.playSweptNoise(tt, 'lowpass', 420, 0.05, 0.1 * vol, null, 0.7);
    };

    // Fanfare rhythm: stab — stab — higher stab — RESOLVE
    const A4 = midi(69), Cs5 = midi(73), E5 = midi(76), A5 = midi(81);
    const stab1 = [A4, E5];
    const stab2 = [A4, E5];
    const stab3 = [Cs5, A5];
    const resolve = [A4, Cs5, E5];

    [stab1, stab2, stab3].forEach((chord, i) => {
      const tt = t + i * 0.18;
      chord.forEach((f) => brass(f, tt, 0.22, 0.16));
      timp(tt, 0.5);
    });

    const tr = t + 0.62; // resolution moment
    resolve.forEach((f) => brass(f, tr, 1.7, 0.15));
    timp(tr, 0.75);

    // Ascending sparkle over the resolve (A major arpeggio doubling up)
    [81, 85, 88, 93].forEach((m, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(midi(m), tr + 0.08 + idx * 0.07);
      gain.gain.setValueAtTime(0.14, tr + 0.08 + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, tr + 0.08 + idx * 0.07 + 1.6);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(tr + 0.08 + idx * 0.07);
      osc.stop(tr + 0.08 + idx * 0.07 + 1.7);
    });

    // Gong tail seals it
    [130, 260, 390].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, tr);
      gain.gain.setValueAtTime(0.28 / (idx + 1), tr);
      gain.gain.exponentialRampToValueAtTime(0.0001, tr + 2.0);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(tr);
      osc.stop(tr + 2.1);
    });
  }

  // Match defeat: slow descending dark chords
  playDefeat() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [220, 174.61, 146.83].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.28);
      gain.gain.setValueAtTime(0.3, t + idx * 0.28);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.28 + 1.6);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(t + idx * 0.28);
      osc.stop(t + idx * 0.28 + 1.7);
    });
    this.playSweptNoise(t, 'lowpass', 500, 2.2, 0.12, 120, 0.6);
  }

  // Soft UI click for menus
  playUIClick() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1350, t);
    gain.gain.setValueAtTime(0.11, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // =============================================================== CORES

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
    gain.connect(this.sfxBus);
    noise.start(startTime);
    noise.stop(startTime + duration);
  }

  /**
   * Filtered noise sweep.
   *  - `endFreq` omitted  -> static filter frequency
   *  - `endFreq` present -> linear-ish sweep from `freq` to `endFreq`
   */
  playSweptNoise(startTime, type, freq, dur, vol, endFreq = null, q = 0.8) {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, startTime);
    if (endFreq) filter.frequency.exponentialRampToValueAtTime(endFreq, startTime + dur);

    const gain = this.ctx.createGain();
    // Lowpass-signature call used for the KO crash swaps (dur, vol) — normalize:
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(startTime);
    src.stop(startTime + dur + 0.02);
  }
}

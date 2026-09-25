/**
 * GraphicsQuality — player-selectable render quality (Settings -> Graphics).
 *
 * Live-switchable: the engine reads dprCap() on every resize, so applying a
 * preset takes effect immediately (next resize + the lobby forces one).
 * Persisted locally AND mirrored to the player's cloud settings.
 */
const KEY = 'df_graphics_quality';

const PRESETS = {
  low:    { label: 'LOW',    dpr: 1.0,  scale: 0.5 },
  medium: { label: 'MEDIUM', dpr: 1.5,  scale: 0.75 },
  high:   { label: 'HIGH',   dpr: 3.0,  scale: 1.0 }, // capped again by PerfFlags.MAX_DPR
};

function detectDefault() {
  try {
    const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    return coarse ? 'medium' : 'high';
  } catch { return 'high'; }
}

function load() {
  try {
    const v = localStorage.getItem(KEY);
    if (v && PRESETS[v]) return v;
  } catch { /* headless */ }
  return detectDefault();
}

export const GraphicsQuality = {
  current: load(),

  get preset() { return PRESETS[this.current]; },

  /** Effective device-pixel-ratio ceiling (engine multiplies by its own cap). */
  dprCap() { return PRESETS[this.current].dpr; },

  /** Particle emission multiplier. */
  particleScale() { return PRESETS[this.current].scale; },

  set(name, { persist = true } = {}) {
    if (!PRESETS[name]) return;
    this.current = name;
    if (!persist) return;
    try { localStorage.setItem(KEY, name); } catch { /* ignore */ }
  },

  all: () => Object.keys(PRESETS),
};

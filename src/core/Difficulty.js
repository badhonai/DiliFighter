/**
 * Difficulty — three presets, persisted, selectable from the pause menu.
 * easy is the default: the game should feel winnable on first contact.
 */
const KEY = 'df_difficulty';

const PRESETS = {
  easy: {
    label: 'EASY',
    decision: 0.5,      // seconds between AI decisions (bigger = slower brain)
    attackBias: 0.55,   // chance the AI attacks when it picks an option
    defendBias: 0.4,    // scales block/counter odds
    dashIn: 0.3,        // dash-in pressure frequency
    aiDamage: 0.6,      // damage the AI deals
    playerDamage: 1.3,  // damage the player deals
  },
  medium: {
    label: 'MEDIUM',
    decision: 0.28,
    attackBias: 1.0,
    defendBias: 1.0,
    dashIn: 1.0,
    aiDamage: 1.0,
    playerDamage: 1.0,
  },
  hard: {
    label: 'HARD',
    decision: 0.17,
    attackBias: 1.3,
    defendBias: 1.5,
    dashIn: 1.7,
    aiDamage: 1.25,
    playerDamage: 0.85,
  },
};

function load() {
  try {
    const v = localStorage.getItem(KEY);
    if (v && PRESETS[v]) return v;
  } catch { /* no storage (headless) */ }
  return 'easy';
}

export const Difficulty = {
  current: load(),
  get preset() { return PRESETS[this.current]; },
  set(name) {
    if (!PRESETS[name]) return;
    this.current = name;
    try { localStorage.setItem(KEY, name); } catch { /* ignore */ }
  },
  all: () => Object.keys(PRESETS),
};

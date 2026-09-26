/**
 * Campaign — level definitions and reward rules.
 * Pure data: the lobby, engine and save layer all read from here.
 * More levels = more difficulty: each trial tunes the opponent's brain
 * (speed, aggression, reads) on top of the base difficulty preset.
 */
export const CAMPAIGN = [
  { id: 1, name: 'FIRST CONTACT',   opp: 'TSUNAMI · APPRENTICE',    diff: 'easy',   arena: 0,
    desc: 'Tsunami tests your basics.', mods: {} },
  { id: 2, name: 'ROOFTOP RAIN',    opp: 'TSUNAMI · DUELIST',       diff: 'easy',   arena: 1,
    desc: 'Faster reads under the neon rain.', mods: { speed: 1.05, attackBias: 1.1 } },
  { id: 3, name: 'FORGE TRIAL',     opp: 'TSUNAMI · BLADEMASTER',   diff: 'medium', arena: 2,
    desc: 'A fair duel. No handicaps.', mods: { speed: 1.05 }, unlocksCharacter: 'tsunami' },
  { id: 4, name: 'SKY RUINS',       opp: 'TSUNAMI · COUNTERMASTER', diff: 'medium', arena: 3,
    desc: 'He counters what he sees.', mods: { speed: 1.08, defendBias: 1.3 } },
  { id: 5, name: 'HOLO RING',       opp: 'CRIMSON TSUNAMI',         diff: 'hard',   arena: 4,
    desc: 'Championship pace, no mercy.', mods: { speed: 1.1, attackBias: 1.12 } },
  { id: 6, name: 'DESERT CHAMPION', opp: 'TSUNAMI · CHAMPION',      diff: 'hard',   arena: 5,
    desc: 'The champion defends his belt.', mods: { speed: 1.12, attackBias: 1.15, defendBias: 1.1 } },
  { id: 7, name: 'VOID ASCENSION',  opp: 'SHADOW TSUNAMI',          diff: 'hard',   arena: 0,
    desc: 'A shadow with the storm inside.', mods: { speed: 1.15, attackBias: 1.22, decision: 0.85 } },
  { id: 8, name: 'THE STORM ITSELF', opp: 'TSUNAMI UNLEASHED',      diff: 'hard',   arena: 5,
    desc: 'Defeat the storm itself.', mods: { speed: 1.2, attackBias: 1.3, defendBias: 1.2, decision: 0.8, dashIn: 1.4 } },
];

/** Star rating from the player's remaining health on a win. */
export function starsForWin(playerHealthPct) {
  if (playerHealthPct >= 70) return 3;
  if (playerHealthPct >= 40) return 2;
  return 1;
}

export function coinsForStars(stars) {
  return 20 + stars * 15;
}

export const FIRST_CLEAR_BONUS = 50;
export const QUICK_MATCH_WIN_COINS = 10;

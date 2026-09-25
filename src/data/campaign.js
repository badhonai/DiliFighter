/**
 * Campaign — level definitions and reward rules.
 * Pure data: the lobby, engine and save layer all read from here.
 */
export const CAMPAIGN = [
  { id: 1, name: 'FIRST CONTACT',   desc: 'Tsunami tests your basics.',        diff: 'easy',   arena: 0 },
  { id: 2, name: 'ROOFTOP RAIN',    desc: 'Faster reads under the neon rain.', diff: 'easy',   arena: 1 },
  { id: 3, name: 'FORGE TRIAL',     desc: 'A fair duel. No handicaps.',        diff: 'medium', arena: 2 },
  { id: 4, name: 'SKY RUINS',       desc: 'Tsunami counters what he sees.',    diff: 'medium', arena: 3 },
  { id: 5, name: 'HOLO RING',       desc: 'Championship pace, no mercy.',      diff: 'hard',   arena: 4 },
  { id: 6, name: 'DESERT CHAMPION', desc: 'Defeat the storm itself.',          diff: 'hard',   arena: 5 },
];

/** First-clear trophies — one per level, displayed in the inventory. */
export const LEVEL_ITEMS = {
  1: { id: 'fist_wraps',   name: 'Bronze Fist Wraps',  rarity: 'common',    icon: 'punch',
       desc: 'Worn by every rookie who survives their first duel.' },
  2: { id: 'neon_headband', name: 'Neon Headband',      rarity: 'common',    icon: 'shadow',
       desc: 'Glows faintly in the rain. Tsunami hates it.' },
  3: { id: 'forge_charm',  name: 'Forge Charm',        rarity: 'rare',      icon: 'heavy',
       desc: 'Warm to the touch. Proof you walked out of the forge.' },
  4: { id: 'sky_feather',  name: 'Sky Palace Feather', rarity: 'rare',      icon: 'ranged',
       desc: 'Fallen from the ruins above the clouds.' },
  5: { id: 'holo_belt',    name: 'Holo Champion Belt', rarity: 'epic',      icon: 'kick',
       desc: 'The ring projects your name in light when you wear it.' },
  6: { id: 'storm_mask',   name: 'Mask of the Storm',  rarity: 'legendary', icon: 'block',
       desc: 'Taken from the champion. The storm bows to you now.' },
};

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

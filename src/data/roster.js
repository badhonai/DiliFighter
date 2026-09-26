/**
 * Roster — the character select data. Characters unlock through the
 * campaign; locked slots tease future fighters.
 */
export const ROSTER = [
  {
    id: 'dili',
    name: 'DILI',
    subtitle: 'THE BUBBLE-HELMET HERO',
    style: 'Balanced all-rounder — full speed, even damage.',
    portrait: 'characters/dili_portrait.jpg',
    accent: '#22d3ee',
    unlockLevel: 0, // always unlocked
  },
  {
    id: 'tsunami',
    name: 'TSUNAMI',
    subtitle: 'CRIMSON STORM SAMURAI',
    style: 'Heavyweight — +12% damage, slightly slower footwork.',
    portrait: 'characters/tsunami_portrait.jpg',
    accent: '#ef4444',
    unlockLevel: 3, // clear Level 3 (Forge Trial)
  },
  {
    id: 'lafaek',
    name: 'LAFAEK',
    subtitle: 'THE CROCODILE GUARDIAN',
    style: 'Slow titan — heaviest hits, thickest hide.',
    portrait: 'characters/lafaek_portrait.jpg',
    accent: '#22c55e',
    unlockLevel: 5, // clear Level 5 (Holo Ring)
  },
  {
    id: 'manu',
    name: 'MANU',
    subtitle: 'THE DAWN RUNNER',
    style: 'Fastest feet — quick slashes, light damage.',
    portrait: 'characters/manu_portrait.jpg',
    accent: '#facc15',
    unlockLevel: 7, // clear Level 7 (Void Ascension)
  },
  { id: 'locked1', name: '???', subtitle: 'NEW FIGHTER', style: 'Arrives in a future update.', portrait: 'brand/char_pink.png', accent: '#f472b6', comingSoon: true },
  { id: 'locked2', name: '???', subtitle: 'NEW FIGHTER', style: 'Arrives in a future update.', portrait: 'brand/char_orange.png', accent: '#fb923c', comingSoon: true },
];

export function characterById(id) {
  return ROSTER.find((c) => c.id === id && !c.comingSoon) || ROSTER[0];
}

/** Is a roster entry unlocked by this player's campaign progress? */
export function isUnlocked(char, starsOf) {
  if (char.comingSoon) return false;
  if (!char.unlockLevel) return true;
  return starsOf(char.unlockLevel) > 0;
}

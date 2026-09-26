/**
 * DB — player data service (profile, progress, settings, inventory).
 *
 * Every read is served from an in-memory + localStorage cache first and
 * refreshed from Supabase in the background, so the UI never waits on the
 * network. Writes go to both: instant locally, eventually to the cloud.
 */
import { getSupabase } from './cloud.js';
import { CAMPAIGN, starsForWin, coinsForStars, FIRST_CLEAR_BONUS, QUICK_MATCH_WIN_COINS } from '../data/campaign.js';

const CACHE_KEY = 'df_cloud_cache_v1';

const DEFAULTS = {
  profile: { username: null, nickname: null, is_guest: true, matches: 0, wins: 0, losses: 0, coins: 0 },
  progress: { highest_level: 1, stars: {} },
  settings: {},
};

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fresh device */ }
  return null;
}

export const DB = {
  userId: null,
  data: loadCache() || structuredClone(DEFAULTS),
  listeners: [],

  onChange(fn) {
    this.listeners.push(fn);
  },

  _emit() {
    for (const fn of this.listeners) {
      try { fn(this.data); } catch { /* UI error must not kill saving */ }
    }
  },

  _persist() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(this.data)); } catch { /* full/blocked */ }
    this._emit();
  },

  /** Called right after sign-in / session restore. */
  async bind(userId, fallbackUsername = null, fallbackIsGuest = null) {
    this.userId = userId;
    this.data = loadCache() || structuredClone(DEFAULTS);
    if (fallbackUsername && !this.data.profile.username) {
      this.data.profile.username = fallbackUsername;
    }
    if (fallbackIsGuest != null) this.data.profile.is_guest = !!fallbackIsGuest;
    this._persist();
    await this.refresh();
  },

  unbind() {
    this.userId = null;
    this.data = structuredClone(DEFAULTS);
    try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
    this._emit();
  },

  /** Pull the latest cloud state into the cache (background-safe). */
  async refresh() {
    if (!this.userId) return;
    try {
      const sb = await getSupabase();
      const uid = this.userId;

      const [prof, prog, settings] = await Promise.all([
        sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
        sb.from('player_progress').select('*').eq('user_id', uid).maybeSingle(),
        sb.from('user_settings').select('settings').eq('user_id', uid).maybeSingle(),
      ]);

      if (prof.data) {
        this.data.profile = {
          username: prof.data.username || this.data.profile.username,
          nickname: prof.data.nickname || null,
          is_guest: !!prof.data.is_guest,
          matches: prof.data.matches || 0,
          wins: prof.data.wins || 0,
          losses: prof.data.losses || 0,
          coins: prof.data.coins || 0,
        };
      }
      if (prog.data) {
        this.data.progress = {
          highest_level: prog.data.highest_level || 1,
          stars: prog.data.stars || {},
        };
      }
      if (settings.data && settings.data.settings) {
        this.data.settings = { ...this.data.settings, ...settings.data.settings };
      }

      // Self-heal: if the signup trigger never created our rows (setup SQL
      // run late, or account predates it), insert them now so sync works.
      if (!prof.data) {
        await sb.from('profiles').insert({
          id: uid,
          username: this.data.profile.username,
          is_guest: this.data.profile.is_guest,
          matches: this.data.profile.matches,
          wins: this.data.profile.wins,
          losses: this.data.profile.losses,
          coins: this.data.profile.coins,
        });
      }
      if (!prog.data) {
        await sb.from('player_progress').insert({
          user_id: uid,
          highest_level: this.data.progress.highest_level,
          stars: this.data.progress.stars,
        });
      }
      this._persist();
    } catch { /* offline — cache stays authoritative until next refresh */ }
  },

  displayName() {
    return this.data.profile.nickname || this.data.profile.username || 'Player';
  },

  // ---------------- profile ----------------

  async ensureUsername(name) {
    if (!this.userId || this.data.profile.username) return;
    this.data.profile.username = name;
    this._persist();
    try {
      const sb = await getSupabase();
      await sb.from('profiles').update({ username: name }).eq('id', this.userId);
    } catch { /* retry on next refresh */ }
  },

  // ---------------- settings ----------------

  setSetting(key, value) {
    this.data.settings[key] = value;
    this._persist();
    if (!this.userId) return;
    getSupabase()
      .then((sb) =>
        sb.from('user_settings')
          .upsert({ user_id: this.userId, settings: this.data.settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      )
      .catch(() => {});
  },

  // ---------------- match results ----------------

  /**
   * Record a finished match and pay out rewards.
   * @param {{levelId?:number, playerWon:boolean, playerHealthPct:number}} r
   * @returns {{coins:number, stars?:number, newItem?:object, unlockedNext:boolean}} reward summary
   */
  async reportMatch(r) {
    const p = this.data.profile;
    p.matches += 1;
    if (r.playerWon) p.wins += 1;
    else p.losses += 1;

    const reward = { coins: 0, unlockedNext: false };

    if (r.levelId && r.playerWon) {
      const stars = starsForWin(r.playerHealthPct);
      reward.stars = stars;
      const prevBest = this.data.progress.stars[r.levelId] || 0;
      this.data.progress.stars[r.levelId] = Math.max(prevBest, stars);
      const firstClear = prevBest === 0;
      if (firstClear) {
        reward.coins = coinsForStars(stars) + FIRST_CLEAR_BONUS;
        if (r.levelId >= this.data.progress.highest_level && r.levelId < CAMPAIGN.length) {
          this.data.progress.highest_level = r.levelId + 1;
          reward.unlockedNext = true;
        }
      } else {
        reward.coins = coinsForStars(stars);
      }
    } else if (r.playerWon) {
      reward.coins = QUICK_MATCH_WIN_COINS;
    }

    p.coins += reward.coins;
    this._persist();
    this._pushResults(r, reward);
    return reward;
  },

  async _pushResults(r, reward) {
    if (!this.userId) return;
    try {
      const sb = await getSupabase();
      const p = this.data.profile;
      await Promise.all([
        sb.from('profiles')
          .update({ matches: p.matches, wins: p.wins, losses: p.losses, coins: p.coins })
          .eq('id', this.userId),
        r.levelId
          ? sb.from('player_progress')
              .update({
                highest_level: this.data.progress.highest_level,
                stars: this.data.progress.stars,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', this.userId)
          : Promise.resolve(),
      ]);
    } catch { /* offline — local cache keeps the truth */ }
  },

  // ---------------- read helpers ----------------

  starsOf(levelId) {
    return this.data.progress.stars[levelId] || 0;
  },

  levelUnlocked(levelId) {
    return levelId <= this.data.progress.highest_level;
  },
};

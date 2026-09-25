/**
 * Social — friends, username search and the level leaderboard.
 * Reads go through security-definer RPCs (other players' public fields are
 * otherwise hidden by RLS); mutations hit the friendships table directly,
 * guarded by row-level security.
 */
import { getSupabase } from './cloud.js';

function err(res) {
  return res.error ? (res.error.message || 'Network error') : null;
}

export const Social = {
  /** Search by exact username (usernames are unique). */
  async searchPlayers(query) {
    const sb = await getSupabase();
    const res = await sb.rpc('search_players', { q: String(query || '').trim() });
    return { ok: !res.error, rows: res.data || [], error: err(res) };
  },

  /** Everyone connected to you: accepted friends + pending requests. */
  async friendList() {
    const sb = await getSupabase();
    const res = await sb.rpc('friend_list');
    return { ok: !res.error, rows: res.data || [], error: err(res) };
  },

  async leaderboard() {
    const sb = await getSupabase();
    const res = await sb.rpc('leaderboard');
    return { ok: !res.error, rows: res.data || [], error: err(res) };
  },

  async sendRequest(toUserId) {
    const sb = await getSupabase();
    const { data: session } = await sb.auth.getSession();
    if (!session.session) return { ok: false, error: 'Not signed in.' };
    const me = session.session.user.id;
    if (toUserId === me) return { ok: false, error: 'That is you.' };
    const res = await sb.from('friendships').insert({ requester: me, addressee: toUserId, status: 'pending' });
    if (res.error) {
      const m = res.error.message || '';
      if (m.includes('duplicate') || m.includes('23505')) return { ok: false, error: 'Request already sent.' };
      return { ok: false, error: 'Could not send request.' };
    }
    return { ok: true };
  },

  async acceptRequest(friendshipId) {
    const sb = await getSupabase();
    const res = await sb.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    return { ok: !res.error, error: err(res) };
  },

  /** Decline a pending request, or remove an existing friend. */
  async removeFriendship(friendshipId) {
    const sb = await getSupabase();
    const res = await sb.from('friendships').delete().eq('id', friendshipId);
    return { ok: !res.error, error: err(res) };
  },

  async setNickname(name) {
    const sb = await getSupabase();
    const { data: session } = await sb.auth.getSession();
    if (!session.session) return { ok: false, error: 'Not signed in.' };
    const clean = String(name || '').trim().slice(0, 16);
    if (clean.length < 2) return { ok: false, error: 'Nickname needs at least 2 characters.' };
    const res = await sb.from('profiles').update({ nickname: clean }).eq('id', session.session.user.id);
    return { ok: !res.error, error: err(res), nickname: clean };
  },
};

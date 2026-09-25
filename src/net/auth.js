/**
 * Auth — username + password sign-in (nothing else) and one-tap guest play.
 *
 * Supabase authenticates with email+password, so a username is mapped to a
 * synthetic mailbox on a domain we own:  bruce -> bruce@players.dilifighter.gg
 * No email is ever sent; the "Confirm email" setting must stay OFF.
 */
import { getSupabase } from './cloud.js';

const MAIL_DOMAIN = '@players.dilifighter.gg';
const USERNAME_RE = /^[a-z0-9_]{3,16}$/;

export function normalizeUsername(raw) {
  return String(raw || '').trim().toLowerCase();
}

export function validUsername(raw) {
  return USERNAME_RE.test(normalizeUsername(raw));
}

function friendlyAuthError(err) {
  const msg = (err && err.message || '').toLowerCase();
  if (msg.includes('already registered') || msg.includes('already exists'))
    return 'That username is taken — try another.';
  if (msg.includes('invalid login credentials'))
    return 'Wrong username or password.';
  if (msg.includes('at least 6 characters') || msg.includes('password'))
    return 'Password must be at least 6 characters.';
  if (msg.includes('email not confirmed'))
    return 'Sign-in is disabled on the server (email confirmation is still ON). Tell @DlicomApp to flip it in Supabase.';
  if (msg.includes('rate limit'))
    return 'Too many attempts — wait a moment and retry.';
  if (msg.includes('fetch') || msg.includes('network'))
    return 'No connection — check your internet and retry.';
  return err && err.message ? err.message : 'Something went wrong — try again.';
}

export const Auth = {
  async client() {
    return getSupabase();
  },

  /** @returns {{ok:boolean, error?:string, user?:object}} */
  async signUp(usernameRaw, password) {
    const username = normalizeUsername(usernameRaw);
    if (!validUsername(username))
      return { ok: false, error: 'Username: 3–16 letters, numbers or _ only.' };
    if (!password || password.length < 6)
      return { ok: false, error: 'Password must be at least 6 characters.' };
    try {
      const sb = await getSupabase();
      const { data, error } = await sb.auth.signUp({
        email: username + MAIL_DOMAIN,
        password,
        options: { data: { username, is_guest: false } },
      });
      if (error) return { ok: false, error: friendlyAuthError(error) };
      if (!data.session)
        return { ok: false, error: 'Account created, but the server still has "Confirm email" ON — the owner must turn it OFF in Supabase (Authentication → Email).' };
      return { ok: true, user: data.user };
    } catch (e) {
      return { ok: false, error: friendlyAuthError(e) };
    }
  },

  async signIn(usernameRaw, password) {
    const username = normalizeUsername(usernameRaw);
    if (!username || !password)
      return { ok: false, error: 'Enter your username and password.' };
    try {
      const sb = await getSupabase();
      const { data, error } = await sb.auth.signInWithPassword({
        email: username + MAIL_DOMAIN,
        password,
      });
      if (error) return { ok: false, error: friendlyAuthError(error) };
      return { ok: true, user: data.user };
    } catch (e) {
      return { ok: false, error: friendlyAuthError(e) };
    }
  },

  /** Instant play, no form. Guests still get full cloud progress. */
  async signInGuest() {
    try {
      const sb = await getSupabase();
      const { data, error } = await sb.auth.signInAnonymously({
        options: { data: { is_guest: true } },
      });
      if (error) return { ok: false, error: friendlyAuthError(error) };
      return { ok: true, user: data.user };
    } catch (e) {
      return { ok: false, error: friendlyAuthError(e) };
    }
  },

  async signOut() {
    try {
      const sb = await getSupabase();
      await sb.auth.signOut();
    } catch { /* offline — local session is dropped below anyway */ }
  },

  /** Restores a persisted session, if any. */
  async getSession() {
    try {
      const sb = await getSupabase();
      const { data } = await sb.auth.getSession();
      return data.session;
    } catch {
      return null;
    }
  },

  /** Username for UI display (falls back to the metadata, then "Player"). */
  usernameOf(user) {
    return (user && user.user_metadata && user.user_metadata.username) || null;
  },
};

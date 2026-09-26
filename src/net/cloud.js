/**
 * Cloud — lazy Supabase client.
 *
 * The @supabase/supabase-js bundle is dynamically imported ONLY when the
 * auth/lobby flow needs it, so the game boot path stays featherweight.
 * The anon key is public by design; row-level security (see
 * supabase_setup.sql) is what protects data.
 */
const SUPABASE_URL = 'https://pvcucgqbuwnfejvccwbd.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2Y3VjZ3FidXduZmVqdmNjd2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMzExODksImV4cCI6MjEwNTkwNzE4OX0.WmtyIcYWmtBYwBUnaz9BdiYYl8xX3sIHxdlGXd2ltEY';

let clientPromise = null;

/** @returns {Promise<import('@supabase/supabase-js').SupabaseClient>} */
export function getSupabase() {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storageKey: 'df_auth',
        },
      })
    );
  }
  return clientPromise;
}

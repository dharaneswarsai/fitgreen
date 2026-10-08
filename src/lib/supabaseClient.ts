// ===========================================================
// Optional Supabase connection
//
// Returns `null` unless both keys are configured, which makes
// the whole data layer fall back to the local demo datastore.
// No secret is ever referenced outside this file.
//
// To activate: run supabase/schema.sql in the SQL Editor, then
// fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
// ===========================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

if (url && anonKey) {
  try {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: { 'x-schema': 'gym' },
      },
    });
  } catch (err) {
    console.warn('[fitgreen] Supabase init failed, using local demo store:', err);
    client = null;
  }
}

/** True when the app is talking to live Postgres rather than the demo store. */
export const isSupabaseConfigured = client !== null;

export const SCHEMA = 'gym';

export default client;

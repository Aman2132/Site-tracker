// Hermes/RN's URL implementation is incomplete — supabase-js needs this
// polyfilled before the client is created. Must run before the createClient
// call below, so it stays at the top of this file rather than in App.tsx.
import 'react-native-url-polyfill/auto';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_CONFIG } from '@/constants/config';

/**
 * Supabase is used only for Storage (photo files) — Firebase Storage
 * started requiring a billing account (Blaze) for every project, even at
 * free-tier usage, as of Feb 2026 (see config.ts). Everything else
 * (identity, roster, sites, photos metadata, events, live positions) stays
 * on Firebase — see firebaseClient.ts. This client never touches
 * Supabase's own Auth or Postgres, only its Storage buckets, so session
 * persistence is deliberately off.
 */
export const supabase: SupabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

import { getSupabaseClient } from './supabase'

/**
 * Anon-key Supabase client for admin-ish/storage work.
 *
 * Uses the SAME shared anon client as `src/lib/supabase.ts` — creating a second
 * `createClient()` call here would spin up another GoTrueClient under the same
 * `sb-<url>-auth-token` storage key and re-trigger the "Multiple GoTrueClient
 * instances detected" browser warning whenever both modules load in one session.
 */
export const supabaseAdmin = getSupabaseClient()
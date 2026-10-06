import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * ONE GoTrueClient per browser context.
 *
 * Next.js bundles `src/lib/supabase.ts` into every route chunk that imports it,
 * and each module copy would otherwise create its own Supabase/goTrue client
 * under the same `sb-<url>-auth-token` storage key — Supabase warns loudly about
 * this ("Multiple GoTrueClient instances detected"). Caching on `globalThis`
 * makes every copy of the module agree on a single shared instance, so exactly
 * one client exists per page, and realtime channels run through it too
 * (`realtimeSupabase === supabase`).
 */
const shared = globalThis as {
  __diamondSupabaseClient?: SupabaseClient
}

function getSupabaseClient(): SupabaseClient {
  if (!shared.__diamondSupabaseClient) {
    shared.__diamondSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      global: {
        headers: {
          'X-Client-Info': 'calendar-app'
        }
      },
      db: {
        schema: 'public'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  }
  return shared.__diamondSupabaseClient
}

export const supabase = getSupabaseClient()
// Realtime channels use the SAME client/goTrue instance — no second GoTrueClient.
export const realtimeSupabase = supabase

export { createClient, getSupabaseClient }

export function createServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        detectSessionInUrl: false,
      },
      db: {
        schema: 'public'
      }
    }
  )
}

/**
 * Contacts-only Supabase client, authenticated with the Clerk session token.
 *
 * The contacts tables are gated by Clerk-based RLS (`auth.jwt() ->> 'sub' =
 * user_id`). The other tables in this app (patients, calendar, ...) still carry
 * anon-era policies that do NOT admit the `authenticated` role, so the token
 * must never be attached globally — doing exactly that once blanked all 580
 * patients and had to be reverted (7a30d4d). The contacts module therefore talks
 * to this dedicated client; everything else keeps the anon `supabase` client.
 *
 * `accessToken` is read per request, so the getter can be registered later (from
 * the Clerk bridge component) without recreating the client, and it also drives
 * `realtime.setAuth` for the contacts `postgres_changes` subscriptions.
 */
const sharedContacts = globalThis as {
  __diamondContactsSupabase?: SupabaseClient
  __diamondContactsTokenGetter?: (() => Promise<string | null>) | null
}

export function registerContactsSupabaseTokenGetter(
  getter: (() => Promise<string | null>) | null,
): void {
  // Stored on globalThis, NOT a module variable: Next.js bundles this module
  // into several chunks, and the bridge component that registers the getter may
  // live in a different copy than the syncEngine that reads it. A module-scoped
  // variable would leave the reader looking at its own empty copy and silently
  // fall back to the anon key (zero rows under RLS).
  sharedContacts.__diamondContactsTokenGetter = getter
}

/**
 * Resolve the contacts client's Clerk token, or `null` when there is no bridge
 * or the user is signed out. Sync uses this to tell an authorized empty result
 * ("the account really has no rows") apart from an anonymous one ("RLS filtered
 * everything"), which must never be treated as a remote deletion.
 */
export async function getContactsSupabaseAccessToken(): Promise<string | null> {
  const getter = sharedContacts.__diamondContactsTokenGetter
  if (!getter) return null
  try {
    return await getter()
  } catch {
    return null
  }
}

function getContactsSupabaseClient(): SupabaseClient {
  if (!sharedContacts.__diamondContactsSupabase) {
    sharedContacts.__diamondContactsSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        detectSessionInUrl: false,
        autoRefreshToken: false,
        // Distinct storage key so this client never fights the anon client (or
        // another copy of this module) over the shared GoTrue auth entry.
        storageKey: 'diamond-contacts-auth',
      },
      accessToken: async () => {
        const getter = sharedContacts.__diamondContactsTokenGetter
        return getter ? await getter() : null
      },
      db: {
        schema: 'public'
      }
    })
  }
  return sharedContacts.__diamondContactsSupabase
}

export const contactsSupabase = getContactsSupabaseClient()
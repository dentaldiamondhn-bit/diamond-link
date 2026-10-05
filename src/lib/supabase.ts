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

/**
 * Clerk -> Supabase JWT bridge.
 *
 * The browser still authenticates with Clerk (not GoTrue), so this singleton is
 * created with the ANON key. Ownership RLS therefore needs a Clerk-signed JWT on
 * every request, and `supabase-js` asks for it through the `accessToken`
 * callback below — which it applies to PostgREST/Storage AND to the Realtime
 * socket (`realtime.setAuth`), so `postgres_changes` subscriptions are policed
 * too.
 *
 * There is deliberately NO `window.Clerk` lookup here: `@clerk/nextjs` exposes
 * Clerk through React context only, never as a browser global, so that path
 * silently yielded `null` and every call fell back to the anon key (which, with
 * RLS enabled, reads zero rows). Instead a client component registers a real
 * getter via `registerSupabaseTokenGetter()`.
 */
type SupabaseTokenGetter = () => Promise<string | null>

const tokenBridge = globalThis as {
  __diamondSupabaseTokenGetter?: SupabaseTokenGetter | null
}

/**
 * Register the Clerk token getter. Pass `null` to unregister (e.g. on sign-out).
 * Only the most recent registration wins, which keeps a re-render or a fast
 * account switch from leaving a stale token source behind.
 */
export function registerSupabaseTokenGetter(getter: SupabaseTokenGetter | null): void {
  tokenBridge.__diamondSupabaseTokenGetter = getter
}

async function getSupabaseAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const getter = tokenBridge.__diamondSupabaseTokenGetter
  if (!getter) return null
  try {
    return await getter()
  } catch {
    return null
  }
}


function getSupabaseClient(): SupabaseClient {
  if (!shared.__diamondSupabaseClient) {
    shared.__diamondSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      accessToken: getSupabaseAccessToken,
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
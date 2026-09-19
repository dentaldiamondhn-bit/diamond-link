/**
 * Dev-only identity bridge for the shared calendar.
 *
 * Localhost routes through Clerk's *development* instance, which mints its own
 * set of user ids. Calendar rows in the shared Supabase are keyed by
 * *production* Clerk ids, so a dev login would otherwise see an empty calendar.
 * This map re-links each dev user to their production id so the calendar and
 * "Próximos Eventos" render the real events while running next dev. It is a
 * no-op outside development/preview, so the deployed app is untouched.
 *
 * Dev and prod instances share the same emails; keep this map in sync when
 * staff change (diff prod vs dev users through the Clerk backend API).
 */
const DEV_TO_PROD: Record<string, string> = {
  'user_38EHmb7xvQKWn9usGZogkwp2Nvp': 'user_3JKYlRaGTEGpIq0MT3p1Y0YbdXo', // Dra. Sully Calix
  'user_37GsUyGI3pcCRZy17WPN8YpzgsO': 'user_3JKYlHsLkva168dVRnaWKxfU17d', // Dental Diamond
  'user_3Aj2oVencykywPxk1UZgm30p2qH': 'user_3JKYmUCBYHJHsMAgS6FYAaFcuFB', // Dra. Ana Pineda
  'user_3A1mYfR054eV3tqtellpfMKZ7f6': 'user_3JKYmMdhlcYQNVL87Mh7LqutHRg', // Leonardo Reyes
  'user_38FdiLSXYuRroYpiar8WDQlvSMa': 'user_3JKYlZy95UFLtiHS4uL9qxENPeR', // Jain Reyes
  'user_39XOhMYjrlQwlBRq1M3yDm9kfqT': 'user_3JKYmKEXDaGaoi0JVqpfUuXsXzD', // Dra. Keyla Palada
  'user_390oMquSqyGWKkzP37tpC2pFzcG': 'user_3JKYmGtIxXItzbnGGCXDYFCYhc0', // Dra. Maria Abrego
  'user_390FdATu8nOm6gcFYhScpPjSpbM': 'user_3JKYlxfEmDl0SlnumcG4eXzTWAC', // Dra. Amelia Yanes
  'user_390FCRHQOOM7LpibmONajxw5FjR': 'user_3JKYlt9HWNt2RHOGzP7htXd4uWn', // Dr. Gustavo Urtecho
  'user_38zjIdOjgaCOOzpNAZdP5dwW5PO': 'user_3JKYlpToyREziymA0vikvP65ILZ', // Sully Chieza
  'user_38zjFZcXdDSMwCK1S3iMQcZnUu6': 'user_3JKYliXDFotxaL5EICZ3oJc0UrN', // Elias Calix
  'user_390oIB0eaA26HGNtKNnwCsD00kZ': 'user_3JKYtlzX6NuuI4djPz8qxCWUon2', // Dra. Daniela Lopez
  'user_390Fq3k0H9MIwZ7tLCYhjosELdw': 'user_3JKYthV1EvSXhvlagtgTgREXgz7', // Dra. Melissa Escalante
  'user_390FlsnHRVbguZF1640Z4Fc36VE': 'user_3JKYsRMZqgNvZ4DMH29DJamUFle', // Dra. Jimena Molina
};

/** Returns true if we should use the dev→prod ID mapping (localhost dev or Vercel preview). */
function shouldUseDevMapping(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';
}

/** Dev/Preview-only: the caller's id set (own dev id + mapped prod id) for calendar reads. */
export function calendarAliasIds(userId: string): string[] {
  if (!userId) return [];
  if (!shouldUseDevMapping()) return [userId];
  const prodId = DEV_TO_PROD[userId];
  return prodId ? [...new Set([userId, prodId])] : [userId];
}

/**
 * Dynamic fallback: if a dev user ID isn't in the hardcoded map, try to find
 * their production counterpart by matching email via Supabase.
 */
async function resolveProdIdFromDevViaSupabase(devUserId: string): Promise<string | null> {
  if (!shouldUseDevMapping()) return null;
  if (DEV_TO_PROD[devUserId]) return DEV_TO_PROD[devUserId];

  try {
    const { createClerkClient } = await import('@clerk/backend');
    const { createServerServiceClient } = await import('@/lib/supabase/server');

    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const supabase = createServerServiceClient();

    // 1. Get the dev user's email from dev Clerk instance
    const devUser = await clerk.users.getUser(devUserId);
    const email = devUser.emailAddresses?.[0]?.emailAddress;
    if (!email) return null;

    // 2. Try to find the prod ID by querying production Clerk if secret is available
    const prodClerkSecret = process.env.CLERK_PROD_SECRET_KEY || process.env.CLERK_SECRET_KEY;
    if (prodClerkSecret && prodClerkSecret !== process.env.CLERK_SECRET_KEY) {
      const { createClerkClient: createProdClerkClient } = await import('@clerk/backend');
      const prodClerk = createProdClerkClient({ secretKey: prodClerkSecret });

      const { data: prodUsers } = await prodClerk.users.getUserList({
        emailAddress: [email],
        limit: 1,
      });

      if (prodUsers.length > 0) {
        const prodId = prodUsers[0].id;
        DEV_TO_PROD[devUserId] = prodId;
        return prodId;
      }
    }

    // Fallback: Check if the dev user ID itself exists in Supabase
    const { data: existingInvitees } = await supabase
      .from('event_invitees')
      .select('user_id')
      .eq('user_id', devUserId)
      .limit(1);

    if (existingInvitees && existingInvitees.length > 0) {
      return devUserId;
    }

    const { data: existingEvents } = await supabase
      .from('events')
      .select('user_id')
      .eq('user_id', devUserId)
      .limit(1);

    if (existingEvents && existingEvents.length > 0) {
      return devUserId;
    }
  } catch (err) {
    console.warn('[calendarDevBridge] Failed to resolve prod ID for dev user:', devUserId, err);
  }
  return null;
}

/**
 * Get alias IDs with dynamic fallback for unmapped users.
 */
export async function calendarAliasIdsAsync(userId: string): Promise<string[]> {
  if (!userId) return [];
  if (!shouldUseDevMapping()) return [userId];

  const prodId = DEV_TO_PROD[userId];
  if (prodId) return [...new Set([userId, prodId])];

  // Try dynamic resolution via Supabase/Clerk
  const resolved = await resolveProdIdFromDevViaSupabase(userId);
  return resolved ? [...new Set([userId, resolved])] : [userId];
}
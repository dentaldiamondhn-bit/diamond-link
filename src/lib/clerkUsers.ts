import { createClerkClient } from '@clerk/backend';

/**
 * User identity fields sourced from Clerk (the app-wide source of truth for
 * staff users). The local Supabase `users` table is vestigial (seeded demo row
 * only), so every feature that shows names/avatars resolves identities through
 * the Clerk API instead.
 */
export interface ClerkUserIdentity {
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  profileImageUrl: string | null;
}

const FALLBACK_IDENTITY: ClerkUserIdentity = {
  first_name: 'Usuario',
  last_name: '',
  name: 'Usuario',
  email: '',
  profileImageUrl: null,
};

// Dev-to-prod Clerk user ID mapping (matches calendarDevBridge.ts)
const DEV_TO_PROD: Record<string, string> = {
  'user_38EHmb7xvQKWn9usGZogkwp2Nvp': 'user_3JKYlRaGTEGpIq0MT3p1Y0YbdXo',
  'user_37GsUyGI3pcCRZy17WPN8YpzgsO': 'user_3JKYlHsLkva168dVRnaWKxfU17d',
  'user_3Aj2oVencykywPxk1UZgm30p2qH': 'user_3JKYmUCBYHJHsMAgS6FYAaFcuFB',
  'user_3A1mYfR054eV3tqtellpfMKZ7f6': 'user_3JKYmMdhlcYQNVL87Mh7LqutHRg',
  'user_38FdiLSXYuRroYpiar8WDQlvSMa': 'user_3JKYlZy95UFLtiHS4uL9qxENPeR',
  'user_39XOhMYjrlQwlBRq1M3yDm9kfqT': 'user_3JKYmKEXDaGaoi0JVqpfUuXsXzD',
  'user_390oMquSqyGWKkzP37tpC2pFzcG': 'user_3JKYmGtIxXItzbnGGCXDYFCYhc0',
  'user_390FdATu8nOm6gcFYhScpPjSpbM': 'user_3JKYlxfEmDl0SlnumcG4eXzTWAC',
  'user_390FCRHQOOM7LpibmONajxw5FjR': 'user_3JKYlt9HWNt2RHOGzP7htXd4uWn',
  'user_38zjIdOjgaCOOzpNAZdP5dwW5PO': 'user_3JKYlpToyREziymA0vikvP65ILZ',
  'user_38zjFZcXdDSMwCK1S3iMQcZnUu6': 'user_3JKYliXDFotxaL5EICZ3oJc0UrN',
  'user_390oIB0eaA26HGNtKNnwCsD00kZ': 'user_3JKYtlzX6NuuI4djPz8qxCWUon2',
  'user_390Fq3k0H9MIwZ7tLCYhjosELdw': 'user_3JKYthV1EvSXhvlagtgTgREXgz7',
  'user_390FlsnHRVbguZF1640Z4Fc36VE': 'user_3JKYsRMZqgNvZ4DMH29DJamUFle',
};

// Reverse mapping: prod ID -> dev ID (for fetching from dev Clerk instance)
const PROD_TO_DEV: Record<string, string> = Object.fromEntries(
  Object.entries(DEV_TO_PROD).map(([dev, prod]) => [prod, dev])
);

/** Returns true if we should use the dev→prod ID mapping (localhost dev or Vercel preview). */
function shouldUseDevMapping(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';
}

/**
 * Fetch identities for the given Clerk user ids. Unknown ids are omitted from
 * the map; callers should fall back to {@link FALLBACK_IDENTITY}.
 * In development/preview, production IDs are mapped to dev IDs before fetching from
 * the dev Clerk instance, since the shared Supabase stores production IDs.
 */
export async function getClerkUserIdentities(
  userIds: string[]
): Promise<Map<string, ClerkUserIdentity>> {
  const result = new Map<string, ClerkUserIdentity>();
  const ids = [...new Set((userIds || []).filter(Boolean))];

  if (ids.length === 0) return result;

  try {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // In development/preview, map production IDs to dev IDs before fetching
    const isDev = shouldUseDevMapping();
    const fetchIds = isDev ? ids.map(id => PROD_TO_DEV[id] || id) : ids;
    const idMapping = isDev 
      ? Object.fromEntries(ids.map((id, i) => [fetchIds[i], id]))
      : {};

    const { data } = await clerk.users.getUserList({
      userId: fetchIds,
      limit: Math.max(fetchIds.length, 100),
    });

    for (const user of data) {
      const firstName = user.firstName || '';
      const lastName = user.lastName || '';
      // Map back to original ID (production in dev/preview, same in prod)
      const originalId = isDev ? (idMapping[user.id] || user.id) : user.id;
      result.set(originalId, {
        first_name: firstName,
        last_name: lastName,
        name: `${firstName} ${lastName}`.trim(),
        email: user.emailAddresses?.[0]?.emailAddress || '',
        profileImageUrl: user.imageUrl || null,
      });
    }
  } catch (err) {
    console.error('[clerkUsers] getUserList failed', err);
  }

  return result;
}

export function clerkIdentityOf(
  userMap: Map<string, ClerkUserIdentity>,
  id: string | undefined
): ClerkUserIdentity {
  if (!id) return FALLBACK_IDENTITY;
  return userMap.get(id) || FALLBACK_IDENTITY;
}
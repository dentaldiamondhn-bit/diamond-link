import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { parseCommaSeparatedIds } from './apiSecurity';

/**
 * Calendar-wide server-side auth (Phase 0 of CALENDARIO_OVERHAUL_PLAN).
 *
 * Identity ALWAYS comes from the Clerk session resolved by `auth()` — never
 * from client-sent headers (`x-user-id`, `authorization`). The `/calendario`
 * surface is now accessible to all authenticated users; the same permissive
 * gate is enforced here for every `/api/events*`, `/api/tasks` and
 * `/api/reminders` handler, because middleware treats `/api/(.*)` as public.
 */

export const CALENDAR_ROLES = ['admin', 'doctor', 'assistant', 'tech_support'] as const;

export interface CalendarSession {
  userId: string;
  role: string;
}

/** Replicates the middleware's sessionClaims role resolution, normalized to lowercase. */
export function roleFromSessionClaims(sessionClaims: unknown): string {
  type SessionClaims = {
    public_metadata?: { role?: unknown };
    metadata?: { role?: unknown };
    role?: unknown;
  };
  const claims = sessionClaims as SessionClaims | null;
  let role = 'staff';
  if (claims?.public_metadata?.role) {
    role = claims.public_metadata.role as string;
  } else if (claims?.metadata?.role) {
    role = claims.metadata.role as string;
  } else if (claims?.role) {
    role = claims.role as string;
  }
  return String(role).toLowerCase();
}

export function isCalendarRole(role: string): boolean {
  return (CALENDAR_ROLES as readonly string[]).includes(role.toLowerCase());
}

/**
 * Masks replicated from `middleware.ts` so server route auth stays consistent
 * with page-level gating: allowlisted tech-support superusers (from the
 * TECH_SUPPORT_USER_IDS env var, comma-separated) are granted `tech_support`
 * unconditionally. The list is empty when the env var is unset — fail-closed.
 */
export const TECH_SUPPORT_USER_IDS: readonly string[] = parseCommaSeparatedIds(
  process.env.TECH_SUPPORT_USER_IDS
);

/** Resolve the Clerk session + role, or null when unauthenticated. */
export async function getCalendarSession(): Promise<CalendarSession | null> {
  let session: { userId: string | null; sessionClaims: unknown } | null = null;
  try {
    const resolved = await auth();
    session = { userId: resolved.userId ?? null, sessionClaims: resolved.sessionClaims };
  } catch {
    // Clerk session could not be resolved (e.g. outage) — fail closed.
    return null;
  }
  if (!session.userId) return null;
  const userId = session.userId;
  const sessionClaims = session.sessionClaims;
  let role = roleFromSessionClaims(sessionClaims);
  if (role === 'staff') {
    // Session claims may not carry public_metadata depending on the JWT
    // template; fall back to the full user record, which is the same
    // source the client-side role hooks read from.
    try {
      const user = await currentUser();
      const metaRole = (user?.publicMetadata as { role?: unknown } | null)?.role;
      if (typeof metaRole === 'string' && metaRole) {
        role = metaRole.toLowerCase();
      }
    } catch {
      // keep claim-derived role if the fetch fails
    }
  }
  if (process.env.DEBUG_AUTH_ROLE === '1') {
    console.log('[auth-debug]', { userId, role });
  }
  if ((TECH_SUPPORT_USER_IDS as readonly string[]).includes(userId)) {
    role = 'tech_support';
  }
  return { userId, role };
}

export type CalendarAuthResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; response: NextResponse };

/**
 * Enforce "authenticated" for a calendar API request.
 * Returns the verified session on success, or a ready-to-return 401/403
 * NextResponse when the caller must be rejected.
 */
export async function authorizeCalendar(): Promise<CalendarAuthResult> {
  const session = await getCalendarSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { ok: true, userId: session.userId, role: session.role };
}
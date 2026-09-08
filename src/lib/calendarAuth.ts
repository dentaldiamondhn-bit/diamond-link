import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Calendar-wide server-side auth (Phase 0 of CALENDARIO_OVERHAUL_PLAN).
 *
 * Identity ALWAYS comes from the Clerk session resolved by `auth()` — never
 * from client-sent headers (`x-user-id`, `authorization`). The `/calendario`
 * surface is restricted to clinic roles (admin | doctor | assistant); the same
 * gate is enforced here for every `/api/events*`, `/api/tasks` and
 * `/api/reminders` handler, because middleware treats `/api/(.*)` as public.
 */

export const CALENDAR_ROLES = ['admin', 'doctor', 'assistant'] as const;

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

/** Resolve the Clerk session + role, or null when unauthenticated. */
export async function getCalendarSession(): Promise<CalendarSession | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;
  return { userId, role: roleFromSessionClaims(sessionClaims) };
}

export type CalendarAuthResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; response: NextResponse };

/**
 * Enforce "authenticated AND clinic role" for a calendar API request.
 * Returns the verified session on success, or a ready-to-return 401/403
 * NextResponse when the caller must be rejected.
 */
export async function authorizeCalendar(): Promise<CalendarAuthResult> {
  const session = await getCalendarSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!isCalendarRole(session.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { ok: true, userId: session.userId, role: session.role };
}
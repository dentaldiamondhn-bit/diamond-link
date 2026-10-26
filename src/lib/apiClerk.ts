import { auth } from '@clerk/nextjs/server';
import { roleFromSessionClaims } from '@/lib/calendarAuth';
import {
  resolveAdminGate,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/apiSecurity';

export type SessionGateResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; response: Response };

export async function requireSession(): Promise<SessionGateResult> {
  const session = (await auth().catch(() => null)) as {
    userId?: string | null;
    sessionClaims?: unknown;
  } | null;
  if (!session?.userId) return { ok: false, response: unauthorizedResponse() };
  return {
    ok: true,
    userId: session.userId,
    role: roleFromSessionClaims(session.sessionClaims),
  };
}

/**
 * Fail-closed admin gate for API routes that touch Clerk's admin API.
 * Identity always comes from the Clerk session (`auth()`); a thrown or
 * missing session denies access, and only the exact 'admin' role passes.
 */
export async function requireAdmin(): Promise<SessionGateResult> {
  const session = await requireSession();
  if (!session.ok) return session;
  const decision = resolveAdminGate({
    userId: session.userId,
    role: session.role,
  });
  if (decision !== 'allow') {
    return {
      ok: false,
      response: decision === 'unauthorized' ? unauthorizedResponse() : forbiddenResponse(),
    };
  }
  return session;
}

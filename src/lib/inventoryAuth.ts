import 'server-only';
import { NextResponse } from 'next/server';
import { getCalendarSession, type CalendarAuthResult, roleFromSessionClaims } from './calendarAuth';
import { isInventoryRole } from './inventory/domain';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function authorizeAuthenticated(): Promise<CalendarAuthResult> {
  const session = await getCalendarSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { ok: true, userId: session.userId, role: session.role };
}

const ADMIN_USER_IDS = ['user_3A1mYfR054eV3tqtellpfMKZ7f6'];

export async function authorizeInventory(deepRoleCheck = true): Promise<CalendarAuthResult> {
  const result = await authorizeAuthenticated();
  if (!result.ok) return result;

  if (ADMIN_USER_IDS.includes(result.userId)) {
    return result;
  }

  if (isInventoryRole(result.role)) {
    return result;
  }

  // Session claims can be stale or omit the role entirely (e.g. token was
  // minted before a role change, or the JWT template lacks public_metadata).
  // When the claim does not grant inventory access, consult the live Clerk
  // user record, which is the same source the client-side role hooks use.
  if (deepRoleCheck) {
    try {
      const { sessionClaims } = await auth();
      const claimed = roleFromSessionClaims(sessionClaims);
      if (isInventoryRole(claimed)) return result;
      const user = await currentUser();
      if (isInventoryRole(typeof user?.publicMetadata?.role === 'string' ? user.publicMetadata.role : undefined)) {
        return result;
      }
    } catch {
      // fall through to the reject branch
    }
  }

  return {
    ok: false,
    response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
  };
}
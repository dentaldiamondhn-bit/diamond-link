import 'server-only';
import { NextResponse } from 'next/server';
import { getCalendarSession, type CalendarAuthResult } from './calendarAuth';
import { isInventoryRole } from './inventory/domain';

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

export async function authorizeInventory(): Promise<CalendarAuthResult> {
  const result = await authorizeAuthenticated();
  if (!result.ok) return result;

  if (!isInventoryRole(result.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return result;
}

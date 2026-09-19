import { NextRequest, NextResponse } from 'next/server';
import { createServerServiceClient } from '@/lib/supabase/server';
import { authorizeCalendar } from '@/lib/calendarAuth';
import { calendarAliasIdsAsync } from '@/lib/calendarDevBridge';
import { clinicDateKey, clinicClockTime, normalizeTime } from '@/calendario/timezone';

export const runtime = 'nodejs';

export async function GET() {
  const authz = await authorizeCalendar();
  if ('response' in authz) return authz.response;
  const { userId } = authz;

  try {
    const supabase = createServerServiceClient();
    const start = clinicDateKey();
    const end = clinicDateKey(new Date(), 14);

    // Visible events = owned OR invited (mirrors the main /api/events read and
    // the `events` RLS predicate, so a doctor's invite lands on the admin's
    // "Próximos Eventos" too).
    const aliasIds = await calendarAliasIdsAsync(userId);
    const { data: inviteeRows } = await supabase
      .from('event_invitees')
      .select('event_id')
      .in('user_id', aliasIds);
    const inviteeEventIds = (inviteeRows ?? [])
      .map((r) => Number(r.event_id))
      .filter((n) => Number.isFinite(n));

    // Single PostgREST `or` group: `user_id in (owned) OR id in (invited)`.
    // Chaining `.in()` + `.or()` here would AND the two branches instead, hiding
    // invitee events (and every owned event once any invitee row exists).
    const orParts = [`user_id.in.(${aliasIds.join(',')})`];
    if (inviteeEventIds.length > 0) {
      orParts.push(`id.in.(${inviteeEventIds.join(',')})`);
    }
    let query = supabase
      .from('events')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .neq('status', 'cancelled')
      .or(orParts.join(','));

    const { data: events, error: eventsError } = await query
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 400 });
    }

    // Hide today's events that have already finished (clinic-local wall clock).
    // e.g. at 11:00 a 9:00 event no longer shows in Próximos Eventos.
    const todayKey = clinicDateKey();
    const nowClock = clinicClockTime();
    const visible = (events || []).filter((event) => {
      const lastClock = normalizeTime(event.end_time || event.start_time);
      const hadTime = Boolean(event.end_time || event.start_time);
      return event.date !== todayKey || !hadTime || lastClock >= nowClock;
    });

    return NextResponse.json(visible || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
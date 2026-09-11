import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { deliverCalendarToUser } from '@/services/calendarNotifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Calendario Phase 5b — single reminder schedule dispatcher.
 *
 * Fired by GitHub Actions every 5 minutes (`/api/cron/reminders`), but the
 * scheduler composes Kubernetes-agnostic... it's just an HTTP call the workflow
 * makes — see `.github/workflows/calendario-reminders.yml`.
 *
 * Dispatch uses a **lean window**: reminders are treated as due `LEAN_MINUTES`
 * (default 5) before their anchored `reminder_time`, compensating precisely for
 * the scheduler's expected lag so a "N minutos antes" reminder still arrives on
 * time. `sent` is flipped only after delivery succeeds, so the cadence can
 * never double-fire.
 *
 * Gate: `x-cron-secret` must equal `CRON_SECRET` (set in both GitHub Actions
 * secrets and the Vercel Production env).
 */

const MAX_REMINDERS = 200;

function fmtDate(date: string): string {
  const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec((date || '').trim());
  if (!p) return date || '';
  try {
    return new Date(Date.UTC(Number(p[1]), Number(p[2]) - 1, Number(p[3]))).toLocaleDateString(
      'es-HN',
      { weekday: 'short', day: 'numeric', month: 'short' }
    );
  } catch {
    return date || '';
  }
}

interface EventRow {
  id: number;
  user_id: string;
  title: string | null;
  patient_name: string | null;
  date: string;
  start_time: string | null;
  status: string | null;
}

interface ReminderRow {
  id: number;
  event_id: number;
  minutes_before: number;
}

function authorized(req: NextRequest): boolean {
  if (req.headers.get('x-vercel-cron') === '1') return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (
    req.headers.get('x-cron-secret') === secret ||
    req.headers.get('authorization') === `Bearer ${secret}`
  );
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, reason: 'not-configured' }, { status: 503 });
  }

  const db = createServiceClient();
  // Lean the due-window forward by LEAN_MINUTES so scheduler lag doesn't make
  // reminders late: `reminder_time <= now + lean` means "due before the next
  // tick" — dispatched now, at most ~LEAN_MINUTES early.
  const leanMinutes = Math.max(0, Number(process.env.REMINDER_LEAN_MINUTES) || 5);
  const dueAt = new Date(Date.now() + leanMinutes * 60_000).toISOString();
  let processed = 0;
  let pushed = 0;
  let bell = 0;
  let failed = 0;

  try {
    const { data: due, error: dueError } = await db
      .from('event_reminders')
      .select('id, event_id, minutes_before')
      .eq('sent', false)
      .lte('reminder_time', dueAt)
      .order('reminder_time', { ascending: true })
      .limit(MAX_REMINDERS);
    if (dueError) throw dueError;
    if (!due || due.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    const eventIds = [...new Set((due as ReminderRow[]).map((r) => r.event_id))];

    const [{ data: events }, { data: inviteeRows }] = await Promise.all([
      db
        .from('events')
        .select('id, user_id, title, patient_name, date, start_time, status')
        .in('id', eventIds),
      db.from('event_invitees').select('event_id, user_id').in('event_id', eventIds),
    ]);

    const eventMap = new Map<number, EventRow>(
      ((events ?? []) as EventRow[])
        .filter(
          (e) => e.status !== 'cancelled' && e.status !== 'completed'
        )
        .map((e) => [e.id, e])
    );

    const recipientsByEvent = new Map<number, Set<string>>();
    for (const inv of inviteeRows || []) {
      const set = recipientsByEvent.get(inv.event_id) || new Set<string>();
      set.add(inv.user_id);
      recipientsByEvent.set(inv.event_id, set);
    }

    for (const reminder of due as ReminderRow[]) {
      const ev = eventMap.get(reminder.event_id);
      if (!ev) continue; // cancelled/completed/deleted — leave unsent, next tick compacts
      processed++;

      const recipients = new Set<string>([ev.user_id]);
      for (const uid of recipientsByEvent.get(ev.id) || []) recipients.add(uid);

      const dateLabel = fmtDate(ev.date);
      const who = (ev.patient_name?.trim() || ev.title?.trim() || 'Cita');
      const body = `${who} · ${dateLabel} ${ev.start_time || '--:--'}`;
      const title = `Recordatorio: ${who}`;
      const metadata: Record<string, unknown> = {
        type: 'calendar',
        source: 'event_reminders',
        eventId: ev.id,
        date: ev.date,
        startTime: ev.start_time,
        url: `/calendario?view=day&date=${encodeURIComponent(ev.date)}&eventId=${ev.id}`,
      };

      try {
        for (const userId of recipients) {
          const pushResult = await deliverCalendarToUser(
            db,
            userId,
            {
              title,
              body,
              icon: '/Logo.svg',
              badge: '/Logo.svg',
              tag: `calendar-${ev.id}`,
              renotify: true,
              data: metadata,
              actions: [{ action: 'open', title: 'Ver cita' }],
            },
            { type: 'calendar_reminder', title, message: body, metadata }
          );
          pushed += pushResult.sent;
          bell += recipients.size;
        }
        await db.from('event_reminders').update({ sent: true }).eq('id', reminder.id);
      } catch (err) {
        failed++;
        console.error('[cron/reminders] dispatch failed', reminder.id, (err as Error)?.message);
      }
    }

    return NextResponse.json({ ok: true, processed, pushed, bell, failed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const POST = GET;
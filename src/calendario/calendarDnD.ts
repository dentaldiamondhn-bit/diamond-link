import type { ClinicEvent } from '@/lib/types-calendar';
import type { EventInput } from '@/calendario/calendarRepository';
import { dateToDateStr, dateToTimeStr } from '@/calendario/rbcAdapter';

function parseClock(t: string): { h: number; m: number } {
  const [h = '0', m = '0'] = (t || '').split(':');
  return { h: parseInt(h, 10) || 0, m: parseInt(m, 10) || 0 };
}

function intervalOf(ev: Pick<ClinicEvent, 'date' | 'start_time' | 'end_time'>): [number, number] {
  const start = parseClock(ev.start_time || '09:00');
  const end = parseClock(ev.end_time || ev.start_time || start.h.toString());
  const [y = '0', mo = '0', d = '0'] = (ev.date || '').split('-');
  const t0 = new Date(+y, +mo - 1, +d, start.h, start.m).getTime();
  let t1 = new Date(+y, +mo - 1, +d, end.h, end.m).getTime();
  if (t1 <= t0) t1 = t0 + 30 * 60 * 1000;
  return [t0, t1];
}

/**
 * C12 — chair/cubicle overlap check. A fellow event of the same dentist whose
 * window overlaps the target window blocks the move. Cancelled events never
 * block (a cancelled slot is free).
 */
export function findDentistOverlap(
  events: ClinicEvent[],
  moved: ClinicEvent,
  newDate: string,
  newStartTime: string,
  newEndTime: string
): ClinicEvent | undefined {
  const dentist = (moved.dentist || '').trim().toLowerCase();
  if (!dentist) return undefined;

  const [target0, target1] = intervalOf({ date: newDate, start_time: newStartTime, end_time: newEndTime });

  for (const ev of events) {
    if (ev.id === moved.id) continue;
    if (((ev.dentist || '').trim().toLowerCase()) !== dentist) continue;
    if (ev.status === 'cancelled') continue;
    const [a, b] = intervalOf(ev);
    if (a < target1 && target0 < b) return ev;
  }
  return undefined;
}

/**
 * Persistable change set after a drag/resize. Month-view and all-day drops
 * carry no time granularity (RBC gives midnight bounds), so the existing
 * start/end times are preserved and only the date changes.
 */
export function dragTargetUpdates(
  ev: ClinicEvent,
  start: Date,
  end: Date,
  isAllDay: boolean | undefined,
  dateOnly: boolean
): Partial<EventInput> {
  const date = dateToDateStr(start);

  if (dateOnly || isAllDay) {
    return { date };
  }

  let newEnd = new Date(end.getTime());
  const newStart = new Date(start.getTime());
  if (newEnd.getTime() <= newStart.getTime()) {
    newEnd = new Date(newStart.getTime() + 30 * 60 * 1000);
  }
  // single-date model — clamp overnight drops to end of the start day
  const endOfDay = new Date(newStart);
  endOfDay.setHours(23, 59, 0, 0);
  if (newEnd.getTime() > endOfDay.getTime()) newEnd = endOfDay;

  return {
    date,
    start_time: dateToTimeStr(newStart),
    end_time: dateToTimeStr(newEnd),
  };
}

/** C11 — resizing only moves the end bound; clamp keeps it after start and within the day. */
export function resizeTargetUpdates(ev: ClinicEvent, end: Date): Partial<EventInput> {
  const start = parseClock(ev.start_time || '09:00');
  const [y = '0', mo = '0', d = '0'] = (ev.date || '').split('-');
  const dayStart = new Date(+y, +mo - 1, +d, start.h, start.m).getTime();

  let newEnd = new Date(end.getTime());
  if (newEnd.getTime() <= dayStart) newEnd = new Date(dayStart + 30 * 60 * 1000);
  const endOfDay = new Date(+y, +mo - 1, +d, 23, 59);
  if (newEnd.getTime() > endOfDay.getTime()) newEnd = endOfDay;

  return { end_time: dateToTimeStr(newEnd) };
}
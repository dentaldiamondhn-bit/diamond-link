import { addDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import type { View } from 'react-big-calendar';
import { dateToDateStr } from '@/calendario/rbcAdapter';
import type { EventRange } from '@/calendario/calendarRepository';

/**
 * Compute the fetch window for a given RBC view anchored on `date`.
 * Month/Week pull the surrounding ISO week so cross-month/day padding renders;
 * agenda (the longest view) looks 90 days ahead.
 */
export function viewToRange(view: View, date: Date): EventRange {
  switch (view) {
    case 'month': {
      const from = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
      const to = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
      return { from: dateToDateStr(from), to: dateToDateStr(to) };
    }
    case 'week':
    case 'work_week': {
      const from = startOfWeek(date, { weekStartsOn: 1 });
      const to = endOfWeek(date, { weekStartsOn: 1 });
      return { from: dateToDateStr(from), to: dateToDateStr(to) };
    }
    case 'day':
      return { from: dateToDateStr(date), to: dateToDateStr(date) };
    case 'agenda':
    default:
      return { from: dateToDateStr(date), to: dateToDateStr(addDays(date, 90)) };
  }
}
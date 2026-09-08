/**
 * Clinic-local timezone policy (CALENDARIO_OVERHAUL_PLAN — Phase 0).
 *
 * The canonical `events`/`tasks`/`reminders` family stores *local clock*
 * values (`date DATE`, `start_time`/`end_time` TIME, `remind_at` timestamptz)
 * and there are NO +/−6h shims in the live data layer. RBC dates are
 * interpreted against the clinic timezone below (Phase 2 `rbcAdapter`), not
 * the browser/server default. `America/Tegucigalpa` has no DST, so the offset
 * is a constant UTC−06:00.
 */
export const CLINIC_TIME_ZONE = 'America/Tegucigalpa';

/** `YYYY-MM-DD` for a given instant, in clinic-local time (`offsetDays` ±). */
export function clinicDateKey(date: Date = new Date(), offsetDays = 0): string {
  const shifted = new Date(date.getTime() + offsetDays * 86400000);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(shifted);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}
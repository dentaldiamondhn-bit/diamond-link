-- Calendario Phase 5 — server-guaranteed "La cita empieza ahora" notification.
--
-- Every scheduled/confirmed event publishes a push + bell when its clinic-local
-- start time is reached (owner + every invitee), in ADDITION to the lead-time
-- reminders the user configured (REMINDER_OPTIONS treats 0 as "Sin
-- recordatorio", so nothing fires at start time without this).
--
-- The dispatcher (/api/cron/reminders) polls for events whose clinic-local
-- instant (date + start_time, America/Tegucigalpa) has just been reached and
-- marks `start_notified_at`, guaranteeing exactly one notification per event.
--
-- ⚠️ Safe to re-run (idempotent): ADD COLUMN IF NOT EXISTS.

ALTER TABLE events ADD COLUMN IF NOT EXISTS start_notified_at timestamptz;

-- The dispatcher only ever looks for still-unnotified rows, so a partial index
-- keeps the per-minute poll cheap as the table grows.
CREATE INDEX IF NOT EXISTS idx_events_start_notified_at
  ON events (date) WHERE start_notified_at IS NULL;
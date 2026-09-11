-- Calendario Phase 5b (ext) — task reminder schedule (recur-until-completed).
--
-- Adds an optional clock-time reminder to `tasks`:
--   remind_at           TIMESTAMPTZ  — next occurrence (NULL = no reminder).
--   repeat_every_days   INTEGER      — >0: re-remind every N days until the task
--                                      is completed; NULL/0: one-shot.
--
-- The cron dispatcher (`/api/cron/reminders`, sources.tasks) delivers to the
-- task owner, then advances remind_at (or clears it) while completed = false.
-- Completed tasks are never dispatched. Personal reminders (ReminderPanel
-- notes) reuse the existing `reminders.remind_at` + `dismissed` (no DDL here).

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS remind_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS repeat_every_days INTEGER;

CREATE INDEX IF NOT EXISTS idx_tasks_remind_at
  ON tasks (remind_at)
  WHERE remind_at IS NOT NULL;
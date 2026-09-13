-- Calendario Phase 5 hardening — notifications INSERT scoped to the owner.
--
-- The legacy notifications table (supabase/migrations/20260719000001_create_notifications_table.sql)
-- allowed ANY authenticated user to INSERT a notification row for ANY user_id
-- (`WITH CHECK (true)`). Since the in-app bell streams those rows to the target
-- user's realtime subscription and can trigger OS tray pushes, that policy is a
-- cross-user forge/broadcast vector: anyone could write calendar-shaped
-- notifications (type 'calendar_event' / 'calendar_reminder') into every user's
-- bell.
--
-- Select/update/delete already require user_id = auth.uid(). Tighten insert to
-- match. Server-side deliverers (cron/reminders, push/calendar-webhook, bell
-- writers) use the service-role client, which bypasses RLS, so legit
-- owner + invitee event notifications are unaffected.
--
-- Run in the Supabase SQL Editor: Database -> SQL -> New query -> Run.

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
CREATE POLICY "Users can insert notifications" ON notifications
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);
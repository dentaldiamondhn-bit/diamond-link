-- Phase 5 (push notifications) — Web Push subscriptions (VAPID).
--
-- One row per browser/device that granted notification permission and
-- subscribed via PushManager. user_id is the Clerk id (TEXT, matching the rest
-- of the chat schema). The server writes/reads through the service-role client
-- (/api/push/* enforces Clerk auth), so these RLS policies are best-effort
-- defense-in-depth rather than the primary gate.
--
-- NOTE on the 2026-09-06 schema collision: a legacy `push_subscriptions` table
-- (created by supabase/migrations/20260719000001_create_notifications_table.sql
-- for the old calendar bell/push API, which was later removed) uses a different
-- schema — column `auth` instead of `auth_secret` and `UNIQUE(user_id, endpoint)`
-- instead of `UNIQUE(endpoint)` — and still holds stale FCM rows with duplicate
-- endpoints. That API was removed (see database/migrations/20260724_remove_push_subscriptions.sql,
-- which was never run), so the legacy table has no active consumers. We DROP it
-- here and recreate with the new schema; the first subscribe from the app
-- re-populates the table. If you ever need the old rows, back them up first.
--
-- Run in the Supabase SQL Editor: Database -> SQL -> New query -> Run.

DROP TABLE IF EXISTS public.push_subscriptions CASCADE;

CREATE TABLE push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  endpoint      TEXT NOT NULL,
  p256dh        TEXT NOT NULL,
  auth_secret   TEXT NOT NULL,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_success_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX push_subscriptions_endpoint_key ON push_subscriptions (endpoint);
CREATE INDEX push_subscriptions_user_idx ON push_subscriptions (user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_sub_select" ON push_subscriptions;
CREATE POLICY "push_sub_select" ON push_subscriptions
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "push_sub_insert" ON push_subscriptions;
CREATE POLICY "push_sub_insert" ON push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "push_sub_update" ON push_subscriptions;
CREATE POLICY "push_sub_update" ON push_subscriptions
  FOR UPDATE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "push_sub_delete" ON push_subscriptions;
CREATE POLICY "push_sub_delete" ON push_subscriptions
  FOR DELETE USING (user_id = auth.uid()::text);
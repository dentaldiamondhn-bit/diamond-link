-- Phase 5 (push notifications) — Web Push subscriptions (VAPID).
--
-- One row per browser/device that granted notification permission and
-- subscribed via PushManager. user_id is the Clerk id (TEXT, matching the rest
-- of the chat schema). The server writes/reads through the service-role client
-- (/api/push/* enforces Clerk auth), so these RLS policies are best-effort
-- defense-in-depth rather than the primary gate.
--
-- Run in the Supabase SQL Editor: Database -> SQL -> New query -> Run.

CREATE TABLE IF NOT EXISTS push_subscriptions (
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

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_key ON push_subscriptions (endpoint);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);

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
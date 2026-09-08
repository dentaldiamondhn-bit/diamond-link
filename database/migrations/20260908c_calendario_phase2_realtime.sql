-- ============================================================================
-- Calendario Phase 2 — realtime on the live canonical tables
-- (CALENDARIO_OVERHAUL_PLAN, Phases 0 + 2). Versioned migration, 2026-09-08.
-- Idempotent; safe to re-run.
--
-- Phase 0 locked the public anon key out of `events` / `tasks` / `reminders`
-- / `event_invitees` / `event_reminders` (REVOKE … FROM anon + RLS). Browser
-- `postgres_changes` subscriptions therefore 401/42501 by design, so realtime
-- for the overhauled calendario is delivered through a **Clerk-gated SSE route**
-- (`/api/events/realtime`) that subscribes with the **service-role** client and
-- re-broadcasts owner-filtered payloads. For that to work the tables need to be:
--
--   1) IN the `supabase_realtime` publication (plus `event_invitees`, which the
--      pre-overhaul service never published — invite deliveries depend on it);
--   2) set to **REPLICA IDENTITY FULL** so UPDATE/DELETE payloads carry the full
--      new/old row. Without it, a DELETE event's `payload.old` contains only the
--      primary key, and UPDATE payloads omit unchanged columns — the client-side
--      tombstone/de-dupe guard (Phase 2) would not know which rows to drop.
--
-- Apply via the Supabase Dashboard SQL editor (no DATABASE_URL / exec_sql RPC —
-- PostgREST cannot run DDL). Then verify with scripts; log in LEDGER.md.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Realtime publication membership (idempotent)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'events', 'tasks', 'reminders', 'event_invitees', 'event_reminders'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2) REPLICA IDENTITY FULL on the canonical five (idempotent ALTER)
-- ---------------------------------------------------------------------------

ALTER TABLE events REPLICA IDENTITY FULL;
ALTER TABLE tasks REPLICA IDENTITY FULL;
ALTER TABLE reminders REPLICA IDENTITY FULL;
ALTER TABLE event_invitees REPLICA IDENTITY FULL;
ALTER TABLE event_reminders REPLICA IDENTITY FULL;
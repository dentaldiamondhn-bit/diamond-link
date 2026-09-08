-- ============================================================================
-- Calendario Phase 0 — canonical model + security (CALENDARIO_OVERHAUL_PLAN)
-- Versioned migration, 2026-09-08. Idempotent; safe to re-run.
--
-- 1) Canonical model: live `events` / `tasks` / `reminders` / `event_invitees`
--    / `event_reminders` becomes the ONLY calendar data model. The orphaned
--    UUID layer (`calendar_events/_tasks/_reminders/_invitees` + the
--    `get_user_events` / `get_user_tasks` RPCs) is dropped. Verified live: all
--    nine tables exist; the canonical five are EMPTY; the legacy four are EMPTY.
--
-- 2) RLS: row-level security is enabled on the canonical five with ownership +
--    invitee predicates keyed off `auth.jwt() ->> 'sub'` (the Clerk user id).
--    The app's server API routes now use the service role and enforce Clerk
--    session + clinic-role authz in code (`src/lib/calendarAuth.ts`), so these
--    policies are defense-in-depth: they block ANY direct access through the
--    public anon key, which previously let anyone read every user's events.
--    Service role bypasses RLS by default.
--
-- Apply via the Supabase Dashboard SQL editor (no direct psql/DATABASE_URL is
-- configured; PostgREST cannot run DDL). Then verify with the service client
-- probes in scripts (see database/migrations/LEDGER.md).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 2) RLS on the canonical events family
-- ---------------------------------------------------------------------------

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_invitees ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;

-- events: owner OR any invitee
DROP POLICY IF EXISTS "calendario_events_owner_select" ON events;
CREATE POLICY "calendario_events_owner_select" ON events
  FOR SELECT USING (
    user_id = auth.jwt() ->> 'sub'
    OR EXISTS (
      SELECT 1 FROM event_invitees ei
      WHERE ei.event_id = events.id AND ei.user_id = auth.jwt() ->> 'sub'
    )
  );
DROP POLICY IF EXISTS "calendario_events_owner_insert" ON events;
CREATE POLICY "calendario_events_owner_insert" ON events
  FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');
DROP POLICY IF EXISTS "calendario_events_owner_update" ON events;
CREATE POLICY "calendario_events_owner_update" ON events
  FOR UPDATE USING (user_id = auth.jwt() ->> 'sub');
DROP POLICY IF EXISTS "calendario_events_owner_delete" ON events;
CREATE POLICY "calendario_events_owner_delete" ON events
  FOR DELETE USING (user_id = auth.jwt() ->> 'sub');

-- tasks / reminders: owner only
DROP POLICY IF EXISTS "calendario_tasks_owner_select" ON tasks;
CREATE POLICY "calendario_tasks_owner_select" ON tasks
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');
DROP POLICY IF EXISTS "calendario_tasks_owner_insert" ON tasks;
CREATE POLICY "calendario_tasks_owner_insert" ON tasks
  FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');
DROP POLICY IF EXISTS "calendario_tasks_owner_update" ON tasks;
CREATE POLICY "calendario_tasks_owner_update" ON tasks
  FOR UPDATE USING (user_id = auth.jwt() ->> 'sub');
DROP POLICY IF EXISTS "calendario_tasks_owner_delete" ON tasks;
CREATE POLICY "calendario_tasks_owner_delete" ON tasks
  FOR DELETE USING (user_id = auth.jwt() ->> 'sub');

DROP POLICY IF EXISTS "calendario_reminders_owner_select" ON reminders;
CREATE POLICY "calendario_reminders_owner_select" ON reminders
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');
DROP POLICY IF EXISTS "calendario_reminders_owner_insert" ON reminders;
CREATE POLICY "calendario_reminders_owner_insert" ON reminders
  FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');
DROP POLICY IF EXISTS "calendario_reminders_owner_update" ON reminders;
CREATE POLICY "calendario_reminders_owner_update" ON reminders
  FOR UPDATE USING (user_id = auth.jwt() ->> 'sub');
DROP POLICY IF EXISTS "calendario_reminders_owner_delete" ON reminders;
CREATE POLICY "calendario_reminders_owner_delete" ON reminders
  FOR DELETE USING (user_id = auth.jwt() ->> 'sub');

-- event_invitees: the invitee (self), the inviter, or the event owner
DROP POLICY IF EXISTS "calendario_event_invitees_self_select" ON event_invitees;
CREATE POLICY "calendario_event_invitees_self_select" ON event_invitees
  FOR SELECT USING (
    user_id = auth.jwt() ->> 'sub'
    OR created_by = auth.jwt() ->> 'sub'
    OR EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_invitees.event_id
        AND e.user_id = auth.jwt() ->> 'sub'
    )
  );
DROP POLICY IF EXISTS "calendario_event_invitees_self_insert" ON event_invitees;
CREATE POLICY "calendario_event_invitees_self_insert" ON event_invitees
  FOR INSERT WITH CHECK (
    created_by = auth.jwt() ->> 'sub'
    OR EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_invitees.event_id
        AND e.user_id = auth.jwt() ->> 'sub'
    )
  );
DROP POLICY IF EXISTS "calendario_event_invitees_self_update" ON event_invitees;
CREATE POLICY "calendario_event_invitees_self_update" ON event_invitees
  FOR UPDATE USING (
    user_id = auth.jwt() ->> 'sub'
    OR created_by = auth.jwt() ->> 'sub'
    OR EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_invitees.event_id
        AND e.user_id = auth.jwt() ->> 'sub'
    )
  );
DROP POLICY IF EXISTS "calendario_event_invitees_self_delete" ON event_invitees;
CREATE POLICY "calendario_event_invitees_self_delete" ON event_invitees
  FOR DELETE USING (
    created_by = auth.jwt() ->> 'sub'
    OR EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_invitees.event_id
        AND e.user_id = auth.jwt() ->> 'sub'
    )
  );

-- event_reminders: event owner only
DROP POLICY IF EXISTS "calendario_event_reminders_owner_select" ON event_reminders;
CREATE POLICY "calendario_event_reminders_owner_select" ON event_reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_reminders.event_id
        AND e.user_id = auth.jwt() ->> 'sub'
    )
  );
DROP POLICY IF EXISTS "calendario_event_reminders_owner_insert" ON event_reminders;
CREATE POLICY "calendario_event_reminders_owner_insert" ON event_reminders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_reminders.event_id
        AND e.user_id = auth.jwt() ->> 'sub'
    )
  );
DROP POLICY IF EXISTS "calendario_event_reminders_owner_update" ON event_reminders;
CREATE POLICY "calendario_event_reminders_owner_update" ON event_reminders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_reminders.event_id
        AND e.user_id = auth.jwt() ->> 'sub'
    )
  );
DROP POLICY IF EXISTS "calendario_event_reminders_owner_delete" ON event_reminders;
CREATE POLICY "calendario_event_reminders_owner_delete" ON event_reminders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_reminders.event_id
        AND e.user_id = auth.jwt() ->> 'sub'
    )
  );

-- Remove anon SELECT grants: the public anon key must never read the calendar.
REVOKE ALL ON events, tasks, reminders, event_invitees, event_reminders FROM anon;

-- ---------------------------------------------------------------------------
-- 1) Drop the orphaned UUID layer (canonical model decision, Phase 0)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS calendar_reminders CASCADE;
DROP TABLE IF EXISTS calendar_invitees CASCADE;
DROP TABLE IF EXISTS calendar_tasks CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;

DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_user_events', 'get_user_tasks')
  LOOP
    EXECUTE format('DROP FUNCTION %s CASCADE', f.sig);
  END LOOP;
END $$;
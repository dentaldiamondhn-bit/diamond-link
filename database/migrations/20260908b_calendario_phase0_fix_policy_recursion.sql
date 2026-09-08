-- ============================================================================
-- Calendario Phase 0 follow-up — break RLS policy recursion + lockdown grants
-- Versioned migration, 2026-09-08. Idempotent; safe to re-run.
--
-- Problem (found live): `events` SELECT policy subqueries `event_invitees`,
-- whose SELECT policy subqueries `events` again -> circular reference ->
-- 42P17 "infinite recursion detected in policy" the moment any RLS-mediated
-- query touches events / event_invitees / event_reminders. The app's server
-- routes use the service role (bypasses RLS) so nothing broke at runtime, but
-- the invitee-visibility goal of Phase 0 would never have worked.
--
-- Fix: `event_invitees` SELECT/UPDATE policies no longer query `events`
-- (self or inviter only; the event {owner -> invitees} direction stays intact),
-- breaking the cycle. `event_reminders` policies keep the one-directional
-- {event_reminders -> events} owner check (no return edge).
--
-- Also re-revokes calendar grants from `anon` per-table (belt-and-braces vs the
-- composite REVOKE in the phase0 file) so the public anon key has zero access.
-- Apply via the Supabase Dashboard SQL editor, then re-run the probe script.
-- ============================================================================

-- event_invitees: stop referencing `events` in SELECT/UPDATE (breaks recursion)
DROP POLICY IF EXISTS "calendario_event_invitees_self_select" ON event_invitees;
CREATE POLICY "calendario_event_invitees_self_select" ON event_invitees
  FOR SELECT USING (
    user_id = auth.jwt() ->> 'sub'
    OR created_by = auth.jwt() ->> 'sub'
  );

DROP POLICY IF EXISTS "calendario_event_invitees_self_update" ON event_invitees;
CREATE POLICY "calendario_event_invitees_self_update" ON event_invitees
  FOR UPDATE USING (
    user_id = auth.jwt() ->> 'sub'
    OR created_by = auth.jwt() ->> 'sub'
  );

-- Belt-and-braces anon lockdown (per-table, mirrors tasks/reminders outcome)
REVOKE ALL ON TABLE events FROM anon;
REVOKE ALL ON TABLE tasks FROM anon;
REVOKE ALL ON TABLE reminders FROM anon;
REVOKE ALL ON TABLE event_invitees FROM anon;
REVOKE ALL ON TABLE event_reminders FROM anon;
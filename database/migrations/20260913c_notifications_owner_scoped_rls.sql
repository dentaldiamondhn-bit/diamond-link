-- notifications.owner_scoped_rls.sql
-- Scope SELECT, UPDATE and DELETE to the row owner only, matching the
-- service-role INSERT policy introduced in 20260913b.
--
-- user_id in the notifications table stores the Clerk user id (same value
-- as auth.jwt()->>'sub' for the authenticated user).
--
-- The browser client uses the anon key (supabase anon), so auth.jwt()
-- returns NULL when called from the browser – which is correct: the
-- browser never touches the table directly.  All browser writes go through
-- the Clerk-gated /api/notifications (service-role) and
-- /api/notifications/send-to-user (service-role) routes, and reads through
-- the Clerk-gated /api/notifications GET route (service-role).
--
-- The only client that runs RLS against this table is the realtime channel
-- (postgres_changes).  Since the anon key has no JWT, realtime SELECT is
-- blocked by these policies, which is intentional: the BellNotificationContext
-- fetches via the service-role GET route and polls on visibility change.
-- Realtime was already removed from the client (replaced by polling).
--
-- ⚠️  Run after 20260913b_notifications_owner_only_insert.sql

BEGIN;

-- ── SELECT ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;

CREATE POLICY "Users can read own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.jwt()->>'sub');

-- ── UPDATE (mark as read / markAllAsRead) ───────────────────────────────
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.jwt()->>'sub')
  WITH CHECK (user_id = auth.jwt()->>'sub');

-- ── DELETE (remove / clearAll) ──────────────────────────────────────────
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  USING (user_id = auth.jwt()->>'sub');

COMMIT;

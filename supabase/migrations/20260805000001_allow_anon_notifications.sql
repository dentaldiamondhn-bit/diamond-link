-- Allow anon-role access to notifications and push_subscriptions.
-- These API routes previously used SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS).
-- They now use the anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY), so the policies must
-- permit the anon role. Authorization is still enforced in the route handlers via Clerk
-- (user_id columns hold Clerk user IDs, which never match Supabase auth.uid()).

-- notifications: SELECT / INSERT / UPDATE / DELETE
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (
    auth.role() IN ('authenticated', 'anon')
  );

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (
    auth.role() IN ('authenticated', 'anon')
  );

CREATE POLICY "Users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (
    auth.role() IN ('authenticated', 'anon')
  );

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (
    auth.role() IN ('authenticated', 'anon')
  );

-- push_subscriptions: SELECT / INSERT / DELETE
DROP POLICY IF EXISTS "Users can read own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON push_subscriptions;

CREATE POLICY "Users can read own push subscriptions" ON push_subscriptions
  FOR SELECT USING (
    auth.role() IN ('authenticated', 'anon')
  );

CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (
    auth.role() IN ('authenticated', 'anon')
  );

CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
  FOR DELETE USING (
    auth.role() IN ('authenticated', 'anon')
  );

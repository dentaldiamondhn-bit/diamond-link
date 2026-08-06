-- Allow anon-role writes for tables used by API routes that previously used
-- SUPABASE_SERVICE_ROLE_KEY and now use the anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY).
-- Authorization is enforced in the route handlers via Clerk.
-- Permissive policies are OR-combined with any existing policies, so this only
-- broadens access for the anon/authenticated roles.

-- timeline_notes: INSERT / UPDATE / DELETE
DROP POLICY IF EXISTS "anon_insert_timeline_notes" ON timeline_notes;
DROP POLICY IF EXISTS "anon_update_timeline_notes" ON timeline_notes;
DROP POLICY IF EXISTS "anon_delete_timeline_notes" ON timeline_notes;
CREATE POLICY "anon_insert_timeline_notes" ON timeline_notes
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "anon_update_timeline_notes" ON timeline_notes
  FOR UPDATE USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "anon_delete_timeline_notes" ON timeline_notes
  FOR DELETE USING (auth.role() IN ('authenticated', 'anon'));

-- timeline_note_comments: INSERT
DROP POLICY IF EXISTS "anon_insert_timeline_note_comments" ON timeline_note_comments;
CREATE POLICY "anon_insert_timeline_note_comments" ON timeline_note_comments
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon'));

-- presupuestos: INSERT / UPDATE
DROP POLICY IF EXISTS "anon_insert_presupuestos" ON presupuestos;
DROP POLICY IF EXISTS "anon_update_presupuestos" ON presupuestos;
CREATE POLICY "anon_insert_presupuestos" ON presupuestos
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "anon_update_presupuestos" ON presupuestos
  FOR UPDATE USING (auth.role() IN ('authenticated', 'anon'));

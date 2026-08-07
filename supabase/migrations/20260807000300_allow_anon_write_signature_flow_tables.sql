-- Allow anon/authenticated INSERT / UPDATE / DELETE on the tables used by the
-- signature flows (patient form, orthodontic history, completed treatments/payments).
-- Run this in the Supabase SQL Editor.
--
-- Same root cause as the storage policies: commit 3ce012c switched the app-facing
-- Supabase clients to the anon key, but RLS policies were only added for a few tables
-- (timeline_notes, timeline_note_comments, presupuestos). Anon writes to these tables
-- are silently blocked:
--   - patients                     : UPDATE/DELETE blocked -> firma_digital is never saved,
--                                     so patient-form edits and signatures do not persist
--   - historia_clinica_ortodoncia  : INSERT blocked        -> orthodontic history cannot be saved
--   - payments                     : INSERT blocked        -> payments in completed treatments fail
--   - historia_clinica_ortodoncia_versions, tratamientos_completados: part of the same flows
-- Permissive policies are OR-combined with existing ones. Authorization is enforced at the
-- app layer (Clerk) like in 20260805000002_allow_anon_write_clinic_tables.sql.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'patients',
    'historia_clinica_ortodoncia',
    'historia_clinica_ortodoncia_versions',
    'payments',
    'tratamientos_completados'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY "anon_insert_%s" ON %I FOR INSERT WITH CHECK (auth.role() IN (%L, %L))',
        t, t, 'authenticated', 'anon'
      );

      EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY "anon_update_%s" ON %I FOR UPDATE USING (auth.role() IN (%L, %L))',
        t, t, 'authenticated', 'anon'
      );

      EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY "anon_delete_%s" ON %I FOR DELETE USING (auth.role() IN (%L, %L))',
        t, t, 'authenticated', 'anon'
      );
    END IF;
  END LOOP;
END $$;

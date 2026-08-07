-- Allow anon/authenticated access to the remaining storage buckets used by the app.
-- Run this in the Supabase SQL Editor (same as 20260807000000_allow_anon_consentimiento_signatures.sql).
--
-- Same root cause: commit 3ce012c switched app-facing Supabase clients to the anon key
-- but only table RLS policies were added, not storage.objects policies. Uploads to these
-- buckets fail with "new row violates row-level security policy".
-- All buckets are public for reads (public URLs already resolve).

DO $$
DECLARE
  b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['signatures', 'tratamientos_firmas', 'patient-documents', 'orthodontic-documents', 'ticket-documents']
  LOOP
    -- anon: INSERT (upload)
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon to upload %s" ON storage.objects', b);
    EXECUTE format(
      'CREATE POLICY "Allow anon to upload %s" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = %L)',
      b, b
    );

    -- anon: UPDATE (upsert overwrites existing files)
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon to update %s" ON storage.objects', b);
    EXECUTE format(
      'CREATE POLICY "Allow anon to update %s" ON storage.objects FOR UPDATE TO anon USING (bucket_id = %L) WITH CHECK (bucket_id = %L)',
      b, b, b
    );

    -- anon: SELECT (list files)
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon to list %s" ON storage.objects', b);
    EXECUTE format(
      'CREATE POLICY "Allow anon to list %s" ON storage.objects FOR SELECT TO anon USING (bucket_id = %L)',
      b, b
    );

    -- anon: DELETE (removing files when records are deleted)
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon to delete %s" ON storage.objects', b);
    EXECUTE format(
      'CREATE POLICY "Allow anon to delete %s" ON storage.objects FOR DELETE TO anon USING (bucket_id = %L)',
      b, b
    );

    -- authenticated: INSERT / UPDATE / DELETE (mirrors the consent migration)
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated to upload %s" ON storage.objects', b);
    EXECUTE format(
      'CREATE POLICY "Allow authenticated to upload %s" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L)',
      b, b
    );

    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated to update %s" ON storage.objects', b);
    EXECUTE format(
      'CREATE POLICY "Allow authenticated to update %s" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L) WITH CHECK (bucket_id = %L)',
      b, b, b
    );

    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated to delete %s" ON storage.objects', b);
    EXECUTE format(
      'CREATE POLICY "Allow authenticated to delete %s" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L)',
      b, b
    );
  END LOOP;
END $$;

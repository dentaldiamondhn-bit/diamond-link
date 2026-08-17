-- Broaden anon upload policy: allow anon INSERT to ALL paths in support-sessions.
-- Replaces the narrow fullsnapshots/ policy with a general one (INSERT only, no SELECT/DELETE for anon).
-- The bucket is private (no public reads), so anon uploads are safe.

DROP POLICY IF EXISTS "Allow anon uploads to fullsnapshots" ON storage.objects;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow anon uploads to support-sessions'
  ) THEN
    CREATE POLICY "Allow anon uploads to support-sessions"
      ON storage.objects
      FOR INSERT
      TO anon
      WITH CHECK (bucket_id = 'support-sessions');
  END IF;
END
$$;

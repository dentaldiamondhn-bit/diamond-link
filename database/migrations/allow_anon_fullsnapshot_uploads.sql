-- Allow anon (unauthenticated) uploads to fullsnapshots/ path in support-sessions bucket.
-- The client has no Supabase auth session (uses Clerk), so the authenticated
-- policy doesn't apply. This is safe because:
--  - The bucket is private (no public reads)
--  - We only allow INSERT, not SELECT/DELETE
--  - Path is scoped to fullsnapshots/ prefix

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow anon uploads to fullsnapshots'
  ) THEN
    CREATE POLICY "Allow anon uploads to fullsnapshots"
      ON storage.objects
      FOR INSERT
      TO anon
      WITH CHECK (
        bucket_id = 'support-sessions'
        AND name LIKE 'fullsnapshots/%'
      );
  END IF;
END
$$;

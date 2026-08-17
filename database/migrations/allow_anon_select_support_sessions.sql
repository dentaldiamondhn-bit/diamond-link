-- Allow anon SELECT on support-sessions bucket so the agent can download
-- FullSnapshot and recording files that were uploaded by the client-side anon key.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow anon reads from support-sessions'
  ) THEN
    CREATE POLICY "Allow anon reads from support-sessions"
      ON storage.objects
      FOR SELECT
      TO anon
      USING (bucket_id = 'support-sessions');
  END IF;
END
$$;

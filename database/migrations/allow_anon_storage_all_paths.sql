-- Allow anon INSERT+SELECT+DELETE on ALL paths in support-sessions bucket.
-- Replaces the narrow fullsnapshots-only policy so the agent can upload
-- recordings, download FullSnapshots, and clean up files.

-- Drop the narrow INSERT policy
DROP POLICY IF EXISTS "Allow anon uploads to fullsnapshots" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon uploads to support-sessions" ON storage.objects;

-- Broad anon INSERT (all paths)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'anon insert support-sessions'
  ) THEN
    CREATE POLICY "anon insert support-sessions"
      ON storage.objects
      FOR INSERT
      TO anon
      WITH CHECK (bucket_id = 'support-sessions');
  END IF;
END
$$;

-- Broad anon SELECT (all paths)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'anon select support-sessions'
  ) THEN
    CREATE POLICY "anon select support-sessions"
      ON storage.objects
      FOR SELECT
      TO anon
      USING (bucket_id = 'support-sessions');
  END IF;
END
$$;

-- Broad anon DELETE (cleanup old files)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'anon delete support-sessions'
  ) THEN
    CREATE POLICY "anon delete support-sessions"
      ON storage.objects
      FOR DELETE
      TO anon
      USING (bucket_id = 'support-sessions');
  END IF;
END
$$;

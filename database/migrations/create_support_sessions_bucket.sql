-- Create the support-sessions storage bucket and audit table for co-browsing
-- session recordings (HIPAA-sensitive: private bucket, recordings keep masked
-- patient data and are only readable by authenticated staff via signed URLs).
-- Idempotent: safe to run multiple times.

-- 1) Storage bucket (private; JSON recordings up to 50MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
SELECT
  'support-sessions',
  'support-sessions',
  false,
  52428800,
  ARRAY['application/json']::text[],
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'support-sessions'
);

-- Authenticated staff may upload recordings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow authenticated users to upload support sessions') THEN
    CREATE POLICY "Allow authenticated users to upload support sessions" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'support-sessions');
  END IF;
END
$$;

-- Authenticated staff may read recordings (signed URLs/downloads)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow authenticated users to read support sessions') THEN
    CREATE POLICY "Allow authenticated users to read support sessions" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'support-sessions');
  END IF;
END
$$;

-- Authenticated staff may delete recordings (retention/cleanup)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow authenticated users to delete support sessions') THEN
    CREATE POLICY "Allow authenticated users to delete support sessions" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'support-sessions');
  END IF;
END
$$;

-- 2) Audit table mapping co-browsing sessions to their recordings
CREATE TABLE IF NOT EXISTS public.support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  agent_user_id text,
  client_user_id text,
  status text NOT NULL DEFAULT 'active',
  event_count integer NOT NULL DEFAULT 0,
  recording_path text,
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.support_sessions IS
  'Audit trail for co-browsing support sessions and their recorded JSON payloads';

ALTER TABLE public.support_sessions ENABLE ROW LEVEL SECURITY;

-- Authenticated staff can record sessions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'support_sessions' AND policyname = 'Allow authenticated users to insert support sessions') THEN
    CREATE POLICY "Allow authenticated users to insert support sessions" ON public.support_sessions FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END
$$;

-- Authenticated staff can read session audit rows
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'support_sessions' AND policyname = 'Allow authenticated users to read support sessions') THEN
    CREATE POLICY "Allow authenticated users to read support sessions" ON public.support_sessions FOR SELECT TO authenticated USING (true);
  END IF;
END
$$;

-- Authenticated staff can update session rows (status, paths, ended_at)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'support_sessions' AND policyname = 'Allow authenticated users to update support sessions') THEN
    CREATE POLICY "Allow authenticated users to update support sessions" ON public.support_sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END
$$;
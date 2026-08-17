-- Allow anon INSERT on support_sessions table so the agent can log
-- session recordings. The anon key is used by the client-side agent page.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'support_sessions'
      AND policyname = 'anon insert support_sessions'
  ) THEN
    CREATE POLICY "anon insert support_sessions"
      ON public.support_sessions
      FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END
$$;

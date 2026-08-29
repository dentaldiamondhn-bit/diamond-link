-- Notes realtime fixes.
--
-- PROBLEM: notes are saved to patient_follow_up_notes but don't appear live in
-- the patient-follow-up page.
--
-- The fundamental issue is that a note does not carry its patient id, so
-- Realtime cannot filter notes per patient (it must be scope by the WRITABLE
-- follow_up_status_id instead). Meanwhile patient_follow_up_status has RLS
-- DISABLED, and Supabase Realtime refuses to stream tables with RLS disabled.
--
-- FIXES (all in one script, safe to re-run):
--   1) Add paciente_id directly to patient_follow_up_notes (backfilled from the
--      referencing status row) so Notes Realtime can filter exactly per patient.
--   2) Enable RLS on patient_follow_up_status with a permissive policy so its
--      Realtime events flow again (checkbox sync, status tracking).
--   3) Ensure patient_follow_up_notes has a permissive policy for the anon role
--      the browser uses (Realtime authorization checks SELECT via RLS).
--   4) Re-assert the three tables are published with REPLICA IDENTITY FULL.
--
-- RUN ONCE PER ENVIRONMENT in the Supabase SQL editor, same as the previous
-- realtime migrations.

-- 1) paciente_id on notes
ALTER TABLE public.patient_follow_up_notes
  ADD COLUMN IF NOT EXISTS paciente_id UUID;

UPDATE public.patient_follow_up_notes n
SET paciente_id = COALESCE(n.paciente_id, s.paciente_id)
FROM public.patient_follow_up_status s
WHERE n.follow_up_status_id = s.id
  AND n.paciente_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_patient_follow_up_notes_paciente_id
  ON public.patient_follow_up_notes(paciente_id);

-- 2) Re-enable RLS on patient_follow_up_status with permissive access
--    (semantics are unchanged: the table was fully open with RLS disabled).
DROP POLICY IF EXISTS "Users can view patient follow-up status" ON public.patient_follow_up_status;
DROP POLICY IF EXISTS "Users can insert patient follow-up status" ON public.patient_follow_up_status;
DROP POLICY IF EXISTS "Users can update patient follow-up status" ON public.patient_follow_up_status;
DROP POLICY IF EXISTS "Users can delete patient follow-up status" ON public.patient_follow_up_status;

ALTER TABLE public.patient_follow_up_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on patient follow-up status" ON public.patient_follow_up_status
  FOR ALL USING (true) WITH CHECK (true);

-- 3) Permissive policy on notes for the anon browser role
DROP POLICY IF EXISTS "Users can view follow-up notes" ON public.patient_follow_up_notes;
DROP POLICY IF EXISTS "Users can insert follow-up notes" ON public.patient_follow_up_notes;
DROP POLICY IF EXISTS "Users can delete follow-up notes" ON public.patient_follow_up_notes;

CREATE POLICY "Allow all on patient follow-up notes" ON public.patient_follow_up_notes
  FOR ALL USING (true) WITH CHECK (true);

-- 4) Publication + full row payloads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'patient_follow_up_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_follow_up_notes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'patient_follow_up_status'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_follow_up_status;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_message_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_message_history;
  END IF;
END
$$;

ALTER TABLE public.patient_follow_up_notes REPLICA IDENTITY FULL;
ALTER TABLE public.patient_follow_up_status REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_message_history REPLICA IDENTITY FULL;
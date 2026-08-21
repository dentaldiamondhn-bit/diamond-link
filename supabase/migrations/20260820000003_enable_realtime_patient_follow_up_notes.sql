-- Enable Realtime for patient_follow_up_notes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'patient_follow_up_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_follow_up_notes;
  END IF;
END
$$;

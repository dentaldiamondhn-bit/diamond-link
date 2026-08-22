-- Enable Realtime for patient_follow_up_status table so checkbox changes sync across users/devices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'patient_follow_up_status'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_follow_up_status;
  END IF;
END
$$;

-- Enable Realtime for patient follow-up so notes and sent WhatsApp messages
-- appear instantly across users/devices (no waiting for a fetch or page reload).
--
-- RUN THIS ONCE PER ENVIRONMENT in the Supabase SQL editor (Dashboard → SQL Editor):
--   - local/dev database  : one project
--   - production database : the other project
--
-- It is idempotent (safe to run again). It supersedes the older one-off
-- migrations for patient_follow_up_notes / patient_follow_up_status by
-- covering all three tables in a single script.

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

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'patient_follow_up_status'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_follow_up_status;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'whatsapp_message_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_message_history;
  END IF;
END
$$;

-- Full replica identity: UPDATE/DELETE broadcasts must carry the whole row
-- (with default identity, paciente_id is omitted and clients drop the event).
ALTER TABLE public.patient_follow_up_notes REPLICA IDENTITY FULL;
ALTER TABLE public.patient_follow_up_status REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_message_history REPLICA IDENTITY FULL;
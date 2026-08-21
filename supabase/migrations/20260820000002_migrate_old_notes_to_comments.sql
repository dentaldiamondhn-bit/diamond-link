-- Migrate old notes from patient_follow_up_status.notes into patient_follow_up_notes
-- Each non-empty notes field becomes one comment entry from Dra. Sully Calix

INSERT INTO public.patient_follow_up_notes (follow_up_status_id, user_id, user_name, user_image, message, created_at)
SELECT
  s.id,
  'user_38EHmb7xvQKWn9usGZogkwp2Nvp',
  'Dra. Sully Calix',
  'https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NKOWJhVjZKWkJONHkxUy1HT2VnSEtBYnozNEQ3Unk4ZFRfR043OFF5bkUySkVPTUxJbnhnPXMxMDAwLWMiLCJzIjoiNk5XK2c2b2VFaHZTL2ZEMmRqcVdxRVZ3d3hTUWVhTWxkUm1UWEZKRVdyRSJ9',
  s.notes,
  s.created_at
FROM public.patient_follow_up_status s
WHERE s.notes IS NOT NULL
  AND TRIM(s.notes) <> '';

-- After migration, clear the old notes column to avoid confusion
UPDATE public.patient_follow_up_status
SET notes = NULL
WHERE notes IS NOT NULL AND TRIM(notes) <> '';

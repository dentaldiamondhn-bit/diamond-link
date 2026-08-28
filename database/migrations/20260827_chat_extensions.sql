-- Chat extensions (Phase 3/4 support):
--   * voice_note_url / voice_note_duration columns on chat_messages
--   * add 'voice' to the message_type CHECK constraint
--   * chat-voice-notes storage bucket (public, with RLS policies)

-- 1. Voice note columns
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS voice_note_url text,
  ADD COLUMN IF NOT EXISTS voice_note_duration numeric(5, 2);

-- 2. Extend message_type CHECK to allow 'voice'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.chat_messages'::regclass
      AND conname = 'chat_messages_message_type_check'
  ) THEN
    ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_message_type_check;
  END IF;
END $$;

ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_message_type_check
  CHECK (message_type IN ('text', 'file', 'image', 'voice', 'patient_case', 'system'));

-- 3. Voice notes storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
SELECT
  'chat-voice-notes',
  'chat-voice-notes',
  true,
  20971520,
  ARRAY['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac']::text[],
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'chat-voice-notes');

CREATE POLICY IF NOT EXISTS "Allow voice notes upload"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'chat-voice-notes');

CREATE POLICY IF NOT EXISTS "Allow voice notes read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-voice-notes');

CREATE POLICY IF NOT EXISTS "Allow voice notes delete"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'chat-voice-notes');
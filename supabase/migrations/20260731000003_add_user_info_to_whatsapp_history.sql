-- Add user info columns to whatsapp_message_history (if not exist)
ALTER TABLE public.whatsapp_message_history
  ADD COLUMN IF NOT EXISTS sent_by_name TEXT,
  ADD COLUMN IF NOT EXISTS sent_by_image TEXT;

-- Set defaults for new columns
ALTER TABLE public.whatsapp_message_history
  ALTER COLUMN sent_by_name SET DEFAULT '',
  ALTER COLUMN sent_by_image SET DEFAULT '';
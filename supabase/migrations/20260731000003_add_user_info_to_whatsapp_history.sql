-- Add user info columns to whatsapp_message_history
ALTER TABLE public.whatsapp_message_history
  ADD COLUMN IF NOT EXISTS sent_by_name TEXT,
  ADD COLUMN IF NOT EXISTS sent_by_image TEXT;
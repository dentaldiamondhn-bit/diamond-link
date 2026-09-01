-- Forwarded-message indicator:
--
-- Messages sent via the "Reenviar" (Forward) action are flagged so the recipient
-- bubble can show a small "reenviado" label. Defaults to false; historical
-- messages keep their existing meaning (the ORIGINAL message is untouched — new
-- forwarded copies get the flag only).
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN NOT NULL DEFAULT false;
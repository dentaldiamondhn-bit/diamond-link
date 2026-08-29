-- Chat read receipts (Phase 4 support):
--   * chat_message_reads table tracking per-message delivery and read state
--   * one row per (message, user): message_id + user_id UNIQUE
--   * delivered_at set when the recipient's client receives the message
--   * read_at set when the recipient actually reads it
--   * RLS policies mirror the rest of the chat schema (chat_check_access helper)
--   * added to the realtime publication so the sender sees live read receipts

CREATE TABLE IF NOT EXISTS chat_message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_message ON chat_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_conversation ON chat_message_reads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON chat_message_reads(user_id);

ALTER TABLE chat_message_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_read_select" ON chat_message_reads;
DROP POLICY IF EXISTS "chat_read_insert" ON chat_message_reads;
DROP POLICY IF EXISTS "chat_read_update" ON chat_message_reads;
DROP POLICY IF EXISTS "chat_read_delete" ON chat_message_reads;

-- Participants of the conversation can see who has read which message.
CREATE POLICY "chat_read_select" ON chat_message_reads FOR SELECT USING (
  chat_check_access(conversation_id)
);

-- A user records delivery/read state only for their own reads.
CREATE POLICY "chat_read_insert" ON chat_message_reads FOR INSERT WITH CHECK (
  chat_check_access(conversation_id) AND auth.uid()::text = user_id
);

CREATE POLICY "chat_read_update" ON chat_message_reads FOR UPDATE USING (
  auth.uid()::text = user_id
);

CREATE POLICY "chat_read_delete" ON chat_message_reads FOR DELETE USING (
  auth.uid()::text = user_id
);

ALTER PUBLICATION supabase_realtime ADD TABLE chat_message_reads;
-- Chat read receipts (Phase 4 support):
--   * chat_message_reads table tracking per-message delivery and read state
--   * one row per (message, user): message_id + user_id UNIQUE
--   * delivered_at set when the recipient's client receives the message
--   * read_at set when the recipient actually reads it
--   * added to the realtime publication so the sender sees live read receipts
--
-- NOTE: the live DB already had a chat_message_reads table (from an earlier
-- experiment) with UUID user_id + FK to auth.users -- incompatible with this
-- app's Clerk TEXT user ids. DROP + recreate here is REQUIRED so the schema
-- matches chat_participants (user_id TEXT, no auth FK).
--
-- RLS posture: the rest of the chat schema runs with RLS effectively open
-- (anon client, Clerk auth, no Supabase session sync), so this table mirrors
-- that with permissive policies. No joins, no casts, no auth.uid() usage.
--
-- Deterministic: safe to re-run.

DROP TABLE IF EXISTS chat_message_reads CASCADE;

CREATE TABLE chat_message_reads (
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

CREATE POLICY "chat_read_select" ON chat_message_reads FOR SELECT USING (true);
CREATE POLICY "chat_read_insert" ON chat_message_reads FOR INSERT WITH CHECK (true);
CREATE POLICY "chat_read_update" ON chat_message_reads FOR UPDATE USING (true);
CREATE POLICY "chat_read_delete" ON chat_message_reads FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE chat_message_reads;
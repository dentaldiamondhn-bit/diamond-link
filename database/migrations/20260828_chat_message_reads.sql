-- Chat read receipts (Phase 4 support):
--   * chat_message_reads table tracking per-message delivery and read state
--   * one row per (message, user): message_id + user_id UNIQUE
--   * delivered_at set when the recipient's client receives the message
--   * read_at set when the recipient actually reads it
--   * RLS policies use a DEDICATED SECURITY DEFINER helper (chat_reads_access)
--     with explicit ::text casts -- does NOT depend on chat_check_access, so it
--     works regardless of that helper's current definition on the live DB.
--   * added to the realtime publication so the sender sees live read receipts
--
-- Idempotent: safe to re-run if the previous attempt partially applied.

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

-- SECURITY DEFINER so the subquery bypasses RLS on chat_participants
-- (avoids the chat_participants <-> chat_check_access recursion entirely).
DROP FUNCTION IF EXISTS public.chat_reads_access(uuid);
CREATE FUNCTION public.chat_reads_access(conv_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()::text
  );
$$;

-- Participants of the conversation can see who has read which message.
CREATE POLICY "chat_read_select" ON chat_message_reads FOR SELECT USING (
  public.chat_reads_access(conversation_id)
);

-- A user records delivery/read state only for their own reads.
CREATE POLICY "chat_read_insert" ON chat_message_reads FOR INSERT WITH CHECK (
  public.chat_reads_access(conversation_id) AND auth.uid()::text = user_id
);

CREATE POLICY "chat_read_update" ON chat_message_reads FOR UPDATE USING (
  auth.uid()::text = user_id
);

CREATE POLICY "chat_read_delete" ON chat_message_reads FOR DELETE USING (
  auth.uid()::text = user_id
);

ALTER PUBLICATION supabase_realtime ADD TABLE chat_message_reads;
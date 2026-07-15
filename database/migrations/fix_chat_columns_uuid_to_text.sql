-- Fix chat schema: change user ID columns from UUID to TEXT for Clerk ID compatibility
-- Must drop policies first (they reference columns), alter columns, then restore policies

-- Step 1: Drop all chat RLS policies
DROP POLICY IF EXISTS "chat_conv_select" ON chat_conversations;
DROP POLICY IF EXISTS "chat_conv_insert" ON chat_conversations;
DROP POLICY IF EXISTS "chat_conv_update" ON chat_conversations;
DROP POLICY IF EXISTS "chat_conv_delete" ON chat_conversations;

DROP POLICY IF EXISTS "chat_part_select" ON chat_participants;
DROP POLICY IF EXISTS "chat_part_insert" ON chat_participants;
DROP POLICY IF EXISTS "chat_part_update" ON chat_participants;
DROP POLICY IF EXISTS "chat_part_delete" ON chat_participants;

DROP POLICY IF EXISTS "chat_msg_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_msg_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_msg_update" ON chat_messages;
DROP POLICY IF EXISTS "chat_msg_delete" ON chat_messages;

DROP POLICY IF EXISTS "chat_attach_select" ON chat_attachments;
DROP POLICY IF EXISTS "chat_attach_insert" ON chat_attachments;

DROP POLICY IF EXISTS "chat_patient_select" ON chat_patient_case_links;
DROP POLICY IF EXISTS "chat_patient_insert" ON chat_patient_case_links;

-- Drop FK constraints referencing auth.users (Clerk IDs don't live there)
ALTER TABLE IF EXISTS chat_participants DROP CONSTRAINT IF EXISTS chat_participants_user_id_fkey;
ALTER TABLE IF EXISTS chat_conversations DROP CONSTRAINT IF EXISTS chat_conversations_created_by_fkey;
ALTER TABLE IF EXISTS chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE IF EXISTS chat_attachments DROP CONSTRAINT IF EXISTS chat_attachments_uploaded_by_fkey;
ALTER TABLE IF EXISTS chat_patient_case_links DROP CONSTRAINT IF EXISTS chat_patient_case_links_created_by_fkey;

-- Alter columns from UUID to TEXT
ALTER TABLE chat_participants ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE chat_conversations ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE chat_messages ALTER COLUMN sender_id TYPE TEXT;
ALTER TABLE chat_attachments ALTER COLUMN uploaded_by TYPE TEXT;
ALTER TABLE chat_patient_case_links ALTER COLUMN created_by TYPE TEXT;

-- Drop and recreate the helper function (cast auth.uid()::text since columns are now TEXT)
DROP FUNCTION IF EXISTS chat_check_access;

CREATE FUNCTION chat_check_access(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()::text
  ) OR EXISTS (
    SELECT 1 FROM chat_conversations
    WHERE id = conv_id AND created_by = auth.uid()::text
  );
$$;

-- Re-create policies

-- chat_conversations policies
CREATE POLICY "chat_conv_select" ON chat_conversations FOR SELECT USING (
  chat_check_access(id)
);

CREATE POLICY "chat_conv_insert" ON chat_conversations FOR INSERT WITH CHECK (
  created_by = auth.uid()::text
);

CREATE POLICY "chat_conv_update" ON chat_conversations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM chat_participants WHERE conversation_id = id AND user_id = auth.uid()::text AND role IN ('owner', 'admin'))
);

CREATE POLICY "chat_conv_delete" ON chat_conversations FOR DELETE USING (
  created_by = auth.uid()::text
);

-- chat_participants policies
CREATE POLICY "chat_part_select" ON chat_participants FOR SELECT USING (
  chat_check_access(conversation_id)
);

CREATE POLICY "chat_part_insert" ON chat_participants FOR INSERT WITH CHECK (
  user_id = auth.uid()::text OR chat_check_access(conversation_id)
);

CREATE POLICY "chat_part_update" ON chat_participants FOR UPDATE USING (
  user_id = auth.uid()::text OR EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND created_by = auth.uid()::text)
);

CREATE POLICY "chat_part_delete" ON chat_participants FOR DELETE USING (
  user_id = auth.uid()::text OR EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND created_by = auth.uid()::text)
);

-- chat_messages policies
CREATE POLICY "chat_msg_select" ON chat_messages FOR SELECT USING (
  chat_check_access(conversation_id)
);

CREATE POLICY "chat_msg_insert" ON chat_messages FOR INSERT WITH CHECK (
  chat_check_access(conversation_id) AND sender_id = auth.uid()::text
);

CREATE POLICY "chat_msg_update" ON chat_messages FOR UPDATE USING (
  chat_check_access(conversation_id) AND sender_id = auth.uid()::text
);

CREATE POLICY "chat_msg_delete" ON chat_messages FOR DELETE USING (
  sender_id = auth.uid()::text OR EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND created_by = auth.uid()::text)
);

-- chat_attachments policies
CREATE POLICY "chat_attach_select" ON chat_attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_messages WHERE id = message_id AND chat_check_access(conversation_id))
);

CREATE POLICY "chat_attach_insert" ON chat_attachments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM chat_messages WHERE id = message_id AND sender_id = auth.uid()::text)
);

-- chat_patient_case_links policies
CREATE POLICY "chat_patient_select" ON chat_patient_case_links FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_messages WHERE id = message_id AND chat_check_access(conversation_id))
);

CREATE POLICY "chat_patient_insert" ON chat_patient_case_links FOR INSERT WITH CHECK (
  created_by = auth.uid()::text OR EXISTS (SELECT 1 FROM chat_messages WHERE id = message_id AND sender_id = auth.uid()::text)
);

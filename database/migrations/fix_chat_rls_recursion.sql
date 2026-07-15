-- Fix infinite RLS recursion in chat tables
-- The cycle: chat_conv_select -> chat_participants -> chat_part_select -> chat_conversations -> ...
-- Fix: use SECURITY DEFINER function to bypass RLS for cross-table checks

-- Drop all existing chat policies
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

-- Helper function: SECURITY DEFINER bypasses RLS, breaking the recursion cycle
CREATE OR REPLACE FUNCTION chat_check_access(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM chat_conversations
    WHERE id = conv_id AND created_by = auth.uid()
  );
$$;

-- chat_conversations policies
CREATE POLICY "chat_conv_select" ON chat_conversations FOR SELECT USING (
  chat_check_access(id)
);

CREATE POLICY "chat_conv_insert" ON chat_conversations FOR INSERT WITH CHECK (
  auth.uid() = created_by
);

CREATE POLICY "chat_conv_update" ON chat_conversations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM chat_participants WHERE conversation_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
);

CREATE POLICY "chat_conv_delete" ON chat_conversations FOR DELETE USING (
  created_by = auth.uid()
);

-- chat_participants policies
CREATE POLICY "chat_part_select" ON chat_participants FOR SELECT USING (
  chat_check_access(conversation_id)
);

CREATE POLICY "chat_part_insert" ON chat_participants FOR INSERT WITH CHECK (
  auth.uid() = user_id OR chat_check_access(conversation_id)
);

CREATE POLICY "chat_part_update" ON chat_participants FOR UPDATE USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND created_by = auth.uid())
);

CREATE POLICY "chat_part_delete" ON chat_participants FOR DELETE USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND created_by = auth.uid())
);

-- chat_messages policies
CREATE POLICY "chat_msg_select" ON chat_messages FOR SELECT USING (
  chat_check_access(conversation_id)
);

CREATE POLICY "chat_msg_insert" ON chat_messages FOR INSERT WITH CHECK (
  chat_check_access(conversation_id) AND auth.uid() = sender_id
);

CREATE POLICY "chat_msg_update" ON chat_messages FOR UPDATE USING (
  chat_check_access(conversation_id) AND sender_id = auth.uid()
);

CREATE POLICY "chat_msg_delete" ON chat_messages FOR DELETE USING (
  sender_id = auth.uid() OR EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND created_by = auth.uid())
);

-- chat_attachments policies
CREATE POLICY "chat_attach_select" ON chat_attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_messages WHERE id = message_id AND chat_check_access(conversation_id))
);

CREATE POLICY "chat_attach_insert" ON chat_attachments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM chat_messages WHERE id = message_id AND sender_id = auth.uid())
);

-- chat_patient_case_links policies
CREATE POLICY "chat_patient_select" ON chat_patient_case_links FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_messages WHERE id = message_id AND chat_check_access(conversation_id))
);

CREATE POLICY "chat_patient_insert" ON chat_patient_case_links FOR INSERT WITH CHECK (
  auth.uid() = created_by OR EXISTS (SELECT 1 FROM chat_messages WHERE id = message_id AND sender_id = auth.uid())
);

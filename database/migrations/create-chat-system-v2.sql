-- Update chat tables to use TEXT for user IDs (Clerk IDs)
-- This allows storing Clerk IDs directly without needing to map to a separate users table

-- Drop existing tables and recreate with TEXT user IDs
DROP TABLE IF EXISTS chat_patient_case_links CASCADE;
DROP TABLE IF EXISTS chat_attachments CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_participants CASCADE;
DROP TABLE IF EXISTS chat_conversations CASCADE;

-- Recreate conversations with TEXT user IDs
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  type VARCHAR(20) NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'channel')),
  description TEXT,
  avatar_url TEXT,
  created_by TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Recreate participants with TEXT user IDs
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  is_muted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  last_read_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Recreate messages with TEXT user IDs
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'patient_case', 'system')),
  reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  reactions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Recreate attachments with TEXT user IDs
CREATE TABLE IF NOT EXISTS chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Recreate patient case links
CREATE TABLE IF NOT EXISTS chat_patient_case_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(paciente_id) ON DELETE CASCADE,
  link_type VARCHAR(50) NOT NULL CHECK (link_type IN ('consent', 'odontogram', 'treatment', 'event', 'presupuesto', 'payment', 'general')),
  linked_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON chat_conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON chat_conversations(type);

CREATE INDEX IF NOT EXISTS idx_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation ON chat_participants(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attachments_message ON chat_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_patient_case_links_patient ON chat_patient_case_links(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_case_links_message ON chat_patient_case_links(message_id);

-- Enable RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_patient_case_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "chat_conv_select" ON chat_conversations;
DROP POLICY IF EXISTS "chat_conv_insert" ON chat_conversations;
DROP POLICY IF EXISTS "chat_conv_update" ON chat_conversations;
DROP POLICY IF EXISTS "chat_conv_delete" ON chat_conversations;

CREATE POLICY "chat_conv_select" ON chat_conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_participants WHERE chat_participants.conversation_id = chat_conversations.id AND chat_participants.user_id = auth.uid())
);

CREATE POLICY "chat_conv_insert" ON chat_conversations FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "chat_conv_update" ON chat_conversations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM chat_participants WHERE chat_participants.conversation_id = chat_conversations.id AND chat_participants.user_id = auth.uid() AND chat_participants.role IN ('owner', 'admin'))
);

CREATE POLICY "chat_conv_delete" ON chat_conversations FOR DELETE USING (created_by = auth.uid());

-- Participants policies
DROP POLICY IF EXISTS "chat_part_select" ON chat_participants;
DROP POLICY IF EXISTS "chat_part_insert" ON chat_participants;
DROP POLICY IF EXISTS "chat_part_update" ON chat_participants;
DROP POLICY IF EXISTS "chat_part_delete" ON chat_participants;

CREATE POLICY "chat_part_select" ON chat_participants FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM chat_conversations WHERE chat_conversations.id = chat_participants.conversation_id AND chat_conversations.created_by = auth.uid()));

CREATE POLICY "chat_part_insert" ON chat_participants FOR INSERT WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM chat_conversations WHERE chat_conversations.id = chat_participants.conversation_id AND chat_conversations.created_by = auth.uid()));

CREATE POLICY "chat_part_update" ON chat_participants FOR UPDATE USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM chat_conversations WHERE chat_conversations.id = chat_participants.conversation_id AND chat_conversations.created_by = auth.uid()));

CREATE POLICY "chat_part_delete" ON chat_participants FOR DELETE USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM chat_conversations WHERE chat_conversations.id = chat_participants.conversation_id AND chat_conversations.created_by = auth.uid()));

-- Messages policies
DROP POLICY IF EXISTS "chat_msg_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_msg_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_msg_update" ON chat_messages;
DROP POLICY IF EXISTS "chat_msg_delete" ON chat_messages;

CREATE POLICY "chat_msg_select" ON chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_participants WHERE chat_participants.conversation_id = chat_messages.conversation_id AND chat_participants.user_id = auth.uid())
);

CREATE POLICY "chat_msg_insert" ON chat_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM chat_participants WHERE chat_participants.conversation_id = chat_messages.conversation_id AND chat_participants.user_id = auth.uid())
  AND auth.uid() = sender_id
);

CREATE POLICY "chat_msg_update" ON chat_messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM chat_participants WHERE chat_participants.conversation_id = chat_messages.conversation_id AND chat_participants.user_id = auth.uid())
  AND sender_id = auth.uid()
);

CREATE POLICY "chat_msg_delete" ON chat_messages FOR DELETE USING (
  sender_id = auth.uid() OR EXISTS (SELECT 1 FROM chat_conversations WHERE chat_conversations.id = chat_messages.conversation_id AND chat_conversations.created_by = auth.uid())
);

-- Attachments policies
DROP POLICY IF EXISTS "chat_attach_select" ON chat_attachments;
DROP POLICY IF EXISTS "chat_attach_insert" ON chat_attachments;

CREATE POLICY "chat_attach_select" ON chat_attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_messages WHERE chat_messages.id = chat_attachments.message_id AND EXISTS (SELECT 1 FROM chat_participants WHERE chat_participants.conversation_id = chat_messages.conversation_id AND chat_participants.user_id = auth.uid()))
);

CREATE POLICY "chat_attach_insert" ON chat_attachments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM chat_messages WHERE chat_messages.id = chat_attachments.message_id AND chat_messages.sender_id = auth.uid())
);

-- Patient case links policies
DROP POLICY IF EXISTS "chat_patient_select" ON chat_patient_case_links;
DROP POLICY IF EXISTS "chat_patient_insert" ON chat_patient_case_links;

CREATE POLICY "chat_patient_select" ON chat_patient_case_links FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_messages WHERE chat_messages.id = chat_patient_case_links.message_id AND EXISTS (SELECT 1 FROM chat_participants WHERE chat_participants.conversation_id = chat_messages.conversation_id AND chat_participants.user_id = auth.uid()))
);

CREATE POLICY "chat_patient_insert" ON chat_patient_case_links FOR INSERT WITH CHECK (
  auth.uid() = created_by OR EXISTS (SELECT 1 FROM chat_messages WHERE chat_messages.id = chat_patient_case_links.message_id AND chat_messages.sender_id = auth.uid())
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;

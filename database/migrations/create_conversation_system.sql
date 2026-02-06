-- Create conversation system tables for modern chat approach

-- Conversations table (replaces chat_rooms)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group', 'patient_case')),
    name TEXT,
    participant_ids TEXT[] NOT NULL,
    created_by_clerk_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message TEXT,
    last_message_time TIMESTAMP WITH TIME ZONE,
    unread_count INTEGER DEFAULT 0,
    paciente_id VARCHAR(255),
    
    CONSTRAINT valid_participants CHECK (array_length(participant_ids, 1) >= 2),
    CONSTRAINT patient_case_requires_paciente CHECK (
        type != 'patient_case' OR (type = 'patient_case' AND paciente_id IS NOT NULL)
    )
);

-- Conversation participants table (replaces chat_room_members)
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    clerk_user_id VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(conversation_id, clerk_user_id)
);

-- Conversation messages table (replaces chat_messages)
CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_clerk_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    sender_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    file_type VARCHAR(100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant_ids ON conversations USING GIN (participant_ids);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by_clerk_id);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_joined_at ON conversation_participants(joined_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_sender ON conversation_messages(sender_clerk_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_deleted ON conversation_messages(is_deleted) WHERE is_deleted = FALSE;

-- Update timestamp trigger for conversations
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_updated_at();

-- Update timestamp trigger for conversation messages
CREATE TRIGGER update_conversation_messages_updated_at
    BEFORE UPDATE ON conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_updated_at();

-- Function to update conversation's last message when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET 
        last_message = NEW.content,
        last_message_time = NEW.created_at,
        updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_last_message_trigger
    AFTER INSERT ON conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they participate in"
    ON conversations FOR SELECT
    USING (participant_ids @> ARRAY[current_setting('app.current_user_id', true)::VARCHAR]);

CREATE POLICY "Users can insert conversations they participate in"
    ON conversations FOR INSERT
    WITH CHECK (participant_ids @> ARRAY[current_setting('app.current_user_id', true)::VARCHAR]);

CREATE POLICY "Users can update conversations they participate in"
    ON conversations FOR UPDATE
    USING (participant_ids @> ARRAY[current_setting('app.current_user_id', true)::VARCHAR]);

-- RLS Policies for conversation participants
CREATE POLICY "Users can view their conversation participation"
    ON conversation_participants FOR SELECT
    USING (clerk_user_id = current_setting('app.current_user_id', true)::VARCHAR);

CREATE POLICY "Users can insert their conversation participation"
    ON conversation_participants FOR INSERT
    WITH CHECK (clerk_user_id = current_setting('app.current_user_id', true)::VARCHAR);

-- RLS Policies for conversation messages
CREATE POLICY "Users can view messages from conversations they participate in"
    ON conversation_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants 
            WHERE conversation_id = conversation_messages.conversation_id 
            AND clerk_user_id = current_setting('app.current_user_id', true)::VARCHAR
        )
    );

CREATE POLICY "Users can insert messages to conversations they participate in"
    ON conversation_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversation_participants 
            WHERE conversation_id = NEW.conversation_id 
            AND clerk_user_id = current_setting('app.current_user_id', true)::VARCHAR
        )
    );

CREATE POLICY "Users can update their own messages"
    ON conversation_messages FOR UPDATE
    USING (sender_clerk_id = current_setting('app.current_user_id', true)::VARCHAR);

-- Comments for documentation
COMMENT ON TABLE conversations IS 'Main conversations table replacing chat_rooms for modern chat approach';
COMMENT ON TABLE conversation_participants IS 'Participants in conversations, replacing chat_room_members';
COMMENT ON TABLE conversation_messages IS 'Messages in conversations, replacing chat_messages';

COMMENT ON COLUMN conversations.type IS 'Type: direct, group, or patient_case';
COMMENT ON COLUMN conversations.participant_ids IS 'Array of participant clerk user IDs';
COMMENT ON COLUMN conversations.paciente_id IS 'Patient ID for patient_case conversations';

COMMENT ON COLUMN conversation_messages.message_type IS 'Type: text, image, file, or system';
COMMENT ON COLUMN conversation_messages.is_deleted IS 'Soft delete flag for messages';

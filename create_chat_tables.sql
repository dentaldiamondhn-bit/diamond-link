-- Run this SQL in your Supabase SQL Editor to create the chat tables

-- 1. Create chat_rooms table (if not exists)
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    type VARCHAR(20) DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'patient_case')),
    created_by_clerk_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paciente_id VARCHAR(255)
);

-- 2. Create chat_messages table (if not exists)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_clerk_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    encrypted_content TEXT,
    content_key TEXT,
    iv TEXT,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system', 'patient_share')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create chat_room_members table (if not exists)
CREATE TABLE IF NOT EXISTS chat_room_members (
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    clerk_user_id VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (room_id, clerk_user_id)
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user ON chat_room_members(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_paciente_id ON chat_rooms(paciente_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_paciente_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- 5. Enable RLS (optional - only if needed)
-- ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;

-- 6. Insert a test conversation (optional - for testing)
-- INSERT INTO chat_rooms (id, name, type, created_by_clerk_id)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Test Room', 'group', 'test_user_id');

-- Or create a simple direct conversation for testing
INSERT INTO chat_rooms (name, type, created_by_clerk_id)
VALUES ('General Chat', 'group', 'system')
ON CONFLICT DO NOTHING;

-- Get the room ID and add members
-- You'll need to add your Clerk user IDs as members

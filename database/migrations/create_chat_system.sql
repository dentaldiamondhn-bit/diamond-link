-- Chat System for Clerk-based Authentication
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Chat rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    type TEXT CHECK (type IN ('direct', 'group', 'patient_case')) NOT NULL,
    created_by_clerk_id TEXT NOT NULL,
    paciente_id TEXT, -- Reference to patients.paciente_id (no FK constraint due to type compatibility)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Encrypted messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_clerk_id TEXT NOT NULL,
    encrypted_content TEXT NOT NULL,
    content_key TEXT NOT NULL,
    iv TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    paciente_id TEXT, -- Reference to patients.paciente_id (no FK constraint due to type compatibility)
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room members
CREATE TABLE IF NOT EXISTS chat_room_members (
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    clerk_user_id TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (room_id, clerk_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_clerk_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user ON chat_room_members(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_paciente_id ON chat_rooms(paciente_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_paciente_id ON chat_messages(paciente_id);

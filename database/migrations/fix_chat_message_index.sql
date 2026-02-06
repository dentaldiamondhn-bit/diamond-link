-- Fix chat message index size issue
-- Drop the problematic index that's too large
DROP INDEX IF EXISTS idx_chat_messages_sender;

-- Create a hash index instead for better performance with long text fields
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_hash ON chat_messages USING HASH (sender_clerk_id);

-- Also add a partial index for common queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_recent ON chat_messages (room_id, created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';

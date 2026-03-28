-- Create user_preferences table for storing per-user settings
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL UNIQUE,
    page_preferences JSONB DEFAULT '{}',
    global_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_clerk_user_id ON user_preferences(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at ON user_preferences(updated_at);

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_preferences IS 'Stores user-specific preferences and settings for pages and global UI';
COMMENT ON COLUMN user_preferences.clerk_user_id IS 'Clerk user ID for authentication';
COMMENT ON COLUMN user_preferences.page_preferences IS 'JSON object containing page-specific preferences (view mode, pagination, etc.)';
COMMENT ON COLUMN user_preferences.global_preferences IS 'JSON object containing global preferences (theme, language, etc.)';

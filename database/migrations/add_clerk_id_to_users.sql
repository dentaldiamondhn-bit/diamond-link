-- Add clerk_id column to users table for chat system
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Create index for clerk_id lookup (if not exists)
DO $$ 
BEGIN 
  CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
END $$;

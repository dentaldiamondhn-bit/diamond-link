-- Disable RLS on user_preferences table to fix authentication issues
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;

-- Drop any existing RLS policies that might be causing conflicts
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;

-- Grant necessary permissions to authenticated users
GRANT SELECT ON user_preferences TO authenticated;
GRANT INSERT ON user_preferences TO authenticated;
GRANT UPDATE ON user_preferences TO authenticated;
GRANT DELETE ON user_preferences TO authenticated;

-- Grant necessary permissions to service role (for admin operations)
GRANT SELECT ON user_preferences TO service_role;
GRANT INSERT ON user_preferences TO service_role;
GRANT UPDATE ON user_preferences TO service_role;
GRANT DELETE ON user_preferences TO service_role;

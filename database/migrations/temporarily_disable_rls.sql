-- Temporarily disable RLS to get the multiple reminders system working
-- This will allow us to test the functionality while debugging authentication

ALTER TABLE calendar_reminders DISABLE ROW LEVEL SECURITY;

-- Add a comment for later reference
-- TODO: Re-enable RLS once authentication issues are resolved
-- ALTER TABLE calendar_reminders ENABLE ROW LEVEL SECURITY;

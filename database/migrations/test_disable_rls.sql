-- Temporarily disable RLS for testing
ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_invitees DISABLE ROW LEVEL SECURITY;

-- Test insert with Clerk user ID
INSERT INTO calendar_events (title, start_date, end_date, created_by) 
VALUES ('Test Event', NOW(), NOW(), 'user_38EHmb7xvQKWn9usGZogkwp2Nvp');

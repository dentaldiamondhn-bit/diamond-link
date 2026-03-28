-- Fix UUID fields to support Clerk user IDs
-- This migration changes user_id and created_by fields from UUID to TEXT

-- Drop existing indexes
DROP INDEX IF EXISTS idx_calendar_invitees_user_id;
DROP INDEX IF EXISTS idx_calendar_invitees_created_by;
DROP INDEX IF EXISTS idx_calendar_events_created_by;

-- Alter calendar_invitees table
ALTER TABLE calendar_invitees 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT,
ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- Alter calendar_events table  
ALTER TABLE calendar_events 
ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_calendar_invitees_user_id ON calendar_invitees(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_invitees_created_by ON calendar_invitees(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);

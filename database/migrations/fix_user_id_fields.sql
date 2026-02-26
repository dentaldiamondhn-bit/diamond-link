-- Fix user_id fields to support Clerk user IDs (TEXT instead of UUID)
-- This migration fixes the UUID validation errors

-- Drop existing indexes first
DROP INDEX IF EXISTS idx_calendar_events_created_by;
DROP INDEX IF EXISTS idx_calendar_invitees_user_id;
DROP INDEX IF EXISTS idx_calendar_invitees_created_by;

-- Alter calendar_events table to change created_from UUID to TEXT
ALTER TABLE calendar_events 
ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- Alter calendar_invitees table to change user_id and created_by from UUID to TEXT
ALTER TABLE calendar_invitees 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT,
ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- Recreate indexes with TEXT fields
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_invitees_user_id ON calendar_invitees(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_invitees_created_by ON calendar_invitees(created_by);

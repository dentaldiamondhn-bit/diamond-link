-- Fix the UUID issue by changing to TEXT
-- This is the definitive fix

BEGIN;

-- Drop foreign key constraints temporarily
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_created_by_fkey;
ALTER TABLE calendar_invitees DROP CONSTRAINT IF EXISTS calendar_invitees_created_by_fkey;
ALTER TABLE calendar_invitees DROP CONSTRAINT IF EXISTS calendar_invitees_user_id_fkey;

-- Change columns to TEXT
ALTER TABLE calendar_events ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE calendar_invitees ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE calendar_invitees ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- Recreate constraints (without foreign key for now)
-- Note: We'll need to handle user relationships differently

COMMIT;

-- Fix the calendar_reminders schema to handle both old and new systems
-- The issue is that both event_id and item_id are NOT NULL, but we only need one

-- First, let's make event_id nullable to support the new item_id system
ALTER TABLE calendar_reminders ALTER COLUMN event_id DROP NOT NULL;

-- Also make item_id nullable to support the old event_id system  
ALTER TABLE calendar_reminders ALTER COLUMN item_id DROP NOT NULL;

-- Add a comment explaining the dual-schema approach
COMMENT ON COLUMN calendar_reminders.event_id IS 'Legacy column for backward compatibility - can be null when using item_id';
COMMENT ON COLUMN calendar_reminders.item_id IS 'New column for multiple reminders system - can be null when using event_id';

-- Create a check constraint to ensure at least one of them is not null
ALTER TABLE calendar_reminders ADD CONSTRAINT calendar_reminders_item_reference_check 
CHECK (event_id IS NOT NULL OR item_id IS NOT NULL);

-- Drop the old NOT NULL constraints that were auto-generated
ALTER TABLE calendar_reminders DROP CONSTRAINT IF EXISTS "2200_99138_2_not_null";
ALTER TABLE calendar_reminders DROP CONSTRAINT IF EXISTS "2200_99138_7_not_null";

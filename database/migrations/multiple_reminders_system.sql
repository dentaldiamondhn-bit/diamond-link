-- Create proper multiple reminders system
-- This replaces single reminder approach with multiple reminders per event/task

-- First, remove single reminder columns from events and tasks (if they exist)
DO $$
BEGIN
    -- Remove reminder_minutes from calendar_events if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_events' 
        AND column_name = 'reminder_minutes'
    ) THEN
        ALTER TABLE calendar_events DROP COLUMN reminder_minutes;
    END IF;

    -- Remove reminder_minutes from calendar_tasks if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_tasks' 
        AND column_name = 'reminder_minutes'
    ) THEN
        ALTER TABLE calendar_tasks DROP COLUMN reminder_minutes;
    END IF;
END $$;

-- Update calendar_reminders table to be primary reminder storage
-- Drop old constraints if they exist
ALTER TABLE calendar_reminders DROP CONSTRAINT IF EXISTS calendar_reminders_unique_item;

-- Ensure proper structure for multiple reminders
DO $$
BEGIN
    -- Make sure item_type and item_id exist and are properly set up
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_reminders' 
        AND column_name = 'item_type'
    ) THEN
        ALTER TABLE calendar_reminders 
        ADD COLUMN item_type VARCHAR(20) NOT NULL DEFAULT 'event';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_reminders' 
        AND column_name = 'item_id'
    ) THEN
        ALTER TABLE calendar_reminders 
        ADD COLUMN item_id UUID NOT NULL;
    END IF;

    -- Add minutes_before column for clarity
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_reminders' 
        AND column_name = 'minutes_before'
    ) THEN
        ALTER TABLE calendar_reminders 
        ADD COLUMN minutes_before INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Add created_by column to track who created reminder
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_reminders' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE calendar_reminders 
        ADD COLUMN created_by TEXT NOT NULL;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_reminders' 
        AND column_name = 'created_by' 
        AND data_type = 'uuid'
    ) THEN
        -- Change column type from UUID to TEXT if it exists as UUID
        ALTER TABLE calendar_reminders 
        ALTER COLUMN created_by TYPE TEXT USING created_by::text;
    END IF;
END $$;

-- Create proper indexes for multiple reminders
CREATE INDEX IF NOT EXISTS idx_calendar_reminders_item_lookup ON calendar_reminders(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_calendar_reminders_time_lookup ON calendar_reminders(reminder_time, sent);

-- Add constraints (only if they don't exist)
DO $$
BEGIN
    -- Add item_type check constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'calendar_reminders' 
        AND constraint_name = 'calendar_reminders_item_type_check'
    ) THEN
        ALTER TABLE calendar_reminders 
        ADD CONSTRAINT calendar_reminders_item_type_check 
        CHECK (item_type IN ('event', 'task'));
    END IF;
END $$;

-- Add comments for clarity
COMMENT ON TABLE calendar_reminders IS 'Stores multiple reminders for calendar events and tasks';
COMMENT ON COLUMN calendar_reminders.item_type IS 'Type of item: event or task';
COMMENT ON COLUMN calendar_reminders.item_id IS 'ID of event or task';
COMMENT ON COLUMN calendar_reminders.minutes_before IS 'Minutes before event/task to send reminder';
COMMENT ON COLUMN calendar_reminders.created_by IS 'User who created this reminder';

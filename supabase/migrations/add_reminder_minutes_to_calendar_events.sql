-- Add reminder_minutes column to calendar_events if it doesn't exist
-- This migration ensures the column is properly added and cached

DO $$
BEGIN
    -- Check if column exists, add if it doesn't
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'calendar_events' 
        AND column_name = 'reminder_minutes'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE calendar_events 
        ADD COLUMN reminder_minutes INTEGER DEFAULT 30;
        
        RAISE NOTICE 'Added reminder_minutes column to calendar_events table';
    ELSE
        RAISE NOTICE 'reminder_minutes column already exists in calendar_events table';
    END IF;
END $$;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'calendar_events' 
AND column_name = 'reminder_minutes'
AND table_schema = 'public';

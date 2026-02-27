-- Minimal RLS policy to isolate the exact issue

-- Enable Row Level Security for calendar_reminders
ALTER TABLE calendar_reminders ENABLE ROW LEVEL SECURITY;

-- Force created_by column to be TEXT type (handle all scenarios)
DO $$
BEGIN
    DECLARE
        col_type TEXT;
    BEGIN
        SELECT data_type INTO col_type
        FROM information_schema.columns 
        WHERE table_name = 'calendar_reminders' 
        AND column_name = 'created_by';
        
        RAISE NOTICE 'Current created_by column type: %', col_type;
        
        IF col_type = 'uuid' THEN
            -- Drop and recreate as TEXT
            CREATE TEMP TABLE temp_reminder_backup AS 
            SELECT id, item_type, item_id, reminder_time, sent, created_at, created_by::text as created_by_text
            FROM calendar_reminders;
            
            ALTER TABLE calendar_reminders DROP COLUMN created_by;
            ALTER TABLE calendar_reminders ADD COLUMN created_by TEXT NOT NULL DEFAULT '';
            
            UPDATE calendar_reminders r 
            SET created_by = b.created_by_text 
            FROM temp_reminder_backup b 
            WHERE r.id = b.id;
            
            DROP TABLE temp_reminder_backup;
            RAISE NOTICE 'Converted created_by from UUID to TEXT';
            
        ELSIF col_type IS NULL THEN
            -- Column doesn't exist, add it as TEXT
            ALTER TABLE calendar_reminders 
            ADD COLUMN created_by TEXT NOT NULL DEFAULT '';
            RAISE NOTICE 'Added created_by column as TEXT';
            
        ELSIF col_type != 'text' THEN
            -- Some other type, convert to TEXT
            ALTER TABLE calendar_reminders 
            ALTER COLUMN created_by TYPE TEXT USING created_by::text;
            RAISE NOTICE 'Converted created_by from % to TEXT', col_type;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error handling created_by column: %', SQLERRM;
        -- As last resort, add the column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'calendar_reminders' 
                      AND column_name = 'created_by') THEN
            ALTER TABLE calendar_reminders 
            ADD COLUMN created_by TEXT NOT NULL DEFAULT '';
        END IF;
    END;
END $$;

-- Verify the column type
DO $$
BEGIN
    RAISE NOTICE 'Final created_by column type: %', 
        (SELECT data_type FROM information_schema.columns 
         WHERE table_name = 'calendar_reminders' AND column_name = 'created_by');
END $$;

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view their own reminders" ON calendar_reminders;
DROP POLICY IF EXISTS "Users can insert their own reminders" ON calendar_reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON calendar_reminders;
DROP POLICY IF EXISTS "Users can delete their own reminders" ON calendar_reminders;
DROP POLICY IF EXISTS "Service role can manage all reminders" ON calendar_reminders;
DROP POLICY IF EXISTS "Allow all operations" ON calendar_reminders;

-- Test 1: Create a policy with NO comparisons (just allow everything)
CREATE POLICY "Allow all operations" ON calendar_reminders
    FOR ALL USING (true);

-- If this works, the issue is with the comparisons, not the table structure

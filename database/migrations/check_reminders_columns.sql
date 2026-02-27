-- Check calendar_reminders table structure specifically
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'calendar_reminders' 
ORDER BY ordinal_position;

-- Also check if there are any existing records
SELECT count(*) as reminder_count FROM calendar_reminders;

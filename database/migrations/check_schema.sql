-- Test the current schema
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'calendar_events' 
    AND column_name IN ('created_by', 'user_id')
ORDER BY ordinal_position;

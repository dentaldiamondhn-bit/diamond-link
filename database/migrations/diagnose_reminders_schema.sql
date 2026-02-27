-- Diagnostic script to identify the exact column causing the UUID/TEXT mismatch

-- Check all columns in calendar_reminders table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'calendar_reminders' 
ORDER BY ordinal_position;

-- Check if there are any existing reminders and their data types
SELECT 
    'calendar_reminders' as table_name,
    count(*) as row_count
FROM calendar_reminders;

-- Check calendar_invitees table structure (since it's referenced in policies)
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'calendar_invitees' 
ORDER BY ordinal_position;

-- Test individual comparisons to find the problematic one
DO $$
BEGIN
    -- Test created_by comparison
    BEGIN
        EXECUTE 'SELECT 1 WHERE (SELECT COALESCE(created_by::text, '''') FROM calendar_reminders LIMIT 1) = ''test''';
        RAISE NOTICE 'created_by comparison: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'created_by comparison: ERROR - %', SQLERRM;
    END;
    
    -- Test calendar_invitees.user_id comparison
    BEGIN
        EXECUTE 'SELECT 1 WHERE EXISTS (SELECT 1 FROM calendar_invitees WHERE COALESCE(user_id::text, '''') = ''test'')';
        RAISE NOTICE 'calendar_invitees.user_id comparison: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'calendar_invitees.user_id comparison: ERROR - %', SQLERRM;
    END;
END $$;

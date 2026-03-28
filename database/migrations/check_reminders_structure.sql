-- Check the current structure of calendar_reminders table
-- This will help us understand what columns actually exist

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'calendar_reminders' 
ORDER BY ordinal_position;

-- Also check if there are any constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'calendar_reminders';

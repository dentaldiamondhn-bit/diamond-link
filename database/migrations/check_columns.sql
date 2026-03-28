-- Check actual columns in tratamientos_completados table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tratamientos_completados' 
AND table_schema = 'public'
ORDER BY ordinal_position;

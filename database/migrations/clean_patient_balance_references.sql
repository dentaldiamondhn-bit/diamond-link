-- Script to find and remove any references to the deleted patient_balance table
-- Run this in Supabase SQL Editor

-- 1. Check for any triggers that reference patient_balance
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regclass as function_name,
    tgtype as trigger_type,
    tgargs as trigger_args
FROM pg_trigger 
WHERE tgargs LIKE '%patient_balance%';

-- 2. Check for any RLS policies that reference patient_balance
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE qual LIKE '%patient_balance%' 
   OR with_check LIKE '%patient_balance%';

-- 3. Check for any views that reference patient_balance
SELECT 
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views 
WHERE definition LIKE '%patient_balance%';

-- 4. Check for any functions that reference patient_balance
SELECT 
    proname as function_name,
    pronamespace::regnamespace as schema_name,
    prosrc as source_code
FROM pg_proc 
WHERE prosrc LIKE '%patient_balance%';

-- 5. Check for any foreign key constraints that reference patient_balance
SELECT
    tc.table_schema, 
    tc.table_name,
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'patient_balance';

-- 6. Check if patient_balance table still exists (should return nothing)
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'patient_balance'
);

-- After identifying any references, you can drop them with commands like:
-- DROP TRIGGER IF EXISTS trigger_name ON table_name;
-- DROP POLICY IF EXISTS policy_name ON table_name;
-- DROP VIEW IF EXISTS view_name;
-- DROP FUNCTION IF EXISTS function_name(args);
-- ALTER TABLE table_name DROP CONSTRAINT constraint_name;

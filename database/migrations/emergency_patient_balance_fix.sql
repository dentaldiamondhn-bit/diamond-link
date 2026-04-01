-- Emergency fix for patient_balance references in payment system
-- Run this immediately in Supabase SQL Editor

-- First, let's find all triggers that might be causing the issue
SELECT 
    event_object_table,
    trigger_name,
    action_timing,
    action_condition,
    action_orientation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND (event_object_table = 'payments' OR event_object_table = 'tratamientos_completados')
ORDER BY event_object_table, trigger_name;

-- Check for any functions that might reference patient_balance
SELECT 
    routine_name,
    routine_schema,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_definition LIKE '%patient_balance%';

-- Common triggers that might need to be dropped (run these if found):
-- DROP TRIGGER IF EXISTS update_patient_balance_on_payment ON payments;
-- DROP TRIGGER IF EXISTS update_patient_balance_on_treatment_payment ON tratamientos_completados;
-- DROP FUNCTION IF EXISTS update_patient_balance(payments);

-- Check if there are any remaining references in pg_trigger
SELECT 
    tgname,
    tgfoid::regclass as table_name,
    tgargs
FROM pg_trigger 
WHERE tgargs LIKE '%patient_balance%';

-- If you find any triggers above, drop them with:
-- DROP TRIGGER IF EXISTS trigger_name ON table_name;

-- Fix dependency issue - Drop trigger first, then function
-- Run this in Supabase SQL Editor

-- First, drop the trigger that depends on the function
DROP TRIGGER IF EXISTS process_payment_trigger ON payments;

-- Now drop the function
DROP FUNCTION IF EXISTS process_payment_with_positive_balance();

-- Also drop the other functions
DROP FUNCTION IF EXISTS update_patient_positive_balance(paciente_uuid UUID, amount_change DECIMAL, currency_param VARCHAR, operation_type TEXT);
DROP FUNCTION IF EXISTS add_patient_positive_balance(paciente_uuid UUID, amount DECIMAL, currency_param VARCHAR, created_by_user TEXT);
DROP FUNCTION IF EXISTS get_patient_positive_balance(paciente_uuid UUID, currency_param VARCHAR);

-- Verify all are dropped
SELECT 
    'All patient_balance functions and triggers have been dropped' as status,
    COUNT(*) as remaining_functions
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%patient_balance%';

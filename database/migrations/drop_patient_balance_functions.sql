-- Drop all functions that reference the deleted patient_balance table
-- Run this in Supabase SQL Editor

-- Drop the functions that were found in the diagnostic
DROP FUNCTION IF EXISTS update_patient_positive_balance(paciente_uuid UUID, amount_change DECIMAL, currency_param VARCHAR, operation_type TEXT);
DROP FUNCTION IF EXISTS add_patient_positive_balance(paciente_uuid UUID, amount DECIMAL, currency_param VARCHAR, created_by_user TEXT);
DROP FUNCTION IF EXISTS get_patient_positive_balance(paciente_uuid UUID, currency_param VARCHAR);
DROP FUNCTION IF EXISTS process_payment_with_positive_balance();

-- Verify all functions are dropped
SELECT 
    'All patient_balance referencing functions have been dropped' as status,
    COUNT(*) as remaining_functions
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%patient_balance%';

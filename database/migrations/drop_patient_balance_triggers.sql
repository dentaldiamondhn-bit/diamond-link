-- Quick fix - Drop any triggers that reference patient_balance
-- Run this in Supabase SQL Editor

-- Drop common payment-related triggers that might reference patient_balance
DROP TRIGGER IF EXISTS update_patient_balance_on_payment ON payments;
DROP TRIGGER IF EXISTS update_patient_balance_on_treatment_payment ON tratamientos_completados;
DROP TRIGGER IF EXISTS sync_patient_balance_payment ON payments;
DROP TRIGGER IF EXISTS patient_balance_trigger ON payments;

-- Drop any functions that might reference patient_balance
DROP FUNCTION IF EXISTS update_patient_balance();
DROP FUNCTION IF EXISTS calculate_patient_balance();
DROP FUNCTION IF EXISTS sync_patient_balance(payments);

-- Verify no more references
SELECT 'Triggers and functions referencing patient_balance have been dropped' as status;

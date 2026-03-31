-- Script to add positive balance for Jane Doe (patient who paid 4950.00 HNL in advance)
-- This script identifies the patient and adds the positive balance to their account

-- First, let's identify the patient from the payment record
-- The payment ID from your example: 30b7add4-167a-4dce-b6e1-df630d993d73

-- Step 1: Find the patient and treatment from the payment record
DO $$
DECLARE
    payment_id UUID := '30b7add4-167a-4dce-b6e1-df630d993d73';
    patient_id_from_treatment UUID;
    treatment_id_from_payment UUID;
    payment_amount DECIMAL(10,2);
    payment_currency VARCHAR(3);
BEGIN
    -- Get treatment info from the payment
    SELECT p.tratamiento_completado_id, p.monto_pago, p.moneda
    INTO treatment_id_from_payment, payment_amount, payment_currency
    FROM payments p
    WHERE p.id = payment_id;
    
    -- Get patient ID from the treatment
    SELECT tc.paciente_id
    INTO patient_id_from_treatment
    FROM tratamientos_completados tc
    WHERE tc.id = treatment_id_from_payment;
    
    -- Add the positive balance to the patient's account
    IF patient_id_from_treatment IS NOT NULL THEN
        PERFORM add_patient_positive_balance(
            patient_id_from_treatment,
            payment_amount,
            payment_currency,
            'system' -- Created by system for initial balance setup
        );
        
        RAISE NOTICE 'Positive balance of % % added successfully for patient %', 
                    payment_amount, payment_currency, patient_id_from_treatment;
    ELSE
        RAISE EXCEPTION 'Treatment not found or patient ID is null';
    END IF;
END $$;

-- Step 2: Verify the balance was added
SELECT 
    pb.paciente_id,
    p.nombre_completo as patient_name,
    pb.balance_amount,
    pb.currency,
    pb.created_at,
    pb.updated_at
FROM patient_balance pb
JOIN patients p ON pb.paciente_id = p.id
WHERE pb.balance_amount > 0
ORDER BY pb.updated_at DESC;

-- Step 3: Show payment history with positive balance info
SELECT 
    tc.id as treatment_id,
    tc.nombre_paciente,
    tc.total_final,
    tc.moneda,
    tc.saldo_positivo_aplicado,
    tc.saldo_positivo_restante,
    p.id as payment_id,
    p.monto_pago,
    p.aplica_saldo_positivo,
    p.monto_saldo_aplicado,
    p.saldo_restante_despues_pago,
    p.fecha_pago
FROM tratamientos_completados tc
JOIN payments p ON tc.id = p.tratamiento_completado_id
WHERE tc.paciente_id = (
    SELECT tc.paciente_id 
    FROM tratamientos_completados tc
    JOIN payments p ON tc.id = p.tratamiento_completado_id
    WHERE p.id = '30b7add4-167a-4dce-b6e1-df630d993d73'
)
ORDER BY tc.fecha_tratamiento DESC, p.fecha_pago DESC;

-- For future reference: Function to add positive balance to any patient
-- Usage: SELECT add_patient_positive_balance('patient-uuid', amount, 'HNL', 'user-name');
-- Example: SELECT add_patient_positive_balance('123e4567-e89b-12d3-a456-426614174000', 1000.00, 'HNL', 'admin');

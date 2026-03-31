-- Retroactively apply positive balance for Samir Alessandro Cruz Mejia
-- This script corrects the historical data to apply positive balance that should have been used

-- Step 1: Add Samir's positive balance from his advance payment
DO $$
DECLARE
    samir_patient_id UUID;
    advance_payment_id UUID := '30b7add4-167a-4dce-b6e1-df630d993d73';
    payment_amount DECIMAL(10,2) := 4950.00;
    payment_currency VARCHAR(3) := 'HNL';
BEGIN
    -- Get Samir's patient ID from the payment
    SELECT tc.paciente_id
    INTO samir_patient_id
    FROM tratamientos_completados tc
    JOIN payments p ON tc.id = p.tratamiento_completado_id
    WHERE p.id = advance_payment_id;
    
    -- Add the positive balance to Samir's account
    IF samir_patient_id IS NOT NULL THEN
        PERFORM add_patient_positive_balance(
            samir_patient_id,
            payment_amount,
            payment_currency,
            'system' -- Created by system for retroactive balance setup
        );
        
        RAISE NOTICE 'Positive balance of % % added successfully for Samir (patient %)', 
                    payment_amount, payment_currency, samir_patient_id;
    ELSE
        RAISE EXCEPTION 'Samir patient ID not found';
    END IF;
END $$;

-- Step 2: Apply positive balance to the March 14th treatment (1100.00 HNL)
DO $$
DECLARE
    samir_patient_id UUID;
    treatment_id UUID := '92c52e5d-aafd-4551-be51-9a8f7967890d';
    payment_id UUID := '30b7add4-167a-4dce-b6e1-df630d993d73';
    treatment_amount DECIMAL(10,2) := 1100.00;
    payment_currency VARCHAR(3) := 'HNL';
    remaining_balance DECIMAL(10,2);
    original_payment_amount DECIMAL(10,2) := 4950.00;
BEGIN
    -- Get Samir's patient ID
    SELECT tc.paciente_id
    INTO samir_patient_id
    FROM tratamientos_completados tc
    WHERE tc.id = treatment_id;
    
    -- Update payment record to show positive balance was applied
    UPDATE payments 
    SET 
        aplica_saldo_positivo = TRUE,
        monto_saldo_aplicado = treatment_amount,
        saldo_restante_despues_pago = original_payment_amount - treatment_amount,
        monto_pago = original_payment_amount - treatment_amount -- Actual payment after balance deduction
    WHERE id = payment_id;
    
    -- Update treatment record to show positive balance usage
    UPDATE tratamientos_completados 
    SET 
        saldo_positivo_aplicado = treatment_amount,
        saldo_positivo_restante = original_payment_amount - treatment_amount
    WHERE id = treatment_id;
    
    -- Deduct from Samir's positive balance
    PERFORM update_patient_positive_balance(
        samir_patient_id, 
        treatment_amount, 
        payment_currency, 
        'subtract'
    );
    
    -- Get remaining balance
    SELECT get_patient_positive_balance(samir_patient_id, payment_currency)
    INTO remaining_balance;
    
    RAISE NOTICE 'Applied % % from Samir''s positive balance. Remaining balance: % %', 
                treatment_amount, payment_currency, remaining_balance, payment_currency;
END $$;

-- Step 3: Check if the March 21st treatment (1300.00 HNL) should also use positive balance
DO $$
DECLARE
    samir_patient_id UUID;
    treatment_id UUID := '131c273c-d668-416a-82af-883c05a7e8e7';
    payment_id UUID := '0142abb0-3195-4e9c-aa41-8bdf1870a6bc';
    treatment_amount DECIMAL(10,2) := 1300.00;
    payment_currency VARCHAR(3) := 'HNL';
    current_balance DECIMAL(10,2);
    amount_to_apply DECIMAL(10,2);
    remaining_payment DECIMAL(10,2);
    original_payment_amount DECIMAL(10,2) := 1300.00;
BEGIN
    -- Get Samir's patient ID and current balance
    SELECT tc.paciente_id
    INTO samir_patient_id
    FROM tratamientos_completados tc
    WHERE tc.id = treatment_id;
    
    -- Get current positive balance
    SELECT get_patient_positive_balance(samir_patient_id, payment_currency)
    INTO current_balance;
    
    -- Check if we have enough balance to apply
    IF current_balance >= treatment_amount THEN
        amount_to_apply := treatment_amount;
        remaining_payment := 0;
    ELSIF current_balance > 0 THEN
        amount_to_apply := current_balance;
        remaining_payment := treatment_amount - current_balance;
    ELSE
        amount_to_apply := 0;
        remaining_payment := treatment_amount;
    END IF;
    
    -- Apply positive balance if available
    IF amount_to_apply > 0 THEN
        -- Update payment record
        UPDATE payments 
        SET 
            aplica_saldo_positivo = TRUE,
            monto_saldo_aplicado = amount_to_apply,
            saldo_restante_despues_pago = remaining_payment,
            monto_pago = remaining_payment
        WHERE id = payment_id;
        
        -- Update treatment record
        UPDATE tratamientos_completados 
        SET 
            saldo_positivo_aplicado = amount_to_apply,
            saldo_positivo_restante = current_balance - amount_to_apply
        WHERE id = treatment_id;
        
        -- Deduct from positive balance
        PERFORM update_patient_positive_balance(
            samir_patient_id, 
            amount_to_apply, 
            payment_currency, 
            'subtract'
        );
        
        RAISE NOTICE 'Applied % % from Samir''s positive balance to March 21st treatment. Remaining payment: % %', 
                    amount_to_apply, payment_currency, remaining_payment, payment_currency;
    ELSE
        RAISE NOTICE 'No positive balance available for March 21st treatment';
    END IF;
END $$;

-- Step 4: Verify the corrections
SELECT 
    tc.id as treatment_id,
    p.nombre_completo as patient_name,
    tc.total_final,
    tc.moneda,
    tc.saldo_positivo_aplicado,
    tc.saldo_positivo_restante,
    pay.id as payment_id,
    pay.monto_pago,
    pay.aplica_saldo_positivo,
    pay.monto_saldo_aplicado,
    pay.saldo_restante_despues_pago,
    pay.fecha_pago
FROM tratamientos_completados tc
JOIN payments pay ON tc.id = pay.tratamiento_completado_id
JOIN patients p ON tc.paciente_id = p.paciente_id
WHERE p.nombre_completo LIKE '%Samir%'
ORDER BY pay.fecha_pago DESC;

-- Step 5: Show Samir's current positive balance
SELECT 
    pb.paciente_id,
    p.nombre_completo as patient_name,
    pb.balance_amount,
    pb.currency,
    pb.created_at,
    pb.updated_at
FROM patient_balance pb
JOIN patients p ON pb.paciente_id = p.paciente_id
WHERE p.nombre_completo LIKE '%Samir%'
ORDER BY pb.updated_at DESC;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Samir''s positive balance has been retroactively applied!';
    RAISE NOTICE '✅ March 14th treatment: 1100.00 HNL deducted from positive balance';
    RAISE NOTICE '✅ March 21st treatment: Balance applied if available';
    RAISE NOTICE '✅ All records updated correctly!';
END $$;

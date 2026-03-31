-- Add positive balance system for patients
-- This allows patients to have credit that gets automatically deducted from new treatments

-- Create patient_balance table to track positive balances
CREATE TABLE IF NOT EXISTS patient_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES patients(paciente_id) ON DELETE CASCADE,
    balance_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'HNL' CHECK (currency IN ('HNL', 'USD')),
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_patient_balance_paciente_id ON patient_balance(paciente_id);
CREATE INDEX IF NOT EXISTS idx_patient_balance_currency ON patient_balance(currency);

-- Add balance tracking columns to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS aplica_saldo_positivo BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS monto_saldo_aplicado DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo_restante_despues_pago DECIMAL(10,2) DEFAULT 0;

-- Add positive balance tracking to tratamientos_completados
ALTER TABLE tratamientos_completados
ADD COLUMN IF NOT EXISTS saldo_positivo_aplicado DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo_positivo_restante DECIMAL(10,2) DEFAULT 0;

-- Function to get patient's current positive balance
CREATE OR REPLACE FUNCTION get_patient_positive_balance(paciente_uuid UUID, currency_param VARCHAR(3) DEFAULT 'HNL')
RETURNS DECIMAL(10,2) AS $$
DECLARE
    current_balance DECIMAL(10,2);
BEGIN
    SELECT COALESCE(balance_amount, 0) 
    INTO current_balance
    FROM patient_balance 
    WHERE paciente_id = paciente_uuid AND currency = currency_param;
    
    RETURN COALESCE(current_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update patient positive balance
CREATE OR REPLACE FUNCTION update_patient_positive_balance(
    paciente_uuid UUID, 
    amount_change DECIMAL(10,2), 
    currency_param VARCHAR(3) DEFAULT 'HNL',
    operation_type VARCHAR(10) DEFAULT 'add' -- 'add' or 'subtract'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(10,2);
    new_balance DECIMAL(10,2);
BEGIN
    -- Get current balance
    SELECT COALESCE(balance_amount, 0) 
    INTO current_balance
    FROM patient_balance 
    WHERE paciente_id = paciente_uuid AND currency = currency_param
    FOR UPDATE;
    
    -- Calculate new balance
    IF operation_type = 'add' THEN
        new_balance := current_balance + amount_change;
    ELSIF operation_type = 'subtract' THEN
        new_balance := current_balance - amount_change;
        -- Ensure balance doesn't go negative
        IF new_balance < 0 THEN
            new_balance := 0;
        END IF;
    ELSE
        RETURN FALSE;
    END IF;
    
    -- Update or insert balance
    INSERT INTO patient_balance (paciente_id, balance_amount, currency, updated_at)
    VALUES (paciente_uuid, new_balance, currency_param, NOW())
    ON CONFLICT (paciente_id, currency)
    DO UPDATE SET 
        balance_amount = EXCLUDED.balance_amount,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Enhanced payment trigger to handle positive balance
CREATE OR REPLACE FUNCTION process_payment_with_positive_balance()
RETURNS TRIGGER AS $$
DECLARE
    treatment_record RECORD;
    patient_balance DECIMAL(10,2);
    treatment_currency VARCHAR(3);
    payment_amount DECIMAL(10,2);
    remaining_amount DECIMAL(10,2);
    balance_to_apply DECIMAL(10,2);
BEGIN
    -- Get treatment details
    SELECT * INTO treatment_record 
    FROM tratamientos_completados 
    WHERE id = NEW.tratamiento_completado_id;
    
    treatment_currency := treatment_record.moneda;
    payment_amount := NEW.monto_pago;
    
    -- Check if patient has positive balance
    SELECT get_patient_positive_balance(treatment_record.paciente_id, treatment_currency)
    INTO patient_balance;
    
    IF patient_balance > 0 THEN
        -- Calculate how much balance to apply
        balance_to_apply := LEAST(patient_balance, payment_amount);
        remaining_amount := payment_amount - balance_to_apply;
        
        -- Update payment record with balance application
        UPDATE payments 
        SET 
            aplica_saldo_positivo = TRUE,
            monto_saldo_aplicado = balance_to_apply,
            saldo_restante_despues_pago = remaining_amount
        WHERE id = NEW.id;
        
        -- Update treatment record with balance info
        UPDATE tratamientos_completados 
        SET 
            saldo_positivo_aplicado = balance_to_apply,
            saldo_positivo_restante = patient_balance - balance_to_apply
        WHERE id = NEW.tratamiento_completado_id;
        
        -- Deduct from patient's positive balance
        PERFORM update_patient_positive_balance(
            treatment_record.paciente_id, 
            balance_to_apply, 
            treatment_currency, 
            'subtract'
        );
        
        -- If there's remaining amount, update the actual payment amount
        IF remaining_amount > 0 THEN
            UPDATE payments 
            SET monto_pago = remaining_amount
            WHERE id = NEW.id;
        END IF;
    END IF;
    
    -- Continue with normal payment processing
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment processing
DROP TRIGGER IF EXISTS process_payment_trigger ON payments;
CREATE TRIGGER process_payment_trigger
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION process_payment_with_positive_balance();

-- Function to add positive balance to patient account
CREATE OR REPLACE FUNCTION add_patient_positive_balance(
    paciente_uuid UUID,
    amount DECIMAL(10,2),
    currency_param VARCHAR(3) DEFAULT 'HNL',
    created_by_user VARCHAR(255) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Add to patient balance
    PERFORM update_patient_positive_balance(paciente_uuid, amount, currency_param, 'add');
    
    -- Log the balance addition (you could create a separate log table if needed)
    INSERT INTO patient_balance (paciente_id, balance_amount, currency, created_by, created_at, updated_at)
    VALUES (paciente_uuid, 
            get_patient_positive_balance(paciente_uuid, currency_param), 
            currency_param, 
            created_by_user, 
            NOW(), 
            NOW())
    ON CONFLICT (paciente_id, currency)
    DO UPDATE SET 
        balance_amount = EXCLUDED.balance_amount,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE patient_balance IS 'Tracks positive credit balance for patients';
COMMENT ON COLUMN patient_balance.balance_amount IS 'Current positive balance amount';
COMMENT ON COLUMN patient_balance.currency IS 'Currency of the balance (HNL, USD)';
COMMENT ON COLUMN payments.aplica_saldo_positivo IS 'Whether positive balance was applied to this payment';
COMMENT ON COLUMN payments.monto_saldo_aplicado IS 'Amount of positive balance applied to this payment';
COMMENT ON COLUMN payments.saldo_restante_despues_pago IS 'Remaining payment amount after positive balance application';
COMMENT ON COLUMN tratamientos_completados.saldo_positivo_aplicado IS 'Positive balance amount applied to this treatment';
COMMENT ON COLUMN tratamientos_completados.saldo_positivo_restante IS 'Patient remaining positive balance after this treatment';

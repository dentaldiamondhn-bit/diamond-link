-- Create payments table for treatment installment tracking
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tratamiento_completado_id UUID NOT NULL REFERENCES tratamientos_completados(id) ON DELETE CASCADE,
    monto_pago DECIMAL(10,2) NOT NULL,
    moneda VARCHAR(3) NOT NULL DEFAULT 'HNL' CHECK (moneda IN ('HNL', 'USD')),
    fecha_pago TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metodo_pago VARCHAR(50) NOT NULL, -- 'efectivo', 'tarjeta', 'transferencia', 'cheque', etc.
    notas_pago TEXT,
    creado_por VARCHAR(255),
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add payment tracking columns to tratamientos_completados
ALTER TABLE tratamientos_completados 
ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'HNL' CHECK (moneda IN ('HNL', 'USD')),
ADD COLUMN IF NOT EXISTS monto_pagado DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo_pendiente DECIMAL(10,2) GENERATED ALWAYS AS (total_final - monto_pagado) STORED,
ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente', 'parcialmente_pagado', 'pagado'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_tratamiento_completado_id ON payments(tratamiento_completado_id);
CREATE INDEX IF NOT EXISTS idx_payments_fecha_pago ON payments(fecha_pago);

-- Create function to update payment status when payments are added/updated
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the monto_pagado in tratamientos_completados
    UPDATE tratamientos_completados 
    SET 
        monto_pagado = (
            SELECT COALESCE(SUM(monto_pago), 0) 
            FROM payments 
            WHERE tratamiento_completado_id = NEW.tratamiento_completado_id
        ),
        actualizado_en = NOW()
    WHERE id = NEW.tratamiento_completado_id;
    
    -- Update the payment status based on amount paid
    UPDATE tratamientos_completados 
    SET estado_pago = CASE
        WHEN (SELECT COALESCE(SUM(monto_pago), 0) FROM payments WHERE tratamiento_completado_id = NEW.tratamiento_completado_id) >= total_final THEN 'pagado'
        WHEN (SELECT COALESCE(SUM(monto_pago), 0) FROM payments WHERE tratamiento_completado_id = NEW.tratamiento_completado_id) > 0 THEN 'parcialmente_pagado'
        ELSE 'pendiente'
    END,
    actualizado_en = NOW()
    WHERE id = NEW.tratamiento_completado_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update payment status
DROP TRIGGER IF EXISTS trigger_update_payment_status ON payments;
CREATE TRIGGER trigger_update_payment_status
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_status();

-- Create function to initialize payment status for existing records
CREATE OR REPLACE FUNCTION initialize_payment_status()
RETURNS VOID AS $$
BEGIN
    -- Update existing records to have correct payment status
    UPDATE tratamientos_completados 
    SET 
        monto_pagado = COALESCE(monto_pagado, 0),
        estado_pago = CASE
            WHEN COALESCE(monto_pagado, 0) >= total_final THEN 'pagado'
            WHEN COALESCE(monto_pagado, 0) > 0 THEN 'parcialmente_pagado'
            ELSE 'pendiente'
        END,
        actualizado_en = NOW()
    WHERE monto_pagado IS NULL OR estado_pago IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payments
DROP POLICY IF EXISTS "Users can view payments for their completed treatments" ON payments;
CREATE POLICY "Users can view payments for their completed treatments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tratamientos_completados tc
            WHERE tc.id = payments.tratamiento_completado_id
        )
    );

DROP POLICY IF EXISTS "Users can insert payments for their completed treatments" ON payments;
CREATE POLICY "Users can insert payments for their completed treatments" ON payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tratamientos_completados tc
            WHERE tc.id = tratamiento_completado_id
        )
    );

DROP POLICY IF EXISTS "Users can update payments for their completed treatments" ON payments;
CREATE POLICY "Users can update payments for their completed treatments" ON payments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM tratamientos_completados tc
            WHERE tc.id = payments.tratamiento_completado_id
        )
    );

-- Initialize payment status for existing records
SELECT initialize_payment_status();

-- Fix recursive trigger issue causing stack depth limit exceeded
-- This script replaces the problematic triggers with safer versions

-- First, drop all existing triggers that might cause recursion
DROP TRIGGER IF EXISTS ensure_estado_sync ON tratamientos_completados;
DROP TRIGGER IF EXISTS sync_vista_estado_on_tratamientos_change ON tratamientos_completados;
DROP FUNCTION IF EXISTS sync_estado_with_estado_pago();
DROP FUNCTION IF EXISTS sync_vista_estado_with_tratamientos();

-- Create a safer trigger function that prevents recursion
CREATE OR REPLACE FUNCTION sync_estado_with_estado_pago()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update estado if it's different from estado_pago to prevent recursion
    IF NEW.estado != NEW.estado_pago THEN
        NEW.estado = NEW.estado_pago;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger with BEFORE timing (safer)
CREATE TRIGGER ensure_estado_sync
    BEFORE INSERT OR UPDATE ON tratamientos_completados
    FOR EACH ROW
    EXECUTE FUNCTION sync_estado_with_estado_pago();

-- Create a separate function to update the vista that doesn't cause recursion
CREATE OR REPLACE FUNCTION update_vista_tratamientos_estado()
RETURNS TRIGGER AS $$
BEGIN
    -- Update vista_tratamientos_completados_detalles only if estado_pago changed
    IF TG_OP = 'UPDATE' AND OLD.estado_pago != NEW.estado_pago THEN
        UPDATE vista_tratamientos_completados_detalles 
        SET estado = NEW.estado_pago
        WHERE id = NEW.id;
    ELSIF TG_OP = 'INSERT' THEN
        UPDATE vista_tratamientos_completados_detalles 
        SET estado = NEW.estado_pago
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger with AFTER timing to avoid conflicts
CREATE TRIGGER update_vista_estado_after_payment_change
    AFTER INSERT OR UPDATE ON tratamientos_completados
    FOR EACH ROW
    EXECUTE FUNCTION update_vista_tratamientos_estado();

-- Also create a trigger for payments table to update treatment payment status
CREATE OR REPLACE FUNCTION update_treatment_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When a payment is deleted, recalculate the treatment payment status
    IF TG_OP = 'DELETE' THEN
        UPDATE tratamientos_completados 
        SET 
            monto_pagado = (
                SELECT COALESCE(SUM(monto_convertido), 0) 
                FROM payments 
                WHERE tratamiento_completado_id = OLD.tratamiento_completado_id
                AND monto_convertido IS NOT NULL
            ) + (
                SELECT COALESCE(SUM(monto_pago), 0) 
                FROM payments 
                WHERE tratamiento_completado_id = OLD.tratamiento_completado_id
                AND monto_convertido IS NULL
            ),
            estado_pago = CASE
                WHEN total_final = 0 THEN 'pagado'
                WHEN total_final <= (
                    SELECT COALESCE(SUM(monto_convertido), 0) 
                    FROM payments 
                    WHERE tratamiento_completado_id = OLD.tratamiento_completado_id
                    AND monto_convertido IS NOT NULL
                ) + (
                    SELECT COALESCE(SUM(monto_pago), 0) 
                    FROM payments 
                    WHERE tratamiento_completado_id = OLD.tratamiento_completado_id
                    AND monto_convertido IS NULL
                ) THEN 'pagado'
                WHEN (
                    SELECT COALESCE(SUM(monto_convertido), 0) 
                    FROM payments 
                    WHERE tratamiento_completado_id = OLD.tratamiento_completado_id
                    AND monto_convertido IS NOT NULL
                ) + (
                    SELECT COALESCE(SUM(monto_pago), 0) 
                    FROM payments 
                    WHERE tratamiento_completado_id = OLD.tratamiento_completado_id
                    AND monto_convertido IS NULL
                ) > 0 THEN 'parcialmente_pagado'
                ELSE 'pendiente'
            END,
            actualizado_en = NOW()
        WHERE id = OLD.tratamiento_completado_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing payment trigger if it exists
DROP TRIGGER IF EXISTS payment_status_update ON payments;

-- Create trigger for payment deletions
CREATE TRIGGER payment_status_update
    AFTER DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_treatment_payment_status();

-- Test query to verify the fix
SELECT 
    tc.id,
    tc.estado as tc_estado,
    tc.estado_pago as tc_estado_pago,
    vtd.estado as vtd_estado
FROM tratamientos_completados tc
LEFT JOIN vista_tratamientos_completados_detalles vtd ON tc.id = vtd.id
WHERE tc.id = '32aade54-98eb-4d9e-98e0-31f5635baf19' -- Replace with actual treatment ID
LIMIT 1;

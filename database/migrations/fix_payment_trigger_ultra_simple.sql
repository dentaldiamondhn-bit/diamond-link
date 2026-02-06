-- Ultra-simple payment trigger that works with currency conversion
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle DELETE operation
    IF TG_OP = 'DELETE' THEN
        UPDATE tratamientos_completados 
        SET 
            monto_pagado = (
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN moneda_conversion = moneda THEN monto_convertido
                        ELSE monto_pago
                    END), 0) 
                FROM payments 
                WHERE tratamiento_completado_id = OLD.tratamiento_completado_id
            ),
            estado_pago = CASE
                WHEN (
                    SELECT total_final - COALESCE(SUM(
                        CASE 
                            WHEN moneda_conversion = moneda THEN monto_convertido
                            ELSE monto_pago
                        END), 0)
                    FROM tratamientos_completados tc
                    LEFT JOIN payments p ON p.tratamiento_completado_id = tc.id
                    WHERE tc.id = OLD.tratamiento_completado_id
                ) <= 0 THEN 'pagado'
                WHEN (
                    SELECT COALESCE(SUM(
                        CASE 
                            WHEN moneda_conversion = moneda THEN monto_convertido
                            ELSE monto_pago
                        END), 0)
                    FROM payments 
                    WHERE tratamiento_completado_id = OLD.tratamiento_completado_id
                ) > 0 THEN 'parcialmente_pagado'
                ELSE 'pendiente'
            END,
            actualizado_en = NOW()
        WHERE id = OLD.tratamiento_completado_id;
        
        RETURN OLD;
    END IF;
    
    -- Handle INSERT/UPDATE operations
    UPDATE tratamientos_completados 
    SET 
        monto_pagado = (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN moneda_conversion = moneda THEN monto_convertido
                    ELSE monto_pago
                END), 0) 
            FROM payments 
            WHERE tratamiento_completado_id = NEW.tratamiento_completado_id
        ),
        estado_pago = CASE
            WHEN (
                SELECT total_final - COALESCE(SUM(
                    CASE 
                        WHEN moneda_conversion = moneda THEN monto_convertido
                        ELSE monto_pago
                    END), 0)
                FROM tratamientos_completados tc
                LEFT JOIN payments p ON p.tratamiento_completado_id = tc.id
                WHERE tc.id = NEW.tratamiento_completado_id
            ) <= 0 THEN 'pagado'
            WHEN (
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN moneda_conversion = moneda THEN monto_convertido
                        ELSE monto_pago
                    END), 0)
                FROM payments 
                WHERE tratamiento_completado_id = NEW.tratamiento_completado_id
            ) > 0 THEN 'parcialmente_pagado'
            ELSE 'pendiente'
        END,
        actualizado_en = NOW()
    WHERE id = NEW.tratamiento_completado_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_update_payment_status ON payments;
CREATE TRIGGER trigger_update_payment_status
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_status();

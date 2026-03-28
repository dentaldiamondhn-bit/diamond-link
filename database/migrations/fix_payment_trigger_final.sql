-- Final working payment trigger - no ambiguous columns
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle DELETE operation
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
    
    -- Handle INSERT/UPDATE operations
    UPDATE tratamientos_completados 
    SET 
        monto_pagado = (
            SELECT COALESCE(SUM(monto_convertido), 0) 
            FROM payments 
            WHERE tratamiento_completado_id = NEW.tratamiento_completado_id
            AND monto_convertido IS NOT NULL
        ) + (
            SELECT COALESCE(SUM(monto_pago), 0) 
            FROM payments 
            WHERE tratamiento_completado_id = NEW.tratamiento_completado_id
            AND monto_convertido IS NULL
        ),
        estado_pago = CASE
            WHEN total_final <= (
                SELECT COALESCE(SUM(monto_convertido), 0) 
                FROM payments 
                WHERE tratamiento_completado_id = NEW.tratamiento_completado_id
                AND monto_convertido IS NOT NULL
            ) + (
                SELECT COALESCE(SUM(monto_pago), 0) 
                FROM payments 
                WHERE tratamiento_completado_id = NEW.tratamiento_completado_id
                AND monto_convertido IS NULL
            ) THEN 'pagado'
            WHEN (
                SELECT COALESCE(SUM(monto_convertido), 0) 
                FROM payments 
                WHERE tratamiento_completado_id = NEW.tratamiento_completado_id
                AND monto_convertido IS NOT NULL
            ) + (
                SELECT COALESCE(SUM(monto_pago), 0) 
                FROM payments 
                WHERE tratamiento_completado_id = NEW.tratamiento_completado_id
                AND monto_convertido IS NULL
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

-- Fix the payment trigger to handle DELETE operations properly
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle DELETE operation
    IF TG_OP = 'DELETE' THEN
        -- Update the treatment with recalculated amounts
        UPDATE tratamientos_completados 
        SET 
            monto_pagado = (
                SELECT COALESCE(
                    SUM(CASE 
                        WHEN p.moneda_conversion = tc.moneda THEN p.monto_convertido
                        WHEN p.moneda = tc.moneda THEN p.monto_pago
                        ELSE p.monto_convertido
                    END), 0
                ) 
                FROM payments p
                WHERE p.tratamiento_completado_id = OLD.tratamiento_completado_id
            ),
            estado_pago = CASE
                WHEN (
                    SELECT COALESCE(
                        SUM(CASE 
                            WHEN p.moneda_conversion = tc.moneda THEN p.monto_convertido
                            WHEN p.moneda = tc.moneda THEN p.monto_pago
                            ELSE p.monto_convertido
                        END), 0
                    ) 
                    FROM payments p, tratamientos_completados tc
                    WHERE p.tratamiento_completado_id = OLD.tratamiento_completado_id AND tc.id = p.tratamiento_completado_id
                ) >= tc.total_final THEN 'pagado'
                WHEN (
                    SELECT COALESCE(
                        SUM(CASE 
                            WHEN p.moneda_conversion = tc.moneda THEN p.monto_convertido
                            WHEN p.moneda = tc.moneda THEN p.monto_pago
                            ELSE p.monto_convertido
                        END), 0
                    ) 
                    FROM payments p, tratamientos_completados tc
                    WHERE p.tratamiento_completado_id = OLD.tratamiento_completado_id AND tc.id = p.tratamiento_completado_id
                ) > 0 THEN 'parcialmente_pagado'
                ELSE 'pendiente'
            END,
            actualizado_en = NOW()
        FROM tratamientos_completados tc
        WHERE tc.id = OLD.tratamiento_completado_id;
        
        RETURN OLD;
    END IF;
    
    -- Handle INSERT/UPDATE operations
    UPDATE tratamientos_completados 
    SET 
        monto_pagado = (
            SELECT COALESCE(
                SUM(CASE 
                    WHEN moneda_conversion = tc.moneda THEN monto_convertido
                    WHEN moneda = tc.moneda THEN monto_pago
                    ELSE monto_convertido
                END), 0
            ) 
            FROM payments p
            WHERE p.tratamiento_completado_id = NEW.tratamiento_completado_id
        ),
        estado_pago = CASE
            WHEN (
                SELECT COALESCE(
                    SUM(CASE 
                        WHEN p.moneda_conversion = tc.moneda THEN p.monto_convertido
                        WHEN p.moneda = tc.moneda THEN p.monto_pago
                        ELSE p.monto_convertido
                    END), 0
                ) 
                FROM payments p, tratamientos_completados tc
                WHERE p.tratamiento_completado_id = NEW.tratamiento_completado_id AND tc.id = p.tratamiento_completado_id
            ) >= tc.total_final THEN 'pagado'
            WHEN (
                SELECT COALESCE(
                    SUM(CASE 
                        WHEN p.moneda_conversion = tc.moneda THEN p.monto_convertido
                        WHEN p.moneda = tc.moneda THEN p.monto_pago
                        ELSE p.monto_convertido
                    END), 0
                ) 
                FROM payments p, tratamientos_completados tc
                WHERE p.tratamiento_completado_id = NEW.tratamiento_completado_id AND tc.id = p.tratamiento_completado_id
            ) > 0 THEN 'parcialmente_pagado'
            ELSE 'pendiente'
        END,
        actualizado_en = NOW()
    FROM tratamientos_completados tc
    WHERE tc.id = NEW.tratamiento_completado_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger to handle all operations
DROP TRIGGER IF EXISTS trigger_update_payment_status ON payments;
CREATE TRIGGER trigger_update_payment_status
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_status();

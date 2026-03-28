-- Simplified and fixed payment trigger to avoid ambiguous column references
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
                        WHEN p.moneda_conversion = tc.moneda THEN p.monto_convertido
                        WHEN p.moneda = tc.moneda THEN p.monto_pago
                        ELSE p.monto_convertido
                    END), 0) 
                FROM payments p
                WHERE p.tratamiento_completado_id = OLD.tratamiento_completado_id
            ),
            estado_pago = (
                SELECT 
                    CASE 
                        WHEN COALESCE(SUM(
                            CASE 
                                WHEN p.moneda_conversion = tc.moneda THEN p.monto_convertido
                                WHEN p.moneda = tc.moneda THEN p.monto_pago
                                ELSE p.monto_convertido
                            END), 0) >= tc.total_final THEN 'pagado'
                        WHEN COALESCE(SUM(
                            CASE 
                                WHEN p.moneda_conversion = tc.moneda THEN p.monto_convertido
                                WHEN p.moneda = tc.moneda THEN p.monto_pago
                                ELSE p.monto_convertido
                            END), 0) > 0 THEN 'parcialmente_pagado'
                        ELSE 'pendiente'
                    END
                FROM tratamientos_completados tc
                LEFT JOIN payments p ON p.tratamiento_completado_id = tc.id
                WHERE tc.id = OLD.tratamiento_completado_id
            ),
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
                    WHEN p.moneda_conversion = tc.moneda THEN p.monto_convertido
                    WHEN p.moneda = tc.moneda THEN p.monto_pago
                    ELSE p.monto_convertido
                END), 0) 
            FROM payments p
            WHERE p.tratamiento_completado_id = NEW.tratamiento_completado_id
        ),
        estado_pago = (
            SELECT 
                CASE 
                    WHEN COALESCE(SUM(
                        CASE 
                            WHEN p.moneda_conversion = tc.moneda THEN p.monto_convertido
                            WHEN p.moneda = tc.moneda THEN p.monto_pago
                            ELSE p.monto_convertido
                        END), 0) >= tc.total_final THEN 'pagado'
                    WHEN COALESCE(SUM(
                        CASE 
                            WHEN p.moneda_conversion = tc.moneda THEN p.monto_convertido
                            WHEN p.moneda = tc.moneda THEN p.monto_pago
                            ELSE p.monto_convertido
                        END), 0) > 0 THEN 'parcialmente_pagado'
                    ELSE 'pendiente'
                END
            FROM tratamientos_completados tc
            LEFT JOIN payments p ON p.tratamiento_completado_id = tc.id
            WHERE tc.id = NEW.tratamiento_completado_id
        ),
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

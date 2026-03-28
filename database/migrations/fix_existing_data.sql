-- Fix existing inconsistent treatment data
UPDATE tratamientos_completados 
SET 
    monto_pagado = (
        SELECT COALESCE(SUM(monto_pago), 0) 
        FROM payments 
        WHERE payments.tratamiento_completado_id = tratamientos_completados.id
    ),
    estado_pago = CASE
        WHEN (
            SELECT COALESCE(SUM(monto_pago), 0) 
            FROM payments 
            WHERE payments.tratamiento_completado_id = tratamientos_completados.id
        ) >= total_final THEN 'pagado'
        WHEN (
            SELECT COALESCE(SUM(monto_pago), 0) 
            FROM payments 
            WHERE payments.tratamiento_completado_id = tratamientos_completados.id
        ) > 0 THEN 'parcialmente_pagado'
        ELSE 'pendiente'
    END,
    actualizado_en = NOW()
WHERE id IN (
    -- Only update treatments that have inconsistent data
    SELECT tc.id 
    FROM tratamientos_completados tc
    LEFT JOIN (
        SELECT tratamiento_completado_id, SUM(monto_pago) as actual_sum
        FROM payments
        GROUP BY tratamiento_completado_id
    ) p ON tc.id = p.tratamiento_completado_id
    WHERE tc.monto_pagado != COALESCE(p.actual_sum, 0)
    OR tc.estado_pago != CASE
        WHEN COALESCE(p.actual_sum, 0) >= tc.total_final THEN 'pagado'
        WHEN COALESCE(p.actual_sum, 0) > 0 THEN 'parcialmente_pagado'
        ELSE 'pendiente'
    END
);

-- Also update the vista_tratamientos_completados_detalles if it exists
-- This assumes it's a view that references tratamientos_completados
-- The view should automatically update when the base table is updated

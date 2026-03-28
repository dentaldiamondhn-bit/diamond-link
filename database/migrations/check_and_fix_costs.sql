-- Check payments table and fix treatment costs
-- This script will:
-- 1. Check if there are any payments
-- 2. Update treatments to have proper costs (you'll need to set these manually)
-- 3. Fix payment statuses

-- First, let's see if there are any payments
SELECT COUNT(*) as payment_count, 'payments' as table_name FROM payments
UNION ALL
SELECT COUNT(*) as payment_count, 'tratamientos_completados' as table_name FROM tratamientos_completados;

-- Show treatments with zero cost
SELECT 
    id,
    paciente_id,
    fecha_cita,
    total_original,
    total_descuento, 
    total_final,
    estado_pago,
    monto_pagado,
    saldo_pendiente
FROM tratamientos_completados 
WHERE total_final = 0.00
ORDER BY fecha_cita DESC;

-- Show any existing payments
SELECT 
    p.id,
    p.tratamiento_completado_id,
    p.monto_pago,
    p.moneda,
    p.metodo_pago,
    p.creado_en,
    tc.total_final,
    tc.estado_pago
FROM payments p
LEFT JOIN tratamientos_completados tc ON p.tratamiento_completado_id = tc.id
ORDER BY p.creado_en DESC;

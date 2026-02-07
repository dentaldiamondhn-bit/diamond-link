-- Comprehensive analysis of all treatment tables to identify inconsistencies
-- This script compares data across:
-- 1. tratamientos_completados (main completed treatments table)
-- 2. tratamientos_realizados (individual treatment items)
-- 3. vista_tratamientos_completados_detalles (view with completed treatment details)
-- 4. vista_tratamientos_realizados_detalles (view with treatment item details)

-- ========================================
-- 1. TABLE STRUCTURES AND RECORD COUNTS
-- ========================================

-- Record counts for each table
SELECT 
    'tratamientos_completados' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN total_final = 0 THEN 1 END) as zero_amount_records,
    COUNT(CASE WHEN total_final > 0 THEN 1 END) as with_amount_records,
    COUNT(CASE WHEN estado_pago IS NULL THEN 1 END) as null_payment_status,
    COUNT(CASE WHEN monto_pagado IS NULL THEN 1 END) as null_paid_amount,
    COUNT(CASE WHEN saldo_pendiente IS NULL THEN 1 END) as null_pending_balance
FROM tratamientos_completados

UNION ALL

SELECT 
    'tratamientos_realizados' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN precio_final = 0 THEN 1 END) as zero_amount_records,
    COUNT(CASE WHEN precio_final > 0 THEN 1 END) as with_amount_records,
    0 as null_payment_status,
    0 as null_paid_amount,
    0 as null_pending_balance
FROM tratamientos_realizados

UNION ALL

SELECT 
    'vista_tratamientos_completados_detalles' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN total_final = 0 THEN 1 END) as zero_amount_records,
    COUNT(CASE WHEN total_final > 0 THEN 1 END) as with_amount_records,
    0 as null_payment_status,
    0 as null_paid_amount,
    0 as null_pending_balance
FROM vista_tratamientos_completados_detalles

UNION ALL

SELECT 
    'vista_tratamientos_realizados_detalles' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN precio_final = 0 THEN 1 END) as zero_amount_records,
    COUNT(CASE WHEN precio_final > 0 THEN 1 END) as with_amount_records,
    0 as null_payment_status,
    0 as null_paid_amount,
    0 as null_pending_balance
FROM vista_tratamientos_realizados_detalles;

-- ========================================
-- 2. COMPARING tratamientos_completados vs vista_tratamientos_completados_detalles
-- ========================================

-- Check for records that exist in one but not the other
SELECT 
    'Missing in vista_tratamientos_completados_detalles' as issue,
    tc.id,
    tc.paciente_id,
    tc.fecha_cita,
    tc.total_final,
    tc.estado_pago
FROM tratamientos_completados tc
LEFT JOIN vista_tratamientos_completados_detalles vtd ON tc.id = vtd.id
WHERE vtd.id IS NULL

UNION ALL

SELECT 
    'Missing in tratamientos_completados' as issue,
    vtd.id,
    vtd.paciente_id,
    vtd.fecha_cita,
    vtd.total_final,
    vtd.estado
FROM vista_tratamientos_completados_detalles vtd
LEFT JOIN tratamientos_completados tc ON vtd.id = tc.id
WHERE tc.id IS NULL;

-- Check for data inconsistencies between main table and view
SELECT 
    tc.id,
    tc.paciente_id,
    'total_final mismatch' as issue_type,
    tc.total_final as tc_total_final,
    vtd.total_final as vtd_total_final,
    ABS(tc.total_final - vtd.total_final) as difference
FROM tratamientos_completados tc
INNER JOIN vista_tratamientos_completados_detalles vtd ON tc.id = vtd.id
WHERE tc.total_final != vtd.total_final

UNION ALL

SELECT 
    tc.id,
    tc.paciente_id,
    'estado mismatch' as issue_type,
    0 as tc_total_final,
    0 as vtd_total_final,
    CASE WHEN tc.estado = vtd.estado THEN 0 ELSE 1 END as difference
FROM tratamientos_completados tc
INNER JOIN vista_tratamientos_completados_detalles vtd ON tc.id = vtd.id
WHERE tc.estado != vtd.estado;

-- ========================================
-- 3. COMPARING tratamientos_realizados vs vista_tratamientos_realizados_detalles
-- ========================================

-- Check for records that exist in one but not the other
SELECT 
    'Missing in vista_tratamientos_realizados_detalles' as issue,
    tr.id,
    tr.tratamiento_completado_id,
    tr.nombre_tratamiento,
    tr.precio_final
FROM tratamientos_realizados tr
LEFT JOIN vista_tratamientos_realizados_detalles vtd ON tr.id = vtd.id
WHERE vtd.id IS NULL

UNION ALL

SELECT 
    'Missing in tratamientos_realizados' as issue,
    vtd.id,
    vtd.tratamiento_completado_id,
    vtd.nombre_tratamiento,
    vtd.precio_final
FROM vista_tratamientos_realizados_detalles vtd
LEFT JOIN tratamientos_realizados tr ON vtd.id = tr.id
WHERE tr.id IS NULL;

-- Check for data inconsistencies between main table and view
SELECT 
    tr.id,
    tr.tratamiento_completado_id,
    'precio_final mismatch' as issue_type,
    tr.precio_final as tr_precio_final,
    vtd.precio_final as vtd_precio_final,
    ABS(tr.precio_final - vtd.precio_final) as difference
FROM tratamientos_realizados tr
INNER JOIN vista_tratamientos_realizados_detalles vtd ON tr.id = vtd.id
WHERE tr.precio_final != vtd.precio_final;

-- ========================================
-- 4. RELATIONSHIP INTEGRITY CHECKS
-- ========================================

-- Check for tratamientos_realizados without valid tratamiento_completado_id
SELECT 
    tr.id,
    tr.tratamiento_completado_id,
    tr.nombre_tratamiento,
    'Orphaned treatment item' as issue
FROM tratamientos_realizados tr
LEFT JOIN tratamientos_completados tc ON tr.tratamiento_completado_id = tc.id
WHERE tc.id IS NULL;

-- Check for tratamientos_completados without corresponding tratamientos_realizados
SELECT 
    tc.id,
    tc.paciente_id,
    tc.fecha_cita,
    tc.total_final,
    'Completed treatment without items' as issue
FROM tratamientos_completados tc
LEFT JOIN tratamientos_realizados tr ON tc.id = tr.tratamiento_completado_id
WHERE tr.id IS NULL;

-- ========================================
-- 5. PAYMENT CALCULATION VERIFICATION
-- ========================================

-- Verify that sum of tratamientos_realizados.precio_final matches tratamientos_completados.total_final
SELECT 
    tc.id,
    tc.paciente_id,
    tc.fecha_cita,
    tc.total_final as expected_total,
    COALESCE(SUM(tr.precio_final), 0) as calculated_sum,
    tc.total_final - COALESCE(SUM(tr.precio_final), 0) as difference,
    CASE 
        WHEN tc.total_final = COALESCE(SUM(tr.precio_final), 0) THEN 'MATCH'
        ELSE 'MISMATCH'
    END as verification_status
FROM tratamientos_completados tc
LEFT JOIN tratamientos_realizados tr ON tc.id = tr.tratamiento_completado_id
GROUP BY tc.id, tc.paciente_id, tc.fecha_cita, tc.total_final
HAVING ABS(tc.total_final - COALESCE(SUM(tr.precio_final), 0)) > 0.01
ORDER BY ABS(tc.total_final - COALESCE(SUM(tr.precio_final), 0)) DESC;

-- ========================================
-- 6. SAMPLE DATA INSPECTION
-- ========================================

-- Show sample records from each table for manual verification
SELECT 
    'tratamientos_completados sample' as table_sample,
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
ORDER BY fecha_cita DESC
LIMIT 5;

SELECT 
    'tratamientos_realizados sample' as table_sample,
    id,
    tratamiento_completado_id,
    nombre_tratamiento,
    codigo_tratamiento,
    precio_original,
    precio_final,
    cantidad,
    creado_en
FROM tratamientos_realizados
ORDER BY creado_en DESC
LIMIT 5;

SELECT 
    'vista_tratamientos_completados_detalles sample' as table_sample,
    id,
    paciente_id,
    fecha_cita,
    total_original,
    total_descuento,
    total_final,
    estado,
    creado_en
FROM vista_tratamientos_completados_detalles
ORDER BY fecha_cita DESC
LIMIT 5;

SELECT 
    'vista_tratamientos_realizados_detalles sample' as table_sample,
    id,
    tratamiento_completado_id,
    nombre_tratamiento,
    codigo_tratamiento,
    precio_original,
    precio_final,
    cantidad,
    creado_en
FROM vista_tratamientos_realizados_detalles
ORDER BY creado_en DESC
LIMIT 5;

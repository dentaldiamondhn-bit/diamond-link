-- Migration: Update Veces Realizado Counters Based on Actual Usage
-- This migration recalculates the veces_realizado counter for all treatments
-- based on the actual number of times they've been performed

-- Step 1: Reset all counters to 0 first
UPDATE tratamientos 
SET veces_realizado = 0, actualizado_en = NOW();

-- Step 2: Calculate and update counters based on actual treatment usage
UPDATE tratamientos t
SET veces_realizado = usage_counts.total_usage,
    actualizado_en = NOW()
FROM (
    SELECT 
        tr.tratamiento_id,
        SUM(tr.cantidad) as total_usage
    FROM tratamientos_realizados tr
    GROUP BY tr.tratamiento_id
) usage_counts
WHERE t.id = usage_counts.tratamiento_id;

-- Step 3: Verification - Show updated counters
SELECT 
    t.id,
    t.codigo,
    t.nombre,
    t.especialidad,
    t.veces_realizado as updated_counter,
    usage_calc.actual_usage as calculated_from_records,
    CASE 
        WHEN t.veces_realizado = usage_calc.actual_usage THEN '✓ MATCH'
        ELSE '✗ MISMATCH'
    END as verification_status
FROM tratamientos t
LEFT JOIN (
    SELECT 
        tr.tratamiento_id,
        SUM(tr.cantidad) as actual_usage
    FROM tratamientos_realizados tr
    GROUP BY tr.tratamiento_id
) usage_calc ON t.id = usage_calc.tratamiento_id
ORDER BY verification_status DESC, t.veces_realizado DESC, t.nombre;

-- Step 4: Summary statistics
SELECT 
    COUNT(*) as total_treatments,
    COUNT(CASE WHEN veces_realizado > 0 THEN 1 END) as treatments_with_usage,
    COUNT(CASE WHEN veces_realizado = 0 THEN 1 END) as treatments_never_used,
    SUM(veces_realizado) as total_performances,
    MAX(veces_realizado) as most_performed_treatment_count,
    ROUND(AVG(veces_realizado), 2) as average_performances
FROM tratamientos;

-- Step 5: Top 10 most performed treatments
SELECT 
    t.codigo,
    t.nombre,
    t.especialidad,
    t.veces_realizado as times_performed,
    t.precio,
    t.moneda
FROM tratamientos t
WHERE veces_realizado > 0
ORDER BY veces_realizado DESC, t.nombre
LIMIT 10;

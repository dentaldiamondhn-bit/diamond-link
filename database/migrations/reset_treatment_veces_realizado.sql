-- Reset treatment veces_realizado counters to match actual data in Supabase
-- This script updates treatment counters based on current completed treatments

-- First, let's see the current state (for verification)
-- SELECT id, nombre, veces_realizado FROM tratamientos ORDER BY id;

-- Reset treatment counters based on actual completed treatments
UPDATE tratamientos t
SET veces_realizado = COALESCE(counter.actual_count, 0)
FROM (
    SELECT 
        tr.tratamiento_id,
        COUNT(*) as actual_count
    FROM tratamientos_realizados tr
    INNER JOIN tratamientos_completados tc ON tr.tratamiento_completado_id = tc.id
    GROUP BY tr.tratamiento_id
) counter
WHERE t.id = counter.tratamiento_id;

-- Update treatments that have no completed treatments to 0
UPDATE tratamientos 
SET veces_realizado = 0 
WHERE id NOT IN (
    SELECT DISTINCT tratamiento_id 
    FROM tratamientos_realizados
);

-- Verification queries to check the results
SELECT 
    'Treatments Updated' as table_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN veces_realizado > 0 THEN 1 ELSE 0 END) as with_usage,
    SUM(veces_realizado) as total_performances
FROM tratamientos;

-- Show top 10 most used treatments
SELECT 
    id,
    nombre,
    veces_realizado,
    especialidad
FROM tratamientos 
WHERE veces_realizado > 0
ORDER BY veces_realizado DESC 
LIMIT 10;

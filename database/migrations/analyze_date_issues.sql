-- Analyze the date issues found in the data

-- 1. Count records with future dates (after today 2026-02-06)
SELECT 
    'FUTURE_DATES' as metric,
    COUNT(*) as count,
    MIN(fecha_cita) as earliest_future,
    MAX(fecha_cita) as latest_future
FROM tratamientos_completados 
WHERE fecha_cita > CURRENT_DATE;

-- 2. Show all future dated records
SELECT 
    id,
    fecha_cita,
    total_final,
    estado,
    CASE 
        WHEN fecha_cita > CURRENT_DATE THEN 'FUTURE_DATE'
        ELSE 'VALID_DATE'
    END as date_status
FROM tratamientos_completados 
WHERE fecha_cita > CURRENT_DATE
ORDER BY fecha_cita DESC;

-- 3. Count records within your expected range (2019-01-04 to today)
SELECT 
    'EXPECTED_RANGE_COUNT' as metric,
    COUNT(*) as count
FROM tratamientos_completados 
WHERE fecha_cita >= '2019-01-04' 
  AND fecha_cita <= CURRENT_DATE;

-- 4. Check if the issue is with CURRENT_DATE function
SELECT 
    'CURRENT_DATE_TEST' as metric,
    CURRENT_DATE as current_date_db,
    NOW() as current_timestamp,
    CURRENT_TIMESTAMP as current_timestamp_full;

-- 5. Test the exact logic that should give 173
SELECT 
    'CORRECTED_LOGIC' as metric,
    COUNT(*) as count
FROM tratamientos_completados 
WHERE fecha_cita >= '2019-01-04' 
  AND fecha_cita <= '2026-12-31';  -- Use end of year to include future dates

-- 6. Break down by year to see distribution
SELECT 
    'YEARLY_DISTRIBUTION' as metric,
    EXTRACT(YEAR FROM fecha_cita) as year,
    COUNT(*) as count
FROM tratamientos_completados 
GROUP BY EXTRACT(YEAR FROM fecha_cita)
ORDER BY year;

-- Debug Query: Check actual count of tratamientos_completados
-- This will help us understand the discrepancy

-- 1. Total count in the table (should be 173)
SELECT 
    'TOTAL_RECORDS' as metric,
    COUNT(*) as count,
    MIN(fecha_cita) as earliest_date,
    MAX(fecha_cita) as latest_date
FROM tratamientos_completados;

-- 2. Count within the date range (Jan 4 2019 to today)
SELECT 
    'DATE_RANGE_COUNT' as metric,
    COUNT(*) as count,
    '2019-01-04' as start_date,
    CURRENT_DATE as end_date
FROM tratamientos_completados 
WHERE fecha_cita >= '2019-01-04' 
  AND fecha_cita <= CURRENT_DATE;

-- 3. Count with NULL fecha_cita (these might be excluded)
SELECT 
    'NULL_DATES' as metric,
    COUNT(*) as count
FROM tratamientos_completados 
WHERE fecha_cita IS NULL;

-- 4. Records outside the date range
SELECT 
    'OUTSIDE_DATE_RANGE' as metric,
    COUNT(*) as count
FROM tratamientos_completados 
WHERE fecha_cita < '2019-01-04' 
   OR fecha_cita > CURRENT_DATE;

-- 5. Check the exact date range logic used in the service
SELECT 
    'SERVICE_LOGIC_COUNT' as metric,
    COUNT(*) as count
FROM tratamientos_completados 
WHERE fecha_cita >= '2019-01-04T00:00:00.000Z' 
  AND fecha_cita <= '2026-02-06T23:59:59.999Z';

-- 6. Sample of records to verify date formats
SELECT 
    id,
    fecha_cita,
    total_final,
    estado
FROM tratamientos_completados 
ORDER BY fecha_cita ASC 
LIMIT 5;

-- 7. Sample of most recent records
SELECT 
    id,
    fecha_cita,
    total_final,
    estado
FROM tratamientos_completados 
ORDER BY fecha_cita DESC 
LIMIT 5;

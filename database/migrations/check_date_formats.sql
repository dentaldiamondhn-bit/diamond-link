-- Check date formats and potential issues in tratamientos_completados

-- 1. Check the format of fecha_cita column
SELECT 
    'DATE_FORMAT_SAMPLE' as info,
    fecha_cita,
    EXTRACT(YEAR FROM fecha_cita) as year,
    EXTRACT(MONTH FROM fecha_cita) as month,
    EXTRACT(DAY FROM fecha_cita) as day
FROM tratamientos_completados 
ORDER BY fecha_cita ASC 
LIMIT 10;

-- 2. Check for any invalid or NULL dates
SELECT 
    'NULL_OR_INVALID_DATES' as info,
    COUNT(*) as count,
    COUNT(CASE WHEN fecha_cita IS NULL THEN 1 END) as null_dates,
    COUNT(CASE WHEN fecha_cita < '2019-01-01' THEN 1 END) as very_old_dates,
    COUNT(CASE WHEN fecha_cita > CURRENT_DATE + INTERVAL '1 year' THEN 1 END) as future_dates
FROM tratamientos_completados;

-- 3. Check records specifically around Jan 4, 2019
SELECT 
    'AROUND_2019_01_04' as info,
    COUNT(*) as count
FROM tratamientos_completados 
WHERE fecha_cita BETWEEN '2019-01-01' AND '2019-01-10';

-- 4. Test the exact query that should be used
SELECT 
    'TEST_QUERY_2019_TO_TODAY' as info,
    COUNT(*) as count
FROM tratamientos_completados 
WHERE fecha_cita >= '2019-01-04T00:00:00.000Z' 
  AND fecha_cita <= '2026-02-06T23:59:59.999Z';

-- 5. Check if there are timezone issues
SELECT 
    'TIMEZONE_CHECK' as info,
    fecha_cita,
    fecha_cita AT TIME ZONE 'UTC' AT TIME ZONE 'America/Tegucigalpa' as local_time
FROM tratamientos_completados 
ORDER BY fecha_cita ASC 
LIMIT 5;

-- Reset promotion veces_realizado counters
-- Since promotions appear to be inactive (activo: false) and have no direct connection to completed treatments,
-- we'll reset all counters to 0 to start fresh

-- Reset all promotion counters to 0
UPDATE promociones 
SET veces_realizado = 0;

-- Verification query to check the results
SELECT 
    'Promotions Reset' as table_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN veces_realizado > 0 THEN 1 ELSE 0 END) as with_usage,
    SUM(veces_realizado) as total_usage
FROM promociones;

-- Show all promotions after reset
SELECT 
    id,
    nombre,
    veces_realizado,
    activo
FROM promociones 
ORDER BY id;

-- Note: If promotions become active in the future and are connected to completed treatments,
-- you may need to create a relationship between promociones and tratamientos_completados tables
-- to properly track promotion usage.

-- Check the actual structure of tables related to promotions
-- This will help us understand how promotions are connected to completed treatments

-- Check promociones table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'promociones' 
ORDER BY ordinal_position;

-- Check tratamientos_completados table structure for any promotion-related fields
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tratamientos_completados' 
AND (column_name LIKE '%promocion%' OR column_name LIKE '%promotion%')
ORDER BY ordinal_position;

-- Check if there are any foreign key relationships to promociones
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'promociones';

-- Show sample data from promociones to understand current state
SELECT id, nombre, veces_realizado, activo 
FROM promociones 
ORDER BY id 
LIMIT 5;

-- Show if there are any treatment items that might reference promotions
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tratamientos_realizados' 
AND (column_name LIKE '%promocion%' OR column_name LIKE '%promotion%')
ORDER BY ordinal_position;

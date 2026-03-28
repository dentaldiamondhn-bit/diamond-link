-- Check what columns actually exist in each table
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('tratamientos_completados', 'tratamientos_realizados', 'vista_tratamientos_completados_detalles', 'vista_tratamientos_realizados_detalles')
ORDER BY table_name, ordinal_position;

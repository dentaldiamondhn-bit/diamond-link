-- Check for problematic triggers that might be causing slow queries
SELECT 
    event_object_table as table_name,
    trigger_name,
    action_timing,
    action_condition,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('tratamientos_completados', 'patients', 'payments', 'tratamientos_realizados')
ORDER BY event_object_table, trigger_name;

-- Check for functions that might be causing issues
SELECT 
    proname as function_name,
    prosrc as source_code
FROM pg_proc 
WHERE proname LIKE '%refresh%' OR proname LIKE '%trigger%' OR proname LIKE '%treatment%'
ORDER BY proname;

-- Check table sizes to see if there's bloat
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables 
WHERE tablename IN ('tratamientos_completados', 'patients', 'vista_tratamientos_realizados_detalles')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

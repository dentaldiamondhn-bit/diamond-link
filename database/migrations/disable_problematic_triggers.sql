-- Disable all triggers that might be causing performance issues
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT event_object_table, trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table IN ('tratamientos_completados', 'patients', 'payments', 'tratamientos_realizados')
    LOOP
        BEGIN
            EXECUTE 'ALTER TABLE ' || trigger_record.event_object_table || ' DISABLE TRIGGER ' || trigger_record.trigger_name;
            RAISE NOTICE 'Disabled trigger % on table %', trigger_record.trigger_name, trigger_record.event_object_table;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not disable trigger % on table %: %', trigger_record.trigger_name, trigger_record.event_object_table, SQLERRM;
        END;
    END LOOP;
END $$;

-- Drop problematic functions if they exist
DROP FUNCTION IF EXISTS refresh_tratamientos_completados_fast() CASCADE;
DROP FUNCTION IF EXISTS trigger_refresh_treatments_view() CASCADE;

-- Remove any materialized views that might be causing issues
DROP MATERIALIZED VIEW IF EXISTS mv_tratamientos_completados_fast;

-- Analyze tables to update statistics
ANALYZE tratamientos_completados;
ANALYZE patients;
ANALYZE tratamientos_realizados;

DO $$
BEGIN
    RAISE NOTICE 'All problematic triggers and functions have been disabled/dropped';
    RAISE NOTICE 'Database performance should now be improved';
END $$;

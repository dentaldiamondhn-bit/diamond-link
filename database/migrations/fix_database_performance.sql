-- Fix database performance issues caused by previous migrations

-- VACUUM and reindex the problematic tables
VACUUM ANALYZE tratamientos_completados;
VACUUM ANALYZE patients; 
VACUUM ANALYZE tratamientos_realizados;
VACUUM ANALYZE payments;

-- Rebuild indexes to fix fragmentation
REINDEX TABLE tratamientos_completados;
REINDEX TABLE patients;
REINDEX TABLE tratamientos_realizados;

-- Update table statistics
ANALYZE tratamientos_completados;
ANALYZE patients;
ANALYZE tratamientos_realizados;

-- Create simple index for the most common query
CREATE INDEX IF NOT EXISTS idx_tratamientos_completados_fecha_cita_simple 
ON tratamientos_completados(fecha_cita DESC);

-- Create index for patient lookups
CREATE INDEX IF NOT EXISTS idx_tratamientos_completados_paciente_id_simple 
ON tratamientos_completados(paciente_id);

DO $$
BEGIN
    RAISE NOTICE 'Database performance optimization completed';
    RAISE NOTICE 'Tables have been vacuumed, reindexed, and analyzed';
END $$;

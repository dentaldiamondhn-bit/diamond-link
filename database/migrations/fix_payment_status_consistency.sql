-- Fix payment status consistency across all tables
-- This script synchronizes estado and estado_pago columns and fixes vista_tratamientos_completados_detalles

-- First, update tratamientos_completados to ensure estado matches estado_pago
UPDATE tratamientos_completados 
SET estado = estado_pago
WHERE estado != estado_pago;

-- Update vista_tratamientos_completados_detalles to match the correct estado_pago from tratamientos_completados
UPDATE vista_tratamientos_completados_detalles 
SET estado = tc.estado_pago
FROM tratamientos_completados tc
WHERE vista_tratamientos_completados_detalles.id = tc.id
AND vista_tratamientos_completados_detalles.estado != tc.estado_pago;

-- Create a trigger to ensure estado always matches estado_pago for future treatments
CREATE OR REPLACE FUNCTION sync_estado_with_estado_pago()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure estado always matches estado_pago
    NEW.estado = NEW.estado_pago;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_estado_sync ON tratamientos_completados;

-- Create the trigger
CREATE TRIGGER ensure_estado_sync
    BEFORE INSERT OR UPDATE ON tratamientos_completados
    FOR EACH ROW
    EXECUTE FUNCTION sync_estado_with_estado_pago();

-- Create a trigger for vista_tratamientos_completados_detalles to sync with tratamientos_completados
CREATE OR REPLACE FUNCTION sync_vista_estado_with_tratamientos()
RETURNS TRIGGER AS $$
BEGIN
    -- Update vista_tratamientos_completados_detalles when tratamientos_completados changes
    UPDATE vista_tratamientos_completados_detalles 
    SET estado = NEW.estado_pago
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_vista_estado_on_tratamientos_change ON tratamientos_completados;

-- Create the trigger
CREATE TRIGGER sync_vista_estado_on_tratamientos_change
    AFTER INSERT OR UPDATE ON tratamientos_completados
    FOR EACH ROW
    EXECUTE FUNCTION sync_vista_estado_with_tratamientos();

-- Verification query to show the synchronization results
SELECT 
    tc.id,
    tc.estado as tc_estado,
    tc.estado_pago as tc_estado_pago,
    vtd.estado as vtd_estado,
    CASE 
        WHEN tc.estado = tc.estado_pago AND tc.estado_pago = vtd.estado THEN 'SYNCED'
        ELSE 'NOT SYNCED'
    END as sync_status
FROM tratamientos_completados tc
LEFT JOIN vista_tratamientos_completados_detalles vtd ON tc.id = vtd.id
ORDER BY tc.id
LIMIT 20;

-- Show counts of synced vs unsynced records
SELECT 
    'tratamientos_completados' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN estado = estado_pago THEN 1 END) as synced_records,
    COUNT(CASE WHEN estado != estado_pago THEN 1 END) as unsynced_records
FROM tratamientos_completados

UNION ALL

SELECT 
    'vista_tratamientos_completados_detalles' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN vtd.estado = tc.estado_pago THEN 1 END) as synced_records,
    COUNT(CASE WHEN vtd.estado != tc.estado_pago THEN 1 END) as unsynced_records
FROM vista_tratamientos_completados_detalles vtd
LEFT JOIN tratamientos_completados tc ON vtd.id = tc.id;

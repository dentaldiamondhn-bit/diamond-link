-- Fix: remove tratamiento_completado_id (INTEGER) from movimientos_inventario
-- The type was wrong (should be UUID) and caused 400 errors on inserts.
-- Treatment-to-inventory linkage is handled by tratamientos_inventario table instead.

ALTER TABLE movimientos_inventario DROP COLUMN IF EXISTS tratamiento_completado_id;

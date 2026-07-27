-- Convert movimientos_inventario into a general activity log
-- Allows logging non-stock actions (marca creada, item creado, etc.)

ALTER TABLE movimientos_inventario ALTER COLUMN inventario_id DROP NOT NULL;
ALTER TABLE movimientos_inventario ALTER COLUMN tipo DROP NOT NULL;
ALTER TABLE movimientos_inventario DROP CONSTRAINT IF EXISTS movimientos_inventario_tipo_check;
ALTER TABLE movimientos_inventario ALTER COLUMN cantidad DROP NOT NULL;
ALTER TABLE movimientos_inventario ALTER COLUMN cantidad SET DEFAULT 0;
ALTER TABLE movimientos_inventario DROP CONSTRAINT IF EXISTS movimientos_inventario_cantidad_check;

ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS accion VARCHAR(50) DEFAULT '';
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS entidad_tipo VARCHAR(50);
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS entidad_nombre VARCHAR(255);
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS entidad_codigo VARCHAR(50);
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS detalle TEXT;

CREATE INDEX IF NOT EXISTS idx_movimientos_accion ON movimientos_inventario(accion);
CREATE INDEX IF NOT EXISTS idx_movimientos_entidad_tipo ON movimientos_inventario(entidad_tipo);

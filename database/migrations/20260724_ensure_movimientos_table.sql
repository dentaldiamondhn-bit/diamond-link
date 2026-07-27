-- Ensure movimientos_inventario table exists with full schema
-- Safe to run even if table already exists (uses IF NOT EXISTS + column checks)

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventario_id UUID REFERENCES inventario(id) ON DELETE CASCADE,
    insumo_id UUID REFERENCES insumos(id) ON DELETE SET NULL,
    tipo VARCHAR(20),
    cantidad INTEGER DEFAULT 0,
    precio_unitario DECIMAL(10,2),
    notas TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accion VARCHAR(50) DEFAULT '',
    entidad_tipo VARCHAR(50),
    entidad_nombre VARCHAR(255),
    entidad_codigo VARCHAR(50),
    detalle TEXT
);

-- Ensure all columns exist (in case table was created by an older migration)
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS accion VARCHAR(50) DEFAULT '';
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS entidad_tipo VARCHAR(50);
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS entidad_nombre VARCHAR(255);
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS entidad_codigo VARCHAR(50);
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS detalle TEXT;

-- Make old constraints compatible with new flexible schema
ALTER TABLE movimientos_inventario ALTER COLUMN inventario_id DROP NOT NULL;
ALTER TABLE movimientos_inventario ALTER COLUMN tipo DROP NOT NULL;
ALTER TABLE movimientos_inventario DROP CONSTRAINT IF EXISTS movimientos_inventario_tipo_check;
ALTER TABLE movimientos_inventario ALTER COLUMN cantidad DROP NOT NULL;
ALTER TABLE movimientos_inventario ALTER COLUMN cantidad SET DEFAULT 0;
ALTER TABLE movimientos_inventario DROP CONSTRAINT IF EXISTS movimientos_inventario_cantidad_check;
ALTER TABLE movimientos_inventario DROP COLUMN IF EXISTS tratamiento_completado_id;

-- RLS
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read movimientos_inventario" ON movimientos_inventario;
CREATE POLICY "Anyone can read movimientos_inventario" ON movimientos_inventario FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert movimientos_inventario" ON movimientos_inventario;
CREATE POLICY "Admins can insert movimientos_inventario" ON movimientos_inventario FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete movimientos_inventario" ON movimientos_inventario;
CREATE POLICY "Admins can delete movimientos_inventario" ON movimientos_inventario FOR DELETE USING (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_id ON movimientos_inventario(inventario_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_insumo_id ON movimientos_inventario(insumo_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos_inventario(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_accion ON movimientos_inventario(accion);
CREATE INDEX IF NOT EXISTS idx_movimientos_entidad_tipo ON movimientos_inventario(entidad_tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_created_at ON movimientos_inventario(created_at);

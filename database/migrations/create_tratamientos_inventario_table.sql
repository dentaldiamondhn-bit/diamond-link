-- Migration: Create tratamientos_inventario table for tracking inventory usage per completed treatment
-- Description: Stores which inventory items were used in each completed treatment

CREATE TABLE IF NOT EXISTS tratamientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tratamiento_completado_id UUID NOT NULL REFERENCES tratamientos_completados(id) ON DELETE CASCADE,
    inventario_id UUID NOT NULL REFERENCES inventario(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL DEFAULT '',
    codigo VARCHAR(50),
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0,
    moneda VARCHAR(3) NOT NULL DEFAULT 'HNL',
    imagen_url TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tratamientos_inventario_completado_id ON tratamientos_inventario(tratamiento_completado_id);
CREATE INDEX IF NOT EXISTS idx_tratamientos_inventario_inventario_id ON tratamientos_inventario(inventario_id);

ALTER TABLE tratamientos_inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read tratamientos_inventario" ON tratamientos_inventario;
CREATE POLICY "Anyone can read tratamientos_inventario" ON tratamientos_inventario FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert tratamientos_inventario" ON tratamientos_inventario;
CREATE POLICY "Admins can insert tratamientos_inventario" ON tratamientos_inventario FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete tratamientos_inventario" ON tratamientos_inventario;
CREATE POLICY "Admins can delete tratamientos_inventario" ON tratamientos_inventario FOR DELETE USING (true);

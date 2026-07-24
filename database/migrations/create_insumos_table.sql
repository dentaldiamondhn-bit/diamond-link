-- Migration: Create insumos (supplies) table
-- Description: Adds a table to manage dental supplies/inventory with pricing

CREATE TABLE IF NOT EXISTS insumos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0,
    moneda VARCHAR(10) NOT NULL DEFAULT 'HNL',
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster searches
CREATE INDEX IF NOT EXISTS idx_insumos_codigo ON insumos(codigo);
CREATE INDEX IF NOT EXISTS idx_insumos_nombre ON insumos(nombre);
CREATE INDEX IF NOT EXISTS idx_insumos_activo ON insumos(activo);

-- Enable RLS
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Anyone can read insumos" ON insumos;
CREATE POLICY "Anyone can read insumos" ON insumos
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert insumos" ON insumos;
CREATE POLICY "Admins can insert insumos" ON insumos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can update insumos" ON insumos;
CREATE POLICY "Admins can update insumos" ON insumos
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can delete insumos" ON insumos;
CREATE POLICY "Admins can delete insumos" ON insumos
    FOR DELETE USING (auth.role() = 'authenticated');

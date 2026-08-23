-- Create categorias table for inventory product categories
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subcategorias table linked to categorias
CREATE TABLE IF NOT EXISTS subcategorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(categoria_id, nombre)
);

-- Add subcategoria column to marcas table
ALTER TABLE marcas ADD COLUMN IF NOT EXISTS subcategoria VARCHAR(255);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subcategorias_categoria_id ON subcategorias(categoria_id);

-- RLS
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view categorias" ON categorias;
CREATE POLICY "Users can view categorias" ON categorias FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert categorias" ON categorias;
CREATE POLICY "Users can insert categorias" ON categorias FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update categorias" ON categorias;
CREATE POLICY "Users can update categorias" ON categorias FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Users can delete categorias" ON categorias;
CREATE POLICY "Users can delete categorias" ON categorias FOR DELETE USING (true);

DROP POLICY IF EXISTS "Users can view subcategorias" ON subcategorias;
CREATE POLICY "Users can view subcategorias" ON subcategorias FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert subcategorias" ON subcategorias;
CREATE POLICY "Users can insert subcategorias" ON subcategorias FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update subcategorias" ON subcategorias;
CREATE POLICY "Users can update subcategorias" ON subcategorias FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Users can delete subcategorias" ON subcategorias;
CREATE POLICY "Users can delete subcategorias" ON subcategorias FOR DELETE USING (true);

-- Seed with existing common categories from marcas.tipo
INSERT INTO categorias (nombre)
SELECT DISTINCT tipo FROM marcas WHERE tipo IS NOT NULL AND tipo != ''
ON CONFLICT (nombre) DO NOTHING;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE categorias;
ALTER PUBLICATION supabase_realtime ADD TABLE subcategorias;

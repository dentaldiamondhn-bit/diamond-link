-- Add distribuidor_id column to marcas table

ALTER TABLE marcas ADD COLUMN IF NOT EXISTS distribuidor_id UUID REFERENCES distribuidores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_marcas_distribuidor_id ON marcas(distribuidor_id);

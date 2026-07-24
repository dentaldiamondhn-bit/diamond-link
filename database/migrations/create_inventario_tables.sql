-- Migration: Create inventory and accountability system
-- Description: Adds inventory tracking, movements, and self-contained items with image support

-- 1. Remove imagen_url from insumos (moved to inventario)
ALTER TABLE insumos DROP COLUMN IF EXISTS imagen_url;

-- ============================================================
-- INVENTARIO TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insumo_id UUID REFERENCES insumos(id) ON DELETE SET NULL,
    marca_id UUID,
    codigo VARCHAR(50),
    nombre VARCHAR(255) NOT NULL DEFAULT '',
    precio DECIMAL(10,2) NOT NULL DEFAULT 0,
    moneda VARCHAR(3) NOT NULL DEFAULT 'HNL',
    marca VARCHAR(255),
    stock_actual INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 5,
    ubicacion VARCHAR(255),
    imagen_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Make insumo_id nullable (was NOT NULL in original table)
ALTER TABLE inventario ALTER COLUMN insumo_id DROP NOT NULL;

-- Add activo column for active/inactive status
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_inventario_activo ON inventario(activo);

-- Add columns that may not exist if table was created by an earlier migration
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS marca_id UUID;
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS nombre VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS precio DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'HNL';
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS marca VARCHAR(255);
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS imagen_url TEXT;

CREATE INDEX IF NOT EXISTS idx_inventario_insumo_id ON inventario(insumo_id);
CREATE INDEX IF NOT EXISTS idx_inventario_codigo ON inventario(codigo);
CREATE INDEX IF NOT EXISTS idx_inventario_stock_actual ON inventario(stock_actual);

-- ============================================================
-- MOVIMIENTOS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventario_id UUID REFERENCES inventario(id) ON DELETE CASCADE,
    insumo_id UUID REFERENCES insumos(id) ON DELETE SET NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida')),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2),
    notas TEXT,
    created_by UUID,
    tratamiento_completado_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns that may not exist if table was created by an earlier migration
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS inventario_id UUID REFERENCES inventario(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_id ON movimientos_inventario(inventario_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_insumo_id ON movimientos_inventario(insumo_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos_inventario(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_created_at ON movimientos_inventario(created_at);

-- ============================================================
-- RLS — INVENTARIO
-- ============================================================
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read inventario" ON inventario;
CREATE POLICY "Anyone can read inventario" ON inventario FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert inventario" ON inventario;
CREATE POLICY "Admins can insert inventario" ON inventario FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update inventario" ON inventario;
CREATE POLICY "Admins can update inventario" ON inventario FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete inventario" ON inventario;
CREATE POLICY "Admins can delete inventario" ON inventario FOR DELETE USING (true);

-- ============================================================
-- RLS — MOVIMIENTOS
-- ============================================================
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read movimientos_inventario" ON movimientos_inventario;
CREATE POLICY "Anyone can read movimientos_inventario" ON movimientos_inventario FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert movimientos_inventario" ON movimientos_inventario;
CREATE POLICY "Admins can insert movimientos_inventario" ON movimientos_inventario FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete movimientos_inventario" ON movimientos_inventario;
CREATE POLICY "Admins can delete movimientos_inventario" ON movimientos_inventario FOR DELETE USING (true);

-- ============================================================
-- TRIGGER — auto-update stock_actual on movement insert
-- ============================================================
CREATE OR REPLACE FUNCTION update_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.inventario_id IS NOT NULL THEN
        IF NEW.tipo = 'entrada' THEN
            UPDATE inventario SET stock_actual = stock_actual + NEW.cantidad, updated_at = NOW()
            WHERE id = NEW.inventario_id;
        ELSIF NEW.tipo = 'salida' THEN
            UPDATE inventario SET stock_actual = GREATEST(0, stock_actual - NEW.cantidad), updated_at = NOW()
            WHERE id = NEW.inventario_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock ON movimientos_inventario;
CREATE TRIGGER trigger_update_stock
    AFTER INSERT ON movimientos_inventario
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_movement();

-- ============================================================
-- MARCAS (brands)
-- ============================================================
CREATE TABLE IF NOT EXISTS marcas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(10) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marcas_codigo ON marcas(codigo);
CREATE INDEX IF NOT EXISTS idx_marcas_nombre ON marcas(nombre);

ALTER TABLE marcas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read marcas" ON marcas;
CREATE POLICY "Anyone can read marcas" ON marcas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert marcas" ON marcas;
CREATE POLICY "Admins can insert marcas" ON marcas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update marcas" ON marcas;
CREATE POLICY "Admins can update marcas" ON marcas FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete marcas" ON marcas;
CREATE POLICY "Admins can delete marcas" ON marcas FOR DELETE USING (true);

-- FK from inventario to marcas
ALTER TABLE inventario DROP CONSTRAINT IF EXISTS fk_inventario_marca;
ALTER TABLE inventario ADD CONSTRAINT fk_inventario_marca FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE SET NULL;

-- ============================================================
-- DISTRIBUIDORES (supplier directory)
-- ============================================================
CREATE TABLE IF NOT EXISTS distribuidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    contacto VARCHAR(255),
    telefono VARCHAR(50),
    email VARCHAR(255),
    direccion TEXT,
    marcas_provistas TEXT,
    ultimos_items TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_distribuidores_nombre ON distribuidores(nombre);

ALTER TABLE distribuidores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read distribuidores" ON distribuidores;
CREATE POLICY "Anyone can read distribuidores" ON distribuidores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert distribuidores" ON distribuidores;
CREATE POLICY "Admins can insert distribuidores" ON distribuidores FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update distribuidores" ON distribuidores;
CREATE POLICY "Admins can update distribuidores" ON distribuidores FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete distribuidores" ON distribuidores;
CREATE POLICY "Admins can delete distribuidores" ON distribuidores FOR DELETE USING (true);

-- ============================================================
-- STORAGE BUCKET for item images
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventario-imagenes', 'inventario-imagenes', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can upload inventario images" ON storage.objects;
CREATE POLICY "Anyone can upload inventario images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'inventario-imagenes');

DROP POLICY IF EXISTS "Anyone can read inventario images" ON storage.objects;
CREATE POLICY "Anyone can read inventario images" ON storage.objects
    FOR SELECT USING (bucket_id = 'inventario-imagenes');

DROP POLICY IF EXISTS "Anyone can delete inventario images" ON storage.objects;
CREATE POLICY "Anyone can delete inventario images" ON storage.objects
    FOR DELETE USING (bucket_id = 'inventario-imagenes');

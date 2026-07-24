-- Add precio_compra (purchase price) column to inventario
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS precio_compra DECIMAL(10,2) NOT NULL DEFAULT 0;

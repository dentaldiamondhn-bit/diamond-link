-- Add fecha_compra (purchase date) column to inventario
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS fecha_compra DATE;

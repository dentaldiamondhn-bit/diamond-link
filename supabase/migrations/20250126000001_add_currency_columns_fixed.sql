-- First, let's check what tables exist and add currency columns only to existing tables

-- Add currency column to tratamientos table (this should exist)
ALTER TABLE tratamientos 
ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'HNL';

-- Add currency column to promociones table (this should exist)  
ALTER TABLE promociones 
ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'HNL';

-- Add currency column to tratamientos_realizados table (this likely exists)
ALTER TABLE tratamientos_realizados 
ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'HNL';

-- Add indexes for better performance (only for tables that exist)
CREATE INDEX IF NOT EXISTS idx_tratamientos_moneda ON tratamientos(moneda);
CREATE INDEX IF NOT EXISTS idx_promociones_moneda ON promociones(moneda);
CREATE INDEX IF NOT EXISTS idx_tratamientos_realizados_moneda ON tratamientos_realizados(moneda);

-- Uncomment the following only if you have these tables:
-- ALTER TABLE completed_tratamientos 
-- ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'HNL';
-- CREATE INDEX IF NOT EXISTS idx_completed_tratamientos_moneda ON completed_tratamientos(moneda);

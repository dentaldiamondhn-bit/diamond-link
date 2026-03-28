-- Add currency column to tratamientos table
ALTER TABLE tratamientos 
ADD COLUMN moneda VARCHAR(3) NOT NULL DEFAULT 'HNL';

-- Add currency column to promociones table  
ALTER TABLE promociones 
ADD COLUMN moneda VARCHAR(3) NOT NULL DEFAULT 'HNL';

-- Add currency column to tratamientos_realizados table (for completed treatments)
ALTER TABLE tratamientos_realizados 
ADD COLUMN moneda VARCHAR(3) NOT NULL DEFAULT 'HNL';

-- Add currency column to completed_tratamientos table (for treatment summaries)
ALTER TABLE completed_tratamientos 
ADD COLUMN moneda VARCHAR(3) NOT NULL DEFAULT 'HNL';

-- Add indexes for better performance
CREATE INDEX idx_tratamientos_moneda ON tratamientos(moneda);
CREATE INDEX idx_promociones_moneda ON promociones(moneda);
CREATE INDEX idx_tratamientos_realizados_moneda ON tratamientos_realizados(moneda);
CREATE INDEX idx_completed_tratamientos_moneda ON completed_tratamientos(moneda);

-- Add quote_date column to presupuestos table
ALTER TABLE presupuestos 
ADD COLUMN IF NOT EXISTS quote_date TIMESTAMP WITH TIME ZONE;

-- Create index for quote_date for better performance
CREATE INDEX IF NOT EXISTS idx_presupuestos_quote_date ON presupuestos(quote_date);

-- Update existing records to use created_at as quote_date if quote_date is NULL
UPDATE presupuestos 
SET quote_date = created_at 
WHERE quote_date IS NULL;

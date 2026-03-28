-- Add conversion fields
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS monto_original DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS moneda_original VARCHAR(3),
ADD COLUMN IF NOT EXISTS monto_convertido DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS moneda_conversion VARCHAR(3);

-- Update existing payments
UPDATE payments SET monto_original = monto_pago, moneda_original = moneda WHERE monto_original IS NULL;

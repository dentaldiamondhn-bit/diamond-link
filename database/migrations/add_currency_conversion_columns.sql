-- Add currency conversion columns to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS monto_original DECIMAL(10,2) NOT NULL,
ADD COLUMN IF NOT EXISTS moneda_original VARCHAR(3) NOT NULL DEFAULT 'HNL' CHECK (moneda_original IN ('HNL', 'USD')),
ADD COLUMN IF NOT EXISTS monto_convertido DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS moneda_conversion VARCHAR(3) CHECK (moneda_conversion IN ('HNL', 'USD')),
ADD COLUMN IF NOT EXISTS tasa_conversion DECIMAL(10,6);

-- Update existing payments to have original values (if any exist)
UPDATE payments 
SET 
    monto_original = monto_pago,
    moneda_original = moneda
WHERE monto_original IS NULL;

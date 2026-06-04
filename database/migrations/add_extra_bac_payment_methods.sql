-- Add new payment methods: Extra BAC 3meses and Extra BAC 9meses
-- This migration adds the new payment method options to the system
-- No database schema changes needed as metodo_pago is VARCHAR(50)

-- The payment methods are now:
-- 'extra_bac_6meses' - Extra BAC 6meses
-- 'extra_bac_3meses' - Extra BAC 3meses
-- 'extra_bac_9meses' - Extra BAC 9meses

-- No table modifications required - these are application-level values
-- The payments table already supports any string value for metodo_pago

-- This file serves as documentation for the payment methods
-- and can be used for reference when inserting/updating payment records

SELECT 'Migration completed: Extra BAC 3meses and Extra BAC 9meses payment methods added' AS status;
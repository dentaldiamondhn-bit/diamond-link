const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add currency conversion fields to payments table
        ALTER TABLE payments 
        ADD COLUMN IF NOT EXISTS monto_convertido DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS moneda_conversion VARCHAR(3),
        ADD COLUMN IF NOT EXISTS tasa_conversion DECIMAL(10,6);

        -- Add indexes for conversion fields
        CREATE INDEX IF NOT EXISTS idx_payments_moneda_conversion ON payments(moneda_conversion);

        -- Update the payment status function to handle currency conversion
        CREATE OR REPLACE FUNCTION update_payment_status()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Update the monto_pagado in tratamientos_completados using converted amounts
            UPDATE tratamientos_completados 
            SET 
                monto_pagado = (
                    SELECT COALESCE(SUM(
                        CASE 
                            WHEN monto_convertido IS NOT NULL AND moneda_conversion = tratamientos_completados.moneda 
                            THEN monto_convertido
                            ELSE monto_pago
                        END
                    ), 0) 
                    FROM payments 
                    WHERE tratamiento_completado_id = NEW.tratamiento_completado_id
                ),
                actualizado_en = NOW()
            WHERE id = NEW.tratamiento_completado_id;
            
            -- Update the payment status based on amount paid (using converted amounts)
            UPDATE tratamientos_completados 
            SET estado_pago = CASE
                WHEN (
                    SELECT COALESCE(SUM(
                        CASE 
                            WHEN monto_convertido IS NOT NULL AND moneda_conversion = tratamientos_completados.moneda 
                            THEN monto_convertido
                            ELSE monto_pago
                        END
                    ), 0) 
                    FROM payments 
                    WHERE tratamiento_completado_id = NEW.tratamiento_completado_id
                ) >= total_final THEN 'pagado'
                WHEN (
                    SELECT COALESCE(SUM(
                        CASE 
                            WHEN monto_convertido IS NOT NULL AND moneda_conversion = tratamientos_completados.moneda 
                            THEN monto_convertido
                            ELSE monto_pago
                        END
                    ), 0) 
                    FROM payments 
                    WHERE tratamiento_completado_id = NEW.tratamiento_completado_id
                ) > 0 THEN 'parcialmente_pagado'
                ELSE 'pendiente'
            END,
            actualizado_en = NOW()
            WHERE id = NEW.tratamiento_completado_id;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Recreate the trigger
        DROP TRIGGER IF EXISTS trigger_update_payment_status ON payments;
        CREATE TRIGGER trigger_update_payment_status
            AFTER INSERT OR UPDATE OR DELETE ON payments
            FOR EACH ROW
            EXECUTE FUNCTION update_payment_status();
      `
    });

    if (error) {
      console.error('Migration failed:', error);
    } else {
      console.log('Migration completed successfully');
    }
  } catch (err) {
    console.error('Error running migration:', err);
  }
}

runMigration();

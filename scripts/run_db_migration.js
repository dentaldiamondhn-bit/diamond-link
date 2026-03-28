import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'set' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Running payment system migration...');
    
    // Add conversion fields to payments table
    const { error: error1 } = await supabase
      .from('payments')
      .select('id')
      .limit(1);

    if (error1 && error1.code === 'PGRST204') {
      console.log('Table does not exist or permission denied');
      return;
    }

    // Try to add columns using raw SQL
    const { error: alterError } = await supabase
      .rpc('exec_sql', {
        sql: `
          ALTER TABLE payments 
          ADD COLUMN IF NOT EXISTS monto_original DECIMAL(10,2),
          ADD COLUMN IF NOT EXISTS moneda_original VARCHAR(3),
          ADD COLUMN IF NOT EXISTS monto_convertido DECIMAL(10,2),
          ADD COLUMN IF NOT EXISTS moneda_conversion VARCHAR(3),
          ADD COLUMN IF NOT EXISTS tasa_conversion DECIMAL(10,6);
        `
      });

    if (alterError) {
      console.log('Could not add columns via RPC, trying manual approach...');
      
      // Check if columns exist by trying to select them
      const { error: checkError } = await supabase
        .from('payments')
        .select('tasa_conversion')
        .limit(1);
        
      if (checkError && checkError.code === 'PGRST204') {
        console.error('❌ Migration needed: tasa_conversion column does not exist');
        console.error('Please run the SQL migration manually in Supabase dashboard:');
        console.error(`
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS monto_original DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS moneda_original VARCHAR(3),
ADD COLUMN IF NOT EXISTS monto_convertido DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS moneda_conversion VARCHAR(3),
ADD COLUMN IF NOT EXISTS tasa_conversion DECIMAL(10,6);

UPDATE payments 
SET monto_original = monto_pago, moneda_original = moneda
WHERE monto_original IS NULL;
        `);
      } else {
        console.log('✅ Columns appear to exist');
      }
    } else {
      console.log('✅ Conversion columns added successfully');
      
      // Update existing payments
      const { error: updateError } = await supabase.rpc('exec_sql', {
        sql: `
          UPDATE payments 
          SET monto_original = monto_pago, moneda_original = moneda
          WHERE monto_original IS NULL;
        `
      });

      if (updateError) {
        console.error('Error updating existing payments:', updateError);
      } else {
        console.log('✅ Existing payments updated successfully');
      }
    }

    console.log('Migration process completed!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

runMigration();

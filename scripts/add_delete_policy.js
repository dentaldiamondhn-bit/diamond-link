import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addDeletePolicy() {
  try {
    console.log('Adding DELETE policy for payments table...');
    
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Users can delete payments for their completed treatments" ON payments;
        CREATE POLICY "Users can delete payments for their completed treatments" ON payments
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM tratamientos_completados tc
                    WHERE tc.id = payments.tratamiento_completado_id
                )
            );
      `
    });

    if (error) {
      console.error('Error adding DELETE policy:', error);
      console.log('Please run this SQL manually in Supabase dashboard:');
      console.log(`
DROP POLICY IF EXISTS "Users can delete payments for their completed treatments" ON payments;
CREATE POLICY "Users can delete payments for their completed treatments" ON payments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM tratamientos_completados tc
            WHERE tc.id = payments.tratamiento_completado_id
        )
    );
      `);
    } else {
      console.log('✅ DELETE policy added successfully');
    }
  } catch (err) {
    console.error('Failed to add DELETE policy:', err);
  }
}

addDeletePolicy();

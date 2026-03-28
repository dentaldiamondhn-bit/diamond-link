const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runPaqueteMigration() {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create function to increment paquete counter
        CREATE OR REPLACE FUNCTION increment_paquete_counter(paquete_id INTEGER)
        RETURNS VOID AS $$
        BEGIN
          UPDATE paquetes 
          SET veces_vendido = veces_vendido + 1
          WHERE id = paquete_id;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (error) {
      console.error('Paquete migration failed:', error);
    } else {
      console.log('Paquete migration completed successfully');
    }
  } catch (err) {
    console.error('Error running paquete migration:', err);
  }
}

runPaqueteMigration();

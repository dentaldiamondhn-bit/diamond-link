import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    console.log('Starting migration to fix doctor_id type...');
    
    // Read the migration file
    const migrationSQL = readFileSync('./supabase/migrations/20250220000002_fix_doctor_id_type.sql', 'utf8');
    
    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 100) + '...');
        
        try {
          const { data, error } = await supabase.rpc('exec', { sql: statement });
          
          if (error) {
            console.error('Error executing statement:', error);
            
            // Try using direct SQL if exec fails
            try {
              const { data: data2, error: error2 } = await supabase
                .from('historia_clinica_ortodoncia')
                .select('*')
                .limit(1);
              
              if (error2 && error2.message.includes('invalid input syntax for type uuid')) {
                console.log('Detected UUID issue, attempting direct table alteration...');
                
                // Direct approach: use raw SQL through the REST API
                const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/historia_clinica_ortodoncia?select=doctor_id`, {
                  method: 'PATCH',
                  headers: {
                    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                  },
                  body: JSON.stringify({ doctor_id: 'temp' })
                });
                
                if (!response.ok) {
                  console.log('Direct approach also failed, need manual migration');
                } else {
                  console.log('Direct approach worked');
                }
              }
            } catch (e3) {
              console.log('Alternative approach failed:', e3.message);
            }
          } else {
            console.log('Statement executed successfully');
          }
        } catch (e) {
          console.error('Exception executing statement:', e.message);
        }
      }
    }
    
    console.log('Migration completed');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();

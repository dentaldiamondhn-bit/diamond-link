const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Starting estudios periodontales tables migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_estudios_periodontales_tables.sql');
    console.log('Looking for SQL file at:', sqlPath);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_statement: statement });
        
        if (error) {
          console.error(`Error in statement ${i + 1}:`, error);
          console.error('Statement:', statement);
          
          // Try direct SQL execution for DDL statements
          try {
            const { error: ddlError } = await supabase
              .from('migration_log')
              .insert({
                migration_name: 'create_estudios_periodontales_tables',
                sql_statement: statement,
                status: 'error',
                error_message: ddlError?.message || 'Unknown error',
                executed_at: new Date().toISOString()
              });
            
            if (ddlError) {
              console.error('Failed to log error:', ddlError);
            }
          } catch (logError) {
            console.error('Failed to log migration error:', logError);
          }
          
          continue;
        }
        
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (err) {
        console.error(`❌ Error executing statement ${i + 1}:`, err);
        console.error('Statement:', statement);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution via REST API
async function runMigrationViaREST() {
  try {
    console.log('Running migration via REST API...');
    
    const sqlPath = path.join(__dirname, 'create_estudios_periodontales_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ sql_statement: sql })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Migration failed:', error);
      process.exit(1);
    }
    
    const result = await response.json();
    console.log('Migration result:', result);
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Try the REST API approach since RPC might not be available
runMigrationViaREST();

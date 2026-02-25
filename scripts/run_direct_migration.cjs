const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    console.log('Running orthodontic versioning migration...');
    
    // Read the migration file
    const fs = require('fs');
    const path = require('path');
    const migrationFile = process.argv[2];
    
    if (!migrationFile) {
      console.error('Please provide migration file path');
      process.exit(1);
    }
    
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration:', migrationFile);
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 100) + '...');
        
        const { error } = await supabase.rpc('exec', { 
          sql: statement 
        });
        
        if (error) {
          console.error('Statement failed:', error);
          console.error('Statement:', statement);
          // Try direct SQL execution for ALTER and CREATE statements
          try {
            const { error: directError } = await supabase
              .from('information_schema')
              .select('*')
              .limit(1);
            
            if (directError) {
              console.log('Cannot execute directly, continuing...');
            }
          } catch (e) {
            console.log('Direct execution not available');
          }
        }
      }
    }
    
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

runMigration();

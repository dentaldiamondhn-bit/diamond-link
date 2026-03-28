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
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
    
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

runMigration();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeSQL(sql) {
  try {
    console.log('Executing SQL:', sql.substring(0, 100) + '...');
    
    // Use raw SQL execution via PostgREST
    const { data, error } = await supabase
      .rpc('exec_sql', { sql });
    
    if (error) {
      console.error('SQL execution failed:', error);
      return false;
    }
    
    console.log('SQL executed successfully');
    return true;
  } catch (err) {
    console.error('Error executing SQL:', err);
    return false;
  }
}

async function runMigration() {
  try {
    console.log('Running orthodontic versioning migration...');
    
    const migrationFile = process.argv[2];
    if (!migrationFile) {
      console.error('Please provide migration file path');
      process.exit(1);
    }
    
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // For now, let's create the tables manually using individual statements
    const statements = [
      // Add progress tracking to main table
      `ALTER TABLE historia_clinica_ortodoncia 
       ADD COLUMN IF NOT EXISTS progress_percentage DECIMAL(5,2) DEFAULT 0,
       ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1,
       ADD COLUMN IF NOT EXISTS total_estimated_appointments INTEGER DEFAULT 12,
       ADD COLUMN IF NOT EXISTS completed_appointments INTEGER DEFAULT 0`,
      
      // Create versions table
      `CREATE TABLE IF NOT EXISTS historia_clinica_ortodoncia_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id TEXT NOT NULL,
        original_record_id UUID REFERENCES historia_clinica_ortodoncia(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        record_date DATE,
        progress_percentage DECIMAL(5,2) DEFAULT 0,
        is_current BOOLEAN DEFAULT false,
        paciente_id TEXT,
        doctor_id TEXT,
        motivo_consulta_ortodoncia TEXT,
        diagnostico_ortodoncia TEXT,
        plan_tratamiento_ortodoncia TEXT,
        tipo_mordida TEXT,
        tipo_aparato TEXT,
        duracion_tratamiento TEXT,
        fecha_inicio_tratamiento DATE,
        fecha_fin_tratamiento DATE,
        observaciones_ortodoncia TEXT,
        radiografias_realizadas TEXT,
        modelos_estudio TEXT,
        analisis_cefalometrico TEXT,
        extracciones_realizadas TEXT,
        retenedor_tipo TEXT,
        retenedor_uso TEXT,
        seguimiento_post_tratamiento TEXT,
        documentos_ortodoncia TEXT[],
        firma_digital_ortodoncia TEXT,
        total_estimated_appointments INTEGER DEFAULT 12,
        completed_appointments INTEGER DEFAULT 0,
        created_by TEXT,
        notes TEXT,
        UNIQUE(patient_id, version_number)
      )`,
      
      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_orthodoncia_versions_patient_id 
       ON historia_clinica_ortodoncia_versions(patient_id)`,
       
      `CREATE INDEX IF NOT EXISTS idx_orthodoncia_versions_created_at 
       ON historia_clinica_ortodoncia_versions(created_at DESC)`,
       
      `CREATE INDEX IF NOT EXISTS idx_orthodoncia_versions_current 
       ON historia_clinica_ortodoncia_versions(patient_id, is_current)`
    ];
    
    for (const statement of statements) {
      await executeSQL(statement);
    }
    
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

runMigration();

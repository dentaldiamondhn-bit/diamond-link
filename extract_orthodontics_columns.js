const fs = require('fs');
const path = require('path');

// Orthodontics columns we need to find
const orthodonticsColumns = [
  'necesita_ortodoncia',
  'detalles_ortodoncia', 
  'relacion_molar',
  'relacion_canina',
  'tipo_mordida',
  'apiñamiento',
  'espacios',
  'lineamedia',
  'diagnostico',
  'tipo_aparatologia',
  'otro_aparatologia'
];

function extractOrthodonticsColumns(backupFile) {
  console.log('🔍 Extracting orthodontics columns from backup...');
  
  if (!fs.existsSync(backupFile)) {
    console.error('❌ Backup file not found:', backupFile);
    console.log('Please download the backup from Supabase and place it in this directory.');
    return;
  }
  
  const backupContent = fs.readFileSync(backupFile, 'utf8');
  const lines = backupContent.split('\n');
  
  const foundColumns = [];
  const createTableStatements = [];
  const constraints = [];
  const indexes = [];
  
  // Find CREATE TABLE statements for patients table
  let inPatientsTable = false;
  let currentStatement = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if we're in the patients table definition
    if (line.includes('CREATE TABLE') && line.includes('patients')) {
      inPatientsTable = true;
      currentStatement = line;
      continue;
    }
    
    if (inPatientsTable) {
      currentStatement += '\n' + line;
      
      // Check for orthodontics columns
      for (const column of orthodonticsColumns) {
        if (line.includes(column)) {
          foundColumns.push({
            column: column,
            line: line,
            lineNumber: i + 1
          });
        }
      }
      
      // Check for constraints related to orthodontics
      if (line.includes('CONSTRAINT') && orthodonticsColumns.some(col => line.includes(col))) {
        constraints.push({
          constraint: line,
          lineNumber: i + 1
        });
      }
      
      // End of CREATE TABLE statement
      if (line.includes(');') && !line.includes('--')) {
        createTableStatements.push(currentStatement);
        inPatientsTable = false;
        currentStatement = '';
      }
    }
    
    // Check for indexes related to orthodontics
    if (line.includes('CREATE INDEX') && orthodonticsColumns.some(col => line.includes(col))) {
      indexes.push({
        index: line,
        lineNumber: i + 1
      });
    }
  }
  
  // Generate restoration SQL
  const restorationSQL = generateRestorationSQL(foundColumns, constraints, indexes);
  
  // Save results
  const results = {
    foundColumns,
    constraints,
    indexes,
    restorationSQL,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync('./orthodontics_columns_extracted.json', JSON.stringify(results, null, 2));
  fs.writeFileSync('./restore_orthodontics_columns.sql', restorationSQL);
  
  console.log('✅ Extraction complete!');
  console.log(`📁 Found ${foundColumns.length} orthodontics columns`);
  console.log(`📁 Found ${constraints.length} constraints`);
  console.log(`📁 Found ${indexes.length} indexes`);
  console.log('');
  console.log('Files created:');
  console.log('  - orthodontics_columns_extracted.json (detailed analysis)');
  console.log('  - restore_orthodontics_columns.sql (restoration script)');
  console.log('');
  console.log('Found columns:');
  foundColumns.forEach(col => {
    console.log(`  - ${col.column}: ${col.line}`);
  });
}

function generateRestorationSQL(columns, constraints, indexes) {
  let sql = '-- Restore Orthodontics Columns\n';
  sql += '-- Generated from backup extraction\n';
  sql += `-- Generated at: ${new Date().toISOString()}\n\n`;
  
  sql += '-- Add orthodontics columns back to patients table\n';
  columns.forEach(col => {
    // Extract column definition from the line
    const columnDef = col.line.replace(',', '').trim();
    sql += `ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS ${columnDef};\n`;
  });
  
  sql += '\n-- Add constraints\n';
  constraints.forEach(constraint => {
    sql += `ALTER TABLE public.patients ADD ${constraint.constraint.replace(',', '').trim()};\n`;
  });
  
  sql += '\n-- Add indexes\n';
  indexes.forEach(index => {
    sql += `${index.index};\n`;
  });
  
  return sql;
}

// Usage
const backupFile = process.argv[2];
if (!backupFile) {
  console.log('Usage: node extract_orthodontics_columns.js <backup_file.sql>');
  console.log('');
  console.log('Steps:');
  console.log('1. Download the latest backup from Supabase Dashboard');
  console.log('2. Save it as backup.sql in this directory');
  console.log('3. Run: node extract_orthodontics_columns.js backup.sql');
} else {
  extractOrthodonticsColumns(backupFile);
}

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateExistingData() {
  try {
    console.log('🔄 Migrating existing orthodontic data to versioning system...');
    
    // Get all existing orthodontic records
    const { data: existingRecords, error: fetchError } = await supabase
      .from('historia_clinica_ortodoncia')
      .select('*')
      .not('paciente_id', 'is', null);
    
    if (fetchError) {
      console.error('❌ Error fetching existing records:', fetchError);
      return;
    }
    
    if (!existingRecords || existingRecords.length === 0) {
      console.log('✅ No existing records to migrate');
      return;
    }
    
    console.log(`📊 Found ${existingRecords.length} existing records to migrate`);
    
    for (const record of existingRecords) {
      console.log(`🔄 Migrating record for patient: ${record.paciente_id}`);
      
      // Check if version already exists for this patient
      const { data: existingVersions, error: versionError } = await supabase
        .from('historia_clinica_ortodoncia_versions')
        .select('id')
        .eq('patient_id', record.paciente_id);
      
      if (versionError) {
        console.error('❌ Error checking existing versions:', versionError);
        continue;
      }
      
      // Only create version if none exists
      if (!existingVersions || existingVersions.length === 0) {
        const { data: newVersion, error: insertError } = await supabase
          .from('historia_clinica_ortodoncia_versions')
          .insert({
            patient_id: record.paciente_id,
            original_record_id: record.id,
            version_number: 1,
            record_date: record.created_at ? record.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            progress_percentage: record.progress_percentage || 0,
            is_current: true,
            
            // Copy all existing fields
            paciente_id: record.paciente_id,
            doctor_id: record.doctor_id,
            motivo_consulta_ortodoncia: record.motivo_consulta_ortodoncia,
            diagnostico_ortodoncia: record.diagnostico_ortodoncia,
            plan_tratamiento_ortodoncia: record.plan_tratamiento_ortodoncia,
            tipo_mordida: record.tipo_mordida,
            tipo_aparato: record.tipo_aparato,
            duracion_tratamiento: record.duracion_tratamiento,
            fecha_inicio_tratamiento: record.fecha_inicio_tratamiento,
            fecha_fin_tratamiento: record.fecha_fin_tratamiento,
            observaciones_ortodoncia: record.observaciones_ortodoncia,
            radiografias_realizadas: record.radiografias_realizadas,
            modelos_estudio: record.modelos_estudio,
            analisis_cefalometrico: record.analisis_cefalometrico,
            extracciones_realizadas: record.extracciones_realizadas,
            retenedor_tipo: record.retenedor_tipo,
            retenedor_uso: record.retenedor_uso,
            seguimiento_post_tratamiento: record.seguimiento_post_tratamiento,
            documentos_ortodoncia: record.documentos_ortodoncia,
            firma_digital_ortodoncia: record.firma_digital_ortodoncia,
            
            // Progress tracking fields
            total_estimated_appointments: record.total_estimated_appointments || 12,
            completed_appointments: record.completed_appointments || 0,
            
            // Metadata
            created_by: 'migration',
            notes: 'Initial version migrated from existing record'
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('❌ Error creating version for patient:', record.paciente_id, insertError);
        } else {
          console.log(`✅ Created initial version V1 for patient: ${record.paciente_id}`);
          
          // Update main record to set current_version
          await supabase
            .from('historia_clinica_ortodoncia')
            .update({ current_version: 1 })
            .eq('paciente_id', record.paciente_id);
        }
      } else {
        console.log(`⏭️ Versions already exist for patient: ${record.paciente_id}, skipping`);
      }
    }
    
    console.log('🎉 Migration completed!');
    console.log('📋 Summary:');
    console.log(`   - Processed: ${existingRecords.length} records`);
    console.log('   - Created initial versions for existing patients');
    console.log('   - Versioning system is now ready');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateExistingData();

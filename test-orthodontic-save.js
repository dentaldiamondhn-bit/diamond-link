// Simple test to debug orthodontic save issue
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSave() {
  console.log('=== TESTING ORTHODONTIC SAVE ===');
  
  try {
    // Test with minimal data
    const testData = {
      paciente_id: 'test-patient-id',
      doctor_id: 'test-doctor-id',
      nombre_completo: 'Test Patient',
      motivo_consulta_ortodoncia: 'Test consultation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Test data:', testData);
    
    const { data, error } = await supabase
      .from('historia_clinica_ortodoncia')
      .insert([testData])
      .select();
    
    if (error) {
      console.error('❌ INSERT ERROR:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      return { success: false, error };
    } else {
      console.log('✅ INSERT SUCCESS:', data);
      return { success: true, data };
    }
    
  } catch (err) {
    console.error('❌ UNEXPECTED ERROR:', err);
    return { success: false, error: err };
  }
}

// Run the test
testSave();

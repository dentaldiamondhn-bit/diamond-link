import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log('🔧 Starting historical mode schema migration...');
    
    // Step 1: Get all current settings
    const { data: currentSettings, error: fetchError } = await supabase
      .from('historical_mode_settings')
      .select('*');
    
    if (fetchError) {
      console.error('❌ Error fetching current settings:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
    
    console.log(`📊 Found ${currentSettings.length} current settings`);
    
    // Step 2: Group by patient_id and get the latest setting for each patient
    const patientSettings = new Map();
    
    currentSettings.forEach(setting => {
      const patientId = setting.patient_id;
      const existing = patientSettings.get(patientId);
      
      // Keep the latest setting for each patient
      if (!existing || new Date(setting.updated_at) > new Date(existing.updated_at)) {
        patientSettings.set(patientId, {
          patient_id: patientId,
          bypass_historical_mode: setting.bypass_historical_mode,
          updated_at: setting.updated_at
        });
      }
    });
    
    console.log(`📋 Unique patients: ${patientSettings.size}`);
    
    // Step 3: Delete all existing settings
    const { error: deleteError } = await supabase
      .from('historical_mode_settings')
      .delete()
      .gte('id', '0'); // Delete all records (safer than neq)
    
    if (deleteError) {
      console.error('❌ Error deleting existing settings:', deleteError);
      return NextResponse.json({ error: 'Failed to delete existing settings' }, { status: 500 });
    }
    
    console.log('🗑️ Deleted all existing settings');
    
    // Step 4: Insert new patient-only settings (no user_id)
    const newSettings = Array.from(patientSettings.values());
    
    const { data: insertData, error: insertError } = await supabase
      .from('historical_mode_settings')
      .insert(newSettings.map(setting => ({
        patient_id: setting.patient_id,
        bypass_historical_mode: setting.bypass_historical_mode,
        updated_at: setting.updated_at
      })))
      .select();
    
    if (insertError) {
      console.error('❌ Error inserting new settings:', insertError);
      return NextResponse.json({ error: 'Failed to insert new settings' }, { status: 500 });
    }
    
    console.log(`✅ Migration complete! Created ${insertData.length} patient-only settings`);
    
    return NextResponse.json({
      success: true,
      message: 'Historical mode settings migrated successfully',
      deletedCount: currentSettings.length,
      createdCount: insertData.length,
      newSettings: insertData
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

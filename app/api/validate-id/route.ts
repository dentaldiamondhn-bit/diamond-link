import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idNumber = searchParams.get('id');
    const patientId = searchParams.get('patientId'); // For edit mode (exclude current patient)
    
    if (!idNumber) {
      return NextResponse.json({ 
        error: 'ID number is required' 
      }, { status: 400 });
    }
    
    console.log('🔍 Checking ID number uniqueness:', { idNumber, patientId });
    
    // Check if ID number exists (excluding current patient if in edit mode)
    let query = supabase
      .from('patients')
      .select('paciente_id, nombre_completo, numero_identidad')
      .eq('numero_identidad', idNumber.trim());
    
    // If editing, exclude current patient from the check
    if (patientId) {
      query = query.neq('paciente_id', patientId);
    }
    
    const { data: existingPatients, error } = await query;
    
    if (error) {
      console.error('❌ Error checking ID uniqueness:', error);
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      }, { status: 500 });
    }
    
    const isUnique = !existingPatients || existingPatients.length === 0;
    const existingPatient = existingPatients && existingPatients.length > 0 ? existingPatients[0] : null;
    
    console.log('✅ ID uniqueness check result:', { 
      idNumber, 
      isUnique, 
      existingPatient: existingPatient ? {
        id: existingPatient.paciente_id,
        name: existingPatient.nombre_completo,
        idNumber: existingPatient.numero_identidad
      } : null 
    });
    
    return NextResponse.json({
      success: true,
      isUnique,
      idNumber: idNumber.trim(),
      existingPatient: existingPatient ? {
        id: existingPatient.paciente_id,
        name: existingPatient.nombre_completo,
        idNumber: existingPatient.numero_identidad
      } : null,
      message: isUnique 
        ? 'ID number is available' 
        : `ID number already exists for patient: ${existingPatient?.nombre_completo}`
    });
    
  } catch (error) {
    console.error('❌ Unexpected error in ID validation:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

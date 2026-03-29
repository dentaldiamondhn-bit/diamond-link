'use server';

import { PatientService } from '@/services/patientService';
import { StorageService } from '@/services/storageService';
import { NotificationService } from '@/services/notificationService';
import { Patient } from '@/types/patient';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

// Helper function to calculate age at moment of consultation
function calculateEdadAlMomentoConsulta(fechaNacimiento: string, fechaInicio: string): number {
  if (!fechaNacimiento || fechaNacimiento === '') {
    return 0;
  }

  // Parse birth date
  let birthDate: Date;
  if (fechaNacimiento.includes('/')) {
    const [day, month, year] = fechaNacimiento.split('/');
    birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  } else if (fechaNacimiento.includes('-')) {
    birthDate = new Date(fechaNacimiento);
  } else {
    return 0;
  }

  // Use fecha_inicio if available, otherwise use today's date
  let comparisonDate: Date;
  if (fechaInicio && fechaInicio !== '') {
    if (fechaInicio.includes('/')) {
      const [day, month, year] = fechaInicio.split('/');
      comparisonDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (fechaInicio.includes('-')) {
      comparisonDate = new Date(fechaInicio);
    } else {
      comparisonDate = new Date();
    }
  } else {
    comparisonDate = new Date();
  }

  // Calculate age
  let age = comparisonDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = comparisonDate.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && comparisonDate.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

// Helper function to get existing documents for a patient
async function getExistingDocuments(patientId: string): Promise<string[]> {
  try {
    const patient = await PatientService.getPatientById(patientId);
    return patient.documentos || [];
  } catch (error) {
    console.error('Error fetching existing documents:', error);
    return [];
  }
}

// Server-side Supabase client for updates
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

// Server-only update function
async function updatePatientServer(id: string, updates: Partial<Patient>): Promise<Patient> {
  console.log('🔍 Updating patient in database:', { id, updates });
  
  const { data, error } = await supabaseServer
    .from('patients')
    .update(updates)
    .eq('paciente_id', id)
    .select();

  if (error) {
    console.error('🔍 Database update error:', error);
    throw error;
  }

  console.log('🔍 Database update result:', { data, error });

  if (!data || data.length === 0) {
    console.log('🔍 Update returned no data, attempting to fetch updated patient');
    // Try to fetch the updated patient
    const { data: fetchedData, error: fetchError } = await supabaseServer
      .from('patients')
      .select('*')
      .eq('paciente_id', id)
      .single();
      
    if (fetchError) {
      console.error('🔍 Fetch error after update:', fetchError);
      throw new Error('Update succeeded but failed to fetch updated data');
    }
    
    return fetchedData;
  }

  return data[0];
}

export async function updatePatient(patientId: string, formData: FormData) {
  try {
    console.log('🔍 Starting patient update for ID:', patientId);
    
    // Handle document uploads - only if files are actually uploaded
    let documentUrls: string[] = [];
    const documentFiles = formData.getAll('documentos') as any[];
    
    // Only process document upload if files are actually provided
    // Check if first item has properties of a file (name, size, type)
    if (documentFiles.length > 0 && documentFiles[0] && documentFiles[0].name && documentFiles[0].size > 0) {
      try {
        documentUrls = await StorageService.uploadDocuments(documentFiles, patientId);
        console.log('Documents uploaded successfully:', documentUrls);
      } catch (docError) {
        console.error('Error uploading documents:', docError);
        console.log('Continuing without document upload...');
        // Continue without documents - don't block form submission
      }
    } else {
      console.log('No documents to upload - skipping document upload process');
    }
    
    // Build patient data with validation - only include fields that have valid values
    const patientData: Partial<Patient> = {};
    
    // Always include basic required fields
    const nombreCompleto = formData.get('nombre_completo') as string;
    if (nombreCompleto && nombreCompleto.trim() !== '') {
      patientData.nombre_completo = nombreCompleto.trim();
    }
    
    const numeroIdentidad = formData.get('numero_identidad') as string;
    if (numeroIdentidad && numeroIdentidad.trim() !== '') {
      patientData.numero_identidad = numeroIdentidad.trim();
    }
    
    const fechaNacimiento = formData.get('fecha_nacimiento') as string;
    if (fechaNacimiento && fechaNacimiento.trim() !== '') {
      patientData.fecha_nacimiento = fechaNacimiento;
    }
    
    const direccion = formData.get('direccion') as string;
    if (direccion && direccion.trim() !== '') {
      patientData.direccion = direccion.trim();
    }
    
    const escolaridad = formData.get('escolaridad') as string;
    if (escolaridad && escolaridad.trim() !== '') {
      patientData.escolaridad = escolaridad;
    }
    
    // Handle optional fields with validation
    const optionalFields = [
      'tipo_identificacion', 'otro_tipo_identificacion', 'telefono', 'codigopais',
      'email', 'sexo', 'otro_genero', 'tipo_sangre', 'estado_civil', 'trabajo',
      'representante_legal', 'parentesco', 'otro_parentesco', 'rep_tipo_identificacion', 
      'rep_otro_tipo_identificacion', 'rep_numero_identidad', 'rep_celular',
      'codigopaisrepresentante', 'contacto_emergencia', 'contacto_telefono',
      'codigopaisemergencia', 'alergias', 'alergias_medicamentos', 'enfermedades',
      'medicamentos', 'habitos_fumar', 'fuma_cantidad', 'fuma_frecuencia',
      'habitos_alcohol', 'alcohol_tipo', 'alcohol_frecuencia', 'alcohol_cantidad',
      'habitos_cafe', 'cantidad_tazas', 'cafe_frecuencia', 'habitos_drogas',
      'drogas_tipo', 'drogas_frecuencia', 'ejercicio', 'ejercicio_frecuencia',
      'ejercicio_tipo', 'dieta', 'dieta_tipo', 'sueño_horas', 'sueño_calidad',
      'estres', 'estres_nivel', 'antecedentes_familiares', 'antecedentes_personales',
      'ultima_visita', 'ultima_limpieza', 'f_cepillado', 'hilo_dental', 'enjuague_bucal',
      'protesis', 'sensibilidad', 'bruxismo', 'vacunas',
      'observaciones_medicas', 'motivo_consulta', 'plan_tratamiento',
      'proximo_control', 'notas_odontologo', 'tratamiento', 'observaciones_plan',
      // Additional fields for minors
      'apodo', 'enfermedades_sistemicas_texto', 'pediatra_otorrinolaringologo', 'pediatra', 'psicologo', 'otro_medico',
      'frecuencia_cepillado_detalle', 'cepillado_acompanado', 'peso', 'talla', 'tipo_alimentacion', 'momentos_azucar',
      // Missing fields that were not being saved
      'medico_cabecera', 'doctor', 'fecha_inicio', 'seguro', 'poliza', 'contacto',
      'hospitalizaciones', 'cirugias', 'embarazo', 'medicamentos_embarazo', 'tipo_droga',
      // Main Hábitos fields that were missing
      'fuma', 'alcohol', 'drogas', 'cafe', 'objetos',
      // Evaluación Odontológica fields that were missing
      'encias', 'dolor', 'dolor_cabeza', 'chasquidos', 'dolor_oido', 'ortodoncia',
      'orto_finalizado', 'sensibilidad', 'tipo_sensibilidad',
      // New dental evaluation fields
      'reaccion_adversa_anestesico', 'tipo_reaccion', 'experiencia_traumatica', 'que_sucedio',
      // Additional fields from create action that were missing
      'morder', 'hielo', 'boca', 'refrescos', 'dulces', 'pegajosos', 'azucarados',
      'obs', 'visitas_dentista', 'obsgen', 'motivo', 'historial',
      'sangrado_encia', 'dolor_masticar', 'dolor_cabeza_detalle',
      'chasquidos_mandibulares', 'dolor_oido_detalle', 'suction_digital',
      'protesis_tipo', 'protesis_nocturno', 'tipo_bruxismo', 'orto_motivo_no_finalizado',
      'ultima_limpieza', 'tipocepillo', 'pastadental', 'cambio_cepillo',
      // Observaciones Generales field
      'observaciones_generales',
      'hilo_dental', 'enjuague_bucal', 'tipo_enjuague_bucal', 'tratamiento', 'observaciones_plan'
    ];
    
    // Main select fields that should always be saved (even if empty or "no")
    const mainSelectFields = [
      'fuma', 'alcohol', 'drogas', 'cafe', 'objetos',
      'encias', 'dolor', 'dolor_cabeza', 'chasquidos', 'dolor_oido', 'ortodoncia',
      'orto_finalizado', 'sensibilidad', 'tipo_sensibilidad',
      // Additional conditional fields
      'morder', 'hielo', 'boca', 'refrescos', 'dulces', 'pegajosos', 'azucarados',
      'obs', 'visitas_dentista', 'obsgen', 'motivo', 'historial',
      'sangrado_encia', 'dolor_masticar', 'dolor_cabeza_detalle',
      'chasquidos_mandibulares', 'dolor_oido_detalle', 'suction_digital',
      'protesis_tipo', 'protesis_nocturno', 'tipo_bruxismo', 'orto_motivo_no_finalizado',
      // Additional fields that should always be saved
      'hilo_dental', 'enjuague_bucal', 'tipo_droga'
    ];
    
    // Debug: Log all form data keys to see what's being submitted
    console.log('🔍 All form data entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    // Process main select fields - always save them, but validate enum fields
    mainSelectFields.forEach(field => {
      const value = formData.get(field) as string;
      
      if (value !== null) {
        (patientData as any)[field] = value.trim();
      }
    });
    
    // Process other optional fields - only save if not empty
    const otherOptionalFields = optionalFields.filter(field => !mainSelectFields.includes(field));
    otherOptionalFields.forEach(field => {
      const value = formData.get(field) as string;
      if (value && value.trim() !== '') {
        (patientData as any)[field] = value.trim();
      }
    });
    
    // Special handling for required enum fields to prevent constraint violations
    const requiredEnumFields = [
      'fuma', 'alcohol', 'drogas', 'cafe', 'objetos',
      'encias', 'dolor', 'dolor_cabeza', 'chasquidos', 'dolor_oido', 'ortodoncia',
      'sensibilidad', 'bruxismo', 'hilo_dental', 'enjuague_bucal'
    ];
    
    requiredEnumFields.forEach(field => {
      const value = formData.get(field) as string;
      if (!value || value.trim() === '') {
        // Set default value for required enum fields to prevent constraint violations
        (patientData as any)[field] = 'no';
      }
    });
    
    // Handle numeric fields with validation
    const edad = formData.get('edad') as string;
    if (edad && !isNaN(parseInt(edad))) {
      patientData.edad = parseInt(edad);
    }
    
    const fechaInicio = formData.get('fecha_inicio') as string;
    patientData.edad_al_momento_consulta = calculateEdadAlMomentoConsulta(fechaNacimiento, fechaInicio);
    
    const fumaCantidad = formData.get('fuma_cantidad') as string;
    if (fumaCantidad && !isNaN(parseInt(fumaCantidad))) {
      patientData.fuma_cantidad = parseInt(fumaCantidad);
    }
    
    const cantidadTazas = formData.get('cantidad_tazas') as string;
    if (cantidadTazas && !isNaN(parseInt(cantidadTazas))) {
      patientData.cantidad_tazas = parseInt(cantidadTazas);
    }
    
    const cafeFrecuencia = formData.get('cafe_frecuencia') as Patient['cafe_frecuencia'];
    if (cafeFrecuencia) {
      patientData.cafe_frecuencia = cafeFrecuencia;
    }
    
    const tipoEnjuagueBucal = formData.get('tipo_enjuague_bucal') as string;
    if (tipoEnjuagueBucal) {
      patientData.tipo_enjuague_bucal = tipoEnjuagueBucal;
    }
    
    const fCepillado = formData.get('f_cepillado') as string;
    if (fCepillado && !isNaN(parseInt(fCepillado))) {
      patientData.f_cepillado = parseInt(fCepillado);
    }
    
    // Handle additional numeric fields that might be missing
    const semanasEmbarazo = formData.get('semanas_embarazo') as string;
    if (semanasEmbarazo && !isNaN(parseInt(semanasEmbarazo))) {
      patientData.semanas_embarazo = parseInt(semanasEmbarazo);
    }
    
    // Calculate pregnancy status if applicable
    if (patientData.embarazo === 'si' && patientData.fecha_inicio && patientData.semanas_embarazo) {
      // Import the pregnancy utils function
      const { updatePregnancyStatus } = await import('@/utils/pregnancyUtils');
      const updatedPatientData = updatePregnancyStatus(patientData);
      Object.assign(patientData, updatedPatientData);
      console.log('Pregnancy status updated:', {
        embarazo_fecha_fin: updatedPatientData.embarazo_fecha_fin,
        embarazo_activo: updatedPatientData.embarazo_activo
      });
    }
    
    // Handle signature - only if it's a valid URL (not base64)
    const signatureData = formData.get('firma_digital') as string;
    if (signatureData && signatureData.startsWith('http')) {
      patientData.firma_digital = signatureData;
    } else if (signatureData && signatureData.startsWith('data:image')) {
      // Upload new signature
      console.log('🔍 Uploading new signature');
      const signatureUrl = await StorageService.uploadSignature(signatureData, patientId);
      if (signatureUrl) {
        patientData.firma_digital = signatureUrl;
      }
    }
    
    // Add document URLs if any were uploaded
    if (documentUrls.length > 0) {
      // Get existing documents from the current patient data
      const existingDocuments = await getExistingDocuments(patientId);
      
      // Combine existing documents with new ones
      patientData.documentos = [...(existingDocuments || []), ...documentUrls];
      console.log('🔍 Combined documents - Existing:', existingDocuments, 'New:', documentUrls, 'Total:', patientData.documentos);
    }
    
    console.log('🔍 Final patient data keys:', Object.keys(patientData));
    console.log('🔍 Sample patient data values:', {
      nombre_completo: patientData.nombre_completo,
      tipo_identificacion: patientData.tipo_identificacion,
      sexo: patientData.sexo,
      tipo_sangre: patientData.tipo_sangre,
      firma_digital: patientData.firma_digital ? 'PRESENT' : 'MISSING',
      fuma: patientData.fuma,
      alcohol: patientData.alcohol,
      drogas: patientData.drogas,
      cafe: patientData.cafe,
      objetos: patientData.objetos
    });
    
    // Check for potential constraint violations before update
    const enumFields = ['fuma', 'alcohol', 'drogas', 'cafe', 'objetos', 'encias', 'dolor', 'dolor_cabeza', 'chasquidos', 'dolor_oido', 'ortodoncia', 'sensibilidad', 'bruxismo', 'hilo_dental', 'enjuague_bucal'];
    enumFields.forEach(field => {
      const value = (patientData as any)[field];
      if (value && value !== 'no' && value !== 'si' && value !== 'en_tratamiento') {
        console.warn(`⚠️ Potential enum constraint violation for ${field}:`, value);
      }
    });
    
    const updatedPatient = await updatePatientServer(patientId, patientData);
    console.log('🔍 Patient updated successfully:', updatedPatient);
    
    // Add notification for patient update
    try {
      const { userId } = await auth();
      const patientName = updatedPatient.nombre_completo;
      
      // Get user information from Clerk
      let userName = 'Usuario';
      try {
        const clerkResponse = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (clerkResponse.ok) {
          const userData = await clerkResponse.json();
          userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username || userData.email_addresses?.[0]?.email_address || 'Usuario';
        }
      } catch (clerkError) {
        console.error('Error fetching user data from Clerk:', clerkError);
      }
      
      // Use NotificationService to send notification
      await NotificationService.notifyPatientUpdated(patientName, userId || 'unknown', userName);
      console.log('Patient update notification sent for:', patientName, 'by:', userName);
    } catch (notificationError) {
      console.error('Failed to send patient update notification:', notificationError);
      // Don't fail the whole operation if notification fails
    }
    
    // Redirect to menu-navegacion with patient context
    const pacienteId = updatedPatient.paciente_id;
    redirect(`/menu-navegacion?id=${encodeURIComponent(pacienteId)}`);
    
  } catch (error) {
    console.error('Error updating patient:', error);
    throw error;
  }
}

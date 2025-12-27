'use server';

import { PatientService } from '../../services/patientService';
import { StorageService } from '../../services/storageService';
import { Patient } from '../../types/patient';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client for updates
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

// Server-only update function
async function updatePatientServer(id: string, updates: Partial<Patient>): Promise<Patient> {
  const { data, error } = await supabaseServer
    .from('patients')
    .update(updates)
    .eq('paciente_id', id)
    .select();

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    // Try to fetch the updated patient
    const { data: fetchedData, error: fetchError } = await supabaseServer
      .from('patients')
      .select('*')
      .eq('paciente_id', id)
      .single();
      
    if (fetchError) {
      throw new Error('Update succeeded but failed to fetch updated data');
    }
    
    return fetchedData;
  }

  return data[0];
}

export async function updatePatient(patientId: string, formData: FormData) {
  try {
    // Handle signature upload if present
    let signatureUrl = null;
    const signatureData = formData.get('firma_digital') as string;
    
    // Check if it's a new signature (base64) or existing signature URL
    if (signatureData && signatureData.startsWith('data:image/png;base64,')) {
      signatureUrl = await StorageService.uploadSignature(
        signatureData, 
        patientId
      );
      
      // Update patient with new signature URL
      if (signatureUrl) {
        await updatePatientServer(patientId, {
          firma_digital: signatureUrl
        });
      }
    } else if (signatureData && signatureData.startsWith('http')) {
      // It's an existing URL, keep it as is
      signatureUrl = signatureData;
    }

    const patientData: Partial<Patient> = {
      nombre_completo: formData.get('nombre_completo') as string,
      tipo_identificacion: formData.get('tipo_identificacion') as Patient['tipo_identificacion'],
      otro_tipo_identificacion: formData.get('otro_tipo_identificacion') as string || undefined,
      numero_identidad: formData.get('numero_identidad') as string,
      fecha_nacimiento: formData.get('fecha_nacimiento') as string,
      edad: formData.get('edad') ? parseInt(formData.get('edad') as string) : undefined,
      representante_legal: formData.get('representante_legal') as string || undefined,
      parentesco: formData.get('parentesco') as Patient['parentesco'] || undefined,
      otro_parentesco: formData.get('otro_parentesco') as string || undefined,
      rep_celular: formData.get('rep_celular') as string || undefined,
      codigopaisrepresentante: formData.get('codigopaisrepresentante') as string || undefined,
      sexo: formData.get('sexo') as Patient['sexo'],
      otro_genero: formData.get('otro_genero') as string || undefined,
      tipo_sangre: formData.get('tipo_sangre') as Patient['tipo_sangre'],
      telefono: formData.get('telefono') as string || undefined,
      codigopais: formData.get('codigopais') as string || undefined,
      direccion: formData.get('direccion') as string,
      escolaridad: formData.get('escolaridad') as string,
      estado_civil: formData.get('estado_civil') as Patient['estado_civil'],
      email: formData.get('email') as string || undefined,
      trabajo: formData.get('trabajo') as string || undefined,
      contacto_emergencia: formData.get('contacto_emergencia') as string || undefined,
      contacto_telefono: formData.get('contacto_telefono') as string || undefined,
      codigopaisemergencia: formData.get('codigopaisemergencia') as string || undefined,
      medico_cabecera: formData.get('medico_cabecera') as string || undefined,
      doctor: formData.get('doctor') as Patient['doctor'],
      otro_doctor: formData.get('otro_doctor') as string || undefined,
      fecha_inicio: formData.get('fecha_inicio') as string,
      seguro: formData.get('seguro') as Patient['seguro'],
      otro_seguro: formData.get('otro_seguro') as string || undefined,
      poliza: formData.get('poliza') as string || undefined,
      contacto: formData.get('contacto') as string || undefined,
      enfermedades: formData.get('enfermedades') as string || undefined,
      alergias: formData.get('alergias') as string || undefined,
      medicamentos: formData.get('medicamentos') as string || undefined,
      hospitalizaciones: formData.get('hospitalizaciones') as string || undefined,
      cirugias: formData.get('cirugias') as string || undefined,
      embarazo: formData.get('embarazo') as Patient['embarazo'] || undefined,
      antecedentes_familiares: formData.get('antecedentes_familiares') as string || undefined,
      vacunas: formData.get('vacunas') as string || undefined,
      observaciones_medicas: formData.get('observaciones_medicas') as string || undefined,
      fuma: formData.get('fuma') as Patient['fuma'],
      fuma_cantidad: formData.get('fuma_cantidad') as string || undefined,
      fuma_frecuencia: formData.get('fuma_frecuencia') as Patient['fuma_frecuencia'] || undefined,
      alcohol: formData.get('alcohol') as Patient['alcohol'],
      alcohol_frecuencia: formData.get('alcohol_frecuencia') as Patient['alcohol_frecuencia'] || undefined,
      drogas: formData.get('drogas') as Patient['drogas'],
      tipo_droga: formData.get('tipo_droga') as string || undefined,
      drogas_frecuencia: formData.get('drogas_frecuencia') as string || undefined,
      cafe: formData.get('cafe') as Patient['cafe'],
      cantidad_tazas: formData.get('cantidad_tazas') ? parseInt(formData.get('cantidad_tazas') as string) : undefined,
      objetos: formData.get('objetos') as Patient['objetos'],
      morder: formData.get('morder') as string || undefined,
      hielo: formData.get('hielo') as Patient['hielo'],
      boca: formData.get('boca') as Patient['boca'],
      refrescos: formData.get('refrescos') as Patient['refrescos'],
      dulces: formData.get('dulces') as Patient['dulces'],
      pegajosos: formData.get('pegajosos') as Patient['pegajosos'],
      azucarados: formData.get('azucarados') as Patient['azucarados'],
      obs: formData.get('obs') as string || undefined,
      visitas_dentista: formData.get('visitas_dentista') as string || undefined,
      obsgen: formData.get('obsgen') as string || undefined,
      motivo: formData.get('motivo') as string,
      historial: formData.get('historial') as string || undefined,
      encias: formData.get('encias') as Patient['encias'],
      sangrado_encia: formData.get('sangrado_encia') as string || undefined,
      dolor: formData.get('dolor') as Patient['dolor'],
      dolor_masticar: formData.get('dolor_masticar') as string || undefined,
      dolor_cabeza: formData.get('dolor_cabeza') as Patient['dolor_cabeza'],
      dolor_cabeza_detalle: formData.get('dolor_cabeza_detalle') as string || undefined,
      chasquidos: formData.get('chasquidos') as Patient['chasquidos'],
      chasquidos_mandibulares: formData.get('chasquidos_mandibulares') as string || undefined,
      dolor_oido: formData.get('dolor_oido') as Patient['dolor_oido'],
      dolor_oido_detalle: formData.get('dolor_oido_detalle') as string || undefined,
      suction_digital: formData.get('suction_digital') as Patient['suction_digital'],
      ortodoncia: formData.get('ortodoncia') as Patient['ortodoncia'],
      orto_finalizado: formData.get('orto_finalizado') as Patient['orto_finalizado'] || undefined,
      orto_motivo_no_finalizado: formData.get('orto_motivo_no_finalizado') as string || undefined,
      protesis: formData.get('protesis') as Patient['protesis'],
      protesis_tipo: formData.get('protesis_tipo') as Patient['protesis_tipo'] || undefined,
      protesis_nocturno: formData.get('protesis_nocturno') as Patient['protesis_nocturno'] || undefined,
      sensibilidad: formData.get('sensibilidad') as Patient['sensibilidad'],
      bruxismo: formData.get('bruxismo') as Patient['bruxismo'],
      tipo_bruxismo: formData.get('tipo_bruxismo') as string || undefined,
      ultima_limpieza: formData.get('ultima_limpieza') as string || undefined,
      f_cepillado: formData.get('f_cepillado') ? parseInt(formData.get('f_cepillado') as string) : undefined,
      tipocepillo: formData.get('tipocepillo') as string || undefined,
      pastadental: formData.get('pastadental') as string || undefined,
      cambio_cepillo: formData.get('cambio_cepillo') as Patient['cambio_cepillo'],
      hilo_dental: formData.get('hilo_dental') as Patient['hilo_dental'],
      enjuague_bucal: formData.get('enjuague_bucal') as Patient['enjuague_bucal'],
      necesita_ortodoncia: formData.get('necesita_ortodoncia') as Patient['necesita_ortodoncia'],
      detalles_ortodoncia: formData.get('detalles_ortodoncia') as string || undefined,
      relacion_molar: formData.get('relacion_molar') as Patient['relacion_molar'] || undefined,
      relacion_canina: formData.get('relacion_canina') as Patient['relacion_canina'] || undefined,
      tipo_mordida: formData.get('tipo_mordida') as Patient['tipo_mordida'] || undefined,
      apiñamiento: formData.get('apiñamiento') as Patient['apiñamiento'] || undefined,
      espacios: formData.get('espacios') as Patient['espacios'] || undefined,
      lineamedia: formData.get('lineamedia') as Patient['lineamedia'] || undefined,
      diagnostico: formData.get('diagnostico') as string || undefined,
      tipo_aparatologia: formData.get('tipo_aparatologia') as Patient['tipo_aparatologia'] || undefined,
      otro_aparatologia: formData.get('otro_aparatologia') as string || undefined,
      tratamiento: formData.get('tratamiento') as string || undefined,
      documentos: [], // TODO: Handle file uploads
      observaciones_plan: formData.get('observaciones_plan') as string || undefined,
    };

    // Only update signature if it's a new one or if we have an existing URL
    if (signatureUrl && (signatureUrl.startsWith('http') || signatureUrl.startsWith('data:image'))) {
      patientData.firma_digital = signatureUrl;
    }
    
    const updatedPatient = await updatePatientServer(patientId, patientData);
    
    // Redirect to success page or dashboard
    redirect('/dashboard?success=Paciente actualizado exitosamente');
    
  } catch (error) {
    console.error('Error updating patient:', error);
    throw error;
  }
}

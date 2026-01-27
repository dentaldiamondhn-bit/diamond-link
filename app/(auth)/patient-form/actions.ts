'use server';

import { PatientService } from '../../../services/patientService';
import { StorageService } from '../../../services/storageService';
import { NotificationService } from '../../../services/notificationService';
import { Patient } from '../../../types/patient';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

export async function createPatient(formData: FormData) {
  console.log('=== CREATE PATIENT ACTION CALLED ===');
  console.log('Form data keys:', Array.from(formData.keys()));
  
  // Log all form data values for debugging
  console.log('=== ALL FORM DATA ===');
  for (const [key, value] of formData.entries()) {
    console.log(`${key}:`, value);
  }
  
  try {
    // Handle signature upload if present
    let signatureUrl = null;
    const signatureData = formData.get('firma_digital') as string;
    
    console.log('=== SIGNATURE DATA DEBUG ===');
    console.log('Signature data from formData:', signatureData);
    console.log('Signature data type:', typeof signatureData);
    console.log('Signature data exists:', !!signatureData);
    console.log('Signature data length:', signatureData?.length || 0);
    console.log('Signature starts with data:image:', signatureData?.startsWith('data:image'));
    
    if (signatureData) {
      console.log('First 100 chars of signature data:', signatureData.substring(0, 100));
    } else {
      console.log('Signature data is null or empty');
    }
    console.log('Signature data type:', typeof signatureData);
    
    if (signatureData) {
      console.log('First 100 chars:', signatureData.substring(0, 100));
    }
    
    // Handle document uploads - will be processed after patient creation
    let documentUrls: string[] = [];
    const documentFiles = formData.getAll('documentos') as any[];
    
    console.log('Document files received:', documentFiles.length);
    
    // Create patient first to get ID for file uploads
    const tempPatientData: Omit<Patient, 'paciente_id'> = {
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
        contacto_emergencia: formData.get('contacto_emergencia') as string,
        contacto_telefono: formData.get('contacto_telefono') as string,
        codigopaisemergencia: formData.get('codigopaisemergencia') as string || undefined,
        medico_cabecera: formData.get('medico_cabecera') as string || undefined,
        doctor: formData.get('doctor') as Patient['doctor'],
        otro_doctor: formData.get('otro_doctor') as string || undefined,
        fecha_inicio: formData.get('fecha_inicio') as string,
        seguro: formData.get('seguro') as Patient['seguro'],
        otro_seguro: formData.get('otro_seguro') as string || undefined,
        poliza: formData.get('poliza') as string || undefined,
        contacto: formData.get('contacto') as string || undefined,
        enfermedades: formData.get('enfermedades') as string,
        alergias: formData.get('alergias') as string,
        medicamentos: formData.get('medicamentos') as string,
        hospitalizaciones: formData.get('hospitalizaciones') as string,
        cirugias: formData.get('cirugias') as string,
        embarazo: formData.get('embarazo') as Patient['embarazo'] || undefined,
        semanas_embarazo: formData.get('semanas_embarazo') ? parseInt(formData.get('semanas_embarazo') as string) : undefined,
        medicamentos_embarazo: formData.get('medicamentos_embarazo') as string || undefined,
        antecedentes_familiares: formData.get('antecedentes_familiares') as string,
        vacunas: formData.get('vacunas') as string || undefined,
        observaciones_medicas: formData.get('observaciones_medicas') as string || undefined,
        fuma: formData.get('fuma') as Patient['fuma'],
        fuma_cantidad: formData.get('fuma_cantidad') ? parseInt(formData.get('fuma_cantidad') as string) : undefined,
        fuma_frecuencia: formData.get('fuma_frecuencia') as Patient['fuma_frecuencia'] || undefined,
        alcohol: formData.get('alcohol') as Patient['alcohol'],
        alcohol_frecuencia: formData.get('alcohol_frecuencia') as Patient['alcohol_frecuencia'] || undefined,
        drogas: formData.get('drogas') as Patient['drogas'],
        tipo_droga: formData.get('tipo_droga') as string || undefined,
        drogas_frecuencia: formData.get('drogas_frecuencia') as Patient['drogas_frecuencia'] || undefined,
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
        tipo_sensibilidad: formData.get('tipo_sensibilidad') as Patient['tipo_sensibilidad'] || undefined,
        bruxismo: formData.get('bruxismo') as Patient['bruxismo'],
        tipo_bruxismo: formData.get('tipo_bruxismo') as Patient['tipo_bruxismo'] || undefined,
        ultima_limpieza: formData.get('ultima_limpieza') as string || undefined,
        f_cepillado: parseInt(formData.get('f_cepillado') as string),
        tipocepillo: formData.get('tipocepillo') as string || undefined,
        pastadental: formData.get('pastadental') as string,
        cambio_cepillo: formData.get('cambio_cepillo') as string,
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
        documentos: [], // Will be updated after file uploads
        observaciones_plan: formData.get('observaciones_plan') as string || undefined,
        firma_digital: '', // Will be updated with URL after upload
      };

      // Calculate pregnancy status if applicable
      if (tempPatientData.embarazo === 'si' && tempPatientData.fecha_inicio && tempPatientData.semanas_embarazo) {
        // Import the pregnancy utils function
        const { updatePregnancyStatus } = await import('../../../utils/pregnancyUtils');
        const updatedPatientData = updatePregnancyStatus(tempPatientData);
        Object.assign(tempPatientData, updatedPatientData);
        console.log('Pregnancy status calculated:', {
          embarazo_fecha_fin: updatedPatientData.embarazo_fecha_fin,
          embarazo_activo: updatedPatientData.embarazo_activo
        });
      }

      // Create patient first to get ID for file uploads
      console.log('Patient data before database insert:', tempPatientData);
      console.log('Doctor field value:', tempPatientData.doctor);
      console.log('Otro doctor field value:', tempPatientData.otro_doctor);
      
      const patient = await PatientService.createPatient(tempPatientData);
      
      // Upload documents with patient ID
      // Only process document upload if files are actually provided
      if (documentFiles.length > 0 && documentFiles[0] && documentFiles[0].name && documentFiles[0].size > 0) {
        console.log('=== DOCUMENT UPLOAD DEBUG ===');
        console.log('Document files to upload:', documentFiles.length);
        documentFiles.forEach((file, index) => {
          console.log(`File ${index}:`, {
            name: file.name,
            type: file.type,
            size: file.size
          });
        });
        
        try {
          documentUrls = await StorageService.uploadDocuments(documentFiles, patient.paciente_id);
          console.log('=== UPLOAD RESULT ===');
          console.log('Documents uploaded successfully:', documentUrls);
          console.log('Document URLs count:', documentUrls.length);
          console.log('Document URLs type:', typeof documentUrls);
          console.log('Document URLs isArray:', Array.isArray(documentUrls));
          
          // Update patient with document URLs
          console.log('=== DATABASE UPDATE ===');
          console.log('Calling updatePatient with documentos:', documentUrls);
          await PatientService.updatePatient(patient.paciente_id!, { documentos: documentUrls });
          console.log('=== DATABASE UPDATE COMPLETE ===');
        } catch (docError) {
          console.error('Error uploading documents:', docError);
          console.log('Continuing without document upload...');
          // Continue without documents - don't block form submission
        }
      } else {
        console.log('No documents to upload - skipping document upload process');
      }
      
      // Upload signature with patient ID
      if (signatureData && signatureData.startsWith('data:image')) {
        console.log('=== SIGNATURE UPLOAD START ===');
        console.log('Uploading signature for patient:', patient.paciente_id);
        console.log('Signature data type:', typeof signatureData);
        console.log('Signature data length:', signatureData.length);
        console.log('Signature starts with data:image:', signatureData.startsWith('data:image'));
        console.log('First 100 chars of signature data:', signatureData.substring(0, 100));
        
        try {
          signatureUrl = await StorageService.uploadSignature(
            signatureData, 
            patient.paciente_id
          );
          
          console.log('Signature upload result:', signatureUrl);
          
          // Update patient with signature URL
          if (signatureUrl) {
            console.log('Updating patient with signature URL:', signatureUrl);
            try {
              const updatedPatient = await PatientService.updatePatient(patient.paciente_id, {
                firma_digital: signatureUrl
              });
              console.log('Patient updated successfully with signature:', updatedPatient);
              console.log('Updated signature field:', updatedPatient.firma_digital);
            } catch (updateError) {
              console.error('Error updating patient with signature:', updateError);
            }
          } else {
            console.log('No signature URL returned from upload');
          }
        } catch (uploadError) {
          console.error('Error uploading signature:', uploadError);
        }
      } else {
        console.log('=== SIGNATURE UPLOAD SKIPPED ===');
        console.log('Signature data exists:', !!signatureData);
        console.log('Signature data starts with data:image:', signatureData?.startsWith('data:image'));
        if (!signatureData) {
          console.log('Signature data is null or empty');
        } else if (!signatureData.startsWith('data:image')) {
          console.log('Signature data does not start with data:image, first 50 chars:', signatureData.substring(0, 50));
        }
      }
      
      // Redirect to menu-navegacion with patient context
      const pacienteId = patient.paciente_id;
      redirect(`/menu-navegacion?id=${encodeURIComponent(pacienteId)}`);
    } catch (error) {
      console.error('Error creating patient:', error);
      console.error('Error details:', {
        message: error.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });
      // You might want to redirect to an error page or handle the error differently
      throw error;
    }
}

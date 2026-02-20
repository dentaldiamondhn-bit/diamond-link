import { supabase } from '@/lib/supabase';

export interface OrthodonticHistory {
  id: string;
  paciente_id: string;
  doctor_id: string;
  nombre_completo: string;
  edad?: number;
  fecha_nacimiento?: string;
  sexo?: string;
  motivo_consulta_ortodoncia?: string;
  diagnostico_ortodoncia?: string;
  plan_tratamiento_ortodoncia?: string;
  tipo_mordida?: string;
  tipo_aparato?: string;
  duracion_tratamiento?: string;
  fecha_inicio_tratamiento?: string;
  fecha_fin_tratamiento?: string;
  observaciones_ortodoncia?: string;
  radiografias_realizadas?: string;
  modelos_estudio?: string;
  analisis_cefalometrico?: string;
  extracciones_realizadas?: string;
  retenedor_tipo?: string;
  retenedor_uso?: string;
  seguimiento_post_tratamiento?: string;
  documentos_ortodoncia?: string[];
  firma_digital_ortodoncia?: string;
  created_at?: string;
  updated_at?: string;
}

export class OrthodonticHistoryService {
  static async getOrthodonticHistory(patientId: string): Promise<OrthodonticHistory | null> {
    try {
      const { data, error } = await supabase
        .from('historia_clinica_ortodoncia')
        .select('*')
        .eq('paciente_id', patientId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching orthodontic history:', error);
        throw new Error(`Error al obtener historia clínica ortodóncica: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error fetching orthodontic history:', error);
      throw new Error(`Error al obtener historia clínica ortodóncica: ${error.message}`);
    }
  }

  static async updateOrthodonticHistoryDocuments(patientId: string, documentos: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('historia_clinica_ortodoncia')
        .update({ documentos_ortodoncia: documentos })
        .eq('paciente_id', patientId);

      if (error) {
        console.error('Error updating orthodontic documents:', error);
        throw new Error(`Error al actualizar documentos ortodóncicos: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating orthodontic documents:', error);
      throw new Error(`Error al actualizar documentos ortodóncicos: ${error.message}`);
    }
  }

  static async updateOrthodonticHistorySignature(patientId: string, signature: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('historia_clinica_ortodoncia')
        .update({ firma_digital_ortodoncia: signature })
        .eq('paciente_id', patientId);

      if (error) {
        console.error('Error updating orthodontic signature:', error);
        throw new Error(`Error al actualizar firma ortodóncica: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating orthodontic signature:', error);
      throw new Error(`Error al actualizar firma ortodóncica: ${error.message}`);
    }
  }

  static async deleteOrthodonticHistory(patientId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('historia_clinica_ortodoncia')
        .delete()
        .eq('paciente_id', patientId);

      if (error) {
        console.error('Error deleting orthodontic history:', error);
        throw new Error(`Error al eliminar historia clínica ortodóncica: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting orthodontic history:', error);
      throw new Error(`Error al eliminar historia clínica ortodóncica: ${error.message}`);
    }
  }

  // Server-side methods using admin client
  static async createOrthodonticHistory(formData: any): Promise<{ success: boolean; data: any }> {
    'use server';
    
    // Import admin client only for server operations
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin');
    
    try {
      // Extract form data
      const {
        paciente_id,
        doctor_id,
        nombre_completo,
        edad,
        fecha_nacimiento,
        sexo,
        motivo_consulta_ortodoncia,
        diagnostico_ortodoncia,
        plan_tratamiento_ortodoncia,
        tipo_mordida,
        tipo_aparato,
        duracion_tratamiento,
        fecha_inicio_tratamiento,
        fecha_fin_tratamiento,
        observaciones_ortodoncia,
        radiografias_realizadas,
        modelos_estudio,
        analisis_cefalometrico,
        extracciones_realizadas,
        retenedor_tipo,
        retenedor_uso,
        seguimiento_post_tratamiento,
        documentos_ortodoncia,
        firma_digital_ortodoncia,
      } = formData;

      // Prepare data for insertion
      const orthodonticData = {
        paciente_id,
        doctor_id,
        nombre_completo,
        edad: edad ? parseInt(edad) : null,
        fecha_nacimiento,
        sexo,
        motivo_consulta_ortodoncia: motivo_consulta_ortodoncia || null,
        diagnostico_ortodoncia: diagnostico_ortodoncia || null,
        plan_tratamiento_ortodoncia: plan_tratamiento_ortodoncia || null,
        tipo_mordida: tipo_mordida || null,
        tipo_aparato: tipo_aparato || null,
        duracion_tratamiento: duracion_tratamiento || null,
        fecha_inicio_tratamiento: fecha_inicio_tratamiento || null,
        fecha_fin_tratamiento: fecha_fin_tratamiento || null,
        observaciones_ortodoncia: observaciones_ortodoncia || null,
        radiografias_realizadas: radiografias_realizadas || null,
        modelos_estudio: modelos_estudio || null,
        analisis_cefalometrico: analisis_cefalometrico || null,
        extracciones_realizadas: extracciones_realizadas || null,
        retenedor_tipo: retenedor_tipo || null,
        retenedor_uso: retenedor_uso || null,
        seguimiento_post_tratamiento: seguimiento_post_tratamiento || null,
        documentos_ortodoncia: documentos_ortodoncia || null,
        firma_digital_ortodoncia: firma_digital_ortodoncia || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Insert orthodontic history
      const { data, error } = await supabaseAdmin
        .from('historia_clinica_ortodoncia')
        .insert([orthodonticData])
        .select();

      if (error) {
        console.error('Error inserting orthodontic history:', error);
        throw new Error(`Error al crear historia clínica ortodóncica: ${error.message}`);
      }

      console.log('Orthodontic history created successfully:', data);
      
      return { success: true, data: data[0] };

    } catch (error) {
      console.error('Error in createOrthodonticHistory:', error);
      throw new Error(`Error al crear historia clínica ortodóncica: ${error.message}`);
    }
  }

  static async updateOrthodonticHistory(patientId: string, formData: any): Promise<{ success: boolean; data: any }> {
    'use server';
    
    // Import admin client only for server operations
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin');
    
    try {
      // Extract form data
      const {
        doctor_id,
        nombre_completo,
        edad,
        fecha_nacimiento,
        sexo,
        motivo_consulta_ortodoncia,
        diagnostico_ortodoncia,
        plan_tratamiento_ortodoncia,
        tipo_mordida,
        tipo_aparato,
        duracion_tratamiento,
        fecha_inicio_tratamiento,
        fecha_fin_tratamiento,
        observaciones_ortodoncia,
        radiografias_realizadas,
        modelos_estudio,
        analisis_cefalometrico,
        extracciones_realizadas,
        retenedor_tipo,
        retenedor_uso,
        seguimiento_post_tratamiento,
        documentos_ortodoncia,
        firma_digital_ortodoncia,
      } = formData;

      // Prepare data for update
      const orthodonticData = {
        doctor_id,
        nombre_completo,
        edad: edad ? parseInt(edad) : null,
        fecha_nacimiento,
        sexo,
        motivo_consulta_ortodoncia: motivo_consulta_ortodoncia || null,
        diagnostico_ortodoncia: diagnostico_ortodoncia || null,
        plan_tratamiento_ortodoncia: plan_tratamiento_ortodoncia || null,
        tipo_mordida: tipo_mordida || null,
        tipo_aparato: tipo_aparato || null,
        duracion_tratamiento: duracion_tratamiento || null,
        fecha_inicio_tratamiento: fecha_inicio_tratamiento || null,
        fecha_fin_tratamiento: fecha_fin_tratamiento || null,
        observaciones_ortodoncia: observaciones_ortodoncia || null,
        radiografias_realizadas: radiografias_realizadas || null,
        modelos_estudio: modelos_estudio || null,
        analisis_cefalometrico: analisis_cefalometrico || null,
        extracciones_realizadas: extracciones_realizadas || null,
        retenedor_tipo: retenedor_tipo || null,
        retenedor_uso: retenedor_uso || null,
        seguimiento_post_tratamiento: seguimiento_post_tratamiento || null,
        documentos_ortodoncia: documentos_ortodoncia || null,
        firma_digital_ortodoncia: firma_digital_ortodoncia || null,
        updated_at: new Date().toISOString(),
      };

      // Update orthodontic history
      const { data, error } = await supabaseAdmin
        .from('historia_clinica_ortodoncia')
        .update(orthodonticData)
        .eq('paciente_id', patientId)
        .select();

      if (error) {
        console.error('Error updating orthodontic history:', error);
        throw new Error(`Error al actualizar historia clínica ortodóncica: ${error.message}`);
      }

      console.log('Orthodontic history updated successfully:', data);
      
      return { success: true, data: data[0] };

    } catch (error) {
      console.error('Error in updateOrthodonticHistory:', error);
      throw new Error(`Error al actualizar historia clínica ortodóncica: ${error.message}`);
    }
  }
}

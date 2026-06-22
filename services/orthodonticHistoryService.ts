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
  retenedor_inferior_tipo?: string;
  retenedor_inferior_uso?: string;
  seguimiento_post_tratamiento?: string;
  documentos_ortodoncia?: string[];
  firma_digital_ortodoncia?: string;
  created_at?: string;
  updated_at?: string;
}

export class OrthodonticHistoryService {
  static async getOrthodonticHistoryByPatientId(patientId: string): Promise<OrthodonticHistory | null> {
    try {
      const { data, error } = await supabase
        .from('historia_clinica_ortodoncia')
        .select('*')
        .eq('paciente_id', patientId)
        .single();

      // Handle case where no record exists (this is normal for checking)
      if (error && error.code === 'PGRST116') {
        return null; // No record found is expected when checking
      }

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching orthodontic history:', error);
        throw new Error(`Error al obtener historia clínica ortodóncica: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error fetching orthodontic history:', error);
      throw new Error(`Error al obtener historia clínica ortodóncica: ${error.message}`);
    }
  }

  static async getOrthodonticHistory(patientId: string): Promise<OrthodonticHistory | null> {
    try {
      const { data, error } = await supabase
        .from('historia_clinica_ortodoncia')
        .select('*')
        .eq('paciente_id', patientId)
        .single();

      // Handle case where no record exists (this is normal for checking)
      if (error && error.code === 'PGRST116') {
        return null; // No record found is expected when checking
      }

      if (error && error.code !== 'PGRST116') {
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
      // Use dynamic import to avoid bundling supabaseAdmin in client code if this is ever called from client
      const { supabaseAdmin } = await import('@/lib/supabaseAdmin');
      
      console.log('=== Updating orthodontic documents ===');
      
      const { error } = await supabaseAdmin
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
}

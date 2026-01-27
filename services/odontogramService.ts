import { supabase } from '../lib/supabase';
import { Odontogram, OdontogramData, OdontogramHistory, PacienteResumido } from '../types/odontogram';

export class OdontogramService {
  // Crear un nuevo odontograma para un paciente
  static async createOdontogram(pacienteId: string, datosOdontograma: OdontogramData, notas?: string, creadoPor?: string): Promise<Odontogram> {
    try {
      // Obtener la siguiente versión para este paciente
      const { data: versionData, error: versionError } = await supabase
        .rpc('get_next_odontogram_version', { paciente_id_param: pacienteId });

      if (versionError) {
        console.error('Error getting next version:', versionError);
        throw versionError;
      }

      const nextVersion = versionData;

      const odontogramData = {
        paciente_id: pacienteId,
        version: nextVersion,
        datos_odontograma: datosOdontograma,
        notas,
        creado_por: creadoPor,
        activo: true
      };

      const { data, error } = await supabase
        .from('odontograms')
        .insert([odontogramData])
        .select()
        .single();

      if (error) {
        console.error('Error creating odontogram:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error creating odontogram:', error);
      throw error;
    }
  }

  // Obtener el odontograma activo de un paciente
  static async getActiveOdontogram(pacienteId: string): Promise<Odontogram | null> {
    try {
      const { data, error } = await supabase
        .from('odontograms')
        .select('*')
        .eq('paciente_id', pacienteId)
        .eq('activo', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching active odontogram:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching active odontogram:', error);
      throw error;
    }
  }

  // Obtener todo el historial de odontogramas de un paciente
  static async getOdontogramHistory(pacienteId: string): Promise<OdontogramHistory[]> {
    try {
      const { data, error } = await supabase
        .from('odontograms')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('version', { ascending: false });

      if (error) {
        console.error('Error fetching odontogram history:', error);
        throw error;
      }

      const history: OdontogramHistory[] = data.map((odontogram, index) => ({
        odontograma: odontogram,
        es_version_actual: index === 0 && odontogram.activo
      }));

      return history;
    } catch (error) {
      console.error('Unexpected error fetching odontogram history:', error);
      throw error;
    }
  }

  // Obtener un odontograma específico por ID
  static async getOdontogramById(odontogramId: string): Promise<Odontogram | null> {
    try {
      const { data, error } = await supabase
        .from('odontograms')
        .select('*')
        .eq('id', odontogramId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching odontogram by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching odontogram by ID:', error);
      throw error;
    }
  }

  // Obtener un odontograma por paciente y versión
  static async getOdontogramByVersion(pacienteId: string, version: number): Promise<Odontogram | null> {
    try {
      const { data, error } = await supabase
        .from('odontograms')
        .select('*')
        .eq('paciente_id', pacienteId)
        .eq('version', version)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching odontogram by version:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching odontogram by version:', error);
      throw error;
    }
  }

  // Actualizar un odontograma existente
  static async updateOdontogram(odontogramId: string, datosOdontograma: OdontogramData, notas?: string): Promise<Odontogram> {
    try {
      const updateData = {
        datos_odontograma: datosOdontograma,
        notas,
        fecha_actualizacion: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('odontograms')
        .update(updateData)
        .eq('id', odontogramId)
        .select()
        .single();

      if (error) {
        console.error('Error updating odontogram:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error updating odontogram:', error);
      throw error;
    }
  }

  // Crear una nueva versión del odontograma (preservando el historial)
  static async createNewVersion(pacienteId: string, datosOdontograma: OdontogramData, notas?: string, creadoPor?: string): Promise<Odontogram> {
    try {
      // Desactivar la versión actual
      const { error: deactivateError } = await supabase
        .from('odontograms')
        .update({ activo: false })
        .eq('paciente_id', pacienteId)
        .eq('activo', true);

      if (deactivateError) {
        console.error('Error deactivating previous version:', deactivateError);
        throw deactivateError;
      }

      // Crear nueva versión
      return await this.createOdontogram(pacienteId, datosOdontograma, notas, creadoPor);
    } catch (error) {
      console.error('Unexpected error creating new version:', error);
      throw error;
    }
  }

  // Eliminar un odontograma (soft delete)
  static async deleteOdontogram(odontogramId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('odontograms')
        .update({ activo: false })
        .eq('id', odontogramId);

      if (error) {
        console.error('Error deleting odontogram:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error deleting odontogram:', error);
      throw error;
    }
  }

  // Obtener información resumida del paciente para navegación
  static async getPatientSummary(pacienteId: string): Promise<PacienteResumido | null> {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('paciente_id, nombre_completo, numero_identidad')
        .eq('paciente_id', pacienteId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching patient summary:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching patient summary:', error);
      throw error;
    }
  }

  // Buscar odontogramas por criterios
  static async searchOdontograms(searchTerm: string): Promise<Odontogram[]> {
    try {
      const { data, error } = await supabase
        .from('odontograms')
        .select(`
          *,
          patients!inner(
            paciente_id,
            nombre_completo,
            numero_identidad
          )
        `)
        .or(`patients.nombre_completo.ilike.%${searchTerm}%,patients.numero_identidad.ilike.%${searchTerm}%`)
        .order('fecha_actualizacion', { ascending: false });

      if (error) {
        console.error('Error searching odontograms:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error searching odontograms:', error);
      throw error;
    }
  }

  // ========================================
  // Get All Operations
  // ========================================

  static async getAllOdontograms(): Promise<Odontogram[]> {
    try {
      const { data, error } = await supabase
        .from('odontograms')
        .select('*');

      if (error) {
        console.error('Error fetching all odontograms:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching all odontograms:', error);
      throw error;
    }
  }
}

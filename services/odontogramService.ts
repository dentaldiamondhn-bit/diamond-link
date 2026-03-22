import { supabase } from '../lib/supabase';
import { Odontogram, OdontogramData, OdontogramHistory, PacienteResumido } from '../types/odontogram';

export class OdontogramService {
  // Crear un nuevo odontograma para un paciente
  static async createOdontogram(pacienteId: string, datosOdontograma: OdontogramData, notas?: string, creadoPor?: string): Promise<Odontogram> {
    try {
      // Try to get the next version using RPC first
      let nextVersion = 1;
      
      try {
        const { data: versionData, error: versionError } = await supabase
          .rpc('get_next_odontogram_version', { paciente_id_param: pacienteId });

        if (!versionError && versionData) {
          nextVersion = versionData;
        } else {
          // Fallback: Get max version manually
          const { data: existingVersions } = await supabase
            .from('odontograms')
            .select('version')
            .eq('paciente_id', pacienteId)
            .order('version', { ascending: false })
            .limit(1);
          
          if (existingVersions && existingVersions.length > 0) {
            nextVersion = existingVersions[0].version + 1;
          }
        }
      } catch (error) {
        console.warn('Could not get next version, using default:', error);
      }

      const odontogramData = {
        paciente_id: pacienteId,
        version: nextVersion,
        datos_odontograma: datosOdontograma,
        notas,
        creado_por: creadoPor,
        activo: true,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
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
        .limit(1);

      if (error) {
        console.error('Error fetching active odontogram:', error);
        // Don't throw error for no results, just return null
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      // Return single result or null
      return data && data.length > 0 ? data[0] : null;
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
        .update({ activo: false, fecha_actualizacion: new Date().toISOString() })
        .eq('paciente_id', pacienteId)
        .eq('activo', true);

      if (deactivateError) {
        console.error('Error deactivating previous version:', deactivateError);
        // Don't throw error, continue with creation
        console.warn('Continuing with new version creation despite deactivation error');
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
        .select('*')
        .order('fecha_creacion', { ascending: false });

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

  static async getPatientOdontogramStatistics(pacienteId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('odontograms')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('version', { ascending: false });

      if (error) {
        console.error('Error fetching odontogram statistics:', error);
        throw error;
      }

      const odontograms = data || [];
      
      // Calculate statistics
      const totalVersions = odontograms.length;
      const latestVersion = odontograms.length > 0 ? odontograms[0] : null;
      
      // Calculate tooth status counts from the latest active odontogram
      const statusCounts: Record<string, number> = {};

      if (latestVersion && latestVersion.datos_odontograma?.dientes) {
        Object.values(latestVersion.datos_odontograma.dientes).forEach((diente: any) => {
          const estado = diente.estado;
          if (estado) {
            // Initialize count if this status hasn't been seen before
            if (!statusCounts[estado]) {
              statusCounts[estado] = 0;
            }
            statusCounts[estado]++;
          }
        });
      }

      return {
        total_versions: totalVersions,
        latest_version: latestVersion ? {
          version: latestVersion.version,
          fecha_creacion: latestVersion.fecha_creacion
        } : null,
        status_counts: statusCounts
      };
    } catch (error) {
      console.error('Unexpected error fetching odontogram statistics:', error);
      throw error;
    }
  }
}

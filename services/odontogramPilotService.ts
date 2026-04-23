import { supabase } from '../lib/supabase';

// Pilot-specific types for quadrant-based odontogram
export interface CuadranteDientes {
  mesial: string;
  distal: string;
  buccal: string;
  lingual: string;
}

export interface DientePilotData {
  cuadrantes: CuadranteDientes;
  central?: string;
  nota?: string;
}

export interface OdontogramPilotData {
  tipo: 'adulto' | 'nino';
  dientes: Record<number, DientePilotData>;
  fecha: string;
}

export interface OdontogramPilot {
  id?: string;
  paciente_id: string;
  version: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
  creado_por?: string;
  notas?: string;
  datos_odontograma: OdontogramPilotData;
  activo: boolean;
}

export interface OdontogramPilotHistory {
  odontograma: OdontogramPilot;
  es_version_actual: boolean;
}

export class OdontogramPilotService {
  // Create a new pilot odontogram for a patient
  static async createOdontogram(
    pacienteId: string,
    datosOdontograma: OdontogramPilotData,
    notas?: string,
    creadoPor?: string
  ): Promise<OdontogramPilot> {
    try {
      let nextVersion = 1;

      try {
        const { data: versionData, error: versionError } = await supabase
          .rpc('get_next_odontogram_pilot_version', { paciente_id_param: pacienteId });

        if (!versionError && versionData) {
          nextVersion = versionData;
        } else {
          const { data: existingVersions } = await supabase
            .from('odontogram_pilots')
            .select('version')
            .eq('paciente_id', pacienteId)
            .order('version', { ascending: false })
            .limit(1);

          if (existingVersions && existingVersions.length > 0) {
            nextVersion = existingVersions[0].version + 1;
          }
        }
      } catch (error) {
        console.warn('Could not get next pilot version, using default:', error);
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
        .from('odontogram_pilots')
        .insert([odontogramData])
        .select()
        .single();

      if (error) {
        console.error('Error creating pilot odontogram:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error creating pilot odontogram:', error);
      throw error;
    }
  }

  // Get active pilot odontogram for patient
  static async getActiveOdontogram(pacienteId: string): Promise<OdontogramPilot | null> {
    try {
      const { data, error } = await supabase
        .from('odontogram_pilots')
        .select('*')
        .eq('paciente_id', pacienteId)
        .eq('activo', true)
        .order('version', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching active pilot odontogram:', error);
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Unexpected error fetching active pilot odontogram:', error);
      throw error;
    }
  }

  // Get all versions history for a patient
  static async getOdontogramHistory(pacienteId: string): Promise<OdontogramPilotHistory[]> {
    try {
      const { data, error } = await supabase
        .from('odontogram_pilots')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('version', { ascending: false });

      if (error) {
        console.error('Error fetching pilot odontogram history:', error);
        throw error;
      }

      const history: OdontogramPilotHistory[] = data.map((odontogram, index) => ({
        odontograma: odontogram,
        es_version_actual: index === 0 && odontogram.activo
      }));

      return history;
    } catch (error) {
      console.error('Unexpected error fetching pilot odontogram history:', error);
      throw error;
    }
  }

  // Get specific pilot odontogram by ID
  static async getOdontogramById(odontogramId: string): Promise<OdontogramPilot | null> {
    try {
      const { data, error } = await supabase
        .from('odontogram_pilots')
        .select('*')
        .eq('id', odontogramId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching pilot odontogram by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching pilot odontogram by ID:', error);
      throw error;
    }
  }

  // Get specific version for patient
  static async getOdontogramByVersion(pacienteId: string, version: number): Promise<OdontogramPilot | null> {
    try {
      const { data, error } = await supabase
        .from('odontogram_pilots')
        .select('*')
        .eq('paciente_id', pacienteId)
        .eq('version', version)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching pilot odontogram by version:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching pilot odontogram by version:', error);
      throw error;
    }
  }

  // Update existing pilot odontogram
  static async updateOdontogram(
    odontogramId: string,
    datosOdontograma: OdontogramPilotData,
    notas?: string
  ): Promise<OdontogramPilot> {
    try {
      const updateData = {
        datos_odontograma: datosOdontograma,
        notas,
        fecha_actualizacion: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('odontogram_pilots')
        .update(updateData)
        .eq('id', odontogramId)
        .select()
        .single();

      if (error) {
        console.error('Error updating pilot odontogram:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error updating pilot odontogram:', error);
      throw error;
    }
  }

  // Create new version (deactivate old, create new)
  static async createNewVersion(
    pacienteId: string,
    datosOdontograma: OdontogramPilotData,
    notas?: string,
    creadoPor?: string
  ): Promise<OdontogramPilot> {
    try {
      // Deactivate current active version
      const { error: deactivateError } = await supabase
        .from('odontogram_pilots')
        .update({ activo: false, fecha_actualizacion: new Date().toISOString() })
        .eq('paciente_id', pacienteId)
        .eq('activo', true);

      if (deactivateError) {
        console.error('Error deactivating previous pilot version:', deactivateError);
        console.warn('Continuing with new version creation despite deactivation error');
      }

      // Create new version
      return await this.createOdontogram(pacienteId, datosOdontograma, notas, creadoPor);
    } catch (error) {
      console.error('Unexpected error creating new pilot version:', error);
      throw error;
    }
  }

  // Soft delete
  static async deleteOdontogram(odontogramId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('odontogram_pilots')
        .update({ activo: false })
        .eq('id', odontogramId);

      if (error) {
        console.error('Error deleting pilot odontogram:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error deleting pilot odontogram:', error);
      throw error;
    }
  }
}

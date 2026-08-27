import { supabase } from '../lib/supabase';

// O'Leary-specific types
export interface CuadranteOleary {
  mesial: 'sano' | 'placa' | 'ausente';
  distal: 'sano' | 'placa' | 'ausente';
  buccal: 'sano' | 'placa' | 'ausente';
  lingual: 'sano' | 'placa' | 'ausente';
}

export interface DienteOlearyData {
  cuadrantes: CuadranteOleary;
  nota?: string;
}

export interface OlearyData {
  tipo: 'oleary_adulto';
  dientes: Record<number, DienteOlearyData>;
  fecha: string;
}

export interface Oleary {
  id?: string;
  paciente_id: string;
  version: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
  creado_por?: string;
  notas?: string;
  datos_odontograma: OlearyData;
  activo: boolean;
}

export interface OlearyHistory {
  oleary: Oleary;
  es_version_actual: boolean;
}

export class OlearyService {
  // Helper function to create O'Leary tooth data
  static crearDienteOlearyData(): DienteOlearyData {
    return {
      cuadrantes: {
        mesial: 'sano',
        distal: 'sano',
        buccal: 'sano',
        lingual: 'sano'
      }
    };
  }

  // Create a new O'Leary odontogram for a patient
  static async createOdontogram(
    pacienteId: string,
    datosOdontograma: OlearyData,
    notas?: string,
    creadoPor?: string
  ): Promise<Oleary> {
    try {
      let nextVersion = 1;

      // Get the highest version number for this patient
      const { data: existingOdontograms } = await supabase
        .from('o_leary')
        .select('version')
        .eq('paciente_id', pacienteId)
        .order('version', { ascending: false })
        .limit(1);

      if (existingOdontograms && existingOdontograms.length > 0) {
        nextVersion = existingOdontograms[0].version + 1;
      }

      const newOdontogram: Partial<Oleary> = {
        paciente_id: pacienteId,
        version: nextVersion,
        datos_odontograma: datosOdontograma,
        notas,
        creado_por: creadoPor,
        activo: true
      };

      const { data, error } = await supabase
        .from('o_leary')
        .insert(newOdontogram)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating O\'Leary odontogram:', error);
      throw error;
    }
  }

  // Get active O'Leary odontogram for a patient
  static async getActiveOdontogram(pacienteId: string): Promise<Oleary | null> {
    try {
      const { data, error } = await supabase
        .from('o_leary')
        .select('*')
        .eq('paciente_id', pacienteId)
        .eq('activo', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error getting active O\'Leary odontogram:', error);
      return null;
    }
  }

  // Get O'Leary odontogram by ID
  static async getOdontogramById(odontogramId: string): Promise<Oleary | null> {
    try {
      const { data, error } = await supabase
        .from('o_leary')
        .select('*')
        .eq('id', odontogramId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting O\'Leary odontogram by ID:', error);
      return null;
    }
  }

  // Get all O'Leary odontograms for a patient (history)
  static async getOdontogramHistory(pacienteId: string): Promise<OlearyHistory[]> {
    try {
      const { data, error } = await supabase
        .from('o_leary')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('version', { ascending: false });

      if (error) throw error;

      // Mark the highest version as current
      const history: OlearyHistory[] = data.map((odontogram, index) => ({
        oleary: odontogram,
        es_version_actual: index === 0
      }));

      return history;
    } catch (error) {
      console.error('Error getting O\'Leary odontogram history:', error);
      throw error;
    }
  }

  // Update an existing O'Leary odontogram
  static async updateOdontogram(
    id: string,
    datosOdontograma: OlearyData,
    notas?: string
  ): Promise<Oleary> {
    try {
      const updateData: Partial<Oleary> = {
        datos_odontograma: datosOdontograma,
        fecha_actualizacion: new Date().toISOString()
      };

      if (notas !== undefined) {
        updateData.notas = notas;
      }

      const { data, error } = await supabase
        .from('o_leary')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating O\'Leary odontogram:', error);
      throw error;
    }
  }

  // Create a new version of an O'Leary odontogram
  static async createNewVersion(
    pacienteId: string,
    datosOdontograma: OlearyData,
    notas?: string,
    creadoPor?: string
  ): Promise<Oleary> {
    try {
      // Deactivate current active odontogram
      const currentActive = await this.getActiveOdontogram(pacienteId);
      if (currentActive) {
        await supabase
          .from('o_leary')
          .update({ activo: false })
          .eq('id', currentActive.id!);
      }

      // Create new version
      return await this.createOdontogram(pacienteId, datosOdontograma, notas, creadoPor);
    } catch (error) {
      console.error('Error creating new O\'Leary version:', error);
      throw error;
    }
  }

  // Delete an O'Leary odontogram
  static async deleteOdontogram(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('o_leary')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting O\'Leary odontogram:', error);
      throw error;
    }
  }

  // Get plaque index statistics for a patient
  static async getPlaqueIndexStats(pacienteId: string): Promise<{
    totalSurfaces: number;
    plaqueSurfaces: number;
    plaquePercentage: number;
  }> {
    try {
      const activeOdontogram = await this.getActiveOdontogram(pacienteId);
      if (!activeOdontogram) {
        return { totalSurfaces: 0, plaqueSurfaces: 0, plaquePercentage: 0 };
      }

      const teeth = activeOdontogram.datos_odontograma.dientes;
      let totalSurfaces = 0;
      let plaqueSurfaces = 0;

      Object.values(teeth).forEach(diente => {
        Object.values(diente.cuadrantes).forEach(status => {
          // Exclude ausente teeth from plaque index calculations
          if (status !== 'ausente' && typeof status === 'string') {
            totalSurfaces++;
            if (status === 'placa') {
              plaqueSurfaces++;
            }
          }
        });
      });

      const plaquePercentage = totalSurfaces > 0 ? (plaqueSurfaces / totalSurfaces) * 100 : 0;

      return {
        totalSurfaces,
        plaqueSurfaces,
        plaquePercentage
      };
    } catch (error) {
      console.error('Error calculating plaque index stats:', error);
      throw error;
    }
  }
}

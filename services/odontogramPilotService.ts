import { supabase } from '@/lib/supabase';
import { Odontogram, OdontogramData, OdontogramHistory } from '../types/odontogram';

export class OdontogramPilotService {
  static async createOdontogram(pacienteId: string, datosOdontograma: OdontogramData, notas?: string, creadoPor?: string): Promise<Odontogram> {
    try {
      let nextVersion = 1;

      const { data: existingVersions, error: versionError } = await supabase
        .from('odontogram_pilots')
        .select('version')
        .eq('paciente_id', pacienteId)
        .order('version', { ascending: false })
        .limit(1);

      if (!versionError && existingVersions && existingVersions.length > 0) {
        nextVersion = existingVersions[0].version + 1;
      }

      const now = new Date().toISOString();

      // Deactivate any existing active pilot odontograms for this patient
      const { error: deactivateError } = await supabase
        .from('odontogram_pilots')
        .update({ activo: false, fecha_actualizacion: now })
        .eq('paciente_id', pacienteId)
        .eq('activo', true);

      if (deactivateError) {
        console.warn('Could not deactivate existing active pilot odontogram:', deactivateError);
      }

      const { data, error } = await supabase
        .from('odontogram_pilots')
        .insert([{
          paciente_id: pacienteId,
          datos_odontograma: datosOdontograma,
          notas,
          version: nextVersion,
          activo: true,
          creado_por: creadoPor,
          fecha_creacion: now,
          fecha_actualizacion: now
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating odontogram-pilot:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error creating odontogram-pilot:', error);
      throw error;
    }
  }

  static async getActiveOdontogram(pacienteId: string): Promise<Odontogram | null> {
    try {
      const { data, error } = await supabase
        .from('odontogram_pilots')
        .select('*')
        .eq('paciente_id', pacienteId)
        .eq('activo', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching active odontogram-pilot:', error);
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Unexpected error fetching active odontogram-pilot:', error);
      throw error;
    }
  }

  static async getPatientOdontogramStatistics(pacienteId: string): Promise<any> {
    try {
      const { data: odontograms, error } = await supabase
        .from('odontogram_pilots')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('version', { ascending: false });

      if (error) {
        console.error('Error fetching odontogram-pilot statistics:', error);
        throw error;
      }

      const totalVersions = odontograms.length;
      const latestVersion = odontograms.length > 0 ? odontograms[0] : null;

      const statusCounts: Record<string, number> = {};

      const adultToothNumbers = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
        48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
      const childToothNumbers = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65,
        85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

      const getToothState = (diente: any, odontogramType?: string) => {
        if (!diente || typeof diente !== 'object') {
          return 'sano';
        }

        if (diente.estado !== undefined) {
          return diente.estado || 'sano';
        }

        const cuadrantes = diente.cuadrantes;
        const central = diente.central;

        if (cuadrantes && typeof cuadrantes === 'object') {
          const quadrantValues = Object.values(cuadrantes).filter((value) => typeof value === 'string') as string[];
          const firstNonSano = quadrantValues.find((value) => value !== 'sano');

          if (odontogramType === 'oleary_adulto') {
            return firstNonSano || 'sano';
          }

          if (central && typeof central === 'string' && central !== 'sano') {
            return central;
          }

          return firstNonSano || 'sano';
        }

        if (central && typeof central === 'string') {
          return central || 'sano';
        }

        return 'sano';
      };

      const toothKeys = latestVersion?.datos_odontograma?.tipo === 'nino'
        ? childToothNumbers
        : adultToothNumbers;

      if (latestVersion && latestVersion.datos_odontograma?.dientes) {
        toothKeys.forEach((toothNumber) => {
          const key = toothNumber.toString();
          const diente = latestVersion.datos_odontograma.dientes[key];
          const toothState = getToothState(diente, latestVersion.datos_odontograma?.tipo);
          statusCounts[toothState] = (statusCounts[toothState] || 0) + 1;
        });
      } else {
        // If there is no tooth data, count all teeth as sano
        const defaultKeys = latestVersion?.datos_odontograma?.tipo === 'nino' ? childToothNumbers : adultToothNumbers;
        defaultKeys.forEach(() => {
          statusCounts['sano'] = (statusCounts['sano'] || 0) + 1;
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
      console.error('Unexpected error fetching odontogram-pilot statistics:', error);
      throw error;
    }
  }

  static async getOdontogramHistory(pacienteId: string): Promise<OdontogramHistory[]> {
    try {
      const { data, error } = await supabase
        .from('odontogram_pilots')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('version', { ascending: false });

      if (error) {
        console.error('Error fetching odontogram-pilot history:', error);
        throw error;
      }

      return (data || []).map((odontogram: any, index: number) => ({
        odontograma: odontogram,
        es_version_actual: index === 0 && odontogram.activo
      }));
    } catch (error) {
      console.error('Unexpected error fetching odontogram-pilot history:', error);
      throw error;
    }
  }

  static async getOdontogramById(odontogramId: string): Promise<Odontogram | null> {
    try {
      const { data, error } = await supabase
        .from('odontogram_pilots')
        .select('*')
        .eq('id', odontogramId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching odontogram-pilot by ID:', error);
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Unexpected error fetching odontogram-pilot by ID:', error);
      throw error;
    }
  }

  static async getOdontogramByVersion(pacienteId: string, version: number): Promise<Odontogram | null> {
    try {
      const { data, error } = await supabase
        .from('odontogram_pilots')
        .select('*')
        .eq('paciente_id', pacienteId)
        .eq('version', version)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching odontogram-pilot by version:', error);
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Unexpected error fetching odontogram-pilot by version:', error);
      throw error;
    }
  }

  static async updateOdontogram(odontogramId: string, datosOdontograma: OdontogramData, notas?: string): Promise<Odontogram> {
    try {
      const updateData: Record<string, any> = {
        datos_odontograma: datosOdontograma,
        fecha_actualizacion: new Date().toISOString()
      };

      if (notas !== undefined) {
        updateData.notas = notas;
      }

      const { data, error } = await supabase
        .from('odontogram_pilots')
        .update(updateData)
        .eq('id', odontogramId)
        .select()
        .single();

      if (error) {
        console.error('Error updating odontogram-pilot:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error updating odontogram-pilot:', error);
      throw error;
    }
  }

  static async createNewVersion(pacienteId: string, datosOdontograma: OdontogramData, notas?: string, creadoPor?: string): Promise<Odontogram> {
    try {
      const now = new Date().toISOString();

      const { error: deactivateError } = await supabase
        .from('odontogram_pilots')
        .update({ activo: false, fecha_actualizacion: now })
        .eq('paciente_id', pacienteId)
        .eq('activo', true);

      if (deactivateError) {
        console.warn('Could not deactivate previous odontogram-pilot version:', deactivateError);
      }

      return await this.createOdontogram(pacienteId, datosOdontograma, notas, creadoPor);
    } catch (error) {
      console.error('Unexpected error creating new odontogram-pilot version:', error);
      throw error;
    }
  }

  static async deleteOdontogram(odontogramId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('odontogram_pilots')
        .delete()
        .eq('id', odontogramId);

      if (error) {
        console.error('Error deleting odontogram-pilot:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error deleting odontogram-pilot:', error);
      throw error;
    }
  }
}

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

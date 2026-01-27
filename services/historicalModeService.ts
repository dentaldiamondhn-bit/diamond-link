import { supabase } from '../lib/supabase';

export interface HistoricalModeSetting {
  patient_id: string;
  bypass_historical_mode: boolean;
  created_at?: string;
  updated_at?: string;
}

export class HistoricalModeService {
  /**
   * Load patient-specific setting (global across all users)
   */
  static async loadPatientSetting(patientId: string): Promise<boolean> {
    if (!patientId) return false;
    
    try {
      const { data, error } = await supabase
        .from('historical_mode_settings')
        .select('bypass_historical_mode')
        .eq('patient_id', patientId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error loading patient setting:', error);
      }
      
      return data?.bypass_historical_mode ?? false;
    } catch (error) {
      console.error('Unexpected error loading patient setting:', error);
      return false;
    }
  }

  /**
   * Save patient-specific setting (affects all users globally)
   */
  static async savePatientSetting(
    patientId: string, 
    bypassHistoricalMode: boolean
  ): Promise<void> {
    if (!patientId) {
      throw new Error('Patient ID is required');
    }
    
    try {
      const { error } = await supabase
        .from('historical_mode_settings')
        .upsert({
          patient_id: patientId,
          bypass_historical_mode: bypassHistoricalMode,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'patient_id'
        });

      if (error) {
        console.error('Error saving patient setting:', error);
        throw new Error(`Failed to save patient setting: ${error.message}`);
      }
    } catch (error) {
      console.error('Unexpected error saving patient setting:', error);
      throw error;
    }
  }

  /**
   * Get all patients with historical mode settings
   */
  static async getAllPatientSettings(): Promise<HistoricalModeSetting[]> {
    try {
      const { data, error } = await supabase
        .from('historical_mode_settings')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading all patient settings:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error loading all patient settings:', error);
      return [];
    }
  }

  /**
   * Delete patient setting
   */
  static async deletePatientSetting(patientId: string): Promise<void> {
    if (!patientId) {
      throw new Error('Patient ID is required');
    }
    
    try {
      const { error } = await supabase
        .from('historical_mode_settings')
        .delete()
        .eq('patient_id', patientId);

      if (error) {
        console.error('Error deleting patient setting:', error);
        throw new Error(`Failed to delete patient setting: ${error.message}`);
      }
    } catch (error) {
      console.error('Unexpected error deleting patient setting:', error);
      throw error;
    }
  }

  /**
   * Bulk update patient settings
   */
  static async bulkUpdateSettings(
    updates: Array<{ patientId: string; bypass: boolean }>
  ): Promise<void> {
    if (!updates.length) return;

    try {
      const records = updates.map(({ patientId, bypass }) => ({
        patient_id: patientId,
        bypass_historical_mode: bypass,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('historical_mode_settings')
        .upsert(records, {
          onConflict: 'patient_id'
        });

      if (error) {
        console.error('Error bulk updating patient settings:', error);
        throw new Error(`Failed to bulk update patient settings: ${error.message}`);
      }
    } catch (error) {
      console.error('Unexpected error bulk updating patient settings:', error);
      throw error;
    }
  }

  /**
   * Get statistics about historical mode usage
   */
  static async getStatistics(): Promise<{
    totalPatients: number;
    bypassedPatients: number;
    normalPatients: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('historical_mode_settings')
        .select('bypass_historical_mode');

      if (error) {
        console.error('Error loading statistics:', error);
        return { totalPatients: 0, bypassedPatients: 0, normalPatients: 0 };
      }

      const totalPatients = data?.length || 0;
      const bypassedPatients = data?.filter(s => s.bypass_historical_mode).length || 0;
      const normalPatients = totalPatients - bypassedPatients;

      return { totalPatients, bypassedPatients, normalPatients };
    } catch (error) {
      console.error('Unexpected error loading statistics:', error);
      return { totalPatients: 0, bypassedPatients: 0, normalPatients: 0 };
    }
  }
}

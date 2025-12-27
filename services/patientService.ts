import { supabase } from '../lib/supabase';
import { Patient } from '../types/patient';

export class PatientService {
  static async createPatient(patientData: Omit<Patient, 'paciente_id'>) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert([patientData])
        .select();

      if (error) {
        console.error('Error creating patient:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Unexpected error creating patient:', error);
      throw error;
    }
  }

  static async getPatients() {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('fecha_inicio', { ascending: false });

      if (error) {
        console.error('Error fetching patients:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching patients:', error);
      throw error;
    }
  }

  static async getPatientById(paciente_id: string) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('paciente_id', paciente_id)
        .single();

      if (error) {
        console.error('Error fetching patient:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching patient:', error);
      throw error;
    }
  }

  static async searchPatients(searchTerm: string): Promise<Patient[]> {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .or(`nombre_completo.ilike.%${searchTerm}%,numero_identidad.ilike.%${searchTerm}%,telefono.ilike.%${searchTerm}%,doctor.ilike.%${searchTerm}%`)
        .order('nombre_completo', { ascending: true });

      if (error) {
        console.error('Error searching patients:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchPatients:', error);
      throw error;
    }
  }

  static async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    try {
      // Use regular client for client-side operations
      const { data, error } = await supabase
        .from('patients')
        .update(updates)
        .eq('paciente_id', id)
        .select();

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        // Try to fetch the updated patient
        const { data: fetchedData, error: fetchError } = await supabase
          .from('patients')
          .select('*')
          .eq('paciente_id', id)
          .single();
          
        if (fetchError) {
          throw new Error('Update succeeded but failed to fetch updated data');
        }
        
        return fetchedData;
      }

      return data[0];
    } catch (error) {
      throw error;
    }
  }

  static async deletePatient(paciente_id: string) {
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('paciente_id', paciente_id);

      if (error) {
        console.error('Error deleting patient:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error deleting patient:', error);
      throw error;
    }
  }
}

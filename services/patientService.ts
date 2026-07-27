import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Patient } from '../types/patient';
import { DoctorValidator } from '../utils/doctorValidator';

export class PatientService {
  static async createPatient(patientData: Omit<Patient, 'paciente_id'>) {
    try {
      console.log('Creating patient with data:', patientData);
      console.log('Doctor field:', patientData.doctor);
      console.log('Otro doctor field in patientData:', patientData.otro_doctor);
      
      // Validate doctor field
      const doctorValidation = await DoctorValidator.validatePatientDoctor(
        patientData.doctor, 
        patientData.otro_doctor
      );
      
      console.log('Doctor validation result:', doctorValidation);
      
      if (!doctorValidation.isValid) {
        console.log('Doctor validation failed, throwing error:', doctorValidation.error);
        throw new Error(doctorValidation.error);
      }

      // Sanitize doctor input
      const sanitizedData = {
        ...patientData,
        doctor: DoctorValidator.sanitizeDoctorInput(patientData.doctor),
        otro_doctor: patientData.otro_doctor ? DoctorValidator.sanitizeDoctorInput(patientData.otro_doctor) : undefined
      };
      
      console.log('Sanitized data before database insert:', sanitizedData);
      console.log('Doctor field after sanitization:', sanitizedData.doctor);

      const { data, error } = await supabase
        .from('patients')
        .insert([sanitizedData])
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
      // Try ordering by fecha_inicio first, if it fails try created_at, then no ordering
      let query = supabase.from('patients').select('*');
      
      try {
        query = query.order('fecha_inicio', { ascending: false });
      } catch (orderError) {
        console.warn('Failed to order by fecha_inicio, trying created_at:', orderError);
        try {
          query = query.order('created_at', { ascending: false });
        } catch (secondOrderError) {
          console.warn('Failed to order by created_at, using no ordering:', secondOrderError);
          // No ordering if both fail
        }
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching patients:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching patients:', error);
      throw error;
    }
  }

  static async getPatientsByDoctor(doctorName: string) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('doctor', doctorName)
        .order('fecha_inicio', { ascending: false });

      if (error) {
        console.error('Error fetching patients by doctor:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching patients by doctor:', error);
      throw error;
    }
  }

  static async getDoctorPatientStats(doctorName: string) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('doctor', doctorName);

      if (error) {
        console.error('Error fetching doctor patient stats:', error);
        throw error;
      }

      const allPatients = data || [];
      const newPatients = allPatients.filter(p => new Date(p.fecha_inicio) > thirtyDaysAgo);
      const returningPatients = allPatients.filter(p => new Date(p.fecha_inicio) <= thirtyDaysAgo);

      return {
        totalPatients: allPatients.length,
        newPatients: newPatients.length,
        returningPatients: returningPatients.length
      };
    } catch (error) {
      console.error('Unexpected error fetching doctor patient stats:', error);
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
      // Sanitize doctor input if present
      const sanitizedUpdates = {
        ...updates,
        ...(updates.doctor !== undefined && { 
          doctor: DoctorValidator.sanitizeDoctorInput(updates.doctor) 
        }),
        ...(updates.otro_doctor !== undefined && { 
          otro_doctor: DoctorValidator.sanitizeDoctorInput(updates.otro_doctor) 
        })
      };

      // Use admin client for updates
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      const supabaseClient = serviceRoleKey 
        ? createClient(supabaseUrl, serviceRoleKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          })
        : supabase;

      const { data, error } = await supabaseClient
        .from('patients')
        .update(sanitizedUpdates)
        .eq('paciente_id', id)
        .select();

      if (error) {
        throw error;
      }

      // If no data returned, fetch the updated patient
      if (!data || data.length === 0) {
        const { data: updatedPatient, error: fetchError } = await supabaseClient
          .from('patients')
          .select('*')
          .eq('paciente_id', id)
          .single();
          
        if (fetchError) {
          throw fetchError;
        }
        
        return updatedPatient;
      }

      return data[0];
    } catch (error) {
      console.error('Update error:', error);
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

  static async deletePatient(pacienteId: string): Promise<void> {
    try {
      // Delete related records first (foreign key constraints)
      await supabase.from('tratamientos_realizados').delete().eq('paciente_id', pacienteId);
      await supabase.from('tratamientos_completados').delete().eq('paciente_id', pacienteId);
      await supabase.from('presupuestos').delete().eq('patient_id', pacienteId);
      await supabase.from('patient_follow_ups').delete().eq('paciente_id', pacienteId);
      await supabase.from('patient_odontogram').delete().eq('paciente_id', pacienteId);
      await supabase.from('consentimientos').delete().eq('paciente_id', pacienteId);
      await supabase.from('calendar_events').delete().eq('paciente_id', pacienteId);
      
      // Finally delete the patient record
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('paciente_id', pacienteId);

      if (error) {
        console.error('Error deleting patient:', error);
        throw error;
      }
      
      console.log('Patient deleted successfully:', pacienteId);
    } catch (error) {
      console.error('Error deleting patient:', error);
      throw error;
    }
  }
}

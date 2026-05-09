import { supabase } from '../lib/supabase';

export interface FollowUpStatus {
  id: string;
  paciente_id: string;
  treatment_date: string;
  follow_up_date: string;
  whatsapp_sent: boolean;
  patient_responded: boolean;
  appointment_scheduled: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFollowUpStatusData {
  paciente_id: string;
  treatment_date: string;
  notes?: string;
}

export class PatientFollowUpStatusService {
  /**
   * Create a new follow-up status record
   */
  static async createFollowUpStatus(data: CreateFollowUpStatusData): Promise<FollowUpStatus> {
    try {
      const { data: insertData, error } = await supabase
        .from('patient_follow_up_status')
        .insert([{
          paciente_id: data.paciente_id,
          treatment_date: data.treatment_date,
          notes: data.notes
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating follow-up status:', error);
        throw error;
      }

      return insertData;
    } catch (error) {
      console.error('Unexpected error creating follow-up status:', error);
      throw error;
    }
  }

  /**
   * Get follow-up status for a patient
   */
  static async getFollowUpStatus(pacienteId: string): Promise<FollowUpStatus | null> {
    try {
      const { data, error } = await supabase
        .from('patient_follow_up_status')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error fetching follow-up status:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching follow-up status:', error);
      throw error;
    }
  }

  /**
   * Update WhatsApp sent status
   */
  static async markWhatsAppSent(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('patient_follow_up_status')
        .update({
          whatsapp_sent: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error marking WhatsApp sent:', error);
        throw error;
      }
    } catch (error) {
      console.error('Unexpected error marking WhatsApp sent:', error);
      throw error;
    }
  }

  /**
   * Update patient responded status
   */
  static async markPatientResponded(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('patient_follow_up_status')
        .update({
          patient_responded: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error marking patient responded:', error);
        throw error;
      }
    } catch (error) {
      console.error('Unexpected error marking patient responded:', error);
      throw error;
    }
  }

  /**
   * Update appointment scheduled status
   */
  static async markAppointmentScheduled(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('patient_follow_up_status')
        .update({
          appointment_scheduled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error marking appointment scheduled:', error);
        throw error;
      }
    } catch (error) {
      console.error('Unexpected error marking appointment scheduled:', error);
      throw error;
    }
  }

  /**
   * Get all follow-up statuses for a patient
   */
  static async getPatientFollowUpHistory(pacienteId: string): Promise<FollowUpStatus[]> {
    try {
      const { data: historyData, error } = await supabase
        .from('patient_follow_up_status')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching patient follow-up history:', error);
        throw error;
      }

      return historyData || [];
    } catch (error) {
      console.error('Unexpected error fetching patient follow-up history:', error);
      throw error;
    }
  }
}

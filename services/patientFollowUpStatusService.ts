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
  static async createFollowUpStatus(data: CreateFollowUpStatusData): Promise<FollowUpStatus | null> {
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
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          console.warn('patient_follow_up_status table does not exist yet — skipping create');
          return null;
        }
        console.error('Error creating follow-up status:', error);
        throw error;
      }

      return insertData;
    } catch (error: any) {
      if (error?.message?.includes('does not exist') || error?.code === '42P01') return null;
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
        if (error.code === 'PGRST116') return null;
        // Table doesn't exist yet — treat as no status
        if (error.message?.includes('does not exist') || error.code === '42P01') return null;
        console.error('Error fetching follow-up status:', error);
        return null;
      }

      return data;
    } catch (error: any) {
      if (error?.message?.includes('does not exist') || error?.code === '42P01') return null;
      console.error('Unexpected error fetching follow-up status:', error);
      return null;
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
        if (error.message?.includes('does not exist') || error.code === '42P01') return;
        console.error('Error marking WhatsApp sent:', error);
        throw error;
      }
    } catch (error: any) {
      if (error?.message?.includes('does not exist') || error?.code === '42P01') return;
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
        if (error.message?.includes('does not exist') || error.code === '42P01') return;
        console.error('Error marking patient responded:', error);
        throw error;
      }
    } catch (error: any) {
      if (error?.message?.includes('does not exist') || error?.code === '42P01') return;
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
        if (error.message?.includes('does not exist') || error.code === '42P01') return;
        console.error('Error marking appointment scheduled:', error);
        throw error;
      }
    } catch (error: any) {
      if (error?.message?.includes('does not exist') || error?.code === '42P01') return;
      console.error('Unexpected error marking appointment scheduled:', error);
      throw error;
    }
  }

  /**
   * Update follow-up notes
   */
  static async updateNotes(id: string, notes: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('patient_follow_up_status')
        .update({
          notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') return;
        console.error('Error updating notes:', error);
        throw error;
      }
    } catch (error: any) {
      if (error?.message?.includes('does not exist') || error.code === '42P01') return;
      console.error('Unexpected error updating notes:', error);
      throw error;
    }
  }

  /**
   * Update custom WhatsApp message for a patient
   */
  static async updateCustomWhatsAppMessage(id: string, custom_whatsapp_message: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('patient_follow_up_status')
        .update({
          custom_whatsapp_message,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') return;
        console.error('Error updating custom WhatsApp message:', error);
        throw error;
      }
    } catch (error: any) {
      if (error?.message?.includes('does not exist') || error.code === '42P01') return;
      console.error('Unexpected error updating custom WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Toggle a boolean field (whatsapp_sent, patient_responded, appointment_scheduled)
   */
  static async toggleField(
    id: string,
    field: 'whatsapp_sent' | 'patient_responded' | 'appointment_scheduled'
  ): Promise<void> {
    try {
      const { data: current, error: fetchError } = await supabase
        .from('patient_follow_up_status')
        .select(field)
        .eq('id', id)
        .single();

      if (fetchError) {
        if (fetchError.message?.includes('does not exist') || fetchError.code === '42P01') return;
        throw fetchError;
      }

      const newValue = !(current as any)[field];

      const { error } = await supabase
        .from('patient_follow_up_status')
        .update({
          [field]: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error(`Error toggling ${field}:`, error);
        throw error;
      }
    } catch (error: any) {
      if (error?.message?.includes('does not exist') || error?.code === '42P01') return;
      console.error(`Unexpected error toggling ${field}:`, error);
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
        if (error.message?.includes('does not exist') || error.code === '42P01') return [];
        console.error('Error fetching patient follow-up history:', error);
        return [];
      }

      return historyData || [];
    } catch (error: any) {
      if (error?.message?.includes('does not exist') || error?.code === '42P01') return [];
      console.error('Unexpected error fetching patient follow-up history:', error);
      return [];
    }
  }

  /**
   * Batch-fetch the latest follow-up status for multiple patients in one query.
   * Returns a Map<paciente_id, FollowUpStatus>.
   */
  static async getFollowUpStatusesBatch(pacienteIds: string[]): Promise<Map<string, FollowUpStatus>> {
    const map = new Map<string, FollowUpStatus>();
    if (pacienteIds.length === 0) return map;

    try {
      const { data, error } = await supabase
        .from('patient_follow_up_status')
        .select('*')
        .in('paciente_id', pacienteIds)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') return map;
        console.error('Error batch-fetching follow-up statuses:', error);
        return map;
      }

      if (data) {
        // Keep only the most recent record per paciente_id
        for (const row of data as FollowUpStatus[]) {
          if (!map.has(row.paciente_id)) {
            map.set(row.paciente_id, row);
          }
        }
      }
    } catch (err: any) {
      if (err?.message?.includes('does not exist') || err?.code === '42P01') return map;
      console.error('Unexpected error batch-fetching follow-up statuses:', err);
    }

    return map;
  }
}

import { createClient } from '@supabase/supabase-js';

export interface MaintenanceAlert {
  id: string;
  ticket_id: string;
  title: string;
  description?: string;
  maintenance_start: string;
  maintenance_end: string;
  alert_type: 'MAINTENANCE' | 'SYSTEM_UPDATE' | 'EMERGENCY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  affected_systems?: string[];
  contact_person?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface CreateMaintenanceAlertData {
  ticket_id: string;
  title: string;
  description?: string;
  maintenance_start: string;
  maintenance_end: string;
  alert_type?: 'MAINTENANCE' | 'SYSTEM_UPDATE' | 'EMERGENCY';
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affected_systems?: string[];
  contact_person?: string;
}

export class MaintenanceService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string, options?: any) {
    this.supabase = createClient(supabaseUrl, supabaseKey, options);
  }

  async createMaintenanceAlert(data: CreateMaintenanceAlertData, userId: string): Promise<{ data: MaintenanceAlert | null; error: any }> {
    try {
      const { data: alert, error } = await this.supabase
        .from('maintenance_alerts')
        .insert({
          ...data,
          created_by: userId,
          status: 'SCHEDULED'
        })
        .select()
        .single();

      if (error) throw error;
      return { data: alert, error: null };
    } catch (error) {
      console.error('Error creating maintenance alert:', error);
      return { data: null, error };
    }
  }

  async getActiveMaintenanceAlerts(): Promise<{ data: MaintenanceAlert[]; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('active_maintenance_alerts')
        .select('*')
        .order('maintenance_start', { ascending: true });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching active maintenance alerts:', error);
      return { data: [], error };
    }
  }

  async getAllMaintenanceAlerts(): Promise<{ data: MaintenanceAlert[]; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('maintenance_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching all maintenance alerts:', error);
      return { data: [], error };
    }
  }

  async updateMaintenanceAlert(id: string, updates: Partial<MaintenanceAlert>): Promise<{ data: MaintenanceAlert | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('maintenance_alerts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating maintenance alert:', error);
      return { data: null, error };
    }
  }

  async deleteMaintenanceAlert(id: string): Promise<{ error: any }> {
    try {
      const { error } = await this.supabase
        .from('maintenance_alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting maintenance alert:', error);
      return { error };
    }
  }

  async getMaintenanceAlertByTicketId(ticketId: string): Promise<{ data: MaintenanceAlert | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('maintenance_alerts')
        .select('*')
        .eq('ticket_id', ticketId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      return { data: data || null, error: error && error.code !== 'PGRST116' ? error : null };
    } catch (error) {
      console.error('Error fetching maintenance alert by ticket ID:', error);
      return { data: null, error };
    }
  }

  // Helper method to determine alert status based on time
  static getAlertStatus(maintenanceStart: string, maintenanceEnd: string, currentStatus: string): 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' {
    const now = new Date();
    const start = new Date(maintenanceStart);
    const end = new Date(maintenanceEnd);

    if (currentStatus === 'CANCELLED') return 'CANCELLED';
    if (currentStatus === 'COMPLETED') return 'COMPLETED';
    
    if (now >= start && now <= end) return 'ACTIVE';
    if (now < start) return 'SCHEDULED';
    return 'COMPLETED';
  }

  // Helper method to check if alert is currently active
  static isAlertActive(maintenanceStart: string, maintenanceEnd: string): boolean {
    const now = new Date();
    const start = new Date(maintenanceStart);
    const end = new Date(maintenanceEnd);
    return now >= start && now <= end;
  }

  // Helper method to check if alert is upcoming (within 24 hours)
  static isAlertUpcoming(maintenanceStart: string): boolean {
    const now = new Date();
    const start = new Date(maintenanceStart);
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return start > now && start <= twentyFourHoursFromNow;
  }

  // Helper method to format duration
  static formatDuration(maintenanceStart: string, maintenanceEnd: string): string {
    const start = new Date(maintenanceStart);
    const end = new Date(maintenanceEnd);
    const diffMs = end.getTime() - start.getTime();
    
    if (diffMs < 0) return 'Invalid duration';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    
    if (diffDays > 0) {
      return `${diffDays} día(s) y ${remainingHours} hora(s)`;
    } else {
      return `${diffHours} hora(s)`;
    }
  }
}

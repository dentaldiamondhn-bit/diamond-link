import { supabase } from '../lib/supabase';
import { CalendarInvitee, CalendarInviteeWithUser } from '../types/calendarInvitees';

export class CalendarInviteesService {
  // Invitees CRUD operations
  static async createInvitee(inviteeData: Omit<CalendarInvitee, 'id' | 'invited_at' | 'created_at'>): Promise<CalendarInvitee> {
    try {
      const { data, error } = await supabase
        .from('calendar_invitees')
        .insert([inviteeData])
        .select()
        .single();

      if (error) {
        console.error('Error creating calendar invitee:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error creating calendar invitee:', error);
      throw error;
    }
  }

  static async getInviteesForItem(itemType: 'event' | 'task' | 'reminder', itemId: string): Promise<CalendarInviteeWithUser[]> {
    try {
      // First get the invitees with user data from auth.users
      const { data, error } = await supabase
        .from('calendar_invitees')
        .select(`
          *,
          user:auth.users(
            id,
            raw_user_meta_data->first_name,
            raw_user_meta_data->last_name,
            email,
            raw_user_meta_data->role
          )
        `)
        .eq('item_type', itemType)
        .eq('item_id', itemId)
        .order('invited_at', { ascending: true });

      if (error) {
        console.error('Error fetching calendar invitees:', error);
        throw error;
      }

      // Transform the user data to match our interface
      return (data || []).map((invitee: any) => ({
        ...invitee,
        user: {
          id: invitee.user?.id || '',
          first_name: invitee.user?.raw_user_meta_data?.first_name || '',
          last_name: invitee.user?.raw_user_meta_data?.last_name || '',
          email: invitee.user?.email || '',
          role: invitee.user?.raw_user_meta_data?.role || ''
        }
      }));
    } catch (error) {
      console.error('Unexpected error fetching calendar invitees:', error);
      throw error;
    }
  }

  static async updateInviteeStatus(id: string, status: CalendarInvitee['status']): Promise<CalendarInvitee> {
    try {
      const { data, error } = await supabase
        .from('calendar_invitees')
        .update({
          status,
          responded_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating calendar invitee:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error updating calendar invitee:', error);
      throw error;
    }
  }

  static async deleteInvitee(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_invitees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting calendar invitee:', error);
        throw error;
      }
    } catch (error) {
      console.error('Unexpected error deleting calendar invitee:', error);
      throw error;
    }
  }

  // Bulk operations
  static async createMultipleInvitees(inviteesData: Omit<CalendarInvitee, 'id' | 'invited_at' | 'created_at'>[]): Promise<CalendarInvitee[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_invitees')
        .insert(inviteesData)
        .select();

      if (error) {
        console.error('Error creating multiple calendar invitees:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error creating multiple calendar invitees:', error);
      throw error;
    }
  }

  static async deleteInviteesForItem(itemType: 'event' | 'task' | 'reminder', itemId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_invitees')
        .delete()
        .eq('item_type', itemType)
        .eq('item_id', itemId);

      if (error) {
        console.error('Error deleting calendar invitees for item:', error);
        throw error;
      }
    } catch (error) {
      console.error('Unexpected error deleting calendar invitees for item:', error);
      throw error;
    }
  }

  // Get all users for dropdown
  static async getAllUsers(): Promise<Array<{
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
  }>> {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        console.error('Error fetching users:', response.statusText);
        throw new Error('Error fetching users');
      }
      
      const users = await response.json();
      return users || [];
    } catch (error) {
      console.error('Unexpected error fetching users:', error);
      throw error;
    }
  }

  // Get invitees for the current user
  static async getInviteesForCurrentUser(userId: string): Promise<CalendarInviteeWithUser[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_invitees')
        .select(`
          *,
          user:auth.users(
            id,
            raw_user_meta_data->first_name,
            raw_user_meta_data->last_name,
            email,
            raw_user_meta_data->role
          )
        `)
        .eq('user_id', userId)
        .order('invited_at', { ascending: false });

      if (error) {
        console.error('Error fetching invitees for current user:', error);
        throw error;
      }

      return (data || []).map((invitee: any) => ({
        ...invitee,
        user: {
          id: invitee.user?.id || '',
          first_name: invitee.user?.raw_user_meta_data?.first_name || '',
          last_name: invitee.user?.raw_user_meta_data?.last_name || '',
          email: invitee.user?.email || '',
          role: invitee.user?.raw_user_meta_data?.role || ''
        }
      }));
    } catch (error) {
      console.error('Unexpected error fetching invitees for current user:', error);
      throw error;
    }
  }
}

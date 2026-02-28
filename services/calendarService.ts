import { supabase } from '../lib/supabase';
import { CalendarEvent, CalendarEventWithPatient, CalendarReminder, CalendarFilter } from '../types/calendar';

export class CalendarService {
  // Events CRUD operations
  static async createEvent(eventData: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>): Promise<CalendarEvent> {
    try {
      // Remove doctor_id if it exists in the data (it shouldn't be there)
      const { doctor_id, ...cleanEventData } = eventData as any;
      
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([cleanEventData])
        .select(`
          id,
          title,
          description,
          start_date,
          end_date,
          all_day,
          location,
          event_type,
          status,
          priority,
          patient_id,
          notes,
          created_by,
          created_at,
          updated_at
        `)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async getEvents(filter?: CalendarFilter): Promise<CalendarEventWithPatient[]> {
    try {
      let query = supabase
        .from('calendar_events')
        .select(`
          *,
          patient:patients(
            paciente_id,
            nombre_completo,
            telefono,
            email
          )
        `);

      // Apply filters
      if (filter?.event_type) {
        query = query.eq('event_type', filter.event_type);
      }
      if (filter?.status) {
        query = query.eq('status', filter.status);
      }
      if (filter?.priority) {
        query = query.eq('priority', filter.priority);
      }
      if (filter?.date_range) {
        query = query
          .gte('start_date', filter.date_range.start)
          .lte('end_date', filter.date_range.end);
      }

      const { data, error } = await query
        .order('start_date', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  static async getEventById(id: string): Promise<CalendarEventWithPatient | null> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          patient:patients(
            paciente_id,
            nombre_completo,
            telefono,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found
          return null;
        }
        throw error;
      }

      if (!data) {
        // Record not found
        return null;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    try {
      // Remove doctor_id if it exists in the updates (it shouldn't be there)
      const { doctor_id, ...cleanUpdates } = updates as any;
      
      const { data, error } = await supabase
        .from('calendar_events')
        .update({
          ...cleanUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          id,
          title,
          description,
          start_date,
          end_date,
          all_day,
          location,
          event_type,
          status,
          priority,
          patient_id,
          notes,
          created_by,
          created_at,
          updated_at
        `)
        .single();

      if (error) {
        console.error('Error updating calendar event:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error updating calendar event:', error);
      throw error;
    }
  }

  static async deleteEvent(id: string): Promise<void> {
    try {
      // Delete all related data in the correct order to respect foreign key constraints
      
      // 1. Delete calendar invitees for this event
      const { error: inviteesError } = await supabase
        .from('calendar_invitees')
        .delete()
        .eq('item_type', 'event')
        .eq('item_id', id);

      if (inviteesError) {
        console.error('Error deleting calendar invitees:', inviteesError);
        throw inviteesError;
      }

      // 2. Delete calendar reminders for this event
      const { error: remindersError } = await supabase
        .from('calendar_reminders')
        .delete()
        .or(`item_type.eq.event AND item_id.eq.${id},event_id.eq.${id}`); // Handle both schemas

      if (remindersError) {
        console.error('Error deleting calendar reminders:', remindersError);
        throw remindersError;
      }

      // 3. Finally delete the event itself
      const { error: eventError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (eventError) {
        console.error('Error deleting calendar event:', eventError);
        throw eventError;
      }

      console.log(`✅ Event ${id} and all related data deleted successfully`);
    } catch (error) {
      console.error('Unexpected error deleting calendar event:', error);
      throw error;
    }
  }

  // Get events for a specific date range
  static async getEventsByDateRange(startDate: string, endDate: string, userId?: string): Promise<CalendarEventWithPatient[]> {
    try {
      // If no userId provided, return empty array (shouldn't happen in normal flow)
      if (!userId) {
        console.warn('⚠️ getEventsByDateRange called without userId');
        return [];
      }

      const { data, error } = await supabase
        .rpc('get_user_events', {
          user_id_param: userId,
          start_date_param: startDate,
          end_date_param: endDate
        });

      if (error) {
        console.error('Error fetching events by date range:', error);
        throw error;
      }

      // Remove duplicates and format data
      const events = data || [];
      const uniqueEvents = events.filter((event, index, self) => 
        index === self.findIndex((e) => e.id === event.id)
      );

      return uniqueEvents;
    } catch (error) {
      console.error('Unexpected error fetching events by date range:', error);
      throw error;
    }
  }

  // Get events for a specific patient
  static async getEventsByPatientId(patientId: string): Promise<CalendarEventWithPatient[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          patient:patients(
            paciente_id,
            nombre_completo,
            telefono,
            email
          )
        `)
        .eq('patient_id', patientId)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching events by patient:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching events by patient:', error);
      throw error;
    }
  }

  // Get upcoming events for reminders
  static async getUpcomingEvents(userId?: string): Promise<CalendarEventWithPatient[]> {
    try {
      const now = new Date().toISOString();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowISO = tomorrow.toISOString();

      let query = supabase
        .from('calendar_events')
        .select(`
          *,
          patient:pacientes(
            paciente_id,
            nombre_completo,
            telefono,
            email
          )
        `)
        .gte('start_date', now)
        .lte('start_date', tomorrow)
        .neq('status', 'cancelled')
        .order('start_date', { ascending: true });

      if (userId) {
        query = query.eq('created_by', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching upcoming events:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching upcoming events:', error);
      throw error;
    }
  }

  // Reminders operations
  static async createReminder(reminderData: Omit<CalendarReminder, 'id' | 'created_at'>): Promise<CalendarReminder> {
    try {
      const { data, error } = await supabase
        .from('calendar_reminders')
        .insert([reminderData])
        .select()
        .single();

      if (error) {
        console.error('Error creating calendar reminder:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error creating calendar reminder:', error);
      throw error;
    }
  }

  static async getPendingReminders(): Promise<CalendarReminder[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('calendar_reminders')
        .select('*')
        .eq('sent', false)
        .lte('reminder_time', now)
        .order('reminder_time', { ascending: true });

      if (error) {
        console.error('Error fetching pending reminders:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching pending reminders:', error);
      throw error;
    }
  }

  static async markReminderAsSent(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_reminders')
        .update({ sent: true })
        .eq('id', id);

      if (error) {
        console.error('Error marking reminder as sent:', error);
        throw error;
      }
    } catch (error) {
      console.error('Unexpected error marking reminder as sent:', error);
      throw error;
    }
  }
}

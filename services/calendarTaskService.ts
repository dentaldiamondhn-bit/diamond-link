import { supabase } from '../lib/supabase';
import { CalendarTask, CalendarTaskWithPatient, TaskFilter } from '../types/calendarTasks';

export class CalendarTaskService {
  // Tasks CRUD operations
  static async createTask(taskData: Omit<CalendarTask, 'id' | 'created_at' | 'updated_at'>): Promise<CalendarTask> {
    try {
      const { data, error } = await supabase
        .from('calendar_tasks')
        .insert([taskData])
        .select()
        .single();

      if (error) {
        console.error('Error creating calendar task:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error creating calendar task:', error);
      throw error;
    }
  }

  static async getTasks(filter?: TaskFilter): Promise<CalendarTaskWithPatient[]> {
    try {
      let query = supabase
        .from('calendar_tasks')
        .select(`
          *,
          patient:patients(
            paciente_id,
            nombre_completo,
            telefono,
            email
          ),
          event:calendar_events(
            id,
            title,
            start_date,
            end_date
          )
        `);

      // Apply filters
      if (filter?.status) {
        query = query.eq('status', filter.status);
      }
      if (filter?.priority) {
        query = query.eq('priority', filter.priority);
      }
      if (filter?.category) {
        query = query.eq('category', filter.category);
      }
      if (filter?.assigned_to) {
        query = query.eq('assigned_to', filter.assigned_to);
      }
      if (filter?.patient_id) {
        query = query.eq('patient_id', filter.patient_id);
      }
      if (filter?.event_id) {
        query = query.eq('event_id', filter.event_id);
      }
      if (filter?.date_range) {
        query = query
          .gte('due_date', filter.date_range.start)
          .lte('due_date', filter.date_range.end);
      }
      if (filter?.tags && filter.tags.length > 0) {
        query = query.contains('tags', filter.tags);
      }

      const { data, error } = await query
        .order('due_date', { ascending: true, nullsFirst: true })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching calendar tasks:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching calendar tasks:', error);
      throw error;
    }
  }

  static async getTaskById(id: string): Promise<CalendarTaskWithPatient | null> {
    try {
      const { data, error } = await supabase
        .from('calendar_tasks')
        .select(`
          *,
          patient:patients(
            paciente_id,
            nombre_completo,
            telefono,
            email
          ),
          event:calendar_events(
            id,
            title,
            start_date,
            end_date
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found
          return null;
        }
        console.error('Error fetching calendar task:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching calendar task:', error);
      throw error;
    }
  }

  static async updateTask(id: string, updates: Partial<CalendarTask>): Promise<CalendarTask> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
        // Auto-set completed_at when status changes to completed
        ...(updates.status === 'completed' && !updates.completed_at ? { completed_at: new Date().toISOString() } : {})
      };

      const { data, error } = await supabase
        .from('calendar_tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating calendar task:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error updating calendar task:', error);
      throw error;
    }
  }

  static async deleteTask(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_tasks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting calendar task:', error);
        throw error;
      }
    } catch (error) {
      console.error('Unexpected error deleting calendar task:', error);
      throw error;
    }
  }

  // Get tasks for a specific date range
  static async getTasksByDateRange(startDate: string, endDate: string): Promise<CalendarTaskWithPatient[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_tasks')
        .select(`
          *,
          patient:patients(
            paciente_id,
            nombre_completo,
            telefono,
            email
          ),
          event:calendar_events(
            id,
            title,
            start_date,
            end_date
          )
        `)
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .order('due_date', { ascending: true, nullsFirst: true })
        .order('priority', { ascending: false });

      if (error) {
        console.error('Error fetching tasks by date range:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching tasks by date range:', error);
      throw error;
    }
  }

  // Get tasks for a specific patient
  static async getTasksByPatientId(patientId: string): Promise<CalendarTaskWithPatient[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_tasks')
        .select(`
          *,
          patient:patients(
            paciente_id,
            nombre_completo,
            telefono,
            email
          ),
          event:calendar_events(
            id,
            title,
            start_date,
            end_date
          )
        `)
        .eq('patient_id', patientId)
        .order('due_date', { ascending: true, nullsFirst: true })
        .order('priority', { ascending: false });

      if (error) {
        console.error('Error fetching tasks by patient:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching tasks by patient:', error);
      throw error;
    }
  }

  // Get tasks assigned to a user
  static async getTasksByAssignedUser(userId: string): Promise<CalendarTaskWithPatient[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_tasks')
        .select(`
          *,
          patient:patients(
            paciente_id,
            nombre_completo,
            telefono,
            email
          ),
          event:calendar_events(
            id,
            title,
            start_date,
            end_date
          )
        `)
        .eq('assigned_to', userId)
        .order('due_date', { ascending: true, nullsFirst: true })
        .order('priority', { ascending: false });

      if (error) {
        console.error('Error fetching tasks by assigned user:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching tasks by assigned user:', error);
      throw error;
    }
  }

  // Get overdue tasks
  static async getOverdueTasks(): Promise<CalendarTaskWithPatient[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('calendar_tasks')
        .select(`
          *,
          patient:pacientes(
            paciente_id,
            nombre_completo,
            telefono,
            email
          ),
          event:calendar_events(
            id,
            title,
            start_date,
            end_date
          )
        `)
        .lt('due_date', now)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true })
        .order('priority', { ascending: false });

      if (error) {
        console.error('Error fetching overdue tasks:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching overdue tasks:', error);
      throw error;
    }
  }

  // Get today's tasks
  static async getTodayTasks(): Promise<CalendarTaskWithPatient[]> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      const { data, error } = await supabase
        .from('calendar_tasks')
        .select(`
          *,
          patient:pacientes(
            paciente_id,
            nombre_completo,
            telefono,
            email
          ),
          event:calendar_events(
            id,
            title,
            start_date,
            end_date
          )
        `)
        .gte('due_date', startOfDay.toISOString())
        .lte('due_date', endOfDay.toISOString())
        .order('due_date', { ascending: true })
        .order('priority', { ascending: false });

      if (error) {
        console.error('Error fetching today tasks:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching today tasks:', error);
      throw error;
    }
  }

  // Bulk update task statuses
  static async bulkUpdateTaskStatus(taskIds: string[], status: CalendarTask['status']): Promise<void> {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {})
      };

      const { error } = await supabase
        .from('calendar_tasks')
        .update(updateData)
        .in('id', taskIds);

      if (error) {
        console.error('Error bulk updating task statuses:', error);
        throw error;
      }
    } catch (error) {
      console.error('Unexpected error bulk updating task statuses:', error);
      throw error;
    }
  }
}

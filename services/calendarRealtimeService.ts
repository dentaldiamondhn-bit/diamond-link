import { supabase } from '../lib/supabase';
import { CalendarEventWithPatient } from '../types/calendar';

export interface RealtimeEventUpdate {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  old_record?: any;
  record: any;
  timestamp: string;
}

export interface CalendarRealtimeNotification {
  type: 'event_created' | 'event_updated' | 'event_deleted' | 'task_created' | 'task_updated' | 'task_deleted' | 'reminder_created' | 'reminder_updated' | 'reminder_deleted';
  title: string;
  message: string;
  data: any;
  timestamp: string;
  userId?: string;
}

class CalendarRealtimeService {
  private subscriptions: Map<string, any> = new Map();
  private notificationCallbacks: Set<(notification: CalendarRealtimeNotification) => void> = new Set();
  private eventUpdateCallbacks: Set<(update: RealtimeEventUpdate) => void> = new Set();
  private isConnected = false;

  constructor() {
    this.initializeRealtime();
  }

  private async initializeRealtime() {
    try {
      // Enable real-time for calendar events
      await this.enableRealtimeForTable('calendar_events');
      
      // Enable real-time for calendar tasks  
      await this.enableRealtimeForTable('calendar_tasks');
      
      // Enable real-time for calendar reminders
      await this.enableRealtimeForTable('calendar_reminders');

      this.isConnected = true;
      console.log('✅ Calendar Realtime initialized');
    } catch (error) {
      console.error('❌ Error initializing Calendar Realtime:', error);
    }
  }

  private async enableRealtimeForTable(tableName: string) {
    try {
      const channel = supabase.channel(`${tableName}_changes`);
      
      const subscription = channel.on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: tableName 
        }, 
        (payload) => this.handleDatabaseChange(tableName, payload)
      ).subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.subscriptions.set(tableName, channel);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to ${tableName}`);
        }
      });

    } catch (error) {
      console.error(`❌ Error enabling realtime for ${tableName}:`, error);
    }
  }

  private handleDatabaseChange(tableName: string, payload: any) {
    // Handle different payload structures
    const eventType = payload.eventType || payload.event;
    const newRecord = payload.new || payload.record;
    const oldRecord = payload.old;

    const update: RealtimeEventUpdate = {
      type: eventType,
      table: tableName,
      schema: payload.schema || 'public',
      record: newRecord,
      old_record: oldRecord,
      timestamp: new Date().toISOString()
    };

    // Notify event update callbacks
    this.eventUpdateCallbacks.forEach(callback => callback(update));

    // Convert to calendar notification
    const notification = this.convertToNotification(tableName, { ...payload, eventType });
    if (notification) {
      this.notifyListeners(notification);
    }
  }

  private convertToNotification(tableName: string, payload: any): CalendarRealtimeNotification | null {
    const eventType = payload.eventType;
    const record = payload.new || payload.old;

    if (!record) return null;

    let notification: CalendarRealtimeNotification | null = null;

    switch (tableName) {
      case 'calendar_events':
        notification = this.createEventNotification(eventType, record);
        break;
      case 'calendar_tasks':
        notification = this.createTaskNotification(eventType, record);
        break;
      case 'calendar_reminders':
        notification = this.createReminderNotification(eventType, record);
        break;
    }

    return notification;
  }

  private createEventNotification(eventType: string, record: any): CalendarRealtimeNotification {
    const type = `event_${eventType.toLowerCase()}` as any;
    const title = record.title || 'Evento';
    const startTime = record.start_date ? new Date(record.start_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
    const date = record.start_date ? new Date(record.start_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) : '';
    
    let message = '';
    switch (eventType) {
      case 'INSERT':
        message = `Nuevo evento: ${title}${date && startTime ? ` - ${date} a las ${startTime}` : ''}`;
        break;
      case 'UPDATE':
        message = `Evento actualizado: ${title}${date && startTime ? ` - ${date} a las ${startTime}` : ''}`;
        break;
      case 'DELETE':
        message = `Evento eliminado: ${title}`;
        break;
    }

    return {
      type,
      title,
      message,
      data: record,
      timestamp: new Date().toISOString(),
      userId: record.created_by_clerk_id // Will be overridden to notify all relevant users
    };
  }

  private createTaskNotification(eventType: string, record: any): CalendarRealtimeNotification {
    const type = `task_${eventType.toLowerCase()}` as any;
    const title = record.title || 'Tarea';
    const dueTime = record.due_date ? new Date(record.due_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
    const date = record.due_date ? new Date(record.due_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) : '';
    
    let message = '';
    switch (eventType) {
      case 'INSERT':
        message = `Nueva tarea: ${title}${date && dueTime ? ` - ${date} a las ${dueTime}` : ''}`;
        break;
      case 'UPDATE':
        message = `Tarea actualizada: ${title}${date && dueTime ? ` - ${date} a las ${dueTime}` : ''}`;
        break;
      case 'DELETE':
        message = `Tarea eliminada: ${title}`;
        break;
    }

    return {
      type,
      title,
      message,
      data: record,
      timestamp: new Date().toISOString(),
      userId: record.created_by_clerk_id // Will be overridden to notify all relevant users
    };
  }

  private createReminderNotification(eventType: string, record: any): CalendarRealtimeNotification {
    const type = `reminder_${eventType.toLowerCase()}` as any;
    const title = record.title || 'Recordatorio';
    
    let message = '';
    switch (eventType) {
      case 'INSERT':
        message = `Nuevo recordatorio creado: ${title}`;
        break;
      case 'UPDATE':
        message = `Recordatorio actualizado: ${title}`;
        break;
      case 'DELETE':
        message = `Recordatorio eliminado: ${title}`;
        break;
    }

    return {
      type,
      title,
      message,
      data: record,
      timestamp: new Date().toISOString(),
      userId: record.created_by_clerk_id
    };
  }

  private notifyListeners(notification: CalendarRealtimeNotification) {
    // Get all relevant users for this notification
    const relevantUsers = this.getRelevantUsers(notification.data);
    
    // Create personalized notifications for each relevant user
    relevantUsers.forEach(userId => {
      const personalizedNotification = { ...notification, userId };
      
      // Dispatch to all notification callbacks
      this.notificationCallbacks.forEach(callback => callback(personalizedNotification));

      // Also dispatch as custom event for components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('calendarRealtimeUpdate', { 
          detail: personalizedNotification 
        }));
      }
    });
  }
  
  private getRelevantUsers(record: any): string[] {
    const users = new Set<string>();
    
    // Always include the creator
    if (record.created_by_clerk_id) {
      users.add(record.created_by_clerk_id);
    }
    
    // Include event invitees
    if (record.invitees && Array.isArray(record.invitees)) {
      record.invitees.forEach((invitee: any) => {
        if (invitee.user_id) {
          users.add(invitee.user_id);
        }
      });
    }
    
    // Include assigned user for tasks
    if (record.assigned_to) {
      users.add(record.assigned_to);
    }
    
    // Include patient
    if (record.paciente_id) {
      users.add(record.paciente_id);
    }
    
    return Array.from(users);
  }

  // Public API methods
  public onNotification(callback: (notification: CalendarRealtimeNotification) => void) {
    this.notificationCallbacks.add(callback);
    return () => this.notificationCallbacks.delete(callback);
  }

  public onEventUpdate(callback: (update: RealtimeEventUpdate) => void) {
    this.eventUpdateCallbacks.add(callback);
    return () => this.eventUpdateCallbacks.delete(callback);
  }

  public subscribeToUserEvents(userId: string) {
    // Filter events for specific user
    const userCallback = (update: RealtimeEventUpdate) => {
      // Check if the event is relevant to this user
      if (this.isUserRelevantEvent(update, userId)) {
        // Process the event
        console.log(`👤 User ${userId} relevant event:`, update);
      }
    };

    this.eventUpdateCallbacks.add(userCallback);
    return () => this.eventUpdateCallbacks.delete(userCallback);
  }

  private isUserRelevantEvent(update: RealtimeEventUpdate, userId: string): boolean {
    const record = update.record;
    
    // Check if user is the creator
    if (record.created_by_clerk_id === userId) {
      return true;
    }

    // Check if user is in invitees (for events)
    if (record.invitees && Array.isArray(record.invitees)) {
      return record.invitees.some((invitee: any) => invitee.user === userId);
    }

    // Check if user is assigned (for tasks)
    if (record.assigned_to === userId) {
      return true;
    }

    // Check if user is the patient
    if (record.paciente_id === userId) {
      return true;
    }

    return false;
  }

  public async disconnect() {
    try {
      // Unsubscribe from all channels
      for (const [tableName] of this.subscriptions) {
        await supabase.channel(`${tableName}_changes`).unsubscribe();
      }
      
      this.subscriptions.clear();
      this.notificationCallbacks.clear();
      this.eventUpdateCallbacks.clear();
      this.isConnected = false;
      
      console.log('✅ Calendar Realtime disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting Calendar Realtime:', error);
    }
  }

  public getStatus() {
    return {
      isConnected: this.isConnected,
      subscriptions: Array.from(this.subscriptions.keys()),
      notificationCallbacks: this.notificationCallbacks.size,
      eventUpdateCallbacks: this.eventUpdateCallbacks.size
    };
  }
}

// Export singleton instance
export const calendarRealtimeService = new CalendarRealtimeService();
export default calendarRealtimeService;

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
  type: 'event_created' | 'event_updated' | 'event_deleted' | 'task_created' | 'task_updated' | 'task_deleted' | 'reminder_created' | 'reminder_updated' | 'reminder_deleted' | 'invitee_added';
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
      
      // Enable real-time for calendar invitees (important for notifying invitees)
      await this.enableRealtimeForTable('calendar_invitees');

      this.isConnected = true;
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

  private async handleDatabaseChange(tableName: string, payload: any) {
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

    // Special handling for calendar_invitees - when invitees are added, create proper notification for invitee
    if (tableName === 'calendar_invitees' && eventType === 'INSERT') {
      console.log('🎯 INVITEE INSERT DETECTED:', {
        tableName,
        eventType,
        newRecord,
        newRecord_user_id: newRecord.user_id,
        newRecord_item_id: newRecord.item_id,
        newRecord_item_type: newRecord.item_type
      });
      
      // When an invitee is added, create a proper notification for invitee
      const inviteeNotification = await this.createInviteeNotification(newRecord);
      console.log('📱 INVITEE NOTIFICATION CREATED:', {
        notification: inviteeNotification,
        userId: inviteeNotification?.userId,
        title: inviteeNotification?.title,
        message: inviteeNotification?.message
      });
      
      if (inviteeNotification) {
        console.log('📤 SENDING INVITEE NOTIFICATION TO LISTENERS...');
        await this.notifyListeners(inviteeNotification);
        console.log('✅ INVITEE NOTIFICATION SENT TO LISTENERS');
      } else {
        console.log('❌ FAILED TO CREATE INVITEE NOTIFICATION');
      }
      
      // Also trigger an event update to refresh calendars
      const eventUpdate: RealtimeEventUpdate = {
        type: 'UPDATE',
        table: 'calendar_events',
        schema: 'public',
        record: { id: newRecord.item_id }, // Trigger refresh for this event
        old_record: null,
        timestamp: new Date().toISOString()
      };
      console.log('🔄 TRIGGERING EVENT UPDATE FOR CALENDAR REFRESH:', eventUpdate);
      this.eventUpdateCallbacks.forEach(callback => callback(eventUpdate));
      console.log('✅ EVENT UPDATE TRIGGERED');
    }

    // Convert to calendar notification
    const notification = await this.convertToNotification(tableName, { ...payload, eventType });
    if (notification) {
      await this.notifyListeners(notification);
    }
  }

  private async convertToNotification(tableName: string, payload: any): Promise<CalendarRealtimeNotification | null> {
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
      case 'calendar_invitees':
        notification = await this.createInviteeNotification(record);
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
      userId: record.created_by // Fixed: use created_by instead of created_by_clerk_id
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
      userId: record.created_by // Fixed: use created_by instead of created_by_clerk_id
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

  private async createInviteeNotification(record: any): Promise<CalendarRealtimeNotification> {
    // When an invitee is added, create a notification for them with event details
    const type = 'invitee_added' as any;
    let title = 'Invitación a Evento';
    let message = `Has sido invitado a un evento`;
    
    // Fetch event details for better notification content
    try {
      const event = await this.fetchEventDetailsForInvitee(record.item_id);
      if (event) {
        // Security: Sanitize and validate event title
        const sanitizedTitle = this.sanitizeText(event.title || 'Evento');
        title = `Invitación: ${sanitizedTitle}`;
        
        // Security: Validate and format dates safely
        const startTime = event.start_date ? this.formatSafeTime(event.start_date) : '';
        const date = event.start_date ? this.formatSafeDate(event.start_date) : '';
        message = `Has sido invitado a: ${sanitizedTitle}${date && startTime ? ` - ${date} a las ${startTime}` : ''}`;
      }
    } catch (error) {
      console.error('Error fetching event details for invitee notification:', error);
      // Security: Fallback to safe default message
      title = 'Invitación a Evento';
      message = 'Has sido invitado a un evento';
    }
    
    return {
      type,
      title,
      message,
      data: {
        ...record,
        invitee_id: record.user_id,
        item_id: record.item_id,
        item_type: record.item_type
      },
      timestamp: new Date().toISOString(),
      userId: record.user_id // Send notification to invitee
    };
  }

  private async fetchEventDetailsForInvitee(eventId: string): Promise<any> {
    try {
      const { CalendarService } = await import('./calendarService');
      const events = await CalendarService.getEvents();
      return events.find(e => e.id === eventId);
    } catch (error) {
      console.error('Error fetching event details:', error);
      return null;
    }
  }

  // Security: Text sanitization to prevent XSS and injection attacks
  private sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/&/g, '&amp;') // Escape ampersands
      .replace(/"/g, '&quot;') // Escape quotes
      .replace(/'/g, '&#x27;') // Escape single quotes
      .trim()
      .substring(0, 100); // Limit length
  }

  // Security: Safe date formatting to prevent locale-based attacks
  private formatSafeTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      // Use fixed locale to prevent locale-based attacks
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch (error) {
      return '';
    }
  }

  // Security: Safe date formatting to prevent locale-based attacks
  private formatSafeDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      // Use fixed locale to prevent locale-based attacks
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return '';
    }
  }

  private async notifyListeners(notification: CalendarRealtimeNotification) {
    // Get all relevant users for this notification
    const relevantUsers = await this.getRelevantUsers(notification.data);
    
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
  
  private async getRelevantUsers(record: any): Promise<string[]> {
    const users = new Set<string>();
    
    // For calendar_invitees records, handle specially
    if (record.item_type === 'event' && record.user_id) {
      // This is an invitee record, send notification to the invitee
      users.add(record.user_id);
      
      // Also include the event creator
      try {
        // Import dynamically to avoid circular dependencies
        const { CalendarService } = await import('./calendarService');
        const events = await CalendarService.getEvents();
        const event = events.find(e => e.id === record.item_id);
        if (event && event.created_by) {
          users.add(event.created_by);
        }
      } catch (error) {
        console.error('Error fetching event creator:', error);
      }
      
      return Array.from(users);
    }
    
    // Always include the creator
    if (record.created_by_clerk_id) {
      users.add(record.created_by_clerk_id);
    }
    
    // For events, fetch all invitees from database
    if (record.id && (record.table === 'calendar_events' || record.title || record.start_date)) {
      try {
        // Import dynamically to avoid circular dependencies
        const { CalendarInviteesService } = await import('./calendarInviteesService');
        const invitees = await CalendarInviteesService.getInviteesForItem('event', record.id);
        
        invitees.forEach((invitee: any) => {
          if (invitee.user_id) {
            users.add(invitee.user_id);
          }
        });
      } catch (error) {
        console.error('Error fetching invitees for event:', error);
      }
    }
    
    // For tasks, fetch all assignees from database
    if (record.id && (record.table === 'calendar_tasks' || record.due_date || record.title)) {
      try {
        // Import dynamically to avoid circular dependencies
        const { CalendarInviteesService } = await import('./calendarInviteesService');
        const invitees = await CalendarInviteesService.getInviteesForItem('task', record.id);
        
        invitees.forEach((invitee: any) => {
          if (invitee.user_id) {
            users.add(invitee.user_id);
          }
        });
      } catch (error) {
        console.error('Error fetching invitees for task:', error);
      }
    }
    
    // Include assigned user for tasks
    if (record.assigned_to) {
      users.add(record.assigned_to);
    }
    
    // Include patient
    if (record.paciente_id) {
      users.add(record.paciente_id);
    }
    
    const userList = Array.from(users);
    return userList;
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

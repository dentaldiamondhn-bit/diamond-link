import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { CalendarEventWithPatient } from '../types/calendar';
import { CalendarInvitee } from '../types/calendarInvitees';

interface CalendarRecordData {
  id?: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  due_date?: string;
  created_by?: string;
  created_by_clerk_id?: string;
  assigned_to?: string;
  paciente_id?: string;
  user_id?: string;
  item_id?: string;
  item_type?: string;
  invitee_id?: string;
  invitees?: Array<{ user: string }>;
  table?: string;
}

interface RawChangePayload {
  eventType?: string;
  event?: string;
  new?: Record<string, unknown>;
  record?: Record<string, unknown>;
  old?: Record<string, unknown>;
  schema?: string;
}

interface NormalizedPayload {
  eventType: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
}

type NotificationType = 'event_created' | 'event_updated' | 'event_deleted' | 'task_created' | 'task_updated' | 'task_deleted' | 'reminder_created' | 'reminder_updated' | 'reminder_deleted' | 'invitee_added';

function toNotificationType(eventType: string, prefix: 'event' | 'task' | 'reminder'): NotificationType {
  const suffix = eventType === 'INSERT' ? 'created' : eventType === 'UPDATE' ? 'updated' : 'deleted';
  return `${prefix}_${suffix}` as NotificationType;
}

export interface RealtimeEventUpdate {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  old_record?: CalendarRecordData | null;
  record: CalendarRecordData | null;
  timestamp: string;
}

export interface CalendarRealtimeNotification {
  type: NotificationType;
  title: string;
  message: string;
  data: CalendarRecordData;
  timestamp: string;
  userId?: string;
}

class CalendarRealtimeService {
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private notificationCallbacks: Set<(notification: CalendarRealtimeNotification) => void> = new Set();
  private eventUpdateCallbacks: Set<(update: RealtimeEventUpdate) => void> = new Set();
  private isConnected = false;

  constructor() {
    this.initializeRealtime();
  }

  private async initializeRealtime() {
    try {
      console.log('🚀 Initializing Calendar Realtime Service...');
      
      // Check if Supabase client is available
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      // Enable real-time for calendar events
      await this.enableRealtimeForTable('calendar_events');
      
      // Enable real-time for calendar tasks  
      await this.enableRealtimeForTable('calendar_tasks');
      
      // Enable real-time for calendar reminders
      await this.enableRealtimeForTable('calendar_reminders');
      
      // Enable real-time for calendar invitees (important for notifying invitees)
      await this.enableRealtimeForTable('calendar_invitees');

      this.isConnected = true;
      console.log('✅ Calendar Realtime Service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Calendar Realtime:', error);
      this.isConnected = false;
    }
  }

  private async enableRealtimeForTable(tableName: string) {
    try {
      console.log(`🔍 Attempting to enable realtime for table: ${tableName}`);
      
      const channel = supabase.channel(`${tableName}_changes`);
      
      const subscription = channel.on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: tableName 
        }, 
        (payload) => this.handleDatabaseChange(tableName, payload as unknown as RawChangePayload)
      ).subscribe((status, err) => {
        console.log(`📊 Subscription status for ${tableName}:`, status);
        
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Successfully subscribed to ${tableName}`);
          this.subscriptions.set(tableName, channel);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to ${tableName}:`, err);
        } else if (status === 'TIMED_OUT') {
          console.error(`⏰ Timeout subscribing to ${tableName}:`, err);
        } else if (status === 'CLOSED') {
          console.error(`🔌 Connection closed for ${tableName}:`, err);
        }
      });

    } catch (error) {
      console.error(`❌ Error enabling realtime for ${tableName}:`, error);
    }
  }

  private async handleDatabaseChange(tableName: string, payload: RawChangePayload) {
    // Handle different payload structures
    const eventType = payload.eventType || payload.event || 'UPDATE';
    const newRecord = payload.new || payload.record;
    const oldRecord = payload.old;

    const update: RealtimeEventUpdate = {
      type: eventType as RealtimeEventUpdate['type'],
      table: tableName,
      schema: payload.schema || 'public',
      record: newRecord as CalendarRecordData | null,
      old_record: oldRecord as CalendarRecordData | null,
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
        newRecord_user_id: newRecord?.user_id,
        newRecord_item_id: newRecord?.item_id,
        newRecord_item_type: newRecord?.item_type
      });
      
      // When an invitee is added, create a proper notification for invitee
      const inviteeNotification = await this.createInviteeNotification(newRecord as CalendarRecordData);
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
        record: { id: newRecord?.item_id } as CalendarRecordData,
        old_record: null,
        timestamp: new Date().toISOString()
      };
      console.log('🔄 TRIGGERING EVENT UPDATE FOR CALENDAR REFRESH:', eventUpdate);
      this.eventUpdateCallbacks.forEach(callback => callback(eventUpdate));
      console.log('✅ EVENT UPDATE TRIGGERED');
    }

    // Convert to calendar notification
    const notification = await this.convertToNotification(tableName, { eventType, new: payload.new, old: payload.old });
    if (notification) {
      await this.notifyListeners(notification);
    }
  }

  private async convertToNotification(tableName: string, payload: NormalizedPayload): Promise<CalendarRealtimeNotification | null> {
    const eventType = payload.eventType;
    const record = (payload.new || payload.old) as CalendarRecordData | undefined;

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

  private createEventNotification(eventType: string, record: CalendarRecordData): CalendarRealtimeNotification {
    const type = toNotificationType(eventType, 'event');
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

  private createTaskNotification(eventType: string, record: CalendarRecordData): CalendarRealtimeNotification {
    const type = toNotificationType(eventType, 'task');
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

  private createReminderNotification(eventType: string, record: CalendarRecordData): CalendarRealtimeNotification {
    const type = toNotificationType(eventType, 'reminder');
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

  private async createInviteeNotification(record: CalendarRecordData): Promise<CalendarRealtimeNotification> {
    // When an invitee is added, create a notification for them with event details
    const type: NotificationType = 'invitee_added';
    let title = 'Invitación a Evento';
    let message = `Has sido invitado a un evento`;
    
    // Fetch event details for better notification content
    try {
      const event = await this.fetchEventDetailsForInvitee(record.item_id || '');
      if (event) {
        title = `Invitación: ${event.title || 'Evento'}`;
        const startTime = event.start_date ? new Date(event.start_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
        const date = event.start_date ? new Date(event.start_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) : '';
        message = `Has sido invitado a: ${event.title || 'Evento'}${date && startTime ? ` - ${date} a las ${startTime}` : ''}`;
      }
    } catch (error) {
      console.error('Error fetching event details for invitee notification:', error);
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

  private async fetchEventDetailsForInvitee(eventId: string): Promise<CalendarEventWithPatient | null> {
    try {
      const { CalendarService } = await import('./calendarService');
      const events = await CalendarService.getEvents();
      return events.find(e => e.id === eventId) || null;
    } catch (error) {
      console.error('Error fetching event details:', error);
      return null;
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
  
  private async getRelevantUsers(record: CalendarRecordData): Promise<string[]> {
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
        
        invitees.forEach((invitee: CalendarInvitee) => {
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
        
        invitees.forEach((invitee: CalendarInvitee) => {
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
    if (record?.created_by_clerk_id === userId) {
      return true;
    }

    // Check if user is in invitees (for events)
    if (record?.invitees && Array.isArray(record.invitees)) {
      return record.invitees.some((invitee) => invitee.user === userId);
    }

    // Check if user is assigned (for tasks)
    if (record?.assigned_to === userId) {
      return true;
    }

    // Check if user is the patient
    if (record?.paciente_id === userId) {
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

  public async retryConnections() {
    console.log('🔄 Retrying realtime connections...');
    
    // Clear existing subscriptions
    this.subscriptions.clear();
    this.isConnected = false;
    
    // Reinitialize
    await this.initializeRealtime();
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

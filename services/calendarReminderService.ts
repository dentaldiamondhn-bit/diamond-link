import { CalendarService } from './calendarService';
import { CalendarEventWithPatient } from '../types/calendar';

export class CalendarReminderService {
  // Check for upcoming events and create notifications
  static async checkAndCreateReminders() {
    try {
      const upcomingEvents = await CalendarService.getUpcomingEvents();
      
      for (const event of upcomingEvents) {
        if (event.reminder_minutes && event.reminder_minutes > 0) {
          const eventStart = new Date(event.start_date);
          const reminderTime = new Date(eventStart.getTime() - event.reminder_minutes * 60000);
          const now = new Date();

          // Check if it's time to send reminder (within 5 minutes)
          if (reminderTime <= now && reminderTime > new Date(now.getTime() - 5 * 60000)) {
            await this.createReminderNotification(event);
          }
        }
      }
    } catch (error) {
      console.error('Error checking calendar reminders:', error);
    }
  }

  // Create notification for calendar event
  static async createEventNotification(event: CalendarEventWithPatient, type: 'created' | 'updated' | 'cancelled') {
    try {
      const notificationData = {
        type: 'calendar_event',
        title: this.getEventNotificationTitle(event, type),
        message: this.getEventNotificationMessage(event, type),
        metadata: {
          eventId: event.id,
          eventTitle: event.title,
          eventTime: new Date(event.start_date),
          patientName: event.patient?.nombre_completo,
          patientId: event.patient?.paciente_id,
        }
      };

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });

      if (!response.ok) {
        console.error('Error creating calendar event notification:', await response.text());
      }
    } catch (error) {
      console.error('Error creating calendar event notification:', error);
    }
  }

  // Create notification for reminder
  static async createReminderNotification(event: CalendarEventWithPatient) {
    try {
      const notificationData = {
        type: 'calendar_reminder',
        title: `Recordatorio: ${event.title}`,
        message: this.getReminderMessage(event),
        metadata: {
          eventId: event.id,
          eventTitle: event.title,
          eventTime: new Date(event.start_date),
          patientName: event.patient?.nombre_completo,
          patientId: event.patient?.paciente_id,
        }
      };

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });

      if (!response.ok) {
        console.error('Error creating calendar reminder notification:', await response.text());
      }
    } catch (error) {
      console.error('Error creating calendar reminder notification:', error);
    }
  }

  private static getEventNotificationTitle(event: CalendarEventWithPatient, type: 'created' | 'updated' | 'cancelled'): string {
    const patientName = event.patient?.nombre_completo || 'Sin paciente';
    
    switch (type) {
      case 'created':
        return `Nueva cita: ${event.title}`;
      case 'updated':
        return `Cita actualizada: ${event.title}`;
      case 'cancelled':
        return `Cita cancelada: ${event.title}`;
      default:
        return `Cita: ${event.title}`;
    }
  }

  private static getEventNotificationMessage(event: CalendarEventWithPatient, type: 'created' | 'updated' | 'cancelled'): string {
    const eventDate = new Date(event.start_date);
    const formattedDate = eventDate.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const patientName = event.patient?.nombre_completo || 'Sin paciente';
    
    switch (type) {
      case 'created':
        return `Cita agendada para ${patientName} el ${formattedDate}`;
      case 'updated':
        return `Cita modificada para ${patientName} el ${formattedDate}`;
      case 'cancelled':
        return `Cita cancelada para ${patientName} el ${formattedDate}`;
      default:
        return `Cita para ${patientName} el ${formattedDate}`;
    }
  }

  private static getReminderMessage(event: CalendarEventWithPatient): string {
    const eventDate = new Date(event.start_date);
    const formattedDate = eventDate.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const patientName = event.patient?.nombre_completo || 'Sin paciente';
    const minutesBefore = event.reminder_minutes || 0;
    
    if (minutesBefore === 0) {
      return `Tu cita "${event.title}" es ahora mismo para ${patientName}`;
    } else if (minutesBefore < 60) {
      return `Tu cita "${event.title}" con ${patientName} es en ${minutesBefore} minutos (${formattedDate})`;
    } else {
      const hours = Math.floor(minutesBefore / 60);
      return `Tu cita "${event.title}" con ${patientName} es en ${hours} hora(s) (${formattedDate})`;
    }
  }
}

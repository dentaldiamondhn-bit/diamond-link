import { BellNotification } from '../contexts/BellNotificationContext';

export class NotificationService {
  static async addNotification(notification: Omit<BellNotification, 'id' | 'timestamp' | 'read'>): Promise<void> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add notification');
      }
      
      console.log('Notification added via API:', notification);
    } catch (error) {
      console.error('Error adding notification:', error);
      throw error;
    }
  }

  static async getNotifications(userId?: string): Promise<BellNotification[]> {
    try {
      const response = await fetch('/api/notifications', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const notifications = await response.json();
      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          action: 'markAsRead'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  static async markAllAsRead(): Promise<void> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'markAllAsRead'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  static async removeNotification(notificationId: string): Promise<void> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          action: 'remove'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove notification');
      }
    } catch (error) {
      console.error('Error removing notification:', error);
      throw error;
    }
  }

  static async clearAll(): Promise<void> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'clearAll'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear all notifications');
      }
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      throw error;
    }
  }

  // Helper functions for specific notification types
  static async notifyPatientCreated(patientName: string, userId: string, userName: string): Promise<void> {
    await this.addNotification({
      type: 'patient_created',
      title: 'Nuevo paciente registrado',
      message: `Se ha creado una nueva historia para ${patientName}`,
      metadata: {
        patientName,
        userId,
        userName
      }
    });
  }

  static async notifyPatientUpdated(patientName: string, userId: string, userName: string): Promise<void> {
    await this.addNotification({
      type: 'patient_updated',
      title: 'Historia de paciente actualizada',
      message: `Se ha actualizado la historia de ${patientName}`,
      metadata: {
        patientName,
        userId,
        userName
      }
    });
  }

  static async notifyUpcomingEvent(eventTitle: string, eventTime: Date, minutesUntil: number): Promise<void> {
    let timeText = '';
    if (minutesUntil <= 5) {
      timeText = 'en menos de 5 minutos';
    } else if (minutesUntil <= 15) {
      timeText = 'en menos de 15 minutos';
    } else if (minutesUntil <= 30) {
      timeText = 'en menos de 30 minutos';
    } else if (minutesUntil <= 60) {
      timeText = 'en menos de 1 hora';
    } else {
      timeText = `en ${Math.floor(minutesUntil / 60)} horas`;
    }

    await this.addNotification({
      type: 'event',
      title: 'Próxima cita',
      message: `${eventTitle} ${timeText}`,
      metadata: {
        eventTitle,
        eventTime
      }
    });
  }
}

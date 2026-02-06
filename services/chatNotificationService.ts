export class ChatNotificationService {
  
  /**
   * Create a notification for a new chat message
   */
  static async createMessageNotification(
    message: any,
    roomName: string,
    recipientIds: string[]
  ): Promise<void> {
    try {
      // Create notification for the existing notification system
      const notification = {
        type: 'chat_message',
        title: `New message in ${roomName}`,
        message: `${message.senderName}: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`,
        metadata: {
          roomId: message.roomId || 'unknown',
          roomName: roomName,
          senderId: message.senderId,
          senderName: message.senderName,
          timestamp: new Date().toISOString()
        },
        recipientIds: recipientIds,
        read: false,
        createdAt: new Date().toISOString()
      };

      // Try to integrate with existing notification API
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification)
      });

      if (!response.ok) {
        console.warn('Failed to create notification via API, falling back to localStorage');
        // Fallback to localStorage for demo
        this.createLocalStorageNotification(notification);
      } else {
        console.log('Chat notification created successfully:', notification);
      }
      
    } catch (error) {
      console.error('Failed to create chat notification:', error);
      // Fallback to localStorage
      this.createLocalStorageNotification({
        type: 'chat_message',
        title: `New message in ${roomName}`,
        message: `${message.senderName}: ${message.content}`,
        metadata: { roomId: message.roomId, roomName },
        recipientIds: [],
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  /**
   * Fallback localStorage notification for demo
   */
  private static createLocalStorageNotification(notification: any) {
    try {
      const existingNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      existingNotifications.unshift({
        ...notification,
        id: `chat_${Date.now()}_${Math.random()}`
      });
      localStorage.setItem('notifications', JSON.stringify(existingNotifications.slice(0, 50))); // Keep only 50 most recent
      console.log('Local notification created:', notification);
    } catch (error) {
      console.error('Failed to create local notification:', error);
    }
  }

  /**
   * Create a notification for a room invitation
   */
  static async createRoomInviteNotification(
    roomName: string,
    inviterName: string,
    recipientIds: string[]
  ): Promise<void> {
    try {
      const notification = {
        type: 'chat_room_invite',
        title: 'Chat Room Invitation',
        message: `${inviterName} invited you to join "${roomName}"`,
        metadata: {
          roomName: roomName,
          inviterName: inviterName
        },
        recipientIds: recipientIds,
        read: false,
        createdAt: new Date().toISOString()
      };

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification)
      });

      if (!response.ok) {
        this.createLocalStorageNotification(notification);
      }
      
    } catch (error) {
      console.error('Failed to create room invite notification:', error);
      this.createLocalStorageNotification({
        type: 'chat_room_invite',
        title: 'Chat Room Invitation',
        message: `${inviterName} invited you to join "${roomName}"`,
        metadata: { roomName, inviterName },
        recipientIds: [],
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  }
}

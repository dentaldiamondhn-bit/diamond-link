import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { ChatService } from './chatService';

export class ChatWebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, any> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: { origin: "http://localhost:3000" }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: any) => {
      console.log(`User connected: ${socket.userId}`);
      
      // Join rooms
      socket.on('join_room', (roomId: string) => {
        socket.join(roomId);
      });

      // Send message
      socket.on('send_message', async (data: any) => {
        try {
          const message = await ChatService.sendMessage(
            data.roomId,
            data.content,
            socket.userId,
            'text'
          );

          // Broadcast to room
          this.io.to(data.roomId).emit('new_message', {
            id: message.id,
            content: data.content, // Decrypted content for UI
            senderId: socket.userId,
            timestamp: message.created_at
          });
        } catch (error) {
          socket.emit('error', 'Failed to send message');
        }
      });

      // Typing indicators
      socket.on('typing_start', (roomId: string) => {
        socket.to(roomId).emit('user_typing', { userId: socket.userId, typing: true });
      });

      socket.on('typing_stop', (roomId: string) => {
        socket.to(roomId).emit('user_typing', { userId: socket.userId, typing: false });
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.userId}`);
        this.connectedUsers.delete(socket.userId);
      });
    });
  }

  // Get online users
  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  // Send notification to specific user
  sendNotificationToUser(userId: string, notification: any) {
    const userSocket = this.connectedUsers.get(userId);
    if (userSocket) {
      userSocket.emit('notification', notification);
    }
  }
}

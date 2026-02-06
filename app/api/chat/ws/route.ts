import { NextRequest } from 'next/server';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';

// Store active connections by userId
const connections = new Map<string, WebSocket>();
const conversationSubscriptions = new Map<string, Set<string>>(); // conversationId -> Set of userIds

export async function GET(request: NextRequest) {
  // Upgrade the HTTP connection to WebSocket
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return new Response('User ID is required', { status: 400 });
  }

  // @ts-ignore - WebSocket upgrade is handled by Next.js
  const wsServer = new WebSocketServer({ noServer: true });

  return new Response('WebSocket endpoint', {
    status: 200,
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
    },
  });
}

// This would typically be handled by a proper WebSocket server setup
// For now, we'll create a simple mock implementation
class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, WebSocket> = new Map();
  private conversationSubscriptions: Map<string, Set<string>> = new Map();

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  addConnection(userId: string, ws: WebSocket) {
    // Remove existing connection if any
    this.removeConnection(userId);
    
    this.connections.set(userId, ws);
    console.log(`User ${userId} connected. Total connections: ${this.connections.size}`);

    ws.on('close', () => {
      this.removeConnection(userId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for user ${userId}:`, error);
      this.removeConnection(userId);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(userId, message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
  }

  removeConnection(userId: string) {
    const ws = this.connections.get(userId);
    if (ws) {
      ws.close();
      this.connections.delete(userId);
      
      // Remove from all conversation subscriptions
      for (const [conversationId, subscribers] of this.conversationSubscriptions.entries()) {
        subscribers.delete(userId);
        if (subscribers.size === 0) {
          this.conversationSubscriptions.delete(conversationId);
        }
      }
      
      console.log(`User ${userId} disconnected. Total connections: ${this.connections.size}`);
    }
  }

  private handleMessage(senderId: string, message: any) {
    console.log(`Message from ${senderId}:`, message);

    switch (message.type) {
      case 'subscribe':
        this.subscribeToConversation(senderId, message.conversationId);
        break;
      case 'unsubscribe':
        this.unsubscribeFromConversation(senderId, message.conversationId);
        break;
      case 'new_message':
        this.broadcastToConversation(senderId, message.conversationId, message);
        break;
      case 'typing':
        this.broadcastToConversation(senderId, message.conversationId, message, true);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  subscribeToConversation(userId: string, conversationId: string) {
    if (!this.conversationSubscriptions.has(conversationId)) {
      this.conversationSubscriptions.set(conversationId, new Set());
    }
    this.conversationSubscriptions.get(conversationId)!.add(userId);
    console.log(`User ${userId} subscribed to conversation ${conversationId}`);
  }

  unsubscribeFromConversation(userId: string, conversationId: string) {
    const subscribers = this.conversationSubscriptions.get(conversationId);
    if (subscribers) {
      subscribers.delete(userId);
      if (subscribers.size === 0) {
        this.conversationSubscriptions.delete(conversationId);
      }
    }
    console.log(`User ${userId} unsubscribed from conversation ${conversationId}`);
  }

  broadcastToConversation(senderId: string, conversationId: string, message: any, includeSender = false) {
    const subscribers = this.conversationSubscriptions.get(conversationId);
    if (!subscribers) return;

    const fullMessage = {
      ...message,
      senderId,
      timestamp: new Date().toISOString()
    };

    subscribers.forEach(userId => {
      // Skip sender if includeSender is false
      if (!includeSender && userId === senderId) return;

      const ws = this.connections.get(userId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(fullMessage));
          console.log(`Broadcast message to user ${userId} in conversation ${conversationId}`);
        } catch (error) {
          console.error(`Failed to send message to user ${userId}:`, error);
        }
      }
    });
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getConversationSubscriberCount(conversationId: string): number {
    return this.conversationSubscriptions.get(conversationId)?.size || 0;
  }
}

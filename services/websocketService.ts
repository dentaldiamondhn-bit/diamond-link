export interface WebSocketMessage {
  type: 'new_message' | 'typing' | 'user_online' | 'user_offline' | 'subscribe' | 'unsubscribe';
  conversationId: string;
  data: any;
  senderId: string;
  timestamp: string;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(message: WebSocketMessage) => void>> = new Map();
  private isConnecting = false;
  private fallbackMode = false;

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.fallbackMode) {
        console.log('WebSocket in fallback mode - using polling');
        resolve();
        return;
      }

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/chat/ws?userId=${userId}`;
        
        console.log('Connecting to WebSocket:', wsUrl);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('WebSocket message received:', message);
            this.notifyListeners(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.ws = null;
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect(userId);
          } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnect attempts reached, switching to fallback mode');
            this.fallbackMode = true;
            resolve(); // Resolve in fallback mode
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          
          // If WebSocket fails immediately, switch to fallback mode
          if (this.reconnectAttempts === 0) {
            console.log('WebSocket failed immediately, switching to fallback mode');
            this.fallbackMode = true;
            resolve(); // Resolve in fallback mode instead of rejecting
          } else {
            reject(error);
          }
        };

      } catch (error) {
        this.isConnecting = false;
        console.log('WebSocket connection failed, switching to fallback mode');
        this.fallbackMode = true;
        resolve(); // Resolve in fallback mode instead of rejecting
      }
    });
  }

  private scheduleReconnect(userId: string) {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect(userId).catch(error => {
          console.error('Reconnect failed:', error);
        });
      }
    }, delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
    this.fallbackMode = false;
  }

  sendMessage(message: Omit<WebSocketMessage, 'senderId' | 'timestamp'>) {
    if (this.fallbackMode) {
      console.log('WebSocket in fallback mode - message not sent:', message);
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const fullMessage: WebSocketMessage = {
        ...message,
        senderId: '', // Will be set by server
        timestamp: new Date().toISOString()
      };
      
      console.log('Sending WebSocket message:', fullMessage);
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  subscribe(conversationId: string, callback: (message: WebSocketMessage) => void) {
    if (!this.listeners.has(conversationId)) {
      this.listeners.set(conversationId, new Set());
    }
    this.listeners.get(conversationId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(conversationId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(conversationId);
        }
      }
    };
  }

  private notifyListeners(message: WebSocketMessage) {
    const listeners = this.listeners.get(message.conversationId);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('Error in WebSocket listener callback:', error);
        }
      });
    }
  }

  isConnected(): boolean {
    return this.fallbackMode || (this.ws !== null && this.ws.readyState === WebSocket.OPEN);
  }

  getConnectionState(): string {
    if (this.fallbackMode) return 'fallback';
    if (!this.ws) return 'disconnected';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }

  isFallbackMode(): boolean {
    return this.fallbackMode;
  }
}

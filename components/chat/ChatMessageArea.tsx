'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { ConversationService, ConversationMessage } from '../../services/conversationService';
import { ChatNotificationService } from '../../services/chatNotificationService';
import { ClerkUserService, ClerkUser } from '../../services/clerkUserService';
import { WebSocketService, WebSocketMessage } from '../../services/websocketService';
import { EmojiPicker } from './EmojiPicker';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'system';
}

interface ChatMessageAreaProps {
  conversationId: string;
  conversationName?: string;
  conversationType?: string;
}

export const ChatMessageArea: React.FC<ChatMessageAreaProps> = ({ conversationId, conversationName, conversationType }) => {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [userCache, setUserCache] = useState<{ [key: string]: ClerkUser }>({});
  const [conversationAvatar, setConversationAvatar] = useState<string>('');
  const [conversationParticipantName, setConversationParticipantName] = useState<string>('');
  const [wsConnection, setWsConnection] = useState<WebSocketService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load real messages from database
  useEffect(() => {
    if (conversationId) {
      console.log('ChatMessageArea: conversationId changed to:', conversationId);
      loadMessages();
      loadConversationAvatar();
    } else {
      console.log('ChatMessageArea: No conversationId provided');
      setMessages([]);
    }
  }, [conversationId]);

  // Scroll to bottom when conversation loads
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [conversationId]);

  // WebSocket connection and message handling
  useEffect(() => {
    if (!user?.id || !conversationId) return;

    const wsService = WebSocketService.getInstance();
    
    const connectWebSocket = async () => {
      try {
        await wsService.connect(user.id);
        setWsConnection(wsService);
        
        if (wsService.isFallbackMode()) {
          console.log('WebSocket in fallback mode - using periodic polling');
          setIsConnected(true);
          // Start periodic polling for new messages (reduced frequency)
          const pollInterval = setInterval(() => {
            loadMessages();
          }, 3000); // Reduced to 3 seconds for faster updates
          
          return () => clearInterval(pollInterval);
        } else {
          setIsConnected(true);
          
          // Subscribe to conversation
          wsService.sendMessage({
            type: 'subscribe',
            conversationId: conversationId,
            data: {}
          });
          
          // Listen for messages
          const unsubscribe = wsService.subscribe(conversationId, (message: WebSocketMessage) => {
            handleWebSocketMessage(message);
          });
          
          return unsubscribe;
        }
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setIsConnected(false);
        
        // Start polling as fallback (reduced frequency)
        const pollInterval = setInterval(() => {
          loadMessages();
        }, 3000); // Reduced to 3 seconds
        
        return () => clearInterval(pollInterval);
      }
    };

    const unsubscribePromise = connectWebSocket();
    
    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
      
      // Unsubscribe from conversation if not in fallback mode
      if (wsService && !wsService.isFallbackMode()) {
        wsService.sendMessage({
          type: 'unsubscribe',
          conversationId: conversationId,
          data: {}
        });
      }
    };
  }, [user?.id, conversationId]);

  const handleWebSocketMessage = async (message: WebSocketMessage) => {
    console.log('Handling WebSocket message:', message);
    
    switch (message.type) {
      case 'new_message':
        // Add new message to the list
        const newMsg: Message = {
          id: message.data.id || `ws_${Date.now()}`,
          content: message.data.content,
          senderId: message.senderId,
          senderName: message.data.senderName || 'Unknown User',
          senderAvatar: message.data.senderAvatar,
          timestamp: new Date(message.timestamp),
          type: message.data.type || 'text'
        };
        
        setMessages(prev => {
          // Avoid duplicate messages
          if (prev.some(msg => msg.id === newMsg.id)) {
            return prev;
          }
          return [...prev, newMsg];
        });
        
        // Scroll to bottom
        setTimeout(() => scrollToBottom(), 100);
        break;
        
      case 'typing':
        setIsTyping(message.data.isTyping);
        break;
        
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  };

  // Preload user data when component mounts (only if cache is empty)
  useEffect(() => {
    const preloadUsers = async () => {
      // Only preload if cache is empty to avoid repeated API calls
      if (Object.keys(userCache).length > 0) {
        console.log('Users already cached, skipping preload');
        return;
      }

      try {
        console.log('Preloading all users...');
        const users = await ClerkUserService.getAllUsers();
        console.log('Preloaded users:', users.length);
        
        // Cache all users to prevent repeated API calls
        const userMap: { [key: string]: ClerkUser } = {};
        users.forEach(user => {
          userMap[user.id] = user;
        });
        setUserCache(userMap);
      } catch (error) {
        console.error('Error preloading users:', error);
      }
    };
    
    preloadUsers();
  }, []); // Only run once on mount

  // Function to get user info with caching
  const getUserInfo = async (userId: string): Promise<ClerkUser | null> => {
    console.log('getUserInfo called for:', userId);
    console.log('Current userCache:', Object.keys(userCache));
    
    if (userCache[userId]) {
      console.log('Found user in cache:', userCache[userId].firstName || userCache[userId].emailAddress);
      return userCache[userId];
    }

    try {
      console.log('Fetching user from API for:', userId);
      const userInfo = await ClerkUserService.getUserById(userId);
      if (userInfo) {
        console.log('User info fetched:', userInfo.firstName || userInfo.emailAddress);
        setUserCache(prev => ({ ...prev, [userId]: userInfo }));
      } else {
        console.log('User not found for ID:', userId);
      }
      return userInfo;
    } catch (error) {
      console.error('Error loading user:', error);
      return null;
    }
  };

  // Load conversation avatar for direct messages
  const loadConversationAvatar = async () => {
    if (conversationType === 'direct' && conversationId) {
      try {
        console.log('Loading conversation avatar for direct message:', conversationId);
        
        // Get conversation details to find participants
        const conversation = await ConversationService.getConversationById(conversationId);
        console.log('Conversation details:', conversation);
        
        if (conversation && conversation.participant_ids) {
          // Find the participant who is NOT the current user
          const otherUserId = conversation.participant_ids.find(id => id !== user?.id);
          console.log('Other participant ID:', otherUserId);
          
          if (otherUserId) {
            const userInfo = await getUserInfo(otherUserId);
            console.log('Other user info:', userInfo?.firstName || userInfo?.emailAddress);
            if (userInfo?.imageUrl) {
              console.log('Setting conversation avatar:', userInfo.imageUrl);
              setConversationAvatar(userInfo.imageUrl);
            }
            if (userInfo) {
              const displayName = ClerkUserService.getUserDisplayName(userInfo);
              console.log('Setting conversation participant name:', displayName);
              setConversationParticipantName(displayName);
            }
          } else {
            console.log('No other participant found, trying current user avatar');
            // If no other participant, use current user's avatar and name
            if (user?.imageUrl) {
              setConversationAvatar(user.imageUrl);
            }
            if (user?.firstName || user?.lastName || user?.emailAddresses?.[0]?.emailAddress) {
              const displayName = user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user.firstName || user.emailAddresses?.[0]?.emailAddress || 'You';
              setConversationParticipantName(displayName);
            }
          }
        } else {
          console.log('No conversation details found, falling back to message-based detection');
          // Fallback to original method
          const messages = await ConversationService.getConversationMessages(conversationId);
          console.log('Messages for avatar loading:', messages.length);
          
          const otherUserId = messages.find(msg => msg.sender_clerk_id !== user?.id)?.sender_clerk_id;
          console.log('Other user ID from messages:', otherUserId);
          
          if (otherUserId) {
            const userInfo = await getUserInfo(otherUserId);
            console.log('Other user info from messages:', userInfo?.firstName || userInfo?.emailAddress);
            if (userInfo?.imageUrl) {
              console.log('Setting conversation avatar from messages:', userInfo.imageUrl);
              setConversationAvatar(userInfo.imageUrl);
            }
            if (userInfo) {
              const displayName = ClerkUserService.getUserDisplayName(userInfo);
              console.log('Setting conversation participant name from messages:', displayName);
              setConversationParticipantName(displayName);
            }
          }
        }
      } catch (error) {
        console.error('Error loading conversation avatar:', error);
      }
    }
  };

  const loadMessages = async () => {
    try {
      setIsConnected(true);
      console.log('Loading messages for conversation:', conversationId);
      const messages = await ConversationService.getConversationMessages(conversationId);
      
      console.log('Raw messages from DB:', messages);
      
      // Transform database messages to our interface and fetch user info
      const transformedMessages: Message[] = await Promise.all(messages.map(async (msg) => {
        const content = msg.content || 'No content';
        console.log('Processing message:', { id: msg.id, content, sender: msg.sender_clerk_id });
        
        // Get user information for this message
        const userInfo = await getUserInfo(msg.sender_clerk_id);
        const senderName = userInfo ? ClerkUserService.getUserDisplayName(userInfo) : 'Unknown User';
        const senderAvatar = userInfo?.imageUrl;
        
        return {
          id: msg.id,
          content: content,
          senderId: msg.sender_clerk_id,
          senderName: senderName,
          senderAvatar: senderAvatar,
          timestamp: new Date(msg.created_at),
          type: msg.message_type || 'text'
        };
      }));
      
      console.log('Transformed messages:', transformedMessages);
      setMessages(transformedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      // Fallback to mock data if database fails
      const mockMessages: Message[] = [
        {
          id: '1',
          content: 'Welcome to the chat! This is a secure HIPAA-compliant conversation.',
          senderId: 'system',
          senderName: 'System',
          timestamp: new Date(Date.now() - 3600000),
          type: 'system'
        }
      ];
      setMessages(mockMessages);
      setIsConnected(true);
    }
  };

  useEffect(() => {
    // Only auto-scroll if user is already at the bottom or if it's a new conversation
    const scrollContainer = messagesEndRef.current?.parentElement;
    if (scrollContainer) {
      const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 50;
      if (isAtBottom || messages.length === 0) {
        scrollToBottom();
      }
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // TODO: Implement file upload
      console.log('File selected:', files[0]);
      setShowAttachmentMenu(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !conversationId) return;

    const message: Message = {
      id: `temp_${Date.now()}`,
      content: newMessage.trim(),
      senderId: user.id,
      senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress || 'Unknown',
      senderAvatar: user.imageUrl,
      timestamp: new Date(),
      type: 'text'
    };
    
    // Add message to UI immediately for better UX
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    try {
      // Send message via WebSocket first for real-time delivery (if not in fallback mode)
      if (wsConnection && wsConnection.isConnected() && !wsConnection.isFallbackMode()) {
        wsConnection.sendMessage({
          type: 'new_message',
          conversationId: conversationId,
          data: {
            id: message.id,
            content: message.content,
            senderName: message.senderName,
            senderAvatar: message.senderAvatar,
            type: message.type
          }
        });
      } else if (wsConnection?.isFallbackMode()) {
        console.log('WebSocket in fallback mode - skipping real-time broadcast');
      }
      
      // Always send via database for persistence
      await ConversationService.sendMessage(conversationId, user.id, newMessage.trim());
      
      // Send notification to other participants only (not the sender)
      const conversation = await ConversationService.getConversationById(conversationId);
      const recipientIds = conversation?.participant_ids?.filter(id => id !== user?.id) || [];
      
      if (recipientIds.length > 0) {
        await ChatNotificationService.createMessageNotification(
          message,
          conversationName || 'Chat',
          recipientIds
        );
      }
      
      // If in fallback mode, trigger a quick refresh to get the new message
      if (wsConnection?.isFallbackMode()) {
        setTimeout(() => loadMessages(), 500); // Reduced from 1000ms to 500ms for faster updates
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove the temporary message if it failed
      setMessages(prev => prev.filter(msg => msg.id !== message.id));
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [date: string]: Message[] } = {};
    
    messages.forEach(message => {
      const dateKey = message.timestamp.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="absolute inset-0 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Fixed Header - Absolutely positioned */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {conversationAvatar ? (
              <img 
                src={conversationAvatar} 
                alt={conversationName || 'User'} 
                className="w-10 h-10 rounded-xl object-cover"
              />
            ) : (
              <div className={`w-10 h-10 ${
                conversationType === 'direct' 
                  ? 'bg-gradient-to-br from-blue-400 to-blue-600' 
                  : conversationType === 'patient_case'
                  ? 'bg-gradient-to-br from-purple-400 to-purple-600'
                  : 'bg-gradient-to-br from-teal-400 to-teal-600'
              } rounded-xl flex items-center justify-center`}>
                <i className={`fas ${
                  conversationType === 'direct' 
                    ? 'fa-user' 
                    : conversationType === 'patient_case'
                    ? 'fa-user-injured'
                    : 'fa-users'
                } text-white`}></i>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {conversationParticipantName || conversationName || (conversationType === 'direct' ? 'Direct Message' : conversationType === 'patient_case' ? 'Patient Case' : 'Team Chat')}
              </h3>
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                <span className="text-slate-600 dark:text-slate-400">
                  {isConnected ? 'Connected' : 'Connecting...'}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {Object.keys(messageGroups).reduce((acc, date) => acc + messageGroups[date].length, 0)} messages
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <i className="fas fa-phone"></i>
            </button>
            <button className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <i className="fas fa-video"></i>
            </button>
            <button className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <i className="fas fa-info-circle"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Messages Area - Absolutely positioned with proper bounds */}
      <div className="absolute inset-0 overflow-y-auto pt-20 pb-32 px-6">
        {Object.entries(messageGroups).map(([dateKey, dateMessages]) => (
          <div key={dateKey}>
            {/* Date Divider */}
            <div className="flex items-center justify-center mb-4">
              <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {formatDate(new Date(dateKey))}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-4">
              {dateMessages.map((message) => (
                <div key={message.id} className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-lg ${message.senderId === user?.id ? 'order-2' : 'order-1'}`}>
                    {message.type === 'system' ? (
                      <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                          {message.content}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className={`flex items-end space-x-2 ${message.senderId === user?.id ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          {/* User Avatar */}
                          {message.senderAvatar ? (
                            <img 
                              src={message.senderAvatar} 
                              alt={message.senderName} 
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <i className="fas fa-user text-slate-600 dark:text-slate-400 text-xs"></i>
                            </div>
                          )}
                          
                          {/* Message Bubble */}
                          <div className={`px-4 py-2 rounded-lg ${
                            message.senderId === user?.id
                              ? 'bg-teal-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                          }`}>
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                        <div className={`flex items-center space-x-2 mt-1 text-xs ${
                          message.senderId === user?.id ? 'justify-end' : 'justify-start'
                        } ${message.senderId === user?.id ? 'flex-row-reverse' : ''}`}>
                          <span className="text-slate-500 dark:text-slate-400">
                            {message.senderName}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-400">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Message Input - Absolutely positioned */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          {/* Attachment Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <i className="fas fa-paperclip"></i>
            </button>
            
            {showAttachmentMenu && (
              <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  📄 Upload File
                </button>
                <button
                  type="button"
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  📷 Share Image
                </button>
                <button
                  type="button"
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  📍 Share Location
                </button>
              </div>
            )}
          </div>
          
          {/* Emoji Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              😊
            </button>
            
            {showEmojiPicker && (
              <EmojiPicker
                onEmojiSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>
          
          {/* Message Input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
            />
          </div>
          
          {/* Send Button */}
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
        
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
      </div>
    </div>
  );
};

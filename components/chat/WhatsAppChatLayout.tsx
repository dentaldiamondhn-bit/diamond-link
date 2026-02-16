'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useUser } from '@clerk/nextjs';
import { WhatsAppConversationList } from './WhatsAppConversationList';
import { WhatsAppChatWindow } from './WhatsAppChatWindow';
import { ConversationService, Conversation, ConversationMessage } from '../../services/conversationService';

interface WhatsAppConversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline?: boolean;
  type: 'direct' | 'group' | 'patient';
  participants?: string[];
}

// Error boundary component
class ChatErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('WhatsAppChatLayout Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Algo salió mal
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {this.state.error?.message || 'Ha ocurrido un error en el chat'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const WhatsAppChatLayout: React.FC = () => {
  const { user, isLoaded } = useUser();
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isMobileView, setIsMobileView] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);

  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set current user ID
  useEffect(() => {
    if (user) {
      setCurrentUserId(user.id);
    }
  }, [user]);

  // Load conversations
  useEffect(() => {
    if (isLoaded && user) {
      loadConversations();
    }
  }, [isLoaded, user]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await ConversationService.getUserConversations(user?.id || '');
      
      // Convert to WhatsApp format
      const waConversations: WhatsAppConversation[] = data.map((conv: Conversation) => ({
        id: conv.id,
        name: conv.name || 'Unknown',
        lastMessage: conv.last_message,
        lastMessageTime: conv.last_message_time,
        unreadCount: conv.unread_count || 0,
        type: conv.type as 'direct' | 'group' | 'patient',
        participants: conv.participant_ids
      }));
      
      setConversations(waConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationSelect = async (conversation: WhatsAppConversation) => {
    setSelectedConversation(conversation);
    if (isMobileView) {
      setShowConversationList(false);
    }
    await loadMessages(conversation.id);
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const data = await ConversationService.getConversationMessages(conversationId);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (content: string, messageType: 'text' | 'image' | 'file' = 'text') => {
    if (!selectedConversation || !currentUserId) return;

    try {
      const newMessage = await ConversationService.sendMessage(
        selectedConversation.id,
        currentUserId,
        content,
        messageType
      );
      
      setMessages(prev => [...prev, newMessage]);
      
      // Update conversation last message
      setConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { ...conv, lastMessage: content, lastMessageTime: new Date().toISOString() }
            : conv
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleBackToList = () => {
    setShowConversationList(true);
    setSelectedConversation(null);
  };

  const handleNewConversation = () => {
    // Could open a modal to create new conversation
    console.log('Create new conversation');
  };

  if (!isLoaded) {
    return (
      <div className="h-screen bg-gray-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <ChatErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <i className="fas fa-comments text-white text-3xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Chat de Clínica Dental
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Por favor inicia sesión para acceder al chat
            </p>
          </div>
        </div>
      </ChatErrorBoundary>
    );
  }

  return (
    <ChatErrorBoundary>
      <div className="h-screen bg-gray-100 dark:bg-slate-900 flex overflow-hidden">
        {/* Conversation List Panel */}
        {(showConversationList || !isMobileView) && (
          <div className={`${isMobileView && selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 bg-white dark:bg-slate-800 flex-col border-r border-gray-200 dark:border-slate-700`}>
            <WhatsAppConversationList
              conversations={conversations}
              selectedConversationId={selectedConversation?.id || null}
              onConversationSelect={handleConversationSelect}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onNewConversation={handleNewConversation}
              currentUserId={currentUserId}
              loading={loading}
            />
          </div>
        )}

        {/* Chat Window Panel */}
        {(!showConversationList || !isMobileView) && (
          <div className={`${isMobileView && !selectedConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
            {selectedConversation ? (
              <WhatsAppChatWindow
                conversation={selectedConversation}
                messages={messages}
                currentUserId={currentUserId}
                onSendMessage={handleSendMessage}
                onBack={handleBackToList}
                loading={loadingMessages}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-slate-800">
                <div className="text-center max-w-md mx-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-teal-400 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <i className="fas fa-comments text-white text-4xl"></i>
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                    Bienvenido al Chat
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">
                    Selecciona una conversación para comenzar a chatear
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-700 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-600">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <i className="fas fa-users text-blue-600 dark:text-blue-400"></i>
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm">Chat de Equipo</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Colabora con tu equipo</p>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-700 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-600">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <i className="fas fa-user text-green-600 dark:text-green-400"></i>
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm">Mensajes Directos</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Conversaciones uno a uno</p>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-700 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-600">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <i className="fas fa-user-injured text-purple-600 dark:text-purple-400"></i>
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm">Casos de Pacientes</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Discusiones seguras</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ChatErrorBoundary>
  );
};

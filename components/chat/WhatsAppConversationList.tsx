'use client';

import React from 'react';

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

interface WhatsAppConversationListProps {
  conversations: WhatsAppConversation[];
  selectedConversationId: string | null;
  onConversationSelect: (conversation: WhatsAppConversation) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewConversation: () => void;
  currentUserId: string;
  loading: boolean;
}

export const WhatsAppConversationList: React.FC<WhatsAppConversationListProps> = ({
  conversations,
  selectedConversationId,
  onConversationSelect,
  searchQuery,
  onSearchChange,
  onNewConversation,
  loading
}) => {
  // Format timestamp for display
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  };

  // Get conversation icon based on type
  const getConversationIcon = (type: 'direct' | 'group' | 'patient') => {
    switch (type) {
      case 'group':
        return 'fa-users';
      case 'patient':
        return 'fa-user-injured';
      default:
        return 'fa-user';
    }
  };

  // Get conversation icon color
  const getIconColor = (type: 'direct' | 'group' | 'patient') => {
    switch (type) {
      case 'group':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'patient':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
    }
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get avatar initial
  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-teal-600 dark:bg-teal-700 p-4 flex items-center justify-between">
        <h2 className="text-white text-lg font-semibold">Mensajes</h2>
        <button
          onClick={onNewConversation}
          className="p-2 rounded-full hover:bg-teal-700 dark:hover:bg-teal-600 text-white transition-colors"
          title="Nueva conversación"
        >
          <i className="fas fa-edit"></i>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 bg-gray-50 dark:bg-slate-700/50">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar conversaciones..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-600 border border-gray-200 dark:border-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:text-white placeholder-gray-400"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <i className="fas fa-search"></i>
          </div>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <i className="fas fa-comments text-4xl mb-4"></i>
            <p>No hay conversaciones</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onConversationSelect(conversation)}
              className={`flex items-center p-4 cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700 ${
                selectedConversationId === conversation.id ? 'bg-teal-50 dark:bg-teal-900/20' : ''
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getIconColor(conversation.type)}`}>
                  {conversation.avatar ? (
                    <img src={conversation.avatar} alt={conversation.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold">{getInitial(conversation.name)}</span>
                  )}
                </div>
                {/* Online indicator */}
                {conversation.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                )}
              </div>

              {/* Conversation Info */}
              <div className="flex-1 ml-4 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold text-sm truncate ${
                    conversation.unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {conversation.name}
                  </h3>
                  <span className={`text-xs flex-shrink-0 ${
                    conversation.unreadCount > 0 ? 'text-teal-600 dark:text-teal-400 font-semibold' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {formatTime(conversation.lastMessageTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center min-w-0">
                    <i className={`fas ${getConversationIcon(conversation.type)} text-xs mr-2 ${
                      conversation.unreadCount > 0 ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'
                    }`}></i>
                    <p className={`text-sm truncate ${
                      conversation.unreadCount > 0 ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {conversation.lastMessage || 'Sin mensajes'}
                    </p>
                  </div>
                  {/* Unread Badge */}
                  {conversation.unreadCount > 0 && (
                    <span className="flex-shrink-0 ml-2 bg-teal-500 text-white text-xs font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
                      {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

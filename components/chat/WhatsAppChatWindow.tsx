'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ConversationMessage } from '../../services/conversationService';

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

interface WhatsAppChatWindowProps {
  conversation: WhatsAppConversation;
  messages: ConversationMessage[];
  currentUserId: string;
  onSendMessage: (content: string, messageType?: 'text' | 'image' | 'file') => void;
  onBack: () => void;
  loading: boolean;
}

export const WhatsAppChatWindow: React.FC<WhatsAppChatWindowProps> = ({
  conversation,
  messages,
  currentUserId,
  onSendMessage,
  onBack,
  loading
}) => {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [messageText]);

  const handleSend = () => {
    if (messageText.trim()) {
      onSendMessage(messageText.trim());
      setMessageText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format message timestamp
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  // Format date header
  const formatDateHeader = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return date.toLocaleDateString('es-ES', { weekday: 'long' });
    
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; messages: ConversationMessage[] }[]>((groups, message) => {
    const messageDate = new Date(message.created_at).toDateString();
    const lastGroup = groups[groups.length - 1];
    
    if (lastGroup && new Date(lastGroup.messages[0].created_at).toDateString() === messageDate) {
      lastGroup.messages.push(message);
    } else {
      groups.push({ date: message.created_at, messages: [message] });
    }
    
    return groups;
  }, []);

  // Get icon based on conversation type
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

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600 px-4 py-3 flex items-center shadow-sm">
        {/* Back Button (mobile) */}
        <button
          onClick={onBack}
          className="mr-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 md:hidden"
        >
          <i className="fas fa-arrow-left"></i>
        </button>

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            conversation.type === 'group' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
            conversation.type === 'patient' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
            'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
          }`}>
            {conversation.avatar ? (
              <img src={conversation.avatar} alt={conversation.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <i className={`fas ${getConversationIcon(conversation.type)}`}></i>
            )}
          </div>
          {conversation.isOnline && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-700 rounded-full"></div>
          )}
        </div>

        {/* Conversation Info */}
        <div className="ml-3 flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{conversation.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {conversation.isOnline ? 'En línea' : 
             conversation.type === 'group' ? `${conversation.participants?.length || 0} participantes` :
             'Desconectado'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300">
            <i className="fas fa-phone"></i>
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300">
            <i className="fas fa-video"></i>
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300">
            <i className="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <i className="fas fa-comments text-4xl mb-4"></i>
              <p>No hay mensajes todavía</p>
              <p className="text-sm">Envía un mensaje para comenzar la conversación</p>
            </div>
          </div>
        ) : (
          groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Date Header */}
              <div className="flex justify-center mb-4">
                <div className="bg-white dark:bg-slate-600 px-4 py-1 rounded-full shadow-sm">
                  <span className="text-xs text-gray-500 dark:text-gray-300">{formatDateHeader(group.date)}</span>
                </div>
              </div>

              {/* Messages */}
              {group.messages.map((message, msgIndex) => {
                const isSent = message.sender_clerk_id === currentUserId;
                
                return (
                  <div
                    key={message.id || msgIndex}
                    className={`flex mb-2 ${isSent ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] md:max-w-[60%] ${
                      isSent 
                        ? 'bg-teal-100 dark:bg-teal-900/30 rounded-2xl rounded-br-sm' 
                        : 'bg-white dark:bg-slate-700 rounded-2xl rounded-bl-sm'
                    } px-4 py-2 shadow-sm`}>
                      {/* Message Content */}
                      <p className={`text-sm whitespace-pre-wrap break-words ${
                        isSent ? 'text-gray-800 dark:text-gray-100' : 'text-gray-800 dark:text-gray-100'
                      }`}>
                        {message.content}
                      </p>

                      {/* Message Metadata */}
                      <div className={`flex items-center justify-end mt-1 space-x-1 ${
                        isSent ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        <span className="text-xs">{formatMessageTime(message.created_at)}</span>
                        {isSent && (
                          <i className="fas fa-check text-xs"></i>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start mb-2">
            <div className="bg-white dark:bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-slate-700 border-t border-gray-200 dark:border-slate-600 p-3">
        <div className="flex items-end space-x-2">
          {/* Attachment Button */}
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-500 dark:text-gray-400">
            <i className="fas fa-paperclip"></i>
          </button>

          {/* Emoji Button */}
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-500 dark:text-gray-400">
            <i className="far fa-smile"></i>
          </button>

          {/* Message Input */}
          <div className="flex-1 bg-gray-100 dark:bg-slate-600 rounded-full px-4 py-2">
            <textarea
              ref={inputRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              className="w-full bg-transparent border-none resize-none focus:outline-none text-gray-800 dark:text-white placeholder-gray-400 max-h-30"
              rows={1}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!messageText.trim()}
            className={`p-3 rounded-full transition-colors ${
              messageText.trim()
                ? 'bg-teal-500 hover:bg-teal-600 text-white'
                : 'bg-gray-200 dark:bg-slate-500 text-gray-400 dark:text-gray-300 cursor-not-allowed'
            }`}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

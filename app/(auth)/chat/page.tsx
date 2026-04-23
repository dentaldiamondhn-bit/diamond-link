'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { ChatService } from '@/services/chatService';
import {
  ChatConversation,
  ChatMessage,
  ChatUser,
  ChatConversationType,
  ChatMessageType,
  PatientCaseLinkType,
  CreateMessageData,
  CreateConversationData
} from '@/types/chat';
import {
  MessageSquare,
  Plus,
  Search,
  Paperclip,
  Send,
  MoreVertical,
  Phone,
  Video,
  Info,
  X,
  File,
  Image,
  Users,
  Pin,
  Archive,
  Trash2,
  Smile,
  CornerDownRight,
  UserPlus,
  ChevronLeft,
  FileText,
  Stethoscope,
  Calendar,
  CreditCard,
  User,
  Upload,
  Close,
  Check,
  Loader2,
  SmilePlus
} from 'lucide-react';
import { UserAvatar } from '@/components/calendar/UserComponents';

export default function ChatPage() {
  const { user } = useUser();
  const { theme } = useTheme();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPatientCaseModal, setShowPatientCaseModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<ChatUser[]>([]);

  useEffect(() => {
    if (user?.id) {
      getDbUserId();
    }
  }, [user?.id]);

  useEffect(() => {
    if (dbUserId) {
      loadConversations();
      loadAllUsers();
    }
  }, [dbUserId]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation && dbUserId) {
      const channel = supabase
        .channel(`chat-${selectedConversation.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${selectedConversation.id}` },
          (payload) => {
            loadMessages(selectedConversation.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConversation?.id, dbUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getDbUserId = async () => {
    // Use Clerk ID directly as the user ID in chat system
    if (user?.id) {
      setDbUserId(user.id);
    }
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const result = await ChatService.getConversations(dbUserId!);
      setConversations(result.data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    // Load users from Clerk API instead of Supabase
    try {
      const response = await fetch('/api/users');
      const users = await response.json();
      setAllUsers(users.map((u: any) => ({
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        profile_image_url: u.profileImageUrl,
        role: u.role
      })) || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setAllUsers([]);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const result = await ChatService.getMessages(conversationId, dbUserId!);
      setMessages(result.data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !dbUserId) return;

    try {
      const messageData: CreateMessageData = {
        conversation_id: selectedConversation.id,
        content: messageInput.trim(),
        message_type: ChatMessageType.TEXT
      };

      await ChatService.sendMessage(dbUserId, messageData);
      setMessageInput('');
      loadMessages(selectedConversation.id);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleCreateConversation = async (participantIds: string[], type: ChatConversationType, name?: string) => {
    if (!dbUserId) return;

    try {
      const convData: CreateConversationData = {
        type,
        participant_ids: participantIds,
        name
      };
      
      const result = await ChatService.createConversation(dbUserId, convData);
      if (result.data) {
        setSelectedConversation(result.data);
        loadConversations();
      }
      setShowNewChatModal(false);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedConversation || !dbUserId) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversationId', selectedConversation.id);

        const response = await fetch('/api/chat/upload', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        if (result.uploadedUrl) {
          const fileType = file.type.startsWith('image/') ? 'image' : 'file';
          const messageData: CreateMessageData = {
            conversation_id: selectedConversation.id,
            content: file.name,
            message_type: fileType as ChatMessageType,
            attachments: [{
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              file_url: result.uploadedUrl
            }]
          };
          await ChatService.sendMessage(dbUserId, messageData);
        }
      }
      loadMessages(selectedConversation.id);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePatientCaseLink = async (data: {
    patient_id: string;
    link_type: PatientCaseLinkType;
    linked_id: string;
    title: string;
    description?: string;
  }) => {
    if (!selectedConversation || !dbUserId) return;

    try {
      const messageData: CreateMessageData = {
        conversation_id: selectedConversation.id,
        content: data.title,
        message_type: ChatMessageType.PATIENT_CASE,
        patient_case_link: data
      };

      await ChatService.sendMessage(dbUserId, messageData);
      loadMessages(selectedConversation.id);
      setShowPatientCaseModal(false);
    } catch (error) {
      console.error('Error linking patient case:', error);
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getConversationDisplayName = (conv: ChatConversation): string => {
    if (conv.name) return conv.name;
    const otherParticipants = conv.participants?.filter(p => p.user_id !== dbUserId) || [];
    if (otherParticipants.length > 0) {
      return `Chat con usuario ${otherParticipants[0].user_id.slice(-6)}`;
    }
    return 'Chat';
  };

  const getConversationAvatar = (conv: ChatConversation): string | null => {
    if (conv.avatar_url) return conv.avatar_url;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="flex h-screen">
        {/* Conversations Sidebar */}
        <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700`}>
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">Mensajes</h1>
              </div>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
              >
                <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar conversaciones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">No hay conversaciones</p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="mt-3 text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:underline"
                >
                  Iniciar conversación
                </button>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredConversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                      selectedConversation?.id === conv.id
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
                    }`}
                  >
                    <div className="relative">
                      {getConversationAvatar(conv) ? (
                        <img 
                          src={getConversationAvatar(conv)!} 
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                      )}
                      {conv.unread_count && conv.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-800 dark:text-white truncate">
                          {getConversationDisplayName(conv)}
                        </p>
                        {conv.is_pinned && <Pin className="w-3 h-3 text-amber-500" />}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {conv.last_message?.content || 'Sin mensajes'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-800">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <div className="relative">
                  {getConversationAvatar(selectedConversation) ? (
                    <img 
                      src={getConversationAvatar(selectedConversation)!} 
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-white">
                    {getConversationDisplayName(selectedConversation)}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedConversation.participants?.length || 0} participantes
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
                  <Phone className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
                  <Video className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button 
                  onClick={() => setShowInfoPanel(!showInfoPanel)}
                  className={`p-2 rounded-xl ${showInfoPanel ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  <Info className={`w-5 h-5 ${showInfoPanel ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-400'}`} />
                </button>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
                  <MoreVertical className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">Sin mensajes aún</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500">Envía el primer mensaje</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwn = msg.sender_id === dbUserId;
                  const showAvatar = !isOwn && (!messages[index - 1] || messages[index - 1].sender_id !== msg.sender_id);
                  const isReply = msg.reply_to_id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                    >
                      {showAvatar && !isOwn ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      ) : !isOwn ? (
                        <div className="w-8" />
                      ) : null}
                      
                      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                        {isReply && (
                          <div className="mb-1 ml-2 flex items-center gap-1 text-xs text-slate-500">
                            <CornerDownRight className="w-3 h-3" />
                            <span>{msg.reply_to?.content?.substring(0, 30)}...</span>
                          </div>
                        )}
                        
                        <div className={`rounded-2xl px-4 py-2 ${
                          isOwn 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' 
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white'
                        }`}>
                          {msg.message_type === ChatMessageType.PATIENT_CASE && msg.patient_case_link ? (
                            <div className={`rounded-lg p-2 ${isOwn ? 'bg-white/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Stethoscope className="w-4 h-4" />
                                <span className="font-medium text-sm">Caso de Paciente</span>
                              </div>
                              <p className="text-sm">{msg.patient_case_link.title}</p>
                              {msg.patient_case_link.patient && (
                                <p className="text-xs opacity-75">{msg.patient_case_link.patient.nombre_completo}</p>
                              )}
                            </div>
                          ) : msg.message_type === ChatMessageType.IMAGE && msg.attachments?.[0] ? (
                            <img 
                              src={msg.attachments[0].file_url} 
                              alt="" 
                              className="rounded-lg max-w-[250px] max-h-[250px] object-cover"
                            />
                          ) : msg.message_type === ChatMessageType.FILE && msg.attachments?.[0] ? (
                            <a 
                              href={msg.attachments[0].file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 hover:underline"
                            >
                              <File className="w-4 h-4" />
                              <span className="text-sm">{msg.attachments[0].file_name}</span>
                            </a>
                          ) : (
                            <p className="text-sm">{msg.content}</p>
                          )}
                        </div>
                        
                        <div className={`flex items-center gap-2 mt-1 text-xs text-slate-400 ${isOwn ? 'justify-end' : ''}`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.is_edited && <span>(editado)</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-end gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                  disabled={isUploading}
                >
                  <Paperclip className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button
                  onClick={() => setShowPatientCaseModal(true)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  <Stethoscope className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                
                <div className="flex-1 relative">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Escribe un mensaje..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    rows={1}
                  />
                </div>
                
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="p-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                multiple
              />
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                Selecciona una conversación
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Elige una conversación del panel lateral o inicia una nueva
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <NewChatModal
          allUsers={allUsers}
          currentUserId={dbUserId!}
          onClose={() => setShowNewChatModal(false)}
          onCreateConversation={handleCreateConversation}
        />
      )}

      {/* Patient Case Modal */}
      {showPatientCaseModal && selectedConversation && (
        <PatientCaseModal
          onClose={() => setShowPatientCaseModal(false)}
          onLink={handlePatientCaseLink}
        />
      )}
    </div>
  );
}

// New Chat Modal Component
function NewChatModal({
  allUsers,
  currentUserId,
  onClose,
  onCreateConversation
}: {
  allUsers: ChatUser[];
  currentUserId: string;
  onClose: () => void;
  onCreateConversation: (participantIds: string[], type: ChatConversationType, name?: string) => void;
}) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [chatName, setChatName] = useState('');
  const [chatType, setChatType] = useState<ChatConversationType>(ChatConversationType.DIRECT);

  const handleSubmit = () => {
    if (selectedUsers.length === 0) return;
    onCreateConversation(selectedUsers, chatType, chatName || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Nueva Conversación</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo</label>
            <div className="flex gap-2">
              <button
                onClick={() => setChatType(ChatConversationType.DIRECT)}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                  chatType === ChatConversationType.DIRECT
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-2 border-transparent'
                }`}
              >
                Directo
              </button>
              <button
                onClick={() => setChatType(ChatConversationType.GROUP)}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                  chatType === ChatConversationType.GROUP
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-2 border-transparent'
                }`}
              >
                Grupo
              </button>
            </div>
          </div>

          {chatType === ChatConversationType.GROUP && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nombre del grupo</label>
              <input
                type="text"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                placeholder="Nombre del grupo..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {chatType === ChatConversationType.DIRECT ? 'Seleccionar usuario' : 'Agregar participantes'}
            </label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {allUsers.filter(u => u.id !== currentUserId).map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelectedUsers(prev => 
                      prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                    );
                  }}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                    selectedUsers.includes(u.id)
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300'
                      : 'bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-emerald-300'
                  }`}
                >
                  <div className="relative">
                    {u.profile_image_url ? (
                      <img src={u.profile_image_url} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {selectedUsers.includes(u.id) && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-slate-800 dark:text-white">
                      {u.first_name} {u.last_name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleSubmit}
            disabled={selectedUsers.length === 0 || (chatType === ChatConversationType.GROUP && !chatName)}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Crear Conversación
          </button>
        </div>
      </div>
    </div>
  );
}

// Patient Case Modal Component
function PatientCaseModal({
  onClose,
  onLink
}: {
  onClose: () => void;
  onLink: (data: { patient_id: string; link_type: PatientCaseLinkType; linked_id: string; title: string; description?: string }) => void;
}) {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [linkType, setLinkType] = useState<PatientCaseLinkType>(PatientCaseLinkType.GENERAL);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('patients')
      .select('paciente_id, nombre_completo, identificacion')
      .order('nombre_completo');
    setPatients(data || []);
    setLoading(false);
  };

  const loadPatientAttachments = async (patientId: string) => {
    setLoading(true);
    try {
      const attachmentsData: any[] = [];

      const [consents, treatments, events] = await Promise.all([
        fetch(`/api/patients/${patientId}/consents`).then(r => r.ok ? r.json() : []),
        fetch(`/api/tratamientos-completados?paciente_id=${patientId}`).then(r => r.ok ? r.json() : []),
        fetch(`/api/patients/${patientId}/events`).then(r => r.ok ? r.json() : [])
      ]);

      attachmentsData.push(
        ...(consents || []).map((c: any) => ({ type: 'consent', id: c.id, title: c.title || 'Consentimiento', data: c })),
        ...(treatments || []).map((t: any) => ({ type: 'treatment', id: t.id, title: t.nombre_tratamiento, data: t })),
        ...(events || []).map((e: any) => ({ type: 'event', id: e.id, title: e.title, data: e }))
      );

      setAttachments(attachmentsData);
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedPatient) {
      loadPatientAttachments(selectedPatient.paciente_id);
    }
  }, [selectedPatient]);

  const handleSubmit = (attachment: any) => {
    if (!selectedPatient) return;
    
    onLink({
      patient_id: selectedPatient.paciente_id,
      link_type: attachment.type as PatientCaseLinkType,
      linked_id: attachment.id,
      title: attachment.title,
      description: attachment.data?.description
    });
  };

  const getLinkTypeIcon = (type: string) => {
    switch (type) {
      case 'consent': return <FileText className="w-4 h-4" />;
      case 'treatment': return <Stethoscope className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const filteredPatients = patients.filter(p => 
    p.nombre_completo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Vincular Caso de Paciente</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {!selectedPatient ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar paciente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <p className="text-center text-slate-500">No se encontraron pacientes</p>
                ) : (
                  filteredPatients.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPatient(p)}
                      className="w-full p-3 rounded-xl flex items-center gap-3 bg-slate-50 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-slate-800 dark:text-white">{p.nombre_completo}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{p.identificacion}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setSelectedPatient(null)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
              >
                <ChevronLeft className="w-4 h-4" /> Cambiar paciente
              </button>
              
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                <p className="font-medium text-emerald-800 dark:text-emerald-200">
                  Paciente: {selectedPatient.nombre_completo}
                </p>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
                </div>
              ) : attachments.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  No hay documentos disponibles para este paciente
                </p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((att, index) => (
                    <button
                      key={index}
                      onClick={() => handleSubmit(att)}
                      className="w-full p-3 rounded-xl flex items-center gap-3 bg-slate-50 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                    >
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                        {getLinkTypeIcon(att.type)}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-slate-800 dark:text-white">{att.title}</p>
                        <p className="text-xs text-slate-500 capitalize">{att.type}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

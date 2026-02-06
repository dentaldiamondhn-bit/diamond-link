'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { ConversationService, Conversation } from '../../services/conversationService';
import { ClerkUserService, ClerkUser } from '../../services/clerkUserService';

interface ModernChatSidebarProps {
  selectedConversationId: string | null;
  onConversationSelect: (conversationId: string, conversationName?: string, conversationType?: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ModernChatSidebar: React.FC<ModernChatSidebarProps> = ({
  selectedConversationId,
  onConversationSelect,
  collapsed = false,
  onToggleCollapse
}) => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'direct' | 'groups' | 'patients' | 'search'>('direct' as const);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ClerkUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [conversationUsers, setConversationUsers] = useState<{[key: string]: any}>({});

  useEffect(() => {
    if (user?.id) {
      loadConversations();
    }
  }, [user?.id]);

  useEffect(() => {
    if (activeTab === 'search') {
      loadUsers();
    }
  }, [activeTab]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;
      
      console.log('Loading conversations for user:', user.id);
      const userConversations = await ConversationService.getUserConversations(user.id);
      console.log('Conversations loaded:', userConversations.length);
      setConversations(userConversations);
      
      // Load user information for direct conversations using ClerkUserService
      const directConversations = userConversations.filter(conv => conv.type === 'direct');
      console.log('Direct conversations to process:', directConversations.length);
      
      const userPromises = directConversations.map(async (conv) => {
        try {
          const otherUserId = conv.participant_ids.find(id => id !== user.id);
          console.log('Processing conversation:', conv.id, 'other user:', otherUserId);
          
          if (otherUserId) {
            const userInfo = await ClerkUserService.getUserById(otherUserId);
            console.log('User info found:', userInfo?.firstName || userInfo?.emailAddress || 'Not found');
            
            if (userInfo) {
              const displayName = ClerkUserService.getUserDisplayName(userInfo);
              console.log('Display name:', displayName);
              
              return { 
                conversationId: conv.id, 
                displayName,
                user: userInfo
              };
            }
          } else {
            console.log('No other user found for conversation:', conv.id);
          }
        } catch (error) {
          console.error('Failed to load user for conversation:', conv.id, error);
        }
        return { conversationId: conv.id, displayName: 'Unknown User', user: null };
      });
      
      const userResults = await Promise.all(userPromises);
      const userMap = userResults.reduce((acc, result) => {
        acc[result.conversationId] = result.user || { displayName: result.displayName };
        return acc;
      }, {} as {[key: string]: any});
      
      console.log('Final sidebar user map:', userMap);
      setConversationUsers(userMap);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const users = await ClerkUserService.getAllUsers();
      const otherUsers = users.filter(u => u.id !== user?.id);
      setAvailableUsers(otherUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserClick = async (selectedUser: ClerkUser) => {
    if (!user?.id) return;
    
    try {
      const conversation = await ConversationService.getOrCreateDirectConversation(
        user.id,
        selectedUser.id
      );
      
      const displayName = selectedUser.firstName && selectedUser.lastName 
        ? `${selectedUser.firstName} ${selectedUser.lastName}`
        : selectedUser.emailAddress;
      
      onConversationSelect(conversation.id, displayName, 'direct');
      
      // Refresh conversations list
      loadConversations();
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (activeTab === 'direct') return conv.type === 'direct';
    if (activeTab === 'groups') return conv.type === 'group';
    if (activeTab === 'patients') return conv.type === 'patient_case';
    return true;
  });

  const filteredUsers = availableUsers.filter(u =>
    u.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.emailAddress?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const getConversationIcon = (type: string) => {
    switch (type) {
      case 'direct':
        return 'fa-user';
      case 'group':
        return 'fa-users';
      case 'patient_case':
        return 'fa-user-injured';
      default:
        return 'fa-comments';
    }
  };

  const getConversationColor = (type: string) => {
    switch (type) {
      case 'direct':
        return 'bg-gradient-to-br from-blue-500 to-blue-600';
      case 'group':
        return 'bg-gradient-to-br from-teal-500 to-teal-600';
      case 'patient_case':
        return 'bg-gradient-to-br from-purple-500 to-purple-600';
      default:
        return 'bg-gradient-to-br from-slate-500 to-slate-600';
    }
  };

  const formatLastMessageTime = (timestamp?: string) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'yesterday';
    return date.toLocaleDateString();
  };

  if (collapsed) {
    return (
      <div className="w-16 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="p-4">
          <button
            onClick={onToggleCollapse}
            className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center text-white hover:bg-teal-600 transition-colors"
          >
            <i className="fas fa-bars"></i>
          </button>
        </div>
        
        <div className="flex-1 flex flex-col space-y-2 p-2">
          <button className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
            <i className="fas fa-user text-sm"></i>
          </button>
          <button className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center text-white">
            <i className="fas fa-users text-sm"></i>
          </button>
          <button className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-white">
            <i className="fas fa-user-injured text-sm"></i>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Messages</h2>
          <button
            onClick={onToggleCollapse}
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <i className="fas fa-bars"></i>
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'direct'
                ? 'bg-blue-500 text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <i className="fas fa-user mr-1"></i>
            Direct
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'groups'
                ? 'bg-teal-500 text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <i className="fas fa-users mr-1"></i>
            Groups
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'patients'
                ? 'bg-purple-500 text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <i className="fas fa-user-injured mr-1"></i>
            Patients
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'search'
                ? 'bg-slate-600 text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <i className="fas fa-search mr-1"></i>
            Search
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'search' ? (
          <div className="p-4">
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
            />
            
            <div className="mt-4 space-y-2">
              {loadingUsers ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-slate-500 dark:text-slate-400">
                  No users found
                </div>
              ) : (
                filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleUserClick(u)}
                    className="w-full p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {u.imageUrl ? (
                        <img 
                          src={u.imageUrl} 
                          alt={u.firstName || u.emailAddress}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {(u.firstName || u.emailAddress)?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.emailAddress}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {u.emailAddress}
                        </div>
                      </div>
                      <div className="text-slate-400">
                        <i className="fas fa-comment"></i>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-comments text-slate-400"></i>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No conversations yet
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredConversations.map(conversation => (
              <button
                key={conversation.id}
                onClick={() => onConversationSelect(
                  conversation.id,
                  conversation.name || conversationUsers[conversation.id]?.displayName || 'Unknown',
                  conversation.type
                )}
                className={`w-full p-3 rounded-lg transition-colors ${
                  selectedConversationId === conversation.id
                    ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Avatar */}
                  {conversation.type === 'direct' && conversationUsers[conversation.id] ? (
                    <>
                      {console.log('Rendering avatar for conversation:', conversation.id, 'user data:', conversationUsers[conversation.id])}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {conversationUsers[conversation.id].imageUrl ? (
                          <img 
                            src={conversationUsers[conversation.id].imageUrl} 
                            alt={conversationUsers[conversation.id].displayName || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {conversationUsers[conversation.id].displayName?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {console.log('Using fallback avatar for conversation:', conversation.id, 'type:', conversation.type, 'has user data:', !!conversationUsers[conversation.id])}
                      <div className={`w-10 h-10 ${getConversationColor(conversation.type)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <i className={`fas ${getConversationIcon(conversation.type)} text-white`}></i>
                      </div>
                    </>
                  )}
                  
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-slate-900 dark:text-white truncate">
                        {conversation.name || 
                         conversationUsers[conversation.id]?.displayName || 
                         (conversation.type === 'direct' ? 'Direct Message' : 
                          conversation.type === 'patient_case' ? 'Patient Case' : 'Group Chat')}
                      </h3>
                      {conversation.last_message_time && (
                        <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                          {formatLastMessageTime(conversation.last_message_time)}
                        </span>
                      )}
                    </div>
                    
                    {conversation.last_message && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                        {conversation.last_message}
                      </p>
                    )}
                  </div>
                  
                  {conversation.unread_count && conversation.unread_count > 0 && (
                    <div className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">
                      {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

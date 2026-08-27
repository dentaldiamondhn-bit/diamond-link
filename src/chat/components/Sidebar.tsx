'use client';

import React, { useState } from 'react';
import { useChatStore } from '@/chat/store/chatStore';
import { useUser } from '@clerk/nextjs';
import { Search, Plus, ChevronDown, X } from 'lucide-react';
import ConversationListItem from './ConversationListItem';

export const Sidebar = () => {
  const { conversations, selectedConversationId, setSelectedConversation, setLoading, users, createDirectConversation } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const { user: clerkUser, isLoaded } = useUser();
  const currentUserId = clerkUser?.id;

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv) => {
    const name = conv.participantNames?.[Object.keys(conv.participantNames || {})[0]] ?? '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Get list of users for new chat modal, excluding current user
  const filteredUsers = Object.values(users || {}).filter(
    (user) => user.id !== currentUserId
  );

  return (
    <aside className="sidebar w-72 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="sidebar-header flex items-center justify-between p-5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold">Chats</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewChatModal(true)}
            className="p-2.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button className="p-2.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="sidebar-search p-5 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="sidebar-list flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center mb-3">
              <Plus className="h-6 w-6 text-gray-400 dark:text-gray-300" />
            </div>
            <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
              No chats yet
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Start a new conversation to begin chatting
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredConversations.map((conv) => (
              <ConversationListItem
                key={conv.id}
                conversation={conv}
                selected={conv.id === selectedConversationId}
                onSelect={() => setSelectedConversation(conv.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50" onClick={() => setShowNewChatModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg w-96 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">New Chat</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {isLoaded && currentUserId ? (
              <div className="space-y-4">
                {filteredUsers.length > 0 ? (
                  <div className="max-h-[300px] overflow-y-auto">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => {
                          // Create or get the direct conversation
                          createDirectConversation(currentUserId, user.id);
                          // Set the selected conversation to the new one
                          const conversationId = `direct-${currentUserId}-${user.id}`;
                          setSelectedConversation(conversationId);
                          setShowNewChatModal(false);
                        }}
                        className="flex items-center space-x-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                      >
                        <img
                          src={user.avatarUrl || '/default-avatar.svg'}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {user.online ? 'Online' : 'Offline'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No users available to start a chat
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="ml-2 text-gray-500 dark:text-gray-400">Loading...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
'use client';

import React, { useState, useMemo } from 'react';
import { Search, Plus, X, Users2 } from 'lucide-react';
import { useChatStore } from '@/chat/store/chatStore';
import { ChatRepository } from '@/chat/repository';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { ChatConversationType } from '@/types/chat';
import { getConversationDisplayName, getInitials, getAvatarColor } from '@/chat/utils';
import ConversationListItem from './ConversationListItem';

interface SidebarProps {
  className?: string;
}

export const Sidebar = ({ className = '' }: SidebarProps) => {
  const { t } = useTranslations();
  const {
    conversations,
    users,
    presence,
    currentUserId,
    selectedConversationId,
    setSelectedConversation,
    setConversations,
    upsertConversation,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [modalTab, setModalTab] = useState<'direct' | 'group'>('direct');
  const [groupName, setGroupName] = useState('');
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conv) =>
      getConversationDisplayName(conv, currentUserId, users).toLowerCase().includes(q)
    );
  }, [conversations, searchQuery, currentUserId, users]);

  const otherUsers = useMemo(
    () => Object.values(users).filter((u) => u.id !== currentUserId),
    [users, currentUserId]
  );

  const isOnline = (userId: string) => presence[userId] === 'online';

  const refreshConversations = async () => {
    if (!currentUserId) return;
    const list = await ChatRepository.getConversations(currentUserId);
    setConversations(list);
  };

  const handleCreateDirect = async (otherUserId: string) => {
    if (!currentUserId || creating) return;
    setCreating(true);
    setError(null);
    try {
      const conv = await ChatRepository.createConversation(currentUserId, {
        type: ChatConversationType.DIRECT,
        participant_ids: [otherUserId],
      });
      upsertConversation(conv);
      setSelectedConversation(conv.id);
      setShowNewChatModal(false);
      await refreshConversations();
    } catch (err) {
      console.error('Failed to create direct conversation:', err);
      setError('No se pudo iniciar la conversación');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!currentUserId || creating || !groupName.trim()) return;
    if (selectedGroupUsers.length === 0) return;
    setCreating(true);
    setError(null);
    try {
      const conv = await ChatRepository.createConversation(currentUserId, {
        name: groupName.trim(),
        type: ChatConversationType.GROUP,
        participant_ids: selectedGroupUsers,
      });
      upsertConversation(conv);
      setSelectedConversation(conv.id);
      setShowNewChatModal(false);
      setGroupName('');
      setSelectedGroupUsers([]);
      await refreshConversations();
    } catch (err) {
      console.error('Failed to create group conversation:', err);
      setError('No se pudo crear el grupo');
    } finally {
      setCreating(false);
    }
  };

  const toggleGroupUser = (id: string) =>
    setSelectedGroupUsers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  return (
    <aside className={`sidebar w-72 flex flex-col bg-white dark:bg-gray-800 ${className}`}>
      <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('sidebarTitle')}</h2>
        <button
          onClick={() => setShowNewChatModal(true)}
          className="p-2.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
          title={t('newChat')}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-400 sm:text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center mb-3">
              <Users2 className="h-6 w-6 text-gray-400 dark:text-gray-300" />
            </div>
            <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
              {t('emptyConversations')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('startNewChat')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 px-3 py-2">
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

      {showNewChatModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewChatModal(false);
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('newChat')}</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setModalTab('direct')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  modalTab === 'direct'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {t('newChatDirect')}
              </button>
              <button
                onClick={() => setModalTab('group')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  modalTab === 'group'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {t('newChatGroup')}
              </button>
            </div>

            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

            {modalTab === 'group' && (
              <input
                type="text"
                placeholder={t('groupNamePlaceholder')}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            )}

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {modalTab === 'group' ? t('addParticipants') : t('selectUser')}
            </p>

            {otherUsers.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-6">{t('noUsersAvailable')}</p>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-1">
                {otherUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => {
                      if (modalTab === 'direct') {
                        handleCreateDirect(user.id);
                      } else {
                        toggleGroupUser(user.id);
                      }
                    }}
                    className={`flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                      selectedGroupUsers.includes(user.id) ? 'bg-blue-50 dark:bg-blue-900/40' : ''
                    }`}
                  >
                    {user.profile_image_url ? (
                      <img
                        src={user.profile_image_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-medium ${getAvatarColor(
                          `${user.first_name} ${user.last_name}`.trim() || 'U'
                        )}`}
                      >
                        {getInitials(`${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || 'U')}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isOnline(user.id) ? t('online') : t('offline')}
                      </p>
                    </div>
                    {modalTab === 'group' && selectedGroupUsers.includes(user.id) && (
                      <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                        ✓
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {modalTab === 'group' && (
              <button
                onClick={handleCreateGroup}
                disabled={creating || !groupName.trim() || selectedGroupUsers.length === 0}
                className="mt-4 w-full py-2.5 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? t('loading') : t('createConversation')}
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
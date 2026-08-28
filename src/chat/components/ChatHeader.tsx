'use client';

import React from 'react';
import { Search, MoreVertical, Users as UsersIcon } from 'lucide-react';
import { useChatStore } from '@/chat/store/chatStore';
import { useTranslations } from '@/chat/i18n/useTranslations';
import {
  getConversationDisplayName,
  getConversationAvatar,
  getInitials,
  getAvatarColor,
} from '@/chat/utils';

interface ChatHeaderProps {
  conversationId: string | null;
  className?: string;
}

export const ChatHeader = ({ conversationId, className = '' }: ChatHeaderProps) => {
  const { t } = useTranslations();
  const { conversations, users, presence, typing, currentUserId } = useChatStore();
  const conversation = conversations.find((c) => c.id === conversationId);

  const name = getConversationDisplayName(conversation, currentUserId, users);
  const avatarUrl = getConversationAvatar(conversation, currentUserId, users);

  const otherParticipants = (conversation?.participants || []).filter(
    (p) => p.user_id !== currentUserId
  );

  const isTyping =
    !!conversationId &&
    Object.values(typing[conversationId] || {}).some(Boolean);

  const onlineCount = (conversation?.participants || []).filter(
    (p) => presence[p.user_id] === 'online'
  ).length;

  const otherOnline = otherParticipants.some((p) => presence[p.user_id] === 'online');
  const memberCount = (conversation?.participants || []).length;

  return (
    <header
      className={`flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div
              className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-medium ${getAvatarColor(
                name
              )}`}
            >
              {getInitials(name)}
            </div>
          )}
          {conversation?.type === 'direct' && otherOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white dark:ring-gray-800" />
          )}
        </div>

        <div className="min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate">{name}</p>
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
            {isTyping ? (
              <span className="italic text-blue-500">{t('typing')}</span>
            ) : conversation?.type === 'group' ? (
              <span className="flex items-center gap-1">
                <UsersIcon className="h-3 w-3" />
                {onlineCount} {t('online').toLowerCase()} · {t('members', { n: memberCount })}
              </span>
            ) : (
              <span>{otherOnline ? t('online') : t('offline')}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          title={t('searchPlaceholder')}
        >
          <Search className="h-5 w-5" />
        </button>
        <button
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          title={t('participants')}
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;
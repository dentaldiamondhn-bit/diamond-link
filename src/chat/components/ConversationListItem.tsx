'use client';

import React, { useMemo } from 'react';
import { Pin, Archive, Check, Users as UsersIcon } from 'lucide-react';
import { useChatStore } from '@/chat/store/chatStore';
import { ChatConversation } from '@/types/chat';
import { useTranslations } from '@/chat/i18n/useTranslations';
import {
  getConversationDisplayName,
  getConversationAvatar,
  getInitials,
  getAvatarColor,
  formatConversationTime,
  getMessageReadStatus,
} from '@/chat/utils';

interface ConversationListItemProps {
  conversation: ChatConversation;
  selected: boolean;
  onSelect: () => void;
}

export const ConversationListItem = ({
  conversation,
  selected,
  onSelect,
}: ConversationListItemProps) => {
  const { t } = useTranslations();
  const { users, presence, typing, currentUserId } = useChatStore();

  const name = getConversationDisplayName(conversation, currentUserId, users);
  const avatarUrl = getConversationAvatar(conversation, currentUserId, users);

  const isTyping = useMemo(() => {
    const convTyping = typing[conversation.id] || {};
    return Object.values(convTyping).some(Boolean);
  }, [typing, conversation.id]);

  const lastMessage = conversation.last_message;
  const lastMessageText = useMemo(() => {
    if (!lastMessage) return '';
    if (lastMessage.is_deleted) return '';
    switch (lastMessage.message_type) {
      case 'voice':
        return t('voiceMessage');
      case 'image':
        return t('imageMessage');
      case 'file':
        return t('fileMessage');
      case 'patient_case':
        return t('patientCase');
      default:
        return lastMessage.content || '';
    }
  }, [lastMessage, t]);

  // WhatsApp-style ✓/✓✓ for the last message of the conversation (only when
  // it was sent by me), matching the bubble render under the timestamp.
  const otherParticipantCount = useMemo(
    () =>
      (conversation.participants || []).filter((p) => p.user_id !== currentUserId).length,
    [conversation.participants, currentUserId]
  );
  const lastMessageStatus = getMessageReadStatus(
    conversation.last_message,
    currentUserId,
    otherParticipantCount
  );

  const onlineCount = useMemo(() => {
    if (conversation.type !== 'group') return 0;
    return (conversation.participants || [])
      .map((p) => p.user_id)
      .filter((id) => presence[id] === 'online').length;
  }, [conversation, presence]);

  const isDirectOnline =
    conversation.type === 'direct' &&
    (conversation.participants || [])
      .filter((p) => p.user_id !== currentUserId)
      .some((p) => presence[p.user_id] === 'online');

  return (
    <li
      onClick={onSelect}
      className={`cursor-pointer px-3 py-2.5 rounded-lg transition-colors ${
        selected ? 'bg-blue-100 dark:bg-blue-900/60' : 'hover:bg-gray-50 dark:hover:bg-gray-700/60'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          {conversation.type === 'group' && !conversation.avatar_url ? (
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
              <UsersIcon className="h-5 w-5 text-gray-500 dark:text-gray-300" />
            </div>
          ) : avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div
              className={`w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-medium ${getAvatarColor(
                name
              )}`}
            >
              {getInitials(name)}
            </div>
          )}
          {isDirectOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white dark:ring-gray-800" />
          )}
          {conversation.type === 'group' && onlineCount > 0 && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white dark:ring-gray-800" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-gray-900 dark:text-white truncate">{name}</p>
            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatConversationTime(lastMessage?.created_at || conversation.last_message_at)}
              </span>
              {lastMessageStatus && (
                <span
                  className={`flex items-center leading-none ${
                    lastMessageStatus === 'read'
                      ? 'text-blue-500 dark:text-blue-400'
                      : 'text-gray-300 dark:text-gray-500'
                  }`}
                  title={
                    lastMessageStatus === 'read'
                      ? 'Leído'
                      : lastMessageStatus === 'delivered'
                        ? 'Entregado'
                        : 'Enviado'
                  }
                >
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                  {lastMessageStatus !== 'sent' && (
                    <Check className="h-3 w-3 -ml-1" strokeWidth={2.5} />
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            {isTyping ? (
              <p className="text-sm italic text-blue-500 truncate">{t('typing')}</p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {lastMessageText}
              </p>
            )}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {(conversation.unread_count ?? 0) > 0 && (
                <span className="inline-flex min-w-[1.25rem] h-5 items-center justify-center px-1 bg-blue-500 text-xs text-white rounded-full">
                  {conversation.unread_count! > 99 ? '99+' : conversation.unread_count}
                </span>
              )}
              {conversation.is_pinned && <Pin className="h-3 w-3 text-yellow-400" />}
              {conversation.is_archived && <Archive className="h-3 w-3 text-gray-400" />}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

export default ConversationListItem;
'use client';

import React from 'react';
import { ChatConversation } from '@/types/chat';
import { useChatStore } from '@/chat/store/chatStore';
import { Circle, Pin, Archive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
  const { users } = useChatStore();

  // Determine display name and avatar
  const participantIds = conversation.participantIds || [];
  const currentUserId = users?.[Object.keys(users || {})[0]]?.id ?? '';
  const otherParticipantId = participantIds.find((id) => id !== currentUserId);
  const otherUser = users[otherParticipantId || ''];

  const name =
    conversation.participantNames?.[otherParticipantId || ''] ||
    otherUser?.first_name +
      ' ' +
      otherUser?.last_name ||
    'Unknown User';
  const avatarUrl =
    conversation.participantAvatars?.[otherParticipantId || ''] ||
    otherUser?.profile_image_url ||
    '/default-avatar.svg';

  const lastMessage = conversation.lastMessage;
  const lastMessageText =
    lastMessage && lastMessage.content
      ? lastMessage.content.length > 30
        ? lastMessage.content.slice(0, 30) + '...'
        : lastMessage.content
      : '';

  // Determine last message sender name for group conversations (optional)
  const lastMessageSenderName =
    lastMessage && lastMessage.senderId !== currentUserId
      ? users[lastMessage.senderId]?.name
      : undefined;

  return (
    <li
      onClick={onSelect}
      className={`cursor-pointer px-3 py-2.5 rounded-lg transition-colors ${
        selected
          ? 'bg-blue-100 dark:bg-blue-900'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <div className="flex items-start space-x-2">
        <div className="relative flex-shrink-0">
          <img
            src={avatarUrl}
            alt={name}
            className="w-8 h-8 rounded-full object-cover"
          />
          {/* Online indicator */}
          {otherUser && (
            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-green-500 rounded-full border-1 border-white dark:border-gray-800"></div>
          )}
          {/* Selected indicator (optional) */}
          {selected && (
            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-blue-500 rounded-full border-1 border-white dark:border-gray-900"></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate max-w-xs">
            {name}
          </p>
          {lastMessageText ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
              {lastMessage && lastMessage.senderId !== currentUserId ? (
                <>
                  <span className="font-medium">{users[lastMessage.senderId]?.name ?? 'Unknown'}: </span>
                  {lastMessageText}
                </>
              ) : (
                lastMessageText
              )}
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
              {/* No messages yet */}
              <span className="italic">No messages</span>
            </p>
          )}
        </div>
        <div className="flex-shrink-0 flex-col justify-between text-xs text-gray-400 dark:text-gray-500">
          <div className="mb-0.5">
            {lastMessage ? formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true }) : ''}
          </div>
          <div className="flex items-center space-x-1.5">
            {/* Unread badge */}
            {conversation.unreadCount > 0 && (
              <span className="inline-flex h-4 w-4 items-center justify-center bg-red-500 text-xs text-white rounded-full">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </span>
            )}
            {/* Pinned icon */}
            {conversation.pinned && (
              <Pin className="h-3 w-3 text-yellow-400" title="Pinned" />
            )}
            {/* Archived icon */}
            {conversation.archived && (
              <Archive className="h-3 w-3 text-gray-400" title="Archived" />
            )}
          </div>
        </div>
      </div>
    </li>
  );
};

export default ConversationListItem;
'use client';

import React from 'react';
import { useChatStore } from '@/chat/store/chatStore';
import { useUser } from '@clerk/nextjs';
import { ChevronLeft, Search, MoreVertical, Users as UsersIcon } from 'lucide-react';

interface ChatHeaderProps {
  conversationId: string | null;
}

export const ChatHeader = ({ conversationId }: ChatHeaderProps) => {
  const { conversations, users } = useChatStore();
  const conversation = conversations.find((c) => c.id === conversationId);
  const { user: clerkUser, isLoaded } = useUser();

  // If clerk user is not loaded, show loading state
  if (!isLoaded) {
    return (
      <header className="chat-header px-3 py-2 flex items-center justify-between bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-2">
          <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronLeft className="h-3 w-3" />
          </button>
          <div className="flex-shrink-0">
            <img
              src="/default-avatar.svg"
              alt="Loading"
              className="w-8 h-8 rounded-full object-cover"
            />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white truncate max-w-xs">
              Loading...
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <Search className="h-3 w-3" />
          </button>
          <button
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => {
              console.log('More actions clicked');
              // TODO: Implement menu
            }}
          >
            <MoreVertical className="h-3 w-3" />
          </button>
        </div>
      </header>
    );
  }

  const currentUserId = clerkUser?.id;

  // Determine display name and avatar
  let name = 'Unknown';
  let avatarUrl = '/default-avatar.svg';
  let participantCount = 0;
  let onlineCount = 0;
  let otherParticipantId: string | undefined;

  if (conversation && conversation.participantIds) {
    const allParticipantIds = conversation.participantIds;
    participantCount = allParticipantIds.length;

    // Calculate online count (including current user)
    onlineCount = allParticipantIds.filter(id => users[id]?.online).length;

    if (conversation.type === 'DIRECT') {
      // Direct conversation - find the other participant
      otherParticipantId = allParticipantIds.find(id => id !== currentUserId);
      if (otherParticipantId) {
        name =
          conversation.participantNames?.[otherParticipantId] ||
          users[otherParticipantId]?.name ||
          users[otherParticipantId]?.first_name + ' ' + users[otherParticipantId]?.last_name ||
          'Unknown';
        avatarUrl =
          conversation.participantAvatars?.[otherParticipantId] ||
          users[otherParticipantId]?.avatarUrl ||
          users[otherParticipantId]?.profile_image_url ||
          '/default-avatar.svg';
      }
    } else {
      // Group conversation
      name = conversation.name || 'Group Chat';
      // For groups, use the first participant's avatar that's not the current user, or first available
      const firstOtherParticipantId = allParticipantIds.find(id => id !== currentUserId) || allParticipantIds[0];
      if (firstOtherParticipantId) {
        avatarUrl =
          conversation.participantAvatars?.[firstOtherParticipantId] ||
          users[firstOtherParticipantId]?.avatarUrl ||
          users[firstOtherParticipantId]?.profile_image_url ||
          '/default-avatar.svg';
      }
    }
  }

  return (
    <header className="chat-header px-3 py-2 flex items-center justify-between bg-white dark:bg-gray-800">
      <div className="flex items-center space-x-2">
        <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronLeft className="h-3 w-3" />
        </button>
        <div className="flex-shrink-0 relative">
          {conversation?.type === 'GROUP' && participantCount > 1 ? (
            <div className="relative w-8 h-8">
              {/* Show first avatar */}
              <img
                src={avatarUrl}
                alt={name}
                className="w-8 h-8 rounded-full object-cover"
              />
              {/* Show second avatar offset */}
              {participantCount >= 2 && (
                <img
                  src={conversation.participantAvatars?.[conversation.participantIds?.[1] || ''] || users[conversation.participantIds?.[1] || '']?.avatarUrl || users[conversation.participantIds?.[1] || '']?.profile_image_url || '/default-avatar.svg'}
                  alt={`${name} participant`}
                  className="absolute left-1 top-1 w-6 h-6 rounded-full object-cover border-1 border-white dark:border-gray-700"
                />
              )}
              {/* Show third avatar offset */}
              {participantCount >= 3 && (
                <img
                  src={conversation.participantAvatars?.[conversation.participantIds?.[2] || ''] || users[conversation.participantIds?.[2] || '']?.avatarUrl || users[conversation.participantIds?.[2] || '']?.profile_image_url || '/default-avatar.svg'}
                  alt={`${name} participant`}
                  className="absolute left-2 top-2 w-5 h-5 rounded-full object-cover border-1 border-white dark:border-gray-700"
                />
              )}
              {/* Show participant count badge */}
              <div className="absolute bottom-0 right-0 w-4 h-4 flex items-center justify-center bg-blue-500 text-xs text-white rounded-full border-1 border-white dark:border-gray-800">
                {participantCount}
              </div>
            </div>
          ) : (
            <>
              <img
                src={avatarUrl}
                alt={name}
                className="w-8 h-8 rounded-full object-cover"
              />
              {/* Online indicator for direct conversation (shows other participant's status) */}
              {conversation?.type === 'DIRECT' && otherParticipantId && (
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-white dark:border-gray-800">
                  {users[otherParticipantId]?.online && <div className="w-full h-full bg-green-600 rounded-full" />}
                </div>
              )}
            </>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate max-w-xs">
            {name}
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-1">
            {conversation?.type === 'GROUP' ? (
              <>
                <UsersIcon className="h-2.5 w-2.5" />
                <span>{onlineCount} online · {participantCount} members</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full inline-block">
                  {otherParticipantId && users[otherParticipantId]?.online ? (
                    <span className="bg-green-500" />
                  ) : (
                    <span className="bg-gray-400" />
                  )}
                </span>
                <span className="ml-0.5">
                  {otherParticipantId && users[otherParticipantId]?.online ? 'Online' : 'Offline'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-1">
        <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <Search className="h-3 w-3" />
        </button>
        <button
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={() => {
            console.log('More actions clicked');
            // TODO: Implement menu
          }}
        >
          <MoreVertical className="h-3 w-3" />
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;
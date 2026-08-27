'use client';

import React, { useState } from 'react';
import type { ChatMessage } from '@/types/chat';
import { useChatStore } from '@/chat/store/chatStore';
import { useUser } from '@clerk/nextjs';
import { formatDistanceToNow } from 'date-fns';
import { CloudDownload, Reply, Heart, Eye, Plus, Smile, Edit, Trash2 } from 'lucide-react';
import VoiceMessageBubble from './VoiceMessageBubble';
import { ChatRepository } from '@/chat/repository';

// Time threshold for grouping messages (5 minutes in milliseconds)
const GROUP_THRESHOLD_MS = 5 * 60 * 1000;

interface MessageGroup {
  userId: string;
  messages: ChatMessage[];
  showHeader: boolean;
}

export const MessageList = ({ messages }: MessageListProps) => {
  const { users } = useChatStore();
  const { user: clerkUser } = useUser();

  // Helper to get user info from store (presence) or fallback
  const getUser = (userId: string) => {
    return users[userId] || { id: userId, name: 'Unknown', avatarUrl: '', online: false };
  };

  // Helper to determine if message is from current user
  const isCurrentUser = (message: ChatMessage) => {
    return clerkUser?.id === message.senderId;
  };

  // Emoji picker state
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string>('');
   
  // Edit message state
  const [editMessageId, setEditMessageId] = useState<string | null>(null);
  const [editMessageContent, setEditMessageContent] = useState<string>('');

  // Handle adding a reaction
  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      await ChatRepository.addReaction(messageId, emoji);
    } catch (error) {
      console.error('Failed to add reaction:', error);
      // TODO: Show error toast
    }
  };

  // Handle removing a reaction (if user already reacted)
  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    try {
      await ChatRepository.removeReaction(messageId, emoji);
    } catch (error) {
      console.error('Failed to remove reaction:', error);
      // TODO: Show error toast
    }
  };

  // Handle editing a message
  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await ChatRepository.updateMessage(messageId, { content: newContent });
      setEditMessageId(null);
      setEditMessageContent('');
    } catch (error) {
      console.error('Failed to edit message:', error);
      // TODO: Show error toast
    }
  };

  // Handle deleting a message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await ChatRepository.deleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
      // TODO: Show error toast
    }
  };

  // Check if current user has already reacted with this emoji
  const hasUserReacted = (message: ChatMessage, emoji: string): boolean => {
    return message.reactions?.[emoji]?.includes(clerkUser?.id ?? '') ?? false;
  };

  // Handle emoji selection from picker
  const handleEmojiSelect = (emoji: string) => {
    if (emojiPickerMessageId) {
      handleAddReaction(emojiPickerMessageId, emoji);
      setEmojiPickerVisible(false);
    }
  };

  // Group messages by user and time threshold
  const groupedMessages = React.useMemo(() => {
    if (!messages || messages.length === 0) return [];

    const groups: MessageGroup[] = [];
    let currentGroup: MessageGroup | null = null;

    for (const msg of messages) {
      if (!currentGroup) {
        // Start a new group
        currentGroup = {
          userId: msg.senderId,
          messages: [msg],
          showHeader: true, // Always show header for the first message in a group
        };
        groups.push(currentGroup);
        continue;
      }

      const lastMessageInGroup = currentGroup.messages[currentGroup.messages.length - 1];
      const timeDiff = new Date(msg.createdAt).getTime() - new Date(lastMessageInGroup.createdAt).getTime();

      // If same user and within time threshold, add to current group
      if (
        msg.senderId === currentGroup.userId &&
        timeDiff <= GROUP_THRESHOLD_MS
      ) {
        currentGroup.messages.push(msg);
        // Only the first message in the group shows the header
        // We don't change showHeader for existing messages in the group
      } else {
        // Start a new group
        currentGroup = {
          userId: msg.senderId,
          messages: [msg],
          showHeader: true, // New group always shows header
        };
        groups.push(currentGroup);
      }
    }

    return groups;
  }, [messages]);

  return (
    <>
      <div className="space-y-4">
        {groupedMessages.map((group, groupIndex) => (
          <>
            {/* User header for the group (if showHeader is true) */}
            {group.showHeader && (
              <div className={`flex ${
                isCurrentUser({ ...group.messages[0], senderId: group.userId } as ChatMessage)
                  ? 'justify-end' : 'justify-start'
              } mb-2`}>
                <div className="flex items-center space-x-2">
                  {group.messages[0].senderId === clerkUser?.id ? (
                    <>
                      {/* Current user: show their avatar from clerk or fallback */}
                      {clerkUser?.imageUrl ? (
                        <img
                          src={clerkUser.imageUrl}
                          alt="Avatar"
                          className="h-8 w-8 rounded-full border-2 border-blue-500"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
                          {clerkUser?.firstName?.[0] ?? 'U'}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Other user: use avatar from store or fallback */}
                      {getUser(group.userId).avatarUrl ? (
                        <img
                          src={getUser(group.userId).avatarUrl}
                          alt="Avatar"
                          className="h-8 w-8 rounded-full border-2 border-gray-300"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-500 text-white flex items-center justify-center text-sm font-medium">
                          {getUser(group.userId).name?.split(' ')[0]?.[0] ?? 'U'}
                        </div>
                      )}
                    </>
                  )}
                  <div className="text-sm font-medium">
                    {getUser(group.userId).name}
                    {!getUser(group.userId).online && (
                      <span className="ml-1 text-xs text-gray-400">(offline)</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Messages in the group */}
            <div className="space-y-1">
              {group.messages.map((msg, msgIndex) => {
                const isFirstInGroup = msgIndex === 0;
                const isSameUserAsPrevious = msgIndex > 0 && group.messages[msgIndex - 1].senderId === msg.senderId;
                const isSameUserAsNext = msgIndex < group.messages.length - 1 && group.messages[msgIndex + 1].senderId === msg.senderId;
                
                return (
                  <div key={msg.id} className="message-group flex">
                    {/* Avatar column - only show for first message in group or when user changes */}
                    {!isSameUserAsPrevious && (
                      <div className="flex-shrink-0">
                        {isCurrentUser(msg) ? (
                          <>
                            {clerkUser?.imageUrl ? (
                              <img
                                src={clerkUser.imageUrl}
                                alt="Avatar"
                                className="h-8 w-8 rounded-full border-2 border-blue-500 mt-0.5"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium mt-0.5">
                                {clerkUser?.firstName?.[0] ?? 'U'}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {getUser(msg.senderId).avatarUrl ? (
                              <img
                                src={getUser(msg.senderId).avatarUrl}
                                alt="Avatar"
                                className="h-8 w-8 rounded-full border-2 border-gray-300 mt-0.5"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-500 text-white flex items-center justify-center text-sm font-medium mt-0.5">
                                {getUser(msg.senderId).name?.split(' ')[0]?.[0] ?? 'U'}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Message content */}
                    <div className={`flex-1 flex-col ${
                      isSameUserAsPrevious ? 'ml-2' : 'ml-4'
                    }`}>
                      {/* Message bubble */}
                      <div className={`flex ${
                        isCurrentUser(msg) ? 'justify-end' : 'justify-start'
                        } mb-1`}>
                        <div className={`max-w-[7/12] rounded-xl px-3 py-2 ${
                          isCurrentUser(msg)
                            ? 'bg-blue-500 text-white dark:bg-blue-600'
                            : 'bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-white'
                        } ${
                          // Add subtle border for visual separation
                          !isSameUserAsPrevious && !isCurrentUser(msg)
                            ? 'border-l-2 border-blue-500'
                            : ''
                        } ${
                          // Thread indicator for replies
                          msg.replyToId
                            ? 'border-l-2 border-dashed border-blue-300 pl-3'
                            : ''
                        }`}>
                          {/* Message content based on type */}
                          {msg.messageType === 'TEXT' && (
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          )}
                          {msg.messageType === 'VOICE' && (
                            <VoiceMessageBubble message={msg} isCurrentUser={isCurrentUser(msg)} />
                          )}
                          {msg.messageType === 'IMAGE' && (
                            <>
                              {msg.attachments?.map((att) => (
                                <img
                                  key={att.id}
                                  src={att.fileUrl}
                                  alt={att.fileName}
                                  className="max-w-[200px] rounded hover:cursor-pointer transition-transform duration-200 hover:scale-105"
                                />
                              ))}
                            </>
                          )}
                          {msg.messageType === 'FILE' && (
                            <div className="flex items-center space-x-2">
                              {msg.attachments?.map((att) => (
                                <div key={att.id} className="flex items-center space-x-1">
                                  <CloudDownload className="h-4 w-4 text-blue-400 dark:text-blue-300" />
                                  <span className="text-sm text-gray-600 dark:text-gray-400">{att.fileName}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {msg.messageType === 'PATIENT_CASE' && (
                            <div className="border-l-2 border-blue-500 pl-2">
                              <p className="font-medium">Patient Case: {msg.content}</p>
                              {/* TODO: Show patient case details */}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Message metadata - only show for last message in group or when user changes */}
                      {!isSameUserAsNext && (
                        <div className={`flex ${
                          isCurrentUser(msg) ? 'justify-end' : 'justify-start'
                        } mt-0 text-xs text-gray-500 dark:text-gray-400`}>
                          {/* Only show timestamp for the last message in a group or if not grouped */}
                          {msgIndex === group.messages.length - 1 && (
                            <span className="mr-2">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                          )}
                          {/* Reactions */}
                          <div className="flex items-center space-x-2">
                            {/* Add reaction button */}
                            <button
                              onClick={() => {
                                setEmojiPickerMessageId(msg.id);
                                setEmojiPickerVisible(true);
                              }}
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-xs"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            {/* Existing reactions */}
                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <>
                                {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                                  <span key={emoji} className="flex items-center mr-1">
                                    <button
                                      onClick={() => {
                                        if (hasUserReacted(msg, emoji)) {
                                          handleRemoveReaction(msg.id, emoji);
                                        } else {
                                          handleAddReaction(msg.id, emoji);
                                        }
                                      }}
                                      className={`p-1 rounded ${
                                        hasUserReacted(msg, emoji)
                                          ? 'bg-blue-500 dark:bg-blue-400'
                                          : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                                      }`}
                                    >
                                      <span className="mr-1">{emoji}</span>
                                      <span className="text-xs text-gray-600 dark:text-gray-400">
                                        {userIds.length}
                                      </span>
                                    </button>
                                  </span>
                                ))}
                              </>
                            )}
                          </div>

                          {/* Reply button */}
                          <button
                            onClick={() => {
                              // TODO: Implement setting the replyToId (e.g., via chat store or prop)
                              console.log("Reply to message:", msg.id);
                            }}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-xs"
                            title="Reply"
                          >
                            <Reply className="h-3 w-3" />
                          </button>
                          {/* Reply indicator */}
                          {msg.replyToId && (
                            <Reply className="h-3 w-3 mx-1" />
                          )}
                          {/* Message actions (only for current user's messages) */}
                          {isCurrentUser(msg) && (
                            <div className="ml-2 flex items-center space-x-1">
                              {editMessageId === msg.id ? (
                                // Edit mode
                                <>
                                  <input
                                    type="text"
                                    value={editMessageContent}
                                    onChange={(e) => setEditMessageContent(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleEditMessage(msg.id, editMessageContent);
                                      } else if (e.key === 'Escape') {
                                        setEditMessageId(null);
                                        setEditMessageContent('');
                                      }
                                    }}
                                    autoFocus
                                    className="border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <button
                                    onClick={() => {
                                      handleEditMessage(msg.id, editMessageContent);
                                    }}
                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-xs"
                                    title="Save"
                                  >
                                    <Smile className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditMessageId(null);
                                      setEditMessageContent('');
                                    }}
                                    className="p-1 rounded hover:bg-gray-200 dark:bg-gray-600 text-xs"
                                    title="Cancel"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </>
                              ) : (
                                // Normal mode
                                <>
                                  {/* Edit button */}
                                  <button
                                    onClick={() => {
                                      setEditMessageId(msg.id);
                                      setEditMessageContent(msg.content);
                                    }}
                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-xs"
                                    title="Edit message"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  {/* Delete button */}
                                  <button
                                    onClick={() => {
                                      // TODO: Implement delete functionality with confirmation
                                      if (window.confirm('Are you sure you want to delete this message?')) {
                                        handleDeleteMessage(msg.id);
                                      }
                                    }}
                                    className="p-1 rounded hover:bg-red-200 dark:hover:bg-red-700 text-xs"
                                    title="Delete message"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ))}
      </div>
      
      {/* Emoji picker portal */}
      {emojiPickerVisible && emojiPickerMessageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="relative pointer-events-all">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-64 p-4 space-y-3">
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-medium">Add a reaction</h3>
                <button
                  onClick={() => setEmojiPickerVisible(false)}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {/* Commonly used emojis */}
                {[  
                  '👍', '👎', '❤️', '😂', '😮', '😢', '👏', '🙏',
                  '😘', '😎', '🤔', '🎉', '🔥', '💯', '✨', '🎁',
                  '🎈', '🎊', '💖', '💔', '👌', '🤝', '👫', '👬',
                  '👭', '👂', '👃', '👄', '👅', '👆', '👇', '👈',
                  '👉', '✊', '✋', '✌️', '👌', '✏️', '💬', '💭'
                ].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-2xl"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default MessageList;
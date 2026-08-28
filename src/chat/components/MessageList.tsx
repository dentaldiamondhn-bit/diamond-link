'use client';

import React, { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  Reply,
  ChevronDown,
  Edit,
  Trash2,
  Check,
  X,
  CloudDownload,
  Briefcase,
} from 'lucide-react';
import { useChatStore } from '@/chat/store/chatStore';
import { ChatRepository } from '@/chat/repository';
import { useTranslations } from '@/chat/i18n/useTranslations';
import type { ChatMessage } from '@/types/chat';
import { getUserDisplayName, getInitials, getAvatarColor } from '@/chat/utils';
import VoiceMessageBubble from './VoiceMessageBubble';

function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(style.overflowY)) return node;
    node = node.parentElement;
  }
  return null;
}

const GROUP_THRESHOLD_MS = 5 * 60 * 1000;

const ACTION_MENU_HEIGHT_PX = 220;

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const FREQUENT_REACTIONS = ['🔥', '👏', '😘', '🎉'];

const ALL_REACTIONS = [
  '👍', '👎', '👌', '🤝', '✌️', '🙏', '👋', '💪',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  '😆', '😊', '😍', '😘', '😎', '🤔', '😮', '😢',
  '😂', '😭', '🥳', '🎉', '🔥', '✨', '💯', '🎯',
  '💖', '💗', '💘', '💔', '🦋', '🌹', '🍀', '🌈',
  '🌟', '⭐', '☀️', '🐝', '🐣', '🍩', '🍕', '⚡',
];

interface MessageListProps {
  messages: ChatMessage[];
}

export const MessageList = ({ messages }: MessageListProps) => {
  const { t } = useTranslations();
  const { users, currentUserId } = useChatStore();

  const [actionMenuFor, setActionMenuFor] = useState<{
    id: string;
    position: 'above' | 'below';
  } | null>(null);
  const [emojiFullFor, setEmojiFullFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const isCurrentUser = (msg: ChatMessage) => msg.sender_id === currentUserId;

  const groups = useMemo(() => {
    if (!messages.length) return [];
    const result: { userId: string; messages: ChatMessage[] }[] = [];
    let current: { userId: string; messages: ChatMessage[] } | null = null;

    for (const msg of messages) {
      if (
        current &&
        msg.sender_id === current.userId &&
        new Date(msg.created_at).getTime() -
          new Date(current.messages[current.messages.length - 1].created_at).getTime() <=
          GROUP_THRESHOLD_MS
      ) {
        current.messages.push(msg);
      } else {
        current = { userId: msg.sender_id, messages: [msg] };
        result.push(current);
      }
    }
    return result;
  }, [messages]);

  const hasUserReacted = (msg: ChatMessage, emoji: string) =>
    (msg.reactions?.[emoji] || []).includes(currentUserId ?? '');

  const handleToggleReaction = async (msg: ChatMessage, emoji: string) => {
    if (!currentUserId) return;
    try {
      if (hasUserReacted(msg, emoji)) {
        await ChatRepository.removeReaction(currentUserId, msg.id, emoji);
        return;
      }
      const existing = Object.entries(msg.reactions || {}).find(([, ids]) =>
        ids.includes(currentUserId)
      );
      if (existing && existing[0] !== emoji) {
        await ChatRepository.removeReaction(currentUserId, msg.id, existing[0]);
      }
      await ChatRepository.addReaction(currentUserId, msg.id, emoji);
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  const handlePickReaction = (msgId: string | null, emoji: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (msg) handleToggleReaction(msg, emoji);
    setActionMenuFor(null);
    setEmojiFullFor(null);
  };

  const openActionMenu = (msgId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const rowEl = e.currentTarget.closest('[data-message-id]') as HTMLElement | null;
    const scroller = getScrollParent(rowEl);
    let position: 'above' | 'below' = 'above';
    if (rowEl && scroller) {
      const rowRect = rowEl.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      const rowMidY = rowRect.top + rowRect.height / 2;
      const centerY = scrollerRect.top + scrollerRect.height / 2;
      const preferBelow = rowMidY <= centerY;
      const spaceAbove = rowRect.top - scrollerRect.top;
      const spaceBelow = scrollerRect.bottom - rowRect.bottom;
      if (preferBelow && spaceBelow >= ACTION_MENU_HEIGHT_PX) position = 'below';
      else if (!preferBelow && spaceAbove >= ACTION_MENU_HEIGHT_PX) position = 'above';
      else if (spaceBelow >= ACTION_MENU_HEIGHT_PX) position = 'below';
      else position = 'above';
    }
    setActionMenuFor({ id: msgId, position });
  };

  const handleEdit = async (msg: ChatMessage) => {
    if (!currentUserId || !editingContent.trim()) return;
    try {
      await ChatRepository.updateMessage(currentUserId, msg.id, { content: editingContent.trim() });
      setEditingId(null);
      setEditingContent('');
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const handleDelete = async (msg: ChatMessage) => {
    if (!currentUserId) return;
    if (!window.confirm(t('deleteMessageConfirm'))) return;
    try {
      await ChatRepository.deleteMessage(currentUserId, msg.id);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const renderBubble = (msg: ChatMessage) => {
    switch (msg.message_type) {
      case 'voice':
        return <VoiceMessageBubble message={msg} isCurrentUser={isCurrentUser(msg)} />;
      case 'image':
        return (
          <div className="space-y-2">
            {(msg.attachments || []).map((att) => (
              <img
                key={att.id}
                src={att.file_url}
                alt={att.file_name}
                className="max-w-[240px] rounded-xl cursor-pointer hover:opacity-90"
              />
            ))}
            {msg.content && <p className="text-sm">{msg.content}</p>}
          </div>
        );
      case 'file':
        return (
          <div className="space-y-2">
            {(msg.attachments || []).map((att) => (
              <a
                key={att.id}
                href={att.file_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <CloudDownload className="h-4 w-4" />
                {att.file_name}
              </a>
            ))}
            {msg.content && <p className="text-sm">{msg.content}</p>}
          </div>
        );
      case 'patient_case':
        return (
          <div className="flex items-start gap-2">
            <Briefcase className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">{t('patientCase')}</p>
              <p className="text-sm">
                {msg.patient_case_link?.title || msg.content || t('patientCase')}
              </p>
            </div>
          </div>
        );
      default:
        return <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>;
    }
  };

  const renderAvatar = (userId: string) => {
    const user = users[userId];
    if (user?.profile_image_url) {
      return <img src={user.profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover" />;
    }
    const displayName = getUserDisplayName(user);
    return (
      <div
        className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-medium ${getAvatarColor(
          displayName
        )}`}
      >
        {getInitials(displayName)}
      </div>
    );
  };

  if (!messages.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center">
        <p className="text-lg font-medium text-gray-500 dark:text-gray-400">{t('emptyMessages')}</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('sendFirstMessage')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      {groups.map((group, gi) => {
        return (
          <div key={`${group.userId}-${gi}`} className="space-y-1">
            {group.messages.map((msg, mi) => {
              const first = mi === 0;
              const last = mi === group.messages.length - 1;
              const mine = isCurrentUser(msg);
              const reactions = msg.reactions || {};

              return (
                <div
                  key={msg.id}
                  data-message-id={msg.id}
                  className={`group relative flex ${mine ? 'justify-end' : 'justify-start'} px-2`}
                >
                  <div className={`flex items-end gap-2 max-w-[75%] ${mine ? 'flex-row-reverse' : ''}`}>
                    {actionMenuFor?.id === msg.id && (
                      <div
                        className={`absolute z-20 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-xl overflow-hidden ${
                          actionMenuFor.position === 'below'
                            ? 'top-full mt-2'
                            : 'bottom-full mb-2'
                        } ${mine ? 'right-0' : 'left-0'}`}
                      >
                        <div className="flex items-center px-1.5 py-1.5">
                          {QUICK_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handlePickReaction(msg.id, emoji)}
                              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-xl leading-none"
                            >
                              {emoji}
                            </button>
                          ))}
                          <span className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5" />
                          {FREQUENT_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handlePickReaction(msg.id, emoji)}
                              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-xl leading-none"
                            >
                              {emoji}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              setEmojiFullFor(msg.id);
                              setActionMenuFor(null);
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300"
                            title={t('addReaction')}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-600" />
                        <button
                          onClick={() => console.log('Reply to message:', msg.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Reply className="h-4 w-4" />
                          {t('reply')}
                        </button>
                        {mine && editingId !== msg.id && (
                          <button
                            onClick={() => {
                              setEditingId(msg.id);
                              setEditingContent(msg.content);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Edit className="h-4 w-4" />
                            {t('editMessage')}
                          </button>
                        )}
                        {mine && (
                          <button
                            onClick={() => handleDelete(msg)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t('deleteMessage')}
                          </button>
                        )}
                      </div>
                    )}
                    {!mine && first && renderAvatar(msg.sender_id)}
                    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} min-w-0`}>
                      {!mine && first && msg.sender_id !== currentUserId && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                          {getUserDisplayName(users[msg.sender_id])}
                        </span>
                      )}

                      {editingId === msg.id ? (
                        <div className="flex items-center gap-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1">
                          <input
                            type="text"
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEdit(msg);
                              if (e.key === 'Escape') {
                                setEditingId(null);
                                setEditingContent('');
                              }
                            }}
                            autoFocus
                            className="text-sm w-48 outline-none bg-transparent text-gray-900 dark:text-white"
                          />
                          <button
                            onClick={() => handleEdit(msg)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-green-600"
                            title={t('save')}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditingContent('');
                            }}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500"
                            title={t('cancel')}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`rounded-2xl px-3 py-2 ${
                            mine
                              ? 'bg-blue-500 text-white dark:bg-blue-600'
                              : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          {msg.reply_to_id && (
                            <p
                              className={`text-xs mb-1 truncate max-w-[200px] ${
                                mine ? 'text-blue-100' : 'text-gray-500'
                              }`}
                            >
                              ↪ {msg.reply_to?.content || '...'}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 min-w-0">{renderBubble(msg)}</div>
                            <button
                              onClick={(e) =>
                                actionMenuFor?.id === msg.id
                                  ? setActionMenuFor(null)
                                  : openActionMenu(msg.id, e)
                              }
                              className={`flex-shrink-0 p-1 rounded-full transition-opacity ${
                                mine
                                  ? 'text-blue-100 hover:bg-black/10'
                                  : 'text-gray-400 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                              } ${
                                actionMenuFor?.id === msg.id
                                  ? 'opacity-100'
                                  : 'opacity-40 group-hover:opacity-100'
                              }`}
                              title={t('moreActions')}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {msg.is_edited && (
                            <span
                              className={`block text-[10px] mt-1 ${
                                mine ? 'text-blue-100' : 'text-gray-400'
                              }`}
                            >
                              {t('edited')}
                            </span>
                          )}
                        </div>
                      )}

                      <div
                        className={`flex items-center gap-2 mt-0.5 text-xs text-gray-400 dark:text-gray-500 ${
                          mine ? 'flex-row-reverse' : ''
                        }`}
                      >
                        {last && (
                          <span className="text-[10px]">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                        )}

                        {Object.entries(reactions).length > 0 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {Object.entries(reactions).map(([emoji, userIds]) => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg, emoji)}
                                className={`px-1.5 py-0.5 rounded-full text-xs border flex items-center gap-0.5 ${
                                  hasUserReacted(msg, emoji)
                                    ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-300'
                                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                                }`}
                              >
                                {emoji} {userIds.length}
                              </button>
                            ))}
                          </div>
                        )}

                        </div>
                    </div>
                    </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {emojiFullFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 pointer-events-none"
          onClick={() => setEmojiFullFor(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('addReaction')}
              </h3>
              <button
                onClick={() => setEmojiFullFor(null)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-8 gap-1 max-h-80 overflow-y-auto pr-1">
              {ALL_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handlePickReaction(emojiFullFor, emoji)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-xl"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;
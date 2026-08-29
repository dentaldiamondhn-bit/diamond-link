'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  Reply,
  ChevronDown,
  CornerDownRight,
  Edit,
  Trash2,
  Check,
  X,
  CloudDownload,
  Briefcase,
} from 'lucide-react';
import { List, useDynamicRowHeight, useListCallbackRef } from 'react-window';
import type { RowComponentProps, ListImperativeAPI } from 'react-window';
import { useChatStore } from '@/chat/store/chatStore';
import { ChatRepository } from '@/chat/repository';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { interpolate, translations, type TranslationKey } from '@/chat/i18n/translations';
import type { ChatMessage, ChatUser } from '@/types/chat';
import { getUserDisplayName, getInitials, getAvatarColor, getMessageReadStatus } from '@/chat/utils';
import VoiceMessageBubble from './VoiceMessageBubble';
import EmojiPicker from './EmojiPicker';

function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(style.overflowY)) return node;
    node = node.parentElement;
  }
  return null;
}

// react-window renders rows top-first using the default estimated height and
// measures the real heights asynchronously (ResizeObserver) — the measured
// heights only start arriving AFTER the bottom rows are scrolled into view.
// A single scrollToRow therefore lands on the estimated position (scrollTop 0
// for short chats). Re-pin to scrollHeight each frame until the measured
// content height integrates and the bottom stays settled for a few frames.
function pinListToBottom(list: ListImperativeAPI, lastRowIndex: number) {
  const el = list.element;
  if (!el) return;
  list.scrollToRow({ index: lastRowIndex, align: 'end', behavior: 'auto' });
  let raf = 0;
  let lastScrollHeight = -1;
  let stableFrames = 0;
  const startedAt = performance.now();
  const stop = () => {
    cancelAnimationFrame(raf);
    el.removeEventListener('wheel', stop);
    el.removeEventListener('touchstart', stop);
  };
  el.addEventListener('wheel', stop, { once: true, passive: true });
  el.addEventListener('touchstart', stop, { once: true, passive: true });
  const frame = () => {
    const scrollHeight = el.scrollHeight;
    if (scrollHeight === lastScrollHeight) stableFrames += 1;
    else {
      stableFrames = 0;
      lastScrollHeight = scrollHeight;
    }
    el.scrollTop = el.scrollHeight;
    const atBottom = el.clientHeight > 0 && scrollHeight - el.scrollTop - el.clientHeight <= 4;
    const settled = atBottom && stableFrames >= 8;
    if (settled || performance.now() - startedAt > 3000) return stop();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

const GROUP_THRESHOLD_MS = 5 * 60 * 1000;

const ACTION_MENU_HEIGHT_PX = 220;

const DEFAULT_ROW_HEIGHT = 48;

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const FREQUENT_REACTIONS = ['🔥', '👏', '😘', '🎉'];

interface RowDatum {
  msg: ChatMessage;
  mine: boolean;
  isFirst: boolean;
  isLast: boolean;
}

interface MessageListProps {
  messages: ChatMessage[];
  onReplyTo?: (msg: ChatMessage) => void;
  replyToId?: string | null;
  participantUserIds?: string[];
}

interface RowProps {
  rows: RowDatum[];
  users: Record<string, ChatUser>;
  currentUserId: string | null;
  replyToId?: string | null;
  highlightedId: string | null;
  editingId: string | null;
  editingContent: string;
  actionMenuFor: { id: string; position: 'above' | 'below' } | null;
  readReceipts: Record<string, ChatUser[]>;
  otherParticipantIds: string[];
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  onToggleReaction: (msg: ChatMessage, emoji: string) => void;
  onPickReaction: (msgId: string | null, emoji: string) => void;
  onJump: (msgId: string) => void;
  onReply: (msg: ChatMessage) => void;
  onDelete: (msgId: string) => void;
  onOpenMenu: (msgId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onCloseMenu: () => void;
  onStartEdit: (msg: ChatMessage) => void;
  onCancelEdit: () => void;
  onCommitEdit: (msg: ChatMessage) => void;
  onEditContentChange: (value: string) => void;
  onOpenEmojiFull: (msgId: string) => void;
}

const MessageRow = function MessageRow({
  index,
  style,
  ariaAttributes,
  ...rowProps
}: RowComponentProps<RowProps>) {
  const {
    rows,
    users,
    currentUserId,
    replyToId,
    highlightedId,
    editingId,
    editingContent,
    actionMenuFor,
    t,
    readReceipts,
    otherParticipantIds,
    onToggleReaction,
    onPickReaction,
    onJump,
    onReply,
    onDelete,
    onOpenMenu,
    onCloseMenu,
    onStartEdit,
    onCancelEdit,
    onCommitEdit,
    onEditContentChange,
    onOpenEmojiFull,
  } = rowProps;
  const datum = rows[index];
  if (!datum) return null;
  const msg = datum.msg;
  const mine = datum.mine;
  const reactions = msg.reactions || {};
  const hasUserReacted = (emoji: string) => (reactions[emoji] || []).includes(currentUserId ?? '');

  // The server only embeds `reply_to` on full re-fetches; for realtime/fresh
  // inserts it is missing, so fall back to the message already in this list.
  const resolveReplyTarget = (m: ChatMessage): ChatMessage | undefined =>
    (m.reply_to?.id ? (m.reply_to as ChatMessage) : undefined) ||
    rows.find((r) => r.msg.id === m.reply_to_id)?.msg;

  const replySenderName = (m: ChatMessage): string => {
    const target = resolveReplyTarget(m);
    if (!target) return '';
    const sender = target.sender || users[target.sender_id];
    return sender ? getUserDisplayName(sender) : '';
  };

  const replyPreviewText = (m: ChatMessage): string => {
    const target = resolveReplyTarget(m);
    if (!target) return '...';
    switch (target.message_type) {
      case 'image':
        return t('imageMessage');
      case 'file':
        return t('fileMessage');
      case 'voice':
        return t('voiceMessage');
      case 'patient_case':
        return target.patient_case_link?.title || target.content || t('patientCase');
      default:
        return target.content || '...';
    }
  };

  const renderBubble = (m: ChatMessage) => {
    switch (m.message_type) {
      case 'voice':
        return <VoiceMessageBubble message={m} isCurrentUser={mine} />;
      case 'image':
        return (
          <div className="space-y-2">
            {(m.attachments || []).map((att) => (
              <img
                key={att.id}
                src={att.file_url}
                alt={att.file_name}
                className="max-w-[240px] rounded-xl cursor-pointer hover:opacity-90"
              />
            ))}
            {m.content && <p className="text-sm">{m.content}</p>}
          </div>
        );
      case 'file':
        return (
          <div className="space-y-2">
            {(m.attachments || []).map((att) => (
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
            {m.content && <p className="text-sm">{m.content}</p>}
          </div>
        );
      case 'patient_case':
        return (
          <div className="flex items-start gap-2">
            <Briefcase className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">{t('patientCase')}</p>
              <p className="text-sm">
                {m.patient_case_link?.title || m.content || t('patientCase')}
              </p>
            </div>
          </div>
        );
      default:
        return <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>;
    }
  };

  const renderAvatar = (userId: string) => {
    const user = users[userId];
    if (user?.profile_image_url) {
      return (
        <img src={user.profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover" />
      );
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

  // Stacked mini-avatars of who has read my latest message (WhatsApp-style).
  const renderReadAvatars = (readers: ChatUser[]) => {
    if (!readers.length) return null;
    const shown = readers.slice(0, 2);
    const extra = readers.length - shown.length;
    return (
      <span className="flex items-center">
        {shown.map((user, i) => (
          <span
            key={user.id}
            className={`w-4 h-4 rounded-full ring-2 ring-gray-50 dark:ring-gray-800 overflow-hidden ${
              i > 0 ? '-ml-1' : ''
            }`}
          >
            {user.profile_image_url ? (
              <img src={user.profile_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span
                className={`w-full h-full flex items-center justify-center text-[8px] text-white font-medium ${getAvatarColor(
                  getUserDisplayName(user)
                )}`}
              >
                {getInitials(getUserDisplayName(user))}
              </span>
            )}
          </span>
        ))}
        {extra > 0 && (
          <span className="text-[9px] text-gray-400 dark:text-gray-500 -ml-0.5">+{extra}</span>
        )}
      </span>
    );
  };

  // WhatsApp-style status for MY messages: ✓ sent → ✓✓ delivered → ✓✓ blue read.
  const renderReadStatus = (m: ChatMessage) => {
    const status = getMessageReadStatus(m, currentUserId, otherParticipantIds);
    const isRead = status === 'read';
    const isDelivered = status === 'delivered';
    return (
      <span
        className={`flex items-center leading-none ${
          isRead ? 'text-blue-500 dark:text-blue-400' : 'text-gray-300 dark:text-gray-500'
        }`}
        title={isRead ? 'Leído' : isDelivered ? 'Entregado' : 'Enviado'}
      >
        <Check className="h-3 w-3" strokeWidth={2.5} />
        {status !== 'sent' && <Check className="h-3 w-3 -ml-1" strokeWidth={2.5} />}
      </span>
    );
  };

  return (
<div
        style={style}
        data-message-id={msg.id}
        role={ariaAttributes.role}
        aria-posinset={ariaAttributes['aria-posinset']}
        aria-setsize={ariaAttributes['aria-setsize']}
        className={`group relative flex px-2 ${
          datum.isLast ? 'pb-4' : 'pb-1'
        } ${
          mine ? 'justify-end' : 'justify-start'
        } ${highlightedId === msg.id ? 'rounded-2xl bg-blue-50 dark:bg-blue-900/30' : ''}`}
      >
        <div className={`flex items-end gap-2 max-w-[75%] ${mine ? 'flex-row-reverse' : ''}`}>
        {actionMenuFor?.id === msg.id && (
          <div
            className={`absolute z-20 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-xl overflow-hidden ${
              actionMenuFor.position === 'below' ? 'top-full mt-2' : 'bottom-full mb-2'
            } ${mine ? 'right-0' : 'left-0'}`}
          >
            <div className="flex items-center px-1.5 py-1.5">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onPickReaction(msg.id, emoji)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-xl leading-none"
                >
                  {emoji}
                </button>
              ))}
              <span className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5" />
              {FREQUENT_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onPickReaction(msg.id, emoji)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-xl leading-none"
                >
                  {emoji}
                </button>
              ))}
              <button
                onClick={() => onOpenEmojiFull(msg.id)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300"
                title={t('addReaction')}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600" />
            <button
              onClick={() => onReply(msg)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Reply className="h-4 w-4" />
              {t('reply')}
            </button>
            {mine && editingId !== msg.id && (
              <button
                onClick={() => onStartEdit(msg)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Edit className="h-4 w-4" />
                {t('editMessage')}
              </button>
            )}
            {mine && (
              <button
                onClick={() => onDelete(msg.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <Trash2 className="h-4 w-4" />
                {t('deleteMessage')}
              </button>
            )}
          </div>
        )}
        {!mine && datum.isFirst && renderAvatar(msg.sender_id)}
        <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} min-w-0`}>
          {!mine && datum.isFirst && msg.sender_id !== currentUserId && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              {getUserDisplayName(users[msg.sender_id])}
            </span>
          )}

          {editingId === msg.id ? (
            <div className="flex items-center gap-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1">
              <input
                type="text"
                value={editingContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onCommitEdit(msg);
                  if (e.key === 'Escape') onCancelEdit();
                }}
                autoFocus
                className="text-sm w-48 outline-none bg-transparent text-gray-900 dark:text-white"
              />
              <button
                onClick={() => onCommitEdit(msg)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-green-600"
                title={t('save')}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onCancelEdit}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500"
                title={t('cancel')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div
              className={`rounded-2xl px-3 py-2 transition-shadow ${
                mine
                  ? 'bg-blue-500 text-white dark:bg-blue-600'
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
              } ${replyToId === msg.id ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''}`}
            >
              {msg.reply_to_id && (
                <button
                  type="button"
                  onClick={() => onJump(msg.reply_to_id!)}
                  className={`mb-1 flex w-full max-w-[200px] items-center gap-1 rounded px-0.5 text-xs ${
                    mine ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  } ${
                    mine ? 'hover:bg-black/10' : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <CornerDownRight className="h-3 w-3 flex-shrink-0" />
                  {replySenderName(msg) && (
                    <span
                      className={`flex-shrink-0 font-medium ${
                        mine ? 'text-blue-50' : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {replySenderName(msg)}:
                    </span>
                  )}
                  <span className="min-w-0 truncate">{replyPreviewText(msg)}</span>
                </button>
              )}
              <div className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0">{renderBubble(msg)}</div>
                <button
                  onClick={(e) =>
                    actionMenuFor?.id === msg.id ? onCloseMenu() : onOpenMenu(msg.id, e)
                  }
                  className={`flex-shrink-0 p-1 rounded-full transition-opacity ${
                    mine
                      ? 'text-blue-100 hover:bg-black/10'
                      : 'text-gray-400 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  } ${
                    actionMenuFor?.id === msg.id ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'
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
            {datum.isLast && (
              <span className="text-[10px]">
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </span>
            )}

            {mine && renderReadStatus(msg)}

            {mine && datum.isLast && readReceipts[msg.id] && renderReadAvatars(readReceipts[msg.id])}

            {Object.entries(reactions).length > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                {Object.entries(reactions).map(([emoji, userIds]) => (
                  <button
                    key={emoji}
                    onClick={() => onToggleReaction(msg, emoji)}
                    className={`px-1.5 py-0.5 rounded-full text-xs border flex items-center gap-0.5 ${
                      hasUserReacted(emoji)
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
};

export const MessageList = ({ messages, onReplyTo, replyToId, participantUserIds }: MessageListProps) => {
  const { locale } = useTranslations();
  const { users, currentUserId } = useChatStore();

  const [list, setList] = useListCallbackRef();
  const rowHeight = useDynamicRowHeight({ defaultRowHeight: DEFAULT_ROW_HEIGHT });

  const [actionMenuFor, setActionMenuFor] = useState<{
    id: string;
    position: 'above' | 'below';
  } | null>(null);
  const [emojiFullFor, setEmojiFullFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInitialScroll = useRef(false);

  useEffect(
    () => () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    },
    []
  );

  // Stable t identity (locale-aware) so row memoization holds across renders.
  const memoizedT = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      interpolate(translations[locale][key], params),
    [locale]
  );

  const rows = useMemo<RowDatum[]>(() => {
    if (!messages.length) return [];
    const result: RowDatum[] = [];
    let prev: ChatMessage | null = null;
    for (const msg of messages) {
      const sameSender =
        prev !== null &&
        msg.sender_id === prev.sender_id &&
        new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() <=
          GROUP_THRESHOLD_MS;
      result.push({
        msg,
        mine: msg.sender_id === currentUserId,
        isFirst: !sameSender,
        isLast: true,
      });
      if (prev) result[result.length - 2].isLast = !sameSender;
      prev = msg;
    }
    return result;
  }, [messages, currentUserId]);

  // For my messages: the other participants who have read them, by user id.
  const otherReadsByMessage = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (!currentUserId) return map;
    for (const datum of rows) {
      if (!datum.mine) continue;
      const readers = (datum.msg.reads || [])
        .filter((r) => r.read_at && r.user_id !== currentUserId)
        .map((r) => r.user_id);
      if (readers.length) map[datum.msg.id] = readers;
    }
    return map;
  }, [rows, currentUserId]);

  // Resolve reader ids to user records for rendering.
  const readReceipts = useMemo(() => {
    const map: Record<string, ChatUser[]> = {};
    for (const [messageId, ids] of Object.entries(otherReadsByMessage)) {
      map[messageId] = ids
        .map((id) => users[id])
        .filter((u): u is ChatUser => Boolean(u));
    }
    return map;
  }, [otherReadsByMessage, users]);

  const otherParticipantIds = useMemo(() => participantUserIds || [], [participantUserIds]);

  const handleToggleReaction = useCallback(
    async (msg: ChatMessage, emoji: string) => {
      if (!currentUserId) return;
      try {
        const reacted = (msg.reactions?.[emoji] || []).includes(currentUserId);
        if (reacted) {
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
    },
    [currentUserId]
  );

  const handlePickReaction = useCallback(
    (msgId: string | null, emoji: string) => {
      const msg = rows.find((r) => r.msg.id === msgId)?.msg;
      if (msg) handleToggleReaction(msg, emoji);
      setActionMenuFor(null);
      setEmojiFullFor(null);
    },
    [rows, handleToggleReaction]
  );

  const openActionMenu = useCallback(
    (msgId: string, e: React.MouseEvent<HTMLButtonElement>) => {
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
    },
    []
  );

  const handleEdit = useCallback(
    async (msg: ChatMessage) => {
      if (!currentUserId || !editingContent.trim()) return;
      try {
        await ChatRepository.updateMessage(currentUserId, msg.id, {
          content: editingContent.trim(),
        });
        setEditingId(null);
        setEditingContent('');
      } catch (err) {
        console.error('Failed to edit message:', err);
      }
    },
    [currentUserId, editingContent]
  );

  const handleDelete = useCallback(
    async (msgId: string) => {
      if (!currentUserId) return;
      if (!window.confirm(memoizedT('deleteMessageConfirm'))) return;
      try {
        await ChatRepository.deleteMessage(currentUserId, msgId);
      } catch (err) {
        console.error('Failed to delete message:', err);
      }
    },
    [currentUserId, memoizedT]
  );

  const handleReply = useCallback(
    (msg: ChatMessage) => {
      setActionMenuFor(null);
      onReplyTo?.(msg);
    },
    [onReplyTo]
  );

  const handleJumpToMessage = useCallback(
    (msgId: string) => {
      const targetIndex = rows.findIndex((r) => r.msg.id === msgId);
      if (targetIndex >= 0) {
        list?.scrollToRow({ index: targetIndex, align: 'center', behavior: 'smooth' });
      }
      setHighlightedId(msgId);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightedId(null), 1600);
    },
    [list, rows]
  );

  const onCloseMenu = useCallback(() => setActionMenuFor(null), []);
  const onStartEdit = useCallback(
    (msg: ChatMessage) => {
      setEditingId(msg.id);
      setEditingContent(msg.content);
    },
    []
  );
  const onCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingContent('');
  }, []);
  const onOpenEmojiFull = useCallback(
    (msgId: string) => {
      setEmojiFullFor(msgId);
      setActionMenuFor(null);
    },
    []
  );

  // Scroll to latest on mount; afterwards only auto-scroll while the user is
  // already near the bottom (such as receiving a new message while reading).
  useEffect(() => {
    if (!list || !rows.length) return;
    if (!didInitialScroll.current) {
      if (!list.element) return;
      didInitialScroll.current = true;
      pinListToBottom(list, rows.length - 1);
      return;
    }
    const el = list.element;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) {
      list.scrollToRow({ index: rows.length - 1, align: 'end', behavior: 'auto' });
    }
  }, [list, rows.length]);

  const rowProps = useMemo<RowProps>(
    () => ({
      rows,
      users,
      currentUserId,
      replyToId,
      highlightedId,
      editingId,
      editingContent,
      actionMenuFor,
      readReceipts,
      otherParticipantIds,
      t: memoizedT,
      onToggleReaction: handleToggleReaction,
      onPickReaction: handlePickReaction,
      onJump: handleJumpToMessage,
      onReply: handleReply,
      onDelete: handleDelete,
      onOpenMenu: openActionMenu,
      onCloseMenu,
      onStartEdit,
      onCancelEdit,
      onCommitEdit: handleEdit,
      onEditContentChange: setEditingContent,
      onOpenEmojiFull,
    }),
    [
      rows,
      users,
      currentUserId,
      replyToId,
      highlightedId,
      editingId,
      editingContent,
      actionMenuFor,
      readReceipts,
      otherParticipantIds,
      memoizedT,
      handleToggleReaction,
      handlePickReaction,
      handleJumpToMessage,
      handleReply,
      handleDelete,
      openActionMenu,
      onCloseMenu,
      onStartEdit,
      onCancelEdit,
      handleEdit,
      onOpenEmojiFull,
    ]
  );

  if (!messages.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
          {memoizedT('emptyMessages')}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          {memoizedT('sendFirstMessage')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <List
        className="flex-1"
        listRef={setList}
        rowCount={rows.length}
        rowHeight={rowHeight}
        rowComponent={MessageRow}
        rowProps={rowProps}
        overscanCount={8}
      />

      {emojiFullFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 pointer-events-none"
          onClick={() => setEmojiFullFor(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {memoizedT('addReaction')}
              </h3>
              <button
                onClick={() => setEmojiFullFor(null)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <EmojiPicker
              className="h-64 w-80"
              onSelect={(emoji) => handlePickReaction(emojiFullFor, emoji)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;
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
  Play,
  FileText,
  Briefcase,
  Mic,
  Loader2,
  XCircle,
  Copy,
  Forward,
} from 'lucide-react';
import { List, useDynamicRowHeight, useListCallbackRef } from 'react-window';
import type { RowComponentProps, ListImperativeAPI } from 'react-window';
import { useChatStore } from '@/chat/store/chatStore';
import { ChatRepository } from '@/chat/repository';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { interpolate, translations, type TranslationKey } from '@/chat/i18n/translations';
import type { ChatMessage, ChatUser, FileAttachmentData } from '@/types/chat';
import {
  getUserDisplayName,
  getInitials,
  getAvatarColor,
  getMessageReadStatus,
  formatFileSize,
  getFileKindMeta,
  isHtmlContent,
  purifyHtml,
  htmlToText,
} from '@/chat/utils';
import VoiceMessageBubble from './VoiceMessageBubble';
import EmojiPicker from './EmojiPicker';
import MediaLightbox from './MediaLightbox';
import ForwardModal from './ForwardModal';
import MentionPopover from './MentionPopover';

/** Renders plain text or sanitized formatted HTML message content. */
const FormattedText = ({ text }: { text: string }) => {
  if (!text) return null;
  if (!isHtmlContent(text)) {
    return <div className="whitespace-pre-wrap break-words text-sm">{text}</div>;
  }
  return (
    <div
      className="whitespace-pre-wrap break-words text-sm"
      dangerouslySetInnerHTML={{ __html: purifyHtml(text) }}
    />
  );
};

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

const ACTION_MENU_HEIGHT_PX = 430;
const ACTION_MENU_WIDTH_PX = 224;

const DEFAULT_ROW_HEIGHT = 48;

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const FREQUENT_REACTIONS = ['🔥', '👏', '😘', '🎉'];

const isMediaAtt = (a: FileAttachmentData) =>
  a.file_type.startsWith('image/') || a.file_type.startsWith('video/');

const isVideoAtt = (a: FileAttachmentData) => a.file_type.startsWith('video/');

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
  actionMenuId: string | null;
  readReceipts: Record<string, ChatUser[]>;
  otherParticipantIds: string[];
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  onToggleReaction: (msg: ChatMessage, emoji: string) => void;
  onJump: (msgId: string) => void;
  onOpenMenu: (msgId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onCloseMenu: () => void;
  onCancelEdit: () => void;
  onCommitEdit: (msg: ChatMessage) => void;
  onEditContentChange: (value: string) => void;
  onOpenLightbox: (msg: ChatMessage, index: number) => void;
  onMentionClick: (e: React.MouseEvent) => void;
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
    actionMenuId,
    t,
    readReceipts,
    otherParticipantIds,
    onToggleReaction,
    onJump,
    onOpenMenu,
    onCloseMenu,
    onCancelEdit,
    onCommitEdit,
    onEditContentChange,
    onOpenLightbox,
    onMentionClick,
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
        return target.patient_case_link?.title || htmlToText(target.content) || t('patientCase');
      default:
        return htmlToText(target.content) || '...';
    }
  };

  const replyPreviewThumb = (m: ChatMessage): string | null => {
    const target = resolveReplyTarget(m);
    if (!target) return null;
    const imageAtt = (target.attachments || []).find((a) =>
      a.file_type.startsWith('image/')
    );
    return imageAtt?.file_url ?? null;
  };

  // Sent Media Grid Layout: media attachments of one message render as a
  // single collage bubble (adaptive tiles). Tapping a tile opens the lightbox.
  const renderMediaCollage = (m: ChatMessage) => {
    const atts = (m.attachments || []).filter(isMediaAtt);
    const docAtts = (m.attachments || []).filter((a) => !isMediaAtt(a));
    const count = atts.length;

    const renderTile = (
      att: FileAttachmentData,
      i: number,
      className: string,
      overlayCount?: number
    ) => (
      <button
        key={att.file_url}
        type="button"
        onClick={() => onOpenLightbox(m, i)}
        className={`relative block overflow-hidden rounded-lg bg-gray-900/10 outline-none dark:bg-black/30 ${className}`}
      >
        {att.file_type.startsWith('image/') ? (
          <img src={att.file_url} alt={att.file_name} className="h-full w-full object-cover" />
        ) : (
          <video src={att.file_url} className="h-full w-full object-cover" muted preload="metadata" />
        )}
        {isVideoAtt(att) && !overlayCount && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black/50 text-white">
              <Play className="h-2 w-2 fill-current" />
            </span>
          </span>
        )}
        {overlayCount ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-[10px] font-semibold text-white">+{overlayCount}</span>
          </span>
        ) : null}
      </button>
    );

    let grid: React.ReactNode = null;
    if (count === 1) {
      grid = renderTile(atts[0], 0, 'aspect-square h-[150px] w-[150px]');
    } else if (count === 2) {
      grid = (
        <div className="grid w-[255px] grid-cols-2 gap-0.5">
          {atts.map((a, i) => renderTile(a, i, 'aspect-square'))}
        </div>
      );
    } else if (count === 3) {
      grid = (
        <div className="grid h-[255px] w-[405px] grid-cols-2 grid-rows-2 gap-0.5">
          {renderTile(atts[0], 0, 'row-span-2 h-full')}
          {atts.slice(1, 3).map((a, i) => renderTile(a, i + 1, 'aspect-square'))}
        </div>
      );
    } else {
      grid = (
        <div className="grid w-[255px] grid-cols-2 gap-0.5">
          {atts.slice(0, 4).map((a, i) =>
            i === 3 && count > 4
              ? renderTile(a, i, 'aspect-square', count - 4)
              : renderTile(a, i, 'aspect-square')
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {grid}
        {docAtts.length > 0 &&
          docAtts.map((doc) => {
            const meta = getFileKindMeta(doc.file_type, doc.file_name);
            return (
              <a
                key={doc.id}
                href={doc.file_url}
                target="_blank"
                rel="noreferrer"
                className="flex w-full max-w-[430px] items-center gap-2 rounded-xl bg-white/15 p-2 transition-colors hover:bg-white/25 dark:bg-black/15 dark:hover:bg-black/25"
              >
                <div
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-white ${meta.bg}`}
                >
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="max-w-[52px] truncate text-[10px] font-medium">{doc.file_name}</p>
                  <p className="text-[9px] opacity-70">{formatFileSize(doc.file_size)}</p>
                </div>
              </a>
            );
          })}
        {m.content && <FormattedText text={m.content} />}
      </div>
    );
  };

  const renderBubble = (m: ChatMessage) => {
    switch (m.message_type) {
      case 'voice':
        return <VoiceMessageBubble message={m} isCurrentUser={mine} />;
      case 'image':
      case 'file':
        return renderMediaCollage(m);
      case 'patient_case':
        return (
          <div className="flex items-start gap-2">
            <Briefcase className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">{t('patientCase')}</p>
              <p className="text-sm">
                {m.patient_case_link?.title || htmlToText(m.content) || t('patientCase')}
              </p>
            </div>
          </div>
        );
      default:
        return <FormattedText text={m.content} />;
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
              } ${msg.local_state === 'pending' ? 'opacity-70' : ''} ${
                replyToId === msg.id ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''
              }`}
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
                  {replyPreviewThumb(msg) && (
                    <img
                      src={replyPreviewThumb(msg) as string}
                      alt=""
                      className="h-6 w-6 flex-shrink-0 rounded object-cover"
                    />
                  )}
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
                <div className="flex-1 min-w-0" onClick={onMentionClick}>{renderBubble(msg)}</div>
                <button
                  onClick={(e) =>
                    actionMenuId === msg.id ? onCloseMenu() : onOpenMenu(msg.id, e)
                  }
                  className={`flex-shrink-0 p-1 rounded-full transition-opacity ${
                    mine
                      ? 'text-blue-100 hover:bg-black/10'
                      : 'text-gray-400 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  } ${
                    actionMenuId === msg.id ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'
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

            {mine &&
              msg.local_state === 'pending' &&
              (msg.message_type === 'image' ||
                msg.message_type === 'file' ||
                msg.message_type === 'voice') && (
              <span className="flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('sending')} {Math.min(Math.max(Math.round(msg.upload_progress ?? 0), 0), 100)}%
              </span>
            )}

            {mine && msg.local_state === 'failed' && (
              <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-400/15 dark:text-red-400">
                <XCircle className="h-3 w-3" />
                {t('sendFailed')}
              </span>
            )}

            {mine && !msg.local_state && renderReadStatus(msg)}

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
  const removeMessage = useChatStore((s) => s.removeMessage);
  const tombstoneMessage = useChatStore((s) => s.tombstoneMessage);
  const { users, currentUserId } = useChatStore();

  const [list, setList] = useListCallbackRef();
  const rowSignature = useMemo(
    () => messages.map((m) => m.id).join('|'),
    [messages]
  );
  // Reset the dynamic-height cache ONLY when the list structurally shrinks (a
  // deletion re-indexes rows, so stale index-keyed heights would render the row
  // before a removal at the wrong size). Pure appends keep existing row heights
  // otherwise valid. Resetting on every send was what made the chat scroll up on
  // both sender and receiver: the cache blow re-estimated every row with the
  // default height, so the bottom pin landed wrongly and hid the new message.
  const removalKeyRef = useRef(0);
  const prevSignatureRef = useRef(rowSignature);
  if (prevSignatureRef.current !== rowSignature) {
    const prevCount = prevSignatureRef.current ? prevSignatureRef.current.split('|').length : 0;
    const newCount = rowSignature ? rowSignature.split('|').length : 0;
    if (newCount < prevCount) removalKeyRef.current += 1;
    prevSignatureRef.current = rowSignature;
  }
  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: DEFAULT_ROW_HEIGHT,
    key: `removal-${removalKeyRef.current}`,
  });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [actionMenuFor, setActionMenuFor] = useState<{
    id: string;
    left: number;
    top: number;
  } | null>(null);
  const [emojiFullFor, setEmojiFullFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ msg: ChatMessage; index: number } | null>(null);
  const [forwardMsg, setForwardMsg] = useState<ChatMessage | null>(null);
  const [deleteForId, setDeleteForId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mentionCard, setMentionCard] = useState<{ userId: string; top: number; left: number } | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInitialScroll = useRef(false);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

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
      const trigger = e.currentTarget;
      const rowEl = trigger.closest('[data-message-id]') as HTMLElement | null;
      const scroller = getScrollParent(rowEl);
      const triggerRect = trigger.getBoundingClientRect();
      const scrollerRect = scroller?.getBoundingClientRect();
      const datum = rows.find((r) => r.msg.id === msgId);

      // Prefer opening below the trigger; fall back above when there isn't
      // enough space inside the scroll container.
      let position: 'above' | 'below' = 'above';
      if (rowEl && scrollerRect) {
        const scrollerTop = scrollerRect.top;
        const scrollerBottom = scrollerRect.bottom;
        const enoughBelow = scrollerBottom - triggerRect.bottom >= ACTION_MENU_HEIGHT_PX;
        const enoughAbove = triggerRect.top - scrollerTop >= ACTION_MENU_HEIGHT_PX;
        if (enoughBelow) position = 'below';
        else if (enoughAbove) position = 'above';
        else {
          const spaceBelow = scrollerBottom - triggerRect.bottom;
          const spaceAbove = triggerRect.top - scrollerTop;
          position = spaceBelow >= spaceAbove ? 'below' : 'above';
        }
      }

      const MENU_W = ACTION_MENU_WIDTH_PX;
      const MENU_H = ACTION_MENU_HEIGHT_PX;
      const edgeBuffer = 8;
      const alignRight = datum?.mine === true;

      // Clamp strictly inside the visible list area (already excludes the chat
      // header and side bars) so the menu can never be cut off by the header
      // or the pane edges.
      const viewportLeft = scrollerRect?.left ?? edgeBuffer;
      const viewportRight = (scrollerRect?.right ?? window.innerWidth) - MENU_W;
      const viewportTop = scrollerRect?.top ?? edgeBuffer;
      const viewportBottom = (scrollerRect?.bottom ?? window.innerHeight) - MENU_H;

      // Anchor the menu right at the trigger, clamped into the pane.
      const rawLeft = alignRight ? triggerRect.right - MENU_W + 4 : triggerRect.left - 4;
      const rawTop =
        position === 'below' ? triggerRect.bottom + 4 : triggerRect.top - MENU_H - 4;
      const x =
        viewportRight > viewportLeft
          ? Math.min(Math.max(viewportLeft + edgeBuffer, rawLeft), viewportRight - edgeBuffer)
          : rawLeft;
      const y =
        viewportBottom > viewportTop
          ? Math.min(Math.max(viewportTop + edgeBuffer, rawTop), viewportBottom - edgeBuffer)
          : rawTop;

      // Position in *viewport* coordinates and render the overlay as
      // position:fixed. That makes the clamp exact (viewportMath == render
      // space) so the menu can never be pushed outside the visible pane or
      // land away from its trigger.
      setActionMenuFor({ id: msgId, left: Math.round(x), top: Math.round(y) });
    },
    [rows]
  );

  // Close the floating action menu on page/chat scroll, resize or Escape.
  // Scrolls that happen *inside* the menu (emoji strip / action list) are
  // ignored so the menu stays open while the user scrolls it.
  useEffect(() => {
    if (!actionMenuFor) return;
    const close = () => setActionMenuFor(null);
    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && actionMenuRef.current?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [actionMenuFor]);

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

  const handleDelete = useCallback((msgId: string) => {
    setActionMenuFor(null);
    setEmojiFullFor(null);
    setDeleteForId(msgId);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!currentUserId || !deleteForId || deleting) return;
    const id = deleteForId;
    // Optimistically drop the message (and close the modal) the moment the user
    // confirms, so the list re-renders immediately without waiting on the server
    // round-trip (Supabase realtime won't broadcast the soft-delete UPDATE back
    // to the originating client, so self-deletes must be applied locally).
    removeMessage(id);
    // Tombstone the id so no in-flight realtime insert / send finalization can
    // re-add it (those can carry is_deleted=false when they race ahead of the
    // soft-delete). The tombstone lives for the session.
    tombstoneMessage(id);
    setDeleteForId(null);
    setDeleting(true);
    try {
      await ChatRepository.deleteMessage(currentUserId, id);
    } catch (err) {
      console.error('Failed to delete message:', err);
    } finally {
      setDeleting(false);
    }
  }, [currentUserId, deleteForId, deleting, removeMessage, tombstoneMessage]);

  const deleteForMsg = useMemo(
    () => messages.find((m) => m.id === deleteForId) ?? null,
    [messages, deleteForId]
  );

  const handleReply = useCallback(
    (msg: ChatMessage) => {
      setActionMenuFor(null);
      onReplyTo?.(msg);
    },
    [onReplyTo]
  );

  const handleCopy = useCallback(async (msg: ChatMessage) => {
    const content =
      (msg.content && msg.content.trim()) ||
      (msg.attachments || []).map((a) => a.file_url).join('\n') ||
      msg.voice_note_url ||
      '';
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = content;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setActionMenuFor(null);
  }, []);

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
      setEditingContent(htmlToText(msg.content));
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

  const handleOpenLightbox = useCallback((msg: ChatMessage, index: number) => {
    setLightbox({ msg, index });
  }, []);

  // Clicking a hyperlinked @mention in a bubble opens the WhatsApp-style user card.
  const handleMentionClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest<HTMLAnchorElement>('a[data-mention-user-id]');
    if (!link) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = link.getBoundingClientRect();
    setMentionCard({
      userId: link.getAttribute('data-mention-user-id') || '',
      top: rect.bottom + 6,
      left: rect.left,
    });
  }, []);

  // Scroll to latest on mount. On a new message (the list grows) ALWAYS scroll
  // it into view, dragging the viewport down on both the sender's and the
  // receiver's side so no manual scrolling is needed to see the latest bubble.
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (!list || !rows.length) return;
    if (!didInitialScroll.current) {
      if (!list.element) return;
      didInitialScroll.current = true;
      pinListToBottom(list, rows.length - 1);
      prevCountRef.current = rows.length;
      return;
    }
    if (rows.length <= prevCountRef.current) return;
    prevCountRef.current = rows.length;
    const el = list.element;
    if (!el) return;
    list.scrollToRow({ index: rows.length - 1, align: 'end', behavior: 'auto' });
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
      actionMenuId: actionMenuFor?.id ?? null,
      readReceipts,
      otherParticipantIds,
      t: memoizedT,
      onToggleReaction: handleToggleReaction,
      onJump: handleJumpToMessage,
      onOpenMenu: openActionMenu,
      onCloseMenu,
      onCancelEdit,
      onCommitEdit: handleEdit,
      onEditContentChange: setEditingContent,
      onOpenLightbox: handleOpenLightbox,
      onMentionClick: handleMentionClick,
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
      handleJumpToMessage,
      openActionMenu,
      onCloseMenu,
      onCancelEdit,
      handleEdit,
      handleOpenLightbox,
      handleMentionClick,
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
    <div ref={containerRef} className="relative flex h-full flex-col">
      <List
        className="flex-1"
        listRef={setList}
        rowCount={rows.length}
        rowHeight={rowHeight}
        rowComponent={MessageRow}
        rowProps={rowProps}
        overscanCount={8}
      />

      {actionMenuFor && (
        <div className="fixed inset-0 z-40" onClick={onCloseMenu}>
          {(() => {
            const actionMsg = rows.find((r) => r.msg.id === actionMenuFor.id)?.msg;
            if (!actionMsg) return null;
            const mine = actionMsg.sender_id === currentUserId;
            return (
              <div
                ref={actionMenuRef}
                className="absolute w-[224px] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-600"
                style={{
                  left: actionMenuFor.left,
                  top: actionMenuFor.top,
                  maxHeight: 'min(430px, calc(100vh - 16px))',
                  overflowY: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-0.5 overflow-x-auto px-1.5 py-1.5">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handlePickReaction(actionMsg.id, emoji)}
                      className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-xl leading-none"
                    >
                      {emoji}
                    </button>
                  ))}
                  <span className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5" />
                  {FREQUENT_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handlePickReaction(actionMsg.id, emoji)}
                      className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-xl leading-none"
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    onClick={() => onOpenEmojiFull(actionMsg.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300"
                    title={memoizedT('addReaction')}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600" />
                <button
                  onClick={() => handleReply(actionMsg)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Reply className="h-4 w-4" />
                  {memoizedT('reply')}
                </button>
                <button
                  onClick={() => handleCopy(actionMsg)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Copy className="h-4 w-4" />
                  {memoizedT('copyMessage')}
                </button>
                <button
                  onClick={() => {
                    setActionMenuFor(null);
                    setForwardMsg(actionMsg);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Forward className="h-4 w-4" />
                  {memoizedT('forward')}
                </button>
                {mine && editingId !== actionMsg.id && (
                  <button
                    onClick={() => onStartEdit(actionMsg)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <Edit className="h-4 w-4" />
                    {memoizedT('editMessage')}
                  </button>
                )}
                {mine && (
                  <button
                    onClick={() => handleDelete(actionMsg.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="h-4 w-4" />
                    {memoizedT('deleteMessage')}
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {lightbox && (
        <MediaLightbox
          items={(lightbox.msg.attachments || []).filter(isMediaAtt)}
          index={lightbox.index}
          onIndexChange={(index) => setLightbox({ msg: lightbox.msg, index })}
          onClose={() => setLightbox(null)}
        />
      )}

      {forwardMsg && (
        <ForwardModal message={forwardMsg} onClose={() => setForwardMsg(null)} />
      )}

      <MentionPopover
        user={mentionCard ? users[mentionCard.userId] : undefined}
        anchor={mentionCard ? { top: mentionCard.top, left: mentionCard.left } : null}
        onClose={() => setMentionCard(null)}
      />

      {deleteForMsg && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-6"
          onClick={() => !deleting && setDeleteForId(null)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {(() => {
              const mediaAtt = (deleteForMsg.attachments || []).find(isMediaAtt);
              const docAtt = (deleteForMsg.attachments || []).find((a) => !isMediaAtt(a));
              return (
                <div className="flex h-32 items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-700">
                  {mediaAtt ? (
                    mediaAtt.file_type.startsWith('image/') ? (
                      <img
                        src={mediaAtt.file_url}
                        alt={mediaAtt.file_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <video
                        src={mediaAtt.file_url}
                        className="h-full w-full object-cover"
                        muted
                        preload="metadata"
                      />
                    )
                  ) : deleteForMsg.message_type === 'voice' ? (
                    <Mic className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                  ) : docAtt ? (
                    <FileText className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                  ) : deleteForMsg.content ? (
                    <span className="max-w-[85%] overflow-hidden text-sm text-gray-600 dark:text-gray-300 line-clamp-3 px-4">
                      <FormattedText text={deleteForMsg.content} />
                    </span>
                  ) : (
                    <Briefcase className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
              );
            })()}
            <div className="p-6">
              <h3 className="text-center text-base font-medium text-gray-900 dark:text-white">
                {memoizedT('deleteMessage')}
              </h3>
              <p className="mt-2 text-center text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                {memoizedT('deleteMessageConfirm')}
                {(() => {
                  const hasFiles =
                    !!deleteForMsg.attachments?.length || !!deleteForMsg.voice_note_url;
                  return hasFiles ? ` ${memoizedT('deleteMessageFilesNote')}` : '';
                })()}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDeleteForId(null)}
                  disabled={deleting}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {memoizedT('cancel')}
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-40"
                >
                  {memoizedT('deleteMessage')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
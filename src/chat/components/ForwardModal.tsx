'use client';

import { useMemo, useState } from 'react';
import { X, Search, Users as UsersIcon, Loader2, Mic, Check, Send } from 'lucide-react';
import { useChatStore } from '@/chat/store/chatStore';
import { ChatRepository } from '@/chat/repository';
import { useTranslations } from '@/chat/i18n/useTranslations';
import {
  getConversationDisplayName,
  getConversationAvatar,
  getInitials,
  getAvatarColor,
  getUserDisplayName,
  htmlToText,
} from '@/chat/utils';
import {
  ChatMessage,
  ChatMessageType,
  ChatConversationType,
  ChatConversation,
  CreateMessageData,
} from '@/types/chat';

interface ForwardModalProps {
  message: ChatMessage;
  onClose: () => void;
}

/**
 * Forward a message to an existing chat (group or direct) or start a new
 * direct chat with a user. Media is re-sent by reusing the already-public
 * storage URLs (no re-upload); voice notes share the same voice_note_url.
 */
export default function ForwardModal({ message, onClose }: ForwardModalProps) {
  const { t } = useTranslations();
  const {
    conversations,
    users,
    currentUserId,
    setSelectedConversation,
    upsertConversation,
  } = useChatStore();

  const [tab, setTab] = useState<'chats' | 'contacts'>('chats');
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConvIds, setSelectedConvIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const buildCreateData = (convId: string): CreateMessageData => {
    const type = message.message_type;
    if (type === ChatMessageType.PATIENT_CASE) {
      return {
        conversation_id: convId,
        content: message.content || message.patient_case_link?.title || '',
        message_type: ChatMessageType.TEXT,
        is_forwarded: true,
      };
    }
    const hasAtts = (message.attachments || []).length > 0;
    const isVoice = type === ChatMessageType.VOICE;
    let messageType = type;
    if (!hasAtts && !isVoice && type !== ChatMessageType.TEXT) {
      messageType = ChatMessageType.TEXT;
    }
    return {
      conversation_id: convId,
      content: message.content || '',
      message_type: messageType,
      reply_to_id: null,
      is_forwarded: true,
      attachments: hasAtts
        ? (message.attachments || []).map((a) => ({
            file_name: a.file_name,
            file_type: a.file_type,
            file_size: a.file_size,
            file_url: a.file_url,
            thumbnail_url: a.thumbnail_url ?? undefined,
          }))
        : undefined,
      voice_note_url: message.voice_note_url,
      voice_note_duration: message.voice_note_duration,
    };
  };

  const toggle = <T extends string>(list: T[], setList: (next: T[]) => void, id: T) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const findDirectWith = (userId: string) =>
    (conversations || []).find(
      (c) =>
        c.type === 'direct' &&
        (c.participants || []).some((p) => p.id === currentUserId) &&
        (c.participants || []).some((p) => p.id === userId)
    );

  const count = selectedConvIds.length + selectedUserIds.length;

  const handleSend = async () => {
    if (sending || done || !currentUserId || count === 0) return;
    setSending(true);
    setError(null);
    const destinations: string[] = [];
    try {
      for (const convId of selectedConvIds) {
        await ChatRepository.sendMessage(currentUserId, buildCreateData(convId));
        destinations.push(convId);
      }
      for (const userId of selectedUserIds) {
        let conv = findDirectWith(userId);
        if (!conv) {
          conv = await ChatRepository.createConversation(currentUserId, {
            type: ChatConversationType.DIRECT,
            participant_ids: [userId],
          });
          upsertConversation(conv);
        }
        await ChatRepository.sendMessage(currentUserId, buildCreateData(conv.id));
        destinations.push(conv.id);
      }
      if (destinations.length) setSelectedConversation(destinations[0]);
      setDone(true);
      window.setTimeout(() => onClose(), 800);
    } catch (err) {
      console.error('Failed to forward message:', err);
      setError(t('forwardFailed'));
    } finally {
      setSending(false);
    }
  };

  const chats = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (conversations || []).filter((c: ChatConversation) => {
      if (c.id === message.conversation_id) return false;
      const name = getConversationDisplayName(c, currentUserId, users).toLowerCase();
      return !q || name.includes(q);
    });
  }, [conversations, query, currentUserId, users, message.conversation_id]);

  const contacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(users)
      .filter((u) => u.id !== currentUserId)
      .filter((u) => !q || getUserDisplayName(u).toLowerCase().includes(q));
  }, [users, query, currentUserId]);

  const isVoice = message.message_type === ChatMessageType.VOICE;
  const isMedia = message.message_type === ChatMessageType.IMAGE || message.message_type === ChatMessageType.FILE;
  const firstImage = (message.attachments || []).find((a) => a.file_type.startsWith('image/'));

  const renderAvatar = (conversation?: ChatConversation, user?: { id: string; profile_image_url: string | null }, name = '') => {
    if (conversation?.type === 'group' && !conversation.avatar_url) {
      return (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600">
          <UsersIcon className="h-5 w-5 text-gray-500 dark:text-gray-300" />
        </div>
      );
    }
    const avatarUrl = conversation ? getConversationAvatar(conversation, currentUserId, users) : user?.profile_image_url;
    if (avatarUrl) {
      return (
        <img src={avatarUrl} alt={name} className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
      );
    }
    return (
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium text-white ${getAvatarColor(
          name
        )}`}
      >
        {getInitials(name)}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => !sending && !done && onClose()}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('forwardTitle')}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={sending || done}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label={t('cancel')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-2.5">
          <div className="inline-flex max-w-full items-start gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-600 dark:bg-gray-700/50">
            {isVoice ? (
              <Mic className="mt-1 h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-300" />
            ) : firstImage ? (
              <img
                src={firstImage.file_url}
                alt=""
                className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
              />
            ) : null}
            <div className="min-w-0">
              {isMedia || isVoice ? (
                <p className="text-xs text-gray-400 dark:text-gray-400">
                  {isVoice ? t('voiceMessage') : message.message_type === ChatMessageType.IMAGE ? t('imageMessage') : t('fileMessage')}
                </p>
              ) : null}
              {message.content ? (
                <p className="line-clamp-2 text-sm text-gray-900 dark:text-white">{htmlToText(message.content)}</p>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-400">{t('forwardTitle')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-1 px-4">
          <button
            type="button"
            onClick={() => {
              setTab('chats');
              setQuery('');
            }}
            className={`border-b-2 px-2 py-2 text-sm font-medium ${
              tab === 'chats'
                ? 'border-[var(--fd-accent)] fd-accent-text'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('forwardChats')}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('contacts');
              setQuery('');
            }}
            className={`border-b-2 px-2 py-2 text-sm font-medium ${
              tab === 'contacts'
                ? 'border-[var(--fd-accent)] fd-accent-text'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('forwardContacts')}
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchRecipient')}
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400 dark:text-white"
          />
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {tab === 'chats' ? (
            chats.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">{t('noResults')}</p>
            ) : (
              chats.map((c) => {
                const name = getConversationDisplayName(c, currentUserId, users);
                const selected = selectedConvIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={sending || done}
                    onClick={() => toggle(selectedConvIds, setSelectedConvIds, c.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60 ${
                      selected ? 'fd-accent-soft-bg' : ''
                    }`}
                  >
                    {renderAvatar(c, undefined, name)}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">
                      {name}
                    </span>
                    {c.type === 'group' && (
                      <span className="flex-shrink-0 text-xs text-gray-400">
                        {(c.participants || []).length}
                      </span>
                    )}
                    <span
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                        selected
                          ? 'fd-accent-soft-border fd-accent-bg'
                          : 'border-gray-300 dark:border-gray-500'
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                );
              })
            )
          ) : contacts.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-400">{t('noResults')}</p>
          ) : (
            contacts.map((u) => {
              const name = getUserDisplayName(u);
              const selected = selectedUserIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={sending || done}
                  onClick={() => toggle(selectedUserIds, setSelectedUserIds, u.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60 ${
                    selected ? 'fd-accent-soft-bg' : ''
                  }`}
                >
                  {renderAvatar(undefined, u, name)}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">
                    {name}
                  </span>
                  <span
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                      selected ? 'fd-accent-soft-border fd-accent-bg' : 'border-gray-300 dark:border-gray-500'
                    }`}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {error && !sending && (
          <div className="px-4 py-2.5 text-sm text-red-500">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm text-gray-500 dark:text-gray-300">
            {count > 0 ? t('forwardSelected', { n: count }) : t('forwardNone')}
          </span>
          <button
            type="button"
            disabled={count === 0 || sending || done}
            onClick={handleSend}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              done ? 'bg-green-500' : 'fd-accent-bg'
            }`}
          >
            {done ? (
              <Check className="h-4 w-4" />
            ) : sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {done ? t('forwardDone') : sending ? t('forwardSending') : t('send')}
          </button>
        </div>
      </div>
    </div>
  );
}
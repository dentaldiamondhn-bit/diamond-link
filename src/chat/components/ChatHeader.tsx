'use client';

import React, { useState } from 'react';
import { Menu, Search, MoreVertical, Users as UsersIcon, Languages, Check, Settings } from 'lucide-react';
import { useChatStore } from '@/chat/store/chatStore';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { InstallAppButton } from '@/chat/components/InstallAppButton';
import ChatSettingsPanel from '@/chat/components/ChatSettingsPanel';
import type { ChatLocale } from '@/chat/i18n/translations';
import { useGlobalPreferences } from '@/hooks/useUserPreferences';
import {
  getConversationDisplayName,
  getConversationAvatar,
  getInitials,
  getAvatarColor,
  getTypingUserIds,
  getTypingLabel,
} from '@/chat/utils';

interface ChatHeaderProps {
  conversationId: string | null;
  className?: string;
  onMenuToggle?: () => void;
}

export const ChatHeader = ({ conversationId, className = '', onMenuToggle }: ChatHeaderProps) => {
  const { t, locale } = useTranslations();
  const { updatePreferences } = useGlobalPreferences();
  const [langOpen, setLangOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { conversations, users, presence, typing, currentUserId } = useChatStore();
  const conversation = conversations.find((c) => c.id === conversationId);

  const name = getConversationDisplayName(conversation, currentUserId, users);
  const avatarUrl = getConversationAvatar(conversation, currentUserId, users);

  const otherParticipants = (conversation?.participants || []).filter(
    (p) => p.user_id !== currentUserId
  );

  const typingUserIds = getTypingUserIds(conversation, typing, currentUserId);
  const typingLabel = getTypingLabel(typingUserIds, users, t);

  const isTyping = typingLabel !== null;

  const onlineCount = (conversation?.participants || []).filter(
    (p) => presence[p.user_id] === 'online'
  ).length;

  const otherOnline = otherParticipants.some((p) => presence[p.user_id] === 'online');
  const memberCount = (conversation?.participants || []).length;

  const changeLanguage = (next: ChatLocale) => {
    localStorage.setItem('chat-locale', next);
    updatePreferences({ locale: next });
    setLangOpen(false);
  };

  return (
    <header
      className={`flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex-shrink-0"
          title={t('sidebarTitle')}
          aria-label={t('sidebarTitle')}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative flex-shrink-0">
          {conversation?.type === 'group' && !conversation.avatar_url ? (
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
              <UsersIcon className="h-5 w-5 text-gray-500 dark:text-gray-300" />
            </div>
          ) : avatarUrl ? (
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
              <span className="italic fd-accent-text truncate">{typingLabel}</span>
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
        {process.env.NODE_ENV === 'development' && (
          <span
            title="Local dev build stamp"
            className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-amber-600 dark:text-amber-400"
          >
            DEV R5
          </span>
        )}
        <InstallAppButton />
        <button
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          title={t('searchPlaceholder')}
        >
          <Search className="h-5 w-5" />
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangOpen((v) => !v)}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            title={t('language')}
            aria-label={t('language')}
          >
            <Languages className="h-5 w-5" />
          </button>
          {langOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 z-50 mt-1 w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                {(['es', 'en'] as ChatLocale[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => changeLanguage(l)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <span>{l === 'es' ? t('languageEs') : t('languageEn')}</span>
                    {locale === l && <Check className="h-4 w-4 fd-accent-text" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          title={t('settingsTitle')}
          aria-label={t('settingsTitle')}
        >
          <Settings className="h-5 w-5" />
        </button>
        <button
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          title={t('participants')}
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      {settingsOpen && <ChatSettingsPanel onClose={() => setSettingsOpen(false)} />}
    </header>
  );
};

export default ChatHeader;
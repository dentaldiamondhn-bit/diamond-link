'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useChatStore } from '@/chat/store/chatStore';
import { useChatSettingsStore } from '@/chat/store/chatSettingsStore';
import { ChatRepository } from '@/chat/repository';
import { useChatRealtime } from '@/chat/hooks/useChatRealtime';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { bubbleTextColor } from '@/chat/utils';
import type { ChatUser } from '@/types/chat';
import Sidebar from './Sidebar';
import ChatPane from './ChatPane';

export const ChatLayout = () => {
  const { t } = useTranslations();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const { user: clerkUser, isLoaded } = useUser();
  const {
    currentUserId,
    selectedConversationId,
    conversations,
    setCurrentUserId,
    setConversations,
    setUsers,
    setLoading,
    setError,
    setSelectedConversation,
  } = useChatStore();
  const setChatSettingsContext = useChatSettingsStore((s) => s.setContext);
  const chatSettings = useChatSettingsStore((s) => s.settings);

  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Load the app-wide user list once, so the store can resolve names/avatars.
  const loadUsers = useCallback(async () => {
    try {
      const users = await ChatRepository.fetchAllUsers();
      const userMap: Record<string, ChatUser> = {};
      for (const u of users) userMap[u.id] = u;
      setUsers(userMap);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, [setUsers]);

  const loadConversations = useCallback(
    async (userId: string) => {
      try {
        const conversations = await ChatRepository.getConversations(userId);
        setConversations(conversations);
      } catch (err) {
        console.error('Failed to load conversations:', err);
        setError('Failed to load conversations');
      }
    },
    [setConversations, setError]
  );

  // Debounced reload triggered by realtime conversation/participant changes.
  const reloadTimer = useRef<NodeJS.Timeout | null>(null);
  const onConversationsChanged = useCallback(() => {
    const userId = currentUserIdRef.current;
    if (!userId) return;
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => {
      loadConversations(userId);
    }, 300);
  }, [loadConversations]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!clerkUser) return;
    const userId = clerkUser.id;
    setCurrentUserId(userId);
    setChatSettingsContext(userId);
    setLoading(true);
    Promise.all([loadUsers(), loadConversations(userId)])
      .catch((err) => console.error('Chat bootstrap failed:', err))
      .finally(() => setLoading(false));

    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, [isLoaded, clerkUser, setCurrentUserId, setLoading, loadUsers, loadConversations]);

  const { sendTyping } = useChatRealtime(
    selectedConversationId,
    currentUserId,
    onConversationsChanged
  );

  useEffect(() => {
    if (!selectedConversationId) return;
    if (window.matchMedia('(min-width: 768px)').matches) return;
    // Close the mobile drawer the moment a conversation is picked.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false);
  }, [selectedConversationId]);

  // Scope chat settings (wallpaper + bubble colors) to the selected chat/group.
  useEffect(() => {
    if (!currentUserId) return;
    setChatSettingsContext(currentUserId, selectedConversationId);
  }, [currentUserId, selectedConversationId, setChatSettingsContext]);

  // Phase 8 — keyboard shortcuts for the whole chat shell:
  //   Ctrl/Cmd+K       focus the conversation search box
  //   Ctrl/Cmd+Shift+M focus the message composer
  //   Alt+Up/Alt+Down  jump to the previous/next conversation
  // Shortcuts are ignored while the user is typing in a text field so they
  // never trample normal editing (search box, composer, modals).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        !!target &&
        (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      const meta = e.ctrlKey || e.metaKey;

      if (meta && !e.shiftKey && e.key.toLowerCase() === 'k' && !isEditable) {
        e.preventDefault();
        document.getElementById('chat-sidebar-search')?.focus();
        return;
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === 'm' && !isEditable) {
        e.preventDefault();
        document.querySelector<HTMLElement>('[data-chat-composer]')?.focus();
        return;
      }
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && !isEditable) {
        e.preventDefault();
        if (!conversations.length) return;
        const idx = conversations.findIndex((c) => c.id === selectedConversationId);
        const next =
          e.key === 'ArrowDown'
            ? idx === -1
              ? 0
              : (idx + 1) % conversations.length
            : idx === -1
              ? conversations.length - 1
              : (idx - 1 + conversations.length) % conversations.length;
        setSelectedConversation(conversations[next].id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [conversations, selectedConversationId, setSelectedConversation]);

  if (!isLoaded || !currentUserId) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">{t('loading')}</div>
      </div>
    );
  }

  // Resolve the user's chat theme into CSS vars on the shared root so the
  // sidebar, message list and composer repaint together. Text colors are
  // auto-derived from the bubble backgrounds unless the user picked one.
  const mineBg = chatSettings?.my_bubble_color || '#2563eb';
  const otherBg = chatSettings?.other_bubble_color || '#ffffff';
  const themeVars = {
    '--fd-accent': chatSettings?.accent_color || '#2563eb',
    '--fd-bubble-mine-bg': mineBg,
    '--fd-bubble-mine-text': chatSettings?.my_text_color || bubbleTextColor(mineBg),
    '--fd-bubble-other-bg': otherBg,
    '--fd-bubble-other-text': chatSettings?.other_text_color || bubbleTextColor(otherBg),
  } as React.CSSProperties;

  return (
    <div
      role="main"
      className="chat-layout flex h-full overflow-hidden bg-gray-50 dark:bg-gray-900"
      data-chat-root
      data-text-size={chatSettings?.text_size ?? 'md'}
      data-density={chatSettings?.density ?? 'comfortable'}
      style={themeVars}
    >
      <a
        href="#chat-messages"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:left-4 focus:top-4 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-gray-900 focus:shadow-xl dark:focus:bg-gray-800 dark:focus:text-white"
      >
        {t('skipToMessages')}
      </a>
      <>
        {sidebarOpen && <div onClick={closeSidebar} className="fixed inset-0 z-30 bg-black/50 md:hidden" />}
        <div
          className={`absolute z-40 inset-y-0 left-0 transform transition-transform duration-200 md:static md:transform-none ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <Sidebar className="h-full border-r border-gray-200 dark:border-gray-700" />
        </div>
      </>
      <ChatPane
        className="flex-1 min-w-0 border-l border-gray-200 dark:border-gray-700"
        sendTyping={sendTyping}
        onMenuToggle={() => setSidebarOpen((v) => !v)}
      />
    </div>
  );
};

export default ChatLayout;
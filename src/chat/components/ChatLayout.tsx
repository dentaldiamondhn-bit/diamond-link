'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { useChatStore } from '@/chat/store/chatStore';
import { useChatSettingsStore } from '@/chat/store/chatSettingsStore';
import { ChatRepository } from '@/chat/repository';
import { useChatRealtime } from '@/chat/hooks/useChatRealtime';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { bubbleTextColor, stripHtml } from '@/chat/utils';
import { triggerHiddenTabPush } from '@/chat/push/triggerHiddenTab';
import type { ChatMessage, ChatUser } from '@/types/chat';
import Sidebar from './Sidebar';
import ChatPane from './ChatPane';

/**
 * Reads ?conv=<id> from the URL (set by push notifications / shared links) and
 * opens that conversation once the list is loaded. Kept in its own component
 * so useSearchParams lives under a <Suspense> boundary (Next 15 requirement).
 */
function DeepLinkEffect({
  conversations,
  selectedConversationId,
}: {
  conversations: { id: string }[];
  selectedConversationId: string | null;
}) {
  const searchParams = useSearchParams();
  const setSelectedConversation = useChatStore((s) => s.setSelectedConversation);
  useEffect(() => {
    const convId = searchParams?.get('conv');
    if (!convId || !conversations.length) return;
    // Only reach for the conversation if it exists and isn't already selected.
    // Guarding on selectedConversationId + idempotent store setter prevents the
    // effect from re-triggering itself (new conversations array → dep change →
    // select again → new array → React #185 max-update-depth loop).
    if (convId !== selectedConversationId && conversations.some((c) => c.id === convId)) {
      setSelectedConversation(convId);
    }
  }, [searchParams, conversations, selectedConversationId, setSelectedConversation]);
  return null;
}

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
    markConversationRead,
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

  // Phase 5 — when a message for a chat I'm NOT looking at arrives while this
  // tab is hidden, hand it to the push service so the OS tray still shows it.
  const handleIncomingMessage = useCallback(
    (message: ChatMessage) => {
      if (!currentUserIdRef.current || !message.conversation_id) return;
      if (document.visibilityState !== 'hidden') return;
      const state = useChatStore.getState();
      const sender = state.users[message.sender_id];
      const senderName = sender
        ? `${sender?.first_name || ''} ${sender?.last_name || ''}`.trim()
        : '';
      const senderAvatar = sender?.profile_image_url || undefined;
      const conversation = state.conversations.find((c) => c.id === message.conversation_id);
      const isGroup = conversation?.type === 'group' || conversation?.type === 'channel';
      const conversationName = conversation?.name || '';
      const text = stripHtml(message.content || '');
      void triggerHiddenTabPush({
        title: isGroup ? conversationName || senderName || '💬' : senderName || '💬',
        body: text || (message.message_type === 'image' ? '📷 Foto' : 'Mensaje'),
        tag: `chat-${message.conversation_id}`,
        icon: senderAvatar || '/Logo.svg',
        badge: '/Logo.svg',
        // Structured fields let the service worker aggregate per-thread
        // (WhatsApp-style) notifications instead of one card per message.
        data: {
          conversationId: message.conversation_id,
          senderId: message.sender_id,
          senderName,
          messageText: text,
          conversationName: isGroup ? conversationName : senderName,
          conversationType: conversation?.type || 'direct',
          url: `/chat?conv=${message.conversation_id}`,
          type: 'chat',
        },
        actions: [
          { action: 'open', title: 'Abrir chat' },
          { action: 'reply', title: 'Responder' },
        ],
      });
    },
    []
  );

  const { sendTyping } = useChatRealtime(
    selectedConversationId,
    currentUserId,
    onConversationsChanged,
    handleIncomingMessage
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

  // Phase 5 — ensure the service worker is registered so push subscriptions
  // work immediately when the user enables notifications.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => null);
    }
  }, []);

  // Phase 5 — when the user taps a push notification while the app is
  // already open, focus the window and route to the conversation.
  //   • default / body tap      → open the thread
  //   • responder / reply       → open the thread + focus the composer
  //   • marcar_leido / mark_*  → clear the badge without navigating away
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'NOTIFICATION_CLICKED') return;
      const data = event.data?.data || {};
      const conversationId = data.conversationId as string | undefined;
      const action = event.data?.action as string | undefined;
      window.focus();

      if (action === 'marcar_leido' || action === 'mark_read' || action === 'mark_as_read') {
        if (!conversationId) return;
        markConversationRead(conversationId);
        return;
      }

      if (!conversationId) return;
      setSelectedConversation(conversationId);

      if (action === 'responder' || action === 'reply') {
        // The composer may still be mounting while the conversation loads;
        // keep retrying briefly until it exists, then put the caret in it.
        let tries = 0;
        const focusComposer = () => {
          const el = document.querySelector<HTMLElement>('[data-chat-composer]');
          if (el) el.focus();
          else if (tries++ < 30) setTimeout(focusComposer, 100);
        };
        setTimeout(focusComposer, 0);
      }
    };
    navigator.serviceWorker?.addEventListener?.('message', handler);
    return () => navigator.serviceWorker?.removeEventListener?.('message', handler);
  }, [setSelectedConversation, markConversationRead]);

  // Deep link handled by <DeepLinkEffect> rendered in the JSX (wrapped in
  // Suspense to satisfy Next 15's useSearchParams boundary requirement).

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

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">{t('loading')}</div>
      </div>
    );
  }

  // Signed out — e.g. a notification tap cold-booted the PWA with an expired JWT.
  // clerk-js already had its chance to restore the session above; if nothing came
  // back, show a plain sign-in action instead of an infinite spinner.
  if (!clerkUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Sesión no disponible</div>
          <a
            href="/sign-in"
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-teal-700"
          >
            Iniciar sesión
          </a>
        </div>
      </div>
    );
  }

  if (!currentUserId) {
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
      <Suspense fallback={null}>
        <DeepLinkEffect conversations={conversations} selectedConversationId={selectedConversationId} />
      </Suspense>
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
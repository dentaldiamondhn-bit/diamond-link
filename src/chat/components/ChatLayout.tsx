'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useChatStore } from '@/chat/store/chatStore';
import { ChatRepository } from '@/chat/repository';
import { useChatRealtime } from '@/chat/hooks/useChatRealtime';
import type { ChatUser } from '@/types/chat';
import Sidebar from './Sidebar';
import ChatPane from './ChatPane';

export const ChatLayout = () => {
  const { user: clerkUser, isLoaded } = useUser();
  const {
    currentUserId,
    selectedConversationId,
    setCurrentUserId,
    setConversations,
    setUsers,
    setLoading,
    setError,
  } = useChatStore();

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

  if (!isLoaded || !currentUserId) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="chat-layout flex h-full overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar className="border-r border-gray-200 dark:border-gray-700" />
      <ChatPane
        className="border-l border-gray-200 dark:border-gray-700"
        sendTyping={sendTyping}
      />
    </div>
  );
};

export default ChatLayout;
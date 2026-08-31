'use client';

import { create } from 'zustand';
import type { ChatConversation, ChatMessage, ChatMessageRead, ChatUser } from '@/types/chat';

export interface ChatStoreState {
  currentUserId: string | null;
  conversations: ChatConversation[];
  messages: Record<string, ChatMessage[]>;
  selectedConversationId: string | null;
  users: Record<string, ChatUser>;
  presence: Record<string, 'online' | 'offline'>;
  typing: Record<string, Record<string, boolean>>;
  isLoading: boolean;
  error: string | null;
  deletedMessageIds: Set<string>;

  setCurrentUserId: (id: string | null) => void;
  setConversations: (conversations: ChatConversation[]) => void;
  upsertConversation: (conversation: ChatConversation) => void;
  removeConversation: (conversationId: string) => void;
  setMessages: (conversationId: string, messages: ChatMessage[]) => void;
  addMessage: (
    message: ChatMessage,
    currentUserId: string | null,
    selectedConversationId: string | null
  ) => void;
  updateMessage: (messageId: string, partial: Partial<ChatMessage>) => void;
  removeMessage: (messageId: string) => void;
  tombstoneMessage: (messageId: string) => void;
  upsertMessageRead: (messageId: string, read: ChatMessageRead) => void;
  setSelectedConversation: (id: string | null) => void;
  markConversationRead: (conversationId: string) => void;
  setUsers: (users: Record<string, ChatUser>) => void;
  addOrUpdateUser: (user: ChatUser) => void;
  setPresence: (userId: string, status: 'online' | 'offline') => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const sortByDate = (a: ChatMessage, b: ChatMessage) =>
  new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

const sortByLastMessage = (conversations: ChatConversation[]) =>
  [...conversations].sort((a, b) => {
    const ta = new Date(a.last_message_at ?? '').getTime() || 0;
    const tb = new Date(b.last_message_at ?? '').getTime() || 0;
    return tb - ta;
  });

export const useChatStore = create<ChatStoreState>()((set) => ({
  currentUserId: null,
  conversations: [],
  messages: {},
  selectedConversationId: null,
  users: {},
  presence: {},
  typing: {},
  isLoading: false,
  error: null,
  deletedMessageIds: new Set<string>(),

  setCurrentUserId: (id) => set({ currentUserId: id }),

  setConversations: (conversations) => set({ conversations: sortByLastMessage(conversations) }),

  upsertConversation: (conversation) =>
    set((state) => {
      const exists = state.conversations.some((c) => c.id === conversation.id);
      const conversations = sortByLastMessage(
        exists
          ? state.conversations.map((c) => (c.id === conversation.id ? { ...c, ...conversation } : c))
          : [...state.conversations, conversation]
      );
      return { conversations };
    }),

  removeConversation: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== conversationId),
      messages: Object.fromEntries(
        Object.entries(state.messages).filter(([id]) => id !== conversationId)
      ),
    })),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: [...messages].sort(sortByDate) },
    })),

  addMessage: (message, currentUserId, selectedConversationId) =>
    set((state) => {
      const existing = state.messages[message.conversation_id] || [];
      if (existing.some((m) => m.id === message.id)) return state;

      // A deleted or tombstoned message must never be (re)surfaced, regardless
      // of source or timing. Realtime re-adds / send finalization that race
      // ahead of a soft-delete can still carry is_deleted=false, so a simple
      // is_deleted check on the payload is not enough to keep it gone.
      if (message.is_deleted || state.deletedMessageIds.has(message.id)) return state;

      const messages = {
        ...state.messages,
        [message.conversation_id]: [...existing, message].sort(sortByDate),
      };

      const isUnread =
        message.sender_id !== currentUserId && message.conversation_id !== selectedConversationId;

      const conversations = sortByLastMessage(
        state.conversations.map((c) =>
          c.id === message.conversation_id
            ? {
                ...c,
                last_message: message,
                last_message_at: message.created_at,
                updated_at: message.created_at,
                unread_count: (c.unread_count || 0) + (isUnread ? 1 : 0),
              }
            : c
        )
      );

      return { messages, conversations };
    }),

  updateMessage: (messageId, partial) =>
    set((state) => {
      for (const [convId, list] of Object.entries(state.messages)) {
        const idx = list.findIndex((m) => m.id === messageId);
        if (idx === -1) continue;
        const messages = {
          ...state.messages,
          [convId]: list.map((m) => (m.id === messageId ? { ...m, ...partial } : m)),
        };
        const conversations = state.conversations.map((c) => {
          if (c.id !== convId || !(c.last_message && c.last_message.id === messageId)) return c;
          return { ...c, last_message: { ...c.last_message, ...partial } };
        });
        return { messages, conversations };
      }
      return state;
    }),

  removeMessage: (messageId) =>
    set((state) => {
      for (const [convId, list] of Object.entries(state.messages)) {
        const target = list.find((m) => m.id === messageId);
        if (!target) continue;
        const remaining = list.filter((m) => m.id !== messageId);
        const messages = { ...state.messages, [convId]: remaining };
        // If the removed bubble was a conversation's last message (sidebar
        // preview), fall back to the previous remaining message so the sidebar
        // no longer shows text that no longer exists in the thread.
        const conversations = state.conversations.map((c) => {
          if (c.id !== convId) return c;
          // Decrement the unread badge if the removed message was counted as
          // unread: it came from another participant in a conversation that was
          // not the one open when the delete happens (mirror of addMessage).
          const wasUnread =
            target.sender_id !== state.currentUserId &&
            convId !== state.selectedConversationId &&
            (c.unread_count || 0) > 0;
          const wasLast = c.last_message && c.last_message.id === messageId;
          if (!wasLast) {
            if (!wasUnread) return c;
            return { ...c, unread_count: (c.unread_count || 0) - 1 };
          }
          const next = remaining[remaining.length - 1];
          return {
            ...c,
            last_message: next ?? undefined,
            last_message_at: next ? next.created_at : c.last_message_at,
            unread_count: wasUnread ? (c.unread_count || 0) - 1 : c.unread_count,
          };
        });
        return { messages, conversations: sortByLastMessage(conversations) };
      }
      return state;
    }),

  tombstoneMessage: (messageId) =>
    set((state) => ({
      deletedMessageIds: new Set(state.deletedMessageIds).add(messageId),
    })),

  upsertMessageRead: (messageId, read) =>
    set((state) => {
      const mergeReads = (m: ChatMessage): ChatMessage => ({
        ...m,
        reads: [...(m.reads || []).filter((r) => r.user_id !== read.user_id), read],
      });

      const messages = { ...state.messages };
      let foundInList = false;
      for (const [convId, list] of Object.entries(messages)) {
        if (!list.some((m) => m.id === messageId)) continue;
        foundInList = true;
        messages[convId] = list.map((m) => (m.id === messageId ? mergeReads(m) : m));
      }

      const conversations = state.conversations.map((c) =>
        c.last_message && c.last_message.id === messageId
          ? { ...c, last_message: mergeReads(c.last_message) }
          : c
      );
      const updatedReads =
        conversations.some((c, i) => c !== state.conversations[i]) || foundInList;
      if (!updatedReads) return state;

      return { messages, conversations };
    }),

  setSelectedConversation: (id) =>
    set((state) => {
      if (id === null) return { selectedConversationId: null };
      return {
        selectedConversationId: id,
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, unread_count: 0 } : c
        ),
      };
    }),

  markConversationRead: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ),
    })),

  setUsers: (users) => set({ users }),

  addOrUpdateUser: (user) =>
    set((state) => ({ users: { ...state.users, [user.id]: user } })),

  setPresence: (userId, status) =>
    set((state) => ({ presence: { ...state.presence, [userId]: status } })),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const convTyping = state.typing[conversationId] || {};
      return {
        typing: {
          ...state.typing,
          [conversationId]: { ...convTyping, [userId]: isTyping },
        },
      };
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));
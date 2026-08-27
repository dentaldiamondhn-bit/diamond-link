import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types
export type ConversationType = 'direct' | 'group';

export interface ChatUser {
  id: string;
  name: string;
  avatarUrl?: string;
  online: boolean;
}

export interface ChatAttachment {
  type: 'image' | 'file' | 'voice';
  url: string;
  name?: string;
  size?: number;
  duration?: number; // for voice
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE' | 'PATIENT_CASE' | 'SYSTEM';
  attachments?: ChatAttachment[];
  createdAt: string; // ISO string
  updatedAt?: string;
  // Extended fields
  reactions?: Record<string, string[]>; // emoji -> userIds
  readAt?: string; // ISO string when read by current user
  deliveredAt?: string; // ISO string when delivered
  editedAt?: string; // ISO string when edited
  replyToId?: string; // message ID
  voiceNoteUrl?: string;
  voiceNoteDuration?: number;
}

export interface ChatConversation {
  id: string;
  type: ConversationType;
  participantIds: string[];
  participantNames?: Record<string, string>;
  participantAvatars?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  pinned: boolean;
  archived: boolean;
}

// Store state
interface ChatState {
  conversations: ChatConversation[];
  messages: Record<string, ChatMessage[]>; // conversationId -> messages
  selectedConversationId: string | null;
  users: Record<string, ChatUser>;
  // UI state
  isLoading: boolean;
  error: string | null;
  // Actions
  setConversations: (conversations: ChatConversation[]) => void;
  setMessages: (conversationId: string, messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (messageId: string, partial: Partial<ChatMessage>) => void;
  setSelectedConversation: (id: string | null) => void;
  setUsers: (users: Record<string, ChatUser>) => void;
  addOrUpdateUser: (user: ChatUser) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  // Conversation updates
  updateConversationLastMessage: (conversationId: string, lastMessage: ChatMessage) => void;
  incrementUnread: (conversationId: string) => void;
  resetUnread: (conversationId: string) => void;
  setPinned: (conversationId: string, pinned: boolean) => void;
  setArchived: (conversationId: string, archived: boolean) => void;
  // New conversation creation
  createDirectConversation: (currentUserId: string, userId: string) => void;
}

// Initial state
const initialState: ChatState = {
  conversations: [],
  messages: {},
  selectedConversationId: null,
  users: {},
  isLoading: false,
  error: null,
  setConversations: () => {},
  setMessages: () => {},
  addMessage: () => {},
  updateMessage: () => {},
  setSelectedConversation: () => {},
  setUsers: () => {},
  addOrUpdateUser: () => {},
  setLoading: () => {},
  setError: () => {},
  updateConversationLastMessage: () => {},
  incrementUnread: () => {},
  resetUnread: () => {},
  setPinned: () => {},
  setArchived: () => {},
  createDirectConversation: () => {},
};

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        setConversations: (conversations) => set({ conversations }),
        setMessages: (conversationId, messages) =>
          set((state) => ({
            messages: { ...state.messages, [conversationId]: messages },
          })),
        addMessage: (message) =>
          set((state) => {
            const convId = message.conversationId;
            const existing = state.messages[convId] || [];
            // Avoid duplicates by id
            if (!existing.some((m) => m.id === message.id)) {
              return {
                messages: {
                  ...state.messages,
                  [convId]: [...existing, message].sort(
                    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                  ),
                },
              };
            }
            return state;
          }),
        updateMessage: (messageId, partial) =>
          set((state) => {
            // Find which conversation this message belongs to
            for (const [convId, messages] of Object.entries(state.messages)) {
              const idx = messages.findIndex((m) => m.id === messageId);
              if (idx !== -1) {
                const updated = [...messages];
                updated[idx] = { ...updated[idx], ...partial };
                return {
                  messages: {
                    ...state.messages,
                    [convId]: updated,
                  },
                };
              }
            }
            return state;
          }),
        setSelectedConversation: (id) => set({ selectedConversationId: id }),
        setUsers: (users) => set({ users }),
        addOrUpdateUser: (user) =>
          set((state) => ({
            users: { ...state.users, [user.id]: user },
          })),
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        updateConversationLastMessage: (conversationId, lastMessage) =>
          set((state) => {
            const convs = state.conversations.map((c) =>
              c.id === conversationId
                ? { ...c, lastMessage, updatedAt: new Date().toISOString() }
                : c
            );
            return { conversations: convs };
          }),
        incrementUnread: (conversationId) =>
          set((state) => {
            const convs = state.conversations.map((c) =>
              c.id === conversationId
                ? { ...c, unreadCount: c.unreadCount + 1 }
                : c
            );
            return { conversations: convs };
          }),
        resetUnread: (conversationId) =>
          set((state) => {
            const convs = state.conversations.map((c) =>
              c.id === conversationId ? { ...c, unreadCount: 0 } : c
            );
            return { conversations: convs };
          }),
        setPinned: (conversationId, pinned) =>
          set((state) => {
            const convs = state.conversations.map((c) =>
              c.id === conversationId ? { ...c, pinned } : c
            );
            return { conversations: convs };
          }),
        setArchived: (conversationId, archived) =>
          set((state) => {
            const convs = state.conversations.map((c) =>
              c.id === conversationId ? { ...c, archived } : c
            );
            return { conversations: convs };
          }),
        createDirectConversation: (currentUserId, userId) =>
          set((state) => {
            // Check if a direct conversation already exists between these two users
            const existing = state.conversations.find(
              conv =>
                conv.type === 'direct' &&
                conv.participantIds.length === 2 &&
                conv.participantIds.includes(currentUserId) &&
                conv.participantIds.includes(userId)
            );

            if (existing) {
              // If exists, just return (we'll handle setting selected conversation in the UI)
              return state;
            }

            // Create new conversation
            const newConversation: ChatConversation = {
              id: `direct-${currentUserId}-${userId}`,
              type: 'direct',
              participantIds: [currentUserId, userId],
              participantNames: {
                [currentUserId]: state.users[currentUserId]?.name || 'Unknown',
                [userId]: state.users[userId]?.name || 'Unknown',
              },
              participantAvatars: {
                [currentUserId]: state.users[currentUserId]?.avatarUrl || '/default-avatar.svg',
                [userId]: state.users[userId]?.avatarUrl || '/default-avatar.svg',
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastMessage: undefined,
              unreadCount: 0,
              pinned: false,
              archived: false,
            };

            return {
              conversations: [...state.conversations, newConversation],
            };
          }),
      }),
      {
        name: 'chat-storage', // localStorage key
      }
    )
  )
);
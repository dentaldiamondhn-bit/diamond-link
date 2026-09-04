'use client';

import { create } from 'zustand';
import {
  ChatSettingsService,
  type ChatSettings,
  type ChatSettingsUpdate,
} from '@/services/chatSettingsService';

interface ChatSettingsStoreState {
  userId: string | null;
  conversationId: string | null;
  settings: ChatSettings | null;
  loading: boolean;
  /** Set the current user + conversation scope and load effective settings. */
  setContext: (userId: string | null, conversationId?: string | null) => void;
  /** Load effective settings for the current scope. */
  load: (userId: string, conversationId?: string | null) => Promise<void>;
  /** Persist a patch for the current scope (optimistic repaint). */
  update: (patch: ChatSettingsUpdate) => Promise<void>;
}

export const useChatSettingsStore = create<ChatSettingsStoreState>((set, get) => ({
  userId: null,
  conversationId: null,
  settings: null,
  loading: false,

  setContext: (userId, conversationId = null) => {
    const current = get();
    const cid = conversationId ?? null;
    if (current.userId === userId && current.conversationId === cid) return;
    set({ userId, conversationId: cid, settings: null });
    if (userId) get().load(userId, cid);
  },

  load: async (userId, conversationId = null) => {
    set({ loading: true });
    const settings = await ChatSettingsService.getSettings(userId, conversationId);
    set({ settings, loading: false });
  },

  update: async (patch) => {
    const { userId, conversationId, settings } = get();
    if (!userId) return;
    // Optimistic update so the chat repaints instantly.
    const current = settings ?? ({ user_id: userId, conversation_id: conversationId } as ChatSettings);
    const nextSettings = { ...current, ...patch, user_id: userId, conversation_id: conversationId };
    set({ settings: nextSettings });
    const persisted = await ChatSettingsService.updateSettings(
      userId,
      conversationId ?? null,
      patch
    );
    if (persisted) set({ settings: persisted, userId, conversationId });
  },
}));

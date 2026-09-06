'use client';

import { create } from 'zustand';
import {
  ChatSettingsService,
  type ChatSettings,
  type ChatSettingsUpdate,
} from '@/services/chatSettingsService';

const scopeKey = (userId: string, conversationId: string | null) =>
  conversationId ? `${userId}::${conversationId}` : `${userId}::global`;

interface ChatSettingsStoreState {
  userId: string | null;
  conversationId: string | null;
  settings: ChatSettings | null;
  loading: boolean;
  /** Last-known effective settings per scope (instant repaint on revisit). */
  cache: Record<string, ChatSettings>;
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
  cache: {},

  setContext: (userId, conversationId = null) => {
    const current = get();
    const cid = conversationId ?? null;
    if (current.userId === userId && current.conversationId === cid) return;
    const cached = userId ? current.cache[scopeKey(userId, cid)] : undefined;
    set({
      userId,
      conversationId: cid,
      settings: cached ?? null,
      loading: !cached,
    });
    if (userId) get().load(userId, cid);
  },

  load: async (userId, conversationId = null) => {
    const cid = conversationId ?? null;
    set({ loading: true });
    const settings = await ChatSettingsService.getSettings(userId, cid);
    const current = get();
    // Discard stale responses: a slower load (e.g. the mount-time global scope,
    // or a previously selected conversation) must never overwrite the settings
    // of the scope the user has already switched to. This was wiping per-chat
    // wallpapers/bubble styles until the user left and came back.
    const stillCurrent = current.userId === userId && (current.conversationId ?? null) === cid;
    if (!stillCurrent) return;
    set({
      settings,
      loading: false,
      cache: { ...current.cache, [scopeKey(userId, cid)]: settings },
    });
  },

  update: async (patch) => {
    const { userId, conversationId, settings } = get();
    if (!userId) return;
    const cid = conversationId ?? null;
    // Optimistic update so the chat repaints instantly.
    const current = settings ?? ({ user_id: userId, conversation_id: conversationId } as ChatSettings);
    const nextSettings = { ...current, ...patch, user_id: userId, conversation_id: conversationId };
    set({ settings: nextSettings });
    const persisted = await ChatSettingsService.updateSettings(userId, cid, patch);
    if (!persisted) return;
    const now = get();
    const stillCurrent = now.userId === userId && (now.conversationId ?? null) === cid;
    set({
      settings: stillCurrent ? persisted : now.settings,
      cache: { ...now.cache, [scopeKey(userId, cid)]: persisted },
    });
  },
}));

'use client';

import { create } from 'zustand';
import { ChatSettingsService, type ChatSettings } from '@/services/chatSettingsService';

export type ChatSettingsUpdate = Partial<
  Pick<ChatSettings, 'wallpaper_type' | 'background_image_url' | 'my_bubble_color' | 'other_bubble_color'>
>;

interface ChatSettingsStoreState {
  userId: string | null;
  settings: ChatSettings | null;
  loading: boolean;
  setUser: (userId: string | null) => void;
  load: (userId: string) => Promise<void>;
  update: (patch: ChatSettingsUpdate) => Promise<void>;
}

export const useChatSettingsStore = create<ChatSettingsStoreState>((set, get) => ({
  userId: null,
  settings: null,
  loading: false,

  setUser: (userId) => {
    if (get().userId === userId) return;
    set({ userId });
    if (userId) get().load(userId);
    else set({ settings: null });
  },

  load: async (userId) => {
    set({ loading: true });
    const settings = await ChatSettingsService.getSettings(userId);
    set({ settings, loading: false });
  },

  update: async (patch) => {
    const { userId, settings } = get();
    if (!userId) return;
    // Optimistic update so the chat repaints instantly.
    const nextSettings = { ...(settings ?? ({} as ChatSettings)), ...patch, user_id: userId };
    set({ settings: nextSettings });
    const persisted = await ChatSettingsService.updateSettings(userId, patch);
    if (persisted) set({ settings: persisted });
  },
}));

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { UserSettings, LanguageCode } from '@/lib/types';

const DEFAULT_SETTINGS: UserSettings = {
  isGmInverted: true,
  dateFormat: 'DD.MM.YYYY',
  language: 'es',
  autoSaveInterval: 30000,
  showTooltips: true,
  compactMode: false,
};

interface SettingsState {
  settings: UserSettings;
  setSettings: (settings: Partial<UserSettings>) => void;
  setLanguage: (lang: LanguageCode) => void;
  toggleGmInverted: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  immer((set) => ({
    settings: DEFAULT_SETTINGS,

    setSettings: (newSettings) => set((state) => {
      Object.assign(state.settings, newSettings);
    }),

    setLanguage: (lang) => set((state) => {
      state.settings.language = lang;
    }),

    toggleGmInverted: () => set((state) => {
      state.settings.isGmInverted = !state.settings.isGmInverted;
    }),
  }))
);
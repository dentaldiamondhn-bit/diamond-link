'use client';

import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  RotateCcw,
  Check,
  Paintbrush,
  Wallpaper,
} from 'lucide-react';
import { useChatSettingsStore } from '@/chat/store/chatSettingsStore';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { DEFAULT_WALLPAPER } from '@/chat/wallpapers';
import { useTheme } from '@/contexts/ThemeContext';

const MY_BUBBLE_COLORS = [
  '#2563eb',
  '#008069',
  '#128a4b',
  '#0d7377',
  '#7b4fbf',
  '#e0402a',
  '#c2185b',
  '#5f6368',
];
const OTHER_BUBBLE_COLORS = [
  '#ffffff',
  '#e9f3ec',
  '#d9ecfe',
  '#fdeedb',
  '#fce5ec',
  '#e9e5f8',
  '#f0f4d0',
  '#eceff1',
];

interface ChatSettingsPanelProps {
  onClose: () => void;
}

export const ChatSettingsPanel = ({ onClose }: ChatSettingsPanelProps) => {
  const { t } = useTranslations();
  const { resolvedTheme } = useTheme();
  const { settings, update } = useChatSettingsStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const myColor = settings?.my_bubble_color ?? '#2563eb';
  const otherColor = settings?.other_bubble_color ?? '#ffffff';
  const isCustomWallpaper =
    settings?.wallpaper_type === 'custom' && !!settings?.background_image_url;

  const handlePickWallpaper = () => {
    update({ wallpaper_type: 'default', background_image_url: null });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError(t('settingsWallpaperBadType'));
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/chat/wallpaper', { method: 'POST', body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Upload failed');
      await update({
        wallpaper_type: 'custom',
        background_image_url: result.uploadedUrl as string,
      });
    } catch (err) {
      console.error('Wallpaper upload failed:', err);
      setUploadError(t('settingsWallpaperUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {t('settingsTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label={t('settingsClose')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Wallpaper */}
          <section className="mb-6">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <Wallpaper className="h-4 w-4" />
              {t('settingsWallpaper')}
            </h3>

            <button
              type="button"
              onClick={handlePickWallpaper}
              className={`relative flex h-20 w-full items-center justify-center overflow-hidden rounded-xl border-2 transition ${
                !isCustomWallpaper
                  ? 'border-blue-500'
                  : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              style={{
                backgroundImage:
                  resolvedTheme === 'dark'
                    ? DEFAULT_WALLPAPER.dark
                    : DEFAULT_WALLPAPER.light,
                backgroundSize: '60px',
              }}
            >
              {!isCustomWallpaper && (
                <span className="absolute right-2 top-2 rounded-full bg-blue-500 p-0.5 text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <span className="rounded bg-white/80 px-2 py-0.5 text-xs font-medium text-gray-700">
                {t('settingsWallpaperDefault')}
              </span>
            </button>

            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <Upload className="h-4 w-4" />
                {uploading ? t('settingsWallpaperUploading') : t('settingsWallpaperUpload')}
              </button>
              {isCustomWallpaper && (
                <button
                  type="button"
                  onClick={handlePickWallpaper}
                  className="flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  title={t('settingsReset')}
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>

            {isCustomWallpaper && settings?.background_image_url && (
              <div className="mt-2 h-20 w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <img
                  src={settings.background_image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            {uploadError && (
              <p className="mt-2 text-xs text-red-500">{uploadError}</p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </section>

          {/* Bubble colors */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <Paintbrush className="h-4 w-4" />
              {t('settingsBubbles')}
            </h3>

            <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400">
              {t('settingsMyBubbles')}
            </p>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {MY_BUBBLE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => update({ my_bubble_color: color })}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                    myColor === color ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                  aria-label={t('settingsMyBubbles') + ' ' + color}
                >
                  {myColor === color && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>

            <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400">
              {t('settingsOtherBubbles')}
            </p>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {OTHER_BUBBLE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => update({ other_bubble_color: color })}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 transition dark:border-gray-600 ${
                    otherColor === color ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                  aria-label={t('settingsOtherBubbles') + ' ' + color}
                >
                  {otherColor === color && (
                    <Check className="h-4 w-4" style={{ color: '#2563eb' }} />
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                update({ my_bubble_color: '#2563eb', other_bubble_color: '#ffffff' })
              }
              className="mt-1 flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('settingsReset')}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ChatSettingsPanel;

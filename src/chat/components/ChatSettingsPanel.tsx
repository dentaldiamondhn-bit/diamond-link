'use client';

import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  RotateCcw,
  Check,
  Paintbrush,
  Wallpaper,
  Type,
  Rows,
  Palette,
  MessageSquareText,
} from 'lucide-react';
import { useChatSettingsStore } from '@/chat/store/chatSettingsStore';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { bubbleTextColor } from '@/chat/utils';
import type { ChatTextSize, ChatDensity } from '@/services/chatSettingsService';
import {
  DEFAULT_WALLPAPERS,
  DEFAULT_WALLPAPER_KEYS,
  WALLPAPER_TILE,
  type DefaultWallpaperKey,
} from '@/chat/wallpapers';
import { useTheme } from '@/contexts/ThemeContext';
import type { TranslationKey } from '@/chat/i18n/translations';

const WALLPAPER_LABEL_KEY: Record<DefaultWallpaperKey, TranslationKey> = {
  classic: 'settingsWallpaperClassic',
  dental: 'settingsWallpaperDental',
  azure: 'settingsWallpaperAzure',
  mint: 'settingsWallpaperMint',
  geo: 'settingsWallpaperGeo',
};

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

const TEXT_SIZES: { value: ChatTextSize; label: TranslationKey }[] = [
  { value: 'sm', label: 'textSizeSm' },
  { value: 'md', label: 'textSizeMd' },
  { value: 'lg', label: 'textSizeLg' },
];

const DENSITIES: { value: ChatDensity; label: TranslationKey }[] = [
  { value: 'comfortable', label: 'densityComfortable' },
  { value: 'compact', label: 'densityCompact' },
];

const ACCENT_COLORS = [
  '#2563eb',
  '#008069',
  '#0d9488',
  '#16a34a',
  '#7c3aed',
  '#9333ea',
  '#db2777',
  '#e11d48',
  '#ea580c',
  '#d97706',
  '#64748b',
  '#3b82f6',
];

// Empty = auto (derived from the bubble background by the layout).
const TEXT_COLORS: { label: TranslationKey; values: string[] }[] = [
  { label: 'settingsMyText', values: ['', '#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db'] },
  { label: 'settingsOtherText', values: ['', '#1f2937', '#374151', '#111827', '#ffffff'] },
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
  const textSize = settings?.text_size ?? 'md';
  const density = settings?.density ?? 'comfortable';
  const accent = settings?.accent_color ?? '#2563eb';
  const myTextColor = settings?.my_text_color ?? '';
  const otherTextColor = settings?.other_text_color ?? '';
  const isCustomWallpaper =
    settings?.wallpaper_type === 'custom' && !!settings?.background_image_url;
  const currentStyle: DefaultWallpaperKey | null =
    settings?.wallpaper_type === 'default'
      ? settings?.wallpaper_style ?? 'classic'
      : null;

  const handlePickWallpaper = (style: DefaultWallpaperKey) => {
    update({ wallpaper_type: 'default', wallpaper_style: style, background_image_url: null });
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

            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              {t('settingsWallpaperDefault')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_WALLPAPER_KEYS.map((key) => {
                const design = DEFAULT_WALLPAPERS[key];
                const selected =
                  !isCustomWallpaper && currentStyle === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handlePickWallpaper(key)}
                    className={`relative overflow-hidden rounded-xl border-2 transition ${
                      selected
                        ? 'border-[var(--fd-accent)]'
                        : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    style={{
                      backgroundImage:
                        resolvedTheme === 'dark' ? design.dark : design.light,
                      backgroundSize: `${Math.max(72, WALLPAPER_TILE / 3)}px`,
                    }}
                    aria-pressed={selected}
                  >
                    <span className="flex h-16 w-full items-center justify-center">
                      {selected && (
                        <span className="rounded-full fd-accent-bg p-0.5">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </span>
                    <span className="absolute inset-x-0 bottom-0 bg-black/30 px-1.5 py-0.5 text-center text-[10px] font-medium text-white">
                      {t(WALLPAPER_LABEL_KEY[key])}
                    </span>
                  </button>
                );
              })}
            </div>

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
                  onClick={() => handlePickWallpaper('classic')}
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
                    myColor === color ? 'ring-2 ring-[var(--fd-accent)] ring-offset-2 dark:ring-offset-gray-800' : ''
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
                    otherColor === color ? 'ring-2 ring-[var(--fd-accent)] ring-offset-2 dark:ring-offset-gray-800' : ''
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
              className="mt-1 flex items-center gap-1.5 text-xs font-medium fd-accent-text"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('settingsReset')}
            </button>
          </section>

          {/* Text size */}
          <section className="mb-6 mt-6">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <Type className="h-4 w-4" />
              {t('settingsTextSize')}
            </h3>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-700">
              {TEXT_SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => update({ text_size: s.value })}
                  className={`rounded-lg px-2 py-1.5 text-sm font-medium transition ${
                    textSize === s.value
                      ? 'fd-accent-bg'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t(s.label)}
                </button>
              ))}
            </div>
          </section>

          {/* Message spacing / density */}
          <section className="mb-6">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <Rows className="h-4 w-4" />
              {t('settingsDensity')}
            </h3>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-700">
              {DENSITIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => update({ density: d.value })}
                  className={`rounded-lg px-2 py-1.5 text-sm font-medium transition ${
                    density === d.value
                      ? 'fd-accent-bg'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t(d.label)}
                </button>
              ))}
            </div>
          </section>

          {/* Accent color */}
          <section className="mb-6">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <Palette className="h-4 w-4" />
              {t('settingsAccent')}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => update({ accent_color: color })}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                    accent === color
                      ? 'ring-2 ring-[var(--fd-accent)] ring-offset-2 dark:ring-offset-gray-800'
                      : ''
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                  aria-label={t('settingsAccent') + ' ' + color}
                >
                  {accent === color && (
                    <Check className="h-4 w-4 text-white" />
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Bubble text colors */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <MessageSquareText className="h-4 w-4" />
              {t('settingsMyText')}
            </h3>
            {TEXT_COLORS.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {t(group.label)}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {group.values.map((value) => {
                    const current =
                      group.label === 'settingsMyText' ? myTextColor : otherTextColor;
                    const selected = current === value;
                    return (
                      <button
                        key={value || 'auto'}
                        type="button"
                        onClick={() =>
                          update(
                            group.label === 'settingsMyText'
                              ? { my_text_color: value }
                              : { other_text_color: value }
                          )
                        }
                        className={`flex h-8 min-w-8 items-center justify-center rounded-full border border-gray-200 px-1 transition dark:border-gray-600 ${
                          selected
                            ? 'ring-2 ring-[var(--fd-accent)] ring-offset-2 dark:ring-offset-gray-800'
                            : ''
                        }`}
                        style={value ? { backgroundColor: value } : undefined}
                        title={value || t('settingsAuto')}
                        aria-label={`${t(group.label)} ${value || t('settingsAuto')}`}
                      >
                        {value === '' ? (
                          <span className="text-[9px] font-medium text-gray-600 dark:text-gray-300">
                            {t('settingsAuto')}
                          </span>
                        ) : (
                          <Check
                            className="h-4 w-4"
                            style={{ color: bubbleTextColor(value) }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
};

export default ChatSettingsPanel;

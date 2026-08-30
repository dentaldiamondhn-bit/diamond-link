'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { formatFileSize } from '@/chat/utils';
import type { FileAttachmentData } from '@/types/chat';

interface MediaLightboxProps {
  items: FileAttachmentData[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/**
 * Full-screen gallery over the message area. Swipe (touch) or use the arrow
 * buttons / keyboard to move between media items; videos autoplay with
 * controls once opened.
 */
export const MediaLightbox = ({ items, index, onIndexChange, onClose }: MediaLightboxProps) => {
  const { t } = useTranslations();
  const touchX = useRef<number | null>(null);
  const total = items.length;
  const safeIndex = total === 0 ? 0 : Math.max(0, Math.min(index, total - 1));

  const prev = useCallback(() => onIndexChange((safeIndex - 1 + total) % total), [safeIndex, total, onIndexChange]);
  const next = useCallback(() => onIndexChange((safeIndex + 1) % total), [safeIndex, total, onIndexChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onClose]);

  if (total === 0) return null;

  const current = items[safeIndex];
  const isImage = current.file_type.startsWith('image/');
  const isVideo = current.file_type.startsWith('video/');

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-black text-white"
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        if (start === null) return;
        const diff = e.changedTouches[0].clientX - start;
        if (Math.abs(diff) > 50) {
          if (diff < 0) next();
          else prev();
        }
      }}
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="flex h-14 flex-shrink-0 items-center justify-between px-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          title={t('cancel')}
          aria-label={t('cancel')}
          className="rounded-full p-2 hover:bg-white/10"
        >
          <X className="h-6 w-6" />
        </button>
        <span className="text-sm text-white/70">
          {safeIndex + 1}/{total}
        </span>
        <span className="w-10" />
      </div>

      {/* Media */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage ? (
          <img
            src={current.file_url}
            alt={current.file_name}
            className="max-h-full max-w-full object-contain"
          />
        ) : isVideo ? (
          <video
            src={current.file_url}
            controls
            autoPlay
            className="max-h-full max-w-full rounded-xl"
          />
        ) : (
          <p className="max-w-md break-all text-center text-sm text-white/70">
            {current.file_name}
          </p>
        )}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label={t('previousFile')}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label={t('nextFile')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center justify-center gap-2 py-3 text-xs text-white/60">
        <span className="max-w-[60%] truncate">{current.file_name}</span>
        <span>·</span>
        <span>{formatFileSize(current.file_size)}</span>
      </div>
    </div>
  );
};

export default MediaLightbox;
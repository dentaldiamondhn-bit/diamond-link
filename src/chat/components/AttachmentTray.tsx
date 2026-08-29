'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, File as FileIcon, FileText, Image as ImageIcon, X } from 'lucide-react';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { formatFileSize } from '@/chat/utils';

/** A file staged in the composer attachment tray (not yet uploaded). */
export interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  type: string;
  size: number;
}

interface AttachmentTrayProps {
  attachments: PendingAttachment[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  onRemove: (index: number) => void;
  className?: string;
}

/**
 * WhatsApp-style attachment tray. Once files are selected (paperclip or
 * drag & drop) they populate this tray with a live preview; multi-file picks
 * can be navigated with the chevrons / counter while the text input stays
 * editable below (caption). Upload happens on send.
 */
export const AttachmentTray = ({
  attachments,
  activeIndex,
  onChangeIndex,
  onRemove,
  className = '',
}: AttachmentTrayProps) => {
  const { t } = useTranslations();
  const total = attachments.length;
  if (total === 0) return null;

  const safeIndex = Math.max(0, Math.min(activeIndex, total - 1));
  const current = attachments[safeIndex];
  const isImage = current.type.startsWith('image/');
  const DocIcon = current.type === 'application/pdf' ? FileText : FileIcon;
  const prev = () => onChangeIndex((safeIndex - 1 + total) % total);
  const next = () => onChangeIndex((safeIndex + 1) % total);

  return (
    <div
      className={`mb-2 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800 ${className}`}
    >
      <div className="relative">
        <div className="flex h-44 items-center justify-center overflow-hidden bg-black/5 dark:bg-black/20">
          {isImage ? (
            <img
              src={current.previewUrl}
              alt={current.name}
              className="max-h-44 max-w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 px-6 text-gray-500 dark:text-gray-400">
              <DocIcon className="h-12 w-12" strokeWidth={1.5} />
              <span className="max-w-full truncate text-xs font-medium text-gray-700 dark:text-gray-200">
                {current.name}
              </span>
              <span className="text-[11px]">{formatFileSize(current.size)}</span>
            </div>
          )}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label={t('previousFile')}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label={t('nextFile')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute right-9 top-2 rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-white">
              {safeIndex + 1}/{total}
            </span>
          </>
        )}

        <button
          type="button"
          onClick={() => onRemove(safeIndex)}
          title={t('removeAttachment')}
          className="absolute right-2 top-2 rounded-full bg-black/40 p-1 text-white hover:bg-black/60"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AttachmentTray;
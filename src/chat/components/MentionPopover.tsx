'use client';

import { useEffect } from 'react';
import { MessageCircle, Phone, Video, AlertCircle } from 'lucide-react';
import { getUserDisplayName, getInitials, getAvatarColor } from '@/chat/utils';
import { useTranslations } from '@/chat/i18n/useTranslations';
import type { ChatUser } from '@/types/chat';

interface Props {
  user: ChatUser | undefined;
  anchor: { top: number; left: number } | null;
  onClose: () => void;
}

const WIDTH = 256; // w-64
const EST_H = 180; // header (~72) + actions (~76) + border

/** WhatsApp-style user card: avatar + name at top, 4 icon actions at the bottom. */
export default function MentionPopover({ user, anchor, onClose }: Props) {
  const { t } = useTranslations();
  useEffect(() => {
    if (!anchor) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [anchor, onClose]);

  if (!anchor) return null;

  // Clamp to the viewport so the card never gets cut off.
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - WIDTH - 8));
  const top = Math.max(8, Math.min(anchor.top, window.innerHeight - EST_H - 8));

  const name = getUserDisplayName(user);
  const initials = getInitials(name);
  const avatar = user?.profile_image_url;

  const actions = [
    { key: 'text', Icon: MessageCircle, label: t('mentionText') },
    { key: 'call', Icon: Phone, label: t('mentionCall') },
    { key: 'video', Icon: Video, label: t('mentionVideo') },
    { key: 'alert', Icon: AlertCircle, label: t('mentionAlert') },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        role="dialog"
        aria-label={name}
        className="fixed z-50 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-600 dark:bg-gray-800"
        style={{ top, left }}
      >
        <div
          className={`flex items-center gap-3 p-4 ${getAvatarColor(name)}`}
        >
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="h-14 w-14 rounded-full border-2 border-white object-cover shadow"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-black/25 text-lg font-semibold text-white">
              {initials}
            </span>
          )}
          <p className="min-w-0 flex-1 text-base font-semibold text-white">{name}</p>
        </div>
        <div className="flex items-center justify-around border-t border-gray-100 py-3 dark:border-gray-700">
          {actions.map(({ key, Icon, label }) => (
            <button
              key={key}
              type="button"
              aria-label={label}
              className="flex h-11 w-11 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

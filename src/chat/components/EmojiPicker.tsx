'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { EMOJI_CATEGORIES } from '@/chat/data/emojiLibrary';
import type { EmojiCategory } from '@/chat/data/emojiLibrary';
import type { TranslationKey } from '@/chat/i18n/translations';

const CATEGORY_LABEL_KEYS: Record<EmojiCategory['id'], TranslationKey> = {
  people: 'groupPeople',
  nature: 'groupNature',
  foods: 'groupFoods',
  activity: 'groupActivity',
  places: 'groupPlaces',
  objects: 'groupObjects',
  symbols: 'groupSymbols',
  flags: 'groupFlags',
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export const EmojiPicker = ({ onSelect, className = '' }: EmojiPickerProps) => {
  const { t } = useTranslations();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState<string>(EMOJI_CATEGORIES[0]?.id ?? '');

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const headerOffset = 24;
    let current = EMOJI_CATEGORIES[0]?.id ?? '';
    for (const cat of EMOJI_CATEGORIES) {
      const section = container.querySelector<HTMLElement>(`[data-cat="${cat.id}"]`);
      if (!section) continue;
      const sectionTop =
        section.getBoundingClientRect().top - container.getBoundingClientRect().top;
      if (sectionTop <= headerOffset) current = cat.id;
    }
    setActive((prev) => (prev === current ? prev : current));
  }, []);

  const scrollToCategory = useCallback((id: string) => {
    const container = scrollRef.current;
    if (!container) return;
    const section = container.querySelector<HTMLElement>(`[data-cat="${id}"]`);
    if (!section) return;
    const top =
      section.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop;
    container.scrollTo({ top, behavior: 'smooth' });
    setActive(id);
  }, []);

  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>
      <div className="flex items-center gap-1 px-1 pb-1.5 border-b border-gray-200 dark:border-gray-700 overflow-x-auto flex-shrink-0">
        {EMOJI_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            title={t(CATEGORY_LABEL_KEYS[cat.id])}
            onClick={() => scrollToCategory(cat.id)}
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg leading-none hover:bg-gray-100 dark:hover:bg-gray-700 ${
              active === cat.id ? 'bg-gray-200 dark:bg-gray-600' : ''
            }`}
          >
            {cat.emojis[0]}
          </button>
        ))}
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-1 pb-1"
      >
        {EMOJI_CATEGORIES.map((cat) => (
          <div key={cat.id} data-cat={cat.id}>
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1 py-1">
              {t(CATEGORY_LABEL_KEYS[cat.id])}
            </div>
            <div className="grid grid-cols-8 gap-0.5">
              {cat.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  className="p-0.5 rounded text-lg leading-none hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
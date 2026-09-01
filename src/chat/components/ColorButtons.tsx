'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Highlighter, Palette } from 'lucide-react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection } from 'lexical';
import { $patchStyleText } from '@lexical/selection';

export const TEXT_COLOR_SWATCHES = [
  '#9ca3af',
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

export const HIGHLIGHT_SWATCHES = [
  '#fef08a',
  '#bbf7d0',
  '#bfdbfe',
  '#fbcfe8',
  '#ddd6fe',
  '#fed7aa',
  '#fca5a5',
  '#e5e7eb',
];

interface PopoverProps {
  label: string;
  icon: React.ReactNode;
  light?: boolean;
  children: React.ReactNode;
}

function ColorPopover({ label, icon, light, children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const flipUp = () => {
      const menu = menuRef.current;
      if (!menu) return;
      menu.classList.remove('bottom-full', 'mb-0', 'mt-2');
      menu.classList.add('top-full', 'mt-1');
      const rect = menu.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - 8) {
        menu.classList.add('bottom-full', 'mb-0', 'mt-2');
        menu.classList.remove('top-full', 'mt-1');
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', flipUp, true);
    window.addEventListener('resize', flipUp);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', flipUp, true);
      window.removeEventListener('resize', flipUp);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    const root = rootRef.current;
    if (!menu || !root) return;
    const rect = menu.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - 8) {
      menu.classList.add('bottom-full', 'mb-0', 'mt-2');
      menu.classList.remove('top-full', 'mt-1');
    }
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={
          light
            ? 'rounded p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            : 'rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white'
        }
      >
        {icon}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className={`absolute left-0 z-20 w-44 rounded-xl border p-2 shadow-2xl ${
              light
                ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                : 'border-white/10 bg-gray-800'
            }`}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function SwatchGrid({
  colors,
  onSelect,
}: {
  colors: string[];
  onSelect: (color: string) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          onClick={() => onSelect(c)}
          className="h-6 w-6 rounded-md border border-black/10 shadow-sm transition hover:scale-110"
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function applyStylePatch(editor: ReturnType<typeof useLexicalComposerContext>[0], patch: Record<string, string | null>) {
  editor.update(() => {
    const sel = $getSelection();
    if (!$isRangeSelection(sel)) return;
    $patchStyleText(sel, patch);
  });
  editor.focus();
}

interface ColorButtonsProps {
  /** `light` = main composer (light/dark theme); omit for the dark caption toolbar. */
  light?: boolean;
}

export const ColorButtons = ({ light }: ColorButtonsProps) => {
  const [editor] = useLexicalComposerContext();

  return (
    <>
      <ColorPopover
        label="Text color"
        icon={<Palette className="h-4 w-4" />}
        light={light}
      >
        <div className="flex flex-col gap-2">
          <SwatchGrid
            colors={TEXT_COLOR_SWATCHES}
            onSelect={(c) => applyStylePatch(editor, { color: c })}
          />
          <label
            className={`flex items-center justify-between gap-2 text-xs ${
              light ? 'text-gray-500 dark:text-gray-400' : 'text-white/60'
            }`}
          >
            Custom
            <input
              type="color"
              className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent"
              onInput={(e) => applyStylePatch(editor, { color: (e.target as HTMLInputElement).value })}
            />
          </label>
        </div>
      </ColorPopover>

      <ColorPopover
        label="Highlight"
        icon={<Highlighter className="h-4 w-4" />}
        light={light}
      >
        <div className="flex flex-col gap-2">
          <SwatchGrid
            colors={HIGHLIGHT_SWATCHES}
            onSelect={(c) => applyStylePatch(editor, { 'background-color': c })}
          />
          <button
            type="button"
            onClick={() => applyStylePatch(editor, { 'background-color': null })}
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              light
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            Remove highlight
          </button>
        </div>
      </ColorPopover>
    </>
  );
};

export default ColorButtons;

'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('aria-hidden') && el.getClientRects().length > 0
  );
}

/**
 * Reusable modal focus trap (Phase 8 — accessibility & polish).
 *
 * While `active` is true the first focusable element inside the element
 * attached to the returned ref receives focus, Tab / Shift+Tab cycles within
 * the container, Escape invokes `onEscape`, and on deactivation focus is
 * restored to the element that had it before the trap opened.
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  active: boolean,
  onEscape?: () => void
) {
  const ref = useRef<T | null>(null);
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = getFocusable(container);
    (focusables[0] ?? container).focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscapeRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = getFocusable(container);
      if (!list.length) {
        e.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !container.contains(activeEl)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      // Only restore when focus is still inside the container so we never
      // steal it back from something else that opened meanwhile.
      if (container.contains(document.activeElement)) {
        previouslyFocused?.focus?.();
      }
    };
  }, [active]);

  return ref;
}
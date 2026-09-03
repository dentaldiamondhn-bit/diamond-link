'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  TextNode,
  type LexicalNode,
} from 'lexical';
import { Loader2 } from 'lucide-react';
import { SpellCheckNode, $isSpellCheckNode } from './SpellCheckNode';
import { getSpellchecker, type SpellcheckHandle } from './spellcheckService';
import type { ChatLocale } from '@/chat/i18n/translations';
import { useTranslations } from '@/chat/i18n/useTranslations';

/**
 * A-Z (incl. accents + combining marks), optionally joined by `'`, `-` or `·`.
 */
const WORD_RE = /[\p{L}\p{M}]+(?:[’'ʼ·-][\p{L}\p{M}]+)*/gu;

interface Seg {
  text: string;
  misspelled: boolean;
}

interface MarkItem {
  node: TextNode;
  /** Full-node rebuild. */
  segs?: Seg[];
  /** Split the node here and mark only the left (completed) portion. */
  splitAt?: number;
}

interface PopoverState {
  word: string;
  rect: DOMRect;
  element: HTMLElement;
}

function segmentText(text: string, correct: (word: string) => boolean): Seg[] {
  const out: Seg[] = [];
  let last = 0;
  WORD_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WORD_RE.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), misspelled: false });
    const word = m[0];
    out.push({ text: word, misspelled: !correct(word) });
    last = m.index + word.length;
  }
  if (last < text.length) out.push({ text: text.slice(last), misspelled: false });
  return out.filter((s) => s.text.length > 0);
}

/** Rebuild a text node's content into plain/spell-marked segments. */
function rebuildNode(node: TextNode, segs: Seg[]): void {
  const format = node.getFormat();
  const style = node.getStyle();
  const built = segs
    .filter((s) => s.text.length > 0)
    .map((s) => {
      const next = s.misspelled ? new SpellCheckNode(s.text) : new TextNode(s.text);
      next.setFormat(format);
      next.setStyle(style);
      return next;
    });

  if (built.length === 0) {
    node.remove();
    return;
  }

  const [first, ...rest] = built;
  let cursor: LexicalNode = node.replace(first);
  for (const next of rest) {
    cursor = cursor.insertAfter(next);
  }
}

interface SpellCheckPluginProps {
  locale: ChatLocale;
  /** Called with true once a dictionary is loaded (so native spellcheck can switch off). */
  onReady?: (ready: boolean) => void;
}

export function SpellCheckPlugin({ locale, onReady }: SpellCheckPluginProps) {
  const [editor] = useLexicalComposerContext();
  const { t } = useTranslations();

  const [handle, setHandle] = useState<SpellcheckHandle | null>(null);
  const handleRef = useRef<SpellcheckHandle | null>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const popoverRef = useRef<PopoverState | null>(null);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const timerRef = useRef<number | null>(null);
  const aliveRef = useRef(true);
  const triesRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);
  const loadDictionaryRef = useRef<((loc: ChatLocale) => Promise<void>) | null>(null);
  const processedTextsRef = useRef<Map<string, string>>(new Map());

  const setDebug = useCallback((patch: Record<string, unknown>) => {
    (globalThis as { __spellDebug?: Record<string, unknown> }).__spellDebug = {
      ...((globalThis as { __spellDebug?: Record<string, unknown> }).__spellDebug ?? {}),
      ...patch,
      at: Date.now(),
    };
  }, []);

  useEffect(() => {
    handleRef.current = handle;
  }, [handle]);

  useEffect(() => {
    onReady?.(handle !== null);
  }, [onReady, handle]);

  const setPopoverBoth = useCallback((next: PopoverState | null) => {
    popoverRef.current = next;
    setPopover(next);
  }, []);

  const findSpellNodeByText = useCallback(
    (word: string): SpellCheckNode | null => {
      return editor.getEditorState().read(() => {
        let out: SpellCheckNode | null = null;
        const walk = (n: LexicalNode) => {
          if (out) return;
          if (
            $isTextNode(n) &&
            $isSpellCheckNode(n) &&
            n.getTextContent().toLowerCase() === word.toLowerCase() &&
            n.isAttached()
          ) {
            out = n;
            return;
          }
          if ($isElementNode(n)) {
            for (const child of n.getChildren()) walk(child);
          }
        };
        walk($getRoot());
        return out;
      });
    },
    [editor]
  );

  const runMarkPass = useCallback(() => {
    const spell = handleRef.current;
    if (!spell || editor.isComposing()) return;

    const plan = editor.getEditorState().read(() => {
      // The node(s) under the user's caret/selection can never be replaced:
      // destroying the anchored node's key makes the caret snap back mid-word.
      // For a collapsed caret inside a text node we instead *split it* behind
      // the caret so the completed words before it get flagged live, while the
      // caret's own node (and the word being typed) survives untouched.
      const selection = $getSelection();
      const protectedKeys = new Set<string>();
      let caretItem: { nodeKey: string; splitAt: number } | null = null;
      if ($isRangeSelection(selection)) {
        const anchor = selection.anchor.getNode();
        protectedKeys.add(anchor.getKey());
        if (selection.isCollapsed() && $isTextNode(anchor)) {
          const text = anchor.getTextContent();
          const caretOffset = selection.anchor.offset;
          let wordStart = 0;
          if (caretOffset > 0) {
            WORD_RE.lastIndex = 0;
            let m: RegExpExecArray | null;
            while ((m = WORD_RE.exec(text)) !== null) {
              if (m.index <= caretOffset) wordStart = m.index;
              else break;
            }
          }
          // Only worth splitting if the completed portion before the current
          // word would actually change (contains a flagged word). Otherwise
          // the anchored node is left alone and re-marked once focus moves.
          if (wordStart > 0 && caretOffset > wordStart) {
            const leftSegs = segmentText(text.slice(0, wordStart), (w) => spell.correct(w));
            const leftChanged = leftSegs.some(
              (s) => /[\p{L}\p{M}]/u.test(s.text) && s.misspelled
            );
            if (leftChanged) caretItem = { nodeKey: anchor.getKey(), splitAt: wordStart };
          }
        } else if (!selection.isCollapsed()) {
          protectedKeys.add(selection.focus.getNode().getKey());
        }
      }

      const list: MarkItem[] = [];
      const walk = (n: LexicalNode) => {
        const type = n.getType();
        if (type === 'code' || type === 'mention') return; // never spell-check code or @mentions
        if ($isTextNode(n)) {
          if (caretItem && n.getKey() === caretItem.nodeKey) {
            // Re-mark the anchored node if its text changed since last pass.
            // We can only do this safely with a splitAt (wordStart > 0).
            const lastText = processedTextsRef.current.get(n.getKey()) || '';
            if (lastText !== n.getTextContent() && caretItem.splitAt !== undefined && caretItem.splitAt > 0) {
              list.push({ node: n, splitAt: caretItem.splitAt });
              processedTextsRef.current.set(n.getKey(), n.getTextContent());
            }
            return;
          }
          if (protectedKeys.has(n.getKey())) return;
          const text = n.getTextContent();
          if (!/[\p{L}\p{M}]/u.test(text)) return;
          const segs = segmentText(text, (w) => spell.correct(w));
          const spellNode = $isSpellCheckNode(n);
          const changed = segs.some(
            (s) => /[\p{L}\p{M}]/u.test(s.text) && s.misspelled !== spellNode
          );
          if (changed) {
            list.push({ node: n, segs });
            processedTextsRef.current.set(n.getKey(), text);
          }
          return;
        }
        if ($isElementNode(n)) {
          for (const child of n.getChildren()) walk(child);
        }
      };
      walk($getRoot());
      return list;
    });

    if (plan.length === 0) {
      setDebug({ lastPass: { marked: 0 } });
      return;
    }
    let error: string | null = null;
    try {
      editor.update(() => {
        for (const item of plan) {
          if (!item.node.isAttached()) continue;
          if (item.splitAt !== undefined) {
            // `splitText` keeps `this` as the left part and transparently moves
            // the caret selection onto the new right (suffix) node, so rebuilding
            // only the left part never disturbs the caret.
            const [left] = item.node.splitText(item.splitAt);
            if (left && $isTextNode(left)) {
              const leftSegs = segmentText(left.getTextContent(), (w) => spell.correct(w));
              rebuildNode(left, leftSegs);
            }
            continue;
          }
          if (item.segs) rebuildNode(item.node, item.segs);
        }
      });
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error('Spell-check mark pass failed:', err);
    }
    setDebug({ lastPass: { marked: plan.length, error } });
  }, [editor, setDebug]);

  const scheduleMark = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => runMarkPass(), 150);
  }, [runMarkPass]);

  // Load the dictionary for the active locale, then run an initial pass. If the
// load fails (transient network hiccup, dictionary not yet published), retry a
// few times instead of giving up the whole session. State is exposed on
// `window.__spellDebug` so failures are diagnosable from the console.
const loadDictionary = useCallback(
  async (loc: ChatLocale) => {
    const h = await getSpellchecker(loc);
    if (!aliveRef.current) return;
    if (h) {
      triesRef.current = 0;
      handleRef.current = h;
      setHandle(h);
      setDebug({ locale: loc, ready: true, error: null });
      window.setTimeout(() => runMarkPass(), 60);
    } else {
      triesRef.current += 1;
      handleRef.current = null;
      setHandle(null);
      setDebug({
        locale: loc,
        ready: false,
        error: `dictionary load failed (attempt ${triesRef.current})`,
      });
      if (triesRef.current >= 10) return;
      retryTimerRef.current = window.setTimeout(() => loadDictionaryRef.current?.(loc), 2500);
    }
  },
  [runMarkPass, setDebug]
);

useEffect(() => {
    loadDictionaryRef.current = loadDictionary;
  });

  useEffect(() => {
    aliveRef.current = true;
    triesRef.current = 0;
    handleRef.current = null;
    if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    // Defer the state reset one tick so the fetch can claim the slot first on
    // a fast cache hit (avoids a transient flash of the loading state).
    const resetTimer = window.setTimeout(() => {
      if (aliveRef.current) setHandle(null);
    }, 0);
    window.setTimeout(() => loadDictionary(locale), 0);
    return () => {
      aliveRef.current = false;
      window.clearTimeout(resetTimer);
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    };
  }, [locale, loadDictionary]);

  // Debounced re-mark after every editor update (typing, paste, undo, reply…).
  useEffect(() => {
    const unregister = editor.registerUpdateListener(() => {
      scheduleMark();
    });
    return () => {
      unregister();
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [editor, scheduleMark]);

  // Highlight the open word and clear it on close.
  useEffect(() => {
    const el = popover?.element;
    if (el) el.classList.add('chat-spell-error-active');
    return () => {
      el?.classList.remove('chat-spell-error-active');
    };
  }, [popover]);

  // Click-to-open: a mouseup on a marked word opens the popover; a mouseup on
  // any other editor content closes it. Attached at `document` (with a
  // containment check) because the contenteditable root element does not exist
  // yet when this plugin first mounts — a root-scoped listener would silently
  // never bind.
  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => {
      const root = editor.getRootElement();
      const target = e.target as HTMLElement | null;
      if (!root || !target || typeof target.closest !== 'function') return;
      if (!root.contains(target)) return;

      const el = target.closest('.chat-spell-error') as HTMLElement | null;
      if (!el) {
        if (popoverRef.current) {
          setSuggestions(null);
          setPopoverBoth(null);
        }
        return;
      }
      const word = el.textContent || '';
      const spell = handleRef.current;
      setSuggestions(spell ? spell.suggest(word) : []);
      setPopoverBoth({ word, rect: el.getBoundingClientRect(), element: el });
    };

    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, [editor, setPopoverBoth]);

  const applySuggestion = useCallback(
    (suggestion: string) => {
      const word = popoverRef.current?.word ?? '';
      setPopoverBoth(null);
      editor.update(() => {
        const sel = $getSelection();
        let node: SpellCheckNode | null = null;
        if ($isRangeSelection(sel)) {
          const found = sel.getNodes().find((n): n is SpellCheckNode => $isSpellCheckNode(n));
          node = found ?? null;
        }
        if (!node) node = findSpellNodeByText(word);
        if (!node) return;
        node.spliceText(0, node.getTextContent().length, suggestion, true);
      });
      scheduleMark();
    },
    [editor, findSpellNodeByText, scheduleMark, setPopoverBoth]
  );

  const onIgnore = useCallback(() => {
    const word = popoverRef.current?.word ?? '';
    const spell = handleRef.current;
    setPopoverBoth(null);
    spell?.markIgnored(word);
    scheduleMark();
  }, [handleRef, scheduleMark, setPopoverBoth]);

  const onAddToDictionary = useCallback(() => {
    const word = popoverRef.current?.word ?? '';
    const spell = handleRef.current;
    setPopoverBoth(null);
    spell?.addToDictionary(word);
    scheduleMark();
  }, [handleRef, scheduleMark, setPopoverBoth]);

  let left = 12;
  let top = 12;
  let above = false;
  if (popover) {
    const guessH = Math.min(suggestions?.length ?? 3, 6) * 32 + 104;
    left = Math.max(8, Math.min(window.innerWidth, popover.rect.left + 8) - 248);
    above = popover.rect.bottom + guessH > window.innerHeight;
    top = above ? Math.max(8, popover.rect.top - guessH) : popover.rect.bottom + 6;
  }

  return (
    <>
      {popover && (
        <>
          <div
            className="fixed inset-0 z-[70]"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPopoverBoth(null);
            }}
          />
          <div
            className="fixed z-[71] w-60 rounded-xl border border-gray-200 bg-white p-1.5 text-sm shadow-xl dark:border-gray-700 dark:bg-gray-800"
            style={{ left, top }}
          >
            {suggestions === null ? (
              <div className="flex items-center justify-center gap-2 px-2 py-3 text-gray-500 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('loading')}
              </div>
            ) : suggestions.length === 0 ? (
              <p className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400">
                {t('spellNoSuggestions')}
              </p>
            ) : (
              suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className="block w-full truncate rounded-lg px-2 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {s}
                </button>
              ))
            )}
            <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
            <button
              type="button"
              onClick={onIgnore}
              className="block w-full rounded-lg px-2 py-1.5 text-left text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t('spellIgnore')}
            </button>
            <button
              type="button"
              onClick={onAddToDictionary}
              className="block w-full rounded-lg px-2 py-1.5 text-left text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t('spellAddToDictionary')}
            </button>
          </div>
        </>
      )}
    </>
  );
}
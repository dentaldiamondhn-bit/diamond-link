'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createTextNode, $getSelection, $isRangeSelection, $createRangeSelection, $setSelection, KEY_ARROW_DOWN_COMMAND, KEY_ARROW_UP_COMMAND, KEY_TAB_COMMAND, TextNode } from 'lexical';
import { useChatStore } from '@/chat/store/chatStore';
import { getUserDisplayName } from '@/chat/utils';
import { $createMentionNode } from '@/chat/mentionNode';
import type { ChatUser } from '@/types/chat';

/** Lightweight @mention: dropdown of users triggered by typing `@query` in groups. */
export default function MentionPlugin({ enabled = true }: { enabled?: boolean }) {
  const [editor] = useLexicalComposerContext();
  const { users, currentUserId } = useChatStore();
  const [query, setQuery] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const candidates = useMemo(() => {
    const q = (query || '').toLowerCase();
    return Object.values(users)
      .filter((u) => u.id !== currentUserId)
      .filter((u) => {
        if (!q) return true;
        return getUserDisplayName(u).toLowerCase().includes(q);
      });
  }, [users, query, currentUserId]);

  const candidatesRef = useRef<ChatUser[]>([]);
  useEffect(() => {
    candidatesRef.current = candidates;
  }, [candidates]);
  const activeIndexRef = useRef(0);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const commit = useCallback(
    (user: ChatUser) => {
      editor.update(() => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel) || !sel.isCollapsed()) return;
        const anchorNode = sel.anchor.getNode();
        if (anchorNode.__type !== 'text') return;
        const caret = sel.anchor.offset;
        const text = anchorNode.getTextContent();
        const at = text.slice(0, caret).lastIndexOf('@');
        if (at === -1) return;
        // Replace the typed `@query` with the mention + a trailing space so no
        // leftover `@` remains.
        const textNode = anchorNode as TextNode;
        const range = $createRangeSelection();
        range.anchor.set(textNode.getKey(), at, 'text');
        range.focus.set(textNode.getKey(), caret, 'text');
        $setSelection(range);
        range.insertNodes([$createMentionNode(getUserDisplayName(user), user.id), $createTextNode(' ')]);
      });
      setQuery(null);
      setAnchor(null);
      editor.focus();
    },
    [editor]
  );

  // Detect "@query" as the user types and reposition the dropdown.
  useEffect(() => {
    if (!enabled) return;
    return editor.registerUpdateListener(({ editorState }) => {
      let nextQuery: string | null = null;
      let nextAnchor: { top: number; left: number } | null = null;
      editorState.read(() => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel) || !sel.isCollapsed()) return;
        const anchorNode = sel.anchor.getNode();
        if (anchorNode.__type !== 'text') return;
        const text = anchorNode.getTextContent();
        const caret = sel.anchor.offset;
        const prefix = text.slice(0, caret);
        const at = prefix.lastIndexOf('@');
        if (at === -1 || /\S/.test(prefix.slice(0, at))) return;
        const q = prefix.slice(at + 1);
        if (q.length > 24 || q.includes('\n')) return;
        nextQuery = q;
        const topLevel = (anchorNode as TextNode).getTopLevelElementOrThrow();
        const key = topLevel.getKey();
        const dom = editor.getElementByKey(key);
        if (dom) {
          const rect = dom.getBoundingClientRect();
          const vw = window.innerWidth;
          const LEFT = Math.min(rect.left, vw - 270);
          // Worst-case dropdown footprint (max-h-56 = 224px + 8px padding).
          const DROPDOWN_H = 232;
          // Prefer opening below the caret line; flip above when it would clip off the bottom.
          if (rect.bottom + 4 + DROPDOWN_H <= window.innerHeight - 8) {
            nextAnchor = { top: rect.bottom + 4, left: LEFT };
          } else {
            nextAnchor = { top: Math.max(8, rect.top - DROPDOWN_H - 4), left: LEFT };
          }
        } else {
          const editable = document.querySelector('[data-chat-composer]') as HTMLElement | null;
          const rect = editable?.getBoundingClientRect();
          if (rect) nextAnchor = { top: rect.top - 8, left: rect.left + 8 };
        }
      });
      setQuery((prev) => (prev === nextQuery ? prev : nextQuery));
      if (nextQuery !== null) setAnchor(nextAnchor);
      else setAnchor(null);
    });
  }, [editor, enabled]);

  // Arrow/Tab navigation while the dropdown is open.
  useEffect(() => {
    if (!enabled || query === null || candidatesRef.current.length === 0) return;
    const onDown = (event: KeyboardEvent) => {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % candidatesRef.current.length);
      return true;
    };
    const onUp = (event: KeyboardEvent) => {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + candidatesRef.current.length) % candidatesRef.current.length);
      return true;
    };
    const onTab = (event: KeyboardEvent) => {
      event.preventDefault();
      const c = candidatesRef.current[activeIndexRef.current];
      if (c) commit(c);
      return true;
    };
    const unD = editor.registerCommand(KEY_ARROW_DOWN_COMMAND, onDown, 1);
    const unU = editor.registerCommand(KEY_ARROW_UP_COMMAND, onUp, 1);
    const unT = editor.registerCommand(KEY_TAB_COMMAND, onTab, 1);
    return () => {
      unD();
      unU();
      unT();
    };
  }, [editor, query, commit, enabled]);

  if (!enabled || query === null || candidates.length === 0) return null;

  return (
    <div
      data-mention-anchor
      className="z-50 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-800"
      style={anchor ? { position: 'fixed', top: anchor.top, left: anchor.left } : { position: 'fixed' }}
    >
      <div className="max-h-56 overflow-y-auto py-1">
        {candidates.slice(0, 20).map((u, i) => {
          const name = getUserDisplayName(u);
          return (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                commit(u);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left ${
                i === activeIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              {u.profile_image_url ? (
                <img src={u.profile_image_url} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-xs text-white">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="truncate">{name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

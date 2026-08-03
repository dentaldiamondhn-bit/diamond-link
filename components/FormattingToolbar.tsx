'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Smile, Bold, Italic, Code, List, Undo2, Redo2 } from 'lucide-react';
import { EMOJI_CATEGORIES } from '@/lib/emojis';

const MAX_HISTORY = 50;

interface FormattingToolbarProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

export function FormattingToolbar({ value, onChange, rows = 10 }: FormattingToolbarProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const historyValueRef = useRef(value);
  const applyingRef = useRef(false);

  const closeEmojiPicker = () => {
    setShowEmojiPicker(false);
    setPickerPos(null);
  };

  const openEmojiPicker = () => {
    if (showEmojiPicker) {
      closeEmojiPicker();
      return;
    }
    const btn = emojiButtonRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setPickerPos({ top: rect.bottom + 8, left: rect.left });
    } else {
      setPickerPos(null);
    }
    setShowEmojiPicker(true);
  };

  // Clamp the tray to the viewport so it is never cut off (flips upward if needed)
  useEffect(() => {
    if (!showEmojiPicker || !pickerPos) return;
    const el = pickerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    const left = Math.min(Math.max(margin, pickerPos.left), Math.max(margin, window.innerWidth - rect.width - margin));
    const btn = emojiButtonRef.current;
    const btnRect = btn?.getBoundingClientRect();
    let top = btnRect ? btnRect.bottom + margin : pickerPos.top;
    if (top + rect.height + margin > window.innerHeight) {
      top = btnRect ? btnRect.top - rect.height - margin : Math.max(margin, window.innerHeight - rect.height - margin);
    }
    top = Math.max(margin, top);
    if (top !== pickerPos.top || left !== pickerPos.left) {
      setPickerPos({ top, left });
    }
  }, [showEmojiPicker, pickerPos]);

  // Close on any scroll or resize so the tray never floats detached
  useEffect(() => {
    if (!showEmojiPicker) return;
    const close = () => closeEmojiPicker();
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [showEmojiPicker]);

  // Close on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        pickerRef.current?.contains(e.target as Node) ||
        emojiButtonRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      closeEmojiPicker();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [showEmojiPicker]);

  const emitChange = (next: string) => {
    applyingRef.current = true;
    onChange(next);
  };

  useEffect(() => {
    if (applyingRef.current) {
      applyingRef.current = false;
      historyValueRef.current = value;
      return;
    }
    if (value !== historyValueRef.current) {
      const snapshot = historyValueRef.current;
      setUndoStack(prev => [...prev, snapshot].slice(-MAX_HISTORY));
      setRedoStack([]);
      historyValueRef.current = value;
    }
  }, [value]);

  const handleChange = (next: string) => {
    if (next === historyValueRef.current) return;
    const snapshot = historyValueRef.current;
    setUndoStack(prev => [...prev, snapshot].slice(-MAX_HISTORY));
    setRedoStack([]);
    historyValueRef.current = next;
    emitChange(next);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    const snapshot = historyValueRef.current;
    setUndoStack(undoStack.slice(0, -1));
    setRedoStack(prevStack => [...prevStack, snapshot]);
    historyValueRef.current = prev;
    emitChange(prev);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const snapshot = historyValueRef.current;
    setRedoStack(redoStack.slice(0, -1));
    setUndoStack(prev => [...prev, snapshot].slice(-MAX_HISTORY));
    historyValueRef.current = next;
    emitChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      handleRedo();
    }
  };

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = value;
    const newValue = currentValue.slice(0, start) + text + currentValue.slice(end);

    handleChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const applyFormat = (prefix: string, suffix: string, formatType?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = value;
    const selectedText = currentValue.slice(start, end);

    if (selectedText) {
      let formattedText = selectedText;
      if (formatType === 'strikethrough') {
        formattedText = `~${selectedText}~`;
      } else {
        formattedText = prefix + selectedText + suffix;
      }
      const newValue = currentValue.slice(0, start) + formattedText + currentValue.slice(end);
      handleChange(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
      }, 0);
    }
  };

  return (
    <div className="mb-2">
      <div className="flex flex-wrap gap-1 mb-2">
        <button
          type="button"
          onClick={() => applyFormat('*', '*')}
          className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
          title="Negrita (*texto*)"
        >
          <Bold size={14} />
        </button>

        <button
          type="button"
          onClick={() => applyFormat('_', '_')}
          className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
          title="Cursiva (_texto_)"
        >
          <Italic size={14} />
        </button>

        <button
          type="button"
          onClick={() => applyFormat('', '', 'strikethrough')}
          className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
          title="Tachado (~texto~)"
        >
          ~~
        </button>

        <button
          type="button"
          onClick={() => applyFormat('`', '`')}
          className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
          title="Monoespaciado (`texto`)"
        >
          <Code size={14} />
        </button>

        <button
          type="button"
          onClick={() => insertAtCursor('\n• ')}
          className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
          title="Lista con viñetas"
        >
          <List size={14} />
        </button>

        <div className="h-5 w-px bg-gray-200 dark:bg-gray-600 mx-1 self-center" />

        <button
          type="button"
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Deshacer (Ctrl+Z)"
        >
          <Undo2 size={14} />
        </button>

        <button
          type="button"
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Rehacer (Ctrl+Y)"
        >
          <Redo2 size={14} />
        </button>

        <div className="h-5 w-px bg-gray-200 dark:bg-gray-600 mx-1 self-center" />

        <button
          ref={emojiButtonRef}
          type="button"
          onClick={openEmojiPicker}
          className={`p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0 ${showEmojiPicker ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
          title="Emojis"
        >
          <Smile size={14} />
        </button>
      </div>

      {showEmojiPicker &&
        pickerPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={pickerRef}
            className="fixed z-[60] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl w-[19.5rem]"
            style={{ top: pickerPos.top, left: pickerPos.left }}
          >
            {/* Category tabs */}
            <div className="flex gap-0.5 p-2 pb-0 overflow-x-auto">
              {EMOJI_CATEGORIES.map((cat, ci) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setActiveEmojiCategory(ci)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0 transition-colors ${
                    activeEmojiCategory === ci
                      ? 'bg-gray-100 dark:bg-gray-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                  title={cat.name}
                >
                  {cat.icon}
                </button>
              ))}
            </div>

            {/* Emoji grid */}
            <div className="max-h-56 overflow-y-auto p-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 px-1">
                {EMOJI_CATEGORIES[activeEmojiCategory].name}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {EMOJI_CATEGORIES[activeEmojiCategory].emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      insertAtCursor(emoji);
                      closeEmojiPicker();
                    }}
                    className="w-9 h-9 text-xl rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={rows}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none min-h-[120px]"
        placeholder="Escribe tu mensaje..."
      />
    </div>
  );
}

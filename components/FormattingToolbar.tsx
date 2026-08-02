'use client';

import { useState, useRef } from 'react';
import { Smile, Bold, Italic, Code, List } from 'lucide-react';

const EMOJIS = ['🦷', '😁', '💎', '✨', '📞', '📍', '💙', '😍', '😉', '🔥', '🎉', '👍', '❤️', '🌟', '💪'];

interface FormattingToolbarProps {
  value: string;
  onChange: (value: string) => void;
  onEmojiSelect: (emoji: string) => void;
}

export function FormattingToolbar({ value, onChange, onEmojiSelect }: FormattingToolbarProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = value;
    const newValue = currentValue.slice(0, start) + text + currentValue.slice(end);
    
    onChange(newValue);
    
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
      onChange(newValue);
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
          className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Negrita (*texto*)"
        >
          <Bold size={14} />
        </button>
        
        <button
          type="button"
          onClick={() => applyFormat('_', '_')}
          className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Cursiva (_texto_)"
        >
          <Italic size={14} />
        </button>

        <button
          type="button"
          onClick={() => applyFormat('', '', 'strikethrough')}
          className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Tachado (~texto~)"
        >
          ~~
        </button>
        
        <button
          type="button"
          onClick={() => applyFormat('`', '`')}
          className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Monoespaciado (`texto`)"
        >
          <Code size={14} />
        </button>
        
        <button
          type="button"
          onClick={() => insertAtCursor('\n• ')}
          className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Lista con viñetas"
        >
          <List size={14} />
        </button>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Emojis"
          >
            <Smile size={14} />
          </button>
          
          {showEmojiPicker && (
            <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-2 z-50">
              <div className="grid grid-cols-5 gap-1">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onEmojiSelect(emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="text-xl w-8 h-8 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
        placeholder="Escribe tu mensaje..."
      />
    </div>
  );
}
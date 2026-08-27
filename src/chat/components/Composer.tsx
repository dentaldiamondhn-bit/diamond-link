'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useChatStore } from '@/chat/store/chatStore';
import { Mic, Paperclip, Send, Plus, Bold, Italic, Underline, ListOrdered, List } from 'lucide-react';
import { createEditor, EditorState, COMMAND_PRIORITY_EDITOR, $getRoot, ParagraphNode, TextNode } from 'lexical';
import { HashtagPlugin } from '@lexical/react/LexicalHashtagPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

interface ComposerProps {
  onSend: (content: string, attachments: any[]) => Promise<void>;
  onVoiceToggle: () => Promise<void>;
  onTyping?: () => void;
  isRecording: boolean;
  audioUrl: string | null;
  duration: number;
}

export const Composer = ({
  onSend,
  onVoiceToggle,
  onTyping,
  isRecording,
  audioUrl,
  duration,
}: ComposerProps) => {
  const [showAttachments, setShowAttachments] = useState(false);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const editorRef = useRef<ReturnType<typeof createEditor> | null>(null);

  // Initialize editor
  useEffect(() => {
    const editor = createEditor({
      namespace: 'ChatComposer',
      theme: {
        paragraph: 'chat-paragraph',
        heading: {
          h1: 'chat-heading h1',
          h2: 'chat-heading h2',
          h3: 'chat-heading h3',
          h4: 'chat-heading h4',
          h5: 'chat-heading h5',
          h6: 'chat-heading h6',
        },
        list: 'chat-list',
        listItem: 'chat-list-item',
        quote: 'chat-quote',
        code: 'chat-code',
        codeHighlight: 'chat-code-highlight',
        hashtag: 'chat-hashtag',
        link: 'chat-link',
        text: {
          bold: 'chat-bold',
          italic: 'chat-italic',
          underline: 'chat-underline',
          strikethrough: 'chat-strikethrough',
          code: 'chat-code-text',
        },
      },
      onError: (error) => {
        console.error('Lexical Error: ', error);
      },
      nodes: [ParagraphNode, TextNode],
      editable: true,
    });

    editorRef.current = editor;

    // Set up editor state listener
    const unsubscribe = editor.registerUpdateListener(({ editorState }) => {
      setEditorState(editorState);
    });

    // Return cleanup function
    return () => {
      unsubscribe();
      editorRef.current = null;
    };
  }, []);

  const handleSend = async () => {
    if (editorRef.current) {
      try {
        const text = editorRef.current.getEditorState().read(() => $getRoot().getTextContent());
        
        if (text.trim()) {
          await onSend(text, []); // For now, no attachments
          
          // Clear editor after sending
          editorRef.current.dispatchCommand(COMMAND_PRIORITY_EDITOR, {
            type: 'INSERT_PARAGRAPH',
          });
        }
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Simple toolbar buttons - in a real implementation, these would toggle formatting
  const toolbarButtons = React.useMemo(() => [
    {
      icon: Bold,
      format: 'bold',
      title: 'Bold',
      command: 'TOGGLE_BOLD',
    },
    {
      icon: Italic,
      format: 'italic',
      title: 'Italic',
      command: 'TOGGLE_ITALIC',
    },
    {
      icon: Underline,
      format: 'underline',
      title: 'Underline',
      command: 'TOGGLE_UNDERLINE',
    },
    {
      icon: ListOrdered,
      format: 'ordered-list',
      title: 'Ordered List',
      command: 'TOGGLE_ORDERED_LIST',
    },
    {
      icon: List,
      format: 'bulleted-list',
      title: 'Bulleted List',
      command: 'TOGGLE_BULLET_LIST',
    },
  ], []);

  // Check if editor has content
  const hasContent = React.useMemo(() => {
    if (!editorState) return false;
    const text = editorState.read(() => $getRoot().getTextContent());
    return text.trim().length > 0;
  }, [editorState]);

  return (
    <>
      <div className="composer bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-end space-y-3 sm:space-y-0 sm:space-x-4 p-3">
          {/* Toolbar and Editor container */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {toolbarButtons.map(({ icon: Icon, title, command }) => (
                <button
                  key={title}
                  onClick={() => {
                    editorRef.current?.dispatchCommand(COMMAND_PRIORITY_EDITOR, {
                      type: command as any,
                    });
                  }}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  title={title}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
              
              {/* Voice button */}
              <button
                onClick={onVoiceToggle}
                className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  isRecording ? 'bg-red-500 text-white' : ''
                }`}
              >
                <Mic className={`h-3.5 w-3.5 ${isRecording ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
              </button>
            </div>

            <div className="flex-1 min-h-[60px] relative">
              {editorState ? (
                <LexicalErrorBoundary
                  onError={(error) => {
                    console.error('Lexical Error: ', error);
                  }}
                  fallback={<div className="p-2 text-red-500 text-xs">Editor error occurred</div>}
                >
                  <div className="lexical-editor w-full h-full">
                    <RichTextPlugin
                      placeholder={<div className="italic text-gray-400 dark:text-gray-500 p-2 text-xs">Type a message...</div>}
                      editorState={editorState}
                      onEditorStateChange={setEditorState}
                      contentEditable={<div
                        className="lexical-editor w-full h-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        spellCheck={false}
                      />}
                      ErrorBoundary={({ children }) => (
                        <LexicalErrorBoundary
                          onError={(error) => {
                            console.error('Lexical Decorator Error: ', error);
                          }}
                          fallback={<div className="p-1 text-red-500">Decorator error</div>}
                        >
                          {children}
                        </LexicalErrorBoundary>
                      )}
                    />
                    <HistoryPlugin />
                    <OnChangePlugin onChange={(editorState) => {
                      // Handle onTyping callback
                      onTyping?.();
                      // Update editor state
                      setEditorState(editorState);
                    }} />
                    <HashtagPlugin />
                  </div>
                </LexicalErrorBoundary>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-xs">
                  Loading editor...
                </div>
              )}
            </div>
          </div>

          {/* Send and Attachments buttons */}
          <div className="flex items-center space-x-2">
            {/* Attachments button */}
            <button
              onClick={() => setShowAttachments(!showAttachments)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>
            
            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!hasContent}
              className={`px-3 py-1.5 rounded bg-blue-500 text-white hover:bg-blue-600 ${
                !hasContent ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Attachments menu (simple) */}
      {showAttachments && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
          <div className="py-2">
            <button
              onClick={() => {
                setShowAttachments(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Paperclip className="mr-2 h-3.5 w-3.5" /> File
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Composer;
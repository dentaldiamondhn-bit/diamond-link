'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  Camera,
  CornerDownRight,
  FileText,
  Image as ImageIcon,
  Italic,
  Mic,
  Paperclip,
  Send,
  Smile,
  Underline,
  X,
} from 'lucide-react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import {
  CLEAR_EDITOR_COMMAND,
  COMMAND_PRIORITY_LOW,
  EditorState,
  FORMAT_TEXT_COMMAND,
  KEY_ENTER_COMMAND,
  LexicalEditor,
  $createTextNode,
  $getRoot,
} from 'lexical';
import { HeadingNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { $generateHtmlFromNodes } from '@lexical/html';
import { ChatRepository } from '@/chat/repository';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { htmlToText } from '@/chat/utils';
import EmojiPicker from './EmojiPicker';
import AttachmentTray from './AttachmentTray';
import type { PendingAttachment } from './AttachmentTray';
import type { ChatMessage, FileAttachmentData } from '@/types/chat';

interface ComposerProps {
  conversationId: string | null;
  onSend: (
    content: string,
    attachments: FileAttachmentData[],
    replyToId?: string
  ) => Promise<void>;
  onTyping: () => void;
  onVoiceToggle: () => Promise<void>;
  isRecording: boolean;
  duration: number;
  replyTo?: ChatMessage | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  className?: string;
}

const EDITOR_THEME = {
  paragraph: 'chat-paragraph',
  text: {
    bold: 'chat-bold font-bold',
    italic: 'chat-italic italic',
    underline: 'chat-underline underline',
  },
  list: {
    ul: 'chat-list-ul list-disc pl-5',
    ol: 'chat-list-ol list-decimal pl-5',
  },
};


interface LexicalToolbarProps {
  textContent: string;
  hasAttachments: boolean;
  onSend: () => void;
  onFilesSelected: (files: File[]) => void;
  onVoiceToggle: () => Promise<void>;
  isRecording: boolean;
  duration: number;
  disabled?: boolean;
}

const LexicalToolbar = ({
  textContent,
  hasAttachments,
  onSend,
  onFilesSelected,
  onVoiceToggle,
  isRecording,
  duration,
  disabled,
}: LexicalToolbarProps) => {
  const { t } = useTranslations();
  const [editor] = useLexicalComposerContext();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const formatButton = (
    title: string,
    onClick: () => void,
    icon: React.ReactNode
  ) => (
    <button
      key={title}
      type="button"
      title={title}
      onClick={onClick}
      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
    >
      {icon}
    </button>
  );

  const openCamera = () => {
    setShowAttachMenu(false);
    cameraInputRef.current?.click();
  };
  const openMedia = () => {
    setShowAttachMenu(false);
    mediaInputRef.current?.click();
  };
  const openDocs = () => {
    setShowAttachMenu(false);
    docInputRef.current?.click();
  };

  return (
    <>
      {isRecording && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-red-500">{Math.ceil(duration)}s</span>
        </div>
      )}

      <div className="flex items-center gap-1 flex-wrap">
        {formatButton('Bold', () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold'), <Bold className="h-4 w-4" />)}
        {formatButton('Italic', () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic'), <Italic className="h-4 w-4" />)}
        {formatButton('Underline', () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline'), <Underline className="h-4 w-4" />)}

        <span className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />

        <div className="relative">
          <button
            type="button"
            onClick={() => (disabled ? undefined : setShowAttachMenu((v) => !v))}
            disabled={disabled}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 ${
              showAttachMenu
                ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                : 'text-gray-600 dark:text-gray-300'
            }`}
            title={t('fileMessage')}
          >
            <Paperclip className="h-4 w-4" />
          </button>
          {showAttachMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowAttachMenu(false)} />
              <div className="absolute bottom-full left-0 z-40 mb-2 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl">
                <button
                  type="button"
                  onClick={openCamera}
                  className="flex w-56 items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Camera className="h-4 w-4 text-teal-500" />
                  {t('attachCamera')}
                </button>
                <button
                  type="button"
                  onClick={openMedia}
                  className="flex w-56 items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ImageIcon className="h-4 w-4 text-teal-500" />
                  {t('attachPhotosVideos')}
                </button>
                <button
                  type="button"
                  onClick={openDocs}
                  className="flex w-56 items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FileText className="h-4 w-4 text-teal-500" />
                  {t('attachDocument')}
                </button>
              </div>
            </>
          )}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) onFilesSelected(files);
              e.target.value = '';
            }}
          />
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) onFilesSelected(files);
              e.target.value = '';
            }}
          />
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.rtf,.zip,application/*,text/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) onFilesSelected(files);
              e.target.value = '';
            }}
          />
        </div>

        <button
          type="button"
          onClick={onVoiceToggle}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 ${
            isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'text-gray-600 dark:text-gray-300'
          }`}
          title={t('voiceMessage')}
        >
          <Mic className="h-4 w-4" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
              showEmoji
                ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                : 'text-gray-600 dark:text-gray-300'
            }`}
            title="Emoji"
          >
            <Smile className="h-4 w-4" />
          </button>
          {showEmoji && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowEmoji(false)} />
              <div className="absolute bottom-full left-0 z-40 mb-2 w-80 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 shadow-xl">
                <EmojiPicker
                  className="h-64"
                  onSelect={(emoji) => {
                    editor.update(() => {
                      $getRoot().selectEnd().insertNodes([$createTextNode(emoji)]);
                    });
                    editor.focus();
                    setShowEmoji(false);
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onSend}
        disabled={disabled || (!textContent.trim() && !hasAttachments)}
        className="flex-shrink-0 px-3 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
        title={t('send')}
      >
        <Send className="h-4 w-4" />
      </button>
    </>
  );
};

const EnterToSendPlugin = ({ onSend }: { onSend: () => void }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event: KeyboardEvent) => {
        if (event && !event.shiftKey) {
          event.preventDefault();
          onSend();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, onSend]);

  return null;
};

export const Composer = ({
  conversationId,
  onSend,
  onTyping,
  onVoiceToggle,
  isRecording,
  duration,
  replyTo,
  onCancelReply,
  disabled,
  className = '',
}: ComposerProps) => {
  const { t } = useTranslations();
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [textContent, setTextContent] = useState('');
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const textRef = useRef('');
  const htmlRef = useRef('');
  const editorRef = useRef<LexicalEditor | null>(null);
  const pendingRef = useRef<PendingAttachment[]>([]);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  // Revoke object URLs on unmount to avoid leaks.
  useEffect(() => {
    return () => {
      pendingRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  // Clear pending attachments + editor when switching conversations.
  useEffect(() => {
    setPending((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
    setActiveIndex(0);
  }, [conversationId]);

  const handleChange = useCallback(
    (editorState: EditorState, editor: LexicalEditor) => {
      editorRef.current = editor;
      const text = editorState.read(() => $getRoot().getTextContent());
      textRef.current = text;
      htmlRef.current = editorState.read(() => $generateHtmlFromNodes(editor, null));
      setTextContent(text);
      if (text.trim()) onTyping();
    },
    [onTyping]
  );

  // Stage selected files into the storage overlay (no upload yet).
  const handleFiles = useCallback((files: File[]) => {
    if (!files.length) return;
    const created = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      type: file.type,
      size: file.size,
      caption: '',
    }));
    setPending((prev) => [...prev, ...created]);
    setActiveIndex((current) => current + created.length);
  }, []);

  const updateCaption = useCallback((index: number, caption: string) => {
    setPending((prev) =>
      prev.map((att, i) => (i === index ? { ...att, caption } : att))
    );
  }, []);

  const removePending = useCallback(
    (index: number) => {
      const target = pending[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      setPending((prev) => prev.filter((_, i) => i !== index));
      setActiveIndex((current) => Math.max(0, Math.min(current, pending.length - 2)));
    },
    [pending]
  );

  const clearEditor = useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      editor.dispatchCommand(CLEAR_EDITOR_COMMAND);
      editor.update(() => {
        const root = $getRoot();
        if (root.getTextContent()) root.clear();
      });
    }
    textRef.current = '';
    htmlRef.current = '';
    setTextContent('');
    setPending((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
    setActiveIndex(0);
  }, []);

  const send = useCallback(async () => {
    if (disabled || sending || !conversationId) return;
    const content = textRef.current.trim();
    const htmlContent = htmlRef.current.trim() || content;
    const staged = pending;
    const replyId = replyTo?.id;
    if (!content && staged.length === 0) return;
    setSending(true);
    try {
      // Text-only message when no attachment is staged.
      if (staged.length === 0) {
        if (content) {
          clearEditor();
          await onSend(htmlContent, [], replyId);
        }
        return;
      }
      // Group staged attachments by their (per-item) caption so each caption
      // becomes one message. Uploads happen here, before the message sends.
      const groups = new Map<string, PendingAttachment[]>();
      for (const att of staged) {
        const key = att.caption.trim();
        const list = groups.get(key) ?? [];
        list.push(att);
        groups.set(key, list);
      }
      for (const [caption, atts] of groups) {
        const uploaded: FileAttachmentData[] = [];
        for (const att of atts) {
          try {
            const result = await ChatRepository.uploadFile(att.file, conversationId);
            uploaded.push({
              file_name: result.fileName,
              file_type: result.fileType,
              file_size: result.fileSize,
              file_url: result.url,
            });
          } catch (err) {
            console.error('Failed to upload attachment:', err);
          }
        }
        if (uploaded.length) await onSend(caption, uploaded, replyId);
      }
      clearEditor();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  }, [disabled, sending, conversationId, pending, onSend, replyTo, clearEditor]);

  if (!conversationId) return null;

  return (
    <div className={`bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 ${className}`}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(Array.from(e.dataTransfer.files || []));
        }}
        className={`p-3 ${dragOver ? 'ring-2 ring-blue-400 rounded-lg' : ''}`}
      >
        <AttachmentTray
          attachments={pending}
          activeIndex={activeIndex}
          onChangeIndex={setActiveIndex}
          onRemove={removePending}
          onCaptionChange={updateCaption}
          onAddFiles={handleFiles}
          onSend={send}
          onClose={clearEditor}
          sending={sending}
        />
        <LexicalComposer
          initialConfig={{
            namespace: 'ChatComposer',
            theme: EDITOR_THEME,
            nodes: [HeadingNode, ListNode, ListItemNode],
            onError: (error) => console.error('Lexical Error:', error),
          }}
        >
          <div className="relative">
            <RichTextPlugin
              contentEditable={
                <ContentEditable className="min-h-[44px] px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              }
              placeholder={
                <div className="absolute top-2 left-3 pointer-events-none italic text-gray-400 dark:text-gray-500 text-sm">
                  {t('typeMessage')}
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
          {replyTo && (
            <div className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-sm">
              <CornerDownRight className="h-3.5 w-3.5 flex-shrink-0 text-blue-500 dark:text-blue-400" />
              <span className="flex-1 min-w-0 truncate text-gray-700 dark:text-gray-200">
                <span className="text-xs font-medium text-blue-500 dark:text-blue-400">
                  {t('replyingTo')}
                </span>{' '}
                {htmlToText(replyTo.content || '') || t('fileMessage')}
              </span>
              <button
                type="button"
                onClick={onCancelReply}
                className="p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                title={t('cancel')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <HistoryPlugin />
          <OnChangePlugin onChange={handleChange} />
          <EnterToSendPlugin onSend={send} />
          <div className="flex items-center justify-between mt-2 gap-3">
            <LexicalToolbar
              textContent={textContent}
              hasAttachments={pending.length > 0}
              onSend={send}
              onFilesSelected={handleFiles}
              onVoiceToggle={onVoiceToggle}
              isRecording={isRecording}
              duration={duration}
              disabled={disabled || sending}
            />
          </div>
        </LexicalComposer>
      </div>
    </div>
  );
};

export default Composer;
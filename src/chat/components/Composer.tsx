'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  Camera,
  Code2,
  CornerDownRight,
  FileText,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Mic,
  Paperclip,
  Pause,
  Play,
  Send,
  Smile,
  Square,
  Trash2,
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
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import { HeadingNode } from '@lexical/rich-text';
import { ListNode, ListItemNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { CodeNode, $createCodeNode } from '@lexical/code-core';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { htmlToText } from '@/chat/utils';
import { MentionNode } from '@/chat/mentionNode';
import MentionPlugin from './MentionPlugin';
import EmojiPicker from './EmojiPicker';
import AttachmentTray from './AttachmentTray';
import ColorButtons from './ColorButtons';
import { useChatStore } from '@/chat/store/chatStore';
import { ChatConversationType } from '@/types/chat';
import type { PendingAttachment } from './AttachmentTray';
import type { ChatMessage } from '@/types/chat';

// Remove whitespace that sits before the first text and after the last text of
// the message, so stray leading/trailing spaces never get stored or rendered in
// a bubble (internal spacing is preserved). The root is edited in place before
// HTML is generated for the outgoing message. getAllTextNodes returns the actual
// TextNode instances in document order, so no manual tree traversal is needed.
function trimRootWhitespace() {
  const nodes = $getRoot().getAllTextNodes();
  if (nodes.length === 0) return;
  let i = 0;
  while (i < nodes.length) {
    const t = nodes[i].getTextContent();
    const trimmed = t.replace(/^\s+/, '');
    if (trimmed === t) break;
    if (trimmed === '') nodes[i].remove();
    else {
      nodes[i].setTextContent(trimmed);
      break;
    }
    i++;
  }
  let j = nodes.length - 1;
  while (j >= 0) {
    const t = nodes[j].getTextContent();
    const trimmed = t.replace(/\s+$/, '');
    if (trimmed === t) break;
    if (trimmed === '') nodes[j].remove();
    else {
      nodes[j].setTextContent(trimmed);
      break;
    }
    j--;
  }
}

interface ComposerProps {
  conversationId: string | null;
  onSend: (
    content: string,
    items: PendingAttachment[],
    replyToId?: string
  ) => Promise<void>;
  onTyping: () => void;
  onVoiceStart: () => Promise<void>;
  onVoiceStop: () => Promise<void>;
  onVoicePauseToggle: () => void;
  onVoiceCancel: () => void;
  onVoiceSend: () => Promise<void>;
  onVoiceDiscard: () => void;
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  hasPendingVoice: boolean;
  voiceDuration: number;
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
  onVoiceStart: () => Promise<void>;
  onVoiceStop: () => Promise<void>;
  onVoicePauseToggle: () => void;
  onVoiceCancel: () => void;
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  hasPendingVoice: boolean;
  disabled?: boolean;
}

const LexicalToolbar = ({
  textContent,
  hasAttachments,
  onSend,
  onFilesSelected,
  onVoiceStart,
  onVoiceStop,
  onVoicePauseToggle,
  onVoiceCancel,
  isRecording,
  isPaused,
  duration,
  hasPendingVoice,
  disabled,
}: LexicalToolbarProps) => {
  const { t } = useTranslations();
  const [editor] = useLexicalComposerContext();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const formatTime = (s: number) => {
    const total = Math.max(0, Math.floor(s));
    const mm = Math.floor(total / 60)
      .toString()
      .padStart(2, '0');
    const ss = (total % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

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
      {isRecording ? (
        <div className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2 py-1 dark:bg-red-900/20">
          {isPaused ? (
            <Pause className="h-3 w-3 flex-shrink-0 text-red-500" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          )}
          <span className="w-12 text-sm font-medium text-red-500 tabular-nums">
            {formatTime(duration)}
          </span>
          <button
            type="button"
            onClick={onVoicePauseToggle}
            title={isPaused ? t('resumeRecording') : t('pauseRecording')}
            className="p-1 rounded text-red-500 hover:bg-red-100 dark:hover:bg-black/20"
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onVoiceStop}
            title={t('stopRecording')}
            className="p-1 rounded text-red-500 hover:bg-red-100 dark:hover:bg-black/20"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
          <button
            type="button"
            onClick={onVoiceCancel}
            title={t('cancelRecording')}
            className="p-1 rounded text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-black/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-1 flex-wrap">
        {formatButton('Bold', () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold'), <Bold className="h-4 w-4" />)}
        {formatButton('Italic', () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic'), <Italic className="h-4 w-4" />)}
        {formatButton('Underline', () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline'), <Underline className="h-4 w-4" />)}
        <ColorButtons light />

        <span className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />

        {formatButton('List', () => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined), <List className="h-4 w-4" />)}
        {formatButton('Ordered List', () => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined), <ListOrdered className="h-4 w-4" />)}
        <button
          type="button"
          title="Code"
          onClick={() => {
            editor.update(() => {
              const sel = $getSelection();
              if (!$isRangeSelection(sel)) return;
              const node = sel.anchor.getNode();
              const parent = node.getParent();
              const inCode = parent instanceof CodeNode;
              if (inCode) {
                const root = $getRoot();
                root.append($createTextNode('\n'));
              } else {
                const code = $createCodeNode();
                const text = $createTextNode(sel.getTextContent());
                code.append(text);
                sel.insertNodes([code]);
              }
            });
            editor.focus();
          }}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
        >
          <Code2 className="h-4 w-4" />
        </button>

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

        {!isRecording && !hasPendingVoice && (
          <button
            type="button"
            onClick={onVoiceStart}
            disabled={disabled}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 ${
              isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'text-gray-600 dark:text-gray-300'
            }`}
            title={t('voiceMessage')}
          >
            <Mic className="h-4 w-4" />
          </button>
        )}

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

/** Restores a saved HTML draft into the editor once it mounts (or the target
 *  conversation changes), then clears itself so typing takes over. */
const DraftLoader = ({
  draftKey,
  onLoaded,
}: {
  draftKey: string | null;
  onLoaded?: () => void;
}) => {
  const [editor] = useLexicalComposerContext();
  const loadedKey = useRef<string | null>(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    if (!draftKey || loadedKey.current === draftKey) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(draftKey);
    } catch {
      /* ignore */
    }
    if (saved) {
      editor.update(() => {
        const doc = new DOMParser().parseFromString(saved, 'text/html');
        const nodes = $generateNodesFromDOM(editor, doc);
        const root = $getRoot();
        root.clear();
        for (const node of nodes) root.append(node);
      });
    }
    loadedKey.current = draftKey;
    onLoadedRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  return null;
};

export const Composer = ({
  conversationId,
  onSend,
  onTyping,
  onVoiceStart,
  onVoiceStop,
  onVoicePauseToggle,
  onVoiceCancel,
  onVoiceSend,
  onVoiceDiscard,
  isRecording,
  isPaused,
  duration,
  hasPendingVoice,
  voiceDuration,
  replyTo,
  onCancelReply,
  disabled,
  className = '',
}: ComposerProps) => {
  const { t } = useTranslations();
  // @mentions are only offered inside group conversations, not 1:1 chats.
  const mentionEnabled = useChatStore(
    (s) =>
      (s.conversations.find((c) => c.id === conversationId)?.type ?? null) ===
      ChatConversationType.GROUP
  );
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [textContent, setTextContent] = useState('');
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const textRef = useRef('');
  const htmlRef = useRef('');
  const editorRef = useRef<LexicalEditor | null>(null);
  const pendingRef = useRef<PendingAttachment[]>([]);
  const draftKey = conversationId ? `chat-draft:${conversationId}` : null;
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

  const formatTime = (s: number) => {
    const total = Math.max(0, Math.floor(s));
    const mm = Math.floor(total / 60)
      .toString()
      .padStart(2, '0');
    const ss = (total % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleChange = useCallback(
    (editorState: EditorState, editor: LexicalEditor) => {
      editorRef.current = editor;
      const text = editorState.read(() => $getRoot().getTextContent());
      textRef.current = text;
      const html = editorState.read(() => $generateHtmlFromNodes(editor, null));
      htmlRef.current = html;
      setTextContent(text);
      if (draftKey) {
        try {
          localStorage.setItem(draftKey, html);
        } catch {
          /* private mode etc. */
        }
      }
      if (text.trim()) onTyping();
    },
    [onTyping, draftKey]
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

  const clearEditor = useCallback((opts: { skipRevoke?: boolean } = {}) => {
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
      if (!opts.skipRevoke) prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
    setActiveIndex(0);
  }, []);

  const send = useCallback(async () => {
    if (disabled || sending || !conversationId) return;
    const content = textRef.current.trim();
    const staged = pending;
    const replyId = replyTo?.id;
    if (!content && staged.length === 0) return;
    try {
      // Text-only message when no attachment is staged.
      if (staged.length === 0) {
        if (content) {
          // Trim leading/trailing whitespace at the editor level and regenerate
          // the HTML so stray spaces (e.g. before/after the text) are not stored
          // or rendered in the bubble. content was already trimmed above.
          let htmlContent = content;
          if (editorRef.current) {
            editorRef.current.update(() => trimRootWhitespace());
            htmlContent = editorRef.current
              .getEditorState()
              .read(() => $generateHtmlFromNodes(editorRef.current!, null).trim()) || content;
          }
          clearEditor();
          await onSend(htmlContent, [], replyId);
          if (draftKey) {
            try {
              localStorage.removeItem(draftKey);
            } catch {
              /* ignore */
            }
          }
        }
        return;
      }
      // Group staged attachments by their (per-item) caption so each caption
      // becomes one message. The upload + optimistic bubble now happen in the
      // parent (ChatPane), so the tray closes INSTANTLY and the bubble pops
      // into the thread with a live progress %. Preview URLs must NOT be
      // revoked here — the optimistic bubble still points at them; ChatPane
      // releases them once the message lands or fails.
      const groups = new Map<string, PendingAttachment[]>();
      for (const att of staged) {
        const key = att.caption.trim();
        const list = groups.get(key) ?? [];
        list.push(att);
        groups.set(key, list);
      }
      setSending(true);
      clearEditor({ skipRevoke: true });
      for (const [caption, atts] of groups) {
        void onSend(caption, atts, replyId);
      }
      if (draftKey) {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  }, [disabled, sending, conversationId, pending, onSend, replyTo, clearEditor, draftKey]);

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
          onReplaceAttachment={(index, updated) => {
            setPending((prev) => {
              const target = prev[index];
              if (target) URL.revokeObjectURL(target.previewUrl);
              return prev.map((att, i) => (i === index ? updated : att));
            });
          }}
        />
        {!isRecording && hasPendingVoice && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-blue-50 px-3 py-2.5 dark:bg-blue-900/30">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                <Mic className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                {t('voiceMessage')}
              </span>
              <span className="text-sm text-gray-500 tabular-nums dark:text-gray-300">
                {formatTime(voiceDuration)}
              </span>
              <button
                type="button"
                onClick={onVoiceDiscard}
                title={t('cancelRecording')}
                className="ml-1 p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-black/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={onVoiceSend}
              title={t('send')}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
            >
              <Send className="h-4 w-4" />
              {t('send')}
            </button>
          </div>
        )}
        <LexicalComposer
          initialConfig={{
            namespace: 'ChatComposer',
            theme: EDITOR_THEME,
            nodes: [HeadingNode, ListNode, ListItemNode, CodeNode, MentionNode],
            onError: (error) => console.error('Lexical Error:', error),
          }}
        >
          <div className="relative">
            <RichTextPlugin
              contentEditable={
                <ContentEditable className="min-h-[44px] px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" data-chat-composer />
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
              {(() => {
                const thumb = (replyTo.attachments || []).find((a) =>
                  a.file_type.startsWith('image/')
                );
                return thumb ? (
                  <img
                    src={thumb.file_url}
                    alt=""
                    className="h-8 w-8 flex-shrink-0 rounded object-cover"
                  />
                ) : null;
              })()}
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
          <ListPlugin />
          <OnChangePlugin onChange={handleChange} />
          <EnterToSendPlugin onSend={send} />
          <MentionPlugin enabled={mentionEnabled} />
          <DraftLoader draftKey={draftKey} />
          <div className="flex items-center justify-between mt-2 gap-3">
            <LexicalToolbar
              textContent={textContent}
              hasAttachments={pending.length > 0}
              onSend={send}
              onFilesSelected={handleFiles}
              onVoiceStart={onVoiceStart}
              onVoiceStop={onVoiceStop}
              onVoicePauseToggle={onVoicePauseToggle}
              onVoiceCancel={onVoiceCancel}
              isRecording={isRecording}
              isPaused={isPaused}
              duration={duration}
              hasPendingVoice={hasPendingVoice}
              disabled={disabled || sending}
            />
          </div>
        </LexicalComposer>
      </div>
    </div>
  );
};

export default Composer;
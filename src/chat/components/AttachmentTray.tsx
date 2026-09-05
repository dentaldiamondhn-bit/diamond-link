'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Camera,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Italic,
  Paperclip,
  Pencil,
  Plus,
  Send,
  Smile,
  Underline,
  X,
} from 'lucide-react';
import ChatImageEditor from './ChatImageEditor';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import {
  FORMAT_TEXT_COMMAND,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
} from 'lexical';
import {
  $generateHtmlFromNodes,
  $generateNodesFromDOM,
} from '@lexical/html';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { formatFileSize, getFileKindMeta, isHtmlContent, purifyHtml } from '@/chat/utils';
import EmojiPicker from './EmojiPicker';
import ColorButtons from './ColorButtons';

/** A file staged in the composer (not yet uploaded). `caption` is per-item. */
export interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  type: string;
  size: number;
  caption: string;
}

interface AttachmentTrayProps {
  attachments: PendingAttachment[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  onRemove: (index: number) => void;
  onCaptionChange: (index: number, caption: string) => void;
  onAddFiles: (files: File[]) => void;
  onSend: () => void;
  onClose: () => void;
  sending: boolean;
  onReplaceAttachment: (index: number, attachment: PendingAttachment) => void;
}

const CAPTION_THEME = {
  paragraph: 'chat-paragraph',
  text: {
    bold: 'chat-bold font-bold',
    italic: 'chat-italic italic',
    underline: 'chat-underline underline',
  },
};

/** Inserts the current item's caption once on mount (editor is remounted per item). */
const SetCaptionTextPlugin = ({ text }: { text: string }) => {
  const [editor] = useLexicalComposerContext();
  const initialRef = useRef(text);
  useEffect(() => {
    const initial = initialRef.current;
    if (!initial) return;
    editor.update(() => {
      const root = $getRoot();
      if (root.getTextContent()) return;
      if (isHtmlContent(initial)) {
        const dom = new DOMParser().parseFromString(purifyHtml(initial), 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        root.append(...nodes);
      } else {
        const p = $createParagraphNode();
        p.append($createTextNode(initial));
        root.append(p);
      }
    });
  }, [editor]);
  return null;
};

/** Toolbar mirroring the regular message composer, scoped to the caption. */
const CaptionToolbar = ({ onAddFiles }: { onAddFiles: (files: File[]) => void }) => {
  const { t } = useTranslations();
  const [editor] = useLexicalComposerContext();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const openCamera = () => {
    setShowAttach(false);
    cameraInputRef.current?.click();
  };
  const openMedia = () => {
    setShowAttach(false);
    mediaInputRef.current?.click();
  };
  const openDocs = () => {
    setShowAttach(false);
    docInputRef.current?.click();
  };
  const format = (type: 'bold' | 'italic' | 'underline') => () =>
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, type);

  const iconBtn = (
    title: string,
    onClick: () => void,
    icon: React.ReactNode
  ) => (
    <button
      key={title}
      type="button"
      title={title}
      onClick={onClick}
      className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
    >
      {icon}
    </button>
  );

  return (
    <>
      <div className="flex items-center gap-0.5 px-1 pb-1">
        {iconBtn(t('formatBold'), format('bold'), <Bold className="h-4 w-4" />)}
        {iconBtn(t('formatItalic'), format('italic'), <Italic className="h-4 w-4" />)}
        {iconBtn(t('formatUnderline'), format('underline'), <Underline className="h-4 w-4" />)}
        <ColorButtons />
        <span className="mx-1 h-4 w-px bg-white/20" />

        <div className="relative">
          {iconBtn(t('fileMessage'), () => setShowAttach((v) => !v), <Paperclip className="h-4 w-4" />)}
          {showAttach && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAttach(false)} />
              <div className="absolute bottom-full left-0 z-20 mb-1 w-52 overflow-hidden rounded-xl border border-white/10 bg-gray-800 shadow-2xl">
                <button
                  type="button"
                  onClick={openCamera}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10"
                >
                  <Camera className="h-4 w-4 text-teal-400" />
                  {t('attachCamera')}
                </button>
                <button
                  type="button"
                  onClick={openMedia}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10"
                >
                  <ImageIcon className="h-4 w-4 text-teal-400" />
                  {t('attachPhotosVideos')}
                </button>
                <button
                  type="button"
                  onClick={openDocs}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10"
                >
                  <FileText className="h-4 w-4 text-teal-400" />
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
              if (files.length) onAddFiles(files);
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
              if (files.length) onAddFiles(files);
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
              if (files.length) onAddFiles(files);
              e.target.value = '';
            }}
          />
        </div>

        <div className="relative">
          {iconBtn('Emoji', () => setShowEmoji((v) => !v), <Smile className="h-4 w-4" />)}
          {showEmoji && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowEmoji(false)} />
              <div className="absolute bottom-full left-0 z-20 mb-1 w-64 rounded-xl border border-white/10 bg-gray-800 p-2 shadow-2xl">
                <EmojiPicker
                  className="h-56"
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
    </>
  );
};

interface CaptionEditorProps {
  id: string;
  initialText: string;
  onCaptionChange: (text: string) => void;
  onAddFiles: (files: File[]) => void;
}

const CaptionEditor = ({ id, initialText, onCaptionChange, onAddFiles }: CaptionEditorProps) => {
  const { t } = useTranslations();
  return (
    <LexicalComposer
      key={id}
      initialConfig={{
        namespace: `caption-${id}`,
        theme: CAPTION_THEME,
        nodes: [],
        onError: (error) => console.error('Caption editor error:', error),
      }}
    >
      <CaptionToolbar onAddFiles={onAddFiles} />
      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="max-h-32 min-h-[40px] overflow-y-auto rounded-2xl bg-white/10 px-4 py-2.5 text-sm text-white caret-white outline-none fd-accent-ring" />
          }
          placeholder={
            <div className="pointer-events-none absolute left-4 top-2.5 text-sm italic text-white/40">
              {t('addCaption')}
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
      <SetCaptionTextPlugin text={initialText} />
      <OnChangePlugin
        onChange={(editorState, editor) => {
          const html = editorState.read(() => $generateHtmlFromNodes(editor, null));
          onCaptionChange(html);
        }}
      />
    </LexicalComposer>
  );
};

/**
 * Pre-send media staging screen (covers the chat column, NOT the viewport).
 * The active item dominates the view, a carousel manages the batch
 * (clickable thumbnails / add more / remove), and each item carries its own
 * caption edited with the full composer toolbar. Upload happens on send.
 */
export const AttachmentTray = ({
  attachments,
  activeIndex,
  onChangeIndex,
  onRemove,
  onCaptionChange,
  onAddFiles,
  onSend,
  onClose,
  sending,
  onReplaceAttachment,
}: AttachmentTrayProps) => {
  const { t } = useTranslations();
  const addInputRef = useRef<HTMLInputElement>(null);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const total = attachments.length;
  if (total === 0) return null;

  const safeIndex = Math.max(0, Math.min(activeIndex, total - 1));
  const current = attachments[safeIndex];
  const isImage = current.type.startsWith('image/');
  const isVideo = current.type.startsWith('video/');
  const meta = getFileKindMeta(current.type, current.name);
  const prev = () => onChangeIndex((safeIndex - 1 + total) % total);
  const next = () => onChangeIndex((safeIndex + 1) % total);

  const handleImageProcessed = (file: File) => {
    if (editingImageIndex === null) return;
    const previewUrl = URL.createObjectURL(file);
    onReplaceAttachment(editingImageIndex, {
      ...attachments[editingImageIndex],
      file,
      previewUrl,
      name: file.name,
      type: file.type,
      size: file.size,
    });
    setEditingImageIndex(null);
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-black pb-[max(1.28rem,6.4%)] text-white"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files || []);
        if (files.length) onAddFiles(files);
      }}
    >
      {editingImageIndex !== null ? (
        <ChatImageEditor
          src={attachments[editingImageIndex].previewUrl}
          name={attachments[editingImageIndex].name}
          onProcessed={handleImageProcessed}
          onCancel={() => setEditingImageIndex(null)}
        />
      ) : (
        <>
          {/* Top bar: close (discards pending), counter */}
      <div className="flex h-14 flex-shrink-0 items-center justify-between px-3">
        <button
          type="button"
          onClick={onClose}
          title={t('cancel')}
          aria-label={t('cancel')}
          className="rounded-full p-2 hover:bg-white/10"
        >
          <X className="h-6 w-6" />
        </button>
        <span className="text-sm text-white/70">
          {safeIndex + 1}/{total}
        </span>
        <span className="w-10" />
      </div>

      {/* Active item display */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4">
        {isImage ? (
          <div className="relative flex h-full w-full items-center justify-center">
            <img
              src={current.previewUrl}
              alt={current.name}
              className="max-h-full max-w-full object-contain"
            />
            <button
              type="button"
              onClick={() => setEditingImageIndex(safeIndex)}
              title={t('editImage')}
              aria-label={t('editImage')}
              className="absolute bottom-3 right-3 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        ) : isVideo ? (
          <video
            src={current.previewUrl}
            controls
            className="max-h-full max-w-full rounded-xl"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 px-8 text-center">
            <div className={`flex h-24 w-24 items-center justify-center rounded-2xl ${meta.bg}`}>
              <FileText className="h-12 w-12 text-white" strokeWidth={1.5} />
            </div>
            <p className="max-w-md break-all text-lg font-medium">{current.name}</p>
            <p className="text-sm text-white/60">{formatFileSize(current.size)}</p>
          </div>
        )}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label={t('previousFile')}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label={t('nextFile')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Batch management: clickable thumbnails + add more */}
      <div className="flex flex-shrink-0 items-center gap-2 overflow-x-auto bg-white/5 px-3 py-3">
        {attachments.map((att, i) => (
          <button
            key={att.id}
            type="button"
            onClick={() => onChangeIndex(i)}
            title={att.name}
            className={`relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 text-left ${
              i === safeIndex ? 'fd-accent-soft-border' : 'border-white/15'
            }`}
          >
            {att.type.startsWith('image/') ? (
              <img src={att.previewUrl} alt={att.name} className="pointer-events-none h-full w-full object-cover" />
            ) : (
              <div className="pointer-events-none flex h-full w-full items-center justify-center bg-white/10">
                <FileText className="h-6 w-6 text-white/80" />
              </div>
            )}
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(i);
              }}
              title={t('removeAttachment')}
              aria-label={t('removeAttachment')}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-900 p-0.5 text-white shadow hover:bg-gray-700"
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => addInputRef.current?.click()}
          title={t('attachPhotosVideos')}
          aria-label={t('attachPhotosVideos')}
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-white/30 text-white/70 hover:border-white/50 hover:text-white"
        >
          <Plus className="h-6 w-6" />
        </button>
        <input
          ref={addInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) onAddFiles(files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Bottom composer: caption (full toolbar) + send */}
      <div className="flex flex-shrink-0 items-end gap-2 border-t border-white/10 px-3 pt-2">
        <div className="min-w-0 flex-1">
          <CaptionEditor
            id={current.id}
            initialText={current.caption}
            onCaptionChange={(caption) => onCaptionChange(safeIndex, caption)}
            onAddFiles={onAddFiles}
          />
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={sending}
          title={t('send')}
          aria-label={t('send')}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full fd-accent-bg disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
      </>
      )}
    </div>
  );
};

export default AttachmentTray;
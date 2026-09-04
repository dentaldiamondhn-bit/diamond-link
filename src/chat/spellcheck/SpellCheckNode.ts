'use client';

import { type EditorConfig, type LexicalEditor, TextNode, type DOMExportOutput } from 'lexical';

/**
 * A `TextNode` subclass used to visually flag a misspelled word in the chat
 * composer. It renders exactly like a normal text node but carries the
 * `chat-spell-error` class (red wavy underline) while it remains flagged. The
 * word text itself is unmodified, so formatting, the generated HTML, and
 * editor-state serialization behave identically to a plain text node.
 */
export class SpellCheckNode extends TextNode {
  static getType(): string {
    return 'spellcheck-text';
  }

  constructor(text: string = '', key?: string) {
    super(text, key);
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const element = super.createDOM(config, editor);
    element.classList.add('chat-spell-error');
    // Inline styles guarantee rendering regardless of CSS delivery/caching.
    // border-bottom paints on inline spans in both contenteditable and static HTML.
    element.style.borderBottom = '2px solid rgb(239 68 68)';
    element.style.paddingBottom = '1px';
    element.style.cursor = 'pointer';
    return element;
  }

  /**
   * NEVER leak the spell-check decoration into serialized HTML. The base
   * TextNode.exportDOM goes through createDOM, and the dynamic dispatch would
   * otherwise bake the `chat-spell-error` class + red border-bottom into the
   * outgoing message content, which the message bubble then renders (via the
   * global `.chat-spell-error` style) as a stray red squiggle. Serialize as an
   * identical plain TextNode so the stored content stays clean.
   */
  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const plain = new TextNode(this.getTextContent())
      .setFormat(this.getFormat())
      .setStyle(this.getStyle());
    const output = plain.exportDOM(editor);
    const element = output.element;
    if (element instanceof HTMLElement) {
      element.classList.remove('chat-spell-error', 'chat-spell-error-active');
      element.style.removeProperty('border-bottom');
      element.style.removeProperty('padding-bottom');
      element.style.removeProperty('cursor');
    }
    return output;
  }
}

export function $isSpellCheckNode(node: unknown): node is SpellCheckNode {
  return node instanceof SpellCheckNode;
}
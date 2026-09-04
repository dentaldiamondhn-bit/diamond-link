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
    // Avoid creating a new TextNode (triggers read-only check). Build the
    // export output manually with a plain span containing the text content.
    const element = document.createElement('span');
    element.textContent = this.getTextContent();
    // Apply format classes inline to match TextNode's default export behavior
    const format = this.getFormat();
    if (format) {
      const classes: string[] = [];
      if (format & 1) classes.push('chat-bold', 'font-bold');
      if (format & 2) classes.push('chat-italic', 'italic');
      if (format & 4) classes.push('chat-underline', 'underline');
      if (format & 8) classes.push('chat-strikethrough', 'line-through');
      if (format & 16) classes.push('chat-code', 'font-mono');
      if (classes.length) element.className = classes.join(' ');
    }
    const style = this.getStyle();
    if (style) element.style.cssText = style;
    return { element };
  }
}

export function $isSpellCheckNode(node: unknown): node is SpellCheckNode {
  return node instanceof SpellCheckNode;
}
'use client';

import { type EditorConfig, TextNode } from 'lexical';

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

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    element.classList.add('chat-spell-error');
    // Inline styles guarantee rendering regardless of CSS delivery/caching.
    // border-bottom paints on inline spans in both contenteditable and static HTML.
    element.style.borderBottom = '2px solid rgb(239 68 68)';
    element.style.paddingBottom = '1px';
    element.style.cursor = 'pointer';
    return element;
  }
}

export function $isSpellCheckNode(node: unknown): node is SpellCheckNode {
  return node instanceof SpellCheckNode;
}
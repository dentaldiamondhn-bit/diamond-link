import {
  $applyNodeReplacement,
  DecoratorNode,
  type EditorConfig,
  type LexicalNode,
  type SerializedLexicalNode,
} from 'lexical';

export interface SerializedMentionNode extends SerializedLexicalNode {
  user: string;
}

/** A read-only span that renders `@Name`, serialized to HTML as a span with a
 *  `data-mention` user id so the bubble renderer can highlight it. */
export class MentionNode extends DecoratorNode<null> {
  __user: string;

  static getType(): string {
    return 'mention';
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__user);
  }

  static importJSON(
    serializedNode: SerializedMentionNode & Record<string, unknown>
  ): MentionNode {
    return $createMentionNode(String(serializedNode.user ?? ''));
  }

  constructor(user: string) {
    super();
    this.__user = user;
  }

  getTextContent(): string {
    return `@${this.__user}`;
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('span');
    dom.className = 'chat-mention';
    dom.setAttribute('data-mention', this.__user);
    dom.textContent = `@${this.__user}`;
    return dom;
  }

  decorate(): null {
    return null;
  }

  exportJSON(): SerializedMentionNode {
    return {
      type: 'mention',
      version: 1,
      user: this.__user,
    };
  }
}

export function $createMentionNode(user: string): MentionNode {
  return $applyNodeReplacement(new MentionNode(user));
}

export function $isMentionNode(node: LexicalNode | null | undefined): node is MentionNode {
  return node instanceof MentionNode;
}

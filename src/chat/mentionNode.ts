import {
  $applyNodeReplacement,
  DecoratorNode,
  type EditorConfig,
  type LexicalNode,
  type SerializedLexicalNode,
} from 'lexical';

export interface SerializedMentionNode extends SerializedLexicalNode {
  userName: string;
  userId?: string;
}

/** A read-only hyperlink that renders `@Name`, serialized to HTML as an `<a>` with
 *  a `data-mention-user-id` so the bubble renderer can open a user card/link. */
export class MentionNode extends DecoratorNode<null> {
  __userName: string;
  __userId?: string;

  static getType(): string {
    return 'mention';
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__userName, node.__userId);
  }

  static importJSON(
    serializedNode: SerializedMentionNode & Record<string, unknown>
  ): MentionNode {
    return $createMentionNode(
      String(serializedNode.userName ?? ''),
      serializedNode.userId ? String(serializedNode.userId) : undefined
    );
  }

  constructor(userName: string, userId?: string) {
    super();
    this.__userName = userName;
    this.__userId = userId;
  }

  getTextContent(): string {
    return `@${this.__userName}`;
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('a');
    dom.className = 'chat-mention';
    dom.href = '#';
    dom.setAttribute('data-mention-user-id', this.__userId ?? '');
    dom.setAttribute('data-mention-name', this.__userName);
    dom.setAttribute('rel', 'noopener');
    dom.textContent = `@${this.__userName}`;
    // In the composer, keep the placeholder link from jumping to `#`.
    dom.addEventListener('click', (e) => e.preventDefault());
    return dom;
  }

  decorate(): null {
    return null;
  }

  exportJSON(): SerializedMentionNode {
    return {
      type: 'mention',
      version: 2,
      userName: this.__userName,
      userId: this.__userId,
    };
  }
}

export function $createMentionNode(userName: string, userId?: string): MentionNode {
  return $applyNodeReplacement(new MentionNode(userName, userId));
}

export function $isMentionNode(node: LexicalNode | null | undefined): node is MentionNode {
  return node instanceof MentionNode;
}

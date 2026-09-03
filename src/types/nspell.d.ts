declare module 'nspell' {
  type NSpellDictionary = string | Uint8Array;

  class NSpell {
    constructor(aff: NSpellDictionary, dictionary?: NSpellDictionary);

    /** Whether `word` is spelled correctly (respects added/removed words). */
    correct(word: string): boolean;

    /** Suggest correctly spelled words close to `word`. */
    suggest(word: string, limit?: number): string[];

    /** Detailed spelling result for `word`. */
    spell(word: string): { correct: boolean; forbidden: boolean; warn: boolean };

    /** Add `word` to the known-word set (optionally modelled after `model`). */
    add(word: string, model?: string): this;

    /** Remove `word` from the known-word set. */
    remove(word: string): this;

    /** Extra word characters defined by the loaded affix file. */
    wordCharacters(): string[];

    /** Add a regular dictionary document (must match the loaded affix). */
    dictionary(doc: NSpellDictionary): this;

    /** Add a personal dictionary document (not tied to the affix). */
    personal(doc: NSpellDictionary): this;
  }

  export = NSpell;
}
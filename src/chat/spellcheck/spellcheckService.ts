'use client';

import NSpell from 'nspell';
import type { ChatLocale } from '@/chat/i18n/translations';

/**
 * Client-side spell-check service built on `nspell` (Hunspell-compatible).
 *
 * Dictionaries (.aff/.dic) are served from `/public/dictionaries` and lazy
 * loaded once per locale. A shared "known words" set is seeded with the app's
 * own vocabulary (dental/clinic terms, both languages) and grown at runtime
 * via "Add to dictionary"; ignored words are tracked in localStorage so they
 * stop being flagged across sessions.
 */

const PERSONAL_STORAGE_KEY = 'chat-spell-personal';
const IGNORED_STORAGE_KEY = 'chat-spell-ignored';

/** Terms from the clinic domain that should never be flagged as mistakes. */
const DENTAL_TERMS: string[] = [
  // Spanish
  'odontograma', 'odontogramas', 'odontología', 'odontologica', 'odontólogo', 'odontologo',
  'odontóloga', 'odontologa', 'ortodoncia', 'ortodoncista', 'ortodóntico', 'ortodontico',
  'periodoncia', 'periodontitis', 'gingivitis', 'endodoncia', 'endodoncias', 'bucodental',
  'odontopediatría', 'odontopediatria', 'prostodoncia', 'presupuesto', 'presupuestos',
  'prótesis', 'protesis', 'implante', 'implantes', 'blanqueamiento', 'alineador', 'alineadora',
  'alineadores', 'empaste', 'empastes', 'amalgama', 'brackets', 'ferula', 'férula', 'higienista',
  'extracción', 'extraccion', 'extracciones', 'oclusión', 'oclusion', 'incisivo', 'incisivos',
  'canino', 'caninos', 'premolar', 'premolares', 'molar', 'molares', 'corona', 'coronas',
  'diagnóstico', 'diagnostico', 'odontogramas', 'colutorio', 'calcificacion', 'calcificación',
  // English
  'odontogram', 'odontograms', 'orthodontics', 'orthodontic', 'orthodontist', 'odontology',
  'endodontics', 'periodontics', 'periodontist', 'periodontal', 'prosthodontics', 'prosthodontist',
  'prosthodontic', 'malocclusion', 'malocclusions', 'gingivectomy', 'gingival', 'subgingival',
  'supragingival', 'hygienist', 'hygienists', 'prophylaxis', 'denture', 'dentures', 'fillings',
  'amalgam', 'bicuspid', 'bicuspids', 'occlusal', 'whitening', 'scaling', 'dentistry',
  'fissurotomy', 'apexification', 'pulpectomy', 'gingivoplasty',
];

type StoredWords = string[];

function readStored(key: string): StoredWords {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredWords) : [];
  } catch {
    return [];
  }
}

function writeStored(key: string, words: StoredWords): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(words));
  } catch {
    /* storage unavailable */
  }
}

const personalWords = new Set<string>(readStored(PERSONAL_STORAGE_KEY).map((w) => w.toLowerCase()));
const ignoredWords = new Set<string>(readStored(IGNORED_STORAGE_KEY).map((w) => w.toLowerCase()));
const knownWords = new Set<string>(DENTAL_TERMS.map((w) => w.toLowerCase()));
for (const w of personalWords) knownWords.add(w);

const engineByLocale = new Map<ChatLocale, NSpell>();
const pendingByLocale = new Map<ChatLocale, Promise<NSpell | null>>();

/** Load (and cache) the Hunspell engine for a locale. */
function loadEngine(locale: ChatLocale): Promise<NSpell | null> {
  const cached = engineByLocale.get(locale);
  if (cached) return Promise.resolve(cached);

  const pending = pendingByLocale.get(locale);
  if (pending) return pending;

  const promise = (async (): Promise<NSpell | null> => {
    try {
      const [affRes, dicRes] = await Promise.all([
        fetch(`/dictionaries/${locale}.aff`),
        fetch(`/dictionaries/${locale}.dic`),
      ]);
      if (!affRes.ok || !dicRes.ok) return null;
      const [aff, dic] = await Promise.all([affRes.text(), dicRes.text()]);
      const engine = new NSpell(aff, dic);
      for (const word of knownWords) engine.add(word);
      engineByLocale.set(locale, engine);
      return engine;
    } catch (err) {
      console.error(`Spell-check dictionary failed to load (${locale}):`, err);
      // Do not keep a failed promise cached forever: clear it so the caller
      // (or a retry) can attempt the load again instead of being stuck with a
      // dead spell-check for the whole session.
      pendingByLocale.delete(locale);
      return null;
    }
  })();

  pendingByLocale.set(locale, promise);
  return promise;
}

export interface SpellcheckHandle {
  locale: ChatLocale;

  /** True when the word is spelled correctly (or is ignored / known). */
  correct(word: string): boolean;

  /** Up to `limit` correction candidates for `word`. */
  suggest(word: string, limit?: number): string[];

  /** Remember `word` as correct and persist it for future sessions. */
  addToDictionary(word: string): void;

  /** Stop flagging `word` for this user (persisted). */
  markIgnored(word: string): void;

  isIgnored(word: string): boolean;
}

export async function getSpellchecker(locale: ChatLocale): Promise<SpellcheckHandle | null> {
  const engine = await loadEngine(locale);
  if (!engine) return null;

  return {
    locale,
    correct(word) {
      const key = word.toLowerCase();
      if (ignoredWords.has(key) || knownWords.has(key)) return true;
      return engine.correct(word);
    },
    suggest(word, limit = 6) {
      return engine
        .suggest(word)
        .filter((s) => s && s.toLowerCase() !== word.toLowerCase())
        .slice(0, limit);
    },
    addToDictionary(word) {
      const key = word.toLowerCase();
      if (!key) return;
      knownWords.add(key);
      personalWords.add(key);
      writeStored(PERSONAL_STORAGE_KEY, Array.from(personalWords));
      engine.add(word);
    },
    markIgnored(word) {
      const key = word.toLowerCase();
      if (!key) return;
      ignoredWords.add(key);
      writeStored(IGNORED_STORAGE_KEY, Array.from(ignoredWords));
    },
    isIgnored(word) {
      return ignoredWords.has(word.toLowerCase());
    },
  };
}
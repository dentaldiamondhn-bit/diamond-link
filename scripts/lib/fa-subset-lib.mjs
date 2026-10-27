import fs from 'node:fs';
import path from 'node:path';

/**
 * Pure helpers for the self-hosted Font Awesome subset build.
 * No side effects here — scripts/build-fa-subset.mjs writes the files, and
 * tests/faSubset.test.ts asserts the generated output covers every icon the
 * app actually uses.
 */

export const FA_FAMILIES = {
  solid: { prefix: 'fas', weight: 900, source: 'fa-solid-900.woff2', output: 'fa-solid-subset.woff2' },
  regular: { prefix: 'far', weight: 400, source: 'fa-regular-400.woff2', output: 'fa-regular-subset.woff2' },
  brands: { prefix: 'fab', weight: 400, source: 'fa-brands-400.woff2', output: 'fa-brands-subset.woff2' },
};

/**
 * Icon names the app uses that the Font Awesome **Free** package never
 * provided (some are Pro-only, others were renamed in FA6: sticky-notes ->
 * note-sticky, sparkles -> wand-magic-sparkles). The cdnjs stylesheet the app
 * used before shipped the same Free package, so these classes already rendered
 * blank — the subset keeps that exact behaviour instead of "fixing" it, which
 * would be a visual change on live pages.
 */
export const KNOWN_UNRESOLVED_ICONS = new Set([
  'braces',
  'denture',
  'scalpel',
  'sparkles',
  'sticky-notes',
  'tooth-medical',
  'toothbrush',
]);

const FAMILY_BY_PREFIX = {
  fas: 'solid',
  fal: 'solid',
  far: 'regular',
  fab: 'brands',
  fad: 'solid',
};

const SOURCE_DIRS = ['app', 'components', 'src', 'contexts', 'hooks'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

/** Utility classes (not icons) that the app uses. */
export const FA_UTILITY_CLASSES = new Set(['fa-spin', 'fa-li', 'fa-sm']);

/** Tokens that look like icon classes but are our own font asset names. */
function isAssetToken(token) {
  return /^fa-(solid|brands|regular)-subset$/.test(token) || token === 'fa-subset';
}

/** Tokens that are incomplete template prefixes such as `fa-chevron-`. */
function isPartialToken(token) {
  return token.endsWith('-');
}

function walk(dir, files = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(full, files);
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Scan the app source for Font Awesome classes.
 *
 * The scan is deliberately over-inclusive: every `fa-*` token anywhere in the
 * source counts (including config literals like `icon: 'fa-crown'`), and icons
 * whose family cannot be determined are added to the solid family. Missing a
 * glyph would render a blank icon on live pages, while an extra glyph only
 * costs a few bytes.
 */
export function collectIconUsage(root) {
  const files = SOURCE_DIRS.flatMap((dir) => walk(path.join(root, dir)));
  const classes = new Set();
  const templateCandidates = new Set();
  const iconsByFamily = new Map();
  const stringPattern = /(['"`])([^'"`]*\bfa-[a-z0-9-]+[^'"`]*)\1/g;
  const templatePattern = /fa-\$\{([^}]*)\}/g;

  const addIcon = (family, iconName) => {
    if (!family || !iconName) return;
    if (!iconsByFamily.has(family)) iconsByFamily.set(family, new Set());
    iconsByFamily.get(family).add(iconName);
  };

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');

    // 1. Every fa-* token anywhere (class strings, config objects, arrays).
    for (const token of text.match(/fa-[a-z0-9-]+/g) || []) {
      if (isAssetToken(token) || isPartialToken(token)) continue;
      classes.add(token);
    }

    // 2. Family-specific usage: `fas fa-user`, `fab fa-github`, ...
    for (const match of text.matchAll(stringPattern)) {
      const value = match[2];
      const tokens = value.match(/fa-[a-z0-9-]+/g) || [];
      const family = (value.match(/\b(fas|fal|far|fab|fad)\b/) || [])[1];
      const familyName = family ? FAMILY_BY_PREFIX[family] : null;
      if (!familyName) continue;
      for (const token of tokens) {
        if (FA_UTILITY_CLASSES.has(token)) continue;
        addIcon(familyName, token.replace(/^fa-/, ''));
      }
    }

    // 3. Templated icon names: `fa-${tipo === 'entrada' ? 'arrow-down' : 'arrow-up'}`
    //    Only the candidates are collected here — the expression may also hold
    //    comparison operands, so the generator resolves them against the
    //    Font Awesome metadata and drops the ones that are not icons.
    for (const match of text.matchAll(templatePattern)) {
      const inner = match[1];
      for (const literal of inner.match(/'([^']+)'|"([^"]+)"/g) || []) {
        const name = literal.replace(/^['"]|['"]$/g, '');
        if (!/^[a-z0-9-]+$/.test(name)) continue;
        templateCandidates.add(name);
      }
    }
  }

  // 4. Icons whose family could not be determined default to solid (the
  //    family the app uses almost everywhere).
  for (const cls of classes) {
    const name = cls.replace(/^fa-/, '');
    if (FA_UTILITY_CLASSES.has(cls)) continue;
    if (KNOWN_UNRESOLVED_ICONS.has(name)) continue;
    const assigned = [...iconsByFamily.values()].some((set) => set.has(name));
    if (!assigned) addIcon('solid', name);
  }

  // 5. Template candidates are treated as solid icons as well.
  for (const name of templateCandidates) {
    addIcon('solid', name);
  }

  return { classes, templateCandidates, iconsByFamily, files };
}

/**
 * Build a class-name lookup from Font Awesome's metadata (name -> unicode +
 * styles), including the legacy alias names.
 */
export function buildIconLookup(iconsMeta) {
  const lookup = new Map();
  for (const [name, meta] of Object.entries(iconsMeta)) {
    if (!meta || typeof meta.unicode !== 'string') continue;
    lookup.set(name, { name, unicode: meta.unicode, styles: meta.styles || [] });
    for (const alias of meta.aliases?.names || []) {
      if (!lookup.has(alias)) {
        lookup.set(alias, { name, unicode: meta.unicode, styles: meta.styles || [], alias: true });
      }
    }
  }
  return lookup;
}

/** Extract the verbatim CSS rules of the utility classes that the app uses. */
export function collectUtilityRules(allCss, usedClasses) {
  const wanted = new Set([...usedClasses]);
  const rules = [];

  for (const cls of wanted) {
    const escaped = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const classRule = new RegExp(`\\.${escaped}\\s*\\{[^}]*\\}`, 'g');
    const matches = allCss.match(classRule);
    if (matches) rules.push(...matches);
  }

  // Animations used by fa-spin live in a separate @keyframes block.
  if (wanted.has('fa-spin')) {
    const keyframes = allCss.match(/@keyframes fa-spin\s*\{[\s\S]*?\n\}/);
    if (keyframes) rules.push(keyframes[0]);
  }

  return [...new Set(rules)].join('\n');
}

/**
 * Build the generated stylesheet: @font-face per used family, the family
 * helpers, one rule per icon and the verbatim utility rules.
 */
export function buildSubsetCss({ families, iconRules, utilityCss, fontDisplay = 'block' }) {
  const parts = [
    '/* Font Awesome 6 Free — self-hosted trimmed subset.',
    ' * Generated by scripts/build-fa-subset.mjs — do not edit by hand.',
    ' * Source: @fortawesome/fontawesome-free 6.4.0 (SIL OFL 1.1).',
    ' */',
  ];

  for (const family of families) {
    const meta = FA_FAMILIES[family];
    parts.push(
      '@font-face {',
      '  font-family: "Font Awesome 6 Free";',
      '  font-style: normal;',
      `  font-weight: ${meta.weight};`,
      `  font-display: ${fontDisplay};`,
      `  src: url("/fonts/${meta.output}") format("woff2");`,
      '}',
      '',
      `.${meta.prefix} {`,
      '  font-family: "Font Awesome 6 Free";',
      `  font-weight: ${meta.weight};`,
      '}',
      ''
    );
  }

  if (iconRules.length) {
    parts.push('/* Icons */');
    parts.push(iconRules.join('\n'));
    parts.push('');
  }

  if (utilityCss.trim()) {
    parts.push('/* Utilities */');
    parts.push(utilityCss.trim());
    parts.push('');
  }

  return parts.join('\n');
}

/** Build the per-icon CSS rules for the resolved icons. */
export function buildIconRules(resolvedIcons) {
  return resolvedIcons.map(({ className, unicode }) => `.${className}:before {\n  content: "\\${unicode}";\n}`);
}

/** Resolve a family + icon name to its canonical metadata entry. */
export function resolveIcon(lookup, iconName, family) {
  const entry = lookup.get(iconName);
  if (!entry) return null;
  if (family && entry.styles.length && !entry.styles.includes(family)) {
    return { ...entry, familyMismatch: true };
  }
  return entry;
}

/** Convert a hex unicode (e.g. "f007") into the character it represents. */
export function unicodeToChar(hex) {
  const code = parseInt(hex, 16);
  if (Number.isNaN(code)) return null;
  return String.fromCodePoint(code);
}

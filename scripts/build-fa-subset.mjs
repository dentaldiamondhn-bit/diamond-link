#!/usr/bin/env node
/**
 * Builds a trimmed, self-hosted Font Awesome subset.
 *
 * The app used to load the full Font Awesome 6.4.0 stylesheet from cdnjs in
 * the root <head>, which blocked FCP on every page and shipped font files the
 * app never uses. This script scans the source for the `fa-*` classes that are
 * actually used, subsets the Font Awesome Free webfonts down to those glyphs
 * and writes a small local stylesheet + woff2 files to public/fonts/.
 *
 * Icon artwork is unchanged: the glyphs come from the same
 * @fortawesome/fontawesome-free 6.4.0 package (SIL OFL 1.1) that cdnjs served.
 *
 * Usage: node scripts/build-fa-subset.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import subsetFont from 'subset-font';
import {
  FA_FAMILIES,
  KNOWN_UNRESOLVED_ICONS,
  collectIconUsage,
  buildIconLookup,
  collectUtilityRules,
  buildSubsetCss,
  buildIconRules,
  resolveIcon,
  unicodeToChar,
} from './lib/fa-subset-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FA_DIR = path.join(ROOT, 'node_modules/@fortawesome/fontawesome-free');
const OUT_DIR = path.join(ROOT, 'public/fonts');

async function main() {
  const usage = collectIconUsage(ROOT);
  const meta = yaml.load(fs.readFileSync(path.join(FA_DIR, 'metadata/icons.yml'), 'utf8'));
  const lookup = buildIconLookup(meta);
  const allCss = fs.readFileSync(path.join(FA_DIR, 'css/all.css'), 'utf8');

  const unresolved = new Set();
  const iconsByClass = new Map();
  const families = [];
  const definiteIcons = new Set();
  for (const set of usage.iconsByFamily.values()) {
    for (const name of set) definiteIcons.add(name);
  }
  for (const cls of usage.classes) {
    const name = cls.replace(/^fa-/, '');
    if (name !== 'spin' && name !== 'li' && name !== 'sm') definiteIcons.add(name);
  }

  for (const [family, icons] of usage.iconsByFamily) {
    const meta = FA_FAMILIES[family];
    if (!meta) continue;
    families.push(family);

    const chars = new Set();
    for (const iconName of icons) {
      if (KNOWN_UNRESOLVED_ICONS.has(iconName)) {
        unresolved.add(iconName);
        continue;
      }
      const entry = resolveIcon(lookup, iconName, family);
      if (!entry) {
        // Template candidates may contain comparison operands; only report the
        // ones that are definitely used as classes.
        if (definiteIcons.has(iconName)) unresolved.add(iconName);
        continue;
      }
      if (entry.familyMismatch) {
        console.warn(
          `[fa-subset] warning: "${iconName}" has no ${family} variant in Font Awesome Free ` +
            `(it rendered blank with the CDN stylesheet too) — keeping the icon rule anyway.`
        );
      }
      const char = unicodeToChar(entry.unicode);
      if (!char) continue;
      chars.add(char);
      const className = `fa-${iconName}`;
      if (!iconsByClass.has(className)) {
        iconsByClass.set(className, { className, unicode: entry.unicode });
      }
    }

    if (chars.size === 0) continue;

    const sourcePath = path.join(FA_DIR, 'webfonts', meta.source);
    const source = fs.readFileSync(sourcePath);
    const subset = await subsetFont(source, [...chars].join(''), { targetFormat: 'woff2' });

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const outputPath = path.join(OUT_DIR, meta.output);
    fs.writeFileSync(outputPath, subset);
    console.log(
      `[fa-subset] ${family}: ${chars.size} glyphs, ${source.length} B -> ${subset.length} B ` +
        `(${Math.round((1 - subset.length / source.length) * 100)}% smaller)`
    );
  }

  const utilityClasses = new Set(
    [...usage.classes].filter((cls) => !iconsByClass.has(cls) && !KNOWN_UNRESOLVED_ICONS.has(cls.replace(/^fa-/, '')))
  );
  const utilityCss = collectUtilityRules(allCss, utilityClasses);
  const css = buildSubsetCss({
    families,
    iconRules: buildIconRules([...iconsByClass.values()]),
    utilityCss,
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const cssPath = path.join(OUT_DIR, 'fa-subset.css');
  fs.writeFileSync(cssPath, css);

  console.log(
    `[fa-subset] wrote ${path.relative(ROOT, cssPath)} (${css.length} B, ${iconsByClass.size} icons, ` +
      `${families.length} families)`
  );

  if (unresolved.size) {
    console.log(
      `[fa-subset] icons with no Font Awesome Free glyph (rendered blank before too): ${[...unresolved].sort().join(', ')}`
    );
  }
}

main().catch((error) => {
  console.error('[fa-subset] failed:', error);
  process.exit(1);
});

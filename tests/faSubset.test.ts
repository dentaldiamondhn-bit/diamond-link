import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import {
  collectIconUsage,
  buildIconLookup,
  KNOWN_UNRESOLVED_ICONS,
  FA_UTILITY_CLASSES,
} from '../scripts/lib/fa-subset-lib.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CSS_PATH = path.join(ROOT, 'public/fonts/fa-subset.css');
const LAYOUT_PATH = path.join(ROOT, 'app/layout.tsx');
const META_PATH = path.join(ROOT, 'node_modules/@fortawesome/fontawesome-free/metadata/icons.yml');

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

describe('Font Awesome self-hosted subset', () => {
  test('the generated stylesheet exists', () => {
    assert.ok(fs.existsSync(CSS_PATH), 'public/fonts/fa-subset.css is missing — run `npm run build:fa`');
  });

  test('app/layout.tsx no longer loads Font Awesome from a CDN', () => {
    const layout = fs.readFileSync(LAYOUT_PATH, 'utf8');
    assert.ok(
      !/cdnjs[^"']*font-awesome/i.test(layout),
      'app/layout.tsx still links the Font Awesome CDN stylesheet'
    );
    assert.match(layout, /\/fonts\/fa-subset\.css/);
  });

  test('the generated stylesheet references no external URLs', () => {
    const css = readIfExists(CSS_PATH);
    assert.ok(css, 'generated stylesheet missing');
    assert.ok(!/https?:\/\//.test(css.replace(/url\("\/fonts\/[^"]+"\)/g, '')), 'external URL found in subset CSS');
  });

  test('every @font-face source exists on disk', () => {
    const css = readIfExists(CSS_PATH);
    assert.ok(css, 'generated stylesheet missing');
    const sources = [...css.matchAll(/url\("(\/fonts\/[^"]+)"\)/g)].map((m) => m[1]);
    assert.ok(sources.length > 0, 'no @font-face sources found');
    for (const source of sources) {
      const file = path.join(ROOT, 'public', source.replace(/^\//, ''));
      assert.ok(fs.existsSync(file), `font file missing: ${source}`);
    }
  });

  test('every Font Awesome class used in the app is covered by the subset', () => {
    const css = readIfExists(CSS_PATH);
    assert.ok(css, 'generated stylesheet missing');

    const usage = collectIconUsage(ROOT);
    assert.ok(usage.classes.size > 0, 'no Font Awesome usage detected — scanner is broken');

    const meta = yaml.load(fs.readFileSync(META_PATH, 'utf8')) as Record<string, any>;
    const lookup = buildIconLookup(meta);

    const missing: string[] = [];
    const unexpectedMissing: string[] = [];

    for (const cls of usage.classes) {
      const iconName = cls.replace(/^fa-/, '');
      const resolves = lookup.has(iconName);
      const covered = css.includes(`.${cls}`);
      if (resolves && !covered) missing.push(cls);
      if (!resolves && !KNOWN_UNRESOLVED_ICONS.has(iconName) && !FA_UTILITY_CLASSES.has(cls)) {
        unexpectedMissing.push(cls);
      }
    }

    assert.deepEqual(missing, [], `Font Awesome icons missing from the subset: ${missing.join(', ')}`);
    assert.deepEqual(
      unexpectedMissing,
      [],
      `these classes have no Font Awesome Free glyph and were not declared as known-unresolved: ${unexpectedMissing.join(', ')}`
    );
  });

  test('every templated icon candidate that exists is covered by the subset', () => {
    const css = readIfExists(CSS_PATH);
    assert.ok(css, 'generated stylesheet missing');

    const usage = collectIconUsage(ROOT);
    const meta = yaml.load(fs.readFileSync(META_PATH, 'utf8')) as Record<string, any>;
    const lookup = buildIconLookup(meta);

    const missing = [...usage.templateCandidates].filter(
      (name) => lookup.has(name) && !css.includes(`.fa-${name}`)
    );
    assert.deepEqual(missing, [], `templated icons missing from the subset: ${missing.join(', ')}`);
  });

  test('every icon resolves to a real Font Awesome glyph', () => {
    const usage = collectIconUsage(ROOT);
    const meta = yaml.load(fs.readFileSync(META_PATH, 'utf8')) as Record<string, any>;
    const lookup = buildIconLookup(meta);

    const unknown = [];
    for (const cls of usage.classes) {
      const iconName = cls.replace(/^fa-/, '');
      if (FA_UTILITY_CLASSES.has(cls)) continue;
      if (KNOWN_UNRESOLVED_ICONS.has(iconName)) continue;
      if (!lookup.has(iconName)) unknown.push(iconName);
    }
    assert.deepEqual(unknown, [], `icons not found in Font Awesome metadata: ${unknown.join(', ')}`);
  });
});

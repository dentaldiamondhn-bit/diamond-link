#!/usr/bin/env node
/**
 * Generates `public/sw-precache.json` — the list of URLs the service worker
 * precaches at install so the chat app shell (and the assets it needs to boot)
 * is available offline.
 *
 * Built from `.next/app-build-manifest.json` (JS entry chunks whose on-disk
 * paths are stable and equal to their served URLs) plus the real hashed CSS
 * files emitted under `.next/static/css/`. Runs AFTER `next build` via the
 * `build` script in package.json.
 *
 * Only same-origin static assets are included. `/api/`, navigation HTML and
 * the dictionaries are deliberately excluded (handled at runtime by sw.js).
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, '.next', 'app-build-manifest.json');
const CSS_DIR = join(ROOT, '.next', 'static', 'css');
const OUT = join(ROOT, 'public', 'sw-precache.json');

const seen = new Set();
const urls = [];

function add(url) {
  if (seen.has(url)) return;
  seen.add(url);
  urls.push(url);
}

if (existsSync(MANIFEST)) {
  // Keys chosen to cover the app shell + the chat route group that the SW
  // should make available offline. Log a warning (not a fatal) if a route's
  // manifest entry is absent in a given build.
  const routes = [
    '/layout',
    '/(auth)/layout',
    '/(auth)/chat/page',
    '/error',
    '/global-error',
  ];
  const m = JSON.parse(readFileSync(MANIFEST, 'utf8'));

  for (const key of routes) {
    const list = m.pages?.[key];
    if (!list) {
      console.warn(`[sw-precache] no entry for route "${key}" — skipped.`);
      continue;
    }
    for (const p of list) {
      // Only JS chunks have stable on-disk == served URLs in the manifest.
      // CSS entries (`static/css/app/...`) are aliases to hashed files and are
      // handled separately below from the real CSS files on disk.
      if (p.endsWith('.js')) add('/_next/' + p);
    }
  }
} else {
  console.warn('[sw-precache] .next/app-build-manifest.json not found — JS shell not precached.');
}

// Real hashed CSS files (their served path equals the disk filename).
if (existsSync(CSS_DIR)) {
  for (const f of readdirSync(CSS_DIR)) {
    if (!f.endsWith('.css')) continue;
    const p = join(CSS_DIR, f);
    try {
      if (statSync(p).size > 16) add('/_next/static/css/' + f);
    } catch {
      /* ignore */
    }
  }
}

// Stable public shell assets.
for (const f of ['/manifest.json', '/Logo.svg', '/favicon.ico']) {
  if (existsSync(join(ROOT, 'public', f.replace(/^\//, '')))) add(f);
}

writeFileSync(OUT, JSON.stringify(urls, null, 2) + '\n');
console.log(`[sw-precache] wrote ${urls.length} URLs to ${OUT}`);

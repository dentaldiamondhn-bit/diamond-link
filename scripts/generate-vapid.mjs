#!/usr/bin/env node
/**
 * Phase 5 — generates a VAPID keypair for PWA web push.
 *
 * Usage:  node scripts/generate-vapid.mjs
 *         node scripts/generate-vapid.mjs apply   (appends to .env.local)
 *
 * The pair is written (or appended) to .env.local as:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY_1=<public>
 *   VAPID_PRIVATE_KEY_1=<private>
 *   VAPID_SUBJECT=mailto:admin@diamondlink.app
 *
 * (Names carry the _1 suffix to match the production vars already configured
 * in Vercel; src/lib/push/vapid.ts also accepts the unsuffixed names.)
 *
 * Only the private key is a secret; the public key may live client-side.
 */
import { appendFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import webpush from 'web-push';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const apply = process.argv[2] === 'apply';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

const lines = [
  '',
  '# VAPID web-push keys (Phase 5) — generate more: node scripts/generate-vapid.mjs apply',
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY_1=${publicKey}`,
  `VAPID_PRIVATE_KEY_1=${privateKey}`,
  'VAPID_SUBJECT=mailto:admin@diamondlink.app',
  '',
];

if (apply) {
  const envPath = join(ROOT, '.env.local');
  const existing = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  if (existing.includes('VAPID_PRIVATE_KEY_1=')) {
    console.warn('VAPID_PRIVATE_KEY_1 already set in .env.local — refusing to overwrite.');
    process.exit(1);
  }
  appendFileSync(envPath, lines.join('\n'));
  console.log('VAPID keys appended to .env.local');
} else {
  console.log('\nCopy into .env.local:');
  console.log(lines.join('\n'));
}
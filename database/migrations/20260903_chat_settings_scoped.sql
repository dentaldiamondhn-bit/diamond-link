-- Chat settings scoped per conversation (Phase 7/8 customizations).
--
-- Previous migration (20260903_chat_settings.sql) created chat_settings with a
-- single per-user row (PK user_id). This migration makes each setting scoped to
-- (user_id, conversation_id) so every chat/group can have its own wallpaper and
-- bubble colors while still supporting global user defaults.
--
-- Model (scoped rows with global fallback):
--   * conversation_id IS NULL  -> the user's global default row
--   * conversation_id IS SET   -> an override for a specific chat/group
--   * Effective settings for (user, conversation): the scoped row if present,
--     otherwise the NULL/global row, otherwise app-level DEFAULTS.
--
-- Existing rows (PK user_id) become the global (NULL) rows, preserving current
-- user-wide wallpaper/bubble choices.
--
-- Postgres composite PKs do not allow NULLs, so we add a surrogate uuid PK and
-- enforce scoped uniqueness via partial unique indexes:
--   * One global row per user:  UNIQUE (user_id) WHERE conversation_id IS NULL
--   * One override per chat:    UNIQUE (user_id, conversation_id) WHERE conversation_id IS NOT NULL
--
-- Deterministic: safe to re-run.

-- 1. Drop old PK (user_id).
ALTER TABLE chat_settings DROP CONSTRAINT IF EXISTS chat_settings_pkey;

-- 2. Add surrogate PK column.
ALTER TABLE chat_settings
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

-- Backfill any existing rows (should only happen on first run).
UPDATE chat_settings SET id = gen_random_uuid() WHERE id IS NULL;

ALTER TABLE chat_settings
  ALTER COLUMN id SET NOT NULL;

ALTER TABLE chat_settings
  ADD CONSTRAINT chat_settings_pkey PRIMARY KEY (id);

-- 3. Add conversation_id column (nullable for global defaults).
ALTER TABLE chat_settings
  ADD COLUMN IF NOT EXISTS conversation_id text;

-- 4. Scoped uniqueness: one override row per (user, conversation).
DROP INDEX IF EXISTS chat_settings_scoped_unique;
CREATE UNIQUE INDEX chat_settings_scoped_unique
  ON chat_settings (user_id, conversation_id)
  WHERE conversation_id IS NOT NULL;

-- 5. Global uniqueness: one default row per user.
DROP INDEX IF EXISTS chat_settings_global_unique;
CREATE UNIQUE INDEX chat_settings_global_unique
  ON chat_settings (user_id)
  WHERE conversation_id IS NULL;

COMMENT ON COLUMN chat_settings.conversation_id IS
  'NULL = global user default; set = per-chat/group override.';

-- 6. Add SVG support to the chat-wallpapers storage bucket.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']::text[]
WHERE id = 'chat-wallpapers';

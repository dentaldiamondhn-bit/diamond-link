-- Phase 7 completion: per-user chat appearance customizations.
-- Extends the existing chat_settings table (global NULL row + per-conversation
-- overrides) with text size, message density, accent color, and per-side bubble
-- text colors. All columns are simple scalars with app defaults so existing
-- rows pick them up automatically (NOT NULL DEFAULT), and RLS stays untouched.
--
-- Run in the Supabase SQL Editor. Idempotent (IF NOT EXISTS), safe to re-run.

ALTER TABLE chat_settings
  ADD COLUMN IF NOT EXISTS text_size text NOT NULL DEFAULT 'md',
  ADD COLUMN IF NOT EXISTS density text NOT NULL DEFAULT 'comfortable',
  ADD COLUMN IF NOT EXISTS accent_color text NOT NULL DEFAULT '#2563eb',
  -- Empty string = "auto": the client derives a readable text color from the
  -- chosen bubble background (matches the pre-token behavior).
  ADD COLUMN IF NOT EXISTS my_text_color text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS other_text_color text NOT NULL DEFAULT '';

-- Optional sanity constraint (skip if you prefer to allow future values):
-- ALTER TABLE chat_settings
--   ADD CONSTRAINT chat_settings_text_size_check CHECK (text_size IN ('sm','md','lg')),
--   ADD CONSTRAINT chat_settings_density_check CHECK (density IN ('comfortable','compact'));
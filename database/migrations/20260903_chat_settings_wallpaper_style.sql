-- Add selectable default wallpaper style to chat_settings.
--
-- chat_settings.wallpaper_type is 'default' | 'custom'. The 'default' branch
-- previously mapped to a single WhatsApp-style design; this migration adds a
-- wallpaper_style column so users can pick between several built-in seamless
-- designs (classic, dental, azure, mint, geo). wallpaper_style is only
-- meaningful when wallpaper_type = 'default'.
--
-- Deterministic: safe to re-run.

ALTER TABLE chat_settings
  ADD COLUMN IF NOT EXISTS wallpaper_style text NOT NULL DEFAULT 'classic';

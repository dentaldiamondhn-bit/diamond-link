-- Chat per-user display settings (Phase 7 customizations):
--   * chat_settings table, one row per user (PK user_id)
--   * wallpaper selection for the chat pane: 'default' (WhatsApp-style doodle
--     pattern) or 'custom' (user-chosen image via background_image_url)
--   * bubble colors, applied to the current user's messages (my_bubble_color)
--     and to messages from others (other_bubble_color)
--
-- Clerk user ids are TEXT, so user_id is TEXT (mirrors chat_participants /
-- chat_message_reads to avoid any auth.users FK).
--
-- RLS posture matches the rest of the chat schema: permissive policies for the
-- anon client (Clerk auth, no Supabase session sync).
--
-- Deterministic: safe to re-run.

CREATE TABLE IF NOT EXISTS chat_settings (
  user_id text PRIMARY KEY,
  wallpaper_type text NOT NULL DEFAULT 'default',
  background_image_url text,
  my_bubble_color text NOT NULL DEFAULT '#2563eb',
  other_bubble_color text NOT NULL DEFAULT '#ffffff',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_settings_select" ON chat_settings;
DROP POLICY IF EXISTS "chat_settings_insert" ON chat_settings;
DROP POLICY IF EXISTS "chat_settings_update" ON chat_settings;
DROP POLICY IF EXISTS "chat_settings_delete" ON chat_settings;

CREATE POLICY "chat_settings_select" ON chat_settings FOR SELECT USING (true);
CREATE POLICY "chat_settings_insert" ON chat_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "chat_settings_update" ON chat_settings FOR UPDATE USING (true);
CREATE POLICY "chat_settings_delete" ON chat_settings FOR DELETE USING (true);

-- Storage bucket for user-uploaded chat wallpapers (public; mirrors the
-- chat-voice-notes bucket provisioning pattern).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
SELECT 'chat-wallpapers', 'chat-wallpapers', true, 5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[],
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'chat-wallpapers');

CREATE POLICY IF NOT EXISTS "Allow chat wallpaper upload"
ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'chat-wallpapers');

CREATE POLICY IF NOT EXISTS "Allow chat wallpaper read"
ON storage.objects FOR SELECT TO public USING (bucket_id = 'chat-wallpapers');

CREATE POLICY IF NOT EXISTS "Allow chat wallpaper delete"
ON storage.objects FOR DELETE TO public USING (bucket_id = 'chat-wallpapers');

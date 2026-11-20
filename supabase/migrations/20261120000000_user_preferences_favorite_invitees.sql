-- =====================================================================
-- Migration: user_preferences.favorite_invitees (Nueva cita Step 3)
--
-- Adds `favorite_invitees` (text[] of Clerk user ids) to the existing
-- `user_preferences` table so the invitee picker can pre-select and
-- persist favorited teammates. Re-enables RLS (overriding the earlier
-- disable migration) with policies scoping each row to its owner.
-- Idempotent and safe to re-run.
-- =====================================================================

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS favorite_invitees TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;

CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT TO authenticated
  USING (clerk_user_id = auth.uid()::text);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT TO authenticated
  WITH CHECK (clerk_user_id = auth.uid()::text);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE TO authenticated
  USING (clerk_user_id = auth.uid()::text);

GRANT ALL ON user_preferences TO authenticated;

-- =====================================================================

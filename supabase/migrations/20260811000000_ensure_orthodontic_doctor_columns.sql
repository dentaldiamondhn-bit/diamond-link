-- Ensure orthodontic history tables store the Doctor Tratante (doctor_id)
-- Run this in the Supabase SQL Editor (idempotent; safe to run multiple times).
--
-- Guarantees:
--   1. doctor_id column EXISTS on historia_clinica_ortodoncia (TEXT, nullable)
--   2. doctor_id column EXISTS on historia_clinica_ortodoncia_versions (TEXT, nullable)
--   3. anon/authenticated roles can SELECT/INSERT/UPDATE/DELETE rows (RLS policies)
--      NOTE: 20260807000300 added anon INSERT/UPDATE/DELETE policies but no SELECT
--      policy; without SELECT, insert().select() returns [] silently and saved
--      records are invisible to the app.

-- ============================================================
-- 1. historia_clinica_ortodoncia.doctor_id -> TEXT
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'historia_clinica_ortodoncia'
      AND column_name = 'doctor_id'
  ) THEN
    ALTER TABLE historia_clinica_ortodoncia ADD COLUMN doctor_id TEXT;
  ELSE
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'historia_clinica_ortodoncia'
        AND column_name = 'doctor_id'
        AND data_type IN ('uuid', 'character varying', 'varchar')
    ) THEN
      ALTER TABLE historia_clinica_ortodoncia
        ALTER COLUMN doctor_id TYPE TEXT USING doctor_id::TEXT;
    END IF;
  END IF;

  ALTER TABLE historia_clinica_ortodoncia ALTER COLUMN doctor_id DROP NOT NULL;
END $$;

-- ============================================================
-- 2. historia_clinica_ortodoncia_versions.doctor_id -> TEXT
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'historia_clinica_ortodoncia_versions'
      AND column_name = 'doctor_id'
  ) THEN
    ALTER TABLE historia_clinica_ortodoncia_versions ADD COLUMN doctor_id TEXT;
  ELSE
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'historia_clinica_ortodoncia_versions'
        AND column_name = 'doctor_id'
        AND data_type IN ('uuid', 'character varying', 'varchar')
    ) THEN
      ALTER TABLE historia_clinica_ortodoncia_versions
        ALTER COLUMN doctor_id TYPE TEXT USING doctor_id::TEXT;
    END IF;
  END IF;

  ALTER TABLE historia_clinica_ortodoncia_versions ALTER COLUMN doctor_id DROP NOT NULL;
END $$;

-- ============================================================
-- 3. RLS policies: drop restrictive/legacy ones, add permissive ones
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'historia_clinica_ortodoncia',
    'historia_clinica_ortodoncia_versions'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      -- Drop all legacy policies (idempotent)
      EXECUTE format('DROP POLICY IF EXISTS "Doctors can view their patients'' orthodontic history" ON %I', t);
      EXECUTE format('DROP POLICY IF EXISTS "Doctors can insert their patients'' orthodontic history" ON %I', t);
      EXECUTE format('DROP POLICY IF EXISTS "Doctors can update their patients'' orthodontic history" ON %I', t);
      EXECUTE format('DROP POLICY IF EXISTS "Doctors can delete their patients'' orthodontic history" ON %I', t);
      EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users to view orthodontic history" ON %I', t);
      EXECUTE format('DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON %I', t);
      EXECUTE format('DROP POLICY IF EXISTS "Allow all operations for all users" ON %I', t);

      -- SELECT policy (the missing piece from 20260807000300)
      EXECUTE format('DROP POLICY IF EXISTS "anon_select_%s" ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY "anon_select_%s" ON %I FOR SELECT USING (auth.role() IN (%L, %L))',
        t, t, 'authenticated', 'anon'
      );

      -- INSERT / UPDATE / DELETE (same as 20260807000300)
      EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY "anon_insert_%s" ON %I FOR INSERT WITH CHECK (auth.role() IN (%L, %L))',
        t, t, 'authenticated', 'anon'
      );

      EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY "anon_update_%s" ON %I FOR UPDATE USING (auth.role() IN (%L, %L))',
        t, t, 'authenticated', 'anon'
      );

      EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY "anon_delete_%s" ON %I FOR DELETE USING (auth.role() IN (%L, %L))',
        t, t, 'authenticated', 'anon'
      );

      -- Make sure RLS is enabled so the policies apply
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 4. Verification
-- ============================================================
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('historia_clinica_ortodoncia', 'historia_clinica_ortodoncia_versions')
  AND column_name = 'doctor_id'
ORDER BY table_name;

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('historia_clinica_ortodoncia', 'historia_clinica_ortodoncia_versions')
ORDER BY tablename, policyname;
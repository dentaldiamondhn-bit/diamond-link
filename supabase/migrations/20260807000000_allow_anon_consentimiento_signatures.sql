-- Allow anon/authenticated signature uploads to the consentimientos_signature bucket.
-- Run this in the Supabase SQL Editor.
--
-- Since commit 3ce012c ("switch app-facing routes to anon Supabase key with RLS policies",
-- Aug 5 2026) the signature upload server action uses the anon key
-- (lib/supabase/server.ts). The table RLS policies were added for that switch, but the
-- storage.objects policies for the consentimientos_signature bucket were missing, so
-- signature uploads fail with:
--   "new row violates row-level security policy"
-- The bucket is already public for reads (public URLs return the stored PNGs).

-- INSERT (upload signatures)
DROP POLICY IF EXISTS "Allow anon to upload consentimiento signatures" ON storage.objects;
CREATE POLICY "Allow anon to upload consentimiento signatures" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'consentimientos_signature');

-- UPDATE (upsert overwrites existing files)
DROP POLICY IF EXISTS "Allow anon to update consentimiento signatures" ON storage.objects;
CREATE POLICY "Allow anon to update consentimiento signatures" ON storage.objects
  FOR UPDATE TO anon
  USING (bucket_id = 'consentimientos_signature')
  WITH CHECK (bucket_id = 'consentimientos_signature');

-- SELECT (list signature files)
DROP POLICY IF EXISTS "Allow anon to list consentimiento signatures" ON storage.objects;
CREATE POLICY "Allow anon to list consentimiento signatures" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'consentimientos_signature');

-- DELETE (removing signatures when a consentimiento is deleted)
DROP POLICY IF EXISTS "Allow anon to delete consentimiento signatures" ON storage.objects;
CREATE POLICY "Allow anon to delete consentimiento signatures" ON storage.objects
  FOR DELETE TO anon
  USING (bucket_id = 'consentimientos_signature');

-- Same set for the authenticated role (in case the app later uses user sessions)
DROP POLICY IF EXISTS "Allow authenticated to upload consentimiento signatures" ON storage.objects;
CREATE POLICY "Allow authenticated to upload consentimiento signatures" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'consentimientos_signature');

DROP POLICY IF EXISTS "Allow authenticated to update consentimiento signatures" ON storage.objects;
CREATE POLICY "Allow authenticated to update consentimiento signatures" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'consentimientos_signature')
  WITH CHECK (bucket_id = 'consentimientos_signature');

DROP POLICY IF EXISTS "Allow authenticated to delete consentimiento signatures" ON storage.objects;
CREATE POLICY "Allow authenticated to delete consentimiento signatures" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'consentimientos_signature');

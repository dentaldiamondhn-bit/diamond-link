-- Chat attachment upload fix (Phase 3 support).
--
-- PROBLEM
-- App-facing routes use the anon Supabase client (src/lib/supabase/server.ts).
-- The old code tried to create the `chat-uploads` bucket at runtime with that
-- client, which always fails under storage.buckets RLS
-- ("new row violates row-level security policy") — the bucket/policies must be
-- provisioned here, by migration. Additionally the bucket's allowed_mime_types
-- was restricted to images + PDF, so document attachments (.docx, .xlsx, …)
-- were rejected regardless.
--
-- THIS MIGRATION
-- 1. Ensures `chat-uploads` exists, is public, 10 MB limit, and accepts ANY
--    mime type (pictures + documents). Idempotent (upsert by bucket id).
-- 2. Re-creates anon + authenticated storage.objects policies (INSERT/
--    SELECT/UPDATE/DELETE scoped to this bucket) so the anon client works.
--
-- Deterministic: safe to re-run.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-uploads', 'chat-uploads', true, 10485760, null)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

DO $$
DECLARE
  b text := 'chat-uploads';
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS "Allow anon to upload %s" ON storage.objects', b);
  EXECUTE format(
    'CREATE POLICY "Allow anon to upload %s" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = %L)',
    b, b
  );

  EXECUTE format('DROP POLICY IF EXISTS "Allow anon to update %s" ON storage.objects', b);
  EXECUTE format(
    'CREATE POLICY "Allow anon to update %s" ON storage.objects FOR UPDATE TO anon USING (bucket_id = %L) WITH CHECK (bucket_id = %L)',
    b, b, b
  );

  EXECUTE format('DROP POLICY IF EXISTS "Allow anon to list %s" ON storage.objects', b);
  EXECUTE format(
    'CREATE POLICY "Allow anon to list %s" ON storage.objects FOR SELECT TO anon USING (bucket_id = %L)',
    b, b
  );

  EXECUTE format('DROP POLICY IF EXISTS "Allow anon to delete %s" ON storage.objects', b);
  EXECUTE format(
    'CREATE POLICY "Allow anon to delete %s" ON storage.objects FOR DELETE TO anon USING (bucket_id = %L)',
    b, b
  );

  EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated to upload %s" ON storage.objects', b);
  EXECUTE format(
    'CREATE POLICY "Allow authenticated to upload %s" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L)',
    b, b
  );

  EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated to update %s" ON storage.objects', b);
  EXECUTE format(
    'CREATE POLICY "Allow authenticated to update %s" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L) WITH CHECK (bucket_id = %L)',
    b, b, b
  );

  EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated to delete %s" ON storage.objects', b);
  EXECUTE format(
    'CREATE POLICY "Allow authenticated to delete %s" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L)',
    b, b
  );
END $$;
-- Create the storage buckets referenced by the app that were never created, plus the
-- anon/authenticated storage.objects policies so the app-facing anon client can use them.
-- Run this in the Supabase SQL Editor.
--
-- - doctor-profiles : used by supabaseDoctorService.uploadProfileImage
-- - chat-uploads    : used by app/api/chat/upload/route.ts (previously tried to
--                     createBucket at runtime with the anon client, which fails)

-- Create buckets if they don't already exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'doctor-profiles',
  'doctor-profiles',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-uploads',
  'chat-uploads',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- storage.objects policies for anon + authenticated (same pattern as the other buckets)
DO $$
DECLARE
  b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['doctor-profiles', 'chat-uploads']
  LOOP
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
  END LOOP;
END $$;

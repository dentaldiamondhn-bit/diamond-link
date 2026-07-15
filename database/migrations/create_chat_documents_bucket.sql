-- Create bucket for chat document uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
SELECT
  'documents',
  'documents',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']::text[],
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'documents'
);

-- Allow authenticated users to upload documents
CREATE POLICY IF NOT EXISTS "Allow all users to upload documents"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to read documents
CREATE POLICY IF NOT EXISTS "Allow all users to read documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Allow authenticated users to delete their own documents
CREATE POLICY IF NOT EXISTS "Allow all users to delete documents"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'documents');

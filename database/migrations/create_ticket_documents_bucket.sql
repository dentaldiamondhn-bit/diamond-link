-- Create bucket for ticket documents
-- Run this in Supabase SQL Editor

-- Create the ticket-documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
VALUES (
  'ticket-documents',
  'ticket-documents',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Create policies for the ticket-documents bucket

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload ticket documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-documents');

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated users to read ticket documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'ticket-documents');

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated users to update ticket documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'ticket-documents');

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete ticket documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'ticket-documents');

-- Allow service role to manage all
CREATE POLICY "Allow service role to manage ticket documents"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'ticket-documents')
WITH CHECK (bucket_id = 'ticket-documents');

-- Note: If you want to allow public read access, add this policy:
-- CREATE POLICY "Allow public to read ticket documents"
-- ON storage.objects
-- FOR SELECT
-- TO public
-- USING (bucket_id = 'ticket-documents');

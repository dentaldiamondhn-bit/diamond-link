-- Create orthodontic-documents bucket for storing orthodontic treatment files
-- Run this in your Supabase SQL editor

-- Create storage bucket for orthodontic documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'orthodontic-documents',
  'orthodontic-documents',
  true,
  52428800, -- 50MB per file
  Array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp', 
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/rtf',
    'application/zip',
    'application/x-rar-compressed',
    'application/json',
    'application/xml'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Create Row Level Security (RLS) policies for the bucket
-- Allow public read access to orthodontic documents
CREATE POLICY "Public Access Orthodontic Documents" ON storage.objects
FOR SELECT USING (bucket_id = 'orthodontic-documents');

-- Allow authenticated users to upload orthodontic documents
CREATE POLICY "Users can upload orthodontic documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'orthodontic-documents' AND 
  auth.role() = 'authenticated'
);

-- Allow users to update their own orthodontic documents
CREATE POLICY "Users can update own orthodontic documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'orthodontic-documents' AND 
  auth.role() = 'authenticated'
);

-- Allow users to delete their own orthodontic documents
CREATE POLICY "Users can delete own orthodontic documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'orthodontic-documents' AND 
  auth.role() = 'authenticated'
);

-- Grant necessary permissions
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO anon;
GRANT SELECT ON storage.objects TO anon;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orthodontic_docs_bucket ON storage.objects(bucket_id);
CREATE INDEX IF NOT EXISTS idx_orthodontic_docs_name ON storage.objects(name);

-- Optional: Create function to extract patient ID from file path
CREATE OR REPLACE FUNCTION get_patient_id_from_path(path text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT split_part(path, '/', 1);
$$;

-- Optional: Create view for orthodontic documents with patient info
CREATE OR REPLACE VIEW orthodontic_documents_view AS
SELECT 
  o.id,
  o.name,
  o.bucket_id,
  o.owner,
  o.created_at,
  o.updated_at,
  o.last_accessed_at,
  o.etag,
  split_part(o.name, '/', 1) as patient_id,
  o.size,
  o.content_type
FROM storage.objects o
WHERE o.bucket_id = 'orthodontic-documents';

-- Grant access to the view
GRANT SELECT ON orthodontic_documents_view TO authenticated;
GRANT SELECT ON orthodontic_documents_view TO anon;

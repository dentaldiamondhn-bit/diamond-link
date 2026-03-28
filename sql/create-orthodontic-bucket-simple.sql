-- Create orthodontic-documents bucket for storing orthodontic treatment files
-- Run this in your Supabase SQL editor (simplified version)

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

-- Note: RLS policies may need to be created by the superuser or via Supabase dashboard
-- You can create policies manually in the Supabase dashboard:
-- 1. Go to Storage > orthodontic-documents
-- 2. Click "Policies" 
-- 3. Create these policies:
--    - Public Access (SELECT): bucket_id = 'orthodontic-documents'
--    - Upload Access (INSERT): bucket_id = 'orthodontic-documents' AND auth.role() = 'authenticated'
--    - Update Access (UPDATE): bucket_id = 'orthodontic-documents' AND auth.role() = 'authenticated'
--    - Delete Access (DELETE): bucket_id = 'orthodontic-documents' AND auth.role() = 'authenticated'

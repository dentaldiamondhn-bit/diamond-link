-- Create signatures bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signatures', 
  'signatures', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg']
) ON CONFLICT (id) DO NOTHING;

-- Create policies for the signatures bucket
-- Allow public access to read signatures
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'signatures');

-- Allow authenticated users to upload signatures
CREATE POLICY "Authenticated users can upload signatures" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'signatures' AND 
  auth.role() = 'authenticated'
);

-- Allow users to update their own signatures
CREATE POLICY "Users can update own signatures" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'signatures' AND 
  auth.role() = 'authenticated'
);

-- Allow users to delete their own signatures  
CREATE POLICY "Users can delete own signatures" ON storage.objects
FOR DELETE USING (
  bucket_id = 'signatures' AND 
  auth.role() = 'authenticated'
);

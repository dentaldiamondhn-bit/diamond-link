-- Run this SQL in Supabase Dashboard > SQL Editor

-- Add columns to timeline_notes
ALTER TABLE public.timeline_notes
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

ALTER TABLE public.timeline_notes
  ADD COLUMN IF NOT EXISTS created_by_image TEXT;

ALTER TABLE public.timeline_notes
  ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE public.timeline_notes
  ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

-- Add columns to timeline_note_comments
ALTER TABLE public.timeline_note_comments
  ADD COLUMN IF NOT EXISTS user_image TEXT;

ALTER TABLE public.timeline_note_comments
  ADD COLUMN IF NOT EXISTS user_role TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_timeline_note_comments_note_id ON public.timeline_note_comments(note_id);
CREATE INDEX IF NOT EXISTS idx_timeline_note_comments_created_at ON public.timeline_note_comments(created_at);

-- Disable RLS on comments table
ALTER TABLE public.timeline_note_comments DISABLE ROW LEVEL SECURITY;

-- Verify columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name IN ('timeline_notes', 'timeline_note_comments')
AND column_name IN ('created_by_name', 'created_by_image', 'updated_by', 'updated_by_name', 'user_image', 'user_role');

-- Update existing notes with user data (optional, for backfilling)
-- This will be done automatically by the API when fetching
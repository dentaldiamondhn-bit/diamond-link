-- =============================================================
-- Migration: 20260528000001_enhance_timeline_notes
-- Enhances timeline_notes with rich-text JSON content,
-- checklist support, and a new comments/conversation table.
-- =============================================================

-- 1) Alter timeline_notes: change content column from TEXT to JSONB
--    to support rich-text formatting, checklists, and structured blocks.
--    Existing plain-text notes are preserved as a single text block.
ALTER TABLE public.timeline_notes
  ALTER COLUMN content TYPE JSONB USING
    CASE
      WHEN content IS NOT NULL AND content::text != ''
      THEN jsonb_build_object('blocks', jsonb_build_array(
        jsonb_build_object(
          'type', 'text',
          'text', content::text,
          'formats', jsonb_build_object()
        )
      ))
      ELSE NULL
    END;

-- 2) Add a column to store the user display name at creation time
--    so we can show "Added by: John" in the conversation view
ALTER TABLE public.timeline_notes
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- Add created_by_image column for user avatar display
ALTER TABLE public.timeline_notes
  ADD COLUMN IF NOT EXISTS created_by_image TEXT;

-- 3) Add a column to track the user who last updated the note
ALTER TABLE public.timeline_notes
  ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE public.timeline_notes
  ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

-- 4) Create timeline_note_comments table for threaded conversations
CREATE TABLE IF NOT EXISTS public.timeline_note_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.timeline_notes(id) ON DELETE CASCADE,
  user_id TEXT,
  user_name TEXT,
  user_image TEXT,
  user_role TEXT,
  message JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add user_image and user_role columns if they don't exist
ALTER TABLE public.timeline_note_comments 
  ADD COLUMN IF NOT EXISTS user_image TEXT;

ALTER TABLE public.timeline_note_comments 
  ADD COLUMN IF NOT EXISTS user_role TEXT;

-- Indexes for comments
CREATE INDEX IF NOT EXISTS idx_timeline_note_comments_note_id ON public.timeline_note_comments(note_id);
CREATE INDEX IF NOT EXISTS idx_timeline_note_comments_created_at ON public.timeline_note_comments(created_at);

-- Disable RLS on comments table (consistent with timeline_notes)
ALTER TABLE public.timeline_note_comments DISABLE ROW LEVEL SECURITY;

-- Disable RLS on timeline_notes to match timeline_note_comments behavior
-- This migration fixes the RLS issue preventing the notas-linea-de-tiempo page
-- from reading/creating timeline notes. The app authenticates with Clerk (not
-- Supabase Auth) and uses the anon key, so auth.role() RLS policies never pass.

-- Disable Row Level Security
ALTER TABLE public.timeline_notes DISABLE ROW LEVEL SECURITY;

-- Grant broad permissions (matching other tables used by the app)
GRANT ALL ON public.timeline_notes TO anon;
GRANT ALL ON public.timeline_notes TO authenticated;
GRANT ALL ON public.timeline_notes TO service_role;

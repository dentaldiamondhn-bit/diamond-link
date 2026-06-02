-- Create timeline_notes table for patient timeline notes
CREATE TABLE IF NOT EXISTS public.timeline_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES public.patients(paciente_id),
  user_id TEXT,
  title TEXT NOT NULL DEFAULT 'Nota',
  content TEXT,
  note_date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timeline_notes_paciente_id ON public.timeline_notes(paciente_id);
CREATE INDEX IF NOT EXISTS idx_timeline_notes_note_date ON public.timeline_notes(note_date);

-- Disable RLS (service role key bypasses RLS, consistent with other tables like patient_follow_up_status)
ALTER TABLE public.timeline_notes DISABLE ROW LEVEL SECURITY;

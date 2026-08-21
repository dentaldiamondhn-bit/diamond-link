-- Create patient_follow_up_notes table for comment-style notes on follow-up statuses
CREATE TABLE IF NOT EXISTS public.patient_follow_up_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follow_up_status_id UUID NOT NULL REFERENCES public.patient_follow_up_status(id) ON DELETE CASCADE,
  user_id TEXT,
  user_name TEXT,
  user_image TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patient_follow_up_notes_status_id ON public.patient_follow_up_notes(follow_up_status_id);
CREATE INDEX IF NOT EXISTS idx_patient_follow_up_notes_created_at ON public.patient_follow_up_notes(created_at);

-- RLS
ALTER TABLE public.patient_follow_up_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view follow-up notes" ON public.patient_follow_up_notes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert follow-up notes" ON public.patient_follow_up_notes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete follow-up notes" ON public.patient_follow_up_notes
  FOR DELETE USING (auth.role() = 'authenticated');

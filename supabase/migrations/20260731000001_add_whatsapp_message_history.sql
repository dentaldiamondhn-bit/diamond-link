-- Create whatsapp_message_history table for tracking sent messages
CREATE TABLE IF NOT EXISTS public.whatsapp_message_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES public.patients(paciente_id),
  follow_up_status_id UUID REFERENCES public.patient_follow_up_status(id),
  message_text TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  sent_by TEXT NOT NULL,
  sent_by_name TEXT DEFAULT '',
  sent_by_image TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for faster lookups by patient
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_history_paciente_id ON public.whatsapp_message_history(paciente_id);

-- Enable RLS
ALTER TABLE public.whatsapp_message_history ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can view message history
CREATE POLICY "Users can view whatsapp message history" ON public.whatsapp_message_history
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- Policy: authenticated users can insert message history
CREATE POLICY "Users can insert whatsapp message history" ON public.whatsapp_message_history
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Policy: authenticated users can delete message history
CREATE POLICY "Users can delete whatsapp message history" ON public.whatsapp_message_history
  FOR DELETE USING (
    auth.role() = 'authenticated'
  );

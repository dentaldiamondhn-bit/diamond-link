-- Add custom_whatsapp_message column to patient_follow_up_status for per-patient custom messages
ALTER TABLE public.patient_follow_up_status
  ADD COLUMN IF NOT EXISTS custom_whatsapp_message TEXT;

-- Create whatsapp_templates table for global message templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL UNIQUE,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read templates
CREATE POLICY "Users can view whatsapp templates" ON public.whatsapp_templates
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- Policy: authenticated users can upsert templates
CREATE POLICY "Users can upsert whatsapp templates" ON public.whatsapp_templates
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update whatsapp templates" ON public.whatsapp_templates
  FOR UPDATE USING (
    auth.role() = 'authenticated'
  );

-- Create whatsapp_templates_history table for tracking global template changes
CREATE TABLE IF NOT EXISTS public.whatsapp_templates_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  message_text TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  changed_by TEXT NOT NULL,
  changed_by_name TEXT,
  changed_by_image TEXT
);

-- Create index for faster lookups by tipo
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_history_tipo ON public.whatsapp_templates_history(tipo);

-- Enable RLS
ALTER TABLE public.whatsapp_templates_history ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can view template history
CREATE POLICY "Users can view whatsapp templates history" ON public.whatsapp_templates_history
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- Policy: authenticated users can insert template history
CREATE POLICY "Users can insert whatsapp templates history" ON public.whatsapp_templates_history
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );
-- Create patient_follow_up_status table to track follow-up communication status
CREATE TABLE IF NOT EXISTS public.patient_follow_up_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES public.patients(paciente_id),
  treatment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  follow_up_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  whatsapp_sent BOOLEAN DEFAULT FALSE NOT NULL,
  patient_responded BOOLEAN DEFAULT FALSE NOT NULL,
  appointment_scheduled BOOLEAN DEFAULT FALSE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patient_follow_up_status_paciente_id ON public.patient_follow_up_status(paciente_id);
CREATE INDEX IF NOT EXISTS idx_patient_follow_up_status_treatment_date ON public.patient_follow_up_status(treatment_date);
CREATE INDEX IF NOT EXISTS idx_patient_follow_up_status_follow_up_date ON public.patient_follow_up_status(follow_up_date);

-- Add RLS policies
ALTER TABLE public.patient_follow_up_status ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see follow-up status for their patients
CREATE POLICY "Users can view patient follow-up status" ON public.patient_follow_up_status
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- Policy: Users can insert follow-up status records
CREATE POLICY "Users can insert patient follow-up status" ON public.patient_follow_up_status
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Policy: Users can update follow-up status records
CREATE POLICY "Users can update patient follow-up status" ON public.patient_follow_up_status
  FOR UPDATE USING (
    auth.role() = 'authenticated'
  );

-- Policy: Users can delete follow-up status records
CREATE POLICY "Users can delete patient follow-up status" ON public.patient_follow_up_status
  FOR DELETE USING (
    auth.role() = 'authenticated'
  );

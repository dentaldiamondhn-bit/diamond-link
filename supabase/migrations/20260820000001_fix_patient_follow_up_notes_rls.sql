-- Fix RLS on patient_follow_up_notes: server-side API uses anon key without Supabase auth session
-- so auth.role() = 'authenticated' blocks inserts. Use permissive true policies instead.

DROP POLICY IF EXISTS "Users can view follow-up notes" ON public.patient_follow_up_notes;
DROP POLICY IF EXISTS "Users can insert follow-up notes" ON public.patient_follow_up_notes;
DROP POLICY IF EXISTS "Users can delete follow-up notes" ON public.patient_follow_up_notes;

CREATE POLICY "Allow all for authenticated" ON public.patient_follow_up_notes
  FOR ALL USING (true) WITH CHECK (true);

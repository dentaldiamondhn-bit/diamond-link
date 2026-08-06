-- Allow anon-role access to WhatsApp template/history tables.
-- The API routes previously used SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS).
-- They now use the anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY), so the policies must
-- permit the anon role. Authorization is still enforced in the route handlers via Clerk.

-- whatsapp_templates: SELECT / INSERT / UPDATE (upsert)
DROP POLICY IF EXISTS "Users can view whatsapp templates" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "Users can upsert whatsapp templates" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "Users can update whatsapp templates" ON public.whatsapp_templates;

CREATE POLICY "Users can view whatsapp templates" ON public.whatsapp_templates
  FOR SELECT USING (
    auth.role() IN ('authenticated', 'anon')
  );

CREATE POLICY "Users can upsert whatsapp templates" ON public.whatsapp_templates
  FOR INSERT WITH CHECK (
    auth.role() IN ('authenticated', 'anon')
  );

CREATE POLICY "Users can update whatsapp templates" ON public.whatsapp_templates
  FOR UPDATE USING (
    auth.role() IN ('authenticated', 'anon')
  );

-- whatsapp_templates_history: SELECT / INSERT / DELETE
DROP POLICY IF EXISTS "Users can view whatsapp templates history" ON public.whatsapp_templates_history;
DROP POLICY IF EXISTS "Users can insert whatsapp templates history" ON public.whatsapp_templates_history;
DROP POLICY IF EXISTS "Users can delete whatsapp templates history" ON public.whatsapp_templates_history;

CREATE POLICY "Users can view whatsapp templates history" ON public.whatsapp_templates_history
  FOR SELECT USING (
    auth.role() IN ('authenticated', 'anon')
  );

CREATE POLICY "Users can insert whatsapp templates history" ON public.whatsapp_templates_history
  FOR INSERT WITH CHECK (
    auth.role() IN ('authenticated', 'anon')
  );

CREATE POLICY "Users can delete whatsapp templates history" ON public.whatsapp_templates_history
  FOR DELETE USING (
    auth.role() IN ('authenticated', 'anon')
  );

-- whatsapp_message_history: SELECT / INSERT / DELETE
DROP POLICY IF EXISTS "Users can view whatsapp message history" ON public.whatsapp_message_history;
DROP POLICY IF EXISTS "Users can insert whatsapp message history" ON public.whatsapp_message_history;
DROP POLICY IF EXISTS "Users can delete whatsapp message history" ON public.whatsapp_message_history;

CREATE POLICY "Users can view whatsapp message history" ON public.whatsapp_message_history
  FOR SELECT USING (
    auth.role() IN ('authenticated', 'anon')
  );

CREATE POLICY "Users can insert whatsapp message history" ON public.whatsapp_message_history
  FOR INSERT WITH CHECK (
    auth.role() IN ('authenticated', 'anon')
  );

CREATE POLICY "Users can delete whatsapp message history" ON public.whatsapp_message_history
  FOR DELETE USING (
    auth.role() IN ('authenticated', 'anon')
  );

-- Calendario Phase 5b (reminders) — in-DB scheduler that makes reminders fire
-- reliably WITHOUT depending on the sparse GitHub Actions cron.
--
-- Why: GitHub Actions scheduled workflows run ~hourly in practice (only 5 runs
-- over several days), so calendar reminders arrive late or never — and the user
-- requirement is that notifications must reach devices even when the PWA/browser
-- is closed (exactly like chat push, which is driven by the pg_net webhooks in
-- 20260906b / 20260910a).
--
-- Fix: a pg_cron job tick every minute calls
--   public.calendario_dispatch_reminders_via_http()  (SECURITY DEFINER)
-- which POSTs to /api/cron/reminders (the same dispatcher GitHub Actions hits)
-- with the x-cron-secret header. The dispatcher's lean window + per-source
-- guard columns make over-dispatch harmless: only not-yet-sent due reminders
-- are delivered, so pg_cron + the GH cron can coexist without double-firing.
--
-- ⚠️ pg_net safety guard: no-op unless the `net` schema exists (same precedent
--    as the chat/calendar webhook migrations).
-- ⚠️ pg_cron guard: if the extension is not installed the DO block only NOTICEs —
--    calendar writes are never blocked. Enable pg_cron in the Supabase dashboard
--    (Database → Extensions → "pg_cron") and re-run this migration to schedule.
-- ⚠️ CHANGE ME: _secret must equal the CRON_SECRET in Vercel Production env
--    (the route answers 401 otherwise). Run this from the SQL editor.
-- ⚠️ Idempotent: cron.schedule upserts the job by name; CREATE OR REPLACE the fn.

CREATE OR REPLACE FUNCTION public.calendario_dispatch_reminders_via_http()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _base_url TEXT := 'https://app.dentaldiamondhn.com';
  _secret   TEXT := 'CHANGE_ME_CRON_SECRET';
  _resp     BIGINT;
BEGIN
  -- Skip silently when pg_net is not installed.
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'net') THEN
    RETURN;
  END IF;

  SELECT net.http_post(
    url     := _base_url || '/api/cron/reminders',
    body    := jsonb_build_object('trigger', 'pg_cron'),
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-cron-secret',    _secret)
  ) INTO _resp;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron is not installed — the in-DB reminder scheduler is skipped. Enable it in the Supabase dashboard (Database → Extensions → pg_cron) and re-run this migration to schedule.';
    RETURN;
  END IF;
  -- Upsert by job name so re-running this migration updates, never duplicates.
  PERFORM cron.schedule(
    'calendario-reminders',
    '* * * * *',
    $$SELECT public.calendario_dispatch_reminders_via_http();$$
  );
END;
$$;

-- Manual smoke test (due reminders dispatched immediately):
--   SELECT public.calendario_dispatch_reminders_via_http();
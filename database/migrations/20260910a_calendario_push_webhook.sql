-- Calendario Phase 5 (push notifications) — server-side triggers for closed-tab
-- delivery of calendar events and invitations.
--
-- Mirrors the chat pattern (20260906b_chat_messages_push_webhook.sql):
--   events INSERT/UPDATE  → POST /api/push/calendar-webhook  ("nueva cita" /
--                            "cita movida" / "cita cancelada" → invitees)
--   event_invitees INSERT → POST /api/push/calendar-webhook  ("te invitaron" →
--                            the invited user)
-- The webhook route resolves recipients, builds the tray payload and fans out
-- web-push via the same VAPID / push_subscriptions / public/sw.js pipeline as
-- chat. Nothing here blocks calendar writes: the HTTP call is fire-and-forget
-- and the trigger is a silent no-op when pg_net is not installed.
--
-- ⚠️ pg_net safety guard: no-op unless the `net` schema exists (see the chat
--    migration for the history on why this matters).
-- ⚠️ Call shape: use NAMED args (headers :=) — net.http_post's 4th param is
--    `headers`; passing it positionally puts the secret into the query string.
-- ⚠️ CHANGE ME: set _base_url to your deployment origin and _secret to the same
--    PUSH_WEBHOOK_SECRET value the chat trigger already uses (otherwise the
--    route answers 401). To smoke-test against localhost first, temporarily set
--    _base_url to http://localhost:3000, run the app, and watch the route logs.
--
-- Prerequisite: pg_net extension enabled (already true — chat push is live).

CREATE OR REPLACE FUNCTION public.notify_calendar_event_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _base_url  TEXT := 'https://app.dentaldiamondhn.com';
  _secret    TEXT := 'CHANGE_ME_PUSH_WEBHOOK_SECRET';
  _resp      BIGINT;
  _cosmetic  BOOLEAN;
BEGIN
  -- Skip silently when pg_net is not installed, so calendar writes never fail.
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'net') THEN
    RETURN NEW;
  END IF;

  -- UPDATE: only fire when the notification-relevant fields actually change
  -- (notes-only edits must not re-notify invitees).
  IF TG_OP = 'UPDATE' THEN
    _cosmetic := (
      NEW.date IS NOT DISTINCT FROM OLD.date
      AND NEW.start_time IS NOT DISTINCT FROM OLD.start_time
      AND NEW.end_time IS NOT DISTINCT FROM OLD.end_time
      AND NEW.dentist IS NOT DISTINCT FROM OLD.dentist
      AND NEW.status IS NOT DISTINCT FROM OLD.status
      AND NEW.patient_name IS NOT DISTINCT FROM OLD.patient_name
      AND NEW.title IS NOT DISTINCT FROM OLD.title
    );
    IF _cosmetic THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT net.http_post(
    url     := _base_url || '/api/push/calendar-webhook',
    body    := jsonb_build_object(
      'type',   TG_OP,
      'table',  'events',
      'record', jsonb_build_object(
        'id',           NEW.id,
        'user_id',      NEW.user_id,
        'title',        NEW.title,
        'patient_name', NEW.patient_name,
        'date',         NEW.date,
        'start_time',   NEW.start_time,
        'end_time',     NEW.end_time,
        'dentist',      NEW.dentist,
        'status',       NEW.status,
        'event_type',   NEW.event_type
      ),
      'old', NULL),
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', _secret)
  ) INTO _resp;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calendar_event_push_webhook ON events;
CREATE TRIGGER trg_calendar_event_push_webhook
AFTER INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION public.notify_calendar_event_webhook();

-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_calendar_invite_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _base_url  TEXT := 'https://app.dentaldiamondhn.com';
  _secret    TEXT := 'CHANGE_ME_PUSH_WEBHOOK_SECRET';
  _resp      BIGINT;
BEGIN
  -- Skip silently when pg_net is not installed, so calendar writes never fail.
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'net') THEN
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url     := _base_url || '/api/push/calendar-webhook',
    body    := jsonb_build_object(
      'type',   'INSERT',
      'table',  'event_invitees',
      'record', jsonb_build_object(
        'event_id',   NEW.event_id,
        'user_id',    NEW.user_id,
        'status',     NEW.status,
        'created_by', NEW.created_by
      )),
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', _secret)
  ) INTO _resp;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calendar_invite_push_webhook ON event_invitees;
CREATE TRIGGER trg_calendar_invite_push_webhook
AFTER INSERT ON event_invitees
FOR EACH ROW
EXECUTE FUNCTION public.notify_calendar_invite_webhook();
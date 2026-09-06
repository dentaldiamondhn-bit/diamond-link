-- Phase 5 (push notifications) — OPTIONAL server-side trigger for closed-tab
-- and fully-offline delivery.
--
-- The client fires /api/push/send while the tab is hidden-but-open; this
-- trigger is the equivalent for when NO tab of the app is running, by POSTing
-- every new chat_messages row to /api/push/webhook, which fans out web-push to
-- the other participants' subscriptions.
--
-- Prerequisites:
--   1) Enable the `pg_net` extension in the Supabase Dashboard
--      (Database -> Extensions -> pg_net -> Enable).
--   2) Replace the _base_url and _secret constants below with your deployment
--      (host + PUSH_WEBHOOK_SECRET from your app env).
--   3) Run this file in the SQL Editor.
-- If /api/push/webhook is unreachable the trigger logs to net._http_response
-- but never blocks chat writes.

CREATE OR REPLACE FUNCTION public.notify_chat_message_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- CHANGE ME: your app origin and the PUSH_WEBHOOK_SECRET env value.
  _base_url TEXT := 'https://app.dentaldiamondhn.com';
  _secret   TEXT := 'CHANGE_ME_PUSH_WEBHOOK_SECRET';
  _resp     BIGINT;
BEGIN
  -- System messages and soft-deletes are in-app only, never pushed.
  IF NEW.message_type = 'system' OR NEW.is_deleted THEN
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url     := _base_url || '/api/push/webhook',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', _secret
    ),
    body    := jsonb_build_object(
      'type',   'INSERT',
      'table',  'chat_messages',
      'record', jsonb_build_object(
        'id',             NEW.id,
        'conversation_id', NEW.conversation_id,
        'sender_id',       NEW.sender_id,
        'content',         NEW.content,
        'message_type',    NEW.message_type,
        'created_at',      NEW.created_at
      )
    )::text
  ) INTO _resp;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_messages_push_webhook ON chat_messages;
CREATE TRIGGER trg_chat_messages_push_webhook
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_chat_message_webhook();
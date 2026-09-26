-- Tickets realtime.
--
-- PROBLEM: status changes and comments saved from the tickets pages
-- (app/(auth)/tickets/page.tsx and app/(auth)/tech-support/tickets/page.tsx)
-- don't appear live for any role. The writes land in Postgres and the page's
-- `postgres_changes` channel joins, but the Realtime server rejects the whole
-- channel:
--
--   Unable to subscribe to changes with given parameters. Please check
--   Realtime is enabled for the given connect parameters:
--   [event: *, schema: public, table: tickets, filters: [], select: nil]
--
-- ROOT CAUSE: none of the four ticket tables were ever added to the
-- `supabase_realtime` publication, so no WAL is decoded for them. Every other
-- realtime-backed feature in this repo ships a dedicated publication migration
-- (notifications, patient_follow_up_*, contacts, calendario); the ticket system
-- was the only one missing it. Verified live against
-- hmtkayufelqyfytpmdtl: 13/13 non-ticket tables accept the binding, 4/4 ticket
-- tables are rejected.
--
-- WORTH KNOWING: one unpublishable table poisons the ENTIRE channel. A channel
-- carrying both `tickets` and `ticket_activities` received ZERO events for both,
-- because the server tears down postgres_changes for the whole channel when any
-- single binding fails. That is why the page showed nothing at all rather than
-- partially.
--
-- WHY BOTH `tickets` AND `ticket_activities` MATTER: they are different tables
-- with different content. Status/priority/assignee changes are UPDATEs on
-- `tickets`; comments are INSERTs on `ticket_activities` (see
-- TicketService.addComment -> createActivity, src/services/ticketService.ts:587).
-- Publishing only `tickets` would fix status but leave comments dead, because no
-- client binding exists on the activities table yet.
--
-- FIXES (all in one script, safe to re-run):
--   1) Publish tickets, ticket_activities, ticket_assignees and
--      ticket_attachments on `supabase_realtime` (idempotent).
--   2) Set REPLICA IDENTITY FULL on all four so UPDATE payloads carry the full
--      new row and DELETE carries the full old row.
--   3) Index the columns the clients filter on, so a filtered realtime
--      subscription does not seq-scan the WAL.
--
-- DELIBERATELY NOT TOUCHING RLS HERE — read before assuming this is a security
-- fix. `tickets` and `ticket_activities` are currently readable in full by the
-- PUBLIC ANON key: anon and service_role return identical row counts (verified
-- live: 27 tickets / 106 activities), because the policies in
-- 20250308000004_enhance_tech_support_access.sql gate on `auth.uid()`, which is
-- NULL for this app's Clerk-only browser session, so no policy ever matches and
-- the tables read as open. Tightening that here would BREAK every ticket write,
-- because TicketService performs all writes through the ANON client
-- (createTicket, updateTicket, addComment, addAttachment, deleteAttachment).
-- Locking this down is a separate change that must first move ticket writes
-- behind a service-role API route. Publishing does not widen the exposure: the
-- same rows are already readable through PostgREST with the anon key that ships
-- in the client bundle.
--
-- RUN ONCE PER ENVIRONMENT in the Supabase SQL editor, same as the previous
-- realtime migrations.
--
-- !! REQUIRED AFTER APPLYING: hosted Realtime caches the publication set at
-- boot. This script alone is NOT sufficient — restart the project or the
-- bindings will keep being rejected:
--     POST https://api.supabase.com/v1/projects/<ref>/restart
-- Verify with:
--     SELECT tablename FROM pg_publication_tables
--     WHERE pubname = 'supabase_realtime' AND tablename LIKE 'ticket%';

-- 1) Publication (idempotent)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tickets',
    'ticket_activities',
    'ticket_assignees',
    'ticket_attachments'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END
$$;

-- 2) Full replica identity: UPDATE must carry the whole new row so clients can
--    reconcile, DELETE must carry the whole old row.
ALTER TABLE public.tickets REPLICA IDENTITY FULL;
ALTER TABLE public.ticket_activities REPLICA IDENTITY FULL;
ALTER TABLE public.ticket_assignees REPLICA IDENTITY FULL;
ALTER TABLE public.ticket_attachments REPLICA IDENTITY FULL;

-- 3) Index the realtime filter columns. `assignee_id` matters because both
--    tickets pages already scope a per-assignee filter server-side
--    (loadTickets); `ticket_id` matters because the comment stream is always
--    scoped to the open ticket. IF NOT EXISTS keeps this re-runnable.
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON public.tickets (assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_creator_id ON public.tickets (creator_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_ticket_id ON public.ticket_activities (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_assignees_ticket_id ON public.ticket_assignees (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON public.ticket_attachments (ticket_id);

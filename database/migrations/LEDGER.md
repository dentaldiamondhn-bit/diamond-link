# Migration Ledger

Single source of truth for applied + verified live migrations. Each row: migration file, applied date, verification method. Add a row per DB change. If a migration cannot be applied from this shell (no `DATABASE_URL` / `exec_sql` RPC — PostgREST cannot run DDL), apply it in the Supabase Dashboard SQL editor, then mark **Verify manually** with the reference script.

## Calendar overhaul — RBC edition (Calendario Phase 0)

| File | Applied | Verification |
| --- | --- | --- |
| `20260908_calendario_phase0_security.sql` | ✓ 2026-09-08 (Dashboard SQL editor) | **✓ verified live** — `/tmp/opencode/probe_tables.cjs`: `calendar_*` → `MISSING`, all five canonical tables service-role `OK`, anon `42501`/`42P17` blocked |
| `20260908b_calendario_phase0_fix_policy_recursion.sql` | ✓ 2026-09-08 (Dashboard SQL editor) | **✓ verified live** — anon on `events`/`event_invitees`/`event_reminders` now `42501 permission denied` (42P17 recursion eliminated); service role unchanged `OK`; `get_user_events`/`get_user_tasks` RPCs gone |
| `20260908c_calendario_phase2_realtime.sql` | ✓ 2026-09-08 (Dashboard SQL editor; first apply ineffective → verified **NOT effective live** via probes, re-applied, live verified after Management-API project restart) | **✓ verified live (2026-09-08)** — Dashboard SQL: `pg_publication_tables` → 5/5 canonical tables in `supabase_realtime`; `pg_class.relreplident` → `f` on all five; **app-pattern probe** `/tmp/opencode/probe_route.cjs` (1 channel / 4 bindings `events`+`tasks`+`reminders`+`event_invitees`, exactly the `/api/events/realtime` shape) **✓ ×2**: join `SUBSCRIBED`, INSERT delivered for all four (incl. `tasks`). Known caveats: (1) hosted realtime caches pre-migration state — restart required (`POST /v1/projects/{ref}/restart`), and *per-table-channel* joins remain intermittently flaky (`TIMED_OUT`; matches supabase/realtime #1747/#1871) — route uses a single join so unaffected; (2) with RLS on, `payload.old` stays minimal (PK-only) even with FULL identity — documented Supabase limitation, irrelevant to the invalidate-only client guard. |
| `20260908d_events_add_procedure_dentist.sql` | ✓ 2026-09-08 (Dashboard SQL editor) | **✓ verified live (2026-09-08)** — live `events` now 19 columns; realtime/PostgREST report `procedure` + `dentist`; app INSERTs (probe rows incl. both fields) succeed, `PGRST204` gone. Fixes drift vs `create_new_calendar_tables.sql` (lines 6–7). |
| `20260909e_event_invitees_updated_at.sql` | **✓ applied (2026-09-09)** | **Verified via user report** — migration applied in Dashboard SQL editor (pasted twice per user); `event_invitees.updated_at` column present. Enables realtime move/resize refresh for invited calendars via the `PUT /api/events` best-effort touch. |
| `20260910a_calendario_push_webhook.sql` | **✓ applied (2026-09-10, user via Dashboard SQL editor)** | pg_net triggers on `events` (INSERT/UPDATE) + `event_invitees` (INSERT) → POST `/api/push/calendar-webhook`, signed with the shared `PUSH_WEBHOOK_SECRET` from `.env.local` (same value the chat trigger uses). Fires only on scheduling-relevant changes (`IS NOT DISTINCT FROM` cosmetic guard). |
| `20260911a_tasks_reminder_schedule.sql` | **✓ applied (2026-09-11, user via Dashboard SQL editor)** | Adds `tasks.remind_at` (next occurrence) + `tasks.repeat_every_days` (recur-until-completed interval) + partial index. **Smoke-tested live** (cron `sources.tasks`): recurrent advanced +2d, one-shot cleared, completed untouched, 2 bell rows → cleaned up. |

## Ticketing — realtime

| File | Applied | Verification |
| --- | --- | --- |
| `supabase/migrations/20260927000000_enable_tickets_realtime.sql` | **✓ applied (2026-09-25, user via Dashboard SQL editor)** | **✓ verified live** — `pg_publication_tables` → 4/4 ticket tables in `supabase_realtime`; `pg_class.relreplident` → `f` on all four; 5 filter indexes created. Pre-apply baseline proved the bug: an isolated per-table channel probe got `Unable to subscribe to changes with given parameters ... [table: tickets]` for all four ticket tables while 13/13 non-ticket tables (incl. `tasks`, `events`, `chat_messages`, `notifications`, `contacts`) subscribed fine; E2E control confirmed harness validity (an INSERT on published `tasks` was delivered). Post-apply probe re-confirms `tasks` delivery still works. |

Root cause: none of the four ticket tables had ever been added to the `supabase_realtime` publication, so both tickets pages' `postgres_changes` channel was rejected outright. Two traps worth keeping in mind:

1. **One unpublishable binding tears down the whole channel.** A channel carrying both `tickets` and `ticket_activities` received zero events for *both* — hence "no realtime at all" rather than "comments missing". Never put a not-yet-published table on a shared channel with one that matters.
2. **Payload asymmetry.** Status/priority/assignee changes are UPDATEs on `tickets`; comments *and* status-change entries are INSERTs on `ticket_activities` (`TicketService.updateTicket` writes the activity row alongside the ticket UPDATE). Both tables need a client binding or one class of change stays dead.

`payload.old` is PK-only on these tables even with `REPLICA IDENTITY FULL` (same Supabase limitation noted for the calendar five above), so "did the status change?" is answered against the previously-held row, not `payload.old.status`. Handled centrally in `hooks/useTicketRealtime.ts`, which both tickets pages now share.

**RLS deliberately left untouched by this migration.** `tickets` / `ticket_activities` are readable in full by the public anon key (verified live: anon and service_role return identical counts — 27 tickets / 106 activities), because the policies in `20250308000004_enhance_tech_support_access.sql` gate on `auth.uid()`, which is NULL for this Clerk-only browser session, so no policy matches. Closing that would break all ticket writes, because `TicketService` performs every write (`createTicket`, `updateTicket`, `addComment`, `addAttachment`, `deleteAttachment`) through the anon client. Locking it down must follow moving those writes behind a service-role API route. Publishing does not widen the exposure — the same rows are already reachable through PostgREST with the anon key in the client bundle.

**Operator note:** like `20260908c`, this needs a project restart (`POST /v1/projects/{ref}/restart`) for hosted Realtime to pick up the new publication members. Applied 2026-09-25.

### Realtime/identity verification output (20260908c) — used to confirm, after apply

Ran in the Supabase Dashboard SQL editor (2026-09-08):

```sql
-- 1) Should return 5 rows (one per canonical table) in supabase_realtime:
SELECT pubname, schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('events','tasks','reminders','event_invitees','event_reminders')
ORDER BY tablename;

-- 2) Should show relreplident = f (FULL) for all five:
SELECT c.relname, c.relreplident
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('events','tasks','reminders','event_invitees','event_reminders')
ORDER BY c.relname;
```

Live schema drift found while probing (2026-09-08, `/tmp/opencode/openapi.json`): the live `events` table had **no `procedure` / `dentist` columns** (PostgREST reports `PGRST204` on the app's POST `/api/events` which inserts both) — fixed by `20260908d_…` above (applied + verified).

Pre-apply live baseline (2026-09-08, `probe_tables.cjs`): all five canonical tables (`events`, `tasks`, `reminders`, `event_invitees`, `event_reminders`) and all four legacy tables (`calendar_events`, `calendar_tasks`, `calendar_reminders`, `calendar_invitees`) exist, **all RLS-off** (anon key can read everything), all empty. Hence the security migration is zero-loss. Post-apply (both files): **anon locked out of all five canonical tables (`42501`), legacy tables dropped, recursion-free policies in place.**

## Chat overhaul — delivered (Phase 10)

All chat migrations below were applied via Dashboard SQL editor and schema-verified. Table: `chat_messages` (uuid → `REPLICA IDENTITY FULL` + `is_forwarded`), `chat_settings` (scoped per-conversation + wallpaper/style), `push_subscriptions`, `pg_net` push webhook trigger.

| File | Applied | Verification |
| --- | --- | --- |
| `20260827_chat_extensions.sql` | ✓ 2026-08-27 | schema-verified |
| `20260828_chat_message_reads.sql` | ✓ 2026-08-28 | schema-verified |
| `20260828b_chat_message_reads_replica_identity.sql` | ✓ 2026-08-28 | schema-verified |
| `20260828c_fix_chat_uploads_storage.sql` | ✓ 2026-08-28 | schema-verified |
| `20260831_chat_messages_replica_identity.sql` | ✓ 2026-08-31 | schema-verified |
| `20260901_chat_messages_is_forwarded.sql` | ✓ 2026-09-01 | schema-verified |
| `20260903_chat_settings.sql` | ✓ 2026-09-03 | schema-verified |
| `20260903_chat_settings_scoped.sql` | ✓ 2026-09-03 | schema-verified |
| `20260903_chat_settings_wallpaper_style.sql` | ✓ 2026-09-03 | schema-verified |
| `20260903_chat_settings_phase7.sql` | ✓ 2026-09-03 | schema-verified |
| `20260904_chat_settings_phase7.sql` | ✓ 2026-09-04 | schema-verified |
| `20260906_push_subscriptions.sql` | ✓ 2026-09-06 | schema-verified |
| `20260906b_chat_messages_push_webhook.sql` | ✓ 2026-09-06 | schema-verified |

## Build/misc (pre-chat, ad-hoc)

Previously applied inline via Dashboard; files retained for history. No verification records retained.
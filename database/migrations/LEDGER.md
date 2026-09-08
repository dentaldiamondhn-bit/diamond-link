# Migration Ledger

Single source of truth for applied + verified live migrations. Each row: migration file, applied date, verification method. Add a row per DB change. If a migration cannot be applied from this shell (no `DATABASE_URL` / `exec_sql` RPC — PostgREST cannot run DDL), apply it in the Supabase Dashboard SQL editor, then mark **Verify manually** with the reference script.

## Calendar overhaul — RBC edition (Calendario Phase 0)

| File | Applied | Verification |
| --- | --- | --- |
| `20260908_calendario_phase0_security.sql` | ✓ 2026-09-08 (Dashboard SQL editor) | **✓ verified live** — `/tmp/opencode/probe_tables.cjs`: `calendar_*` → `MISSING`, all five canonical tables service-role `OK`, anon `42501`/`42P17` blocked |
| `20260908b_calendario_phase0_fix_policy_recursion.sql` | ✓ 2026-09-08 (Dashboard SQL editor) | **✓ verified live** — anon on `events`/`event_invitees`/`event_reminders` now `42501 permission denied` (42P17 recursion eliminated); service role unchanged `OK`; `get_user_events`/`get_user_tasks` RPCs gone |
| `20260908c_calendario_phase2_realtime.sql` | ⚠ attempted 2026-09-08 — **NOT effective live** | **Verify manually** — realtime service-role probe (`/tmp/opencode/probe_realtime.cjs`, 2 runs): `events`/`reminders`/`event_invitees`/`event_reminders` INSERTs delivered (already published pre-migration), but **`tasks` subscriber never reaches `SUBSCRIBED`** (not in publication) and **no DELETE event fires on any table** (`payload.old` empty ⇒ no REPLICA IDENTITY FULL). Re-run the migration in the Dashboard SQL editor; confirm with the diagnostics below. |
| `20260908d_events_add_procedure_dentist.sql` | ◻ authored 2026-09-08 | **Verify manually** — apply in Dashboard, then `SELECT column_name FROM information_schema.columns WHERE table_name='events' AND column_name IN ('procedure','dentist')` must return 2 rows; app `POST /api/events` stops returning `PGRST204`. Fixes live drift vs `create_new_calendar_tables.sql` (lines 6–7). |

### Realtime/identity verification diagnostics (20260908c)

Run in the Supabase Dashboard SQL editor after re-applying the migration:

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

Live schema drift found while probing (2026-09-08, `/tmp/opencode/openapi.json`): the live `events` table has **no `procedure` / `dentist` columns** (PostgREST reports `PGRST204` on the app's POST `/api/events` which inserts both) — fixes by `20260908d_…` above.

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
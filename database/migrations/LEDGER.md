# Migration Ledger

Single source of truth for applied + verified live migrations. Each row: migration file, applied date, verification method. Add a row per DB change. If a migration cannot be applied from this shell (no `DATABASE_URL` / `exec_sql` RPC — PostgREST cannot run DDL), apply it in the Supabase Dashboard SQL editor, then mark **Verify manually** with the reference script.

## Calendar overhaul — RBC edition (Calendario Phase 0)

| File | Applied | Verification |
| --- | --- | --- |
| `20260908_calendario_phase0_security.sql` | **Not yet applied** — Dashboard SQL editor | **Verify manually**: run `/tmp/opencode/probe_tables.cjs`; expect `calendar_*` → `MISSING`, `get_user_events/get_user_tasks` → gone, and anon `SELECT` on `events/tasks/reminders/event_invitees/event_reminders` → `ERR(...)` (RLS enforced) while service role still `OK` |

Pre-apply live baseline (2026-09-08, `probe_tables.cjs`): all five canonical tables (`events`, `tasks`, `reminders`, `event_invitees`, `event_reminders`) and all four legacy tables (`calendar_events`, `calendar_tasks`, `calendar_reminders`, `calendar_invitees`) exist, **all RLS-off** (anon key can read everything), all empty. Hence the security migration is zero-loss.

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
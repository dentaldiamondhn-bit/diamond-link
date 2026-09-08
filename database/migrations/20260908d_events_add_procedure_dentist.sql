-- ============================================================================
-- Calendario live-drift fix — add `procedure` / `dentist` to `events`
-- 2026-09-08. Idempotent; safe to re-run.
--
-- `create_new_calendar_tables.sql` declares these two columns NOT NULL, and the
-- overhauled app writes them on every event create/update (`POST/PUT /api/events`
-- default to ''). The live `events` table never got them, so creating an event
-- currently returns PGRST204 ("Could not find the 'procedure'/'dentist' column").
-- Add nullable-by-empty-string columns matching the declared type widths so the
-- PostgREST schema cache (auto-reloaded on DDL) and the API agree.
--
-- Discovered 2026-09-08 while probing Phase 2 realtime (see LEDGER.md), via the
-- PostgREST OpenAPI (`/rest/v1/`): live `events` has 17 columns, no procedure/dentist.
--
-- Apply via the Supabase Dashboard SQL editor alongside 20260908c (realtime).
-- Becomes unnecessary if the live table is ever recreated from the source DDL.
-- ============================================================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS procedure VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dentist   VARCHAR(255) NOT NULL DEFAULT '';
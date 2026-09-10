-- 20260909e — event_invitees.updated_at
-- Purpose: realtime refresh for invited calendars. The app's PUT /api/events
-- best-effort-bumps this column on the event's invitee rows, which fires each
-- invitee's `event_invitees` postgres_changes binding (filter user_id=eq.X) and
-- triggers the client's invalidate → refetch (GET /api/events = owner OR invitee).
-- Without this column, invitee calendars would not live-refresh schedule changes.
ALTER TABLE event_invitees
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
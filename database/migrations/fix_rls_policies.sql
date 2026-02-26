-- Fix RLS policies to work with Clerk user IDs
-- Temporarily disable strict RLS for calendar_events

DROP POLICY IF EXISTS "Users can create calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete calendar events" ON calendar_events;

-- Create more permissive policies
CREATE POLICY "Users can create calendar events" ON calendar_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update calendar events" ON calendar_events
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete calendar events" ON calendar_events
    FOR DELETE USING (true);

-- Also fix calendar_invitees policies
DROP POLICY IF EXISTS "Users can create calendar invitees" ON calendar_invitees;
DROP POLICY IF EXISTS "Users can update calendar invitees" ON calendar_invitees;
DROP POLICY IF EXISTS "Users can delete calendar invitees" ON calendar_invitees;

CREATE POLICY "Users can create calendar invitees" ON calendar_invitees
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update calendar invitees" ON calendar_invitees
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete calendar invitees" ON calendar_invitees
    FOR DELETE USING (true);

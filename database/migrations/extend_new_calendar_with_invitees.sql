-- Extend new calendar tables with appointment details, invitees, and reminders
-- Designed to sit alongside the existing events/tasks/reminders tables

-- 1) Extend events with appointment fields used by the new modal
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'description') THEN
    ALTER TABLE events ADD COLUMN description TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'location') THEN
    ALTER TABLE events ADD COLUMN location VARCHAR(255);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_type') THEN
    ALTER TABLE events ADD COLUMN event_type VARCHAR(50) NOT NULL DEFAULT 'appointment';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'status') THEN
    ALTER TABLE events ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'scheduled';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'priority') THEN
    ALTER TABLE events ADD COLUMN priority VARCHAR(50) NOT NULL DEFAULT 'medium';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'reminder_minutes') THEN
    ALTER TABLE events ADD COLUMN reminder_minutes INTEGER DEFAULT 30;
  END IF;
END $$;

-- 2) Event invitees
CREATE TABLE IF NOT EXISTS event_invitees (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_invitees_event_id ON event_invitees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_invitees_user_id ON event_invitees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_invitees_status ON event_invitees(status);

-- 3) Event reminders tied to event with minutes_before semantics
CREATE TABLE IF NOT EXISTS event_reminders (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    minutes_before INTEGER NOT NULL,
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_reminders_event_id ON event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_reminder_time ON event_reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_event_reminders_sent ON event_reminders(sent);

-- 4) Allowlist the new tables in Supabase for service role access
GRANT ALL ON event_invitees TO authenticated;
GRANT ALL ON event_reminders TO authenticated;
GRANT SELECT ON event_invitees TO anon;
GRANT SELECT ON event_reminders TO anon;

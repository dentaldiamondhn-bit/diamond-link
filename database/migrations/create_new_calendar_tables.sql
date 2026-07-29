CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    procedure VARCHAR(100) NOT NULL,
    dentist VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#0d9488',
    notes TEXT,
    description TEXT,
    location VARCHAR(255),
    event_type VARCHAR(50) NOT NULL DEFAULT 'appointment',
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    reminder_minutes INTEGER DEFAULT 30,
    patient_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    due_date DATE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
    dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS event_reminders (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    minutes_before INTEGER NOT NULL,
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_event_invitees_event_id ON event_invitees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_invitees_user_id ON event_invitees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_invitees_status ON event_invitees(status);
CREATE INDEX IF NOT EXISTS idx_event_reminders_event_id ON event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_reminder_time ON event_reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_event_reminders_sent ON event_reminders(sent);

GRANT ALL ON events TO authenticated;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON reminders TO authenticated;
GRANT ALL ON event_invitees TO authenticated;
GRANT ALL ON event_reminders TO authenticated;
GRANT SELECT ON events TO anon;
GRANT SELECT ON tasks TO anon;
GRANT SELECT ON reminders TO anon;
GRANT SELECT ON event_invitees TO anon;
GRANT SELECT ON event_reminders TO anon;

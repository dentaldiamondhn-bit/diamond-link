-- Complete fix for the UUID issue
-- Drop and recreate tables with correct schema

DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS calendar_invitees CASCADE;

-- Recreate with TEXT fields for user IDs
CREATE TABLE calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    location VARCHAR(255),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('appointment', 'consultation', 'surgery', 'follow_up', 'reminder', 'other')),
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed')),
    priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    patient_id UUID REFERENCES patients(paciente_id) ON DELETE SET NULL,
    doctor_id VARCHAR(255),
    notes TEXT,
    reminder_minutes INTEGER DEFAULT 30,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE calendar_invitees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('event', 'task', 'reminder')),
    item_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'tentative')),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(item_type, item_id, user_id)
);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_date ON calendar_events(end_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_patient_id ON calendar_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);

CREATE INDEX IF NOT EXISTS idx_calendar_invitees_item_type ON calendar_invitees(item_type);
CREATE INDEX IF NOT EXISTS idx_calendar_invitees_item_id ON calendar_invitees(item_id);
CREATE INDEX IF NOT EXISTS idx_calendar_invitees_user_id ON calendar_invitees(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_invitees_status ON calendar_invitees(status);
CREATE INDEX IF NOT EXISTS idx_calendar_invitees_created_by ON calendar_invitees(created_by);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_invitees ENABLE ROW LEVEL SECURITY;

-- Create permissive policies
CREATE POLICY "Users can view calendar events" ON calendar_events FOR SELECT USING (true);
CREATE POLICY "Users can create calendar events" ON calendar_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update calendar events" ON calendar_events FOR UPDATE USING (true);
CREATE POLICY "Users can delete calendar events" ON calendar_events FOR DELETE USING (true);

CREATE POLICY "Users can view calendar invitees" ON calendar_invitees FOR SELECT USING (true);
CREATE POLICY "Users can create calendar invitees" ON calendar_invitees FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update calendar invitees" ON calendar_invitees FOR UPDATE USING (true);
CREATE POLICY "Users can delete calendar invitees" ON calendar_invitees FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON calendar_events TO authenticated;
GRANT ALL ON calendar_invitees TO authenticated;
GRANT SELECT ON calendar_events TO anon;
GRANT SELECT ON calendar_invitees TO anon;

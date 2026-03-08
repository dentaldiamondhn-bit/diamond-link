-- Unified Ticketing & Task System Schema
-- Created for dental clinic management system

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums for ticket types
CREATE TYPE ticket_type AS ENUM ('SYSTEM_ISSUE', 'IMPLEMENTATION', 'TASK', 'REMINDER', 'PATIENT_CASE');
CREATE TYPE ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'PENDING_REVIEW', 'RESOLVED', 'CLOSED');
CREATE TYPE user_role AS ENUM ('STAFF', 'DOCTOR', 'ADMIN', 'TECH_SUPPORT');

-- Users table (extend existing users if needed)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'STAFF',
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  type ticket_type DEFAULT 'TASK',
  priority ticket_priority DEFAULT 'MEDIUM',
  status ticket_status DEFAULT 'OPEN',
  
  -- Metadata for Tasks/Reminders
  due_date TIMESTAMP WITH TIME ZONE,
  is_reminder BOOLEAN DEFAULT false,
  
  -- Assignment
  creator_id TEXT NOT NULL,
  assignee_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ticket activities for history tracking
CREATE TABLE IF NOT EXISTS ticket_activities (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  
  -- Activity type
  activity_type TEXT NOT NULL, -- STATUS_CHANGE, COMMENT, ASSIGNMENT, EDIT
  
  -- Content
  content TEXT NOT NULL,
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints after table creation
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_creator 
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE tickets ADD CONSTRAINT fk_tickets_assignee 
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE ticket_activities ADD CONSTRAINT fk_ticket_activities_ticket 
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;

ALTER TABLE ticket_activities ADD CONSTRAINT fk_ticket_activities_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_creator_id ON tickets(creator_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_ticket_id ON ticket_activities(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_user_id ON ticket_activities(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tickets
CREATE POLICY "Users can view tickets assigned to them or created by them" ON tickets
  FOR SELECT USING (
    auth.uid()::text = creator_id OR 
    auth.uid()::text = assignee_id OR
    (SELECT role FROM users WHERE id = auth.uid()::text) IN ('ADMIN', 'TECH_SUPPORT')
  );

CREATE POLICY "Users can create tickets" ON tickets
  FOR INSERT WITH CHECK (auth.uid()::text = creator_id);

CREATE POLICY "Users can update tickets they created or are assigned to" ON tickets
  FOR UPDATE USING (
    auth.uid()::text = creator_id OR 
    auth.uid()::text = assignee_id OR
    (SELECT role FROM users WHERE id = auth.uid()::text) IN ('ADMIN', 'TECH_SUPPORT')
  );

-- RLS Policies for ticket activities
CREATE POLICY "Users can view activities for tickets they can access" ON ticket_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_activities.ticket_id AND (
        tickets.creator_id = auth.uid()::text OR 
        tickets.assignee_id = auth.uid()::text OR
        (SELECT role FROM users WHERE id = auth.uid()::text) IN ('ADMIN', 'TECH_SUPPORT')
      )
    )
  );

CREATE POLICY "Users can create activities for tickets they can access" ON ticket_activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_activities.ticket_id AND (
        tickets.creator_id = auth.uid()::text OR 
        tickets.assignee_id = auth.uid()::text OR
        (SELECT role FROM users WHERE id = auth.uid()::text) IN ('ADMIN', 'TECH_SUPPORT')
      )
    )
  );
